import { Responsibility, ResponsibilityOccurrence } from '../types/models';

export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export const getMonthName = (monthIndex: number): string => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[monthIndex] || '';
};

export const generateNextOccurrence = (
  responsibility: Responsibility,
  targetDate: Date = new Date()
): ResponsibilityOccurrence => {
  const now = targetDate;
  let periodLabel = '';
  let scheduledDate = now.toISOString().split('T')[0];

  if (responsibility.frequency === 'DAILY') {
    periodLabel = `Día ${scheduledDate}`;
  } else if (responsibility.frequency === 'WEEKLY') {
    const weekNum = getWeekNumber(now);
    const year = now.getFullYear();
    periodLabel = `Semana ${weekNum} - ${year}`;
    
    // Ajustar scheduledDate al viernes de esa semana si deliveryDay contiene 'Viernes'
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -2 : 5); // viernes
    const friday = new Date(now);
    friday.setDate(diff);
    scheduledDate = friday.toISOString().split('T')[0];
  } else if (responsibility.frequency === 'MONTHLY') {
    const month = getMonthName(now.getMonth());
    const year = now.getFullYear();
    periodLabel = `${month} ${year}`;
    
    // Último día del mes
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    scheduledDate = lastDayOfMonth.toISOString().split('T')[0];
  }

  const id = `occ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    responsibilityId: responsibility.id,
    periodLabel,
    scheduledDate,
    status: 'PENDING',
    progress: 0,
    comments: `Ocurrencia programada para ${periodLabel}`,
    isDemo: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};
