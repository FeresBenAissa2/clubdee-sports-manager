/**
 * Property-Based Tests for OTP Flow
 * Feature: sports-club-management
 * 
 * Property 2: OTP generation for registration
 * Property 3: Valid OTP activates account
 * Validates: Requirements 1.2, 1.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { validateOTP } from '@/lib/auth/validation';
import { authConfig } from '@/lib/auth/config';

// Store OTP codes for verification
let otpStore: Map<string, { token: string; expiresAt: number; verified: boolean }>;

// Mock Supabase client
const mockSupabase = {
  auth: {
    signUp: vi.fn(async ({ email }: { email: string; password: string }) => {
      // Generate OTP for the email
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + authConfig.otpExpiry;
      
      otpStore.set(email, { token, expiresAt, verified: false });
      
      return {
        data: {
          user: {
            id: `user-${Math.random().toString(36).substr(2, 9)}`,
            email,
            email_confirmed_at: null, // Not confirmed until OTP is verified
            created_at: new Date().toISOString(),
          },
          session: null, // No session until email is confirmed
        },
        error: null,
      };
    }),
    verifyOtp: vi.fn(async ({ email, token }: { email: string; token: string; type: string }) => {
      const otpData = otpStore.get(email);
      
      if (!otpData) {
        return {
          data: null,
          error: { message: 'No OTP found for this email' },
        };
      }
      
      if (otpData.verified) {
        return {
          data: null,
          error: { message: 'OTP already used' },
        };
      }
      
      if (Date.now() > otpData.expiresAt) {
        return {
          data: null,
          error: { message: 'OTP has expired' },
        };
      }
      
      if (otpData.token !== token) {
        return {
          data: null,
          error: { message: 'Invalid OTP code' },
        };
      }
      
      // Mark as verified
      otpData.verified = true;
      
      return {
        data: {
          user: {
            id: `user-${Math.random().toString(36).substr(2, 9)}`,
            email,
            email_confirmed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          session: {
            access_token: `token-${Math.random().toString(36).substr(2, 9)}`,
            refresh_token: `refresh-${Math.random().toString(36).substr(2, 9)}`,
            expires_in: authConfig.jwtExpiry,
          },
        },
        error: null,
      };
    }),
    resend: vi.fn(async ({ email }: { type: string; email: string }) => {
      const otpData = otpStore.get(email);
      
      if (!otpData) {
        return {
          error: { message: 'No registration found for this email' },
        };
      }
      
      // Generate new OTP
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + authConfig.otpExpiry;
      
      otpStore.set(email, { token, expiresAt, verified: false });
      
      return {
        error: null,
      };
    }),
  },
  from: vi.fn((table: string) => ({
    insert: vi.fn(async () => ({ error: null })),
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
const { signUp, verifyOTP, resendOTP } = await import('@/lib/auth/actions');

describe('OTP Flow Property-Based Tests', () => {
  beforeEach(() => {
    otpStore = new Map();
    vi.clearAllMocks();
  });

  afterEach(() => {
    otpStore.clear();
  });

  /**
   * Property 2: OTP generation for registration
   * For any email address provided during registration, 
   * the system should generate and initiate sending of an OTP verification code.
   * Validates: Requirements 1.2
   */
  it('Property 2: OTP generation for registration', async () => {
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

    await fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (email, password) => {
        // Clear the OTP store before each property test iteration
        otpStore.clear();
        
        // Perform registration
        const result = await signUp(email, password);

        // Property: Registration should succeed
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();

        // Property: OTP should be generated for the email
        expect(otpStore.has(email)).toBe(true);
        
        const otpData = otpStore.get(email);
        expect(otpData).toBeDefined();
        
        // Property: OTP should be 6 digits
        expect(otpData!.token).toMatch(/^\d{6}$/);
        expect(otpData!.token.length).toBe(authConfig.otpLength);
        
        // Property: OTP should have an expiration time
        expect(otpData!.expiresAt).toBeGreaterThan(Date.now());
        expect(otpData!.expiresAt).toBeLessThanOrEqual(Date.now() + authConfig.otpExpiry);
        
        // Property: OTP should not be verified yet
        expect(otpData!.verified).toBe(false);

        // Verify the mock was called with correct parameters
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email,
          password,
          options: {
            emailRedirectTo: expect.any(String),
          },
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Valid OTP activates account
   * For any valid OTP code matching a pending registration, 
   * entering the code should activate the account and grant authentication access.
   * Validates: Requirements 1.3
   */
  it('Property 3: Valid OTP activates account', async () => {
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
        // Clear the OTP store before each property test iteration
        otpStore.clear();
        
        // Step 1: Register and get OTP
        const signUpResult = await signUp(email, password);
        expect(signUpResult.success).toBe(true);
        
        const otpData = otpStore.get(email);
        expect(otpData).toBeDefined();
        const validOTP = otpData!.token;
        
        // Validate the OTP format
        const validation = validateOTP(validOTP);
        expect(validation.isValid).toBe(true);
        
        // Step 2: Verify OTP
        const verifyResult = await verifyOTP(email, validOTP);
        
        // Property: Valid OTP should activate the account
        expect(verifyResult.success).toBe(true);
        expect(verifyResult.error).toBeUndefined();
        expect(verifyResult.data).toBeDefined();
        
        // Property: Verification should return user data with confirmed email
        const userData = verifyResult.data as any;
        expect(userData.user).toBeDefined();
        expect(userData.user.email).toBe(email);
        expect(userData.user.email_confirmed_at).toBeDefined();
        expect(userData.user.email_confirmed_at).not.toBeNull();
        
        // Property: Verification should grant authentication access (session)
        expect(userData.session).toBeDefined();
        expect(userData.session.access_token).toBeDefined();
        expect(userData.session.refresh_token).toBeDefined();
        expect(userData.session.expires_in).toBe(authConfig.jwtExpiry);
        
        // Property: OTP should be marked as verified
        expect(otpData!.verified).toBe(true);
        
        // Verify the mock was called with correct parameters
        expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
          email,
          token: validOTP,
          type: 'email',
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Invalid OTP rejection
   * For any invalid OTP code, verification should fail
   */
  it('Property: Invalid OTP codes are rejected', async () => {
    const validEmailArb = fc
      .tuple(
        fc.stringMatching(/^[a-z0-9]{3,10}$/),
        fc.constantFrom('gmail.com', 'yahoo.com')
      )
      .map(([local, domain]) => `${local}@${domain}`);

    const validPasswordArb = fc
      .tuple(
        fc.stringMatching(/^[A-Z][a-z]{5,10}$/),
        fc.integer({ min: 0, max: 999 }),
        fc.constantFrom('!', '@')
      )
      .map(([base, num, special]) => `${base}${num}${special}`);

    // Generate invalid OTP codes
    const invalidOTPArb = fc.oneof(
      fc.stringMatching(/^\d{5}$/), // Too short
      fc.stringMatching(/^\d{7}$/), // Too long
      fc.stringMatching(/^[a-z]{6}$/), // Not digits
      fc.string().filter(s => s.length === 6 && !/^\d{6}$/.test(s)) // 6 chars but not all digits
    );

    await fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, invalidOTPArb, async (email, password, invalidOTP) => {
        // Clear the OTP store before each property test iteration
        otpStore.clear();
        
        // Register to generate OTP
        const signUpResult = await signUp(email, password);
        expect(signUpResult.success).toBe(true);
        
        const otpData = otpStore.get(email);
        expect(otpData).toBeDefined();
        const validOTP = otpData!.token;
        
        // Ensure invalid OTP is different from valid OTP
        if (invalidOTP === validOTP) {
          return; // Skip this iteration
        }
        
        // Try to verify with invalid OTP
        const verifyResult = await verifyOTP(email, invalidOTP);
        
        // Property: Invalid OTP should be rejected
        expect(verifyResult.success).toBe(false);
        expect(verifyResult.error).toBeDefined();
        
        // Property: OTP should remain unverified
        expect(otpData!.verified).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: OTP resend generates new code
   * For any email with pending registration, resending OTP should generate a new code
   */
  it('Property: OTP resend generates new code', async () => {
    const validEmailArb = fc
      .tuple(
        fc.stringMatching(/^[a-z0-9]{3,10}$/),
        fc.constantFrom('gmail.com', 'yahoo.com')
      )
      .map(([local, domain]) => `${local}@${domain}`);

    const validPasswordArb = fc
      .tuple(
        fc.stringMatching(/^[A-Z][a-z]{5,10}$/),
        fc.integer({ min: 0, max: 999 }),
        fc.constantFrom('!', '@')
      )
      .map(([base, num, special]) => `${base}${num}${special}`);

    await fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (email, password) => {
        // Clear the OTP store before each property test iteration
        otpStore.clear();
        
        // Register to generate first OTP
        const signUpResult = await signUp(email, password);
        expect(signUpResult.success).toBe(true);
        
        const firstOTP = otpStore.get(email)!.token;
        expect(firstOTP).toBeDefined();
        
        // Resend OTP
        const resendResult = await resendOTP(email);
        
        // Property: Resend should succeed
        expect(resendResult.success).toBe(true);
        expect(resendResult.error).toBeUndefined();
        
        const secondOTP = otpStore.get(email)!.token;
        expect(secondOTP).toBeDefined();
        
        // Property: New OTP should be generated (likely different, but not guaranteed)
        // We can verify it's a valid 6-digit code
        expect(secondOTP).toMatch(/^\d{6}$/);
        expect(secondOTP.length).toBe(authConfig.otpLength);
        
        // Property: New OTP should have fresh expiration time
        const otpData = otpStore.get(email)!;
        expect(otpData.expiresAt).toBeGreaterThan(Date.now());
        
        // Property: OTP should be unverified after resend
        expect(otpData.verified).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: OTP validation consistency
   * For any string, the validation result should be consistent with OTP format rules
   */
  it('Property: OTP validation is consistent', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = validateOTP(input);
        
        // If validation passes, OTP should be exactly 6 digits
        if (result.isValid) {
          expect(input).toMatch(/^\d{6}$/);
          expect(input.length).toBe(authConfig.otpLength);
        }
        
        // If validation fails, there should be error messages
        if (!result.isValid) {
          expect(result.errors.length).toBeGreaterThan(0);
        }
        
        // Validation result should always have a boolean isValid
        expect(typeof result.isValid).toBe('boolean');
        expect(Array.isArray(result.errors)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
