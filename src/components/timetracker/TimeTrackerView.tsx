import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Play,
  Square,
  Plus,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Filter,
  Trash2,
  Edit2,
  Briefcase,
  Layers,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  AppDataState,
  TimeCategory,
  TimeEntry,
  UserProfile,
} from '../../types/models';
import { Modal } from '../common/Modal';

interface TimeTrackerViewProps {
  state: AppDataState;
  currentUser: UserProfile;
  onStartTimeEntry: (
    activity: string,
    category?: TimeCategory,
    deliverableId?: string,
    projectId?: string
  ) => Promise<any>;
  onStopTimeEntry: (id: string) => Promise<any>;
  onAddManualTimeEntry: (
    entry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<any>;
  onUpdateTimeEntry: (id: string, updates: Partial<TimeEntry>) => Promise<any>;
  onDeleteTimeEntry: (id: string) => Promise<any>;
}

// Configuración de categorías: diseño sobrio y armonizado con el sistema corporativo
export const CATEGORY_CONFIG: Record<
  TimeCategory,
  { label: string; color: string; bg: string; border: string; icon: string; description: string }
> = {
  OPERATIONS: {
    label: 'Operaciones',
    color: '#38bdf8', // Azul informativo
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
    icon: '⚙️',
    description: 'Rutinas, procesos N12 y operación del día a día',
  },
  PROJECTS: {
    label: 'Proyectos',
    color: '#a855f7', // Púrpura estratégico
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.35)',
    icon: '🚀',
    description: 'Hitos, fases y entregables de proyectos de mejora',
  },
  MEETINGS: {
    label: 'Reuniones',
    color: '#10b981', // Verde esmeralda de coordinación
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    icon: '👥',
    description: 'Reuniones de coordinación, comités y acuerdos',
  },
  SUPPORT: {
    label: 'Soporte Técnico',
    color: '#f59e0b', // Ámbar de atención técnica
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    icon: '🛠️',
    description: 'Atención a incidencias, consultas y soporte operativo',
  },
  ADMIN: {
    label: 'Administrativo',
    color: '#94a3b8', // Gris pizarra corporativo
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.35)',
    icon: '📋',
    description: 'Gestión documental, correos, archivo y trámites',
  },
  OTHER: {
    label: 'Otros / Varios',
    color: '#cbd5e1', // Neutro suave
    bg: 'rgba(203, 213, 225, 0.10)',
    border: 'rgba(203, 213, 225, 0.25)',
    icon: '💡',
    description: 'Otras actividades no clasificadas',
  },
};

// Calcula duración en minutos a partir de startTime ("HH:mm") y endTime ("HH:mm")
const calculateMinutes = (start?: string, end?: string): number => {
  if (!start) return 0;
  const [sh, sm] = start.split(':').map(Number);
  let eh: number, em: number;

  if (end) {
    [eh, em] = end.split(':').map(Number);
  } else {
    const now = new Date();
    eh = now.getHours();
    em = now.getMinutes();
  }

  const startTotal = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  const diff = endTotal - startTotal;
  return diff > 0 ? diff : 0;
};

