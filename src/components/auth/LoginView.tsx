import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, Shield, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { UserProfile } from '../../types/models';
import { ProcessFlowLogo } from '../layout/Logo';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  users: UserProfile[];
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setError('Por favor ingresa tu usuario y contraseña.');
      return;
    }

    setLoading(true);

    try {
      // Intentar autenticación con el backend
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        onLoginSuccess(data.user);
        return;
      }

      setError(data.error || 'Usuario o contraseña incorrectos.');
    } catch {
      // Fallback si backend está en reinicio: validar localmente con la lista de usuarios
      const query = cleanUser.toLowerCase();
      const localUser = users.find(
        (u) =>
          u.name.toLowerCase() === query ||
          (u.username && u.username.toLowerCase() === query) ||
          u.email.toLowerCase() === query
      );

      if (localUser && localUser.password === password) {
        onLoginSuccess(localUser);
        return;
      }

      setError('Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickUser = (user: UserProfile) => {
    setUsername(user.name);
    setPassword('');
    setError(null);
  };

  return (
    <div className="login-screen-container">
      <div className="login-card">
        {/* Encabezado con Logo */}
        <div className="login-header">
          <div className="login-logo-glow">
            <ProcessFlowLogo size={48} />
          </div>
          <h1 className="login-title">GESTIÓN DE INFORMACIÓN</h1>
          <p className="login-subtitle">Informática Operacional • Sistema Central</p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="login-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field-group">
            <label className="login-label">Usuario o Correo</label>
            <div className="login-input-wrapper">
              <User size={18} className="login-input-icon" />
              <input
                type="text"
                className="login-input"
                placeholder="Ej. Jherson, Ludwin..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="login-field-group">
            <label className="login-label">Contraseña</label>
            <div className="login-input-wrapper">
              <Lock size={18} className="login-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit-btn"
            disabled={loading}
          >
            <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Cuentas asignadas para acceso rápido */}
        <div className="login-quick-access">
          <div className="login-quick-header">
            <Sparkles size={13} style={{ color: '#38bdf8' }} />
            <span>Selecciona tu usuario para ingresar:</span>
          </div>
          <div className="login-users-grid">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                className={`login-user-pill ${username.toLowerCase() === u.name.toLowerCase() ? 'active' : ''}`}
                onClick={() => handleSelectQuickUser(u)}
              >
                <div className="user-pill-avatar" style={{ backgroundColor: u.avatarColor }}>
                  {u.name.charAt(0)}
                </div>
                <div className="user-pill-info">
                  <span className="user-pill-name">{u.name}</span>
                  <span className="user-pill-role">
                    {u.role === 'ADMIN' ? '👑 Admin' : u.role === 'VIEWER' ? '👁️ Solo ver' : '💼 Colaborador'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="login-footer">
          <div className="login-status-indicator">
            <span className="online-dot"></span>
            <span>Servidor Central Activo • Red Local Conectada</span>
          </div>
        </div>
      </div>
    </div>
  );
};
