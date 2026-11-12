from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class CellEditAction(BaseModel):
    row_index: int
    column_name: str
    new_value: Any

class MissingValueStrategyRequest(BaseModel):
    column_name: str
    strategy: str  # mean, median, mode, ffill, bfill, constant
    constant_value: Optional[Any] = None

class CategoryNormalizationRule(BaseModel):
    column_name: str
    target_value: str
    source_variants: List[str]

class CleanDatasetRequest(BaseModel):
    records: List[Dict[str, Any]]
    remove_duplicates: bool = False
    delete_row_indices: Optional[List[int]] = None
    delete_columns: Optional[List[str]] = None
    rename_columns: Optional[Dict[str, str]] = None
    cell_edits: Optional[List[CellEditAction]] = None
    imputation_rules: Optional[List[MissingValueStrategyRequest]] = None
    category_rules: Optional[List[CategoryNormalizationRule]] = None
    auto_clean: bool = False  # profile columns, normalize categories, dedupe and fill ALL gaps

class CategorySuggestion(BaseModel):
    canonical_value: str
    variants: List[str]
    count: int

class CategorySuggestionsResponse(BaseModel):
    column_name: str
    suggestions: List[CategorySuggestion]

class ImputationPreviewResponse(BaseModel):
    column_name: str
    strategy: str
    affected_cells_count: int
    sample_imputations: List[Dict[str, Any]]
    calculated_value: Optional[Any] = None
    detected_role: Optional[str] = None
    explanation: Optional[str] = None
    fills: List[Dict[str, Any]] = []

class CleanDatasetResponse(BaseModel):
    status: str
    total_rows: int
    total_columns: int
    cleaned_records: List[Dict[str, Any]]
    rows_removed_count: int
    duplicates_removed_count: int
    cells_modified_count: int
    columns_removed_count: int
    category_cells_normalized: int = 0
    column_reports: List[Dict[str, Any]] = []
