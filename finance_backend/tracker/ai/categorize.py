"""
AI-powered transaction categorization using OpenRouter (free-tier models),
accessed via the OpenAI SDK since OpenRouter is OpenAI-API-compatible.

Categorizes a batch of transactions against a fixed set of Category names
(rather than letting the model invent new labels freely), which keeps
results consistent across uploads.
"""

import json
import os
import re
from dataclasses import dataclass

from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

# OpenRouter's free-model lineup rotates frequently (providers add/remove
# free capacity without much notice), so instead of hardcoding a specific
# model ID that can 404 overnight, use their auto-router: it picks among
# whatever free models are currently active. If you want a fixed model
# instead, check https://openrouter.ai/models?max_price=0 for what's live
# right now and swap this string.
MODEL_NAME = "openrouter/free"


@dataclass(frozen=True)
class HeuristicRule:
    category: str
    keywords: tuple[str, ...]


HEURISTIC_RULES: tuple[HeuristicRule, ...] = (
    HeuristicRule("Groceries", ("grocery", "groceries", "supermarket", "mart", "kirana", "dmart", "bigbasket", "blinkit", "instamart", "zepto", "fruit", "fruits", "vegetable", "vegetables", "veggies", "sabzi", "bhaji", "dairy", "milk", "provision", "farm fresh", "general store", "onion", "vegetable shop")),
    HeuristicRule("Dining", ("restaurant", "cafe", "dining", "swiggy", "zomato", "food", "pizza", "burger", "hotel", "eatery", "bakery", "sweets", "juice", "chaat", "tiffin", "meat", "chicken", "chiken", "mutton", "fish", "egg", "mcdonald", "kfc", "dominos", "subway", "tea", "chai", "icecream", "ice cream", "snacks", "mithai", "bhandar", "sweet")),
    HeuristicRule("Transport", ("uber", "ola", "metro", "bus", "taxi", "rapido", "fuel", "petrol", "diesel", "parking", "toll", "pump", "bpcl", "hpcl", "iocl", "indane", "service station", "motors", "auto service", "garage")),
    HeuristicRule("Bills & Subscriptions", ("electricity", "water bill", "bill", "subscription", "netflix", "prime", "hotstar", "spotify", "recharge", "broadband", "wifi", "mobile", "phonepe recharge", "apple", "linkedin", "google play", "app store", "icloud")),
    HeuristicRule("Shopping", ("amazon", "flipkart", "myntra", "ajio", "shopping", "mall", "store", "lifestyle", "pantaloons")),
    HeuristicRule("Health", ("pharmacy", "medical", "hospital", "clinic", "apollo", "medicine", "diagnostic", "lab")),
    HeuristicRule("Rent", ("rent", "housing", "lease", "landlord", "pg rent", "hostel")),
    HeuristicRule("Transfers", ("transfer", "sent to", "received from", "upi transfer", "bank transfer", "self transfer")),
    HeuristicRule("Entertainment", ("movie", "cinema", "theatre", "theater", "game", "gaming", "concert", "bookmyshow")),
)


def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9&\s]+", " ", (text or "").lower()).strip()


def _build_category_lookup(category_names: list[str]) -> dict[str, str]:
    lookup = {}
    for name in category_names:
        lookup[_normalize(name)] = name
    return lookup


# Words that indicate a payee is a business, not an individual -- used to
# tell "Paid to Ramesh Kumar" (a person, likely a P2P transfer) apart from
# "Paid to Ramesh Traders" (a business we just don't have a keyword for yet).
BUSINESS_INDICATOR_WORDS = (
    "shop", "store", "mart", "house", "motors", "pump", "station", "services",
    "service", "ltd", "pvt", "private", "limited", "bhandar", "restaurant",
    "hotel", "works", "enterprises", "agencies", "traders", "industries",
    "company", "corp", "association", "centre", "center", "cafe", "bakery",
    "lounge", "clinic", "hospital", "pharmacy", "electronics", "textiles",
    "communications", "solutions", "technologies", "systems", "studio",
)


