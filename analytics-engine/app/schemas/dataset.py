from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class ColumnSummary(BaseModel):
    name: str
    inferred_type: str  # numeric, text, date, boolean, category, id
    total_count: int
    non_null_count: int
    missing_count: int
    missing_percentage: float
    unique_count: int
    sample_values: List[Any]
    detected_semantic_role: Optional[str] = None  # product, quantity, price, cost, revenue, date, etc.

class DatasetInspectionResponse(BaseModel):
    status: str
    filename: str
    total_rows: int
    total_columns: int
    duplicate_rows_count: int
    columns: List[ColumnSummary]
    preview_rows: List[Dict[str, Any]]
    records: Optional[List[Dict[str, Any]]] = None
    missing_values_total: int
    has_date_column: bool
    has_numeric_columns: bool
    detected_business_type: Optional[str] = None
    inspected_at: str
