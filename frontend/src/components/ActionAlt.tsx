import React, { useState, useRef } from 'react';
import { Info } from 'lucide-react';

interface ActionAltProps {
  description: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom';
  align?: 'center' | 'left' | 'right';
  className?: string;
}

export const ActionAlt: React.FC<ActionAltProps> = ({
  description,
  children,
  placement = 'top',
  align = 'center',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 180);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  // Determine alignment style
  const getAlignClass = () => {
    if (align === 'right') return 'blyc-alt-align-right';
    if (align === 'left') return 'blyc-alt-align-left';
    return 'blyc-alt-align-center';
  };

  return (
    <div 
      className={`position-relative d-inline-flex ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div 
          className={`blyc-alt-toast blyc-alt-${placement} ${getAlignClass()}`} 
          role="tooltip"
          aria-hidden="true"
        >
          <div className="d-flex align-items-start gap-1.5">
            <Info size={13} className="text-info mt-0.5 flex-shrink-0" />
            <span className="blyc-alt-text">{description}</span>
          </div>
        </div>
      )}
    </div>
  );
};
