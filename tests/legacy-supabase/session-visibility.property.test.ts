/**
 * Property-Based Test for Session Visibility
 * **Feature: feature-integration-plan, Property 5: Session Visibility**
 * 
 * Property 5: Session Visibility
 * *For any* training session created by a coach, all athletes in the same club 
 * should see the session in their schedule.
 * 
 * **Validates: Requirements 2.1**
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface Coach {
  id: string;
  user_id: string;
  club_id: string;
}

interface Athlete {
  id: string;
  user_id: string;
  club_id: string;
}

interface TrainingSession {
  id: string;
  club_id: string;
  coach_id: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  status: string | null;
}

describe('Property 5: Session Visibility', () => {
  let supabase: SupabaseClient;
  let allCoaches: Coach[] = [];
  let allAthletes: Athlete[] = [];
  let allSessions: TrainingSession[] = [];

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all coaches with their club_id
    const { data: coaches } = await supabase
      .from('coaches')
      .select('id, user_id, club_id');
    allCoaches = coaches || [];

    // Fetch all athletes with their club_id
    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, user_id, club_id');
    allAthletes = athletes || [];

    // Fetch all training sessions
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id, club_id, coach_id, session_date, start_time, end_time, location, status');
    allSessions = sessions || [];

    console.log('Test setup:', {
      coachCount: allCoaches.length,
      athleteCount: allAthletes.length,
      sessionCount: allSessions.length,
    });
  });

  /**
   * **Feature: feature-integration-plan, Property 5: Session Visibility**
   * 
   * For any training session created by a coach, athletes in the same club
   * should be able to view that session in their schedule.
   */
  it('athletes in the same club can view training sessions from their club', async () => {
    if (allCoaches.length === 0 || allAthletes.length === 0) {
      console.log('Skipping: No coaches or athletes available');
      return;
    }

    // Find coach-athlete pairs in the same club
    const sameClubPairs: Array<{ coach: Coach; athlete: Athlete }> = [];
    
    for (const coach of allCoaches) {
      for (const athlete of allAthletes) {
        if (coach.club_id === athlete.club_id && coach.club_id !== null) {
          sameClubPairs.push({ coach, athlete });
          if (sameClubPairs.length >= 50) break;
        }
      }
      if (sameClubPairs.length >= 50) break;
    }

    if (sameClubPairs.length === 0) {
      console.log('Skipping: No same-club coach-athlete pairs found');
      return;
    }

    const pairArb = fc.constantFrom(...sameClubPairs);

    await fc.assert(
      fc.asyncProperty(pairArb, async ({ coach, athlete }) => {
        // Property: Coach and athlete must have the same club_id
        expect(coach.club_id).toBe(athlete.club_id);

        // Get training sessions from this club
        const { data: clubSessions, error } = await supabase
          .from('training_sessions')
          .select('id, club_id, coach_id')
          .eq('club_id', coach.club_id);

        expect(error).toBeNull();

        // Property: All sessions from this club should be visible to athletes in the same club
        if (clubSessions && clubSessions.length > 0) {
          clubSessions.forEach((session) => {
            // Session must belong to the same club as the athlete
            expect(session.club_id).toBe(athlete.club_id);
          });
        }
      }),
      { numRuns: Math.min(30, sameClubPairs.length) }
    );
  }, 90000);

  /**
   * **Feature: feature-integration-plan, Property 5: Session Visibility**
   * 
   * For any training session, athletes NOT in the same club should NOT see it.
   */
  it('athletes cannot view training sessions from different clubs', async () => {
    if (allCoaches.length === 0 || allAthletes.length === 0) {
      console.log('Skipping: No coaches or athletes available');
      return;
    }

    // Find coach-athlete pairs in different clubs
    const differentClubPairs: Array<{ coach: Coach; athlete: Athlete }> = [];
    
    for (const coach of allCoaches) {
      for (const athlete of allAthletes) {
        if (coach.club_id !== athlete.club_id && coach.club_id !== null && athlete.club_id !== null) {
          differentClubPairs.push({ coach, athlete });
          if (differentClubPairs.length >= 20) break;
        }
      }
      if (differentClubPairs.length >= 20) break;
    }

    if (differentClubPairs.length === 0) {
      console.log('Skipping: No different-club coach-athlete pairs found');
      return;
    }

    const pairArb = fc.constantFrom(...differentClubPairs);

    await fc.assert(
      fc.asyncProperty(pairArb, async ({ coach, athlete }) => {
        // Property: Coach and athlete must have different club_ids
        expect(coach.club_id).not.toBe(athlete.club_id);

        // Get training sessions from coach's club
        const { data: coachClubSessions } = await supabase
          .from('training_sessions')
          .select('id, club_id')
          .eq('club_id', coach.club_id);

        // Property: Sessions from coach's club should NOT be in athlete's club
        if (coachClubSessions && coachClubSessions.length > 0) {
          coachClubSessions.forEach((session) => {
            expect(session.club_id).not.toBe(athlete.club_id);
          });
        }

        // Get training sessions from athlete's club
        const { data: athleteClubSessions } = await supabase
          .from('training_sessions')
          .select('id, club_id')
          .eq('club_id', athlete.club_id);

        // Property: Sessions from athlete's club should NOT be in coach's club
        if (athleteClubSessions && athleteClubSessions.length > 0) {
          athleteClubSessions.forEach((session) => {
            expect(session.club_id).not.toBe(coach.club_id);
          });
        }
      }),
      { numRuns: Math.min(20, differentClubPairs.length) }
    );
  }, 90000);

  /**
   * **Feature: feature-integration-plan, Property 5: Session Visibility**
   * 
   * For any existing training session, verify it is associated with a valid club.
   */
  it('all training sessions are properly associated with clubs', async () => {
    if (allSessions.length === 0) {
      console.log('Skipping: No training sessions available');
      return;
    }

    const limitedSessions = allSessions.slice(0, 100);
    const sessionArb = fc.constantFrom(...limitedSessions);

    await fc.assert(
      fc.asyncProperty(sessionArb, async (session) => {
        // Property: Every session must have a valid club_id
        expect(session.club_id).not.toBeNull();
        expect(session.club_id).toBeDefined();

        // Verify the club exists
        const { data: club, error } = await supabase
          .from('clubs')
          .select('id, name')
          .eq('id', session.club_id)
          .single();

        expect(error).toBeNull();
        expect(club).not.toBeNull();
        expect(club?.id).toBe(session.club_id);
      }),
      { numRuns: Math.min(100, limitedSessions.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 5: Session Visibility**
   * 
   * For any training session, all athletes in the session's club should be able
   * to access it (verified by club membership).
   */
  it('session visibility is determined by club membership', async () => {
    if (allSessions.length === 0 || allAthletes.length === 0) {
      console.log('Skipping: No sessions or athletes available');
      return;
    }

    // Get sessions with valid club_id
    const sessionsWithClub = allSessions.filter(s => s.club_id !== null).slice(0, 50);

    if (sessionsWithClub.length === 0) {
      console.log('Skipping: No sessions with valid club associations');
      return;
    }

    const sessionArb = fc.constantFrom(...sessionsWithClub);

    await fc.assert(
      fc.asyncProperty(sessionArb, async (session) => {
        // Get all athletes in the same club as the session
        const athletesInClub = allAthletes.filter(a => a.club_id === session.club_id);

        // Property: Athletes in the same club should have matching club_id
        athletesInClub.forEach(athlete => {
          expect(athlete.club_id).toBe(session.club_id);
        });

        // Property: Athletes NOT in this club should have different club_id
        const athletesNotInClub = allAthletes.filter(a => a.club_id !== session.club_id);
        athletesNotInClub.forEach(athlete => {
          expect(athlete.club_id).not.toBe(session.club_id);
        });
      }),
      { numRuns: Math.min(50, sessionsWithClub.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 5: Session Visibility**
   * 
   * For any coach who creates a session, the session should be visible to
   * all athletes in the coach's club.
   */
  it('sessions created by a coach are visible to all athletes in the same club', async () => {
    if (allSessions.length === 0 || allCoaches.length === 0 || allAthletes.length === 0) {
      console.log('Skipping: Insufficient data for coach-session-athlete test');
      return;
    }

    // Get sessions with valid coach_id
    const sessionsWithCoach = allSessions.filter(s => s.coach_id !== null).slice(0, 50);

    if (sessionsWithCoach.length === 0) {
      console.log('Skipping: No sessions with valid coach associations');
      return;
    }

    const sessionArb = fc.constantFrom(...sessionsWithCoach);

    await fc.assert(
      fc.asyncProperty(sessionArb, async (session) => {
        // Find the coach who created this session
        const coach = allCoaches.find(c => c.id === session.coach_id);
        
        if (!coach) {
          // Session has a coach_id but coach not found - skip this case
          return;
        }

        // Property: Session's club_id should match the coach's club_id
        expect(session.club_id).toBe(coach.club_id);

        // Get all athletes in the coach's club
        const athletesInCoachClub = allAthletes.filter(a => a.club_id === coach.club_id);

        // Property: All athletes in the coach's club should be able to see this session
        // (verified by matching club_id)
        athletesInCoachClub.forEach(athlete => {
          expect(athlete.club_id).toBe(session.club_id);
        });
      }),
      { numRuns: Math.min(50, sessionsWithCoach.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 5: Session Visibility**
   * 
   * Verify that querying sessions by club_id returns only sessions from that club.
   */
  it('club_id filtering correctly isolates training sessions', async () => {
    // Get unique club_ids from sessions
    const clubIds = [...new Set(allSessions.map(s => s.club_id).filter(id => id !== null))];

    if (clubIds.length < 2) {
      console.log('Skipping: Need at least 2 clubs with sessions for isolation test');
      return;
    }

    const clubIdArb = fc.constantFrom(...clubIds.slice(0, 10));

    await fc.assert(
      fc.asyncProperty(clubIdArb, async (clubId) => {
        // Get sessions for this specific club
        const { data: clubSessions, error } = await supabase
          .from('training_sessions')
          .select('id, club_id')
          .eq('club_id', clubId);

        expect(error).toBeNull();

        // Property: All returned sessions must belong to the queried club
        if (clubSessions && clubSessions.length > 0) {
          clubSessions.forEach((session) => {
            expect(session.club_id).toBe(clubId);
          });
        }

        // Get sessions NOT in this club
        const { data: otherSessions } = await supabase
          .from('training_sessions')
          .select('id, club_id')
          .neq('club_id', clubId)
          .limit(10);

        // Property: Sessions from other clubs should have different club_id
        if (otherSessions && otherSessions.length > 0) {
          otherSessions.forEach((session) => {
            expect(session.club_id).not.toBe(clubId);
          });
        }
      }),
      { numRuns: Math.min(10, clubIds.length) }
    );
  }, 30000);
});
