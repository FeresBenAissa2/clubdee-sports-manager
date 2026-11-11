/**
 * Property-Based Test for Logout Session Update
 * **Feature: auth-database-integration, Property 13: Logout updates session**
 * 
 * Property: For any active session, calling logout should update the logout_at timestamp for that session.
 * Validates: Requirements 6.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Track login sessions for verification
const loginSessions = new Map<string, Array<{
  id: string;
  user_id: string;
  device_id: string;
  device_info: any;
  user_agent?: string;
  login_at: string;
  logout_at: string | null;
}>>();

// Track test users
const testUsers = new Map<string, { id: string; email: string; password: string }>();

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(async () => {
      // Return the first test user as the current user
      const firstUser = Array.from(testUsers.values())[0];
      if (!firstUser) {
        return { data: { user: null }, error: { message: 'No user found' } };
      }
      return {
        data: {
          user: {
            id: firstUser.id,
            email: firstUser.email,
            created_at: new Date().toISOString(),
          },
        },
        error: null,
      };
    }),
    signOut: vi.fn(async () => {
      return { error: null };
    }),
  },
  from: vi.fn((table: string) => {
    if (table === 'login_sessions') {
      return {
        insert: vi.fn(async (data: any) => {
          const sessionId = `session-${Math.random().toString(36).substring(2, 11)}`;
          const session = {
            id: sessionId,
            user_id: data.user_id,
            device_id: data.device_id,
            device_info: data.device_info,
            user_agent: data.user_agent,
            login_at: data.login_at || new Date().toISOString(),
            logout_at: null,
          };

          if (!loginSessions.has(data.user_id)) {
            loginSessions.set(data.user_id, []);
          }
          loginSessions.get(data.user_id)!.push(session);

          return { data: session, error: null };
        }),
        select: vi.fn((columns: string) => ({
          eq: vi.fn((column: string, value: any) => ({
            eq: vi.fn((column2: string, value2: any) => ({
              is: vi.fn((column3: string, value3: any) => ({
                order: vi.fn((column4: string, options: any) => ({
                  limit: vi.fn((num: number) => ({
                    single: vi.fn(async () => {
                      // Find the most recent active session for this user and device
                      const sessions = loginSessions.get(value) || [];
                      const activeSession = sessions
                        .filter(s => s.device_id === value2 && s.logout_at === null)
                        .sort((a, b) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime())[0];
                      
                      if (!activeSession) {
                        return { data: null, error: { message: 'No active session found' } };
                      }
                      
                      return { data: activeSession, error: null };
                    }),
                  })),
                })),
              })),
            })),
          })),
        })),
        update: vi.fn((data: any) => ({
          eq: vi.fn((column: string, value: any) => {
            // Find and update the session
            for (const [userId, sessions] of loginSessions.entries()) {
              const session = sessions.find(s => s.id === value);
              if (session) {
                session.logout_at = data.logout_at;
                return Promise.resolve({ data: session, error: null });
              }
            }
            return Promise.resolve({ data: null, error: { message: 'Session not found' } });
          }),
        })),
      };
    }
    
    // Default mock for other tables
    return {
      insert: vi.fn(async () => ({ data: null, error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    };
  }),
};

// Mock the Supabase server module
vi.mock('@/lib/db/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

// Mock next/navigation to prevent redirect errors in tests
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT: ${url}`);
  }),
}));

// Import after mocking
const { signOut } = await import('@/lib/auth/actions');
const { recordLogoutSession } = await import('@/lib/auth/device-tracking');

describe('Property 13: Logout updates session', () => {
  beforeEach(() => {
    loginSessions.clear();
    testUsers.clear();
    vi.clearAllMocks();
    
    // Create a test user
    const testUserId = 'test-user-logout-123';
    testUsers.set('logout-test@example.com', {
      id: testUserId,
      email: 'logout-test@example.com',
      password: 'TestPass123!',
    });
  });

  /**
   * **Feature: auth-database-integration, Property 13: Logout updates session**
   * 
   * Property Test: For any active session, calling logout updates the logout_at timestamp
   * 
   * This test verifies that:
   * 1. An active session (logout_at = null) exists
   * 2. Calling logout with the device ID updates the logout_at timestamp
   * 3. The logout_at timestamp is set to a valid ISO date string
   * 4. The session is no longer considered active after logout
   */
  it('should update logout_at timestamp for any active session when logout is called', async () => {
    const testUser = testUsers.get('logout-test@example.com')!;
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random device IDs and user agents
        fc.string({ minLength: 10, maxLength: 20 }),
        fc.constantFrom('Mozilla/5.0', 'Chrome/90.0', 'Safari/14.0', 'Firefox/88.0'),
        fc.constantFrom('Windows', 'MacOS', 'Linux', 'iOS', 'Android'),
        async (deviceIdSuffix, userAgent, platform) => {
          // Create a unique device ID for this test iteration
          const deviceId = `logout-device-${deviceIdSuffix}`;
          
          // Create an active session (simulating a login)
          const deviceInfo = {
            deviceId,
            userAgent,
            platform,
            language: 'en-US',
            screenResolution: '1920x1080',
            timezone: 'UTC',
          };

          // Insert a session directly (simulating a previous login)
          await mockSupabase.from('login_sessions').insert({
            user_id: testUser.id,
            device_id: deviceId,
            device_info: deviceInfo,
            user_agent: userAgent,
            login_at: new Date().toISOString(),
          });

          // Verify session was created and is active
          const sessions = loginSessions.get(testUser.id) || [];
          const activeSession = sessions.find(s => s.device_id === deviceId && s.logout_at === null);
          expect(activeSession).toBeDefined();
          expect(activeSession!.logout_at).toBeNull();

          // Record the session ID before logout
          const sessionId = activeSession!.id;

          // Perform logout using recordLogoutSession (which is what signOut uses internally)
          const result = await recordLogoutSession(testUser.id, deviceId);

          // Property: Logout should succeed
          expect(result.success).toBe(true);

          // Property: The session should now have a logout_at timestamp
          const updatedSession = sessions.find(s => s.id === sessionId);
          expect(updatedSession).toBeDefined();
          expect(updatedSession!.logout_at).not.toBeNull();
          expect(updatedSession!.logout_at).toBeDefined();

          // Property: logout_at should be a valid ISO date string
          const logoutDate = new Date(updatedSession!.logout_at!);
          expect(logoutDate.toISOString()).toBe(updatedSession!.logout_at);

          // Property: logout_at should be after or equal to login_at
          const loginDate = new Date(updatedSession!.login_at);
          expect(logoutDate.getTime()).toBeGreaterThanOrEqual(loginDate.getTime());

          // Property: The session should no longer be considered active
          const stillActiveSessions = sessions.filter(s => s.device_id === deviceId && s.logout_at === null);
          expect(stillActiveSessions.length).toBe(0);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000); // 60 second timeout

  /**
   * Property Test: Logout only updates the most recent active session for a device
   * 
   * If multiple sessions exist for the same device, only the most recent active one should be updated
   */
  it('should only update the most recent active session for a device', async () => {
    const testUser = testUsers.get('logout-test@example.com')!;
    const deviceId = 'multi-session-device';
    
    // Create multiple sessions for the same device at different times
    const session1Time = new Date('2024-01-01T10:00:00Z').toISOString();
    const session2Time = new Date('2024-01-01T11:00:00Z').toISOString();
    const session3Time = new Date('2024-01-01T12:00:00Z').toISOString();

    await mockSupabase.from('login_sessions').insert({
      user_id: testUser.id,
      device_id: deviceId,
      device_info: { deviceId },
      user_agent: 'Test Browser',
      login_at: session1Time,
    });

    await mockSupabase.from('login_sessions').insert({
      user_id: testUser.id,
      device_id: deviceId,
      device_info: { deviceId },
      user_agent: 'Test Browser',
      login_at: session2Time,
    });

    await mockSupabase.from('login_sessions').insert({
      user_id: testUser.id,
      device_id: deviceId,
      device_info: { deviceId },
      user_agent: 'Test Browser',
      login_at: session3Time,
    });

    // Verify all sessions are active
    const sessions = loginSessions.get(testUser.id) || [];
    const activeSessions = sessions.filter(s => s.device_id === deviceId && s.logout_at === null);
    expect(activeSessions.length).toBe(3);

    // Perform logout
    const result = await recordLogoutSession(testUser.id, deviceId);
    expect(result.success).toBe(true);

    // Property: Only the most recent session (session3) should have logout_at set
    const updatedSessions = loginSessions.get(testUser.id) || [];
    const session1 = updatedSessions.find(s => s.login_at === session1Time);
    const session2 = updatedSessions.find(s => s.login_at === session2Time);
    const session3 = updatedSessions.find(s => s.login_at === session3Time);

    expect(session1!.logout_at).toBeNull(); // Older session still active
    expect(session2!.logout_at).toBeNull(); // Older session still active
    expect(session3!.logout_at).not.toBeNull(); // Most recent session logged out
  });

  /**
   * Property Test: Logout with non-existent device ID returns error
   * 
   * Attempting to logout with a device ID that has no active session should fail gracefully
   */
  it('should return error when no active session exists for device', async () => {
    const testUser = testUsers.get('logout-test@example.com')!;
    const nonExistentDeviceId = 'non-existent-device-123';

    // Attempt to logout with a device that has no active session
    const result = await recordLogoutSession(testUser.id, nonExistentDeviceId);

    // Property: Logout should fail when no active session exists
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('No active session found');
  });

  /**
   * Property Test: Logout does not affect sessions from other devices
   * 
   * Logging out from one device should not affect sessions from other devices
   */
  it('should not affect sessions from other devices', async () => {
    const testUser = testUsers.get('logout-test@example.com')!;
    const device1Id = 'device-1';
    const device2Id = 'device-2';
    const device3Id = 'device-3';

    // Create sessions for multiple devices
    await mockSupabase.from('login_sessions').insert({
      user_id: testUser.id,
      device_id: device1Id,
      device_info: { deviceId: device1Id },
      user_agent: 'Browser 1',
      login_at: new Date().toISOString(),
    });

    await mockSupabase.from('login_sessions').insert({
      user_id: testUser.id,
      device_id: device2Id,
      device_info: { deviceId: device2Id },
      user_agent: 'Browser 2',
      login_at: new Date().toISOString(),
    });

    await mockSupabase.from('login_sessions').insert({
      user_id: testUser.id,
      device_id: device3Id,
      device_info: { deviceId: device3Id },
      user_agent: 'Browser 3',
      login_at: new Date().toISOString(),
    });

    // Verify all sessions are active
    const sessions = loginSessions.get(testUser.id) || [];
    expect(sessions.filter(s => s.logout_at === null).length).toBe(3);

    // Logout from device2 only
    const result = await recordLogoutSession(testUser.id, device2Id);
    expect(result.success).toBe(true);

    // Property: Only device2's session should be logged out
    const updatedSessions = loginSessions.get(testUser.id) || [];
    const device1Session = updatedSessions.find(s => s.device_id === device1Id);
    const device2Session = updatedSessions.find(s => s.device_id === device2Id);
    const device3Session = updatedSessions.find(s => s.device_id === device3Id);

    expect(device1Session!.logout_at).toBeNull(); // Still active
    expect(device2Session!.logout_at).not.toBeNull(); // Logged out
    expect(device3Session!.logout_at).toBeNull(); // Still active
  });

  /**
   * Property Test: Multiple logouts on same session are idempotent
   * 
   * Calling logout multiple times should not change the logout_at timestamp after the first call
   */
  it('should be idempotent - multiple logouts do not change logout_at', async () => {
    const testUser = testUsers.get('logout-test@example.com')!;
    const deviceId = 'idempotent-device';

    // Create an active session
    await mockSupabase.from('login_sessions').insert({
      user_id: testUser.id,
      device_id: deviceId,
      device_info: { deviceId },
      user_agent: 'Test Browser',
      login_at: new Date().toISOString(),
    });

    // First logout
    const result1 = await recordLogoutSession(testUser.id, deviceId);
    expect(result1.success).toBe(true);

    const sessions = loginSessions.get(testUser.id) || [];
    const session = sessions.find(s => s.device_id === deviceId);
    const firstLogoutTime = session!.logout_at;
    expect(firstLogoutTime).not.toBeNull();

    // Wait a tiny bit to ensure timestamps would differ if updated
    await new Promise(resolve => setTimeout(resolve, 10));

    // Second logout attempt (should fail since no active session exists)
    const result2 = await recordLogoutSession(testUser.id, deviceId);
    
    // Property: Second logout should fail (no active session)
    expect(result2.success).toBe(false);

    // Property: logout_at timestamp should remain unchanged
    const updatedSession = sessions.find(s => s.device_id === deviceId);
    expect(updatedSession!.logout_at).toBe(firstLogoutTime);
  });

  /**
   * Integration test: signOut function also updates logout_at
   * 
   * The signOut function should also update the logout_at timestamp when device ID is provided
   */
  it('should update logout_at when using signOut function with device ID', async () => {
    const testUser = testUsers.get('logout-test@example.com')!;
    const deviceId = 'signout-device';

    // Create an active session
    await mockSupabase.from('login_sessions').insert({
      user_id: testUser.id,
      device_id: deviceId,
      device_info: { deviceId },
      user_agent: 'Test Browser',
      login_at: new Date().toISOString(),
    });

    // Verify session is active
    const sessions = loginSessions.get(testUser.id) || [];
    const activeSession = sessions.find(s => s.device_id === deviceId && s.logout_at === null);
    expect(activeSession).toBeDefined();

    // Call signOut with device ID (this will throw a redirect error, which is expected)
    try {
      await signOut(deviceId);
    } catch (error: any) {
      // Expect redirect to /login
      expect(error.message).toContain('REDIRECT: /login');
    }

    // Property: The session should have logout_at set
    const updatedSession = sessions.find(s => s.device_id === deviceId);
    expect(updatedSession!.logout_at).not.toBeNull();
    expect(updatedSession!.logout_at).toBeDefined();
  });
});
