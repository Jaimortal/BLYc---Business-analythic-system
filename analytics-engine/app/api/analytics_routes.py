from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any, Optional
from app.schemas.analytics import AnalyticsResponse
from app.analytics.calculator import AnalyticsCalculator

router = APIRouter(prefix="/analytics", tags=["Analytics Computation"])

class ComputeAnalyticsPayload:
    records: List[Dict[str, Any]]
    column_mappings: Optional[Dict[str, str]] = None

@router.post("/compute", response_model=AnalyticsResponse)
async def compute_analytics(payload: Dict[str, Any] = Body(...)):
    """
    Compute verified descriptive statistics, sales metrics, and time trends from records.
    """
    records = payload.get("records")
    if not records or not isinstance(records, list):
        raise HTTPException(status_code=400, detail="Missing or invalid 'records' list.")

    column_mappings = payload.get("column_mappings")

    try:
        return AnalyticsCalculator.calculate_analytics(records, column_mappings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics computation failed: {str(e)}")
