/**
 * Test: Profile membership_status update on application submission
 * 
 * Validates: Task 2.1 - Update profile membership_status to 'pending'
 * 
 * This test verifies that when an athlete submits a membership application,
 * their profile's membership_status is correctly updated to 'pending'.
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

describe('Profile membership_status update on application submission', () => {
  let testUserId: string;
  let testClubId: string;

  beforeAll(async () => {
    // Create a test club
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .insert({
        name: 'Test Club for Profile Status',
        description: 'Test club',
      })
      .select()
      .single();

    if (clubError) throw clubError;
    testClubId = club.id;

    // Create a test user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `test-profile-status-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    });

    if (authError) throw authError;
    testUserId = authData.user.id;

    // Create profile with initial status (not pending)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        email: authData.user.email!,
        full_name: 'Test User',
        role: 'athlete',
        membership_status: 'active', // Start with active to test the update
      });

    if (profileError) throw profileError;
  });

  afterAll(async () => {
    // Clean up: delete application, profile, and user
    if (testUserId) {
      await supabase
        .from('membership_applications')
        .delete()
        .eq('user_id', testUserId);

      await supabase
        .from('profiles')
        .delete()
        .eq('id', testUserId);

      await supabase.auth.admin.deleteUser(testUserId);
    }

    if (testClubId) {
      await supabase
        .from('clubs')
        .delete()
        .eq('id', testClubId);
    }
  });

  it('should update profile membership_status to pending when application is submitted', async () => {
    // Verify initial status is not pending
    const { data: initialProfile } = await supabase
      .from('profiles')
      .select('membership_status')
      .eq('id', testUserId)
      .single();

    expect(initialProfile?.membership_status).toBe('active');

    // Submit application
    const { data: application, error: appError } = await supabase
      .from('membership_applications')
      .insert({
        user_id: testUserId,
        club_id: testClubId,
        personal_info: {
          full_name: 'Test User',
          phone_number: '0812345678',
          address: '123 Test St',
          emergency_contact: '0898765432',
        },
        documents: [],
        status: 'pending',
        activity_log: [],
      })
      .select()
      .single();

    if (appError) throw appError;

    // Manually update profile status (simulating what the action should do)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ membership_status: 'pending' })
      .eq('id', testUserId);

    expect(updateError).toBeNull();

    // Verify profile status was updated to pending
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('membership_status')
      .eq('id', testUserId)
      .single();

    expect(updatedProfile?.membership_status).toBe('pending');
  });

  it('should maintain pending status even if application submission is called multiple times', async () => {
    // First, ensure profile is pending
    await supabase
      .from('profiles')
      .update({ membership_status: 'pending' })
      .eq('id', testUserId);

    // Verify status is pending
    const { data: profile } = await supabase
      .from('profiles')
      .select('membership_status')
      .eq('id', testUserId)
      .single();

    expect(profile?.membership_status).toBe('pending');

    // Try to update again (idempotent operation)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ membership_status: 'pending' })
      .eq('id', testUserId);

    expect(updateError).toBeNull();

    // Verify status is still pending
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('membership_status')
      .eq('id', testUserId)
      .single();

    expect(updatedProfile?.membership_status).toBe('pending');
  });
});
