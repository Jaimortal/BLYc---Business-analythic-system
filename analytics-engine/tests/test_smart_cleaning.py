import pandas as pd
from app.cleaning import column_profiler as cp
from app.cleaning.cleaner import CleaningService
from app.schemas.cleaning import CleanDatasetRequest


def roles(df):
    return {c: p.role for c, p in cp.prepare(df).profiles.items()}


def test_roles_by_title_and_values():
    df = pd.DataFrame({
        "Order ID": ["A1", "A2", "A3"],
        "Order Date": ["2026-02-01", "2026-02-03", "2026-02-05"],
        "Product": ["Desk Mat", "Mouse", "Keyboard"],
        "Category": ["Accessories", "Electronics", "Electronics"],
        "Qty": [2, 5, 1],
        "Unit Price": [19.99, 49.99, 89.99],
        "Total Price": [39.98, 249.95, 89.99],
        "Total Sold": [10, 12, 3],
    })
    r = roles(df)
    assert r["Order ID"] == "id"
    assert r["Order Date"] == "date"
    assert r["Product"] == "name"
    assert r["Category"] == "category"
    assert r["Qty"] == "quantity"
    assert r["Unit Price"] == "unit_price"
    assert r["Total Price"] == "total_amount"
    assert r["Total Sold"] == "quantity"


def test_quantity_never_fractional_even_with_half_mean():
    df = pd.DataFrame({"Product": list("abcd"), "Qty": [1, 2, None, None]})
    out = CleaningService.preview_imputation(df, "Qty", "mean")
    assert out.calculated_value == 2 and isinstance(out.calculated_value, int)  # 1.5 -> whole
    auto = CleaningService.preview_imputation(df, "Qty", "auto")
    assert all(isinstance(f["value"], int) for f in auto.fills)


def test_date_gap_is_filled_with_a_date_not_a_number():
    df = pd.DataFrame({"Order Date": ["2026-02-01", None, "2026-02-05", "2026-02-09"]})
    out = CleaningService.preview_imputation(df, "Order Date", "auto")
    assert out.fills[0]["value"] == "2026-02-03"
    out = CleaningService.preview_imputation(df, "Order Date", "mean")
    assert str(out.fills[0]["value"]).startswith("2026-")


def test_total_derived_from_qty_times_price():
    df = pd.DataFrame({"Qty": [2, 3, 4], "Unit Price": [10.0, 5.0, 2.5], "Total": [20.0, None, 10.0]})
    res = CleaningService.clean_dataset(CleanDatasetRequest(records=df.to_dict("records"), auto_clean=True))
    assert res.cleaned_records[1]["Total"] == 15.0


def test_auto_clean_full_pipeline():
    records = [
        {"Order ID": "O1", "Product": "Desk Mat", "Category": "Accessories", "Qty": 1, "Price": 19.99, "Date": "2026-02-01"},
        {"Order ID": "O2", "Product": "Desk Mat", "Category": "accessories", "Qty": None, "Price": None, "Date": None},
        {"Order ID": "O3", "Product": "Mouse", "Category": "Electronics", "Qty": 1, "Price": 49.99, "Date": "2026-02-05"},
        {"Order ID": "O3", "Product": "Mouse", "Category": "electronics", "Qty": 1, "Price": 49.99, "Date": "2026-02-05"},
        {"Order ID": None, "Product": None, "Category": None, "Qty": 2, "Price": 30.0, "Date": "2026-02-09"},
    ]
    res = CleaningService.clean_dataset(CleanDatasetRequest(records=records, auto_clean=True))
    rows = res.cleaned_records
    assert res.duplicates_removed_count == 1
    assert rows[1]["Category"] == "Accessories"
    assert rows[1]["Qty"] == 1 and isinstance(rows[1]["Qty"], int)
    assert rows[1]["Price"] == 19.99            # same product
    assert rows[1]["Date"] == "2026-02-03"
    assert rows[3]["Order ID"] is None           # ids are never invented
    assert rows[3]["Product"] == "Unknown"
