"""
Column-aware data preparation engine (Weka-style preprocessing).

Pipeline order, used by every cleaning entry point:

    1. PROFILE    - decide what each column *is* (id, date, quantity, unit price,
                    total amount, cost, category, name, ...) from its title first
                    and from its values as confirmation.
    2. NORMALIZE  - merge category spelling variants (Makeup / make up / MAKEUP).
    3. DEDUPE     - remove exact duplicate rows.
    4. AUTOFILL   - fill gaps using a rule that is valid for the detected role:
                    quantity -> whole numbers, price -> 2 decimals, date -> a real
                    date, category -> an existing category, id -> never invented.
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

# --------------------------------------------------------------------------- #
# Roles
# --------------------------------------------------------------------------- #
ROLE_ID = "id"
ROLE_DATE = "date"
ROLE_QUANTITY = "quantity"
ROLE_UNIT_PRICE = "unit_price"
ROLE_TOTAL = "total_amount"
ROLE_COST = "cost"
ROLE_CURRENCY = "currency"
ROLE_PERCENT = "percentage"
ROLE_NUMERIC = "numeric"
ROLE_CATEGORY = "category"
ROLE_NAME = "name"
ROLE_TEXT = "text"

NUMERIC_ROLES = {
    ROLE_QUANTITY, ROLE_UNIT_PRICE, ROLE_TOTAL, ROLE_COST,
    ROLE_CURRENCY, ROLE_PERCENT, ROLE_NUMERIC,
}
MONEY_ROLES = {ROLE_UNIT_PRICE, ROLE_TOTAL, ROLE_COST, ROLE_CURRENCY}
TEXT_ROLES = {ROLE_CATEGORY, ROLE_NAME, ROLE_TEXT}

MISSING_TOKENS = {
    "", "na", "n/a", "nan", "null", "none", "nil", "missing", "-", "--", "?",
    "#n/a", "undefined", "not available",
}

_ID_TOKENS = {"id", "ids", "uuid", "guid", "sku", "invoice", "receipt", "ref", "reference", "code"}
_ID_NUMBER_TOKENS = {"no", "num", "number"}
_ID_NUMBER_CONTEXT = {"order", "invoice", "transaction", "receipt", "customer", "ticket", "trans"}
_DATE_TOKENS = {"date", "datetime", "timestamp", "time", "created", "updated", "day", "month", "year", "dob", "period"}
_QTY_TOKENS = {"qty", "quantity", "quantities", "qnty", "units", "sold", "pieces", "pcs", "count", "stock", "inventory", "volume"}
_PERCENT_TOKENS = {"pct", "percent", "percentage"}
_COST_TOKENS = {"cost", "cogs", "expense", "expenses", "purchase", "wholesale"}
_TOTAL_TOKENS = {"total", "subtotal", "revenue", "sales", "sale", "amount", "gross", "net", "income", "grand", "payment", "paid"}
_PRICE_TOKENS = {"price", "rate", "mrp", "srp", "msrp"}
_CURRENCY_TOKENS = {"tax", "vat", "fee", "charge", "shipping", "discount", "tip", "commission", "salary", "balance"}
_CATEGORY_TOKENS = {
    "category", "cat", "type", "brand", "status", "group", "class", "department", "segment",
    "method", "channel", "region", "city", "country", "state", "gender", "supplier", "vendor",
    "tier", "level", "location", "branch", "store",
}
_NAME_TOKENS = {
    "product", "item", "items", "name", "title", "description", "customer",
    "client", "article", "goods", "merchandise",
}


def tokenize(name: Any) -> List[str]:
    spaced = re.sub(r"([a-z])([A-Z])", r"\1 \2", str(name))
    return [t for t in re.split(r"[^A-Za-z0-9]+", spaced.lower()) if t]


def _name_hint(tokens: set) -> Optional[str]:
    """Role suggested by the column title alone (None if the title says nothing)."""
    if tokens & _DATE_TOKENS and not tokens & _QTY_TOKENS:
        return ROLE_DATE
    if tokens & _ID_TOKENS or (tokens & _ID_NUMBER_TOKENS and tokens & _ID_NUMBER_CONTEXT):
        return ROLE_ID
    if tokens & _QTY_TOKENS:
        return ROLE_QUANTITY            # "Qty", "Total Sold", "Units"
    if tokens & _PERCENT_TOKENS:
        return ROLE_PERCENT
    if tokens & _COST_TOKENS:
        return ROLE_CURRENCY if "total" in tokens else ROLE_COST
    if tokens & _TOTAL_TOKENS:
        if tokens & _PRICE_TOKENS and "total" not in tokens:
            return ROLE_UNIT_PRICE      # "Sale Price"
        return ROLE_TOTAL               # "Total Price", "Revenue", "Amount"
    if tokens & _PRICE_TOKENS:
        return ROLE_UNIT_PRICE
    if tokens & _CURRENCY_TOKENS:
        return ROLE_CURRENCY
    if tokens & _CATEGORY_TOKENS:
        return ROLE_CATEGORY            # wins over "product" in "Product Category"
    if tokens & _NAME_TOKENS:
        return ROLE_NAME
    return None


# --------------------------------------------------------------------------- #
# Value coercion helpers
# --------------------------------------------------------------------------- #
def _is_missing_scalar(v: Any) -> bool:
    if v is None:
        return True
    if isinstance(v, str):
        return v.strip().lower() in MISSING_TOKENS
    try:
        return bool(pd.isna(v))
    except (TypeError, ValueError):
        return False


def normalize_missing(series: pd.Series) -> pd.Series:
    """Trim strings and turn blanks / 'N/A' / 'null' / NaN into None."""
    def conv(v: Any) -> Any:
        if _is_missing_scalar(v):
            return None
        if isinstance(v, str):
            return v.strip()
        if isinstance(v, np.generic):
            return v.item()
        return v
    return series.map(conv).astype(object)


_NUM_STRIP = re.compile("[\\s$\u20ac\u00a3\u00a5\u20b1,]")


def to_number(series: pd.Series) -> pd.Series:
    def conv(v: Any) -> float:
        if v is None or isinstance(v, bool):
            return np.nan
        if isinstance(v, (int, float, np.integer, np.floating)):
            return float(v)
        s = _NUM_STRIP.sub("", str(v)).rstrip("%")
        if s.startswith("(") and s.endswith(")"):
            s = "-" + s[1:-1]
        try:
            return float(s)
        except ValueError:
            return np.nan
    return series.map(conv).astype(float)


def to_date(series: pd.Series) -> pd.Series:
    def prep(v: Any) -> Any:
        if v is None or isinstance(v, bool):
            return None
        if isinstance(v, (int, float, np.integer, np.floating)):
            return None  # bare numbers are never treated as dates
        return v
    prepared = series.map(prep)
    try:
        out = pd.to_datetime(prepared, errors="coerce", format="mixed")
    except (ValueError, TypeError):
        out = pd.to_datetime(prepared, errors="coerce")
    if getattr(out.dt, "tz", None) is not None:
        out = out.dt.tz_localize(None)
    return out


# --------------------------------------------------------------------------- #
# Profiling
# --------------------------------------------------------------------------- #
@dataclass
class ColumnProfile:
    name: str
    role: str
    confidence: float
    reason: str
    integer_only: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "column": self.name,
            "role": self.role,
            "confidence": round(self.confidence, 2),
            "reason": self.reason,
            "integer_only": self.integer_only,
        }


def profile_column(name: str, series: pd.Series) -> ColumnProfile:
    clean = normalize_missing(series)
    present = clean.dropna()
    n = len(present)
    tokens = set(tokenize(name))
    hint = _name_hint(tokens)

    if pd.api.types.is_datetime64_any_dtype(series):
        return ColumnProfile(str(name), ROLE_DATE, 0.99, "Column holds date/time values.")

    if n == 0:
        role = hint or ROLE_TEXT
        return ColumnProfile(str(name), role, 0.5, "Column is empty; role taken from its title.")

    nums = to_number(present)
    num_ratio = float(nums.notna().mean())
    nums_valid = nums.dropna()
    integer_only = bool(len(nums_valid) > 0 and (np.mod(nums_valid, 1) == 0).all())

    # ---- title first, values as confirmation -------------------------------
    if hint == ROLE_ID:
        return ColumnProfile(str(name), ROLE_ID, 0.95, "Title marks an identifier; ids are never invented.")
    if hint == ROLE_DATE:
        if to_date(present.iloc[:200]).notna().mean() >= 0.6:
            return ColumnProfile(str(name), ROLE_DATE, 0.95, "Title and values both say date.")
    elif hint in NUMERIC_ROLES:
        if num_ratio >= 0.6:
            return ColumnProfile(str(name), hint, 0.95, f"Title says {hint.replace('_', ' ')} and values are numeric.",
                                 integer_only=integer_only)
    elif hint in (ROLE_CATEGORY, ROLE_NAME):
        if hint == ROLE_NAME and "items" in tokens and num_ratio >= 0.6:
            return ColumnProfile(str(name), ROLE_QUANTITY, 0.8, "'Items' holds counts, treated as quantity.",
                                 integer_only=integer_only)
        if num_ratio < 0.9:
            return ColumnProfile(str(name), hint, 0.95, f"Title says {hint} and values are text.")

    # ---- value evidence only ----------------------------------------------
    if num_ratio < 0.6:
        as_str = present.astype(str)
        if as_str.str.contains(r"[-/:]", regex=True).mean() >= 0.8 and to_date(present.iloc[:200]).notna().mean() >= 0.8:
            return ColumnProfile(str(name), ROLE_DATE, 0.8, "Values parse as dates.")

    if num_ratio >= 0.8:
        unique_ratio = nums_valid.nunique() / max(len(nums_valid), 1)
        if integer_only and len(nums_valid) > 10 and unique_ratio > 0.95:
            return ColumnProfile(str(name), ROLE_ID, 0.6, "Unique whole numbers look like an identifier.")
        return ColumnProfile(str(name), ROLE_NUMERIC, 0.6, "Numeric values with an unrecognised title.",
                             integer_only=integer_only)

    unique_ratio = present.astype(str).nunique() / n
    if unique_ratio > 0.95 and n > 10:
        return ColumnProfile(str(name), ROLE_TEXT, 0.6, "Mostly unique text values.")
    if present.astype(str).nunique() <= max(12, int(0.5 * n)):
        return ColumnProfile(str(name), ROLE_CATEGORY, 0.7, "Few repeating text values form categories.")
    return ColumnProfile(str(name), ROLE_TEXT, 0.6, "Free text.")


# --------------------------------------------------------------------------- #
# Working frame
# --------------------------------------------------------------------------- #
@dataclass
class WorkingFrame:
    typed: pd.DataFrame
    profiles: Dict[str, ColumnProfile]
    columns: List[str] = field(default_factory=list)

    def first(self, role: str) -> Optional[str]:
        for c in self.columns:
            if self.profiles[c].role == role:
                return c
        return None

    def product_keys(self) -> Optional[pd.Series]:
        col = None
        for c in self.columns:
            if self.profiles[c].role == ROLE_NAME:
                toks = set(tokenize(c))
                if toks & {"product", "item", "sku", "article", "goods", "merchandise"}:
                    col = c
                    break
                col = col or c
        if col is None:
            return None
        return self.typed[col].map(lambda v: None if v is None else _key(v))


def _key(value: Any) -> str:
    return re.sub(r"[\s_\-]+", "", str(value).strip().lower())


def prepare(df: pd.DataFrame) -> WorkingFrame:
    df = df.reset_index(drop=True)
    typed = pd.DataFrame(index=df.index)
    profiles: Dict[str, ColumnProfile] = {}
    cols = [str(c) for c in df.columns]
    for orig, col in zip(df.columns, cols):
        clean = normalize_missing(df[orig])
        prof = profile_column(col, df[orig])
        profiles[col] = prof
        if prof.role in NUMERIC_ROLES:
            typed[col] = to_number(clean)
        elif prof.role == ROLE_DATE:
            typed[col] = to_date(clean)
        elif prof.role in TEXT_ROLES:
            typed[col] = clean.map(lambda v: v if v is None or isinstance(v, str) else str(v)).astype(object)
        else:
            typed[col] = clean
    return WorkingFrame(typed=typed, profiles=profiles, columns=cols)


# --------------------------------------------------------------------------- #
# Fill rules
# --------------------------------------------------------------------------- #
def _typical_int(nums: pd.Series) -> Tuple[int, str]:
    """Most common whole number; if nothing repeats, the median. Never fractional."""
    rounded = nums.round().astype(int)
    counts = rounded.value_counts()
    if counts.iloc[0] > 1:
        top = counts[counts == counts.iloc[0]].index.min()
        return max(1, int(top)), "column_mode"
    return max(1, int(round(float(rounded.median())))), "column_median"


def _mode_text(values: pd.Series) -> Optional[str]:
    present = values.dropna()
    if present.empty:
        return None
    groups: Dict[str, Counter] = {}
    for v in present:
        groups.setdefault(_key(v), Counter())[str(v)] += 1
    best = max(groups.values(), key=lambda c: (sum(c.values()), -len(c)))
    return best.most_common(1)[0][0]


def _round_for(role: str, value: float, integer_only: bool = False) -> Any:
    if role == ROLE_QUANTITY or (role == ROLE_NUMERIC and integer_only):
        return int(round(value))
    if role == ROLE_NUMERIC:
        return round(float(value), 4)
    return round(float(value), 2)


def _day(ts: pd.Timestamp) -> pd.Timestamp:
    return pd.Timestamp(ts).normalize()


def _json_value(role: str, value: Any, integer_only: bool = False) -> Any:
    if value is None:
        return None
    if role in NUMERIC_ROLES:
        if isinstance(value, float) and np.isnan(value):
            return None
        return _round_for(role, float(value), integer_only)
    if role == ROLE_DATE:
        if pd.isna(value):
            return None
        ts = pd.Timestamp(value)
        return ts.strftime("%Y-%m-%d") if ts == ts.normalize() else ts.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, np.generic):
        return value.item()
    return value


def derive_row_values(wf: WorkingFrame) -> Dict[str, List[Dict[str, Any]]]:
    """total = qty x unit price, applied row by row, before any statistical fill."""
    q, p, t = wf.first(ROLE_QUANTITY), wf.first(ROLE_UNIT_PRICE), wf.first(ROLE_TOTAL)
    out: Dict[str, List[Dict[str, Any]]] = {}
    if not (q and p and t):
        return out
    df = wf.typed
    for pos in range(len(df)):
        qv, pv, tv = df[q].iat[pos], df[p].iat[pos], df[t].iat[pos]
        if np.isnan(tv) and not np.isnan(qv) and not np.isnan(pv):
            val = round(qv * pv, 2)
            df.iat[pos, df.columns.get_loc(t)] = val
            out.setdefault(t, []).append({"row_index": pos, "value": val, "method": "row_derived"})
        elif np.isnan(qv) and not np.isnan(tv) and not np.isnan(pv) and pv > 0:
            val = int(round(tv / pv))
            if val >= 1:
                df.iat[pos, df.columns.get_loc(q)] = float(val)
                out.setdefault(q, []).append({"row_index": pos, "value": val, "method": "row_derived"})
        elif np.isnan(pv) and not np.isnan(tv) and not np.isnan(qv) and qv > 0:
            val = round(tv / qv, 2)
            df.iat[pos, df.columns.get_loc(p)] = val
            out.setdefault(p, []).append({"row_index": pos, "value": val, "method": "row_derived"})
    return out


def fill_column(
    wf: WorkingFrame,
    col: str,
    strategy: str = "auto",
    constant: Any = None,
) -> List[Dict[str, Any]]:
    """Fill missing cells of one column according to its detected role. Returns fills."""
    prof = wf.profiles[col]
    role = prof.role
    s = wf.typed[col].copy()
    missing_pos = np.flatnonzero(s.isna().values)
    if len(missing_pos) == 0:
        return []

    strategy = (strategy or "auto").lower()
    fills: List[Dict[str, Any]] = []
    integer_only = prof.integer_only

    def record(pos: int, value: Any, method: str) -> None:
        if value is None or (isinstance(value, float) and np.isnan(value)):
            return
        s.iat[pos] = value
        fills.append({"row_index": int(pos), "value": _json_value(role, value, integer_only), "method": method})

    # ---- neighbours (valid for any role except ids) ------------------------
    if strategy in ("ffill", "bfill") and role != ROLE_ID and role != ROLE_DATE:
        filled = s.ffill().bfill() if strategy == "ffill" else s.bfill().ffill()
        for pos in missing_pos:
            v = filled.iat[pos]
            if not _is_missing_scalar(v):
                record(pos, v, f"neighbor_{strategy}")
        wf.typed[col] = s
        return fills

    if role == ROLE_ID:
        if strategy == "constant" and constant not in (None, ""):
            for pos in missing_pos:
                record(pos, constant, "constant")
        wf.typed[col] = s
        return fills   # identifiers are never fabricated

    # ---- dates -------------------------------------------------------------
    if role == ROLE_DATE:
        valid = s.dropna()
        if valid.empty:
            if strategy == "constant" and constant:
                ts = pd.to_datetime(constant, errors="coerce")
                if not pd.isna(ts):
                    for pos in missing_pos:
                        record(pos, _day(ts), "constant")
            wf.typed[col] = s
            return fills
        positions = np.arange(len(s))
        vp = pd.Series(np.where(s.notna().values, positions, np.nan))
        prev_idx, next_idx = vp.ffill().values, vp.bfill().values
        is_sorted = valid.is_monotonic_increasing or valid.is_monotonic_decreasing
        mode_day = valid.map(_day).mode()
        fallback = mode_day.iloc[0] if len(mode_day) else _day(valid.median())
        for pos in missing_pos:
            prev = None if np.isnan(prev_idx[pos]) else s.iat[int(prev_idx[pos])]
            nxt = None if np.isnan(next_idx[pos]) else s.iat[int(next_idx[pos])]
            if strategy == "constant":
                ts = pd.to_datetime(constant, errors="coerce")
                if not pd.isna(ts):
                    record(pos, _day(ts), "constant")
                continue
            if strategy in ("mean", "median"):
                record(pos, _day(valid.median()), "column_median")
            elif strategy == "mode":
                record(pos, fallback, "column_mode")
            elif strategy == "ffill":
                record(pos, _day(prev if prev is not None else nxt), "neighbor_ffill")
            elif strategy == "bfill":
                record(pos, _day(nxt if nxt is not None else prev), "neighbor_bfill")
            elif is_sorted:
                if prev is not None and nxt is not None:
                    record(pos, _day(prev + (nxt - prev) / 2), "neighbor_interpolation")
                else:
                    record(pos, _day(prev if prev is not None else nxt), "neighbor_ffill")
            else:
                record(pos, fallback, "column_mode")
        wf.typed[col] = s
        return fills

    # ---- numbers -----------------------------------------------------------
    if role in NUMERIC_ROLES:
        nums = s.dropna()
        keys = wf.product_keys() if strategy == "auto" and role in (ROLE_UNIT_PRICE, ROLE_COST) else None
        global_val: Optional[float] = None
        method = "default"

        if strategy == "constant":
            try:
                global_val, method = float(constant), "constant"
            except (TypeError, ValueError):
                global_val = None
        elif len(nums) == 0:
            if role == ROLE_QUANTITY:
                global_val, method = 1.0, "default"
        elif role == ROLE_QUANTITY and strategy in ("auto", "mode"):
            val, method = _typical_int(nums)
            global_val = float(val)
        elif strategy == "mean":
            global_val, method = float(nums.mean()), "column_mean"
        elif strategy == "mode":
            global_val, method = float(nums.mode().min()), "column_mode"
        else:  # auto / median
            global_val, method = float(nums.median()), "column_median"

        if global_val is not None and role == ROLE_QUANTITY:
            global_val = float(max(1, int(round(global_val))))

        for pos in missing_pos:
            if keys is not None and keys.iat[pos] is not None:
                same = nums[(keys == keys.iat[pos]).reindex(nums.index, fill_value=False)]
                if len(same) > 0:
                    record(pos, round(float(same.median()), 2), "same_product")
                    continue
            if global_val is not None:
                record(pos, global_val, method)
        wf.typed[col] = s
        return fills

    # ---- text / category / name -------------------------------------------
    if strategy == "constant" and constant not in (None, ""):
        value, method = str(constant), "constant"
    elif strategy == "auto" and role == ROLE_NAME:
        value, method = "Unknown", "default"
    elif strategy == "auto" and role == ROLE_TEXT:
        value, method = "Unknown", "default"
    else:
        value, method = _mode_text(s), "column_mode"
        if value is None:
            value, method = ("Uncategorized" if role == ROLE_CATEGORY else "Unknown"), "default"

    keys = wf.product_keys() if strategy == "auto" and role == ROLE_CATEGORY else None
    for pos in missing_pos:
        if keys is not None and keys.iat[pos] is not None:
            same = s[(keys == keys.iat[pos]).values]
            same_mode = _mode_text(same)
            if same_mode is not None:
                record(pos, same_mode, "same_product")
                continue
        record(pos, value, method)
    wf.typed[col] = s
    return fills


# --------------------------------------------------------------------------- #
# Category normalization
# --------------------------------------------------------------------------- #
def _canonical_pick(variants: Counter) -> str:
    def rank(item: Tuple[str, int]) -> Tuple[int, int, str]:
        text, count = item
        well_cased = 1 if (text != text.lower() and text != text.upper()) else 0
        return (-count, -well_cased, text)
    return sorted(variants.items(), key=rank)[0][0]


def normalize_categories(wf: WorkingFrame, columns: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """Merge spelling variants in category/name columns. Returns per-column reports."""
    reports: List[Dict[str, Any]] = []
    for col in (columns or wf.columns):
        if wf.profiles[col].role not in (ROLE_CATEGORY, ROLE_NAME):
            continue
        s = wf.typed[col]
        groups: Dict[str, Counter] = {}
        for v in s.dropna():
            groups.setdefault(_key(v), Counter())[str(v)] += 1
        mapping: Dict[str, str] = {}
        merged = 0
        for variants in groups.values():
            canonical = _canonical_pick(variants)
            for raw, cnt in variants.items():
                if raw != canonical:
                    mapping[raw] = canonical
                    merged += cnt
        if mapping:
            wf.typed[col] = s.map(lambda v: mapping.get(v, v) if v is not None else v)
            reports.append({"column": col, "cells_changed": merged, "mapping": mapping})
    return reports


# --------------------------------------------------------------------------- #
# Output
# --------------------------------------------------------------------------- #
def finalize_column(wf: WorkingFrame, col: str) -> List[Any]:
    prof = wf.profiles[col]
    s = wf.typed[col]
    if prof.role in NUMERIC_ROLES:
        return [None if np.isnan(v) else _round_for(prof.role, float(v), prof.integer_only) for v in s.values]
    if prof.role == ROLE_DATE:
        notna = s.dropna()
        with_time = bool(len(notna) and (notna != notna.dt.normalize()).any())
        fmt = "%Y-%m-%d %H:%M:%S" if with_time else "%Y-%m-%d"
        return [None if pd.isna(v) else pd.Timestamp(v).strftime(fmt) for v in s]
    return [None if _is_missing_scalar(v) else (v.item() if isinstance(v, np.generic) else v) for v in s.values]


def autofill_frame(
    wf: WorkingFrame,
    columns: Optional[List[str]] = None,
    strategies: Optional[Dict[str, Tuple[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """Fill gaps in the chosen columns (all columns by default) and report what was done."""
    targets = columns or wf.columns
    strategies = strategies or {}
    missing_before = {c: int(wf.typed[c].isna().sum()) for c in targets}
    derived: Dict[str, List[Dict[str, Any]]] = {}
    if all(strategies.get(c, ("auto", None))[0] == "auto" for c in targets):
        derived = derive_row_values(wf)

    reports: List[Dict[str, Any]] = []
    for col in targets:
        strategy, constant = strategies.get(col, ("auto", None))
        fills = list(derived.get(col, [])) + fill_column(wf, col, strategy, constant)
        methods = Counter(f["method"] for f in fills)
        prof = wf.profiles[col]
        reports.append({
            **prof.to_dict(),
            "missing_before": missing_before[col],
            "filled": len(fills),
            "unresolved": int(wf.typed[col].isna().sum()),
            "methods": dict(methods),
            "fills": fills[:200],
        })
    return reports
