from __future__ import annotations

import json
import os
from decimal import Decimal

import pandas as pd
from django.db.models import QuerySet
from django.utils import timezone
from openai import OpenAI

from tracker.ai.prompts import INSIGHTS_PROMPT, INSIGHTS_SYSTEM_PROMPT
from tracker.models import MonthlyInsight, Transaction

OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "gpt-4o-mini")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")


def _money(value: float | Decimal | int) -> str:
    return f"Rs. {float(value):,.2f}"


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
            "summary_text": "No transactions found for this month.",
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
            f"You spent {_money(summary['total_spending'])} this month. "
            f"Your highest expense category was {summary['highest_expense_category']}."
        ),
        "budget_advice": (
            f"Monthly income was {_money(summary['monthly_income'])} and savings were {_money(summary['savings'])}. "
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


def generate_monthly_insight(user) -> dict:
    month_start = timezone.localdate().replace(day=1)
    transactions = Transaction.objects.filter(
        user=user,
        date__year=month_start.year,
        date__month=month_start.month,
    )

    summary = build_monthly_financial_summary(transactions)
    ai_output = generate_ai_insights(summary)

    insight, _ = MonthlyInsight.objects.update_or_create(
        user=user,
        month=month_start,
        defaults={
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


def build_dashboard_context(user) -> dict:
    month_start = timezone.localdate().replace(day=1)
    transactions = (
        Transaction.objects.filter(
            user=user,
            date__year=month_start.year,
            date__month=month_start.month,
        )
        .select_related("category")
        .order_by("-date", "-id")
    )

    summary = build_monthly_financial_summary(transactions)
    insight = MonthlyInsight.objects.filter(user=user, month=month_start).first()
    ai_output = None
    if insight is None:
        generated = generate_monthly_insight(user)
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

    return {
        "month_label": month_start.strftime("%B %Y"),
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
