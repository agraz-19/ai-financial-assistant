from __future__ import annotations

import json
import os
import re
from decimal import Decimal

import pandas as pd
from django.core.cache import cache
from django.db.models import QuerySet
from django.utils import timezone
from openai import OpenAI
from django.db.models import F
from tracker.ai.prompts import INSIGHTS_PROMPT, INSIGHTS_SYSTEM_PROMPT
from tracker.models import MonthlyInsight, Statement, Transaction

OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "gpt-4o-mini")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

DASHBOARD_CACHE_TTL = 60 * 15  # 15 minutes

MERCHANT_PREFIX_PATTERN = re.compile(r"^(paid to|received from|sent to)\s+", re.IGNORECASE)

def _compute_health_score(total_spending, monthly_income, savings, uncategorized_count, transaction_count) -> int:
    """
    Lightweight, explainable 0-100 score -- not a real credit-style model.
    Rewards a healthy savings rate, penalizes negative savings and a high
    proportion of uncategorized transactions (signals messy/incomplete data).
    """
    if monthly_income <= 0:
        return 0 if total_spending > 0 else 50

    savings_rate = savings / monthly_income  # can be negative
    score = 50 + (savings_rate * 200)  # ~25% savings rate -> 100

    if transaction_count:
        uncategorized_ratio = uncategorized_count / transaction_count
        score -= uncategorized_ratio * 15

    return int(round(max(0, min(100, score))))

def _money(value: float | Decimal | int) -> str:
    return f"Rs. {float(value):,.2f}"


def get_latest_statement(user) -> Statement | None:
    """
    Sorts by processed_at (falls back to uploaded_at) so reprocessing a
    statement makes it "latest" again.
    """
    return (
        Statement.objects.filter(user=user)
        .order_by(F("processed_at").desc(nulls_last=True), "-uploaded_at")
        .first()
    )


def _build_dataframe(transactions: QuerySet[Transaction]) -> pd.DataFrame:
    rows = []
    for txn in transactions.select_related("category"):
        rows.append(
            {
                "date": txn.date,
                "amount": float(txn.amount),
                "category": txn.category.name if txn.category else "Other",
            }
        )

    if not rows:
        return pd.DataFrame(columns=["date", "amount", "category"])

    frame = pd.DataFrame(rows)
    frame["date"] = pd.to_datetime(frame["date"])
    frame["amount"] = pd.to_numeric(frame["amount"])
    frame["category"] = frame["category"].fillna("Other")
    return frame


def build_monthly_financial_summary(transactions: QuerySet[Transaction]) -> dict:
    frame = _build_dataframe(transactions)

    if frame.empty:
        return {
            "total_spending": 0.0,
            "monthly_income": 0.0,
            "savings": 0.0,
            "highest_expense_category": "None",
            "spending_per_category": [],
            "summary_text": "No transactions found.",
        }

    expense_frame = frame[frame["amount"] < 0].copy()
    income_frame = frame[frame["amount"] > 0].copy()
    expense_frame["spend"] = expense_frame["amount"].abs()

    spending_per_category = (
        expense_frame.groupby("category", as_index=False)["spend"]
        .sum()
        .sort_values("spend", ascending=False)
    )

    total_spending = round(float(expense_frame["spend"].sum()), 2) if not expense_frame.empty else 0.0
    monthly_income = round(float(income_frame["amount"].sum()), 2) if not income_frame.empty else 0.0
    savings = round(monthly_income - total_spending, 2)
    highest_expense_category = (
        spending_per_category.iloc[0]["category"] if not spending_per_category.empty else "None"
    )

    # Explicitly ground the AI in the REAL date range of this data --
    # without this, the model has no idea what period it's summarizing and
    # will invent a plausible-sounding month/period on its own (observed:
    # it hallucinated "October" for an Apr-Jul statement).
    period_start = frame["date"].min().strftime("%d %b %Y")
    period_end = frame["date"].max().strftime("%d %b %Y")

    summary_lines = [
        f"Statement period: {period_start} to {period_end} (do not refer to any other month or date range)",
        f"Total spending: {_money(total_spending)}",
        f"Highest expense category: {highest_expense_category}",
        f"Monthly income: {_money(monthly_income)}",
        f"Savings: {_money(savings)}",
    ]
    for _, row in spending_per_category.iterrows():
        summary_lines.append(f"{row['category']}: {_money(row['spend'])}")

    return {
        "total_spending": total_spending,
        "monthly_income": monthly_income,
        "savings": savings,
        "highest_expense_category": highest_expense_category,
        "spending_per_category": [
            {"category": row["category"], "amount": round(float(row["spend"]), 2)}
            for _, row in spending_per_category.iterrows()
        ],
        "summary_text": "\n".join(summary_lines),
    }


