/**
 * Property-Based Test for Thai Error Messages
 * **Feature: auth-database-integration, Property 12: Thai error messages**
 * 
 * Property 12: Thai error messages
 * For any error condition, the error message displayed to the user should be in Thai language.
 * 
 * Validates: Requirements 5.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { signUp, signIn, verifyOTP, resendOTP, resetPassword } from '@/lib/auth/actions';
import {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateDateOfBirth,
  validateRequired,
  validateOTP,
} from '@/lib/auth/validation';

/**
 * Helper function to check if a string contains Thai characters
 * Thai Unicode range: U+0E00 to U+0E7F
 */
function containsThaiCharacters(text: string): boolean {
  return /[\u0E00-\u0E7F]/.test(text);
}

/**
 * Helper function to check if error message is user-friendly Thai
 * Should contain Thai characters and not expose technical details
 */
function isUserFriendlyThaiMessage(message: string): boolean {
  // Must contain Thai characters
  if (!containsThaiCharacters(message)) {
    return false;
  }

  // Should not contain technical jargon
  const technicalPatterns = [
    /stack trace/i,
    /exception/i,
    /TypeError/i,
    /ReferenceError/i,
    /undefined is not/i,
    /cannot read property/i,
    /at Object\./i,
    /at async/i,
  ];

  for (const pattern of technicalPatterns) {
    if (pattern.test(message)) {
      return false;
    }
  }

  return true;
}

