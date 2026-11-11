'use client';

import { useEffect, useState } from 'react';
import { syncManager, type SyncStatus } from '@/lib/utils/sync-manager';
import { getPendingCount } from '@/lib/utils/sync-queue';

/**
 * Hook for managing sync status
 */
export function useSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle', progress: 0 });
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Start auto sync
    syncManager.startAutoSync();

    // Listen for sync status changes
    const unsubscribe = syncManager.addListener(setSyncStatus);

    // Update pending count periodically
    const updateCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    updateCount();
    const countInterval = setInterval(updateCount, 5000);

    return () => {
      syncManager.stopAutoSync();
      unsubscribe();
      clearInterval(countInterval);
    };
  }, []);

  const manualSync = async () => {
    await syncManager.sync();
    const count = await getPendingCount();
    setPendingCount(count);
  };

  return {
    syncStatus,
    pendingCount,
    manualSync,
  };
}
