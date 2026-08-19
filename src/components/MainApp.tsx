import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ParentCard } from './ParentCard';
import { calculateCharacterAffinity, calculateRaceAffinity } from '../lib/affinity';
import type { GameData } from '../lib/gameData';
import { createDisplayParent, getTotalWhiteCount } from '../lib/parentDisplay';
import { importVeterans } from '../lib/importVeterans';
import { saveParentData, type StoredParentData } from '../lib/parentStorage';
import { CharacterPicker } from './CharacterPicker';
import { createCharacterOptions } from '../lib/characterOptions';

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
  const [targetCharacterId, setTargetCharacterId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('white-count');
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const displayParents = useMemo(
    () =>
      data.veterans.flatMap((veteran) => {
        const parent = createDisplayParent(veteran, gameData);

        return parent ? [parent] : [];
      }),
    [data.veterans, gameData],
  );
  const characterOptions = useMemo(() => createCharacterOptions(gameData), [gameData]);
  const sortedParents = useMemo(() => {
    const preparedParents = displayParents.map((parent) => {
      const raceAffinity = calculateRaceAffinity(parent, gameData);
      const totalAffinity =
        targetCharacterId === null
          ? undefined
          : calculateCharacterAffinity(targetCharacterId, parent, gameData) + raceAffinity;

      return {
        parent,
        raceAffinity,
        totalAffinity,
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
  }, [displayParents, gameData, sortMode, targetCharacterId]);

  function handleTargetChange(characterId: number | null) {
    setTargetCharacterId(characterId);

    if (characterId === null && sortMode === 'affinity') {
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
                      value={targetCharacterId}
                      onChange={handleTargetChange}
                    />
                  </div>

                  <div className="target-control">
                    <span className="target-control__label">Other Parent</span>

                    <button className="character-picker-button" type="button" disabled>
                      <span className="character-picker-button__add">+</span>
                      <span>Select Other Parent</span>
                    </button>
                  </div>
                </div>
              </details>

              <details className="filter-section">
                <summary>Include / Exclude Characters</summary>
                <div className="filter-section__content">
                  Main Parent and Grandparent character filters will go here.
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
              <p>{displayParents.length} Parent records</p>
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
            {sortedParents.slice(0, 20).map(({ parent, raceAffinity, totalAffinity }) => (
              <ParentCard
                key={parent.trainedCharaId}
                parent={parent}
                raceAffinity={raceAffinity}
                totalAffinity={totalAffinity}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
