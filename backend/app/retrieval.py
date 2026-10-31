"""Local passage retrieval: BM25 over passages built from the archive.

This is the layer that makes answers *grounded*. It runs entirely in-process
against rows already in the local SQLite file -- no network, no vector service.

Two signals are combined:

* BM25 score      -- classic term-frequency / inverse-document-frequency ranking.
* coverage        -- the IDF-weighted share of the question's meaningful words that
                     the passage actually contains. A question asking something the
                     archive never mentions ("first job") matches only its thinnest
                     words, so coverage collapses and we refuse to answer.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any

from . import db
from .config import MAX_EVIDENCE, MIN_MATCH_RATIO
from .text import excerpt, index_tokens, query_terms

K1 = 1.4
B = 0.72


@dataclass
class Passage:
    memory_id: str
    title: str
    memory_date: str | None
    category: str
    people: list[str]
    text: str
    tags: list[str] = field(default_factory=list)
    tokens: list[str] = field(default_factory=list)
    length: int = 0


@dataclass
class Hit:
    passage: Passage
    score: float
    coverage: float
    matched: list[str]
    match_ratio: float = 0.0

    def to_evidence(self, rank: int) -> dict[str, Any]:
        return {
            "index": rank,
            "memory_id": self.passage.memory_id,
            "title": self.passage.title,
            "memory_date": self.passage.memory_date,
            "category": self.passage.category,
            "people": self.passage.people,
            "text": self.passage.text,
            "excerpt": excerpt(self.passage.text),
            "score": round(self.score, 4),
            "coverage": round(self.coverage, 3),
            "match_ratio": round(self.match_ratio, 2),
        }


class Index:
    def __init__(self, passages: list[Passage]) -> None:
        self.passages = passages
        self.doc_freq: dict[str, int] = {}
        self.avg_len = 0.0
        self._build()

    def _build(self) -> None:
        total = 0
        for passage in self.passages:
            # Metadata is part of the record: a memory filed under "Recipe", tagged
            # "grandma", about "Kamala Mehta", should be findable by any of those words.
            searchable = " ".join(
                [
                    passage.title,
                    passage.category,
                    " ".join(passage.people),
                    " ".join(passage.tags),
                    passage.text,
                ]
            )
            passage.tokens = index_tokens(searchable)
            passage.length = len(passage.tokens)
            total += passage.length
            for token in set(passage.tokens):
                self.doc_freq[token] = self.doc_freq.get(token, 0) + 1
        self.avg_len = (total / len(self.passages)) if self.passages else 0.0

    def idf(self, token: str) -> float:
        n = len(self.passages)
        df = self.doc_freq.get(token, 0)
        if n == 0:
            return 0.0
        # A word the archive never uses (df == 0) must not dominate the coverage
        # maths, or a question full of invented terms would look 90% unmatched and
        # a normal generic word would never be forgivable. Absent terms are weighted
        # the same as a term that appears exactly once in the whole archive.
        effective_df = max(df, 1)
        return math.log(1 + (n - effective_df + 0.5) / (effective_df + 0.5))

    def search(self, question: str, limit: int = MAX_EVIDENCE) -> list[Hit]:
        terms = query_terms(question)
        if not terms or not self.passages:
            return []
        weights = {t: self.idf(t) for t in terms}
        total_weight = sum(weights.values()) or 1.0
        topic = terms[-1]

        hits: list[Hit] = []
        for passage in self.passages:
            counts: dict[str, int] = {}
            for token in passage.tokens:
                counts[token] = counts.get(token, 0) + 1
            matched = [t for t in terms if counts.get(t)]
            if not matched:
                continue
            norm = K1 * (1 - B + B * (passage.length / (self.avg_len or 1.0)))
            score = 0.0
            for token in matched:
                tf = counts[token]
                score += weights[token] * (tf * (K1 + 1)) / (tf + norm)
            coverage = sum(weights[t] for t in matched) / total_weight
            hit = Hit(
                passage=passage,
                score=score,
                coverage=coverage,
                matched=matched,
                match_ratio=len(matched) / len(terms),
            )
            if hit.match_ratio < MIN_MATCH_RATIO:
                continue
            # The last content word carries the topic in English questions
            # ("...Grandma's special **recipe**" vs "...Grandma's first **job**").
            # If the topic word is nowhere in the passage, this is not evidence --
            # unless two genuinely rare words do match, which is strong on its own.
            distinctive = sum(1 for t in matched if self.doc_freq.get(t, 0) <= 2)
            if topic not in matched and distinctive < 2:
                continue
            hits.append(hit)

        hits.sort(key=lambda h: (h.score * (0.35 + h.coverage), h.score), reverse=True)

        # Keep only the strongest passage per memory so citations are not duplicated.
        deduped: list[Hit] = []
        seen: set[str] = set()
        for hit in hits:
            if hit.passage.memory_id in seen:
                continue
            seen.add(hit.passage.memory_id)
            deduped.append(hit)
            if len(deduped) >= limit:
                break
        return deduped


_cache: Index | None = None


def invalidate() -> None:
    global _cache
    _cache = None


def get_index() -> Index:
    global _cache
    if _cache is None:
        passages: list[Passage] = []
        for memory in db.list_memories():
            for chunk in _split(memory["content"]):
                passages.append(
                    Passage(
                        memory_id=memory["id"],
                        title=memory["title"],
                        memory_date=memory["memory_date"],
                        category=memory["category"],
                        people=memory["people"],
                        text=chunk,
                        tags=memory["tags"],
                    )
                )
        _cache = Index(passages)
    return _cache


def _split(content: str) -> list[str]:
    from .text import split_passages

    return split_passages(content)


def search(question: str, limit: int = MAX_EVIDENCE) -> list[Hit]:
    return get_index().search(question, limit)


def diagnostic(question: str) -> dict[str, Any]:
    """Explain what retrieval saw. Used by the API so the UI can be honest."""
    index = get_index()
    terms = query_terms(question)
    hits = index.search(question)
    return {
        "query_terms": terms,
        "passages_indexed": len(index.passages),
        "min_match_ratio": MIN_MATCH_RATIO,
        "hits": len(hits),
        "top_coverage": round(hits[0].coverage, 3) if hits else 0.0,
        "top_match_ratio": round(hits[0].match_ratio, 2) if hits else 0.0,
    }
