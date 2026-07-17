from __future__ import annotations

from .prompts import SYSTEM_PROMPT


def chat_with_rag(question: str, context: str = "") -> dict[str, str]:
    return {
        "system_prompt": SYSTEM_PROMPT,
        "question": question,
        "context": context,
        "answer": "RAG chat is scaffolded and ready for integration.",
    }

