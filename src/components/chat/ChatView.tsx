import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Hash,
  BookmarkCheck,
  Check,
  Clock,
  Sparkles,
  CheckCheck,
} from 'lucide-react';
import { AppDataState, ChatMessage, UserProfile } from '../../types/models';

interface ChatViewProps {
  state: AppDataState;
  currentUser: UserProfile;
  onSendMessage: (item: Omit<ChatMessage, 'id' | 'timestamp' | 'read'>) => Promise<any>;
  onConvertMessageToLogbook: (message: ChatMessage, userId: string) => Promise<any>;
}

export const ChatView: React.FC<ChatViewProps> = ({
  state,
  currentUser,
  onSendMessage,
  onConvertMessageToLogbook,
}) => {
  const [activeChannel, setActiveChannel] = useState<'general' | 'operaciones' | 'proyectos'>('operaciones');
  const [inputText, setInputText] = useState('');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const channels: { id: 'general' | 'operaciones' | 'proyectos'; name: string; desc: string }[] = [
    { id: 'operaciones', name: 'Operaciones y Flota', desc: 'Canal para reportes diarios, kilómetros y novedades' },
    { id: 'general', name: 'Informática Operacional', desc: 'Canal general de anuncios y coordinación de equipo' },
    { id: 'proyectos', name: 'Proyectos y Desarrollo', desc: 'Canal para seguimiento de hitos y tareas en curso' },
  ];

  // Mensajes del canal activo
  const channelMessages = state.chatMessages.filter((m) => m.channel === activeChannel);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    await onSendMessage({
      senderId: currentUser.id,
      senderName: `${currentUser.name} (${currentUser.role === 'ADMIN' ? 'Admin' : 'TI'})`,
      channel: activeChannel,
      message: inputText.trim(),
      isDemo: false,
    });

    setInputText('');
  };

  const handleConvert = async (msg: ChatMessage) => {
    setConvertingId(msg.id);
    await onConvertMessageToLogbook(msg, currentUser.id);
    setTimeout(() => setConvertingId(null), 2000);
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gap: '16px',
        height: 'calc(100vh - 160px)',
        minHeight: '520px',
      }}
    >
      {/* Barra Lateral de Canales y Usuarios */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={16} style={{ color: '#38bdf8' }} />
            <span>Canales y Mensajería</span>
          </div>
        </div>

        {/* Lista de Canales */}
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)', marginBottom: '4px', fontWeight: 600 }}>
            Canales de Trabajo
          </div>

          {channels.map((ch) => {
            const isActive = activeChannel === ch.id;
            const count = state.chatMessages.filter((m) => m.channel === ch.id).length;

            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: isActive ? '#60a5fa' : 'var(--text-muted)',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Hash size={15} style={{ color: isActive ? '#38bdf8' : 'var(--text-subtle)' }} />
                  <span>{ch.name}</span>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Miembros del Equipo */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-subtle)', marginBottom: '8px', fontWeight: 600 }}>
            Miembros Conectados
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {state.users.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: u.id === currentUser.id ? 'var(--text-main)' : 'var(--text-muted)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: u.id === currentUser.id ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                  }}
                />
                <span style={{ fontWeight: u.id === currentUser.id ? 700 : 500 }}>
                  {u.name} {u.id === currentUser.id && '(Tú)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Área Principal de Conversación */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera del Canal */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Hash size={18} style={{ color: '#38bdf8' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                #{channels.find((c) => c.id === activeChannel)?.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {channels.find((c) => c.id === activeChannel)?.desc}
              </div>
            </div>
          </div>

          <div className="badge badge-success" style={{ fontSize: '11px' }}>
            Canal Activo
          </div>
        </div>

        {/* Hilo de Mensajes */}
        <div
          style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {channelMessages.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', fontSize: '13px' }}>
              No hay mensajes en este canal todavía. Sé el primero en escribir.
            </div>
          ) : (
            channelMessages.map((msg) => {
              const isMine = msg.senderId === currentUser.id;
              const isConverted = Boolean(msg.convertedToLogbookId);

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-subtle)', alignSelf: isMine ? 'flex-end' : 'flex-start' }}>
                    <span style={{ fontWeight: 600, color: isMine ? '#60a5fa' : 'var(--text-main)' }}>
                      {msg.senderName}
                    </span>
                    <span>•</span>
                    <span>{formatTime(msg.timestamp)}</span>
                  </div>

                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isMine ? 'var(--primary-accent)' : 'var(--bg-surface)',
                      color: 'white',
                      border: isMine ? 'none' : '1px solid var(--border-subtle)',
                      boxShadow: 'var(--shadow-sm)',
                      fontSize: '13.5px',
                      lineHeight: 1.45,
                    }}
                  >
                    {msg.message}
                  </div>

                  {/* BOTÓN: Convertir mensaje en pendiente (Bitácora) */}
                  <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={() => handleConvert(msg)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderColor: isConverted ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)',
                        color: isConverted ? '#10b981' : 'var(--text-muted)',
                      }}
                      title="Genera automáticamente un recordatorio personal en tu Bitácora a partir de este mensaje"
                    >
                      {convertingId === msg.id || isConverted ? (
                        <>
                          <Check size={11} style={{ color: '#10b981' }} />
                          <span style={{ color: '#10b981' }}>Pendiente Creado en Bitácora</span>
                        </>
                      ) : (
                        <>
                          <BookmarkCheck size={11} style={{ color: '#f59e0b' }} />
                          <span>Convertir en Pendiente</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input para Enviar Mensaje */}
        <form
          onSubmit={handleSend}
          style={{
            padding: '16px',
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '10px',
          }}
        >
          <input
            type="text"
            placeholder={`Escribe un mensaje en #${channels.find((c) => c.id === activeChannel)?.name}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="form-control"
            style={{ flex: 1 }}
          />

          <button type="submit" className="btn btn-primary" disabled={!inputText.trim()}>
            <Send size={15} />
            <span>Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
};
