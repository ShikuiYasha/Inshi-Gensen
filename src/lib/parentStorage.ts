import type { VeteranRecord } from './importVeterans';

const DATABASE_NAME = 'inshi-gensen';
const DATABASE_VERSION = 2;
const PARENT_STORE = 'parent-data';
const RENTAL_STORE = 'rentals';
const CURRENT_DATA_KEY = 'current';
const CURRENT_DATA_SCHEMA_VERSION = 1;

export type StoredParentData = {
  id: typeof CURRENT_DATA_KEY;
  fileName: string;
  importedAt: string;
  veterans: VeteranRecord[];
  schemaVersion: number;
};
export type StoredRental = {
  accountId: string;
  trainerName: string;
  savedAt: string;
  veteran: VeteranRecord;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(PARENT_STORE)) {
        database.createObjectStore(PARENT_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(RENTAL_STORE)) {
        database.createObjectStore(RENTAL_STORE, {
          keyPath: 'accountId',
        });
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
    schemaVersion: CURRENT_DATA_SCHEMA_VERSION,
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

      const savedData = request.result as StoredParentData | undefined;

      if (!savedData) {
        resolve(null);
        return;
      }

      resolve({
        ...savedData,
        schemaVersion: savedData.schemaVersion ?? CURRENT_DATA_SCHEMA_VERSION,
      });
    };

    request.onerror = () => {
      database.close();
      reject(new Error('Saved Parent Data could not be loaded.'));
    };
  });
}
export async function saveRental(
  accountId: string,
  trainerName: string,
  veteran: VeteranRecord,
): Promise<StoredRental> {
  const database = await openDatabase();

  const storedRental: StoredRental = {
    accountId,
    trainerName,
    savedAt: new Date().toISOString(),
    veteran,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RENTAL_STORE, 'readwrite');
    const store = transaction.objectStore(RENTAL_STORE);

    store.put(storedRental);

    transaction.oncomplete = () => {
      database.close();
      resolve(storedRental);
    };

    transaction.onerror = () => {
      database.close();
      reject(new Error('The Rental could not be saved locally.'));
    };
  });
}
export async function loadRentals(): Promise<StoredRental[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RENTAL_STORE, 'readonly');
    const store = transaction.objectStore(RENTAL_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      database.close();

      const rentals = request.result as StoredRental[];

      resolve(rentals.sort((left, right) => left.trainerName.localeCompare(right.trainerName)));
    };

    request.onerror = () => {
      database.close();
      reject(new Error('Saved Rentals could not be loaded.'));
    };
  });
}
export async function removeRental(accountId: string): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RENTAL_STORE, 'readwrite');
    const store = transaction.objectStore(RENTAL_STORE);

    store.delete(accountId);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };

    transaction.onerror = () => {
      database.close();
      reject(new Error('The saved Rental could not be removed.'));
    };
  });
}
