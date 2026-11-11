'use server';

/**
 * Admin Settings Actions
 * 
 * Server actions for managing system-wide settings
 */

import { createClient } from '@/lib/db/server';

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

/**
 * Get all system settings
 */
export async function getSystemSettings(): Promise<{
  success: boolean;
  data?: SystemSetting[];
  error?: string;
}> {
  try {
    const db = await createClient();

    // Verify admin permission
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if user is admin
    const { data: roleData } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return { success: false, error: 'Admin access only' };
    }

    // Get all settings
    const { data, error } = await db
      .from('system_settings')
      .select('*')
      .order('setting_key');

    if (error) {
      console.error('Error fetching settings:', error);
      return { success: false, error: 'Cannot load settings' };
    }

    return { success: true, data: data as SystemSetting[] };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update a system setting
 */
export async function updateSystemSetting(
  settingKey: string,
  value: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await createClient();

    // Verify admin permission
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if user is admin
    const { data: roleData } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return { success: false, error: 'Admin access only' };
    }

    // Update setting using the helper function
    const { error } = await (db as any).rpc('update_system_setting', {
      p_key: settingKey,
      p_value: value,
      p_updated_by: user.id,
    });

    if (error) {
      console.error('Error updating setting:', error);
      return { success: false, error: 'Cannot update settings' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get a specific setting value
 */
export async function getSystemSetting(
  settingKey: string
): Promise<{ success: boolean; value?: any; error?: string }> {
  try {
    const db = await createClient();

    // Get setting using the helper function
    const { data, error } = await (db as any).rpc('get_system_setting', {
      p_key: settingKey,
    });

    if (error) {
      console.error('Error getting setting:', error);
      return { success: false, error: 'Cannot load settings' };
    }

    return { success: true, value: data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
