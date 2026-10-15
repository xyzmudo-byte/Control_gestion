import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  Plus,
  Search,
  Filter,
  Layers,
  ChevronRight,
  ChevronDown,
  Tag,
  User,
  Hash,
  Activity,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Edit2,
  Trash2,
  BookmarkCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  AppDataState,
  ProcessItem,
  Responsibility,
  ResponsibilityOccurrence,
  FrequencyType,
  OperationalStatus,
  EvaluationResult,
  UserProfile,
} from '../../types/models';
import { Modal } from '../common/Modal';
import { StatusBadge, EvaluationBadge } from '../common/Badges';
import { ProgressBar } from '../common/ProgressBar';
import { parseProcessFile, downloadProcessTemplateCSV } from '../../services/processImportService';

interface ResponsibilitiesViewProps {
  state: AppDataState;
  currentUser: UserProfile;
  onAddProcess: (item: Omit<ProcessItem, 'id' | 'createdAt'>) => Promise<any>;
  onUpdateProcess: (id: string, updates: Partial<ProcessItem>) => Promise<any>;
  onDeleteProcess: (id: string) => Promise<any>;
  onImportBulkProcesses: (items: ProcessItem[], replaceAll?: boolean) => Promise<any>;
  onAddResponsibility: (item: Omit<Responsibility, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  onUpdateResponsibility: (id: string, updates: Partial<Responsibility>) => Promise<any>;
  onDeleteResponsibility: (id: string) => Promise<any>;
  onAddOccurrence: (item: Omit<ResponsibilityOccurrence, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  onUpdateOccurrence: (id: string, updates: Partial<ResponsibilityOccurrence>) => Promise<any>;
  onDeleteOccurrence: (id: string) => Promise<any>;
}

export const ResponsibilitiesView: React.FC<ResponsibilitiesViewProps> = ({
  state,
  currentUser,
  onAddProcess,
  onUpdateProcess,
  onDeleteProcess,
  onImportBulkProcesses,
  onAddResponsibility,
  onUpdateResponsibility,
  onDeleteResponsibility,
  onAddOccurrence,
  onUpdateOccurrence,
  onDeleteOccurrence,
}) => {
  const isViewer = currentUser.role === 'VIEWER';
  const isAdmin = currentUser.role === 'ADMIN';
  // Tabs principales: Mapa de Procesos vs Recurrencias
  const [mainTab, setMainTab] = useState<'process_map' | 'recurrences'>('process_map');

  // Filtros de procesos
  const [searchQuery, setSearchQuery] = useState('');
  const [macroFilter, setMacroFilter] = useState('ALL');
  const [responsibleFilter, setResponsibleFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'hierarchy' | 'table'>('hierarchy');

  // Estado del acordeón jerárquico
  const [expandedMacros, setExpandedMacros] = useState<Record<string, boolean>>({});
  const [expandedProcs, setExpandedProcs] = useState<Record<string, boolean>>({});

  // Modales
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<ProcessItem | null>(null);

  // Archivo a importar
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importingFile, setImportingFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ProcessItem[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importingLoading, setImportingLoading] = useState(false);
  const [replaceAllImport, setReplaceAllImport] = useState(false);

  // Formulario manual de proceso
  const [procForm, setProcForm] = useState<{
    macroproceso: string;
    proceso: string;
    codigoN12: string;
    subproceso: string;
    fase: string;
    actividades: string;
    keyword: string;
    responsable: string;
  }>({
    macroproceso: '',
    proceso: '',
    codigoN12: '',
    subproceso: '',
    fase: '',
    actividades: '',
    keyword: '',
    responsable: 'Jason',
  });

  // Lista de usuarios asignables (excluyendo observadores como Lorena y Edgar)
  const assignableUsers = (state.users || []).filter((u) => u.role !== 'VIEWER');

  // Opciones únicas para filtros
  const macroOptions = Array.from(new Set(state.processes.map((p) => p.macroproceso).filter(Boolean)));
  const responsibleOptions = Array.from(new Set(state.processes.map((p) => p.responsable).filter(Boolean)));

  // Procesos filtrados
  const filteredProcesses = state.processes.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.macroproceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.proceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subproceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.actividades.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.keyword && p.keyword.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.codigoN12 && p.codigoN12.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.responsable.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMacro = macroFilter === 'ALL' || p.macroproceso === macroFilter;
    const matchesResp = responsibleFilter === 'ALL' || p.responsable === responsibleFilter;

    return matchesSearch && matchesMacro && matchesResp;
  });

  // Estructura agrupada para vista jerárquica: Macroproceso -> Proceso -> Subproceso -> Actividades
  const hierarchyData = React.useMemo(() => {
    const map: Record<string, Record<string, Record<string, ProcessItem[]>>> = {};

    filteredProcesses.forEach((item) => {
      const macro = item.macroproceso || 'Sin Macroproceso';
      const proc = item.proceso || 'Sin Proceso';
      const sub = item.subproceso || 'General';

      if (!map[macro]) map[macro] = {};
      if (!map[macro][proc]) map[macro][proc] = {};
      if (!map[macro][proc][sub]) map[macro][proc][sub] = [];

      map[macro][proc][sub].push(item);
    });

    return map;
  }, [filteredProcesses]);

  const toggleMacro = (macro: string) => {
    setExpandedMacros((prev) => ({ ...prev, [macro]: !prev[macro] }));
  };

  const toggleProc = (key: string) => {
    setExpandedProcs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Manejador de archivo seleccionado para importar
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingFile(file);
    setImportingLoading(true);
    setImportErrors([]);

    const result = await parseProcessFile(file);
    setImportingLoading(false);

    if (result.success) {
      setImportPreview(result.items);
      setImportErrors([]);
    } else {
      setImportPreview([]);
      setImportErrors(result.errors);
    }
  };

  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    await onImportBulkProcesses(importPreview, replaceAllImport);
    setIsImportModalOpen(false);
    setImportingFile(null);
    setImportPreview([]);
    setImportErrors([]);
  };

