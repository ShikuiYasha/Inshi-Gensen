import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ParentCard } from './ParentCard';
import {
  calculateCharacterAffinityBreakdown,
  calculateRaceAffinityBreakdown,
} from '../lib/affinity';
import type { GameData } from '../lib/gameData';
import { createDisplayParent, getCanonicalCardId, getTotalWhiteCount } from '../lib/parentDisplay';
import { importVeterans } from '../lib/importVeterans';
import {
  loadRentals,
  removeRental,
  saveParentData,
  saveRental,
  type StoredParentData,
  type StoredRental,
} from '../lib/parentStorage';
import { CharacterPicker } from './CharacterPicker';
import {
  createCharacterOptions,
  createGrandparentCharacterOptions,
  createOwnedParentCharacterOptions,
} from '../lib/characterOptions';
import { CharacterMultiPicker } from './CharacterMultiPicker';
import { RentalPicker } from './RentalPicker';
import { fetchRentalProfile } from '../lib/rentalApi';
import { importRentalProfile } from '../lib/rentalImport';
import { createEmptySparkFilterState } from '../lib/filterState';
import { getOptionalWhiteMatchCount, matchesSparkFilters } from '../lib/sparkFilter';
import { SparkFilterPanel } from './SparkFilterPanel';
import { createFactorOptions } from '../lib/factorOptions';
import { serializeSparkFiltersToUql } from '../lib/uql';
import { parseUqlToSparkFilters } from '../lib/uqlParser';

type MainAppProps = {
  data: StoredParentData;
  gameData: GameData;
  onDataReplaced: (data: StoredParentData) => void;
};

type FilterMode = 'visual' | 'uql';
type UqlStatus = 'active' | 'editing' | 'invalid';
type SortMode = 'white-count' | 'affinity' | 'race-affinity';

