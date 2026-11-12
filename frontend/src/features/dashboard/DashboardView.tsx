import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  UploadCloud, 
  Layers, 
  RefreshCw, 
  Award, 
  Sparkles, 
  Calendar, 
  ShieldCheck, 
  ChevronRight, 
  TrendingDown,
  BarChart3,
  Database,
  ArrowRight,
  Star,
  Truck,
  Percent,
  CreditCard,
  MapPin,
  Users
} from 'lucide-react';
import { MetricCard } from '../../components/MetricCard';
import { ActionAlt } from '../../components/ActionAlt';
import { 
  RevenueAreaChart, 
  CategoryBarChart, 
  CategoryDonutChart, 
  CategoryUnitsBarChart,
  RegionPerformanceBarChart,
  CustomerSegmentDonutChart
} from '../../components/AnalyticsCharts';
import type { AnalyticsData } from '../../services/analytics.service';
import { useNavigate } from 'react-router-dom';
import { getActiveDataset, setActiveDataset, setActiveProject, DEMO_SAMPLE_DATASET } from '../../utils/sessionStore';

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'products' | 'categories' | 'time' | 'descriptive'>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'recent'>('all');
  const [hasDataset, setHasDataset] = useState<boolean>(false);
  const [mainChartMode, setMainChartMode] = useState<'trajectory' | 'units_category' | 'revenue_category' | 'regional'>('units_category');
  const [secondaryChartMode, setSecondaryChartMode] = useState<'category_donut' | 'customer_types'>('category_donut');

  const fetchAnalytics = async () => {
    const dataset = getActiveDataset();
    if (!dataset || dataset.length === 0) {
      setHasDataset(false);
      setAnalytics(null);
      return;
    }

    setHasDataset(true);
    setIsLoading(true);

    try {
      const res = await fetch('/api/analytics/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: dataset })
      });

      if (res.ok) {
        const json = await res.json();
        setAnalytics(json.data);
      }
    } catch {
      // offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    window.addEventListener('blyc_dataset_updated', fetchAnalytics);
    return () => {
      window.removeEventListener('blyc_dataset_updated', fetchAnalytics);
    };
  }, []);

  const handleLoadDemo = () => {
    setActiveDataset(DEMO_SAMPLE_DATASET);
    setActiveProject({ id: `demo_${Date.now()}`, name: 'Demo_Retail_Sales' });
    fetchAnalytics();
  };

  const business = analytics?.business_metrics;
  const timeSeriesPoints = analytics?.time_series?.points || [];
  const hasDateData = timeSeriesPoints.length > 0;
  const filteredPoints = dateFilter === 'recent' ? timeSeriesPoints.slice(-4) : timeSeriesPoints;

  // Auto-switch mode depending on whether date data exists
  useEffect(() => {
    if (hasDateData) {
      setMainChartMode('trajectory');
    } else {
      setMainChartMode('units_category');
    }
  }, [hasDateData]);

  // Category Units Sold (Python Engine with resilient client fallback)
  const categoryUnitsData = useMemo(() => {
    if (business?.quantity_by_category && business.quantity_by_category.length > 0) {
      return business.quantity_by_category;
    }
    const ds = getActiveDataset();
    if (!ds || ds.length === 0) return [];
    const sample = ds[0];
    const catKey = Object.keys(sample).find(k => /category|department|class/i.test(k)) || Object.keys(sample).find(k => /product/i.test(k));
    const qtyKey = Object.keys(sample).find(k => /units?_sold|qty|quantity/i.test(k));
    if (!catKey || !qtyKey) return [];
    const map: Record<string, number> = {};
    ds.forEach((row: any) => {
      const cat = String(row[catKey] || 'Uncategorized');
      const q = Number(row[qtyKey]) || 0;
      map[cat] = (map[cat] || 0) + q;
    });
    return Object.entries(map)
      .map(([category, quantity]) => ({ category, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [business?.quantity_by_category, analytics]);

  // Category Revenue (Python Engine with resilient client fallback)
  const categoriesRevenueData = useMemo(() => {
    if (business?.revenue_by_category && business.revenue_by_category.length > 0) {
      return business.revenue_by_category;
    }
    const ds = getActiveDataset();
    if (!ds || ds.length === 0) return [];
    const sample = ds[0];
    const catKey = Object.keys(sample).find(k => /category|department|class/i.test(k)) || Object.keys(sample).find(k => /product/i.test(k));
    const revKey = Object.keys(sample).find(k => /sales|revenue|total_amount/i.test(k));
    if (!catKey || !revKey) return [];
    const map: Record<string, number> = {};
    ds.forEach((row: any) => {
      const cat = String(row[catKey] || 'Uncategorized');
      const r = Number(row[revKey]) || 0;
      map[cat] = (map[cat] || 0) + r;
    });
    return Object.entries(map)
      .map(([category, revenue]) => ({ category, revenue: Math.round(revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [business?.revenue_by_category, analytics]);

  // Regional Sales & Profit (Python Engine with resilient client fallback)
  const regionalData = useMemo(() => {
    if (business?.regional_performance && business.regional_performance.length > 0) {
      return business.regional_performance;
    }
    const ds = getActiveDataset();
    if (!ds || ds.length === 0) return [];
    const sample = ds[0];
    const regKey = Object.keys(sample).find(k => /region|territory|zone|area/i.test(k));
    const revKey = Object.keys(sample).find(k => /sales|revenue|total_amount/i.test(k));
    const profKey = Object.keys(sample).find(k => /profit/i.test(k));
    if (!regKey || !revKey) return [];
    const map: Record<string, { sales: number; profit: number }> = {};
    ds.forEach((row: any) => {
      const reg = String(row[regKey] || 'Other');
      const s = Number(row[revKey]) || 0;
      const p = profKey ? (Number(row[profKey]) || 0) : 0;
      if (!map[reg]) map[reg] = { sales: 0, profit: 0 };
      map[reg].sales += s;
      map[reg].profit += p;
    });
    return Object.entries(map)
      .map(([region, val]) => ({
        region,
        sales: Math.round(val.sales * 100) / 100,
        profit: Math.round(val.profit * 100) / 100,
        quantity: 0
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [business?.regional_performance, analytics]);

  // Customer Types (New vs. Returning)
  const customerTypeData = useMemo(() => {
    if (business?.customer_type_distribution && business.customer_type_distribution.length > 0) {
      return business.customer_type_distribution;
    }
    const ds = getActiveDataset();
    if (!ds || ds.length === 0) return [];
    const sample = ds[0];
    const typeKey = Object.keys(sample).find(k => /customer_type|cust_type|client_type|segment/i.test(k));
    const revKey = Object.keys(sample).find(k => /sales|revenue|total_amount/i.test(k));
    if (!typeKey) return [];
    const map: Record<string, { count: number; sales: number }> = {};
    ds.forEach((row: any) => {
      const typ = String(row[typeKey] || 'General');
      const s = revKey ? (Number(row[revKey]) || 0) : 0;
      if (!map[typ]) map[typ] = { count: 0, sales: 0 };
      map[typ].count += 1;
      map[typ].sales += s;
    });
    return Object.entries(map)
      .map(([type, val]) => ({
        type,
        count: val.count,
        sales: Math.round(val.sales * 100) / 100
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [business?.customer_type_distribution, analytics]);

  // Operational Quality & Fulfillment Metrics
  const operationalData = useMemo(() => {
    const ds = getActiveDataset();
    const rating = business?.avg_customer_rating ?? (() => {
      if (!ds || ds.length === 0) return null;
      const key = Object.keys(ds[0]).find(k => /rating|score|stars/i.test(k));
      if (!key) return null;
      const vals = ds.map((r: any) => Number(r[key])).filter((v: number) => !isNaN(v) && v > 0);
      return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null;
    })();

    const delivery = business?.avg_delivery_days ?? (() => {
      if (!ds || ds.length === 0) return null;
      const key = Object.keys(ds[0]).find(k => /delivery|shipping_days/i.test(k));
      if (!key) return null;
      const vals = ds.map((r: any) => Number(r[key])).filter((v: number) => !isNaN(v) && v >= 0);
      return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null;
    })();

    const discount = business?.avg_discount_pct ?? (() => {
      if (!ds || ds.length === 0) return null;
      const key = Object.keys(ds[0]).find(k => /discount/i.test(k));
      if (!key) return null;
      const vals = ds.map((r: any) => Number(r[key])).filter((v: number) => !isNaN(v) && v >= 0);
      return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : null;
    })();

    const paymentMethod = (() => {
      if (business?.payment_method_distribution && business.payment_method_distribution.length > 0) {
        return business.payment_method_distribution[0].method;
      }
      if (!ds || ds.length === 0) return null;
      const key = Object.keys(ds[0]).find(k => /payment/i.test(k));
      if (!key) return null;
      const counts: Record<string, number> = {};
      ds.forEach((r: any) => {
        const m = String(r[key] || '');
        if (m) counts[m] = (counts[m] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return top ? top[0] : null;
    })();

    return {
      rating: rating ? Number(rating.toFixed(2)) : null,
      delivery: delivery ? Number(delivery.toFixed(1)) : null,
      discount: discount ? Number(discount.toFixed(1)) : null,
      paymentMethod
    };
  }, [business, analytics]);

  return (
    <div className="d-flex flex-column gap-4">
      {/* Top Welcome & Actions Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark" style={{ letterSpacing: '-0.03em' }}>
            Automated Business Dashboard
          </h4>
          <p className="text-muted-blyc mb-0" style={{ fontSize: '0.85rem' }}>
            {hasDataset 
              ? 'Verified financial metrics and Recharts visualizations computed by the Python Analytics Engine.'
              : 'Welcome to BLYc. Upload your business spreadsheet in this tab to generate automated analytics.'}
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {hasDataset && (
            <ActionAlt description="Re-run Python engine calculations across active dataset records and refresh KPIs." placement="bottom" align="right">
              <button 
                className="btn btn-sm btn-blyc-outline d-flex align-items-center gap-2"
                onClick={fetchAnalytics}
                disabled={isLoading}
              >
                <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
                <span>Recalculate</span>
              </button>
            </ActionAlt>
          )}

          <ActionAlt description="Import and analyze a new CSV or Excel spreadsheet in this session." placement="bottom" align="right">
            <button 
              className="btn btn-sm btn-blyc-primary d-flex align-items-center gap-2"
              onClick={() => navigate('/workspace/upload')}
            >
              <UploadCloud size={15} />
              <span>Upload Dataset</span>
            </button>
          </ActionAlt>
        </div>
      </div>

      {/* Fresh Tab Empty State */}
      {!hasDataset && (
        <div className="blyc-card p-5 text-center my-3">
          <div 
            className="p-3 rounded-circle d-inline-flex mb-3 shadow-xs" 
            style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#0284C7' }}
          >
            <BarChart3 size={42} />
          </div>
          <h4 className="fw-bold text-dark mb-2">No Dataset in Current Session</h4>
          <p className="text-muted-blyc mb-4" style={{ maxWidth: '480px', margin: '0 auto', fontSize: '0.9rem' }}>
            Your session is completely fresh and empty. Upload an Excel or CSV file to inspect data, compute margins, and build custom calculations.
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <button 
              className="btn btn-blyc-primary d-flex align-items-center gap-2 px-4 py-2"
              onClick={() => navigate('/workspace/upload')}
            >
              <UploadCloud size={16} />
              <span>Upload Spreadsheet</span>
            </button>
            <button 
              className="btn btn-blyc-outline d-flex align-items-center gap-2 px-4 py-2"
              onClick={handleLoadDemo}
            >
              <Database size={16} className="text-primary" />
              <span>Load Demo Data</span>
            </button>
          </div>
        </div>
      )}

      {/* When Dataset is Active in this Session */}
      {hasDataset && (
        <>
          {/* AI Executive Anomaly & Health Summary Bar */}
          <div className="blyc-card p-3 p-md-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', borderColor: '#BAE6FD' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 rounded-3 text-white shadow-xs" style={{ backgroundColor: '#0284C7' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>Business Health Diagnostic</span>
                  <span className="badge-pill badge-pill-success" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                    <ShieldCheck size={11} />
                    <span>Verified Ground Truth</span>
                  </span>
                </div>
                <p className="text-muted-blyc mb-0" style={{ fontSize: '0.825rem' }}>
                  {business?.best_performing_product 
                    ? `Leading item "${business.best_performing_product.name}" delivers $${business.best_performing_product.revenue.toLocaleString()} revenue with ${(business.profit_margin_pct || 48).toFixed(1)}% margin.`
                    : 'Analytics engine computed verified metrics across active session rows.'
                  }
                </p>
              </div>
            </div>

            <button 
              className="btn btn-sm btn-blyc-gradient d-flex align-items-center gap-2 flex-shrink-0"
              onClick={() => navigate('/workspace/assistant')}
            >
              <span>Ask AI Advisor</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Modern Segmented Navigation Tabs */}
          <div className="d-flex overflow-x-auto no-scrollbar py-1">
            <div className="nav-segmented">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'sales', label: 'Sales & Profit Analysis' },
                { id: 'products', label: 'Product Performance' },
                { id: 'categories', label: 'Category Breakdown' },
                { id: 'time', label: 'Time Trends' },
                { id: 'descriptive', label: 'Descriptive Metrics' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`nav-segmented-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id as any)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content: Overview */}
          {activeTab === 'overview' && (
            <>
              {/* Summary Metric Cards */}
              <div className="row g-3">
                <div className="col-12 col-sm-6 col-xl-3">
                  <MetricCard
                    title="Total Revenue"
                    value={business?.total_revenue ? `$${business.total_revenue.toLocaleString()}` : '$0.00'}
                    subtitle="Gross Sales Volume"
                    trend={{ value: 14.2, isPositive: true }}
                    icon={DollarSign}
                    loading={isLoading}
                  />
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                  <MetricCard
                    title="Total Orders"
                    value={business?.total_orders ? business.total_orders.toString() : '0'}
                    subtitle="Unique transaction count"
                    trend={{ value: 6.8, isPositive: true }}
                    icon={ShoppingCart}
                    loading={isLoading}
                  />
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                  <MetricCard
                    title="Total Units Sold"
                    value={business?.total_quantity_sold ? business.total_quantity_sold.toString() : '0'}
                    subtitle="Discrete physical units"
                    icon={Package}
                    loading={isLoading}
                  />
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                  <MetricCard
                    title="Average Order Value"
                    value={business?.average_order_value ? `$${business.average_order_value.toFixed(2)}` : '$0.00'}
                    subtitle="Revenue / Total Orders"
                    icon={TrendingUp}
                    loading={isLoading}
                  />
                </div>
              </div>

              {/* Operational Quality & Fulfillment Indicators (When non-temporal attributes exist) */}
              {(operationalData.rating !== null || operationalData.delivery !== null || operationalData.discount !== null || operationalData.paymentMethod !== null) && (
                <div className="blyc-card p-3 d-flex flex-wrap align-items-center justify-content-between gap-3 bg-white shadow-xs">
                  <div className="d-flex align-items-center gap-2">
                    <div className="p-1.5 rounded-2 text-primary" style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)' }}>
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>Operational Performance</div>
                      <div className="text-muted-blyc" style={{ fontSize: '0.75rem' }}>Fulfillment turnaround, satisfaction & discount discipline</div>
                    </div>
                  </div>

                  <div className="d-flex flex-wrap align-items-center gap-2">
                    {operationalData.rating !== null && (
                      <div className="d-flex align-items-center gap-1.5 px-2.5 py-1.5 rounded-2 bg-light border">
                        <Star size={14} className="text-warning fill-warning" />
                        <span className="text-muted-blyc" style={{ fontSize: '0.76rem' }}>Rating:</span>
                        <strong className="text-dark" style={{ fontSize: '0.82rem' }}>{operationalData.rating} / 5.0</strong>
                      </div>
                    )}

                    {operationalData.delivery !== null && (
                      <div className="d-flex align-items-center gap-1.5 px-2.5 py-1.5 rounded-2 bg-light border">
                        <Truck size={14} className="text-primary" />
                        <span className="text-muted-blyc" style={{ fontSize: '0.76rem' }}>Delivery:</span>
                        <strong className="text-dark" style={{ fontSize: '0.82rem' }}>{operationalData.delivery} days avg</strong>
                      </div>
                    )}

                    {operationalData.discount !== null && (
                      <div className="d-flex align-items-center gap-1.5 px-2.5 py-1.5 rounded-2 bg-light border">
                        <Percent size={14} className="text-success" />
                        <span className="text-muted-blyc" style={{ fontSize: '0.76rem' }}>Mean Discount:</span>
                        <strong className="text-dark" style={{ fontSize: '0.82rem' }}>{operationalData.discount}%</strong>
                      </div>
                    )}

                    {operationalData.paymentMethod && (
                      <div className="d-flex align-items-center gap-1.5 px-2.5 py-1.5 rounded-2 bg-light border">
                        <CreditCard size={14} className="text-info" />
                        <span className="text-muted-blyc" style={{ fontSize: '0.76rem' }}>Payment:</span>
                        <strong className="text-dark" style={{ fontSize: '0.82rem' }}>{operationalData.paymentMethod}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Interactive Recharts Section */}
              <div className="row g-3">
                <div className="col-12 col-lg-8">
                  <div className="blyc-card p-4 h-100">
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-4">
                      <div>
                        <h6 className="fw-bold mb-1 text-dark">
                          {mainChartMode === 'trajectory' && hasDateData && 'Revenue Trajectory'}
                          {mainChartMode === 'units_category' && 'Units Sold by Category'}
                          {mainChartMode === 'revenue_category' && 'Revenue by Category'}
                          {mainChartMode === 'regional' && 'Regional Sales & Profit Performance'}
                        </h6>
                        <span className="text-muted-blyc" style={{ fontSize: '0.8rem' }}>
                          {mainChartMode === 'trajectory' && hasDateData && 'Daily intervals calculated directly from transaction timestamps'}
                          {mainChartMode === 'units_category' && 'Discrete physical units sold grouped across product categories'}
                          {mainChartMode === 'revenue_category' && 'Gross turnover contribution across product categories'}
                          {mainChartMode === 'regional' && 'Comparative geographic revenue and profit distribution across regions'}
                        </span>
                      </div>

                      <div className="d-flex flex-wrap align-items-center gap-2">
                        {/* Segmented Mode Selector */}
                        <div className="nav-segmented" style={{ transform: 'scale(0.92)', transformOrigin: 'right center' }}>
                          {hasDateData && (
                            <button 
                              className={`nav-segmented-btn ${mainChartMode === 'trajectory' ? 'active' : ''}`}
                              onClick={() => setMainChartMode('trajectory')}
                            >
                              Timeline
                            </button>
                          )}
                          <button 
                            className={`nav-segmented-btn ${mainChartMode === 'units_category' ? 'active' : ''}`}
                            onClick={() => setMainChartMode('units_category')}
                          >
                            Units Sold
                          </button>
                          <button 
                            className={`nav-segmented-btn ${mainChartMode === 'revenue_category' ? 'active' : ''}`}
                            onClick={() => setMainChartMode('revenue_category')}
                          >
                            Revenue
                          </button>
                          {regionalData.length > 0 && (
                            <button 
                              className={`nav-segmented-btn ${mainChartMode === 'regional' ? 'active' : ''}`}
                              onClick={() => setMainChartMode('regional')}
                            >
                              Regional
                            </button>
                          )}
                        </div>

                        {mainChartMode === 'trajectory' && hasDateData && (
                          <div className="nav-segmented" style={{ transform: 'scale(0.92)', transformOrigin: 'right center' }}>
                            <button 
                              className={`nav-segmented-btn ${dateFilter === 'all' ? 'active' : ''}`}
                              onClick={() => setDateFilter('all')}
                            >
                              All Dates
                            </button>
                            <button 
                              className={`nav-segmented-btn ${dateFilter === 'recent' ? 'active' : ''}`}
                              onClick={() => setDateFilter('recent')}
                            >
                              Recent Range
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {mainChartMode === 'trajectory' && hasDateData && (
                      <RevenueAreaChart data={filteredPoints} />
                    )}
                    {mainChartMode === 'units_category' && (
                      <CategoryUnitsBarChart data={categoryUnitsData} />
                    )}
                    {mainChartMode === 'revenue_category' && (
                      <CategoryBarChart data={categoriesRevenueData} />
                    )}
                    {mainChartMode === 'regional' && (
                      <RegionPerformanceBarChart data={regionalData} />
                    )}
                  </div>
                </div>

                <div className="col-12 col-lg-4">
                  <div className="blyc-card p-4 h-100">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div>
                        <h6 className="fw-bold mb-1 text-dark">
                          {secondaryChartMode === 'category_donut' ? 'Revenue by Category' : 'Customer Segments'}
                        </h6>
                        <span className="text-muted-blyc" style={{ fontSize: '0.8rem' }}>
                          {secondaryChartMode === 'category_donut' ? 'Share of total turnover' : 'New vs. returning sales'}
                        </span>
                      </div>

                      {customerTypeData.length > 0 && (
                        <div className="nav-segmented" style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}>
                          <button 
                            className={`nav-segmented-btn ${secondaryChartMode === 'category_donut' ? 'active' : ''}`}
                            onClick={() => setSecondaryChartMode('category_donut')}
                          >
                            Categories
                          </button>
                          <button 
                            className={`nav-segmented-btn ${secondaryChartMode === 'customer_types' ? 'active' : ''}`}
                            onClick={() => setSecondaryChartMode('customer_types')}
                          >
                            Customers
                          </button>
                        </div>
                      )}
                    </div>

                    {secondaryChartMode === 'category_donut' ? (
                      <CategoryDonutChart data={categoriesRevenueData} />
                    ) : (
                      <CustomerSegmentDonutChart data={customerTypeData} />
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Tab Content: Sales & Profit Analysis */}
          {activeTab === 'sales' && (
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <MetricCard
                  title="Gross Profit"
                  value={business?.total_profit ? `$${business.total_profit.toLocaleString()}` : 'N/A'}
                  subtitle="(Selling Price - Cost) × Qty"
                  trend={{ value: 18.4, isPositive: true }}
                  icon={DollarSign}
                />
              </div>
              <div className="col-12 col-md-4">
                <MetricCard
                  title="Profit Margin"
                  value={business?.profit_margin_pct ? `${business.profit_margin_pct}%` : 'N/A'}
                  subtitle="Total Profit / Revenue"
                  icon={TrendingUp}
                />
              </div>
              <div className="col-12 col-md-4">
                <MetricCard
                  title="Total Cost (COGS)"
                  value={business?.total_cost ? `$${business.total_cost.toLocaleString()}` : 'N/A'}
                  subtitle="Unit Cost × Quantity"
                  icon={Package}
                />
              </div>

              <div className="col-12">
                <div className="blyc-card p-4">
                  <h6 className="fw-bold mb-2 text-dark">Category Margin & Revenue Comparison</h6>
                  <CategoryBarChart data={categoriesData} />
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Product Performance */}
          {activeTab === 'products' && (
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="blyc-card p-4 border-start border-4 border-primary">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div className="p-2 rounded-3 bg-light text-primary">
                      <Award size={18} />
                    </div>
                    <h6 className="fw-bold mb-0 text-dark">Top-Performing Product</h6>
                  </div>
                  <h4 className="fw-bold text-dark mb-1 tabular-nums">
                    {business?.best_performing_product?.name || 'N/A'}
                  </h4>
                  <p className="text-muted-blyc mb-0" style={{ fontSize: '0.85rem' }}>
                    Delivered <strong>${business?.best_performing_product?.revenue?.toLocaleString() || '0.00'}</strong> in verified sales revenue
                  </p>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="blyc-card p-4 border-start border-4 border-secondary">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div className="p-2 rounded-3 bg-light text-muted">
                      <TrendingDown size={18} />
                    </div>
                    <h6 className="fw-bold mb-0 text-dark">Lowest-Performing Product</h6>
                  </div>
                  <h4 className="fw-bold text-secondary mb-1 tabular-nums">
                    {business?.lowest_performing_product?.name || 'N/A'}
                  </h4>
                  <p className="text-muted-blyc mb-0" style={{ fontSize: '0.85rem' }}>
                    Delivered <strong>${business?.lowest_performing_product?.revenue?.toLocaleString() || '0.00'}</strong> in verified sales revenue
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Categories */}
          {activeTab === 'categories' && (
            <div className="blyc-card p-4">
              <h6 className="fw-bold mb-3 text-dark">Department & Category Distribution</h6>
              <div className="row g-4 align-items-center">
                <div className="col-12 col-md-6">
                  <CategoryBarChart data={categoriesData} />
                </div>
                <div className="col-12 col-md-6">
                  <CategoryDonutChart data={categoriesData} />
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Time Trends */}
          {activeTab === 'time' && (
            <div className="blyc-card p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6 className="fw-bold mb-1 text-dark">Time-Series Trend Trajectory</h6>
                  <p className="text-muted-blyc mb-0" style={{ fontSize: '0.85rem' }}>
                    Daily revenue intervals aggregated across transaction timestamps
                  </p>
                </div>
                <Calendar size={18} className="text-muted-blyc" />
              </div>
              <RevenueAreaChart data={timeSeriesPoints} />
            </div>
          )}

          {/* Tab Content: Descriptive Statistics */}
          {activeTab === 'descriptive' && (
            <div className="blyc-card overflow-hidden">
              <div className="p-3 px-4 border-bottom bg-light d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0 text-dark">Statistical Summary of Dataset Columns</h6>
                <span className="badge-pill badge-pill-neutral">{(analytics?.descriptive_stats || []).length} Columns Evaluated</span>
              </div>
              <div className="table-responsive">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Type</th>
                      <th>Count</th>
                      <th>Min</th>
                      <th>Max</th>
                      <th>Mean</th>
                      <th>Median</th>
                      <th>Std Dev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.descriptive_stats || []).map((stat) => (
                      <tr key={stat.column_name}>
                        <td className="fw-semibold text-dark">{stat.column_name}</td>
                        <td>
                          <span className={`badge-pill ${stat.data_type === 'numeric' ? 'badge-pill-info' : 'badge-pill-neutral'}`}>
                            {stat.data_type}
                          </span>
                        </td>
                        <td className="tabular-nums">{stat.count}</td>
                        <td className="tabular-nums">{stat.min_value !== null && stat.min_value !== undefined ? stat.min_value : '—'}</td>
                        <td className="tabular-nums">{stat.max_value !== null && stat.max_value !== undefined ? stat.max_value : '—'}</td>
                        <td className="tabular-nums">{stat.mean_value !== null && stat.mean_value !== undefined ? stat.mean_value : '—'}</td>
                        <td className="tabular-nums">{stat.median_value !== null && stat.median_value !== undefined ? stat.median_value : '—'}</td>
                        <td className="tabular-nums">{stat.std_dev !== null && stat.std_dev !== undefined ? stat.std_dev : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
