# ECHOES

**Some stories deserve to outlive us.**

ECHOES is a private, local-first archive for family memories — stories, recipes, letters, photographs, traditions — with an AI layer that answers questions **only from what you have actually preserved**, and cites the entries it used.

It is not a chatbot. It is a memory archive with a retrieval layer, and it is built to say *"I can't answer that"* when the archive has nothing to support an answer.

---

## 1. The problem

Family history is fragile and scattered. It lives in WhatsApp forwards, in a notebook in a drawer, in one relative's memory of a recipe nobody wrote down. Existing tools either store files without making them searchable, or send personal material to a hosted AI API that is not yours.

ECHOES takes the opposite position:

- **Storage is local.** Memories live in a SQLite file and an uploads folder on your machine.
- **Retrieval is local.** A BM25 index over your own passages ranks evidence in-process.
- **Generation is local and open-weight.** When Ollama is running, an open-weight model writes the answer from those passages and nothing else.
- **Uncertainty is explicit.** If no passage supports the question, the answer is a refusal, not a guess.

---

## 2. What is actually implemented

| Feature | Status |
| --- | --- |
| Landing experience | Working |
| Archive dashboard (stats, recent, categories, model status) | Working |
| Memory Vault: add, view, edit, delete, search, category filter | Working, against SQLite |
| Manual memory entry (title, content, date, category, people, tags) | Working |
| TXT / Markdown / PDF import with local file storage | Working |
| Local retrieval (BM25 over passages, metadata-aware) | Working |
| Grounded ask pipeline with numbered sources | Working; generation path returns `model_unavailable` when Ollama is absent |
| Honest NOT_FOUND when the archive lacks evidence | Working (refusal is decided before the model is ever called) |
| Status reporting (backend, Ollama, model pulled) | Working, polled live |
| Fictional sample archive (12 entries) | Working |
| Remembrance room (memory of the day + decade timeline) | Working |
| Persistent conversation history | Working (single local session) |
| Image upload, OCR, audio transcription | **Not implemented** |
| Embeddings / semantic search | **Not implemented** — see Limitations |
| Multi-user accounts, auth | **Not implemented** |

Nothing above is a mock. Every "working" row was exercised against the running API.

---

## 3. Architecture

```
React + Vite + Tailwind  (localhost:5173)
        │  /api/*  (Vite dev proxy)
        ▼
FastAPI  (localhost:8000)
        ├── db.py          SQLite: memories, messages, app_meta
        ├── retrieval.py   BM25 + match-ratio gate, in-process index
        ├── ai.py          Ollama adapter (the only AI provider)
        ├── ingest.py      TXT/PDF text extraction, file storage
        └── seed.py        fictional demo archive
        ▼
backend/data/echoes.db        ← memories and conversation
backend/data/uploads/         ← original uploaded files
ollama at 127.0.0.1:11434     ← optional local inference
```

**Request flow for "Ask Echoes":**

1. The question is tokenised, stop-words and meta-words (`memory`, `remember`, `mention`…) are dropped.
2. Every stored passage is scored with BM25 (title + category + people + tags + body).
3. A passage is admitted as evidence only if it contains at least half of the question's meaningful words **and** the question's final content word (the topic). This is the gate that makes refusals meaningful.
4. If no passage passes, the request ends in `not_found` **without calling a model**.
5. If Ollama is down or the model is not pulled, the API returns `model_unavailable` with the retrieved evidence and a setup message. It does not write an answer.
6. Otherwise the passages are numbered and sent to the model with a system prompt permitting citation only from those numbers. The model's reply is scanned for an `INSUFFICIENT_EVIDENCE` sentinel, which is converted into a refusal.
7. The response carries `status`, `answer`, `sources[]`, `cited[]` and retrieval diagnostics, and is persisted to the conversation table.

---

## 4. Technology stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Lucide.
- **Backend:** Python 3.14, FastAPI, Uvicorn, pypdf, httpx.
- **Database:** SQLite through the standard library `sqlite3` module (no ORM, no native build step).
- **Retrieval:** custom BM25 implementation in `backend/app/retrieval.py`. No vector database, no hosted search.
- **AI:** Ollama serving an open-weight model. One provider is registered; an unknown `ECHOES_AI_PROVIDER` raises an error instead of falling back to any hosted API.

---

## 5. Model and license (verified)

The default model is **Qwen2.5-7B-Instruct**, which is licensed **Apache-2.0**. Verified on the official model card:

