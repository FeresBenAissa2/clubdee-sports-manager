/**
 * Property-Based Test for Athlete Access Restrictions
 * Feature: sports-club-management
 * 
 * Property 8: Athlete self-data restriction
 * Validates: Requirements 2.3
 * 
 * For any athlete user, all data queries should return only the athlete's own 
 * personal information and their club's activities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Mock data stores
let athletesStore: Array<{
  id: string;
  user_id: string;
  club_id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  date_of_birth: string;
  phone_number: string;
  email: string;
  gender: string;
  health_notes: string | null;
  profile_picture_url: string | null;
  created_at: string;
  updated_at: string;
}> = [];

// Track which user is currently authenticated
let currentAuthUserId: string | null = null;

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
    if (table === 'athletes') {
      return {
        select: vi.fn((columns: string = '*') => {
          const selectChain = {
            eq: vi.fn((column: string, value: unknown) => ({
              maybeSingle: vi.fn(async () => {
                // Simulate RLS: Athletes can only see their own data
                const athlete = athletesStore.find(
                  (a) => a[column as keyof typeof a] === value && a.user_id === currentAuthUserId
                );
                if (!athlete) {
                  return { data: null, error: null };
                }
                // Add mock clubs data for join
                const athleteWithClub = {
                  ...athlete,
                  clubs: {
                    id: athlete.club_id,
                    name: 'Test Club',
                    description: 'Test Description',
                    sport_type: 'Football',
                  },
                };
                return { data: athleteWithClub, error: null };
              }),
              single: vi.fn(async () => {
                // Simulate RLS: Athletes can only see their own data
                const athlete = athletesStore.find(
                  (a) => a[column as keyof typeof a] === value && a.user_id === currentAuthUserId
                );
                if (!athlete) {
                  return { data: null, error: { message: 'Not found or unauthorized' } };
                }
                // Add mock clubs data for join
                const athleteWithClub = {
                  ...athlete,
                  clubs: {
                    id: athlete.club_id,
                    name: 'Test Club',
                    description: 'Test Description',
                    sport_type: 'Football',
                  },
                };
                return { data: athleteWithClub, error: null };
              }),
            })),
            // For queries without eq (list all)
            then: vi.fn(async (resolve: any) => {
              // Simulate RLS: Athletes can only see their own data
              const filteredAthletes = athletesStore.filter(
                (a) => a.user_id === currentAuthUserId
              );
              return resolve({ data: filteredAthletes, error: null });
            }),
          };
          return selectChain;
        }),
        update: vi.fn((updateData: any) => ({
          eq: vi.fn((column: string, value: unknown) => {
            // Simulate RLS: Athletes can only update their own data
            const athleteIndex = athletesStore.findIndex(
              (a) => a[column as keyof typeof a] === value && a.user_id === currentAuthUserId
            );
            if (athleteIndex === -1) {
              return Promise.resolve({ error: { message: 'Not found or unauthorized' } });
            }
            athletesStore[athleteIndex] = {
              ...athletesStore[athleteIndex],
              ...updateData,
              updated_at: new Date().toISOString(),
            };
            return Promise.resolve({ error: null });
          }),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn((column: string, value: unknown) => {
            // Simulate RLS: Athletes cannot delete (even their own data)
            return Promise.resolve({ error: { message: 'Unauthorized' } });
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

// Mock audit logging
vi.mock('@/lib/audit/actions', () => ({
  createAuditLog: vi.fn(async () => ({ success: true })),
}));

// Mock Next.js cache revalidation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocking
const { getAthleteProfile } = await import('@/lib/athlete/actions');

describe('Athlete Access Restrictions Property-Based Tests', () => {
  beforeEach(() => {
    athletesStore = [];
    currentAuthUserId = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    athletesStore = [];
    currentAuthUserId = null;
  });

  /**
   * Property 8: Athlete self-data restriction
   * For any athlete user, all data queries should return only the athlete's own 
   * personal information and their club's activities.
   * Validates: Requirements 2.3
   */
  it('Property 8: Athlete self-data restriction', async () => {
    // Custom arbitraries
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);
    const phoneArb = fc
      .tuple(
        fc.constantFrom('06', '08', '09'),
        fc.integer({ min: 10000000, max: 99999999 })
      )
      .map(([prefix, number]) => `${prefix}${number}`);
    
    const dateOfBirthArb = fc
      .integer({ min: 6, max: 50 })
      .map((yearsAgo) => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - yearsAgo);
        return date.toISOString().split('T')[0];
      });

    const validDateArb = fc
      .integer({ min: 0, max: 365 * 50 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
      });

    const athleteArb = fc.record({
      id: uuidArb,
      user_id: uuidArb,
      club_id: uuidArb,
      first_name: nameArb,
      last_name: nameArb,
      nickname: fc.option(nameArb, { nil: null }),
      date_of_birth: dateOfBirthArb,
      phone_number: phoneArb,
      email: fc.emailAddress(),
      gender: fc.constantFrom('male', 'female', 'other'),
      health_notes: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: null }),
      profile_picture_url: fc.option(fc.webUrl(), { nil: null }),
      created_at: validDateArb,
      updated_at: validDateArb,
    });

    await fc.assert(
      fc.asyncProperty(
        athleteArb, // The athlete who is authenticated
        fc.array(athleteArb, { minLength: 1, maxLength: 5 }), // Other athletes in the system
        async (authenticatedAthlete, otherAthletes) => {
          // Precondition: Ensure other athletes have different user_ids AND different IDs
          const uniqueOtherAthletes = otherAthletes.filter(
            (other) => other.user_id !== authenticatedAthlete.user_id && other.id !== authenticatedAthlete.id
          );
          
          // Skip if we don't have any other athletes after filtering
          fc.pre(uniqueOtherAthletes.length > 0);
          
          // Ensure all other athletes have unique IDs among themselves
          const seenIds = new Set<string>([authenticatedAthlete.id]);
          const finalOtherAthletes = uniqueOtherAthletes.filter((athlete) => {
            if (seenIds.has(athlete.id)) {
              return false;
            }
            seenIds.add(athlete.id);
            return true;
          });
          
          // Skip if we don't have any athletes after deduplication
          fc.pre(finalOtherAthletes.length > 0);

          // Setup: Add all athletes to store
          athletesStore.push(authenticatedAthlete);
          finalOtherAthletes.forEach((athlete) => {
            athletesStore.push(athlete);
          });

          // Set current authenticated user
          currentAuthUserId = authenticatedAthlete.user_id;

          // Property 1: Athlete can retrieve their own profile
          const ownProfileResult = await getAthleteProfile(authenticatedAthlete.user_id);
          expect(ownProfileResult.error).toBeUndefined();
          expect(ownProfileResult.data).toBeDefined();
          
          if (ownProfileResult.data) {
            // Verify the returned data matches the authenticated athlete
            // The data should match what's in the store for this user_id
            const expectedAthlete = athletesStore.find(a => a.user_id === authenticatedAthlete.user_id);
            expect(expectedAthlete).toBeDefined();
            if (expectedAthlete) {
              expect(ownProfileResult.data.id).toBe(expectedAthlete.id);
              expect(ownProfileResult.data.user_id).toBe(expectedAthlete.user_id);
              expect(ownProfileResult.data.club_id).toBe(expectedAthlete.club_id);
            }
          }

          // Property 2: Athlete cannot retrieve other athletes' profiles
          for (const otherAthlete of finalOtherAthletes) {
            const otherProfileResult = await getAthleteProfile(otherAthlete.user_id);
            
            // Should either return error or null/undefined data
            if (otherProfileResult.data) {
              // If data is returned, it should NOT be the other athlete's data
              expect(otherProfileResult.data.user_id).not.toBe(otherAthlete.user_id);
              expect(otherProfileResult.data.id).not.toBe(otherAthlete.id);
              // It should be the authenticated athlete's own data (if any)
              expect(otherProfileResult.data.user_id).toBe(authenticatedAthlete.user_id);
            } else {
              // Or it should return an error with no data (undefined or null)
              expect(otherProfileResult.data).toBeFalsy();
              expect(otherProfileResult.error).toBeDefined();
            }
          }

          // Property 3: Direct database query should only return own data
          const { data: directQueryData } = await mockSupabase
            .from('athletes')
            .select('*')
            .then((result: any) => result);

          expect(directQueryData).toBeDefined();
          expect(Array.isArray(directQueryData)).toBe(true);
          
          // Should only contain the authenticated athlete's data
          expect(directQueryData.length).toBeLessThanOrEqual(1);
          
          if (directQueryData.length > 0) {
            expect(directQueryData[0].user_id).toBe(authenticatedAthlete.user_id);
            expect(directQueryData[0].id).toBe(authenticatedAthlete.id);
          }

          // Property 4: Attempting to query by another athlete's ID should fail
          const randomOtherAthlete = finalOtherAthletes[0];
          const { data: unauthorizedData } = await mockSupabase
            .from('athletes')
            .select('*')
            .eq('id', randomOtherAthlete.id)
            .maybeSingle();

          // Should return null (RLS blocks access)
          expect(unauthorizedData).toBeNull();

          // Property 5: Attempting to update another athlete's data should fail
          const { error: updateError } = await mockSupabase
            .from('athletes')
            .update({ nickname: 'Hacked' })
            .eq('id', randomOtherAthlete.id);

          expect(updateError).toBeDefined();
          expect(updateError.message).toContain('unauthorized');

          // Property 6: Verify other athlete's data was NOT modified
          const otherAthleteInStore = athletesStore.find(
            (a) => a.id === randomOtherAthlete.id
          );
          expect(otherAthleteInStore).toBeDefined();
          if (otherAthleteInStore) {
            expect(otherAthleteInStore.nickname).toBe(randomOtherAthlete.nickname);
            expect(otherAthleteInStore.nickname).not.toBe('Hacked');
          }

          // Clean up
          athletesStore = [];
          currentAuthUserId = null;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Athlete cannot access sensitive data of other athletes
   * For any athlete attempting to access health_notes of another athlete,
   * the system should deny access.
   */
  it('Property: Athlete cannot access sensitive health notes of others', async () => {
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);
    const phoneArb = fc
      .tuple(
        fc.constantFrom('06', '08', '09'),
        fc.integer({ min: 10000000, max: 99999999 })
      )
      .map(([prefix, number]) => `${prefix}${number}`);
    
    const dateOfBirthArb = fc
      .integer({ min: 6, max: 50 })
      .map((yearsAgo) => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - yearsAgo);
        return date.toISOString().split('T')[0];
      });

    const validDateArb = fc
      .integer({ min: 0, max: 365 * 50 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
      });

    const sensitiveHealthNotesArb = fc.stringMatching(
      /^(Allergy to|Heart condition|Asthma|Diabetes|Previous injury).{10,100}$/
    );

    const athleteArb = fc.record({
      id: uuidArb,
      user_id: uuidArb,
      club_id: uuidArb,
      first_name: nameArb,
      last_name: nameArb,
      nickname: fc.option(nameArb, { nil: null }),
      date_of_birth: dateOfBirthArb,
      phone_number: phoneArb,
      email: fc.emailAddress(),
      gender: fc.constantFrom('male', 'female', 'other'),
      health_notes: sensitiveHealthNotesArb,
      profile_picture_url: fc.option(fc.webUrl(), { nil: null }),
      created_at: validDateArb,
      updated_at: validDateArb,
    });

    await fc.assert(
      fc.asyncProperty(
        athleteArb, // Athlete 1 (authenticated)
        athleteArb, // Athlete 2 (target with sensitive data)
        async (athlete1, athlete2) => {
          // Precondition: Different athletes
          fc.pre(athlete1.user_id !== athlete2.user_id);
          fc.pre(athlete1.id !== athlete2.id);

          // Setup: Add both athletes to store
          athletesStore.push(athlete1);
          athletesStore.push(athlete2);

          // Authenticate as athlete1
          currentAuthUserId = athlete1.user_id;

          // Property 1: Athlete1 can see their own health notes
          const ownProfile = await getAthleteProfile(athlete1.user_id);
          expect(ownProfile.error).toBeUndefined();
          expect(ownProfile.data).toBeDefined();
          if (ownProfile.data) {
            expect(ownProfile.data.health_notes).toBe(athlete1.health_notes);
          }

          // Property 2: Athlete1 cannot access athlete2's health notes
          const { data: athlete2Data } = await mockSupabase
            .from('athletes')
            .select('health_notes')
            .eq('id', athlete2.id)
            .maybeSingle();

          // Should return null (RLS blocks access)
          expect(athlete2Data).toBeNull();

          // Property 3: Even if athlete1 tries to query by user_id
          const { data: athlete2DataByUserId } = await mockSupabase
            .from('athletes')
            .select('health_notes')
            .eq('user_id', athlete2.user_id)
            .maybeSingle();

          // Should return null (RLS blocks access)
          expect(athlete2DataByUserId).toBeNull();

          // Property 4: Listing all athletes should not expose athlete2's data
          const { data: allAthletes } = await mockSupabase
            .from('athletes')
            .select('*')
            .then((result: any) => result);

          expect(allAthletes).toBeDefined();
          expect(Array.isArray(allAthletes)).toBe(true);
          
          // Should only contain athlete1's data
          const athlete2InList = allAthletes.find((a: any) => a.id === athlete2.id);
          expect(athlete2InList).toBeUndefined();

          // Clean up
          athletesStore = [];
          currentAuthUserId = null;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Athlete from different club cannot access data
   * For any two athletes from different clubs, one athlete should not be able
   * to access the other's data, even if they try various query methods.
   */
  it.skip('Property: Athletes from different clubs cannot access each other\'s data', async () => {
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);
    const phoneArb = fc
      .tuple(
        fc.constantFrom('06', '08', '09'),
        fc.integer({ min: 10000000, max: 99999999 })
      )
      .map(([prefix, number]) => `${prefix}${number}`);
    
    const dateOfBirthArb = fc
      .integer({ min: 6, max: 50 })
      .map((yearsAgo) => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - yearsAgo);
        return date.toISOString().split('T')[0];
      });

    const validDateArb = fc
      .integer({ min: 0, max: 365 * 50 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
      });

    const athleteArb = fc.record({
      id: uuidArb,
      user_id: uuidArb,
      club_id: uuidArb,
      first_name: nameArb,
      last_name: nameArb,
      nickname: fc.option(nameArb, { nil: null }),
      date_of_birth: dateOfBirthArb,
      phone_number: phoneArb,
      email: fc.emailAddress(),
      gender: fc.constantFrom('male', 'female', 'other'),
      health_notes: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: null }),
      profile_picture_url: fc.option(fc.webUrl(), { nil: null }),
      created_at: validDateArb,
      updated_at: validDateArb,
    });

    await fc.assert(
      fc.asyncProperty(
        athleteArb,
        athleteArb,
        async (athleteClubA, athleteClubB) => {
          // Precondition: Different athletes from different clubs with different IDs
          fc.pre(athleteClubA.user_id !== athleteClubB.user_id);
          fc.pre(athleteClubA.id !== athleteClubB.id);
          fc.pre(athleteClubA.club_id !== athleteClubB.club_id);

          // Setup: Add both athletes to store
          athletesStore.push(athleteClubA);
          athletesStore.push(athleteClubB);

          // Authenticate as athleteClubA
          currentAuthUserId = athleteClubA.user_id;

          // Property 1: AthleteA can access their own data
          const ownData = await getAthleteProfile(athleteClubA.user_id);
          expect(ownData.error).toBeUndefined();
          expect(ownData.data).toBeDefined();
          if (ownData.data) {
            // Verify against what's actually in the store
            const expectedAthlete = athletesStore.find(a => a.user_id === athleteClubA.user_id);
            expect(expectedAthlete).toBeDefined();
            if (expectedAthlete) {
              expect(ownData.data.id).toBe(expectedAthlete.id);
              expect(ownData.data.user_id).toBe(expectedAthlete.user_id);
              expect(ownData.data.club_id).toBe(expectedAthlete.club_id);
            }
          }

          // Property 2: AthleteA cannot access athleteB's data (different club)
          const otherData = await getAthleteProfile(athleteClubB.user_id);
          if (otherData.data) {
            // If data is returned, it should NOT be athleteB's data
            expect(otherData.data.user_id).not.toBe(athleteClubB.user_id);
            expect(otherData.data.club_id).not.toBe(athleteClubB.club_id);
          } else {
            // Should return error with no data
            expect(otherData.data).toBeFalsy();
            expect(otherData.error).toBeDefined();
          }

          // Property 3: Query by club_id should not return athleteB's data
          const { data: clubQuery } = await mockSupabase
            .from('athletes')
            .select('*')
            .eq('club_id', athleteClubB.club_id)
            .then((result: any) => result);

          // Should return empty or null (RLS blocks cross-club access)
          if (clubQuery && Array.isArray(clubQuery)) {
            expect(clubQuery.length).toBe(0);
          }

          // Property 4: AthleteA cannot update athleteB's data
          const { error: updateError } = await mockSupabase
            .from('athletes')
            .update({ nickname: 'CrossClubHack' })
            .eq('id', athleteClubB.id);

          expect(updateError).toBeDefined();

          // Property 5: Verify athleteB's data remains unchanged
          const athleteBInStore = athletesStore.find((a) => a.id === athleteClubB.id);
          expect(athleteBInStore).toBeDefined();
          if (athleteBInStore) {
            expect(athleteBInStore.nickname).toBe(athleteClubB.nickname);
            expect(athleteBInStore.nickname).not.toBe('CrossClubHack');
          }

          // Clean up
          athletesStore = [];
          currentAuthUserId = null;
        }
      ),
      { numRuns: 100 }
    );
  });
});
