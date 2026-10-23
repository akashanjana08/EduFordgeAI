"""Configurable LLM model definitions and runtime parameters."""
from __future__ import annotations

from typing import Dict, List
from pydantic import BaseModel, Field


SUPPORTED_GEMINI_MODELS: List[Dict[str, str]] = [
    {
        "id": "gemini-3.1-flash-lite-preview",
        "label": "Gemini 3.1 Flash Lite (Fast & Cost-Efficient)",
        "tier": "standard",
    },
    {
        "id": "gemini-3.8-flash",
        "label": "Gemini 3.8 Flash (Balanced Curriculum & STEM)",
        "tier": "standard",
    },
    {
        "id": "gemini-flash-latest",
        "label": "Gemini Flash Latest (General Purpose)",
        "tier": "standard",
    },
    {
        "id": "gemini-3.1-pro-preview",
        "label": "Gemini 3.1 Pro Preview (Advanced Derivations & Complex Math)",
        "tier": "pro",
    },
]


class LLMConfig(BaseModel):
    """Runtime-configurable parameters for the AI model."""

    model_name: str = Field(
        default="gemini-3.1-flash-lite-preview",
        min_length=3,
        description="Configurable Gemini model identifier.",
    )
    temperature: float = Field(
        default=0.3,
        ge=0.0,
        le=2.0,
        description="Sampling temperature for generation.",
    )
    max_output_tokens: int = Field(
        default=8192,
        ge=256,
        le=65536,
        description="Maximum output tokens per LLM call.",
    )
    batch_size: int = Field(
        default=15,
        ge=1,
        le=50,
        description="Maximum number of questions generated in a single API call.",
    )
    retry_attempts: int = Field(default=3, ge=1, le=5)
    timeout_seconds: int = Field(default=60, ge=10, le=300)
