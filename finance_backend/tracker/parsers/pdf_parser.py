"""
Google Pay (GPay) PDF statement parser, with an LLM fallback for other
PDF layouts.

GPay exports a text-based (not scanned/image) PDF with a consistent
repeating block per transaction:

    02 Apr, 2026    Paid to Amazon India         ₹250
    06:46 PM        UPI Transaction ID: 609255736576
                    Paid by State Bank of India 2170

pdfplumber's default extract_text() drops spaces between words for this
PDF's font encoding (a known pdfplumber quirk with certain embedded fonts --
words like "PaidtoAmazonIndia" run together with no space). Using
x_tolerance=1 fixes this and restores normal spacing -- verified against a
real statement, where the parser's computed Sent/Received totals matched
the PDF's own printed totals exactly.

For PDFs from other apps/banks (different layout), TRANSACTION_PATTERN
won't match anything. Rather than failing outright, this falls back to an
LLM-based extraction -- same rules-first/AI-fallback design already used in
categorize.py, for the same reason: deterministic parsing is fast, free,
and reliable when the format is known; AI extraction is slower and costs
tokens, but handles formats we haven't specifically coded for.

Sign convention (matches Transaction.amount in models.py):
  expenses = negative, income = positive
"""

import json
import os
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

import pdfplumber
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)
MODEL_NAME = "openrouter/free"

FLEXIBLE_TRANSACTION_PATTERN = re.compile(
    r"(?P<date>\d{1,2}\s+[A-Za-z]{3,9},\s+\d{4})\s+"
    r"(?P<direction>Paid to|Received from)\s*(?P<payee>.+?)\s+"
    r"(?:₹|Rs\.?|INR)\s*(?P<amount>[\d,]+(?:\.\d+)?)\s*\n"
    r"\s*\d{1,2}:\d{2}\s*[AP]M\s+UPI Transaction ID:\s*(?P<txn_id>\d+)\s*\n"
    r"\s*(?:Paid by|Paid to)\s+.+?(?=\n)",
)

TRANSACTION_PATTERN = re.compile(
    r"(?P<date>\d{1,2}\s+[A-Za-z]{3,9},\s+\d{4})\s+"
    r"(?P<direction>Paid to|Received from)\s*(?P<payee>.+?)\s+"
    r"₹\s*(?P<amount>[\d,]+(?:\.\d+)?)\s*\n"
    r"\s*\d{1,2}:\d{2}\s*[AP]M\s+UPI Transaction ID:\s*(?P<txn_id>\d+)\s*\n"
    r"\s*(?:Paid by|Paid to)\s+.+?(?=\n)",
)

# How much raw text to send per LLM call -- keeps prompts a reasonable size
# for a statement that could be many pages long.
LLM_CHUNK_CHARS = 6000

LLM_EXTRACTION_PROMPT = """You are extracting bank/UPI transactions from raw
text extracted from a PDF statement. The formatting may be messy (merged
words, inconsistent spacing, stray page headers/footers) -- do your best to
identify genuine transaction records and ignore headers, footers, page
numbers, and summary boxes.

For each transaction you find, extract:
- date (any format you find -- just extract it as written)
- description (who was paid, or who paid you)
- amount (just the number, no currency symbol)
- direction: "debit" if money went OUT (paid/sent), "credit" if money came
  IN (received)

Respond ONLY with a JSON array, no markdown fences, no extra text, in this
exact shape:
[{{"date": "02 Apr, 2026", "description": "Amazon India", "amount": "250", "direction": "debit"}}, ...]

If you find no transactions at all in this text, respond with an empty array: []

Text:
{text}
"""


class PDFParseError(Exception):
    """Raised when the PDF can't be parsed at all (unreadable, no transactions found by any method)."""
    pass


def _extract_full_text(file_obj) -> str:
    try:
        with pdfplumber.open(file_obj) as pdf:
            pages_text = []
            for page in pdf.pages:
                page_text = page.extract_text(x_tolerance=1)
                if page_text:
                    pages_text.append(page_text)
            return "\n".join(pages_text)
    except Exception as exc:
        raise PDFParseError(f"Could not read PDF file: {exc}") from exc


