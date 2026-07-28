"""
Embedding generation and ChromaDB storage/retrieval for transactions.

Uses sentence-transformers (runs fully locally, no API key, no rate limits)
to generate embeddings, and a persistent ChromaDB collection to store and
search them.

Design decisions:
- We embed DESCRIPTION + CATEGORY only, not amount (see build_embedding_text).
- Every transaction is namespaced by BOTH user_id and statement_id in its
  metadata. Queries filter by both -- not just user_id -- so retrieval is
  scoped to one specific uploaded statement, consistent with how the
  dashboard works (build_dashboard_context / get_latest_statement). Without
  the statement_id filter, chat answers could mix data from unrelated
  uploads (e.g. test/fake data mixing with real data).
"""

import threading

import chromadb
from django.conf import settings
from sentence_transformers import SentenceTransformer

_model = None
_model_lock = threading.Lock()
_chroma_client = None
_collection = None

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
COLLECTION_NAME = "transactions"


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _model


def _get_collection():
    global _chroma_client, _collection
    if _collection is None:
        persist_dir = str(settings.BASE_DIR / "chroma_data")
        _chroma_client = chromadb.PersistentClient(path=persist_dir)
        _collection = _chroma_client.get_or_create_collection(name=COLLECTION_NAME)
    return _collection


def build_embedding_text(transaction) -> str:
    category_name = transaction.category.name if transaction.category else "Uncategorized"
    return f"{transaction.description} - {category_name}"


def embed_and_store_transactions(transactions: list) -> int:
    """
    Embeds a batch of Transaction instances and upserts them into ChromaDB.
    Each entry's metadata includes both user_id AND statement_id, so
    retrieval can be scoped to a single upload.
    """
    transactions = [t for t in transactions if t.category is not None]
    if not transactions:
        return 0

    model = _get_model()
    collection = _get_collection()

    texts = [build_embedding_text(t) for t in transactions]
    embeddings = model.encode(texts, show_progress_bar=False).tolist()

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

    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )

    return len(transactions)


def embed_transactions_for_statement(statement) -> int:
    transactions = list(statement.transactions.filter(category__isnull=False))
    return embed_and_store_transactions(transactions)


def query_similar_transactions(user, statement, query_text: str, top_k: int = 5) -> list[dict]:
    """
    Embeds a natural-language question and returns the top_k most similar
    transactions belonging to the given user AND the given statement.

    `statement` is required (not optional) -- retrieval is always scoped to
    one specific upload, matching how the dashboard behaves. Pass in
    tracker.services.insights.get_latest_statement(user) if you want "the
    most recently uploaded statement," which is the current app-wide default.
    """
    model = _get_model()
    collection = _get_collection()

    query_embedding = model.encode([query_text]).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        where={
            "$and": [
                {"user_id": user.id},
                {"statement_id": statement.id},
            ]
        },
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