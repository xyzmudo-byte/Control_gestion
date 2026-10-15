import React from 'react';

export const ProgressBar: React.FC<{
  progress: number;
  height?: number;
  showText?: boolean;
  color?: string;
}> = ({ progress, height = 8, showText = false, color }) => {
  const clamped = Math.min(Math.max(progress, 0), 100);

  let fillColor = color;
  if (!fillColor) {
    if (clamped >= 100) fillColor = 'var(--color-success)';
    else if (clamped >= 50) fillColor = 'var(--primary-accent)';
    else if (clamped >= 25) fillColor = 'var(--color-warning)';
    else fillColor = 'var(--color-info)';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      <div className="progress-container" style={{ height: `${height}px` }}>
        <div
          className="progress-bar-fill"
          style={{ width: `${clamped}%`, backgroundColor: fillColor }}
        />
      </div>
      {showText && (
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', minWidth: '32px' }}>
          {clamped}%
        </span>
      )}
    </div>
  );
};
