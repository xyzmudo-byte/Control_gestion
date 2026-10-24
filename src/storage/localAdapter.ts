import { AppDataState } from '../types/models';
import { getEmptyDataState, getInitialDemoData } from './demoData';
import { IStorageAdapter } from './storageInterface';

const STORAGE_KEY = 'CONTROL_GESTION_DATA_V1';

export class LocalStorageAdapter implements IStorageAdapter {
  private listeners: Set<(state: AppDataState) => void> = new Set();
  private cachedState: AppDataState | null = null;

  constructor() {
    this.init();
  }

  private normalizeState(raw: any): AppDataState {
    const empty = getEmptyDataState();
    return {
      users: raw?.users && raw.users.length > 0 ? raw.users : empty.users,
      currentUserId: raw?.currentUserId || 'usr-jherson',
      processes: (Array.isArray(raw?.processes) ? raw.processes : []).filter((i: any) => !i.isDemo),
      responsibilities: (Array.isArray(raw?.responsibilities) ? raw.responsibilities : []).filter((i: any) => !i.isDemo),
      occurrences: (Array.isArray(raw?.occurrences) ? raw.occurrences : []).filter((i: any) => !i.isDemo),
      deliverables: (Array.isArray(raw?.deliverables) ? raw.deliverables : []).filter((i: any) => !i.isDemo),
      deliverableUpdates: Array.isArray(raw?.deliverableUpdates) ? raw.deliverableUpdates : [],
      projects: (Array.isArray(raw?.projects) ? raw.projects : []).filter((i: any) => !i.isDemo),
      projectMilestones: (Array.isArray(raw?.projectMilestones) ? raw.projectMilestones : []).filter((i: any) => !i.isDemo),
      projectTasks: (Array.isArray(raw?.projectTasks) ? raw.projectTasks : []).filter((i: any) => !i.isDemo),
      projectPhases: (Array.isArray(raw?.projectPhases) ? raw.projectPhases : []).filter((i: any) => !i.isDemo),
      ideas: (Array.isArray(raw?.ideas) ? raw.ideas : []).filter((i: any) => !i.isDemo),
      logbook: (Array.isArray(raw?.logbook) ? raw.logbook : []).filter((i: any) => !i.isDemo),
      meetings: (Array.isArray(raw?.meetings) ? raw.meetings : []).filter((i: any) => !i.isDemo),
      chatMessages: (Array.isArray(raw?.chatMessages) ? raw.chatMessages : []).filter((i: any) => !i.isDemo),
    };
  }

  private init(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const initialData = getEmptyDataState();
        this.saveToStorage(initialData);
        this.cachedState = initialData;
      } else {
        const parsed = JSON.parse(stored);
        this.cachedState = this.normalizeState(parsed);
      }
    } catch (e) {
      console.error('Error al inicializar LocalStorageAdapter:', e);
      this.cachedState = getEmptyDataState();
    }
  }

  private saveToStorage(state: AppDataState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      this.cachedState = state;
      this.notifyListeners(state);
    } catch (e) {
      console.error('Error al guardar en LocalStorage:', e);
    }
  }

  private notifyListeners(state: AppDataState): void {
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error en listener de storage:', err);
      }
    });
  }

  public subscribe(listener: (state: AppDataState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async getState(): Promise<AppDataState> {
    if (!this.cachedState) {
      this.init();
    }
    return JSON.parse(JSON.stringify(this.cachedState!));
  }

  public async saveState(state: AppDataState): Promise<void> {
    this.saveToStorage(state);
  }

  public async getAll<K extends keyof AppDataState>(entity: K): Promise<AppDataState[K]> {
    const state = await this.getState();
    return state[entity];
  }

  public async getById<K extends keyof AppDataState>(
    entity: K,
    id: string
  ): Promise<AppDataState[K][number] | null> {
    const state = await this.getState();
    const items = state[entity] as Array<{ id: string }>;
    const found = items.find((item) => item.id === id);
    return (found as AppDataState[K][number]) || null;
  }

  public async create<K extends keyof AppDataState>(
    entity: K,
    item: AppDataState[K][number]
  ): Promise<AppDataState[K][number]> {
    const state = await this.getState();
    const items = [...((state[entity] as any[]) || [])];
    items.push(item);
    state[entity] = items as any;
    this.saveToStorage(state);
    return item;
  }

  public async update<K extends keyof AppDataState>(
    entity: K,
    id: string,
    updates: Partial<AppDataState[K][number]>
  ): Promise<AppDataState[K][number]> {
    const state = await this.getState();
    const items = [...((state[entity] as any[]) || [])];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Entidad ${String(entity)} con id ${id} no encontrada.`);
    }
    const updated = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    items[index] = updated;
    state[entity] = items as any;
    this.saveToStorage(state);
    return updated;
  }

  public async delete<K extends keyof AppDataState>(entity: K, id: string): Promise<boolean> {
    const state = await this.getState();
    const items = [...((state[entity] as any[]) || [])];
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) {
      return false;
    }
    state[entity] = filtered as any;
    this.saveToStorage(state);
    return true;
  }

  public async loadDemoData(): Promise<AppDataState> {
    const demo = getInitialDemoData();
    this.saveToStorage(demo);
    return demo;
  }

  public async clearDemoData(): Promise<AppDataState> {
    const state = await this.getState();
    const cleanState: AppDataState = {
      users: state.users,
      currentUserId: state.currentUserId,
      processes: state.processes.filter((i) => !i.isDemo),
      responsibilities: state.responsibilities.filter((i) => !i.isDemo),
      occurrences: state.occurrences.filter((i) => !i.isDemo),
      deliverables: state.deliverables.filter((i) => !i.isDemo),
      deliverableUpdates: state.deliverableUpdates,
      projects: state.projects.filter((i) => !i.isDemo),
      projectMilestones: state.projectMilestones.filter((i) => !i.isDemo),
      projectTasks: state.projectTasks.filter((i) => !i.isDemo),
      projectPhases: state.projectPhases.filter((i) => !i.isDemo),
      ideas: state.ideas.filter((i) => !i.isDemo),
      logbook: state.logbook.filter((i) => !i.isDemo),
      meetings: state.meetings.filter((i) => !i.isDemo),
      chatMessages: state.chatMessages.filter((i) => !i.isDemo),
    };
    this.saveToStorage(cleanState);
    return cleanState;
  }

  public async resetAll(): Promise<AppDataState> {
    const empty = getEmptyDataState();
    this.saveToStorage(empty);
    return empty;
  }
}

export const storageAdapter = new LocalStorageAdapter();
