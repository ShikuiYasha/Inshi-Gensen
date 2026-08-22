import { useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';

import {
  exportFilterPreset,
  exportFilterPresetCollection,
  type FilterPreset,
} from '../lib/filterPresets';

type FilterPresetPanelProps = {
  isOpen: boolean;
  presets: FilterPreset[];
  currentQuery: string;
  onClose: () => void;
  onSave: (name: string) => void;
  onApply: (preset: FilterPreset) => void;
  onRemove: (presetId: string) => void;
  onImport: (code: string) => void;
  onImportCollection: (contents: string) => void;
};

export function FilterPresetPanel({
  isOpen,
  presets,
  currentQuery,
  onClose,
  onSave,
  onApply,
  onRemove,
  onImport,
  onImportCollection,
}: FilterPresetPanelProps) {
  const [presetName, setPresetName] = useState('');
  const [importCode, setImportCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleSave(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const name = presetName.trim();

    if (!name) {
      setMessage('Enter a name for the preset.');
      return;
    }

    if (!currentQuery.trim()) {
      setMessage('Add at least one Spark filter before saving.');
      return;
    }

    onSave(name);
    setPresetName('');
    setMessage('Preset saved.');
  }

  function handleImport(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!importCode.trim()) {
      setMessage('Paste a preset code first.');
      return;
    }

    try {
      onImport(importCode);
      setImportCode('');
      setMessage('Preset import complete.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The preset could not be imported.');
    }
  }

  async function copyPreset(preset: FilterPreset): Promise<void> {
    const code = exportFilterPreset(preset);

    try {
      await navigator.clipboard.writeText(code);
      setMessage(`Copied “${preset.name}”.`);
    } catch {
      setMessage('The browser could not copy the preset code.');
    }
  }
  function downloadCollection(): void {
    if (presets.length === 0) {
      setMessage('There are no presets to export.');
      return;
    }

    const contents = exportFilterPresetCollection(presets);

    const blob = new Blob([contents], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = '因子厳選-presets.json';
    link.click();

    URL.revokeObjectURL(url);

    setMessage(`Exported ${presets.length} presets.`);
  }

  async function handleCollectionFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      onImportCollection(await file.text());
      setMessage('Preset collection imported.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The preset collection could not be imported.',
      );
    }
  }

  return (
    <div className="preset-backdrop" onMouseDown={handleBackdropClick}>
      <section className="preset-panel" role="dialog" aria-modal="true" aria-label="Filter Presets">
        <header className="preset-panel__header">
          <div>
            <h2>Filter Presets</h2>
            <span>{presets.length} saved</span>
          </div>

          <button type="button" aria-label="Close Filter Presets" onClick={onClose}>
            ×
          </button>
        </header>

        <form className="preset-save" onSubmit={handleSave}>
          <label htmlFor="preset-name">Save current Spark filters</label>

          <div>
            <input
              id="preset-name"
              value={presetName}
              placeholder="Preset name"
              onChange={(event) => {
                setPresetName(event.target.value);
              }}
            />

            <button type="submit">Save</button>
          </div>
        </form>

        {message && <p className="preset-panel__message">{message}</p>}
        <div className="preset-collection-actions">
          <span>Collection backup</span>

          <div>
            <button type="button" disabled={presets.length === 0} onClick={downloadCollection}>
              Export Collection
            </button>

            <label className="preset-collection-import">
              Import Collection
              <input
                type="file"
                accept=".json,application/json"
                onChange={(event) => {
                  void handleCollectionFile(event);
                }}
              />
            </label>
          </div>
        </div>
        <div className="preset-list">
          {presets.map((preset) => (
            <article className="preset-card" key={preset.id}>
              <div>
                <strong>{preset.name}</strong>
                <span>UQL</span>
              </div>

              <div className="preset-card__actions">
                <button
                  type="button"
                  onClick={() => {
                    onApply(preset);
                    onClose();
                  }}
                >
                  Apply
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void copyPreset(preset);
                  }}
                >
                  Copy
                </button>

                <button
                  className="preset-card__remove"
                  type="button"
                  onClick={() => {
                    onRemove(preset.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}

          {presets.length === 0 && <div className="preset-list__empty">No saved presets yet.</div>}
        </div>

        <form className="preset-import" onSubmit={handleImport}>
          <label htmlFor="preset-import-code">Import Preset Code</label>

          <textarea
            id="preset-import-code"
            value={importCode}
            placeholder="Paste a Preset Code"
            onChange={(event) => {
              setImportCode(event.target.value);
            }}
          />

          <button type="submit">Import</button>
        </form>
      </section>
    </div>
  );
}
