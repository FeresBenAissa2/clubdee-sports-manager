'use client';

import { useEffect, useState } from 'react';
import {
  saveToOfflineStorage,
  getFromOfflineStorage,
  setLastCacheUpdate,
  isCacheStale,
  STORES,
} from '@/lib/utils/offline-storage';

type StoreName = (typeof STORES)[keyof typeof STORES];

interface UseOfflineDataOptions<T> {
  storeName: StoreName;
  fetchFn: () => Promise<T>;
  enabled?: boolean;
  maxAge?: number; // milliseconds
}

interface UseOfflineDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isOffline: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing offline data caching
 * Automatically caches data and serves from cache when offline
 */
export function useOfflineData<T>({
  storeName,
  fetchFn,
  enabled = true,
  maxAge = 24 * 60 * 60 * 1000, // 24 hours
}: UseOfflineDataOptions<T>): UseOfflineDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if online
      const online = navigator.onLine;
      setIsOffline(!online);

      if (online) {
        // Fetch fresh data from server
        const freshData = await fetchFn();
        setData(freshData);

        // Cache the data
        if (freshData && typeof freshData === 'object' && 'id' in freshData) {
          await saveToOfflineStorage(storeName, freshData as any);
          setLastCacheUpdate(storeName);
        } else if (Array.isArray(freshData)) {
          await saveToOfflineStorage(storeName, freshData as any);
          setLastCacheUpdate(storeName);
        }
      } else {
        // Load from cache when offline
        const cachedData = await getFromOfflineStorage<T>(storeName);
        if (cachedData) {
          setData(cachedData as any);
        } else {
          throw new Error('No cached data available');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));

      // Try to load from cache on error
      try {
        const cachedData = await getFromOfflineStorage<T>(storeName);
        if (cachedData) {
          setData(cachedData as any);
          setIsOffline(true);
        }
      } catch (cacheErr) {
        console.error('Failed to load from cache:', cacheErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOffline(false);
      fetchData();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, storeName]);

  return {
    data,
    isLoading,
    isOffline,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for caching user profile data
 */
export function useOfflineProfile(userId: string | undefined, fetchFn: () => Promise<any>) {
  return useOfflineData({
    storeName: STORES.USER_PROFILE,
    fetchFn,
    enabled: !!userId,
  });
}

/**
 * Hook for caching training sessions
 */
export function useOfflineTrainingSessions(fetchFn: () => Promise<any[]>) {
  return useOfflineData({
    storeName: STORES.TRAINING_SESSIONS,
    fetchFn,
    maxAge: 6 * 60 * 60 * 1000, // 6 hours
  });
}

/**
 * Hook for caching announcements
 */
export function useOfflineAnnouncements(fetchFn: () => Promise<any[]>) {
  return useOfflineData({
    storeName: STORES.ANNOUNCEMENTS,
    fetchFn,
    maxAge: 1 * 60 * 60 * 1000, // 1 hour
  });
}
