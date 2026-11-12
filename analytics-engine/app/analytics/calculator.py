import re
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from app.schemas.analytics import (
    AnalyticsResponse,
    ColumnDescriptiveStats,
    BusinessMetrics,
    TimeSeriesAnalysis,
    TimeSeriesPoint
)
from app.core.detector import infer_column_type, detect_semantic_role

class AnalyticsCalculator:
    @staticmethod
    def calculate_analytics(
        records: List[Dict[str, Any]], 
        user_mappings: Optional[Dict[str, str]] = None
    ) -> AnalyticsResponse:
        """
        Authoritative analytics computation.
        Section 8 Rules:
        - Never hardcode a sales dashboard for non-sales datasets.
        - Revenue = Selling Price × Quantity (or direct verified Revenue).
        - Profit = (Selling Price - Unit Cost) × Quantity.
        - Do not calculate profit if cost information is unavailable.
        - Do not double-count repeated order IDs.
        """
        df = pd.DataFrame(records)
        total_records = len(df)
        valid_records = len(df.dropna(how='all'))

        if total_records == 0:
            return AnalyticsResponse(
                status="empty",
                total_records=0,
                valid_records=0,
                descriptive_stats=[],
                business_metrics=BusinessMetrics(is_applicable=False),
                time_series=TimeSeriesAnalysis(is_applicable=False),
                semantic_mappings_applied={}
            )

        # 1. Descriptive Statistics
        descriptive_stats: List[ColumnDescriptiveStats] = []
        inferred_types: Dict[str, str] = {}
        detected_mappings: Dict[str, str] = {}

        for col in df.columns:
            series = df[col]
            c_type = infer_column_type(series)
            inferred_types[col] = c_type

            # Check semantic mapping (user mapping overrides auto detection)
            role = (user_mappings or {}).get(col) or detect_semantic_role(col, series, c_type)
            if role:
                detected_mappings[col] = role

            count = int(series.count())
            missing_count = int(series.isna().sum())
            unique_count = int(series.nunique(dropna=True))

            min_val = None
            max_val = None
            mean_val = None
            median_val = None
            std_dev = None
            top_freq = None

            if c_type == "numeric":
                num_series = pd.to_numeric(series.dropna(), errors='coerce').dropna()
                if not num_series.empty:
                    min_val = round(float(num_series.min()), 4)
                    max_val = round(float(num_series.max()), 4)
                    mean_val = round(float(num_series.mean()), 4)
                    median_val = round(float(num_series.median()), 4)
                    std_dev = round(float(num_series.std()), 4) if len(num_series) > 1 else 0.0
            else:
                # Frequencies for category/text
                val_counts = series.dropna().astype(str).value_counts().head(5).to_dict()
                top_freq = {k: int(v) for k, v in val_counts.items()}

            descriptive_stats.append(ColumnDescriptiveStats(
                column_name=col,
                data_type=c_type,
                count=count,
                missing_count=missing_count,
                unique_count=unique_count,
                min_value=min_val,
                max_value=max_val,
                mean_value=mean_val,
                median_value=median_val,
                std_dev=std_dev,
                top_frequencies=top_freq
            ))

        # 2. Business Metrics
        # Invert mappings to easily find columns by role
        role_to_col = {v: k for k, v in detected_mappings.items()}

        prod_col = role_to_col.get("product")
        qty_col = role_to_col.get("quantity")
        price_col = role_to_col.get("selling_price")
        cost_col = role_to_col.get("cost")
        rev_col = role_to_col.get("revenue")
        date_col = role_to_col.get("date")
        cat_col = role_to_col.get("category")
        order_col = role_to_col.get("order_id")

        is_business_applicable = bool(prod_col or cat_col or rev_col or (price_col and qty_col))
        business_metrics = BusinessMetrics(is_applicable=is_business_applicable)

        if is_business_applicable:
            # Calculate item-level revenue
            if rev_col and rev_col in df.columns:
                df['_calc_revenue'] = pd.to_numeric(df[rev_col], errors='coerce').fillna(0)
            elif price_col and qty_col and price_col in df.columns and qty_col in df.columns:
                prices = pd.to_numeric(df[price_col], errors='coerce').fillna(0)
                qtys = pd.to_numeric(df[qty_col], errors='coerce').fillna(0)
                df['_calc_revenue'] = prices * qtys
            elif price_col and price_col in df.columns:
                df['_calc_revenue'] = pd.to_numeric(df[price_col], errors='coerce').fillna(0)
            else:
                df['_calc_revenue'] = 0.0

            total_revenue = round(float(df['_calc_revenue'].sum()), 2)
            business_metrics.total_revenue = total_revenue

            # Quantity Sold
            if qty_col and qty_col in df.columns:
                total_qty = round(float(pd.to_numeric(df[qty_col], errors='coerce').fillna(0).sum()), 2)
                business_metrics.total_quantity_sold = total_qty
            else:
                total_qty = None

            # Orders count (prevent double counting duplicate order IDs)
            if order_col and order_col in df.columns:
                orders_count = int(df[order_col].dropna().nunique())
            else:
                orders_count = total_records

            business_metrics.total_orders = orders_count

            # Average Order Value (AOV = Revenue / Orders)
            if orders_count > 0:
                business_metrics.average_order_value = round(total_revenue / orders_count, 2)

            # Average Selling Price
            if price_col and price_col in df.columns:
                prices = pd.to_numeric(df[price_col], errors='coerce').dropna()
                if not prices.empty:
                    business_metrics.average_selling_price = round(float(prices.mean()), 2)

            # Profit & Cost (strictly calculate only if cost info is available)
            if cost_col and cost_col in df.columns:
                costs = pd.to_numeric(df[cost_col], errors='coerce').fillna(0)
                if qty_col and qty_col in df.columns:
                    qtys = pd.to_numeric(df[qty_col], errors='coerce').fillna(0)
                    df['_calc_cost'] = costs * qtys
                else:
                    df['_calc_cost'] = costs

                total_cost = round(float(df['_calc_cost'].sum()), 2)
                total_profit = round(total_revenue - total_cost, 2)
                profit_margin = round((total_profit / total_revenue * 100), 2) if total_revenue > 0 else 0.0

                business_metrics.total_cost = total_cost
                business_metrics.total_profit = total_profit
                business_metrics.profit_margin_pct = profit_margin

            # Product Performance (use product column, or category as fallback)
            effective_prod_col = prod_col if (prod_col and prod_col in df.columns) else (cat_col if (cat_col and cat_col in df.columns) else None)
            if effective_prod_col and effective_prod_col in df.columns:
                prod_group = df.groupby(effective_prod_col)['_calc_revenue'].sum().sort_values(ascending=False)
                if not prod_group.empty:
                    business_metrics.best_performing_product = {
                        "name": str(prod_group.index[0]),
                        "revenue": round(float(prod_group.iloc[0]), 2)
                    }
                    business_metrics.lowest_performing_product = {
                        "name": str(prod_group.index[-1]),
                        "revenue": round(float(prod_group.iloc[-1]), 2)
                    }

            # Category Distribution
            if cat_col and cat_col in df.columns:
                cat_rev = df.groupby(cat_col)['_calc_revenue'].sum().sort_values(ascending=False)
                business_metrics.revenue_by_category = [
                    {"category": str(k), "revenue": round(float(v), 2)}
                    for k, v in cat_rev.items()
                ]

                if qty_col and qty_col in df.columns:
                    cat_qty = df.groupby(cat_col)[qty_col].sum().sort_values(ascending=False)
                    business_metrics.quantity_by_category = [
                        {"category": str(k), "quantity": round(float(v), 2)}
                        for k, v in cat_qty.items()
                    ]

            # 2.1 Regional, Customer & Operational Dimensional Aggregations (for non-temporal analysis)
            region_col = next((c for c in df.columns if re.search(r"^(region|territory|zone|area|location)", c, re.I)), None)
            cust_type_col = next((c for c in df.columns if re.search(r"^(customer[\s_]?type|cust[\s_]?type|client[\s_]?type|segment)", c, re.I)), None)
            pay_col = next((c for c in df.columns if re.search(r"^(payment|pay[\s_]?method)", c, re.I)), None)
            rating_col = next((c for c in df.columns if re.search(r"^(customer[\s_]?rating|rating|score|stars)", c, re.I)), None)
            delivery_col = next((c for c in df.columns if re.search(r"^(delivery[\s_]?days|delivery|shipping[\s_]?days|transit[\s_]?days)", c, re.I)), None)
            discount_col = next((c for c in df.columns if re.search(r"^(discount[\s_]?percent|discount[\s_]?pct|discount)", c, re.I)), None)
            explicit_profit_col = next((c for c in df.columns if re.search(r"^(profit|net[\s_]?profit|gross[\s_]?profit)", c, re.I)), None)

            # If dataset has an explicit Profit column and total_profit was not set, populate it
            if explicit_profit_col and (business_metrics.total_profit is None or business_metrics.total_profit == 0):
                prof_series = pd.to_numeric(df[explicit_profit_col], errors='coerce').fillna(0)
                business_metrics.total_profit = round(float(prof_series.sum()), 2)
                if total_revenue > 0:
                    business_metrics.profit_margin_pct = round((business_metrics.total_profit / total_revenue * 100), 2)

            # Regional Distribution
            if region_col and region_col in df.columns:
                has_prof = bool(explicit_profit_col and explicit_profit_col in df.columns)
                agg_dict = {'_calc_revenue': 'sum'}
                if has_prof:
                    df['_reg_prof_temp'] = pd.to_numeric(df[explicit_profit_col], errors='coerce').fillna(0)
                    agg_dict['_reg_prof_temp'] = 'sum'
                if qty_col and qty_col in df.columns:
                    agg_dict[qty_col] = 'sum'

                reg_group = df.groupby(region_col).agg(agg_dict).reset_index()
                reg_perf = []
                for _, r in reg_group.iterrows():
                    reg_perf.append({
                        "region": str(r[region_col]),
                        "sales": round(float(r['_calc_revenue']), 2),
                        "profit": round(float(r['_reg_prof_temp']), 2) if has_prof else 0.0,
                        "quantity": round(float(r[qty_col]), 2) if (qty_col and qty_col in df.columns) else 0.0
                    })
                reg_perf.sort(key=lambda x: x["sales"], reverse=True)
                business_metrics.regional_performance = reg_perf

            # Customer Type Distribution
            if cust_type_col and cust_type_col in df.columns:
                cust_group = df.groupby(cust_type_col).agg({
                    '_calc_revenue': 'sum',
                    cust_type_col: 'count'
                }).rename(columns={cust_type_col: '_count'}).reset_index()
                cust_dist = []
                for _, r in cust_group.iterrows():
                    cust_dist.append({
                        "type": str(r[cust_type_col]),
                        "count": int(r['_count']),
                        "sales": round(float(r['_calc_revenue']), 2)
                    })
                cust_dist.sort(key=lambda x: x["sales"], reverse=True)
                business_metrics.customer_type_distribution = cust_dist

            # Payment Methods
            if pay_col and pay_col in df.columns:
                pay_counts = df[pay_col].value_counts()
                business_metrics.payment_method_distribution = [
                    {"method": str(k), "count": int(v)}
                    for k, v in pay_counts.items()
                ]

            # Operational Quality Indicators
            if rating_col and rating_col in df.columns:
                ratings = pd.to_numeric(df[rating_col], errors='coerce').dropna()
                if not ratings.empty:
                    business_metrics.avg_customer_rating = round(float(ratings.mean()), 2)

            if delivery_col and delivery_col in df.columns:
                delivs = pd.to_numeric(df[delivery_col], errors='coerce').dropna()
                if not delivs.empty:
                    business_metrics.avg_delivery_days = round(float(delivs.mean()), 1)

            if discount_col and discount_col in df.columns:
                discs = pd.to_numeric(df[discount_col], errors='coerce').dropna()
                if not discs.empty:
                    business_metrics.avg_discount_pct = round(float(discs.mean()), 1)

        # 3. Time-Series Analysis
        time_series = TimeSeriesAnalysis(is_applicable=False)
        if date_col and date_col in df.columns and '_calc_revenue' in df.columns:
            try:
                df['_parsed_date'] = pd.to_datetime(df[date_col], errors='coerce')
                valid_date_df = df.dropna(subset=['_parsed_date']).sort_values('_parsed_date')

                if not valid_date_df.empty:
                    # Daily grouping
                    daily = valid_date_df.groupby(valid_date_df['_parsed_date'].dt.strftime('%Y-%m-%d')).agg({
                        '_calc_revenue': 'sum',
                        qty_col: 'sum' if qty_col and qty_col in df.columns else 'count'
                    }).reset_index()

                    points: List[TimeSeriesPoint] = []
                    for _, row in daily.iterrows():
                        period_str = str(row['_parsed_date'])
                        rev = round(float(row['_calc_revenue']), 2)
                        qty = round(float(row[qty_col]), 2) if qty_col and qty_col in df.columns else 0.0
                        points.append(TimeSeriesPoint(
                            period=period_str,
                            revenue=rev,
                            orders_count=1,
                            quantity=qty
                        ))

                    time_series = TimeSeriesAnalysis(
                        is_applicable=True,
                        date_column=date_col,
                        granularity="daily",
                        points=points
                    )
            except Exception:
                pass

        return AnalyticsResponse(
            status="success",
            total_records=total_records,
            valid_records=valid_records,
            descriptive_stats=descriptive_stats,
            business_metrics=business_metrics,
            time_series=time_series,
            semantic_mappings_applied=detected_mappings
        )
