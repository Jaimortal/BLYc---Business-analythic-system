import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import type { TimeSeriesPointData } from '../services/analytics.service';

export const CHART_PALETTE = [
  '#6366F1', // Indigo (Storage Devices)
  '#10B981', // Emerald Green (Computer Parts)
  '#F59E0B', // Amber / Warm Gold (Networking)
  '#F43F5E', // Rose / Coral (Laptop Accessories)
  '#06B6D4', // Vibrant Cyan (Mobile Accessories)
  '#8B5CF6', // Purple / Violet
  '#F97316', // Sunset Orange
  '#14B8A6', // Teal
  '#EC4899', // Pink
  '#3B82F6'  // Royal Blue
];

const BRAND_COLORS = CHART_PALETTE;

interface RevenueAreaChartProps {
  data: TimeSeriesPointData[];
}

export const RevenueAreaChart: React.FC<RevenueAreaChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-muted-blyc" style={{ minHeight: '260px' }}>
        No time-series date points available
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis 
            dataKey="period" 
            stroke="#64748B" 
            fontSize={12} 
            tickLine={false} 
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <YAxis 
            stroke="#64748B" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip 
            formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Revenue']}
            contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#1E3A8A" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#revenueGradient)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface CategoryUnitsBarChartProps {
  data: { category: string; quantity: number }[];
}

export const CategoryUnitsBarChart: React.FC<CategoryUnitsBarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-muted-blyc" style={{ minHeight: '260px' }}>
        No category units data available
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis 
            dataKey="category" 
            stroke="#64748B" 
            fontSize={12} 
            tickLine={false} 
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <YAxis 
            stroke="#64748B" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => Number(val).toLocaleString()}
          />
          <Tooltip 
            formatter={(val: any) => [`${Number(val).toLocaleString()} units`, 'Units Sold']}
            contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }}
          />
          <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={`units-cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface CategoryBarChartProps {
  data: { category: string; revenue: number }[];
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-muted-blyc" style={{ minHeight: '260px' }}>
        No category grouping data available
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis 
            dataKey="category" 
            stroke="#64748B" 
            fontSize={12} 
            tickLine={false} 
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <YAxis 
            stroke="#64748B" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip 
            formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Revenue']}
            contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }}
          />
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={`rev-cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface CategoryDonutChartProps {
  data: { category: string; revenue: number }[];
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-muted-blyc" style={{ minHeight: '260px' }}>
        No distribution data
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Revenue']}
            contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

interface RegionPerformanceBarChartProps {
  data: { region: string; sales: number; profit: number; quantity?: number }[];
}

export const RegionPerformanceBarChart: React.FC<RegionPerformanceBarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-muted-blyc" style={{ minHeight: '260px' }}>
        No regional performance data available
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis 
            dataKey="region" 
            stroke="#64748B" 
            fontSize={12} 
            tickLine={false} 
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <YAxis 
            stroke="#64748B" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => `$${Number(val).toLocaleString()}`}
          />
          <Tooltip 
            formatter={(val: any, name: string) => [`$${Number(val).toLocaleString()}`, name === 'sales' ? 'Revenue Sales' : 'Gross Profit']}
            contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }}
          />
          <Legend verticalAlign="top" height={30} iconType="circle" />
          <Bar dataKey="sales" name="Sales" fill="#0284C7" radius={[4, 4, 0, 0]} />
          <Bar dataKey="profit" name="Profit" fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface CustomerSegmentDonutChartProps {
  data: { type: string; count: number; sales: number }[];
}

export const CustomerSegmentDonutChart: React.FC<CustomerSegmentDonutChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-muted-blyc" style={{ minHeight: '260px' }}>
        No customer segment data available
      </div>
    );
  }

  const SEGMENT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E'];

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="sales"
            nameKey="type"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(val: any, _, item: any) => [
              `$${Number(val).toLocaleString()} (${item?.payload?.count || 0} orders)`, 
              'Revenue'
            ]}
            contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '6px' }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
