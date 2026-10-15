import React, { useState, useEffect } from 'react';
import { useAppData } from './hooks/useAppData';
import { ActiveTab } from './types/common';
import { Deliverable, UserProfile } from './types/models';
import { calculateDashboardMetrics } from './services/metricsService';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { ResponsibilitiesView } from './components/responsibilities/ResponsibilitiesView';
import { DeliverablesView } from './components/deliverables/DeliverablesView';
import { ProjectsView } from './components/projects/ProjectsView';
import { CalendarView } from './components/calendar/CalendarView';
import { CalendarDock } from './components/calendar/CalendarDock';
import { IdeasView } from './components/ideas/IdeasView';
import { LogbookView } from './components/logbook/LogbookView';
import { MeetingsView } from './components/meetings/MeetingsView';
import { ChatView } from './components/chat/ChatView';
import { ExportView } from './components/export/ExportView';
import { LoginView } from './components/auth/LoginView';
import './styles/globals.css';
import './styles/components.css';

const SESSION_KEY = 'CG_SESSION_USER_ID';

export const App: React.FC = () => {
  const {
    state,
    loading,
    getCurrentUser,
    setCurrentUserId,
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
    // Demo
    loadDemoData,
    clearDemoData,
  } = useAppData();

  // ─── Estado de sesión (login/logout) ────────────────────────────────────
  const [loggedInUser, setLoggedInUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sincronizar sesión: cuando el estado carga y tenemos usuario guardado, actualizamos currentUserId
  useEffect(() => {
    if (state && loggedInUser) {
      // Verificar que el usuario sigue siendo válido en la BD
      const validUser = state.users.find((u) => u.id === loggedInUser.id);
      if (validUser) {
        setCurrentUserId(validUser.id);
      } else {
        // Usuario ya no existe, desloguear
        handleLogout();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.users]);

  const handleLoginSuccess = (user: UserProfile) => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {}
    setLoggedInUser(user);
    setCurrentUserId(user.id);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
    setLoggedInUser(null);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [isCalendarDockCollapsed, setIsCalendarDockCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('CALENDAR_DOCK_COLLAPSED') === 'true';
    } catch {
      return false;
    }
  });

  // ─── Tema claro/oscuro ───────────────────────────────────────────────────
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('APP_THEME') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('APP_THEME', next); } catch {}
      return next;
    });
  };
  // ─────────────────────────────────────────────────────────────────────────

  // Aplicar tema al <html> para que las variables CSS funcionen globalmente
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleToggleCalendarDock = () => {
    setIsCalendarDockCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('CALENDAR_DOCK_COLLAPSED', String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  if (loading || !state) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-main)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Control de Gestión</div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Cargando...</div>
        </div>
      </div>
    );
  }

  // Mostrar login si no hay sesión activa
  if (!loggedInUser) {
    return <LoginView users={state.users} onLoginSuccess={handleLoginSuccess} />;
  }

  const metrics = calculateDashboardMetrics(state);
  const currentUser = getCurrentUser();

  const hasDemoData =
    state.responsibilities.some((r) => r.isDemo) ||
    state.deliverables.some((d) => d.isDemo) ||
    state.projects.some((p) => p.isDemo) ||
    state.ideas.some((i) => i.isDemo);

  // Contadores para badges del Sidebar
  const logbookPendingCount = state.logbook
    ? state.logbook.filter((l) => l.status === 'PENDING' && l.userId === currentUser.id).length
    : 0;

  const today = new Date().toISOString().split('T')[0];
  const upcomingMeetingsCount = state.meetings
    ? state.meetings.filter((m) => m.date >= today).length
    : 0;

  const unreadChatCount = state.chatMessages
    ? state.chatMessages.filter((m) => !m.read && m.senderId !== currentUser.id).length
    : 0;

  // Wrapper para convertir idea por id (el hook recibe el objeto Idea completo)
  const handleConvertIdeaToProject = async (ideaId: string) => {
    const idea = state.ideas.find((i) => i.id === ideaId);
    if (!idea) return;
    return convertIdeaToProject(idea);
  };

  const handleOpenDeliverableFromAnywhere = (deliv: Deliverable) => {
    setSelectedDeliverable(deliv);
    setActiveTab('deliverables');
  };

  const handleOpenNewIdea = () => {
    setActiveTab('ideas');
  };

  return (
    <div className="app-container" data-theme={theme}>
      {/* 1. Barra Lateral de Navegación */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={metrics.pendingDeliverables}
        overdueCount={metrics.overdueDeliverables}
        newIdeasCount={metrics.newIdeas}
        logbookPendingCount={logbookPendingCount}
        upcomingMeetingsCount={upcomingMeetingsCount}
        unreadChatCount={unreadChatCount}
      />

      {/* 2. Contenedor Principal */}
      <div className="main-wrapper">
        <Header
          activeTab={activeTab}
          hasDemoData={hasDemoData}
          onLoadDemo={loadDemoData}
          onClearDemo={clearDemoData}
          users={state.users || []}
          currentUser={currentUser}
          onSwitchUser={setCurrentUserId}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        <div className="app-body-layout">
          <main className="content-area">
          {/* Banner de datos demo */}
          {hasDemoData && (
            <div className="demo-banner">
              <div>
                💡 <strong>Modo Demo Activo:</strong> Estás visualizando datos de ejemplo para explorar la interfaz y métricas.
              </div>
              <div className="demo-banner-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  onClick={clearDemoData}
                >
                  Limpiar y empezar con datos propios
                </button>
              </div>
            </div>
          )}

          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <DashboardView
              state={state}
              setActiveTab={setActiveTab}
              onOpenDeliverable={handleOpenDeliverableFromAnywhere}
              onOpenNewIdea={handleOpenNewIdea}
            />
          )}

          {/* Responsabilidades + Mapa de Procesos */}
          {activeTab === 'responsibilities' && (
            <ResponsibilitiesView
              state={state}
              currentUser={currentUser}
              onAddProcess={addProcess}
              onUpdateProcess={updateProcess}
              onDeleteProcess={deleteProcess}
              onImportBulkProcesses={importBulkProcesses}
              onAddResponsibility={addResponsibility}
              onUpdateResponsibility={updateResponsibility}
              onDeleteResponsibility={deleteResponsibility}
              onAddOccurrence={addOccurrence}
              onUpdateOccurrence={updateOccurrence}
              onDeleteOccurrence={deleteOccurrence}
            />
          )}

          {/* Entregables */}
          {activeTab === 'deliverables' && (
            <DeliverablesView
              state={state}
              currentUser={currentUser}
              onAddDeliverable={addDeliverable}
              onUpdateDeliverable={updateDeliverable}
              onDeleteDeliverable={deleteDeliverable}
              onAddUpdate={addDeliverableUpdate}
              selectedDeliverableFromProp={selectedDeliverable}
              onClearSelectedProp={() => setSelectedDeliverable(null)}
            />
          )}

          {/* Proyectos (Kanban + Hitos) */}
          {activeTab === 'projects' && (
            <ProjectsView
              state={state}
              currentUser={currentUser}
              onAddProject={addProject}
              onUpdateProject={updateProject}
              onDeleteProject={deleteProject}
              onAddMilestone={addProjectMilestone}
              onUpdateMilestone={updateProjectMilestone}
              onDeleteMilestone={deleteProjectMilestone}
              onAddTask={addProjectTask}
              onUpdateTask={updateProjectTask}
              onDeleteTask={deleteProjectTask}
            />
          )}

          {/* Calendario Transversal */}
          {activeTab === 'calendar' && (
            <CalendarView
              state={state}
              onOpenDeliverable={handleOpenDeliverableFromAnywhere}
            />
          )}

          {/* Ideas y Mejoras */}
          {activeTab === 'ideas' && (
            <IdeasView
              state={state}
              currentUser={currentUser}
              onAddIdea={addIdea}
              onUpdateIdea={updateIdea}
              onDeleteIdea={deleteIdea}
              onConvertToProject={handleConvertIdeaToProject}
            />
          )}

          {/* Bitácora */}
          {activeTab === 'logbook' && (
            <LogbookView
              state={state}
              currentUser={currentUser}
              onAddLogbookItem={addLogbookItem}
              onUpdateLogbookItem={updateLogbookItem}
              onDeleteLogbookItem={deleteLogbookItem}
            />
          )}

          {/* Reuniones */}
          {activeTab === 'meetings' && (
            <MeetingsView
              state={state}
              onAddMeeting={addMeeting}
              onUpdateMeeting={updateMeeting}
              onDeleteMeeting={deleteMeeting}
            />
          )}

          {/* Chat Interno */}
          {activeTab === 'chat' && (
            <ChatView
              state={state}
              currentUser={currentUser}
              onSendMessage={sendChatMessage}
              onConvertMessageToLogbook={convertChatMessageToLogbook}
            />
          )}

          {/* Exportar */}
          {activeTab === 'export' && (
            <ExportView state={state} />
          )}
        </main>

        {/* 3. Panel Lateral de Calendario Persistente (Visible en todo momento) */}
        <CalendarDock
          state={state}
          onOpenDeliverable={handleOpenDeliverableFromAnywhere}
          isCollapsed={isCalendarDockCollapsed}
          onToggleCollapse={handleToggleCalendarDock}
          onOpenFullCalendar={() => setActiveTab('calendar')}
        />
      </div>
      </div>
    </div>
  );
};

export default App;
