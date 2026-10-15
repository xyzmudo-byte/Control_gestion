import { AppDataState } from '../types/models';

export interface IStorageAdapter {
  getState(): Promise<AppDataState>;
  saveState(state: AppDataState): Promise<void>;
  
  // Generic entity CRUD (preparado para reemplazar con llamadas de API o Supabase)
  getAll<K extends keyof AppDataState>(entity: K): Promise<AppDataState[K]>;
  getById<K extends keyof AppDataState>(entity: K, id: string): Promise<AppDataState[K][number] | null>;
  create<K extends keyof AppDataState>(entity: K, item: AppDataState[K][number]): Promise<AppDataState[K][number]>;
  update<K extends keyof AppDataState>(entity: K, id: string, updates: Partial<AppDataState[K][number]>): Promise<AppDataState[K][number]>;
  delete<K extends keyof AppDataState>(entity: K, id: string): Promise<boolean>;
  
  // Bulk / Demo operations
  loadDemoData(): Promise<AppDataState>;
  clearDemoData(): Promise<AppDataState>;
  resetAll(): Promise<AppDataState>;
  
  // Event subscription for UI reactivity
  subscribe(listener: (state: AppDataState) => void): () => void;
}
