"""AI adapter for local, open-weight inference through Ollama.

Design rules baked in here:

* One provider. `ECHOES_AI_PROVIDER` may only name a provider that exists in the
  registry; anything else raises instead of quietly paginating off to a cloud API.
* If Ollama is unreachable, or the configured model is not pulled, we say so. We
  never synthesise an answer locally and present it as model output.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

import httpx

from .config import AI_PROVIDER, OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
from .retrieval import Hit

NOT_FOUND_SENTINEL = "INSUFFICIENT_EVIDENCE"

SYSTEM_PROMPT = """You are ECHOES, the retrieval layer of a private family memory archive.

Hard rules:
1. Answer ONLY from the numbered evidence passages given to you. You have no other knowledge of this family.
2. Cite every factual claim inline with bracketed passage numbers, like [1] or [2][3].
3. If the passages do not contain the answer, reply with exactly INSUFFICIENT_EVIDENCE and nothing else.
   Do not guess, infer from general knowledge, or invent names, dates, places, or events.
4. Never invent a passage number. Only cite numbers that appear in the evidence.
5. Answer in the past tense of a memoir, in 2 to 4 sentences, warm but factual. No preamble, no headings.
6. If passages disagree, say so plainly."""


@dataclass
class AIStatus:
    provider: str = "ollama"
    model: str = OLLAMA_MODEL
    available: bool = False
    model_ready: bool = False
    models: list[str] = field(default_factory=list)
    detail: str = ""
    endpoint: str = OLLAMA_BASE_URL

    def to_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "model": self.model,
            "available": self.available,
            "model_ready": self.model_ready,
            "models": self.models,
            "detail": self.detail,
            "endpoint": self.endpoint,
            "local": True,
        }


@dataclass
class Generation:
    ok: bool
    text: str = ""
    error: str = ""
    latency_ms: int = 0


class OllamaProvider:
    name = "ollama"

    def __init__(self, base_url: str = OLLAMA_BASE_URL, model: str = OLLAMA_MODEL) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def status(self) -> AIStatus:
        status = AIStatus(model=self.model, endpoint=self.base_url)
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                payload = response.json()
        except httpx.ConnectError:
            status.detail = (
                f"No Ollama server answered at {self.base_url}. Start it with `ollama serve`, "
                f"then pull a model with `ollama pull {self.model}`."
            )
            return status
        except Exception as exc:  # pragma: no cover - transport edge cases
            status.detail = f"Could not reach Ollama at {self.base_url}: {exc.__class__.__name__}."
            return status

        status.available = True
        names = [m.get("name", "") for m in payload.get("models", []) if m.get("name")]
        status.models = names
        # Accept "qwen2.5:3b" matching "qwen2.5:3b" or "qwen2.5:latest" for "qwen2.5".
        base = self.model.split(":")[0]
        status.model_ready = any(
            name == self.model or name == f"{self.model}:latest" or name.split(":")[0] == base
            for name in names
        )
        if not status.model_ready:
            status.detail = (
                f"Ollama is running, but `{self.model}` is not pulled. "
                f"Run `ollama pull {self.model}` (or set OLLAMA_MODEL to one of: "
                f"{', '.join(names) or 'none installed'})."
            )
        return status

    async def generate(self, system: str, prompt: str) -> Generation:
        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "stream": False,
                        "options": {"temperature": 0.2, "num_predict": 320, "top_p": 0.9},
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user", "content": prompt},
                        ],
                    },
                )
                response.raise_for_status()
                payload = response.json()
        except httpx.ConnectError:
            return Generation(
                ok=False,
                error=f"Ollama is not reachable at {self.base_url}.",
                latency_ms=int((time.perf_counter() - started) * 1000),
            )
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:300]
            return Generation(
                ok=False,
                error=f"Ollama returned {exc.response.status_code}: {detail}",
                latency_ms=int((time.perf_counter() - started) * 1000),
            )
        except Exception as exc:  # pragma: no cover
            return Generation(
                ok=False,
                error=f"Inference failed ({exc.__class__.__name__}).",
                latency_ms=int((time.perf_counter() - started) * 1000),
            )

        text = (payload.get("message") or {}).get("content", "").strip()
        return Generation(
            ok=True,
            text=text,
            latency_ms=int((time.perf_counter() - started) * 1000),
        )


PROVIDERS = {"ollama": OllamaProvider}


def get_provider() -> OllamaProvider:
    try:
        factory = PROVIDERS[AI_PROVIDER]
    except KeyError:
        raise RuntimeError(
            f"Unknown ECHOES_AI_PROVIDER={AI_PROVIDER!r}. Only local providers are supported: "
            f"{sorted(PROVIDERS)}. Refusing to fall back to a hosted model."
        ) from None
    return factory()


def build_prompt(question: str, hits: list[Hit]) -> str:
    blocks = []
    for rank, hit in enumerate(hits, start=1):
        p = hit.passage
        meta = " | ".join(
            part
            for part in [
                p.category,
                p.memory_date or "undated",
                ("people: " + ", ".join(p.people)) if p.people else "",
            ]
            if part
        )
        blocks.append(f"[{rank}] {p.title} ({meta})\n{p.text}")
    evidence = "\n\n".join(blocks)
    return (
        f"EVIDENCE PASSAGES\n{evidence}\n\n"
        f"QUESTION\n{question}\n\n"
        "Answer using only the evidence above, citing passage numbers."
    )
