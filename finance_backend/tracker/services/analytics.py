"""
Month-scoped analytics for the Analytics page.

Separate from insights.py (which powers the Dashboard, statement/all-time
scoped) -- this is always scoped to one specific calendar month, selected
by the user via a month picker in the UI.
"""
from __future__ import annotations

from decimal import Decimal

import pandas as pd
from django.db.models import QuerySet

from tracker.models import Transaction
from tracker.services.insights import (
    _build_dataframe,
    _normalize_merchant,
    build_monthly_financial_summary,
    generate_ai_insights,
)


def get_available_months(user) -> list[str]:
    """
    All distinct 'YYYY-MM' months the user has any transaction data for,
    most recent first -- powers the month selector dropdown.
    """
    transactions = Transaction.objects.filter(user=user)
    frame = _build_dataframe(transactions)
    if frame.empty:
        return []
    frame["month_period"] = frame["date"].dt.to_period("M")
    months = sorted(frame["month_period"].unique(), reverse=True)
    return [str(m) for m in months]


def _transactions_for_month(user, month_str: str) -> QuerySet[Transaction]:
    year, month = (int(part) for part in month_str.split("-"))
    return (
        Transaction.objects.filter(user=user, date__year=year, date__month=month)
        .select_related("category")
    )


def build_category_forecast(user) -> dict:
    """
    Trailing-average per-category figures, used for BOTH the "recommended
    budget" section and the "predicted next month" section -- they're the
    same underlying calculation (average of the last few months' real
    spending per category), just framed for two different purposes. Keeps
    both honest: numbers come from the user's own history, not an AI guess
    or fixed limits, matching the "simple trailing-average model" the
    project plan calls for.
    """
    transactions = Transaction.objects.filter(user=user).select_related("category")
    frame = _build_dataframe(transactions)
    if frame.empty:
        return {"predicted_total": 0.0, "current_month_total": 0.0, "categories": []}

    frame["month_period"] = frame["date"].dt.to_period("M")
    expense_frame = frame[frame["amount"] < 0].copy()
    expense_frame["spend"] = expense_frame["amount"].abs()

    if expense_frame.empty:
        return {"predicted_total": 0.0, "current_month_total": 0.0, "categories": []}

    months = sorted(expense_frame["month_period"].unique())
    trailing_months = months[-3:]  # up to the last 3 months on record
    current_month = months[-1]

    trailing_frame = expense_frame[expense_frame["month_period"].isin(trailing_months)]
    per_category_avg = trailing_frame.groupby("category")["spend"].sum() / len(trailing_months)

    current_month_frame = expense_frame[expense_frame["month_period"] == current_month]
    per_category_current = current_month_frame.groupby("category")["spend"].sum()

    categories = [
        {
            "category": category,
            "recommended": round(float(avg), 2),
            "current_month": round(float(per_category_current.get(category, 0.0)), 2),
        }
        for category, avg in per_category_avg.sort_values(ascending=False).items()
    ]

    return {
        "predicted_total": round(float(per_category_avg.sum()), 2),
        "current_month_total": round(float(per_category_current.sum()), 2),
        "categories": categories,
    }


