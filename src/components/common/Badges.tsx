import React from 'react';
import { EvaluationResult, OperationalStatus, PriorityLevel, ProjectStatus, RiskLevel } from '../../types/models';
import { getEvaluationConfig, isDeliverableOverdue } from '../../services/evaluationService';

export const StatusBadge: React.FC<{
  status: OperationalStatus;
  scheduledDate?: string;
}> = ({ status, scheduledDate }) => {
  const isOverdue = scheduledDate ? isDeliverableOverdue(scheduledDate, status) : false;

  if (isOverdue) {
    return <span className="badge badge-danger">⚠️ Vencido</span>;
  }

  switch (status) {
    case 'COMPLETED':
      return <span className="badge badge-success">✓ Completado</span>;
    case 'IN_PROGRESS':
      return <span className="badge badge-info">⏳ En progreso</span>;
    case 'BLOCKED':
      return <span className="badge badge-danger">⛔ Bloqueado</span>;
    case 'PENDING':
    default:
      return <span className="badge badge-neutral">⏱️ Pendiente</span>;
  }
};

export const EvaluationBadge: React.FC<{ result?: EvaluationResult }> = ({ result }) => {
  const config = getEvaluationConfig(result);
  let badgeClass = 'badge-neutral';
  if (result === 'FULFILLED') badgeClass = 'badge-success';
  if (result === 'DELAYED') badgeClass = 'badge-warning';
  if (result === 'UNFULFILLED') badgeClass = 'badge-danger';

  return (
    <span className={`badge ${badgeClass}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: PriorityLevel }> = ({ priority }) => {
  switch (priority) {
    case 'URGENT':
      return <span className="badge badge-danger">🔥 Urgente</span>;
    case 'HIGH':
      return <span className="badge badge-warning">⚡ Alta</span>;
    case 'MEDIUM':
      return <span className="badge badge-info">Normal</span>;
    case 'LOW':
    default:
      return <span className="badge badge-neutral">Baja</span>;
  }
};

export const RiskBadge: React.FC<{ risk: RiskLevel }> = ({ risk }) => {
  switch (risk) {
    case 'HIGH':
      return <span className="badge badge-danger">Riesgo Alto</span>;
    case 'MEDIUM':
      return <span className="badge badge-warning">Riesgo Medio</span>;
    case 'LOW':
    default:
      return <span className="badge badge-success">Riesgo Bajo</span>;
  }
};

export const ProjectStatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  switch (status) {
    case 'COMPLETED':
      return <span className="badge badge-success">Completado</span>;
    case 'IN_PROGRESS':
      return <span className="badge badge-info">En progreso</span>;
    case 'AT_RISK':
      return <span className="badge badge-warning">En riesgo</span>;
    case 'BLOCKED':
      return <span className="badge badge-danger">Bloqueado</span>;
    case 'CANCELLED':
      return <span className="badge badge-neutral">Cancelado</span>;
    case 'NOT_STARTED':
    default:
      return <span className="badge badge-neutral">No iniciado</span>;
  }
};
