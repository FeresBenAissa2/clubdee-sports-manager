/**
 * Sync Queue System
 * Manages queuing and syncing of offline changes
 */

const SYNC_QUEUE_DB = 'sports-club-sync-queue';
const SYNC_QUEUE_STORE = 'pending-operations';
const SYNC_QUEUE_VERSION = 1;

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string; // e.g., 'attendance', 'leave-request', 'check-in'
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

/**
 * Open sync queue database
 */
function openSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_QUEUE_DB, SYNC_QUEUE_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const store = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('resource', 'resource', { unique: false });
      }
    };
  });
}

/**
 * Add operation to sync queue
 */
export async function addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
  const db = await openSyncDB();
  const transaction = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = transaction.objectStore(SYNC_QUEUE_STORE);

  const id = `${operation.resource}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const syncOp: SyncOperation = {
    ...operation,
    id,
    timestamp: Date.now(),
    retryCount: 0,
  };

  store.add(syncOp);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve(id);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Get all pending operations
 */
export async function getPendingOperations(): Promise<SyncOperation[]> {
  const db = await openSyncDB();
  const transaction = db.transaction(SYNC_QUEUE_STORE, 'readonly');
  const store = transaction.objectStore(SYNC_QUEUE_STORE);
  const index = store.index('timestamp');

  return new Promise((resolve, reject) => {
    const request = index.getAll();
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Remove operation from sync queue
 */
export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await openSyncDB();
  const transaction = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = transaction.objectStore(SYNC_QUEUE_STORE);

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
 * Update operation retry count and error
 */
export async function updateSyncOperation(id: string, updates: Partial<SyncOperation>): Promise<void> {
  const db = await openSyncDB();
  const transaction = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = transaction.objectStore(SYNC_QUEUE_STORE);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const operation = getRequest.result;
      if (operation) {
        const updated = { ...operation, ...updates };
        store.put(updated);
      }
      
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
    };

    getRequest.onerror = () => {
      db.close();
      reject(getRequest.error);
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Get count of pending operations
 */
export async function getPendingCount(): Promise<number> {
  const db = await openSyncDB();
  const transaction = db.transaction(SYNC_QUEUE_STORE, 'readonly');
  const store = transaction.objectStore(SYNC_QUEUE_STORE);

  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Clear all pending operations
 */
export async function clearSyncQueue(): Promise<void> {
  const db = await openSyncDB();
  const transaction = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  const store = transaction.objectStore(SYNC_QUEUE_STORE);

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
