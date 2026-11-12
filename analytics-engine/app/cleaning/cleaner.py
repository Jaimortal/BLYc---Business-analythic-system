import pandas as pd
import numpy as np
import re
from collections import Counter
from typing import List, Dict, Any, Tuple
from app.schemas.cleaning import (
    CleanDatasetRequest,
    CleanDatasetResponse,
    CategorySuggestionsResponse,
    CategorySuggestion,
    ImputationPreviewResponse
)
from app.cleaning import column_profiler as cp

VALID_STRATEGIES = {"auto", "mean", "median", "mode", "ffill", "bfill", "constant"}

_LEGACY_DOMAIN = {
    cp.ROLE_QUANTITY: "quantity",
    cp.ROLE_UNIT_PRICE: "currency",
    cp.ROLE_TOTAL: "currency",
    cp.ROLE_COST: "currency",
    cp.ROLE_CURRENCY: "currency",
    cp.ROLE_PERCENT: "general_numeric",
    cp.ROLE_NUMERIC: "general_numeric",
    cp.ROLE_DATE: "date",
    cp.ROLE_CATEGORY: "category",
    cp.ROLE_NAME: "category",
    cp.ROLE_ID: "id",
    cp.ROLE_TEXT: "text",
}

_EXPLANATIONS = {
    cp.ROLE_QUANTITY: "Quantity: whole units only, filled with the most common count (never a fraction).",
    cp.ROLE_UNIT_PRICE: "Unit price: filled from the same product when known, otherwise the column median, 2 decimals.",
    cp.ROLE_TOTAL: "Total amount: quantity x unit price when both exist, otherwise the column median, 2 decimals.",
    cp.ROLE_COST: "Cost: filled from the same product when known, otherwise the column median, 2 decimals.",
    cp.ROLE_CURRENCY: "Money value: column median, 2 decimals.",
    cp.ROLE_PERCENT: "Percentage: column median, 2 decimals.",
    cp.ROLE_NUMERIC: "Numeric value: column median.",
    cp.ROLE_DATE: "Date: interpolated between neighbouring dates (or the most common date), never a number.",
    cp.ROLE_CATEGORY: "Category: an existing category (same product first, otherwise the most common).",
    cp.ROLE_NAME: "Name: no value can be guessed, marked 'Unknown'.",
    cp.ROLE_ID: "Identifier: never invented, rows are left for review.",
    cp.ROLE_TEXT: "Text: marked 'Unknown'.",
}