def _normalize_merchant(description: str) -> str:
    """Strips 'Paid to' / 'Received from' / 'Sent to' prefixes so the same
    merchant paid multiple times groups together correctly."""
    return MERCHANT_PREFIX_PATTERN.sub("", description or "").strip()


def build_extended_analytics(transactions: QuerySet[Transaction]) -> dict:
    """
    Day 18 additions: largest single expense, most frequent merchant, a
    month-by-month spending/income trend, and a simple trailing-average
    next-month spending estimate.

    The prediction is a lightweight, transparent estimate (average of the
    last up to 3 months' spending) -- not a real forecasting model. Framed
    honestly as an estimate rather than implying more predictive power than
    it actually has.
    """
    txn_list = list(transactions.select_related("category"))

    if not txn_list:
        return {
            "largest_expense": None,
            "most_frequent_merchant": None,
            "monthly_trend": [],
            "predicted_next_month_spend": None,
        }

    # --- Largest single expense ---
    expenses = [t for t in txn_list if t.amount < 0]
    largest_expense = None
    if expenses:
        biggest = min(expenses, key=lambda t: t.amount)  # most negative = largest expense
        largest_expense = {
            "description": biggest.description,
            "amount": abs(float(biggest.amount)),
            "date": biggest.date,
            "category": biggest.category.name if biggest.category else "Other",
        }

    # --- Most frequent merchant (by normalized description) ---
    merchant_counts: dict[str, int] = {}
    merchant_display: dict[str, str] = {}
    for t in txn_list:
        key = _normalize_merchant(t.description).upper()
        if not key:
            continue
        merchant_counts[key] = merchant_counts.get(key, 0) + 1
        merchant_display.setdefault(key, _normalize_merchant(t.description))

    most_frequent_merchant = None
    if merchant_counts:
        top_key = max(merchant_counts, key=merchant_counts.get)
        most_frequent_merchant = {
            "name": merchant_display[top_key],
            "count": merchant_counts[top_key],
        }

    # --- Monthly trend, grouped by calendar month within this statement's data ---
    frame = _build_dataframe(transactions)
    monthly_trend = []
    if not frame.empty:
        frame["month_period"] = frame["date"].dt.to_period("M")
        grouped = frame.groupby("month_period")["amount"].agg(
            spending=lambda s: -s[s < 0].sum(),
            income=lambda s: s[s > 0].sum(),
        ).reset_index()
        grouped = grouped.sort_values("month_period")

        for _, row in grouped.iterrows():
            monthly_trend.append({
                "month": row["month_period"].strftime("%b %Y"),
                "spending": round(float(row["spending"]), 2),
                "income": round(float(row["income"]), 2),
            })

    # --- Simple trailing-average prediction ---
    predicted_next_month_spend = None
    if monthly_trend:
        recent = monthly_trend[-3:]  # up to the last 3 months
        predicted_next_month_spend = round(sum(m["spending"] for m in recent) / len(recent), 2)

    return {
        "largest_expense": largest_expense,
        "most_frequent_merchant": most_frequent_merchant,
        "monthly_trend": monthly_trend,
        "predicted_next_month_spend": predicted_next_month_spend,
    }


