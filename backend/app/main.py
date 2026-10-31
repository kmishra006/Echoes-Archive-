"""ECHOES API.

Endpoints are grouped so the frontend has one clear contract:
  /api/status            -> honest system + model state
  /api/memories          -> archive CRUD and file ingestion
  /api/ask               -> grounded retrieval + local inference
  /api/conversation      -> persisted Ask Echoes history
"""

from __future__ import annotations

import re
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Body, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from . import ai, db, ingest, retrieval, seed
from .config import (
    AI_PROVIDER,
    BASE_DIR,
    CORS_ORIGINS,
    DATA_DIR,
    DB_PATH,
    UPLOAD_DIR,
)
from .text import normalise_names

SESSION_ID = "default"
VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    if db.get_meta(seed.DEMO_MARKER) is None and not db.list_memories():
        for entry in seed.MEMORIES:
            db.create_memory({**entry, "source": {"type": "demo"}}, is_demo=True)
        db.set_meta(seed.DEMO_MARKER, db.now_iso())
    yield


app = FastAPI(title="ECHOES", version=VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- schemas -----------------------------------------------------------------


class MemoryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    memory_date: str | None = None
    category: str = "Story"
    people: list[str] | str = Field(default_factory=list)
    tags: list[str] | str = Field(default_factory=list)

    @field_validator("people", "tags", mode="before")
    @classmethod
    def _coerce(cls, value: Any) -> Any:
        return normalise_names(value)

    @field_validator("memory_date")
    @classmethod
    def _date(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip()
        if not re.fullmatch(r"\d{4}(-\d{2}(-\d{2})?)?", value):
            raise ValueError("Use YYYY, YYYY-MM or YYYY-MM-DD.")
        return value


class MemoryUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1)
    memory_date: str | None = None
    category: str | None = None
    people: list[str] | str | None = None
    tags: list[str] | str | None = None

    @field_validator("people", "tags", mode="before")
    @classmethod
    def _coerce(cls, value: Any) -> Any:
        return normalise_names(value) if value is not None else None


class AskRequest(BaseModel):
    question: str = Field(min_length=2, max_length=600)


def _relative(path) -> str:
    try:
        return str(path.relative_to(BASE_DIR.parent)).replace("\\", "/")
    except ValueError:
        return path.name


# --- system ------------------------------------------------------------------


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {"ok": True, "service": "echoes", "version": VERSION}


@app.get("/api/status")
async def status() -> dict[str, Any]:
    provider = ai.get_provider()
    ai_status = (await provider.status()).to_dict()
    archive = db.stats_with_sources()
    return {
        "backend": {"ok": True, "version": VERSION},
        "ai": ai_status,
        "archive": {
            "memories": archive["total_memories"],
            "demo_memories": archive["demo_memories"],
            "uploads": archive["upload_count"],
            "people": archive["people_count"],
        },
        "storage": {
            "database": _relative(DB_PATH),
            "uploads": _relative(UPLOAD_DIR),
            "data_dir": _relative(DATA_DIR),
        },
        "retrieval": {
            "engine": "bm25-passages",
            "provider_note": f"ECHOES_AI_PROVIDER={AI_PROVIDER}",
        },
    }


@app.get("/api/stats")
async def stats() -> dict[str, Any]:
    return db.stats_with_sources()


@app.get("/api/timeline")
async def timeline() -> list[dict[str, Any]]:
    memories = db.list_memories()
    dated = [m for m in memories if m["memory_date"]]
    dated.sort(key=lambda m: m["memory_date"] or "")
    return [
        {
            "id": m["id"],
            "title": m["title"],
            "category": m["category"],
            "memory_date": m["memory_date"],
            "people": m["people"],
            "year": (m["memory_date"] or "")[:4],
            "excerpt": (m["content"][:180] + "\u2026") if len(m["content"]) > 180 else m["content"],
        }
        for m in dated
    ]


# --- memories ----------------------------------------------------------------


@app.get("/api/memories")
async def list_memories(
    q: str | None = Query(default=None),
    category: str | None = Query(default=None),
    demo: bool = Query(default=False),
) -> list[dict[str, Any]]:
    return db.list_memories(q=q, category=category, demo_only=demo)


@app.post("/api/memories", status_code=201)
async def create_memory(payload: MemoryCreate) -> dict[str, Any]:
    return db.create_memory({**payload.model_dump(), "source": {"type": "manual"}})


@app.get("/api/memories/{memory_id}")
async def read_memory(memory_id: str) -> dict[str, Any]:
    memory = db.get_memory(memory_id)
    if memory is None:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return memory


@app.patch("/api/memories/{memory_id}")
async def patch_memory(memory_id: str, payload: MemoryUpdate) -> dict[str, Any]:
    updated = db.update_memory(memory_id, payload.model_dump(exclude_unset=True))
    if updated is None:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return updated


@app.delete("/api/memories/{memory_id}")
async def remove_memory(memory_id: str) -> dict[str, Any]:
    if not db.delete_memory(memory_id):
        raise HTTPException(status_code=404, detail="Memory not found.")
    return {"deleted": memory_id}


@app.post("/api/memories/upload", status_code=201)
async def upload_memory(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    category: str = Form(default="Document"),
    memory_date: str | None = Form(default=None),
    people: str | None = Form(default=None),
    tags: str | None = Form(default=None),
) -> dict[str, Any]:
    filename = file.filename or "upload"
    payload = await file.read()
    try:
        extracted = ingest.extract(filename, payload)
    except ingest.UnsupportedFile as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc

    source = ingest.store(filename, payload)
    source["pages"] = extracted.pages
    source["kind"] = extracted.kind

    default_title = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip()
    memory = db.create_memory(
        {
            "title": (title or default_title or "Untitled document")[:200],
            "content": extracted.text,
            "memory_date": (memory_date or None) if memory_date else None,
            "category": category or "Document",
            "people": normalise_names(people),
            "tags": normalise_names(tags),
            "source": source,
        }
    )
    return memory


# --- demo archive ------------------------------------------------------------


@app.post("/api/demo/seed")
async def seed_demo() -> dict[str, Any]:
    created = 0
    existing = db.list_memories()
    titles = {m["title"] for m in existing}
    for entry in seed.MEMORIES:
        if entry["title"] in titles:
            continue
        db.create_memory({**entry, "source": {"type": "demo"}}, is_demo=True)
        created += 1
    db.set_meta(seed.DEMO_MARKER, db.now_iso())
    return {"created": created, "total": db.stats()["total_memories"]}


@app.delete("/api/demo")
async def clear_demo() -> dict[str, Any]:
    removed = db.delete_demo_memories()
    return {"removed": removed}


# --- ask ---------------------------------------------------------------------


def _cited(answer: str, count: int) -> list[int]:
    found = {int(n) for n in re.findall(r"\[(\d+)\]", answer)}
    return sorted(n for n in found if 1 <= n <= count)


NOT_FOUND_TEXT = (
    "I can't answer that from this archive. I searched all {count} memories and found no "
    "passage that speaks to it, so I would only be guessing. That gap is part of the record "
    "too \u2014 you could add a memory about it."
)


@app.post("/api/ask")
async def ask(payload: AskRequest = Body(...)) -> dict[str, Any]:
    question = payload.question.strip()
    db.add_message(SESSION_ID, "user", question)

    hits = retrieval.search(question)
    diagnostics = retrieval.diagnostic(question)
    evidence = [hit.to_evidence(rank) for rank, hit in enumerate(hits, start=1)]
    provider = ai.get_provider()
    ai_status = await provider.status()

    base = {
        "question": question,
        "diagnostics": diagnostics,
        "sources": evidence,
        "model": {
            "provider": ai_status.provider,
            "name": ai_status.model,
            "local": True,
            "latency_ms": 0,
        },
    }

    # No evidence: refuse, in the archive's own words. No model call needed.
    if not hits:
        count = len(db.list_memories())
        response = {
            **base,
            "status": "not_found",
            "answer": NOT_FOUND_TEXT.format(count=count),
            "message": (
                "Retrieval found no passage containing enough of the question's distinctive words."
            ),
            "cited": [],
        }
        db.add_message(SESSION_ID, "assistant", response["answer"], response)
        return response

    # Evidence exists but nothing can be generated honestly.
    if not (ai_status.available and ai_status.model_ready):
        wording = ai_status.detail or "The local model is not available."
        response = {
            **base,
            "status": "model_unavailable",
            "answer": (
                "The local model is offline, so I won't write an answer. "
                f"{wording} Here is the evidence retrieval found for your question \u2014 "
                "read it directly, or start the model and ask again."
            ),
            "message": wording,
            "cited": [],
        }
        db.add_message(SESSION_ID, "assistant", response["answer"], response)
        return response

    generation = await provider.generate(ai.SYSTEM_PROMPT, ai.build_prompt(question, hits))
    base["model"]["latency_ms"] = generation.latency_ms

    if not generation.ok:
        response = {
            **base,
            "status": "model_error",
            "answer": (
                "The local model returned an error, so there is no generated answer. "
                "The retrieved evidence is below."
            ),
            "message": generation.error,
            "cited": [],
        }
        db.add_message(SESSION_ID, "assistant", response["answer"], response)
        return response

    text = generation.text.strip()
    if not text or ai.NOT_FOUND_SENTINEL in text or text.upper().startswith("INSUFFICIENT"):
        response = {
            **base,
            "status": "not_found",
            "answer": (
                "The retrieved passages don't contain that answer, and I won't invent one. "
                "You can read what was found below."
            ),
            "message": "The model reported insufficient evidence in the retrieved passages.",
            "cited": [],
        }
        db.add_message(SESSION_ID, "assistant", response["answer"], response)
        return response

    response = {
        **base,
        "status": "answered",
        "answer": text,
        "message": "",
        "cited": _cited(text, len(evidence)),
    }
    db.add_message(SESSION_ID, "assistant", text, response)
    return response


@app.get("/api/conversation")
async def conversation() -> list[dict[str, Any]]:
    return db.get_messages(SESSION_ID)


@app.delete("/api/conversation")
async def clear_conversation() -> dict[str, Any]:
    return {"removed": db.clear_messages(SESSION_ID)}
