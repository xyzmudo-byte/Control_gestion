import * as XLSX from 'xlsx';
import { ProcessItem } from '../types/models';

export interface ColumnMapping {
  macroprocesoKey?: string;
  procesoKey?: string;
  codigoKey?: string;
  subprocesoKey?: string;
  faseKey?: string;
  actividadesKey?: string;
  keywordKey?: string;
  responsableKey?: string;
}

export interface ImportResult {
  success: boolean;
  items: ProcessItem[];
  errors: string[];
  totalRows: number;
  detectedColumns: string[];
}

const cleanString = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-z0-9]/g, ''); // Quitar espacios y símbolos
};

export const parseProcessFile = async (file: File): Promise<ImportResult> => {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  const isCsv = file.name.endsWith('.csv') || file.name.endsWith('.txt');

  if (!isExcel && !isCsv) {
    return {
      success: false,
      items: [],
      errors: ['Formato no compatible. Por favor sube un archivo Excel (.xlsx, .xls) o CSV (.csv).'],
      totalRows: 0,
      detectedColumns: [],
    };
  }

  try {
    let rawRows: Record<string, any>[] = [];
    let detectedColumns: string[] = [];

    if (isExcel) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          success: false,
          items: [],
          errors: ['El archivo Excel está vacío o no contiene hojas de cálculo.'],
          totalRows: 0,
          detectedColumns: [],
        };
      }
      const sheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      if (rawRows.length > 0) {
        detectedColumns = Object.keys(rawRows[0]);
      }
    } else {
      // CSV parser
      const text = await file.text();
      const delimiter = text.includes(';') ? ';' : text.includes('\t') ? '\t' : ',';
      const workbook = XLSX.read(text, { type: 'string', raw: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });
      if (rawRows.length > 0) {
        detectedColumns = Object.keys(rawRows[0]);
      }
    }

    if (rawRows.length === 0) {
      return {
        success: false,
        items: [],
        errors: ['No se encontraron filas con datos en el archivo seleccionado.'],
        totalRows: 0,
        detectedColumns: [],
      };
    }

    // Auto-detectar correspondencia de columnas
    const mapping: ColumnMapping = {};

    detectedColumns.forEach((col) => {
      const norm = normalizeHeader(col);
      if (norm.includes('macroproceso') || norm.includes('macro') || norm.includes('areageneral')) {
        mapping.macroprocesoKey = col;
      } else if (norm.includes('subproceso') || norm.includes('sub_proceso')) {
        mapping.subprocesoKey = col;
      } else if (norm === 'proceso' || norm.includes('proceso') || norm.includes('proc')) {
        if (!mapping.procesoKey) mapping.procesoKey = col;
      } else if (norm.includes('n12') || norm.includes('codigo') || norm.includes('cod')) {
        mapping.codigoKey = col;
      } else if (norm.includes('fase') || norm.includes('etapa')) {
        mapping.faseKey = col;
      } else if (
        norm.includes('actividad') ||
        norm.includes('actividades') ||
        norm.includes('tarea') ||
        norm.includes('tareas')
      ) {
        mapping.actividadesKey = col;
      } else if (norm.includes('keyword') || norm.includes('clave') || norm.includes('tag')) {
        mapping.keywordKey = col;
      } else if (norm.includes('responsable') || norm.includes('dueno') || norm.includes('owner') || norm.includes('asignado')) {
        mapping.responsableKey = col;
      }
    });

    const errors: string[] = [];
    const items: ProcessItem[] = [];
    const now = new Date().toISOString();

    rawRows.forEach((row, index) => {
      const macro = cleanString(mapping.macroprocesoKey ? row[mapping.macroprocesoKey] : row['Macro proceso'] || row['Macroproceso']);
      const proceso = cleanString(mapping.procesoKey ? row[mapping.procesoKey] : row['Proceso']);
      const subproceso = cleanString(mapping.subprocesoKey ? row[mapping.subprocesoKey] : row['Sub proceso'] || row['Subproceso']);
      const actividades = cleanString(
        mapping.actividadesKey ? row[mapping.actividadesKey] : row['Actividades / Tareas'] || row['Actividades'] || row['Tareas']
      );
      const codigo = cleanString(mapping.codigoKey ? row[mapping.codigoKey] : row['N12 / Código'] || row['Código'] || row['Codigo']);
      const fase = cleanString(mapping.faseKey ? row[mapping.faseKey] : row['Fase'] || '');
      const keyword = cleanString(mapping.keywordKey ? row[mapping.keywordKey] : row['Keyword'] || row['Keywords'] || '');
      const responsable = cleanString(mapping.responsableKey ? row[mapping.responsableKey] : row['Responsable'] || 'Informática Operacional');

      // Validar si al menos hay proceso o actividad
      if (!proceso && !actividades && !macro) {
        return; // Fila vacía
      }

      items.push({
        id: `proc-imp-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
        macroproceso: macro || 'Procesos Operacionales',
        proceso: proceso || 'Proceso General',
        subproceso: subproceso || 'General',
        actividades: actividades || 'Actividad sin especificar',
        codigoN12: codigo || `P-${index + 1}`,
        fase: fase || 'Ejecución',
        keyword: keyword || '',
        responsable: responsable || 'Informática Operacional',
        isDemo: false,
        createdAt: now,
      });
    });

    if (items.length === 0) {
      errors.push('No se pudieron extraer registros válidos. Verifica que las columnas coincidan con la estructura esperada.');
    }

    return {
      success: errors.length === 0,
      items,
      errors,
      totalRows: rawRows.length,
      detectedColumns,
    };
  } catch (err: any) {
    return {
      success: false,
      items: [],
      errors: [`Error al procesar el archivo: ${err.message || err}`],
      totalRows: 0,
      detectedColumns: [],
    };
  }
};

export const downloadProcessTemplateCSV = () => {
  const headers = ['Macro proceso', 'Proceso', 'N12 / Código', 'Sub proceso', 'Fase', 'Actividades / Tareas', 'Keyword', 'Responsable'];
  const sampleRows = [
    [
      'Gestión de TI y Operaciones',
      'Operaciones de Red e Infraestructura',
      'N12-001',
      'Monitoreo y Enlaces VPN',
      'Diaria',
      'Verificar disponibilidad de enlaces de sucursales y servidores centrales a las 09:00',
      'VPN, Enlaces, Servidores',
      'Jason',
    ],
    [
      'Gestión de TI y Operaciones',
      'Control de Flota y Telemetría',
      'N12-002',
      'Consolidación de Kilómetros',
      'Semanal',
      'Consolidar kilometraje semanal de rutas principales y reportar a Logística',
      'Flota, Kilómetros, Logística',
      'Jason',
    ],
    [
      'Control de Calidad y Procesos',
      'Auditoría y Cierres',
      'N12-003',
      'Inventario de Software',
      'Mensual',
      'Cierre y auditoría mensual de licencias Microsoft 365 y asignación de puestos',
      'Licencias, Auditoría, Cierre',
      'Kathy',
    ],
    [
      'Transformación Digital',
      'Automatización de Reportes',
      'N12-004',
      'Desarrollo de Scripts',
      'Fase 1',
      'Crear pipeline de validación automática de datos operativos de sucursales',
      'Scripts, Python, Automatización',
      'María',
    ],
  ];

  const csvContent =
    '\uFEFF' +
    [headers.join(';'), ...sampleRows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'plantilla_mapa_procesos.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
