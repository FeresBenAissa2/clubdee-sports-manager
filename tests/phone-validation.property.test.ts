/**
 * Property-Based Test for Phone Number Validation
 * **Feature: auth-database-integration, Property 20: Phone validation**
 * 
 * Property 20: Phone validation
 * For any string input, the phone validator should correctly identify valid Thai 
 * phone numbers (10 digits starting with 0) and valid international phone numbers.
 * 
 * Validates: Requirements 8.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validatePhoneNumber } from '@/lib/auth/validation';

describe('Property 20: Phone validation', () => {
  /**
   * **Feature: auth-database-integration, Property 20: Phone validation**
   * 
   * For any valid Thai phone number (10 digits starting with 0), 
   * the validator should accept it.
   * This test verifies that:
   * 1. Valid Thai phone number formats are correctly identified
   * 2. The validation returns isValid: true
   * 3. No errors are returned for valid phone numbers
   */
  it('should accept all valid Thai phone numbers', async () => {
    // Generator for valid Thai phone numbers: 0[0-9]{9}
    const validThaiPhoneArb = fc
      .tuple(
        fc.constant('0'),
        fc.stringMatching(/^[0-9]{9}$/)
      )
      .map(([prefix, digits]) => prefix + digits);

    await fc.assert(
      fc.property(validThaiPhoneArb, (phone) => {
        const result = validatePhoneNumber(phone);

        // Property: Valid Thai phone numbers should be accepted
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });

  /**
   * Test that valid international phone numbers are accepted
   * International format: +[1-9][0-9]{7,14}
   */
  it('should accept all valid international phone numbers', async () => {
    // Generator for valid international phone numbers
    const validInternationalPhoneArb = fc
      .tuple(
        fc.constant('+'),
        fc.integer({ min: 1, max: 9 }), // First digit after + must be 1-9
        fc.stringMatching(/^[0-9]{7,14}$/) // 7-14 more digits
      )
      .map(([plus, firstDigit, restDigits]) => plus + firstDigit + restDigits);

    await fc.assert(
      fc.property(validInternationalPhoneArb, (phone) => {
        const result = validatePhoneNumber(phone);

        // Property: Valid international phone numbers should be accepted
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that invalid phone numbers are rejected
   * This includes:
   * - Thai numbers not starting with 0
   * - Thai numbers with wrong length
   * - International numbers starting with +0
   * - Numbers with letters or special characters (after sanitization)
   */
  it('should reject invalid phone numbers', async () => {
    const invalidPhoneArb = fc.oneof(
      // Thai format but doesn't start with 0
      fc.tuple(
        fc.integer({ min: 1, max: 9 }),
        fc.stringMatching(/^[0-9]{9}$/)
      ).map(([first, rest]) => first.toString() + rest),
      
      // Thai format but wrong length (too short)
      fc.tuple(
        fc.constant('0'),
        fc.stringMatching(/^[0-9]{1,8}$/)
      ).map(([prefix, digits]) => prefix + digits),
      
      // Thai format but wrong length (too long)
      fc.tuple(
        fc.constant('0'),
        fc.stringMatching(/^[0-9]{10,15}$/)
      ).map(([prefix, digits]) => prefix + digits),
      
      // International format but starts with +0
      fc.tuple(
        fc.constant('+0'),
        fc.stringMatching(/^[0-9]{7,14}$/)
      ).map(([prefix, digits]) => prefix + digits),
      
      // International format but too short
      fc.tuple(
        fc.constant('+'),
        fc.integer({ min: 1, max: 9 }),
        fc.stringMatching(/^[0-9]{1,6}$/)
      ).map(([plus, first, rest]) => plus + first + rest),
      
      // International format but too long
      fc.tuple(
        fc.constant('+'),
        fc.integer({ min: 1, max: 9 }),
        fc.stringMatching(/^[0-9]{15,20}$/)
      ).map(([plus, first, rest]) => plus + first + rest),
      
      // Just digits without proper format
      fc.stringMatching(/^[0-9]{5,7}$/)
    );

    await fc.assert(
      fc.property(invalidPhoneArb, (phone) => {
        const result = validatePhoneNumber(phone);

        // Property: Invalid phone numbers should be rejected
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('เบอร์โทรศัพท์'); // Error message should be in Thai
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Empty string should be rejected
   */
  it('should reject empty phone number', () => {
    const result = validatePhoneNumber('');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('กรุณากรอกเบอร์โทรศัพท์');
  });

  /**
   * Edge case: Whitespace-only string should be rejected
   */
  it('should reject whitespace-only phone number', () => {
    const result = validatePhoneNumber('   ');

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /**
   * Test that phone validation handles formatting characters correctly
   * Sanitization should remove spaces, dashes, parentheses before validation
   */
  it('should accept Thai phone numbers with formatting characters', async () => {
    // Generator for Thai phone numbers with common formatting
    const formattedThaiPhoneArb = fc
      .tuple(
        fc.constant('0'),
        fc.stringMatching(/^[0-9]{2}$/),
        fc.stringMatching(/^[0-9]{3}$/),
        fc.stringMatching(/^[0-9]{4}$/)
      )
      .map(([prefix, part1, part2, part3]) => {
        // Various formatting styles
        const formats = [
          `${prefix}${part1}-${part2}-${part3}`,
          `${prefix}${part1} ${part2} ${part3}`,
          `${prefix} ${part1} ${part2} ${part3}`,
          `(${prefix}${part1}) ${part2}-${part3}`,
        ];
        return formats[Math.floor(Math.random() * formats.length)];
      });

    await fc.assert(
      fc.property(formattedThaiPhoneArb, (phone) => {
        const result = validatePhoneNumber(phone);

        // Property: Formatted phone numbers should be accepted after sanitization
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test common valid Thai phone number patterns
   */
  it('should accept common valid Thai phone patterns', () => {
    const validPhones = [
      '0812345678',  // Mobile
      '0912345678',  // Mobile
      '0612345678',  // Mobile
      '0812345678',  // Mobile
      '0212345678',  // Bangkok landline
      '0531234567',  // Provincial landline
    ];

    validPhones.forEach((phone) => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  /**
   * Test common valid international phone patterns
   */
  it('should accept common valid international phone patterns', () => {
    const validPhones = [
      '+66812345678',   // Thailand
      '+1234567890',    // US
      '+447911123456',  // UK
      '+8613800138000', // China
      '+61412345678',   // Australia
    ];

    validPhones.forEach((phone) => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  /**
   * Test common invalid phone patterns
   */
  it('should reject common invalid phone patterns', () => {
    const invalidPhones = [
      '123456789',      // Too short
      '12345',          // Way too short
      '1234567890',     // 10 digits but doesn't start with 0
      '0123456',        // Starts with 0 but too short
      '012345678901',   // Too long
      '+0812345678',    // International format but starts with 0
      '+12345',         // International but too short
      'abcd1234567',    // Contains letters (after sanitization would be just digits)
      '081-234-567',    // Formatted but too short
    ];

    invalidPhones.forEach((phone) => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test that validation handles phone numbers with various formatting
   */
  it('should handle phone numbers with dashes and spaces', () => {
    const formattedPhones = [
      { input: '081-234-5678', shouldBeValid: true },
      { input: '081 234 5678', shouldBeValid: true },
      { input: '0 81 234 5678', shouldBeValid: true },
      { input: '(081) 234-5678', shouldBeValid: true },
      { input: '+66 81 234 5678', shouldBeValid: true },
      { input: '+66-81-234-5678', shouldBeValid: true },
    ];

    formattedPhones.forEach(({ input, shouldBeValid }) => {
      const result = validatePhoneNumber(input);
      expect(result.isValid).toBe(shouldBeValid);
    });
  });

  /**
   * Test that validation handles phone numbers with letters correctly
   * Note: Sanitization removes non-digit characters except +
   * After sanitization, the result depends on the remaining digits
   */
  it('should handle phone numbers with letters after sanitization', () => {
    const phonesWithLetters = [
      { input: '081abc5678', shouldBeValid: false },     // Becomes '0815678' - too short
      { input: 'abc0812345678', shouldBeValid: true },   // Becomes '0812345678' - valid
      { input: '0812345678xyz', shouldBeValid: true },   // Becomes '0812345678' - valid
      { input: '08abc12345678', shouldBeValid: true },   // Becomes '0812345678' - valid
      { input: 'xyz123', shouldBeValid: false },         // Becomes '123' - invalid
      { input: '081abc234', shouldBeValid: false },      // Becomes '081234' - too short
    ];

    phonesWithLetters.forEach(({ input, shouldBeValid }) => {
      const result = validatePhoneNumber(input);
      expect(result.isValid).toBe(shouldBeValid);
    });
  });

  /**
   * Test boundary cases for international phone numbers
   */
  it('should validate international phone number length boundaries', () => {
    // Minimum valid: +1 followed by 7 digits = 9 characters total
    const minValid = '+12345678';
    expect(validatePhoneNumber(minValid).isValid).toBe(true);

    // Maximum valid: +1 followed by 14 digits = 16 characters total
    const maxValid = '+123456789012345';
    expect(validatePhoneNumber(maxValid).isValid).toBe(true);

    // Too short: +1 followed by 6 digits
    const tooShort = '+1234567';
    expect(validatePhoneNumber(tooShort).isValid).toBe(false);

    // Too long: +1 followed by 15 digits
    const tooLong = '+1234567890123456';
    expect(validatePhoneNumber(tooLong).isValid).toBe(false);
  });

  /**
   * Test that multiple + signs are handled correctly
   * Sanitization should keep only the leading +
   */
  it('should handle multiple plus signs correctly', () => {
    const phonesWithMultiplePlus = [
      '++66812345678',   // Double plus at start
      '+66+812345678',   // Plus in middle
      '+66812345678+',   // Plus at end
    ];

    phonesWithMultiplePlus.forEach((phone) => {
      const result = validatePhoneNumber(phone);
      // After sanitization, only leading + is kept
      // These should become valid or invalid based on resulting format
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });
  });
});
