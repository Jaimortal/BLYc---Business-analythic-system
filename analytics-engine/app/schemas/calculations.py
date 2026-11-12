from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class FormulaValidationRequest(BaseModel):
    formula: str = Field(..., description="The formula to validate, e.g. [Price] * [Quantity]")
    columns: List[str] = Field(..., description="List of valid column names in the dataset")

class FormulaValidationResponse(BaseModel):
    valid: bool
    formula: str
    referenced_columns: List[str] = []
    error: Optional[str] = None

class CalculationEvaluateRequest(BaseModel):
    rows: List[Dict[str, Any]] = Field(..., description="Dataset rows to evaluate formula against")
    columns: List[str] = Field(..., description="List of valid columns")
    formula: str = Field(..., description="Formula to calculate new column values")
    target_column: str = Field(..., description="Name for the newly calculated column")

class CalculationEvaluateResponse(BaseModel):
    success: bool
    target_column: str
    total_rows: int
    preview: List[Dict[str, Any]] = []
    summary: Dict[str, Optional[float]] = {}
    error: Optional[str] = None

class PivotRequest(BaseModel):
    rows: List[Dict[str, Any]]
    columns: List[str]
    row_fields: List[str] = Field(..., description="Fields placed on pivot Rows (dropdown categories)")
    column_field: Optional[str] = Field(None, description="Optional field placed on pivot Columns")
    value_formula: str = Field(..., description="Per-row expression for Values, e.g. [Sales] - [Profit]")
    aggregation: str = Field("sum", description="sum | mean | count | min | max")
    value_label: Optional[str] = None

class PivotRow(BaseModel):
    keys: List[str]
    values: List[Optional[float]]
    total: Optional[float] = None

class PivotResponse(BaseModel):
    success: bool
    row_fields: List[str] = []
    column_field: Optional[str] = None
    column_values: List[str] = []
    value_label: str = ""
    rows: List[PivotRow] = []
    column_totals: List[Optional[float]] = []
    grand_total: Optional[float] = None
    source_rows: int = 0
    error: Optional[str] = None
