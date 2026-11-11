/**
 * Property-Based Test for Login Session Creation
 * **Feature: auth-database-integration, Property 4: Login creates session**
 * 
 * Property: For any valid credentials, successful login should create a session record in the database.
 * Validates: Requirements 3.1
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

describe('Property 4: Login creates session', () => {
  beforeEach(() => {
    loginSessions.clear();
    testUsers.clear();
    vi.clearAllMocks();
    
    // Create a test user
    const testUserId = 'test-user-123';
    testUsers.set('test@example.com', {
      id: testUserId,
      email: 'test@example.com',
      password: 'TestPass123!',
    });
  });

  /**
   * **Feature: auth-database-integration, Property 4: Login creates session**
   * 
   * Property Test: For any valid credentials with device info, successful login creates a session record
   * 
   * This test verifies that:
   * 1. Login with valid credentials succeeds
   * 2. A session record is created in the login_sessions table
   * 3. The session record contains the correct user_id and device_id
   */
  it('should create a session record for any successful login with device info', async () => {
    const testUser = testUsers.get('test@example.com')!;
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random device IDs to simulate different login attempts
        fc.string({ minLength: 10, maxLength: 20 }),
        fc.constantFrom('Mozilla/5.0', 'Chrome/90.0', 'Safari/14.0', 'Firefox/88.0'),
        fc.constantFrom('Windows', 'MacOS', 'Linux', 'iOS', 'Android'),
        async (deviceIdSuffix, userAgent, platform) => {
          // Create unique device info for this login attempt
          const deviceInfo = {
            deviceId: `test-device-${deviceIdSuffix}`,
            userAgent,
            platform,
            language: 'en-US',
            screenResolution: '1920x1080',
            timezone: 'UTC',
          };

          // Count sessions before login
          const beforeCount = loginSessions.get(testUser.id)?.length || 0;

          // Perform login
          const result = await signIn(testUser.email, testUser.password, deviceInfo);

          // Property: Login with valid credentials should succeed
          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();

          // Property: A new session should be created
          const afterCount = loginSessions.get(testUser.id)?.length || 0;
          expect(afterCount).toBe(beforeCount + 1);

          // Property: The session record should have correct data
          const sessions = loginSessions.get(testUser.id) || [];
          const latestSession = sessions[sessions.length - 1];
          
          expect(latestSession).toBeDefined();
          expect(latestSession.user_id).toBe(testUser.id);
          expect(latestSession.device_id).toBe(deviceInfo.deviceId);
          expect(latestSession.device_info).toEqual(deviceInfo);
          expect(latestSession.user_agent).toBe(deviceInfo.userAgent);
          expect(latestSession.login_at).toBeDefined();
          expect(latestSession.logout_at).toBeNull();
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000); // 60 second timeout

  /**
   * Property Test: Multiple logins create separate session records
   * 
   * Each login should create a new session record, even from the same device
   */
  it('should create separate session records for multiple logins', async () => {
    const testUser = testUsers.get('test@example.com')!;
    
    const deviceInfo = {
      deviceId: 'test-device-same',
      userAgent: 'Mozilla/5.0 Test Browser',
      platform: 'Test Platform',
      language: 'en-US',
      screenResolution: '1920x1080',
      timezone: 'UTC',
    };

    // Perform multiple logins
    const numLogins = 3;
    for (let i = 0; i < numLogins; i++) {
      const result = await signIn(testUser.email, testUser.password, deviceInfo);
      expect(result.success).toBe(true);
    }

    // Verify all sessions were created
    const sessions = loginSessions.get(testUser.id) || [];
    expect(sessions.length).toBe(numLogins);
    
    // All sessions should have the same device_id but different timestamps
    const deviceIds = sessions.map(s => s.device_id);
    expect(deviceIds.every(id => id === deviceInfo.deviceId)).toBe(true);
  });

  /**
   * Property Test: Login without device info still succeeds
   * 
   * Device info is optional - login should succeed even without it
   */
  it('should succeed even when device info is not provided', async () => {
    const testUser = testUsers.get('test@example.com')!;

    // Perform login without device info
    const result = await signIn(testUser.email, testUser.password);

    // Property: Login should succeed even without device info
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Note: Session should NOT be created when device info is not provided
    // This is by design - device tracking is optional
    const sessions = loginSessions.get(testUser.id) || [];
    expect(sessions.length).toBe(0);
  });

  /**
   * Edge case: Invalid credentials should not create session
   */
  it('should not create session for invalid credentials', async () => {
    const testUser = testUsers.get('test@example.com')!;
    
    const deviceInfo = {
      deviceId: 'test-device-invalid',
      userAgent: 'Mozilla/5.0',
      platform: 'Test',
      language: 'en-US',
      screenResolution: '1920x1080',
      timezone: 'UTC',
    };

    // Try to login with wrong password
    const result = await signIn(testUser.email, 'WrongPassword123!', deviceInfo);

    // Login should fail
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    // No session should be created
    const sessions = loginSessions.get(testUser.id) || [];
    expect(sessions.length).toBe(0);
  });
});