export function MainApp({ data, gameData, onDataReplaced }: MainAppProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('visual');
  const [uqlText, setUqlText] = useState('');
  const [uqlError, setUqlError] = useState<string | null>(null);
  const [uqlStatus, setUqlStatus] = useState<UqlStatus>('active');
  const [sparkFilters, setSparkFilters] = useState(createEmptySparkFilterState);
  const [targetCardId, setTargetCardId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('white-count');
  const [otherParentId, setOtherParentId] = useState<string | null>(null);
  const [rentals, setRentals] = useState<StoredRental[]>([]);
  const [isRentalPickerOpen, setIsRentalPickerOpen] = useState(false);
  const [mainAllowIds, setMainAllowIds] = useState<number[]>([]);
  const [mainHideIds, setMainHideIds] = useState<number[]>([]);
  const [grandparentAllowIds, setGrandparentAllowIds] = useState<number[]>([]);
  const [grandparentHideIds, setGrandparentHideIds] = useState<number[]>([]);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  useEffect(() => {
    let isCancelled = false;

    void loadRentals().then(
      (savedRentals) => {
        if (!isCancelled) {
          setRentals(savedRentals);
        }
      },
      () => {
        if (!isCancelled) {
          setRentals([]);
        }
      },
    );

    return () => {
      isCancelled = true;
    };
  }, []);
  const displayParents = useMemo(
    () =>
      data.veterans.flatMap((veteran) => {
        const parent = createDisplayParent(veteran, gameData);

        return parent ? [parent] : [];
      }),
    [data.veterans, gameData],
  );
  const displayRentals = useMemo(
    () =>
      rentals.flatMap((rental) => {
        const parent = createDisplayParent(rental.veteran, gameData);

        return parent ? [{ rental, parent }] : [];
      }),
    [gameData, rentals],
  );

  const otherParent = useMemo(
    () =>
      displayParents.find((parent) => parent.trainedCharaId === otherParentId) ??
      displayRentals.find(({ parent }) => parent.trainedCharaId === otherParentId)?.parent ??
      null,
    [displayParents, displayRentals, otherParentId],
  );
  const characterOptions = useMemo(() => createCharacterOptions(gameData), [gameData]);
  const factorOptions = useMemo(() => createFactorOptions(gameData), [gameData]);
  useEffect(() => {
    if (filterMode !== 'uql') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const result = parseUqlToSparkFilters(uqlText, factorOptions);

      if (result.state === null) {
        setUqlError(result.error);
        setUqlStatus('invalid');
        return;
      }

      setSparkFilters(result.state);
      setUqlError(null);
      setUqlStatus('active');
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [factorOptions, filterMode, uqlText]);

  const ownedParentCharacterOptions = useMemo(
    () => createOwnedParentCharacterOptions(displayParents, gameData),
    [displayParents, gameData],
  );
  const targetCharacterId =
    characterOptions.find((option) => option.cardId === targetCardId)?.characterId ?? null;

  const grandparentCharacterOptions = useMemo(
    () => createGrandparentCharacterOptions(displayParents, gameData),
    [displayParents, gameData],
  );
  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];

    function getFactorName(factorBaseId: number): string {
      return (
        factorOptions.find((option) => option.factorBaseId === factorBaseId)?.name ??
        `Spark ${factorBaseId}`
      );
    }

    function getCharacterName(cardId: number, options: typeof ownedParentCharacterOptions): string {
      return options.find((option) => option.cardId === cardId)?.name ?? `Character ${cardId}`;
    }

    for (const scope of ['lineage', 'main'] as const) {
      const conditions = sparkFilters.root.children.flatMap((node) =>
        node.kind === 'spark' && node.scope === scope ? [node] : [],
      );

      conditions.forEach((condition, index) => {
        const scopeLabel = scope === 'main' ? 'Main: ' : '';

        const starLabel =
          condition.minStars === condition.maxStars
            ? `${condition.minStars}★`
            : `${condition.minStars}-${condition.maxStars}★`;

        const connectorLabel =
          index < conditions.length - 1 ? ` ${condition.nextOperator.toUpperCase()}` : '';

        labels.push(
          `${scopeLabel}${getFactorName(condition.factorBaseId)}: ${starLabel}${connectorLabel}`,
        );
      });
    }

    for (const optionalFilter of sparkFilters.optionalWhites) {
      const scopeLabel = optionalFilter.scope === 'main' ? 'Optional Main' : 'Optional';

      for (const factorBaseId of optionalFilter.factorBaseIds) {
        labels.push(`${scopeLabel}: ${getFactorName(factorBaseId)}`);
      }
    }

    for (const cardId of mainAllowIds) {
      labels.push(`Allow Parent: ${getCharacterName(cardId, ownedParentCharacterOptions)}`);
    }

    for (const cardId of mainHideIds) {
      labels.push(`Hide Parent: ${getCharacterName(cardId, ownedParentCharacterOptions)}`);
    }

    for (const cardId of grandparentAllowIds) {
      labels.push(`Allow GP: ${getCharacterName(cardId, grandparentCharacterOptions)}`);
    }

    for (const cardId of grandparentHideIds) {
      labels.push(`Hide GP: ${getCharacterName(cardId, grandparentCharacterOptions)}`);
    }

    return labels;
  }, [
    factorOptions,
    grandparentAllowIds,
    grandparentCharacterOptions,
    grandparentHideIds,
    mainAllowIds,
    mainHideIds,
    ownedParentCharacterOptions,
    sparkFilters,
  ]);
  const sortedParents = useMemo(() => {
    const preparedParents = displayParents
      .filter((parent) => {
        if (!matchesSparkFilters(parent, sparkFilters)) {
          return false;
        }
        if (otherParent && parent.main.characterId === otherParent.main.characterId) {
          return false;
        }

        const mainCardId = getCanonicalCardId(parent.main.cardId);

        if (mainAllowIds.length > 0 && !mainAllowIds.includes(mainCardId)) {
          return false;
        }

        if (mainHideIds.includes(mainCardId)) {
          return false;
        }

        const grandparentCardIds = parent.grandparents.map((grandparent) =>
          getCanonicalCardId(grandparent.cardId),
        );

        if (grandparentAllowIds.length === 1) {
          if (!grandparentCardIds.includes(grandparentAllowIds[0])) {
            return false;
          }
        } else if (grandparentAllowIds.length >= 2) {
          const bothGrandparentsAllowed =
            grandparentCardIds.length >= 2 &&
            grandparentCardIds.every((cardId) => grandparentAllowIds.includes(cardId));

          if (!bothGrandparentsAllowed) {
            return false;
          }
        }

        if (grandparentCardIds.some((cardId) => grandparentHideIds.includes(cardId))) {
          return false;
        }

        return true;
      })
      .map((parent) => {
        const raceBreakdown = calculateRaceAffinityBreakdown(
          parent,
          gameData,
          otherParent ?? undefined,
        );

        const characterBreakdown =
          targetCharacterId === null
            ? undefined
            : calculateCharacterAffinityBreakdown(
                targetCharacterId,
                parent,
                gameData,
                otherParent ?? undefined,
              );

        const raceAffinity = raceBreakdown.total;
        const totalAffinity = characterBreakdown
          ? characterBreakdown.total + raceBreakdown.total
          : undefined;
        const optionalWhiteMatches = getOptionalWhiteMatchCount(parent, sparkFilters);

        return {
          parent,
          raceAffinity,
          totalAffinity,
          raceBreakdown,
          characterBreakdown,
          optionalWhiteMatches,
        };
      });
    const hasOptionalWhiteFilters = sparkFilters.optionalWhites.some(
      (filter) => filter.factorBaseIds.length > 0,
    );
    preparedParents.sort((left, right) => {
      if (hasOptionalWhiteFilters) {
        const optionalWhiteDifference = right.optionalWhiteMatches - left.optionalWhiteMatches;

        if (optionalWhiteDifference !== 0) {
          return optionalWhiteDifference;
        }
      }
      let difference: number;

      if (sortMode === 'white-count') {
        difference = getTotalWhiteCount(right.parent) - getTotalWhiteCount(left.parent);
      } else if (sortMode === 'race-affinity') {
        difference = right.raceAffinity - left.raceAffinity;
      } else {
        difference = (right.totalAffinity ?? -1) - (left.totalAffinity ?? -1);
      }

      if (difference !== 0) {
        return difference;
      }

      return left.parent.trainedCharaId.localeCompare(right.parent.trainedCharaId);
    });

    return preparedParents;
  }, [
    displayParents,
    gameData,
    grandparentAllowIds,
    grandparentHideIds,
    mainAllowIds,
    mainHideIds,
    otherParent,
    sortMode,
    sparkFilters,
    targetCharacterId,
  ]);

  async function handleFetchRental(accountId: string): Promise<void> {
    const previousRental = displayRentals.find(({ rental }) => rental.accountId === accountId);

    const wasSelected = previousRental?.parent.trainedCharaId === otherParentId;
    const response = await fetchRentalProfile(accountId);
    const importedRental = importRentalProfile(response);

    const savedRental = await saveRental(
      importedRental.accountId,
      importedRental.trainerName,
      importedRental.veteran,
    );

    setRentals((currentRentals) =>
      [
        ...currentRentals.filter((rental) => rental.accountId !== savedRental.accountId),
        savedRental,
      ].sort((left, right) => left.trainerName.localeCompare(right.trainerName)),
    );

    if (wasSelected) {
      const refreshedParent = createDisplayParent(savedRental.veteran, gameData);

      if (refreshedParent) {
        setOtherParentId(refreshedParent.trainedCharaId);
      }
    }
  }
  async function handleRemoveRental(accountId: string): Promise<void> {
    const removedDisplayRental = displayRentals.find(
      ({ rental }) => rental.accountId === accountId,
    );

    await removeRental(accountId);

    setRentals((currentRentals) =>
      currentRentals.filter((rental) => rental.accountId !== accountId),
    );

    if (removedDisplayRental?.parent.trainedCharaId === otherParentId) {
      setOtherParentId(null);
    }
  }

  function handleTargetChange(cardId: number | null) {
    setTargetCardId(cardId);

    if (cardId === null && sortMode === 'affinity') {
      setSortMode('race-affinity');
    }
  }
  async function handleReplacement(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const jsonText = await file.text();
      const importedData = importVeterans(jsonText);
      const savedData = await saveParentData(file.name, importedData.veterans);

      setReplaceError(null);
      onDataReplaced(savedData);
    } catch (error) {
      setReplaceError(
        error instanceof Error ? error.message : 'The selected file could not be imported.',
      );
    } finally {
      event.target.value = '';
    }
  }
  function clearCurrentFilters(): void {
    setSparkFilters(createEmptySparkFilterState());
    setMainAllowIds([]);
    setMainHideIds([]);
    setGrandparentAllowIds([]);
    setGrandparentHideIds([]);
    setUqlText('');
    setUqlError(null);
  }
  function switchToVisualMode(): void {
    if (filterMode === 'visual') {
      return;
    }

    const result = parseUqlToSparkFilters(uqlText, factorOptions);

    if (result.state === null) {
      setUqlError(result.error);
      return;
    }

    setSparkFilters(result.state);
    setUqlError(null);
    setFilterMode('visual');
  }
  return (
    <div className="database">
      <header className="database-header">
        <div>
          <h1 lang="ja">因子厳選</h1>
          <p>{data.veterans.length} Parent records</p>
        </div>

        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          accept=".json,application/json"
          onChange={handleReplacement}
        />

        <button
          className="secondary-button"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          Replace data
        </button>
      </header>

      {replaceError && (
        <p className="import-status import-status--error" role="alert">
          {replaceError}
        </p>
      )}

      <main className="database-content">
        <section className="filter-panel">
          <div className="filter-panel__header">
            <h2>Filters</h2>

            <div className="filter-mode" aria-label="Filter mode">
              <button
                className={filterMode === 'visual' ? 'is-active' : ''}
                type="button"
                onClick={switchToVisualMode}
              >
                Visual
              </button>

              <button
                className={filterMode === 'uql' ? 'is-active' : ''}
                type="button"
                onClick={() => {
                  setUqlText(serializeSparkFiltersToUql(sparkFilters, factorOptions));
                  setUqlError(null);
                  setFilterMode('uql');
                }}
              >
                UQL
              </button>
            </div>
          </div>

          {filterMode === 'visual' ? (
            <div className="filter-sections">
              <details className="filter-section">
                <summary>Target</summary>
                <div className="filter-section__content target-controls">
                  <div className="target-control">
                    <span className="target-control__label">Target Uma</span>

                    <CharacterPicker
                      label="Select Target Uma"
                      options={characterOptions}
                      value={targetCardId}
                      onChange={handleTargetChange}
                    />
                  </div>

                  <div className="target-control">
                    <span className="target-control__label">Other Parent</span>

                    {otherParent ? (
                      <div className="other-parent-selection">
                        <div className="character-image">
                          <span aria-hidden="true">
                            {otherParent.main.characterName.slice(0, 1)}
                          </span>

                          <img
                            src={
                              `${import.meta.env.BASE_URL}character_thumbs/` +
                              otherParent.main.thumbnailFileName
                            }
                            alt=""
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>

                        <strong>{otherParent.main.characterName}</strong>

                        <button
                          className="browse-rentals-button"
                          type="button"
                          onClick={() => setIsRentalPickerOpen(true)}
                        >
                          Rentals
                        </button>

                        <button type="button" onClick={() => setOtherParentId(null)}>
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="other-parent-empty">
                        <span className="character-picker-button__add">+</span>
                        <strong>No Other Parent selected</strong>
                        <span>Choose an owned Parent below or use a saved Rental.</span>

                        <button
                          className="browse-rentals-button"
                          type="button"
                          onClick={() => setIsRentalPickerOpen(true)}
                        >
                          Browse Rentals
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </details>

              <details className="filter-section">
                <summary>Include / Exclude Characters</summary>
                <div className="filter-section__content character-filter-layout">
                  <section className="character-filter-scope">
                    <h3>Main Parent</h3>

                    <CharacterMultiPicker
                      label="Allow Main Parent Characters"
                      options={ownedParentCharacterOptions}
                      values={mainAllowIds}
                      tone="allow"
                      onChange={setMainAllowIds}
                    />

                    <CharacterMultiPicker
                      label="Hide Main Parent Characters"
                      options={ownedParentCharacterOptions}
                      values={mainHideIds}
                      tone="hide"
                      onChange={setMainHideIds}
                    />
                  </section>

                  <section className="character-filter-scope">
                    <h3>Grandparents</h3>

                    <CharacterMultiPicker
                      label="Allow Grandparent Characters"
                      options={grandparentCharacterOptions}
                      values={grandparentAllowIds}
                      tone="allow"
                      onChange={setGrandparentAllowIds}
                    />

                    <CharacterMultiPicker
                      label="Hide Grandparent Characters"
                      options={grandparentCharacterOptions}
                      values={grandparentHideIds}
                      tone="hide"
                      onChange={setGrandparentHideIds}
                    />
                  </section>
                </div>
              </details>

              <div className="property-heading">Property Filters</div>

              <details className="filter-section">
                <summary>Spark Filters</summary>

                <div className="filter-section__content">
                  <SparkFilterPanel
                    state={sparkFilters}
                    options={factorOptions}
                    onChange={setSparkFilters}
                  />
                </div>
              </details>
            </div>
          ) : (
            <div className="uql-panel">
              <div className="uql-panel__heading">
                <label htmlFor="uql-editor">UQL query</label>

                <span
                  className={`uql-validity uql-validity--${uqlStatus}`}
                  title={uqlStatus === 'invalid' ? (uqlError ?? undefined) : undefined}
                >
                  {uqlStatus === 'active'
                    ? 'Active'
                    : uqlStatus === 'editing'
                      ? 'Editing'
                      : 'Invalid'}
                </span>
              </div>

              <label className="uql-editor-shell" htmlFor="uql-editor">
                <span className="uql-editor-prefix">where</span>

                <textarea
                  id="uql-editor"
                  value={uqlText}
                  placeholder="Speed >= 3 and (Guts >= 3 or Wit >= 3)"
                  spellCheck="false"
                  onChange={(event) => {
                    setUqlText(event.target.value);
                    setUqlError(null);
                    setUqlStatus('editing');
                  }}
                />
              </label>
            </div>
          )}
          {activeFilterLabels.length > 0 && (
            <div className="active-filters">
              <div className="active-filters__list">
                <strong>Active Filters:</strong>

                {filterMode === 'uql' ? (
                  <span
                    className={`active-filter-chip active-filter-chip--uql uql-chip--${uqlStatus}`}
                  >
                    UQL:{' '}
                    {uqlStatus === 'active'
                      ? 'Active'
                      : uqlStatus === 'editing'
                        ? 'Editing'
                        : 'Invalid'}
                  </span>
                ) : (
                  activeFilterLabels.map((label, index) => (
                    <span className="active-filter-chip" key={`${label}-${index}`}>
                      {label}
                    </span>
                  ))
                )}
              </div>

              <button className="clear-filters-button" type="button" onClick={clearCurrentFilters}>
                Clear Filters
              </button>
            </div>
          )}
        </section>

        <section className="results">
          <div className="results__header">
            <div>
              <h2>Results</h2>
              <p>{sortedParents.length} Parent records</p>
            </div>

            <label className="sort-control">
              <span>Sort by</span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
              >
                <option value="white-count">Total White Spark Count</option>

                <option value="affinity" disabled={targetCharacterId === null}>
                  Total Affinity
                </option>

                <option value="race-affinity">Total Race Affinity</option>
              </select>
            </label>
          </div>

          <div className="result-list">
            {sortedParents
              .slice(0, 20)
              .map(({ parent, raceAffinity, totalAffinity, raceBreakdown, characterBreakdown }) => (
                <ParentCard
                  key={parent.trainedCharaId}
                  parent={parent}
                  raceAffinity={raceAffinity}
                  totalAffinity={totalAffinity}
                  raceBreakdown={raceBreakdown}
                  characterBreakdown={characterBreakdown}
                  isOtherParent={parent.trainedCharaId === otherParentId}
                  onToggleOtherParent={() =>
                    setOtherParentId((currentId) =>
                      currentId === parent.trainedCharaId ? null : parent.trainedCharaId,
                    )
                  }
                />
              ))}
          </div>
        </section>
      </main>
      <RentalPicker
        isOpen={isRentalPickerOpen}
        rentals={displayRentals}
        selectedParentId={otherParentId}
        onClose={() => setIsRentalPickerOpen(false)}
        onFetch={handleFetchRental}
        onSelect={setOtherParentId}
        onRemove={handleRemoveRental}
      />
    </div>
  );
}
