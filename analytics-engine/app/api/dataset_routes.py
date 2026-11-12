from fastapi import APIRouter, UploadFile, File, HTTPException
from app.processors.dataset_processor import DatasetProcessor
from app.schemas.dataset import DatasetInspectionResponse

router = APIRouter(prefix="/dataset", tags=["Dataset Processing"])

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB limit

@router.post("/inspect", response_model=DatasetInspectionResponse)
async def inspect_dataset(file: UploadFile = File(...)):
    """
    Inspect uploaded spreadsheet (Excel or CSV).
    Extracts columns, types, duplicate counts, missing values, and preview data.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")

    filename = file.filename
    lower_name = filename.lower()
    if not lower_name.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. Only .xlsx, .xls, and .csv files are supported."
        )

    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File size exceeds the 25MB maximum limit.")

        df = DatasetProcessor.read_dataset(content, filename)
        return DatasetProcessor.inspect(df, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process dataset: {str(e)}")
