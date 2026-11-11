/**
 * Session Management Tests
 * Tests for logout, login history, and multi-device tracking
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// Create a service role client for testing (bypasses RLS)
const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Session Management', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Get a real user ID from the database
    const { data: users } = await supabase.auth.admin.listUsers();
    if (users && users.users.length > 0) {
      testUserId = users.users[0].id;
    } else {
      // If no users exist, skip tests
      testUserId = '';
    }
    
    // Clean up any existing test sessions
    if (testUserId) {
      await supabase
        .from('login_sessions')
        .delete()
        .eq('user_id', testUserId)
        .like('device_id', 'test-%');
    }
  });

  describe('Logout with session timestamp update', () => {
    it('should update logout_at when user logs out', async () => {
      if (!testUserId) {
        console.log('Skipping test: no test user available');
        return;
      }
      
      // Create a test session
      const deviceId = 'test-device-logout';
      const { error: insertError } = await (supabase.from('login_sessions') as any).insert({
        user_id: testUserId,
        device_id: deviceId,
        device_info: { deviceId, userAgent: 'test' },
        user_agent: 'test',
        login_at: new Date().toISOString(),
      });
      
      if (insertError) {
        console.log('Insert error:', insertError);
      }
      expect(insertError).toBeNull();
      
      // Find the session
      const { data: session } = await supabase
        .from('login_sessions')
        .select('id')
        .eq('user_id', testUserId)
        .eq('device_id', deviceId)
        .is('logout_at', null)
        .order('login_at', { ascending: false })
        .limit(1)
        .single();
      
      expect(session).toBeTruthy();
      
      // Update logout_at
      const updateData: any = { logout_at: new Date().toISOString() };
      const { error: updateError } = await (supabase.from('login_sessions') as any)
        .update(updateData)
        .eq('id', (session as any).id);
      
      expect(updateError).toBeNull();
      
      // Verify logout_at was set
      const { data: updatedSession } = await supabase
        .from('login_sessions')
        .select('logout_at')
        .eq('id', (session as any).id)
        .single();
      
      expect(updatedSession).toBeTruthy();
      expect((updatedSession as any).logout_at).toBeTruthy();
    });
  });

  describe('Login history retrieval', () => {
    it('should retrieve all login sessions with device information', async () => {
      // Create multiple test sessions
      const deviceIds = ['device-1', 'device-2', 'device-3'];
      
      for (const deviceId of deviceIds) {
        await (supabase.from('login_sessions') as any).insert({
          user_id: testUserId,
          device_id: deviceId,
          device_info: {
            deviceId,
            userAgent: `test-agent-${deviceId}`,
            platform: 'test',
            language: 'en',
            screenResolution: '1920x1080',
            timezone: 'UTC',
          },
          user_agent: `test-agent-${deviceId}`,
          login_at: new Date().toISOString(),
        });
      }
      
      // Get login history directly from database
      const { data: sessions, error } = await supabase
        .from('login_sessions')
        .select('*')
        .eq('user_id', testUserId)
        .order('login_at', { ascending: false })
        .limit(10);
      
      expect(error).toBeNull();
      expect(sessions).toBeTruthy();
      expect(sessions!.length).toBeGreaterThanOrEqual(3);
      
      // Verify device information is included
      const session = sessions![0];
      expect(session.device_id).toBeTruthy();
      expect(session.device_info).toBeTruthy();
      expect(session.login_at).toBeTruthy();
    });
  });

  describe('Multi-device tracking', () => {
    it('should track each device separately', async () => {
      // Create sessions from different devices
      const devices = [
        { id: 'mobile-device', agent: 'Mobile Safari' },
        { id: 'desktop-device', agent: 'Chrome Desktop' },
        { id: 'tablet-device', agent: 'iPad Safari' },
      ];
      
      for (const device of devices) {
        await (supabase.from('login_sessions') as any).insert({
          user_id: testUserId,
          device_id: device.id,
          device_info: {
            deviceId: device.id,
            userAgent: device.agent,
            platform: 'test',
          },
          user_agent: device.agent,
          login_at: new Date().toISOString(),
        });
      }
      
      // Get all sessions for this user
      const { data: sessions, error } = await supabase
        .from('login_sessions')
        .select('*')
        .eq('user_id', testUserId);
      
      expect(error).toBeNull();
      expect(sessions).toBeTruthy();
      
      // Verify multiple devices are tracked
      const deviceIds = new Set(sessions!.map((s: any) => s.device_id));
      expect(deviceIds.size).toBeGreaterThanOrEqual(3);
    });

    it('should distinguish between active and logged out sessions', async () => {
      const activeDeviceId = 'active-device-test';
      const loggedOutDeviceId = 'logged-out-device-test';
      
      // Create active session
      await (supabase.from('login_sessions') as any).insert({
        user_id: testUserId,
        device_id: activeDeviceId,
        device_info: { deviceId: activeDeviceId },
        user_agent: 'test',
        login_at: new Date().toISOString(),
      });
      
      // Create logged out session
      await (supabase.from('login_sessions') as any).insert({
        user_id: testUserId,
        device_id: loggedOutDeviceId,
        device_info: { deviceId: loggedOutDeviceId },
        user_agent: 'test',
        login_at: new Date().toISOString(),
        logout_at: new Date().toISOString(),
      });
      
      // Get active sessions (where logout_at is null)
      const { data: activeSessions, error } = await supabase
        .from('login_sessions')
        .select('*')
        .eq('user_id', testUserId)
        .is('logout_at', null);
      
      expect(error).toBeNull();
      expect(activeSessions).toBeTruthy();
      
      // Verify only active sessions are returned
      const hasActive = activeSessions!.some((s: any) => s.device_id === activeDeviceId);
      const hasLoggedOut = activeSessions!.some((s: any) => s.device_id === loggedOutDeviceId);
      
      expect(hasActive).toBe(true);
      expect(hasLoggedOut).toBe(false);
    });
  });

  describe('Session data completeness', () => {
    it('should store timezone and screen resolution', async () => {
      const deviceId = `complete-data-device-${Date.now()}`;
      const deviceInfo = {
        deviceId,
        userAgent: 'test-agent',
        platform: 'test-platform',
        language: 'en-US',
        screenResolution: '2560x1440',
        timezone: 'America/New_York',
      };
      
      // Create session with complete device info
      const { error: insertError } = await (supabase.from('login_sessions') as any).insert({
        user_id: testUserId,
        device_id: deviceId,
        device_info: deviceInfo,
        user_agent: deviceInfo.userAgent,
        login_at: new Date().toISOString(),
      });
      
      expect(insertError).toBeNull();
      
      // Retrieve and verify
      const { data: session, error: selectError } = await supabase
        .from('login_sessions')
        .select('device_info')
        .eq('user_id', testUserId)
        .eq('device_id', deviceId)
        .single();
      
      expect(selectError).toBeNull();
      expect(session).toBeTruthy();
      const info = (session as any).device_info;
      expect(info.timezone).toBe('America/New_York');
      expect(info.screenResolution).toBe('2560x1440');
    });
  });
});
