import React from 'react';

interface BrandMarkProps {
  variant?: 'light' | 'dark';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandMark: React.FC<BrandMarkProps> = ({ 
  variant = 'light', 
  className = '',
  size = 'md' 
}) => {
  const sizeStyles = {
    sm: { fontSize: '1.1rem', badgeSize: '0.6rem' },
    md: { fontSize: '1.35rem', badgeSize: '0.65rem' },
    lg: { fontSize: '1.75rem', badgeSize: '0.75rem' }
  };

  const textColor = variant === 'light' ? '#FFFFFF' : '#111827';

  return (
    <div className={`d-inline-flex align-items-center ${className}`}>
      <span 
        style={{ 
          fontWeight: 800, 
          fontSize: sizeStyles[size].fontSize, 
          letterSpacing: '-0.04em',
          color: textColor,
          userSelect: 'none'
        }}
      >
        BLY<span style={{ color: '#38BDF8' }}>c</span>
      </span>
      <span 
        className="ms-2 px-2 py-0 rounded"
        style={{
          fontSize: sizeStyles[size].badgeSize,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          backgroundColor: variant === 'light' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 58, 138, 0.1)',
          color: variant === 'light' ? '#38BDF8' : '#1E3A8A'
        }}
      >
        Analytics
      </span>
    </div>
  );
};
