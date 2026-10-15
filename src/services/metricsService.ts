import { DashboardMetrics } from '../types/common';
import { AppDataState, Deliverable } from '../types/models';
import { isDeliverableOverdue } from './evaluationService';

// Helpers de fechas
export const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const isDateToday = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  return dateStr === getTodayDateString();
};

export const isDateThisWeek = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  
  // Obtener lunes de la semana actual
  const currentDay = now.getDay();
  const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return d >= monday && d <= sunday;
};

export const isDateThisMonth = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

export const isDateInNext7Days = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const next7 = new Date(now);
  next7.setDate(now.getDate() + 7);
  next7.setHours(23, 59, 59, 999);

  return d >= now && d <= next7;
};

export const calculateDashboardMetrics = (state: AppDataState): DashboardMetrics => {
  const { deliverables, occurrences, projects, ideas } = state;

  // Colección de todas las evaluaciones registradas (de entregables y ocurrencias)
  const allEvaluations = [
    ...deliverables.map((d) => d.evaluation).filter(Boolean),
    ...occurrences.map((o) => o.evaluation).filter(Boolean),
  ];

  const fulfilledCount = allEvaluations.filter((e) => e?.result === 'FULFILLED').length;
  const delayedCount = allEvaluations.filter((e) => e?.result === 'DELAYED').length;
  const unfulfilledCount = allEvaluations.filter((e) => e?.result === 'UNFULFILLED').length;
  const notEvaluatedCount = allEvaluations.filter((e) => e?.result === 'NOT_EVALUATED').length;

  const evaluatedCount = fulfilledCount + delayedCount + unfulfilledCount;
  
  // Porcentaje de cumplimiento ponderado: Cumplió = 100%, Retrasado = 70%, Incumplió = 0%
  let compliancePercentage = 0;
  if (evaluatedCount > 0) {
    const score = fulfilledCount * 1.0 + delayedCount * 0.7;
    compliancePercentage = Math.round((score / evaluatedCount) * 100);
  }

  // Entregables operativos
  const pendingDeliverables = deliverables.filter(
    (d) => d.status === 'PENDING' || d.status === 'IN_PROGRESS' || d.status === 'BLOCKED'
  ).length;

  const overdueDeliverables = deliverables.filter((d) =>
    isDeliverableOverdue(d.scheduledDate, d.status)
  ).length;

  const dueSoonDeliverables = deliverables.filter(
    (d) =>
      d.status !== 'COMPLETED' &&
      isDateInNext7Days(d.scheduledDate) &&
      !isDeliverableOverdue(d.scheduledDate, d.status)
  ).length;

  // Proyectos
  const activeProjects = projects.filter(
    (p) => p.status === 'IN_PROGRESS' || p.status === 'AT_RISK' || p.status === 'NOT_STARTED'
  ).length;

  const projectsAtRisk = projects.filter((p) => p.risk === 'HIGH' || p.status === 'AT_RISK').length;

  // Ideas
  const newIdeas = ideas.filter((i) => i.status === 'IDEA').length;

  // Resumen temporal de entregables
  const deliverablesToday = deliverables.filter((d) => isDateToday(d.scheduledDate)).length;
  const deliverablesThisWeek = deliverables.filter((d) => isDateThisWeek(d.scheduledDate)).length;
  const deliverablesThisMonth = deliverables.filter((d) => isDateThisMonth(d.scheduledDate)).length;

  return {
    compliancePercentage,
    evaluatedCount,
    fulfilledCount,
    delayedCount,
    unfulfilledCount,
    notEvaluatedCount,
    pendingDeliverables,
    dueSoonDeliverables,
    overdueDeliverables,
    activeProjects,
    projectsAtRisk,
    newIdeas,
    deliverablesToday,
    deliverablesThisWeek,
    deliverablesThisMonth,
  };
};

export const getUpcomingDeliverables = (deliverables: Deliverable[], limit = 6): Deliverable[] => {
  return [...deliverables]
    .filter((d) => d.status !== 'COMPLETED')
    .sort((a, b) => {
      // Priorizar primero los vencidos, luego por fecha ascendente
      const aOverdue = isDeliverableOverdue(a.scheduledDate, a.status);
      const bOverdue = isDeliverableOverdue(b.scheduledDate, b.status);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    })
    .slice(0, limit);
};
