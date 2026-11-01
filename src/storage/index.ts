import { apiStorageAdapter } from './apiAdapter';

export * from './storageInterface';
export * from './localAdapter';
export * from './apiAdapter';
export * from './defaultState';

// Adaptador principal para persistencia web en el backend Node.js + Express
export { apiStorageAdapter as storageAdapter };
