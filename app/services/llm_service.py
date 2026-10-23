"""Configurable LLM abstraction and Google Gemini implementation."""
from __future__ import annotations

import abc
import json
import re
import time
from typing import Any, Dict, Optional

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config.model_config import LLMConfig
from app.config.settings import get_settings
from app.services.prompt_service import SYSTEM_INSTRUCTIONS
from app.utils.logger import get_logger, log_operation

logger = get_logger("eduforge.llm")


class LLMServiceError(RuntimeError):
    """Raised when the underlying LLM provider fails after retries or returns invalid data."""


class BaseLLMService(abc.ABC):
    """Provider-agnostic LLM interface supporting future OpenAI, Anthropic, or Local models."""

    def __init__(self, config: LLMConfig) -> None:
        self.config = config

    @abc.abstractmethod
    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Generate raw text/JSON string from a prompt."""
        raise NotImplementedError

    def generate_questions(self, prompt: str) -> Dict[str, Any]:
        """Generate and parse structured question JSON."""
        raw_output = self.generate(prompt, system_instruction=SYSTEM_INSTRUCTIONS)
        return self.parse_json_response(raw_output)

    @staticmethod
    def parse_json_response(raw_text: str) -> Dict[str, Any]:
        """Safely parse JSON from LLM output, recovering complete objects if truncated."""
        if not raw_text or not raw_text.strip():
            raise LLMServiceError("Received empty response from the AI model.")
        cleaned = raw_text.strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        try:
            data = json.loads(cleaned)
            if not isinstance(data, dict):
                raise LLMServiceError("AI response JSON root must be an object.")
            return data
        except json.JSONDecodeError as exc:
            match = re.search(r"\{[\s\S]*\}", cleaned)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    pass
            # Salvage complete question objects if a string was truncated mid-stream
            salvaged = []
            for obj_match in re.finditer(r"\{[^{}]*\"question\"\s*:[^{}]*\}", cleaned):
                try:
                    obj = json.loads(obj_match.group(0))
                    if isinstance(obj, dict) and "question" in obj:
                        salvaged.append(obj)
                except json.JSONDecodeError:
                    continue
            if salvaged:
                return {"questions": salvaged}
            raise LLMServiceError(f"Invalid JSON response from AI model: {exc.msg}") from exc


class GeminiLLMService(BaseLLMService):
    """Production Google Gemini LLM service using the official google-genai SDK."""

    def __init__(
        self,
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
        temperature: Optional[float] = None,
        max_output_tokens: Optional[int] = None,
        config: Optional[LLMConfig] = None,
    ) -> None:
        settings = get_settings()
        resolved_config = config or LLMConfig(
            model_name=model_name or settings.gemini_model,
            temperature=(
                temperature if temperature is not None else settings.gemini_temperature
            ),
            max_output_tokens=(
                max_output_tokens
                if max_output_tokens is not None
                else settings.gemini_max_output_tokens
            ),
            batch_size=settings.question_batch_size,
        )
        super().__init__(resolved_config)
        self._api_key = api_key if api_key is not None else settings.gemini_api_key
        self._client: Any = None

    def _get_client(self) -> Any:
        if not self._api_key or not self._api_key.strip():
            raise LLMServiceError(
                "GEMINI_API_KEY is not configured. Set GEMINI_API_KEY in .env or environment variables."
            )
        if self._client is None:
            from google import genai

            self._client = genai.Client(api_key=self._api_key)
        return self._client

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(RuntimeError),
    )
    def _call_gemini_with_retry(
        self, prompt: str, system_instruction: Optional[str] = None
    ) -> str:
        client = self._get_client()
        from google.genai import types

        gen_config = types.GenerateContentConfig(
            temperature=self.config.temperature,
            max_output_tokens=self.config.max_output_tokens,
            response_mime_type="application/json",
            system_instruction=system_instruction or SYSTEM_INSTRUCTIONS,
        )
        response = client.models.generate_content(
            model=self.config.model_name,
            contents=prompt,
            config=gen_config,
        )
        text = getattr(response, "text", None)
        if not text:
            raise RuntimeError("Gemini returned an empty response payload.")
        return text

    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Execute Gemini call with timing telemetry and error classification."""
        start_time = time.perf_counter()
        try:
            output = self._call_gemini_with_retry(prompt, system_instruction=system_instruction)
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            log_operation(
                logger,
                operation="gemini_generate",
                message="Successfully generated structured content from Gemini.",
                model_name=self.config.model_name,
                execution_time_ms=elapsed_ms,
            )
            return output
        except LLMServiceError:
            raise
        except Exception as exc:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            err_msg = str(exc)
            log_operation(
                logger,
                operation="gemini_generate_error",
                message="Gemini API invocation failed.",
                model_name=self.config.model_name,
                execution_time_ms=elapsed_ms,
                error_info=err_msg,
            )
            if "API_KEY_INVALID" in err_msg or "401" in err_msg or "403" in err_msg:
                raise LLMServiceError(
                    "Invalid or unauthorized Gemini API key. Please check your server environment configuration."
                ) from exc
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                raise LLMServiceError(
                    "Gemini API rate limit reached. Please wait a moment or switch to a lighter Gemini model."
                ) from exc
            raise LLMServiceError(f"Gemini API failure: {err_msg}") from exc
