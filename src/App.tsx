import { useEffect, useState } from 'react';
import './App.css';
import { ImportScreen } from './components/ImportScreen';
import { MainApp } from './components/MainApp';
import {
  loadParentData,
  type StoredParentData,
} from './lib/parentStorage';

function App() {
  const [storedData, setStoredData] = useState<StoredParentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSavedData() {
      try {
        const savedData = await loadParentData();
        setStoredData(savedData);
      } finally {
        setIsLoading(false);
      }
    }

    void restoreSavedData();
  }, []);

  if (isLoading) {
    return (
      <main className="app">
        <p className="loading-message">Loading saved Parent Data…</p>
      </main>
    );
  }

  if (!storedData) {
    return <ImportScreen onImported={setStoredData} />;
  }

  return (
    <MainApp
      data={storedData}
      onDataReplaced={setStoredData}
    />
  );
}

export default App;