def _fallback_ai_response(summary: dict) -> dict:
    recommendations = []
    if summary["highest_expense_category"] != "None":
        recommendations.append(f"Review spending in {summary['highest_expense_category']}.")
    if summary["total_spending"] > summary["monthly_income"]:
        recommendations.append("Your spending is above your income. Tighten discretionary expenses.")
    else:
        recommendations.append("Keep building savings by maintaining this gap between income and spend.")
    recommendations.append("Set a monthly cap for your top category and track it weekly.")

    return {
        "spending_summary": (
            f"You spent {_money(summary['total_spending'])} in this statement. "
            f"Your highest expense category was {summary['highest_expense_category']}."
        ),
        "budget_advice": (
            f"Income was {_money(summary['monthly_income'])} and savings were {_money(summary['savings'])}. "
            "Try to keep at least 20% of income aside if possible."
        ),
        "recommendations": recommendations[:3],
    }
def resolve_dashboard_statement(user, scope: str, statement_id) -> Statement | None:
    """
    scope='statement': the requested statement if it belongs to this user,
    else falls back to the latest upload.
    scope='all': always None -- no single-statement scoping.
    """
    if scope != "statement":
        return None
    if statement_id:
        found = Statement.objects.filter(user=user, id=statement_id).first()
        if found:
            return found
    return get_latest_statement(user)


def _empty_dashboard_context() -> dict:
    return {
        "month_label": "No data yet",
        "statement_id": None,
        "statement_filename": None,
        "transaction_count": 0,
        "uncategorized_count": 0,
        "total_spending": 0.0,
        "monthly_income": 0.0,
        "savings": 0.0,
        "health_score": 0,
        "income_change": None,
        "expense_change": None,
        "savings_change": None,
        "comparison_label": None,
        "highest_expense_category": "None",
        "spending_per_category": [],
        "summary_text": "",
        "ai_spending_summary": "",
        "ai_budget_advice": "",
        "ai_recommendations": [],
        "recent_transactions": [],
        "show_upload_prompt": True,
        "largest_expense": None,
        "most_frequent_merchant": None,
        "monthly_trend": [],
        "predicted_next_month_spend": None,
    }


def generate_ai_insights(summary: dict) -> dict:
    if not OPENROUTER_API_KEY:
        return _fallback_ai_response(summary)

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
    )
    prompt = INSIGHTS_PROMPT.format(summary=summary["summary_text"])

    try:
        response = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": INSIGHTS_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or "{}"
        parsed = json.loads(content)
        recommendations = parsed.get("recommendations", [])
        if not isinstance(recommendations, list):
            recommendations = []
        return {
            "spending_summary": str(parsed.get("spending_summary", "")).strip() or _fallback_ai_response(summary)["spending_summary"],
            "budget_advice": str(parsed.get("budget_advice", "")).strip() or _fallback_ai_response(summary)["budget_advice"],
            "recommendations": [str(item).strip() for item in recommendations if str(item).strip()] or _fallback_ai_response(summary)["recommendations"],
        }
    except Exception:
        return _fallback_ai_response(summary)


def generate_insight_for_statement(user, statement: Statement) -> dict:
    """
    Generates (or regenerates) the AI narrative for ONE specific statement's
    transactions -- not a calendar month, not all of a user's data.
    """
    transactions = statement.transactions.all()
    summary = build_monthly_financial_summary(transactions)
    ai_output = generate_ai_insights(summary)

    # `month` is still populated (model requires it) -- derived from the
    # statement's own data, purely for display, not used for scoping anymore.
    first_txn = transactions.order_by("date").first()
    month_value = first_txn.date.replace(day=1) if first_txn else timezone.localdate().replace(day=1)

    insight, _ = MonthlyInsight.objects.update_or_create(
        user=user,
        statement=statement,
        defaults={
            "month": month_value,
            "summary_text": ai_output["spending_summary"],
            "total_spent": summary["total_spending"],
            "total_income": summary["monthly_income"],
            "budget_recommendation": "\n".join(
                [ai_output["budget_advice"], *ai_output["recommendations"]]
            ).strip(),
        },
    )
    return {
        "insight": insight,
        "summary": summary,
        "ai_output": ai_output,
    }


