import type { SparkCondition, SparkFilterNode, SparkFilterState } from './filterState';

import type { DisplayFactor } from './parentDisplay';

export type FactorHighlight = 'none' | 'required' | 'optional' | 'both';

function collectConditions(node: SparkFilterNode): SparkCondition[] {
  if (node.kind === 'spark') {
    return [node];
  }

  return node.children.flatMap(collectConditions);
}

function matchesRequiredCondition(factor: DisplayFactor, condition: SparkCondition): boolean {
  if (factor.factorBaseId !== condition.factorBaseId) {
    return false;
  }

  const stars = condition.scope === 'main' ? factor.mainStars : factor.totalStars;

  return stars >= condition.minStars && stars <= condition.maxStars;
}

function matchesOptionalFilter(factor: DisplayFactor, state: SparkFilterState): boolean {
  return state.optionalWhites.some((filter) => {
    if (!filter.factorBaseIds.includes(factor.factorBaseId)) {
      return false;
    }

    return filter.scope === 'main' ? factor.mainStars > 0 : factor.totalStars > 0;
  });
}

export function getFactorHighlight(
  factor: DisplayFactor,
  state: SparkFilterState,
): FactorHighlight {
  const required = collectConditions(state.root).some((condition) =>
    matchesRequiredCondition(factor, condition),
  );

  const optional = matchesOptionalFilter(factor, state);

  if (required && optional) {
    return 'both';
  }

  if (required) {
    return 'required';
  }

  if (optional) {
    return 'optional';
  }

  return 'none';
}
