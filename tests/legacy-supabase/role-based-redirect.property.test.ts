/**
 * Property-Based Test for Role-Based Redirect
 * **Feature: auth-database-integration, Property 6: Role-based redirect**
 * 
 * Property 6: Role-based redirect
 * For any user with a specific role (admin, coach, athlete), successful login 
 * should redirect to the dashboard URL corresponding to that role.
 * 
 * Validates: Requirements 3.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { NextRequest, NextResponse } from 'next/server';

// Track users and their roles
const testUsers = new Map<string, { id: string; email: string; role: 'admin' | 'coach' | 'athlete' }>();

// Mock Supabase client factory
const createMockSupabase = (userId: string | null, userRole: string | null) => ({
  auth: {
    getUser: vi.fn(async () => {
      if (!userId) {
        return { data: { user: null }, error: null };
      }
      
      const user = Array.from(testUsers.values()).find(u => u.id === userId);
      if (!user) {
        return { data: { user: null }, error: null };
      }

      return {
        data: {
          user: {
            id: user.id,
            email: user.email,
            created_at: new Date().toISOString(),
          },
        },
        error: null,
      };
    }),
  },
  from: vi.fn((table: string) => {
    if (table === 'user_roles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              if (!userRole) {
                return { data: null, error: null };
              }
              return { data: { role: userRole }, error: null };
            }),
          })),
        })),
      };
    }
    
    if (table === 'profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              // For athletes, return active membership status
              if (userRole === 'athlete') {
                return { data: { membership_status: 'active' }, error: null };
              }
              return { data: null, error: null };
            }),
          })),
        })),
      };
    }

    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    };
  }),
});

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((url: string, key: string) => {
    // Determine if this is admin client (service role key) or regular client
    const isAdminClient = key === process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Get the current user from the test context
    const currentUserId = (global as any).__currentTestUserId || null;
    const currentUserRole = (global as any).__currentTestUserRole || null;
    
    return createMockSupabase(currentUserId, currentUserRole);
  }),
}));

// Import middleware after mocking
const { updateSession } = await import('@/lib/supabase/middleware');

describe('Property 6: Role-based redirect', () => {
  beforeEach(() => {
    testUsers.clear();
    vi.clearAllMocks();
    
    // Clear global test context
    delete (global as any).__currentTestUserId;
    delete (global as any).__currentTestUserRole;
  });

  /**
   * **Feature: auth-database-integration, Property 6: Role-based redirect**
   * 
   * For any user with a specific role, accessing /dashboard should redirect to their role-specific dashboard.
   * This test verifies that:
   * 1. Admin users are redirected to /dashboard/admin
   * 2. Coach users are redirected to /dashboard/coach
   * 3. Athlete users are redirected to /dashboard/athlete
   */
  it('should redirect users to role-specific dashboard for any role', async () => {
    // Generator for user roles
    const roleArb = fc.constantFrom('admin', 'coach', 'athlete');
    
    // Generator for user emails
    const emailArb = fc
      .tuple(
        fc.stringMatching(/^[a-z]{5,10}$/),
        fc.constantFrom('test.com', 'example.com'),
        fc.integer({ min: 100, max: 999 })
      )
      .map(([local, domain, num]) => `${local}${num}@${domain}`);

    await fc.assert(
      fc.asyncProperty(
        roleArb,
        emailArb,
        async (role, email) => {
          // Create test user with specific role
          const userId = `user-${Math.random().toString(36).substring(2, 11)}`;
          testUsers.set(email, { id: userId, email, role });
          
          // Set global context for mocks
          (global as any).__currentTestUserId = userId;
          (global as any).__currentTestUserRole = role;

          // Create mock request to /dashboard
          const url = new URL('http://localhost:3000/dashboard');
          const request = new NextRequest(url);
          
          // Mock cookies
          request.cookies.set('sb-access-token', 'mock-token');
          request.cookies.set('sb-refresh-token', 'mock-refresh');

          // Execute middleware
          const response = await updateSession(request);

          // Property: User should be redirected to their role-specific dashboard
          expect(response.status).toBe(307); // Temporary redirect
          
          const redirectUrl = response.headers.get('location');
          expect(redirectUrl).toBeDefined();
          
          // Verify redirect URL matches role
          if (role === 'admin') {
            expect(redirectUrl).toContain('/dashboard/admin');
          } else if (role === 'coach') {
            expect(redirectUrl).toContain('/dashboard/coach');
          } else if (role === 'athlete') {
            expect(redirectUrl).toContain('/dashboard/athlete');
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000); // 60 second timeout

  /**
   * Property Test: Users cannot access other role dashboards
   * 
   * For any user with a specific role, attempting to access a different role's dashboard
   * should redirect them back to their own dashboard.
   */
  it('should redirect users away from unauthorized role dashboards', async () => {
    const testCases = [
      { role: 'admin' as const, unauthorizedPath: '/dashboard/coach', expectedRedirect: '/dashboard/admin' },
      { role: 'admin' as const, unauthorizedPath: '/dashboard/athlete', expectedRedirect: '/dashboard/admin' },
      { role: 'coach' as const, unauthorizedPath: '/dashboard/admin', expectedRedirect: '/dashboard/coach' },
      { role: 'coach' as const, unauthorizedPath: '/dashboard/athlete', expectedRedirect: '/dashboard/coach' },
      { role: 'athlete' as const, unauthorizedPath: '/dashboard/admin', expectedRedirect: '/dashboard/athlete' },
      { role: 'athlete' as const, unauthorizedPath: '/dashboard/coach', expectedRedirect: '/dashboard/athlete' },
    ];

    for (const testCase of testCases) {
      // Create test user
      const userId = `user-${Math.random().toString(36).substring(2, 11)}`;
      const email = `test-${userId}@example.com`;
      testUsers.set(email, { id: userId, email, role: testCase.role });
      
      // Set global context for mocks
      (global as any).__currentTestUserId = userId;
      (global as any).__currentTestUserRole = testCase.role;

      // Create mock request to unauthorized dashboard
      const url = new URL(`http://localhost:3000${testCase.unauthorizedPath}`);
      const request = new NextRequest(url);
      
      // Mock cookies
      request.cookies.set('sb-access-token', 'mock-token');
      request.cookies.set('sb-refresh-token', 'mock-refresh');

      // Execute middleware
      const response = await updateSession(request);

      // Property: User should be redirected to their own dashboard
      expect(response.status).toBe(307);
      
      const redirectUrl = response.headers.get('location');
      expect(redirectUrl).toBeDefined();
      expect(redirectUrl).toContain(testCase.expectedRedirect);
    }
  });

  /**
   * Property Test: All roles have consistent redirect behavior
   * 
   * The redirect logic should be consistent across all roles - each role
   * should always redirect to the same dashboard URL.
   */
  it('should consistently redirect each role to the same dashboard URL', async () => {
    const roles: Array<'admin' | 'coach' | 'athlete'> = ['admin', 'coach', 'athlete'];
    
    for (const role of roles) {
      const redirectUrls = new Set<string>();
      
      // Test multiple times for the same role
      for (let i = 0; i < 5; i++) {
        const userId = `user-${role}-${i}`;
        const email = `${role}${i}@example.com`;
        testUsers.set(email, { id: userId, email, role });
        
        // Set global context for mocks
        (global as any).__currentTestUserId = userId;
        (global as any).__currentTestUserRole = role;

        // Create mock request
        const url = new URL('http://localhost:3000/dashboard');
        const request = new NextRequest(url);
        request.cookies.set('sb-access-token', 'mock-token');

        // Execute middleware
        const response = await updateSession(request);
        
        const redirectUrl = response.headers.get('location');
        if (redirectUrl) {
          redirectUrls.add(redirectUrl);
        }
      }
      
      // Property: All users with the same role should redirect to the same URL
      expect(redirectUrls.size).toBe(1);
      
      const redirectUrl = Array.from(redirectUrls)[0];
      if (role === 'admin') {
        expect(redirectUrl).toContain('/dashboard/admin');
      } else if (role === 'coach') {
        expect(redirectUrl).toContain('/dashboard/coach');
      } else if (role === 'athlete') {
        expect(redirectUrl).toContain('/dashboard/athlete');
      }
    }
  });

  /**
   * Edge case: User with no role defaults to athlete but needs membership
   * 
   * When a user has no role in the database, they default to 'athlete'.
   * Athletes without active membership_status are redirected to pending-approval.
   */
  it('should redirect users with no role to pending-approval (athlete without membership)', async () => {
    const userId = 'user-no-role';
    const email = 'norole@example.com';
    testUsers.set(email, { id: userId, email, role: 'athlete' }); // Will return null from DB
    
    // Set global context - user exists but no role
    (global as any).__currentTestUserId = userId;
    (global as any).__currentTestUserRole = null; // No role in database

    const url = new URL('http://localhost:3000/dashboard');
    const request = new NextRequest(url);
    request.cookies.set('sb-access-token', 'mock-token');

    const response = await updateSession(request);

    // Should redirect to pending-approval because athlete has no membership_status
    expect(response.status).toBe(307);
    const redirectUrl = response.headers.get('location');
    expect(redirectUrl).toContain('/pending-approval');
  });

  /**
   * Edge case: Unauthenticated users accessing /dashboard redirect to login
   */
  it('should redirect unauthenticated users to login page', async () => {
    // Set no user in global context
    (global as any).__currentTestUserId = null;
    (global as any).__currentTestUserRole = null;

    const url = new URL('http://localhost:3000/dashboard');
    const request = new NextRequest(url);

    const response = await updateSession(request);

    // Should redirect to login
    expect(response.status).toBe(307);
    const redirectUrl = response.headers.get('location');
    expect(redirectUrl).toContain('/login');
  });
});
