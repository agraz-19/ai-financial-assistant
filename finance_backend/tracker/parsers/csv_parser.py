"""
CSV bank statement parser.

Handles common variations across banks and payment apps:
- Different column names (Description vs Narration vs Transaction Details, etc.)
- Different date formats
- Three possible amount shapes:
    1. A single signed 'amount' column
    2. Separate debit/credit columns
    3. A single UNSIGNED 'amount' column + a separate 'type' column (Debit/Credit)
       -- this is how PhonePe, GPay, and several UPI apps export statements
- A preamble (title/duration lines) and/or footer (disclaimer text) surrounding
  the actual data table -- very common in UPI app exports (PhonePe, GPay, Paytm)

Sign convention (matches Transaction.amount in models.py):
  expenses = negative, income = positive
"""

import csv
import io
from datetime import datetime
from decimal import Decimal, InvalidOperation

# Map our normalized field name -> list of possible header variations (lowercase)
COLUMN_ALIASES = {
    "date": ["date", "transaction date", "txn date", "value date", "posting date"],
    "description": [
        "description", "narration", "particulars", "details", "remarks",
        "transaction details", "transaction detail",
    ],
    "debit": ["debit", "withdrawal", "withdrawal amt", "withdrawal amt.", "debit amount"],
    "credit": ["credit", "deposit", "deposit amt", "deposit amt.", "credit amount"],
    "amount": ["amount", "transaction amount", "amt"],
    "type": ["transaction type", "type", "credit/debit", "dr/cr", "credit/debit instrument"],
}

DATE_FORMATS = [
    "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%m/%d/%Y",
    "%d %b %Y", "%d-%b-%Y", "%d %b, %Y", "%b %d, %Y",
    "%d %B %Y", "%B %d, %Y", "%d/%m/%y",
]

# Minimum number of recognized columns a line needs to be considered "the header row"
MIN_HEADER_MATCHES = 3


class CSVParseError(Exception):
    """Raised when the CSV can't be parsed at all (missing columns, empty file, etc.)."""
    pass


def _all_aliases_flat() -> set:
    flat = set()
    for aliases in COLUMN_ALIASES.values():
        flat.update(aliases)
    return flat


def _find_header_row(lines: list[str]) -> int:
    """
    Scans the first ~30 lines to find the real header row, skipping any
    title/metadata preamble (e.g. 'Transaction Statement for +91...',
    'Duration,19 Apr 2026 - 18 Jul 2026').

    Returns the 0-based index of the header line.
    """
    known_aliases = _all_aliases_flat()
    best_idx, best_score = None, 0

    for idx, line in enumerate(lines[:30]):
        fields = [f.strip().lower() for f in next(csv.reader([line]))] if line.strip() else []
        score = sum(1 for f in fields if f in known_aliases)
        if score > best_score:
            best_idx, best_score = idx, score

    if best_idx is None or best_score < MIN_HEADER_MATCHES:
        raise CSVParseError(
            "Could not locate a recognizable header row in this CSV "
            "(need at least date, description, and an amount-related column)."
        )
    return best_idx


def _find_column(header_fields: list[str], aliases: list) -> str | None:
    for alias in aliases:
        if alias in header_fields:
            return alias
    return None


def _parse_date(value) -> "datetime.date | None":
    if value is None:
        return None
    value_str = str(value).strip()
    if not value_str:
        return None
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value_str, fmt).date()
        except ValueError:
            continue
    return None


