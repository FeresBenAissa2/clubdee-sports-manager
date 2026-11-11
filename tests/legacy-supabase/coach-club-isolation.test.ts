/**
 * Coach Club Isolation Tests
 * 
 * Tests that coaches can only view applications for their own club
 * Validates: AC2 - Coach Assignment by Club
 * Task: 1.3 - Coach can view only their club's applications
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for setup
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

describe('Coach Club Isolation - RLS Policy Tests', () => {
  let testClubA: any;
  let testClubB: any;
  let coachA: any;
  let coachB: any;
  let athleteA: any;
  let athleteB: any;
  let applicationA: any;
  let applicationB: any;
  let adminUser: any;
  let adminAuthClient: any;

  beforeAll(async () => {
    // Create admin user for test setup
    const { data: { user: admin } } = await adminClient.auth.admin.createUser({
      email: `admin-test-${Date.now()}@test.com`,
      password: 'password123',
      email_confirm: true,
    });
    adminUser = admin;

    // Set up admin role
    await adminClient.from('user_roles').insert({
      user_id: adminUser.id,
      role: 'admin',
    });

    await adminClient.from('profiles').insert({
      id: adminUser.id,
      email: adminUser.email,
      full_name: 'Test Admin',
      club_id: null,
    });

    // Create authenticated admin client
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: adminUser.email,
      password: 'password123',
    });

    adminAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      },
    });
    // Create test clubs
    const { data: clubs } = await adminClient
      .from('clubs')
      .insert([
        { name: 'Test Club A', description: 'Club A for testing' },
        { name: 'Test Club B', description: 'Club B for testing' },
      ])
      .select();

    testClubA = clubs![0];
    testClubB = clubs![1];

    // Create test users (coaches and athletes)
    
    // Create coach A
    const { data: { user: coachAUser } } = await adminClient.auth.admin.createUser({
      email: `coach-a-${Date.now()}@test.com`,
      password: 'password123',
      email_confirm: true,
    });
    coachA = coachAUser;

    // Create coach B
    const { data: { user: coachBUser } } = await adminClient.auth.admin.createUser({
      email: `coach-b-${Date.now()}@test.com`,
      password: 'password123',
      email_confirm: true,
    });
    coachB = coachBUser;

    // Create athlete A
    const { data: { user: athleteAUser } } = await adminClient.auth.admin.createUser({
      email: `athlete-a-${Date.now()}@test.com`,
      password: 'password123',
      email_confirm: true,
    });
    athleteA = athleteAUser;

    // Create athlete B
    const { data: { user: athleteBUser } } = await adminClient.auth.admin.createUser({
      email: `athlete-b-${Date.now()}@test.com`,
      password: 'password123',
      email_confirm: true,
    });
    athleteB = athleteBUser;

    // Set up user roles
    await adminClient.from('user_roles').insert([
      { user_id: coachA.id, role: 'coach' },
      { user_id: coachB.id, role: 'coach' },
      { user_id: athleteA.id, role: 'athlete' },
      { user_id: athleteB.id, role: 'athlete' },
    ]);

    // Set up profiles with club assignments
    await adminClient.from('profiles').insert([
      {
        id: coachA.id,
        email: coachA.email,
        full_name: 'Coach A',
        club_id: testClubA.id,
      },
      {
        id: coachB.id,
        email: coachB.email,
        full_name: 'Coach B',
        club_id: testClubB.id,
      },
      {
        id: athleteA.id,
        email: athleteA.email,
        full_name: 'Athlete A',
        club_id: null, // Not assigned yet
      },
      {
        id: athleteB.id,
        email: athleteB.email,
        full_name: 'Athlete B',
        club_id: null, // Not assigned yet
      },
    ]);

    // Create membership applications using authenticated admin client
    const { data: applications } = await adminAuthClient
      .from('membership_applications')
      .insert([
        {
          user_id: athleteA.id,
          club_id: testClubA.id,
          personal_info: { full_name: 'Athlete A', phone: '081-111-1111' },
          status: 'pending',
        },
        {
          user_id: athleteB.id,
          club_id: testClubB.id,
          personal_info: { full_name: 'Athlete B', phone: '081-222-2222' },
          status: 'pending',
        },
      ])
      .select();

    applicationA = applications![0];
    applicationB = applications![1];
  });

  afterAll(async () => {
    // Clean up test data
    if (applicationA) {
      await adminClient
        .from('membership_applications')
        .delete()
        .eq('id', applicationA.id);
    }
    if (applicationB) {
      await adminClient
        .from('membership_applications')
        .delete()
        .eq('id', applicationB.id);
    }

    if (coachA) {
      await adminClient.from('profiles').delete().eq('id', coachA.id);
      await adminClient.from('user_roles').delete().eq('user_id', coachA.id);
      await adminClient.auth.admin.deleteUser(coachA.id);
    }
    if (coachB) {
      await adminClient.from('profiles').delete().eq('id', coachB.id);
      await adminClient.from('user_roles').delete().eq('user_id', coachB.id);
      await adminClient.auth.admin.deleteUser(coachB.id);
    }
    if (athleteA) {
      await adminClient.from('profiles').delete().eq('id', athleteA.id);
      await adminClient.from('user_roles').delete().eq('user_id', athleteA.id);
      await adminClient.auth.admin.deleteUser(athleteA.id);
    }
    if (athleteB) {
      await adminClient.from('profiles').delete().eq('id', athleteB.id);
      await adminClient.from('user_roles').delete().eq('user_id', athleteB.id);
      await adminClient.auth.admin.deleteUser(athleteB.id);
    }

    if (testClubA) {
      await adminClient.from('clubs').delete().eq('id', testClubA.id);
    }
    if (testClubB) {
      await adminClient.from('clubs').delete().eq('id', testClubB.id);
    }

    if (adminUser) {
      await adminClient.from('profiles').delete().eq('id', adminUser.id);
      await adminClient.from('user_roles').delete().eq('user_id', adminUser.id);
      await adminClient.auth.admin.deleteUser(adminUser.id);
    }
  });

  it('Coach A can view applications for Club A only', async () => {
    // Create client authenticated as Coach A
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: coachA.email,
      password: 'password123',
    });

    const coachAClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      },
    });

    // Query applications
    const { data: applications, error } = await coachAClient
      .from('membership_applications')
      .select('*');

    expect(error).toBeNull();
    expect(applications).toBeDefined();
    expect(applications!.length).toBeGreaterThan(0);

    // Coach A should only see applications for Club A
    const clubIds = applications!.map((app) => app.club_id);
    expect(clubIds).toContain(testClubA.id);
    expect(clubIds).not.toContain(testClubB.id);

    // Specifically check that application A is visible
    const appIds = applications!.map((app) => app.id);
    expect(appIds).toContain(applicationA.id);
    expect(appIds).not.toContain(applicationB.id);

    await coachAClient.auth.signOut();
  });

  it('Coach B can view applications for Club B only', async () => {
    // Create client authenticated as Coach B
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: coachB.email,
      password: 'password123',
    });

    const coachBClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      },
    });

    // Query applications
    const { data: applications, error } = await coachBClient
      .from('membership_applications')
      .select('*');

    expect(error).toBeNull();
    expect(applications).toBeDefined();
    expect(applications!.length).toBeGreaterThan(0);

    // Coach B should only see applications for Club B
    const clubIds = applications!.map((app) => app.club_id);
    expect(clubIds).toContain(testClubB.id);
    expect(clubIds).not.toContain(testClubA.id);

    // Specifically check that application B is visible
    const appIds = applications!.map((app) => app.id);
    expect(appIds).toContain(applicationB.id);
    expect(appIds).not.toContain(applicationA.id);

    await coachBClient.auth.signOut();
  });

  it('Coach A cannot view applications for Club B', async () => {
    // Create client authenticated as Coach A
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: coachA.email,
      password: 'password123',
    });

    const coachAClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      },
    });

    // Try to query application B directly
    const { data: application, error } = await coachAClient
      .from('membership_applications')
      .select('*')
      .eq('id', applicationB.id)
      .single();

    // Should return no data (RLS blocks it)
    expect(application).toBeNull();

    await coachAClient.auth.signOut();
  });

  it('Athletes can only view their own applications', async () => {
    // Create client authenticated as Athlete A
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: athleteA.email,
      password: 'password123',
    });

    const athleteAClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      },
    });

    // Query applications
    const { data: applications } = await athleteAClient
      .from('membership_applications')
      .select('*');

    expect(applications).toBeDefined();

    // Athlete A should only see their own application
    const appIds = applications!.map((app) => app.id);
    expect(appIds).toContain(applicationA.id);
    expect(appIds).not.toContain(applicationB.id);

    await athleteAClient.auth.signOut();
  });

  it('Coach A can approve applications for Club A', async () => {
    // Create a new test athlete for this test
    const { data: { user: newAthlete } } = await adminClient.auth.admin.createUser({
      email: `athlete-test-${Date.now()}@test.com`,
      password: 'password123',
      email_confirm: true,
    });

    await adminClient.from('user_roles').insert({
      user_id: newAthlete!.id,
      role: 'athlete',
    });

    await adminClient.from('profiles').insert({
      id: newAthlete!.id,
      email: newAthlete!.email,
      full_name: 'Test Athlete',
      club_id: null,
    });

    // Create a new application for Club A to approve
    const { data: newApplication, error: insertError } = await adminAuthClient
      .from('membership_applications')
      .insert({
        user_id: newAthlete!.id,
        club_id: testClubA.id,
        personal_info: { full_name: 'Test Athlete', phone: '081-333-3333' },
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
    }
    expect(newApplication).toBeDefined();

    // Create client authenticated as Coach A
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: coachA.email,
      password: 'password123',
    });

    const coachAClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      },
    });

    // Try to approve the application
    const { data: updatedApp, error } = await coachAClient
      .from('membership_applications')
      .update({
        status: 'approved',
        reviewed_by: coachA.id,
        assigned_coach_id: coachA.id,
      })
      .eq('id', newApplication!.id)
      .select()
      .single();

    // Should succeed
    expect(error).toBeNull();
    expect(updatedApp).toBeDefined();
    expect(updatedApp!.status).toBe('approved');
    expect(updatedApp!.reviewed_by).toBe(coachA.id);

    // Clean up
    await adminClient
      .from('membership_applications')
      .delete()
      .eq('id', newApplication!.id);
    await adminClient.from('profiles').delete().eq('id', newAthlete!.id);
    await adminClient.from('user_roles').delete().eq('user_id', newAthlete!.id);
    await adminClient.auth.admin.deleteUser(newAthlete!.id);

    await coachAClient.auth.signOut();
  });

  it('Coach A cannot approve applications for Club B', async () => {
    // Create a new test athlete for this test
    const { data: { user: newAthlete } } = await adminClient.auth.admin.createUser({
      email: `athlete-test-b-${Date.now()}@test.com`,
      password: 'password123',
      email_confirm: true,
    });

    await adminClient.from('user_roles').insert({
      user_id: newAthlete!.id,
      role: 'athlete',
    });

    await adminClient.from('profiles').insert({
      id: newAthlete!.id,
      email: newAthlete!.email,
      full_name: 'Test Athlete B',
      club_id: null,
    });

    // Create a new application for Club B
    const { data: newApplication } = await adminAuthClient
      .from('membership_applications')
      .insert({
        user_id: newAthlete!.id,
        club_id: testClubB.id,
        personal_info: { full_name: 'Test Athlete B', phone: '081-444-4444' },
        status: 'pending',
      })
      .select()
      .single();

    // Create client authenticated as Coach A
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: coachA.email,
      password: 'password123',
    });

    const coachAClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      },
    });

    // Try to approve the application for Club B (should fail)
    const { data: updatedApp, error } = await coachAClient
      .from('membership_applications')
      .update({
        status: 'approved',
        reviewed_by: coachA.id,
        assigned_coach_id: coachA.id,
      })
      .eq('id', newApplication!.id)
      .select()
      .single();

    // Should fail - Coach A cannot update Club B applications
    expect(updatedApp).toBeNull();
    expect(error).toBeDefined();

    // Verify the application is still pending
    const { data: checkApp } = await adminClient
      .from('membership_applications')
      .select('status')
      .eq('id', newApplication!.id)
      .single();

    expect(checkApp!.status).toBe('pending');

    // Clean up
    await adminClient
      .from('membership_applications')
      .delete()
      .eq('id', newApplication!.id);
    await adminClient.from('profiles').delete().eq('id', newAthlete!.id);
    await adminClient.from('user_roles').delete().eq('user_id', newAthlete!.id);
    await adminClient.auth.admin.deleteUser(newAthlete!.id);

    await coachAClient.auth.signOut();
  });

  it('Coach B can reject applications for Club B', async () => {
    // Create a new test athlete for this test
    const { data: { user: newAthlete } } = await adminClient.auth.admin.createUser({
      email: `athlete-test-c-${Date.now()}@test.com`,
      password: 'password123',
      email_confirm: true,
    });

    await adminClient.from('user_roles').insert({
      user_id: newAthlete!.id,
      role: 'athlete',
    });

    await adminClient.from('profiles').insert({
      id: newAthlete!.id,
      email: newAthlete!.email,
      full_name: 'Test Athlete C',
      club_id: null,
    });

    // Create a new application for Club B to reject
    const { data: newApplication } = await adminAuthClient
      .from('membership_applications')
      .insert({
        user_id: newAthlete!.id,
        club_id: testClubB.id,
        personal_info: { full_name: 'Test Athlete C', phone: '081-555-5555' },
        status: 'pending',
      })
      .select()
      .single();

    // Create client authenticated as Coach B
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: coachB.email,
      password: 'password123',
    });

    const coachBClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      },
    });

    // Try to reject the application
    const { data: updatedApp, error } = await coachBClient
      .from('membership_applications')
      .update({
        status: 'rejected',
        reviewed_by: coachB.id,
        rejection_reason: 'Does not meet requirements',
      })
      .eq('id', newApplication!.id)
      .select()
      .single();

    // Should succeed
    expect(error).toBeNull();
    expect(updatedApp).toBeDefined();
    expect(updatedApp!.status).toBe('rejected');
    expect(updatedApp!.reviewed_by).toBe(coachB.id);
    expect(updatedApp!.rejection_reason).toBe('Does not meet requirements');

    // Clean up
    await adminClient
      .from('membership_applications')
      .delete()
      .eq('id', newApplication!.id);
    await adminClient.from('profiles').delete().eq('id', newAthlete!.id);
    await adminClient.from('user_roles').delete().eq('user_id', newAthlete!.id);
    await adminClient.auth.admin.deleteUser(newAthlete!.id);

    await coachBClient.auth.signOut();
  });

  it('Coach B cannot reject applications for Club A', async () => {
    // Create a new test athlete for this test
    const { data: { user: newAthlete } } = await adminClient.auth.admin.createUser({
      email: `athlete-test-d-${Date.now()}@test.com`,
      password: 'password123',
      email_confirm: true,
    });

    await adminClient.from('user_roles').insert({
      user_id: newAthlete!.id,
      role: 'athlete',
    });

    await adminClient.from('profiles').insert({
      id: newAthlete!.id,
      email: newAthlete!.email,
      full_name: 'Test Athlete D',
      club_id: null,
    });

    // Create a new application for Club A
    const { data: newApplication } = await adminAuthClient
      .from('membership_applications')
      .insert({
        user_id: newAthlete!.id,
        club_id: testClubA.id,
        personal_info: { full_name: 'Test Athlete D', phone: '081-666-6666' },
        status: 'pending',
      })
      .select()
      .single();

    // Create client authenticated as Coach B
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: coachB.email,
      password: 'password123',
    });

    const coachBClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      },
    });

    // Try to reject the application for Club A (should fail)
    const { data: updatedApp, error } = await coachBClient
      .from('membership_applications')
      .update({
        status: 'rejected',
        reviewed_by: coachB.id,
        rejection_reason: 'Unauthorized rejection',
      })
      .eq('id', newApplication!.id)
      .select()
      .single();

    // Should fail - Coach B cannot update Club A applications
    expect(updatedApp).toBeNull();
    expect(error).toBeDefined();

    // Verify the application is still pending
    const { data: checkApp } = await adminClient
      .from('membership_applications')
      .select('status')
      .eq('id', newApplication!.id)
      .single();

    expect(checkApp!.status).toBe('pending');

    // Clean up
    await adminClient
      .from('membership_applications')
      .delete()
      .eq('id', newApplication!.id);
    await adminClient.from('profiles').delete().eq('id', newAthlete!.id);
    await adminClient.from('user_roles').delete().eq('user_id', newAthlete!.id);
    await adminClient.auth.admin.deleteUser(newAthlete!.id);

    await coachBClient.auth.signOut();
  });

  it('Admin can view all applications from all clubs', async () => {
    // Create client authenticated as Admin
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: adminUser.email,
      password: 'password123',
    });

    const adminAuthenticatedClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      },
    });

    // Query all applications
    const { data: applications, error } = await adminAuthenticatedClient
      .from('membership_applications')
      .select('*');

    expect(error).toBeNull();
    expect(applications).toBeDefined();
    expect(applications!.length).toBeGreaterThan(0);

    // Admin should see applications from both clubs
    const clubIds = applications!.map((app) => app.club_id);
    expect(clubIds).toContain(testClubA.id);
    expect(clubIds).toContain(testClubB.id);

    // Admin should see both test applications
    const appIds = applications!.map((app) => app.id);
    expect(appIds).toContain(applicationA.id);
    expect(appIds).toContain(applicationB.id);

    await adminAuthenticatedClient.auth.signOut();
  });

  it('Admin can update applications from any club', async () => {
    // Create a new test athlete for this test
    const { data: { user: newAthlete } } = await adminClient.auth.admin.createUser({
      email: `athlete-test-admin-${Date.now()}@test.com`,
      password: 'password123',
      email_confirm: true,
    });

    await adminClient.from('user_roles').insert({
      user_id: newAthlete!.id,
      role: 'athlete',
    });

    await adminClient.from('profiles').insert({
      id: newAthlete!.id,
      email: newAthlete!.email,
      full_name: 'Test Athlete Admin',
      club_id: null,
    });

    // Create a new application for Club A
    const { data: newApplication } = await adminAuthClient
      .from('membership_applications')
      .insert({
        user_id: newAthlete!.id,
        club_id: testClubA.id,
        personal_info: { full_name: 'Test Athlete Admin', phone: '081-777-7777' },
        status: 'pending',
      })
      .select()
      .single();

    // Create client authenticated as Admin
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: adminUser.email,
      password: 'password123',
    });

    const adminAuthenticatedClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
        },
      },
    });

    // Admin should be able to approve the application
    const { data: updatedApp, error } = await adminAuthenticatedClient
      .from('membership_applications')
      .update({
        status: 'approved',
        reviewed_by: adminUser.id,
        assigned_coach_id: coachA.id,
      })
      .eq('id', newApplication!.id)
      .select()
      .single();

    // Should succeed
    expect(error).toBeNull();
    expect(updatedApp).toBeDefined();
    expect(updatedApp!.status).toBe('approved');
    expect(updatedApp!.reviewed_by).toBe(adminUser.id);

    // Clean up
    await adminClient
      .from('membership_applications')
      .delete()
      .eq('id', newApplication!.id);
    await adminClient.from('profiles').delete().eq('id', newAthlete!.id);
    await adminClient.from('user_roles').delete().eq('user_id', newAthlete!.id);
    await adminClient.auth.admin.deleteUser(newAthlete!.id);

    await adminAuthenticatedClient.auth.signOut();
  });
});
