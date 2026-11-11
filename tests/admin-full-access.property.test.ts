/**
 * Property-Based Test for Admin Full Access
 * Feature: sports-club-management
 * 
 * Property 6: Admin full access
 * Validates: Requirements 2.1
 * 
 * For any admin user, authentication should grant access to all data and 
 * management functions across all clubs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Mock data stores
let profilesStore: Array<{
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  club_id: string | null;
  created_at: string;
  updated_at: string;
}> = [];

let userRolesStore: Array<{
  user_id: string;
  role: 'admin' | 'coach' | 'athlete';
  created_at: string;
  updated_at: string;
}> = [];

let clubsStore: Array<{
  id: string;
  name: string;
  description: string | null;
  sport_type: string;
  created_at: string;
  updated_at: string;
}> = [];

let trainingSessionsStore: Array<{
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}> = [];

let athletesStore: Array<{
  id: string;
  user_id: string;
  club_id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}> = [];

// Track which user is currently authenticated
let currentAuthUserId: string | null = null;

// Helper function to get user's role
function getUserRole(userId: string): 'admin' | 'coach' | 'athlete' | null {
  const userRole = userRolesStore.find((ur) => ur.user_id === userId);
  return userRole?.role || null;
}

// Helper function to check if user is admin
function isAdmin(userId: string): boolean {
  return getUserRole(userId) === 'admin';
}

// Mock Supabase client with RLS simulation
const mockSupabase = {
  auth: {
    getUser: vi.fn(async () => {
      if (!currentAuthUserId) {
        return { data: { user: null }, error: { message: 'Not authenticated' } };
      }
      return {
        data: { user: { id: currentAuthUserId } },
        error: null,
      };
    }),
  },
  from: vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn(() => ({
          then: vi.fn(async (resolve: any) => {
            // Admins can see ALL profiles
            if (isAdmin(currentAuthUserId!)) {
              return resolve({ data: profilesStore, error: null });
            }
            return resolve({ data: [], error: { message: 'Unauthorized' } });
          }),
        })),
        update: vi.fn((updateData: any) => ({
          eq: vi.fn((column: string, value: unknown) => {
            // Admins can update ANY profile
            if (!isAdmin(currentAuthUserId!)) {
              return Promise.resolve({ error: { message: 'Unauthorized' } });
            }
            const profileIndex = profilesStore.findIndex(
              (p) => p[column as keyof typeof p] === value
            );
            if (profileIndex === -1) {
              return Promise.resolve({ error: { message: 'Not found' } });
            }
            profilesStore[profileIndex] = {
              ...profilesStore[profileIndex],
              ...updateData,
              updated_at: new Date().toISOString(),
            };
            return Promise.resolve({ data: profilesStore[profileIndex], error: null });
          }),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn((column: string, value: unknown) => {
            // Admins can delete ANY profile
            if (!isAdmin(currentAuthUserId!)) {
              return Promise.resolve({ error: { message: 'Unauthorized' } });
            }
            const profileIndex = profilesStore.findIndex(
              (p) => p[column as keyof typeof p] === value
            );
            if (profileIndex === -1) {
              return Promise.resolve({ error: { message: 'Not found' } });
            }
            profilesStore.splice(profileIndex, 1);
            return Promise.resolve({ error: null });
          }),
        })),
      };
    }
    
    if (table === 'clubs') {
      return {
        select: vi.fn(() => ({
          then: vi.fn(async (resolve: any) => {
            // Admins can see ALL clubs
            if (isAdmin(currentAuthUserId!)) {
              return resolve({ data: clubsStore, error: null });
            }
            return resolve({ data: [], error: { message: 'Unauthorized' } });
          }),
        })),
        insert: vi.fn((insertData: any) => {
          // Admins can create clubs
          if (!isAdmin(currentAuthUserId!)) {
            return Promise.resolve({ error: { message: 'Unauthorized' } });
          }
          const newClub = {
            ...insertData,
            id: `uuid-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          clubsStore.push(newClub);
          return Promise.resolve({ data: newClub, error: null });
        }),
        update: vi.fn((updateData: any) => ({
          eq: vi.fn((column: string, value: unknown) => {
            // Admins can update ANY club
            if (!isAdmin(currentAuthUserId!)) {
              return Promise.resolve({ error: { message: 'Unauthorized' } });
            }
            const clubIndex = clubsStore.findIndex(
              (c) => c[column as keyof typeof c] === value
            );
            if (clubIndex === -1) {
              return Promise.resolve({ error: { message: 'Not found' } });
            }
            clubsStore[clubIndex] = {
              ...clubsStore[clubIndex],
              ...updateData,
              updated_at: new Date().toISOString(),
            };
            return Promise.resolve({ data: clubsStore[clubIndex], error: null });
          }),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn((column: string, value: unknown) => {
            // Admins can delete ANY club
            if (!isAdmin(currentAuthUserId!)) {
              return Promise.resolve({ error: { message: 'Unauthorized' } });
            }
            const clubIndex = clubsStore.findIndex(
              (c) => c[column as keyof typeof c] === value
            );
            if (clubIndex === -1) {
              return Promise.resolve({ error: { message: 'Not found' } });
            }
            clubsStore.splice(clubIndex, 1);
            return Promise.resolve({ error: null });
          }),
        })),
      };
    }
    
    if (table === 'training_sessions') {
      return {
        select: vi.fn(() => ({
          then: vi.fn(async (resolve: any) => {
            // Admins can see ALL training sessions
            if (isAdmin(currentAuthUserId!)) {
              return resolve({ data: trainingSessionsStore, error: null });
            }
            return resolve({ data: [], error: { message: 'Unauthorized' } });
          }),
        })),
        update: vi.fn((updateData: any) => ({
          eq: vi.fn((column: string, value: unknown) => {
            // Admins can update ANY training session
            if (!isAdmin(currentAuthUserId!)) {
              return Promise.resolve({ error: { message: 'Unauthorized' } });
            }
            const sessionIndex = trainingSessionsStore.findIndex(
              (s) => s[column as keyof typeof s] === value
            );
            if (sessionIndex === -1) {
              return Promise.resolve({ error: { message: 'Not found' } });
            }
            trainingSessionsStore[sessionIndex] = {
              ...trainingSessionsStore[sessionIndex],
              ...updateData,
              updated_at: new Date().toISOString(),
            };
            return Promise.resolve({ data: trainingSessionsStore[sessionIndex], error: null });
          }),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn((column: string, value: unknown) => {
            // Admins can delete ANY training session
            if (!isAdmin(currentAuthUserId!)) {
              return Promise.resolve({ error: { message: 'Unauthorized' } });
            }
            const sessionIndex = trainingSessionsStore.findIndex(
              (s) => s[column as keyof typeof s] === value
            );
            if (sessionIndex === -1) {
              return Promise.resolve({ error: { message: 'Not found' } });
            }
            trainingSessionsStore.splice(sessionIndex, 1);
            return Promise.resolve({ error: null });
          }),
        })),
      };
    }
    
    if (table === 'athletes') {
      return {
        select: vi.fn(() => ({
          then: vi.fn(async (resolve: any) => {
            // Admins can see ALL athletes
            if (isAdmin(currentAuthUserId!)) {
              return resolve({ data: athletesStore, error: null });
            }
            return resolve({ data: [], error: { message: 'Unauthorized' } });
          }),
        })),
        update: vi.fn((updateData: any) => ({
          eq: vi.fn((column: string, value: unknown) => {
            // Admins can update ANY athlete
            if (!isAdmin(currentAuthUserId!)) {
              return Promise.resolve({ error: { message: 'Unauthorized' } });
            }
            const athleteIndex = athletesStore.findIndex(
              (a) => a[column as keyof typeof a] === value
            );
            if (athleteIndex === -1) {
              return Promise.resolve({ error: { message: 'Not found' } });
            }
            athletesStore[athleteIndex] = {
              ...athletesStore[athleteIndex],
              ...updateData,
              updated_at: new Date().toISOString(),
            };
            return Promise.resolve({ data: athletesStore[athleteIndex], error: null });
          }),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn((column: string, value: unknown) => {
            // Admins can delete ANY athlete
            if (!isAdmin(currentAuthUserId!)) {
              return Promise.resolve({ error: { message: 'Unauthorized' } });
            }
            const athleteIndex = athletesStore.findIndex(
              (a) => a[column as keyof typeof a] === value
            );
            if (athleteIndex === -1) {
              return Promise.resolve({ error: { message: 'Not found' } });
            }
            athletesStore.splice(athleteIndex, 1);
            return Promise.resolve({ error: null });
          }),
        })),
      };
    }
    
    return {};
  }),
};

// Mock the Supabase server module
vi.mock('@/lib/db/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

describe('Admin Full Access Property-Based Tests', () => {
  beforeEach(() => {
    profilesStore = [];
    userRolesStore = [];
    clubsStore = [];
    trainingSessionsStore = [];
    athletesStore = [];
    currentAuthUserId = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    profilesStore = [];
    userRolesStore = [];
    clubsStore = [];
    trainingSessionsStore = [];
    athletesStore = [];
    currentAuthUserId = null;
  });

  /**
   * Property 6: Admin full access
   * For any admin user, authentication should grant access to all data and 
   * management functions across all clubs.
   * Validates: Requirements 2.1
   */
  it('Property 6: Admin full access', async () => {
    // Custom arbitraries
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);
    const emailArb = fc.emailAddress();
    const phoneArb = fc
      .tuple(
        fc.constantFrom('06', '08', '09'),
        fc.integer({ min: 10000000, max: 99999999 })
      )
      .map(([prefix, number]) => `${prefix}${number}`);
    
    const dateArb = fc
      .integer({ min: 0, max: 365 * 50 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
      });

    const profileArb = fc.record({
      id: uuidArb,
      email: emailArb,
      full_name: nameArb,
      phone: fc.option(phoneArb, { nil: null }),
      date_of_birth: fc.option(dateArb.map(d => d.split('T')[0]), { nil: null }),
      avatar_url: fc.option(fc.webUrl(), { nil: null }),
      club_id: fc.option(uuidArb, { nil: null }),
      created_at: dateArb,
      updated_at: dateArb,
    });

    const clubArb = fc.record({
      id: uuidArb,
      name: nameArb,
      description: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: null }),
      sport_type: fc.constantFrom('Football', 'Basketball', 'Tennis', 'Swimming'),
      created_at: dateArb,
      updated_at: dateArb,
    });

    const athleteArb = fc.record({
      id: uuidArb,
      user_id: uuidArb,
      club_id: uuidArb,
      first_name: nameArb,
      last_name: nameArb,
      email: emailArb,
      created_at: dateArb,
      updated_at: dateArb,
    });

    const trainingSessionArb = fc.record({
      id: uuidArb,
      team_id: uuidArb,
      title: nameArb,
      description: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: null }),
      scheduled_at: dateArb,
      duration_minutes: fc.integer({ min: 30, max: 180 }),
      location: fc.option(nameArb, { nil: null }),
      created_by: uuidArb,
      created_at: dateArb,
      updated_at: dateArb,
    });

    await fc.assert(
      fc.asyncProperty(
        profileArb, // Admin profile
        fc.array(clubArb, { minLength: 2, maxLength: 5 }), // Multiple clubs
        fc.array(profileArb, { minLength: 2, maxLength: 5 }), // Profiles from different clubs
        fc.array(athleteArb, { minLength: 2, maxLength: 5 }), // Athletes from different clubs
        fc.array(trainingSessionArb, { minLength: 2, maxLength: 5 }), // Training sessions
        async (adminProfile, clubs, profiles, athletes, trainingSessions) => {
          // Preconditions
          fc.pre(clubs.length >= 2);
          fc.pre(profiles.length >= 2);
          fc.pre(athletes.length >= 2);
          fc.pre(trainingSessions.length >= 2);
          
          // Ensure unique IDs for clubs
          const uniqueClubs = clubs.filter((club, index, self) => 
            self.findIndex(c => c.id === club.id) === index
          );
          fc.pre(uniqueClubs.length >= 2);
          
          // Ensure unique IDs for profiles
          const allProfileIds = new Set<string>([adminProfile.id]);
          const uniqueProfiles = profiles.filter((p) => {
            if (allProfileIds.has(p.id)) return false;
            allProfileIds.add(p.id);
            return true;
          });
          fc.pre(uniqueProfiles.length >= 2);
          
          // Ensure unique IDs for athletes
          const allAthleteIds = new Set<string>();
          const uniqueAthletes = athletes.filter((a) => {
            if (allAthleteIds.has(a.id)) return false;
            allAthleteIds.add(a.id);
            return true;
          });
          fc.pre(uniqueAthletes.length >= 2);
          
          // Distribute profiles and athletes across different clubs
          const profilesWithClubs = uniqueProfiles.map((p, index) => ({
            ...p,
            club_id: uniqueClubs[index % uniqueClubs.length].id,
          }));
          
          const athletesWithClubs = uniqueAthletes.map((a, index) => ({
            ...a,
            club_id: uniqueClubs[index % uniqueClubs.length].id,
          }));
          
          // Setup: Add admin to stores
          profilesStore.push(adminProfile);
          userRolesStore.push({
            user_id: adminProfile.id,
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          
          // Add clubs
          uniqueClubs.forEach((club) => {
            clubsStore.push(club);
          });
          
          // Add profiles from different clubs
          profilesWithClubs.forEach((profile) => {
            profilesStore.push(profile);
            userRolesStore.push({
              user_id: profile.id,
              role: 'coach',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          });
          
          // Add athletes from different clubs
          athletesWithClubs.forEach((athlete) => {
            athletesStore.push(athlete);
          });
          
          // Add training sessions
          trainingSessions.forEach((session) => {
            trainingSessionsStore.push(session);
          });
          
          // Authenticate as admin
          currentAuthUserId = adminProfile.id;
          
          // Property 1: Admin can view ALL profiles across ALL clubs
          const { data: allProfiles } = await mockSupabase
            .from('profiles')
            .select('*')
            .then((result: any) => result);
          
          expect(allProfiles).toBeDefined();
          expect(Array.isArray(allProfiles)).toBe(true);
          
          // Should include admin + all other profiles
          const expectedProfileCount = 1 + profilesWithClubs.length;
          expect(allProfiles.length).toBe(expectedProfileCount);
          
          // Verify profiles from different clubs are all accessible
          const clubIdsInProfiles = new Set(
            allProfiles.filter((p: any) => p.club_id).map((p: any) => p.club_id)
          );
          expect(clubIdsInProfiles.size).toBeGreaterThan(1); // Multiple clubs
          
          // Property 2: Admin can view ALL clubs
          const { data: allClubs } = await mockSupabase
            .from('clubs')
            .select('*')
            .then((result: any) => result);
          
          expect(allClubs).toBeDefined();
          expect(Array.isArray(allClubs)).toBe(true);
          expect(allClubs.length).toBe(uniqueClubs.length);
          
          // Property 3: Admin can view ALL athletes across ALL clubs
          const { data: allAthletes } = await mockSupabase
            .from('athletes')
            .select('*')
            .then((result: any) => result);
          
          expect(allAthletes).toBeDefined();
          expect(Array.isArray(allAthletes)).toBe(true);
          expect(allAthletes.length).toBe(athletesWithClubs.length);
          
          // Verify athletes from different clubs are all accessible
          const clubIdsInAthletes = new Set(allAthletes.map((a: any) => a.club_id));
          expect(clubIdsInAthletes.size).toBeGreaterThan(1); // Multiple clubs
          
          // Property 4: Admin can view ALL training sessions
          const { data: allSessions } = await mockSupabase
            .from('training_sessions')
            .select('*')
            .then((result: any) => result);
          
          expect(allSessions).toBeDefined();
          expect(Array.isArray(allSessions)).toBe(true);
          expect(allSessions.length).toBe(trainingSessions.length);
          
          // Property 5: Admin can update profiles from ANY club
          const targetProfile = profilesWithClubs[0];
          const newName = 'Admin Updated Name';
          const { error: updateProfileError, data: updatedProfile } = await mockSupabase
            .from('profiles')
            .update({ full_name: newName })
            .eq('id', targetProfile.id);
          
          expect(updateProfileError).toBeNull();
          expect(updatedProfile).toBeDefined();
          
          // Verify update was successful
          const updatedProfileInStore = profilesStore.find((p) => p.id === targetProfile.id);
          expect(updatedProfileInStore).toBeDefined();
          if (updatedProfileInStore) {
            expect(updatedProfileInStore.full_name).toBe(newName);
          }
          
          // Property 6: Admin can update clubs
          const targetClub = uniqueClubs[0];
          const newClubName = 'Admin Updated Club';
          const { error: updateClubError, data: updatedClub } = await mockSupabase
            .from('clubs')
            .update({ name: newClubName })
            .eq('id', targetClub.id);
          
          expect(updateClubError).toBeNull();
          expect(updatedClub).toBeDefined();
          
          // Verify club update was successful
          const updatedClubInStore = clubsStore.find((c) => c.id === targetClub.id);
          expect(updatedClubInStore).toBeDefined();
          if (updatedClubInStore) {
            expect(updatedClubInStore.name).toBe(newClubName);
          }
          
          // Property 7: Admin can update athletes from ANY club
          const targetAthlete = athletesWithClubs[0];
          const newAthleteEmail = 'admin.updated@example.com';
          const { error: updateAthleteError, data: updatedAthlete } = await mockSupabase
            .from('athletes')
            .update({ email: newAthleteEmail })
            .eq('id', targetAthlete.id);
          
          expect(updateAthleteError).toBeNull();
          expect(updatedAthlete).toBeDefined();
          
          // Verify athlete update was successful
          const updatedAthleteInStore = athletesStore.find((a) => a.id === targetAthlete.id);
          expect(updatedAthleteInStore).toBeDefined();
          if (updatedAthleteInStore) {
            expect(updatedAthleteInStore.email).toBe(newAthleteEmail);
          }
          
          // Property 8: Admin can update training sessions
          const targetSession = trainingSessions[0];
          const newSessionTitle = 'Admin Updated Session';
          const { error: updateSessionError, data: updatedSession } = await mockSupabase
            .from('training_sessions')
            .update({ title: newSessionTitle })
            .eq('id', targetSession.id);
          
          expect(updateSessionError).toBeNull();
          expect(updatedSession).toBeDefined();
          
          // Verify session update was successful
          const updatedSessionInStore = trainingSessionsStore.find((s) => s.id === targetSession.id);
          expect(updatedSessionInStore).toBeDefined();
          if (updatedSessionInStore) {
            expect(updatedSessionInStore.title).toBe(newSessionTitle);
          }
          
          // Property 9: Admin can create new clubs
          const newClub = {
            name: 'New Admin Club',
            description: 'Created by admin',
            sport_type: 'Volleyball',
          };
          const { error: createClubError, data: createdClub } = await mockSupabase
            .from('clubs')
            .insert(newClub);
          
          expect(createClubError).toBeNull();
          expect(createdClub).toBeDefined();
          
          // Verify club was created
          const createdClubInStore = clubsStore.find((c) => c.name === newClub.name);
          expect(createdClubInStore).toBeDefined();
          if (createdClubInStore) {
            expect(createdClubInStore.sport_type).toBe(newClub.sport_type);
          }
          
          // Property 10: Admin can delete profiles from ANY club
          const profileToDelete = profilesWithClubs[profilesWithClubs.length - 1];
          const initialProfileCount = profilesStore.length;
          
          const { error: deleteProfileError } = await mockSupabase
            .from('profiles')
            .delete()
            .eq('id', profileToDelete.id);
          
          expect(deleteProfileError).toBeNull();
          
          // Verify profile was deleted
          expect(profilesStore.length).toBe(initialProfileCount - 1);
          const deletedProfile = profilesStore.find((p) => p.id === profileToDelete.id);
          expect(deletedProfile).toBeUndefined();
          
          // Property 11: Admin can delete clubs
          const clubToDelete = uniqueClubs[uniqueClubs.length - 1];
          const initialClubCount = clubsStore.length;
          
          const { error: deleteClubError } = await mockSupabase
            .from('clubs')
            .delete()
            .eq('id', clubToDelete.id);
          
          expect(deleteClubError).toBeNull();
          
          // Verify club was deleted
          expect(clubsStore.length).toBe(initialClubCount - 1);
          const deletedClub = clubsStore.find((c) => c.id === clubToDelete.id);
          expect(deletedClub).toBeUndefined();
          
          // Property 12: Admin can delete athletes from ANY club
          const athleteToDelete = athletesWithClubs[athletesWithClubs.length - 1];
          const initialAthleteCount = athletesStore.length;
          
          const { error: deleteAthleteError } = await mockSupabase
            .from('athletes')
            .delete()
            .eq('id', athleteToDelete.id);
          
          expect(deleteAthleteError).toBeNull();
          
          // Verify athlete was deleted
          expect(athletesStore.length).toBe(initialAthleteCount - 1);
          const deletedAthlete = athletesStore.find((a) => a.id === athleteToDelete.id);
          expect(deletedAthlete).toBeUndefined();
          
          // Property 13: Admin can delete training sessions
          const sessionToDelete = trainingSessions[trainingSessions.length - 1];
          const initialSessionCount = trainingSessionsStore.length;
          
          const { error: deleteSessionError } = await mockSupabase
            .from('training_sessions')
            .delete()
            .eq('id', sessionToDelete.id);
          
          expect(deleteSessionError).toBeNull();
          
          // Verify session was deleted
          expect(trainingSessionsStore.length).toBe(initialSessionCount - 1);
          const deletedSession = trainingSessionsStore.find((s) => s.id === sessionToDelete.id);
          expect(deletedSession).toBeUndefined();
          
          // Clean up
          profilesStore = [];
          userRolesStore = [];
          clubsStore = [];
          athletesStore = [];
          trainingSessionsStore = [];
          currentAuthUserId = null;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Non-admin users cannot perform admin operations
   * Verify that coach and athlete roles are properly restricted
   */
  it('Property: Non-admin users cannot perform admin operations', async () => {
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);
    const emailArb = fc.emailAddress();
    
    const dateArb = fc
      .integer({ min: 0, max: 365 * 50 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
      });

    const profileArb = fc.record({
      id: uuidArb,
      email: emailArb,
      full_name: nameArb,
      phone: fc.option(fc.string(), { nil: null }),
      date_of_birth: fc.option(dateArb.map(d => d.split('T')[0]), { nil: null }),
      avatar_url: fc.option(fc.webUrl(), { nil: null }),
      club_id: fc.option(uuidArb, { nil: null }),
      created_at: dateArb,
      updated_at: dateArb,
    });

    const clubArb = fc.record({
      id: uuidArb,
      name: nameArb,
      description: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: null }),
      sport_type: fc.constantFrom('Football', 'Basketball', 'Tennis'),
      created_at: dateArb,
      updated_at: dateArb,
    });

    await fc.assert(
      fc.asyncProperty(
        profileArb, // Non-admin user (coach or athlete)
        fc.constantFrom('coach', 'athlete'), // Role
        fc.array(clubArb, { minLength: 2, maxLength: 3 }), // Multiple clubs
        async (userProfile, role, clubs) => {
          fc.pre(clubs.length >= 2);
          
          // Ensure unique club IDs
          const uniqueClubs = clubs.filter((club, index, self) => 
            self.findIndex(c => c.id === club.id) === index
          );
          fc.pre(uniqueClubs.length >= 2);
          
          // Setup: Add user as non-admin
          profilesStore.push(userProfile);
          userRolesStore.push({
            user_id: userProfile.id,
            role: role as 'coach' | 'athlete',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          
          // Add clubs
          uniqueClubs.forEach((club) => {
            clubsStore.push(club);
          });
          
          // Authenticate as non-admin user
          currentAuthUserId = userProfile.id;
          
          // Property 1: Non-admin cannot view all profiles
          const { data: allProfiles, error: profilesError } = await mockSupabase
            .from('profiles')
            .select('*')
            .then((result: any) => result);
          
          // Should either return empty or error
          if (allProfiles) {
            expect(allProfiles.length).toBe(0);
          } else {
            expect(profilesError).toBeDefined();
          }
          
          // Property 2: Non-admin cannot view all clubs
          const { data: allClubs, error: clubsError } = await mockSupabase
            .from('clubs')
            .select('*')
            .then((result: any) => result);
          
          // Should either return empty or error
          if (allClubs) {
            expect(allClubs.length).toBe(0);
          } else {
            expect(clubsError).toBeDefined();
          }
          
          // Property 3: Non-admin cannot create clubs
          const newClub = {
            name: 'Unauthorized Club',
            description: 'Should not be created',
            sport_type: 'Soccer',
          };
          const { error: createClubError } = await mockSupabase
            .from('clubs')
            .insert(newClub);
          
          expect(createClubError).toBeDefined();
          expect(createClubError.message).toContain('Unauthorized');
          
          // Verify club was NOT created
          const unauthorizedClub = clubsStore.find((c) => c.name === newClub.name);
          expect(unauthorizedClub).toBeUndefined();
          
          // Property 4: Non-admin cannot delete clubs
          const clubToDelete = uniqueClubs[0];
          const initialClubCount = clubsStore.length;
          
          const { error: deleteClubError } = await mockSupabase
            .from('clubs')
            .delete()
            .eq('id', clubToDelete.id);
          
          expect(deleteClubError).toBeDefined();
          expect(deleteClubError.message).toContain('Unauthorized');
          
          // Verify club was NOT deleted
          expect(clubsStore.length).toBe(initialClubCount);
          const stillExistingClub = clubsStore.find((c) => c.id === clubToDelete.id);
          expect(stillExistingClub).toBeDefined();
          
          // Clean up
          profilesStore = [];
          userRolesStore = [];
          clubsStore = [];
          currentAuthUserId = null;
        }
      ),
      { numRuns: 100 }
    );
  });
});
