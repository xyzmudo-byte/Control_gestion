import { EvaluationResult } from '../types/models';

export const calculateDelayDays = (scheduledDate: string, realDeliveryDate?: string): number => {
  if (!scheduledDate) return 0;
  
  const scheduled = new Date(scheduledDate);
  scheduled.setHours(0, 0, 0, 0);

  const compareWith = realDeliveryDate ? new Date(realDeliveryDate) : new Date();
  compareWith.setHours(0, 0, 0, 0);

  const diffTime = compareWith.getTime() - scheduled.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
};

export const isDeliverableOverdue = (scheduledDate: string, status: string): boolean => {
  if (status === 'COMPLETED') return false;
  if (!scheduledDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduled = new Date(scheduledDate);
  scheduled.setHours(0, 0, 0, 0);

  return scheduled.getTime() < today.getTime();
};

export const getEvaluationConfig = (result?: EvaluationResult) => {
  switch (result) {
    case 'FULFILLED':
      return {
        label: 'Cumplió',
        color: 'var(--color-success)',
        bg: 'var(--color-success-bg)',
        border: 'var(--color-success-border)',
        icon: '🟩',
      };
    case 'DELAYED':
      return {
        label: 'Retrasado',
        color: 'var(--color-warning)',
        bg: 'var(--color-warning-bg)',
        border: 'var(--color-warning-border)',
        icon: '🟨',
      };
    case 'UNFULFILLED':
      return {
        label: 'Incumplió',
        color: 'var(--color-danger)',
        bg: 'var(--color-danger-bg)',
        border: 'var(--color-danger-border)',
        icon: '🟥',
      };
    case 'NOT_EVALUATED':
    default:
      return {
        label: 'No evaluado',
        color: 'var(--color-neutral-text)',
        bg: 'var(--color-neutral-bg)',
        border: 'var(--color-neutral-border)',
        icon: '⬜',
      };
  }
};
