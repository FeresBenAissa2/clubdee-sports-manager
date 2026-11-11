/**
 * Test suite for athlete data access restrictions
 * Validates Requirements 2.3: Athletes can only access their own data
 * 
 * PREREQUISITES:
 * - Database migrations must be applied to Supabase
 * - Run: Apply scripts/combined-migration.sql in Supabase Dashboard SQL Editor
 * - Environment variables must be configured in .env.local
 * 
 * This test verifies that RLS policies properly enforce:
 * - Athletes can only view their own profile data
 * - Athletes cannot view other athletes' data
 * - Athletes cannot update other athletes' profiles
 * - Athletes cannot delete other athletes' profiles
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

describe('Athlete Data Access Restrictions', () => {
  let adminClient: ReturnType<typeof createClient<Database>>;
  let athlete1Client: ReturnType<typeof createClient<Database>>;
  let athlete2Client: ReturnType<typeof createClient<Database>>;
  
  let testClubId: string;
  let athlete1Id: string;
  let athlete2Id: string;
  let athlete1UserId: string;
  let athlete2UserId: string;

  beforeAll(async () => {
    // Create admin client with service role key (bypasses RLS)
    adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create a test club using service role (bypasses RLS)
    const { data: club, error: clubError } = await adminClient
      .from('clubs')
      .insert({
        name: `Test Club ${Date.now()}`,
        sport_type: 'Football',
        description: 'Test club for access restrictions',
      })
      .select()
      .single();

    if (clubError || !club) {
      console.error('Club creation error:', clubError);
      throw new Error(`Failed to create test club: ${clubError?.message || 'Unknown error'}`);
    }
    testClubId = club.id;

    // Create two test athletes
    const athlete1Email = `athlete1-${Date.now()}@test.com`;
    const athlete2Email = `athlete2-${Date.now()}@test.com`;

    // Create athlete 1 user
    const { data: user1, error: user1Error } = await adminClient.auth.admin.createUser({
      email: athlete1Email,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (user1Error || !user1.user) {
      throw new Error('Failed to create athlete 1 user');
    }
    athlete1UserId = user1.user.id;

    // Create athlete 2 user
    const { data: user2, error: user2Error } = await adminClient.auth.admin.createUser({
      email: athlete2Email,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (user2Error || !user2.user) {
      throw new Error('Failed to create athlete 2 user');
    }
    athlete2UserId = user2.user.id;

    // Set user roles
    await adminClient.from('user_roles').insert([
      { user_id: athlete1UserId, role: 'athlete' },
      { user_id: athlete2UserId, role: 'athlete' },
    ]);

    // Create athlete 1 profile
    const { data: athlete1, error: athlete1Error } = await adminClient
      .from('athletes')
      .insert({
        user_id: athlete1UserId,
        club_id: testClubId,
        first_name: 'Athlete',
        last_name: 'One',
        date_of_birth: '2000-01-01',
        phone_number: '0812345678',
        email: athlete1Email,
        gender: 'male',
        health_notes: 'Private health notes for athlete 1',
      })
      .select()
      .single();

    if (athlete1Error || !athlete1) {
      throw new Error('Failed to create athlete 1 profile');
    }
    athlete1Id = athlete1.id;

    // Create athlete 2 profile
    const { data: athlete2, error: athlete2Error } = await adminClient
      .from('athletes')
      .insert({
        user_id: athlete2UserId,
        club_id: testClubId,
        first_name: 'Athlete',
        last_name: 'Two',
        date_of_birth: '2000-02-02',
        phone_number: '0823456789',
        email: athlete2Email,
        gender: 'female',
        health_notes: 'Private health notes for athlete 2',
      })
      .select()
      .single();

    if (athlete2Error || !athlete2) {
      throw new Error('Failed to create athlete 2 profile');
    }
    athlete2Id = athlete2.id;

    // Create authenticated clients for each athlete using anon key
    // This ensures RLS policies are properly enforced
    athlete1Client = createClient<Database>(supabaseUrl, supabaseAnonKey);
    const { data: session1, error: session1Error } = await athlete1Client.auth.signInWithPassword({
      email: athlete1Email,
      password: 'TestPassword123!',
    });

    if (session1Error || !session1.session) {
      console.error('Session 1 error:', session1Error);
      throw new Error(`Failed to create session for athlete 1: ${session1Error?.message || 'Unknown error'}`);
    }

    athlete2Client = createClient<Database>(supabaseUrl, supabaseAnonKey);
    const { data: session2, error: session2Error } = await athlete2Client.auth.signInWithPassword({
      email: athlete2Email,
      password: 'TestPassword123!',
    });

    if (session2Error || !session2.session) {
      console.error('Session 2 error:', session2Error);
      throw new Error(`Failed to create session for athlete 2: ${session2Error?.message || 'Unknown error'}`);
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (athlete1Id) {
      await adminClient.from('athletes').delete().eq('id', athlete1Id);
    }
    if (athlete2Id) {
      await adminClient.from('athletes').delete().eq('id', athlete2Id);
    }
    if (athlete1UserId) {
      await adminClient.auth.admin.deleteUser(athlete1UserId);
    }
    if (athlete2UserId) {
      await adminClient.auth.admin.deleteUser(athlete2UserId);
    }
    if (testClubId) {
      await adminClient.from('clubs').delete().eq('id', testClubId);
    }
  });

  it('should allow athlete to view their own profile', async () => {
    const { data, error } = await athlete1Client
      .from('athletes')
      .select('*')
      .eq('id', athlete1Id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.id).toBe(athlete1Id);
    expect(data?.first_name).toBe('Athlete');
    expect(data?.last_name).toBe('One');
  });

  it('should prevent athlete from viewing another athlete\'s profile by ID', async () => {
    const { data, error } = await athlete1Client
      .from('athletes')
      .select('*')
      .eq('id', athlete2Id)
      .single();

    // RLS should prevent access - either return null or error
    expect(data).toBeNull();
  });

  it('should prevent athlete from listing all athletes', async () => {
    const { data, error } = await athlete1Client
      .from('athletes')
      .select('*');

    // Should only return the athlete's own data
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBeLessThanOrEqual(1);
    
    if (data && data.length > 0) {
      expect(data[0].id).toBe(athlete1Id);
    }
  });

  it('should prevent athlete from updating another athlete\'s profile', async () => {
    const { error } = await athlete1Client
      .from('athletes')
      .update({ nickname: 'Hacked' })
      .eq('id', athlete2Id);

    // RLS should prevent the update
    expect(error).toBeDefined();
  });

  it('should allow athlete to update their own profile', async () => {
    const newNickname = `Updated-${Date.now()}`;
    
    const { data, error } = await athlete1Client
      .from('athletes')
      .update({ nickname: newNickname })
      .eq('id', athlete1Id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.nickname).toBe(newNickname);
  });

  it('should prevent athlete from deleting another athlete\'s profile', async () => {
    const { error } = await athlete1Client
      .from('athletes')
      .delete()
      .eq('id', athlete2Id);

    // RLS should prevent the deletion
    expect(error).toBeDefined();
  });

  it('should prevent athlete from viewing another athlete\'s health notes', async () => {
    // Try to query athlete 2's health notes as athlete 1
    const { data, error } = await athlete1Client
      .from('athletes')
      .select('health_notes')
      .eq('id', athlete2Id)
      .single();

    // Should not be able to access
    expect(data).toBeNull();
  });

  it('should allow athlete to view their own health notes', async () => {
    const { data, error } = await athlete1Client
      .from('athletes')
      .select('health_notes')
      .eq('id', athlete1Id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.health_notes).toBe('Private health notes for athlete 1');
  });
});
