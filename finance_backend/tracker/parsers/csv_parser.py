from __future__ import annotations

import csv
from pathlib import Path
from typing import Any


def parse_csv_statement(path: str | Path) -> list[dict[str, Any]]:
    file_path = Path(path)
    with file_path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))

