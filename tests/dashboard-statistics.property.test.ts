/**
 * Property-Based Test for Dashboard Statistics Accuracy
 * Feature: sports-club-management
 * 
 * Property 20: Dashboard statistics accuracy
 * Validates: Requirements 5.3
 * 
 * For any system state, the admin dashboard should display aggregate statistics 
 * that accurately reflect the total count of users, clubs, and recent activities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Mock data stores
let clubsStore: Array<{
  id: string;
  name: string;
  description: string | null;
  sport_type: string;
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

let coachesStore: Array<{
  id: string;
  user_id: string;
  club_id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}> = [];

let trainingSessionsStore: Array<{
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  session_date: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}> = [];

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: { id: 'admin-user-id' } },
      error: null,
    })),
  },
  from: vi.fn((table: string) => {
    if (table === 'clubs') {
      return {
        select: vi.fn((columns: string, options?: { count?: string; head?: boolean }) => {
          if (options?.count === 'exact' && options?.head === true) {
            return Promise.resolve({
              count: clubsStore.length,
              error: null,
            });
          }
          return Promise.resolve({
            data: clubsStore,
            error: null,
          });
        }),
      };
    }

    if (table === 'athletes') {
      return {
        select: vi.fn((columns: string, options?: { count?: string; head?: boolean }) => {
          if (options?.count === 'exact' && options?.head === true) {
            return Promise.resolve({
              count: athletesStore.length,
              error: null,
            });
          }
          return Promise.resolve({
            data: athletesStore,
            error: null,
          });
        }),
      };
    }

    if (table === 'coaches') {
      return {
        select: vi.fn((columns: string, options?: { count?: string; head?: boolean }) => {
          if (options?.count === 'exact' && options?.head === true) {
            return Promise.resolve({
              count: coachesStore.length,
              error: null,
            });
          }
          return Promise.resolve({
            data: coachesStore,
            error: null,
          });
        }),
      };
    }

    if (table === 'training_sessions') {
      return {
        select: vi.fn((columns: string, options?: { count?: string; head?: boolean }) => {
          const query = {
            gte: vi.fn((column: string, value: string) => {
              if (options?.count === 'exact' && options?.head === true) {
                // Filter sessions by date
                const filtered = trainingSessionsStore.filter(
                  (session) => session.session_date >= value
                );
                return Promise.resolve({
                  count: filtered.length,
                  error: null,
                });
              }
              return query;
            }),
          };

          if (options?.count === 'exact' && options?.head === true) {
            return query;
          }

          return Promise.resolve({
            data: trainingSessionsStore,
            error: null,
          });
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

// Import after mocking
const { getDashboardStats } = await import('@/lib/admin/actions');

describe('Dashboard Statistics Property-Based Tests', () => {
  beforeEach(() => {
    clubsStore = [];
    athletesStore = [];
    coachesStore = [];
    trainingSessionsStore = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    clubsStore = [];
    athletesStore = [];
    coachesStore = [];
    trainingSessionsStore = [];
  });

  /**
   * Property 20: Dashboard statistics accuracy
   * For any system state, the admin dashboard should display aggregate statistics 
   * that accurately reflect the total count of users, clubs, and recent activities.
   * Validates: Requirements 5.3
   */
  it('Property 20: Dashboard statistics accuracy', async () => {
    // Custom arbitraries
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);
    const emailArb = fc.emailAddress();

    const dateArb = fc
      .integer({ min: 0, max: 365 * 2 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
      });

    const recentDateArb = fc
      .integer({ min: 0, max: 29 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString().split('T')[0];
      });

    const oldDateArb = fc
      .integer({ min: 31, max: 365 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString().split('T')[0];
      });

    const clubArb = fc.record({
      id: uuidArb,
      name: nameArb,
      description: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: null }),
      sport_type: fc.constantFrom('Football', 'Basketball', 'Tennis', 'Swimming', 'Volleyball'),
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

    const coachArb = fc.record({
      id: uuidArb,
      user_id: uuidArb,
      club_id: uuidArb,
      first_name: nameArb,
      last_name: nameArb,
      email: emailArb,
      created_at: dateArb,
      updated_at: dateArb,
    });

    const trainingSessionArb = (isRecent: boolean) =>
      fc.record({
        id: uuidArb,
        team_id: uuidArb,
        title: nameArb,
        description: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: null }),
        session_date: isRecent ? recentDateArb : oldDateArb,
        scheduled_at: dateArb,
        duration_minutes: fc.integer({ min: 30, max: 180 }),
        location: fc.option(nameArb, { nil: null }),
        created_by: uuidArb,
        created_at: dateArb,
        updated_at: dateArb,
      });

    await fc.assert(
      fc.asyncProperty(
        fc.array(clubArb, { minLength: 0, maxLength: 10 }),
        fc.array(athleteArb, { minLength: 0, maxLength: 20 }),
        fc.array(coachArb, { minLength: 0, maxLength: 10 }),
        fc.array(trainingSessionArb(true), { minLength: 0, maxLength: 15 }), // Recent sessions
        fc.array(trainingSessionArb(false), { minLength: 0, maxLength: 10 }), // Old sessions
        async (clubs, athletes, coaches, recentSessions, oldSessions) => {
          // Ensure unique IDs for clubs
          const uniqueClubs = clubs.filter(
            (club, index, self) => self.findIndex((c) => c.id === club.id) === index
          );

          // Ensure unique IDs for athletes
          const allAthleteIds = new Set<string>();
          const uniqueAthletes = athletes.filter((a) => {
            if (allAthleteIds.has(a.id)) return false;
            allAthleteIds.add(a.id);
            return true;
          });

          // Ensure unique IDs for coaches
          const allCoachIds = new Set<string>();
          const uniqueCoaches = coaches.filter((c) => {
            if (allCoachIds.has(c.id)) return false;
            allCoachIds.add(c.id);
            return true;
          });

          // Ensure unique IDs for training sessions
          const allSessionIds = new Set<string>();
          const uniqueRecentSessions = recentSessions.filter((s) => {
            if (allSessionIds.has(s.id)) return false;
            allSessionIds.add(s.id);
            return true;
          });

          const uniqueOldSessions = oldSessions.filter((s) => {
            if (allSessionIds.has(s.id)) return false;
            allSessionIds.add(s.id);
            return true;
          });

          // Setup: Populate stores
          clubsStore = [...uniqueClubs];
          athletesStore = [...uniqueAthletes];
          coachesStore = [...uniqueCoaches];
          trainingSessionsStore = [...uniqueRecentSessions, ...uniqueOldSessions];

          // Calculate expected statistics
          const expectedTotalClubs = uniqueClubs.length;
          const expectedTotalAthletes = uniqueAthletes.length;
          const expectedTotalCoaches = uniqueCoaches.length;
          const expectedTotalUsers = expectedTotalAthletes + expectedTotalCoaches;
          const expectedRecentActivities = uniqueRecentSessions.length;

          // Get dashboard statistics
          const stats = await getDashboardStats();

          // Property 1: Total clubs count should match actual clubs in system
          expect(stats.totalClubs).toBe(expectedTotalClubs);

          // Property 2: Total athletes count should match actual athletes in system
          expect(stats.totalAthletes).toBe(expectedTotalAthletes);

          // Property 3: Total coaches count should match actual coaches in system
          expect(stats.totalCoaches).toBe(expectedTotalCoaches);

          // Property 4: Total users should be sum of athletes and coaches
          expect(stats.totalUsers).toBe(expectedTotalUsers);
          expect(stats.totalUsers).toBe(stats.totalAthletes + stats.totalCoaches);

          // Property 5: Recent activities should only count sessions from last 30 days
          expect(stats.recentActivities).toBe(expectedRecentActivities);

          // Property 6: Statistics should never be negative
          expect(stats.totalClubs).toBeGreaterThanOrEqual(0);
          expect(stats.totalAthletes).toBeGreaterThanOrEqual(0);
          expect(stats.totalCoaches).toBeGreaterThanOrEqual(0);
          expect(stats.totalUsers).toBeGreaterThanOrEqual(0);
          expect(stats.recentActivities).toBeGreaterThanOrEqual(0);

          // Property 7: Total users should never be less than athletes or coaches individually
          expect(stats.totalUsers).toBeGreaterThanOrEqual(stats.totalAthletes);
          expect(stats.totalUsers).toBeGreaterThanOrEqual(stats.totalCoaches);

          // Clean up
          clubsStore = [];
          athletesStore = [];
          coachesStore = [];
          trainingSessionsStore = [];
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Dashboard statistics remain consistent across multiple queries
   * For any system state, querying statistics multiple times should return 
   * the same values (assuming no data changes between queries).
   */
  it('Property: Dashboard statistics remain consistent across multiple queries', async () => {
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);
    const emailArb = fc.emailAddress();

    const dateArb = fc
      .integer({ min: 0, max: 365 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
      });

    const clubArb = fc.record({
      id: uuidArb,
      name: nameArb,
      description: fc.option(fc.string(), { nil: null }),
      sport_type: fc.constantFrom('Football', 'Basketball', 'Tennis'),
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

    const coachArb = fc.record({
      id: uuidArb,
      user_id: uuidArb,
      club_id: uuidArb,
      first_name: nameArb,
      last_name: nameArb,
      email: emailArb,
      created_at: dateArb,
      updated_at: dateArb,
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(clubArb, { minLength: 1, maxLength: 5 }),
        fc.array(athleteArb, { minLength: 1, maxLength: 10 }),
        fc.array(coachArb, { minLength: 1, maxLength: 5 }),
        async (clubs, athletes, coaches) => {
          // Ensure unique IDs
          const uniqueClubs = clubs.filter(
            (club, index, self) => self.findIndex((c) => c.id === club.id) === index
          );

          const allAthleteIds = new Set<string>();
          const uniqueAthletes = athletes.filter((a) => {
            if (allAthleteIds.has(a.id)) return false;
            allAthleteIds.add(a.id);
            return true;
          });

          const allCoachIds = new Set<string>();
          const uniqueCoaches = coaches.filter((c) => {
            if (allCoachIds.has(c.id)) return false;
            allCoachIds.add(c.id);
            return true;
          });

          fc.pre(uniqueClubs.length >= 1);
          fc.pre(uniqueAthletes.length >= 1);
          fc.pre(uniqueCoaches.length >= 1);

          // Setup: Populate stores
          clubsStore = [...uniqueClubs];
          athletesStore = [...uniqueAthletes];
          coachesStore = [...uniqueCoaches];
          trainingSessionsStore = [];

          // Query statistics multiple times
          const stats1 = await getDashboardStats();
          const stats2 = await getDashboardStats();
          const stats3 = await getDashboardStats();

          // Property: All queries should return identical results
          expect(stats1.totalClubs).toBe(stats2.totalClubs);
          expect(stats1.totalClubs).toBe(stats3.totalClubs);

          expect(stats1.totalAthletes).toBe(stats2.totalAthletes);
          expect(stats1.totalAthletes).toBe(stats3.totalAthletes);

          expect(stats1.totalCoaches).toBe(stats2.totalCoaches);
          expect(stats1.totalCoaches).toBe(stats3.totalCoaches);

          expect(stats1.totalUsers).toBe(stats2.totalUsers);
          expect(stats1.totalUsers).toBe(stats3.totalUsers);

          expect(stats1.recentActivities).toBe(stats2.recentActivities);
          expect(stats1.recentActivities).toBe(stats3.recentActivities);

          // Clean up
          clubsStore = [];
          athletesStore = [];
          coachesStore = [];
          trainingSessionsStore = [];
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Empty system returns zero statistics
   * For an empty system (no clubs, athletes, coaches, or sessions), 
   * all statistics should be zero.
   */
  it('Property: Empty system returns zero statistics', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        // Setup: Empty stores
        clubsStore = [];
        athletesStore = [];
        coachesStore = [];
        trainingSessionsStore = [];

        // Get dashboard statistics
        const stats = await getDashboardStats();

        // Property: All statistics should be zero for empty system
        expect(stats.totalClubs).toBe(0);
        expect(stats.totalAthletes).toBe(0);
        expect(stats.totalCoaches).toBe(0);
        expect(stats.totalUsers).toBe(0);
        expect(stats.recentActivities).toBe(0);
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Statistics scale linearly with data
   * For any system state, adding N entities should increase the corresponding 
   * statistic by exactly N.
   */
  it('Property: Statistics scale linearly with data', async () => {
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);
    const emailArb = fc.emailAddress();

    const dateArb = fc
      .integer({ min: 0, max: 365 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
      });

    const clubArb = fc.record({
      id: uuidArb,
      name: nameArb,
      description: fc.option(fc.string(), { nil: null }),
      sport_type: fc.constantFrom('Football', 'Basketball'),
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

    await fc.assert(
      fc.asyncProperty(
        fc.array(clubArb, { minLength: 1, maxLength: 5 }),
        fc.array(athleteArb, { minLength: 1, maxLength: 5 }),
        fc.array(clubArb, { minLength: 1, maxLength: 3 }), // Additional clubs to add
        fc.array(athleteArb, { minLength: 1, maxLength: 3 }), // Additional athletes to add
        async (initialClubs, initialAthletes, additionalClubs, additionalAthletes) => {
          // Ensure unique IDs for initial data
          const uniqueInitialClubs = initialClubs.filter(
            (club, index, self) => self.findIndex((c) => c.id === club.id) === index
          );

          const allAthleteIds = new Set<string>();
          const uniqueInitialAthletes = initialAthletes.filter((a) => {
            if (allAthleteIds.has(a.id)) return false;
            allAthleteIds.add(a.id);
            return true;
          });

          fc.pre(uniqueInitialClubs.length >= 1);
          fc.pre(uniqueInitialAthletes.length >= 1);

          // Setup: Populate stores with initial data
          clubsStore = [...uniqueInitialClubs];
          athletesStore = [...uniqueInitialAthletes];
          coachesStore = [];
          trainingSessionsStore = [];

          // Get initial statistics
          const initialStats = await getDashboardStats();

          // Ensure unique IDs for additional data (different from initial)
          const uniqueAdditionalClubs = additionalClubs.filter((club) => {
            const isDuplicate = clubsStore.some((c) => c.id === club.id);
            if (!isDuplicate) {
              return true;
            }
            return false;
          });

          const uniqueAdditionalAthletes = additionalAthletes.filter((athlete) => {
            if (allAthleteIds.has(athlete.id)) return false;
            allAthleteIds.add(athlete.id);
            return true;
          });

          // Add additional data
          clubsStore.push(...uniqueAdditionalClubs);
          athletesStore.push(...uniqueAdditionalAthletes);

          // Get updated statistics
          const updatedStats = await getDashboardStats();

          // Property: Statistics should increase by exactly the number of added entities
          expect(updatedStats.totalClubs).toBe(
            initialStats.totalClubs + uniqueAdditionalClubs.length
          );
          expect(updatedStats.totalAthletes).toBe(
            initialStats.totalAthletes + uniqueAdditionalAthletes.length
          );
          expect(updatedStats.totalUsers).toBe(
            initialStats.totalUsers + uniqueAdditionalAthletes.length
          );

          // Clean up
          clubsStore = [];
          athletesStore = [];
          coachesStore = [];
          trainingSessionsStore = [];
        }
      ),
      { numRuns: 50 }
    );
  });
});
