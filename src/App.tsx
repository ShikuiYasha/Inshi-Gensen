import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import './App.css';
import { importVeterans } from './lib/importVeterans';
import { loadParentData, saveParentData } from './lib/parentStorage';

type ImportStatus =
  | { type: 'idle' }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    type: 'idle',
  });

  useEffect(() => {
    async function restoreSavedData() {
      try {
        const savedData = await loadParentData();

        if (savedData) {
          setImportStatus({
            type: 'success',
            message: `${savedData.veterans.length} saved Parent records loaded from ${savedData.fileName}.`,
          });
        }
      } catch (error) {
        setImportStatus({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Saved Parent Data could not be loaded.',
        });
      }
    }

    void restoreSavedData();
  }, []);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const jsonText = await file.text();
      const importedData = importVeterans(jsonText);

      await saveParentData(file.name, importedData.veterans);

      setImportStatus({
        type: 'success',
        message: `${importedData.veterans.length} Parent records imported and saved from ${file.name}.`,
      });
    } catch (error) {
      setImportStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'The selected file could not be imported.',
      });
    } finally {
      event.target.value = '';
    }
  }

  return (
    <main className="app">
      <section className="welcome">
        <h1 lang="ja">因子厳選</h1>

        <p className="welcome__heading">Start by importing your data file.</p>

        <p className="welcome__description">
          Select your Veteran Data as a <strong>.json</strong> file. If you do not have one yet,
          you can extract it using{' '}
          <a href="https://github.com/Werseter/umadump" target="_blank" rel="noreferrer">
            UmaDump
          </a>{' '}
          or{' '}
          <a
            href="https://github.com/xancia/UmaExtractor/releases"
            target="_blank"
            rel="noreferrer"
          >
            UmaExtractor
          </a>
          .
        </p>

        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
        />

        <button className="import-button" type="button" onClick={openFilePicker}>
          Import data file
        </button>

        {importStatus.type !== 'idle' && (
          <p className={`import-status import-status--${importStatus.type}`} role="status">
            {importStatus.message}
          </p>
        )}
      </section>
    </main>
  );
}

export default App;