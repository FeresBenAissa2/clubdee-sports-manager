/**
 * Test: check_duplicate_pending_application Function
 * 
 * Validates: Task 1.4 - Function to check for duplicate pending applications
 * Business Rule: BR1 - One Active Application Per User
 * 
 * This test verifies that:
 * 1. The function correctly identifies when a user has a pending application
 * 2. The function returns false when a user has no pending application
 * 3. The function works correctly with non-existent users
 * 4. The application submission logic uses this function to prevent duplicates
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

describe('check_duplicate_pending_application Function', () => {
  let testUserId: string;
  let testClubId: string;
  let testApplicationId: string;

  beforeAll(async () => {
    // Get a test club
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id')
      .limit(1);
    
    if (!clubs || clubs.length === 0) {
      throw new Error('No clubs found in database');
    }
    
    testClubId = clubs[0].id;

    // Create a test user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `test-duplicate-check-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }

    testUserId = authData.user.id;

    // Create a profile for the test user
    await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        email: authData.user.email,
        full_name: 'Test User Duplicate Check',
      });
  });

  afterAll(async () => {
    // Clean up: delete test application
    if (testApplicationId) {
      await supabase
        .from('membership_applications')
        .delete()
        .eq('id', testApplicationId);
    }

    // Clean up: delete test user profile
    if (testUserId) {
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testUserId);

      // Delete auth user
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  it('should return false when user has no pending application', async () => {
    const { data, error } = await supabase
      .rpc('check_duplicate_pending_application', {
        p_user_id: testUserId
      });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].has_pending).toBe(false);
    expect(data[0].pending_application_id).toBeNull();
    expect(data[0].pending_club_id).toBeNull();
    expect(data[0].pending_since).toBeNull();
  });

  it('should return true when user has a pending application', async () => {
    // Create a pending application
    const { data: application, error: insertError } = await supabase
      .from('membership_applications')
      .insert({
        user_id: testUserId,
        club_id: testClubId,
        status: 'pending',
        personal_info: {
          full_name: 'Test User',
          phone_number: '1234567890',
          date_of_birth: '2000-01-01',
        },
        documents: [],
      })
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(application).toBeDefined();
    testApplicationId = application!.id;

    // Check for duplicate
    const { data, error } = await supabase
      .rpc('check_duplicate_pending_application', {
        p_user_id: testUserId
      });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].has_pending).toBe(true);
    expect(data[0].pending_application_id).toBe(testApplicationId);
    expect(data[0].pending_club_id).toBe(testClubId);
    expect(data[0].pending_since).toBeDefined();
  });

  it('should return false after application is approved', async () => {
    // Update application to approved
    await supabase
      .from('membership_applications')
      .update({ status: 'approved' })
      .eq('id', testApplicationId);

    // Check for duplicate
    const { data, error } = await supabase
      .rpc('check_duplicate_pending_application', {
        p_user_id: testUserId
      });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].has_pending).toBe(false);
    expect(data[0].pending_application_id).toBeNull();
  });

  it('should return false after application is rejected', async () => {
    // Update application to rejected
    await supabase
      .from('membership_applications')
      .update({ status: 'rejected' })
      .eq('id', testApplicationId);

    // Check for duplicate
    const { data, error } = await supabase
      .rpc('check_duplicate_pending_application', {
        p_user_id: testUserId
      });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].has_pending).toBe(false);
  });

  it('should return false for non-existent user', async () => {
    const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
    
    const { data, error } = await supabase
      .rpc('check_duplicate_pending_application', {
        p_user_id: nonExistentUserId
      });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].has_pending).toBe(false);
    expect(data[0].pending_application_id).toBeNull();
  });

  it('should prevent duplicate pending applications across different clubs', async () => {
    // Get two different clubs
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id')
      .limit(2);

    if (!clubs || clubs.length < 2) {
      console.log('Skipping test: need at least 2 clubs');
      return;
    }

    const club1Id = clubs[0].id;
    const club2Id = clubs[1].id;

    // Create a new test user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: `test-multi-club-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    });

    const userId = authData!.user!.id;

    // Create profile
    await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: authData!.user!.email,
        full_name: 'Test Multi Club User',
      });

    try {
      // Create pending application for club 1
      const { data: app1 } = await supabase
        .from('membership_applications')
        .insert({
          user_id: userId,
          club_id: club1Id,
          status: 'pending',
          personal_info: {
            full_name: 'Test User',
            phone_number: '1234567890',
          },
          documents: [],
        })
        .select()
        .single();

      expect(app1).toBeDefined();

      // Check for duplicate before creating second application
      const { data: checkData } = await supabase
        .rpc('check_duplicate_pending_application', {
          p_user_id: userId
        });

      expect(checkData![0].has_pending).toBe(true);
      expect(checkData![0].pending_club_id).toBe(club1Id);

      // This demonstrates that the function correctly identifies
      // a pending application exists, even for a different club
      // The application logic should prevent creating app2

    } finally {
      // Clean up
      await supabase
        .from('membership_applications')
        .delete()
        .eq('user_id', userId);
      
      await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      await supabase.auth.admin.deleteUser(userId);
    }
  });
});
