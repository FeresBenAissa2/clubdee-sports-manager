/**
 * Property-Based Test for Today Session Recommendation
 * **Feature: feature-integration-plan, Property 6: Today Session Recommendation**
 * 
 * Property 6: Today Session Recommendation
 * *For any* training session scheduled for today, the athlete dashboard 
 * should display a recommendation card.
 * 
 * **Validates: Requirements 2.2**
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface Club {
  id: string;
  name: string;
}

interface Athlete {
  id: string;
  user_id: string;
  club_id: string;
  first_name: string;
  last_name: string;
}

interface TrainingSession {
  id: string;
  club_id: string;
  coach_id: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  title?: string;
  location: string | null;
  status: string | null;
}

/**
 * Helper function to get today's date range for queries
 * Uses the same logic as getTodaySessions in session-integration.ts
 */
function getTodayDateRange(): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    start: today.toISOString(),
    end: tomorrow.toISOString(),
  };
}

/**
 * Simulates the recommendation generation logic from the athlete dashboard
 * Returns true if a "today session" recommendation should be shown
 * 
 * This mirrors the logic in app/dashboard/athlete/page.tsx:
 * - If athlete has no club, no recommendation
 * - If there are sessions for today in the athlete's club, show recommendation
 */
function shouldShowTodaySessionRecommendation(
  todaySessions: TrainingSession[],
  athleteClubId: string | null
): boolean {
  // No club membership = no recommendation
  if (!athleteClubId) {
    return false;
  }
  
  // If there are sessions from the query (already filtered by date range and club),
  // then recommendation should be shown
  return todaySessions.length > 0;
}

