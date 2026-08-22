import type { FactorOption } from './factorOptions';
import {
  createEmptySparkFilterState,
  createFilterId,
  type OptionalWhiteFilter,
  type SparkCondition,
  type SparkFilterState,
  type SparkScope,
} from './filterState';

export type UqlParseResult =
  | {
      state: SparkFilterState;
      error: null;
    }
  | {
      state: null;
      error: string;
    };

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function protectFactorNames(
  source: string,
  options: FactorOption[],
): {
  text: string;
  tokenOptions: Map<string, FactorOption>;
} {
  let text = source;
  const tokenOptions = new Map<string, FactorOption>();

  const sortedOptions = [...options].sort((left, right) => right.name.length - left.name.length);

  sortedOptions.forEach((option, index) => {
    const token = `__factor_${index}__`;
    const expression = new RegExp(escapeRegularExpression(option.name), 'gi');

    if (expression.test(text)) {
      text = text.replace(expression, token);
      tokenOptions.set(token.toLowerCase(), option);
    }
  });

  return {
    text,
    tokenOptions,
  };
}

function splitTopLevel(source: string, separator: ' and ' | ' or '): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let index = 0;

  while (index < source.length) {
    const character = source[index];

    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;

      if (depth < 0) {
        return [];
      }
    }

    if (depth === 0 && source.slice(index, index + separator.length).toLowerCase() === separator) {
      parts.push(source.slice(start, index).trim());
      index += separator.length;
      start = index;
      continue;
    }

    index += 1;
  }

  if (depth !== 0) {
    return [];
  }

  parts.push(source.slice(start).trim());

  return parts.filter(Boolean);
}

function stripOuterParentheses(source: string): string {
  const trimmed = source.trim();

  if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) {
    return trimmed;
  }

  let depth = 0;

  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] === '(') {
      depth += 1;
    } else if (trimmed[index] === ')') {
      depth -= 1;
    }

    if (depth === 0 && index < trimmed.length - 1) {
      return trimmed;
    }
  }

  return trimmed.slice(1, -1).trim();
}

function parseCondition(
  source: string,
  tokenOptions: Map<string, FactorOption>,
): SparkCondition | string {
  const match = source.match(
    /^(main\s+)?(__factor_\d+__)\s*(?:(=)\s*(\d+)|(>=)\s*(\d+)|between\s*(\d+)\s+__range_and__\s+(\d+))$/i,
  );

  if (!match) {
    return `Could not understand: ${source}`;
  }

  const scope: SparkScope = match[1] ? 'main' : 'lineage';

  const option = tokenOptions.get(match[2].toLowerCase());

  if (!option) {
    return `Unknown Spark in: ${source}`;
  }

  const maximum = scope === 'main' ? 3 : 9;

  let minStars: number;
  let maxStars: number;

  if (match[3] === '=') {
    minStars = Number(match[4]);
    maxStars = minStars;
  } else if (match[5] === '>=') {
    minStars = Number(match[6]);
    maxStars = maximum;
  } else {
    minStars = Number(match[7]);
    maxStars = Number(match[8]);
  }

  if (
    !Number.isInteger(minStars) ||
    !Number.isInteger(maxStars) ||
    minStars < 1 ||
    maxStars > maximum ||
    minStars > maxStars
  ) {
    return `${option.name} must use a valid ` + `1–${maximum}★ range.`;
  }

  return {
    kind: 'spark',
    id: createFilterId(),
    scope,
    factorBaseId: option.factorBaseId,
    category: option.category,
    nextOperator: 'and',
    minStars,
    maxStars,
  };
}

function parseOptionalWhites(
  source: string,
  tokenOptions: Map<string, FactorOption>,
): OptionalWhiteFilter | string | null {
  const match = source.match(/^optional\s+(main\s+)?white\s+in\s*\((.*)\)$/i);

  if (!match) {
    return null;
  }

  const scope: SparkScope = match[1] ? 'main' : 'lineage';

  const tokens = match[2]
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) {
    return 'Optional White list cannot be empty.';
  }

  const factorBaseIds: number[] = [];

  for (const token of tokens) {
    const option = tokenOptions.get(token);

    if (!option || !['skill', 'race', 'scenario'].includes(option.category)) {
      return `Unknown White Spark in: ${source}`;
    }

    factorBaseIds.push(option.factorBaseId);
  }

  return {
    scope,
    factorBaseIds,
  };
}

export function parseUqlToSparkFilters(source: string, options: FactorOption[]): UqlParseResult {
  const trimmed = source.trim();

  if (!trimmed) {
    return {
      state: createEmptySparkFilterState(),
      error: null,
    };
  }

  const protectedNames = protectFactorNames(trimmed, options);

  const protectedRanges = protectedNames.text.replace(
    /(between\s+\d+)\s+and\s+(\d+)/gi,
    '$1 __range_and__ $2',
  );

  const clauses = splitTopLevel(protectedRanges, ' and ');

  if (clauses.length === 0) {
    return {
      state: null,
      error: 'Check the query parentheses.',
    };
  }

  const lineageConditions: SparkCondition[] = [];
  const mainConditions: SparkCondition[] = [];
  const optionalWhites: OptionalWhiteFilter[] = [];

  for (const rawClause of clauses) {
    const optional = parseOptionalWhites(rawClause, protectedNames.tokenOptions);

    if (typeof optional === 'string') {
      return {
        state: null,
        error: optional,
      };
    }

    if (optional) {
      optionalWhites.push(optional);
      continue;
    }

    const clause = stripOuterParentheses(rawClause);
    const conditionSources = splitTopLevel(clause, ' or ');

    if (conditionSources.length === 0) {
      return {
        state: null,
        error: `Could not understand: ${rawClause}`,
      };
    }

    const parsedConditions: SparkCondition[] = [];

    for (const conditionSource of conditionSources) {
      const condition = parseCondition(conditionSource, protectedNames.tokenOptions);

      if (typeof condition === 'string') {
        return {
          state: null,
          error: condition,
        };
      }

      parsedConditions.push(condition);
    }

    const clauseScope = parsedConditions[0].scope;

    if (parsedConditions.some((condition) => condition.scope !== clauseScope)) {
      return {
        state: null,
        error: 'An OR group cannot mix Inheritance and Main Parent Sparks.',
      };
    }

    parsedConditions.forEach((condition, index) => {
      condition.nextOperator = index < parsedConditions.length - 1 ? 'or' : 'and';
    });

    const destination = clauseScope === 'main' ? mainConditions : lineageConditions;

    destination.push(...parsedConditions);
  }

  const state = createEmptySparkFilterState();

  state.root.children = [...lineageConditions, ...mainConditions];

  state.optionalWhites = optionalWhites;

  return {
    state,
    error: null,
  };
}
