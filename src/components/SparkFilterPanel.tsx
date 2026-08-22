import type { ChangeEvent } from 'react';
import {
  createFilterId,
  type SparkCondition,
  type SparkFilterState,
  type SparkScope,
} from '../lib/filterState';
import type { FactorOption } from '../lib/factorOptions';
import { StarRangeSlider } from './StarRangeSlider';

type SparkFilterPanelProps = {
  state: SparkFilterState;
  options: FactorOption[];
  onChange: (state: SparkFilterState) => void;
};

const scopeLabels: Record<SparkScope, string> = {
  lineage: 'Inheritance Factors',
  main: 'Main Parent Factors',
};

const requiredSparkGroups: {
  label: string;
  categories: FactorOption['category'][];
}[] = [
  {
    label: 'Blue Factors',
    categories: ['blue'],
  },
  {
    label: 'Pink Factors',
    categories: ['pink'],
  },
  {
    label: 'Green Factors',
    categories: ['green'],
  },
  {
    label: 'White Factors',
    categories: ['skill', 'race', 'scenario'],
  },
];

function getMaximumStars(scope: SparkScope): number {
  return scope === 'main' ? 3 : 9;
}

export function SparkFilterPanel({ state, options, onChange }: SparkFilterPanelProps) {
  function getConditions(scope: SparkScope): SparkCondition[] {
    return state.root.children.flatMap((node) =>
      node.kind === 'spark' && node.scope === scope ? [node] : [],
    );
  }

  function addCondition(scope: SparkScope, factorBaseId: number) {
    const option = options.find((candidate) => candidate.factorBaseId === factorBaseId);

    if (!option) {
      return;
    }

    const alreadyExists = getConditions(scope).some(
      (condition) => condition.factorBaseId === factorBaseId,
    );

    if (alreadyExists) {
      return;
    }

    const condition: SparkCondition = {
      kind: 'spark',
      id: createFilterId(),
      scope,
      factorBaseId,
      category: option.category,
      nextOperator: 'and',
      minStars: 1,
      maxStars: getMaximumStars(scope),
    };

    onChange({
      ...state,
      root: {
        ...state.root,
        children: [...state.root.children, condition],
      },
    });
  }

  function updateCondition(
    id: string,
    updates: Partial<Pick<SparkCondition, 'minStars' | 'maxStars' | 'nextOperator'>>,
  ) {
    onChange({
      ...state,
      root: {
        ...state.root,
        children: state.root.children.map((node) =>
          node.kind === 'spark' && node.id === id ? { ...node, ...updates } : node,
        ),
      },
    });
  }

  function removeCondition(id: string) {
    onChange({
      ...state,
      root: {
        ...state.root,
        children: state.root.children.filter((node) => node.id !== id),
      },
    });
  }

  function getOptionalIds(scope: SparkScope): number[] {
    return state.optionalWhites.find((filter) => filter.scope === scope)?.factorBaseIds ?? [];
  }

  function updateOptionalIds(scope: SparkScope, factorBaseIds: number[]) {
    const otherScopes = state.optionalWhites.filter((filter) => filter.scope !== scope);

    onChange({
      ...state,
      optionalWhites:
        factorBaseIds.length > 0 ? [...otherScopes, { scope, factorBaseIds }] : otherScopes,
    });
  }

  function addOptionalWhite(scope: SparkScope, factorBaseId: number) {
    const currentIds = getOptionalIds(scope);

    if (!currentIds.includes(factorBaseId)) {
      updateOptionalIds(scope, [...currentIds, factorBaseId]);
    }
  }

  const whiteOptions = options.filter((option) =>
    ['skill', 'race', 'scenario'].includes(option.category),
  );

  return (
    <div className="spark-filter-panel">
      <div className="spark-filter-scopes">
        {(['lineage', 'main'] as SparkScope[]).map((scope) => {
          const conditions = getConditions(scope);
          const optionalIds = getOptionalIds(scope);
          const maximumStars = getMaximumStars(scope);
          function renderCondition(condition: SparkCondition) {
            const option = options.find(
              (candidate) => candidate.factorBaseId === condition.factorBaseId,
            );
            const conditionIndex = conditions.findIndex(
              (candidate) => candidate.id === condition.id,
            );

            const hasNextCondition = conditionIndex >= 0 && conditionIndex < conditions.length - 1;
            return (
              <div
                className={
                  hasNextCondition ? 'spark-condition' : 'spark-condition spark-condition--last'
                }
                key={condition.id}
              >
                <strong>{option?.name ?? `Factor ${condition.factorBaseId}`}</strong>

                <StarRangeSlider
                  minimum={condition.minStars}
                  maximum={condition.maxStars}
                  limit={maximumStars}
                  onChange={(minStars, maxStars) =>
                    updateCondition(condition.id, {
                      minStars,
                      maxStars,
                    })
                  }
                />
                {hasNextCondition ? (
                  <select
                    className="spark-condition__operator"
                    aria-label={`Connector after ${option?.name ?? 'Spark'}`}
                    value={condition.nextOperator}
                    onChange={(event) =>
                      updateCondition(condition.id, {
                        nextOperator: event.target.value as 'and' | 'or',
                      })
                    }
                  >
                    <option value="and">AND</option>
                    <option value="or">OR</option>
                  </select>
                ) : null}
                <button
                  type="button"
                  aria-label={`Remove ${option?.name ?? 'Spark'}`}
                  onClick={() => removeCondition(condition.id)}
                >
                  ×
                </button>
              </div>
            );
          }

          return (
            <details className="spark-filter-scope" key={scope}>
              <summary>{scopeLabels[scope]}</summary>

              <div className="spark-filter-scope__content">
                <div className="spark-filter-section">
                  <h4>Required Sparks</h4>

                  <div className="required-spark-selectors">
                    {requiredSparkGroups.map((group) => {
                      const groupConditions = conditions.filter((condition) =>
                        group.categories.some((category) => category === condition.category),
                      );

                      return (
                        <div className="required-spark-group" key={group.label}>
                          <label>
                            <span>{group.label}</span>

                            <select
                              className="spark-add-select"
                              value=""
                              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                                const factorBaseId = Number(event.target.value);

                                if (factorBaseId) {
                                  addCondition(scope, factorBaseId);
                                }
                              }}
                            >
                              <option value="">+ Add {group.label.replace(' Factors', '')}</option>

                              {options
                                .filter((option) => group.categories.includes(option.category))
                                .map((option) => (
                                  <option value={option.factorBaseId} key={option.factorBaseId}>
                                    {option.name}
                                  </option>
                                ))}
                            </select>
                          </label>

                          {groupConditions.length > 0 && (
                            <div className="spark-condition-list">
                              {groupConditions.map(renderCondition)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="spark-filter-section">
                  <h4>Optional Whites</h4>

                  <select
                    className="spark-add-select"
                    value=""
                    onChange={(event) => {
                      const factorBaseId = Number(event.target.value);

                      if (factorBaseId) {
                        addOptionalWhite(scope, factorBaseId);
                      }
                    }}
                  >
                    <option value="">+ Add Optional White</option>

                    {whiteOptions.map((option) => (
                      <option value={option.factorBaseId} key={option.factorBaseId}>
                        {option.name}
                      </option>
                    ))}
                  </select>

                  <div className="optional-white-list">
                    {optionalIds.map((factorBaseId) => {
                      const option = options.find(
                        (candidate) => candidate.factorBaseId === factorBaseId,
                      );

                      return (
                        <button
                          type="button"
                          key={factorBaseId}
                          onClick={() =>
                            updateOptionalIds(
                              scope,
                              optionalIds.filter((id) => id !== factorBaseId),
                            )
                          }
                        >
                          {option?.name ?? `Factor ${factorBaseId}`}
                          <span aria-hidden="true">×</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
