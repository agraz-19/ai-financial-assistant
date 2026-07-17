from __future__ import annotations


def build_embedding_text(*parts: str) -> str:
    return " ".join(part.strip() for part in parts if part and part.strip())

