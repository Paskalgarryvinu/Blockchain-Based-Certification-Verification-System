import os
import json
from typing import Dict, Any, List, Tuple
from io import StringIO
import pandas as pd

DB_DIR = os.path.join(os.path.dirname(__file__), "db")
INSTITUTIONS_JSON = os.path.join(DB_DIR, "institutions.json")
VERIFICATIONS_JSON = os.path.join(DB_DIR, "verifications.json")
LEDGER_FILE = os.path.join(DB_DIR, "ledger.txt")


def ensure_storage() -> None:
    os.makedirs(DB_DIR, exist_ok=True)
    if not os.path.exists(INSTITUTIONS_JSON):
        write_json_file(INSTITUTIONS_JSON, {"items": sample_institutions()})
    if not os.path.exists(VERIFICATIONS_JSON):
        write_json_file(VERIFICATIONS_JSON, {"items": []})
    if not os.path.exists(LEDGER_FILE):
        with open(LEDGER_FILE, "w", encoding="utf-8") as f:
            f.write("")  # create empty ledger file


def read_json_file(path: str) -> Dict[str, Any]:
    if not os.path.exists(path):
        return {"items": []}
    with open(path, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except Exception:
            return {"items": []}


def write_json_file(path: str, data: Dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def merge_institutions(csv_text_utf8: str) -> Tuple[List[Dict[str, Any]], int]:
    """
    Accepts CSV with headers: name,institution,year,certificate_id
    Deduplicates on certificate_id if present, else on (name,institution,year).
    """
    df = pd.read_csv(StringIO(csv_text_utf8))
    df.columns = [c.strip().lower() for c in df.columns]
    required = {"name", "institution", "year"}
    if not required.issubset(set(df.columns)):
        raise ValueError("CSV must include columns: name,institution,year[,certificate_id]")

    # Normalize
    df["certificate_id"] = df.get("certificate_id", pd.Series([None]*len(df)))
    df["year"] = df["year"].astype(int)

    incoming = df.to_dict(orient="records")

    current = read_json_file(INSTITUTIONS_JSON).get("items", [])
    key_to_idx: Dict[str, int] = {}
    for idx, r in enumerate(current):
        key = make_key(r)
        key_to_idx[key] = idx

    added = 0
    for rec in incoming:
        key = make_key(rec)
        if key in key_to_idx:
            # Replace existing
            current[key_to_idx[key]] = rec
        else:
            current.append(rec)
            key_to_idx[key] = len(current) - 1
            added += 1

    write_json_file(INSTITUTIONS_JSON, {"items": current})
    return current, added


def make_key(rec: Dict[str, Any]) -> str:
    cid = str(rec.get("certificate_id") or "").strip().lower()
    if cid:
        return f"cid::{cid}"
    name = str(rec.get("name", "")).strip().lower()
    inst = str(rec.get("institution", "")).strip().lower()
    year = int(rec.get("year", 0))
    return f"triple::{name}::{inst}::{year}"


def sample_institutions() -> List[Dict[str, Any]]:
    return [
        {
            "name": "Jane Doe",
            "institution": "Example University",
            "year": 2021,
            "certificate_id": "EXU-2021-0001"
        },
        {
            "name": "John Smith",
            "institution": "Tech Institute",
            "year": 2020,
            "certificate_id": "TIN-2020-9988"
        },
        {
            "name": "Alice Johnson",
            "institution": "State College",
            "year": 2019,
            "certificate_id": "STC-2019-1234"
        }
    ]