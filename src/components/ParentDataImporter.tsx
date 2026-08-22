import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { fetchParentProfile } from '../lib/parentApi';
import { importParentProfile } from '../lib/importParentProfile';
import { importVeterans } from '../lib/importVeterans';
import { saveParentData, type StoredParentData } from '../lib/parentStorage';

type ParentDataImporterProps = {
  onImported: (data: StoredParentData) => void;
};

export function ParentDataImporter({ onImported }: ParentDataImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  function openFilePicker(): void {
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const importedData = importVeterans(await file.text());
      const savedData = await saveParentData('Imported JSON', importedData.veterans);

      setError(null);
      onImported(savedData);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The selected file could not be imported.',
      );
    } finally {
      event.target.value = '';
    }
  }

  async function handleUidImport(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedAccountId = accountId.trim();

    if (!/^\d{9,12}$/.test(trimmedAccountId)) {
      setError('Enter a valid 9–12 digit Trainer UID.');
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      const response = await fetchParentProfile(trimmedAccountId);

      const importedData = importParentProfile(response);

      const savedData = await saveParentData('uma.moe', importedData.veterans);

      onImported(savedData);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The Parent Data could not be imported.',
      );
    } finally {
      setIsFetching(false);
    }
  }

  return (
    <div className="parent-data-importer">
      <input
        ref={fileInputRef}
        className="file-input"
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
      />

      <button className="import-button" type="button" onClick={openFilePicker}>
        Import JSON file
      </button>

      <div className="parent-data-importer__divider">
        <span>or</span>
      </div>

      <form className="parent-data-importer__uid" onSubmit={handleUidImport}>
        <label htmlFor="parent-data-uid">Import from uma.moe</label>

        <div className="parent-data-importer__uid-row">
          <input
            id="parent-data-uid"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Trainer UID"
            value={accountId}
            onChange={(event) => {
              setAccountId(event.target.value.replace(/\D/g, ''));
            }}
          />

          <button type="submit" disabled={isFetching}>
            {isFetching ? 'Importing…' : 'Import'}
          </button>
        </div>

        <small>Uses Parent Data previously uploaded to uma.moe.</small>
      </form>

      {error && (
        <p className="import-status import-status--error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
