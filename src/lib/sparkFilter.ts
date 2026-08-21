import type {
  SparkCondition,
  SparkFilterGroup,
  SparkFilterNode,
  SparkFilterState,
  SparkScope,
} from './filterState';
import type { DisplayFactor, DisplayParent, FactorCategory } from './parentDisplay';

const whiteCategories: FactorCategory[] = ['skill', 'race', 'scenario'];

function getStars(factor: DisplayFactor, scope: SparkScope): number {
  return scope === 'main' ? factor.mainStars : factor.totalStars;
}

function matchesCondition(parent: DisplayParent, condition: SparkCondition): boolean {
  const factor = parent.factors.find(
    (candidate) =>
      candidate.factorBaseId === condition.factorBaseId &&
      candidate.category === condition.category,
  );

  const stars = factor ? getStars(factor, condition.scope) : 0;

  return stars >= condition.minStars && stars <= condition.maxStars;
}

function matchesNode(parent: DisplayParent, node: SparkFilterNode): boolean {
  if (node.kind === 'spark') {
    return matchesCondition(parent, node);
  }

  return matchesGroup(parent, node);
}

function matchesGroup(parent: DisplayParent, group: SparkFilterGroup): boolean {
  if (group.children.length === 0) {
    return true;
  }

  return group.operator === 'and'
    ? group.children.every((child) => matchesNode(parent, child))
    : group.children.some((child) => matchesNode(parent, child));
}

function matchesOptionalWhites(parent: DisplayParent, state: SparkFilterState): boolean {
  return state.optionalWhites.every((filter) => {
    if (filter.factorBaseIds.length === 0) {
      return true;
    }

    return parent.factors.some(
      (factor) =>
        whiteCategories.includes(factor.category) &&
        filter.factorBaseIds.includes(factor.factorBaseId) &&
        getStars(factor, filter.scope) > 0,
    );
  });
}

export function matchesSparkFilters(parent: DisplayParent, state: SparkFilterState): boolean {
  return matchesGroup(parent, state.root) && matchesOptionalWhites(parent, state);
}

export function getOptionalWhiteMatchCount(parent: DisplayParent, state: SparkFilterState): number {
  return state.optionalWhites.reduce(
    (total, filter) =>
      total +
      filter.factorBaseIds.filter((factorBaseId) =>
        parent.factors.some(
          (factor) =>
            whiteCategories.includes(factor.category) &&
            factor.factorBaseId === factorBaseId &&
            getStars(factor, filter.scope) > 0,
        ),
      ).length,
    0,
  );
}