  const handleOpenProcessModal = (item?: ProcessItem) => {
    if (item) {
      setEditingProcess(item);
      setProcForm({
        macroproceso: item.macroproceso,
        proceso: item.proceso,
        codigoN12: item.codigoN12 || '',
        subproceso: item.subproceso,
        fase: item.fase || '',
        actividades: item.actividades,
        keyword: item.keyword || '',
        responsable: item.responsable,
      });
    } else {
      setEditingProcess(null);
      setProcForm({
        macroproceso: '',
        proceso: '',
        codigoN12: '',
        subproceso: '',
        fase: '',
        actividades: '',
        keyword: '',
        responsable: 'Jason',
      });
    }
    setIsProcessModalOpen(true);
  };

  const handleSaveProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procForm.proceso || !procForm.actividades) {
      alert('Por favor completa al menos el Proceso y las Actividades.');
      return;
    }

    if (editingProcess) {
      await onUpdateProcess(editingProcess.id, {
        macroproceso: procForm.macroproceso || 'Gestión Operativa',
        proceso: procForm.proceso,
        codigoN12: procForm.codigoN12,
        subproceso: procForm.subproceso || 'General',
        fase: procForm.fase,
        actividades: procForm.actividades,
        keyword: procForm.keyword,
        responsable: procForm.responsable,
      });
    } else {
      await onAddProcess({
        macroproceso: procForm.macroproceso || 'Gestión Operativa',
        proceso: procForm.proceso,
        codigoN12: procForm.codigoN12 || `P-${Date.now().toString().slice(-4)}`,
        subproceso: procForm.subproceso || 'General',
        fase: procForm.fase,
        actividades: procForm.actividades,
        keyword: procForm.keyword,
        responsable: procForm.responsable,
        isDemo: false,
      });
    }

    setIsProcessModalOpen(false);
  };

  return (
    <div>
      {/* Selector de Subpestañas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          className={`btn ${mainTab === 'process_map' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMainTab('process_map')}
        >
          <Layers size={16} />
          <span>Mapa de Procesos (Matriz y Jerarquía)</span>
          <span className="badge badge-info" style={{ marginLeft: '4px' }}>
            {state.processes.length}
          </span>
        </button>

        <button
          className={`btn ${mainTab === 'recurrences' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMainTab('recurrences')}
        >
          <BookmarkCheck size={16} />
          <span>Reglas de Recurrencia Históricas</span>
          <span className="badge badge-neutral" style={{ marginLeft: '4px' }}>
            {state.responsibilities.length}
          </span>
        </button>
      </div>

      {mainTab === 'process_map' && (
        <>
          {/* Barra de Filtros y Acciones de Importación */}
          <div className="filter-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar por macroproceso, código N12, actividad, keyword o responsable..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={macroFilter}
                onChange={(e) => setMacroFilter(e.target.value)}
                className="form-control"
                style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
              >
                <option value="ALL">Todos los Macroprocesos</option>
                {macroOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={responsibleFilter}
                onChange={(e) => setResponsibleFilter(e.target.value)}
                className="form-control"
                style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
              >
                <option value="ALL">Todos los Responsables</option>
                {responsibleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {/* Toggle de Modo de Vista */}
              <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <button
                  onClick={() => setViewMode('hierarchy')}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: viewMode === 'hierarchy' ? 'var(--primary-accent)' : 'transparent',
                    color: viewMode === 'hierarchy' ? 'white' : 'var(--text-muted)',
                  }}
                >
                  Jerarquía
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: viewMode === 'table' ? 'var(--primary-accent)' : 'transparent',
                    color: viewMode === 'table' ? 'white' : 'var(--text-muted)',
                  }}
                >
                  Matriz / Tabla
                </button>
              </div>

              {/* Botón Importar Excel / CSV - Solo Admin */}
              {!isViewer && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsImportModalOpen(true)}
                  title="Importar estructura de procesos desde archivo Excel (.xlsx/.xls) o CSV"
                  style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                >
                  <Upload size={14} />
                  <span>Importar Excel / CSV</span>
                </button>
              )}

              {!isViewer && (
                <button className="btn btn-primary" onClick={() => handleOpenProcessModal()}>
                  <Plus size={14} />
                  <span>Nuevo Proceso</span>
                </button>
              )}
            </div>
          </div>

          {/* VISTA 1: Jerarquía Visual Macroproceso → Proceso → Subproceso → Actividades */}
          {viewMode === 'hierarchy' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.keys(hierarchyData).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                  <Layers size={40} style={{ color: 'var(--text-subtle)', marginBottom: '12px' }} />
                  <div style={{ fontSize: '16px', fontWeight: 600 }}>No se encontraron procesos registrados</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '16px' }}>
                    Puedes importar una estructura desde un archivo Excel o registrar tu primer proceso manualmente.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                    <button className="btn btn-primary" onClick={() => setIsImportModalOpen(true)}>
                      <Upload size={14} />
                      <span>Importar Excel / CSV</span>
                    </button>
                    <button className="btn btn-secondary" onClick={() => handleOpenProcessModal()}>
                      <Plus size={14} />
                      <span>Crear Proceso</span>
                    </button>
                  </div>
                </div>
              ) : (
                Object.entries(hierarchyData).map(([macroName, procesos]) => {
                  const isMacroOpen = expandedMacros[macroName] !== false; // Default abierto

                  return (
                    <div
                      key={macroName}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Cabecera de Macroproceso */}
                      <div
                        onClick={() => toggleMacro(macroName)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px 20px',
                          backgroundColor: 'var(--bg-surface)',
                          cursor: 'pointer',
                          borderBottom: isMacroOpen ? '1px solid var(--border-color)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: '#38bdf8' }}>
                            {isMacroOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </span>
                          <span className="badge badge-info" style={{ fontSize: '11px' }}>
                            MACROPROCESO
                          </span>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {macroName}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {Object.keys(procesos).length} procesos
                          </span>
                        </div>
                      </div>

                      {/* Cuerpo de Procesos */}
                      {isMacroOpen && (
                        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {Object.entries(procesos).map(([procName, subprocesos]) => {
                            const procKey = `${macroName}__${procName}`;
                            const isProcOpen = expandedProcs[procKey] !== false;

                            return (
                              <div
                                key={procKey}
                                style={{
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: 'rgba(30, 41, 59, 0.4)',
                                  overflow: 'hidden',
                                }}
                              >
                                {/* Cabecera de Proceso */}
                                <div
                                  onClick={() => toggleProc(procKey)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    backgroundColor: 'rgba(51, 65, 85, 0.3)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      {isProcOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </span>
                                    <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                                      PROCESO
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                                      {procName}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                                      {Object.keys(subprocesos).length} subprocesos
                                    </span>
                                  </div>
                                </div>

                                {/* Subprocesos y Actividades */}
                                {isProcOpen && (
                                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {Object.entries(subprocesos).map(([subName, items]) => (
                                      <div
                                        key={subName}
                                        style={{
                                          padding: '12px 14px',
                                          backgroundColor: 'var(--bg-surface)',
                                          borderRadius: 'var(--radius-md)',
                                          border: '1px solid var(--border-subtle)',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 700 }}>
                                              ↳ Subproceso:
                                            </span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                                              {subName}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Lista de Actividades y Tareas del Subproceso */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                                          {items.map((item) => (
                                            <div
                                              key={item.id}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                justifyContent: 'space-between',
                                                padding: '10px 12px',
                                                backgroundColor: 'var(--bg-card)',
                                                border: '1px solid var(--border-subtle)',
                                                borderRadius: 'var(--radius-sm)',
                                                gap: '12px',
                                              }}
                                            >
                                              <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                  {item.codigoN12 && (
                                                    <span className="badge badge-neutral" style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                                                      <Hash size={10} style={{ marginRight: '2px' }} />
                                                      {item.codigoN12}
                                                    </span>
                                                  )}
                                                  {item.fase && (
                                                    <span className="badge badge-info" style={{ fontSize: '10px' }}>
                                                      {item.fase}
                                                    </span>
                                                  )}
                                                  <span className="badge badge-success" style={{ fontSize: '10px' }}>
                                                    <User size={10} style={{ marginRight: '3px' }} />
                                                    {item.responsable}
                                                  </span>
                                                  {item.keyword && (
                                                    <span style={{ fontSize: '11px', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                      <Tag size={11} />
                                                      {item.keyword}
                                                    </span>
                                                  )}
                                                </div>

                                                <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.4 }}>
                                                  {item.actividades}
                                                </div>
                                              </div>

                                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <button
                                                  className="btn btn-secondary btn-sm"
                                                  onClick={() => handleOpenProcessModal(item)}
                                                  title="Editar actividad"
                                                >
                                                  <Edit2 size={12} />
                                                </button>
                                                <button
                                                  className="btn btn-danger btn-sm"
                                                  onClick={() => {
                                                    if (confirm('¿Deseas eliminar este registro del mapa de procesos?')) {
                                                      onDeleteProcess(item.id);
                                                    }
                                                  }}
                                                  title="Eliminar"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* VISTA 2: Matriz / Tabla de Procesos */
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código N12</th>
                    <th>Macro proceso</th>
                    <th>Proceso</th>
                    <th>Sub proceso</th>
                    <th>Fase</th>
                    <th>Actividades / Tareas</th>
                    <th>Keyword</th>
                    <th>Responsable</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProcesses.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No hay procesos que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredProcesses.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8' }}>
                            {p.codigoN12 || '-'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{p.macroproceso}</span>
                        </td>
                        <td>{p.proceso}</td>
                        <td>{p.subproceso}</td>
                        <td>{p.fase || '-'}</td>
                        <td style={{ maxWidth: '300px' }}>{p.actividades}</td>
                        <td>
                          {p.keyword ? (
                            <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                              {p.keyword}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <span className="badge badge-success" style={{ fontSize: '11px' }}>
                            {p.responsable}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenProcessModal(p)}
                              title="Editar"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                if (confirm('¿Eliminar proceso?')) onDeleteProcess(p.id);
                              }}
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Subpestaña 2: Recurrencias clásicas */}
      {mainTab === 'recurrences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Plantillas de responsabilidades que generan ocurrencias periódicas automáticas.
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Responsabilidad</th>
                  <th>Frecuencia</th>
                  <th>Día / Horario</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {state.responsibilities.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.description}</div>
                    </td>
                    <td>
                      <span className="badge badge-info">{r.frequency}</span>
                    </td>
                    <td>{r.deliveryDay}</td>
                    <td>
                      <span className={`badge ${r.isActive ? 'badge-success' : 'badge-neutral'}`}>
                        {r.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          if (confirm('¿Deseas eliminar esta regla de recurrencia?')) onDeleteResponsibility(r.id);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Importar Archivo Excel / CSV */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportingFile(null);
          setImportPreview([]);
          setImportErrors([]);
        }}
        title="Importar Estructura del Mapa de Procesos"
        maxWidth="750px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Sube un archivo <strong>Excel (.xlsx, .xls)</strong> o <strong>CSV</strong> con las columnas del mapa de procesos:
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
              <span className="badge badge-neutral">Macro proceso</span>
              <span className="badge badge-neutral">Proceso</span>
              <span className="badge badge-neutral">N12 / Código</span>
              <span className="badge badge-neutral">Sub proceso</span>
              <span className="badge badge-neutral">Fase</span>
              <span className="badge badge-neutral">Actividades / Tareas</span>
              <span className="badge badge-neutral">Keyword</span>
              <span className="badge badge-neutral">Responsable</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => downloadProcessTemplateCSV()}
            >
              <Download size={13} />
              <span>Descargar Plantilla de Ejemplo (.CSV)</span>
            </button>
          </div>

          {/* Área Drag-and-drop / Input file */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: 'var(--bg-input)',
              transition: 'all 0.15s',
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv, .txt"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <FileSpreadsheet size={36} style={{ color: '#38bdf8', marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {importingFile ? importingFile.name : 'Haz clic para seleccionar archivo Excel o CSV'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '4px' }}>
              Soporta archivos generados desde Excel, SharePoint o LibreOffice
            </div>
          </div>

          {/* Estado de carga */}
          {importingLoading && (
            <div style={{ textAlign: 'center', padding: '12px', color: '#38bdf8' }}>
              Leyendo y validando columnas del archivo...
            </div>
          )}

          {/* Errores */}
          {importErrors.length > 0 && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 'var(--radius-md)', padding: '12px', color: '#f87171', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <AlertCircle size={15} />
                <span>Problema al procesar el archivo:</span>
              </div>
              <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
                {importErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Previsualización */}
          {importPreview.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={15} />
                  <span>Se detectaron {importPreview.length} registros válidos listos para importar.</span>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={replaceAllImport}
                    onChange={(e) => setReplaceAllImport(e.target.checked)}
                  />
                  <span>Reemplazar mapa actual</span>
                </label>
              </div>

              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <table className="data-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Macroproceso</th>
                      <th>Proceso</th>
                      <th>Subproceso</th>
                      <th>Actividad</th>
                      <th>Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.codigoN12 || '-'}</td>
                        <td>{row.macroproceso}</td>
                        <td>{row.proceso}</td>
                        <td>{row.subproceso}</td>
                        <td style={{ maxWidth: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {row.actividades}
                        </td>
                        <td>{row.responsable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importPreview.length > 10 && (
                <div style={{ fontSize: '11px', color: 'var(--text-subtle)', textAlign: 'right', marginTop: '4px' }}>
                  Mostrando primeros 10 de {importPreview.length} registros
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportingFile(null);
                setImportPreview([]);
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={importPreview.length === 0}
              onClick={handleConfirmImport}
            >
              Confirmar e Importar {importPreview.length > 0 ? `(${importPreview.length})` : ''}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Crear / Editar Proceso Manual */}
      <Modal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        title={editingProcess ? 'Editar Proceso / Actividad' : 'Nuevo Registro de Proceso'}
      >
        <form onSubmit={handleSaveProcess}>
          <div className="form-group">
            <label className="form-label">Macro proceso *</label>
            <input
              type="text"
              placeholder="ej. Gestión de TI y Operaciones"
              value={procForm.macroproceso}
              onChange={(e) => setProcForm({ ...procForm, macroproceso: e.target.value })}
              className="form-control"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Proceso *</label>
              <input
                type="text"
                placeholder="ej. Operaciones de Red e Infraestructura"
                value={procForm.proceso}
                onChange={(e) => setProcForm({ ...procForm, proceso: e.target.value })}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">N12 / Código</label>
              <input
                type="text"
                placeholder="ej. N12-001"
                value={procForm.codigoN12}
                onChange={(e) => setProcForm({ ...procForm, codigoN12: e.target.value })}
                className="form-control"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Sub proceso</label>
              <input
                type="text"
                placeholder="ej. Monitoreo y Enlaces VPN"
                value={procForm.subproceso}
                onChange={(e) => setProcForm({ ...procForm, subproceso: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fase / Periodicidad</label>
              <input
                type="text"
                placeholder="ej. Diaria, Semanal, Fase 1"
                value={procForm.fase}
                onChange={(e) => setProcForm({ ...procForm, fase: e.target.value })}
                className="form-control"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Actividades / Tareas *</label>
            <textarea
              rows={3}
              placeholder="Descripción de las actividades ejecutadas en este proceso..."
              value={procForm.actividades}
              onChange={(e) => setProcForm({ ...procForm, actividades: e.target.value })}
              className="form-control"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Keywords / Etiquetas</label>
              <input
                type="text"
                placeholder="ej. VPN, Enlaces, Servidores"
                value={procForm.keyword}
                onChange={(e) => setProcForm({ ...procForm, keyword: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Responsable *</label>
              <select
                value={procForm.responsable}
                onChange={(e) => setProcForm({ ...procForm, responsable: e.target.value })}
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
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsProcessModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editingProcess ? 'Guardar Cambios' : 'Registrar Proceso'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
