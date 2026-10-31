"""SQLite persistence layer.

Uses the stdlib `sqlite3` module directly: it is a genuinely lightweight database
layer, needs no native build step, and keeps the MVP dependency surface small.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

from .config import DB_PATH, ensure_dirs

SCHEMA = """
CREATE TABLE IF NOT EXISTS memories (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    memory_date TEXT,
    category    TEXT NOT NULL DEFAULT 'Story',
    people      TEXT NOT NULL DEFAULT '[]',
    tags        TEXT NOT NULL DEFAULT '[]',
    source      TEXT NOT NULL DEFAULT '{}',
    is_demo     INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role       TEXT NOT NULL,
    content    TEXT NOT NULL,
    meta       TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(memory_date);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def new_id() -> str:
    return uuid.uuid4().hex[:12]


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    ensure_dirs()
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)
    # Any write must invalidate the retrieval index; the module flag is cheap and
    # avoids re-deriving a version from the filesystem on every request.
    from . import retrieval

    retrieval.invalidate()


def _row_to_memory(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "content": row["content"],
        "memory_date": row["memory_date"],
        "category": row["category"],
        "people": json.loads(row["people"] or "[]"),
        "tags": json.loads(row["tags"] or "[]"),
        "source": json.loads(row["source"] or "{}"),
        "is_demo": bool(row["is_demo"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def list_memories(
    *, q: str | None = None, category: str | None = None, demo_only: bool = False
) -> list[dict[str, Any]]:
    clauses: list[str] = []
    params: list[Any] = []
    if category:
        clauses.append("category = ?")
        params.append(category)
    if demo_only:
        clauses.append("is_demo = 1")
    if q:
        clauses.append("(LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(people) LIKE ? OR LOWER(tags) LIKE ?)")
        needle = f"%{q.lower()}%"
        params.extend([needle, needle, needle, needle])
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    sql = f"""
        SELECT * FROM memories {where}
        ORDER BY COALESCE(memory_date, '') DESC, created_at DESC
    """
    with connect() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [_row_to_memory(r) for r in rows]


def get_memory(memory_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,)).fetchone()
    return _row_to_memory(row) if row else None


def create_memory(data: dict[str, Any], *, is_demo: bool = False) -> dict[str, Any]:
    memory_id = data.get("id") or new_id()
    stamp = now_iso()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO memories
                (id, title, content, memory_date, category, people, tags, source, is_demo, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                memory_id,
                data["title"].strip(),
                data["content"].strip(),
                data.get("memory_date") or None,
                data.get("category") or "Story",
                json.dumps(data.get("people") or [], ensure_ascii=False),
                json.dumps(data.get("tags") or [], ensure_ascii=False),
                json.dumps(data.get("source") or {"type": "manual"}, ensure_ascii=False),
                1 if is_demo else 0,
                stamp,
                stamp,
            ),
        )
    from . import retrieval

    retrieval.invalidate()
    created = get_memory(memory_id)
    assert created is not None
    return created


def update_memory(memory_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
    existing = get_memory(memory_id)
    if existing is None:
        return None
    fields: dict[str, Any] = {}
    for key in ("title", "content", "memory_date", "category"):
        if key in patch and patch[key] is not None:
            fields[key] = patch[key]
    for key in ("people", "tags"):
        if key in patch and patch[key] is not None:
            fields[key] = json.dumps(patch[key], ensure_ascii=False)
    if "source" in patch and patch["source"] is not None:
        fields["source"] = json.dumps(patch["source"], ensure_ascii=False)
    if not fields:
        return existing
    fields["updated_at"] = now_iso()
    assignments = ", ".join(f"{k} = ?" for k in fields)
    with connect() as conn:
        conn.execute(
            f"UPDATE memories SET {assignments} WHERE id = ?",
            (*fields.values(), memory_id),
        )
    from . import retrieval

    retrieval.invalidate()
    return get_memory(memory_id)


def delete_memory(memory_id: str) -> bool:
    with connect() as conn:
        cur = conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
    from . import retrieval

    retrieval.invalidate()
    return cur.rowcount > 0


def delete_demo_memories() -> int:
    with connect() as conn:
        cur = conn.execute("DELETE FROM memories WHERE is_demo = 1")
    from . import retrieval

    retrieval.invalidate()
    return cur.rowcount


def categories() -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT category, COUNT(*) AS count FROM memories GROUP BY category ORDER BY count DESC, category ASC"
        ).fetchall()
    return [{"name": r["category"], "count": r["count"]} for r in rows]


def stats() -> dict[str, Any]:
    with connect() as conn:
        total = conn.execute("SELECT COUNT(*) AS c FROM memories").fetchone()["c"]
        demo = conn.execute("SELECT COUNT(*) AS c FROM memories WHERE is_demo = 1").fetchone()["c"]
        people_rows = conn.execute("SELECT people FROM memories").fetchall()
        recent = conn.execute(
            "SELECT * FROM memories ORDER BY created_at DESC LIMIT 4"
        ).fetchall()
    people: set[str] = set()
    for row in people_rows:
        for name in json.loads(row["people"] or "[]"):
            people.add(name)
    return {
        "total_memories": total,
        "demo_memories": demo,
        "people": sorted(people),
        "people_count": len(people),
        "categories": categories(),
        "recent": [_row_to_memory(r) for r in recent],
    }


def stats_with_sources() -> dict[str, Any]:
    """Archive summary plus how many entries came from an uploaded file."""
    base = stats()
    with connect() as conn:
        rows = conn.execute("SELECT source FROM memories").fetchall()
    uploads = 0
    for row in rows:
        source = json.loads(row["source"] or "{}")
        if source.get("type") == "file":
            uploads += 1
    base["upload_count"] = uploads
    return base


# --- conversation ------------------------------------------------------------


def add_message(session_id: str, role: str, content: str, meta: dict[str, Any] | None = None) -> dict[str, Any]:
    message = {
        "id": new_id(),
        "session_id": session_id,
        "role": role,
        "content": content,
        "meta": meta or {},
        "created_at": now_iso(),
    }
    with connect() as conn:
        conn.execute(
            "INSERT INTO messages (id, session_id, role, content, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                message["id"],
                session_id,
                role,
                content,
                json.dumps(message["meta"], ensure_ascii=False),
                message["created_at"],
            ),
        )
    return message


def get_messages(session_id: str, limit: int = 60) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?",
            (session_id, limit),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "role": r["role"],
            "content": r["content"],
            "meta": json.loads(r["meta"] or "{}"),
            "created_at": r["created_at"],
        }
        for r in rows
    ]


def clear_messages(session_id: str) -> int:
    with connect() as conn:
        cur = conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    return cur.rowcount


def get_meta(key: str) -> str | None:
    with connect() as conn:
        row = conn.execute("SELECT value FROM app_meta WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else None


def set_meta(key: str, value: str) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )
