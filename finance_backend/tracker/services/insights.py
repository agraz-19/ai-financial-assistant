from __future__ import annotations

import json
import os
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


def _money(value: float | Decimal | int) -> str:
    return f"Rs. {float(value):,.2f}"


def get_latest_statement(user) -> Statement | None:
    """
    The single source of truth for 'which upload is currently active'.
    Sorts by processed_at (when the data was actually last (re)processed),
    not uploaded_at (which never changes once a Statement row is first
    created -- so re-uploading/reprocessing the same file wouldn't make it
    "latest" again if sorted by uploaded_at alone).
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

    summary_lines = [
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
    return f"dashboard:{user.id}:{statement.id}"


def _build_dashboard_context_uncached(user) -> dict:
    statement = get_latest_statement(user)

    if statement is None:
        return {
            "month_label": "No data yet",
            "transaction_count": 0,
            "uncategorized_count": 0,
            "total_spending": 0.0,
            "monthly_income": 0.0,
            "savings": 0.0,
            "highest_expense_category": "None",
            "spending_per_category": [],
            "summary_text": "",
            "ai_spending_summary": "",
            "ai_budget_advice": "",
            "ai_recommendations": [],
            "recent_transactions": [],
            "show_upload_prompt": True,
        }

    transactions = (
        statement.transactions.select_related("category").order_by("-date", "-id")
    )

    summary = build_monthly_financial_summary(transactions)
    insight = MonthlyInsight.objects.filter(user=user, statement=statement).first()
    ai_output = None
    if insight is None:
        generated = generate_insight_for_statement(user, statement)
        insight = generated["insight"]
        summary = generated["summary"]
        ai_output = generated["ai_output"]

    recent_transactions = list(transactions[:10])
    uncategorized_count = transactions.filter(category__isnull=True).count()

    ai_spending_summary = insight.summary_text if insight else ""
    ai_budget_advice = ""
    ai_recommendations: list[str] = []

    if insight:
        ai_budget_advice, ai_recommendations = _parse_budget_payload(insight.budget_recommendation)

    if ai_output:
        ai_spending_summary = ai_output["spending_summary"]
        ai_budget_advice = ai_output["budget_advice"]
        ai_recommendations = ai_output["recommendations"]

    # Label the dashboard with the actual date range of this statement's
    # data, and its filename, so it's unambiguous which upload you're viewing.
    first_date = transactions.order_by("date").first()
    last_date = transactions.order_by("-date").first()
    if first_date and last_date:
        date_range = f"{first_date.date.strftime('%d %b %Y')} - {last_date.date.strftime('%d %b %Y')}"
    else:
        date_range = "No transactions"

    return {
        "month_label": date_range,
        "statement_filename": statement.file.name.rsplit("/", 1)[-1],
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
        "show_upload_prompt": transactions.count() == 0,
    }


def build_dashboard_context(user) -> dict:
    """
    Cached wrapper. Cache key includes the latest statement's id, so
    uploading a new statement automatically produces a cache miss on the
    next load -- no manual invalidation needed for the cache itself (though
    refresh_after_new_data still eagerly regenerates the AI narrative so the
    very first load after upload is already fresh, not just "eventually").
    """
    statement = get_latest_statement(user)
    if statement is None:
        return _build_dashboard_context_uncached(user)

    cache_key = _dashboard_cache_key(user, statement)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    context = _build_dashboard_context_uncached(user)
    cache.set(cache_key, context, timeout=DASHBOARD_CACHE_TTL)
    return context