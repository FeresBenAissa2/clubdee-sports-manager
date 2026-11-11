/**
 * Property-Based Test for Registration Creates Auth Account
 * **Feature: auth-database-integration, Property 1: Registration creates auth account**
 * 
 * Property 1: Registration creates auth account
 * For any valid email and password combination, calling the registration function 
 * should successfully create an auth account in Supabase.
 * 
 * Validates: Requirements 1.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Track created users for verification
const createdUsers = new Map<string, { id: string; email: string }>();

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
    admin: {
      getUserById: vi.fn(async (userId: string) => {
        // Find user by ID
        const user = Array.from(createdUsers.values()).find(u => u.id === userId);
        
        if (!user) {
          return {
            data: { user: null },
            error: { message: 'User not found' },
          };
        }

        return {
          data: { user },
          error: null,
        };
      }),
    },
  },
  from: vi.fn((table: string) => ({
    insert: vi.fn(async () => ({ data: null, error: null })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({ data: null, error: null })),
      })),
    })),
  })),
};

// Mock the Supabase server module
vi.mock('@/lib/db/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

// Import after mocking
const { signUp } = await import('@/lib/auth/actions');

describe('Property 1: Registration creates auth account', () => {
  beforeEach(() => {
    createdUsers.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    createdUsers.clear();
  });

  /**
   * **Feature: auth-database-integration, Property 1: Registration creates auth account**
   * 
   * For any valid email and password combination, registration should create an auth account.
   * This test verifies that:
   * 1. The signUp function succeeds with valid credentials
   * 2. An auth account is created in Supabase
   * 3. The created account has the correct email
   */
  it('should create auth account for any valid email and password', async () => {
    // Generator for valid email addresses
    const validEmailArb = fc
      .tuple(
        fc.stringMatching(/^[a-z0-9]{5,12}$/),
        fc.constantFrom('test.com', 'example.com', 'demo.org'),
        fc.integer({ min: 1000, max: 9999 })
      )
      .map(([local, domain, random]) => `${local}${random}@${domain}`);

    // Generator for valid passwords (meets requirements: 8+ chars, uppercase, lowercase, number)
    const validPasswordArb = fc
      .tuple(
        fc.stringMatching(/^[A-Z][a-z]{4,8}$/), // Starts with uppercase, followed by lowercase
        fc.integer({ min: 100, max: 999 }), // Numbers
        fc.constantFrom('!', '@', '#', '$', '%') // Special char
      )
      .map(([base, num, special]) => `${base}${num}${special}`);

    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        async (email, password) => {
          // Execute registration
          const result = await signUp(email, password);

          // Property: Registration with valid credentials should succeed
          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
          expect(result.userId).toBeDefined();
          expect(typeof result.userId).toBe('string');

          // Verify auth account was created by checking the mock was called correctly
          expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
            email,
            password,
            options: {
              emailRedirectTo: expect.any(String),
            },
          });

          // Verify the user was actually created in our mock storage
          expect(createdUsers.has(email)).toBe(true);
          const createdUser = createdUsers.get(email);
          expect(createdUser).toBeDefined();
          expect(createdUser?.email).toBe(email);
          expect(createdUser?.id).toBe(result.userId);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000); // 60 second timeout for async operations

  /**
   * Edge case: Empty email should fail
   */
  it('should reject empty email', async () => {
    const result = await signUp('', 'ValidPass123!');
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  /**
   * Edge case: Empty password should fail
   */
  it('should reject empty password', async () => {
    const result = await signUp('test@example.com', '');
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  /**
   * Edge case: Invalid email format should fail
   */
  it('should reject invalid email format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-z0-9]{3,10}$/), // String without @ symbol
        fc.stringMatching(/^[A-Z][a-z]{5,10}[0-9]{2,3}[!@#]$/),
        async (invalidEmail, password) => {
          const result = await signUp(invalidEmail, password);
          
          // Property: Invalid email format should be rejected
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Edge case: Weak password should fail
   */
  it('should reject weak passwords', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.stringMatching(/^[a-z]{1,7}$/), // Too short, no uppercase, no numbers
        async (email, weakPassword) => {
          const result = await signUp(email, weakPassword);
          
          // Property: Weak passwords should be rejected
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });
});
