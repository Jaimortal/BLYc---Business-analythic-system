import pytest
import io
import pandas as pd
from app.processors.dataset_processor import DatasetProcessor
from app.core.detector import infer_column_type, detect_semantic_role

def test_infer_column_type():
    # Numeric
    s_num = pd.Series([10, 20.5, 30, None])
    assert infer_column_type(s_num) == "numeric"

    # Numeric formatted as currency
    s_curr = pd.Series(["$12.50", "$30.00", "$4.99"])
    assert infer_column_type(s_curr) == "numeric"

    # Date
    s_date = pd.Series(["2026-01-15", "2026-02-20", "2026-03-25"])
    assert infer_column_type(s_date) == "date"

    # Boolean
    s_bool = pd.Series(["true", "false", "true", "false"])
    assert infer_column_type(s_bool) == "boolean"

    # Category
    s_cat = pd.Series(["Electronics", "Electronics", "Clothing", "Clothing", "Books"])
    assert infer_column_type(s_cat) == "category"

def test_detect_semantic_role():
    assert detect_semantic_role("product_name", pd.Series(["Widget A"]), "text") == "product"
    assert detect_semantic_role("quantity", pd.Series([5, 10]), "numeric") == "quantity"
    assert detect_semantic_role("unit_price", pd.Series([9.99, 14.50]), "numeric") == "selling_price"
    assert detect_semantic_role("cost", pd.Series([4.00, 7.50]), "numeric") == "cost"
    assert detect_semantic_role("order_date", pd.Series(["2026-01-01"]), "date") == "date"

def test_dataset_inspection_csv():
    csv_data = """Product,Category,Price,Quantity,Order_Date
Wireless Mouse,Electronics,25.99,2,2026-01-10
Keyboard,Electronics,45.50,1,2026-01-12
USB Cable,Accessories,7.99,,2026-01-15
Wireless Mouse,Electronics,25.99,2,2026-01-10
"""
    df = DatasetProcessor.read_dataset(csv_data.encode('utf-8'), "sales.csv")
    result = DatasetProcessor.inspect(df, "sales.csv")

    assert result.status == "success"
    assert result.total_rows == 4
    assert result.total_columns == 5
    assert result.duplicate_rows_count == 1  # The repeated row
    assert result.missing_values_total == 1  # Missing quantity for USB Cable
    assert result.has_date_column is True
    assert result.has_numeric_columns is True
    assert result.detected_business_type == "sales_commerce"

def test_dataset_inspection_excel():
    # Build in-memory Excel workbook
    df_excel = pd.DataFrame({
        "Item": ["Apples", "Bananas", "Oranges"],
        "Stock": [150, 200, 80],
        "Price": [1.20, 0.75, 1.50]
    })
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df_excel.to_excel(writer, index=False)
    
    excel_bytes = buffer.getvalue()
    df_read = DatasetProcessor.read_dataset(excel_bytes, "inventory.xlsx")
    result = DatasetProcessor.inspect(df_read, "inventory.xlsx")

    assert result.total_rows == 3
    assert result.total_columns == 3
    assert result.duplicate_rows_count == 0
    assert result.missing_values_total == 0
