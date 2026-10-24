import React from 'react';
import { Calendar, RefreshCw, LogOut, Shield, Eye, UserCheck, Sun, Moon } from 'lucide-react';
import { ActiveTab } from '../../types/common';
import { UserProfile } from '../../types/models';

interface HeaderProps {
  activeTab: ActiveTab;
  currentUser: UserProfile;
  onLogout: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  users?: UserProfile[];
  onSwitchUser?: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  currentUser,
  onLogout,
  theme = 'dark',
  onToggleTheme,
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Panel de Control de Gestión';
      case 'responsibilities':
        return 'Mapa de Procesos y Responsabilidades';
      case 'deliverables':
        return 'Seguimiento y Control de Entregables';
      case 'projects':
        return 'Portafolio de Proyectos (Kanban + Hitos)';
      case 'calendar':
        return 'Calendario Operativo Transversal';
      case 'ideas':
        return 'Banco de Ideas y Mejoras Continuas';
      case 'logbook':
        return 'Bitácora y Recordatorios Diarios';
      case 'meetings':
        return 'Gestión de Reuniones y Acuerdos';
      case 'chat':
        return 'Chat Interno y Canales Operacionales';
      case 'export':
        return 'Exportación de Datos (CSV / ZIP)';
      case 'cockpit':
        return 'Mi Día & Cockpit de Gestión';
      default:
        return 'GESTIÓN DE INFORMACIÓN';
    }
  };

  const today = new Date();
  const dateFormatted = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const roleLabel = currentUser.roleTitle || (
    currentUser.role === 'ADMIN' ? 'Administrador' :
    currentUser.role === 'VIEWER' ? 'Solo Lectura' : 'Colaborador'
  );

  return (
    <header className="top-header">
      <div className="header-title-area">
        <h1 className="header-title">{getTabTitle()}</h1>
        <span className="header-badge" style={{ textTransform: 'capitalize' }}>
          <Calendar size={13} style={{ display: 'inline', marginRight: '6px' }} />
          {dateFormatted}
        </span>
      </div>

      <div className="header-actions">

        {/* Botón de Tema claro/oscuro */}
        {onToggleTheme && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card-subtle)',
              fontWeight: 600,
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease',
            }}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={14} style={{ color: '#fbbf24' }} />
                <span style={{ fontSize: '12px' }}>Modo Claro</span>
              </>
            ) : (
              <>
                <Moon size={14} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '12px' }}>Modo Oscuro</span>
              </>
            )}
          </button>
        )}

        {/* Perfil del Usuario Activo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            padding: '5px 12px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: currentUser.avatarColor || '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
              boxShadow: `0 0 0 2px ${currentUser.avatarColor || '#3b82f6'}44`,
            }}
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
              {currentUser.name}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {currentUser.role === 'ADMIN' ? (
                <>
                  <Shield size={10} style={{ color: '#38bdf8' }} />
                  {roleLabel}
                </>
              ) : currentUser.role === 'VIEWER' ? (
                <>
                  <Eye size={10} style={{ color: '#f59e0b' }} />
                  {roleLabel}
                </>
              ) : (
                <>
                  <UserCheck size={10} style={{ color: '#10b981' }} />
                  {roleLabel}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Botón de Cerrar Sesión */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onLogout}
          title="Cerrar sesión de este usuario"
          style={{ gap: '6px', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
        >
          <LogOut size={14} />
          <span>Salir</span>
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => window.location.reload()}
          title="Recargar interfaz"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </header>
  );
};
