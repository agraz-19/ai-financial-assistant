"""
RAG (Retrieval-Augmented Generation) chat over a user's own transactions.

Flow:
  user question -> embed question -> retrieve top-k similar transactions
  from ChromaDB (scoped to this user) -> build a prompt with those
  transactions as context -> send to the LLM -> return a grounded answer

Uses OpenRouter via the OpenAI SDK, same as categorize.py.
"""

import os

from openai import OpenAI

from .embeddings import query_similar_transactions

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

MODEL_NAME = "openrouter/free"  # auto-router -- see categorize.py for why

RAG_PROMPT = """You are a helpful personal finance assistant. Answer the
user's question using ONLY the transaction data provided below. Be specific
with numbers (use ₹ for amounts). Do not use Markdown formatting like
asterisks or bullet points -- respond in plain conversational sentences.


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
    Runs the full RAG pipeline for a single question.

    Returns a dict:
        {"answer": str, "sources": list[dict], "error": str | None}

    `sources` is the list of transactions that were retrieved and used as
    context, useful if you want to show "based on these transactions" in the UI.
    """
    try:
        retrieved = query_similar_transactions(user, question, top_k=top_k)
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
            temperature=0.3,  # a little higher than categorization -- this is conversational, not classification
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
    """
    Runs answer_question() and persists both sides of the conversation as
    ChatMessage rows. Returns the same dict as answer_question().
    """
    from tracker.models import ChatMessage

    ChatMessage.objects.create(user=user, role=ChatMessage.Role.USER, content=question)

    result = answer_question(user, question, top_k=top_k)

    ChatMessage.objects.create(user=user, role=ChatMessage.Role.ASSISTANT, content=result["answer"])

    return result