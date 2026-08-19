import { useEffect, useState } from 'react';
import './App.css';
import { ImportScreen } from './components/ImportScreen';
import { MainApp } from './components/MainApp';
import { loadGameData, type GameData } from './lib/gameData';
import { loadParentData, type StoredParentData } from './lib/parentStorage';

function App() {
  const [storedData, setStoredData] = useState<StoredParentData | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadApplicationData() {
      try {
        const [savedData, loadedGameData] = await Promise.all([loadParentData(), loadGameData()]);

        setStoredData(savedData);
        setGameData(loadedGameData);
      } catch (error) {
        setLoadingError(
          error instanceof Error ? error.message : 'The application data could not be loaded.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadApplicationData();
  }, []);

  if (isLoading) {
    return (
      <main className="app">
        <p className="loading-message">Loading application data…</p>
      </main>
    );
  }

  if (loadingError || !gameData) {
    return (
      <main className="app">
        <section className="welcome">
          <h1 lang="ja">因子厳選</h1>
          <p className="import-status import-status--error" role="alert">
            {loadingError ?? 'The game lookup data could not be loaded.'}
          </p>
        </section>
      </main>
    );
  }

  if (!storedData) {
    return <ImportScreen onImported={setStoredData} />;
  }

  return <MainApp data={storedData} gameData={gameData} onDataReplaced={setStoredData} />;
}

export default App;
