from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ColumnDescriptiveStats(BaseModel):
    column_name: str
    data_type: str
    count: int
    missing_count: int
    unique_count: int
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    mean_value: Optional[float] = None
    median_value: Optional[float] = None
    std_dev: Optional[float] = None
    top_frequencies: Optional[Dict[str, int]] = None

class BusinessMetrics(BaseModel):
    is_applicable: bool
    total_revenue: Optional[float] = None
    total_quantity_sold: Optional[float] = None
    total_orders: Optional[int] = None
    average_order_value: Optional[float] = None
    average_selling_price: Optional[float] = None
    total_cost: Optional[float] = None
    total_profit: Optional[float] = None
    profit_margin_pct: Optional[float] = None
    best_performing_product: Optional[Dict[str, Any]] = None
    lowest_performing_product: Optional[Dict[str, Any]] = None
    revenue_by_category: Optional[List[Dict[str, Any]]] = None
    quantity_by_category: Optional[List[Dict[str, Any]]] = None
    regional_performance: Optional[List[Dict[str, Any]]] = None
    customer_type_distribution: Optional[List[Dict[str, Any]]] = None
    payment_method_distribution: Optional[List[Dict[str, Any]]] = None
    avg_customer_rating: Optional[float] = None
    avg_delivery_days: Optional[float] = None
    avg_discount_pct: Optional[float] = None

class TimeSeriesPoint(BaseModel):
    period: str
    revenue: float
    orders_count: int
    quantity: float

class TimeSeriesAnalysis(BaseModel):
    is_applicable: bool
    date_column: Optional[str] = None
    granularity: Optional[str] = None  # daily, weekly, monthly, yearly
    points: List[TimeSeriesPoint] = []

class AnalyticsResponse(BaseModel):
    status: str
    total_records: int
    valid_records: int
    descriptive_stats: List[ColumnDescriptiveStats]
    business_metrics: BusinessMetrics
    time_series: TimeSeriesAnalysis
    semantic_mappings_applied: Dict[str, str]
