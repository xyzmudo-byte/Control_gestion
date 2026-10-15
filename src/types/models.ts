// Modelos de datos para Control de Gestión (V1 Local - Multiusuario preparado)

export type FrequencyType = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export type OperationalStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'AT_RISK' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type DeliverableType = 'PUNTUAL' | 'RECURRENTE' | 'RESPONSIBILITY' | 'PROJECT_PHASE' | 'PROJECT_GENERAL' | 'TASK';

export type IssueType =
  | 'MISSING_INFO'
  | 'DEPENDENCY'
  | 'TECHNICAL'
  | 'WORKLOAD'
  | 'PRIORITY_CHANGE'
  | 'OTHER';

export type EvaluationResult = 'FULFILLED' | 'DELAYED' | 'UNFULFILLED' | 'NOT_EVALUATED';

export type IdeaStatus = 'IDEA' | 'EVALUATING' | 'IN_DEVELOPMENT' | 'IMPLEMENTED';

export type UserRole = 'ADMIN' | 'PARTICIPANT' | 'VIEWER';

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email: string;
  password?: string;
  role: UserRole;
  roleTitle: string;
  area: string;
  avatarColor: string;
}

export interface Evaluation {
  result: EvaluationResult;
  evaluationDate: string; // YYYY-MM-DD
  delayDays: number; // Calculado automáticamente por el sistema
  comments?: string;
  evaluatedBy?: string;
}

// 1. MAPA DE PROCESOS (Estructura Excel / CSV)
export interface ProcessItem {
  id: string;
  macroproceso: string;
  proceso: string;
  codigoN12?: string;
  subproceso: string;
  fase?: string;
  actividades: string; // Actividades / Tareas
  keyword?: string;
  responsable: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// 2. RESPONSABILIDADES RECURRENTES
export interface Responsibility {
  id: string;
  name: string;
  description: string;
  frequency: FrequencyType;
  deliveryDay: string; // ej. "Viernes", "Día 30", "Diario"
  isActive: boolean;
  isDemo?: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResponsibilityOccurrence {
  id: string;
  responsibilityId: string;
  periodLabel: string;
  scheduledDate: string; // YYYY-MM-DD
  realDeliveryDate?: string; // YYYY-MM-DD
  status: OperationalStatus;
  progress: number; // 0-100
  comments?: string;
  evaluation?: Evaluation;
  isDemo?: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

// 3. ENTREGABLES
export interface DeliverableUpdate {
  id: string;
  deliverableId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  progress: number; // 0-100
  status: OperationalStatus;
  comment: string;
  hasIssue: boolean;
  issueType?: IssueType;
  issueDescription?: string;
  needsHelp: boolean;
  helpDescription?: string;
  userId?: string;
  createdAt: string;
}

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  responsiblePerson: string;
  type: 'PUNTUAL' | 'RECURRENTE';
  scheduledDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm (ej. "17:00")
  realDeliveryDate?: string; // YYYY-MM-DD
  status: OperationalStatus;
  progress: number; // 0-100
  priority: PriorityLevel;

  // Recurrencia
  isRecurring?: boolean;
  recurrenceFrequency?: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'ANUAL';
  recurrenceDay?: string; // ej. "Viernes", "Día 15"

  // Ubicación / Enlaces
  locationUrl?: string; // Enlace SharePoint o Web
  locationLocalPath?: string; // Ruta local Windows (ej. "C:\Proyectos\Reporte.xlsx")

  // Relaciones
  projectId?: string;
  projectPhaseId?: string;
  processId?: string;

  // Problemas y Ayuda
  hasIssue: boolean;
  issueType?: IssueType;
  issueDescription?: string;
  needsHelp: boolean;
  helpDescription?: string;

  // Evaluación manual
  evaluation?: Evaluation;

  isDemo?: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

// 4. PROYECTOS, HITOS Y TAREAS (Kanban + Hitos)
export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  targetDate: string; // YYYY-MM-DD
  completed: boolean;
  completedDate?: string;
  isDemo?: boolean;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  assignedTo: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate?: string; // YYYY-MM-DD
  evidenceUrl?: string; // Evidencia / archivo adjunto o enlace
  comments?: { id: string; author: string; text: string; date: string }[];
  isDemo?: boolean;
  createdAt: string;
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  name: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: OperationalStatus;
  progress: number; // 0-100
  order: number;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  objective: string;
  responsible: string;
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
  status: ProjectStatus;
  progress: number; // 0-100 (calculado automáticamente por hitos/tareas)
  risk: RiskLevel;
  priority: PriorityLevel;
  isDemo?: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

// 5. IDEAS Y MEJORAS
export interface IdeaReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface IdeaComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  creator: string;
  date: string; // YYYY-MM-DD
  category: string;
  status: IdeaStatus;
  commentsList?: IdeaComment[];
  reactions?: IdeaReaction[];
  relatedProcess?: string;
  convertedToProjectId?: string;
  isDemo?: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

// 6. BITÁCORA PERSONAL (Recordatorios)
export interface LogbookItem {
  id: string;
  userId: string;
  reminderText: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  note?: string;
  status: 'PENDING' | 'COMPLETED';
  remindMe: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// 7. REUNIONES Y ACUERDOS
export interface Meeting {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: 'FISICA' | 'VIRTUAL';
  locationOrUrl: string; // Sala física o enlace Teams/Meet
  participants: string[]; // Nombres o IDs
  description: string;
  agreements: string; // Acuerdos de reunión (registro de texto libre o lista)
  isDemo?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// 8. CHAT INTERNO
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId?: string; // 'general', 'operaciones', o ID de usuario
  channel: 'general' | 'operaciones' | 'proyectos' | 'direct';
  message: string;
  timestamp: string;
  read: boolean;
  convertedToLogbookId?: string;
  isDemo?: boolean;
}

// ESTADO GLOBAL DE LA APLICACIÓN
export interface AppDataState {
  users: UserProfile[];
  currentUserId: string;
  processes: ProcessItem[];
  responsibilities: Responsibility[];
  occurrences: ResponsibilityOccurrence[];
  deliverables: Deliverable[];
  deliverableUpdates: DeliverableUpdate[];
  projects: Project[];
  projectMilestones: ProjectMilestone[];
  projectTasks: ProjectTask[];
  projectPhases: ProjectPhase[];
  ideas: Idea[];
  logbook: LogbookItem[];
  meetings: Meeting[];
  chatMessages: ChatMessage[];
}

