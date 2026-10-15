import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle, AlertTriangle, Rocket } from 'lucide-react';
import { AppDataState, Deliverable, Project, ProjectPhase, ResponsibilityOccurrence } from '../../types/models';
import { Modal } from '../common/Modal';
import { StatusBadge, PriorityBadge, EvaluationBadge } from '../common/Badges';
import { isDeliverableOverdue } from '../../services/evaluationService';

interface CalendarViewProps {
  state: AppDataState;
  onOpenDeliverable: (deliverable: Deliverable) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ state, onOpenDeliverable }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    dateStr: string;
    deliverables: Deliverable[];
    occurrences: ResponsibilityOccurrence[];
    projects: Project[];
    phases: ProjectPhase[];
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Calcular matriz de días del mes
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // En JS getDay() es 0=Domingo, convertimos a 0=Lunes
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

  // Días del mes anterior para rellenar
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

  // Días del mes siguiente para completar cuadrícula (múltiplo de 7)
  const remainingCells = 42 - calendarDays.length;
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

  // Obtener elementos por fecha
  const getEventsForDate = (dateStr: string) => {
    const deliverables = state.deliverables.filter((d) => d.scheduledDate === dateStr);
    const occurrences = state.occurrences.filter((o) => o.scheduledDate === dateStr);
    const projects = state.projects.filter((p) => p.targetDate === dateStr || p.startDate === dateStr);
    const phases = state.projectPhases.filter((ph) => ph.endDate === dateStr || ph.startDate === dateStr);

    return { deliverables, occurrences, projects, phases };
  };

  const handleDayClick = (dateStr: string) => {
    const events = getEventsForDate(dateStr);
    setSelectedDayEvents({
      dateStr,
      ...events,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Cabecera del Calendario y Controles */}
      <div className="calendar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', textTransform: 'capitalize' }}>
            {monthNames[month]} {year}
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={handleToday}>
            Hoy
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Leyenda de Indicadores Visuales */}
          <div style={{ display: 'flex', gap: '10px', fontSize: '11px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
              🟩 Cumplido
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }} />
              🟨 Retrasado
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-danger)' }} />
              🟥 Vencido/Incumplido
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-info)' }} />
              🔵 Pendiente
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-purple)' }} />
              🟣 Proyecto/Fase
            </span>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth} title="Mes anterior">
              <ChevronLeft size={16} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleNextMonth} title="Mes siguiente">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Cuadrícula del Calendario Mensual */}
      <div className="calendar-container">
        {/* Cabecera de días de la semana */}
        <div className="calendar-grid" style={{ marginBottom: '6px' }}>
          {dayNames.map((name) => (
            <div key={name} className="calendar-day-header">
              {name}
            </div>
          ))}
        </div>

        {/* Celdas de días */}
        <div className="calendar-grid">
          {calendarDays.map((cell, idx) => {
            const { deliverables, occurrences, projects, phases } = getEventsForDate(cell.dateStr);
            const hasEvents = deliverables.length > 0 || occurrences.length > 0 || projects.length > 0 || phases.length > 0;

            return (
              <div
                key={idx}
                className={`calendar-day-cell ${cell.isCurrentMonth ? '' : 'other-month'} ${cell.isToday ? 'today' : ''}`}
                onClick={() => handleDayClick(cell.dateStr)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="calendar-day-number">{cell.dayNumber}</span>
                  {hasEvents && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#60a5fa' }} />
                  )}
                </div>

                {/* Tags de Eventos del día */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                  {deliverables.slice(0, 2).map((d) => {
                    const isOverdue = isDeliverableOverdue(d.scheduledDate, d.status);
                    let bg = 'rgba(14, 165, 233, 0.2)';
                    let color = '#38bdf8';
                    if (d.status === 'COMPLETED') {
                      bg = 'rgba(16, 185, 129, 0.2)';
                      color = '#34d399';
                    } else if (isOverdue) {
                      bg = 'rgba(239, 68, 68, 0.2)';
                      color = '#f87171';
                    }

                    return (
                      <div
                        key={d.id}
                        className="calendar-event-tag"
                        style={{ backgroundColor: bg, color }}
                        title={d.name}
                      >
                        📋 {d.name}
                      </div>
                    );
                  })}

                  {occurrences.slice(0, 1).map((o) => (
                    <div
                      key={o.id}
                      className="calendar-event-tag"
                      style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}
                      title={`Ocurrencia: ${o.periodLabel}`}
                    >
                      📌 {o.periodLabel}
                    </div>
                  ))}

                  {projects.slice(0, 1).map((p) => (
                    <div
                      key={p.id}
                      className="calendar-event-tag"
                      style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}
                      title={`Cierre de Proyecto: ${p.name}`}
                    >
                      🚀 {p.name}
                    </div>
                  ))}

                  {deliverables.length + occurrences.length + projects.length > 3 && (
                    <span style={{ fontSize: '9px', color: 'var(--text-subtle)', fontWeight: 600 }}>
                      +{deliverables.length + occurrences.length + projects.length - 3} más...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal / Drawer de Detalle por Día */}
      <Modal
        isOpen={selectedDayEvents !== null}
        onClose={() => setSelectedDayEvents(null)}
        title={`Detalle de Actividades: ${selectedDayEvents?.dateStr || ''}`}
        footer={
          <button className="btn btn-primary" onClick={() => setSelectedDayEvents(null)}>
            Entendido
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Entregables del Día */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#38bdf8', marginBottom: '8px' }}>
              📋 Entregables Programados ({selectedDayEvents?.deliverables.length || 0})
            </h4>

            {selectedDayEvents?.deliverables.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No hay entregables para esta fecha.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedDayEvents?.deliverables.map((deliv) => (
                  <div
                    key={deliv.id}
                    style={{
                      padding: '10px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      onOpenDeliverable(deliv);
                      setSelectedDayEvents(null);
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{deliv.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Avance: {deliv.progress}%</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={deliv.status} scheduledDate={deliv.scheduledDate} />
                      <button className="btn btn-secondary btn-sm">Abrir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ocurrencias del Día */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#c084fc', marginBottom: '8px' }}>
              📌 Ocurrencias de Responsabilidades ({selectedDayEvents?.occurrences.length || 0})
            </h4>

            {selectedDayEvents?.occurrences.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No hay ocurrencias para esta fecha.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedDayEvents?.occurrences.map((occ) => {
                  const resp = state.responsibilities.find((r) => r.id === occ.responsibilityId);
                  return (
                    <div
                      key={occ.id}
                      style={{
                        padding: '10px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{occ.periodLabel}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{resp?.name}</div>
                      </div>
                      <StatusBadge status={occ.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Proyectos / Fases del Día */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fbbf24', marginBottom: '8px' }}>
              🚀 Hitos de Proyectos y Fases ({((selectedDayEvents?.projects.length || 0) + (selectedDayEvents?.phases.length || 0))})
            </h4>

            {(selectedDayEvents?.projects.length === 0 && selectedDayEvents?.phases.length === 0) ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No hay fechas límite de proyectos en este día.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedDayEvents?.projects.map((p) => (
                  <div key={p.id} style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                    🚀 Proyecto: <strong>{p.name}</strong> ({p.targetDate === selectedDayEvents.dateStr ? 'Fecha Cierre' : 'Fecha Inicio'})
                  </div>
                ))}
                {selectedDayEvents?.phases.map((ph) => (
                  <div key={ph.id} style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                    ⚡ Fase: <strong>{ph.name}</strong> ({ph.endDate === selectedDayEvents.dateStr ? 'Fin de Fase' : 'Inicio de Fase'})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
