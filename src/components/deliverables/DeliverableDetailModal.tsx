import React, { useState } from 'react';
import { Clock, AlertTriangle, HelpCircle, History, CheckCircle, Send, Trash2, Eye } from 'lucide-react';
import {
  AppDataState,
  Deliverable,
  DeliverableUpdate,
  EvaluationResult,
  IssueType,
  OperationalStatus,
  UserProfile,
} from '../../types/models';
import { Modal } from '../common/Modal';
import { StatusBadge, PriorityBadge, EvaluationBadge } from '../common/Badges';
import { ProgressBar } from '../common/ProgressBar';
import { calculateDelayDays, isDeliverableOverdue } from '../../services/evaluationService';

interface DeliverableDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliverable: Deliverable | null;
  state: AppDataState;
  currentUser?: UserProfile;
  onUpdateDeliverable: (id: string, updates: Partial<Deliverable>) => Promise<any>;
  onAddUpdate: (item: Omit<DeliverableUpdate, 'id' | 'createdAt'>) => Promise<any>;
  onDeleteDeliverable: (id: string) => Promise<any>;
}

export const DeliverableDetailModal: React.FC<DeliverableDetailModalProps> = ({
  isOpen,
  onClose,
  deliverable,
  state,
  currentUser,
  onUpdateDeliverable,
  onAddUpdate,
  onDeleteDeliverable,
}) => {
  if (!deliverable) return null;

  // Permisos basados en rol
  const isViewer = currentUser?.role === 'VIEWER';
  const isAdmin = currentUser?.role === 'ADMIN';
  const isOwner = deliverable.responsiblePerson === currentUser?.name || deliverable.userId === currentUser?.id;
  // PARTICIPANT puede editar sus propios entregables; ADMIN puede editar todos
  const canEdit = isAdmin || (!isViewer && isOwner);
  // Solo ADMIN puede eliminar y evaluar
  const canDelete = isAdmin;
  const canEvaluate = isAdmin;

  // Estado local para nueva actualización de seguimiento
  const [newUpdateProgress, setNewUpdateProgress] = useState<number>(deliverable.progress);
  const [newUpdateStatus, setNewUpdateStatus] = useState<OperationalStatus>(deliverable.status);
  const [newUpdateComment, setNewUpdateComment] = useState<string>('');
  const [newUpdateHasIssue, setNewUpdateHasIssue] = useState<boolean>(deliverable.hasIssue);
  const [newUpdateIssueType, setNewUpdateIssueType] = useState<IssueType>(deliverable.issueType || 'OTHER');
  const [newUpdateIssueDesc, setNewUpdateIssueDesc] = useState<string>(deliverable.issueDescription || '');
  const [newUpdateNeedsHelp, setNewUpdateNeedsHelp] = useState<boolean>(deliverable.needsHelp);
  const [newUpdateHelpDesc, setNewUpdateHelpDesc] = useState<string>(deliverable.helpDescription || '');

  // Estado para evaluación manual
  const [evalResult, setEvalResult] = useState<EvaluationResult>(deliverable.evaluation?.result || 'NOT_EVALUATED');
  const [evalComments, setEvalComments] = useState<string>(deliverable.evaluation?.comments || '');

  const delayDays = calculateDelayDays(
    deliverable.scheduledDate,
    deliverable.realDeliveryDate || undefined
  );
  const isOverdue = isDeliverableOverdue(deliverable.scheduledDate, deliverable.status);

  // Filtrar historial de actualizaciones de este entregable ordenado descendentemente
  const updates = state.deliverableUpdates
    .filter((u) => u.deliverableId === deliverable.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSaveQuickProgress = async () => {
    if (!newUpdateComment.trim()) {
      alert('Por favor escribe un breve comentario sobre el avance realizado.');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    await onAddUpdate({
      deliverableId: deliverable.id,
      date: dateStr,
      time: timeStr,
      progress: Number(newUpdateProgress),
      status: newUpdateStatus,
      comment: newUpdateComment,
      hasIssue: newUpdateHasIssue,
      issueType: newUpdateHasIssue ? newUpdateIssueType : undefined,
      issueDescription: newUpdateHasIssue ? newUpdateIssueDesc : undefined,
      needsHelp: newUpdateNeedsHelp,
      helpDescription: newUpdateNeedsHelp ? newUpdateHelpDesc : undefined,
    });

    setNewUpdateComment('');
  };

  const handleSaveEvaluation = async () => {
    const evalData = {
      result: evalResult,
      evaluationDate: new Date().toISOString().split('T')[0],
      delayDays,
      comments: evalComments,
    };

    await onUpdateDeliverable(deliverable.id, {
      evaluation: evalData,
    });
    alert('Evaluación guardada exitosamente.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ficha de Entregable: ${deliverable.name}`}
      maxWidth="780px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          {canDelete ? (
            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm(`¿Eliminar definitivamente el entregable "${deliverable.name}"?`)) {
                  onDeleteDeliverable(deliverable.id);
                  onClose();
                }
              }}
            >
              <Trash2 size={14} />
              Eliminar Entregable
            </button>
          ) : (
            <div /> // Spacer para mantener alineación
          )}
          <button className="btn btn-primary" onClick={onClose}>
            Cerrar Ficha
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Cabecera del Entregable */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                {deliverable.name}
              </div>
              {deliverable.description && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {deliverable.description}
                </div>
              )}
            </div>
            <PriorityBadge priority={deliverable.priority} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <div>
              Responsable: <strong style={{ color: '#10b981' }}>{deliverable.responsiblePerson || 'Jason'}</strong>
            </div>
            <div>
              Programado para: <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{deliverable.scheduledDate}</strong> {deliverable.dueTime && `(${deliverable.dueTime})`}
            </div>
            {deliverable.realDeliveryDate && (
              <div>
                Entrega Real: <strong style={{ color: 'var(--color-success)', fontFamily: 'monospace' }}>{deliverable.realDeliveryDate}</strong>
              </div>
            )}
            <div>
              Estado Actual: <StatusBadge status={deliverable.status} scheduledDate={deliverable.scheduledDate} />
            </div>
            {deliverable.isRecurring && (
              <div>
                Recurrencia: <span className="badge badge-purple" style={{ fontSize: '10px' }}>{deliverable.recurrenceFrequency} - {deliverable.recurrenceDay}</span>
              </div>
            )}
          </div>

          {/* Enlaces y Rutas */}
          {(deliverable.locationUrl || deliverable.locationLocalPath) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
              {deliverable.locationUrl && (
                <a
                  href={deliverable.locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px' }}
                >
                  Abrir enlace SharePoint / Web ↗
                </a>
              )}
              {deliverable.locationLocalPath && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Ruta Windows:</span>
                  <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8' }}>
                    {deliverable.locationLocalPath}
                  </code>
                </div>
              )}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span>Avance Actual</span>
              <strong>{deliverable.progress}%</strong>
            </div>
            <ProgressBar progress={deliverable.progress} height={10} />
          </div>
        </div>

        {/* Formulario de Actualización - VIEWER no puede editarlo */}
        {isViewer ? (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            <Eye size={16} style={{ color: '#f59e0b' }} />
            <span>Modo <strong>Solo Lectura</strong>. Tu rol no permite registrar actualizaciones en este entregable.</span>
          </div>
        ) : !canEdit ? (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            <Eye size={16} style={{ color: '#64748b' }} />
            <span>Solo puedes reportar avances en los entregables asignados a ti.</span>
          </div>
        ) : (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60a5fa', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={16} />
            Registrar Actualización de Seguimiento
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nuevo Estado Operativo</label>
              <select
                className="form-control"
                value={newUpdateStatus}
                onChange={(e) => setNewUpdateStatus(e.target.value as OperationalStatus)}
              >
                <option value="PENDING">Pendiente</option>
                <option value="IN_PROGRESS">En progreso</option>
                <option value="COMPLETED">Completado</option>
                <option value="BLOCKED">Bloqueado</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nuevo Avance ({newUpdateProgress}%)</label>
              <input
                type="range"
                min="0"
                max="100"
                className="form-control"
                value={newUpdateProgress}
                onChange={(e) => setNewUpdateProgress(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Comentario de la Actualización *</label>
            <input
              type="text"
              className="form-control"
              placeholder="ej. Se inició el procesamiento / Se validaron las planillas..."
              value={newUpdateComment}
              onChange={(e) => setNewUpdateComment(e.target.value)}
            />
          </div>

          {/* Sección de Problemas y Ayuda */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
            {/* Problema */}
            <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
                  ¿Tuviste algún problema?
                </span>
                <select
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', fontSize: '12px' }}
                  value={newUpdateHasIssue ? 'YES' : 'NO'}
                  onChange={(e) => setNewUpdateHasIssue(e.target.value === 'YES')}
                >
                  <option value="NO">No</option>
                  <option value="YES">Sí</option>
                </select>
              </div>

              {newUpdateHasIssue && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select
                    className="form-control"
                    style={{ fontSize: '12px', padding: '6px' }}
                    value={newUpdateIssueType}
                    onChange={(e) => setNewUpdateIssueType(e.target.value as IssueType)}
                  >
                    <option value="MISSING_INFO">Información faltante</option>
                    <option value="DEPENDENCY">Dependencia de otra área</option>
                    <option value="TECHNICAL">Problema técnico</option>
                    <option value="WORKLOAD">Carga de trabajo</option>
                    <option value="PRIORITY_CHANGE">Cambio de prioridad</option>
                    <option value="OTHER">Otro</option>
                  </select>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '12px', padding: '6px' }}
                    placeholder="Describe el problema..."
                    value={newUpdateIssueDesc}
                    onChange={(e) => setNewUpdateIssueDesc(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Necesita Ayuda */}
            <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={14} style={{ color: '#38bdf8' }} />
                  ¿Necesitas ayuda?
                </span>
                <select
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', fontSize: '12px' }}
                  value={newUpdateNeedsHelp ? 'YES' : 'NO'}
                  onChange={(e) => setNewUpdateNeedsHelp(e.target.value === 'YES')}
                >
                  <option value="NO">No</option>
                  <option value="YES">Sí</option>
                </select>
              </div>

              {newUpdateNeedsHelp && (
                <div>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '12px', padding: '6px' }}
                    placeholder="Describe qué ayuda necesitas..."
                    value={newUpdateHelpDesc}
                    onChange={(e) => setNewUpdateHelpDesc(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSaveQuickProgress}>
              <Send size={13} />
              Guardar Actualización
            </button>
          </div>
        </div>)}

        {/* Historial Cronológico de Actualizaciones */}
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)', marginBottom: '10px' }}>
            Historial de Seguimiento ({updates.length})
          </h4>

          {updates.length === 0 ? (
            <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No hay actualizaciones registradas para este entregable.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
              {updates.map((upd) => (
                <div
                  key={upd.id}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>
                      📅 <strong>{upd.date}</strong> a las {upd.time}
                    </span>
                    <span>
                      Avance: <strong>{upd.progress}%</strong> | Estado: <StatusBadge status={upd.status} />
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>{upd.comment}</div>
                  {(upd.hasIssue || upd.needsHelp) && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      {upd.hasIssue && (
                        <span className="badge badge-danger" style={{ fontSize: '10px' }}>
                          ⚠️ {upd.issueDescription || upd.issueType}
                        </span>
                      )}
                      {upd.needsHelp && (
                        <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                          🙋 {upd.helpDescription}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sección de Evaluación Manual - Solo ADMIN */}
        {canEvaluate && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10b981' }}>
              Evaluación Final de Cumplimiento (Decisión Manual)
            </h4>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Demora calculada: <strong style={{ color: delayDays > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>{delayDays} días</strong>
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Resultado Manual</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { val: 'FULFILLED', label: '🟩 Cumplió', color: 'var(--color-success)' },
                { val: 'DELAYED', label: '🟨 Retrasado', color: 'var(--color-warning)' },
                { val: 'UNFULFILLED', label: '🟥 Incumplió', color: 'var(--color-danger)' },
                { val: 'NOT_EVALUATED', label: '⬜ No evaluado', color: 'var(--text-muted)' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setEvalResult(opt.val as EvaluationResult)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-md)',
                    border: evalResult === opt.val ? `2px solid ${opt.color}` : '1px solid var(--border-color)',
                    background: evalResult === opt.val ? 'var(--bg-surface-hover)' : 'var(--bg-input)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Comentario o Justificación de Evaluación</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Criterio del evaluador..."
                value={evalComments}
                onChange={(e) => setEvalComments(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" onClick={handleSaveEvaluation}>
                Guardar Evaluación
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </Modal>
  );
};
