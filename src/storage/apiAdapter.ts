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
    const empty = getEmptyDataState();
    return {
      users: Array.isArray(raw?.users) && raw.users.length > 0 ? raw.users : empty.users,
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

  private async init(): Promise<void> {
    // Purgar de inmediato cualquier almacenamiento local antiguo que contenga banderas isDemo
    try {
      [LOCAL_FALLBACK_KEY, 'CONTROL_GESTION_DATA_V1'].forEach((key) => {
        const item = localStorage.getItem(key);
        if (item && item.includes('"isDemo":true')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}

    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        this.isOnlineBackend = true;
        this.cachedState = this.normalizeState(data);
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
        this.cachedState = getEmptyDataState();
      }
    } catch {
      this.cachedState = getEmptyDataState();
    }
    this.notifyListeners(this.cachedState);
  }

  public async getState(): Promise<AppDataState> {
    if (this.cachedState) {
      return this.cachedState;
    }
    await this.init();
    return this.cachedState || getEmptyDataState();
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
