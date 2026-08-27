import { SPARK_FILTER_VERSION, type SparkFilterState } from './filterState';

const FILTER_WORKSPACE_KEY = 'inshi-gensen-filter-workspace-v1';

export type FilterWorkspace = {
  version: 1;
  filterMode: 'visual' | 'uql';
  uqlText: string;
  sparkFilters: SparkFilterState;
  targetCardId: number | null;
  sortMode: 'white-count' | 'affinity' | 'race-affinity';
  otherParentId: string | null;
  mainAllowIds: number[];
  mainHideIds: number[];
  grandparentAllowIds: number[];
  grandparentHideIds: number[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}

export function loadFilterWorkspace(): FilterWorkspace | null {
  try {
    const storedValue = localStorage.getItem(FILTER_WORKSPACE_KEY);

    if (storedValue === null) {
      return null;
    }

    const value: unknown = JSON.parse(storedValue);

    if (!isObject(value) || value.version !== 1) {
      return null;
    }

    if (value.filterMode !== 'visual' && value.filterMode !== 'uql') {
      return null;
    }

    if (
      value.sortMode !== 'white-count' &&
      value.sortMode !== 'affinity' &&
      value.sortMode !== 'race-affinity'
    ) {
      return null;
    }

    if (
      typeof value.uqlText !== 'string' ||
      !isObject(value.sparkFilters) ||
      value.sparkFilters.version !== SPARK_FILTER_VERSION
    ) {
      return null;
    }

    if (value.targetCardId !== null && typeof value.targetCardId !== 'number') {
      return null;
    }

    if (value.otherParentId !== null && typeof value.otherParentId !== 'string') {
      return null;
    }

    if (
      !isNumberArray(value.mainAllowIds) ||
      !isNumberArray(value.mainHideIds) ||
      !isNumberArray(value.grandparentAllowIds) ||
      !isNumberArray(value.grandparentHideIds)
    ) {
      return null;
    }

    return value as FilterWorkspace;
  } catch {
    return null;
  }
}

export function saveFilterWorkspace(workspace: FilterWorkspace): void {
  localStorage.setItem(FILTER_WORKSPACE_KEY, JSON.stringify(workspace));
}
