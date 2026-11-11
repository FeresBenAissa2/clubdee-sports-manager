/**
 * Property-Based Tests for Unexpected Error Handling
 * **Feature: auth-database-integration, Property 11: Unexpected error handling**
 * 
 * Property 11: Unexpected error handling
 * For any unexpected error, the system should log the full error details
 * and display a generic user-friendly message.
 * 
 * Validates: Requirements 5.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { signUp, signIn, signOut, verifyOTP, resendOTP, resetPassword, updatePassword } from '@/lib/auth/actions';

// Mock console.error to track logging
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Unexpected Error Handling Property Tests', () => {
  beforeEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 11: Unexpected error handling
   * For any unexpected error in auth operations:
   * 1. The error should be logged (console.error called)
   * 2. A user-friendly Thai message should be returned
   * 3. The system should not crash (return AuthResult with success: false)
   */
  it('Property 11: signUp handles unexpected errors gracefully', async () => {
    // Generate arbitrary invalid inputs that might cause unexpected errors
    const invalidInputArb = fc.record({
      email: fc.oneof(
        fc.constant(''),
        fc.constant('not-an-email'),
        fc.constant('invalid@'),
        fc.constant('@invalid.com'),
        fc.string({ minLength: 1, maxLength: 10 }), // Random strings
      ),
      password: fc.oneof(
        fc.constant(''),
        fc.constant('123'), // Too short
        fc.string({ minLength: 1, maxLength: 5 }), // Random short strings
      ),
    });

    await fc.assert(
      fc.asyncProperty(invalidInputArb, async ({ email, password }) => {
        // Call signUp with potentially problematic inputs
        const result = await signUp(email, password);

        // Property 1: Should not crash - always returns AuthResult
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');

        // Property 2: On error, should have error message
        if (!result.success) {
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          expect(result.error!.length).toBeGreaterThan(0);

          // Property 3: Error message should be in Thai (contains Thai characters or common Thai error words)
          const hasThai = /[\u0E00-\u0E7F]/.test(result.error!);
          expect(hasThai).toBe(true);

          // Property 4: Error message should be user-friendly (not expose internals)
          // Should not contain technical terms like "stack", "trace", "undefined", "null"
          expect(result.error).not.toMatch(/stack/i);
          expect(result.error).not.toMatch(/trace/i);
          expect(result.error).not.toMatch(/undefined/i);
          expect(result.error).not.toMatch(/null/i);
          expect(result.error).not.toMatch(/exception/i);
        }
      }),
      { numRuns: 100 }
    );
  }, 30000); // 30 second timeout for network operations

  /**
   * Property: signIn handles unexpected errors gracefully
   */
  it('Property: signIn handles unexpected errors gracefully', async () => {
    const invalidInputArb = fc.record({
      email: fc.oneof(
        fc.constant(''),
        fc.constant('nonexistent@example.com'),
        fc.string({ minLength: 1, maxLength: 20 }),
      ),
      password: fc.oneof(
        fc.constant(''),
        fc.constant('wrongpassword'),
        fc.string({ minLength: 1, maxLength: 20 }),
      ),
    });

    await fc.assert(
      fc.asyncProperty(invalidInputArb, async ({ email, password }) => {
        const result = await signIn(email, password);

        // Should not crash
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');

        // On error, should have Thai error message
        if (!result.success) {
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          
          // Should be in Thai
          const hasThai = /[\u0E00-\u0E7F]/.test(result.error!);
          expect(hasThai).toBe(true);

          // Should not expose internals
          expect(result.error).not.toMatch(/stack/i);
          expect(result.error).not.toMatch(/undefined/i);
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property: verifyOTP handles unexpected errors gracefully
   */
  it('Property: verifyOTP handles unexpected errors gracefully', async () => {
    const invalidInputArb = fc.record({
      email: fc.oneof(
        fc.constant(''),
        fc.constant('invalid@example.com'),
        fc.string({ minLength: 1, maxLength: 20 }),
      ),
      token: fc.oneof(
        fc.constant(''),
        fc.constant('000000'),
        fc.constant('invalid'),
        fc.string({ minLength: 1, maxLength: 10 }),
      ),
    });

    await fc.assert(
      fc.asyncProperty(invalidInputArb, async ({ email, token }) => {
        const result = await verifyOTP(email, token);

        // Should not crash
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');

        // On error, should have error message
        if (!result.success) {
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          expect(result.error!.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property: resendOTP handles unexpected errors gracefully
   */
  it('Property: resendOTP handles unexpected errors gracefully', async () => {
    const invalidEmailArb = fc.oneof(
      fc.constant(''),
      fc.constant('invalid'),
      fc.constant('nonexistent@example.com'),
      fc.string({ minLength: 1, maxLength: 20 }),
    );

    await fc.assert(
      fc.asyncProperty(invalidEmailArb, async (email) => {
        const result = await resendOTP(email);

        // Should not crash
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');

        // On error, should have error message
        if (!result.success) {
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property: resetPassword handles unexpected errors gracefully
   */
  it('Property: resetPassword handles unexpected errors gracefully', async () => {
    const invalidEmailArb = fc.oneof(
      fc.constant(''),
      fc.constant('invalid'),
      fc.constant('nonexistent@example.com'),
      fc.string({ minLength: 1, maxLength: 20 }),
    );

    await fc.assert(
      fc.asyncProperty(invalidEmailArb, async (email) => {
        const result = await resetPassword(email);

        // Should not crash
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');

        // On error, should have error message
        if (!result.success) {
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property: Error logging occurs for unexpected errors
   * This test verifies that console.error is called when errors occur
   */
  it('Property: Unexpected errors are logged to console', async () => {
    // Use invalid inputs that will cause errors
    const invalidEmail = 'definitely-not-valid';
    const invalidPassword = '123';

    consoleErrorSpy.mockClear();

    // Call signUp with invalid inputs
    const result = await signUp(invalidEmail, invalidPassword);

    // Should return error
    expect(result.success).toBe(false);

    // Should have logged the error (console.error called at least once)
    // Note: The actual number of calls may vary based on implementation
    expect(consoleErrorSpy).toHaveBeenCalled();
  }, 10000);

  /**
   * Property: Error messages are consistent in format
   * All error messages should follow similar patterns
   */
  it('Property: Error messages are consistently formatted', async () => {
    const testCases = [
      { fn: () => signUp('invalid', '123'), name: 'signUp' },
      { fn: () => signIn('invalid', '123'), name: 'signIn' },
      { fn: () => verifyOTP('invalid', '123'), name: 'verifyOTP' },
      { fn: () => resendOTP('invalid'), name: 'resendOTP' },
      { fn: () => resetPassword('invalid'), name: 'resetPassword' },
    ];

    for (const testCase of testCases) {
      const result = await testCase.fn();

      if (!result.success && result.error) {
        // Error message should be a non-empty string
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
        expect(result.error.length).toBeLessThan(500); // Reasonable length

        // Should not contain technical jargon
        expect(result.error).not.toMatch(/TypeError/i);
        expect(result.error).not.toMatch(/ReferenceError/i);
        expect(result.error).not.toMatch(/SyntaxError/i);
        expect(result.error).not.toMatch(/at Object/i);
        expect(result.error).not.toMatch(/at async/i);
      }
    }
  }, 30000);

  /**
   * Property: System remains functional after errors
   * After an error occurs, subsequent valid operations should still work
   */
  it('Property: System recovers from unexpected errors', async () => {
    // First, cause an error with invalid input
    const errorResult = await signUp('', '');
    expect(errorResult.success).toBe(false);

    // Then, attempt a valid operation (this will likely fail due to rate limiting or other reasons,
    // but the important thing is it doesn't crash)
    const validResult = await signIn('test@example.com', 'validpassword123');
    
    // Should return a result (not crash)
    expect(validResult).toBeDefined();
    expect(typeof validResult.success).toBe('boolean');
  }, 10000);

  /**
   * Property: Concurrent errors don't crash the system
   */
  it('Property: Concurrent operations with errors are handled gracefully', async () => {
    // Generate multiple concurrent operations with invalid inputs
    const operations = Array.from({ length: 10 }, (_, i) => 
      signUp(`invalid${i}`, `pass${i}`)
    );

    // Execute all operations concurrently
    const results = await Promise.allSettled(operations);

    // All operations should complete (not hang or crash)
    expect(results.length).toBe(10);

    // Each result should be fulfilled
    results.forEach((result) => {
      expect(result.status).toBe('fulfilled');
      
      if (result.status === 'fulfilled') {
        const authResult = result.value;
        expect(authResult).toBeDefined();
        expect(typeof authResult.success).toBe('boolean');
      }
    });
  }, 30000);

  /**
   * Property: Error messages don't leak sensitive information
   */
  it('Property: Error messages are safe and don\'t expose sensitive data', async () => {
    const operations = [
      () => signUp('test@example.com', 'password123'),
      () => signIn('test@example.com', 'wrongpassword'),
      () => verifyOTP('test@example.com', '000000'),
    ];

    for (const operation of operations) {
      const result = await operation();

      if (!result.success && result.error) {
        // Should not contain sensitive patterns
        const sensitivePatterns = [
          /password.*:/i, // Password values
          /token.*:/i, // Token values
          /key.*:/i, // API keys
          /secret/i, // Secrets
          /bearer/i, // Auth tokens
          /authorization/i, // Auth headers
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b.*password/i, // Email with password
        ];

        sensitivePatterns.forEach((pattern) => {
          expect(result.error).not.toMatch(pattern);
        });

        // Should not contain file paths
        expect(result.error).not.toMatch(/\/[a-z]+\/[a-z]+\//i);
        expect(result.error).not.toMatch(/C:\\/i);
      }
    }
  }, 30000);
});
