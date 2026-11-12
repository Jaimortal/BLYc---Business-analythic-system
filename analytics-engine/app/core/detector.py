import re
import pandas as pd
from typing import Optional

# Semantic patterns based on Section 7 (Module D)
SEMANTIC_PATTERNS = {
    "category": [r"category", r"^cat\b", r"^department", r"^group", r"^type", r"^segment", r"^class"],
    "product": [r"^product(?![\s_]?cat)", r"^item", r"^sku", r"^description", r"^goods", r"^article"],
    "quantity": [r"^qty", r"^quantity", r"^units", r"^volume", r"^pieces", r"^count"],
    "selling_price": [r"^price", r"^selling[\s_]?price", r"^unit[\s_]?price", r"^rate"],
    "cost": [r"^cost", r"^unit[\s_]?cost", r"^cogs", r"^expense", r"^purchase[\s_]?price"],
    "revenue": [r"^revenue", r"^total[\s_]?amount", r"^sales", r"^total[\s_]?sales", r"^gross[\s_]?sales"],
    "date": [r"^date", r"^time", r"^created[\s_]?at", r"^order[\s_]?date", r"^timestamp", r"^day"],
    "order_id": [r"^order[\s_]?id", r"^invoice", r"^transaction[\s_]?id", r"^trans[\s_]?id", r"^receipt"],
    "customer_id": [r"^customer[\s_]?id", r"^client[\s_]?id", r"^cust[\s_]?id", r"^user[\s_]?id"]
}

def detect_semantic_role(col_name: str, series: pd.Series, inferred_type: str) -> Optional[str]:
    """
    Detect potential business meaning without guessing blindly.
    Follows Section 7 Rule: Never automatically assume 'Price' is revenue.
    """
    clean_name = col_name.strip().lower()

    for role, patterns in SEMANTIC_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, clean_name):
                # Verify type sanity before assigning role
                if role in ["quantity", "selling_price", "cost", "revenue"] and inferred_type != "numeric":
                    continue
                if role == "date" and inferred_type != "date":
                    continue
                return role

    return None

def infer_column_type(series: pd.Series) -> str:
    """
    Determine safe high-level column type: numeric, date, boolean, text, or id.
    """
    # Drop NAs for type probing
    valid_sample = series.dropna()
    if valid_sample.empty:
        return "empty"

    # 1. Check Boolean
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if valid_sample.astype(str).str.lower().isin(["true", "false", "0", "1", "yes", "no"]).all():
        if len(valid_sample.unique()) <= 2:
            return "boolean"

    # 2. Check Numeric
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    
    # Try converting string representation of numeric values (e.g., "$120.50", "1,500")
    try:
        clean_num = valid_sample.astype(str).str.replace(r"[$,]", "", regex=True)
        pd.to_numeric(clean_num)
        return "numeric"
    except (ValueError, TypeError):
        pass

    # 3. Check Date / Datetime
    if pd.api.types.is_datetime64_any_dtype(series):
        return "date"
    
    # Try parsing sample strings as dates
    if valid_sample.astype(str).str.len().between(8, 30).all():
        try:
            pd.to_datetime(valid_sample.iloc[:20], errors="raise", format="mixed")
            return "date"
        except (ValueError, TypeError):
            pass

    # 4. Check Identifiers (high unique ratio, alphanumeric or integer)
    unique_ratio = len(valid_sample.unique()) / len(valid_sample)
    if unique_ratio > 0.95 and len(valid_sample) > 10:
        return "id"

    # 5. Default Text / Categorical
    if len(valid_sample.unique()) <= max(5, int(len(valid_sample) * 0.2)):
        return "category"

    return "text"
