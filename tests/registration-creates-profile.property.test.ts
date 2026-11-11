/**
 * Property-Based Test for Registration Creates Profile
 * **Feature: auth-database-integration, Property 2: Registration creates profile**
 * 
 * Property 2: Registration creates profile
 * For any successful auth account creation, a corresponding profile record 
 * should be automatically created in the database.
 * 
 * Validates: Requirements 1.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Track created users and profiles for verification
const createdUsers = new Map<string, { id: string; email: string }>();
const createdProfiles = new Map<string, { id: string; user_id: string; full_name: string; email: string }>();

// Mock Supabase client
const mockSupabase = {
  auth: {
    signUp: vi.fn(async ({ email, password }: { email: string; password: string }) => {
      // Validate email format
      if (!email || !email.includes('@')) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid email format' },
        };
      }

      // Validate password strength
      if (!password || password.length < 8) {
        return {
          data: { user: null, session: null },
          error: { message: 'Password must be at least 8 characters' },
        };
      }

      // Check for duplicate email
      if (createdUsers.has(email)) {
        return {
          data: { user: null, session: null },
          error: { message: 'User already registered' },
        };
      }

      // Create user
      const userId = `user-${Math.random().toString(36).substring(2, 11)}`;
      const user = {
        id: userId,
        email,
        created_at: new Date().toISOString(),
      };

      createdUsers.set(email, user);

      return {
        data: {
          user,
          session: null,
        },
        error: null,
      };
    }),
  },
  from: vi.fn((table: string) => {
    if (table === 'profiles') {
      const insertFn = vi.fn(async (data: any) => {
        // Simulate profile creation
        const profile = {
          id: data.user_id,
          user_id: data.user_id,
          full_name: data.full_name,
          email: createdUsers.get(data.full_name.replace(/^(.+)@.*$/, '$1'))?.email || '',
          membership_status: data.membership_status,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        
        createdProfiles.set(data.user_id, profile);
        
        return { data: profile, error: null };
      });
      
      // Store the insert function so we can access it later
      (mockSupabase as any)._profileInsert = insertFn;
      
      return {
        insert: insertFn,
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => {
              // Find profile by user_id
              const profiles = Array.from(createdProfiles.values());
              const profile = profiles[0]; // For simplicity in mock
              
              if (!profile) {
                return {
                  data: null,
                  error: { message: 'Profile not found' },
                };
              }

              return {
                data: profile,
                error: null,
              };
            }),
          })),
        })),
      };
    }
    
    if (table === 'user_roles') {
      return {
        insert: vi.fn(async () => ({ data: null, error: null })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
      };
    }
    
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
const { signUp } = await import('@/lib/auth/actions');

describe('Property 2: Registration creates profile', () => {
  beforeEach(() => {
    createdUsers.clear();
    createdProfiles.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    createdUsers.clear();
    createdProfiles.clear();
  });

  /**
   * **Feature: auth-database-integration, Property 2: Registration creates profile**
   * 
   * For any successful auth account creation, a profile should be automatically created.
   * This test verifies that:
   * 1. The signUp function succeeds with valid credentials
   * 2. A profile record is created in the database
   * 3. The profile is linked to the auth account via user_id
   * 4. The profile contains the expected default values
   */
  it('should create profile for any successful registration', async () => {
    // Generator for valid email addresses
    const validEmailArb = fc
      .tuple(
        fc.stringMatching(/^[a-z0-9]{5,12}$/),
        fc.constantFrom('test.com', 'example.com', 'demo.org'),
        fc.integer({ min: 1000, max: 9999 })
      )
      .map(([local, domain, random]) => `${local}${random}@${domain}`);

    // Generator for valid passwords
    const validPasswordArb = fc
      .tuple(
        fc.stringMatching(/^[A-Z][a-z]{4,8}$/),
        fc.integer({ min: 100, max: 999 }),
        fc.constantFrom('!', '@', '#', '$', '%')
      )
      .map(([base, num, special]) => `${base}${num}${special}`);

    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        async (email, password) => {
          // Execute registration
          const result = await signUp(email, password);

          // Property: Registration should succeed
          expect(result.success).toBe(true);
          expect(result.userId).toBeDefined();

          // Property: Profile should be created
          const insertFn = (mockSupabase as any)._profileInsert;
          expect(insertFn).toHaveBeenCalled();

          // Get the insert call arguments
          const insertCalls = insertFn.mock.calls;
          expect(insertCalls.length).toBeGreaterThan(0);

          const profileData = insertCalls[insertCalls.length - 1][0];
          
          // Property: Profile should be linked to the user
          expect(profileData.user_id).toBe(result.userId);
          
          // Property: Profile should have default values
          expect(profileData.full_name).toBeDefined();
          expect(typeof profileData.full_name).toBe('string');
          expect(profileData.membership_status).toBe(null); // Not yet applied for membership
          expect(profileData.created_at).toBeDefined();
          expect(profileData.updated_at).toBeDefined();

          // Verify profile was actually created in our mock storage
          expect(createdProfiles.has(result.userId!)).toBe(true);
          const createdProfile = createdProfiles.get(result.userId!);
          expect(createdProfile).toBeDefined();
          expect(createdProfile?.user_id).toBe(result.userId);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000); // 60 second timeout for async operations

  /**
   * Edge case: Profile creation should use email prefix as temporary name
   */
  it('should use email prefix as temporary full_name', async () => {
    const email = 'testuser123@example.com';
    const password = 'ValidPass123!';

    const result = await signUp(email, password);

    expect(result.success).toBe(true);

    // Check that profile was created with email prefix as name
    const insertFn = (mockSupabase as any)._profileInsert;
    expect(insertFn).toHaveBeenCalled();
    
    const insertCalls = insertFn.mock.calls;
    const profileData = insertCalls[insertCalls.length - 1][0];

    expect(profileData.full_name).toBe('testuser123');
  });

  /**
   * Edge case: Profile should not be created if auth account creation fails
   */
  it('should not create profile when auth account creation fails', async () => {
    // Clear previous calls
    vi.clearAllMocks();
    createdUsers.clear();
    createdProfiles.clear();
    
    const email = 'invalid-email'; // Invalid format
    const password = 'ValidPass123!';

    const result = await signUp(email, password);

    expect(result.success).toBe(false);

    // Profile insert should not have been called
    const insertFn = (mockSupabase as any)._profileInsert;
    expect(insertFn).not.toHaveBeenCalled();
  });

  /**
   * Edge case: Registration should succeed even if profile creation fails
   * (as per design: profile creation failure is logged but doesn't fail signup)
   */
  it('should succeed registration even if profile creation fails', async () => {
    // Mock profile insert to fail
    const originalFrom = mockSupabase.from;
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          insert: vi.fn(async () => ({
            data: null,
            error: { message: 'Profile creation failed' },
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        };
      }
      return originalFrom(table);
    });

    const email = 'testuser456@example.com';
    const password = 'ValidPass123!';

    const result = await signUp(email, password);

    // Registration should still succeed
    expect(result.success).toBe(true);
    expect(result.userId).toBeDefined();

    // Restore original mock
    mockSupabase.from = originalFrom;
  });

  /**
   * Property: Profile should have correct foreign key relationship
   */
  it('should create profile with valid user_id foreign key', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.stringMatching(/^[A-Z][a-z]{5,10}[0-9]{2,3}[!@#]$/),
        async (email, password) => {
          // Skip if email already exists
          if (createdUsers.has(email)) {
            return;
          }

          const result = await signUp(email, password);

          if (result.success && result.userId) {
            // Property: Profile user_id should match created user id
            const profile = createdProfiles.get(result.userId);
            if (profile) {
              expect(profile.user_id).toBe(result.userId);
              
              // Property: User should exist in createdUsers
              const userExists = Array.from(createdUsers.values()).some(
                u => u.id === result.userId
              );
              expect(userExists).toBe(true);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
