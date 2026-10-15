import React from 'react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  type?: 'compliance' | 'pending' | 'warning' | 'danger' | 'purple' | 'neutral';
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtext,
  type = 'neutral',
  icon,
  onClick,
}) => {
  return (
    <div
      className={`kpi-card ${type}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="kpi-title">
        <span>{title}</span>
        {icon && <span style={{ opacity: 0.8 }}>{icon}</span>}
      </div>
      <div className="kpi-value-row">
        <span className="kpi-value">{value}</span>
      </div>
      {subtext && <span className="kpi-subtext">{subtext}</span>}
    </div>
  );
};
