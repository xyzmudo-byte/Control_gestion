import React, { useState, useMemo } from 'react';
import {
  Target,
  CheckCircle2,
  Clock,
  FolderKanban,
  Search,
  ArrowRight,
  TrendingUp,
  ChevronRight,
  Sparkles,
  User,
  Calendar,
  X,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import {
  AppDataState,
  Deliverable,
  OperationalStatus,
  PriorityLevel,
  UserProfile,
} from '../../types/models';
import { ActiveTab } from '../../types/common';
import { isDateToday, isDateThisWeek } from '../../services/metricsService';
import { isDeliverableOverdue } from '../../services/evaluationService';
import { Modal } from '../common/Modal';

interface CockpitViewProps {
  state: AppDataState;
  currentUser: UserProfile;
  onUpdateDeliverable: (id: string, updates: Partial<Deliverable>) => Promise<any>;
  onAddDeliverable: (item: Omit<Deliverable, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectDeliverable?: (deliverable: Deliverable) => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  state,
  currentUser,
  onUpdateDeliverable,
  onAddDeliverable,
  onNavigateTab,
  onSelectDeliverable,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const TOP3_STORAGE_KEY = `CG_TOP3_${currentUser.id}_${todayStr}`;

  // Filtros del tablero Kanban
  const [scopeFilter, setScopeFilter] = useState<'MINE' | 'ALL'>('MINE');
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Top 3 del día (IDs guardados en localStorage para el día actual)
  const [top3Ids, setTop3Ids] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(TOP3_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return [];
  });

  // Guardar Top 3
  const saveTop3 = (ids: string[]) => {
    setTop3Ids(ids);
    try {
      localStorage.setItem(TOP3_STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  };

  const handleToggleTop3 = (id: string) => {
    if (top3Ids.includes(id)) {
      saveTop3(top3Ids.filter((itemId) => itemId !== id));
    } else {
      if (top3Ids.length >= 3) {
        alert('Ya has seleccionado tus 3 prioridades del día. Desmarca una para agregar otra.');
        return;
      }
      saveTop3([...top3Ids, id]);
    }
  };

  // Si no hay Top 3 guardado, pre-seleccionar automáticamente los 3 entregables más urgentes de hoy/pendientes
  const activeTop3Items = useMemo(() => {
    if (top3Ids.length > 0) {
      const items = top3Ids
        .map((id) => state.deliverables.find((d) => d.id === id))
        .filter(Boolean) as Deliverable[];
      if (items.length > 0) return items;
    }
    // Fallback: entregables de hoy o pendientes del usuario
    const myPendings = state.deliverables
      .filter((d) => d.responsiblePerson?.toLowerCase() === currentUser.name.toLowerCase() && d.status !== 'COMPLETED')
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .slice(0, 3);
    return myPendings;
  }, [top3Ids, state.deliverables, currentUser.name]);

  // Entregables filtrados para las columnas Kanban
  const kanbanDeliverables = useMemo(() => {
    return state.deliverables.filter((d) => {
      // Filtro ámbito
      if (scopeFilter === 'MINE' && d.responsiblePerson?.toLowerCase() !== currentUser.name.toLowerCase()) {
        return false;
      }
      // Filtro proyecto
      if (selectedProject !== 'ALL' && d.projectId !== selectedProject) {
        return false;
      }
      // Búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(query);
        const matchesDesc = d.description?.toLowerCase().includes(query);
        const matchesResp = d.responsiblePerson?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesResp) return false;
      }
      return true;
    });
  }, [state.deliverables, scopeFilter, selectedProject, searchQuery, currentUser.name]);

  // Columnas Kanban
  const columns: { id: OperationalStatus; label: string; color: string; bg: string }[] = [
    { id: 'PENDING', label: 'Por Iniciar', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.08)' },
    { id: 'IN_PROGRESS', label: 'En Curso', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.08)' },
    { id: 'BLOCKED', label: 'Bloqueado / Crítico', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)' },
    { id: 'COMPLETED', label: 'Completado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
  ];

  // Drag and Drop nativo
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: OperationalStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (!id) return;

    const item = state.deliverables.find((d) => d.id === id);
    if (item && item.status !== targetStatus) {
      const updates: Partial<Deliverable> = { status: targetStatus };
      if (targetStatus === 'COMPLETED' && !item.realDeliveryDate) {
        updates.realDeliveryDate = todayStr;
        updates.progress = 100;
      } else if (targetStatus === 'IN_PROGRESS' && item.progress === 0) {
        updates.progress = 25;
      }
      await onUpdateDeliverable(id, updates);
    }
    setDraggedItemId(null);
  };

  const handleAdvanceStatus = async (item: Deliverable) => {
    const sequence: OperationalStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    const currentIndex = sequence.indexOf(item.status);
    if (currentIndex >= 0 && currentIndex < sequence.length - 1) {
      const nextStatus = sequence[currentIndex + 1];
      const updates: Partial<Deliverable> = { status: nextStatus };
      if (nextStatus === 'COMPLETED') {
        updates.realDeliveryDate = todayStr;
        updates.progress = 100;
      } else if (nextStatus === 'IN_PROGRESS' && item.progress === 0) {
        updates.progress = 50;
      }
      await onUpdateDeliverable(item.id, updates);
    }
  };

  // KPIs del cintillo superior
  const activeProjectsCount = state.projects.filter((p) => p.status === 'IN_PROGRESS').length;
  const deliverablesThisWeekCount = state.deliverables.filter((d) => isDateThisWeek(d.scheduledDate)).length;
  const blockedDeliverablesCount = state.deliverables.filter((d) => d.status === 'BLOCKED').length;
  const completedRate = useMemo(() => {
    const total = state.deliverables.length;
    if (total === 0) return 100;
    const completed = state.deliverables.filter((d) => d.status === 'COMPLETED').length;
    return Math.round((completed / total) * 100);
  }, [state.deliverables]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ─── CINTILLO DE KPIS CORPORATIVOS ────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Proyectos en Curso
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {activeProjectsCount}
            </div>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(37, 99, 235, 0.12)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FolderKanban size={20} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Entregas Esta Semana
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {deliverablesThisWeekCount}
            </div>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={20} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Bloqueos / Críticos
            </div>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: blockedDeliverablesCount > 0 ? '#ef4444' : 'var(--text-main)',
                marginTop: '4px',
              }}
            >
              {blockedDeliverablesCount}
            </div>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: blockedDeliverablesCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.1)',
              color: blockedDeliverablesCount > 0 ? '#ef4444' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={20} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cumplimiento Global
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
              {completedRate}%
            </div>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* ─── CUERPO PRINCIPAL: ENFOQUE DIARIO (IZQUIERDA) + KANBAN (DERECHA) ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 340px) 1fr',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* PANEL IZQUIERDO: MI ENFOQUE DIARIO (TOP 3) */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} style={{ color: '#2563eb' }} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Mi Enfoque Diario
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Top 3 Prioridades de Hoy</div>
              </div>
            </div>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(37, 99, 235, 0.15)',
                color: '#60a5fa',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {activeTop3Items.length}/3
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeTop3Items.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                }}
              >
                <Sparkles size={28} style={{ color: '#38bdf8', margin: '0 auto 8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  ¡Todo al día por hoy!
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  No tienes entregables pendientes asignados. Puedes seleccionar prioridades desde el tablero.
                </div>
              </div>
            ) : (
              activeTop3Items.map((item) => {
                const isCompleted = item.status === 'COMPLETED';
                const isOverdue = !isCompleted && isDeliverableOverdue(item.scheduledDate, item.status);
                const isToday = isDateToday(item.scheduledDate);
                const project = state.projects.find((p) => p.id === item.projectId);

                return (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-surface)',
                      border: isCompleted
                        ? '1px solid rgba(16, 185, 129, 0.3)'
                        : isOverdue
                        ? '1px solid rgba(239, 68, 68, 0.4)'
                        : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          const newStatus = isCompleted ? 'IN_PROGRESS' : 'COMPLETED';
                          await onUpdateDeliverable(item.id, {
                            status: newStatus,
                            progress: newStatus === 'COMPLETED' ? 100 : item.progress,
                            realDeliveryDate: newStatus === 'COMPLETED' ? todayStr : undefined,
                          });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          color: isCompleted ? '#10b981' : 'var(--text-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          marginTop: '2px',
                        }}
                        title={isCompleted ? 'Marcar como pendiente' : 'Marcar como completado'}
                      >
                        <CheckCircle2 size={18} />
                      </button>

                      <div style={{ flex: 1 }}>
                        <div
                          onClick={() => onSelectDeliverable?.(item)}
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            cursor: 'pointer',
                            lineHeight: 1.4,
                          }}
                        >
                          {item.name}
                        </div>
                        {project && (
                          <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>📁 {project.name}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleTop3(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-subtle)',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Quitar de mi Top 3 de hoy"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Barra de progreso interactiva */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          flex: 1,
                          height: '6px',
                          backgroundColor: 'var(--bg-input)',
                          borderRadius: 'var(--radius-full)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${item.progress || (isCompleted ? 100 : 0)}%`,
                            height: '100%',
                            backgroundColor: isCompleted ? '#10b981' : '#2563eb',
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 0.25s ease',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', minWidth: '32px', textAlign: 'right' }}>
                        {item.progress || (isCompleted ? 100 : 0)}%
                      </span>
                    </div>

                    {/* Fecha y estado */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span
                        style={{
                          color: isOverdue ? '#ef4444' : isToday ? '#f59e0b' : 'var(--text-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Calendar size={11} />
                        {item.scheduledDate} {isToday ? '(Hoy)' : ''}
                      </span>

                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 600,
                          backgroundColor: isCompleted
                            ? 'rgba(16, 185, 129, 0.12)'
                            : isOverdue
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(37, 99, 235, 0.12)',
                          color: isCompleted ? '#10b981' : isOverdue ? '#ef4444' : '#60a5fa',
                        }}
                      >
                        {isCompleted ? 'Cumplido' : isOverdue ? 'Atrasado' : 'En tiempo'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateTab('deliverables')}
            style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
          >
            <span>Ver todos mis entregables</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* PANEL DERECHO: TABLERO KANBAN ÁGIL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Barra de Filtros del Kanban */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 16px',
              flexWrap: 'wrap',
            }}
          >
            {/* Ámbito: Mío vs Equipo */}
            <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setScopeFilter('MINE')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: scopeFilter === 'MINE' ? 'var(--primary-accent)' : 'transparent',
                  color: scopeFilter === 'MINE' ? '#ffffff' : 'var(--text-muted)',
                }}
              >
                Mis Tareas
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('ALL')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: scopeFilter === 'ALL' ? 'var(--primary-accent)' : 'transparent',
                  color: scopeFilter === 'ALL' ? '#ffffff' : 'var(--text-muted)',
                }}
              >
                Todo el Equipo
              </button>
            </div>

            {/* Selector de Proyecto */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="form-control"
              style={{ width: 'auto', minWidth: '180px', padding: '6px 10px', fontSize: '12px' }}
            >
              <option value="ALL">Todos los Proyectos</option>
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Buscador rápido */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px' }}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar en el tablero..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '12px' }}
              />
            </div>
          </div>

          {/* Columnas Kanban */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(220px, 1fr))',
              gap: '14px',
              alignItems: 'start',
              overflowX: 'auto',
              paddingBottom: '8px',
            }}
          >
            {columns.map((col) => {
              const items = kanbanDeliverables.filter((d) => d.status === col.id);

              return (
                <div
                  key={col.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    minHeight: '480px',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  {/* Encabezado de Columna */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: 'var(--radius-full)', backgroundColor: col.color }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {col.label}
                      </span>
                    </div>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: col.bg,
                        color: col.color,
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {items.length}
                    </span>
                  </div>

                  {/* Lista de Tarjetas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                    {items.length === 0 ? (
                      <div
                        style={{
                          padding: '24px 12px',
                          textAlign: 'center',
                          color: 'var(--text-subtle)',
                          fontSize: '12px',
                          border: '1px dashed var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        Arrastra tarjetas aquí
                      </div>
                    ) : (
                      items.map((item) => {
                        const project = state.projects.find((p) => p.id === item.projectId);
                        const isOverdue = item.status !== 'COMPLETED' && isDeliverableOverdue(item.scheduledDate, item.status);
                        const isTop3 = top3Ids.includes(item.id);

                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              border: isOverdue ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              padding: '12px',
                              cursor: 'grab',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              transition: 'all 0.15s ease',
                              boxShadow: 'var(--shadow-sm)',
                            }}
                          >
                            {/* Proyecto y Prioridad */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              {project ? (
                                <span style={{ fontSize: '10px', fontWeight: 600, color: '#60a5fa', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  📁 {project.name}
                                </span>
                              ) : (
                                <span style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>Operación</span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleTop3(item.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                  color: isTop3 ? '#f59e0b' : 'var(--text-subtle)',
                                }}
                                title={isTop3 ? 'Quitar de Top 3' : 'Fijar en Top 3 de hoy'}
                              >
                                <Target size={13} />
                              </button>
                            </div>

                            {/* Título de la Tarjeta */}
                            <div
                              onClick={() => onSelectDeliverable?.(item)}
                              style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                lineHeight: 1.35,
                              }}
                            >
                              {item.name}
                            </div>

                            {/* Progreso */}
                            {item.status !== 'COMPLETED' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div
                                  style={{
                                    flex: 1,
                                    height: '4px',
                                    backgroundColor: 'var(--bg-input)',
                                    borderRadius: 'var(--radius-full)',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${item.progress || 0}%`,
                                      height: '100%',
                                      backgroundColor: col.color,
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                  {item.progress || 0}%
                                </span>
                              </div>
                            )}

                            {/* Responsable, Fecha y Acción Rápida */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '11px',
                                paddingTop: '4px',
                                borderTop: '1px solid var(--border-subtle)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                                <User size={11} />
                                <span>{item.responsiblePerson?.split(' ')[0]}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: isOverdue ? '#ef4444' : 'var(--text-subtle)', fontSize: '10px' }}>
                                  {item.scheduledDate.slice(5)}
                                </span>

                                {col.id !== 'COMPLETED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleAdvanceStatus(item)}
                                    style={{
                                      background: 'var(--bg-input)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '2px 5px',
                                      color: 'var(--text-main)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    title="Avanzar al siguiente estado"
                                  >
                                    <ArrowRight size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