- https://huggingface.co/Qwen/Qwen2.5-7B-Instruct — "License: apache-2.0"

A lighter alternative is **Qwen2.5-3B-Instruct**, but be aware that the *3B* size is **not** Apache-2.0: it ships under the **Qwen Research License**, which is non-commercial. Verified here:

- https://huggingface.co/Qwen/Qwen2.5-3B-Instruct/blob/main/LICENSE — "'Non-Commercial' shall mean for research or evaluation purposes only"

To use the smaller model anyway:

```bash
OLLAMA_MODEL=qwen2.5:3b uvicorn app.main:app --port 8000
```

Any other open-weight model that Ollama can serve works too (`llama3.2`, `gemma3`, `mistral`, …). Check that model's own license before commercial use. Ollama itself is MIT licensed.

**Not included:** no paid cloud model, no fallback to a hosted API, no hardcoded answers.

---

## 6. Installation

Requirements: Python 3.11+, Node 20+. Ollama is optional but required for written answers.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

On a first run the API creates `backend/data/echoes.db` and seeds the 12-entry fictional archive.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to `http://127.0.0.1:8000`; to point elsewhere, start it with `ECHOES_API_TARGET=http://host:port npm run dev`.

Production build: `npm run build` (runs `tsc --noEmit` first) then `npm run preview`.

### Ollama (optional, needed for generated answers)

```bash
ollama serve
ollama pull qwen2.5:7b
```

The app detects availability on its own. Until then, Ask Echoes returns retrieved evidence with an explicit "the local model is offline, so I won't write an answer" message, and the dashboard shows the exact commands to run.

---

## 7. Storage locations

| What | Where |
| --- | --- |
| Database | `backend/data/echoes.db` |
| Uploaded files | `backend/data/uploads/` |
| Override root | `ECHOES_DATA_DIR=/some/path` |

`backend/data/` is git-ignored: private memories are never committed.

---

## 8. Two-minute demo

1. **Landing** — "Some stories deserve to outlive us." Point out the local-first claim and the three-step explanation (Record → Retrieve → Answer).
2. **Archive** — the sample archive is loaded: 12 fictional entries about the Mehta family, 5 people, 10 categories. Note the status pill: model offline in this environment.
3. **Memory Vault** — open *Kamala's Kheer*. It is a real row: brass pot, cardamom crushed with a spoon, the recipe she never wrote down.
4. **Ask Echoes** — ask *"What was the special recipe in Grandma's memories?"* Retrieval returns the kheer and puran poli passages, the evidence panel lists them by number, and "How this was produced" shows the search terms and passage counts.
5. **Inspect sources** — click a source card to jump to that memory in the vault.
6. **Ask something unsupported** — *"What was Grandma's first job?"* No passage passes the gate, so ECHOES answers `not_found`: it searched all 12 memories and will not guess. Nothing was sent to a model.
7. **Explain the why** — swap the model with `OLLAMA_MODEL`, keep memories in a file you own, and note that the archive still works when the model does not.

To see a written answer, start Ollama first; the same question then produces a short cited answer.

---

## 9. Privacy architecture

- All memory content lives in one SQLite file plus an uploads folder that you control.
- Retrieval is in-process Python. No network call is made during a search.
- The only outbound calls in the app go to `OLLAMA_BASE_URL` (default `127.0.0.1:11434`). If you point that at a remote host, inference is no longer local — the status endpoint reports the endpoint it is using so you can see this.
- Uploaded originals are stored with a sanitised filename and a short random prefix; full local paths are not returned to the browser.
- No analytics, no telemetry, no accounts, no third-party AI keys.
- The UI loads two Google Fonts stylesheets at runtime; with no network it falls back to system serif/sans and everything else keeps working.

**Offline operation has not been verified.** The code makes no network requests other than the local Ollama endpoint and the font stylesheets, but this has not been tested with networking disabled.

---

## 10. Tests actually performed

Backend, against the running API (`uvicorn` on :8000):

