"""Application settings and environment configuration."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Set

from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseModel):
    """Centralized validated configuration loaded from environment or Streamlit secrets."""

    app_name: str = Field(default="EduForge AI Question Paper Generator")
    app_version: str = Field(default="1.0.0")
    gemini_api_key: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    gemini_model: str = Field(
        default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")
    )
    gemini_temperature: float = Field(
        default_factory=lambda: float(os.getenv("GEMINI_TEMPERATURE", "0.3")),
        ge=0.0,
        le=2.0,
    )
    gemini_max_output_tokens: int = Field(
        default_factory=lambda: int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "8192")),
        ge=256,
        le=65536,
    )
    question_batch_size: int = Field(
        default_factory=lambda: int(os.getenv("QUESTION_BATCH_SIZE", "15")),
        ge=1,
        le=50,
    )
    max_upload_size_mb: int = Field(
        default_factory=lambda: int(os.getenv("MAX_UPLOAD_SIZE_MB", "10")),
        ge=1,
        le=50,
    )
    log_level: str = Field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO").upper())

    allowed_logo_extensions: Set[str] = Field(
        default_factory=lambda: {".png", ".jpg", ".jpeg", ".webp"}
    )
    allowed_template_extensions: Set[str] = Field(
        default_factory=lambda: {".pdf", ".docx", ".doc"}
    )
    max_logo_dimensions: tuple[int, int] = Field(default=(2400, 2400))
    min_logo_dimensions: tuple[int, int] = Field(default=(32, 32))

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = v.upper()
        return upper if upper in allowed else "INFO"

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached singleton Settings instance, checking Streamlit secrets if available."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")
    temp_str = os.getenv("GEMINI_TEMPERATURE", "0.3")
    tokens_str = os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "8192")

    try:
        import streamlit as st

        if hasattr(st, "secrets"):
            api_key = api_key or st.secrets.get("GEMINI_API_KEY", "")
            model = st.secrets.get("GEMINI_MODEL", model)
            temp_str = str(st.secrets.get("GEMINI_TEMPERATURE", temp_str))
            tokens_str = str(st.secrets.get("GEMINI_MAX_OUTPUT_TOKENS", tokens_str))
    except Exception:
        pass

    return Settings(
        gemini_api_key=api_key,
        gemini_model=model,
        gemini_temperature=float(temp_str),
        gemini_max_output_tokens=int(tokens_str),
    )
