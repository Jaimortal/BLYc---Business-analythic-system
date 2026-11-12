from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
import pandas as pd
from app.schemas.cleaning import (
    CleanDatasetRequest,
    CleanDatasetResponse,
    CategorySuggestionsResponse,
    ImputationPreviewResponse
)
from app.cleaning.cleaner import CleaningService

router = APIRouter(prefix="/cleaning", tags=["Data Cleaning"])

@router.post("/category-suggestions", response_model=CategorySuggestionsResponse)
async def get_category_suggestions(
    column: str = Query(..., description="Column to analyze for inconsistent category variations"),
    records: List[Dict[str, Any]] = ...
):
    """
    Detect case, spacing, and punctuation variations of categories (e.g., Makeup vs make up).
    """
    df = pd.DataFrame(records)
    return CleaningService.detect_category_inconsistencies(df, column)

@router.post("/preview-imputation", response_model=ImputationPreviewResponse)
async def preview_imputation(
    column: str = Query(...),
    strategy: str = Query(...),
    constant_value: Optional[str] = Query(None),
    records: List[Dict[str, Any]] = ...
):
    """
    Simulate missing value strategy and return preview before confirmation.
    """
    try:
        df = pd.DataFrame(records)
        return CleaningService.preview_imputation(df, column, strategy, constant_value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/apply", response_model=CleanDatasetResponse)
async def apply_cleaning(request: CleanDatasetRequest):
    """
    Apply cell edits, deletions, deduplication, imputation, and category normalization.
    """
    try:
        return CleaningService.clean_dataset(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clean dataset: {str(e)}")

@router.post("/profile")
async def profile_columns(records: List[Dict[str, Any]]):
    """
    Detect what every column is (id, date, quantity, unit price, total, category...)
    and which fill rule will be used for its missing values.
    """
    return {"columns": CleaningService.profile_dataset(records)}
