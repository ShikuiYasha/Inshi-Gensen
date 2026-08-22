import type { FactorCategory } from './parentDisplay';

export const SPARK_FILTER_VERSION = 1;

export type SparkScope = 'lineage' | 'main';
export type FilterOperator = 'and' | 'or';

export type SparkCondition = {
  kind: 'spark';
  id: string;
  scope: SparkScope;
  factorBaseId: number;
  category: FactorCategory;
  nextOperator: FilterOperator;
  minStars: number;
  maxStars: number;
};

export type SparkFilterGroup = {
  kind: 'group';
  id: string;
  operator: FilterOperator;
  children: SparkFilterNode[];
};

export type SparkFilterNode = SparkCondition | SparkFilterGroup;

export type OptionalWhiteFilter = {
  scope: SparkScope;
  factorBaseIds: number[];
};

export type SparkFilterState = {
  version: typeof SPARK_FILTER_VERSION;
  root: SparkFilterGroup;
  optionalWhites: OptionalWhiteFilter[];
};

export function createFilterId(): string {
  return crypto.randomUUID();
}

export function createEmptySparkFilterState(): SparkFilterState {
  return {
    version: SPARK_FILTER_VERSION,
    root: {
      kind: 'group',
      id: createFilterId(),
      operator: 'and',
      children: [],
    },
    optionalWhites: [],
  };
}
