import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Folder,
  Copy,
  Check,
  Repeat,
  Calendar,
  User,
} from 'lucide-react';
import {
  AppDataState,
  Deliverable,
  OperationalStatus,
  PriorityLevel,
  UserProfile,
} from '../../types/models';
import { PeriodFilter } from '../../types/common';
import { StatusBadge, PriorityBadge, EvaluationBadge } from '../common/Badges';
import { ProgressBar } from '../common/ProgressBar';
import { Modal } from '../common/Modal';
import { DeliverableDetailModal } from './DeliverableDetailModal';
import {
  isDateInNext7Days,
  isDateThisMonth,
  isDateThisWeek,
  isDateToday,
} from '../../services/metricsService';
import { isDeliverableOverdue } from '../../services/evaluationService';

interface DeliverablesViewProps {
  state: AppDataState;
  currentUser: UserProfile;
  onAddDeliverable: (item: Omit<Deliverable, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  onUpdateDeliverable: (id: string, updates: Partial<Deliverable>) => Promise<any>;
  onDeleteDeliverable: (id: string) => Promise<any>;
  onAddUpdate: (item: any) => Promise<any>;
  selectedDeliverableFromProp?: Deliverable | null;
  onClearSelectedProp?: () => void;
}

export const DeliverablesView: React.FC<DeliverablesViewProps> = ({
  state,
  currentUser,
  onAddDeliverable,
  onUpdateDeliverable,
  onDeleteDeliverable,
  onAddUpdate,
  selectedDeliverableFromProp,
  onClearSelectedProp,
}) => {
  const isViewer = currentUser.role === 'VIEWER';
  const isAdmin = currentUser.role === 'ADMIN';
  // Filtros
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PUNTUAL' | 'RECURRENTE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [activeDeliverable, setActiveDeliverable] = useState<Deliverable | null>(
    selectedDeliverableFromProp || null
  );

  // Copiado al portapapeles
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Lista de usuarios asignables (excluyendo a los observadores/VIEWER como Lorena y Edgar)
  const assignableUsers = (state.users || []).filter((u) => u.role !== 'VIEWER');

  // Formulario nuevo entregable con borrador automático
  const [newForm, setNewForm] = useState<{
    name: string;
    description: string;
    responsiblePerson: string;
    type: 'PUNTUAL' | 'RECURRENTE';
    scheduledDate: string;
    dueTime: string;
    priority: PriorityLevel;
    projectId?: string;
    isRecurring: boolean;
    recurrenceFrequency: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
    recurrenceDay: string;
    locationUrl: string;
    locationLocalPath: string;
  }>(() => {
    try {
      const savedDraft = localStorage.getItem('DRAFT_NEW_DELIVERABLE');
      if (savedDraft) return JSON.parse(savedDraft);
    } catch (e) {
      /* ignore */
    }
    return {
      name: '',
      description: '',
      responsiblePerson: currentUser.role !== 'VIEWER' ? currentUser.name : (assignableUsers[0]?.name || 'Jherson'),
      type: 'PUNTUAL',
      scheduledDate: new Date().toISOString().split('T')[0],
      dueTime: '17:00',
      priority: 'HIGH',
      projectId: '',
      isRecurring: false,
      recurrenceFrequency: 'SEMANAL',
      recurrenceDay: 'Viernes',
      locationUrl: '',
      locationLocalPath: '',
    };
  });

  // Guardar borrador automáticamente al escribir
  const updateFormAndSaveDraft = (patch: Partial<typeof newForm>) => {
    setNewForm((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('DRAFT_NEW_DELIVERABLE', JSON.stringify(next));
      } catch (e) {
        /* ignore */
      }
      return next;
    });
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim()) return;

