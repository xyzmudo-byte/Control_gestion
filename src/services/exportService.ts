import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { AppDataState } from '../types/models';

// Utilidad para convertir arreglo de objetos a CSV con escape seguro
const arrayToCSV = (data: Record<string, any>[]): string => {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map((obj) =>
    headers
      .map((header) => {
        let val = obj[header];
        if (val === null || val === undefined) {
          val = '';
        } else if (typeof val === 'object') {
          val = JSON.stringify(val);
        } else {
          val = String(val);
        }
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(',')
  );

  return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
};

// 1. MAPA DE PROCESOS
export const generateProcessesCSV = (state: AppDataState): string => {
  const data = state.processes.map((p) => ({
    ID: p.id,
    MACROPROCESO: p.macroproceso,
    PROCESO: p.proceso,
    CODIGO_N12: p.codigoN12 || '',
    SUBPROCESO: p.subproceso,
    FASE: p.fase || '',
    ACTIVIDADES_TAREAS: p.actividades,
    KEYWORD: p.keyword || '',
    RESPONSABLE: p.responsable,
    FECHA_REGISTRO: p.createdAt ? p.createdAt.split('T')[0] : '',
  }));
  return arrayToCSV(data);
};

// 2. RESPONSABILIDADES RECURRENTES
export const generateResponsibilitiesCSV = (state: AppDataState): string => {
  const data = state.responsibilities.map((r) => ({
    ID: r.id,
    NOMBRE: r.name,
    DESCRIPCION: r.description,
    FRECUENCIA: r.frequency,
    DIA_ENTREGA: r.deliveryDay,
    ACTIVO: r.isActive ? 'SI' : 'NO',
    ES_DEMO: r.isDemo ? 'SI' : 'NO',
    FECHA_CREACION: r.createdAt ? r.createdAt.split('T')[0] : '',
    FECHA_ACTUALIZACION: r.updatedAt ? r.updatedAt.split('T')[0] : '',
  }));
  return arrayToCSV(data);
};

export const generateOccurrencesCSV = (state: AppDataState): string => {
  const data = state.occurrences.map((o) => {
    const resp = state.responsibilities.find((r) => r.id === o.responsibilityId);
    return {
      ID: o.id,
      RESPONSABILIDAD_ID: o.responsibilityId,
      RESPONSABILIDAD_NOMBRE: resp?.name || '',
      PERIODO: o.periodLabel,
      FECHA_PROGRAMADA: o.scheduledDate,
      FECHA_REAL_ENTREGA: o.realDeliveryDate || '',
      ESTADO: o.status,
      AVANCE_PORCENTAJE: o.progress,
      EVALUACION_RESULTADO: o.evaluation?.result || 'NOT_EVALUATED',
      EVALUACION_DEMORA_DIAS: o.evaluation?.delayDays ?? '',
      EVALUACION_COMENTARIOS: o.evaluation?.comments || '',
      COMENTARIOS: o.comments || '',
      ES_DEMO: o.isDemo ? 'SI' : 'NO',
    };
  });
  return arrayToCSV(data);
};

// 3. ENTREGABLES
export const generateDeliverablesCSV = (state: AppDataState): string => {
  const data = state.deliverables.map((d) => {
    const proj = state.projects.find((p) => p.id === d.projectId);
    const phase = state.projectPhases.find((ph) => ph.id === d.projectPhaseId);

    return {
      ID: d.id,
      NOMBRE: d.name,
      DESCRIPCION: d.description,
      RESPONSABLE: d.responsiblePerson || '',
      TIPO: d.type || (d.isRecurring ? 'RECURRENTE' : 'PUNTUAL'),
      FECHA_PROGRAMADA: d.scheduledDate,
      HORA_LIMITE: d.dueTime || '',
      FECHA_REAL_ENTREGA: d.realDeliveryDate || '',
      ESTADO: d.status,
      AVANCE_PORCENTAJE: d.progress,
      PRIORIDAD: d.priority,
      ES_RECURRENTE: d.isRecurring ? 'SI' : 'NO',
      FRECUENCIA: d.recurrenceFrequency || '',
      DIA_RECURRENCIA: d.recurrenceDay || '',
      ENLACE_SHAREPOINT: d.locationUrl || '',
      RUTA_LOCAL_WINDOWS: d.locationLocalPath || '',
      PROYECTO_RELACIONADO: proj?.name || '',
      FASE_RELACIONADA: phase?.name || '',
      TIENE_PROBLEMA: d.hasIssue ? 'SI' : 'NO',
      TIPO_PROBLEMA: d.issueType || '',
      DESCRIPCION_PROBLEMA: d.issueDescription || '',
      NECESITA_AYUDA: d.needsHelp ? 'SI' : 'NO',
      DESCRIPCION_AYUDA: d.helpDescription || '',
      ES_DEMO: d.isDemo ? 'SI' : 'NO',
    };
  });
  return arrayToCSV(data);
};

// 4. PROYECTOS, HITOS Y TAREAS
export const generateProjectsCSV = (state: AppDataState): string => {
  const data = state.projects.map((p) => ({
    ID: p.id,
    NOMBRE: p.name,
    DESCRIPCION: p.description,
    OBJETIVO: p.objective,
    RESPONSABLE: p.responsible || '',
    FECHA_INICIO: p.startDate,
    FECHA_LIMITE: p.targetDate,
    ESTADO: p.status,
    AVANCE_PORCENTAJE: p.progress,
    NIVEL_RIESGO: p.risk,
    PRIORIDAD: p.priority,
    ES_DEMO: p.isDemo ? 'SI' : 'NO',
  }));
  return arrayToCSV(data);
};

export const generateMilestonesCSV = (state: AppDataState): string => {
  const data = (state.projectMilestones || []).map((m) => {
    const proj = state.projects.find((p) => p.id === m.projectId);
    return {
      ID: m.id,
      PROYECTO_ID: m.projectId,
      PROYECTO_NOMBRE: proj?.name || '',
      HITO_TITULO: m.title,
      FECHA_LIMITE: m.targetDate,
      COMPLETADO: m.completed ? 'SI' : 'NO',
      FECHA_COMPLETADO: m.completedDate || '',
    };
  });
  return arrayToCSV(data);
};

// INSERTADO POSTERIOR A DESARROLLO DE ANTIGRAVITY
// FASES DE PROYECTOS
export const generatePhasesCSV = (state: AppDataState): string => {
  const data = (state.projectPhases || []).map((ph: any) => {
    const project = state.projects.find((p) => p.id === ph.projectId);

    return {
      ID: ph.id,
      PROYECTO_ID: ph.projectId || '',
      PROYECTO_NOMBRE: project?.name || '',
      NOMBRE: ph.name || ph.title || '',
      DESCRIPCION: ph.description || '',
      FECHA_INICIO: ph.startDate || '',
      FECHA_FIN: ph.endDate || ph.targetDate || '',
      ESTADO: ph.status || '',
      AVANCE_PORCENTAJE: ph.progress ?? '',
    };
  });

  return arrayToCSV(data);
};

// SEGUIMIENTO / HISTORIAL DE ENTREGABLES
export const generateDeliverableUpdatesCSV = (state: AppDataState): string => {
  const data = (state.deliverableUpdates || []).map((u: any) => {
    const deliverable = state.deliverables.find(
      (d) => d.id === u.deliverableId
    );

    return {
      ID: u.id,
      ENTREGABLE_ID: u.deliverableId || '',
      ENTREGABLE: deliverable?.name || '',
      FECHA: u.date || u.createdAt || '',
      ESTADO: u.status || '',
      AVANCE_PORCENTAJE: u.progress ?? '',
      COMENTARIO: u.comment || u.comments || u.description || '',
      USUARIO: u.userName || u.userId || '',
    };
  });

  return arrayToCSV(data);
};


// FfIN DE CODIGO INSERTADO LUEGO DEL DESARROLLO DE ANTIGRAVITY



export const generateTasksCSV = (state: AppDataState): string => {
  const data = (state.projectTasks || []).map((t) => {
    const proj = state.projects.find((p) => p.id === t.projectId);
    const milestone = state.projectMilestones.find((m) => m.id === t.milestoneId);
    return {
      ID: t.id,
      PROYECTO: proj?.name || '',
      HITO: milestone?.title || '',
      TAREA: t.title,
      DESCRIPCION: t.description || '',
      ASIGNADO_A: t.assignedTo,
      ESTADO: t.status,
      FECHA_LIMITE: t.dueDate || '',
      EVIDENCIA: t.evidenceUrl || '',
    };
  });
  return arrayToCSV(data);
};

// 5. IDEAS
export const generateIdeasCSV = (state: AppDataState): string => {
  const data = state.ideas.map((i) => ({
    ID: i.id,
    TITULO: i.title,
    DESCRIPCION: i.description,
    CREADOR: i.creator || '',
    FECHA_REGISTRO: i.date,
    CATEGORIA: i.category,
    ESTADO: i.status,
    PROCESO_RELACIONADO: i.relatedProcess || '',
    CONVERTIDO_EN_PROYECTO_ID: i.convertedToProjectId || '',
  }));
  return arrayToCSV(data);
};

// 6. BITÁCORA
export const generateLogbookCSV = (state: AppDataState): string => {
  const data = (state.logbook || []).map((l) => ({
    ID: l.id,
    USUARIO_ID: l.userId,
    RECORDATORIO: l.reminderText,
    FECHA: l.date,
    HORA: l.time || '',
    NOTA_ADICIONAL: l.note || '',
    ESTADO: l.status,
    ALERTA_ACTIVA: l.remindMe ? 'SI' : 'NO',
  }));
  return arrayToCSV(data);
};

// 7. REUNIONES
export const generateMeetingsCSV = (state: AppDataState): string => {
  const data = (state.meetings || []).map((m) => ({
    ID: m.id,
    TITULO: m.title,
    FECHA: m.date,
    HORA_INICIO: m.startTime,
    HORA_FIN: m.endTime,
    TIPO: m.type,
    LUGAR_O_ENLACE: m.locationOrUrl,
    PARTICIPANTES: m.participants.join('; '),
    DESCRIPCION: m.description,
    ACUERDOS_DE_REUNION: m.agreements,
  }));
  return arrayToCSV(data);
};

export const downloadCSV = (filename: string, csvContent: string): void => {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
};

export const downloadAllDataZip = async (state: AppDataState): Promise<void> => {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().split('T')[0];

  zip.file('01_mapa_procesos.csv', '\uFEFF' + generateProcessesCSV(state));
  zip.file('02_responsabilidades_recurrentes.csv', '\uFEFF' + generateResponsibilitiesCSV(state));
  zip.file('03_entregables_y_reportes.csv', '\uFEFF' + generateDeliverablesCSV(state));
  zip.file('04_proyectos.csv', '\uFEFF' + generateProjectsCSV(state));
  zip.file('05_hitos_proyecto.csv', '\uFEFF' + generateMilestonesCSV(state));
  zip.file('06_tareas_kanban.csv', '\uFEFF' + generateTasksCSV(state));
  zip.file('07_banco_ideas.csv', '\uFEFF' + generateIdeasCSV(state));
  zip.file('08_bitacora_recordatorios.csv', '\uFEFF' + generateLogbookCSV(state));
  zip.file('09_reuniones_y_acuerdos.csv', '\uFEFF' + generateMeetingsCSV(state));
  zip.file('10_backup_completo_json.json', JSON.stringify(state, null, 2));

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `control_gestion_completo_${dateStr}.zip`);
};
