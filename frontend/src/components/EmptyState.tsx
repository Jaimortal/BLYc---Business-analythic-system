import React, { ReactNode, ComponentType } from 'react';

interface EmptyStateProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  customAction?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  customAction,
}) => {
  return (
    <div className="empty-state p-5 text-center my-4 d-flex flex-column align-items-center justify-content-center">
      <div className="empty-state-icon p-3 rounded-circle mb-3 d-inline-flex">
        <Icon size={32} />
      </div>
      <h5 className="fw-bold mb-2 text-dark">
        {title}
      </h5>
      <p className="text-muted-blyc mb-4" style={{ maxWidth: '420px', fontSize: '0.9rem' }}>
        {description}
      </p>

      {customAction ? (
        customAction
      ) : actionText && onAction ? (
        <button className="btn btn-blyc-primary" onClick={onAction}>
          {actionText}
        </button>
      ) : null}
    </div>
  );
};
