/**
 * Feature Flag Service
 * 
 * Provides feature flag management with:
 * - User-based percentage rollout
 * - Caching for performance
 * - Kill-switch capability
 * 
 * Requirements: 20.8, 20.9
 */

import { createClient } from '@/lib/db/server';
import { cache, invalidatePattern } from './cache';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rollout_percentage: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hash a user ID to a consistent number between 0-99
 * This ensures the same user always gets the same bucket
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Get feature flag configuration from database with caching
 */
async function getFeatureFlag(flagName: string): Promise<FeatureFlag | null> {
  const cacheKey = `feature_flag:${flagName}`;
  
  // Try to get from cache first (5 minute TTL)
  const cached = cache.get<FeatureFlag>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch from database
  const db = await createClient();
  const { data, error } = await db
    .from('feature_flags')
    .select('*')
    .eq('name', flagName)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  // Cache the result
  cache.set(cacheKey, data, 300); // 5 minutes
  
  return data;
}

/**
 * Check if a feature is enabled for a specific user
 * 
 * @param flagName - Feature flag name (e.g., 'attendance_qr_checkin_v1')
 * @param userId - User ID for percentage-based rollout
 * @returns true if feature is enabled for this user
 * 
 * @example
 * ```typescript
 * if (await isFeatureEnabled('attendance_qr_checkin_v1', userId)) {
 *   // Show QR code check-in feature
 * } else {
 *   // Show manual check-in only
 * }
 * ```
 */
export async function isFeatureEnabled(
  flagName: string,
  userId: string
): Promise<boolean> {
  // Get flag configuration
  const flag = await getFeatureFlag(flagName);
  
  // If flag doesn't exist or is disabled, return false
  if (!flag || !flag.enabled) {
    return false;
  }
  
  // If rollout is 100%, feature is enabled for everyone
  if (flag.rollout_percentage >= 100) {
    return true;
  }
  
  // If rollout is 0%, feature is disabled for everyone
  if (flag.rollout_percentage <= 0) {
    return false;
  }
  
  // Check if user falls within rollout percentage
  const userBucket = hashUserId(userId);
  return userBucket < flag.rollout_percentage;
}

/**
 * Check if a feature is enabled (without user-specific rollout)
 * Use this for features that don't need gradual rollout
 * 
 * @param flagName - Feature flag name
 * @returns true if feature is enabled globally
 */
export async function isFeatureEnabledGlobal(flagName: string): Promise<boolean> {
  const flag = await getFeatureFlag(flagName);
  return flag?.enabled && flag.rollout_percentage >= 100 || false;
}

/**
 * Get all feature flags (admin use)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const db = await createClient();
  const { data, error } = await db
    .from('feature_flags')
    .select('*')
    .order('name');
  
  if (error || !data) {
    return [];
  }
  
  return data;
}

/**
 * Update a feature flag (admin use)
 */
export async function updateFeatureFlag(
  flagName: string,
  updates: Partial<Pick<FeatureFlag, 'enabled' | 'rollout_percentage' | 'description'>>
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient();
  
  // Validate rollout percentage
  if (updates.rollout_percentage !== undefined) {
    if (updates.rollout_percentage < 0 || updates.rollout_percentage > 100) {
      return {
        success: false,
        error: 'Rollout percentage must be between 0 and 100'
      };
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('feature_flags')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('name', flagName);
  
  if (error) {
    return {
      success: false,
      error: error.message
    };
  }
  
  // Invalidate cache
  cache.delete(`feature_flag:${flagName}`);
  
  return { success: true };
}

/**
 * Create a new feature flag (admin use)
 */
export async function createFeatureFlag(
  flag: Omit<FeatureFlag, 'created_at' | 'updated_at'>
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient();
  
  // Validate rollout percentage
  if (flag.rollout_percentage < 0 || flag.rollout_percentage > 100) {
    return {
      success: false,
      error: 'Rollout percentage must be between 0 and 100'
    };
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('feature_flags')
    .insert(flag);
  
  if (error) {
    return {
      success: false,
      error: error.message
    };
  }
  
  return { success: true };
}

/**
 * Delete a feature flag (admin use)
 */
export async function deleteFeatureFlag(
  flagName: string
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('feature_flags')
    .delete()
    .eq('name', flagName);
  
  if (error) {
    return {
      success: false,
      error: error.message
    };
  }
  
  // Invalidate cache
  cache.delete(`feature_flag:${flagName}`);
  
  return { success: true };
}

/**
 * Clear all feature flag cache (admin use)
 */
export function clearFeatureFlagCache(): void {
  // Clear all cache entries starting with 'feature_flag:'
  invalidatePattern('^feature_flag:');
}
