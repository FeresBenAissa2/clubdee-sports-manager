/**
 * Property-Based Test for Registration Creates Default Role
 * **Feature: auth-database-integration, Property 3: Registration creates default role**
 * 
 * Property 3: Registration creates default role
 * For any successful auth account creation, a user_role record should be 
 * automatically created with role='athlete'.
 * 
 * Validates: Requirements 1.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Track created users and roles for verification
const createdUsers = new Map<string, { id: string; email: string }>();
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
      return {
        insert: vi.fn(async (data: any) => {
          // Simulate profile creation
          return { data: { id: data.user_id }, error: null };
        }),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
      };
    }
    
    if (table === 'user_roles') {
      const insertFn = vi.fn(async (data: any) => {
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
          eq: vi.fn(() => ({
            single: vi.fn(async () => {
              // Find role by user_id
              const roles = Array.from(createdRoles.values());
              const role = roles[0]; // For simplicity in mock
              
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

describe('Property 3: Registration creates default role', () => {
  beforeEach(() => {
    createdUsers.clear();
    createdRoles.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    createdUsers.clear();
    createdRoles.clear();
  });

  /**
   * **Feature: auth-database-integration, Property 3: Registration creates default role**
   * 
   * For any successful auth account creation, a user_role should be automatically created.
   * This test verifies that:
   * 1. The signUp function succeeds with valid credentials
   * 2. A user_role record is created in the database
   * 3. The role is linked to the auth account via user_id
   * 4. The role is set to 'athlete' by default
   */
  it('should create default athlete role for any successful registration', async () => {
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

          // Property: User role should be created
          const insertFn = (mockSupabase as any)._roleInsert;
          expect(insertFn).toHaveBeenCalled();

          // Get the insert call arguments
          const insertCalls = insertFn.mock.calls;
          expect(insertCalls.length).toBeGreaterThan(0);

          const roleData = insertCalls[insertCalls.length - 1][0];
          
          // Property: Role should be linked to the user
          expect(roleData.user_id).toBe(result.userId);
          
          // Property: Role should be 'athlete' by default
          expect(roleData.role).toBe('athlete');

          // Verify role was actually created in our mock storage
          expect(createdRoles.has(result.userId!)).toBe(true);
          const createdRole = createdRoles.get(result.userId!);
          expect(createdRole).toBeDefined();
          expect(createdRole?.user_id).toBe(result.userId);
          expect(createdRole?.role).toBe('athlete');
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000); // 60 second timeout for async operations

  /**
   * Edge case: Role should not be created if auth account creation fails
   */
  it('should not create role when auth account creation fails', async () => {
    // Clear previous calls
    vi.clearAllMocks();
    createdUsers.clear();
    createdRoles.clear();
    
    const email = 'invalid-email'; // Invalid format
    const password = 'ValidPass123!';

    const result = await signUp(email, password);

    expect(result.success).toBe(false);

    // Role insert should not have been called
    const insertFn = (mockSupabase as any)._roleInsert;
    expect(insertFn).not.toHaveBeenCalled();
  });

  /**
   * Edge case: Registration should succeed even if role creation fails
   * (as per design: role creation failure is logged but doesn't fail signup)
   */
  it('should succeed registration even if role creation fails', async () => {
    // Mock role insert to fail
    const originalFrom = mockSupabase.from;
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'user_roles') {
        return {
          insert: vi.fn(async () => ({
            data: null,
            error: { message: 'Role creation failed' },
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        };
      }
      if (table === 'profiles') {
        return {
          insert: vi.fn(async () => ({ data: null, error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        };
      }
      return originalFrom(table);
    });

    const email = 'testuser789@example.com';
    const password = 'ValidPass123!';

    const result = await signUp(email, password);

    // Registration should still succeed
    expect(result.success).toBe(true);
    expect(result.userId).toBeDefined();

    // Restore original mock
    mockSupabase.from = originalFrom;
  });

  /**
   * Property: Role should have correct foreign key relationship
   */
  it('should create role with valid user_id foreign key', async () => {
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
            // Property: Role user_id should match created user id
            const role = createdRoles.get(result.userId);
            if (role) {
              expect(role.user_id).toBe(result.userId);
              
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

  /**
   * Property: Only 'athlete' role should be created for new registrations
   */
  it('should never create admin or coach roles during registration', async () => {
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
            const role = createdRoles.get(result.userId);
            
            // Property: Role should never be 'admin' or 'coach' for new signups
            if (role) {
              expect(role.role).not.toBe('admin');
              expect(role.role).not.toBe('coach');
              expect(role.role).toBe('athlete');
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Edge case: Each user should have exactly one role
   */
  it('should create exactly one role per user', async () => {
    const email = 'uniqueuser@example.com';
    const password = 'ValidPass123!';

    const result = await signUp(email, password);

    expect(result.success).toBe(true);
    expect(result.userId).toBeDefined();

    // Check that exactly one role was created
    const insertFn = (mockSupabase as any)._roleInsert;
    const callsForThisUser = insertFn.mock.calls.filter(
      (call: any) => call[0].user_id === result.userId
    );
    
    expect(callsForThisUser.length).toBe(1);
  });
});