// Formatea minutos en "Xh Ym" o "Ym"
const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const TimeTrackerView: React.FC<TimeTrackerViewProps> = ({
  state,
  currentUser,
  onStartTimeEntry,
  onStopTimeEntry,
  onAddManualTimeEntry,
  onUpdateTimeEntry,
  onDeleteTimeEntry,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Vista activa: 'team' (Muro en vivo) | 'my' (Mi Registro) | 'timeline' (Línea de tiempo)
  const [activeTab, setActiveTab] = useState<'team' | 'my' | 'timeline'>('team');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Formulario de inicio rápido de cronómetro
  const [quickActivity, setQuickActivity] = useState('');
  const [quickCategory, setQuickCategory] = useState<TimeCategory>('OPERATIONS');

  // Contador de segundos para actualizar cronómetros en vivo
  const [, setTicker] = useState<number>(0);

  // Modal para registro manual / edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [modalUserId, setModalUserId] = useState<string>(currentUser.id);
  const [modalDate, setModalDate] = useState<string>(todayStr);
  const [modalStartTime, setModalStartTime] = useState<string>('08:30');
  const [modalEndTime, setModalEndTime] = useState<string>('10:00');
  const [modalActivity, setModalActivity] = useState<string>('');
  const [modalCategory, setModalCategory] = useState<TimeCategory>('OPERATIONS');
  const [modalDeliverableId, setModalDeliverableId] = useState<string>('');
  const [modalProjectId, setModalProjectId] = useState<string>('');

  // Efecto para hacer 'tick' cada segundo y refrescar los cronómetros
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeEntries: TimeEntry[] = useMemo(() => {
    return state.timeEntries || [];
  }, [state.timeEntries]);

  // Entrada activa del usuario actual
  const currentRunningEntry = useMemo(() => {
    return timeEntries.find(
      (e) => e.userId === currentUser.id && e.isRunning
    );
  }, [timeEntries, currentUser.id]);

  // Lista de todos los colaboradores con su estado en vivo
  const teamStatus = useMemo(() => {
    const users = state.users || [];
    return users.map((u) => {
      const running = timeEntries.find((e) => e.userId === u.id && e.isRunning);
      const todayEntries = timeEntries.filter(
        (e) => e.userId === u.id && e.date === selectedDate
      );
      const totalMinutesToday = todayEntries.reduce((acc, curr) => {
        return acc + calculateMinutes(curr.startTime, curr.endTime);
      }, 0);

      // Último registro completado hoy
      const lastCompleted = [...todayEntries]
        .filter((e) => !e.isRunning)
        .sort((a, b) => (b.endTime || '').localeCompare(a.endTime || ''))[0];

      return {
        user: u,
        runningEntry: running,
        todayEntries,
        totalMinutesToday,
        lastCompleted,
        isActive: !!running,
      };
    });
  }, [state.users, timeEntries, selectedDate]);

  // Entradas del usuario actual filtradas por fecha
  const myEntries = useMemo(() => {
    return timeEntries
      .filter((e) => e.userId === currentUser.id && e.date === selectedDate)
      .sort((a, b) => b.startTime.localeCompare(a.startTime));
  }, [timeEntries, currentUser.id, selectedDate]);

  // Métricas generales de hoy
  const todayMetrics = useMemo(() => {
    const activeNowCount = teamStatus.filter((t) => t.isActive).length;
    const totalMinutesTeam = teamStatus.reduce((acc, t) => acc + t.totalMinutesToday, 0);
    const myMinutesToday = teamStatus.find((t) => t.user.id === currentUser.id)?.totalMinutesToday || 0;

    return {
      activeNowCount,
      totalMinutesTeam,
      myMinutesToday,
      totalUsers: state.users?.length || 0,
    };
  }, [teamStatus, currentUser.id, state.users]);

  // Manejador para iniciar cronómetro rápido
  const handleStartTimer = async () => {
    if (!quickActivity.trim()) {
      alert('Por favor ingresa qué actividad estás realizando.');
      return;
    }
    await onStartTimeEntry(quickActivity, quickCategory);
    setQuickActivity('');
  };

  // Manejador para detener cronómetro
  const handleStopTimer = async (id: string) => {
    await onStopTimeEntry(id);
  };

  // Abrir modal de creación manual
  const handleOpenAddModal = (forUserId?: string) => {
    setEditingEntry(null);
    setModalUserId(forUserId || currentUser.id);
    setModalDate(selectedDate);
    const now = new Date();
    const currentH = String(now.getHours()).padStart(2, '0');
    setModalStartTime(`${currentH}:00`);
    setModalEndTime(`${currentH}:30`);
    setModalActivity('');
    setModalCategory('OPERATIONS');
    setModalDeliverableId('');
    setModalProjectId('');
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEditModal = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setModalUserId(entry.userId);
    setModalDate(entry.date);
    setModalStartTime(entry.startTime);
    setModalEndTime(entry.endTime || '');
    setModalActivity(entry.activity);
    setModalCategory(entry.category);
    setModalDeliverableId(entry.deliverableId || '');
    setModalProjectId(entry.projectId || '');
    setIsModalOpen(true);
  };

  // Guardar en modal manual
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalActivity.trim()) {
      alert('Por favor describe la actividad.');
      return;
    }

    if (editingEntry) {
      await onUpdateTimeEntry(editingEntry.id, {
        userId: modalUserId,
        date: modalDate,
        startTime: modalStartTime,
        endTime: modalEndTime || undefined,
        activity: modalActivity.trim(),
        category: modalCategory,
        deliverableId: modalDeliverableId || undefined,
        projectId: modalProjectId || undefined,
        isRunning: !modalEndTime,
      });
    } else {
      await onAddManualTimeEntry({
        userId: modalUserId,
        date: modalDate,
        startTime: modalStartTime,
        endTime: modalEndTime || undefined,
        activity: modalActivity.trim(),
        category: modalCategory,
        deliverableId: modalDeliverableId || undefined,
        projectId: modalProjectId || undefined,
        isRunning: !modalEndTime,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. TARJETAS DE INDICADORES (KPIs EJECUTIVOS) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '18px 20px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mi Tiempo Registrado Hoy</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)' }}>
              {formatMinutes(todayMetrics.myMinutesToday)}
            </div>
            <div style={{ fontSize: '11px', color: currentRunningEntry ? 'var(--color-success)' : 'var(--text-subtle)' }}>
              {currentRunningEntry ? '🟢 Cronómetro activo' : '⚪ Sin tarea activa'}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '18px 20px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Equipo Activo en este Momento</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981' }}>
              {todayMetrics.activeNowCount} / {todayMetrics.totalUsers}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
              Colaboradores con tarea en curso
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '18px 20px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(168, 85, 247, 0.12)',
              color: '#a855f7',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Horas Totales del Equipo</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)' }}>
              {formatMinutes(todayMetrics.totalMinutesTeam)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
              Acumuladas el {selectedDate === todayStr ? 'día de hoy' : selectedDate}
            </div>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE ACCIÓN: CRONÓMETRO PERSONAL */}
      <div
        style={{
          backgroundColor: currentRunningEntry ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '18px 22px',
          border: currentRunningEntry
            ? '1px solid rgba(59, 130, 246, 0.5)'
            : '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⏱</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                {currentRunningEntry ? 'Tarea activa en tu jornada' : '¿Qué estás haciendo ahora?'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                {currentRunningEntry
                  ? `Iniciada a las ${currentRunningEntry.startTime} (transcurridos ${formatMinutes(
                      calculateMinutes(currentRunningEntry.startTime)
                    )})`
                  : 'Registra tus actividades para transparentar el avance de la jornada en tiempo real'}
              </p>
            </div>
          </div>

          {currentRunningEntry && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10b981',
                  }}
                />
                {formatMinutes(calculateMinutes(currentRunningEntry.startTime))}
              </div>

              <button
                onClick={() => handleStopTimer(currentRunningEntry.id)}
                className="btn btn-danger btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontWeight: 600,
                }}
              >
                <Square size={14} fill="white" /> Detener Tarea
              </button>
            </div>
          )}
        </div>

        {/* Input y Controles */}
        {!currentRunningEntry ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(260px, 2fr) minmax(160px, 1fr) auto auto',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Ej: Análisis de base de datos, Revisión de entregable, Soporte..."
              value={quickActivity}
              onChange={(e) => setQuickActivity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartTimer()}
              className="form-control"
              style={{ fontSize: '13px' }}
            />

            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value as TimeCategory)}
              className="form-control"
              style={{ fontSize: '13px', cursor: 'pointer' }}
            >
              {(Object.keys(CATEGORY_CONFIG) as TimeCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
                </option>
              ))}
            </select>

            <button
              onClick={handleStartTimer}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <Play size={14} fill="white" /> Iniciar
            </button>

            <button
              onClick={() => handleOpenAddModal()}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                padding: '9px 14px',
                fontSize: '12px',
              }}
              title="Registrar horario pasado manualmente"
            >
              <Plus size={14} /> Bloque Manual
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card-subtle, rgba(0,0,0,0.2))',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  backgroundColor: CATEGORY_CONFIG[currentRunningEntry.category]?.bg,
                  color: CATEGORY_CONFIG[currentRunningEntry.category]?.color,
                  border: `1px solid ${CATEGORY_CONFIG[currentRunningEntry.category]?.border}`,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                {CATEGORY_CONFIG[currentRunningEntry.category]?.icon}{' '}
                {CATEGORY_CONFIG[currentRunningEntry.category]?.label}
              </span>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                {currentRunningEntry.activity}
              </span>
            </div>

            <button
              onClick={() => handleOpenAddModal()}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-accent, #3b82f6)',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              + Añadir bloque manual anterior
            </button>
          </div>
        )}
      </div>

      {/* 3. NAVEGACIÓN DE PESTAÑAS Y SELECTOR DE FECHA */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('team')}
            className={`btn btn-sm ${activeTab === 'team' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <Users size={15} /> Monitor del Equipo en Vivo
          </button>

          <button
            onClick={() => setActiveTab('my')}
            className={`btn btn-sm ${activeTab === 'my' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <UserCheck size={15} /> Mi Jornada Diaria ({myEntries.length})
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`btn btn-sm ${activeTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <Layers size={15} /> Línea de Tiempo
          </button>
        </div>

        {/* Selector de fecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fecha:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-control"
            style={{ padding: '4px 10px', fontSize: '12px', width: 'auto' }}
          />
          {selectedDate !== todayStr && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* 4. CONTENIDO: VISTA 1 - MURO DEL EQUIPO EN VIVO */}
      {activeTab === 'team' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {teamStatus.map(({ user, runningEntry, totalMinutesToday, lastCompleted, isActive }) => {
            const isMe = user.id === currentUser.id;

            return (
              <div
                key={user.id}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg, 12px)',
                  border: isActive
                    ? '1px solid rgba(16, 185, 129, 0.6)'
                    : '1px solid var(--border-color)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: isActive ? '0 0 12px rgba(16, 185, 129, 0.1)' : 'none',
                }}
              >
                {/* Cabecera del usuario */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: user.avatarColor || '#3b82f6',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                    >
                      {user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                          {user.name}
                        </span>
                        {isMe && (
                          <span
                            style={{
                              fontSize: '10px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            Tú
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {user.roleTitle || user.role} • {user.area}
                      </div>
                    </div>
                  </div>

                  {/* Estado en vivo */}
                  {isActive ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#10b981',
                        }}
                      />
                      EN CURSO
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-subtle)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                      }}
                    >
                      Pausa / Inactivo
                    </div>
                  )}
                </div>

                {/* Actividad actual o última actividad */}
                <div
                  style={{
                    backgroundColor: isActive
                      ? 'rgba(16, 185, 129, 0.06)'
                      : 'var(--bg-card-subtle, rgba(0, 0, 0, 0.15))',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    border: isActive
                      ? '1px solid rgba(16, 185, 129, 0.25)'
                      : '1px solid var(--border-color)',
                  }}
                >
                  {isActive && runningEntry ? (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#10b981',
                            letterSpacing: '0.04em',
                          }}
                        >
                          ACTIVIDAD ACTUAL:
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>
                          Lleva {formatMinutes(calculateMinutes(runningEntry.startTime))}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                        {runningEntry.activity}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '6px',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span>
                          {CATEGORY_CONFIG[runningEntry.category]?.icon}{' '}
                          {CATEGORY_CONFIG[runningEntry.category]?.label}
                        </span>
                        <span>•</span>
                        <span>Desde {runningEntry.startTime}</span>
                      </div>
                    </div>
                  ) : lastCompleted ? (
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        Última actividad ({lastCompleted.startTime} - {lastCompleted.endTime}):
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)' }}>
                        {lastCompleted.activity}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                      Sin actividad registrada el {selectedDate}
                    </div>
                  )}
                </div>

                {/* Resumen del día para este usuario */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '8px',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>
                    Total hoy: <strong style={{ color: 'var(--text-main)' }}>{formatMinutes(totalMinutesToday)}</strong>
                  </span>
                  <button
                    onClick={() => handleOpenAddModal(user.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-accent, #38bdf8)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    + Registrar Bloque
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. CONTENIDO: VISTA 2 - MI REGISTRO DIARIO */}
      {activeTab === 'my' && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                Mis bloques de tiempo ({selectedDate})
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                Total acumulado: {formatMinutes(
                  myEntries.reduce((acc, curr) => acc + calculateMinutes(curr.startTime, curr.endTime), 0)
                )}
              </p>
            </div>
            <button
              onClick={() => handleOpenAddModal()}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> Añadir Bloque
            </button>
          </div>

          {myEntries.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Clock size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
              <div style={{ fontSize: '13px' }}>No tienes bloques de tiempo registrados en esta fecha.</div>
              <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '4px' }}>
                Usa el cronómetro superior o haz clic en «Añadir Bloque».
              </div>
            </div>
          ) : (
            <div>
              {myEntries.map((entry) => {
                const durationMin = calculateMinutes(entry.startTime, entry.endTime);
                const cat = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.OTHER;

                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      borderBottom: '1px solid var(--border-color)',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                      <div
                        style={{
                          minWidth: '100px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {entry.startTime} - {entry.endTime || 'En curso...'}
                      </div>

                      <span
                        style={{
                          backgroundColor: cat.bg,
                          color: cat.color,
                          border: `1px solid ${cat.border}`,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cat.icon} {cat.label}
                      </span>

                      <div style={{ flex: 1, fontWeight: 500, fontSize: '13px', color: 'var(--text-main)' }}>
                        {entry.activity}
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: entry.isRunning ? '#10b981' : 'var(--text-muted)',
                        }}
                      >
                        {entry.isRunning ? '🟢 ' : ''}
                        {formatMinutes(durationMin)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {entry.isRunning && (
                        <button
                          onClick={() => handleStopTimer(entry.id)}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          Detener
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(entry)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                        title="Editar registro"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Deseas eliminar este registro de tiempo?')) {
                            onDeleteTimeEntry(entry.id);
                          }
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                        title="Eliminar registro"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. CONTENIDO: VISTA 3 - LÍNEA DE TIEMPO HORARIA */}
      {activeTab === 'timeline' && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--border-color)',
            padding: '18px',
            overflowX: 'auto',
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              Matriz Horaria del Equipo ({selectedDate})
            </h3>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
              Distribución de actividades entre las 08:00 y las 19:00 horas
            </p>
          </div>

          <div style={{ minWidth: '700px' }}>
            {/* Cabecera de horas */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '140px repeat(11, 1fr)',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '8px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
              <div>Colaborador</div>
              {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((hour) => (
                <div key={hour} style={{ textAlign: 'center' }}>
                  {hour}:00
                </div>
              ))}
            </div>

            {/* Filas */}
            {teamStatus.map(({ user, todayEntries }) => (
              <div
                key={user.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
                  padding: '10px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: user.avatarColor || '#3b82f6',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {user.name.substring(0, 1)}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {user.name}
                  </span>
                </div>

                <div
                  style={{
                    position: 'relative',
                    height: '28px',
                    backgroundColor: 'var(--bg-card-subtle, rgba(0, 0, 0, 0.2))',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {todayEntries.map((entry) => {
                    const [sh, sm] = entry.startTime.split(':').map(Number);
                    const startMin = sh * 60 + sm;
                    let endMin = startMin + 30;

                    if (entry.endTime) {
                      const [eh, em] = entry.endTime.split(':').map(Number);
                      endMin = eh * 60 + em;
                    } else {
                      const now = new Date();
                      endMin = now.getHours() * 60 + now.getMinutes();
                    }

                    const leftPct = Math.max(0, Math.min(100, ((startMin - 480) / 660) * 100));
                    const widthPct = Math.max(2, Math.min(100 - leftPct, ((endMin - startMin) / 660) * 100));
                    const cat = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.OTHER;

                    return (
                      <div
                        key={entry.id}
                        title={`${entry.startTime} - ${entry.endTime || 'Ahora'}: ${entry.activity}`}
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          top: '2px',
                          bottom: '2px',
                          backgroundColor: cat.bg,
                          color: cat.color,
                          border: `1px solid ${cat.border}`,
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '0 6px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        {entry.activity}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. MODAL DE CREACIÓN / EDICIÓN MANUAL */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingEntry ? 'Editar Bloque de Horario' : 'Registrar Horario Manual'}
        >
          <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>
                  Colaborador
                </label>
                <select
                  value={modalUserId}
                  onChange={(e) => setModalUserId(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '13px' }}
                >
                  {(state.users || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.roleTitle || u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>
                  Fecha
                </label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  required
                  className="form-control"
                  style={{ fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>
                  Hora Inicio (HH:mm)
                </label>
                <input
                  type="time"
                  value={modalStartTime}
                  onChange={(e) => setModalStartTime(e.target.value)}
                  required
                  className="form-control"
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>
                  Hora Fin (HH:mm)
                </label>
                <input
                  type="time"
                  value={modalEndTime}
                  onChange={(e) => setModalEndTime(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '13px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>
                Categoría de Actividad
              </label>
              <select
                value={modalCategory}
                onChange={(e) => setModalCategory(e.target.value as TimeCategory)}
                className="form-control"
                style={{ fontSize: '13px' }}
              >
                {(Object.keys(CATEGORY_CONFIG) as TimeCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label} — {CATEGORY_CONFIG[cat].description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>
                Descripción de la Actividad
              </label>
              <textarea
                value={modalActivity}
                onChange={(e) => setModalActivity(e.target.value)}
                placeholder="¿Qué se realizó en este rango de tiempo?"
                rows={3}
                required
                className="form-control"
                style={{ fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 600 }}
              >
                Guardar Horario
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
