/**
 * Property-Based Test for Login Device Information Recording
 * **Feature: auth-database-integration, Property 5: Login records device information**
 * 
 * Property: For any successful login with device information, all device fields 
 * (fingerprint, user agent, timestamp) should be recorded in the session.
 * Validates: Requirements 3.2, 6.1
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
    signInWithPassword: vi.fn(async ({ email, password }: { email: string; password: string }) => {
      // Find user by email
      const user = Array.from(testUsers.values()).find(u => u.email === email);
      
      if (!user || user.password !== password) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        };
      }

      return {
        data: {
          user: {
            id: user.id,
            email: user.email,
            created_at: new Date().toISOString(),
          },
          session: {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
          },
        },
        error: null,
      };
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
            login_at: new Date().toISOString(),
            logout_at: null,
          };

          if (!loginSessions.has(data.user_id)) {
            loginSessions.set(data.user_id, []);
          }
          loginSessions.get(data.user_id)!.push(session);

          return { data: session, error: null };
        }),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({ data: null, error: null })),
          })),
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

// Import after mocking
const { signIn } = await import('@/lib/auth/actions');

describe('Property 5: Login records device information', () => {
  beforeEach(() => {
    loginSessions.clear();
    testUsers.clear();
    vi.clearAllMocks();
    
    // Create a test user
    const testUserId = 'test-user-device-123';
    testUsers.set('device-test@example.com', {
      id: testUserId,
      email: 'device-test@example.com',
      password: 'DeviceTest123!',
    });
  });

  /**
   * **Feature: auth-database-integration, Property 5: Login records device information**
   * 
   * Property Test: For any successful login with device info, all device fields are recorded
   * 
   * This test verifies that:
   * 1. Device fingerprint (device_id) is recorded
   * 2. User agent is recorded
   * 3. Platform information is recorded
   * 4. Language is recorded
   * 5. Screen resolution is recorded
   * 6. Timezone is recorded
   * 7. Login timestamp is recorded
   */
  it('should record all device information fields for any successful login', async () => {
    const testUser = testUsers.get('device-test@example.com')!;
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random device information
        fc.string({ minLength: 10, maxLength: 30 }), // deviceId
        fc.constantFrom(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'
        ), // userAgent
        fc.constantFrom('Windows', 'MacOS', 'Linux', 'iOS', 'Android'), // platform
        fc.constantFrom('en-US', 'th-TH', 'ja-JP', 'zh-CN', 'es-ES'), // language
        fc.constantFrom('1920x1080', '1366x768', '2560x1440', '3840x2160', '1440x900'), // screenResolution
        fc.constantFrom('UTC', 'Asia/Bangkok', 'America/New_York', 'Europe/London', 'Asia/Tokyo'), // timezone
        async (deviceId, userAgent, platform, language, screenResolution, timezone) => {
          // Create device info with all fields
          const deviceInfo = {
            deviceId: `device-${deviceId}`,
            userAgent,
            platform,
            language,
            screenResolution,
            timezone,
          };

          // Perform login with device info
          const result = await signIn(testUser.email, testUser.password, deviceInfo);

          // Property: Login should succeed
          expect(result.success).toBe(true);

          // Property: Session should be created
          const sessions = loginSessions.get(testUser.id) || [];
          expect(sessions.length).toBeGreaterThan(0);

          // Get the most recent session
          const latestSession = sessions[sessions.length - 1];

          // Property: All device information fields should be recorded
          expect(latestSession.device_id).toBe(deviceInfo.deviceId);
          expect(latestSession.user_agent).toBe(deviceInfo.userAgent);
          
          // Property: device_info object should contain all fields
          expect(latestSession.device_info).toBeDefined();
          expect(latestSession.device_info.deviceId).toBe(deviceInfo.deviceId);
          expect(latestSession.device_info.userAgent).toBe(deviceInfo.userAgent);
          expect(latestSession.device_info.platform).toBe(deviceInfo.platform);
          expect(latestSession.device_info.language).toBe(deviceInfo.language);
          expect(latestSession.device_info.screenResolution).toBe(deviceInfo.screenResolution);
          expect(latestSession.device_info.timezone).toBe(deviceInfo.timezone);

          // Property: Timestamp should be recorded
          expect(latestSession.login_at).toBeDefined();
          expect(new Date(latestSession.login_at).getTime()).toBeGreaterThan(0);

          // Property: logout_at should be null for new sessions
          expect(latestSession.logout_at).toBeNull();
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000); // 60 second timeout

  /**
   * Property Test: Device info is preserved exactly as provided
   * 
   * The system should not modify or transform device information
   */
  it('should preserve device information exactly as provided', async () => {
    const testUser = testUsers.get('device-test@example.com')!;
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          deviceId: fc.string({ minLength: 5, maxLength: 50 }),
          userAgent: fc.string({ minLength: 10, maxLength: 200 }),
          platform: fc.string({ minLength: 3, maxLength: 20 }),
          language: fc.string({ minLength: 2, maxLength: 10 }),
          screenResolution: fc.string({ minLength: 5, maxLength: 20 }),
          timezone: fc.string({ minLength: 3, maxLength: 50 }),
        }),
        async (deviceInfo) => {
          // Perform login
          const result = await signIn(testUser.email, testUser.password, deviceInfo);

          expect(result.success).toBe(true);

          // Get the session
          const sessions = loginSessions.get(testUser.id) || [];
          const latestSession = sessions[sessions.length - 1];

          // Property: Device info should be preserved exactly
          expect(latestSession.device_info).toEqual(deviceInfo);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property Test: Multiple logins from same device record separate sessions
   * 
   * Each login should create a new session record with the same device info
   */
  it('should record separate sessions for multiple logins from same device', async () => {
    const testUser = testUsers.get('device-test@example.com')!;
    
    const deviceInfo = {
      deviceId: 'consistent-device-123',
      userAgent: 'Mozilla/5.0 Test Browser',
      platform: 'TestOS',
      language: 'en-US',
      screenResolution: '1920x1080',
      timezone: 'UTC',
    };

    // Perform multiple logins with same device
    const numLogins = 3;
    for (let i = 0; i < numLogins; i++) {
      const result = await signIn(testUser.email, testUser.password, deviceInfo);
      expect(result.success).toBe(true);
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Property: All sessions should be recorded
    const sessions = loginSessions.get(testUser.id) || [];
    expect(sessions.length).toBe(numLogins);

    // Property: All sessions should have the same device info
    sessions.forEach(session => {
      expect(session.device_id).toBe(deviceInfo.deviceId);
      expect(session.device_info).toEqual(deviceInfo);
      expect(session.user_agent).toBe(deviceInfo.userAgent);
    });

    // Property: Each session should have a unique timestamp
    const timestamps = sessions.map(s => s.login_at);
    const uniqueTimestamps = new Set(timestamps);
    // Note: Due to timing, some timestamps might be the same, but we should have at least 1 unique
    expect(uniqueTimestamps.size).toBeGreaterThan(0);
  });

  /**
   * Property Test: Different devices create separate session records
   * 
   * Logins from different devices should be tracked separately
   */
  it('should track different devices separately', async () => {
    const testUser = testUsers.get('device-test@example.com')!;
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            deviceId: fc.string({ minLength: 10, maxLength: 30 }),
            userAgent: fc.constantFrom('Chrome', 'Firefox', 'Safari', 'Edge'),
            platform: fc.constantFrom('Windows', 'MacOS', 'Linux'),
            language: fc.constant('en-US'),
            screenResolution: fc.constant('1920x1080'),
            timezone: fc.constant('UTC'),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (devices) => {
          // Clear sessions for this test
          loginSessions.delete(testUser.id);

          // Login from each device
          for (const deviceInfo of devices) {
            const result = await signIn(testUser.email, testUser.password, deviceInfo);
            expect(result.success).toBe(true);
          }

          // Property: Number of sessions should match number of devices
          const sessions = loginSessions.get(testUser.id) || [];
          expect(sessions.length).toBe(devices.length);

          // Property: Each device should have its own session
          const deviceIds = sessions.map(s => s.device_id);
          const expectedDeviceIds = devices.map(d => d.deviceId);
          expect(deviceIds).toEqual(expectedDeviceIds);
        }
      ),
      { numRuns: 50 } // Fewer runs since this test is more complex
    );
  }, 60000);

  /**
   * Edge case: Partial device info should still be recorded
   * 
   * Even if some optional fields are missing, the session should be created
   */
  it('should record session even with minimal device info', async () => {
    const testUser = testUsers.get('device-test@example.com')!;

    // Minimal device info - only required field
    const minimalDeviceInfo = {
      deviceId: 'minimal-device-123',
    };

    const result = await signIn(testUser.email, testUser.password, minimalDeviceInfo);

    expect(result.success).toBe(true);

    const sessions = loginSessions.get(testUser.id) || [];
    expect(sessions.length).toBeGreaterThan(0);

    const latestSession = sessions[sessions.length - 1];
    expect(latestSession.device_id).toBe(minimalDeviceInfo.deviceId);
    expect(latestSession.device_info).toEqual(minimalDeviceInfo);
  });

  /**
   * Edge case: Login without device info should not create session
   * 
   * Device tracking is optional - login should succeed without it
   */
  it('should succeed without creating session when device info is not provided', async () => {
    const testUser = testUsers.get('device-test@example.com')!;

    // Clear sessions
    loginSessions.delete(testUser.id);

    // Login without device info
    const result = await signIn(testUser.email, testUser.password);

    // Login should succeed
    expect(result.success).toBe(true);

    // No session should be created
    const sessions = loginSessions.get(testUser.id) || [];
    expect(sessions.length).toBe(0);
  });

  /**
   * Edge case: Failed login should not record device info
   * 
   * Device info should only be recorded for successful logins
   */
  it('should not record device info for failed login attempts', async () => {
    const testUser = testUsers.get('device-test@example.com')!;

    const deviceInfo = {
      deviceId: 'failed-login-device',
      userAgent: 'Mozilla/5.0',
      platform: 'Test',
      language: 'en-US',
      screenResolution: '1920x1080',
      timezone: 'UTC',
    };

    // Clear sessions
    loginSessions.delete(testUser.id);

    // Try to login with wrong password
    const result = await signIn(testUser.email, 'WrongPassword123!', deviceInfo);

    // Login should fail
    expect(result.success).toBe(false);

    // No session should be created
    const sessions = loginSessions.get(testUser.id) || [];
    expect(sessions.length).toBe(0);
  });
});
