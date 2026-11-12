import pytest
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app
from app.calculations.formula_parser import SafeFormulaParser, FormulaSecurityError

client = TestClient(app)

@pytest.fixture
def sample_df():
    return pd.DataFrame({
        "Unit Price": [10.0, 20.0, 30.0],
        "Order Qty": [2, 5, 1],
        "Cost": [6.0, 12.0, 18.0],
        "Zero": [0.0, 0.0, 0.0]
    })

def test_safe_formula_arithmetic(sample_df):
    parser = SafeFormulaParser(available_columns=list(sample_df.columns))
    
    # 1. Bracketed column multiplication
    updated_df, summary = parser.evaluate(sample_df, "[Unit Price] * [Order Qty]", "Revenue")
    assert "Revenue" in updated_df.columns
    assert list(updated_df["Revenue"]) == [20.0, 100.0, 30.0]
    assert summary["sum"] == 150.0

    # 2. Profit margin calculation with parentheses and constants
    updated_df, summary = parser.evaluate(
        sample_df,
        "([Unit Price] - [Cost]) * [Order Qty]",
        "Gross Profit"
    )
    # Row 0: (10 - 6) * 2 = 8
    # Row 1: (20 - 12) * 5 = 40
    # Row 2: (30 - 18) * 1 = 12
    assert list(updated_df["Gross Profit"]) == [8.0, 40.0, 12.0]
    assert summary["sum"] == 60.0

def test_safe_division_by_zero(sample_df):
    parser = SafeFormulaParser(available_columns=list(sample_df.columns))
    
    # Division by literal 0 and column with 0
    updated_df, summary = parser.evaluate(sample_df, "[Unit Price] / 0", "ZeroDiv1")
    assert list(updated_df["ZeroDiv1"]) == [0.0, 0.0, 0.0]

    updated_df, summary = parser.evaluate(sample_df, "[Unit Price] / [Zero]", "ZeroDiv2")
    assert list(updated_df["ZeroDiv2"]) == [0.0, 0.0, 0.0]

def test_security_rejection_malicious_syntax(sample_df):
    parser = SafeFormulaParser(available_columns=list(sample_df.columns))

    malicious_payloads = [
        "__import__('os').system('whoami')",
        "open('secrets.txt').read()",
        "eval('2 + 2')",
        "exec('a = 5')",
        "[].__class__.__bases__[0]",
        "lambda x: x + 1",
        "print('malicious')",
        "import os",
        "Cost.__dict__",
        "getattr(Cost, 'values')",
        "1; import sys",
        "__builtins__",
    ]

    for payload in malicious_payloads:
        is_valid, _, error = parser.validate(payload)
        assert is_valid is False, f"Malicious payload should have been rejected: {payload}"
        assert error is not None

def test_unknown_column_rejection(sample_df):
    parser = SafeFormulaParser(available_columns=list(sample_df.columns))
    is_valid, _, error = parser.validate("[NonExistentColumn] * 2")
    assert is_valid is False
    assert "not found in dataset" in error

def test_api_calculations_validate():
    response = client.post("/calculations/validate", json={
        "formula": "[Price] * [Qty]",
        "columns": ["Price", "Qty", "Item"]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert "Price" in data["referenced_columns"]
    assert "Qty" in data["referenced_columns"]

def test_api_calculations_evaluate():
    rows = [
        {"Price": 50, "Qty": 2},
        {"Price": 100, "Qty": 3}
    ]
    response = client.post("/calculations/evaluate", json={
        "rows": rows,
        "columns": ["Price", "Qty"],
        "formula": "[Price] * [Qty] * 0.9",
        "target_column": "DiscountedTotal"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["target_column"] == "DiscountedTotal"
    assert data["summary"]["sum"] == (100 * 0.9) + (300 * 0.9)  # 90 + 270 = 360
    assert len(data["preview"]) == 2
    assert data["preview"][0]["DiscountedTotal"] == 90.0
