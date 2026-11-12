import io
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List
from app.core.detector import infer_column_type, detect_semantic_role
from app.schemas.dataset import ColumnSummary, DatasetInspectionResponse

class DatasetProcessor:
    @staticmethod
    def read_dataset(file_bytes: bytes, filename: str) -> pd.DataFrame:
        """
        Safely parse Excel or CSV buffer into pandas DataFrame.
        """
        lower_name = filename.lower()
        if lower_name.endswith('.csv'):
            try:
                return pd.read_csv(io.BytesIO(file_bytes), encoding='utf-8')
            except UnicodeDecodeError:
                return pd.read_csv(io.BytesIO(file_bytes), encoding='latin1')
        elif lower_name.endswith(('.xlsx', '.xls')):
            # Engine openpyxl ensures safe parsing without macros execution
            return pd.read_excel(io.BytesIO(file_bytes), engine='openpyxl')
        else:
            raise ValueError(f"Unsupported file format: {filename}. Supported formats are .xlsx, .xls, .csv")

    @staticmethod
    def inspect(df: pd.DataFrame, filename: str) -> DatasetInspectionResponse:
        """
        Perform complete dataset inspection, quality metrics, and preview extraction.
        """
        total_rows = len(df)
        total_columns = len(df.columns)

        # Count duplicate rows
        duplicate_rows_count = int(df.duplicated().sum())

        # Clean column names (strip whitespace)
        df.columns = [str(c).strip() for c in df.columns]

        column_summaries: List[ColumnSummary] = []
        total_missing = 0
        has_date = False
        has_numeric = False
        semantic_roles_found = []

        for col in df.columns:
            series = df[col]
            missing_count = int(series.isna().sum())
            total_missing += missing_count
            non_null_count = total_rows - missing_count
            missing_pct = round((missing_count / total_rows * 100), 2) if total_rows > 0 else 0.0
            unique_count = int(series.nunique(dropna=True))

            inferred_type = infer_column_type(series)
            if inferred_type == "date":
                has_date = True
            elif inferred_type == "numeric":
                has_numeric = True

            role = detect_semantic_role(col, series, inferred_type)
            if role:
                semantic_roles_found.append(role)

            # Get sample values (non-null, sanitized for JSON)
            samples = series.dropna().head(5).tolist()
            sanitized_samples = [
                str(s) if isinstance(s, (datetime, pd.Timestamp)) 
                else (int(s) if isinstance(s, (np.integer, int)) 
                else (float(s) if isinstance(s, (np.floating, float)) 
                else str(s))) 
                for s in samples
            ]

            column_summaries.append(ColumnSummary(
                name=col,
                inferred_type=inferred_type,
                total_count=total_rows,
                non_null_count=non_null_count,
                missing_count=missing_count,
                missing_percentage=missing_pct,
                unique_count=unique_count,
                sample_values=sanitized_samples,
                detected_semantic_role=role
            ))

        # Preview rows (first 10 rows converted to JSON-serializable records)
        preview_df = df.head(10).replace({np.nan: None})
        preview_records: List[Dict[str, Any]] = []
        for record in preview_df.to_dict(orient='records'):
            clean_record = {}
            for k, v in record.items():
                if isinstance(v, (datetime, pd.Timestamp)):
                    clean_record[k] = v.isoformat()
                elif isinstance(v, (np.generic)):
                    clean_record[k] = v.item()
                else:
                    clean_record[k] = v
            preview_records.append(clean_record)

        # Full records (up to 5000 rows for interactive calculations)
        full_df = df.head(5000).replace({np.nan: None})
        all_records: List[Dict[str, Any]] = []
        for record in full_df.to_dict(orient='records'):
            clean_rec = {}
            for k, v in record.items():
                if isinstance(v, (datetime, pd.Timestamp)):
                    clean_rec[k] = v.isoformat()
                elif isinstance(v, (np.generic)):
                    clean_rec[k] = v.item()
                else:
                    clean_rec[k] = v
            all_records.append(clean_rec)

        # Detect high-level business profile
        detected_business_type = "general_tabular"
        if "product" in semantic_roles_found and ("selling_price" in semantic_roles_found or "revenue" in semantic_roles_found):
            detected_business_type = "sales_commerce"

        return DatasetInspectionResponse(
            status="success",
            filename=filename,
            total_rows=total_rows,
            total_columns=total_columns,
            duplicate_rows_count=duplicate_rows_count,
            columns=column_summaries,
            preview_rows=preview_records,
            records=all_records,
            missing_values_total=total_missing,
            has_date_column=has_date,
            has_numeric_columns=has_numeric,
            detected_business_type=detected_business_type,
            inspected_at=datetime.utcnow().isoformat()
        )