| Check | Result |
| --- | --- |
| `GET /api/health`, `/api/status` | 200; status correctly reports Ollama unreachable and prints setup guidance |
| First-run seeding | 12 demo memories created, `is_demo` flagged |
| `POST /api/ask` supported question | 200, `status=model_unavailable`, 2 correct sources returned |
| `POST /api/ask` unsupported question | 200, `status=not_found`, 0 sources, no model call |
| Retrieval classification battery | 30/30 hand-written questions classified correctly (19 answerable, 11 unanswerable) |
| `POST /api/memories/upload` (.txt) | 201, text extracted, original stored, source metadata recorded |
| `POST /api/memories/upload` (.pdf) | 201, text layer extracted, page count recorded, original stored |
| Ask a question answered only by the uploaded file | Retrieved the upload as top source (both TXT and PDF) |
| Upload unsupported type (.xyz) | 415 with a readable message |
| `DELETE /api/memories/{id}` | 200, removed from index and stats |
| CRUD create/patch/delete | exercised through the UI and API |

Frontend: `tsc --noEmit` clean, `npm run build` succeeds, and the dev server was driven in Chromium — landing, dashboard, vault, ask and remembrance all render from live API data with no console errors.

**Not tested:** the actual generation path (no Ollama or model is installed on the build machine), PDF extraction from a scanned/complex layout PDF (only a generated text-layer PDF was used), and offline operation.

---

## 11. Known limitations

1. **Generation is unverified here.** No Ollama installation was available, so the code path that calls the model exists and is wired, but has not produced a real answer.
2. **No embeddings.** `sentence-transformers` needs a PyTorch download that did not fit the build; retrieval is lexical BM25. It handles the demo well but will miss pure paraphrase ("nani" ≠ "grandmother" unless tagged). Tags are the current bridge for family nicknames.
3. **Retrieval gate is a heuristic**, not semantics: half the question's words plus the topic word. It errs toward refusing.
4. **No OCR or audio.** Scanned PDFs are refused with a clear message rather than imported empty.
5. **Single user.** No auth, no per-user isolation; it is a personal archive meant to run on one machine.
6. **Conversation is one local session** — no thread management.
7. **PDF extraction quality** depends on the source file having a text layer.
8. **Frontend verified in Chromium at desktop and narrow widths only.**

---

## 12. Roadmap

- Embedding-backed retrieval (local model, e.g. a small sentence-transformers model) merged with BM25 for hybrid ranking.
- Entity resolution for family nicknames (Kamala = Grandma = Nani).
- Image uploads with previews; OCR for handwritten notes.
- Audio recording + local transcription.
- Time capsules and scheduled resurfacing.
- Encrypted archive export (ZIP), then full backup/restore.
- Optional local passphrase lock for the database.

---

## 13. Hacktoberfest submission copy

### What I Built

ECHOES, a private memory archive for family histories, and the retrieval layer that answers questions from it with citations — or refuses honestly. It solves the problem of family knowledge being scattered across formats and one living memory, without handing that knowledge to a hosted AI service.

### Demo

A two-minute walkthrough is in §8. No hosted demo URL is published, because the entire point is that the archive runs on your machine.

### Code

This repository: FastAPI backend in `backend/`, React frontend in `frontend/`.

### How I Built It

React + TypeScript + Tailwind on the front, FastAPI + SQLite on the back. Retrieval is a hand-written BM25 index over passages built from each memory (title, category, people, tags, body), gated by a word-coverage and topic-word rule so that unsupported questions end in a refusal before any model is invoked. Generation goes through a single Ollama adapter with a system prompt that permits citing only the numbered evidence passages and requires an `INSUFFICIENT_EVIDENCE` sentinel when the passages do not answer. The sample archive is fictional, but the retrieval, the storage and the refusal logic are real.

### Why Open Innovation Matters

A model that runs on your own machine can read your grandmother's letters. A model behind a hosted API cannot, without those letters leaving your control. Open weights make three things possible here: privacy (the data never has to travel), model choice (`OLLAMA_MODEL` is one environment variable), and independence (no key, no rate limit, no vendor deciding what your archive is allowed to process). The licence matters too — which is why the default is Apache-2.0 and the 3B variant's non-commercial licence is called out explicitly.

### My Agent Session

Not included: no shareable session link was produced for this build, so none is claimed.

### The Spirit of It

Most family history is lost by default — not dramatically, just because nobody wrote it down and the person who remembered it got older. ECHOES is a small, quiet argument that preserving it should not require trusting a company with it.

### Prize Categories

Claimed: none specific. The project genuinely uses open-weight models (§5) and is privacy-first (§9); anything beyond that would need a category list to check against.

---

## 14. Principle

> A memory archive should retrieve a real memory, explain its answer with genuine evidence, and admit when it does not know.

If a feature in this repository cannot do that, it is marked as not implemented rather than simulated.
