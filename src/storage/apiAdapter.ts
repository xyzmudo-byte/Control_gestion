import { AppDataState } from '../types/models';
import { getEmptyDataState, getInitialDemoData } from './demoData';
import { IStorageAdapter } from './storageInterface';

const LOCAL_FALLBACK_KEY = 'CONTROL_GESTION_BACKUP_STATE';

export class ApiStorageAdapter implements IStorageAdapter {
  private listeners: Set<(state: AppDataState) => void> = new Set();
  private cachedState: AppDataState | null = null;
  private isOnlineBackend = false;

  constructor() {
    this.init();
  }

  private normalizeState(raw: any): AppDataState {
    const demo = getInitialDemoData();
    return {
      users: Array.isArray(raw?.users) && raw.users.length > 0 ? raw.users : demo.users,
      currentUserId: raw?.currentUserId || demo.currentUserId,
      processes: Array.isArray(raw?.processes) ? raw.processes : [],
      responsibilities: Array.isArray(raw?.responsibilities) ? raw.responsibilities : [],
      occurrences: Array.isArray(raw?.occurrences) ? raw.occurrences : [],
      deliverables: Array.isArray(raw?.deliverables) ? raw.deliverables : [],
      deliverableUpdates: Array.isArray(raw?.deliverableUpdates) ? raw.deliverableUpdates : [],
      projects: Array.isArray(raw?.projects) ? raw.projects : [],
      projectMilestones: Array.isArray(raw?.projectMilestones) ? raw.projectMilestones : [],
      projectTasks: Array.isArray(raw?.projectTasks) ? raw.projectTasks : [],
      projectPhases: Array.isArray(raw?.projectPhases) ? raw.projectPhases : [],
      ideas: Array.isArray(raw?.ideas) ? raw.ideas : [],
      logbook: Array.isArray(raw?.logbook) ? raw.logbook : [],
      meetings: Array.isArray(raw?.meetings) ? raw.meetings : [],
      chatMessages: Array.isArray(raw?.chatMessages) ? raw.chatMessages : [],
    };
  }

  private async init(): Promise<void> {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        this.isOnlineBackend = true;
        // Si el backend viene completamente vacío, cargar demo inicial para evaluación inmediata
        const isCompletelyEmpty = 
          (!data.deliverables || data.deliverables.length === 0) &&
          (!data.projects || data.projects.length === 0) &&
          (!data.responsibilities || data.responsibilities.length === 0);

        if (isCompletelyEmpty) {
          const initial = getInitialDemoData();
          await this.saveState(initial);
          this.cachedState = initial;
        } else {
          this.cachedState = this.normalizeState(data);
        }
        this.notifyListeners(this.cachedState);
        return;
      }
    } catch (e) {
      console.warn('Backend no disponible temporalmente, usando respaldo local:', e);
    }

    // Fallback a almacenamiento local si backend está desconectado
    try {
      const fallback = localStorage.getItem(LOCAL_FALLBACK_KEY);
      if (fallback) {
        this.cachedState = this.normalizeState(JSON.parse(fallback));
      } else {
        this.cachedState = getInitialDemoData();
      }
    } catch {
      this.cachedState = getInitialDemoData();
    }
    this.notifyListeners(this.cachedState);
  }

  public async getState(): Promise<AppDataState> {
    if (this.cachedState) {
      return this.cachedState;
    }
    await this.init();
    return this.cachedState || getInitialDemoData();
  }

  public async saveState(state: AppDataState): Promise<void> {
    this.cachedState = state;
    this.notifyListeners(state);

    // Respaldo local de emergencia
    try {
      localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error al guardar backup local:', e);
    }

    // Persistir en servidor Express
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (res.ok) {
        this.isOnlineBackend = true;
      }
    } catch (err) {
      console.warn('Error al guardar en el servidor web backend:', err);
      this.isOnlineBackend = false;
    }
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
    const list = state[entity] as any[];
    return list.find((item) => item.id === id) || null;
  }

  public async create<K extends keyof AppDataState>(
    entity: K,
    item: AppDataState[K][number]
  ): Promise<AppDataState[K][number]> {
    const state = await this.getState();
    const list = [...(state[entity] as any[])];
    list.push(item);
    const newState = { ...state, [entity]: list };
    await this.saveState(newState);
    return item;
  }

  public async update<K extends keyof AppDataState>(
    entity: K,
    id: string,
    updates: Partial<AppDataState[K][number]>
  ): Promise<AppDataState[K][number]> {
    const state = await this.getState();
    const list = [...(state[entity] as any[])];
    const index = list.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error(`Item ${id} no encontrado en ${String(entity)}`);
    }
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    const newState = { ...state, [entity]: list };
    await this.saveState(newState);
    return updated;
  }

  public async delete<K extends keyof AppDataState>(entity: K, id: string): Promise<boolean> {
    const state = await this.getState();
    const list = (state[entity] as any[]).filter((i) => i.id !== id);
    const newState = { ...state, [entity]: list };
    await this.saveState(newState);
    return true;
  }

  public async loadDemoData(): Promise<AppDataState> {
    const demo = getInitialDemoData();
    await this.saveState(demo);
    return demo;
  }

  public async clearDemoData(): Promise<AppDataState> {
    const empty = getEmptyDataState();
    await this.saveState(empty);
    return empty;
  }

  public async resetAll(): Promise<AppDataState> {
    return this.loadDemoData();
  }

  public subscribe(listener: (state: AppDataState) => void): () => void {
    this.listeners.add(listener);
    if (this.cachedState) {
      listener(this.cachedState);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(state: AppDataState): void {
    this.listeners.forEach((listener) => listener(state));
  }
}

export const apiStorageAdapter = new ApiStorageAdapter();
