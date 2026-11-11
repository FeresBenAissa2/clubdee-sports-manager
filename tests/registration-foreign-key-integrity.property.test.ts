/**
 * Property-Based Test for Foreign Key Integrity
 * **Feature: auth-database-integration, Property 17: Foreign key integrity**
 * 
 * Property 17: Foreign key integrity
 * For any completed registration, all foreign key relationships (user_id references) 
 * should be valid and point to existing records.
 * 
 * Validates: Requirements 7.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Track created users, profiles, and roles for verification
const createdUsers = new Map<string, { id: string; email: string }>();
const createdProfiles = new Map<string, { id: string; user_id: string; full_name: string }>();
const createdRoles = new Map<string, { id: string; user_id: string; role: string }>();

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
        // Validate foreign key: user_id must exist in createdUsers
        const userExists = Array.from(createdUsers.values()).some(u => u.id === data.user_id);
        
        if (!userExists) {
          return {
            data: null,
            error: { message: 'Foreign key violation: user_id does not exist in auth.users' },
          };
        }

        // Simulate profile creation
        const profile = {
          id: data.user_id,
          user_id: data.user_id,
          full_name: data.full_name,
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
          eq: vi.fn((column: string, value: string) => ({
            single: vi.fn(async () => {
              // Find profile by user_id
              const profile = createdProfiles.get(value);
              
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
      const insertFn = vi.fn(async (data: any) => {
        // Validate foreign key: user_id must exist in createdUsers
        const userExists = Array.from(createdUsers.values()).some(u => u.id === data.user_id);
        
        if (!userExists) {
          return {
            data: null,
            error: { message: 'Foreign key violation: user_id does not exist in auth.users' },
          };
        }

        // Simulate role creation
        const role = {
          id: `role-${Math.random().toString(36).substring(2, 11)}`,
          user_id: data.user_id,
          role: data.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        createdRoles.set(data.user_id, role);
        
        return { data: role, error: null };
      });
      
      // Store the insert function so we can access it later
      (mockSupabase as any)._roleInsert = insertFn;
      
      return {
        insert: insertFn,
        select: vi.fn(() => ({
          eq: vi.fn((column: string, value: string) => ({
            single: vi.fn(async () => {
              // Find role by user_id
              const role = createdRoles.get(value);
              
              if (!role) {
                return {
                  data: null,
                  error: { message: 'Role not found' },
                };
              }

              return {
                data: role,
                error: null,
              };
            }),
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

describe('Property 17: Foreign key integrity', () => {
  beforeEach(() => {
    createdUsers.clear();
    createdProfiles.clear();
    createdRoles.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    createdUsers.clear();
    createdProfiles.clear();
    createdRoles.clear();
  });

  /**
   * **Feature: auth-database-integration, Property 17: Foreign key integrity**
   * 
   * For any completed registration, all foreign key relationships should be valid.
   * This test verifies that:
   * 1. The signUp function succeeds with valid credentials
   * 2. Profile user_id references an existing auth user
   * 3. User_role user_id references an existing auth user
   * 4. All foreign key constraints are satisfied
   */
  it('should maintain valid foreign key relationships for any registration', async () => {
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

          const userId = result.userId!;

          // Property 1: Auth user must exist
          const authUser = Array.from(createdUsers.values()).find(u => u.id === userId);
          expect(authUser).toBeDefined();
          expect(authUser?.id).toBe(userId);

          // Property 2: Profile user_id must reference existing auth user
          const profile = createdProfiles.get(userId);
          if (profile) {
            expect(profile.user_id).toBe(userId);
            
            // Verify the referenced user exists
            const referencedUser = Array.from(createdUsers.values()).find(
              u => u.id === profile.user_id
            );
            expect(referencedUser).toBeDefined();
            expect(referencedUser?.id).toBe(userId);
          }

          // Property 3: User_role user_id must reference existing auth user
          const role = createdRoles.get(userId);
          if (role) {
            expect(role.user_id).toBe(userId);
            
            // Verify the referenced user exists
            const referencedUser = Array.from(createdUsers.values()).find(
              u => u.id === role.user_id
            );
            expect(referencedUser).toBeDefined();
            expect(referencedUser?.id).toBe(userId);
          }

          // Property 4: All foreign keys point to the same user
          if (profile && role) {
            expect(profile.user_id).toBe(role.user_id);
            expect(profile.user_id).toBe(userId);
            expect(role.user_id).toBe(userId);
          }

          // Property 5: No orphaned records (all profiles and roles have valid user_id)
          for (const [profileUserId, profileData] of createdProfiles.entries()) {
            const userExists = Array.from(createdUsers.values()).some(
              u => u.id === profileUserId
            );
            expect(userExists).toBe(true);
            expect(profileData.user_id).toBe(profileUserId);
          }

          for (const [roleUserId, roleData] of createdRoles.entries()) {
            const userExists = Array.from(createdUsers.values()).some(
              u => u.id === roleUserId
            );
            expect(userExists).toBe(true);
            expect(roleData.user_id).toBe(roleUserId);
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000); // 60 second timeout for async operations

  /**
   * Edge case: Foreign key constraint should prevent orphaned profiles
   */
  it('should reject profile creation with non-existent user_id', async () => {
    const supabase = await mockSupabase;
    const profileTable = supabase.from('profiles');
    
    // Try to create a profile with a user_id that doesn't exist
    const result = await profileTable.insert({
      user_id: 'non-existent-user-id',
      full_name: 'Test User',
      membership_status: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Should fail due to foreign key constraint
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Foreign key violation');
  });

  /**
   * Edge case: Foreign key constraint should prevent orphaned roles
   */
  it('should reject role creation with non-existent user_id', async () => {
    const supabase = await mockSupabase;
    const roleTable = supabase.from('user_roles');
    
    // Try to create a role with a user_id that doesn't exist
    const result = await roleTable.insert({
      user_id: 'non-existent-user-id',
      role: 'athlete',
    });

    // Should fail due to foreign key constraint
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Foreign key violation');
  });

  /**
   * Property: All user_id references should be consistent across tables
   */
  it('should maintain consistent user_id across all related tables', async () => {
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
            const userId = result.userId;

            // Property: If profile exists, its user_id must match
            const profile = createdProfiles.get(userId);
            if (profile) {
              expect(profile.user_id).toBe(userId);
            }

            // Property: If role exists, its user_id must match
            const role = createdRoles.get(userId);
            if (role) {
              expect(role.user_id).toBe(userId);
            }

            // Property: If both exist, they must reference the same user
            if (profile && role) {
              expect(profile.user_id).toBe(role.user_id);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: No dangling foreign keys after registration
   */
  it('should have no dangling foreign keys in the system', async () => {
    // Create multiple users
    const users = [
      { email: 'user1@test.com', password: 'ValidPass1!' },
      { email: 'user2@test.com', password: 'ValidPass2!' },
      { email: 'user3@test.com', password: 'ValidPass3!' },
    ];

    for (const { email, password } of users) {
      await signUp(email, password);
    }

    // Property: Every profile user_id must reference an existing user
    for (const [userId, profile] of createdProfiles.entries()) {
      const userExists = Array.from(createdUsers.values()).some(u => u.id === userId);
      expect(userExists).toBe(true);
      
      const referencedUser = Array.from(createdUsers.values()).find(
        u => u.id === profile.user_id
      );
      expect(referencedUser).toBeDefined();
    }

    // Property: Every role user_id must reference an existing user
    for (const [userId, role] of createdRoles.entries()) {
      const userExists = Array.from(createdUsers.values()).some(u => u.id === userId);
      expect(userExists).toBe(true);
      
      const referencedUser = Array.from(createdUsers.values()).find(
        u => u.id === role.user_id
      );
      expect(referencedUser).toBeDefined();
    }

    // Property: No user_id in profiles or roles that doesn't exist in users
    const allUserIds = new Set(Array.from(createdUsers.values()).map(u => u.id));
    const allProfileUserIds = new Set(Array.from(createdProfiles.values()).map(p => p.user_id));
    const allRoleUserIds = new Set(Array.from(createdRoles.values()).map(r => r.user_id));

    for (const profileUserId of allProfileUserIds) {
      expect(allUserIds.has(profileUserId)).toBe(true);
    }

    for (const roleUserId of allRoleUserIds) {
      expect(allUserIds.has(roleUserId)).toBe(true);
    }
  });

  /**
   * Property: Foreign key integrity is maintained even with concurrent registrations
   */
  it('should maintain foreign key integrity with multiple registrations', async () => {
    const emailPasswordPairs = [
      { email: 'concurrent1@test.com', password: 'ValidPass1!' },
      { email: 'concurrent2@test.com', password: 'ValidPass2!' },
      { email: 'concurrent3@test.com', password: 'ValidPass3!' },
      { email: 'concurrent4@test.com', password: 'ValidPass4!' },
      { email: 'concurrent5@test.com', password: 'ValidPass5!' },
    ];

    // Register all users
    const results = await Promise.all(
      emailPasswordPairs.map(({ email, password }) => signUp(email, password))
    );

    // Property: All registrations should succeed
    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
    }

    // Property: All foreign keys should be valid
    for (const result of results) {
      if (result.userId) {
        const userId = result.userId;

        // Check user exists
        const user = Array.from(createdUsers.values()).find(u => u.id === userId);
        expect(user).toBeDefined();

        // Check profile foreign key
        const profile = createdProfiles.get(userId);
        if (profile) {
          expect(profile.user_id).toBe(userId);
          const profileUserExists = Array.from(createdUsers.values()).some(
            u => u.id === profile.user_id
          );
          expect(profileUserExists).toBe(true);
        }

        // Check role foreign key
        const role = createdRoles.get(userId);
        if (role) {
          expect(role.user_id).toBe(userId);
          const roleUserExists = Array.from(createdUsers.values()).some(
            u => u.id === role.user_id
          );
          expect(roleUserExists).toBe(true);
        }
      }
    }
  });
});
