import React, { useState } from 'react';
import {
  Plus,
  Rocket,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Edit2,
  Trash2,
  ChevronRight,
  Flag,
  CheckSquare,
  Clock,
  User,
  MessageSquare,
  Paperclip,
  ExternalLink,
  Shield,
  UserCheck,
} from 'lucide-react';
import {
  AppDataState,
  OperationalStatus,
  PriorityLevel,
  Project,
  ProjectMilestone,
  ProjectStatus,
  ProjectTask,
  RiskLevel,
  UserProfile,
} from '../../types/models';
import { ProjectStatusBadge, RiskBadge, PriorityBadge } from '../common/Badges';
import { ProgressBar } from '../common/ProgressBar';
import { Modal } from '../common/Modal';

interface ProjectsViewProps {
  state: AppDataState;
  currentUser: UserProfile;
  onAddProject: (item: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<any>;
  onDeleteProject: (id: string) => Promise<any>;
  onAddMilestone: (item: Omit<ProjectMilestone, 'id'>) => Promise<any>;
  onUpdateMilestone: (id: string, updates: Partial<ProjectMilestone>) => Promise<any>;
  onDeleteMilestone: (id: string) => Promise<any>;
  onAddTask: (item: Omit<ProjectTask, 'id' | 'createdAt'>) => Promise<any>;
  onUpdateTask: (id: string, updates: Partial<ProjectTask>) => Promise<any>;
  onDeleteTask: (id: string) => Promise<any>;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  state,
  currentUser,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}) => {
  const isAdmin = currentUser.role === 'ADMIN';

  // Proyecto seleccionado para ver Kanban e Hitos (por defecto el primero o null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    state.projects.length > 0 ? state.projects[0].id : ''
  );

  const selectedProject = state.projects.find((p) => p.id === selectedProjectId) || state.projects[0] || null;

  // Modales
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestone | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);

  // Modal para que el participante agregue comentario / evidencia a su tarea
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [activeTaskDetail, setActiveTaskDetail] = useState<ProjectTask | null>(null);
  const [taskEvidenceInput, setTaskEvidenceInput] = useState('');
  const [taskCommentInput, setTaskCommentInput] = useState('');

  // Lista de usuarios asignables (excluyendo observadores como Lorena y Edgar)
  const assignableUsers = (state.users || []).filter((u) => u.role !== 'VIEWER');

  // Formulario proyecto con borrador automático
  const [projectForm, setProjectForm] = useState<{
    name: string;
    description: string;
    objective: string;
    responsible: string;
    startDate: string;
    targetDate: string;
    status: ProjectStatus;
    risk: RiskLevel;
    priority: PriorityLevel;
  }>(() => {
    try {
      const savedDraft = localStorage.getItem('DRAFT_NEW_PROJECT');
      if (savedDraft) return JSON.parse(savedDraft);
    } catch (e) {
      /* ignore */
    }
    return {
      name: '',
      description: '',
      objective: '',
      responsible: currentUser.role !== 'VIEWER' ? currentUser.name : (assignableUsers[0]?.name || 'Jherson'),
      startDate: new Date().toISOString().split('T')[0],
      targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'IN_PROGRESS',
      risk: 'LOW',
      priority: 'HIGH',
    };
  });

  const updateProjectFormAndSaveDraft = (patch: Partial<typeof projectForm>) => {
    setProjectForm((prev) => {
      const next = { ...prev, ...patch };
      if (!editingProject) {
        try {
          localStorage.setItem('DRAFT_NEW_PROJECT', JSON.stringify(next));
        } catch (e) {
          /* ignore */
        }
      }
      return next;
    });
  };

  // Formulario hito
  const [milestoneForm, setMilestoneForm] = useState<{
    title: string;
    targetDate: string;
    completed: boolean;
  }>({
    title: '',
    targetDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    completed: false,
  });

  // Formulario tarea
  const [taskForm, setTaskForm] = useState<{
    title: string;
    description: string;
    assignedTo: string;
    milestoneId: string;
    dueDate: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    evidenceUrl: string;
  }>({
    title: '',
    description: '',
    assignedTo: 'Jason',
    milestoneId: '',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'PENDING',
    evidenceUrl: '',
  });

  // Hitos y tareas del proyecto seleccionado
  const projectMilestones = state.projectMilestones.filter((m) => m.projectId === selectedProject?.id);
  const projectTasks = state.projectTasks.filter((t) => t.projectId === selectedProject?.id);

  // Tareas por columna Kanban
  const pendingTasks = projectTasks.filter((t) => t.status === 'PENDING');
  const inProgressTasks = projectTasks.filter((t) => t.status === 'IN_PROGRESS');
  const completedTasks = projectTasks.filter((t) => t.status === 'COMPLETED');

  // Acciones de Proyectos
  const handleOpenProjectModal = (proj?: Project) => {
    if (proj) {
      setEditingProject(proj);
      setProjectForm({
        name: proj.name,
        description: proj.description,
        objective: proj.objective,
        responsible: proj.responsible || 'Jason',
        startDate: proj.startDate,
        targetDate: proj.targetDate,
        status: proj.status,
        risk: proj.risk,
        priority: proj.priority,
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        name: '',
        description: '',
        objective: '',
        responsible: 'Jason',
        startDate: new Date().toISOString().split('T')[0],
        targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: 'IN_PROGRESS',
        risk: 'LOW',
        priority: 'HIGH',
      });
    }
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.name.trim()) return;

    if (editingProject) {
      await onUpdateProject(editingProject.id, {
        name: projectForm.name,
        description: projectForm.description,
        objective: projectForm.objective,
        responsible: projectForm.responsible,
        startDate: projectForm.startDate,
        targetDate: projectForm.targetDate,
        status: projectForm.status,
        risk: projectForm.risk,
        priority: projectForm.priority,
      });
    } else {
      const created = await onAddProject({
        name: projectForm.name,
        description: projectForm.description,
        objective: projectForm.objective,
        responsible: projectForm.responsible,
        startDate: projectForm.startDate,
        targetDate: projectForm.targetDate,
        status: projectForm.status,
        progress: 0,
        risk: projectForm.risk,
        priority: projectForm.priority,
        isDemo: false,
      });
      setSelectedProjectId(created.id);
    }
    try {
      localStorage.removeItem('DRAFT_NEW_PROJECT');
    } catch (e) {
      /* ignore */
    }
    setIsProjectModalOpen(false);
  };

  // Acciones de Hitos
  const handleOpenMilestoneModal = (m?: ProjectMilestone) => {
    if (m) {
      setEditingMilestone(m);
      setMilestoneForm({
        title: m.title,
        targetDate: m.targetDate,
        completed: m.completed,
      });
    } else {
      setEditingMilestone(null);
      setMilestoneForm({
        title: '',
        targetDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        completed: false,
      });
    }
    setIsMilestoneModalOpen(true);
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !milestoneForm.title.trim()) return;

    if (editingMilestone) {
      await onUpdateMilestone(editingMilestone.id, {
        title: milestoneForm.title,
        targetDate: milestoneForm.targetDate,
        completed: milestoneForm.completed,
        completedDate: milestoneForm.completed ? new Date().toISOString().split('T')[0] : undefined,
      });
    } else {
      await onAddMilestone({
        projectId: selectedProject.id,
        title: milestoneForm.title,
        targetDate: milestoneForm.targetDate,
        completed: milestoneForm.completed,
        completedDate: milestoneForm.completed ? new Date().toISOString().split('T')[0] : undefined,
      });
    }
    setIsMilestoneModalOpen(false);
  };

  const handleToggleMilestone = async (m: ProjectMilestone) => {
    await onUpdateMilestone(m.id, {
      completed: !m.completed,
      completedDate: !m.completed ? new Date().toISOString().split('T')[0] : undefined,
    });
  };

  // Acciones de Tareas (Kanban)
  const handleOpenTaskModal = (t?: ProjectTask) => {
    if (t) {
      setEditingTask(t);
      setTaskForm({
        title: t.title,
        description: t.description || '',
        assignedTo: t.assignedTo,
        milestoneId: t.milestoneId || '',
        dueDate: t.dueDate || '',
        status: t.status,
        evidenceUrl: t.evidenceUrl || '',
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        assignedTo: currentUser.name || 'Jason',
        milestoneId: projectMilestones.length > 0 ? projectMilestones[0].id : '',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'PENDING',
        evidenceUrl: '',
      });
    }
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !taskForm.title.trim()) return;

    if (editingTask) {
      await onUpdateTask(editingTask.id, {
        title: taskForm.title,
        description: taskForm.description,
        assignedTo: taskForm.assignedTo,
        milestoneId: taskForm.milestoneId || undefined,
        dueDate: taskForm.dueDate || undefined,
        status: taskForm.status,
        evidenceUrl: taskForm.evidenceUrl || undefined,
      });
    } else {
      await onAddTask({
        projectId: selectedProject.id,
        title: taskForm.title,
        description: taskForm.description,
        assignedTo: taskForm.assignedTo,
        milestoneId: taskForm.milestoneId || undefined,
        dueDate: taskForm.dueDate || undefined,
        status: taskForm.status,
        evidenceUrl: taskForm.evidenceUrl || undefined,
      });
    }
    setIsTaskModalOpen(false);
  };

  const handleMoveTaskStatus = async (task: ProjectTask, newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    await onUpdateTask(task.id, { status: newStatus });
  };

  const handleOpenTaskDetail = (task: ProjectTask) => {
    setActiveTaskDetail(task);
    setTaskEvidenceInput(task.evidenceUrl || '');
    setTaskCommentInput('');
    setIsTaskDetailModalOpen(true);
  };

  const handleAddCommentOrEvidence = async () => {
    if (!activeTaskDetail) return;
    const existingComments = activeTaskDetail.comments || [];
    let updatedComments = existingComments;

    if (taskCommentInput.trim()) {
      updatedComments = [
        ...existingComments,
        {
          id: `c-${Date.now()}`,
          author: currentUser.name,
          text: taskCommentInput.trim(),
          date: new Date().toISOString(),
        },
      ];
    }

    await onUpdateTask(activeTaskDetail.id, {
      evidenceUrl: taskEvidenceInput.trim() || activeTaskDetail.evidenceUrl,
      comments: updatedComments,
    });

    setTaskCommentInput('');
    setIsTaskDetailModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Banner de Rol Activo y Permisos */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          backgroundColor: isAdmin ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${isAdmin ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAdmin ? <Shield size={16} style={{ color: '#38bdf8' }} /> : <UserCheck size={16} style={{ color: '#10b981' }} />}
          <span>
            Estás navegando como: <strong>{currentUser.name}</strong> ({currentUser.roleTitle}).
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {isAdmin
              ? 'Rol Administrador: Puedes crear, editar proyectos, gestionar hitos y modificar planificación.'
              : 'Rol Participante: Puedes visualizar tareas asignadas, moverlas de estado, adjuntar evidencia y comentar.'}
          </span>
        </div>

        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenProjectModal()}>
            <Plus size={14} />
            <span>Nuevo Proyecto</span>
          </button>
        )}
      </div>

      {/* Selector de Proyectos (Tarjetas de Proyecto) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {state.projects.map((proj) => {
          const isSelected = proj.id === selectedProject?.id;
          const hitosCount = state.projectMilestones.filter((m) => m.projectId === proj.id).length;
          const tareasCount = state.projectTasks.filter((t) => t.projectId === proj.id).length;

          return (
            <div
              key={proj.id}
              onClick={() => setSelectedProjectId(proj.id)}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: `2px solid ${isSelected ? 'var(--primary-accent)' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>{proj.name}</div>
                <ProjectStatusBadge status={proj.status} />
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {proj.objective || proj.description}
              </div>

              <div style={{ marginTop: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span>Avance ({hitosCount} Hitos / {tareasCount} Tareas)</span>
                  <strong style={{ color: '#38bdf8' }}>{proj.progress}%</strong>
                </div>
                <ProgressBar progress={proj.progress} height={6} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-subtle)', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                <span>Resp: <strong style={{ color: 'var(--text-main)' }}>{proj.responsible || 'Jason'}</strong></span>
                <span>Límite: {proj.targetDate}</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedProject && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Ficha Principal del Proyecto Seleccionado */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Rocket size={20} style={{ color: '#38bdf8' }} />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                    {selectedProject.name}
                  </h2>
                  <ProjectStatusBadge status={selectedProject.status} />
                  <PriorityBadge priority={selectedProject.priority} />
                  <RiskBadge risk={selectedProject.risk} />
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <strong>Objetivo:</strong> {selectedProject.objective || selectedProject.description}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {isAdmin && (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenProjectModal(selectedProject)}>
                      <Edit2 size={13} />
                      <span>Editar Planificación</span>
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (confirm(`¿Eliminar definitivamente el proyecto "${selectedProject.name}" y todas sus tareas?`)) {
                          onDeleteProject(selectedProject.id);
                        }
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Barra de Progreso Global por Hitos */}
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Cumplimiento Global de Hitos y Tareas:
                </span>
                <strong style={{ fontSize: '14px', color: '#10b981' }}>{selectedProject.progress}%</strong>
              </div>
              <ProgressBar progress={selectedProject.progress} height={8} />
            </div>
          </div>

          {/* SECCIÓN 1: HITOS DEL PROYECTO */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flag size={18} style={{ color: '#f59e0b' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Hitos del Proyecto ({projectMilestones.length})</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  (El avance del proyecto se calcula según estos hitos)
                </span>
              </div>

              {isAdmin && (
                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenMilestoneModal()}>
                  <Plus size={13} />
                  <span>Nuevo Hito</span>
                </button>
              )}
            </div>

            {projectMilestones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No hay hitos definidos para este proyecto aún.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                {projectMilestones.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: m.completed ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface)',
                      border: `1px solid ${m.completed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={m.completed}
                        onChange={() => handleToggleMilestone(m)}
                        disabled={!isAdmin && currentUser.name !== selectedProject.responsible}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        title="Marcar hito como cumplido"
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, textDecoration: m.completed ? 'line-through' : 'none', color: m.completed ? 'var(--text-muted)' : 'var(--text-main)' }}>
                          {m.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} />
                          <span>Límite: {m.targetDate}</span>
                          {m.completed && m.completedDate && (
                            <span style={{ color: '#10b981' }}>• Cumplido el {m.completedDate}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenMilestoneModal(m)} style={{ padding: '3px 6px' }}>
                          <Edit2 size={11} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => onDeleteMilestone(m.id)} style={{ padding: '3px 6px' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: TABLERO KANBAN DE TAREAS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={18} style={{ color: '#38bdf8' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Tablero Kanban de Tareas</h3>
              </div>

              {isAdmin && (
                <button className="btn btn-primary btn-sm" onClick={() => handleOpenTaskModal()}>
                  <Plus size={13} />
                  <span>Crear y Asignar Tarea</span>
                </button>
              )}
            </div>

            {/* 3 Columnas Kanban */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {/* Columna 1: PENDIENTE */}
              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  minHeight: '380px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #94a3b8', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>
                    Pendiente
                  </span>
                  <span className="badge badge-neutral">{pendingTasks.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isAdmin={isAdmin}
                      currentUser={currentUser}
                      onOpenDetail={() => handleOpenTaskDetail(task)}
                      onEdit={() => handleOpenTaskModal(task)}
                      onDelete={() => onDeleteTask(task.id)}
                      onMove={(status) => handleMoveTaskStatus(task, status)}
                    />
                  ))}
                  {pendingTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-subtle)', fontSize: '12px' }}>
                      Sin tareas pendientes
                    </div>
                  )}
                </div>
              </div>

              {/* Columna 2: EN PROCESO */}
              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  minHeight: '380px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #38bdf8', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: '#38bdf8' }}>
                    En Proceso
                  </span>
                  <span className="badge badge-info">{inProgressTasks.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {inProgressTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isAdmin={isAdmin}
                      currentUser={currentUser}
                      onOpenDetail={() => handleOpenTaskDetail(task)}
                      onEdit={() => handleOpenTaskModal(task)}
                      onDelete={() => onDeleteTask(task.id)}
                      onMove={(status) => handleMoveTaskStatus(task, status)}
                    />
                  ))}
                  {inProgressTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-subtle)', fontSize: '12px' }}>
                      Sin tareas en proceso
                    </div>
                  )}
                </div>
              </div>

              {/* Columna 3: COMPLETADA */}
              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  minHeight: '380px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #10b981', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: '#10b981' }}>
                    Completada
                  </span>
                  <span className="badge badge-success">{completedTasks.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {completedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isAdmin={isAdmin}
                      currentUser={currentUser}
                      onOpenDetail={() => handleOpenTaskDetail(task)}
                      onEdit={() => handleOpenTaskModal(task)}
                      onDelete={() => onDeleteTask(task.id)}
                      onMove={(status) => handleMoveTaskStatus(task, status)}
                    />
                  ))}
                  {completedTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-subtle)', fontSize: '12px' }}>
                      Sin tareas completadas
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Crear / Editar Proyecto */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title={editingProject ? 'Editar Planificación de Proyecto' : 'Nuevo Proyecto'}
      >
        <form onSubmit={handleSaveProject}>
          <div className="form-group">
            <label className="form-label">Nombre del Proyecto *</label>
            <input
              type="text"
              placeholder="ej. Migración a Base de Datos Central"
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Objetivo *</label>
            <textarea
              rows={2}
              placeholder="Objetivo principal y alcance del proyecto..."
              value={projectForm.objective}
              onChange={(e) => setProjectForm({ ...projectForm, objective: e.target.value })}
              className="form-control"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Responsable del Proyecto *</label>
              <select
                value={projectForm.responsible}
                onChange={(e) => updateProjectFormAndSaveDraft({ responsible: e.target.value })}
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
              <label className="form-label">Estado</label>
              <select
                value={projectForm.status}
                onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as ProjectStatus })}
                className="form-control"
              >
                <option value="NOT_STARTED">No iniciado</option>
                <option value="IN_PROGRESS">En progreso</option>
                <option value="AT_RISK">En riesgo</option>
                <option value="BLOCKED">Bloqueado</option>
                <option value="COMPLETED">Completado</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Fecha de Inicio</label>
              <input
                type="date"
                value={projectForm.startDate}
                onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fecha Límite (Target)</label>
              <input
                type="date"
                value={projectForm.targetDate}
                onChange={(e) => setProjectForm({ ...projectForm, targetDate: e.target.value })}
                className="form-control"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Nivel de Riesgo</label>
              <select
                value={projectForm.risk}
                onChange={(e) => setProjectForm({ ...projectForm, risk: e.target.value as RiskLevel })}
                className="form-control"
              >
                <option value="LOW">Bajo</option>
                <option value="MEDIUM">Medio</option>
                <option value="HIGH">Alto</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Prioridad</label>
              <select
                value={projectForm.priority}
                onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value as PriorityLevel })}
                className="form-control"
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsProjectModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Proyecto
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Crear / Editar Hito */}
      <Modal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        title={editingMilestone ? 'Editar Hito' : 'Registrar Hito de Proyecto'}
      >
        <form onSubmit={handleSaveMilestone}>
          <div className="form-group">
            <label className="form-label">Título del Hito *</label>
            <input
              type="text"
              placeholder="ej. Paso a producción de la base de datos"
              value={milestoneForm.title}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fecha Límite del Hito *</label>
            <input
              type="date"
              value={milestoneForm.targetDate}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, targetDate: e.target.value })}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={milestoneForm.completed}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, completed: e.target.checked })}
              />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>¿Hito cumplido actualmente?</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsMilestoneModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Hito
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Crear / Editar Tarea (Admin) */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={editingTask ? 'Editar Tarea Planificada' : 'Crear y Asignar Tarea'}
      >
        <form onSubmit={handleSaveTask}>
          <div className="form-group">
            <label className="form-label">Título de la Tarea *</label>
            <input
              type="text"
              placeholder="ej. Crear script de validación de planillas"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción / Instrucciones</label>
            <textarea
              rows={2}
              placeholder="Detalles sobre cómo debe ser ejecutada..."
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="form-control"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Asignado a *</label>
              <input
                type="text"
                placeholder="ej. Jason"
                value={taskForm.assignedTo}
                onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hito Asociado</label>
              <select
                value={taskForm.milestoneId}
                onChange={(e) => setTaskForm({ ...taskForm, milestoneId: e.target.value })}
                className="form-control"
              >
                <option value="">Sin hito específico</option>
                {projectMilestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Fecha Límite</label>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estado Inicial</label>
              <select
                value={taskForm.status}
                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as any })}
                className="form-control"
              >
                <option value="PENDING">Pendiente</option>
                <option value="IN_PROGRESS">En Proceso</option>
                <option value="COMPLETED">Completada</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Enlace a Evidencia o Repositorio (Opcional)</label>
            <input
              type="text"
              placeholder="https://github.com/... o https://sharepoint.com/..."
              value={taskForm.evidenceUrl}
              onChange={(e) => setTaskForm({ ...taskForm, evidenceUrl: e.target.value })}
              className="form-control"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsTaskModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar Tarea
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Detalle de Tarea para Participante (Comentarios y Evidencia) */}
      <Modal
        isOpen={isTaskDetailModalOpen}
        onClose={() => setIsTaskDetailModalOpen(false)}
        title={activeTaskDetail ? `Tarea: ${activeTaskDetail.title}` : 'Detalle de Tarea'}
      >
        {activeTaskDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {activeTaskDetail.description || 'Sin descripción adicional.'}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px', color: 'var(--text-subtle)' }}>
                <span>Asignado: <strong style={{ color: '#10b981' }}>{activeTaskDetail.assignedTo}</strong></span>
                {activeTaskDetail.dueDate && <span>Límite: {activeTaskDetail.dueDate}</span>}
              </div>
            </div>

            {/* Mover de Columna / Estado */}
            <div>
              <label className="form-label">Estado de la Tarea</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`btn btn-sm ${activeTaskDetail.status === st ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleMoveTaskStatus(activeTaskDetail, st)}
                  >
                    {st === 'PENDING' ? 'Pendiente' : st === 'IN_PROGRESS' ? 'En Proceso' : '✓ Completada'}
                  </button>
                ))}
              </div>
            </div>

            {/* Adjuntar Evidencia */}
            <div className="form-group">
              <label className="form-label">Enlace a Evidencia / Entregable</label>
              <input
                type="text"
                placeholder="https://sharepoint.com/... o C:\Evidencias\reporte.pdf"
                value={taskEvidenceInput}
                onChange={(e) => setTaskEvidenceInput(e.target.value)}
                className="form-control"
              />
            </div>

            {/* Historial de Comentarios */}
            {activeTaskDetail.comments && activeTaskDetail.comments.length > 0 && (
              <div>
                <label className="form-label">Comentarios registrados:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {activeTaskDetail.comments.map((c) => (
                    <div key={c.id} style={{ backgroundColor: 'var(--bg-input)', padding: '8px', borderRadius: '4px', fontSize: '12px' }}>
                      <strong style={{ color: '#38bdf8' }}>{c.author}: </strong>
                      <span>{c.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agregar Comentario */}
            <div className="form-group">
              <label className="form-label">Agregar Comentario de Avance</label>
              <textarea
                rows={2}
                placeholder="Escribe un comentario sobre el trabajo realizado..."
                value={taskCommentInput}
                onChange={(e) => setTaskCommentInput(e.target.value)}
                className="form-control"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsTaskDetailModalOpen(false)}>
                Cerrar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleAddCommentOrEvidence}>
                Guardar Avance / Evidencia
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Componente Tarjeta de Tarea en Kanban
interface TaskCardProps {
  task: ProjectTask;
  isAdmin: boolean;
  currentUser: UserProfile;
  onOpenDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isAdmin,
  currentUser,
  onOpenDetail,
  onEdit,
  onDelete,
  onMove,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div
          onClick={onOpenDetail}
          style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', flex: 1 }}
        >
          {task.title}
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: '2px' }}>
            <button className="btn btn-secondary btn-sm" onClick={onEdit} style={{ padding: '2px 4px' }} title="Editar tarea">
              <Edit2 size={10} />
            </button>
            <button className="btn btn-danger btn-sm" onClick={onDelete} style={{ padding: '2px 4px' }} title="Eliminar">
              <Trash2 size={10} />
            </button>
          </div>
        )}
      </div>

      {task.description && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {task.description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-subtle)', flexWrap: 'wrap', gap: '4px' }}>
        <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
          <User size={10} style={{ marginRight: '3px' }} />
          {task.assignedTo}
        </span>

        {task.dueDate && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={10} />
            {task.dueDate}
          </span>
        )}
      </div>

      {/* Evidencias o comentarios presentes */}
      {(task.evidenceUrl || (task.comments && task.comments.length > 0)) && (
        <div style={{ display: 'flex', gap: '6px', fontSize: '10px', color: 'var(--text-subtle)' }}>
          {task.evidenceUrl && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#38bdf8' }}>
              <Paperclip size={10} /> Evidencia
            </span>
          )}
          {task.comments && task.comments.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <MessageSquare size={10} /> {task.comments.length}
            </span>
          )}
        </div>
      )}

      {/* Acciones rápidas de cambio de estado (para que el participante haga check/move) */}
      <div style={{ display: 'flex', gap: '4px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', marginTop: '2px' }}>
        {task.status !== 'PENDING' && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onMove('PENDING')}
            style={{ fontSize: '10px', padding: '2px 6px', flex: 1 }}
          >
            ← Pendiente
          </button>
        )}
        {task.status !== 'IN_PROGRESS' && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onMove('IN_PROGRESS')}
            style={{ fontSize: '10px', padding: '2px 6px', flex: 1 }}
          >
            En Proceso
          </button>
        )}
        {task.status !== 'COMPLETED' && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onMove('COMPLETED')}
            style={{ fontSize: '10px', padding: '2px 6px', flex: 1, color: '#10b981' }}
          >
            ✓ Completar
          </button>
        )}
      </div>
    </div>
  );
};
