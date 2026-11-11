/**
 * Test: Coach and Admin Always Have Access
 * 
 * Validates that coaches and admins can access the system regardless of
 * membership_status field value.
 * 
 * Validates: Task 2.4 - Allow coach/admin access always
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { checkAthleteAccess, getAthleteAccessStatus } from '@/lib/auth/access-control';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Coach and Admin Access Control', () => {
  let testCoachId: string;
  let testAdminId: string;
  let testClubId: string;

  beforeAll(async () => {
    // Create test club
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .insert({
        name: 'Test Club for Access Control',
        description: 'Test club for access control',
      })
      .select()
      .single();
    
    if (clubError) {
      console.error('Error creating club:', clubError);
      throw clubError;
    }
    testClubId = club!.id;

    // Create test coach user
    const { data: coachAuth } = await supabase.auth.admin.createUser({
      email: `test-coach-access-${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true,
    });
    testCoachId = coachAuth.user!.id;

    // Create coach profile with 'pending' membership_status to test that it doesn't matter
    await supabase.from('profiles').insert({
      id: testCoachId,
      full_name: 'Test Coach',
      phone: '0812345678',
      date_of_birth: '1990-01-01',
      club_id: testClubId,
      membership_status: 'pending', // Intentionally set to pending
    });

    await supabase.from('user_roles').insert({
      user_id: testCoachId,
      role: 'coach',
    });

    // Create test admin user
    const { data: adminAuth } = await supabase.auth.admin.createUser({
      email: `test-admin-access-${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true,
    });
    testAdminId = adminAuth.user!.id;

    // Create admin profile with 'rejected' membership_status to test that it doesn't matter
    await supabase.from('profiles').insert({
      id: testAdminId,
      full_name: 'Test Admin',
      phone: '0812345679',
      date_of_birth: '1990-01-01',
      membership_status: 'rejected', // Intentionally set to rejected
    });

    await supabase.from('user_roles').insert({
      user_id: testAdminId,
      role: 'admin',
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testCoachId) {
      await supabase.from('user_roles').delete().eq('user_id', testCoachId);
      await supabase.from('profiles').delete().eq('id', testCoachId);
      await supabase.auth.admin.deleteUser(testCoachId);
    }
    if (testAdminId) {
      await supabase.from('user_roles').delete().eq('user_id', testAdminId);
      await supabase.from('profiles').delete().eq('id', testAdminId);
      await supabase.auth.admin.deleteUser(testAdminId);
    }
    if (testClubId) {
      await supabase.from('clubs').delete().eq('id', testClubId);
    }
  });

  it('should allow coach access even with pending membership_status', async () => {
    const hasAccess = await checkAthleteAccess(testCoachId);
    expect(hasAccess).toBe(true);
  });

  it('should allow admin access even with rejected membership_status', async () => {
    const hasAccess = await checkAthleteAccess(testAdminId);
    expect(hasAccess).toBe(true);
  });

  it('should return active status for coach regardless of membership_status field', async () => {
    const status = await getAthleteAccessStatus(testCoachId);
    expect(status.hasAccess).toBe(true);
    expect(status.membershipStatus).toBe('active');
  });

  it('should return active status for admin regardless of membership_status field', async () => {
    const status = await getAthleteAccessStatus(testAdminId);
    expect(status.hasAccess).toBe(true);
    expect(status.membershipStatus).toBe('active');
  });
});