class CleaningService:
    @staticmethod
    def _detect_column_domain(column_name: str, series: pd.Series) -> str:
        """Legacy coarse domain label derived from the column profiler."""
        return _LEGACY_DOMAIN.get(cp.profile_column(column_name, series).role, "text")

    @staticmethod
    def profile_dataset(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect the role of every column and how many gaps each one has."""
        wf = cp.prepare(pd.DataFrame(records))
        out = []
        for col in wf.columns:
            info = wf.profiles[col].to_dict()
            info["missing_count"] = int(wf.typed[col].isna().sum())
            info["fill_rule"] = _EXPLANATIONS.get(wf.profiles[col].role, "")
            out.append(info)
        return out

    @staticmethod
    def detect_category_inconsistencies(df: pd.DataFrame, column: str) -> CategorySuggestionsResponse:
        """
        Detect inconsistent variations of categorical strings (e.g., 'Makeup', 'make up', 'MAKEUP').
        Suggest canonical value without silently merging.
        """
        if column not in df.columns:
            return CategorySuggestionsResponse(column_name=column, suggestions=[])

        series = df[column].dropna().astype(str)
        if series.empty:
            return CategorySuggestionsResponse(column_name=column, suggestions=[])

        # Group by normalized lowercase representation with whitespace stripped
        norm_map: Dict[str, List[Tuple[str, int]]] = {}
        for val, count in series.value_counts().items():
            key = re.sub(r"[\s_-]+", "", val.strip().lower())
            if key not in norm_map:
                norm_map[key] = []
            norm_map[key].append((val, int(count)))

        suggestions: List[CategorySuggestion] = []
        for key, variants in norm_map.items():
            if len(variants) > 1:
                # The variant with the highest occurrence frequency becomes default suggested canonical
                variants.sort(key=lambda x: x[1], reverse=True)
                canonical = variants[0][0]
                variant_names = [v[0] for v in variants if v[0] != canonical]
                total_affected = sum(v[1] for v in variants)

                suggestions.append(CategorySuggestion(
                    canonical_value=canonical,
                    variants=variant_names,
                    count=total_affected
                ))

        return CategorySuggestionsResponse(column_name=column, suggestions=suggestions)

    @staticmethod
    def preview_imputation(
        df: pd.DataFrame,
        column: str,
        strategy: str,
        constant_value: Any = None
    ) -> ImputationPreviewResponse:
        """
        Role-aware preview of missing-value autofill. The column is profiled first
        (quantity / price / total / date / category / id ...) and the fill follows
        the rule for that role, whatever strategy the user picked.
        """
        if column not in df.columns:
            raise ValueError(f"Column '{column}' does not exist in dataset.")
        strategy = (strategy or "auto").lower()
        if strategy not in VALID_STRATEGIES:
            raise ValueError(f"Unknown imputation strategy: {strategy}")

        wf = cp.prepare(df)
        col = str(column)
        role = wf.profiles[col].role
        affected = int(wf.typed[col].isna().sum())
        if affected == 0:
            return ImputationPreviewResponse(
                column_name=column, strategy=strategy, affected_cells_count=0,
                sample_imputations=[], calculated_value=None, detected_role=role,
                explanation=_EXPLANATIONS.get(role),
            )

        report = cp.autofill_frame(wf, [col], {col: (strategy, constant_value)})[0]
        fills = report["fills"]
        values = [f["value"] for f in fills]
        calculated = Counter(map(str, values)).most_common(1)
        calculated_val = None
        if calculated:
            top = calculated[0][0]
            calculated_val = next(v for v in values if str(v) == top)

        samples = [
            {
                "row_index": f["row_index"],
                "original_value": None,
                "proposed_value": f["value"],
                "method": f["method"],
            }
            for f in fills[:5]
        ]
        return ImputationPreviewResponse(
            column_name=column,
            strategy=strategy,
            affected_cells_count=affected,
            sample_imputations=samples,
            calculated_value=calculated_val,
            detected_role=role,
            explanation=_EXPLANATIONS.get(role),
            fills=fills,
        )

    @staticmethod
    def _drop_duplicates(df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
        if df.empty:
            return df, 0
        key = df.apply(cp.normalize_missing).astype(str)
        mask = key.duplicated()
        removed = int(mask.sum())
        return df[~mask].reset_index(drop=True), removed

    @staticmethod
    def _write_back(df: pd.DataFrame, wf: "cp.WorkingFrame", columns: List[str]) -> pd.DataFrame:
        df = df.copy()
        for col in columns:
            df[col] = pd.Series(cp.finalize_column(wf, col), index=df.index, dtype=object)
        return df

    @staticmethod
    def clean_dataset(request: CleanDatasetRequest) -> CleanDatasetResponse:
        """
        Apply confirmed transformations. With auto_clean the engine profiles every
        column first, then normalizes categories, removes duplicates and fills gaps.
        """
        df = pd.DataFrame(request.records)
        initial_rows = len(df)
        cells_modified = 0
        duplicates_removed = 0
        columns_removed = 0
        category_cells = 0
        column_reports: List[Dict[str, Any]] = []

        # 1. Deduplication
        if request.remove_duplicates:
            df, dup_count = CleaningService._drop_duplicates(df)
            duplicates_removed += dup_count

        # 2. Row deletions
        if request.delete_row_indices:
            valid_indices = [idx for idx in request.delete_row_indices if idx in df.index]
            df = df.drop(index=valid_indices).reset_index(drop=True)

        # 3. Column deletions
        if request.delete_columns:
            valid_cols = [col for col in request.delete_columns if col in df.columns]
            df = df.drop(columns=valid_cols)
            columns_removed = len(valid_cols)

        # 4. Column renaming
        if request.rename_columns:
            valid_renames = {k: v for k, v in request.rename_columns.items() if k in df.columns}
            df = df.rename(columns=valid_renames)

        # 5. Cell edits
        if request.cell_edits:
            for edit in request.cell_edits:
                if edit.column_name in df.columns and edit.row_index < len(df):
                    df.at[edit.row_index, edit.column_name] = edit.new_value
                    cells_modified += 1

        # 6. Explicit category rules chosen by the user
        if request.category_rules:
            for rule in request.category_rules:
                col = rule.column_name
                if col in df.columns:
                    mask = df[col].astype(str).str.strip().str.lower().isin(
                        [v.strip().lower() for v in rule.source_variants]
                    )
                    affected = int(mask.sum())
                    if affected > 0:
                        df.loc[mask, col] = rule.target_value
                        cells_modified += affected

        # 7. Automatic pipeline: profile -> normalize categories -> dedupe
        if request.auto_clean and len(df) > 0:
            wf = cp.prepare(df)
            reports = cp.normalize_categories(wf)
            category_cells = sum(r["cells_changed"] for r in reports)
            cells_modified += category_cells
            cat_cols = [r["column"] for r in reports]
            if cat_cols:
                df = CleaningService._write_back(df, wf, cat_cols)
            df, dup_count = CleaningService._drop_duplicates(df)
            duplicates_removed += dup_count

        # 8. Autofill gaps, role-aware
        fill_targets: Dict[str, Tuple[str, Any]] = {}
        if request.auto_clean:
            fill_targets = {str(c): ("auto", None) for c in df.columns}
        for rule in (request.imputation_rules or []):
            if rule.column_name in df.columns:
                strategy = (rule.strategy or "auto").lower()
                if strategy not in VALID_STRATEGIES:
                    raise ValueError(f"Unknown imputation strategy: {rule.strategy}")
                fill_targets[rule.column_name] = (strategy, rule.constant_value)

        if fill_targets and len(df) > 0:
            wf = cp.prepare(df)
            cols = [c for c in wf.columns if c in fill_targets]
            reports = cp.autofill_frame(wf, cols, fill_targets)
            for r in reports:
                cells_modified += r["filled"]
                r["fills"] = []  # keep the response light; records carry the result
            column_reports = reports
            df = CleaningService._write_back(df, wf, cols)

        # Replace NaN with None for clean JSON serialization
        df = df.astype(object).where(df.notna(), None)
        cleaned_records = df.to_dict(orient="records")

        return CleanDatasetResponse(
            status="success",
            total_rows=len(df),
            total_columns=len(df.columns),
            cleaned_records=cleaned_records,
            rows_removed_count=initial_rows - len(df),
            duplicates_removed_count=duplicates_removed,
            cells_modified_count=cells_modified,
            columns_removed_count=columns_removed,
            category_cells_normalized=category_cells,
            column_reports=column_reports,
        )