def build_month_analytics(user, month_str: str | None) -> dict:
    available_months = get_available_months(user)

    if not month_str or month_str not in available_months:
        month_str = available_months[0] if available_months else None

    if month_str is None:
        return {
            "month": None,
            "available_months": [],
            "total_spending": 0.0,
            "monthly_average": 0.0,
            "top_category": "None",
            "transaction_count": 0,
            "spending_per_category": [],
            "category_trends": [],
            "daily_spending": [],
            "biggest_expenses": [],
            "ai_spending_summary": "",
            "ai_budget_advice": "",
            "ai_recommendations": [],
            "category_forecast": {"predicted_total": 0.0, "current_month_total": 0.0, "categories": []},
        }

    transactions = _transactions_for_month(user, month_str)
    frame = _build_dataframe(transactions)

    expense_frame = frame[frame["amount"] < 0].copy()
    expense_frame["spend"] = expense_frame["amount"].abs()

    total_spending = round(float(expense_frame["spend"].sum()), 2) if not expense_frame.empty else 0.0
    transaction_count = transactions.count()

    all_frame = _build_dataframe(Transaction.objects.filter(user=user))
    if not all_frame.empty:
        all_frame["month_period"] = all_frame["date"].dt.to_period("M")
        monthly_totals = (
            all_frame[all_frame["amount"] < 0]
            .assign(spend=lambda d: d["amount"].abs())
            .groupby("month_period")["spend"]
            .sum()
        )
        monthly_average = round(float(monthly_totals.mean()), 2) if not monthly_totals.empty else 0.0
    else:
        monthly_average = 0.0

    spending_per_category = (
        expense_frame.groupby("category", as_index=False)["spend"].sum().sort_values("spend", ascending=False)
        if not expense_frame.empty else pd.DataFrame(columns=["category", "spend"])
    )
    top_category = spending_per_category.iloc[0]["category"] if not spending_per_category.empty else "None"

    category_breakdown = [
        {
            "category": row["category"],
            "amount": round(float(row["spend"]), 2),
            "percent": round(float(row["spend"]) / total_spending * 100, 1) if total_spending else 0.0,
        }
        for _, row in spending_per_category.iterrows()
    ]

    year, month = (int(part) for part in month_str.split("-"))
    prev_period = (pd.Period(month_str, freq="M") - 1)
    prev_transactions = _transactions_for_month(user, str(prev_period))
    prev_frame = _build_dataframe(prev_transactions)
    prev_expense = prev_frame[prev_frame["amount"] < 0].copy() if not prev_frame.empty else prev_frame
    if not prev_expense.empty:
        prev_expense["spend"] = prev_expense["amount"].abs()
        prev_totals = prev_expense.groupby("category")["spend"].sum().to_dict()
    else:
        prev_totals = {}

    category_trends = []
    all_categories = set(spending_per_category["category"]) | set(prev_totals.keys())
    for category in all_categories:
        current = float(spending_per_category.set_index("category")["spend"].get(category, 0.0)) if not spending_per_category.empty else 0.0
        previous = float(prev_totals.get(category, 0.0))
        if current == 0 and previous == 0:
            continue
        change_pct = round(((current - previous) / previous) * 100, 1) if previous else None
        category_trends.append({
            "category": category,
            "current": round(current, 2),
            "previous": round(previous, 2),
            "change_percent": change_pct,
        })
    category_trends.sort(key=lambda item: item["current"], reverse=True)

    daily_spending = []
    if not expense_frame.empty:
        daily = expense_frame.groupby(expense_frame["date"].dt.day)["spend"].sum()
        daily_spending = [
            {"day": int(day), "amount": round(float(amount), 2)}
            for day, amount in daily.items()
        ]

    biggest_expenses = []
    if not expense_frame.empty:
        for txn in transactions.order_by("amount")[:10]:
            if txn.amount >= 0:
                continue
            biggest_expenses.append({
                "id": txn.id,
                "description": _normalize_merchant(txn.description) or txn.description,
                "amount": round(float(abs(txn.amount)), 2),
                "date": txn.date,
                "category": txn.category.name if txn.category else "Other",
            })

    # --- AI monthly insight, scoped to just this month's data ---
    monthly_summary = build_monthly_financial_summary(transactions)
    ai_output = generate_ai_insights(monthly_summary)

    # --- Category-level budget recommendation + prediction (trailing avg) ---
    forecast = build_category_forecast(user)

    return {
        "month": month_str,
        "available_months": available_months,
        "total_spending": total_spending,
        "monthly_average": monthly_average,
        "top_category": top_category,
        "transaction_count": transaction_count,
        "spending_per_category": category_breakdown,
        "category_trends": category_trends,
        "daily_spending": daily_spending,
        "biggest_expenses": biggest_expenses,
        "ai_spending_summary": ai_output["spending_summary"],
        "ai_budget_advice": ai_output["budget_advice"],
        "ai_recommendations": ai_output["recommendations"],
        "category_forecast": forecast,
    }
def build_all_time_analytics(user) -> dict:
    transactions = Transaction.objects.filter(user=user).select_related("category")
    frame = _build_dataframe(transactions)
    expense_frame = frame[frame["amount"] < 0].copy()
    expense_frame["spend"] = expense_frame["amount"].abs()
    total_spending = round(float(expense_frame["spend"].sum()), 2) if not expense_frame.empty else 0.0

    if not frame.empty:
        frame["month_period"] = frame["date"].dt.to_period("M")
        monthly_totals = (frame[frame["amount"] < 0].assign(spend=lambda d: d["amount"].abs())
                           .groupby("month_period")["spend"].sum())
        monthly_average = round(float(monthly_totals.mean()), 2) if not monthly_totals.empty else 0.0
    else:
        monthly_average = 0.0

    spending_per_category = (expense_frame.groupby("category", as_index=False)["spend"].sum()
                              .sort_values("spend", ascending=False)
                              if not expense_frame.empty else pd.DataFrame(columns=["category", "spend"]))
    top_category = spending_per_category.iloc[0]["category"] if not spending_per_category.empty else "None"
    category_breakdown = [
        {"category": r["category"], "amount": round(float(r["spend"]), 2),
         "percent": round(float(r["spend"]) / total_spending * 100, 1) if total_spending else 0.0}
        for _, r in spending_per_category.iterrows()
    ]
    biggest_expenses = []
    for txn in transactions.order_by("amount")[:10]:
        if txn.amount >= 0: continue
        biggest_expenses.append({"id": txn.id, "description": _normalize_merchant(txn.description) or txn.description,
                                  "amount": round(float(abs(txn.amount)), 2), "date": txn.date,
                                  "category": txn.category.name if txn.category else "Other"})

    summary = build_monthly_financial_summary(transactions)
    ai_output = generate_ai_insights(summary)
    return {
        "month": None, "available_months": get_available_months(user),
        "total_spending": total_spending, "monthly_average": monthly_average,
        "top_category": top_category, "transaction_count": transactions.count(),
        "spending_per_category": category_breakdown, "category_trends": [], "daily_spending": [],
        "biggest_expenses": biggest_expenses,
        "ai_spending_summary": ai_output["spending_summary"],
        "ai_budget_advice": ai_output["budget_advice"],
        "ai_recommendations": ai_output["recommendations"],
        "category_forecast": build_category_forecast(user),
    }