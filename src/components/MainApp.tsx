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

type MainAppProps = {
  data: StoredParentData;
  gameData: GameData;
  onDataReplaced: (data: StoredParentData) => void;
};

type FilterMode = 'visual' | 'uql';
type SortMode = 'white-count' | 'affinity' | 'race-affinity';

export function MainApp({ data, gameData, onDataReplaced }: MainAppProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('visual');
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
  const sortedParents = useMemo(() => {
    const preparedParents = displayParents
      .filter((parent) => {
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

        return {
          parent,
          raceAffinity,
          totalAffinity,
          raceBreakdown,
          characterBreakdown,
        };
      });

    preparedParents.sort((left, right) => {
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
                onClick={() => setFilterMode('visual')}
              >
                Visual
              </button>

              <button
                className={filterMode === 'uql' ? 'is-active' : ''}
                type="button"
                onClick={() => setFilterMode('uql')}
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
                <summary>Inheritance Factors</summary>
                <div className="filter-section__content">
                  Combined lineage factor filters will go here.
                </div>
              </details>

              <details className="filter-section">
                <summary>Main Parent Factors</summary>
                <div className="filter-section__content">
                  Main Parent factor filters will go here.
                </div>
              </details>

              <details className="filter-section">
                <summary>Total Star Count</summary>
                <div className="filter-section__content">
                  Total factor star filters will go here.
                </div>
              </details>
            </div>
          ) : (
            <div className="uql-panel">
              <label htmlFor="uql-editor">UQL query</label>
              <textarea
                id="uql-editor"
                placeholder="Example: (Speed >= 3 or Stamina >= 3) and optional white in (...)"
                spellCheck="false"
              />
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
