"""Runtime configuration for ECHOES.

Everything is environment-driven so the archive can live wherever the user wants
it, and so the AI provider/model can be swapped without touching application code.
"""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("ECHOES_DATA_DIR") or (BASE_DIR / "data"))
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "echoes.db"

# --- Local inference (Ollama) -------------------------------------------------
# Provider is deliberately a name, not a chain. There is exactly one registered
# provider (ollama). If it is unreachable we report it -- we never fall back to a
# hosted API, because that would silently move private memories off the machine.
AI_PROVIDER = os.getenv("ECHOES_AI_PROVIDER", "ollama")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
# Default is Qwen2.5-7B-Instruct, which is Apache-2.0 (verified on its model card).
# Note: Qwen2.5-*3B* is Qwen Research License (non-commercial), so it is an option
# for a lighter machine but not the default. See README "Model and license".
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "90"))

# --- Retrieval ---------------------------------------------------------------
MAX_EVIDENCE = int(os.getenv("ECHOES_MAX_EVIDENCE", "5"))
# A passage must contain at least this share of the question's meaningful words
# before it counts as evidence. Half is the dividing line that survives both ways:
# "grandma's special recipe" matches 2/3 (recipe is present), while "grandma's first
# job" matches 1/3 (the topic word is absent) and is refused.
MIN_MATCH_RATIO = float(os.getenv("ECHOES_MIN_MATCH_RATIO", "0.5"))

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ECHOES_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if origin.strip()
]


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
