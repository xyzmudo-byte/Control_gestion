import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Archive,
  CheckCircle2,
  Database,
  BookmarkCheck,
  ClipboardList,
  History,
  Rocket,
  Layers,
  Lightbulb,
} from 'lucide-react';
import { AppDataState } from '../../types/models';
import {
  downloadAllDataZip,
  downloadCSV,
  generateDeliverablesCSV,
  generateDeliverableUpdatesCSV,
  generateIdeasCSV,
  generateOccurrencesCSV,
  generatePhasesCSV,
  generateProjectsCSV,
  generateResponsibilitiesCSV,
} from '../../services/exportService';

interface ExportViewProps {
  state: AppDataState;
}

export const ExportView: React.FC<ExportViewProps> = ({ state }) => {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const dateStr = new Date().toISOString().split('T')[0];

  const handleExportZip = async () => {
    setDownloadingZip(true);
    try {
      await downloadAllDataZip(state);
    } catch (e) {
      console.error('Error generando ZIP:', e);
      alert('Hubo un inconveniente al generar el ZIP.');
    } finally {
      setDownloadingZip(false);
    }
  };

  const exportButtons = [
    {
      title: 'Exportar Responsabilidades',
      description: 'Plantillas y reglas de tareas recurrentes.',
      count: state.responsibilities.length,
      icon: <BookmarkCheck size={20} style={{ color: '#38bdf8' }} />,
      onClick: () => {
        const csv = generateResponsibilitiesCSV(state);
        downloadCSV(`responsabilidades_${dateStr}.csv`, csv);
      },
    },
    {
      title: 'Exportar Ocurrencias',
      description: 'Historial de periodos generados y su evaluación.',
      count: state.occurrences.length,
      icon: <CheckCircle2 size={20} style={{ color: '#34d399' }} />,
      onClick: () => {
        const csv = generateOccurrencesCSV(state);
        downloadCSV(`ocurrencias_${dateStr}.csv`, csv);
      },
    },
    {
      title: 'Exportar Entregables',
      description: 'Listado completo con fechas, avance, problemas y evaluación.',
      count: state.deliverables.length,
      icon: <ClipboardList size={20} style={{ color: '#60a5fa' }} />,
      onClick: () => {
        const csv = generateDeliverablesCSV(state);
        downloadCSV(`entregables_${dateStr}.csv`, csv);
      },
    },
    {
      title: 'Exportar Seguimiento / Historial',
      description: 'Todas las actualizaciones cronológicas registradas en entregables.',
      count: state.deliverableUpdates.length,
      icon: <History size={20} style={{ color: '#a855f7' }} />,
      onClick: () => {
        const csv = generateDeliverableUpdatesCSV(state);
        downloadCSV(`seguimiento_historial_${dateStr}.csv`, csv);
      },
    },
    {
      title: 'Exportar Proyectos',
      description: 'Ficha y métricas de portafolio de proyectos.',
      count: state.projects.length,
      icon: <Rocket size={20} style={{ color: '#f59e0b' }} />,
      onClick: () => {
        const csv = generateProjectsCSV(state);
        downloadCSV(`proyectos_${dateStr}.csv`, csv);
      },
    },
    {
      title: 'Exportar Fases de Proyectos',
      description: 'Desglose de fases, fechas de inicio y fin por proyecto.',
      count: state.projectPhases.length,
      icon: <Layers size={20} style={{ color: '#f97316' }} />,
      onClick: () => {
        const csv = generatePhasesCSV(state);
        downloadCSV(`fases_proyectos_${dateStr}.csv`, csv);
      },
    },
    {
      title: 'Exportar Banco de Ideas',
      description: 'Ideas anotadas con su categoría y estado actual.',
      count: state.ideas.length,
      icon: <Lightbulb size={20} style={{ color: '#facc15' }} />,
      onClick: () => {
        const csv = generateIdeasCSV(state);
        downloadCSV(`ideas_${dateStr}.csv`, csv);
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Tarjeta Principal "Exportar Todo en ZIP" */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(168, 85, 247, 0.15))',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Archive size={24} style={{ color: '#60a5fa' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
              Exportar Todo el Sistema (.ZIP Consolidado)
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '540px' }}>
            Genera y descarga un archivo comprimido que contiene un CSV independiente por cada una de las 7 entidades del modelo de datos con codificación UTF-8 compatible con Excel, además de un archivo JSON de respaldo.
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 700 }}
          onClick={handleExportZip}
          disabled={downloadingZip}
        >
          <Download size={18} />
          {downloadingZip ? 'Comprimiendo archivos...' : 'Descargar Todo en ZIP'}
        </button>
      </div>

      {/* Grid de Exportaciones Individuales por Módulo */}
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)', marginBottom: '16px' }}>
          Descarga de Archivos CSV Individuales
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {exportButtons.map((btn, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  {btn.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{btn.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {btn.description} (<strong>{btn.count}</strong> registros)
                  </div>
                </div>
              </div>

              <button className="btn btn-secondary btn-sm" onClick={btn.onClick}>
                <Download size={14} />
                CSV
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Información sobre formato de fecha */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
        ℹ️ <strong>Estándar de Exportación:</strong> Todas las fechas se formatean en el estándar ISO <code>YYYY-MM-DD</code> y el texto se codifica con BOM UTF-8 para garantizar apertura nativa sin problemas de acentos en Microsoft Excel, Google Sheets y LibreOffice Calc.
      </div>
    </div>
  );
};
