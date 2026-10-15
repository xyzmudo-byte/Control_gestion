import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  Rocket,
  Users,
  PanelRightClose,
  PanelRightOpen,
  CalendarDays,
} from 'lucide-react';
import {
  AppDataState,
  Deliverable,
} from '../../types/models';
import { isDeliverableOverdue } from '../../services/evaluationService';

interface CalendarDockProps {
  state: AppDataState;
  onOpenDeliverable: (deliverable: Deliverable) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenFullCalendar?: () => void;
}

export const CalendarDock: React.FC<CalendarDockProps> = ({
  state,
  onOpenDeliverable,
  isCollapsed,
  onToggleCollapse,
  onOpenFullCalendar,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().split('T')[0]);
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  // Calcular cuadrícula del mes
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;

  const totalDays = lastDayOfMonth.getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  const calendarDays: {
    dayNumber: number;
    dateStr: string;
    isCurrentMonth: boolean;
    isToday: boolean;
  }[] = [];

  // Días del mes anterior
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const d = new Date(year, month - 1, dayNum);
    const dateStr = d.toISOString().split('T')[0];
    calendarDays.push({
      dayNumber: dayNum,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Días del mes actual
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(year, month, i);
    const dateStr = d.toISOString().split('T')[0];
    calendarDays.push({
      dayNumber: i,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Completar cuadrícula
  const remainingCells = 35 - calendarDays.length;
  if (remainingCells > 0) {
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = d.toISOString().split('T')[0];
      calendarDays.push({
        dayNumber: i,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }
  }

  // Eventos por fecha para los indicadores
  const getEventsForDate = (dateStr: string) => {
    const deliverables = (state.deliverables || []).filter((d) => d.scheduledDate === dateStr);
    const occurrences = (state.occurrences || []).filter((o) => o.scheduledDate === dateStr);
    const meetings = (state.meetings || []).filter((m) => m.date === dateStr);
    const milestones = (state.projectMilestones || []).filter((m) => m.targetDate === dateStr);

    return {
      deliverables,
      occurrences,
      meetings,
      milestones,
      totalCount: deliverables.length + occurrences.length + meetings.length + milestones.length,
      hasOverdue: deliverables.some((d) => isDeliverableOverdue(d.scheduledDate, d.status)),
      hasWarning: deliverables.some((d) => d.status === 'IN_PROGRESS' || d.status === 'PENDING'),
      hasMeeting: meetings.length > 0,
      hasMilestone: milestones.length > 0,
    };
  };

  // Eventos del día seleccionado
  const selectedDayEvents = getEventsForDate(selectedDateStr);

  // Próximos 3 eventos para cuando el día seleccionado esté vacío
  const upcomingDeliverables = (state.deliverables || [])
    .filter((d) => d.scheduledDate >= todayStr && d.status !== 'COMPLETED')
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, 3);

  // Formato legible de fecha
  const formatSelectedDateTitle = (dateStr: string) => {
    if (dateStr === todayStr) return 'Hoy';
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return dateObj.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  if (isCollapsed) {
    return (
      <aside className="calendar-dock collapsed" title="Expandir calendario">
        <button
          className="calendar-dock-toggle-btn"
          onClick={onToggleCollapse}
          aria-label="Expandir calendario lateral"
        >
          <PanelRightOpen size={18} />
        </button>
        <div className="calendar-dock-vertical-title" onClick={onToggleCollapse}>
          <CalendarIcon size={16} />
          <span>CALENDARIO PERMANENTE</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="calendar-dock">
      {/* Cabecera del Dock */}
      <div className="calendar-dock-header">
        <div className="calendar-dock-header-title">
          <CalendarIcon size={17} className="text-primary" />
          <span>Agenda & Calendario</span>
        </div>
        <div className="calendar-dock-actions">
          <button
            className="calendar-dock-action-btn"
            onClick={handleGoToday}
            title="Ir a fecha actual"
          >
            Hoy
          </button>
          <button
            className="calendar-dock-action-btn"
            onClick={onToggleCollapse}
            title="Ocultar panel lateral para más espacio"
          >
            <PanelRightClose size={17} />
          </button>
        </div>
      </div>

      {/* Navegación del Mes */}
      <div className="calendar-dock-month-nav">
        <span className="calendar-dock-month-label">
          {monthNames[month]} {year}
        </span>
        <div className="calendar-dock-nav-arrows">
          <button onClick={handlePrevMonth} className="dock-arrow-btn" title="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <button onClick={handleNextMonth} className="dock-arrow-btn" title="Mes siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Cuadrícula Mini del Mes */}
      <div className="calendar-dock-grid">
        <div className="calendar-dock-weekdays">
          {dayNames.map((name, i) => (
            <div key={i} className="dock-weekday-col">
              {name}
            </div>
          ))}
        </div>

        <div className="calendar-dock-days">
          {calendarDays.map((cell, idx) => {
            const ev = getEventsForDate(cell.dateStr);
            const isSelected = cell.dateStr === selectedDateStr;

            return (
              <button
                key={idx}
                className={`dock-day-cell ${cell.isCurrentMonth ? '' : 'outside-month'} ${
                  cell.isToday ? 'is-today' : ''
                } ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setSelectedDateStr(cell.dateStr)}
              >
                <span className="dock-day-num">{cell.dayNumber}</span>
                {ev.totalCount > 0 && (
                  <div className="dock-dots-container">
                    {ev.hasOverdue && <span className="dock-dot dot-overdue" />}
                    {ev.hasWarning && !ev.hasOverdue && <span className="dock-dot dot-warning" />}
                    {ev.hasMeeting && <span className="dock-dot dot-meeting" />}
                    {ev.hasMilestone && <span className="dock-dot dot-milestone" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Agenda del Día Seleccionado */}
      <div className="calendar-dock-agenda">
        <div className="dock-agenda-header">
          <div className="dock-agenda-date">
            <CalendarDays size={14} />
            <span>Compromisos: <strong>{formatSelectedDateTitle(selectedDateStr)}</strong></span>
          </div>
          {selectedDayEvents.totalCount > 0 && (
            <span className="dock-agenda-badge">{selectedDayEvents.totalCount}</span>
          )}
        </div>

        <div className="dock-agenda-list">
          {selectedDayEvents.totalCount === 0 ? (
            <div className="dock-empty-day">
              <div className="dock-empty-text">Sin compromisos para esta fecha</div>
              {upcomingDeliverables.length > 0 && (
                <div className="dock-upcoming-section">
                  <div className="dock-upcoming-title">Próximos vencimientos:</div>
                  {upcomingDeliverables.map((d) => (
                    <div
                      key={d.id}
                      className="dock-event-item item-deliverable"
                      onClick={() => onOpenDeliverable(d)}
                      title="Clic para ver detalle"
                    >
                      <div className="dock-event-left">
                        <Clock size={13} className="text-warning" />
                        <span className="dock-event-name">{d.name}</span>
                      </div>
                      <span className="dock-event-date-pill">{d.scheduledDate.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Entregables */}
              {selectedDayEvents.deliverables.map((d) => {
                const overdue = isDeliverableOverdue(d.scheduledDate, d.status);
                return (
                  <div
                    key={d.id}
                    className={`dock-event-item item-deliverable ${overdue ? 'border-danger' : ''}`}
                    onClick={() => onOpenDeliverable(d)}
                    title="Clic para abrir detalle"
                  >
                    <div className="dock-event-left">
                      {overdue ? (
                        <AlertTriangle size={14} className="text-danger" />
                      ) : d.status === 'COMPLETED' ? (
                        <CheckCircle size={14} className="text-success" />
                      ) : (
                        <Clock size={14} className="text-warning" />
                      )}
                      <div className="dock-event-info">
                        <span className="dock-event-title">{d.name}</span>
                        <span className="dock-event-sub">Entregable • {d.responsiblePerson}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Reuniones */}
              {selectedDayEvents.meetings.map((m) => (
                <div key={m.id} className="dock-event-item item-meeting">
                  <div className="dock-event-left">
                    <Users size={14} className="text-info" />
                    <div className="dock-event-info">
                      <span className="dock-event-title">{m.title}</span>
                      <span className="dock-event-sub">
                        Reunión • {m.startTime || 'Horario a definir'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Hitos de Proyectos */}
              {selectedDayEvents.milestones.map((milestone) => (
                <div key={milestone.id} className="dock-event-item item-milestone">
                  <div className="dock-event-left">
                    <Rocket size={14} className="text-purple" />
                    <div className="dock-event-info">
                      <span className="dock-event-title">{milestone.title}</span>
                      <span className="dock-event-sub">Hito de Proyecto</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Footer con acceso a vista grande opcional */}
      {onOpenFullCalendar && (
        <div className="calendar-dock-footer">
          <button className="dock-full-calendar-btn" onClick={onOpenFullCalendar}>
            <CalendarIcon size={14} />
            <span>Ver Vista Mensual Completa</span>
          </button>
        </div>
      )}
    </aside>
  );
};
