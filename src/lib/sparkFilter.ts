import type { SparkCondition, SparkFilterGroup, SparkFilterState, SparkScope } from './filterState';
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

function matchesConditionSequence(parent: DisplayParent, conditions: SparkCondition[]): boolean {
  if (conditions.length === 0) {
    return true;
  }

  let completedGroupsMatch = true;
  let currentOrGroupMatches = matchesCondition(parent, conditions[0]);

  for (let index = 0; index < conditions.length - 1; index += 1) {
    const condition = conditions[index];
    const nextCondition = conditions[index + 1];
    const nextMatches = matchesCondition(parent, nextCondition);

    if (condition.nextOperator === 'or') {
      currentOrGroupMatches = currentOrGroupMatches || nextMatches;
    } else {
      completedGroupsMatch = completedGroupsMatch && currentOrGroupMatches;

      currentOrGroupMatches = nextMatches;
    }
  }

  return completedGroupsMatch && currentOrGroupMatches;
}

function matchesGroup(parent: DisplayParent, group: SparkFilterGroup): boolean {
  if (group.children.length === 0) {
    return true;
  }

  const directConditions = group.children.flatMap((node) => (node.kind === 'spark' ? [node] : []));

  const nestedGroups = group.children.flatMap((node) => (node.kind === 'group' ? [node] : []));

  const scopeConditionsMatch = (['lineage', 'main'] as SparkScope[]).every((scope) =>
    matchesConditionSequence(
      parent,
      directConditions.filter((condition) => condition.scope === scope),
    ),
  );

  const nestedGroupsMatch =
    nestedGroups.length === 0 ||
    (group.operator === 'and'
      ? nestedGroups.every((nestedGroup) => matchesGroup(parent, nestedGroup))
      : nestedGroups.some((nestedGroup) => matchesGroup(parent, nestedGroup)));

  return scopeConditionsMatch && nestedGroupsMatch;
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
