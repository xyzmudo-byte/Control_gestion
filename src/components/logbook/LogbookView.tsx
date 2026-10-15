import React, { useState } from 'react';
import {
  BookmarkCheck,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Bell,
  BellRing,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  User,
} from 'lucide-react';
import { AppDataState, LogbookItem, UserProfile } from '../../types/models';
import { Modal } from '../common/Modal';

interface LogbookViewProps {
  state: AppDataState;
  currentUser: UserProfile;
  onAddLogbookItem: (item: Omit<LogbookItem, 'id' | 'createdAt'>) => Promise<any>;
  onUpdateLogbookItem: (id: string, updates: Partial<LogbookItem>) => Promise<any>;
  onDeleteLogbookItem: (id: string) => Promise<any>;
}

export const LogbookView: React.FC<LogbookViewProps> = ({
  state,
  currentUser,
  onAddLogbookItem,
  onUpdateLogbookItem,
  onDeleteLogbookItem,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Filtros
  const [filterMode, setFilterMode] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'TODAY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [userScope, setUserScope] = useState<'MINE' | 'ALL'>('MINE');

  // Input rápido superior para captura ágil de notas/recordatorios
  const [quickText, setQuickText] = useState('');
  const [quickTime, setQuickTime] = useState('');

  // Modal para edición o creación detallada
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LogbookItem | null>(null);
  const [form, setForm] = useState<{
    reminderText: string;
    date: string;
    time: string;
    note: string;
    remindMe: boolean;
    status: 'PENDING' | 'COMPLETED';
  }>({
    reminderText: '',
    date: todayStr,
    time: '',
    note: '',
    remindMe: true,
    status: 'PENDING',
  });

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim()) return;

    await onAddLogbookItem({
      userId: currentUser.id,
      reminderText: quickText.trim(),
      date: todayStr,
      time: quickTime || undefined,
      status: 'PENDING',
      remindMe: true,
      isDemo: false,
    });

    setQuickText('');
    setQuickTime('');
  };

  const handleToggleStatus = async (item: LogbookItem) => {
    const newStatus = item.status === 'PENDING' ? 'COMPLETED' : 'PENDING';
    await onUpdateLogbookItem(item.id, { status: newStatus });
  };

  const handleOpenModal = (item?: LogbookItem) => {
    if (item) {
      setEditingItem(item);
      setForm({
        reminderText: item.reminderText,
        date: item.date,
        time: item.time || '',
        note: item.note || '',
        remindMe: item.remindMe,
        status: item.status,
      });
    } else {
      setEditingItem(null);
      setForm({
        reminderText: '',
        date: todayStr,
        time: '',
        note: '',
        remindMe: true,
        status: 'PENDING',
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reminderText.trim()) return;

    if (editingItem) {
      await onUpdateLogbookItem(editingItem.id, {
        reminderText: form.reminderText.trim(),
        date: form.date,
        time: form.time || undefined,
        note: form.note || undefined,
        remindMe: form.remindMe,
        status: form.status,
      });
    } else {
      await onAddLogbookItem({
        userId: currentUser.id,
        reminderText: form.reminderText.trim(),
        date: form.date,
        time: form.time || undefined,
        note: form.note || undefined,
        remindMe: form.remindMe,
        status: form.status,
        isDemo: false,
      });
    }

    setIsModalOpen(false);
  };

  // Filtrado de items
  const userItems = state.logbook.filter((item) => {
    if (userScope === 'MINE' && item.userId !== currentUser.id) return false;
    return true;
  });

  const filteredItems = userItems.filter((item) => {
    if (filterMode === 'PENDING' && item.status !== 'PENDING') return false;
    if (filterMode === 'COMPLETED' && item.status !== 'COMPLETED') return false;
    if (filterMode === 'TODAY' && item.date !== todayStr) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = item.reminderText.toLowerCase().includes(q);
      const matchNote = (item.note || '').toLowerCase().includes(q);
      if (!matchText && !matchNote) return false;
    }

    return true;
  });

  // Contador de recordatorios pendientes para hoy con alerta visual
  const todayDueCount = userItems.filter(
    (i) => i.status === 'PENDING' && i.date === todayStr && i.remindMe
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Alerta Visual de Recordatorios para Hoy */}
      {todayDueCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: 'var(--radius-md)',
            color: '#fbbf24',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BellRing size={18} style={{ color: '#fbbf24' }} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              Tienes <strong>{todayDueCount} recordatorio(s)</strong> pendientes para el día de hoy.
            </span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setFilterMode('TODAY')}
            style={{ fontSize: '12px', borderColor: '#f59e0b', color: '#fbbf24' }}
          >
            Ver Solo Hoy
          </button>
        </div>
      )}

      {/* Captura Rápida de Recordatorio */}
      <form
        onSubmit={handleQuickAdd}
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          backgroundColor: 'var(--bg-card)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
          <BookmarkCheck size={20} />
        </div>

        <input
          type="text"
          placeholder="Captura rápida: ej. Recordar preguntar a COP por el reporte de kilómetros..."
          value={quickText}
          onChange={(e) => setQuickText(e.target.value)}
          className="form-control"
          style={{ flex: 1 }}
        />

        <input
          type="time"
          value={quickTime}
          onChange={(e) => setQuickTime(e.target.value)}
          className="form-control"
          style={{ width: '120px' }}
          title="Hora opcional"
        />

        <button type="submit" className="btn btn-primary" disabled={!quickText.trim()}>
          <Plus size={14} />
          <span>Anotar</span>
        </button>

        <button type="button" className="btn btn-secondary" onClick={() => handleOpenModal()} title="Crear con notas avanzadas">
          Detallado
        </button>
      </form>

      {/* Filtros */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar en mi bitácora..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ padding: '6px 10px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="pill-group">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'TODAY', label: 'Para Hoy' },
              { id: 'PENDING', label: 'Pendientes' },
              { id: 'COMPLETED', label: 'Realizados' },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                className={`pill-btn ${filterMode === pill.id ? 'active' : ''}`}
                onClick={() => setFilterMode(pill.id as any)}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <select
            value={userScope}
            onChange={(e) => setUserScope(e.target.value as any)}
            className="form-control"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
          >
            <option value="MINE">Mi Bitácora ({currentUser.name})</option>
            <option value="ALL">Todas las Bitácoras (Equipo)</option>
          </select>
        </div>
      </div>

      {/* Lista de Recordatorios */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredItems.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
            }}
          >
            <BookmarkCheck size={36} style={{ color: 'var(--text-subtle)', marginBottom: '8px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>No hay notas ni recordatorios registrados</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Usa la barra superior para registrar rápidamente lo que necesitas hacer durante el día.
            </div>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCompleted = item.status === 'COMPLETED';
            const isToday = item.date === todayStr;
            const owner = state.users.find((u) => u.id === item.userId);

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  backgroundColor: isCompleted ? 'rgba(30, 41, 59, 0.4)' : 'var(--bg-card)',
                  border: `1px solid ${isToday && !isCompleted ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-md)',
                  gap: '14px',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                  {/* Checkbox de Estado */}
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => handleToggleStatus(item)}
                    style={{
                      cursor: 'pointer',
                      width: '18px',
                      height: '18px',
                      marginTop: '2px',
                      accentColor: 'var(--primary-accent)',
                    }}
                    title={isCompleted ? 'Marcar como pendiente' : 'Marcar como realizado'}
                  />

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        lineHeight: 1.4,
                      }}
                    >
                      {item.reminderText}
                    </div>

                    {item.note && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {item.note}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '11px', color: 'var(--text-subtle)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={11} />
                        {item.date === todayStr ? <strong style={{ color: '#fbbf24' }}>Hoy</strong> : item.date}
                      </span>

                      {item.time && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={11} />
                          {item.time}
                        </span>
                      )}

                      {owner && owner.id !== currentUser.id && (
                        <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                          <User size={10} style={{ marginRight: '3px' }} />
                          {owner.name}
                        </span>
                      )}

                      {item.remindMe && !isCompleted && (
                        <span className="badge badge-warning" style={{ fontSize: '9px', padding: '1px 5px' }}>
                          <Bell size={9} style={{ marginRight: '2px' }} />
                          Alerta activa
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(item)} title="Editar">
                    <Edit2 size={12} />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => onDeleteLogbookItem(item.id)} title="Eliminar">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Crear / Editar Recordatorio */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Editar Recordatorio de Bitácora' : 'Nuevo Recordatorio de Bitácora'}
      >
        <form onSubmit={handleSaveModal}>
          <div className="form-group">
            <label className="form-label">Texto del Recordatorio *</label>
            <input
              type="text"
              placeholder="ej. Recordar comentar los tiempos de respuesta en la reunión..."
              value={form.reminderText}
              onChange={(e) => setForm({ ...form, reminderText: e.target.value })}
              className="form-control"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
              <label className="form-label">Hora (Opcional)</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="form-control"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nota Adicional / Contexto</label>
            <textarea
              rows={3}
              placeholder="Detalles adicionales o nombres de personas involucradas..."
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="form-control"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="form-control"
              >
                <option value="PENDING">Pendiente</option>
                <option value="COMPLETED">Realizado</option>
              </select>
            </div>

            <div style={{ paddingTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.remindMe}
                  onChange={(e) => setForm({ ...form, remindMe: e.target.checked })}
                />
                <span>Mostrar alerta visual</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Recordatorio
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
