/**
 * Athlete View Own Applications Test
 * 
 * Tests that athletes can only view their own membership applications
 * Validates: Task 1.3 - Athlete can view only their own applications
 * Validates: AC4, AC5, AC6 - Post-approval, rejection, and pending state
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

describe('Athlete View Own Applications - RLS Policy Test', () => {
  let testClub: any;
  let athleteA: any;
  let athleteB: any;
  let applicationA: any;
  let applicationB: any;
  let adminUser: any;
  let adminAuthClient: any;

  beforeAll(async () => {
    // Create admin user for test setup
    const { data: { user: admin } } = await adminClient.auth.admin.createUser({
      email: `admin-athlete-test-${Date.now()}@test.com`,
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

    // Create test club
    const { data: clubs } = await adminClient
      .from('clubs')
      .insert([
        { name: 'Test Club for Athletes', description: 'Club for athlete RLS testing' },
      ])
      .select();

    testClub = clubs![0];

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
      { user_id: athleteA.id, role: 'athlete' },
      { user_id: athleteB.id, role: 'athlete' },
    ]);

    // Set up profiles
    await adminClient.from('profiles').insert([
      {
        id: athleteA.id,
        email: athleteA.email,
        full_name: 'Athlete A',
        club_id: null,
      },
      {
        id: athleteB.id,
        email: athleteB.email,
        full_name: 'Athlete B',
        club_id: null,
      },
    ]);

    // Create membership applications using authenticated admin client
    const { data: applications } = await adminAuthClient
      .from('membership_applications')
      .insert([
        {
          user_id: athleteA.id,
          club_id: testClub.id,
          personal_info: { full_name: 'Athlete A', phone: '081-111-1111' },
          status: 'pending',
        },
        {
          user_id: athleteB.id,
          club_id: testClub.id,
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

    if (testClub) {
      await adminClient.from('clubs').delete().eq('id', testClub.id);
    }

    if (adminUser) {
      await adminClient.from('profiles').delete().eq('id', adminUser.id);
      await adminClient.from('user_roles').delete().eq('user_id', adminUser.id);
      await adminClient.auth.admin.deleteUser(adminUser.id);
    }
  });

  it('Athlete A can view only their own application', async () => {
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

    // Query all applications
    const { data: applications, error } = await athleteAClient
      .from('membership_applications')
      .select('*');

    expect(error).toBeNull();
    expect(applications).toBeDefined();

    // Athlete A should only see their own application
    const appIds = applications!.map((app) => app.id);
    expect(appIds).toContain(applicationA.id);
    expect(appIds).not.toContain(applicationB.id);

    // Verify user_id matches
    applications!.forEach((app) => {
      expect(app.user_id).toBe(athleteA.id);
    });

    await athleteAClient.auth.signOut();
  });

  it('Athlete B can view only their own application', async () => {
    // Create client authenticated as Athlete B
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: athleteB.email,
      password: 'password123',
    });

    const athleteBClient = createClient(supabaseUrl, supabaseServiceKey, {
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
    const { data: applications, error } = await athleteBClient
      .from('membership_applications')
      .select('*');

    expect(error).toBeNull();
    expect(applications).toBeDefined();

    // Athlete B should only see their own application
    const appIds = applications!.map((app) => app.id);
    expect(appIds).toContain(applicationB.id);
    expect(appIds).not.toContain(applicationA.id);

    // Verify user_id matches
    applications!.forEach((app) => {
      expect(app.user_id).toBe(athleteB.id);
    });

    await athleteBClient.auth.signOut();
  });

  it('Athlete A cannot view Athlete B application by direct query', async () => {
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

    // Try to query Athlete B's application directly by ID
    const { data: application, error } = await athleteAClient
      .from('membership_applications')
      .select('*')
      .eq('id', applicationB.id)
      .single();

    // Should return no data (RLS blocks it)
    expect(application).toBeNull();
    // Error indicates no rows found (blocked by RLS)
    expect(error).toBeDefined();

    await athleteAClient.auth.signOut();
  });

  it('Athlete can view their application with different statuses', async () => {
    // Create a new athlete with multiple applications in different states
    const { data: { user: newAthlete } } = await adminClient.auth.admin.createUser({
      email: `athlete-multi-${Date.now()}@test.com`,
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
      full_name: 'Multi Status Athlete',
      club_id: null,
    });

    // Create applications with different statuses
    const { data: apps } = await adminAuthClient
      .from('membership_applications')
      .insert([
        {
          user_id: newAthlete!.id,
          club_id: testClub.id,
          personal_info: { full_name: 'Test', phone: '081-333-3333' },
          status: 'pending',
        },
        {
          user_id: newAthlete!.id,
          club_id: testClub.id,
          personal_info: { full_name: 'Test', phone: '081-444-4444' },
          status: 'approved',
        },
        {
          user_id: newAthlete!.id,
          club_id: testClub.id,
          personal_info: { full_name: 'Test', phone: '081-555-5555' },
          status: 'rejected',
          rejection_reason: 'Test rejection',
        },
      ])
      .select();

    // Create client authenticated as the new athlete
    const { data: { session } } = await adminClient.auth.signInWithPassword({
      email: newAthlete!.email,
      password: 'password123',
    });

    const athleteClient = createClient(supabaseUrl, supabaseServiceKey, {
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
    const { data: applications, error } = await athleteClient
      .from('membership_applications')
      .select('*');

    expect(error).toBeNull();
    expect(applications).toBeDefined();
    expect(applications!.length).toBe(3);

    // Verify all applications belong to this athlete
    applications!.forEach((app) => {
      expect(app.user_id).toBe(newAthlete!.id);
    });

    // Verify different statuses are visible
    const statuses = applications!.map((app) => app.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('approved');
    expect(statuses).toContain('rejected');

    // Clean up
    for (const app of apps!) {
      await adminClient
        .from('membership_applications')
        .delete()
        .eq('id', app.id);
    }
    await adminClient.from('profiles').delete().eq('id', newAthlete!.id);
    await adminClient.from('user_roles').delete().eq('user_id', newAthlete!.id);
    await adminClient.auth.admin.deleteUser(newAthlete!.id);

    await athleteClient.auth.signOut();
  });
});
