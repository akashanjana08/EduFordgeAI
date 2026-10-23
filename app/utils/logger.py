"""Structured application logger with secret redaction."""
from __future__ import annotations

import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.config.settings import get_settings

SECRET_PATTERNS = [
    re.compile(r"(AIza[0-9A-Za-z\-_]{30,})"),
    re.compile(r"(api[_-]?key\s*[:=]\s*['\"]?)([^'\"\s]+)", re.IGNORECASE),
    re.compile(r"(password\s*[:=]\s*['\"]?)([^'\"\s]+)", re.IGNORECASE),
]


def redact_sensitive(text: str) -> str:
    """Ensure API keys, passwords, or private credentials never appear in logs."""
    if not text:
        return text
    sanitized = text
    sanitized = SECRET_PATTERNS[0].sub("[REDACTED_GEMINI_KEY]", sanitized)
    sanitized = SECRET_PATTERNS[1].sub(r"\1[REDACTED]", sanitized)
    sanitized = SECRET_PATTERNS[2].sub(r"\1[REDACTED]", sanitized)
    return sanitized


class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as single-line structured JSON with secret scrubbing."""

    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": redact_sensitive(record.getMessage()),
        }
        for extra_field in (
            "session_id",
            "operation",
            "model_name",
            "execution_time_ms",
            "question_count",
            "validation_status",
            "error_info",
        ):
            value = getattr(record, extra_field, None)
            if value is not None:
                payload[extra_field] = (
                    redact_sensitive(str(value)) if isinstance(value, str) else value
                )

        if record.exc_info:
            payload["exception"] = redact_sensitive(self.formatException(record.exc_info))
        return json.dumps(payload, ensure_ascii=False)


def get_logger(name: str = "eduforge") -> logging.Logger:
    """Create or retrieve a configured structured logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        settings = get_settings()
        level = getattr(logging, settings.log_level, logging.INFO)
        logger.setLevel(level)
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredJsonFormatter())
        logger.addHandler(handler)
        logger.propagate = False
    return logger


def log_operation(
    logger: logging.Logger,
    operation: str,
    message: str,
    *,
    session_id: Optional[str] = None,
    model_name: Optional[str] = None,
    execution_time_ms: Optional[float] = None,
    question_count: Optional[int] = None,
    validation_status: Optional[str] = None,
    error_info: Optional[str] = None,
    level: int = logging.INFO,
) -> None:
    """Helper to emit structured operational telemetry without sensitive data."""
    extra = {
        "session_id": session_id or "default-session",
        "operation": operation,
        "model_name": model_name,
        "execution_time_ms": round(execution_time_ms, 2) if execution_time_ms is not None else None,
        "question_count": question_count,
        "validation_status": validation_status,
        "error_info": redact_sensitive(error_info) if error_info else None,
    }
    logger.log(level, redact_sensitive(message), extra=extra)