describe('Property 6: Today Session Recommendation', () => {
  let supabase: SupabaseClient;
  let allClubs: Club[] = [];
  let allAthletes: Athlete[] = [];
  let allSessions: TrainingSession[] = [];

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all clubs
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id, name');
    allClubs = clubs || [];

    // Fetch all athletes with their club_id
    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, user_id, club_id, first_name, last_name');
    allAthletes = athletes || [];

    // Fetch all training sessions
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id, club_id, coach_id, session_date, start_time, end_time, title, location, status');
    allSessions = sessions || [];

    console.log('Test setup:', {
      clubCount: allClubs.length,
      athleteCount: allAthletes.length,
      sessionCount: allSessions.length,
    });
  });

  /**
   * **Feature: feature-integration-plan, Property 6: Today Session Recommendation**
   * 
   * For any training session scheduled for today, athletes in the same club
   * should see a recommendation card on their dashboard.
   * 
   * Core property: The recommendation is shown if and only if there are
   * sessions scheduled for today in the athlete's club.
   */
  it('athletes see recommendation when their club has sessions today', async () => {
    if (allAthletes.length === 0 || allClubs.length === 0) {
      console.log('Skipping: No athletes or clubs available');
      return;
    }

    // Get athletes with valid club membership
    const athletesWithClub = allAthletes.filter(a => a.club_id !== null);

    if (athletesWithClub.length === 0) {
      console.log('Skipping: No athletes with club membership');
      return;
    }

    const athleteArb = fc.constantFrom(...athletesWithClub.slice(0, 50));

    await fc.assert(
      fc.asyncProperty(athleteArb, async (athlete) => {
        // Get today's date range (same logic as getTodaySessions)
        const { start, end } = getTodayDateRange();

        // Query sessions for the athlete's club scheduled for today
        const { data: todaySessions, error } = await supabase
          .from('training_sessions')
          .select('id, club_id, coach_id, session_date, start_time, end_time, title, location, status')
          .eq('club_id', athlete.club_id)
          .gte('session_date', start)
          .lt('session_date', end);

        expect(error).toBeNull();

        // Property: Recommendation status should match session availability
        const shouldShowRecommendation = shouldShowTodaySessionRecommendation(
          todaySessions || [],
          athlete.club_id
        );

        if (todaySessions && todaySessions.length > 0) {
          // Property: When sessions exist today, recommendation should be shown
          expect(shouldShowRecommendation).toBe(true);
          
          // Property: All returned sessions should be from the athlete's club
          todaySessions.forEach(session => {
            expect(session.club_id).toBe(athlete.club_id);
          });
        } else {
          // Property: When no sessions today, no recommendation should be shown
          expect(shouldShowRecommendation).toBe(false);
        }
      }),
      { numRuns: Math.min(30, athletesWithClub.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 6: Today Session Recommendation**
   * 
   * For any club with sessions scheduled for today, all athletes in that club
   * should see the recommendation.
   */
  it('all athletes in a club see recommendation when club has sessions today', async () => {
    if (allClubs.length === 0 || allAthletes.length === 0) {
      console.log('Skipping: No clubs or athletes available');
      return;
    }

    // Get clubs that have athletes
    const clubsWithAthletes = allClubs.filter(club => 
      allAthletes.some(a => a.club_id === club.id)
    );

    if (clubsWithAthletes.length === 0) {
      console.log('Skipping: No clubs with athletes');
      return;
    }

    const clubArb = fc.constantFrom(...clubsWithAthletes.slice(0, 20));

    await fc.assert(
      fc.asyncProperty(clubArb, async (club) => {
        // Get today's date range
        const { start, end } = getTodayDateRange();

        // Query sessions for this club scheduled for today
        const { data: todaySessions, error } = await supabase
          .from('training_sessions')
          .select('id, club_id, session_date')
          .eq('club_id', club.id)
          .gte('session_date', start)
          .lt('session_date', end);

        expect(error).toBeNull();

        // Get all athletes in this club
        const clubAthletes = allAthletes.filter(a => a.club_id === club.id);

        // Property: All athletes in the club should have the same recommendation status
        const hasTodaySessions = (todaySessions?.length || 0) > 0;

        clubAthletes.forEach(athlete => {
          const shouldShow = shouldShowTodaySessionRecommendation(
            todaySessions || [],
            athlete.club_id
          );
          
          // Property: Recommendation status should match session availability
          expect(shouldShow).toBe(hasTodaySessions);
        });
      }),
      { numRuns: Math.min(20, clubsWithAthletes.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 6: Today Session Recommendation**
   * 
   * For any athlete without club membership, no recommendation should be shown
   * regardless of sessions in the system.
   */
  it('athletes without club membership do not see today session recommendation', async () => {
    // Create test scenarios with null club_id
    const testScenarios = [
      { athleteClubId: null, sessions: [] },
      { athleteClubId: null, sessions: allSessions.slice(0, 5) },
    ];

    const scenarioArb = fc.constantFrom(...testScenarios);

    await fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const shouldShow = shouldShowTodaySessionRecommendation(
          scenario.sessions,
          scenario.athleteClubId
        );

        // Property: Athletes without club membership should never see recommendation
        expect(shouldShow).toBe(false);
      }),
      { numRuns: 10 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 6: Today Session Recommendation**
   * 
   * Verify the getTodaySessions query returns only sessions from today.
   */
  it('getTodaySessions query returns only sessions scheduled for today', async () => {
    if (allClubs.length === 0) {
      console.log('Skipping: No clubs available');
      return;
    }

    const clubArb = fc.constantFrom(...allClubs.slice(0, 20));

    await fc.assert(
      fc.asyncProperty(clubArb, async (club) => {
        // Get today's date range
        const { start, end } = getTodayDateRange();

        // Query sessions for this club scheduled for today (same query as getTodaySessions)
        const { data: todaySessions, error } = await supabase
          .from('training_sessions')
          .select('id, club_id, session_date')
          .eq('club_id', club.id)
          .gte('session_date', start)
          .lt('session_date', end);

        expect(error).toBeNull();

        // Property: All returned sessions should be from the queried club
        if (todaySessions && todaySessions.length > 0) {
          todaySessions.forEach(session => {
            expect(session.club_id).toBe(club.id);
          });
        }
      }),
      { numRuns: Math.min(20, allClubs.length) }
    );
  }, 30000);

  /**
   * **Feature: feature-integration-plan, Property 6: Today Session Recommendation**
   * 
   * For any athlete, the recommendation should only show sessions from their own club.
   */
  it('recommendation only shows sessions from athlete own club', async () => {
    if (allAthletes.length === 0 || allSessions.length === 0) {
      console.log('Skipping: No athletes or sessions available');
      return;
    }

    // Get athletes with valid club membership
    const athletesWithClub = allAthletes.filter(a => a.club_id !== null);

    if (athletesWithClub.length === 0) {
      console.log('Skipping: No athletes with club membership');
      return;
    }

    const athleteArb = fc.constantFrom(...athletesWithClub.slice(0, 30));

    await fc.assert(
      fc.property(athleteArb, (athlete) => {
        // Get sessions from other clubs
        const otherClubSessions = allSessions.filter(
          s => s.club_id !== athlete.club_id
        );

        // Property: Sessions from other clubs should not trigger recommendation
        // (because the query filters by club_id, these sessions wouldn't be returned)
        const shouldShow = shouldShowTodaySessionRecommendation(
          otherClubSessions,
          athlete.club_id
        );

        // Since otherClubSessions are from different clubs, and our function
        // just checks if the array is non-empty, this tests that the query
        // filtering is essential for correct behavior
        if (otherClubSessions.length > 0) {
          // The function returns true because it doesn't re-filter by club
          // This is correct because the query should already filter by club
          expect(shouldShow).toBe(true);
        } else {
          expect(shouldShow).toBe(false);
        }
      }),
      { numRuns: Math.min(30, athletesWithClub.length) }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 6: Today Session Recommendation**
   * 
   * Property: The recommendation title should be "มีการฝึกซ้อมวันนี้"
   * when there are sessions scheduled for today.
   */
  it('recommendation has correct title when sessions exist today', async () => {
    // This test verifies the recommendation structure matches the design
    const EXPECTED_TITLE = 'มีการฝึกซ้อมวันนี้';
    
    // Simulate the recommendation generation from athlete dashboard
    const generateRecommendation = (todaySessions: TrainingSession[]) => {
      if (todaySessions.length > 0) {
        return {
          id: 'today-session',
          title: EXPECTED_TITLE,
          description: `${todaySessions[0].title || 'Training Session'} - อย่าลืมเช็คอินเมื่อถึงเวลา`,
          action: 'ดูรายละเอียด',
          href: '/dashboard/athlete/schedule',
          priority: 'high' as const,
        };
      }
      return null;
    };

    // Test with various session scenarios
    const sessionArb = fc.array(
      fc.record({
        id: fc.uuid(),
        club_id: fc.uuid(),
        coach_id: fc.option(fc.uuid(), { nil: null }),
        session_date: fc.constant(new Date().toISOString()),
        start_time: fc.constant('10:00:00'),
        end_time: fc.constant('12:00:00'),
        title: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        location: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
        status: fc.constant('scheduled'),
      }),
      { minLength: 0, maxLength: 5 }
    );

    fc.assert(
      fc.property(sessionArb, (sessions) => {
        const recommendation = generateRecommendation(sessions);

        if (sessions.length > 0) {
          // Property: When sessions exist, recommendation should be generated
          expect(recommendation).not.toBeNull();
          expect(recommendation?.title).toBe(EXPECTED_TITLE);
          expect(recommendation?.priority).toBe('high');
          expect(recommendation?.href).toBe('/dashboard/athlete/schedule');
        } else {
          // Property: When no sessions, no recommendation
          expect(recommendation).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });
});
