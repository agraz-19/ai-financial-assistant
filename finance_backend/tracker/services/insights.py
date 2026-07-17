from __future__ import annotations


def build_spend_summary(transactions):
    total = sum(getattr(txn, "amount", 0) for txn in transactions)
    return {"total_amount": total, "count": len(transactions)}