def _looks_like_personal_name(text: str) -> bool:
    """
    Heuristic: if the payee text has no digits and no business-indicator
    words, it's very likely a plain individual's name (e.g. "Mohammad
    Ghouseuddin", "Vijay Kumar") rather than a business -- a strong signal
    this is a person-to-person transfer.
    """
    if any(ch.isdigit() for ch in text):
        return False
    words = set(text.split())
    if words & set(BUSINESS_INDICATOR_WORDS):  # whole-word match, not substring --
        return False                            # avoids false hits like "house" inside "ghouseuddin"
    word_count = len(words)
    return 1 <= word_count <= 5


def _heuristic_category(description: str, category_names: list[str]) -> tuple[str | None, float]:
    text = _normalize(description)
    # Strip common PhonePe/UPI prefixes so name-detection isn't thrown off by them
    payee_text = re.sub(r"^(paid to|received from|sent to)\s+", "", text).strip()

    category_lookup = _build_category_lookup(category_names)

    # Direct keyword hit against the category names first.
    for raw_name, normalized_name in category_lookup.items():
        if raw_name and raw_name in text:
            return normalized_name, 0.95

    # Then use curated keyword rules so we don't depend on AI/network for every row.
    for rule in HEURISTIC_RULES:
        if rule.category not in category_names:
            continue
        if any(keyword in text for keyword in rule.keywords):
            return rule.category, 0.85

    # Broad patterns that help with common UPI transaction text.
    if any(token in text for token in ("upi", "vpa", "imps", "neft", "rtgs")):
        if "Transfers" in category_names:
            return "Transfers", 0.7

    # No business keyword matched -- if the remaining payee text looks like
    # a plain person's name, treat it as a P2P transfer.
    if "Transfers" in category_names and _looks_like_personal_name(payee_text):
        return "Transfers", 0.6

    return None, 0.0


CATEGORIZATION_PROMPT = """You are categorizing personal bank/UPI transactions.

Available categories: {categories}

For each transaction below, choose the single most appropriate category from
the list above. Many transactions are UPI payments to small local vendors
(e.g. "Kamble Fruits", "Sharma Vegetables", "New Bakery") -- use your knowledge
of what that business name implies (a fruit seller, a bakery, a grocer, etc.)
to infer the right category, not just literal keyword matching. For example,
"Kamble Fruits" is a fruit vendor and should be categorized as "Groceries".

If the payee is clearly just an individual person's name with no business
indicator (e.g. "Mohammad Ghouseuddin", "Vijay Kumar", "Santosh Kumar") and
there is no other context, this is almost certainly a person-to-person
payment -- categorize it as "Transfers", not "Other".

Only use "Other" if the description gives no reasonable clue at all.

Respond ONLY with a JSON array, no markdown fences, no extra text, in this
exact shape, in the same order as given:
[{{"index": 0, "category": "Groceries", "confidence": 0.9}}, ...]

Transactions:
{transactions}
"""


