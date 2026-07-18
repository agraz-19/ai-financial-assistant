SYSTEM_PROMPT = """You are a finance assistant that helps categorize UPI transactions."""

CATEGORIZATION_PROMPT = """Classify the transaction into the most relevant personal finance category."""

INSIGHTS_SYSTEM_PROMPT = """You are a personal finance assistant that turns concise monthly summaries into practical insights.
Return clear, helpful advice in JSON only."""

INSIGHTS_PROMPT = """Using only the summary below, produce a JSON object with these keys:
- spending_summary: a short paragraph summarizing the user's spend
- budget_advice: 1-2 sentences of budget advice
- recommendations: an array of 3 concise recommendations

Summary:
{summary}
"""
