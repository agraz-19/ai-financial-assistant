"""
Embedding generation and ChromaDB storage/retrieval for transactions.

Uses sentence-transformers (runs fully locally, no API key, no rate limits)
to generate embeddings, and a persistent ChromaDB collection to store and
search them.

Design decisions (see project discussion):
- We embed DESCRIPTION + CATEGORY only, not amount. Embeddings capture
  semantic/textual meaning; numbers like "500" don't carry meaningful
  numeric relationships when embedded as text. Amount and date are stored
  as metadata instead, so they're still retrievable, just not used to
  influence which transactions get matched.
- Every transaction is namespaced by user_id in its metadata, and every
  query MUST filter by user_id. Without this, one user's RAG chat could
  surface another user's financial data -- a serious privacy bug, not a
  minor one.
"""

import threading

import chromadb
from django.conf import settings
from sentence_transformers import SentenceTransformer

# Lazy-loaded singletons -- the embedding model and Chroma client are
# expensive to initialize, so we only do it once per process, not per request.
_model = None
_model_lock = threading.Lock()
_chroma_client = None
_collection = None

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"  # small, fast, well-established default
COLLECTION_NAME = "transactions"


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:  # re-check inside the lock (double-checked locking)
                _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _model


def _get_collection():
    """
    Returns a persistent ChromaDB collection, creating the underlying
    on-disk store under BASE_DIR/chroma_data if it doesn't exist yet.
    """
    global _chroma_client, _collection
    if _collection is None:
        persist_dir = str(settings.BASE_DIR / "chroma_data")
        _chroma_client = chromadb.PersistentClient(path=persist_dir)
        _collection = _chroma_client.get_or_create_collection(name=COLLECTION_NAME)
    return _collection


def build_embedding_text(transaction) -> str:
    """
    The exact text that gets embedded for a transaction. Deliberately
    excludes amount -- see module docstring.
    """
    category_name = transaction.category.name if transaction.category else "Uncategorized"
    return f"{transaction.description} - {category_name}"


def embed_and_store_transactions(transactions: list) -> int:
    """
    Embeds a batch of Transaction instances and upserts them into ChromaDB.

    Uses upsert (not add) so re-running this on already-embedded transactions
    is safe and idempotent -- it just overwrites the existing entry rather
    than erroring or creating a duplicate.

    Only pass transactions that already have a category set -- category is
    part of what gets embedded, so this should run after categorization.

    Returns the number of transactions embedded.
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
    """
    Convenience wrapper: embeds all categorized transactions belonging to
    a given Statement. Call this after run_categorization_for_statement()
    has finished, so categories are already assigned.
    """
    transactions = list(statement.transactions.filter(category__isnull=False))
    return embed_and_store_transactions(transactions)


def query_similar_transactions(user, query_text: str, top_k: int = 5) -> list[dict]:
    """
    Embeds a natural-language question and returns the top_k most similar
    transactions belonging to the given user.

    Returns a list of dicts:
        [{"description": str, "amount": float, "date": str, "category": str,
          "transaction_id": int, "distance": float}, ...]
    sorted by relevance (lowest distance = most similar).

    ALWAYS filters by user_id -- never remove the `where` clause below.
    """
    model = _get_model()
    collection = _get_collection()

    query_embedding = model.encode([query_text]).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        where={"user_id": user.id},  # critical: never search across users
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