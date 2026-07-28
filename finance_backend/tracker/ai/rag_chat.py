"""
RAG (Retrieval-Augmented Generation) chat over a user's own transactions.

Scoped to the user's MOST RECENTLY UPLOADED statement only -- consistent
with how the dashboard works (tracker.services.insights.get_latest_statement).
This prevents old/test/fake uploads from mixing into answers about the
user's current, real data.
"""

import os

from openai import OpenAI

from .embeddings import query_similar_transactions

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

MODEL_NAME = "openrouter/free"

RAG_PROMPT = """You are a helpful personal finance assistant. Answer the
user's question using ONLY the transaction data provided below. Be specific
with numbers (use ₹ for amounts). Do not use Markdown formatting like
asterisks or bullet points -- respond in plain conversational sentences.
If the provided transactions don't contain enough information to answer
confidently, say so honestly rather than guessing.

Relevant transactions:
{context}

User's question: {question}

Answer in 2-4 sentences, in plain conversational language.
"""


def _format_transactions_for_prompt(transactions: list[dict]) -> str:
    if not transactions:
        return "(No relevant transactions found.)"

    lines = []
    for t in transactions:
        lines.append(
            f"- {t['date']}: {t['description']} | ₹{abs(t['amount']):.2f} "
            f"({'expense' if t['amount'] < 0 else 'income'}) | {t['category']}"
        )
    return "\n".join(lines)


def answer_question(user, question: str, top_k: int = 8) -> dict:
    """
    Runs the full RAG pipeline for a single question, scoped to the user's
    latest uploaded statement.
    """
    from tracker.services.insights import get_latest_statement

    statement = get_latest_statement(user)
    if statement is None:
        return {
            "answer": "You haven't uploaded any statements yet -- upload one first, then ask me about it.",
            "sources": [],
            "error": None,
        }

    try:
        retrieved = query_similar_transactions(user, statement, question, top_k=top_k)
    except Exception as e:
        print(f"[rag_chat] Retrieval failed: {e!r}")
        return {
            "answer": "Sorry, I couldn't search your transactions right now. Please try again.",
            "sources": [],
            "error": str(e),
        }

    context = _format_transactions_for_prompt(retrieved)
    prompt = RAG_PROMPT.format(context=context, question=question)

    try:
        if not os.getenv("OPENROUTER_API_KEY"):
            raise RuntimeError("OPENROUTER_API_KEY is not configured")

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        answer = response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[rag_chat] LLM call failed: {e!r}")
        return {
            "answer": "Sorry, I couldn't generate an answer right now. Please try again in a moment.",
            "sources": retrieved,
            "error": str(e),
        }

    return {"answer": answer, "sources": retrieved, "error": None}


def ask_and_save(user, question: str, top_k: int = 8):
    from tracker.models import ChatMessage

    ChatMessage.objects.create(user=user, role=ChatMessage.Role.USER, content=question)

    result = answer_question(user, question, top_k=top_k)

    ChatMessage.objects.create(user=user, role=ChatMessage.Role.ASSISTANT, content=result["answer"])

    return result