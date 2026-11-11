'use server';

import { createClient } from '@/lib/db/server';

export interface DeviceInfo {
  deviceId: string;
  userAgent?: string;
  platform?: string;
  language?: string;
  screenResolution?: string;
  timezone?: string;
}

/**
 * Record a login session with device information
 */
export async function recordLoginSession(
  userId: string,
  deviceInfo: DeviceInfo,
  ipAddress?: string
) {
  try {
    const db = await createClient();

    const { error } = await db.from('login_sessions').insert({
      user_id: userId,
      device_id: deviceInfo.deviceId,
      device_info: deviceInfo as any,
      user_agent: deviceInfo.userAgent,
      login_at: new Date().toISOString(),
    } as any);

    if (error) {
      console.error('[recordLoginSession] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[recordLoginSession] Unexpected error:', error);
    return { success: false, error: 'Failed to record login session' };
  }
}

/**
 * Update logout time for a session
 * Requirement 6.2: Update logout timestamp for current session
 */
export async function recordLogoutSession(userId: string, deviceId: string) {
  try {
    const db = await createClient();

    // Find the most recent active session for this user and device
    const { data: session } = await db
      .from('login_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .is('logout_at', null)
      .order('login_at', { ascending: false })
      .limit(1)
      .single();

    if (!session) {
      return { success: false, error: 'No active session found' };
    }

    const updateData: any = { logout_at: new Date().toISOString() };
    const { error } = await (db.from('login_sessions') as any)
      .update(updateData)
      .eq('id', (session as any).id);

    if (error) {
      console.error('[recordLogoutSession] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[recordLogoutSession] Unexpected error:', error);
    return { success: false, error: 'Failed to record logout' };
  }
}

/**
 * Get device statistics for a user
 */
export async function getDeviceStatistics(userId?: string) {
  try {
    const db = await createClient();

    // Type assertion needed until TypeScript picks up the new database types
    const { data, error } = await (db.rpc as any)('get_device_statistics', {
      p_user_id: userId || null,
    });

    if (error) {
      console.error('[getDeviceStatistics] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[getDeviceStatistics] Unexpected error:', error);
    return { success: false, error: 'Failed to get device statistics' };
  }
}

/**
 * Get recent login sessions for a user
 * Requirement 6.3: Display all login sessions with device information
 */
export async function getRecentLoginSessions(userId: string, limit = 10) {
  try {
    const db = await createClient();

    const { data, error } = await db
      .from('login_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('login_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getRecentLoginSessions] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[getRecentLoginSessions] Unexpected error:', error);
    return { success: false, error: 'Failed to get login sessions' };
  }
}

/**
 * Get all active sessions for a user (sessions without logout_at)
 * Requirement 6.4: Track each device separately
 */
export async function getActiveSessionsForUser(userId: string) {
  try {
    const db = await createClient();

    const { data, error } = await db
      .from('login_sessions')
      .select('*')
      .eq('user_id', userId)
      .is('logout_at', null)
      .order('login_at', { ascending: false });

    if (error) {
      console.error('[getActiveSessionsForUser] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[getActiveSessionsForUser] Unexpected error:', error);
    return { success: false, error: 'Failed to get active sessions' };
  }
}

/**
 * Get session count by device for a user
 * Requirement 6.4: Multi-device tracking
 */
export async function getDeviceSessionCount(userId: string) {
  try {
    const db = await createClient();

    const { data, error } = await db
      .from('login_sessions')
      .select('device_id, device_info')
      .eq('user_id', userId);

    if (error) {
      console.error('[getDeviceSessionCount] Error:', error);
      return { success: false, error: error.message };
    }

    // Count sessions per device
    const deviceCounts = data.reduce((acc: Record<string, number>, session: any) => {
      acc[session.device_id] = (acc[session.device_id] || 0) + 1;
      return acc;
    }, {});

    return { success: true, data: deviceCounts };
  } catch (error) {
    console.error('[getDeviceSessionCount] Unexpected error:', error);
    return { success: false, error: 'Failed to get device session count' };
  }
}