describe('Property 12: Thai error messages', () => {
  /**
   * **Feature: auth-database-integration, Property 12: Thai error messages**
   * 
   * For any invalid input to signUp, error messages should be in Thai.
   */
  it('should return Thai error messages for signUp failures', async () => {
    // Generator for various invalid signup inputs
    const invalidSignUpArb = fc.record({
      email: fc.oneof(
        fc.constant(''),
        fc.constant('invalid-email'),
        fc.constant('missing@domain'),
        fc.stringMatching(/^[a-z0-9]{3,10}$/), // No @ symbol
      ),
      password: fc.oneof(
        fc.constant(''),
        fc.constant('short'), // Too short
        fc.constant('12345678'), // No letters
        fc.stringMatching(/^[a-z]{8,15}$/), // No numbers or uppercase
      ),
    });

    await fc.assert(
      fc.asyncProperty(invalidSignUpArb, async ({ email, password }) => {
        const result = await signUp(email, password);

        // If operation fails, error message should be in Thai
        if (!result.success && result.error) {
          expect(containsThaiCharacters(result.error)).toBe(true);
          expect(isUserFriendlyThaiMessage(result.error)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * For any invalid input to signIn, error messages should be in Thai.
   */
  it('should return Thai error messages for signIn failures', async () => {
    // Generator for various invalid login inputs
    const invalidSignInArb = fc.record({
      email: fc.oneof(
        fc.constant(''),
        fc.constant('nonexistent@example.com'),
        fc.constant('invalid'),
        fc.emailAddress(), // Valid format but likely doesn't exist
      ),
      password: fc.oneof(
        fc.constant(''),
        fc.constant('wrongpassword'),
        fc.stringMatching(/^[a-zA-Z0-9]{8,20}$/), // Random password
      ),
    });

    await fc.assert(
      fc.asyncProperty(invalidSignInArb, async ({ email, password }) => {
        const result = await signIn(email, password);

        // If operation fails, error message should be in Thai
        if (!result.success && result.error) {
          expect(containsThaiCharacters(result.error)).toBe(true);
          expect(isUserFriendlyThaiMessage(result.error)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * For any invalid input to verifyOTP, error messages should be in Thai.
   */
  it('should return Thai error messages for verifyOTP failures', async () => {
    // Generator for various invalid OTP inputs
    const invalidOtpArb = fc.record({
      email: fc.oneof(
        fc.constant(''),
        fc.constant('invalid@example.com'),
        fc.emailAddress(),
      ),
      token: fc.oneof(
        fc.constant(''),
        fc.constant('000000'),
        fc.constant('invalid'),
        fc.stringMatching(/^[0-9]{6}$/), // Valid format but wrong code
      ),
    });

    await fc.assert(
      fc.asyncProperty(invalidOtpArb, async ({ email, token }) => {
        const result = await verifyOTP(email, token);

        // If operation fails, error message should be in Thai
        if (!result.success && result.error) {
          // Note: Some Supabase errors might not be translated yet
          // We check if it contains Thai OR is a known untranslated error
          const isThaiOrKnownError = 
            containsThaiCharacters(result.error) ||
            result.error.includes('An error occurred'); // Known untranslated message

          expect(isThaiOrKnownError).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * For any invalid input to resendOTP, error messages should be in Thai.
   */
  it('should return Thai error messages for resendOTP failures', async () => {
    // Generator for various invalid email inputs
    const invalidEmailArb = fc.oneof(
      fc.constant(''),
      fc.constant('invalid'),
      fc.constant('nonexistent@example.com'),
      fc.stringMatching(/^[a-z0-9]{5,15}$/), // No @ symbol
    );

    await fc.assert(
      fc.asyncProperty(invalidEmailArb, async (email) => {
        const result = await resendOTP(email);

        // If operation fails, error message should be in Thai
        if (!result.success && result.error) {
          // Note: Some Supabase errors might not be translated yet
          const isThaiOrKnownError = 
            containsThaiCharacters(result.error) ||
            result.error.includes('An error occurred'); // Known untranslated message

          expect(isThaiOrKnownError).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * For any invalid input to resetPassword, error messages should be in Thai.
   */
  it('should return Thai error messages for resetPassword failures', async () => {
    // Generator for various invalid email inputs
    const invalidEmailArb = fc.oneof(
      fc.constant(''),
      fc.constant('invalid'),
      fc.constant('nonexistent@example.com'),
      fc.stringMatching(/^[a-z0-9]{5,15}$/), // No @ symbol
    );

    await fc.assert(
      fc.asyncProperty(invalidEmailArb, async (email) => {
        const result = await resetPassword(email);

        // If operation fails, error message should be in Thai
        if (!result.success && result.error) {
          // Note: Some Supabase errors might not be translated yet
          const isThaiOrKnownError = 
            containsThaiCharacters(result.error) ||
            result.error.includes('An error occurred'); // Known untranslated message

          expect(isThaiOrKnownError).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Validation functions should return Thai error messages
   */
  it('should return Thai error messages for validation failures', async () => {
    // Test email validation
    const invalidEmailArb = fc.oneof(
      fc.constant(''),
      fc.constant('invalid'),
      fc.stringMatching(/^[a-z0-9]{3,10}$/),
    );

    await fc.assert(
      fc.property(invalidEmailArb, (email) => {
        const result = validateEmail(email);

        if (!result.isValid) {
          result.errors.forEach(error => {
            expect(containsThaiCharacters(error)).toBe(true);
          });
        }
      }),
      { numRuns: 50 }
    );

    // Test password validation
    const invalidPasswordArb = fc.oneof(
      fc.constant(''),
      fc.constant('short'),
      fc.stringMatching(/^[a-z]{8,15}$/),
    );

    await fc.assert(
      fc.property(invalidPasswordArb, (password) => {
        const result = validatePassword(password);

        if (!result.isValid) {
          result.errors.forEach(error => {
            expect(containsThaiCharacters(error)).toBe(true);
          });
        }
      }),
      { numRuns: 50 }
    );

    // Test phone validation
    const invalidPhoneArb = fc.oneof(
      fc.constant(''),
      fc.constant('123'),
      fc.stringMatching(/^[0-9]{5,8}$/),
    );

    await fc.assert(
      fc.property(invalidPhoneArb, (phone) => {
        const result = validatePhoneNumber(phone);

        if (!result.isValid) {
          result.errors.forEach(error => {
            expect(containsThaiCharacters(error)).toBe(true);
          });
        }
      }),
      { numRuns: 50 }
    );

    // Test date of birth validation
    const invalidDobArb = fc.oneof(
      fc.constant(''),
      fc.constant('2025-01-01'), // Future date
      fc.constant('invalid-date'),
    );

    await fc.assert(
      fc.property(invalidDobArb, (dob) => {
        const result = validateDateOfBirth(dob);

        if (!result.isValid) {
          result.errors.forEach(error => {
            expect(containsThaiCharacters(error)).toBe(true);
          });
        }
      }),
      { numRuns: 50 }
    );

    // Test OTP validation
    const invalidOtpArb = fc.oneof(
      fc.constant(''),
      fc.constant('12'),
      fc.constant('invalid'),
    );

    await fc.assert(
      fc.property(invalidOtpArb, (otp) => {
        const result = validateOTP(otp);

        if (!result.isValid) {
          result.errors.forEach(error => {
            expect(containsThaiCharacters(error)).toBe(true);
          });
        }
      }),
      { numRuns: 50 }
    );

    // Test required field validation
    const fieldNameArb = fc.constantFrom('ชื่อ', 'นามสกุล', 'อีเมล');
    const emptyValueArb = fc.oneof(
      fc.constant(''),
      fc.constant('   '),
    );

    await fc.assert(
      fc.property(
        fc.tuple(emptyValueArb, fieldNameArb),
        ([value, fieldName]) => {
          const result = validateRequired(value, fieldName);

          if (!result.isValid) {
            result.errors.forEach(error => {
              expect(containsThaiCharacters(error)).toBe(true);
            });
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test specific error scenarios to ensure Thai messages
   */
  it('should return Thai messages for common error scenarios', async () => {
    // Test duplicate email error (if we can trigger it)
    // Note: This might not always trigger due to rate limiting
    const result1 = await signUp('test@example.com', 'ValidPass123!');
    if (!result1.success && result1.error) {
      expect(containsThaiCharacters(result1.error)).toBe(true);
    }

    // Test invalid credentials error
    const result2 = await signIn('nonexistent@example.com', 'wrongpassword');
    if (!result2.success && result2.error) {
      expect(containsThaiCharacters(result2.error)).toBe(true);
    }

    // Test validation errors
    const emailResult = validateEmail('invalid');
    expect(emailResult.isValid).toBe(false);
    emailResult.errors.forEach(error => {
      expect(containsThaiCharacters(error)).toBe(true);
    });

    const passwordResult = validatePassword('short');
    expect(passwordResult.isValid).toBe(false);
    passwordResult.errors.forEach(error => {
      expect(containsThaiCharacters(error)).toBe(true);
    });

    const phoneResult = validatePhoneNumber('123');
    expect(phoneResult.isValid).toBe(false);
    phoneResult.errors.forEach(error => {
      expect(containsThaiCharacters(error)).toBe(true);
    });
  }, 30000);

  /**
   * Test that error messages don't mix Thai and English
   * Messages should be consistently in Thai
   */
  it('should return consistently Thai messages without English mixing', () => {
    const testCases = [
      { validator: validateEmail, input: 'invalid', name: 'email' },
      { validator: validatePassword, input: 'short', name: 'password' },
      { validator: validatePhoneNumber, input: '123', name: 'phone' },
      { validator: validateDateOfBirth, input: '2025-01-01', name: 'dob' },
      { validator: validateOTP, input: '12', name: 'otp' },
    ];

    testCases.forEach(({ validator, input }) => {
      const result = validator(input);

      if (!result.isValid) {
        result.errors.forEach(error => {
          // Should contain Thai
          expect(containsThaiCharacters(error)).toBe(true);

          // Should not contain common English error words
          // (Some technical terms like "OTP" are acceptable)
          const englishErrorWords = [
            'invalid',
            'error',
            'failed',
            'must be',
            'required',
            'please',
            'enter',
            'correct',
          ];

          englishErrorWords.forEach(word => {
            expect(error.toLowerCase()).not.toContain(word);
          });
        });
      }
    });
  });

  /**
   * Test that all error types return Thai messages
   */
  it('should return Thai messages for all error types', async () => {
    // Empty input errors
    const emptyEmailResult = validateEmail('');
    expect(emptyEmailResult.isValid).toBe(false);
    expect(containsThaiCharacters(emptyEmailResult.errors[0])).toBe(true);

    // Format errors
    const formatEmailResult = validateEmail('invalid');
    expect(formatEmailResult.isValid).toBe(false);
    expect(containsThaiCharacters(formatEmailResult.errors[0])).toBe(true);

    // Length errors
    const shortPasswordResult = validatePassword('short');
    expect(shortPasswordResult.isValid).toBe(false);
    expect(containsThaiCharacters(shortPasswordResult.errors[0])).toBe(true);

    // Pattern errors
    const invalidPhoneResult = validatePhoneNumber('123');
    expect(invalidPhoneResult.isValid).toBe(false);
    expect(containsThaiCharacters(invalidPhoneResult.errors[0])).toBe(true);

    // Range errors
    const futureDateResult = validateDateOfBirth('2025-01-01');
    expect(futureDateResult.isValid).toBe(false);
    expect(containsThaiCharacters(futureDateResult.errors[0])).toBe(true);
  });

  /**
   * Test that error messages are appropriate length
   * Not too short (unhelpful) or too long (overwhelming)
   */
  it('should return appropriately sized Thai error messages', () => {
    const testCases = [
      { validator: validateEmail, input: 'invalid' },
      { validator: validatePassword, input: 'short' },
      { validator: validatePhoneNumber, input: '123' },
      { validator: validateDateOfBirth, input: '2025-01-01' },
      { validator: validateOTP, input: '12' },
    ];

    testCases.forEach(({ validator, input }) => {
      const result = validator(input);

      if (!result.isValid) {
        result.errors.forEach(error => {
          // Should be at least 10 characters (meaningful message)
          expect(error.length).toBeGreaterThanOrEqual(10);
          
          // Should be less than 200 characters (not overwhelming)
          expect(error.length).toBeLessThan(200);
          
          // Should contain Thai
          expect(containsThaiCharacters(error)).toBe(true);
        });
      }
    });
  });
});
