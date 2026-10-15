import React from 'react';
import {
  LayoutDashboard,
  GitFork,
  ClipboardList,
  Rocket,
  CalendarDays,
  Lightbulb,
  BookmarkCheck,
  Users,
  MessageSquare,
  Download,
} from 'lucide-react';
import { ActiveTab } from '../../types/common';
import { ProcessFlowLogo } from './Logo';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingCount: number;
  overdueCount: number;
  newIdeasCount: number;
  logbookPendingCount: number;
  upcomingMeetingsCount: number;
  unreadChatCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  overdueCount,
  newIdeasCount,
  logbookPendingCount,
  upcomingMeetingsCount,
  unreadChatCount,
}) => {
  const menuItems: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'responsibilities', label: 'Responsabilidades', icon: <GitFork size={18} /> },
    {
      id: 'deliverables',
      label: 'Entregables',
      icon: <ClipboardList size={18} />,
      badge: overdueCount > 0 ? overdueCount : pendingCount > 0 ? pendingCount : undefined,
      badgeColor: overdueCount > 0 ? 'var(--color-danger)' : 'var(--color-info)',
    },
    { id: 'projects', label: 'Proyectos', icon: <Rocket size={18} /> },
    { id: 'calendar', label: 'Calendario', icon: <CalendarDays size={18} /> },
    {
      id: 'ideas',
      label: 'Ideas',
      icon: <Lightbulb size={18} />,
      badge: newIdeasCount > 0 ? newIdeasCount : undefined,
      badgeColor: 'var(--color-purple)',
    },
    {
      id: 'logbook',
      label: 'Bitácora',
      icon: <BookmarkCheck size={18} />,
      badge: logbookPendingCount > 0 ? logbookPendingCount : undefined,
      badgeColor: '#f59e0b',
    },
    {
      id: 'meetings',
      label: 'Reuniones',
      icon: <Users size={18} />,
      badge: upcomingMeetingsCount > 0 ? upcomingMeetingsCount : undefined,
      badgeColor: '#0ea5e9',
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare size={18} />,
      badge: unreadChatCount > 0 ? unreadChatCount : undefined,
      badgeColor: '#10b981',
    },
    { id: 'export', label: 'Exportar', icon: <Download size={18} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ProcessFlowLogo size={36} />
        </div>
        <div>
          <div className="sidebar-title" style={{ letterSpacing: '0.02em', fontSize: '15px' }}>
            CONTROL GESTIÓN
          </div>
          <div className="sidebar-subtitle">Área Informática Operacional</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  style={{
                    backgroundColor: item.badgeColor || 'var(--primary-accent)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Servidor Web</span>
          <span
            className="badge badge-success"
            style={{
              fontSize: '10px',
              padding: '2px 8px',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            Online
          </span>
        </div>
        <div>Sincronizado con servidor central</div>
      </div>
    </aside>
  );
};
