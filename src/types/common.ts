import { OperationalStatus, PriorityLevel, ProjectStatus, RiskLevel } from './models';

export type PeriodFilter = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'NEXT_7_DAYS' | 'OVERDUE';

export interface DeliverableFilters {
  period: PeriodFilter;
  status: OperationalStatus | 'ALL';
  priority: PriorityLevel | 'ALL';
  projectId: string | 'ALL';
  type: string | 'ALL';
  search: string;
}

export interface ProjectFilters {
  status: ProjectStatus | 'ALL';
  risk: RiskLevel | 'ALL';
  priority: PriorityLevel | 'ALL';
  search: string;
}

export interface DashboardMetrics {
  compliancePercentage: number;
  evaluatedCount: number;
  fulfilledCount: number;
  delayedCount: number;
  unfulfilledCount: number;
  notEvaluatedCount: number;
  
  pendingDeliverables: number;
  dueSoonDeliverables: number;
  overdueDeliverables: number;
  
  activeProjects: number;
  projectsAtRisk: number;
  newIdeas: number;
  
  deliverablesToday: number;
  deliverablesThisWeek: number;
  deliverablesThisMonth: number;
}

export type ActiveTab = 
  | 'cockpit'
  | 'dashboard'
  | 'responsibilities'
  | 'deliverables'
  | 'projects'
  | 'calendar'
  | 'ideas'
  | 'logbook'
  | 'meetings'
  | 'chat'
  | 'export';