def _parse_budget_payload(payload: str) -> tuple[str, list[str]]:
    lines = [line.strip() for line in (payload or "").splitlines() if line.strip()]
    if not lines:
        return "", []
    return lines[0], lines[1:]


def refresh_after_new_data(user, statement: Statement) -> None:
    """
    Call this right after a new statement is uploaded and categorized.
    Regenerates the AI narrative for THIS statement specifically. Cache
    invalidation happens automatically -- the cache key includes the
    statement's id, so a new statement naturally produces a fresh cache key
    without needing to explicitly clear the old one.
    """
    generate_insight_for_statement(user, statement)


def _dashboard_cache_key(user, statement: Statement) -> str:
    version = statement.processed_at or statement.uploaded_at
    version_key = version.isoformat() if version else "unknown"
    return f"dashboard:{user.id}:{statement.id}:{version_key}"


def _build_dashboard_context_uncached(user, scope: str, statement: Statement | None) -> dict:
    if scope == "statement":
        if statement is None:
            return _empty_dashboard_context()
        transactions = statement.transactions.select_related("category").order_by("-date", "-id")
    else:
        transactions = (
            Transaction.objects.filter(user=user)
            .select_related("category")
            .order_by("-date", "-id")
        )

    if not transactions.exists():
        return _empty_dashboard_context()

    summary = build_monthly_financial_summary(transactions)

    if scope == "statement":
        # Persisted, per-statement AI narrative (existing behavior).
        insight = MonthlyInsight.objects.filter(user=user, statement=statement).first()
        if insight is None:
            generated = generate_insight_for_statement(user, statement)
            insight = generated["insight"]
            summary = generated["summary"]
            ai_spending_summary = generated["ai_output"]["spending_summary"]
            ai_budget_advice = generated["ai_output"]["budget_advice"]
            ai_recommendations = generated["ai_output"]["recommendations"]
        else:
            ai_spending_summary = insight.summary_text
            ai_budget_advice, ai_recommendations = _parse_budget_payload(insight.budget_recommendation)
    else:
        # All-time view has no single Statement to persist a MonthlyInsight
        # against -- generated fresh here. Cheap: the whole context is
        # already cache-wrapped by build_dashboard_context.
        ai_output = generate_ai_insights(summary)
        ai_spending_summary = ai_output["spending_summary"]
        ai_budget_advice = ai_output["budget_advice"]
        ai_recommendations = ai_output["recommendations"]

    recent_transactions = [
        {
            "id": txn.id,
            "date": txn.date,
            "description": txn.description,
            "amount": float(txn.amount),
            "category": txn.category.name if txn.category else "Other",
            "is_ai_categorized": txn.is_ai_categorized,
        }
        for txn in transactions[:10]
    ]
    uncategorized_count = transactions.filter(category__isnull=True).count()
    health_score = _compute_health_score(
        summary["total_spending"],
        summary["monthly_income"],
        summary["savings"],
        uncategorized_count,
        transactions.count(),
    )
    period_deltas = _compute_period_deltas(transactions)
    first_date = transactions.order_by("date").first()
    last_date = transactions.order_by("-date").first()
    date_range = (
        f"{first_date.date.strftime('%d %b %Y')} - {last_date.date.strftime('%d %b %Y')}"
        if first_date and last_date else "No transactions"
    )
    month_label = date_range if scope == "statement" else f"All Time ({date_range})"

    analytics = build_extended_analytics(transactions)

    return {
        "month_label": month_label,
        "statement_id": statement.id if statement else None,
        "statement_filename": statement.file.name.rsplit("/", 1)[-1] if statement else None,
        "transaction_count": transactions.count(),
        "uncategorized_count": uncategorized_count,
        "total_spending": summary["total_spending"],
        "monthly_income": summary["monthly_income"],
        "savings": summary["savings"],
        "highest_expense_category": summary["highest_expense_category"],
        "spending_per_category": summary["spending_per_category"],
        "summary_text": summary["summary_text"],
        "ai_spending_summary": ai_spending_summary,
        "ai_budget_advice": ai_budget_advice,
        "ai_recommendations": ai_recommendations,
        "recent_transactions": recent_transactions,
        "health_score": health_score,
        "show_upload_prompt": transactions.count() == 0,
        "largest_expense": analytics["largest_expense"],
        "most_frequent_merchant": analytics["most_frequent_merchant"],
        "monthly_trend": analytics["monthly_trend"],
        "income_change": period_deltas["income_change"],
        "expense_change": period_deltas["expense_change"],
        "savings_change": period_deltas["savings_change"],
        "comparison_label": period_deltas["comparison_label"],
        "predicted_next_month_spend": analytics["predicted_next_month_spend"],
    }