def _parse_amount(value) -> Decimal | None:
    if value is None:
        return None
    cleaned = str(value).replace(",", "").replace("\u20b9", "").replace("Rs.", "").strip()
    if cleaned in ("", "-"):
        return None
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def parse_csv_statement(file_obj) -> tuple[list[dict], list[str]]:
    """
    Parses an uploaded CSV file into a list of transaction dicts:
        [{"date": date, "description": str, "amount": Decimal}, ...]

    Returns (transactions, warnings). Rows that fail to parse, or that don't
    match the header's column count (e.g. footer disclaimer text), are
    skipped and reported in `warnings` rather than failing the whole upload.

    Raises CSVParseError if the file can't be read at all, or a header row
    with the required columns can't be found.
    """
    raw_bytes = file_obj.read()
    text = raw_bytes.decode("utf-8-sig") if isinstance(raw_bytes, bytes) else raw_bytes
    lines = text.splitlines()

    if not lines:
        raise CSVParseError("CSV file is empty.")

    header_idx = _find_header_row(lines)
    header_fields = [f.strip().lower() for f in next(csv.reader([lines[header_idx]]))]
    expected_col_count = len(header_fields)

    date_col = _find_column(header_fields, COLUMN_ALIASES["date"])
    desc_col = _find_column(header_fields, COLUMN_ALIASES["description"])
    debit_col = _find_column(header_fields, COLUMN_ALIASES["debit"])
    credit_col = _find_column(header_fields, COLUMN_ALIASES["credit"])
    amount_col = _find_column(header_fields, COLUMN_ALIASES["amount"])
    type_col = _find_column(header_fields, COLUMN_ALIASES["type"])

    if not date_col:
        raise CSVParseError("Could not find a date column in this CSV.")
    if not desc_col:
        raise CSVParseError("Could not find a description column in this CSV.")
    if not amount_col and not (debit_col or credit_col):
        raise CSVParseError("Could not find an amount column, or debit/credit columns, in this CSV.")

    data_lines = lines[header_idx + 1:]
    reader = csv.reader(data_lines)

    transactions = []
    warnings = []

    for line_offset, row in enumerate(reader):
        row_num = header_idx + line_offset + 2  # matches what the user sees in Excel/Sheets

        if len(row) != expected_col_count:
            # footer disclaimer text, blank lines, or malformed rows land here -- skip quietly
            if any(cell.strip() for cell in row):
                warnings.append(f"Row {row_num}: skipped (unexpected column count).")
            continue

        row_dict = dict(zip(header_fields, [c.strip() for c in row]))

        txn_date = _parse_date(row_dict.get(date_col))
        if txn_date is None:
            warnings.append(f"Row {row_num}: could not parse date '{row_dict.get(date_col)}' — skipped.")
            continue

        description = row_dict.get(desc_col) or "(no description)"

        if amount_col and type_col:
            # e.g. PhonePe: unsigned Amount + Transaction Type (Debit/Credit)
            raw_amount = _parse_amount(row_dict.get(amount_col))
            txn_type = (row_dict.get(type_col) or "").strip().lower()
            if raw_amount is None:
                amount = None
            elif "credit" in txn_type:
                amount = raw_amount
            elif "debit" in txn_type:
                amount = -raw_amount
            else:
                warnings.append(f"Row {row_num}: unrecognized transaction type '{txn_type}' — skipped.")
                continue
        elif amount_col:
            amount = _parse_amount(row_dict.get(amount_col))
        else:
            debit = _parse_amount(row_dict.get(debit_col)) if debit_col else None
            credit = _parse_amount(row_dict.get(credit_col)) if credit_col else None
            if credit:
                amount = credit          # income -> positive
            elif debit:
                amount = -debit          # expense -> negative
            else:
                amount = None

        if amount is None:
            warnings.append(f"Row {row_num}: could not parse amount — skipped.")
            continue

        transactions.append({
            "date": txn_date,
            "description": description,
            "amount": amount,
        })

    if not transactions:
        raise CSVParseError(
            "No valid transactions could be parsed from this CSV."
            + (f" Issues: {'; '.join(warnings[:5])}" if warnings else "")
        )

    return transactions, warnings


def save_transactions(statement, parsed_transactions: list[dict]) -> int:
    """
    Bulk-saves parsed transaction dicts as Transaction rows linked to the
    given Statement (and its user). Returns the number of rows created.
    """
    from tracker.models import Transaction  # local import avoids circular import at module load time

    objs = [
        Transaction(
            user=statement.user,
            statement=statement,
            date=t["date"],
            description=t["description"],
            amount=t["amount"],
        )
        for t in parsed_transactions
    ]
    Transaction.objects.bulk_create(objs)
    return len(objs)
