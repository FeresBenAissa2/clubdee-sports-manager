/**
 * Property-Based Test for Email Validation
 * **Feature: auth-database-integration, Property 18: Email validation**
 * 
 * Property 18: Email validation
 * For any string input, the email validator should correctly identify valid email 
 * formats and reject invalid ones.
 * 
 * Validates: Requirements 8.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateEmail } from '@/lib/auth/validation';

describe('Property 18: Email validation', () => {
  /**
   * **Feature: auth-database-integration, Property 18: Email validation**
   * 
   * For any valid email address, the validator should accept it.
   * This test verifies that:
   * 1. Valid email formats are correctly identified
   * 2. The validation returns isValid: true
   * 3. No errors are returned for valid emails
   */
  it('should accept all valid email formats', async () => {
    // Generator for valid email addresses matching the actual regex
    // The validator allows: a-z0-9!#$%&'*+/=?^_`{|}~- in local part
    // No consecutive dots, must have domain with at least one dot
    const validEmailArb = fc
      .tuple(
        // Local part: start with alphanumeric
        fc.stringMatching(/^[a-z0-9]{1}$/),
        // Middle part: alphanumeric with optional dots (but not consecutive)
        fc.array(
          fc.oneof(
            fc.stringMatching(/^[a-z0-9]{1,5}$/),
            fc.tuple(
              fc.constant('.'),
              fc.stringMatching(/^[a-z0-9]{1,5}$/)
            ).map(([dot, str]) => dot + str)
          ),
          { minLength: 0, maxLength: 3 }
        ).map(parts => parts.join('')),
        // Domain: alphanumeric with optional hyphens (not at start/end)
        fc.stringMatching(/^[a-z0-9]{1}[a-z0-9-]{0,10}[a-z0-9]{1}$/),
        // TLD: 2-6 letters
        fc.stringMatching(/^[a-z]{2,6}$/)
      )
      .map(([start, middle, domain, tld]) => `${start}${middle}@${domain}.${tld}`);

    await fc.assert(
      fc.property(validEmailArb, (email) => {
        const result = validateEmail(email);

        // Property: Valid emails should be accepted
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });

  /**
   * Test that invalid email formats are rejected
   * This includes emails without @, without domain, with invalid characters, etc.
   * Note: Spaces are removed by sanitization, so we don't test them here
   */
  it('should reject invalid email formats', async () => {
    // Generator for invalid email addresses
    // Note: The validator allows many special chars per RFC 5322, so we test truly invalid patterns
    // We exclude spaces since sanitization removes them before validation
    const invalidEmailArb = fc.oneof(
      // Missing @ symbol
      fc.stringMatching(/^[a-z0-9]{3,20}$/),
      // Missing domain
      fc.stringMatching(/^[a-z0-9]{3,10}@$/),
      // Missing TLD (no dot in domain)
      fc.stringMatching(/^[a-z0-9]{3,10}@[a-z0-9]{3,10}$/),
      // Invalid characters that are NOT allowed (excluding spaces which are sanitized)
      fc.tuple(
        fc.stringMatching(/^[a-z0-9]{2,5}$/),
        fc.constantFrom('(', ')', '[', ']', '<', '>', ',', ';', ':', '\\', '"'),
        fc.stringMatching(/^[a-z0-9]{2,5}$/),
        fc.stringMatching(/^[a-z]{2,10}\.[a-z]{2,4}$/)
      ).map(([start, invalid, end, domain]) => `${start}${invalid}${end}@${domain}`),
      // Multiple @ symbols
      fc.tuple(
        fc.stringMatching(/^[a-z0-9]{3,8}$/),
        fc.stringMatching(/^[a-z0-9]{3,8}$/),
        fc.stringMatching(/^[a-z]{2,10}\.[a-z]{2,4}$/)
      ).map(([part1, part2, domain]) => `${part1}@${part2}@${domain}`),
      // Starts with dot
      fc.tuple(
        fc.stringMatching(/^[a-z0-9]{3,10}$/),
        fc.stringMatching(/^[a-z]{2,10}\.[a-z]{2,4}$/)
      ).map(([local, domain]) => `.${local}@${domain}`),
      // Ends with dot
      fc.tuple(
        fc.stringMatching(/^[a-z0-9]{3,10}$/),
        fc.stringMatching(/^[a-z]{2,10}\.[a-z]{2,4}$/)
      ).map(([local, domain]) => `${local}.@${domain}`),
      // Consecutive dots
      fc.tuple(
        fc.stringMatching(/^[a-z0-9]{2,5}$/),
        fc.stringMatching(/^[a-z0-9]{2,5}$/),
        fc.stringMatching(/^[a-z]{2,10}\.[a-z]{2,4}$/)
      ).map(([start, end, domain]) => `${start}..${end}@${domain}`)
    );

    await fc.assert(
      fc.property(invalidEmailArb, (email) => {
        const result = validateEmail(email);

        // Property: Invalid emails should be rejected
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('อีเมล'); // Error message should be in Thai
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Empty string should be rejected
   */
  it('should reject empty email', () => {
    const result = validateEmail('');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('กรุณากรอกอีเมล');
  });

  /**
   * Edge case: Whitespace-only string should be rejected
   */
  it('should reject whitespace-only email', () => {
    const result = validateEmail('   ');

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /**
   * Test that email validation is case-insensitive
   * Emails should be accepted regardless of case
   */
  it('should accept emails regardless of case', async () => {
    const emailArb = fc
      .tuple(
        fc.stringMatching(/^[a-zA-Z0-9]{5,10}$/),
        fc.stringMatching(/^[a-zA-Z0-9]{3,8}$/),
        fc.constantFrom('com', 'org', 'net', 'edu')
      )
      .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

    await fc.assert(
      fc.property(emailArb, (email) => {
        const result = validateEmail(email);

        // Property: Email validation should be case-insensitive
        // The sanitization converts to lowercase, so all valid formats should pass
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test common valid email patterns
   */
  it('should accept common valid email patterns', () => {
    const validEmails = [
      'user@example.com',
      'test.user@example.com',
      'user+tag@example.com',
      'user_name@example.com',
      'user-name@example.com',
      'user123@example.com',
      'a@example.com',
      'user@sub.example.com',
      'user@example.co.uk',
    ];

    validEmails.forEach((email) => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  /**
   * Test common invalid email patterns
   * Note: Spaces are removed by sanitization, so they don't cause validation failures
   */
  it('should reject common invalid email patterns', () => {
    const invalidEmails = [
      'notanemail',           // No @ symbol
      '@example.com',         // No local part
      'user@',                // No domain
      'user@example',         // No TLD
      'user..name@example.com', // Consecutive dots
      '.user@example.com',    // Starts with dot
      'user.@example.com',    // Ends with dot
      'user@@example.com',    // Multiple @ symbols
    ];

    invalidEmails.forEach((email) => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test that validation handles special characters correctly
   */
  it('should handle allowed special characters in local part', () => {
    const validSpecialChars = [
      'user.name@example.com',
      'user_name@example.com',
      'user-name@example.com',
      'user+tag@example.com',
    ];

    validSpecialChars.forEach((email) => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(true);
    });
  });

  /**
   * Test that validation rejects truly disallowed special characters
   * Note: RFC 5322 allows many special chars like !#$%&'*+/=?^_`{|}~-
   * Spaces are removed by sanitization, so we test other invalid chars
   */
  it('should reject disallowed special characters', () => {
    const invalidSpecialChars = [
      'user(name)@example.com', // parentheses
      'user[name]@example.com', // brackets
      'user<name>@example.com', // angle brackets
      'user,name@example.com',  // comma
      'user;name@example.com',  // semicolon
      'user:name@example.com',  // colon
      'user\\name@example.com', // backslash
      'user"name@example.com',  // quote
    ];

    invalidSpecialChars.forEach((email) => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(false);
    });
  });
});
