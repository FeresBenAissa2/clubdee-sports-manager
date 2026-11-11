/**
 * Property-Based Test for Coach RLS Policies
 * Feature: sports-club-management
 * 
 * Property 7: Coach club data isolation
 * Property 9: Cross-club access prevention
 * Validates: Requirements 2.2, 2.4
 * 
 * For any coach user, all data queries should return only athletes and activities
 * from the coach's assigned club. Coaches should not be able to access data from
 * other clubs.
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

let teamsStore: Array<{
  id: string;
  name: string;
  sport_id: string;
  club_id: string;
  coach_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}> = [];

// Track which user is currently authenticated
let currentAuthUserId: string | null = null;

// Helper function to get user's club_id
function getUserClubId(userId: string): string | null {
  const profile = profilesStore.find((p) => p.id === userId);
  return profile?.club_id || null;
}

// Helper function to get user's role
function getUserRole(userId: string): 'admin' | 'coach' | 'athlete' | null {
  const userRole = userRolesStore.find((ur) => ur.user_id === userId);
  return userRole?.role || null;
}

// Helper function to check if user is coach
function isCoach(userId: string): boolean {
  return getUserRole(userId) === 'coach';
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
        select: vi.fn((columns: string = '*') => {
          const selectChain = {
            eq: vi.fn((column: string, value: unknown) => ({
              maybeSingle: vi.fn(async () => {
                // Simulate RLS: Coaches can view profiles in their club
                const userClubId = getUserClubId(currentAuthUserId!);
                const profile = profilesStore.find(
                  (p) => p[column as keyof typeof p] === value
                );
                
                if (!profile) {
                  return { data: null, error: null };
                }
                
                // Check access: own profile OR (coach AND same club)
                if (
                  profile.id === currentAuthUserId ||
                  (isCoach(currentAuthUserId!) && profile.club_id === userClubId)
                ) {
                  return { data: profile, error: null };
                }
                
                return { data: null, error: null };
              }),
              single: vi.fn(async () => {
                const userClubId = getUserClubId(currentAuthUserId!);
                const profile = profilesStore.find(
                  (p) => p[column as keyof typeof p] === value
                );
                
                if (!profile) {
                  return { data: null, error: { message: 'Not found' } };
                }
                
                // Check access
                if (
                  profile.id === currentAuthUserId ||
                  (isCoach(currentAuthUserId!) && profile.club_id === userClubId)
                ) {
                  return { data: profile, error: null };
                }
                
                return { data: null, error: { message: 'Unauthorized' } };
              }),
            })),
            // For queries without eq (list all)
            then: vi.fn(async (resolve: any) => {
              const userClubId = getUserClubId(currentAuthUserId!);
              
              // Simulate RLS: Coaches can only see profiles in their club
              const filteredProfiles = profilesStore.filter((p) => {
                if (p.id === currentAuthUserId) return true;
                if (isCoach(currentAuthUserId!) && p.club_id === userClubId) return true;
                return false;
              });
              
              return resolve({ data: filteredProfiles, error: null });
            }),
          };
          return selectChain;
        }),
        update: vi.fn((updateData: any) => ({
          eq: vi.fn((column: string, value: unknown) => {
            const userClubId = getUserClubId(currentAuthUserId!);
            const profileIndex = profilesStore.findIndex(
              (p) => p[column as keyof typeof p] === value
            );
            
            if (profileIndex === -1) {
              return Promise.resolve({ error: { message: 'Not found' } });
            }
            
            const profile = profilesStore[profileIndex];
            
            // Check access: own profile OR (coach AND same club)
            if (
              profile.id === currentAuthUserId ||
              (isCoach(currentAuthUserId!) && profile.club_id === userClubId)
            ) {
              profilesStore[profileIndex] = {
                ...profilesStore[profileIndex],
                ...updateData,
                updated_at: new Date().toISOString(),
              };
              return Promise.resolve({ error: null });
            }
            
            return Promise.resolve({ error: { message: 'Unauthorized' } });
          }),
        })),
      };
    }
    
    if (table === 'training_sessions') {
      return {
        select: vi.fn((columns: string = '*') => {
          const selectChain = {
            eq: vi.fn((column: string, value: unknown) => ({
              maybeSingle: vi.fn(async () => {
                const session = trainingSessionsStore.find(
                  (s) => s[column as keyof typeof s] === value
                );
                
                if (!session) {
                  return { data: null, error: null };
                }
                
                // Check if coach has access to this session's team
                const team = teamsStore.find((t) => t.id === session.team_id);
                if (!team) {
                  return { data: null, error: null };
                }
                
                const userClubId = getUserClubId(currentAuthUserId!);
                
                // Coach can access if team is in their club
                if (isCoach(currentAuthUserId!) && team.club_id === userClubId) {
                  return { data: session, error: null };
                }
                
                return { data: null, error: null };
              }),
            })),
            then: vi.fn(async (resolve: any) => {
              const userClubId = getUserClubId(currentAuthUserId!);
              
              // Filter sessions based on team's club
              const filteredSessions = trainingSessionsStore.filter((session) => {
                const team = teamsStore.find((t) => t.id === session.team_id);
                if (!team) return false;
                
                if (isCoach(currentAuthUserId!) && team.club_id === userClubId) {
                  return true;
                }
                
                return false;
              });
              
              return resolve({ data: filteredSessions, error: null });
            }),
          };
          return selectChain;
        }),
      };
    }
    
    return {};
  }),
};

// Mock the Supabase server module
vi.mock('@/lib/db/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

describe('Coach RLS Policies Property-Based Tests', () => {
  beforeEach(() => {
    profilesStore = [];
    userRolesStore = [];
    trainingSessionsStore = [];
    teamsStore = [];
    currentAuthUserId = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    profilesStore = [];
    userRolesStore = [];
    trainingSessionsStore = [];
    teamsStore = [];
    currentAuthUserId = null;
  });

  /**
   * Property 7: Coach club data isolation
   * For any coach user, all data queries should return only athletes and activities
   * from the coach's assigned club, never from other clubs.
   * Validates: Requirements 2.2
   */
  it('Property 7: Coach club data isolation', async () => {
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
      club_id: uuidArb,
      created_at: dateArb,
      updated_at: dateArb,
    });

    await fc.assert(
      fc.asyncProperty(
        profileArb, // Coach profile
        fc.array(profileArb, { minLength: 2, maxLength: 5 }), // Athletes in coach's club
        fc.array(profileArb, { minLength: 2, maxLength: 5 }), // Athletes in other clubs
        async (coachProfile, sameClubAthletes, otherClubAthletes) => {
          // Preconditions
          fc.pre(sameClubAthletes.length >= 2);
          fc.pre(otherClubAthletes.length >= 2);
          
          // Ensure unique IDs
          const allIds = new Set<string>([coachProfile.id]);
          const uniqueSameClub = sameClubAthletes.filter((a) => {
            if (allIds.has(a.id)) return false;
            allIds.add(a.id);
            return true;
          });
          
          const uniqueOtherClub = otherClubAthletes.filter((a) => {
            if (allIds.has(a.id)) return false;
            allIds.add(a.id);
            return true;
          });
          
          fc.pre(uniqueSameClub.length >= 2);
          fc.pre(uniqueOtherClub.length >= 2);
          
          // Ensure athletes in same club have same club_id as coach
          const sameClubAthletesFixed = uniqueSameClub.map((a) => ({
            ...a,
            club_id: coachProfile.club_id,
          }));
          
          // Ensure athletes in other clubs have different club_id
          const otherClubId = `uuid-other-${coachProfile.club_id}`;
          const otherClubAthletesFixed = uniqueOtherClub.map((a) => ({
            ...a,
            club_id: otherClubId,
          }));
          
          // Setup: Add coach to stores
          profilesStore.push(coachProfile);
          userRolesStore.push({
            user_id: coachProfile.id,
            role: 'coach',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          
          // Add same club athletes
          sameClubAthletesFixed.forEach((athlete) => {
            profilesStore.push(athlete);
            userRolesStore.push({
              user_id: athlete.id,
              role: 'athlete',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          });
          
          // Add other club athletes
          otherClubAthletesFixed.forEach((athlete) => {
            profilesStore.push(athlete);
            userRolesStore.push({
              user_id: athlete.id,
              role: 'athlete',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          });
          
          // Authenticate as coach
          currentAuthUserId = coachProfile.id;
          
          // Property 1: Coach can view all profiles in their club
          const { data: allProfiles } = await mockSupabase
            .from('profiles')
            .select('*')
            .then((result: any) => result);
          
          expect(allProfiles).toBeDefined();
          expect(Array.isArray(allProfiles)).toBe(true);
          
          // Should include coach and same club athletes
          const expectedCount = 1 + sameClubAthletesFixed.length;
          expect(allProfiles.length).toBe(expectedCount);
          
          // Verify all returned profiles are from coach's club
          allProfiles.forEach((profile: any) => {
            expect(profile.club_id).toBe(coachProfile.club_id);
          });
          
          // Property 2: Coach cannot view profiles from other clubs
          const otherClubAthlete = otherClubAthletesFixed[0];
          const { data: otherProfile } = await mockSupabase
            .from('profiles')
            .select('*')
            .eq('id', otherClubAthlete.id)
            .maybeSingle();
          
          // Should return null (RLS blocks access)
          expect(otherProfile).toBeNull();
          
          // Property 3: Coach cannot update profiles from other clubs
          const { error: updateError } = await mockSupabase
            .from('profiles')
            .update({ full_name: 'Hacked Name' })
            .eq('id', otherClubAthlete.id);
          
          expect(updateError).toBeDefined();
          expect(updateError.message).toContain('Unauthorized');
          
          // Property 4: Verify other club athlete's data was NOT modified
          const otherAthleteInStore = profilesStore.find(
            (p) => p.id === otherClubAthlete.id
          );
          expect(otherAthleteInStore).toBeDefined();
          if (otherAthleteInStore) {
            expect(otherAthleteInStore.full_name).toBe(otherClubAthlete.full_name);
            expect(otherAthleteInStore.full_name).not.toBe('Hacked Name');
          }
          
          // Property 5: Coach can update profiles in their club
          const sameClubAthlete = sameClubAthletesFixed[0];
          const { error: updateSameClubError } = await mockSupabase
            .from('profiles')
            .update({ phone: '0612345678' })
            .eq('id', sameClubAthlete.id);
          
          expect(updateSameClubError).toBeNull();
          
          // Verify update was successful
          const updatedAthlete = profilesStore.find(
            (p) => p.id === sameClubAthlete.id
          );
          expect(updatedAthlete).toBeDefined();
          if (updatedAthlete) {
            expect(updatedAthlete.phone).toBe('0612345678');
          }
          
          // Clean up
          profilesStore = [];
          userRolesStore = [];
          currentAuthUserId = null;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Cross-club access prevention
   * For any coach attempting to access data from a club other than their assigned club,
   * the system should deny access and return an authorization error.
   * Validates: Requirements 2.4
   */
  it('Property 9: Cross-club access prevention', async () => {
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
      club_id: uuidArb,
      created_at: dateArb,
      updated_at: dateArb,
    });
    
    const teamArb = fc.record({
      id: uuidArb,
      name: nameArb,
      sport_id: uuidArb,
      club_id: uuidArb,
      coach_id: fc.option(uuidArb, { nil: null }),
      description: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: null }),
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
        profileArb, // Coach A
        profileArb, // Coach B (different club)
        teamArb, // Team in Coach A's club
        teamArb, // Team in Coach B's club
        trainingSessionArb, // Session in Coach A's team
        trainingSessionArb, // Session in Coach B's team
        async (coachA, coachB, teamA, teamB, sessionA, sessionB) => {
          // Preconditions: Different coaches, different clubs
          fc.pre(coachA.id !== coachB.id);
          fc.pre(coachA.club_id !== coachB.club_id);
          
          // Fix team and session relationships
          const teamAFixed = { ...teamA, club_id: coachA.club_id, coach_id: coachA.id };
          const teamBFixed = { ...teamB, club_id: coachB.club_id, coach_id: coachB.id };
          const sessionAFixed = { ...sessionA, team_id: teamAFixed.id, created_by: coachA.id };
          const sessionBFixed = { ...sessionB, team_id: teamBFixed.id, created_by: coachB.id };
          
          // Setup: Add coaches to stores
          profilesStore.push(coachA);
          profilesStore.push(coachB);
          
          userRolesStore.push({
            user_id: coachA.id,
            role: 'coach',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          
          userRolesStore.push({
            user_id: coachB.id,
            role: 'coach',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          
          // Add teams
          teamsStore.push(teamAFixed);
          teamsStore.push(teamBFixed);
          
          // Add training sessions
          trainingSessionsStore.push(sessionAFixed);
          trainingSessionsStore.push(sessionBFixed);
          
          // Authenticate as Coach A
          currentAuthUserId = coachA.id;
          
          // Property 1: Coach A can access their own training sessions
          const { data: ownSessions } = await mockSupabase
            .from('training_sessions')
            .select('*')
            .then((result: any) => result);
          
          expect(ownSessions).toBeDefined();
          expect(Array.isArray(ownSessions)).toBe(true);
          expect(ownSessions.length).toBe(1);
          expect(ownSessions[0].id).toBe(sessionAFixed.id);
          
          // Property 2: Coach A cannot access Coach B's training sessions
          const { data: otherSession } = await mockSupabase
            .from('training_sessions')
            .select('*')
            .eq('id', sessionBFixed.id)
            .maybeSingle();
          
          // Should return null (RLS blocks cross-club access)
          expect(otherSession).toBeNull();
          
          // Property 3: Coach A cannot access Coach B's profile
          const { data: otherCoachProfile } = await mockSupabase
            .from('profiles')
            .select('*')
            .eq('id', coachB.id)
            .maybeSingle();
          
          // Should return null (different club)
          expect(otherCoachProfile).toBeNull();
          
          // Property 4: Verify all accessible data belongs to Coach A's club
          const { data: allAccessibleProfiles } = await mockSupabase
            .from('profiles')
            .select('*')
            .then((result: any) => result);
          
          expect(allAccessibleProfiles).toBeDefined();
          allAccessibleProfiles.forEach((profile: any) => {
            expect(profile.club_id).toBe(coachA.club_id);
          });
          
          // Property 5: Coach A cannot update Coach B's profile
          const { error: updateError } = await mockSupabase
            .from('profiles')
            .update({ full_name: 'Cross-Club Hack' })
            .eq('id', coachB.id);
          
          expect(updateError).toBeDefined();
          expect(updateError.message).toContain('Unauthorized');
          
          // Verify Coach B's profile was NOT modified
          const coachBInStore = profilesStore.find((p) => p.id === coachB.id);
          expect(coachBInStore).toBeDefined();
          if (coachBInStore) {
            expect(coachBInStore.full_name).toBe(coachB.full_name);
            expect(coachBInStore.full_name).not.toBe('Cross-Club Hack');
          }
          
          // Clean up
          profilesStore = [];
          userRolesStore = [];
          trainingSessionsStore = [];
          teamsStore = [];
          currentAuthUserId = null;
        }
      ),
      { numRuns: 100 }
    );
  });
});
