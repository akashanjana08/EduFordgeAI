"""Text normalization, topic parsing, and prompt-injection sanitization helpers."""
from __future__ import annotations

import re
from typing import List

PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?(previous|prior|system)\s+instructions", re.IGNORECASE),
    re.compile(r"system\s*prompt\s*:", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE),
    re.compile(r"<\s*/?\s*system\s*>", re.IGNORECASE),
]


def parse_topics(raw_topics: str) -> List[str]:
    """Parse topics entered either one-per-line or comma-separated."""
    if not raw_topics or not raw_topics.strip():
        return []
    parts: List[str] = []
    for line in raw_topics.splitlines():
        for chunk in line.split(","):
            cleaned = chunk.strip(" \t\r\n•-*")
            if cleaned and cleaned not in parts:
                parts.append(cleaned)
    return parts


def normalize_question_text(text: str) -> str:
    """Normalize question text for duplicate and near-duplicate detection."""
    lowered = (text or "").lower().strip()
    lowered = re.sub(r"^q\d+[\.\)\:\s]*", "", lowered)
    lowered = re.sub(r"[^a-z0-9\s]", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


def sanitize_untrusted_text(raw_text: str, max_chars: int = 8000) -> str:
    """
    Neutralize prompt-injection directives in user-uploaded documents or inputs
    so they are treated strictly as inert data.
    """
    if not raw_text:
        return ""
    cleaned = raw_text[:max_chars]
    for pattern in PROMPT_INJECTION_PATTERNS:
        cleaned = pattern.sub("[FILTERED_DIRECTIVE]", cleaned)
    return cleaned.strip()
