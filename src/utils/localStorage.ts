import type { GeneratedComponent } from '../types';

const STORAGE_KEY = 'rcg_components';

export function saveComponentsToStorage(components: GeneratedComponent[]): void {
  try {
    const serialized = components.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error('Failed to save components to localStorage:', error);
  }
}

export function loadComponentsFromStorage(): GeneratedComponent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return parsed.map((c: { createdAt: string; [key: string]: unknown }) => ({
      ...c,
      createdAt: new Date(c.createdAt),
    }));
  } catch (error) {
    console.error('Failed to load components from localStorage:', error);
    return [];
  }
}

export function clearComponentsStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear components from localStorage:', error);
  }
}
