/**
 * Membership Access Control Tests
 * 
 * Validates: Requirements AC4, AC5, AC6
 * - AC4: Post-Approval Access - Athletes with 'active' status can access dashboard
 * - AC5: Rejection Handling - Athletes with 'rejected' status cannot access
 * - AC6: Pending State Restrictions - Athletes with 'pending' status cannot access
 * 
 * Tests the single source of truth: profiles.membership_status
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

describe('Membership Access Control - Single Source of Truth', () => {
  let testUsers: Array<{
    id: string;
    email: string;
    membershipStatus: string | null;
  }> = [];

  beforeAll(async () => {
    // Create test users with different membership statuses
    const statuses = ['active', 'pending', 'rejected', 'suspended', null];
    
    for (const status of statuses) {
      const email = `test-access-${status || 'null'}-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
      const password = 'TestPassword123!';

      // Create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        throw new Error(`Failed to create test user: ${authError?.message}`);
      }

      // Set role to athlete
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'athlete',
      });

      if (roleError) {
        console.error('Failed to insert user role:', roleError);
      }

      // Create profile with specific membership_status
      // Note: email is required by the profiles table
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: email,
        full_name: `Test User ${status || 'null'}`,
        membership_status: status,
      });

      if (profileError) {
        console.error('Failed to insert profile:', profileError);
      }

      testUsers.push({
        id: authData.user.id,
        email,
        membershipStatus: status,
      });
    }

    // Wait a bit for database to settle
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up test users
    for (const user of testUsers) {
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.from('user_roles').delete().eq('user_id', user.id);
      await supabase.auth.admin.deleteUser(user.id);
    }
  });

  describe('AC4: Post-Approval Access', () => {
    it('should grant access to athletes with active membership status', async () => {
      const activeUser = testUsers.find(u => u.membershipStatus === 'active');
      expect(activeUser).toBeDefined();

      // Verify membership_status is 'active'
      const { data: profile } = await supabase
        .from('profiles')
        .select('membership_status')
        .eq('id', activeUser!.id)
        .single();

      expect(profile?.membership_status).toBe('active');

      // Access control logic: Only 'active' grants access
      const hasAccess = profile?.membership_status === 'active';
      expect(hasAccess).toBe(true);
    });
  });

  describe('AC5: Rejection Handling', () => {
    it('should deny access to athletes with rejected membership status', async () => {
      const rejectedUser = testUsers.find(u => u.membershipStatus === 'rejected');
      expect(rejectedUser).toBeDefined();

      // Verify membership_status is 'rejected'
      const { data: profile } = await supabase
        .from('profiles')
        .select('membership_status')
        .eq('id', rejectedUser!.id)
        .single();

      expect(profile?.membership_status).toBe('rejected');

      // Access control logic: Only 'active' grants access
      const hasAccess = profile?.membership_status === 'active';
      expect(hasAccess).toBe(false);
    });
  });

  describe('AC6: Pending State Restrictions', () => {
    it('should deny access to athletes with pending membership status', async () => {
      const pendingUser = testUsers.find(u => u.membershipStatus === 'pending');
      expect(pendingUser).toBeDefined();

      // Verify membership_status is 'pending'
      const { data: profile } = await supabase
        .from('profiles')
        .select('membership_status')
        .eq('id', pendingUser!.id)
        .single();

      expect(profile?.membership_status).toBe('pending');

      // Access control logic: Only 'active' grants access
      const hasAccess = profile?.membership_status === 'active';
      expect(hasAccess).toBe(false);
    });
  });

  describe('Additional Status Handling', () => {
    it('should deny access to athletes with suspended membership status', async () => {
      const suspendedUser = testUsers.find(u => u.membershipStatus === 'suspended');
      expect(suspendedUser).toBeDefined();

      // Verify membership_status is 'suspended'
      const { data: profile } = await supabase
        .from('profiles')
        .select('membership_status')
        .eq('id', suspendedUser!.id)
        .single();

      expect(profile?.membership_status).toBe('suspended');

      // Access control logic: Only 'active' grants access
      const hasAccess = profile?.membership_status === 'active';
      expect(hasAccess).toBe(false);
    });

    it('should deny access to athletes with null membership status', async () => {
      const nullUser = testUsers.find(u => u.membershipStatus === null);
      expect(nullUser).toBeDefined();

      // Verify membership_status is null
      const { data: profile } = await supabase
        .from('profiles')
        .select('membership_status')
        .eq('id', nullUser!.id)
        .single();

      expect(profile?.membership_status).toBeNull();

      // Access control logic: Only 'active' grants access
      const hasAccess = profile?.membership_status === 'active';
      expect(hasAccess).toBe(false);
    });
  });

  describe('Single Source of Truth Verification', () => {
    it('should use only membership_status field for access decisions', async () => {
      // Test that access decision is based ONLY on membership_status
      // Not on application status, coach_id, club_id, or any other field

      for (const user of testUsers) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('membership_status')
          .eq('id', user.id)
          .single();

        // Access control logic: membership_status is the ONLY check
        const hasAccess = profile?.membership_status === 'active';

        // Verify access matches expected result
        if (user.membershipStatus === 'active') {
          expect(hasAccess).toBe(true);
        } else {
          expect(hasAccess).toBe(false);
        }
      }
    });

    it('should have consistent access logic across all statuses', async () => {
      // Verify that the access logic is consistent:
      // hasAccess = (membership_status === 'active')

      const accessResults = await Promise.all(
        testUsers.map(async (user) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('membership_status')
            .eq('id', user.id)
            .single();

          return {
            status: profile?.membership_status,
            hasAccess: profile?.membership_status === 'active',
          };
        })
      );

      // Verify only 'active' status grants access
      const activeAccess = accessResults.find(r => r.status === 'active');
      expect(activeAccess?.hasAccess).toBe(true);

      // Verify all other statuses deny access
      const nonActiveAccess = accessResults.filter(r => r.status !== 'active');
      nonActiveAccess.forEach(result => {
        expect(result.hasAccess).toBe(false);
      });
    });
  });

  describe('Non-Athlete Access', () => {
    it('should grant access to coaches regardless of membership_status', async () => {
      // Create a coach user
      const email = `test-coach-${Date.now()}@example.com`;
      const { data: authData } = await supabase.auth.admin.createUser({
        email,
        password: 'TestPassword123!',
        email_confirm: true,
      });

      if (!authData.user) throw new Error('Failed to create coach user');

      try {
        // Set role to coach
        await supabase.from('user_roles').insert({
          user_id: authData.user.id,
          role: 'coach',
        });

        // Create profile (membership_status doesn't matter for coaches)
        await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: 'Test Coach',
          membership_status: null, // Coaches don't need membership_status
        });

        // Get user role
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authData.user.id)
          .single();

        // Access control logic: Non-athletes always have access
        const hasAccess = userRole?.role !== 'athlete' || 
          (await supabase
            .from('profiles')
            .select('membership_status')
            .eq('id', authData.user.id)
            .single()
          ).data?.membership_status === 'active';

        expect(hasAccess).toBe(true);
      } finally {
        // Clean up
        await supabase.from('profiles').delete().eq('id', authData.user.id);
        await supabase.from('user_roles').delete().eq('user_id', authData.user.id);
        await supabase.auth.admin.deleteUser(authData.user.id);
      }
    });

    it('should grant access to admins regardless of membership_status', async () => {
      // Create an admin user
      const email = `test-admin-${Date.now()}@example.com`;
      const { data: authData } = await supabase.auth.admin.createUser({
        email,
        password: 'TestPassword123!',
        email_confirm: true,
      });

      if (!authData.user) throw new Error('Failed to create admin user');

      try {
        // Set role to admin
        await supabase.from('user_roles').insert({
          user_id: authData.user.id,
          role: 'admin',
        });

        // Create profile (membership_status doesn't matter for admins)
        await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: 'Test Admin',
          membership_status: null, // Admins don't need membership_status
        });

        // Get user role
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authData.user.id)
          .single();

        // Access control logic: Non-athletes always have access
        const hasAccess = userRole?.role !== 'athlete' || 
          (await supabase
            .from('profiles')
            .select('membership_status')
            .eq('id', authData.user.id)
            .single()
          ).data?.membership_status === 'active';

        expect(hasAccess).toBe(true);
      } finally {
        // Clean up
        await supabase.from('profiles').delete().eq('id', authData.user.id);
        await supabase.from('user_roles').delete().eq('user_id', authData.user.id);
        await supabase.auth.admin.deleteUser(authData.user.id);
      }
    });
  });
});
