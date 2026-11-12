import React, { ReactNode, ComponentType } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: ComponentType<{ size?: number; className?: string }>;
  action?: ReactNode;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  action,
  loading = false,
}) => {
  return (
    <div className="metric-card p-3 p-md-4 h-100 position-relative d-flex flex-column justify-content-between">
      <div>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <span className="tracking-wide-caps">
            {title}
          </span>
          {Icon && (
            <div className="metric-card-icon p-2 rounded-3 d-flex align-items-center justify-content-center">
              <Icon size={18} />
            </div>
          )}
        </div>

        <div className="d-flex align-items-baseline mb-1">
          {loading ? (
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          ) : (
            <h3 className="metric-card-value mb-0 fw-bold tabular-nums text-dark">
              {value}
            </h3>
          )}
        </div>
      </div>

      {(subtitle || trend || action) && (
        <div className="metric-card-footer d-flex align-items-center justify-content-between gap-2 mt-3 pt-2" style={{ fontSize: '0.8rem' }}>
          <div className="d-flex align-items-center gap-2">
            {trend && (
              <span 
                className={`badge-pill ${trend.isPositive ? 'badge-pill-success' : 'badge-pill-danger'}`}
                style={{ fontSize: '0.72rem', padding: '2px 8px' }}
              >
                {trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
              </span>
            )}
            {subtitle && (
              <span className="text-muted-blyc">
                {subtitle}
              </span>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
    </div>
  );
};
