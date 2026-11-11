/**
 * Property-Based Test for Password Validation
 * **Feature: auth-database-integration, Property 19: Password validation**
 * 
 * Property 19: Password validation
 * For any string input, the password validator should correctly enforce all strength 
 * requirements (length, uppercase, lowercase, numbers, special chars).
 * 
 * Validates: Requirements 8.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validatePassword } from '@/lib/auth/validation';

describe('Property 19: Password validation', () => {
  /**
   * **Feature: auth-database-integration, Property 19: Password validation**
   * 
   * For any password that meets all requirements, the validator should accept it.
   * Requirements:
   * - Minimum 8 characters
   * - Maximum 128 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   * - Special characters are optional (requireSpecialChars: false)
   */
  it('should accept passwords that meet all requirements', async () => {
    // Generator for valid passwords
    const validPasswordArb = fc
      .tuple(
        // Base string with mixed case and numbers (8-120 chars to leave room for required chars)
        fc.stringMatching(/^[a-zA-Z0-9]{4,116}$/),
        // Ensure at least one uppercase
        fc.stringMatching(/^[A-Z]$/),
        // Ensure at least one lowercase
        fc.stringMatching(/^[a-z]$/),
        // Ensure at least one number
        fc.stringMatching(/^[0-9]$/),
        // Optional special characters
        fc.array(fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*'), { maxLength: 4 })
      )
      .map(([base, upper, lower, num, special]) => {
        // Shuffle all parts together to create a valid password
        const parts = [base, upper, lower, num, ...special];
        return parts.sort(() => Math.random() - 0.5).join('');
      })
      .filter(pwd => pwd.length >= 8 && pwd.length <= 128);

    await fc.assert(
      fc.property(validPasswordArb, (password) => {
        const result = validatePassword(password);

        // Property: Valid passwords should be accepted
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });

  /**
   * Test that passwords shorter than minimum length are rejected
   */
  it('should reject passwords shorter than 8 characters', async () => {
    // Generator for short passwords (1-7 characters)
    const shortPasswordArb = fc.stringMatching(/^[a-zA-Z0-9]{1,7}$/);

    await fc.assert(
      fc.property(shortPasswordArb, (password) => {
        const result = validatePassword(password);

        // Property: Short passwords should be rejected
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(err => err.includes('อย่างน้อย'))).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that passwords longer than maximum length are rejected
   */
  it('should reject passwords longer than 128 characters', async () => {
    // Generator for long passwords (129-150 characters)
    const longPasswordArb = fc
      .tuple(
        fc.stringMatching(/^[a-zA-Z0-9]{125,146}$/),
        fc.stringMatching(/^[A-Z]$/),
        fc.stringMatching(/^[a-z]$/),
        fc.stringMatching(/^[0-9]$/)
      )
      .map(([base, upper, lower, num]) => base + upper + lower + num)
      .filter(pwd => pwd.length > 128);

    await fc.assert(
      fc.property(longPasswordArb, (password) => {
        const result = validatePassword(password);

        // Property: Long passwords should be rejected
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(err => err.includes('ไม่เกิน 128'))).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that passwords without uppercase letters are rejected
   */
  it('should reject passwords without uppercase letters', async () => {
    // Generator for passwords with lowercase and numbers but no uppercase
    const noUppercaseArb = fc
      .tuple(
        fc.stringMatching(/^[a-z0-9]{7,20}$/),
        fc.stringMatching(/^[0-9]$/)
      )
      .map(([base, num]) => base + num)
      .filter(pwd => pwd.length >= 8 && !/[A-Z]/.test(pwd));

    await fc.assert(
      fc.property(noUppercaseArb, (password) => {
        const result = validatePassword(password);

        // Property: Passwords without uppercase should be rejected
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(err => err.includes('พิมพ์ใหญ่'))).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that passwords without lowercase letters are rejected
   */
  it('should reject passwords without lowercase letters', async () => {
    // Generator for passwords with uppercase and numbers but no lowercase
    const noLowercaseArb = fc
      .tuple(
        fc.stringMatching(/^[A-Z0-9]{7,20}$/),
        fc.stringMatching(/^[0-9]$/)
      )
      .map(([base, num]) => base + num)
      .filter(pwd => pwd.length >= 8 && !/[a-z]/.test(pwd));

    await fc.assert(
      fc.property(noLowercaseArb, (password) => {
        const result = validatePassword(password);

        // Property: Passwords without lowercase should be rejected
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(err => err.includes('พิมพ์เล็ก'))).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that passwords without numbers are rejected
   */
  it('should reject passwords without numbers', async () => {
    // Generator for passwords with letters but no numbers
    const noNumbersArb = fc
      .tuple(
        fc.stringMatching(/^[a-z]{4,10}$/),
        fc.stringMatching(/^[A-Z]{4,10}$/)
      )
      .map(([lower, upper]) => lower + upper)
      .filter(pwd => pwd.length >= 8 && !/\d/.test(pwd));

    await fc.assert(
      fc.property(noNumbersArb, (password) => {
        const result = validatePassword(password);

        // Property: Passwords without numbers should be rejected
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(err => err.includes('ตัวเลข'))).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that passwords with null bytes are rejected
   */
  it('should reject passwords with null bytes', async () => {
    // Generator for passwords with null bytes
    const nullBytePasswordArb = fc
      .tuple(
        fc.stringMatching(/^[a-zA-Z0-9]{4,10}$/),
        fc.constantFrom('\0', '\x00'),
        fc.stringMatching(/^[a-zA-Z0-9]{4,10}$/)
      )
      .map(([start, nullByte, end]) => start + nullByte + end);

    await fc.assert(
      fc.property(nullBytePasswordArb, (password) => {
        const result = validatePassword(password);

        // Property: Passwords with null bytes should be rejected
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(err => err.includes('ไม่อนุญาต'))).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Empty string should be rejected
   */
  it('should reject empty password', () => {
    const result = validatePassword('');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('กรุณากรอกรหัสผ่าน');
  });

  /**
   * Test common valid password patterns
   */
  it('should accept common valid password patterns', () => {
    const validPasswords = [
      'Password1',
      'MyPass123',
      'Test1234',
      'Secure99',
      'Valid8Pass',
      'Example1',
      'Strong123',
      'Pass1word',
    ];

    validPasswords.forEach((password) => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  /**
   * Test common invalid password patterns
   */
  it('should reject common invalid password patterns', () => {
    const invalidPasswords = [
      'short',              // Too short
      'password',           // No uppercase, no numbers
      'PASSWORD',           // No lowercase, no numbers
      '12345678',           // No letters
      'Password',           // No numbers
      'password1',          // No uppercase
      'PASSWORD1',          // No lowercase
    ];

    invalidPasswords.forEach((password) => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test that passwords with special characters are accepted
   * (special chars are optional, so they should not cause rejection)
   */
  it('should accept passwords with special characters', () => {
    const passwordsWithSpecialChars = [
      'Password1!',
      'MyPass@123',
      'Test#1234',
      'Secure$99',
      'Valid%8Pass',
      'Example^1',
      'Strong&123',
      'Pass*1word',
    ];

    passwordsWithSpecialChars.forEach((password) => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  /**
   * Test boundary cases for password length
   */
  it('should handle password length boundaries correctly', () => {
    // Exactly 8 characters (minimum) - valid
    const minValid = 'Pass1234';
    expect(validatePassword(minValid).isValid).toBe(true);

    // 7 characters - invalid
    const tooShort = 'Pass123';
    expect(validatePassword(tooShort).isValid).toBe(false);

    // Exactly 128 characters (maximum) - valid
    const maxValid = 'A1' + 'a'.repeat(126);
    expect(validatePassword(maxValid).isValid).toBe(true);

    // 129 characters - invalid
    const tooLong = 'A1' + 'a'.repeat(127);
    expect(validatePassword(tooLong).isValid).toBe(false);
  });

  /**
   * Test that all error messages are in Thai
   */
  it('should return error messages in Thai', async () => {
    const invalidPasswordArb = fc.oneof(
      fc.stringMatching(/^[a-z]{1,7}$/),        // Too short, no uppercase, no numbers
      fc.stringMatching(/^[a-z0-9]{8,20}$/),    // No uppercase
      fc.stringMatching(/^[A-Z0-9]{8,20}$/),    // No lowercase
      fc.stringMatching(/^[a-zA-Z]{8,20}$/)     // No numbers
    );

    await fc.assert(
      fc.property(invalidPasswordArb, (password) => {
        const result = validatePassword(password);

        if (!result.isValid) {
          // Property: All error messages should be in Thai
          result.errors.forEach(error => {
            // Check that error contains Thai characters or common Thai words
            const hasThai = /[\u0E00-\u0E7F]/.test(error) || 
                           error.includes('กรุณา') || 
                           error.includes('ต้อง') ||
                           error.includes('อย่างน้อย');
            expect(hasThai).toBe(true);
          });
        }
      }),
      { numRuns: 100 }
    );
  });
});
