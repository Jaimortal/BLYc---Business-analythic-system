import pytest
import pandas as pd
from app.cleaning.cleaner import CleaningService
from app.schemas.cleaning import (
    CleanDatasetRequest,
    CellEditAction,
    MissingValueStrategyRequest,
    CategoryNormalizationRule
)

def test_category_inconsistency_detection():
    data = [
        {"Category": "Makeup", "Revenue": 100},
        {"Category": "make up", "Revenue": 150},
        {"Category": "MAKEUP", "Revenue": 200},
        {"Category": "Electronics", "Revenue": 500},
        {"Category": "electronics", "Revenue": 300}
    ]
    df = pd.DataFrame(data)
    suggestions = CleaningService.detect_category_inconsistencies(df, "Category")

    assert suggestions.column_name == "Category"
    assert len(suggestions.suggestions) == 2  # Makeup group and Electronics group

    # Check Makeup group
    makeup_group = next(s for s in suggestions.suggestions if "makeup" in s.canonical_value.lower())
    assert makeup_group.canonical_value in ["Makeup", "make up", "MAKEUP"]
    assert len(makeup_group.variants) == 2
    assert makeup_group.count == 3

def test_imputation_preview():
    data = [
        {"Product": "A", "Qty": 10},
        {"Product": "B", "Qty": 20},
        {"Product": "C", "Qty": None},
        {"Product": "D", "Qty": None}
    ]
    df = pd.DataFrame(data)

    # Mean strategy (mean of 10 and 20 is 15.0)
    preview = CleaningService.preview_imputation(df, "Qty", "mean")
    assert preview.affected_cells_count == 2
    assert preview.calculated_value == 15.0
    assert len(preview.sample_imputations) == 2
    assert preview.sample_imputations[0]["proposed_value"] == 15.0

def test_clean_dataset_pipeline():
    records = [
        {"Item": "Keyboard", "Price": 50.0, "Qty": 2},
        {"Item": "Mouse", "Price": 25.0, "Qty": None},
        {"Item": "Keyboard", "Price": 50.0, "Qty": 2},  # Duplicate
        {"Item": "MousePad", "Price": 10.0, "Qty": 5}
    ]

    request = CleanDatasetRequest(
        records=records,
        remove_duplicates=True,
        cell_edits=[
            CellEditAction(row_index=0, column_name="Price", new_value=55.0)
        ],
        imputation_rules=[
            MissingValueStrategyRequest(column_name="Qty", strategy="constant", constant_value=1)
        ],
        rename_columns={"Item": "Product_Name"}
    )

    result = CleaningService.clean_dataset(request)
    assert result.status == "success"
    assert result.duplicates_removed_count == 1
    assert result.total_rows == 3  # 4 minus 1 duplicate
    assert "Product_Name" in result.cleaned_records[0]
    assert result.cleaned_records[0]["Price"] == 55.0
    # Imputed value
    assert result.cleaned_records[1]["Qty"] == 1

def test_domain_aware_quantity_and_category_imputation():
    # User scenario: Desk mat Qty missing in [2, 5, 2, 8] -> raw mean is 4.25
    data = [
        {"Product": "Mechanical Keyboard", "Category": "Electronics", "Price": 89.99, "Qty": 2},
        {"Product": "Gaming Mouse", "Category": "electronics", "Price": 49.99, "Qty": 5},
        {"Product": "Desk Mat", "Category": "Accessories", "Price": 19.99, "Qty": None},
        {"Product": "Mechanical Keyboard", "Category": "Electronics", "Price": 89.99, "Qty": 2},
        {"Product": "Wrist Rest", "Category": None, "Price": 14.99, "Qty": 8}
    ]
    df = pd.DataFrame(data)

    # 1. Quantity must NEVER be 4.25. It must be a whole discrete integer (4)
    qty_preview = CleaningService.preview_imputation(df, "Qty", "mean")
    assert qty_preview.calculated_value == 4
    assert isinstance(qty_preview.calculated_value, int)

    # 2. Category must NEVER be filled with numbers. Mode fills with dominant category
    cat_preview = CleaningService.preview_imputation(df, "Category", "mode")
    assert cat_preview.calculated_value == "Electronics"

