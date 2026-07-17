from __future__ import annotations


def categorize_transaction(description: str, merchant_name: str = "") -> str:
    text = f"{description} {merchant_name}".lower()
    if any(keyword in text for keyword in ["grocery", "supermarket", "mart"]):
        return "Groceries"
    if any(keyword in text for keyword in ["rent", "housing"]):
        return "Housing"
    if any(keyword in text for keyword in ["uber", "ola", "taxi", "metro"]):
        return "Transport"
    return "Uncategorized"