def categorize_transactions(transactions: list, category_names: list[str]) -> list[dict]:
    """
    transactions: list of Transaction model instances (uncategorized)
    category_names: list of available Category.name strings

    Returns a list of dicts: [{"index": int, "category": str, "confidence": float}, ...]
    matching the input order. Falls back to "Other" for any transaction the
    model's response doesn't cover (safety net against malformed AI output).
    """
    if not transactions:
        return []

    txn_lines = "\n".join(
        f"{i}. {t.description} (amount: {t.amount})"
        for i, t in enumerate(transactions)
    )

    prompt = CATEGORIZATION_PROMPT.format(
        categories=", ".join(category_names),
        transactions=txn_lines,
    )

    heuristic_results = []
    for i, txn in enumerate(transactions):
        category, confidence = _heuristic_category(txn.description, category_names)
        heuristic_results.append({"index": i, "category": category, "confidence": confidence})

    # If every transaction already has a strong heuristic match, don't waste
    # tokens or risk the API overriding something obvious.
    if all(result["category"] for result in heuristic_results):
        return heuristic_results

    raw = None
    try:
        if not os.getenv("OPENROUTER_API_KEY"):
            raise RuntimeError("OPENROUTER_API_KEY is not configured")

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        raw = response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[categorize] OpenRouter API call failed: {e!r}")
        raw = None

    # Free models sometimes wrap output in ```json fences despite instructions -- strip if present
    if raw and raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()

    if not raw:
        return [
            result if result["category"] else {"index": result["index"], "category": "Other", "confidence": 0.0}
            for result in heuristic_results
        ]

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"[categorize] JSON parse failed: {e!r}")
        print(f"[categorize] Raw response was: {raw[:500]}")
        return [
            result if result["category"] else {"index": result["index"], "category": "Other", "confidence": 0.0}
            for result in heuristic_results
        ]

    # Some models wrap the array in an object (e.g. {"results": [...]})
    # despite the prompt asking for a raw array -- unwrap it if so.
    if isinstance(parsed, list):
        results = parsed
    elif isinstance(parsed, dict):
        list_values = [v for v in parsed.values() if isinstance(v, list)]
        results = list_values[0] if list_values else []
        if not results:
            print(f"[categorize] Unexpected JSON shape (dict with no list values): {parsed}")
    else:
        print(f"[categorize] Unexpected JSON shape: {type(parsed)}")
        results = []

    # Case-insensitive lookup so "groceries" from the AI still matches your
    # "Groceries" category instead of being silently discarded as None.
    category_names_lower = {name.strip().lower(): name for name in category_names}

    results_by_index = {}
    for r in results:
        if not isinstance(r, dict) or "index" not in r:
            continue
        raw_category = (r.get("category") or "").strip()
        matched_category = category_names_lower.get(raw_category.lower())
        confidence = r.get("confidence", 0.0)
        results_by_index[r["index"]] = {
            "index": r["index"],
            "category": matched_category,
            "confidence": confidence,
        }
        if raw_category and matched_category is None:
            print(f"[categorize] AI returned unrecognized category '{raw_category}' -- will fall back.")

    return [
        results_by_index.get(
            i,
            heuristic_results[i] if heuristic_results[i]["category"] else {"index": i, "category": "Other", "confidence": 0.0},
        )
        for i in range(len(transactions))
    ]


def run_categorization_for_statement(statement):
    """
    Categorizes all uncategorized transactions belonging to a given Statement,
    saving the results back to the database.
    """
    from tracker.models import Category, Transaction

    uncategorized = list(statement.transactions.filter(category__isnull=True))
    if not uncategorized:
        return 0

    categories = list(Category.objects.values_list("name", flat=True))
    if "Other" not in categories:
        Category.objects.get_or_create(name="Other", defaults={"is_default": True})
        categories.append("Other")

    # Batch in groups of 100 to minimize total API calls -- OpenRouter's
    # free tier also has a daily request cap (50-1000/day depending on
    # account credit history), so fewer, larger requests is safer.
    BATCH_SIZE = 100
    updated_count = 0

    for start in range(0, len(uncategorized), BATCH_SIZE):
        batch = uncategorized[start:start + BATCH_SIZE]
        results = categorize_transactions(batch, categories)

        # Case-insensitive, whitespace-tolerant lookup so minor formatting
        # differences in the model's response don't silently fall through to "Other".
        category_objs = {
            c.name.strip().lower(): c
            for c in Category.objects.filter(name__in=categories)
        }

        for txn, result in zip(batch, results):
            category_name = (result.get("category") or "Other").strip().lower()
            category_obj = category_objs.get(category_name)

            if category_obj is None:
                print(f"[categorize] No exact match for category '{result.get('category')}' -- falling back to Other.")
                category_obj = category_objs.get("other")

            txn.category = category_obj
            txn.category_confidence = result.get("confidence")
            txn.is_ai_categorized = True

        Transaction.objects.bulk_update(
            batch, ["category", "category_confidence", "is_ai_categorized"]
        )
        updated_count += len(batch)

    return updated_count