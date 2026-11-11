/**
 * Unit Test for Login Page Redirect
 * Feature: auth-database-integration
 * Task 3.5: Test logged-in user visiting /login redirects to dashboard
 * 
 * Tests that authenticated users are automatically redirected from /login
 * Validates: Requirements 3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
};

// Mock the Supabase server module
vi.mock('@/lib/db/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

describe('Login Page Redirect - Unit Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test 3.5: Logged-in user visiting /login redirects to dashboard
   * When an authenticated user visits the login page,
   * they should be automatically redirected to /dashboard
   * Validates: Requirements 3.5
   */
  it('should redirect authenticated user from /login to /dashboard', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    });

    // Import the login page component after mocking
    const LoginPage = (await import('@/app/login/page')).default;

    // Call the page component (it's an async server component)
    await LoginPage();

    // Verify redirect was called with /dashboard
    expect(redirect).toHaveBeenCalledWith('/dashboard');
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 3.5: Non-authenticated user can access login page
   * When a non-authenticated user visits the login page,
   * they should NOT be redirected (page should render normally)
   */
  it('should not redirect non-authenticated user from /login', async () => {
    // Mock no user (not authenticated)
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: null,
      },
      error: null,
    });

    // Import the login page component after mocking
    const LoginPage = (await import('@/app/login/page')).default;

    // Call the page component
    const result = await LoginPage();

    // Verify redirect was NOT called
    expect(redirect).not.toHaveBeenCalled();
    
    // Verify the page renders (returns JSX)
    expect(result).toBeDefined();
  });

  /**
   * Test 3.5: User with expired session can access login page
   * When a user with an expired/invalid session visits login,
   * they should NOT be redirected
   */
  it('should not redirect user with expired session from /login', async () => {
    // Mock auth error (expired session)
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: null,
      },
      error: {
        message: 'JWT expired',
        status: 401,
      },
    });

    // Import the login page component after mocking
    const LoginPage = (await import('@/app/login/page')).default;

    // Call the page component
    const result = await LoginPage();

    // Verify redirect was NOT called
    expect(redirect).not.toHaveBeenCalled();
    
    // Verify the page renders
    expect(result).toBeDefined();
  });

  /**
   * Test 3.5: Multiple roles redirect to /dashboard
   * All authenticated users regardless of role should redirect to /dashboard
   * (Middleware will then redirect to role-specific dashboard)
   */
  it('should redirect admin user from /login to /dashboard', async () => {
    // Mock authenticated admin user
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    });

    // Import the login page component after mocking
    const LoginPage = (await import('@/app/login/page')).default;

    // Call the page component
    await LoginPage();

    // Verify redirect to /dashboard (middleware handles role-specific routing)
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('should redirect coach user from /login to /dashboard', async () => {
    // Mock authenticated coach user
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'coach-123',
          email: 'coach@example.com',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    });

    // Import the login page component after mocking
    const LoginPage = (await import('@/app/login/page')).default;

    // Call the page component
    await LoginPage();

    // Verify redirect to /dashboard
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('should redirect athlete user from /login to /dashboard', async () => {
    // Mock authenticated athlete user
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'athlete-123',
          email: 'athlete@example.com',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    });

    // Import the login page component after mocking
    const LoginPage = (await import('@/app/login/page')).default;

    // Call the page component
    await LoginPage();

    // Verify redirect to /dashboard
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });
});
