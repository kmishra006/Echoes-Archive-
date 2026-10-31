"""Upload ingestion: store the original file locally, extract text into a memory."""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from pathlib import Path

from .config import UPLOAD_DIR, ensure_dirs

MAX_UPLOAD_BYTES = 12 * 1024 * 1024
TEXT_SUFFIXES = {".txt", ".md", ".markdown", ".text", ".csv"}


class UnsupportedFile(ValueError):
    pass


@dataclass
class Extracted:
    text: str
    pages: int | None
    kind: str


def safe_filename(name: str) -> str:
    stem = Path(name).name
    stem = re.sub(r"[^A-Za-z0-9._ -]", "_", stem).strip() or "upload"
    return stem[:90]


def extract(filename: str, payload: bytes) -> Extracted:
    suffix = Path(filename).suffix.lower()
    if len(payload) == 0:
        raise UnsupportedFile("The file is empty.")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise UnsupportedFile("File is larger than the 12 MB limit.")

    if suffix in TEXT_SUFFIXES:
        for encoding in ("utf-8", "utf-16", "latin-1"):
            try:
                text = payload.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:  # pragma: no cover - latin-1 always decodes
            raise UnsupportedFile("Could not decode that text file.")
        text = text.replace("\r\n", "\n").strip()
        if not text:
            raise UnsupportedFile("No readable text was found in that file.")
        return Extracted(text=text, pages=None, kind="text")

    if suffix == ".pdf":
        try:
            from pypdf import PdfReader
            import io

            reader = PdfReader(io.BytesIO(payload))
            pages = []
            for page in reader.pages:
                try:
                    pages.append((page.extract_text() or "").strip())
                except Exception:
                    pages.append("")
        except Exception as exc:
            raise UnsupportedFile(f"That PDF could not be read ({exc.__class__.__name__}).") from exc
        text = "\n\n".join(p for p in pages if p).strip()
        if not text:
            raise UnsupportedFile(
                "That PDF has no extractable text layer. Scanned pages need OCR, "
                "which is not part of this MVP."
            )
        return Extracted(text=text, pages=len(reader.pages), kind="pdf")

    raise UnsupportedFile(
        f"Unsupported file type {suffix or '(none)'}. This MVP reads .txt, .md and .pdf."
    )


def store(filename: str, payload: bytes) -> dict[str, object]:
    """Write the original file into data/uploads and describe it."""
    ensure_dirs()
    clean = safe_filename(filename)
    stored_name = f"{uuid.uuid4().hex[:8]}_{clean}"
    path = UPLOAD_DIR / stored_name
    path.write_bytes(payload)
    return {
        "type": "file",
        "filename": clean,
        "stored_as": stored_name,
        "bytes": len(payload),
    }
