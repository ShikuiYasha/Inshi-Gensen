import { useRef } from 'react';
import './App.css';

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openFilePicker() {
    fileInputRef.current?.click();
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
        />

        <button className="import-button" type="button" onClick={openFilePicker}>
          Import data file
        </button>
      </section>
    </main>
  );
}

export default App;