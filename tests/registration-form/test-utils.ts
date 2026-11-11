/**
 * Test Utilities for Registration Form Tests
 * 
 * Provides common utilities, mock factories, and test data generators
 * for testing the multi-step registration form.
 */

import { vi } from 'vitest';
import type { User } from '@/lib/db/types';

// ============================================================================
// Mock Factories
// ============================================================================

/**
 * Creates a mock Supabase client with configurable responses
 */
export function createMockSupabaseClient(options: {
  authUser?: User | null;
  signUpSuccess?: boolean;
  signUpError?: string;
} = {}) {
  const {
    authUser = null,
    signUpSuccess = true,
    signUpError = undefined,
  } = options;

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: authUser },
        error: null,
      })),
      signUp: vi.fn(async ({ email, password }: { email: string; password: string }) => {
        if (!signUpSuccess) {
          return {
            data: { user: null, session: null },
            error: { message: signUpError || 'Sign up failed' },
          };
        }

        return {
          data: {
            user: {
              id: `user-${Math.random().toString(36).substr(2, 9)}`,
              email,
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              role: 'authenticated',
            } as User,
            session: null,
          },
          error: null,
        };
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  };
}

/**
 * Creates mock server actions for authentication
 */
export function createMockAuthActions(options: {
  signUpSuccess?: boolean;
  signUpError?: string;
  signUpUserId?: string;
} = {}) {
  const {
    signUpSuccess = true,
    signUpError = undefined,
    signUpUserId = 'test-user-id',
  } = options;

  return {
    signUp: vi.fn(async (email: string, password: string) => {
      if (!signUpSuccess) {
        return {
          success: false,
          error: signUpError || 'การสร้างบัญชีล้มเหลว',
        };
      }

      return {
        success: true,
        userId: signUpUserId,
      };
    }),
  };
}

/**
 * Creates mock server actions for membership application
 */
export function createMockMembershipActions(options: {
  submitSuccess?: boolean;
  submitError?: string;
} = {}) {
  const {
    submitSuccess = true,
    submitError = undefined,
  } = options;

  return {
    submitApplication: vi.fn(async () => {
      if (!submitSuccess) {
        return {
          success: false,
          error: submitError || 'ไม่สามารถส่งใบสมัครได้',
        };
      }

      return {
        success: true,
        applicationId: `app-${Math.random().toString(36).substr(2, 9)}`,
      };
    }),
  };
}

/**
 * Creates a mock Next.js router
 */
export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };
}

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generates valid account creation data
 */
export function generateValidAccountData(overrides: Partial<{
  email: string;
  password: string;
  confirmPassword: string;
}> = {}) {
  const password = overrides.password || 'ValidPass123!';
  
  return {
    email: overrides.email || 'test@example.com',
    password,
    confirmPassword: overrides.confirmPassword || password,
  };
}

/**
 * Generates invalid account creation data
 */
export function generateInvalidAccountData(type: 'email' | 'password' | 'mismatch') {
  const base = generateValidAccountData();

  switch (type) {
    case 'email':
      return { ...base, email: 'invalid-email' };
    case 'password':
      return { ...base, password: 'weak' };
    case 'mismatch':
      return { ...base, confirmPassword: 'DifferentPass123!' };
    default:
      return base;
  }
}

/**
 * Generates valid personal information data
 */
export function generateValidPersonalInfo(overrides: Partial<{
  full_name: string;
  phone_number: string;
  address: string;
  emergency_contact: string;
  date_of_birth: string;
  blood_type: string;
  medical_conditions: string;
}> = {}) {
  return {
    full_name: overrides.full_name || 'ทดสอบ ทดสอบ',
    phone_number: overrides.phone_number || '081-234-5678',
    address: overrides.address || 'ที่อยู่ทดสอบ 123 ถนนทดสอบ เขตทดสอบ กรุงเทพฯ 10100',
    emergency_contact: overrides.emergency_contact || '089-999-9999',
    date_of_birth: overrides.date_of_birth || '',
    blood_type: overrides.blood_type || '',
    medical_conditions: overrides.medical_conditions || '',
  };
}

