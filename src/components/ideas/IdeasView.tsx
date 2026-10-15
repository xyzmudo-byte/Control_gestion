import React, { useState } from 'react';
import { Plus, Lightbulb, Edit2, Trash2, Rocket } from 'lucide-react';
import { AppDataState, Idea, IdeaStatus, UserProfile } from '../../types/models';
import { Modal } from '../common/Modal';

interface IdeasViewProps {
  state: AppDataState;
  currentUser: UserProfile;
  onAddIdea: (item: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  onUpdateIdea: (id: string, updates: Partial<Idea>) => Promise<any>;
  onDeleteIdea: (id: string) => Promise<any>;
  onConvertToProject: (ideaId: string) => Promise<any>;
}

export const IdeasView: React.FC<IdeasViewProps> = ({
  state,
  currentUser,
  onAddIdea,
  onUpdateIdea,
  onDeleteIdea,
  onConvertToProject,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Input rápido
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState('Mejora Continua');

  // Formulario modal con borrador automático
  const [ideaForm, setIdeaForm] = useState<{
    title: string;
    description: string;
    date: string;
    category: string;
    status: IdeaStatus;
    noteText: string;
  }>(() => {
    try {
      const savedDraft = localStorage.getItem('DRAFT_NEW_IDEA');
      if (savedDraft) return JSON.parse(savedDraft);
    } catch (e) {
      /* ignore */
    }
    return {
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      category: 'Mejora Continua',
      status: 'IDEA',
      noteText: '',
    };
  });

  const updateIdeaFormAndSaveDraft = (patch: Partial<typeof ideaForm>) => {
    setIdeaForm((prev) => {
      const next = { ...prev, ...patch };
      if (!editingIdea) {
        try {
          localStorage.setItem('DRAFT_NEW_IDEA', JSON.stringify(next));
        } catch (e) {
          /* ignore */
        }
      }
      return next;
    });
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) {
      alert('Por favor ingresa un título o descripción para la idea.');
      return;
    }

    try {
      await onAddIdea({
        title: quickTitle.trim(),
        description: 'Registrada mediante captura rápida.',
        date: new Date().toISOString().split('T')[0],
        category: quickCategory.trim() || 'Mejora Continua',
        status: 'IDEA',
        creator: currentUser.name,
        isDemo: false,
      });
      setQuickTitle('');
    } catch (err) {
      console.error('Error al capturar idea rápida:', err);
      alert('Hubo un inconveniente al guardar la idea. Revisa la conexión.');
    }
  };

  const handleOpenEdit = (idea: Idea) => {
    setEditingIdea(idea);
    setIdeaForm({
      title: idea.title,
      description: idea.description,
      date: idea.date,
      category: idea.category,
      status: idea.status,
      noteText: idea.commentsList && idea.commentsList.length > 0 ? idea.commentsList[0].text : '',
    });
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingIdea(null);
    let initialForm = {
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      category: 'Mejora Continua',
      status: 'IDEA' as IdeaStatus,
      noteText: '',
    };
    try {
      const savedDraft = localStorage.getItem('DRAFT_NEW_IDEA');
      if (savedDraft) initialForm = JSON.parse(savedDraft);
    } catch (e) {
      /* ignore */
    }
    setIdeaForm(initialForm);
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!ideaForm.title.trim()) {
      alert('Por favor ingresa el título de la idea.');
      return;
    }

    const commentsList = ideaForm.noteText.trim()
      ? [{ id: `cmt-${Date.now()}`, author: currentUser.name, text: ideaForm.noteText.trim(), createdAt: new Date().toISOString() }]
      : undefined;

    try {
      if (editingIdea) {
        await onUpdateIdea(editingIdea.id, {
          title: ideaForm.title,
          description: ideaForm.description,
          date: ideaForm.date,
          category: ideaForm.category,
          status: ideaForm.status,
          ...(commentsList ? { commentsList } : {}),
        });
      } else {
        await onAddIdea({
          title: ideaForm.title,
          description: ideaForm.description,
          date: ideaForm.date,
          category: ideaForm.category,
          status: ideaForm.status,
          creator: currentUser.name,
          commentsList,
          isDemo: false,
        });
        try {
          localStorage.removeItem('DRAFT_NEW_IDEA');
        } catch (e) {
          /* ignore */
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error al guardar la idea:', err);
      alert('Hubo un inconveniente al guardar la idea.');
    }
  };

  const handleConvertToProject = async (idea: Idea) => {
    if (!confirm(`¿Convertir la idea "${idea.title}" en un nuevo Proyecto?`)) return;
    setConvertingId(idea.id);
    await onConvertToProject(idea.id);
    setConvertingId(null);
  };

  const categories = Array.from(new Set(state.ideas.map((i) => i.category)));

  const filteredIdeas = state.ideas.filter((i) => {
    if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && i.category !== categoryFilter) return false;
    return true;
  });

  const getStatusBadge = (status: IdeaStatus) => {
    switch (status) {
      case 'IMPLEMENTED':
        return <span className="badge badge-success">✓ Implementada</span>;
      case 'IN_DEVELOPMENT':
        return <span className="badge badge-info">⚡ En desarrollo</span>;
      case 'EVALUATING':
        return <span className="badge badge-warning">🧐 En evaluación</span>;
      case 'IDEA':
      default:
        return <span className="badge badge-purple">✨ Idea</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Barra de Captura Rápida */}
      <form
        onSubmit={handleQuickAdd}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ color: '#facc15' }}>
          <Lightbulb size={24} />
        </div>
        <input
          type="text"
          className="form-control"
          style={{ flex: 1, minWidth: '240px' }}
          placeholder="¿Qué idea o propuesta se te ocurrió durante la semana? Escríbela aquí..."
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
        />
        <input
          type="text"
          className="form-control"
          style={{ width: '180px' }}
          placeholder="Categoría"
          value={quickCategory}
          onChange={(e) => setQuickCategory(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          <Plus size={16} />
          Capturar Idea
        </button>
      </form>

      {/* 2. Filtros y Control */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Estado:
          </span>
          <div className="pill-group">
            {[
              { id: 'ALL', label: 'Todas' },
              { id: 'IDEA', label: 'Nuevas' },
              { id: 'EVALUATING', label: 'En Evaluación' },
              { id: 'IN_DEVELOPMENT', label: 'En Desarrollo' },
              { id: 'IMPLEMENTED', label: 'Implementadas' },
            ].map((s) => (
              <button
                key={s.id}
                className={`pill-btn ${statusFilter === s.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="form-control"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">Categoría: Todas</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button className="btn btn-secondary btn-sm" onClick={handleOpenNew}>
            <Plus size={14} />
            Idea Detallada
          </button>
        </div>
      </div>

      {/* 3. Grid de Tarjetas de Ideas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {filteredIdeas.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
            No hay ideas registradas con los filtros actuales.
          </div>
        ) : (
          filteredIdeas.map((idea) => (
            <div
              key={idea.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{idea.title}</span>
                {getStatusBadge(idea.status)}
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-muted)', flex: 1 }}>{idea.description}</div>

              {idea.commentsList && idea.commentsList.length > 0 && (
                <div style={{ fontSize: '11px', background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: '4px', color: 'var(--text-main)' }}>
                  💬 <strong>Nota:</strong> {idea.commentsList[0].text}
                </div>
              )}

              {idea.convertedToProjectId && (
                <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Rocket size={11} /> Convertida en proyecto
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', fontSize: '11px', color: 'var(--text-subtle)' }}>
                <span className="badge badge-purple" style={{ fontSize: '10px' }}>{idea.category}</span>
                <span>📅 {idea.date}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                {!idea.convertedToProjectId && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleConvertToProject(idea)}
                    disabled={convertingId === idea.id}
                    title="Convertir en Proyecto"
                    style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                  >
                    <Rocket size={12} />
                    {convertingId === idea.id ? 'Convirtiendo...' : 'A Proyecto'}
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(idea)}>
                  <Edit2 size={13} />
                  Editar
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (confirm(`¿Eliminar la idea "${idea.title}"?`)) {
                      onDeleteIdea(idea.id);
                    }
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Idea */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIdea ? 'Editar Idea' : 'Nueva Idea'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSaveModal}>
              Guardar Idea
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Título de la Idea *</label>
          <input
            type="text"
            className="form-control"
            placeholder="ej. Bot de Telegram para monitoreo de alertas"
            value={ideaForm.title}
            onChange={(e) => updateIdeaFormAndSaveDraft({ title: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Explica qué beneficio aportaría, cómo funcionaría..."
            value={ideaForm.description}
            onChange={(e) => updateIdeaFormAndSaveDraft({ description: e.target.value })}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <input
              type="text"
              className="form-control"
              placeholder="ej. Automatización, Seguridad, Calidad..."
              value={ideaForm.category}
              onChange={(e) => updateIdeaFormAndSaveDraft({ category: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Estado</label>
            <select
              className="form-control"
              value={ideaForm.status}
              onChange={(e) => updateIdeaFormAndSaveDraft({ status: e.target.value as IdeaStatus })}
            >
              <option value="IDEA">Nueva / Idea</option>
              <option value="EVALUATING">En evaluación</option>
              <option value="IN_DEVELOPMENT">En implementación</option>
              <option value="IMPLEMENTED">Implementada</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Fecha de Registro</label>
          <input
            type="date"
            className="form-control"
            value={ideaForm.date}
            onChange={(e) => updateIdeaFormAndSaveDraft({ date: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Comentarios o Avances</label>
          <input
            type="text"
            className="form-control"
            placeholder="Notas sobre factibilidad o pruebas..."
            value={ideaForm.noteText}
            onChange={(e) => setIdeaForm({ ...ideaForm, noteText: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
};