    await onAddDeliverable({
      name: newForm.name,
      description: newForm.description,
      responsiblePerson: newForm.responsiblePerson || currentUser.name,
      type: newForm.isRecurring ? 'RECURRENTE' : 'PUNTUAL',
      scheduledDate: newForm.scheduledDate,
      dueTime: newForm.dueTime || '17:00',
      status: 'PENDING',
      progress: 0,
      priority: newForm.priority,
      projectId: newForm.projectId || undefined,
      isRecurring: newForm.isRecurring,
      recurrenceFrequency: newForm.isRecurring ? newForm.recurrenceFrequency : undefined,
      recurrenceDay: newForm.isRecurring ? newForm.recurrenceDay : undefined,
      locationUrl: newForm.locationUrl || undefined,
      locationLocalPath: newForm.locationLocalPath || undefined,
      hasIssue: false,
      needsHelp: false,
      isDemo: false,
    });

    try {
      localStorage.removeItem('DRAFT_NEW_DELIVERABLE');
    } catch (e) {
      /* ignore */
    }
    setIsNewModalOpen(false);
    setNewForm({
      name: '',
      description: '',
      responsiblePerson: currentUser.role !== 'VIEWER' ? currentUser.name : (assignableUsers[0]?.name || 'Jherson'),
      type: 'PUNTUAL',
      scheduledDate: new Date().toISOString().split('T')[0],
      dueTime: '17:00',
      priority: 'HIGH',
      projectId: '',
      isRecurring: false,
      recurrenceFrequency: 'SEMANAL',
      recurrenceDay: 'Viernes',
      locationUrl: '',
      locationLocalPath: '',
    });
  };

  // Filtrado
  const filteredDeliverables = state.deliverables.filter((d) => {
    // 1. Periodo
    if (periodFilter === 'TODAY' && !isDateToday(d.scheduledDate)) return false;
    if (periodFilter === 'THIS_WEEK' && !isDateThisWeek(d.scheduledDate)) return false;
    if (periodFilter === 'THIS_MONTH' && !isDateThisMonth(d.scheduledDate)) return false;
    if (periodFilter === 'NEXT_7_DAYS' && !isDateInNext7Days(d.scheduledDate)) return false;
    if (periodFilter === 'OVERDUE' && !isDeliverableOverdue(d.scheduledDate, d.status)) return false;

    // 2. Estado
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;

    // 3. Prioridad
    if (priorityFilter !== 'ALL' && d.priority !== priorityFilter) return false;

    // 4. Tipo
    if (typeFilter !== 'ALL') {
      const isRec = d.isRecurring || d.type === 'RECURRENTE';
      if (typeFilter === 'RECURRENTE' && !isRec) return false;
      if (typeFilter === 'PUNTUAL' && isRec) return false;
    }

    // 5. Búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = d.name.toLowerCase().includes(q);
      const matchDesc = d.description.toLowerCase().includes(q);
      const matchResp = (d.responsiblePerson || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchResp) return false;
    }

    return true;
  });

  return (
    <div>
      {/* Barra de Filtros */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar entregable por nombre, descripción o responsable..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ padding: '6px 10px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="form-control"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
          >
            <option value="ALL">Todos los Tipos</option>
            <option value="PUNTUAL">Puntuales</option>
            <option value="RECURRENTE">Recurrentes</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-control"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
          >
            <option value="ALL">Todos los Estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="IN_PROGRESS">En Proceso</option>
            <option value="COMPLETED">Completado</option>
            <option value="BLOCKED">Bloqueado</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="form-control"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
          >
            <option value="ALL">Todas las Prioridades</option>
            <option value="URGENT">Urgente</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Baja</option>
          </select>

          {/* Solo ADMIN y PARTICIPANT pueden crear entregables */}
          {!isViewer && (
            <button className="btn btn-primary" onClick={() => setIsNewModalOpen(true)}>
              <Plus size={14} />
              <span>Nuevo Entregable</span>
            </button>
          )}
        </div>
      </div>

      {/* Píldoras de Filtro Temporal */}
      <div className="pill-group" style={{ marginBottom: '16px' }}>
        {[
          { id: 'ALL', label: 'Todos los periodos' },
          { id: 'TODAY', label: 'Para Hoy' },
          { id: 'THIS_WEEK', label: 'Esta Semana' },
          { id: 'NEXT_7_DAYS', label: 'Próximos 7 días' },
          { id: 'THIS_MONTH', label: 'Este Mes' },
          { id: 'OVERDUE', label: 'Vencidos / Atrasados' },
        ].map((pill) => (
          <button
            key={pill.id}
            className={`pill-btn ${periodFilter === pill.id ? 'active' : ''}`}
            onClick={() => setPeriodFilter(pill.id as PeriodFilter)}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Tabla de Entregables */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Entregable y Tipo</th>
              <th>Responsable</th>
              <th>Fecha y Hora Límite</th>
              <th>Estado y Avance</th>
              <th>Prioridad</th>
              <th>Ubicación / Ruta</th>
              <th>Problemas / Ayuda</th>
              <th style={{ textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeliverables.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No se encontraron entregables con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredDeliverables.map((d) => {
                const isOverdue = isDeliverableOverdue(d.scheduledDate, d.status);
                const isRec = d.isRecurring || d.type === 'RECURRENTE';

                return (
                  <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => setActiveDeliverable(d)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        {isRec ? (
                          <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                            <Repeat size={10} style={{ marginRight: '3px' }} />
                            {d.recurrenceFrequency || 'Recurrente'} ({d.recurrenceDay || 'Periódico'})
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                            Puntual
                          </span>
                        )}
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{d.name}</span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          maxWidth: '300px',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {d.description}
                      </div>
                    </td>

                    <td>
                      <span className="badge badge-success" style={{ fontSize: '11px' }}>
                        <User size={10} style={{ marginRight: '3px' }} />
                        {d.responsiblePerson || 'Jason'}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span
                          style={{
                            fontWeight: isOverdue ? 700 : 500,
                            color: isOverdue ? 'var(--color-danger)' : 'var(--text-main)',
                            fontSize: '13px',
                          }}
                        >
                          {d.scheduledDate}
                        </span>
                        {d.dueTime && (
                          <span style={{ fontSize: '11px', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} />
                            {d.dueTime}
                          </span>
                        )}
                        {isOverdue && (
                          <span className="badge badge-danger" style={{ fontSize: '9px', marginTop: '2px', padding: '1px 5px' }}>
                            ¡Vencido!
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ minWidth: '130px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <StatusBadge status={d.status} />
                        <ProgressBar progress={d.progress} height={5} showText />
                      </div>
                    </td>

                    <td>
                      <PriorityBadge priority={d.priority} />
                    </td>

                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {d.locationUrl && (
                          <a
                            href={d.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                            title="Abrir ubicación de SharePoint / Web"
                          >
                            <ExternalLink size={11} />
                            <span>SharePoint</span>
                          </a>
                        )}

                        {d.locationLocalPath && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '2px 8px', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                            onClick={() => handleCopyPath(d.locationLocalPath!)}
                            title={`Ruta Local Windows: ${d.locationLocalPath} (Haz clic para copiar)`}
                          >
                            {copiedPath === d.locationLocalPath ? (
                              <>
                                <Check size={11} style={{ color: '#10b981' }} />
                                <span style={{ color: '#10b981' }}>Copiado</span>
                              </>
                            ) : (
                              <>
                                <Folder size={11} />
                                <span>Ruta Windows</span>
                              </>
                            )}
                          </button>
                        )}

                        {!d.locationUrl && !d.locationLocalPath && (
                          <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>-</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {d.hasIssue && (
                          <span className="badge badge-danger" title={`Problema: ${d.issueDescription || d.issueType}`}>
                            <AlertTriangle size={12} />
                            <span>Incidencia</span>
                          </span>
                        )}
                        {d.needsHelp && (
                          <span className="badge badge-warning" title={`Ayuda requerida: ${d.helpDescription}`}>
                            <HelpCircle size={12} />
                            <span>Ayuda</span>
                          </span>
                        )}
                        {!d.hasIssue && !d.needsHelp && (
                          <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Normal</span>
                        )}
                      </div>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDeliverable(d);
                        }}
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Nuevo Entregable */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Registrar Nuevo Entregable / Reporte"
        maxWidth="680px"
      >
        <form onSubmit={handleCreateDeliverable}>
          <div className="form-group">
            <label className="form-label">Nombre del Entregable *</label>
            <input
              type="text"
              placeholder="ej. Indicadores semanales de flota y combustible"
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              rows={2}
              placeholder="Breve descripción del entregable, formato esperado o destinatario..."
              value={newForm.description}
              onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
              className="form-control"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Responsable *</label>
              <select
                value={newForm.responsiblePerson}
                onChange={(e) => updateFormAndSaveDraft({ responsiblePerson: e.target.value })}
                className="form-control"
                required
              >
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.roleTitle || u.area})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Prioridad</label>
              <select
                value={newForm.priority}
                onChange={(e) => setNewForm({ ...newForm, priority: e.target.value as PriorityLevel })}
                className="form-control"
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>

          {/* Selector de Recurrencia */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={newForm.isRecurring}
                onChange={(e) => setNewForm({ ...newForm, isRecurring: e.target.checked })}
              />
              <Repeat size={14} style={{ color: '#a855f7' }} />
              <span>¿Es un Entregable Recurrente? (ej. Reporte semanal cada viernes a las 17:00)</span>
            </label>

            {newForm.isRecurring && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Frecuencia</label>
                  <select
                    value={newForm.recurrenceFrequency}
                    onChange={(e) => setNewForm({ ...newForm, recurrenceFrequency: e.target.value as any })}
                    className="form-control"
                  >
                    <option value="DIARIO">Diario</option>
                    <option value="SEMANAL">Semanal</option>
                    <option value="QUINCENAL">Quincenal</option>
                    <option value="MENSUAL">Mensual</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Día de Entrega / Regla</label>
                  <input
                    type="text"
                    placeholder="ej. Viernes, Día 30 de cada mes"
                    value={newForm.recurrenceDay}
                    onChange={(e) => setNewForm({ ...newForm, recurrenceDay: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Próxima Fecha Límite *</label>
              <input
                type="date"
                value={newForm.scheduledDate}
                onChange={(e) => setNewForm({ ...newForm, scheduledDate: e.target.value })}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hora Límite (HH:mm)</label>
              <input
                type="time"
                value={newForm.dueTime}
                onChange={(e) => setNewForm({ ...newForm, dueTime: e.target.value })}
                className="form-control"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Ubicación / URL SharePoint</label>
              <input
                type="url"
                placeholder="https://sharepoint.empresa.com/..."
                value={newForm.locationUrl}
                onChange={(e) => setNewForm({ ...newForm, locationUrl: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ruta Local de Windows (Referencia)</label>
              <input
                type="text"
                placeholder="ej. C:\ControlGestion\Reporte.xlsx"
                value={newForm.locationLocalPath}
                onChange={(e) => setNewForm({ ...newForm, locationLocalPath: e.target.value })}
                className="form-control"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsNewModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Registrar Entregable
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Detalle y Actualizaciones */}
      <DeliverableDetailModal
        isOpen={Boolean(activeDeliverable)}
        onClose={() => {
          setActiveDeliverable(null);
          if (onClearSelectedProp) onClearSelectedProp();
        }}
        deliverable={activeDeliverable}
        state={state}
        currentUser={currentUser}
        onUpdateDeliverable={onUpdateDeliverable}
        onAddUpdate={onAddUpdate}
        onDeleteDeliverable={onDeleteDeliverable}
      />
    </div>
  );
};
