import type { FactorOption } from './factorOptions';
import type { SparkCondition, SparkFilterState, SparkScope } from './filterState';

function getFactorName(condition: SparkCondition, options: FactorOption[]): string {
  return (
    options.find((option) => option.factorBaseId === condition.factorBaseId)?.name ??
    `Spark ${condition.factorBaseId}`
  );
}

function serializeCondition(condition: SparkCondition, options: FactorOption[]): string {
  const name = getFactorName(condition, options);
  const scopePrefix = condition.scope === 'main' ? 'Main ' : '';

  const maximum = condition.scope === 'main' ? 3 : 9;

  if (condition.minStars === condition.maxStars) {
    return `${scopePrefix}${name} = ${condition.minStars}`;
  }

  if (condition.maxStars === maximum) {
    return `${scopePrefix}${name} >= ${condition.minStars}`;
  }
  if (condition.minStars === 1) {
    return `${scopePrefix}${name} <= ${condition.maxStars}`;
  }
  return `${scopePrefix}${name} between ` + `${condition.minStars} and ${condition.maxStars}`;
}

function serializeSequence(conditions: SparkCondition[], options: FactorOption[]): string {
  if (conditions.length === 0) {
    return '';
  }

  const clauses: SparkCondition[][] = [];
  let currentClause: SparkCondition[] = [conditions[0]];

  for (let index = 0; index < conditions.length - 1; index += 1) {
    const condition = conditions[index];
    const nextCondition = conditions[index + 1];

    if (condition.nextOperator === 'or') {
      currentClause.push(nextCondition);
    } else {
      clauses.push(currentClause);
      currentClause = [nextCondition];
    }
  }

  clauses.push(currentClause);

  return clauses
    .map((clause) => {
      const expression = clause
        .map((condition) => serializeCondition(condition, options))
        .join(' or ');

      return clause.length > 1 ? `(${expression})` : expression;
    })
    .join(' and ');
}

function getScopeConditions(state: SparkFilterState, scope: SparkScope): SparkCondition[] {
  return state.root.children.flatMap((node) =>
    node.kind === 'spark' && node.scope === scope ? [node] : [],
  );
}

function serializeOptionalWhites(state: SparkFilterState, options: FactorOption[]): string[] {
  return state.optionalWhites.flatMap((filter) => {
    if (filter.factorBaseIds.length === 0) {
      return [];
    }

    const names = filter.factorBaseIds.map(
      (factorBaseId) =>
        options.find((option) => option.factorBaseId === factorBaseId)?.name ??
        `Spark ${factorBaseId}`,
    );

    const prefix = filter.scope === 'main' ? 'optional main white' : 'optional white';

    return `${prefix} in (${names.join(', ')})`;
  });
}

export function serializeSparkFiltersToUql(
  state: SparkFilterState,
  options: FactorOption[],
): string {
  const expressions = (['lineage', 'main'] as SparkScope[])
    .map((scope) => serializeSequence(getScopeConditions(state, scope), options))
    .filter(Boolean);

  expressions.push(...serializeOptionalWhites(state, options));

  if (expressions.length === 0) {
    return '';
  }

  return expressions.join(' and ');
}
