/**
 * Offline-aware API utilities
 * Automatically queues requests when offline
 */

import { addToSyncQueue } from './sync-queue';

interface OfflineApiOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  resource: string; // Resource type for sync queue
  queueWhenOffline?: boolean;
}

/**
 * Make an API call that automatically queues when offline
 */
export async function offlineAwareApi<T>(
  url: string,
  options: OfflineApiOptions
): Promise<T> {
  const { method, body, headers = {}, resource, queueWhenOffline = true } = options;

  // Check if online
  if (!navigator.onLine && queueWhenOffline && method !== 'GET') {
    // Queue the operation for later sync
    const operationType = method === 'POST' ? 'create' : method === 'PUT' ? 'update' : 'delete';
    
    await addToSyncQueue({
      type: operationType,
      resource,
      data: body,
    });

    // Return a placeholder response
    return {
      success: true,
      queued: true,
      message: 'Operation queued for sync when online',
    } as T;
  }

  // Make the actual API call
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Offline-aware POST request
 */
export async function offlinePost<T>(
  url: string,
  data: any,
  resource: string
): Promise<T> {
  return offlineAwareApi<T>(url, {
    method: 'POST',
    body: data,
    resource,
  });
}

/**
 * Offline-aware PUT request
 */
export async function offlinePut<T>(
  url: string,
  data: any,
  resource: string
): Promise<T> {
  return offlineAwareApi<T>(url, {
    method: 'PUT',
    body: data,
    resource,
  });
}

/**
 * Offline-aware DELETE request
 */
export async function offlineDelete<T>(
  url: string,
  resource: string
): Promise<T> {
  return offlineAwareApi<T>(url, {
    method: 'DELETE',
    resource,
  });
}
