/**
 * Idempotency Middleware
 * 
 * Implements idempotency support for mutation endpoints to prevent duplicate operations.
 * Requirements: 20.6, 20.7
 * 
 * Usage:
 * - Client sends Idempotency-Key header with POST/PUT/DELETE requests
 * - Middleware checks if key exists in database
 * - If exists, returns cached response
 * - If not, executes operation and stores response
 */

import { createClient } from '@/lib/db/server';

export interface IdempotencyResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    cached: boolean;
    originalTimestamp?: string;
    timestamp: string;
    requestId: string;
  };
}

/**
 * Handle idempotent request
 * 
 * @param idempotencyKey - Unique key provided by client
 * @param userId - Authenticated user ID
 * @param endpoint - API endpoint being called
 * @param operation - Function to execute if key doesn't exist
 * @returns Result with cached or fresh response
 */
export async function handleIdempotentRequest<T>(
  idempotencyKey: string,
  userId: string,
  endpoint: string,
  operation: () => Promise<T>
): Promise<IdempotencyResult<T>> {
  const db = await createClient();
  const requestId = crypto.randomUUID();

  try {
    // Check if idempotency key already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    const { data: existing, error: fetchError } = await sb
      .from('idempotency_keys')
      .select('*')
      .eq('key', idempotencyKey)
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new keys
      throw fetchError;
    }

    // If key exists, return cached response
    if (existing) {
      return {
        success: existing.response_status >= 200 && existing.response_status < 300,
        data: existing.response_body as T,
        metadata: {
          cached: true,
          originalTimestamp: existing.created_at,
          timestamp: new Date().toISOString(),
          requestId
        }
      };
    }

    // Key doesn't exist, execute operation
    const result = await operation();

    // Store the result with idempotency key
    const { error: insertError } = await sb
      .from('idempotency_keys')
      .insert({
        key: idempotencyKey,
        user_id: userId,
        endpoint,
        response_body: result,
        response_status: 200
      });

    if (insertError) {
      // Check if this is a race condition (another request inserted the key)
      if (insertError.code === '23505') { // Unique constraint violation
        // Fetch the response that was just inserted by the other request
        const { data: raceResult } = await sb
          .from('idempotency_keys')
          .select('*')
          .eq('key', idempotencyKey)
          .eq('user_id', userId)
          .eq('endpoint', endpoint)
          .single();

        if (raceResult) {
          return {
            success: raceResult.response_status >= 200 && raceResult.response_status < 300,
            data: raceResult.response_body as T,
            metadata: {
              cached: true,
              originalTimestamp: raceResult.created_at,
              timestamp: new Date().toISOString(),
              requestId
            }
          };
        }
      }
      
      // If it's a different error, log it but still return the result
      console.error('Failed to store idempotency key:', insertError);
    }

    return {
      success: true,
      data: result,
      metadata: {
        cached: false,
        timestamp: new Date().toISOString(),
        requestId
      }
    };

  } catch (error) {
    console.error('Idempotency middleware error:', error);
    
    return {
      success: false,
      error: {
        code: 'IDEMPOTENCY_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      metadata: {
        cached: false,
        timestamp: new Date().toISOString(),
        requestId
      }
    };
  }
}

/**
 * Extract idempotency key from request headers
 * 
 * @param headers - Request headers
 * @returns Idempotency key or null if not present
 */
export function extractIdempotencyKey(headers: Headers): string | null {
  return headers.get('Idempotency-Key') || headers.get('idempotency-key');
}

/**
 * Validate idempotency key format
 * 
 * @param key - Idempotency key to validate
 * @returns True if valid, false otherwise
 */
export function isValidIdempotencyKey(key: string): boolean {
  // Key should be a UUID or similar unique identifier
  // Allow UUIDs, alphanumeric strings with underscores and hyphens
  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  
  // For alphanumeric, require at least one letter or underscore to distinguish from malformed UUIDs
  const alphanumericRegex = /^(?=.*[a-zA-Z_])[a-zA-Z0-9_-]{16,255}$/;
  
  return uuidRegex.test(key) || alphanumericRegex.test(key);
}

/**
 * Generate idempotency key (for client-side use)
 * 
 * @returns UUID v4 string
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Clean up old idempotency keys (older than 24 hours)
 * This should be called periodically via a cron job or scheduled task
 * 
 * @returns Number of keys deleted
 */
export async function cleanupOldIdempotencyKeys(): Promise<number> {
  const db = await createClient();
  
  const { data, error } = await db.rpc('cleanup_old_idempotency_keys');
  
  if (error) {
    console.error('Failed to cleanup old idempotency keys:', error);
    return 0;
  }
  
  return data || 0;
}
