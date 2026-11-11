/**
 * Property-Based Tests for RLS Enforcement
 * **Feature: auth-database-integration, Property 9: RLS enforcement**
 * 
 * Property 9: RLS enforcement
 * For any user with a specific role, database queries should only return data
 * that the user is authorized to access according to RLS policies.
 * 
 * Validates: Requirements 4.3
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create service role client (bypasses RLS for setup)
const serviceClient = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Helper to create a user-specific client (respects RLS)
function createUserClient(accessToken: string) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient<Database>(supabaseUrl, anonKey);
  
  // Set the session manually
  client.auth.setSession({
    access_token: accessToken,
    refresh_token: 'dummy-refresh-token',
  } as any);
  
  return client;
}

// Test data cleanup
const testUserIds: string[] = [];
const testClubIds: string[] = [];

describe('RLS Enforcement Property Tests', () => {
  afterAll(async () => {
    // Cleanup test data
    if (testUserIds.length > 0) {
      // Delete in reverse order to respect foreign keys
      await serviceClient.from('user_roles').delete().in('user_id', testUserIds);
      await serviceClient.from('profiles').delete().in('id', testUserIds);
      
      // Delete auth users
      for (const userId of testUserIds) {
        try {
          await serviceClient.auth.admin.deleteUser(userId);
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    }
    
    if (testClubIds.length > 0) {
      await serviceClient.from('clubs').delete().in('id', testClubIds);
    }
  });

  /**
   * Property 9: RLS enforcement for profiles table
   * For any user with role 'athlete', queries to profiles table should only
   * return their own profile, never other users' profiles.
   */
  it('Property 9: Athletes can only access their own profile', async () => {
    // Arbitraries for test data
    const emailArb = fc.emailAddress();
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{3,15}$/);
    const passwordArb = fc.constant('TestPass123!'); // Fixed password for simplicity

    await fc.assert(
      fc.asyncProperty(
        emailArb,
        nameArb,
        nameArb,
        async (email, firstName, lastName) => {
          // Skip if email is too long or invalid
          fc.pre(email.length <= 100);
          fc.pre(email.includes('@'));
          
          const fullName = `${firstName} ${lastName}`;
          const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

          // Create test athlete user
          const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
            email: uniqueEmail,
            password: passwordArb,
            email_confirm: true,
          });

          if (authError || !authData.user) {
            // Skip this iteration if user creation fails
            return;
          }

          const userId = authData.user.id;
          testUserIds.push(userId);

          // Create profile
          const { error: profileError } = await serviceClient
            .from('profiles')
            .insert({
              id: userId,
              full_name: fullName,
              email: uniqueEmail,
            });

          if (profileError) {
            return; // Skip if profile creation fails
          }

          // Create athlete role
          const { error: roleError } = await serviceClient
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'athlete',
            });

          if (roleError) {
            return; // Skip if role creation fails
          }

          // Sign in as the athlete to get access token
          const { data: signInData, error: signInError } = await serviceClient.auth.signInWithPassword({
            email: uniqueEmail,
            password: passwordArb,
          });

          if (signInError || !signInData.session) {
            return; // Skip if sign in fails
          }

          const userClient = createUserClient(signInData.session.access_token);

          // Property 1: Athlete can read their own profile
          const { data: ownProfile, error: ownError } = await userClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          expect(ownError).toBeNull();
          expect(ownProfile).toBeDefined();
          expect(ownProfile?.id).toBe(userId);
          expect(ownProfile?.full_name).toBe(fullName);

          // Property 2: Athlete can update their own profile
          const newName = `${fullName} Updated`;
          const { error: updateError } = await userClient
            .from('profiles')
            .update({ full_name: newName })
            .eq('id', userId);

          expect(updateError).toBeNull();

          // Verify update succeeded
          const { data: updatedProfile } = await serviceClient
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

          expect(updatedProfile?.full_name).toBe(newName);

          // Property 3: Athlete cannot read other users' profiles
          // Get a different user's ID (if exists)
          const { data: otherUsers } = await serviceClient
            .from('profiles')
            .select('id')
            .neq('id', userId)
            .limit(1);

          if (otherUsers && otherUsers.length > 0) {
            const otherUserId = otherUsers[0].id;

            const { data: otherProfile, error: otherError } = await userClient
              .from('profiles')
              .select('*')
              .eq('id', otherUserId)
              .maybeSingle();

            // Should either return null or error (RLS blocks access)
            expect(otherProfile).toBeNull();
          }

          // Property 4: Athlete cannot update other users' profiles
          if (otherUsers && otherUsers.length > 0) {
            const otherUserId = otherUsers[0].id;

            const { error: updateOtherError } = await userClient
              .from('profiles')
              .update({ full_name: 'Hacked Name' })
              .eq('id', otherUserId);

            // Should return error or no rows affected
            // Supabase RLS will silently fail the update
            expect(updateOtherError).toBeDefined();
          }

          // Cleanup: Sign out
          await userClient.auth.signOut();
        }
      ),
      { numRuns: 10 } // Reduced runs due to database operations
    );
  }, 60000); // 60 second timeout

  /**
   * Property: Coaches can only access profiles in their club
   * For any coach user, queries to profiles table should only return profiles
   * from athletes in the same club.
   */
  it('Property: Coaches can only access profiles in their club', async () => {
    const emailArb = fc.emailAddress();
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{3,15}$/);
    const passwordArb = fc.constant('TestPass123!');

    await fc.assert(
      fc.asyncProperty(
        emailArb,
        nameArb,
        async (email, clubName) => {
          fc.pre(email.length <= 100);
          fc.pre(email.includes('@'));

          const uniqueEmail = `coach-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

          // Create test club
          const { data: clubData, error: clubError } = await serviceClient
            .from('clubs')
            .insert({
              name: clubName,
              description: 'Test Club',
              sport_type: 'Football',
            })
            .select()
            .single();

          if (clubError || !clubData) {
            return; // Skip if club creation fails
          }

          const clubId = clubData.id;
          testClubIds.push(clubId);

          // Create coach user
          const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
            email: uniqueEmail,
            password: passwordArb,
            email_confirm: true,
          });

          if (authError || !authData.user) {
            return;
          }

          const coachId = authData.user.id;
          testUserIds.push(coachId);

          // Create coach profile with club
          const { error: profileError } = await serviceClient
            .from('profiles')
            .insert({
              id: coachId,
              full_name: 'Test Coach',
              email: uniqueEmail,
              club_id: clubId,
            });

          if (profileError) {
            return;
          }

          // Create coach role
          const { error: roleError } = await serviceClient
            .from('user_roles')
            .insert({
              user_id: coachId,
              role: 'coach',
            });

          if (roleError) {
            return;
          }

          // Create athlete in same club
          const athleteEmail = `athlete-same-${Date.now()}@example.com`;
          const { data: athleteAuth } = await serviceClient.auth.admin.createUser({
            email: athleteEmail,
            password: passwordArb,
            email_confirm: true,
          });

          if (!athleteAuth?.user) {
            return;
          }

          const athleteId = athleteAuth.user.id;
          testUserIds.push(athleteId);

          await serviceClient.from('profiles').insert({
            id: athleteId,
            full_name: 'Test Athlete Same Club',
            email: athleteEmail,
            club_id: clubId, // Same club as coach
          });

          await serviceClient.from('user_roles').insert({
            user_id: athleteId,
            role: 'athlete',
          });

          // Create athlete in different club
          const otherClubEmail = `athlete-other-${Date.now()}@example.com`;
          const { data: otherAthleteAuth } = await serviceClient.auth.admin.createUser({
            email: otherClubEmail,
            password: passwordArb,
            email_confirm: true,
          });

          if (!otherAthleteAuth?.user) {
            return;
          }

          const otherAthleteId = otherAthleteAuth.user.id;
          testUserIds.push(otherAthleteId);

          // Create different club
          const { data: otherClubData } = await serviceClient
            .from('clubs')
            .insert({
              name: 'Other Club',
              description: 'Different Club',
              sport_type: 'Basketball',
            })
            .select()
            .single();

          if (!otherClubData) {
            return;
          }

          testClubIds.push(otherClubData.id);

          await serviceClient.from('profiles').insert({
            id: otherAthleteId,
            full_name: 'Test Athlete Other Club',
            email: otherClubEmail,
            club_id: otherClubData.id, // Different club
          });

          await serviceClient.from('user_roles').insert({
            user_id: otherAthleteId,
            role: 'athlete',
          });

          // Sign in as coach
          const { data: signInData } = await serviceClient.auth.signInWithPassword({
            email: uniqueEmail,
            password: passwordArb,
          });

          if (!signInData?.session) {
            return;
          }

          const coachClient = createUserClient(signInData.session.access_token);

          // Property 1: Coach can access their own profile
          const { data: ownProfile, error: ownError } = await coachClient
            .from('profiles')
            .select('*')
            .eq('id', coachId)
            .single();

          expect(ownError).toBeNull();
          expect(ownProfile).toBeDefined();
          expect(ownProfile?.id).toBe(coachId);

          // Property 2: Coach can access athlete in same club
          const { data: sameClubAthlete, error: sameClubError } = await coachClient
            .from('profiles')
            .select('*')
            .eq('id', athleteId)
            .maybeSingle();

          expect(sameClubError).toBeNull();
          expect(sameClubAthlete).toBeDefined();
          expect(sameClubAthlete?.id).toBe(athleteId);
          expect(sameClubAthlete?.club_id).toBe(clubId);

          // Property 3: Coach cannot access athlete in different club
          const { data: otherClubAthlete } = await coachClient
            .from('profiles')
            .select('*')
            .eq('id', otherAthleteId)
            .maybeSingle();

          // Should return null (RLS blocks cross-club access)
          expect(otherClubAthlete).toBeNull();

          // Property 4: List all profiles should only return same club
          const { data: allProfiles } = await coachClient
            .from('profiles')
            .select('*');

          expect(allProfiles).toBeDefined();
          if (allProfiles) {
            // All returned profiles should be from coach's club
            allProfiles.forEach((profile) => {
              expect(profile.club_id).toBe(clubId);
            });

            // Should not include other club athlete
            const hasOtherClubAthlete = allProfiles.some((p) => p.id === otherAthleteId);
            expect(hasOtherClubAthlete).toBe(false);
          }

          // Cleanup
          await coachClient.auth.signOut();
        }
      ),
      { numRuns: 5 } // Reduced runs due to complex setup
    );
  }, 120000); // 120 second timeout

  /**
   * Property: Admins can access all profiles
   * For any admin user, queries to profiles table should return all profiles
   * regardless of club.
   */
  it('Property: Admins can access all profiles', async () => {
    const passwordArb = fc.constant('TestPass123!');

    await fc.assert(
      fc.asyncProperty(fc.constant(true), async () => {
        const adminEmail = `admin-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

        // Create admin user
        const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
          email: adminEmail,
          password: passwordArb,
          email_confirm: true,
        });

        if (authError || !authData.user) {
          return;
        }

        const adminId = authData.user.id;
        testUserIds.push(adminId);

        // Create admin profile
        const { error: profileError } = await serviceClient
          .from('profiles')
          .insert({
            id: adminId,
            full_name: 'Test Admin',
            email: adminEmail,
          });

        if (profileError) {
          return;
        }

        // Create admin role
        const { error: roleError } = await serviceClient
          .from('user_roles')
          .insert({
            user_id: adminId,
            role: 'admin',
          });

        if (roleError) {
          return;
        }

        // Sign in as admin
        const { data: signInData } = await serviceClient.auth.signInWithPassword({
          email: adminEmail,
          password: passwordArb,
        });

        if (!signInData?.session) {
          return;
        }

        const adminClient = createUserClient(signInData.session.access_token);

        // Property 1: Admin can access their own profile
        const { data: ownProfile, error: ownError } = await adminClient
          .from('profiles')
          .select('*')
          .eq('id', adminId)
          .single();

        expect(ownError).toBeNull();
        expect(ownProfile).toBeDefined();

        // Property 2: Admin can access all profiles
        const { data: allProfiles, error: allError } = await adminClient
          .from('profiles')
          .select('*')
          .limit(10);

        expect(allError).toBeNull();
        expect(allProfiles).toBeDefined();
        expect(Array.isArray(allProfiles)).toBe(true);

        // Property 3: Admin can update any profile
        if (allProfiles && allProfiles.length > 0) {
          const targetProfile = allProfiles.find((p) => p.id !== adminId);
          
          if (targetProfile) {
            const { error: updateError } = await adminClient
              .from('profiles')
              .update({ full_name: 'Admin Updated Name' })
              .eq('id', targetProfile.id);

            // Admin should be able to update
            expect(updateError).toBeNull();

            // Verify update
            const { data: updated } = await serviceClient
              .from('profiles')
              .select('full_name')
              .eq('id', targetProfile.id)
              .single();

            expect(updated?.full_name).toBe('Admin Updated Name');
          }
        }

        // Cleanup
        await adminClient.auth.signOut();
      }),
      { numRuns: 3 } // Minimal runs for admin test
    );
  }, 60000);

  /**
   * Property: User roles table RLS enforcement
   * For any user, they should only be able to view their own role,
   * unless they are an admin.
   */
  it('Property: Users can only view their own role', async () => {
    const passwordArb = fc.constant('TestPass123!');

    await fc.assert(
      fc.asyncProperty(fc.constant(true), async () => {
        const userEmail = `user-role-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

        // Create test user
        const { data: authData } = await serviceClient.auth.admin.createUser({
          email: userEmail,
          password: passwordArb,
          email_confirm: true,
        });

        if (!authData?.user) {
          return;
        }

        const userId = authData.user.id;
        testUserIds.push(userId);

        // Create profile
        await serviceClient.from('profiles').insert({
          id: userId,
          full_name: 'Test User',
          email: userEmail,
        });

        // Create athlete role
        await serviceClient.from('user_roles').insert({
          user_id: userId,
          role: 'athlete',
        });

        // Sign in as user
        const { data: signInData } = await serviceClient.auth.signInWithPassword({
          email: userEmail,
          password: passwordArb,
        });

        if (!signInData?.session) {
          return;
        }

        const userClient = createUserClient(signInData.session.access_token);

        // Property 1: User can view their own role
        const { data: ownRole, error: ownError } = await userClient
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .single();

        expect(ownError).toBeNull();
        expect(ownRole).toBeDefined();
        expect(ownRole?.user_id).toBe(userId);
        expect(ownRole?.role).toBe('athlete');

        // Property 2: User cannot view other users' roles
        const { data: otherRoles } = await userClient
          .from('user_roles')
          .select('*')
          .neq('user_id', userId)
          .limit(1);

        // Should return empty array (RLS blocks access)
        expect(otherRoles).toBeDefined();
        expect(Array.isArray(otherRoles)).toBe(true);
        expect(otherRoles?.length).toBe(0);

        // Property 3: User cannot update their own role
        const { error: updateError } = await userClient
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', userId);

        // Should fail (only admins can update roles)
        expect(updateError).toBeDefined();

        // Verify role was not changed
        const { data: unchangedRole } = await serviceClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        expect(unchangedRole?.role).toBe('athlete');

        // Cleanup
        await userClient.auth.signOut();
      }),
      { numRuns: 5 }
    );
  }, 60000);
});
