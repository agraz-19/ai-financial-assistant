"""
Embedding generation and ChromaDB storage/retrieval for transactions.

Uses Google's Gemini embedding API (via the google-genai SDK) to generate
embeddings, and a persistent ChromaDB collection to store and search them.

This deliberately avoids sentence-transformers/torch: running a local
embedding model needs 1-2GB+ RAM just to import torch, which OOM-kills the
app on memory-constrained hosts (e.g. Render's free/starter tiers). Calling
Gemini's embedding API instead means the heavy lifting happens on Google's
side -- our process only sends text and gets back a vector, no local model
weights loaded at all.

Design decisions:
- We embed DESCRIPTION + CATEGORY only, not amount (see build_embedding_text).
- Every transaction is namespaced by BOTH user_id and statement_id in its
  metadata. Queries filter by both -- not just user_id -- so retrieval is
  scoped to one specific uploaded statement, consistent with how the
  dashboard works (build_dashboard_context / get_latest_statement). Without
  the statement_id filter, chat answers could mix data from unrelated
  uploads (e.g. test/fake data mixing with real data).
"""

import os
import threading

from django.conf import settings

_genai_client = None
_client_lock = threading.Lock()
_chroma_client = None
_collection = None

EMBEDDING_MODEL_NAME = "gemini-embedding-001"
EMBEDDING_DIMENSION = 768

# Renamed from "transactions" -- the old collection held 384-dim vectors
# from the local sentence-transformers model. ChromaDB collections require
# a fixed dimension, so switching embedding providers needs a fresh
# collection rather than upserting mismatched-dimension vectors.
COLLECTION_NAME = "transactions_gemini"


def _get_genai_client():
    global _genai_client
    if _genai_client is None:
        with _client_lock:
            if _genai_client is None:
                from google import genai
                api_key = os.getenv("GEMINI_API_KEY")
                if not api_key:
                    raise RuntimeError("GEMINI_API_KEY is not configured")
                _genai_client = genai.Client(api_key=api_key)
    return _genai_client


def _get_collection():
    global _chroma_client, _collection
    if _collection is None:
        import chromadb
        persist_dir = str(settings.BASE_DIR / "chroma_data")
        _chroma_client = chromadb.PersistentClient(path=persist_dir)
        _collection = _chroma_client.get_or_create_collection(name=COLLECTION_NAME)
    return _collection


def _embed_texts(texts: list[str], task_type: str) -> list[list[float]]:
    if not texts:
        return []

    client = _get_genai_client()
    from google.genai import types

    result = client.models.embed_content(
        model=EMBEDDING_MODEL_NAME,
        contents=texts,
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=EMBEDDING_DIMENSION,
        ),
    )
    return [embedding.values for embedding in result.embeddings]


def build_embedding_text(transaction) -> str:
    category_name = transaction.category.name if transaction.category else "Uncategorized"
    return f"{transaction.description} - {category_name}"


def embed_and_store_transactions(transactions: list) -> int:
    transactions = [t for t in transactions if t.category is not None]
    if not transactions:
        return 0

    collection = _get_collection()
    texts = [build_embedding_text(t) for t in transactions]

    BATCH_SIZE = 100
    embeddings: list[list[float]] = []
    for start in range(0, len(texts), BATCH_SIZE):
        chunk = texts[start:start + BATCH_SIZE]
        embeddings.extend(_embed_texts(chunk, task_type="RETRIEVAL_DOCUMENT"))

    ids = [str(t.id) for t in transactions]
    metadatas = [
        {
            "user_id": t.user_id,
            "statement_id": t.statement_id,
            "transaction_id": t.id,
            "amount": float(t.amount),
            "date": str(t.date),
            "category": t.category.name,
        }
        for t in transactions
    ]

    collection.upsert(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
    return len(transactions)


def embed_transactions_for_statement(statement) -> int:
    transactions = list(statement.transactions.filter(category__isnull=False))
    return embed_and_store_transactions(transactions)


def query_similar_transactions(user, statement, query_text: str, top_k: int = 5) -> list[dict]:
    collection = _get_collection()
    query_embedding = _embed_texts([query_text], task_type="RETRIEVAL_QUERY")

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        where={"$and": [{"user_id": user.id}, {"statement_id": statement.id}]},
    )

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    matches = []
    for doc, meta, dist in zip(documents, metadatas, distances):
        matches.append({
            "description": doc,
            "amount": meta.get("amount"),
            "date": meta.get("date"),
            "category": meta.get("category"),
            "transaction_id": meta.get("transaction_id"),
            "distance": dist,
        })
    return matches