def _compute_period_deltas(transactions_qs) -> dict:
    """
    Compares the most recent calendar month present in this transaction set
    against the one before it. Works for both scopes (statement or all-time)
    since it's just grouping whatever transactions were passed in. Returns
    None deltas if there isn't a second month to compare against, and labels
    the comparison honestly if the two months aren't calendar-adjacent.
    """
    frame = _build_dataframe(transactions_qs)
    if frame.empty:
        return {"income_change": None, "expense_change": None, "savings_change": None, "comparison_label": None}

    frame["month_period"] = frame["date"].dt.to_period("M")
    months = sorted(frame["month_period"].unique())
    if len(months) < 2:
        return {"income_change": None, "expense_change": None, "savings_change": None, "comparison_label": None}

    current_month, previous_month = months[-1], months[-2]
    gap = (current_month - previous_month).n

    def _totals(period):
        subset = frame[frame["month_period"] == period]
        income = float(subset[subset["amount"] > 0]["amount"].sum())
        expense = float(-subset[subset["amount"] < 0]["amount"].sum())
        return income, expense, income - expense

    cur_income, cur_expense, cur_savings = _totals(current_month)
    prev_income, prev_expense, prev_savings = _totals(previous_month)

    def _pct_change(current, previous):
        if previous == 0:
            return None
        return round(((current - previous) / abs(previous)) * 100, 1)

    label = "vs last month" if gap == 1 else f"vs {previous_month.strftime('%b %Y')}"

    return {
        "income_change": _pct_change(cur_income, prev_income),
        "expense_change": _pct_change(cur_expense, prev_expense),
        "savings_change": _pct_change(cur_savings, prev_savings),
        "comparison_label": label,
    }

def _dashboard_cache_key(user, scope: str, statement: Statement | None) -> str:
    if scope == "statement" and statement is not None:
        version = statement.processed_at or statement.uploaded_at
        version_key = version.isoformat() if version else "unknown"
        return f"dashboard:{user.id}:statement:{statement.id}:{version_key}"

    # All-time key: any new/reprocessed statement should invalidate it.
    latest = get_latest_statement(user)
    version = (latest.processed_at or latest.uploaded_at) if latest else None
    version_key = version.isoformat() if version else "none"
    return f"dashboard:{user.id}:all:{version_key}"


def build_dashboard_context(user, scope: str = "all", statement_id=None) -> dict:
    """
    scope='all' (default): aggregates every transaction across all statements.
    scope='statement': one specific statement -- `statement_id` if given and
    owned by the user, else falls back to their latest upload.
    """
    scope = scope if scope in ("all", "statement") else "all"
    statement = resolve_dashboard_statement(user, scope, statement_id)

    cache_key = _dashboard_cache_key(user, scope, statement)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    context = _build_dashboard_context_uncached(user, scope, statement)
    cache.set(cache_key, context, timeout=DASHBOARD_CACHE_TTL)
    return context