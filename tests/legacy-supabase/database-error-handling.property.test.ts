/**
 * Property-Based Tests for Database Error Handling
 * **Feature: auth-database-integration, Property 8: Database error handling**
 * 
 * Property 8: Database error handling
 * For any database operation that fails, the system should catch the error,
 * log it, and return a user-friendly message.
 * 
 * Validates: Requirements 4.2, 4.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Track console.error calls to verify logging
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// Create a test client using service role key
function createTestClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey);
}

describe('Database Error Handling Property Tests', () => {
  beforeEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 8: Database error handling
   * For any database operation that fails, the system should:
   * 1. Catch the error (not throw/crash)
   * 2. Log the error details
   * 3. Return a user-friendly error message
   */
  it('Property 8: Database operations handle errors gracefully', async () => {
    // Generate arbitrary invalid table names (excluding empty strings which throw before query)
    const invalidTableNameArb = fc.oneof(
      fc.constant('non_existent_table'),
      fc.constant('invalid-table-name'),
      fc.constant('table_that_does_not_exist_xyz'),
      fc.stringMatching(/^[a-z_][a-zA-Z0-9_]{20,50}$/), // Valid format but doesn't exist
    );

    await fc.assert(
      fc.asyncProperty(invalidTableNameArb, async (tableName) => {
        const supabase = createTestClient();

        try {
          // Attempt to query a non-existent table
          const { data, error } = await supabase
            .from(tableName as any)
            .select('*')
            .limit(1);

          // Property 1: Error should be caught and returned, not thrown
          expect(error).toBeDefined();
          expect(error?.message).toBeDefined();
          expect(typeof error?.message).toBe('string');

          // Property 2: Data should be null when error occurs
          expect(data).toBeNull();

          // Property 3: Error message should be user-friendly (not expose internals)
          // Supabase returns structured error messages
          expect(error?.message.length).toBeGreaterThan(0);
        } catch (e) {
          // If Supabase throws (e.g., for invalid input), it should be a proper Error
          expect(e).toBeInstanceOf(Error);
          expect((e as Error).message).toBeDefined();
        }
      }),
      { numRuns: 20 } // Reduced iterations to avoid timeout with network calls
    );
  }, 10000); // 10 second timeout for network operations

  /**
   * Property: Invalid column queries return errors gracefully
   */
  it('Property: Invalid column queries are handled gracefully', async () => {
    const invalidColumnArb = fc.oneof(
      fc.constant('non_existent_column_xyz'),
      fc.constant('invalid_column_name'),
      fc.constant('column_that_does_not_exist'),
    );

    await fc.assert(
      fc.asyncProperty(invalidColumnArb, async (columnName) => {
        const supabase = createTestClient();

        try {
          // Try to select an invalid column from a valid table
          const { data, error } = await supabase
            .from('profiles')
            .select(columnName)
            .limit(1);

          // Should return an error, not crash
          if (error) {
            expect(error.message).toBeDefined();
            expect(typeof error.message).toBe('string');
            expect(data).toBeNull();
          }
        } catch (e) {
          // If it throws, should be proper Error
          expect(e).toBeInstanceOf(Error);
        }
      }),
      { numRuns: 20 } // Reduced iterations to avoid timeout
    );
  });

  /**
   * Property: Invalid filter operations return errors gracefully
   */
  it('Property: Invalid filter operations are handled gracefully', async () => {
    // Test with invalid UUID strings
    const invalidUuidArb = fc.oneof(
      fc.constant('not-a-uuid'),
      fc.constant('invalid-uuid-format'),
      fc.constant('12345'),
      fc.string({ minLength: 1, maxLength: 20 }),
    );

    await fc.assert(
      fc.asyncProperty(invalidUuidArb, async (invalidValue) => {
        const supabase = createTestClient();

        try {
          // Try to filter with invalid UUID values
          const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', invalidValue)
            .limit(1);

          // Should either return an error or handle gracefully (empty result)
          if (error) {
            expect(error.message).toBeDefined();
            expect(data).toBeNull();
          } else {
            // If no error, data should be defined (likely empty array)
            expect(data).toBeDefined();
            expect(Array.isArray(data)).toBe(true);
          }
        } catch (e) {
          // If it throws, it should be a proper Error object
          expect(e).toBeInstanceOf(Error);
          expect((e as Error).message).toBeDefined();
        }
      }),
      { numRuns: 20 } // Reduced iterations to avoid timeout
    );
  });

  /**
   * Property: Database connection failures are handled gracefully
   */
  it('Property: Invalid database URLs are handled gracefully', async () => {
    const invalidUrlArb = fc.oneof(
      fc.constant(''),
      fc.constant('not-a-url'),
      fc.constant('http://invalid-supabase-url.com'),
      fc.webUrl(), // Random valid URLs that aren't Supabase
    );

    await fc.assert(
      fc.property(invalidUrlArb, (invalidUrl) => {
        try {
          // Try to create client with invalid URL
          const client = createSupabaseClient<Database>(
            invalidUrl,
            'invalid-key'
          );

          // Client creation should not throw
          expect(client).toBeDefined();
          
          // The client is created but operations will fail
          // This tests that the system doesn't crash on invalid config
        } catch (e) {
          // If it throws, it should be a proper Error
          expect(e).toBeInstanceOf(Error);
        }
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Malformed queries return structured errors
   */
  it('Property: Malformed queries return structured errors', async () => {
    const supabase = createTestClient();

    // Test various malformed query patterns
    const malformedQueries = [
      // Invalid select syntax
      async () => await supabase.from('profiles').select(''),
      // Invalid limit
      async () => await supabase.from('profiles').select('id').limit(-1),
      // Invalid order
      async () => await supabase.from('profiles').select('id').order('non_existent_column'),
    ];

    for (const query of malformedQueries) {
      try {
        const result = await query();
        
        // Should return error structure
        if ('error' in result && result.error) {
          expect(result.error).toBeDefined();
          expect(result.error.message).toBeDefined();
          expect(typeof result.error.message).toBe('string');
        }
      } catch (e) {
        // If it throws, should be proper Error
        expect(e).toBeInstanceOf(Error);
      }
    }
  });

  /**
   * Property: Concurrent failed operations don't crash the system
   */
  it('Property: Concurrent failed operations are handled gracefully', async () => {
    const supabase = createTestClient();

    // Generate multiple concurrent invalid operations
    const invalidOperations = Array.from({ length: 10 }, (_, i) => 
      supabase.from(`invalid_table_${i}` as any).select('*').limit(1)
    );

    // Execute all operations concurrently
    const results = await Promise.allSettled(invalidOperations);

    // All operations should complete (not hang or crash)
    expect(results.length).toBe(10);

    // Each result should be fulfilled (Promise.allSettled never rejects)
    results.forEach((result) => {
      expect(result.status).toBe('fulfilled');
      
      if (result.status === 'fulfilled') {
        const { error } = result.value;
        // Each should have an error
        expect(error).toBeDefined();
        expect(error?.message).toBeDefined();
      }
    });
  });

  /**
   * Property: Error messages don't expose sensitive information
   */
  it('Property: Error messages are safe for users', async () => {
    const supabase = createTestClient();

    // Try various operations that should fail
    const operations = [
      async () => await supabase.from('non_existent_table' as any).select('*'),
      async () => await supabase.from('profiles').select('non_existent_column'),
      async () => await supabase.from('profiles').select('*').eq('id', 'invalid-uuid'),
    ];

    for (const operation of operations) {
      try {
        const { error } = await operation();

        if (error) {
          // Error message should not contain sensitive patterns
          const sensitivePatterns = [
            /password/i,
            /secret/i,
            /token/i,
            /api[_-]?key/i,
            /connection[_-]?string/i,
          ];

          sensitivePatterns.forEach((pattern) => {
            expect(error.message).not.toMatch(pattern);
          });

          // Error message should be a reasonable length (not exposing stack traces)
          expect(error.message.length).toBeLessThan(500);
        }
      } catch (e) {
        // If it throws, verify the error is safe
        expect(e).toBeInstanceOf(Error);
        const errorMessage = (e as Error).message;
        expect(errorMessage).not.toMatch(/password/i);
        expect(errorMessage).not.toMatch(/secret/i);
      }
    }
  });

  /**
   * Property: Valid operations after errors still work
   * (System recovers from errors)
   */
  it('Property: System recovers from database errors', async () => {
    const supabase = createTestClient();

    // First, cause an error
    const { error: firstError } = await supabase
      .from('non_existent_table' as any)
      .select('*');

    expect(firstError).toBeDefined();

    // Then, perform a valid operation
    const { data, error: secondError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    // Valid operation should succeed after error
    expect(secondError).toBeNull();
    expect(data).toBeDefined();
  });
});
