import type { VeteranRecord } from './importVeterans';

const DATABASE_NAME = 'inshi-gensen';
const DATABASE_VERSION = 1;
const PARENT_STORE = 'parent-data';
const CURRENT_DATA_KEY = 'current';

export type StoredParentData = {
  id: typeof CURRENT_DATA_KEY;
  fileName: string;
  importedAt: string;
  veterans: VeteranRecord[];
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(PARENT_STORE)) {
        database.createObjectStore(PARENT_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Local browser storage could not be opened.'));
    };
  });
}

export async function saveParentData(
  fileName: string,
  veterans: VeteranRecord[],
): Promise<StoredParentData> {
  const database = await openDatabase();

  const storedData: StoredParentData = {
    id: CURRENT_DATA_KEY,
    fileName,
    importedAt: new Date().toISOString(),
    veterans,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PARENT_STORE, 'readwrite');
    const store = transaction.objectStore(PARENT_STORE);

    store.put(storedData);

    transaction.oncomplete = () => {
      database.close();
      resolve(storedData);
    };

    transaction.onerror = () => {
      database.close();
      reject(new Error('The imported Parent Data could not be saved locally.'));
    };
  });
}

export async function loadParentData(): Promise<StoredParentData | null> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PARENT_STORE, 'readonly');
    const store = transaction.objectStore(PARENT_STORE);
    const request = store.get(CURRENT_DATA_KEY);

    request.onsuccess = () => {
      database.close();
      resolve((request.result as StoredParentData | undefined) ?? null);
    };

    request.onerror = () => {
      database.close();
      reject(new Error('Saved Parent Data could not be loaded.'));
    };
  });
}