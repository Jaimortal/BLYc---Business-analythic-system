import pytest
from app.analytics.calculator import AnalyticsCalculator

def test_descriptive_statistics_calculation():
    records = [
        {"Score": 10, "City": "Manila"},
        {"Score": 20, "City": "Cebu"},
        {"Score": 30, "City": "Manila"},
        {"Score": 40, "City": "Davao"}
    ]

    res = AnalyticsCalculator.calculate_analytics(records)
    assert res.status == "success"
    assert res.total_records == 4

    score_stat = next(s for s in res.descriptive_stats if s.column_name == "Score")
    assert score_stat.min_value == 10.0
    assert score_stat.max_value == 40.0
    assert score_stat.mean_value == 25.0
    assert score_stat.median_value == 25.0

    city_stat = next(s for s in res.descriptive_stats if s.column_name == "City")
    assert city_stat.top_frequencies["Manila"] == 2

def test_business_metrics_calculation():
    records = [
        {"Product": "Laptop", "Selling_Price": 1000.0, "Cost": 700.0, "Quantity": 2, "Order_ID": "ORD-001", "Category": "Tech"},
        {"Product": "Mouse", "Selling_Price": 50.0, "Cost": 20.0, "Quantity": 4, "Order_ID": "ORD-001", "Category": "Accessories"},
        {"Product": "Laptop", "Selling_Price": 1000.0, "Cost": 700.0, "Quantity": 1, "Order_ID": "ORD-002", "Category": "Tech"}
    ]

    res = AnalyticsCalculator.calculate_analytics(records)
    assert res.business_metrics.is_applicable is True

    # Revenue = (1000*2) + (50*4) + (1000*1) = 2000 + 200 + 1000 = 3200
    assert res.business_metrics.total_revenue == 3200.0
    # Qty = 2 + 4 + 1 = 7
    assert res.business_metrics.total_quantity_sold == 7.0
    # Total unique orders = 2 (ORD-001 and ORD-002; does not double-count repeated ORD-001)
    assert res.business_metrics.total_orders == 2
    # AOV = 3200 / 2 = 1600.0
    assert res.business_metrics.average_order_value == 1600.0

    # Cost = (700*2) + (20*4) + (700*1) = 1400 + 80 + 700 = 2180
    assert res.business_metrics.total_cost == 2180.0
    # Profit = 3200 - 2180 = 1020.0
    assert res.business_metrics.total_profit == 1020.0
    # Best product: Laptop (3000 revenue)
    assert res.business_metrics.best_performing_product["name"] == "Laptop"

def test_non_sales_dataset_guard():
    # Dataset without business concepts (e.g. Weather records)
    records = [
        {"City": "City A", "Temperature": 28.5, "Humidity": 65},
        {"City": "City B", "Temperature": 31.0, "Humidity": 70}
    ]

    res = AnalyticsCalculator.calculate_analytics(records)
    # Section 8 Rule: Never hardcode a sales dashboard for non-sales datasets
    assert res.business_metrics.is_applicable is False
    assert res.business_metrics.total_revenue is None
    assert len(res.descriptive_stats) == 3
