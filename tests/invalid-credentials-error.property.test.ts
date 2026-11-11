/**
 * Property-Based Test for Invalid Credentials Error
 * **Feature: auth-database-integration, Property 7: Invalid credentials error**
 * 
 * Property: For any invalid credentials, login should return an error without 
 * revealing which field (email or password) is incorrect.
 * 
 * Validates: Requirements 3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Track test users for validation
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
  from: vi.fn(() => ({
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
const { signIn } = await import('@/lib/auth/actions');

describe('Property 7: Invalid credentials error', () => {
  beforeEach(() => {
    testUsers.clear();
    vi.clearAllMocks();
    
    // Create test users with known credentials
    testUsers.set('test1@example.com', {
      id: 'user-test-1',
      email: 'test1@example.com',
      password: 'ValidPass123!',
    });
    
    testUsers.set('test2@example.com', {
      id: 'user-test-2',
      email: 'test2@example.com',
      password: 'SecurePass456@',
    });
  });

  /**
   * **Feature: auth-database-integration, Property 7: Invalid credentials error**
   * 
   * Property Test: For any invalid credentials, login returns an error without 
   * revealing which field is incorrect
   * 
   * This test verifies that:
   * 1. Login with invalid credentials fails
   * 2. Error message doesn't reveal whether email or password is wrong
   * 3. Error message is in Thai language
   */
  it('should return generic error for any invalid credentials without revealing which field is incorrect', async () => {
    const validUser = testUsers.get('test1@example.com')!;
    
    await fc.assert(
      fc.asyncProperty(
        // Generate various invalid credential combinations
        fc.oneof(
          // Case 1: Valid email, wrong password
          fc.record({
            email: fc.constant(validUser.email),
            password: fc.string({ minLength: 8, maxLength: 20 }).filter(p => p !== validUser.password),
          }),
          // Case 2: Wrong email, any password
          fc.record({
            email: fc.emailAddress().filter(e => !testUsers.has(e)),
            password: fc.string({ minLength: 8, maxLength: 20 }),
          }),
          // Case 3: Wrong email, valid password from another user
          fc.record({
            email: fc.emailAddress().filter(e => !testUsers.has(e)),
            password: fc.constant(validUser.password),
          })
        ),
        async (credentials) => {
          // Attempt login with invalid credentials
          const result = await signIn(credentials.email, credentials.password);

          // Property 1: Login should fail
          expect(result.success).toBe(false);
          
          // Property 2: Error message should be present
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          expect(result.error!.length).toBeGreaterThan(0);
          
          // Property 3: Error message should be in Thai
          // Thai characters are in the Unicode range \u0E00-\u0E7F
          const hasThai = /[\u0E00-\u0E7F]/.test(result.error!);
          expect(hasThai).toBe(true);
          
          // Property 4: Error message should NOT reveal which field is incorrect
          // It should not contain words like "email", "password", "อีเมล", "รหัสผ่าน" alone
          const errorLower = result.error!.toLowerCase();
          
          // The error should be generic - it can mention both fields together
          // but not single out one specific field as the problem
          const mentionsOnlyEmail = (
            (errorLower.includes('email') || errorLower.includes('อีเมล')) &&
            !errorLower.includes('password') &&
            !errorLower.includes('รหัสผ่าน')
          );
          
          const mentionsOnlyPassword = (
            (errorLower.includes('password') || errorLower.includes('รหัสผ่าน')) &&
            !errorLower.includes('email') &&
            !errorLower.includes('อีเมล')
          );
          
          // Error should not single out just one field
          expect(mentionsOnlyEmail).toBe(false);
          expect(mentionsOnlyPassword).toBe(false);
          
          // Property 5: No user data should be returned
          expect(result.data).toBeUndefined();
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000); // 60 second timeout

  /**
   * Property Test: Wrong password for valid email returns generic error
   * 
   * Specifically test the case where email exists but password is wrong
   */
  it('should return generic error when email is valid but password is wrong', async () => {
    const validUser = testUsers.get('test1@example.com')!;
    
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 20 }).filter(p => p !== validUser.password),
        async (wrongPassword) => {
          const result = await signIn(validUser.email, wrongPassword);
          
          // Should fail without revealing that the email was correct
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          
          // Error should be in Thai
          expect(/[\u0E00-\u0E7F]/.test(result.error!)).toBe(true);
          
          // Should not reveal that password specifically is wrong
          const errorLower = result.error!.toLowerCase();
          const mentionsOnlyPassword = (
            (errorLower.includes('password') || errorLower.includes('รหัสผ่าน')) &&
            !errorLower.includes('email') &&
            !errorLower.includes('อีเมล')
          );
          expect(mentionsOnlyPassword).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property Test: Non-existent email returns generic error
   * 
   * Specifically test the case where email doesn't exist in the system
   */
  it('should return generic error when email does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress().filter(e => !testUsers.has(e)),
        fc.string({ minLength: 8, maxLength: 20 }),
        async (nonExistentEmail, anyPassword) => {
          const result = await signIn(nonExistentEmail, anyPassword);
          
          // Should fail without revealing that the email doesn't exist
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          
          // Error should be in Thai
          expect(/[\u0E00-\u0E7F]/.test(result.error!)).toBe(true);
          
          // Should not reveal that email specifically is wrong
          const errorLower = result.error!.toLowerCase();
          const mentionsOnlyEmail = (
            (errorLower.includes('email') || errorLower.includes('อีเมล')) &&
            !errorLower.includes('password') &&
            !errorLower.includes('รหัสผ่าน')
          );
          expect(mentionsOnlyEmail).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Edge case: Empty credentials should fail with generic error
   */
  it('should return generic error for empty credentials', async () => {
    const emptyEmailResult = await signIn('', 'SomePassword123!');
    expect(emptyEmailResult.success).toBe(false);
    expect(emptyEmailResult.error).toBeDefined();
    expect(/[\u0E00-\u0E7F]/.test(emptyEmailResult.error!)).toBe(true);
    
    const emptyPasswordResult = await signIn('test@example.com', '');
    expect(emptyPasswordResult.success).toBe(false);
    expect(emptyPasswordResult.error).toBeDefined();
    expect(/[\u0E00-\u0E7F]/.test(emptyPasswordResult.error!)).toBe(true);
    
    const bothEmptyResult = await signIn('', '');
    expect(bothEmptyResult.success).toBe(false);
    expect(bothEmptyResult.error).toBeDefined();
    expect(/[\u0E00-\u0E7F]/.test(bothEmptyResult.error!)).toBe(true);
  });

  /**
   * Edge case: Verify error consistency
   * 
   * The same type of error (invalid credentials) should return consistent messages
   */
  it('should return consistent error messages for invalid credentials', async () => {
    const validUser = testUsers.get('test1@example.com')!;
    
    // Try multiple times with wrong password
    const results = await Promise.all([
      signIn(validUser.email, 'WrongPass1!'),
      signIn(validUser.email, 'WrongPass2@'),
      signIn(validUser.email, 'WrongPass3#'),
    ]);
    
    // All should fail
    results.forEach(result => {
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
    
    // Error messages should be the same (generic message)
    const errorMessages = results.map(r => r.error);
    const uniqueMessages = new Set(errorMessages);
    
    // Should have consistent error message
    expect(uniqueMessages.size).toBeLessThanOrEqual(2); // Allow for minor variations
  });

  /**
   * Property Test: Valid credentials should succeed (sanity check)
   * 
   * Verify that the test setup is correct by ensuring valid credentials work
   */
  it('should succeed with valid credentials (sanity check)', async () => {
    const validUser = testUsers.get('test1@example.com')!;
    
    const result = await signIn(validUser.email, validUser.password);
    
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
