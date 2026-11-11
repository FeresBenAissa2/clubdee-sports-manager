/**
 * Offline Storage Utility
 * Provides IndexedDB-based storage for offline data caching
 */

const DB_NAME = 'sports-club-offline';
const DB_VERSION = 1;

// Store names
export const STORES = {
  USER_PROFILE: 'user-profile',
  TRAINING_SESSIONS: 'training-sessions',
  ATTENDANCE: 'attendance',
  ANNOUNCEMENTS: 'announcements',
  PERFORMANCE: 'performance',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

/**
 * Initialize IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
  });
}

/**
 * Save data to offline storage
 */
export async function saveToOfflineStorage<T extends { id: string }>(
  storeName: StoreName,
  data: T | T[]
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);

  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    store.put(item);
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Get data from offline storage
 */
export async function getFromOfflineStorage<T>(
  storeName: StoreName,
  id?: string
): Promise<T | T[] | null> {
  const db = await openDB();
  const transaction = db.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    if (id) {
      // Get single item
      const request = store.get(id);
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    } else {
      // Get all items
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    }
  });
}

/**
 * Delete data from offline storage
 */
export async function deleteFromOfflineStorage(
  storeName: StoreName,
  id: string
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);

  store.delete(id);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Clear all data from a store
 */
export async function clearOfflineStorage(storeName: StoreName): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);

  store.clear();

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Check if data exists in offline storage
 */
export async function hasOfflineData(storeName: StoreName): Promise<boolean> {
  const db = await openDB();
  const transaction = db.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => {
      db.close();
      resolve(request.result > 0);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Get timestamp of last cache update
 */
export async function getLastCacheUpdate(storeName: StoreName): Promise<number | null> {
  const cacheKey = `${storeName}-last-update`;
  const timestamp = localStorage.getItem(cacheKey);
  return timestamp ? parseInt(timestamp, 10) : null;
}

/**
 * Set timestamp of last cache update
 */
export function setLastCacheUpdate(storeName: StoreName): void {
  const cacheKey = `${storeName}-last-update`;
  localStorage.setItem(cacheKey, Date.now().toString());
}

/**
 * Check if cache is stale (older than maxAge in milliseconds)
 */
export async function isCacheStale(
  storeName: StoreName,
  maxAge: number = 24 * 60 * 60 * 1000 // 24 hours default
): Promise<boolean> {
  const lastUpdate = await getLastCacheUpdate(storeName);
  if (!lastUpdate) return true;
  return Date.now() - lastUpdate > maxAge;
}
