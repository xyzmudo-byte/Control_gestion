import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  Video,
  FileText,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCheck,
} from 'lucide-react';
import { AppDataState, Meeting } from '../../types/models';
import { Modal } from '../common/Modal';

interface MeetingsViewProps {
  state: AppDataState;
  onAddMeeting: (item: Omit<Meeting, 'id' | 'createdAt'>) => Promise<any>;
  onUpdateMeeting: (id: string, updates: Partial<Meeting>) => Promise<any>;
  onDeleteMeeting: (id: string) => Promise<any>;
}

// Helper para calcular duración en formato legible (ej. "1h 30m")
const calculateDuration = (startTime: string, endTime: string): string => {
  if (!startTime || !endTime) return '';
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return '';

  let diffMinutes = endH * 60 + endM - (startH * 60 + startM);
  if (diffMinutes < 0) diffMinutes += 24 * 60; // caso cruce de medianoche

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes} min`;
};

export const MeetingsView: React.FC<MeetingsViewProps> = ({
  state,
  onAddMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'VIRTUAL' | 'FISICA'>('ALL');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  // Formulario
  const [form, setForm] = useState<{
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    type: 'FISICA' | 'VIRTUAL';
    locationOrUrl: string;
    participants: string;
    description: string;
    agreements: string;
  }>({
    title: '',
    date: todayStr,
    startTime: '10:00',
    endTime: '11:00',
    type: 'VIRTUAL',
    locationOrUrl: 'https://teams.microsoft.com/...',
    participants: 'Administrador Maestro, Ludwin, Kathy, Katha',
    description: '',
    agreements: '',
  });

  const handleOpenModal = (m?: Meeting) => {
    if (m) {
      setEditingMeeting(m);
      setForm({
        title: m.title,
        date: m.date,
        startTime: m.startTime,
        endTime: m.endTime,
        type: m.type,
        locationOrUrl: m.locationOrUrl,
        participants: m.participants.join(', '),
        description: m.description,
        agreements: m.agreements,
      });
    } else {
      setEditingMeeting(null);
      setForm({
        title: '',
        date: todayStr,
        startTime: '10:00',
        endTime: '11:00',
        type: 'VIRTUAL',
        locationOrUrl: 'https://teams.microsoft.com/...',
        participants: 'Administrador Maestro, Ludwin, Kathy, Katha',
        description: '',
        agreements: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const participantsArray = form.participants
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    if (editingMeeting) {
      await onUpdateMeeting(editingMeeting.id, {
        title: form.title.trim(),
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        type: form.type,
        locationOrUrl: form.locationOrUrl.trim(),
        participants: participantsArray,
        description: form.description.trim(),
        agreements: form.agreements.trim(),
      });
    } else {
      await onAddMeeting({
        title: form.title.trim(),
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        type: form.type,
        locationOrUrl: form.locationOrUrl.trim(),
        participants: participantsArray,
        description: form.description.trim(),
        agreements: form.agreements.trim(),
        isDemo: false,
      });
    }

    setIsModalOpen(false);
  };

  const filteredMeetings = state.meetings
    .filter((m) => {
      if (typeFilter !== 'ALL' && m.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        const matchAgree = m.agreements.toLowerCase().includes(q);
        const matchPart = m.participants.some((p) => p.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchAgree && !matchPart) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.date + 'T' + b.startTime).getTime() - new Date(a.date + 'T' + a.startTime).getTime());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Barra de Filtros */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por título, participantes, acuerdos o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ padding: '6px 10px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="form-control"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
          >
            <option value="ALL">Todas las Reuniones</option>
            <option value="VIRTUAL">Solo Virtuales</option>
            <option value="FISICA">Solo Presenciales</option>
          </select>

          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={14} />
            <span>Programar / Registrar Reunión</span>
          </button>
        </div>
      </div>

      {/* Lista de Reuniones e Historial */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredMeetings.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Users size={36} style={{ color: 'var(--text-subtle)', marginBottom: '8px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>No hay reuniones registradas</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Puedes programar nuevas sesiones o registrar el acta y acuerdos de reuniones realizadas.
            </div>
          </div>
        ) : (
          filteredMeetings.map((m) => {
            const duration = calculateDuration(m.startTime, m.endTime);
            const isToday = m.date === todayStr;
            const isFuture = m.date >= todayStr;

            return (
              <div
                key={m.id}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: `1px solid ${isToday ? 'rgba(56, 189, 248, 0.4)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Cabecera de la Reunión */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className={`badge ${m.type === 'VIRTUAL' ? 'badge-info' : 'badge-purple'}`} style={{ fontSize: '11px' }}>
                        {m.type === 'VIRTUAL' ? <Video size={11} style={{ marginRight: '3px' }} /> : <MapPin size={11} style={{ marginRight: '3px' }} />}
                        {m.type === 'VIRTUAL' ? 'Virtual' : 'Presencial'}
                      </span>

                      {isToday && (
                        <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                          Hoy
                        </span>
                      )}

                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        {m.title}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        <strong>{m.date}</strong>
                      </span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        <span>
                          {m.startTime} - {m.endTime}
                        </span>
                        {duration && <span className="badge badge-neutral" style={{ fontSize: '10px' }}>{duration}</span>}
                      </span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {m.type === 'VIRTUAL' ? <Video size={12} /> : <MapPin size={12} />}
                        {m.locationOrUrl.startsWith('http') ? (
                          <a
                            href={m.locationOrUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#38bdf8', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '3px' }}
                          >
                            <span>Enlace de Conexión</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span>{m.locationOrUrl}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(m)} title="Editar reunión y acuerdos">
                      <Edit2 size={12} />
                      <span>Editar</span>
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (confirm(`¿Eliminar registro de la reunión "${m.title}"?`)) onDeleteMeeting(m.id);
                      }}
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Participantes y Descripción */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {m.description && (
                    <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                      {m.description}
                    </div>
                  )}

                  {m.participants.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: 600 }}>Participantes:</span>
                      {m.participants.map((p, idx) => (
                        <span key={idx} className="badge badge-neutral" style={{ fontSize: '10px' }}>
                          <Users size={10} style={{ marginRight: '3px' }} />
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ACUERDOS DE REUNIÓN (Texto libre / lista simple) */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    <CheckCheck size={14} />
                    <span>Acuerdos de Reunión</span>
                  </div>

                  {m.agreements ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                      {m.agreements}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                      Sin acuerdos registrados aún. Haz clic en "Editar" para registrar lo conversado.
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Crear / Editar Reunión */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMeeting ? 'Editar Registro de Reunión' : 'Programar / Registrar Reunión'}
        maxWidth="680px"
      >
        <form onSubmit={handleSaveMeeting}>
          <div className="form-group">
            <label className="form-label">Nombre / Tema de la Reunión *</label>
            <input
              type="text"
              placeholder="ej. Coordinación semanal de Informática Operacional"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="form-control"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Fecha *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hora Inicio *</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hora Fin *</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="form-control"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Tipo de Reunión</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="form-control"
              >
                <option value="VIRTUAL">Virtual (Teams / Meet / Zoom)</option>
                <option value="FISICA">Presencial</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Lugar o Enlace de Conexión *</label>
              <input
                type="text"
                placeholder="ej. https://teams.microsoft.com/... o Sala de Juntas 2"
                value={form.locationOrUrl}
                onChange={(e) => setForm({ ...form, locationOrUrl: e.target.value })}
                className="form-control"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Participantes (separados por coma)</label>
            <input
              type="text"
              placeholder="ej. Administrador Maestro, Jason, Carlos, María"
              value={form.participants}
              onChange={(e) => setForm({ ...form, participants: e.target.value })}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción Breve</label>
            <textarea
              rows={2}
              placeholder="Temas a tratar o contexto general de la sesión..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="form-control"
            />
          </div>

          {/* ACUERDOS DE REUNIÓN */}
          <div className="form-group">
            <label className="form-label" style={{ color: '#38bdf8', fontWeight: 700 }}>
              Acuerdos de Reunión (Registro de texto libre o lista)
            </label>
            <textarea
              rows={4}
              placeholder={`• COP enviará la información actualizada el jueves.\n• IO validará los tiempos de respuesta.\n• Se revisará nuevamente la próxima semana.`}
              value={form.agreements}
              onChange={(e) => setForm({ ...form, agreements: e.target.value })}
              className="form-control"
            />
            <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '4px' }}>
              Los acuerdos son un registro documental libre de lo acordado (no generan tareas forzadas automáticamente).
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Reunión
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
