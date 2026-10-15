import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '650px',
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-muted)', padding: '4px', borderRadius: '4px' }}
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  actionButton?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, actionButton, icon }) => {
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
      }}
    >
      {icon && <div style={{ color: 'var(--text-subtle)', marginBottom: '4px' }}>{icon}</div>}
      <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>{title}</h4>
      {description && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px' }}>
          {description}
        </p>
      )}
      {actionButton && <div style={{ marginTop: '8px' }}>{actionButton}</div>}
    </div>
  );
};
