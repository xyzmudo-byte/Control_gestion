import React from 'react';
import {
  TrendingUp,
  AlertCircle,
  Clock,
  Rocket,
  Lightbulb,
  CheckCircle2,
  Calendar as CalendarIcon,
  ChevronRight,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';
import { AppDataState, Deliverable } from '../../types/models';
import { calculateDashboardMetrics, getUpcomingDeliverables } from '../../services/metricsService';
import { KpiCard } from '../common/KpiCard';
import { StatusBadge, PriorityBadge, RiskBadge, EvaluationBadge } from '../common/Badges';
import { ProgressBar } from '../common/ProgressBar';
import { ActiveTab } from '../../types/common';

interface DashboardViewProps {
  state: AppDataState;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenDeliverable: (deliverable: Deliverable) => void;
  onOpenNewIdea: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  setActiveTab,
  onOpenDeliverable,
  onOpenNewIdea,
}) => {
  const metrics = calculateDashboardMetrics(state);
  const upcomingDeliverables = getUpcomingDeliverables(state.deliverables, 5);
  const activeProjects = state.projects.filter((p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED');
  const recentIdeas = state.ideas.slice(0, 4);

  // Determinar color del KPI de cumplimiento
  let complianceCardType: 'compliance' | 'warning' | 'danger' | 'neutral' = 'compliance';
  if (metrics.compliancePercentage < 70) complianceCardType = 'danger';
  else if (metrics.compliancePercentage < 85) complianceCardType = 'warning';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. Indicadores Principales (KPIs en Tarjetas Grandes) */}
      <section>
        <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Indicadores Clave del Área
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Evaluaciones registradas: <strong>{metrics.evaluatedCount}</strong> (🟩 {metrics.fulfilledCount} | 🟨 {metrics.delayedCount} | 🟥 {metrics.unfulfilledCount})
          </span>
        </div>

        <div className="kpi-grid">
          <KpiCard
            title="Cumplimiento General"
            value={`${metrics.compliancePercentage}%`}
            subtext={`${metrics.fulfilledCount} a tiempo, ${metrics.delayedCount} retrasados`}
            type={complianceCardType}
            icon={<TrendingUp size={20} />}
          />

          <KpiCard
            title="Entregables Pendientes"
            value={metrics.pendingDeliverables}
            subtext="En proceso o por iniciar"
            type="pending"
            icon={<Clock size={20} />}
            onClick={() => setActiveTab('deliverables')}
          />

          <KpiCard
            title="Próximos a Vencer"
            value={metrics.dueSoonDeliverables}
            subtext="En los próximos 7 días"
            type="warning"
            icon={<AlertCircle size={20} />}
            onClick={() => setActiveTab('deliverables')}
          />

          <KpiCard
            title="Entregables Vencidos"
            value={metrics.overdueDeliverables}
            subtext={metrics.overdueDeliverables > 0 ? 'Requiere atención urgente' : 'Sin entregables atrasados'}
            type={metrics.overdueDeliverables > 0 ? 'danger' : 'neutral'}
            icon={<AlertTriangle size={20} />}
            onClick={() => setActiveTab('deliverables')}
          />

          <KpiCard
            title="Proyectos Activos"
            value={metrics.activeProjects}
            subtext={`${metrics.projectsAtRisk} en riesgo`}
            type={metrics.projectsAtRisk > 0 ? 'warning' : 'purple'}
            icon={<Rocket size={20} />}
            onClick={() => setActiveTab('projects')}
          />

          <KpiCard
            title="Ideas Nuevas"
            value={metrics.newIdeas}
            subtext="Registradas recientemente"
            type="purple"
            icon={<Lightbulb size={20} />}
            onClick={() => setActiveTab('ideas')}
          />
        </div>
      </section>

      {/* 2. Resumen Temporal de Entregables */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Entregas para Hoy
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>
              {metrics.deliverablesToday}
            </div>
          </div>
          <span className="badge badge-info">Hoy</span>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Entregas Esta Semana
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>
              {metrics.deliverablesThisWeek}
            </div>
          </div>
          <span className="badge badge-purple">Semana</span>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Entregas Este Mes
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>
              {metrics.deliverablesThisMonth}
            </div>
          </div>
          <span className="badge badge-neutral">Mes</span>
        </div>
      </section>

      {/* 3. Próximos Entregables Prioritarios */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Próximos Entregables Prioritarios
          </h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab('deliverables')}
          >
            Ver todos los entregables ({state.deliverables.length})
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Entregable</th>
                <th>Fecha Programada</th>
                <th>Estado</th>
                <th>Avance</th>
                <th>Prioridad</th>
                <th>Problemas / Ayuda</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {upcomingDeliverables.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No hay entregables pendientes. ¡Todo al día!
                  </td>
                </tr>
              ) : (
                upcomingDeliverables.map((deliv) => (
                  <tr key={deliv.id} style={{ cursor: 'pointer' }} onClick={() => onOpenDeliverable(deliv)}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{deliv.name}</div>
                      {deliv.description && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '380px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {deliv.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{deliv.scheduledDate}</span>
                    </td>
                    <td>
                      <StatusBadge status={deliv.status} scheduledDate={deliv.scheduledDate} />
                    </td>
                    <td style={{ minWidth: '130px' }}>
                      <ProgressBar progress={deliv.progress} showText />
                    </td>
                    <td>
                      <PriorityBadge priority={deliv.priority} />
                    </td>
                    <td>
                      {deliv.hasIssue && (
                        <span className="badge badge-danger" style={{ marginRight: '4px' }} title={deliv.issueDescription}>
                          ⚠️ Problema
                        </span>
                      )}
                      {deliv.needsHelp && (
                        <span className="badge badge-warning" title={deliv.helpDescription}>
                          🙋 Necesita Ayuda
                        </span>
                      )}
                      {!deliv.hasIssue && !deliv.needsHelp && (
                        <span style={{ color: 'var(--text-subtle)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDeliverable(deliv);
                        }}
                      >
                        Abrir Ficha
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Sección Dividida: Proyectos Activos + Ideas Recientes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Proyectos Activos */}
        <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Rocket size={16} style={{ color: '#a855f7' }} />
              Proyectos en Ejecución
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('projects')}>
              Ver todos
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activeProjects.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                No hay proyectos activos actualmente.
              </div>
            ) : (
              activeProjects.slice(0, 4).map((project) => (
                <div
                  key={project.id}
                  style={{
                    padding: '12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{project.name}</span>
                    <RiskBadge risk={project.risk} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <span>Fecha objetivo: <strong>{project.targetDate}</strong></span>
                    <span>Avance: <strong>{project.progress}%</strong></span>
                  </div>
                  <ProgressBar progress={project.progress} height={6} />
                </div>
              ))
            )}
          </div>
        </section>

        {/* Ideas Recientes */}
        <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={16} style={{ color: '#facc15' }} />
              Ideas Registradas
            </h3>
            <button className="btn btn-primary btn-sm" onClick={onOpenNewIdea}>
              <PlusCircle size={14} />
              Nueva Idea
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentIdeas.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                No hay ideas registradas todavía. ¡Anota cualquier propuesta técnica!
              </div>
            ) : (
              recentIdeas.map((idea) => (
                <div
                  key={idea.id}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{idea.title}</span>
                    <span className="badge badge-purple" style={{ fontSize: '10px' }}>{idea.category}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{idea.description}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-subtle)', textAlign: 'right' }}>{idea.date}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
