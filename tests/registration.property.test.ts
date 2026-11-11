/**
 * Property-Based Tests for Registration
 * Feature: sports-club-management
 * 
 * Property 1: Valid registration creates account
 * Property 4: Duplicate email rejection
 * Validates: Requirements 1.1, 1.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateDateOfBirth,
  validateRequired,
} from '@/lib/auth/validation';

// Store registered emails for duplicate detection
let registeredEmails: Set<string>;

// Mock Supabase client
const mockSupabase = {
  auth: {
    signUp: vi.fn(async ({ email }: { email: string; password: string }) => {
      // Simulate duplicate email check
      if (registeredEmails.has(email)) {
        return {
          data: null,
          error: { message: 'User already registered' },
        };
      }
      
      // Simulate successful registration
      registeredEmails.add(email);
      return {
        data: {
          user: {
            id: `user-${Math.random().toString(36).substr(2, 9)}`,
            email,
            created_at: new Date().toISOString(),
          },
          session: null,
        },
        error: null,
      };
    }),
  },
};

// Mock the Supabase server module
vi.mock('@/lib/db/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

// Import after mocking
const { signUp } = await import('@/lib/auth/actions');

describe('Registration Property-Based Tests', () => {
  beforeEach(() => {
    registeredEmails = new Set();
    vi.clearAllMocks();
  });

  afterEach(() => {
    registeredEmails.clear();
  });

  /**
   * Property 1: Valid registration creates account
   * For any valid registration data (with all required fields), 
   * submitting the registration form should create a new athlete account 
   * with matching information in the database.
   * Validates: Requirements 1.1
   */
  it('Property 1: Valid registration creates account', async () => {
    // Custom arbitraries for valid registration data
    const validEmailArb = fc
      .tuple(
        fc.stringMatching(/^[a-z0-9]{3,10}$/),
        fc.constantFrom('gmail.com', 'yahoo.com', 'outlook.com', 'example.com')
      )
      .map(([local, domain]) => `${local}@${domain}`);

    const validPasswordArb = fc
      .tuple(
        fc.stringMatching(/^[A-Z][a-z]{5,10}$/), // Starts with uppercase
        fc.integer({ min: 0, max: 999 }), // Number
        fc.constantFrom('!', '@', '#', '$') // Special char
      )
      .map(([base, num, special]) => `${base}${num}${special}`);

    const validNameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);

    const validPhoneArb = fc
      .tuple(
        fc.constantFrom('+66', '+1', '+44'),
        fc.integer({ min: 100000000, max: 9999999999 })
      )
      .map(([prefix, number]) => `${prefix}${number}`);

    const validDateOfBirthArb = fc
      .integer({ min: 6, max: 50 })
      .map((yearsAgo) => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - yearsAgo);
        return date.toISOString().split('T')[0];
      });

    const validGenderArb = fc.constantFrom('male', 'female', 'other');

    const validRegistrationDataArb = fc.record({
      email: validEmailArb,
      password: validPasswordArb,
      firstName: validNameArb,
      lastName: validNameArb,
      dateOfBirth: validDateOfBirthArb,
      phoneNumber: validPhoneArb,
      gender: validGenderArb,
    });

    await fc.assert(
      fc.asyncProperty(validRegistrationDataArb, async (registrationData) => {
        // Validate that the generated data passes our validation rules
        const emailValidation = validateEmail(registrationData.email);
        const passwordValidation = validatePassword(registrationData.password);
        const phoneValidation = validatePhoneNumber(registrationData.phoneNumber);
        const dobValidation = validateDateOfBirth(registrationData.dateOfBirth);
        const firstNameValidation = validateRequired(registrationData.firstName, 'First name');
        const lastNameValidation = validateRequired(registrationData.lastName, 'Last name');

        // Pre-condition: All validations should pass for valid data
        expect(emailValidation.isValid).toBe(true);
        expect(passwordValidation.isValid).toBe(true);
        expect(phoneValidation.isValid).toBe(true);
        expect(dobValidation.isValid).toBe(true);
        expect(firstNameValidation.isValid).toBe(true);
        expect(lastNameValidation.isValid).toBe(true);

        // Perform registration
        const result = await signUp(registrationData.email, registrationData.password);

        // Property: Valid registration should succeed
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.data).toBeDefined();

        // Verify the mock was called with correct parameters
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: registrationData.email,
          password: registrationData.password,
          options: {
            emailRedirectTo: expect.any(String),
          },
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Duplicate email rejection
   * For any email address that already exists in the system, 
   * attempting to register with that email should fail with an appropriate error message.
   * Validates: Requirements 1.4
   */
  it('Property 4: Duplicate email rejection', async () => {
    const validEmailArb = fc
      .tuple(
        fc.stringMatching(/^[a-z0-9]{3,10}$/),
        fc.constantFrom('gmail.com', 'yahoo.com', 'outlook.com')
      )
      .map(([local, domain]) => `${local}@${domain}`);

    const validPasswordArb = fc
      .tuple(
        fc.stringMatching(/^[A-Z][a-z]{5,10}$/),
        fc.integer({ min: 0, max: 999 }),
        fc.constantFrom('!', '@', '#', '$')
      )
      .map(([base, num, special]) => `${base}${num}${special}`);

    await fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (email, password) => {
        // Clear the registered emails set before each property test iteration
        registeredEmails.clear();
        
        // First registration should succeed
        const firstResult = await signUp(email, password);
        expect(firstResult.success).toBe(true);

        // Second registration with same email should fail
        const secondResult = await signUp(email, password);
        
        // Property: Duplicate email should be rejected
        expect(secondResult.success).toBe(false);
        expect(secondResult.error).toBeDefined();
        expect(secondResult.error).toContain('already registered');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Email validation consistency
   * For any string, the validation result should be consistent with email format rules
   */
  it('Property: Email validation is consistent', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = validateEmail(input);
        
        // If validation passes, the email should match basic email pattern
        if (result.isValid) {
          expect(input).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        }
        
        // If validation fails, there should be error messages
        if (!result.isValid) {
          expect(result.errors.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Password validation consistency
   * For any string, the validation result should be consistent with password requirements
   */
  it('Property: Password validation is consistent', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = validatePassword(input);
        
        // If validation passes, password should meet all requirements
        if (result.isValid) {
          expect(input.length).toBeGreaterThanOrEqual(8);
          expect(input).toMatch(/[A-Z]/); // Has uppercase
          expect(input).toMatch(/[a-z]/); // Has lowercase
          expect(input).toMatch(/\d/); // Has number
          // Note: Special chars are NOT required per authConfig.passwordRequirements.requireSpecialChars = false
        }
        
        // Validation result should always have a boolean isValid
        expect(typeof result.isValid).toBe('boolean');
        expect(Array.isArray(result.errors)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
