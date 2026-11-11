/**
 * Property-Based Test for Validation Error Specificity
 * **Feature: auth-database-integration, Property 10: Validation error specificity**
 * 
 * Property 10: Validation error specificity
 * For any validation failure, the error message should identify the specific field 
 * that failed validation.
 * 
 * Validates: Requirements 5.3, 8.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateDateOfBirth,
  validateRequired,
  validateOTP,
} from '@/lib/auth/validation';

describe('Property 10: Validation error specificity', () => {
  /**
   * **Feature: auth-database-integration, Property 10: Validation error specificity**
   * 
   * For any invalid email, the error message should specifically mention "อีเมล" (email).
   * This ensures users know which field has the problem.
   */
  it('should identify email field in error messages for invalid emails', async () => {
    // Generator for invalid email addresses
    const invalidEmailArb = fc.oneof(
      // Missing @ symbol
      fc.stringMatching(/^[a-z0-9]{3,20}$/),
      // Missing domain
      fc.stringMatching(/^[a-z0-9]{3,10}@$/),
      // Missing TLD
      fc.stringMatching(/^[a-z0-9]{3,10}@[a-z0-9]{3,10}$/),
      // Empty string
      fc.constant(''),
      // Invalid characters
      fc.tuple(
        fc.stringMatching(/^[a-z0-9]{2,5}$/),
        fc.constantFrom('(', ')', '[', ']', '<', '>', ',', ';'),
        fc.stringMatching(/^[a-z0-9]{2,5}$/),
        fc.stringMatching(/^[a-z]{2,10}\.[a-z]{2,4}$/)
      ).map(([start, invalid, end, domain]) => `${start}${invalid}${end}@${domain}`)
    );

    await fc.assert(
      fc.property(invalidEmailArb, (email) => {
        const result = validateEmail(email);

        // Property: Error messages should identify the email field
        if (!result.isValid) {
          expect(result.errors.length).toBeGreaterThan(0);
          // All error messages should mention "อีเมล" (email in Thai)
          const hasEmailMention = result.errors.some(err => err.includes('อีเมล'));
          expect(hasEmailMention).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any invalid password, the error message should specifically mention "รหัสผ่าน" (password).
   * This ensures users know which field has the problem.
   */
  it('should identify password field in error messages for invalid passwords', async () => {
    // Generator for invalid passwords
    const invalidPasswordArb = fc.oneof(
      // Too short
      fc.stringMatching(/^[a-zA-Z0-9]{1,7}$/),
      // Too long
      fc.stringMatching(/^[a-zA-Z0-9]{129,150}$/),
      // No uppercase
      fc.stringMatching(/^[a-z0-9]{8,20}$/),
      // No lowercase
      fc.stringMatching(/^[A-Z0-9]{8,20}$/),
      // No numbers
      fc.stringMatching(/^[a-zA-Z]{8,20}$/),
      // Empty string
      fc.constant(''),
      // With null bytes
      fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9]{4,10}$/),
        fc.constantFrom('\0', '\x00')
      ).map(([base, nullByte]) => base + nullByte)
    );

    await fc.assert(
      fc.property(invalidPasswordArb, (password) => {
        const result = validatePassword(password);

        // Property: Error messages should identify the password field
        if (!result.isValid) {
          expect(result.errors.length).toBeGreaterThan(0);
          // All error messages should mention "รหัสผ่าน" (password in Thai)
          const hasPasswordMention = result.errors.some(err => err.includes('รหัสผ่าน'));
          expect(hasPasswordMention).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any invalid phone number, the error message should specifically mention 
   * "เบอร์โทรศัพท์" (phone number).
   */
  it('should identify phone field in error messages for invalid phone numbers', async () => {
    // Generator for invalid phone numbers
    const invalidPhoneArb = fc.oneof(
      // Too short
      fc.stringMatching(/^0[0-9]{1,8}$/),
      // Too long
      fc.stringMatching(/^0[0-9]{10,15}$/),
      // Doesn't start with 0
      fc.stringMatching(/^[1-9][0-9]{9}$/),
      // Contains letters
      fc.stringMatching(/^0[0-9a-z]{9}$/),
      // Empty string
      fc.constant(''),
      // Special characters
      fc.tuple(
        fc.constant('0'),
        fc.stringMatching(/^[0-9]{4}$/),
        fc.constantFrom('-', ' ', '.', '(', ')'),
        fc.stringMatching(/^[0-9]{4}$/)
      ).map(([start, mid, special, end]) => start + mid + special + end)
    );

    await fc.assert(
      fc.property(invalidPhoneArb, (phone) => {
        const result = validatePhoneNumber(phone);

        // Property: Error messages should identify the phone field
        if (!result.isValid) {
          expect(result.errors.length).toBeGreaterThan(0);
          // All error messages should mention "เบอร์โทรศัพท์" (phone in Thai)
          const hasPhoneMention = result.errors.some(err => err.includes('เบอร์โทรศัพท์'));
          expect(hasPhoneMention).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any invalid date of birth, the error message should specifically mention 
   * "วันเกิด" (date of birth).
   */
  it('should identify date of birth field in error messages for invalid dates', async () => {
    // Generator for invalid dates of birth
    const invalidDobArb = fc.oneof(
      // Future date
      fc.date({ min: new Date(Date.now() + 86400000), max: new Date(Date.now() + 365 * 86400000) })
        .map(d => d.toISOString().split('T')[0]),
      // Too recent (less than 5 years ago)
      fc.date({ min: new Date(Date.now() - 4 * 365 * 86400000), max: new Date() })
        .map(d => d.toISOString().split('T')[0]),
      // Too old (more than 100 years ago)
      fc.date({ min: new Date('1900-01-01'), max: new Date(Date.now() - 101 * 365 * 86400000) })
        .map(d => d.toISOString().split('T')[0]),
      // Empty string
      fc.constant(''),
      // Invalid format
      fc.stringMatching(/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/)
    );

    await fc.assert(
      fc.property(invalidDobArb, (dob) => {
        const result = validateDateOfBirth(dob);

        // Property: Error messages should identify the date of birth field
        if (!result.isValid) {
          expect(result.errors.length).toBeGreaterThan(0);
          // All error messages should mention "วันเกิด" or "วันที่" or "อายุ" (date/age in Thai)
          const hasDateMention = result.errors.some(err => 
            err.includes('วันเกิด') || err.includes('วันที่') || err.includes('อายุ')
          );
          expect(hasDateMention).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any invalid OTP, the error message should specifically mention "OTP" or "รหัส".
   */
  it('should identify OTP field in error messages for invalid OTPs', async () => {
    // Generator for invalid OTPs
    const invalidOtpArb = fc.oneof(
      // Too short
      fc.stringMatching(/^[0-9]{1,5}$/),
      // Too long
      fc.stringMatching(/^[0-9]{7,10}$/),
      // Contains letters
      fc.stringMatching(/^[0-9a-z]{6}$/),
      // Empty string
      fc.constant(''),
      // Special characters
      fc.tuple(
        fc.stringMatching(/^[0-9]{3}$/),
        fc.constantFrom('-', ' ', '.'),
        fc.stringMatching(/^[0-9]{3}$/)
      ).map(([start, special, end]) => start + special + end)
    );

    await fc.assert(
      fc.property(invalidOtpArb, (otp) => {
        const result = validateOTP(otp);

        // Property: Error messages should identify the OTP field
        if (!result.isValid) {
          expect(result.errors.length).toBeGreaterThan(0);
          // All error messages should mention "OTP" or "รหัส" (code in Thai)
          const hasOtpMention = result.errors.some(err => 
            err.includes('OTP') || err.includes('รหัส')
          );
          expect(hasOtpMention).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any required field validation failure, the error message should mention 
   * the specific field name provided.
   */
  it('should identify specific field name in required field validation errors', async () => {
    // Generator for field names and invalid values
    const fieldTestArb = fc.tuple(
      fc.constantFrom('ชื่อ', 'นามสกุล', 'ชื่อเล่น', 'ที่อยู่', 'หมายเหตุ'),
      fc.oneof(
        fc.constant(''),
        fc.constant('   '),
        fc.constant('\t\n')
      )
    );

    await fc.assert(
      fc.property(fieldTestArb, ([fieldName, value]) => {
        const result = validateRequired(value, fieldName);

        // Property: Error messages should identify the specific field
        if (!result.isValid) {
          expect(result.errors.length).toBeGreaterThan(0);
          // Error message should mention the field name
          const hasFieldMention = result.errors.some(err => err.includes(fieldName));
          expect(hasFieldMention).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that each validation function returns field-specific errors
   * This is a comprehensive test across all validators
   */
  it('should return field-specific errors for all validation functions', () => {
    // Test email validation
    const emailResult = validateEmail('invalid');
    expect(emailResult.isValid).toBe(false);
    expect(emailResult.errors.some(err => err.includes('อีเมล'))).toBe(true);

    // Test password validation
    const passwordResult = validatePassword('short');
    expect(passwordResult.isValid).toBe(false);
    expect(passwordResult.errors.some(err => err.includes('รหัสผ่าน'))).toBe(true);

    // Test phone validation
    const phoneResult = validatePhoneNumber('123');
    expect(phoneResult.isValid).toBe(false);
    expect(phoneResult.errors.some(err => err.includes('เบอร์โทรศัพท์'))).toBe(true);

    // Test date of birth validation
    const dobResult = validateDateOfBirth('2025-01-01');
    expect(dobResult.isValid).toBe(false);
    expect(dobResult.errors.some(err => 
      err.includes('วันเกิด') || err.includes('วันที่') || err.includes('อายุ')
    )).toBe(true);

    // Test OTP validation
    const otpResult = validateOTP('12');
    expect(otpResult.isValid).toBe(false);
    expect(otpResult.errors.some(err => 
      err.includes('OTP') || err.includes('รหัส')
    )).toBe(true);

    // Test required field validation
    const requiredResult = validateRequired('', 'ชื่อ');
    expect(requiredResult.isValid).toBe(false);
    expect(requiredResult.errors.some(err => err.includes('ชื่อ'))).toBe(true);
  });

  /**
   * Test that error messages are specific and not generic
   * Generic messages like "Invalid input" would fail this test
   */
  it('should not return generic error messages', async () => {
    // Test various invalid inputs
    const testCases = [
      { validator: validateEmail, input: 'invalid', fieldKeywords: ['อีเมล'] },
      { validator: validatePassword, input: 'short', fieldKeywords: ['รหัสผ่าน'] },
      { validator: validatePhoneNumber, input: '123', fieldKeywords: ['เบอร์โทรศัพท์'] },
      { validator: validateDateOfBirth, input: '2025-01-01', fieldKeywords: ['วันเกิด', 'วันที่', 'อายุ'] },
      { validator: validateOTP, input: '12', fieldKeywords: ['OTP', 'รหัส'] },
    ];

    testCases.forEach(({ validator, input, fieldKeywords }) => {
      const result = validator(input);
      
      if (!result.isValid) {
        // Each error should mention at least one field-specific keyword
        result.errors.forEach(error => {
          const hasFieldKeyword = fieldKeywords.some(keyword => error.includes(keyword));
          expect(hasFieldKeyword).toBe(true);
          
          // Should not be generic messages
          expect(error).not.toMatch(/^invalid$/i);
          expect(error).not.toMatch(/^error$/i);
          expect(error).not.toMatch(/^failed$/i);
        });
      }
    });
  });

  /**
   * Test that multiple validation errors all identify the same field
   * For example, a password that's too short AND missing uppercase should
   * have both errors mention "รหัสผ่าน"
   */
  it('should identify field in all error messages when multiple validations fail', () => {
    // Password with multiple issues: too short, no uppercase, no numbers
    const multiErrorPassword = 'short';
    const result = validatePassword(multiErrorPassword);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);

    // All errors should mention "รหัสผ่าน"
    result.errors.forEach(error => {
      expect(error).toContain('รหัสผ่าน');
    });
  });

  /**
   * Test that empty inputs return field-specific error messages
   */
  it('should return field-specific errors for empty inputs', () => {
    const emptyTests = [
      { validator: validateEmail, input: '', fieldKeyword: 'อีเมล' },
      { validator: validatePassword, input: '', fieldKeyword: 'รหัสผ่าน' },
      { validator: validatePhoneNumber, input: '', fieldKeyword: 'เบอร์โทรศัพท์' },
      { validator: validateDateOfBirth, input: '', fieldKeywords: ['วันเกิด', 'วันที่'] },
      { validator: validateOTP, input: '', fieldKeywords: ['OTP', 'รหัส'] },
    ];

    emptyTests.forEach(({ validator, input, fieldKeyword, fieldKeywords }) => {
      const result = validator(input);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      if (fieldKeyword) {
        expect(result.errors[0]).toContain(fieldKeyword);
      } else if (fieldKeywords) {
        const hasKeyword = fieldKeywords.some(kw => result.errors[0].includes(kw));
        expect(hasKeyword).toBe(true);
      }
    });
  });
});
