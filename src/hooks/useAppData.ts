import { useEffect, useState } from 'react';
import { storageAdapter } from '../storage';
import {
  AppDataState,
  ChatMessage,
  Deliverable,
  DeliverableUpdate,
  Idea,
  LogbookItem,
  Meeting,
  ProcessItem,
  Project,
  ProjectMilestone,
  ProjectPhase,
  ProjectTask,
  Responsibility,
  ResponsibilityOccurrence,
  TimeCategory,
  TimeEntry,
  UserProfile,
} from '../types/models';

export const useAppData = () => {
  const [state, setState] = useState<AppDataState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Carga inicial
    storageAdapter.getState().then((initialState: AppDataState) => {
      setState(initialState);
      setLoading(false);
    });

    // Suscripción reactiva a cualquier cambio en Storage
    const unsubscribe = storageAdapter.subscribe((newState: AppDataState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 0. GESTIÓN DE USUARIOS Y ROL ACTIVO
  const setCurrentUserId = async (userId: string) => {
    if (!state) return;
    const newState = { ...state, currentUserId: userId };
    await storageAdapter.saveState(newState);
  };

  const getCurrentUser = (): UserProfile => {
    if (!state) {
      return {
        id: 'usr-admin',
        name: 'Administrador Maestro',
        email: 'admin.gestion@empresa.com',
        role: 'ADMIN',
        roleTitle: 'Administrador / Maestro',
        area: 'Área Informática Operacional',
        avatarColor: '#3b82f6',
      };
    }
    return (
      state.users.find((u) => u.id === state.currentUserId) ||
      state.users[0] || {
        id: 'usr-admin',
        name: 'Administrador Maestro',
        email: 'admin.gestion@empresa.com',
        role: 'ADMIN',
        roleTitle: 'Administrador / Maestro',
        area: 'Área Informática Operacional',
        avatarColor: '#3b82f6',
      }
    );
  };

  // 1. MAPA DE PROCESOS
  const addProcess = async (item: Omit<ProcessItem, 'id' | 'createdAt'>) => {
    const newItem: ProcessItem = {
      ...item,
      id: `proc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    return storageAdapter.create('processes', newItem);
  };

  const updateProcess = async (id: string, updates: Partial<ProcessItem>) => {
    return storageAdapter.update('processes', id, updates);
  };

  const deleteProcess = async (id: string) => {
    return storageAdapter.delete('processes', id);
  };

  const importBulkProcesses = async (items: ProcessItem[], replaceAll: boolean = false) => {
    if (!state) return;
    const existing = replaceAll ? [] : state.processes;
    const combined = [...existing, ...items];
    const newState = { ...state, processes: combined };
    await storageAdapter.saveState(newState);
  };

  // 2. RESPONSABILIDADES RECURRENTES
  const addResponsibility = async (item: Omit<Responsibility, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: Responsibility = {
      ...item,
      id: `resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return storageAdapter.create('responsibilities', newItem);
  };

  const updateResponsibility = async (id: string, updates: Partial<Responsibility>) => {
    return storageAdapter.update('responsibilities', id, updates);
  };

  const deleteResponsibility = async (id: string) => {
    return storageAdapter.delete('responsibilities', id);
  };

  const addOccurrence = async (item: Omit<ResponsibilityOccurrence, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: ResponsibilityOccurrence = {
      ...item,
      id: `occ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return storageAdapter.create('occurrences', newItem);
  };

  const updateOccurrence = async (id: string, updates: Partial<ResponsibilityOccurrence>) => {
    return storageAdapter.update('occurrences', id, updates);
  };

  const deleteOccurrence = async (id: string) => {
    return storageAdapter.delete('occurrences', id);
  };

  // 3. ENTREGABLES
  const addDeliverable = async (item: Omit<Deliverable, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: Deliverable = {
      ...item,
      id: `deliv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return storageAdapter.create('deliverables', newItem);
  };

  const updateDeliverable = async (id: string, updates: Partial<Deliverable>) => {
    return storageAdapter.update('deliverables', id, updates);
  };

  const deleteDeliverable = async (id: string) => {
    return storageAdapter.delete('deliverables', id);
  };

  const addDeliverableUpdate = async (item: Omit<DeliverableUpdate, 'id' | 'createdAt'>) => {
    const newItem: DeliverableUpdate = {
      ...item,
      id: `upd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    await storageAdapter.create('deliverableUpdates', newItem);

    await storageAdapter.update('deliverables', item.deliverableId, {
      progress: item.progress,
      status: item.status,
      hasIssue: item.hasIssue,
      issueType: item.issueType,
      issueDescription: item.issueDescription,
      needsHelp: item.needsHelp,
      helpDescription: item.helpDescription,
      ...(item.status === 'COMPLETED' ? { realDeliveryDate: item.date } : {}),
    });

    return newItem;
  };

  // 4. PROYECTOS, HITOS Y TAREAS (Kanban + Hitos)
  const addProject = async (item: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: Project = {
      ...item,
      id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return storageAdapter.create('projects', newItem);
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    return storageAdapter.update('projects', id, updates);
  };

  const deleteProject = async (id: string) => {
    if (!state) return false;
    // Eliminar también hitos y tareas asociadas
    const updatedMilestones = state.projectMilestones.filter((m) => m.projectId !== id);
    const updatedTasks = state.projectTasks.filter((t) => t.projectId !== id);
    const updatedPhases = state.projectPhases.filter((p) => p.projectId !== id);
    const updatedProjects = state.projects.filter((p) => p.id !== id);

    await storageAdapter.saveState({
      ...state,
      projects: updatedProjects,
      projectMilestones: updatedMilestones,
      projectTasks: updatedTasks,
      projectPhases: updatedPhases,
    });
    return true;
  };

  // Hitos de Proyecto
  const addProjectMilestone = async (item: Omit<ProjectMilestone, 'id'>) => {
    const newItem: ProjectMilestone = {
      ...item,
      id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const created = await storageAdapter.create('projectMilestones', newItem);
    await recalculateProjectProgress(item.projectId);
    return created;
  };

  const updateProjectMilestone = async (id: string, updates: Partial<ProjectMilestone>) => {
    const updated = await storageAdapter.update('projectMilestones', id, updates);
    if (updated?.projectId) {
      await recalculateProjectProgress(updated.projectId);
    }
    return updated;
  };

  const deleteProjectMilestone = async (id: string) => {
    const milestone = state?.projectMilestones.find((m) => m.id === id);
    const deleted = await storageAdapter.delete('projectMilestones', id);
    if (milestone?.projectId) {
      await recalculateProjectProgress(milestone.projectId);
    }
    return deleted;
  };

  // Tareas de Proyecto (Kanban)
  const addProjectTask = async (item: Omit<ProjectTask, 'id' | 'createdAt'>) => {
    const newItem: ProjectTask = {
      ...item,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const created = await storageAdapter.create('projectTasks', newItem);
    await recalculateProjectProgress(item.projectId);
    return created;
  };

  const updateProjectTask = async (id: string, updates: Partial<ProjectTask>) => {
    const updated = await storageAdapter.update('projectTasks', id, updates);
    if (updated?.projectId) {
      await recalculateProjectProgress(updated.projectId);
    }
    return updated;
  };

  const deleteProjectTask = async (id: string) => {
    const task = state?.projectTasks.find((t) => t.id === id);
    const deleted = await storageAdapter.delete('projectTasks', id);
    if (task?.projectId) {
      await recalculateProjectProgress(task.projectId);
    }
    return deleted;
  };

  // Fases de Proyecto (compatibilidad)
  const addProjectPhase = async (item: Omit<ProjectPhase, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: ProjectPhase = {
      ...item,
      id: `phase-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return storageAdapter.create('projectPhases', newItem);
  };

  const updateProjectPhase = async (id: string, updates: Partial<ProjectPhase>) => {
    return storageAdapter.update('projectPhases', id, updates);
  };

  const deleteProjectPhase = async (id: string) => {
    return storageAdapter.delete('projectPhases', id);
  };

  // Recalcular el avance del proyecto según cumplimiento de hitos y tareas
  const recalculateProjectProgress = async (projectId: string) => {
    const currentState = await storageAdapter.getState();
    const hitos = currentState.projectMilestones.filter((m: ProjectMilestone) => m.projectId === projectId);
    const tareas = currentState.projectTasks.filter((t: ProjectTask) => t.projectId === projectId);

    let progress = 0;
    if (hitos.length > 0) {
      const completedHitos = hitos.filter((m: ProjectMilestone) => m.completed).length;
      progress = Math.round((completedHitos / hitos.length) * 100);
    } else if (tareas.length > 0) {
      const completedTasks = tareas.filter((t: ProjectTask) => t.status === 'COMPLETED').length;
      progress = Math.round((completedTasks / tareas.length) * 100);
    }

    await storageAdapter.update('projects', projectId, {
      progress,
      status: progress === 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
    });
  };

  // 5. IDEAS Y MEJORAS
  const addIdea = async (item: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: Idea = {
      ...item,
      id: `idea-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return storageAdapter.create('ideas', newItem);
  };

  const updateIdea = async (id: string, updates: Partial<Idea>) => {
    return storageAdapter.update('ideas', id, updates);
  };

  const deleteIdea = async (id: string) => {
    return storageAdapter.delete('ideas', id);
  };

  const convertIdeaToProject = async (idea: Idea) => {
    const newProj: Project = {
      id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: idea.title,
      description: idea.description,
      objective: `Implementación de idea: ${idea.title}`,
      responsible: idea.creator || 'Administrador Maestro',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'IN_PROGRESS',
      progress: 0,
      risk: 'LOW',
      priority: 'HIGH',
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storageAdapter.create('projects', newProj);
    await storageAdapter.update('ideas', idea.id, {
      status: 'IN_DEVELOPMENT',
      convertedToProjectId: newProj.id,
    });

    return newProj;
  };

  // 6. BITÁCORA PERSONAL (Recordatorios)
  const addLogbookItem = async (item: Omit<LogbookItem, 'id' | 'createdAt'>) => {
    const newItem: LogbookItem = {
      ...item,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    return storageAdapter.create('logbook', newItem);
  };

  const updateLogbookItem = async (id: string, updates: Partial<LogbookItem>) => {
    return storageAdapter.update('logbook', id, updates);
  };

  const deleteLogbookItem = async (id: string) => {
    return storageAdapter.delete('logbook', id);
  };

  // 7. REUNIONES Y ACUERDOS
  const addMeeting = async (item: Omit<Meeting, 'id' | 'createdAt'>) => {
    const newItem: Meeting = {
      ...item,
      id: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    return storageAdapter.create('meetings', newItem);
  };

  const updateMeeting = async (id: string, updates: Partial<Meeting>) => {
    return storageAdapter.update('meetings', id, updates);
  };

  const deleteMeeting = async (id: string) => {
    return storageAdapter.delete('meetings', id);
  };

  // 8. CHAT INTERNO
  const sendChatMessage = async (item: Omit<ChatMessage, 'id' | 'timestamp' | 'read'>) => {
    const newItem: ChatMessage = {
      ...item,
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: true,
    };
    return storageAdapter.create('chatMessages', newItem);
  };

  const convertChatMessageToLogbook = async (message: ChatMessage, userId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newLogItem = await addLogbookItem({
      userId,
      reminderText: `De ${message.senderName}: "${message.message}"`,
      date: todayStr,
      time: '12:00',
      note: `Generado automáticamente desde el chat el ${new Date().toLocaleDateString('es-ES')}.`,
      status: 'PENDING',
      remindMe: true,
      isDemo: false,
    });

    await storageAdapter.update('chatMessages', message.id, {
      convertedToLogbookId: newLogItem.id,
    });

    return newLogItem;
  };

  // 9. TIME TRACKER
  const startTimeEntry = async (
    activity: string,
    category: TimeCategory = 'OPERATIONS',
    deliverableId?: string,
    projectId?: string
  ) => {
    if (!state) return;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const user = getCurrentUser();

    // Detener cualquier entrada activa previa del mismo usuario
    const entries = state.timeEntries || [];
    const updatedEntries = entries.map((e) => {
      if (e.userId === user.id && e.isRunning) {
        return {
          ...e,
          isRunning: false,
          isPaused: false,
          endTime: e.endTime || timeStr,
          updatedAt: now.toISOString(),
        };
      }
      return e;
    });

    const newEntry: TimeEntry = {
      id: `time-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      date: dateStr,
      startTime: timeStr,
      endTime: undefined,
      activity: activity.trim(),
      category,
      deliverableId,
      projectId,
      isRunning: true,
      isPaused: false,
      accumulatedSeconds: 0,
      lastStartedAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    updatedEntries.push(newEntry);
    await storageAdapter.saveState({
      ...state,
      timeEntries: updatedEntries,
    });
    return newEntry;
  };

  const pauseTimeEntry = async (id: string) => {
    if (!state) return;
    const now = new Date();
    const entries = state.timeEntries || [];
    const updatedEntries = entries.map((e) => {
      if (e.id === id) {
        const lastStarted = e.lastStartedAt ? new Date(e.lastStartedAt).getTime() : now.getTime();
        const diffSeconds = Math.max(0, Math.floor((now.getTime() - lastStarted) / 1000));
        const totalAccum = (e.accumulatedSeconds || 0) + diffSeconds;
        return {
          ...e,
          isPaused: true,
          accumulatedSeconds: totalAccum,
          updatedAt: now.toISOString(),
        };
      }
      return e;
    });
    await storageAdapter.saveState({
      ...state,
      timeEntries: updatedEntries,
    });
  };

  const resumeTimeEntry = async (id: string) => {
    if (!state) return;
    const now = new Date();
    const entries = state.timeEntries || [];
    const updatedEntries = entries.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          isPaused: false,
          lastStartedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
      }
      return e;
    });
    await storageAdapter.saveState({
      ...state,
      timeEntries: updatedEntries,
    });
  };

  const stopTimeEntry = async (id: string) => {
    if (!state) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const entries = state.timeEntries || [];
    const updatedEntries = entries.map((e) => {
      if (e.id === id) {
        let totalAccum = e.accumulatedSeconds || 0;
        if (!e.isPaused && e.lastStartedAt) {
          const lastStarted = new Date(e.lastStartedAt).getTime();
          const diffSeconds = Math.max(0, Math.floor((now.getTime() - lastStarted) / 1000));
          totalAccum += diffSeconds;
        }
        return {
          ...e,
          isRunning: false,
          isPaused: false,
          accumulatedSeconds: totalAccum,
          endTime: e.endTime || timeStr,
          updatedAt: now.toISOString(),
        };
      }
      return e;
    });
    await storageAdapter.saveState({
      ...state,
      timeEntries: updatedEntries,
    });
  };

  const addManualTimeEntry = async (item: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: TimeEntry = {
      ...item,
      id: `time-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return storageAdapter.create('timeEntries', newItem);
  };

  const updateTimeEntry = async (id: string, updates: Partial<TimeEntry>) => {
    return storageAdapter.update('timeEntries', id, updates);
  };

  const deleteTimeEntry = async (id: string) => {
    return storageAdapter.delete('timeEntries', id);
  };

  // 10. GESTIÓN DE RESETEO
  const loadDemoData = async () => {
    return storageAdapter.loadDemoData();
  };

  const clearDemoData = async () => {
    return storageAdapter.clearDemoData();
  };

  const resetAllData = async () => {
    return storageAdapter.resetAll();
  };

  return {
    state,
    loading,
    // Usuarios
    setCurrentUserId,
    getCurrentUser,
    // Procesos
    addProcess,
    updateProcess,
    deleteProcess,
    importBulkProcesses,
    // Responsabilidades
    addResponsibility,
    updateResponsibility,
    deleteResponsibility,
    addOccurrence,
    updateOccurrence,
    deleteOccurrence,
    // Entregables
    addDeliverable,
    updateDeliverable,
    deleteDeliverable,
    addDeliverableUpdate,
    // Proyectos, Hitos, Tareas
    addProject,
    updateProject,
    deleteProject,
    addProjectMilestone,
    updateProjectMilestone,
    deleteProjectMilestone,
    addProjectTask,
    updateProjectTask,
    deleteProjectTask,
    addProjectPhase,
    updateProjectPhase,
    deleteProjectPhase,
    recalculateProjectProgress,
    // Ideas
    addIdea,
    updateIdea,
    deleteIdea,
    convertIdeaToProject,
    // Bitácora
    addLogbookItem,
    updateLogbookItem,
    deleteLogbookItem,
    // Reuniones
    addMeeting,
    updateMeeting,
    deleteMeeting,
    // Chat
    sendChatMessage,
    convertChatMessageToLogbook,
    // Time Tracker
    startTimeEntry,
    pauseTimeEntry,
    resumeTimeEntry,
    stopTimeEntry,
    addManualTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    // Demo & reset
    loadDemoData,
    clearDemoData,
    resetAllData,
  };
};