def _parse_amount(value: str) -> Decimal | None:
    cleaned = value.replace(",", "").replace("₹", "").strip()
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def _parse_date_flexible(value: str):
    """Tries several common date formats since the LLM fallback may see unfamiliar layouts."""
    value = value.strip()
    formats = ["%d %b, %Y", "%d %b %Y", "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%m/%d/%Y"]
    for fmt in formats:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _parse_via_rules(full_text: str) -> list[dict]:
    """GPay-specific deterministic parsing. Returns [] if the format doesn't match at all."""
    matches = list(FLEXIBLE_TRANSACTION_PATTERN.finditer(full_text))
    if not matches:
        matches = list(TRANSACTION_PATTERN.finditer(full_text))
    transactions = []

    for m in matches:
        txn_date = None
        try:
            txn_date = datetime.strptime(m.group("date"), "%d %b, %Y").date()
        except ValueError:
            continue

        amount = _parse_amount(m.group("amount"))
        if amount is None:
            continue

        direction = m.group("direction")
        payee = m.group("payee").strip()
        if direction == "Paid to":
            amount = -amount

        transactions.append({
            "date": txn_date,
            "description": f"{direction} {payee}",
            "amount": amount,
        })

    return transactions


def _parse_via_llm(full_text: str) -> tuple[list[dict], list[str]]:
    """
    Fallback for PDF layouts the rules-based parser doesn't recognize.
    Chunks the text and asks the LLM to extract transactions from each piece.
    """
    if not os.getenv("OPENROUTER_API_KEY"):
        raise PDFParseError(
            "This PDF's layout isn't recognized, and AI fallback extraction "
            "isn't configured (missing OPENROUTER_API_KEY)."
        )

    transactions = []
    warnings = []

    chunks = [full_text[i:i + LLM_CHUNK_CHARS] for i in range(0, len(full_text), LLM_CHUNK_CHARS)]

    for chunk_num, chunk in enumerate(chunks, start=1):
        prompt = LLM_EXTRACTION_PROMPT.format(text=chunk)
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )
            raw = response.choices[0].message.content.strip()
        except Exception as e:
            warnings.append(f"Chunk {chunk_num}: AI extraction failed ({e}) -- skipped.")
            continue

        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.lower().startswith("json"):
                raw = raw[4:].strip()

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            warnings.append(f"Chunk {chunk_num}: AI response wasn't valid JSON -- skipped.")
            continue

        if not isinstance(parsed, list):
            warnings.append(f"Chunk {chunk_num}: unexpected AI response shape -- skipped.")
            continue

        for item in parsed:
            if not isinstance(item, dict):
                continue

            txn_date = _parse_date_flexible(str(item.get("date", "")))
            if txn_date is None:
                warnings.append(f"Chunk {chunk_num}: could not parse date '{item.get('date')}' -- skipped a transaction.")
                continue

            amount = _parse_amount(str(item.get("amount", "")))
            if amount is None:
                warnings.append(f"Chunk {chunk_num}: could not parse amount '{item.get('amount')}' -- skipped a transaction.")
                continue

            direction = str(item.get("direction", "debit")).lower()
            if direction == "debit":
                amount = -abs(amount)
            else:
                amount = abs(amount)

            description = str(item.get("description", "")).strip() or "(no description)"

            transactions.append({
                "date": txn_date,
                "description": description,
                "amount": amount,
            })

    return transactions, warnings


def parse_pdf_statement(file_obj) -> tuple[list[dict], list[str]]:
    """
    Parses an uploaded PDF statement into a list of transaction dicts:
        [{"date": date, "description": str, "amount": Decimal}, ...]

    Tries fast, free, deterministic parsing first (currently tuned for
    Google Pay's format). If that finds nothing at all -- meaning the PDF
    is a different app/bank's layout -- falls back to LLM-based extraction,
    which is slower and less guaranteed-accurate, but handles formats this
    parser wasn't specifically built for.

    Raises PDFParseError only if BOTH methods fail to find any transactions.
    """
    full_text = _extract_full_text(file_obj)

    if not full_text.strip():
        raise PDFParseError("Could not extract any text from this PDF (it may be a scanned image, not a text PDF).")

    transactions = _parse_via_rules(full_text)
    warnings: list[str] = []

    if not transactions:
        print("[pdf_parser] Rules-based (GPay-format) parsing found nothing -- falling back to AI extraction.")
        transactions, warnings = _parse_via_llm(full_text)

    if not transactions:
        raise PDFParseError(
            "Could not find any transactions in this PDF, using either the "
            "known-format parser or AI extraction."
            + (f" Issues: {'; '.join(warnings[:5])}" if warnings else "")
        )

    return transactions, warnings
