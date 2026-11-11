/**
 * Sync Manager
 * Handles synchronization of offline changes with the server
 */

import {
  getPendingOperations,
  removeFromSyncQueue,
  updateSyncOperation,
  type SyncOperation,
} from './sync-queue';

const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

type SyncHandler = (operation: SyncOperation) => Promise<void>;

class SyncManager {
  private handlers: Map<string, SyncHandler> = new Map();
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  /**
   * Register a handler for a specific resource type
   */
  registerHandler(resource: string, handler: SyncHandler): void {
    this.handlers.set(resource, handler);
  }

  /**
   * Start automatic syncing
   */
  startAutoSync(): void {
    if (this.syncInterval) return;

    // Sync immediately
    this.sync();

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, SYNC_INTERVAL);

    // Sync when coming back online
    window.addEventListener('online', this.handleOnline);
  }

  /**
   * Stop automatic syncing
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    window.removeEventListener('online', this.handleOnline);
  }

  /**
   * Handle online event
   */
  private handleOnline = () => {
    this.sync();
  };

  /**
   * Sync all pending operations
   */
  async sync(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ status: 'syncing', progress: 0 });

    try {
      const operations = await getPendingOperations();
      
      if (operations.length === 0) {
        this.notifyListeners({ status: 'idle', progress: 100 });
        return;
      }

      let completed = 0;
      const total = operations.length;

      for (const operation of operations) {
        try {
          await this.syncOperation(operation);
          await removeFromSyncQueue(operation.id);
          completed++;
          this.notifyListeners({
            status: 'syncing',
            progress: Math.round((completed / total) * 100),
          });
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);
          
          // Update retry count
          const newRetryCount = operation.retryCount + 1;
          
          if (newRetryCount >= MAX_RETRY_COUNT) {
            // Max retries reached, remove from queue
            await removeFromSyncQueue(operation.id);
            this.notifyListeners({
              status: 'error',
              error: `Failed to sync ${operation.resource} after ${MAX_RETRY_COUNT} attempts`,
            });
          } else {
            // Update retry count and error
            await updateSyncOperation(operation.id, {
              retryCount: newRetryCount,
              lastError: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      this.notifyListeners({ status: 'success', progress: 100 });
    } catch (error) {
      console.error('Sync failed:', error);
      this.notifyListeners({
        status: 'error',
        error: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      this.isSyncing = false;
      
      // Reset to idle after a delay
      setTimeout(() => {
        this.notifyListeners({ status: 'idle', progress: 0 });
      }, 2000);
    }
  }

  /**
   * Sync a single operation
   */
  private async syncOperation(operation: SyncOperation): Promise<void> {
    const handler = this.handlers.get(operation.resource);
    
    if (!handler) {
      throw new Error(`No handler registered for resource: ${operation.resource}`);
    }

    await handler(operation);
  }

  /**
   * Add a listener for sync status changes
   */
  addListener(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: SyncStatus): void {
    this.listeners.forEach((listener) => listener(status));
  }
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'error';
  progress?: number;
  error?: string;
}

// Singleton instance
export const syncManager = new SyncManager();

// Register default handlers
syncManager.registerHandler('check-in', async (operation) => {
  const response = await fetch('/api/athlete/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(operation.data),
  });

  if (!response.ok) {
    throw new Error(`Check-in sync failed: ${response.statusText}`);
  }
});

syncManager.registerHandler('leave-request', async (operation) => {
  const response = await fetch('/api/athlete/leave-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(operation.data),
  });

  if (!response.ok) {
    throw new Error(`Leave request sync failed: ${response.statusText}`);
  }
});

syncManager.registerHandler('attendance', async (operation) => {
  const endpoint = operation.type === 'create' 
    ? '/api/coach/attendance'
    : `/api/coach/attendance/${operation.data.id}`;
  
  const method = operation.type === 'create' ? 'POST' : 'PUT';

  const response = await fetch(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(operation.data),
  });

  if (!response.ok) {
    throw new Error(`Attendance sync failed: ${response.statusText}`);
  }
});
