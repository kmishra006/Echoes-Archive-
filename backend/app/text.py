"""Text normalisation and passage splitting used by retrieval and ingestion."""

from __future__ import annotations

import re
from typing import Iterable

_WORD_RE = re.compile(r"[a-z0-9]+")

# Ordinary English function words and contractions. Removed from both the index and
# the question so that "what was" never counts as evidence.
STOPWORDS: frozenset[str] = frozenset(
    """
    a about above after again against all am an and any are as at be because been before
    being below between both but by can cannot could did do does doing done down during
    each few for from further had has have having he her here hers herself him himself
    his how i if in into is it its itself just me more most my myself no nor not of off
    on once only or other ought our ours ourselves out over own same she should so some
    such than that the their theirs them themselves then there these they this those
    through to too under until up very was we were what when where which while who whom
    why will with would you your yours yourself yourselves s t
    dont doesnt didnt cant wont isnt arent wasnt werent hasnt havent wouldnt couldnt
    shouldnt im ive id ill youre theyre thats whats lets heres theres
    exactly really actually please again maybe perhaps still ever never just about
    """.split()
)

# Words about the interface rather than the life being described. "Do we have any
# memories about Diwali?" must be scored on "diwali", not on "memories".
META_WORDS: frozenset[str] = frozenset(
    """
    memory memories archive archived entry entries echo echoes remember remembers
    remembering recall recalls tell tells told say says said know knows anything
    something note notes record records mention mentions mentioned documented exist
    exists available related regarding story stories happen happened happening
    """.split()
)


def stem(token: str) -> str:
    """Deliberately crude suffix stripping: enough to match cooking/cooked/cooks."""
    if len(token) > 5 and token.endswith("ing"):
        token = token[:-3]
        if len(token) > 3 and token[-1] == token[-2] and token[-1] not in "aeiou":
            token = token[:-1]  # cookking -> cook
        return token
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 4 and token.endswith("ed"):
        token = token[:-2]
        if len(token) > 3 and token[-1] == token[-2] and token[-1] not in "aeiou":
            token = token[:-1]  # stopped -> stop
        return token
    if len(token) > 4 and token.endswith("es") and not token.endswith("ses"):
        return token[:-2]
    if len(token) > 3 and token.endswith("s") and not token.endswith("ss"):
        return token[:-1]
    return token


def tokenize(text: str) -> list[str]:
    normalised = text.lower().replace("\u2019", "'")
    normalised = re.sub(r"'s\b", "", normalised)  # Grandma's -> Grandma
    normalised = normalised.replace("'", "")  # don't -> dont (stoplisted above)
    return _WORD_RE.findall(normalised)


def index_tokens(text: str) -> list[str]:
    return [stem(t) for t in tokenize(text) if t not in STOPWORDS and len(t) > 1]


def query_terms(question: str) -> list[str]:
    """Meaningful, deduplicated terms from a user question."""
    seen: list[str] = []
    for raw in tokenize(question):
        if raw in STOPWORDS or raw in META_WORDS or len(raw) < 2:
            continue
        token = stem(raw)
        if token not in seen:
            seen.append(token)
    return seen


_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")


def split_passages(content: str, *, max_chars: int = 520) -> list[str]:
    """Split a memory into retrieval-sized passages, preferring sentence boundaries."""
    sentences = [s.strip() for s in _SENTENCE_SPLIT.split(content) if s and s.strip()]
    if not sentences:
        return []
    passages: list[str] = []
    buffer = ""
    for sentence in sentences:
        if buffer and len(buffer) + len(sentence) + 1 > max_chars:
            passages.append(buffer)
            buffer = sentence
        else:
            buffer = f"{buffer} {sentence}".strip()
    if buffer:
        passages.append(buffer)
    # Very long single sentences still get windowed so evidence stays citable.
    windowed: list[str] = []
    for passage in passages:
        while len(passage) > max_chars * 2:
            windowed.append(passage[:max_chars])
            passage = passage[max_chars:]
        windowed.append(passage)
    return [p.strip() for p in windowed if p.strip()]


def excerpt(text: str, limit: int = 240) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "\u2026"


def normalise_names(values: Iterable[str] | str | None) -> list[str]:
    """Accept the comma-separated string a form field produces, or a real list."""
    if values is None:
        return []
    if isinstance(values, str):
        raw = re.split(r"[,;\n]", values)
    else:
        raw = list(values)
    out: list[str] = []
    for value in raw:
        cleaned = str(value).strip()
        if cleaned and cleaned not in out:
            out.append(cleaned)
    return out
