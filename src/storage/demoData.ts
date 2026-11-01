// Re-exportación para retrocompatibilidad
export * from './defaultState';
import { getEmptyDataState } from './defaultState';

export const getInitialDemoData = () => getEmptyDataState();
