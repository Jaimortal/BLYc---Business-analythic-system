export interface DescriptiveStat {
  column_name: string;
  data_type: string;
  count: number;
  missing_count: number;
  unique_count: number;
  min_value?: number;
  max_value?: number;
  mean_value?: number;
  median_value?: number;
  std_dev?: number;
  top_frequencies?: Record<string, number>;
}

export interface BusinessMetricsData {
  is_applicable: boolean;
  total_revenue?: number;
  total_quantity_sold?: number;
  total_orders?: number;
  average_order_value?: number;
  average_selling_price?: number;
  total_cost?: number;
  total_profit?: number;
  profit_margin_pct?: number;
  best_performing_product?: { name: string; revenue: number };
  lowest_performing_product?: { name: string; revenue: number };
  revenue_by_category?: { category: string; revenue: number }[];
  quantity_by_category?: { category: string; quantity: number }[];
  regional_performance?: { region: string; sales: number; profit: number; quantity: number }[];
  customer_type_distribution?: { type: string; count: number; sales: number }[];
  payment_method_distribution?: { method: string; count: number }[];
  avg_customer_rating?: number;
  avg_delivery_days?: number;
  avg_discount_pct?: number;
}

export interface TimeSeriesPointData {
  period: string;
  revenue: number;
  orders_count: number;
  quantity: number;
}

export interface TimeSeriesData {
  is_applicable: boolean;
  date_column?: string;
  granularity?: string;
  points: TimeSeriesPointData[];
}

export interface AnalyticsData {
  status: string;
  total_records: number;
  valid_records: number;
  descriptive_stats: DescriptiveStat[];
  business_metrics: BusinessMetricsData;
  time_series: TimeSeriesData;
  semantic_mappings_applied: Record<string, string>;
}
