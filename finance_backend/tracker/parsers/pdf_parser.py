from __future__ import annotations

from pathlib import Path


def parse_pdf_statement(path: str | Path) -> str:
    file_path = Path(path)
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise ImportError("Install pypdf to parse PDF statements.") from exc

    reader = PdfReader(str(file_path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)

