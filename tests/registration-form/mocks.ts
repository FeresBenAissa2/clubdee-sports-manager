/**
 * Mock Setup for Registration Form Tests
 * 
 * Provides centralized mock configurations for:
 * - Supabase client
 * - Server actions (auth and membership)
 * - Next.js router
 * 
 * Import and use these mocks in your test files.
 */

import { vi } from 'vitest';

// ============================================================================
// Supabase Client Mocks
// ============================================================================

/**
 * Mock Supabase client factory
 * Can be configured per test with different behaviors
 */
export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    signUp: vi.fn(),
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
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
    })),
  },
};

/**
 * Setup Supabase client mock
 * Call this in beforeEach to reset and configure the mock
 */
export function setupSupabaseMock() {
  vi.mock('@/lib/db/client', () => ({
    createClient: vi.fn(() => mockSupabaseClient),
  }));

  vi.mock('@/lib/db/server', () => ({
    createClient: vi.fn(async () => mockSupabaseClient),
  }));
}

/**
 * Reset Supabase mocks
 * Call this in afterEach to clean up
 */
export function resetSupabaseMock() {
  vi.clearAllMocks();
}

// ============================================================================
// Server Actions Mocks
// ============================================================================

/**
 * Mock auth actions
 */
export const mockAuthActions = {
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
};

/**
 * Mock membership actions
 */
export const mockMembershipActions = {
  submitApplication: vi.fn(),
  getApplications: vi.fn(),
  updateApplication: vi.fn(),
};

/**
 * Setup auth actions mock
 */
export function setupAuthActionsMock() {
  vi.mock('@/lib/auth/actions', () => mockAuthActions);
}

/**
 * Setup membership actions mock
 */
export function setupMembershipActionsMock() {
  vi.mock('@/lib/membership/actions', () => mockMembershipActions);
}

/**
 * Reset action mocks
 */
export function resetActionMocks() {
  Object.values(mockAuthActions).forEach((mock) => mock.mockReset());
  Object.values(mockMembershipActions).forEach((mock) => mock.mockReset());
}

// ============================================================================
// Next.js Router Mocks
// ============================================================================

/**
 * Mock Next.js router
 */
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
};

/**
 * Setup Next.js router mock
 */
export function setupRouterMock() {
  vi.mock('next/navigation', () => ({
    useRouter: vi.fn(() => mockRouter),
    usePathname: vi.fn(() => mockRouter.pathname),
    useSearchParams: vi.fn(() => new URLSearchParams()),
  }));
}

/**
 * Reset router mock
 */
export function resetRouterMock() {
  Object.values(mockRouter).forEach((value) => {
    if (typeof value === 'function' && 'mockReset' in value) {
      (value as any).mockReset();
    }
  });
}

// ============================================================================
// Storage Mocks
// ============================================================================

/**
 * Mock storage actions
 */
export const mockStorageActions = {
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getDocumentUrl: vi.fn(),
};

/**
 * Setup storage actions mock
 */
export function setupStorageActionsMock() {
  vi.mock('@/lib/membership/storage', () => mockStorageActions);
}

/**
 * Reset storage mocks
 */
export function resetStorageMocks() {
  Object.values(mockStorageActions).forEach((mock) => mock.mockReset());
}

// ============================================================================
// Complete Setup/Teardown
// ============================================================================

/**
 * Setup all mocks at once
 * Call this in beforeEach
 */
export function setupAllMocks() {
  setupSupabaseMock();
  setupAuthActionsMock();
  setupMembershipActionsMock();
  setupRouterMock();
  setupStorageActionsMock();
}

/**
 * Reset all mocks at once
 * Call this in afterEach
 */
export function resetAllMocks() {
  resetSupabaseMock();
  resetActionMocks();
  resetRouterMock();
  resetStorageMocks();
}

// ============================================================================
// Mock Response Helpers
// ============================================================================

/**
 * Configure signUp mock to succeed
 */
export function mockSignUpSuccess(userId = 'test-user-id') {
  mockAuthActions.signUp.mockResolvedValue({
    success: true,
    userId,
  });
}

/**
 * Configure signUp mock to fail
 */
export function mockSignUpFailure(error = 'การสร้างบัญชีล้มเหลว') {
  mockAuthActions.signUp.mockResolvedValue({
    success: false,
    error,
  });
}

/**
 * Configure submitApplication mock to succeed
 */
export function mockSubmitApplicationSuccess(applicationId = 'test-app-id') {
  mockMembershipActions.submitApplication.mockResolvedValue({
    success: true,
    applicationId,
  });
}

/**
 * Configure submitApplication mock to fail
 */
export function mockSubmitApplicationFailure(error = 'ไม่สามารถส่งใบสมัครได้') {
  mockMembershipActions.submitApplication.mockResolvedValue({
    success: false,
    error,
  });
}

/**
 * Configure uploadDocument mock to succeed
 */
export function mockUploadDocumentSuccess(url = 'https://example.com/document.jpg') {
  mockStorageActions.uploadDocument.mockResolvedValue({
    success: true,
    url,
    fileName: 'document.jpg',
    fileSize: 1024 * 1024,
  });
}

/**
 * Configure uploadDocument mock to fail
 */
export function mockUploadDocumentFailure(error = 'การอัปโหลดล้มเหลว') {
  mockStorageActions.uploadDocument.mockResolvedValue({
    success: false,
    error,
  });
}

/**
 * Configure getUser mock to return authenticated user
 */
export function mockAuthenticatedUser(userId = 'test-user-id', email = 'test@example.com') {
  mockSupabaseClient.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: userId,
        email,
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        role: 'authenticated',
      },
    },
    error: null,
  });
}

/**
 * Configure getUser mock to return no user (unauthenticated)
 */
export function mockUnauthenticatedUser() {
  mockSupabaseClient.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}