/**
 * Generates invalid personal information data
 */
export function generateInvalidPersonalInfo(type: 'missing_required' | 'invalid_phone') {
  const base = generateValidPersonalInfo();

  switch (type) {
    case 'missing_required':
      return { ...base, full_name: '', phone_number: '', address: '', emergency_contact: '' };
    case 'invalid_phone':
      return { ...base, phone_number: '1234567890' };
    default:
      return base;
  }
}

/**
 * Generates valid document information
 */
export function generateValidDocument(type: 'id_card' | 'house_registration' | 'birth_certificate') {
  return {
    type,
    url: `https://example.com/${type}.jpg`,
    uploaded_at: new Date().toISOString(),
    file_name: `${type}.jpg`,
    file_size: 1024 * 1024, // 1MB
  };
}

/**
 * Generates all three required documents
 */
export function generateValidDocuments() {
  return [
    generateValidDocument('id_card'),
    generateValidDocument('house_registration'),
    generateValidDocument('birth_certificate'),
  ];
}

/**
 * Generates a valid File object for testing uploads
 */
export function generateValidFile(options: {
  name?: string;
  type?: string;
  size?: number;
} = {}) {
  const {
    name = 'test-document.jpg',
    type = 'image/jpeg',
    size = 1024 * 1024, // 1MB
  } = options;

  const blob = new Blob(['test content'], { type });
  return new File([blob], name, { type, lastModified: Date.now() });
}

/**
 * Generates an invalid File object for testing
 */
export function generateInvalidFile(type: 'wrong_type' | 'too_large') {
  switch (type) {
    case 'wrong_type':
      return generateValidFile({ name: 'test.txt', type: 'text/plain' });
    case 'too_large':
      // Create a file larger than 5MB by using a large content string
      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB of content
      const blob = new Blob([largeContent], { type: 'image/jpeg' });
      return new File([blob], 'large-file.jpg', { type: 'image/jpeg', lastModified: Date.now() });
    default:
      return generateValidFile();
  }
}

/**
 * Generates a valid club ID
 */
export function generateValidClubId() {
  return '123e4567-e89b-12d3-a456-426614174000';
}

/**
 * Generates complete valid form data
 */
export function generateCompleteFormData(overrides: {
  account?: ReturnType<typeof generateValidAccountData>;
  personalInfo?: ReturnType<typeof generateValidPersonalInfo>;
  documents?: ReturnType<typeof generateValidDocuments>;
  clubId?: string;
} = {}) {
  return {
    account: overrides.account || generateValidAccountData(),
    personalInfo: overrides.personalInfo || generateValidPersonalInfo(),
    documents: {
      id_card: overrides.documents?.[0] || generateValidDocument('id_card'),
      house_registration: overrides.documents?.[1] || generateValidDocument('house_registration'),
      birth_certificate: overrides.documents?.[2] || generateValidDocument('birth_certificate'),
    },
    clubId: overrides.clubId || generateValidClubId(),
  };
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Waits for async operations to complete
 */
export function waitForAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Simulates a delay (for testing loading states)
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a mock user object
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: overrides.id || 'test-user-id',
    email: overrides.email || 'test@example.com',
    created_at: overrides.created_at || new Date().toISOString(),
    app_metadata: overrides.app_metadata || {},
    user_metadata: overrides.user_metadata || {},
    aud: overrides.aud || 'authenticated',
    role: overrides.role || 'authenticated',
    ...overrides,
  } as User;
}

/**
 * Extracts error messages from validation errors object
 */
export function extractErrorMessages(errors: Record<string, string>): string[] {
  return Object.values(errors);
}

/**
 * Checks if an element has a specific error message
 */
export function hasErrorMessage(element: HTMLElement, message: string): boolean {
  return element.textContent?.includes(message) || false;
}
