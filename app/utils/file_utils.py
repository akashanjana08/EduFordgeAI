"""File validation, sanitization, image inspection, and safe temporary file management."""
from __future__ import annotations

import io
import os
import re
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Tuple

from PIL import Image

from app.config.settings import get_settings

SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9_.\-]")


class FileValidationError(ValueError):
    """Raised when an uploaded file fails security or format validation."""


def sanitize_filename(filename: str) -> str:
    """Sanitize a user-supplied filename to prevent path traversal or injection."""
    base = os.path.basename(filename or "uploaded_file")
    cleaned = SAFE_FILENAME_RE.sub("_", base)
    cleaned = cleaned.lstrip(".")
    return cleaned or "uploaded_file"


def validate_file_size(file_bytes: bytes, max_mb: int | None = None) -> None:
    """Ensure uploaded file bytes do not exceed configured size limit."""
    settings = get_settings()
    limit_mb = max_mb if max_mb is not None else settings.max_upload_size_mb
    limit_bytes = limit_mb * 1024 * 1024
    if not file_bytes:
        raise FileValidationError("Uploaded file is empty.")
    if len(file_bytes) > limit_bytes:
        size_mb = len(file_bytes) / (1024 * 1024)
        raise FileValidationError(
            f"File size ({size_mb:.2f} MB) exceeds the maximum allowed size of {limit_mb} MB."
        )


def validate_and_inspect_logo(
    file_bytes: bytes, filename: str
) -> Tuple[bytes, str, Tuple[int, int]]:
    """
    Validate uploaded school logo:
    - Extension in {PNG, JPG, JPEG, WEBP}
    - File size within limit
    - Valid image stream and dimensions within bounds
    Returns (validated_bytes, mime_type, (width, height)).
    """
    settings = get_settings()
    safe_name = sanitize_filename(filename)
    ext = Path(safe_name).suffix.lower()
    if ext not in settings.allowed_logo_extensions:
        allowed_str = ", ".join(sorted(e.upper().lstrip(".") for e in settings.allowed_logo_extensions))
        raise FileValidationError(
            f"Unsupported image format '{ext}'. Supported formats: {allowed_str}."
        )

    validate_file_size(file_bytes, max_mb=settings.max_upload_size_mb)

    try:
        with Image.open(io.BytesIO(file_bytes)) as img:
            img.verify()
        with Image.open(io.BytesIO(file_bytes)) as img:
            width, height = img.size
            fmt = (img.format or "PNG").upper()
    except Exception as exc:
        raise FileValidationError("Uploaded file is not a valid or readable image.") from exc

    min_w, min_h = settings.min_logo_dimensions
    max_w, max_h = settings.max_logo_dimensions
    if width < min_w or height < min_h:
        raise FileValidationError(
            f"Logo dimensions ({width}x{height}px) are too small. Minimum is {min_w}x{min_h}px."
        )
    if width > max_w or height > max_h:
        raise FileValidationError(
            f"Logo dimensions ({width}x{height}px) exceed maximum allowed {max_w}x{max_h}px."
        )

    mime_map = {
        "PNG": "image/png",
        "JPEG": "image/jpeg",
        "JPG": "image/jpeg",
        "WEBP": "image/webp",
    }
    return file_bytes, mime_map.get(fmt, "image/png"), (width, height)


def validate_template_upload(file_bytes: bytes, filename: str) -> Tuple[str, str]:
    """Validate uploaded question paper template file extension and size."""
    settings = get_settings()
    safe_name = sanitize_filename(filename)
    ext = Path(safe_name).suffix.lower()
    if ext not in settings.allowed_template_extensions:
        raise FileValidationError(
            f"Unsupported template document format '{ext}'. Supported formats: PDF, DOCX, DOC."
        )
    validate_file_size(file_bytes, max_mb=settings.max_upload_size_mb)
    return safe_name, ext


@contextmanager
def temporary_file_path(suffix: str = ".tmp") -> Generator[Path, None, None]:
    """Context manager creating and automatically cleaning up a temporary file."""
    fd, raw_path = tempfile.mkstemp(suffix=suffix, prefix="eduforge_")
    os.close(fd)
    path_obj = Path(raw_path)
    try:
        yield path_obj
    finally:
        try:
            if path_obj.exists():
                path_obj.unlink()
        except OSError:
            pass
