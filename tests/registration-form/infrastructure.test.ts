/**
 * Infrastructure Verification Tests
 * 
 * Verifies that the test infrastructure is properly set up:
 * - Mocks are working correctly
 * - Test data generators produce valid data
 * - Test utilities function as expected
 * 
 * This test file validates the test infrastructure itself.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupAllMocks,
  resetAllMocks,
  mockSignUpSuccess,
  mockSignUpFailure,
  mockSubmitApplicationSuccess,
  mockSubmitApplicationFailure,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockAuthActions,
  mockMembershipActions,
  mockSupabaseClient,
} from './mocks';
import {
  generateValidAccountData,
  generateInvalidAccountData,
  generateValidPersonalInfo,
  generateInvalidPersonalInfo,
  generateValidDocument,
  generateValidDocuments,
  generateValidFile,
  generateInvalidFile,
  generateValidClubId,
  generateCompleteFormData,
  waitForAsync,
  createMockUser,
} from './test-utils';
import {
  validEmails,
  invalidEmails,
  validPasswords,
  invalidPasswords,
  validPhoneNumbers,
  invalidPhoneNumbers,
  validNames,
  validAddresses,
  generateMockFile,
  validFileTypes,
  invalidFileTypes,
} from './generators';

describe('Test Infrastructure Verification', () => {
  beforeEach(() => {
    setupAllMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Mock Setup', () => {
    it('should setup Supabase client mock', () => {
      expect(mockSupabaseClient).toBeDefined();
      expect(mockSupabaseClient.auth).toBeDefined();
      expect(mockSupabaseClient.auth.getUser).toBeDefined();
      expect(mockSupabaseClient.auth.signUp).toBeDefined();
    });

    it('should setup auth actions mock', () => {
      expect(mockAuthActions).toBeDefined();
      expect(mockAuthActions.signUp).toBeDefined();
      expect(typeof mockAuthActions.signUp).toBe('function');
    });

    it('should setup membership actions mock', () => {
      expect(mockMembershipActions).toBeDefined();
      expect(mockMembershipActions.submitApplication).toBeDefined();
      expect(typeof mockMembershipActions.submitApplication).toBe('function');
    });

    it('should configure signUp success mock', async () => {
      mockSignUpSuccess('test-user-123');
      
      const result = await mockAuthActions.signUp('test@example.com', 'password');
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-123');
    });

    it('should configure signUp failure mock', async () => {
      mockSignUpFailure('Custom error message');
      
      const result = await mockAuthActions.signUp('test@example.com', 'password');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Custom error message');
    });

    it('should configure submitApplication success mock', async () => {
      mockSubmitApplicationSuccess('app-123');
      
      const result = await mockMembershipActions.submitApplication({} as any);
      
      expect(result.success).toBe(true);
      expect(result.applicationId).toBe('app-123');
    });

    it('should configure submitApplication failure mock', async () => {
      mockSubmitApplicationFailure('Submission failed');
      
      const result = await mockMembershipActions.submitApplication({} as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Submission failed');
    });

    it('should configure authenticated user mock', async () => {
      mockAuthenticatedUser('user-123', 'test@example.com');
      
      const result = await mockSupabaseClient.auth.getUser();
      
      expect(result.data.user).toBeDefined();
      expect(result.data.user?.id).toBe('user-123');
      expect(result.data.user?.email).toBe('test@example.com');
    });

    it('should configure unauthenticated user mock', async () => {
      mockUnauthenticatedUser();
      
      const result = await mockSupabaseClient.auth.getUser();
      
      expect(result.data.user).toBeNull();
    });
  });

  describe('Test Data Generators - Valid Data', () => {
    it('should generate valid account data', () => {
      const data = generateValidAccountData();
      
      expect(data).toHaveProperty('email');
      expect(data).toHaveProperty('password');
      expect(data).toHaveProperty('confirmPassword');
      expect(data.email).toBe('test@example.com');
      expect(data.password).toBe(data.confirmPassword);
    });

    it('should generate valid account data with overrides', () => {
      const data = generateValidAccountData({
        email: 'custom@example.com',
        password: 'CustomPass123!',
      });
      
      expect(data.email).toBe('custom@example.com');
      expect(data.password).toBe('CustomPass123!');
      expect(data.confirmPassword).toBe('CustomPass123!');
    });

    it('should generate valid personal info', () => {
      const data = generateValidPersonalInfo();
      
      expect(data).toHaveProperty('full_name');
      expect(data).toHaveProperty('phone_number');
      expect(data).toHaveProperty('address');
      expect(data).toHaveProperty('emergency_contact');
      expect(data.full_name).toBeTruthy();
      expect(data.phone_number).toMatch(/^\d{3}-\d{3}-\d{4}$/);
    });

    it('should generate valid document', () => {
      const doc = generateValidDocument('id_card');
      
      expect(doc).toHaveProperty('type');
      expect(doc).toHaveProperty('url');
      expect(doc).toHaveProperty('uploaded_at');
      expect(doc).toHaveProperty('file_name');
      expect(doc).toHaveProperty('file_size');
      expect(doc.type).toBe('id_card');
      expect(doc.url).toContain('id_card');
    });

    it('should generate all three documents', () => {
      const docs = generateValidDocuments();
      
      expect(docs).toHaveLength(3);
      expect(docs[0].type).toBe('id_card');
      expect(docs[1].type).toBe('house_registration');
      expect(docs[2].type).toBe('birth_certificate');
    });

    it('should generate valid File object', () => {
      const file = generateValidFile();
      
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('test-document.jpg');
      expect(file.type).toBe('image/jpeg');
      expect(file.size).toBeGreaterThan(0);
    });

    it('should generate valid club ID', () => {
      const clubId = generateValidClubId();
      
      expect(clubId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should generate complete form data', () => {
      const data = generateCompleteFormData();
      
      expect(data).toHaveProperty('account');
      expect(data).toHaveProperty('personalInfo');
      expect(data).toHaveProperty('documents');
      expect(data).toHaveProperty('clubId');
      expect(data.documents).toHaveProperty('id_card');
      expect(data.documents).toHaveProperty('house_registration');
      expect(data.documents).toHaveProperty('birth_certificate');
    });
  });

  describe('Test Data Generators - Invalid Data', () => {
    it('should generate invalid email data', () => {
      const data = generateInvalidAccountData('email');
      
      expect(data.email).toBe('invalid-email');
    });

    it('should generate invalid password data', () => {
      const data = generateInvalidAccountData('password');
      
      expect(data.password).toBe('weak');
    });

    it('should generate password mismatch data', () => {
      const data = generateInvalidAccountData('mismatch');
      
      expect(data.password).not.toBe(data.confirmPassword);
    });

    it('should generate invalid personal info - missing required', () => {
      const data = generateInvalidPersonalInfo('missing_required');
      
      expect(data.full_name).toBe('');
      expect(data.phone_number).toBe('');
      expect(data.address).toBe('');
      expect(data.emergency_contact).toBe('');
    });

    it('should generate invalid personal info - invalid phone', () => {
      const data = generateInvalidPersonalInfo('invalid_phone');
      
      expect(data.phone_number).toBe('1234567890');
    });

    it('should generate invalid file - wrong type', () => {
      const file = generateInvalidFile('wrong_type');
      
      expect(file.type).toBe('text/plain');
    });

    it('should generate invalid file - too large', () => {
      const file = generateInvalidFile('too_large');
      
      expect(file.size).toBeGreaterThan(5 * 1024 * 1024);
    });
  });

  describe('Static Test Data Arrays', () => {
    it('should have valid email examples', () => {
      expect(validEmails).toBeInstanceOf(Array);
      expect(validEmails.length).toBeGreaterThan(0);
      validEmails.forEach((email) => {
        expect(email).toContain('@');
      });
    });

    it('should have invalid email examples', () => {
      expect(invalidEmails).toBeInstanceOf(Array);
      expect(invalidEmails.length).toBeGreaterThan(0);
    });

    it('should have valid password examples', () => {
      expect(validPasswords).toBeInstanceOf(Array);
      expect(validPasswords.length).toBeGreaterThan(0);
      validPasswords.forEach((password) => {
        expect(password.length).toBeGreaterThanOrEqual(8);
      });
    });

    it('should have invalid password examples', () => {
      expect(invalidPasswords).toBeInstanceOf(Array);
      expect(invalidPasswords.length).toBeGreaterThan(0);
    });

    it('should have valid phone number examples', () => {
      expect(validPhoneNumbers).toBeInstanceOf(Array);
      expect(validPhoneNumbers.length).toBeGreaterThan(0);
      validPhoneNumbers.forEach((phone) => {
        expect(phone).toMatch(/^\d{3}-\d{3}-\d{4}$/);
      });
    });

    it('should have invalid phone number examples', () => {
      expect(invalidPhoneNumbers).toBeInstanceOf(Array);
      expect(invalidPhoneNumbers.length).toBeGreaterThan(0);
    });

    it('should have valid name examples', () => {
      expect(validNames).toBeInstanceOf(Array);
      expect(validNames.length).toBeGreaterThan(0);
    });

    it('should have valid address examples', () => {
      expect(validAddresses).toBeInstanceOf(Array);
      expect(validAddresses.length).toBeGreaterThan(0);
    });

    it('should have valid file types', () => {
      expect(validFileTypes).toBeInstanceOf(Array);
      expect(validFileTypes).toContain('image/jpeg');
      expect(validFileTypes).toContain('image/png');
      expect(validFileTypes).toContain('application/pdf');
    });

    it('should have invalid file types', () => {
      expect(invalidFileTypes).toBeInstanceOf(Array);
      expect(invalidFileTypes).toContain('text/plain');
    });
  });

  describe('Test Utilities', () => {
    it('should create mock user', () => {
      const user = createMockUser();
      
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('created_at');
      expect(user.id).toBe('test-user-id');
    });

    it('should create mock user with overrides', () => {
      const user = createMockUser({
        id: 'custom-id',
        email: 'custom@example.com',
      });
      
      expect(user.id).toBe('custom-id');
      expect(user.email).toBe('custom@example.com');
    });

    it('should wait for async operations', async () => {
      const start = Date.now();
      await waitForAsync();
      const end = Date.now();
      
      // Should complete almost immediately
      expect(end - start).toBeLessThan(100);
    });

    it('should generate mock file with custom options', () => {
      const file = generateMockFile({
        name: 'custom.pdf',
        type: 'application/pdf',
        size: 2 * 1024 * 1024,
      });
      
      expect(file.name).toBe('custom.pdf');
      expect(file.type).toBe('application/pdf');
      expect(file.size).toBeGreaterThan(0);
    });
  });

  describe('Mock Reset', () => {
    it('should reset mocks between tests', () => {
      // Configure mock
      mockSignUpSuccess('user-1');
      mockAuthActions.signUp('test@example.com', 'password');
      
      expect(mockAuthActions.signUp).toHaveBeenCalledTimes(1);
      
      // Reset
      resetAllMocks();
      
      // Mock should be reset
      expect(mockAuthActions.signUp).not.toHaveBeenCalled();
    });
  });
});
