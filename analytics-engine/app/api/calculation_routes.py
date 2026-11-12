from fastapi import APIRouter, HTTPException, status
import math
import pandas as pd
from app.schemas.calculations import (
    FormulaValidationRequest,
    FormulaValidationResponse,
    CalculationEvaluateRequest,
    CalculationEvaluateResponse,
    PivotRequest,
    PivotResponse,
    PivotRow
)
from app.calculations.formula_parser import SafeFormulaParser

router = APIRouter(prefix="/calculations", tags=["Custom Calculations"])

_AGGS = {"sum", "mean", "count", "min", "max"}
_VALUE_COL = "__pivot_value__"


def _num(v):
    """JSON-safe rounded float."""
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return round(f, 2)


@router.post("/pivot", response_model=PivotResponse)
def pivot_table(req: PivotRequest):
    """
    Excel-style pivot: Rows (+ optional Columns) x Values, where Values is a
    per-row formula (e.g. [Sales] - [Profit]) computed first, then aggregated.
    """
    def fail(msg: str) -> PivotResponse:
        return PivotResponse(success=False, error=msg, source_rows=len(req.rows))

    if not req.rows:
        return fail("Dataset rows cannot be empty.")
    if not req.row_fields:
        return fail("Drag at least one field into Rows.")
    agg = (req.aggregation or "sum").lower()
    if agg not in _AGGS:
        return fail(f"Unsupported aggregation '{req.aggregation}'.")

    try:
        df = pd.DataFrame(req.rows)
        for f in list(req.row_fields) + ([req.column_field] if req.column_field else []):
            if f not in df.columns:
                return fail(f"Field '{f}' does not exist in dataset.")
        if req.column_field and req.column_field in req.row_fields:
            return fail("The same field cannot be used in both Rows and Columns.")

        parser = SafeFormulaParser(available_columns=req.columns)
        df, _ = parser.evaluate(df, req.value_formula, _VALUE_COL)

        # Category labels: blanks become "(blank)"
        for f in req.row_fields + ([req.column_field] if req.column_field else []):
            df[f] = df[f].astype(str).str.strip().replace({"": "(blank)", "nan": "(blank)", "None": "(blank)"})

        label = req.value_label or f"{agg.capitalize()} of {req.value_formula}"
        by_rows = df.groupby(req.row_fields, sort=True)[_VALUE_COL].agg(agg)

        if req.column_field:
            col_values = sorted(df[req.column_field].unique().tolist())
            grid = df.groupby(req.row_fields + [req.column_field], sort=True)[_VALUE_COL].agg(agg)
            col_totals_s = df.groupby(req.column_field)[_VALUE_COL].agg(agg)
        else:
            col_values = []
            grid = None
            col_totals_s = None

        out_rows = []
        for key, total in by_rows.items():
            key_t = key if isinstance(key, tuple) else (key,)
            if grid is not None:
                vals = [_num(grid.get(tuple(key_t) + (c,))) for c in col_values]
            else:
                vals = [_num(total)]
            out_rows.append(PivotRow(keys=[str(k) for k in key_t], values=vals, total=_num(total)))

        if col_totals_s is not None:
            column_totals = [_num(col_totals_s.get(c)) for c in col_values]
        else:
            column_totals = [_num(getattr(df[_VALUE_COL], agg)()) if agg != "count" else _num(df[_VALUE_COL].count())]

        grand = _num(df[_VALUE_COL].count()) if agg == "count" else _num(getattr(df[_VALUE_COL], agg)())

        return PivotResponse(
            success=True,
            row_fields=req.row_fields,
            column_field=req.column_field,
            column_values=col_values if col_values else [label],
            value_label=label,
            rows=out_rows,
            column_totals=column_totals,
            grand_total=grand,
            source_rows=len(df)
        )
    except ValueError as ve:
        return fail(str(ve))
    except Exception as e:
        return fail(f"Pivot failed: {str(e)}")

@router.post("/validate", response_model=FormulaValidationResponse)
def validate_formula(req: FormulaValidationRequest):
    """
    Validates a formula without executing it on dataset rows.
    """
    try:
        parser = SafeFormulaParser(available_columns=req.columns)
        is_valid, referenced_cols, error = parser.validate(req.formula)
        return FormulaValidationResponse(
            valid=is_valid,
            formula=req.formula,
            referenced_columns=referenced_cols,
            error=error
        )
    except Exception as e:
        return FormulaValidationResponse(
            valid=False,
            formula=req.formula,
            referenced_columns=[],
            error=str(e)
        )

@router.post("/evaluate", response_model=CalculationEvaluateResponse)
def evaluate_calculation(req: CalculationEvaluateRequest):
    """
    Safely executes an AST-parsed formula over the provided dataset rows
    and returns preview rows with the newly calculated column and summary statistics.
    """
    if not req.rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset rows cannot be empty."
        )

    if not req.target_column or not req.target_column.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target column name is required."
        )

    try:
        df = pd.DataFrame(req.rows)
        parser = SafeFormulaParser(available_columns=req.columns)
        
        # Validate formula first
        is_valid, ref_cols, val_err = parser.validate(req.formula)
        if not is_valid:
            return CalculationEvaluateResponse(
                success=False,
                target_column=req.target_column,
                total_rows=len(df),
                preview=[],
                summary={},
                error=val_err
            )

        updated_df, summary = parser.evaluate(df, req.formula, req.target_column.strip())

        # Generate preview rows (first 10 rows)
        preview_data = updated_df.head(10).to_dict(orient="records")

        return CalculationEvaluateResponse(
            success=True,
            target_column=req.target_column.strip(),
            total_rows=len(updated_df),
            preview=preview_data,
            summary=summary,
            error=None
        )
    except ValueError as ve:
        return CalculationEvaluateResponse(
            success=False,
            target_column=req.target_column,
            total_rows=len(req.rows),
            preview=[],
            summary={},
            error=str(ve)
        )
    except Exception as e:
        return CalculationEvaluateResponse(
            success=False,
            target_column=req.target_column,
            total_rows=len(req.rows),
            preview=[],
            summary={},
            error=f"Evaluation failed: {str(e)}"
        )
