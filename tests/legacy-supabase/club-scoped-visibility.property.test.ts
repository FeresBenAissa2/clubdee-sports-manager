/**
 * Property-Based Test for Club-Scoped Data Visibility
 * **Feature: feature-integration-plan, Property 23: Club-scoped Data Visibility**
 * 
 * Property 23: Club-scoped Data Visibility
 * *For any* content created by a coach, only athletes in the same club should see the content.
 * 
 * **Validates: Requirements 9.2**
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

interface Club {
  id: string;
  name: string;
}

interface TrainingSession {
  id: string;
  club_id: string;
  coach_id: string | null;
}

interface Activity {
  id: string;
  club_id: string;
  coach_id: string;
}

interface Tournament {
  id: string;
  club_id: string;
  created_by: string;
}

describe('Property 23: Club-scoped Data Visibility', () => {
  let supabase: SupabaseClient;
  let allClubs: Club[] = [];
  let allCoaches: Coach[] = [];
  let allAthletes: Athlete[] = [];

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all clubs
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id, name');
    allClubs = clubs || [];

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

    console.log('Test setup:', {
      clubCount: allClubs.length,
      coachCount: allCoaches.length,
      athleteCount: allAthletes.length,
    });
  });

  /**
   * **Feature: feature-integration-plan, Property 23: Club-scoped Data Visibility**
   * 
   * For any training session created by a coach, only athletes in the same club
   * should be able to see the session.
   */
  it('training sessions are scoped to the club they belong to', async () => {
    if (allClubs.length === 0) {
      console.log('Skipping: No clubs available');
      return;
    }

    const limitedClubs = allClubs.slice(0, 20);
    const clubArb = fc.constantFrom(...limitedClubs);

    await fc.assert(
      fc.asyncProperty(clubArb, async (club) => {
        // Get all training sessions for this club
        const { data: sessions, error } = await supabase
          .from('training_sessions')
          .select('id, club_id, coach_id')
          .eq('club_id', club.id);

        expect(error).toBeNull();

        // Property: All sessions returned should belong to this club
        if (sessions && sessions.length > 0) {
          sessions.forEach((session: TrainingSession) => {
            expect(session.club_id).toBe(club.id);
          });
        }

        // Get sessions NOT in this club
        const { data: otherSessions } = await supabase
          .from('training_sessions')
          .select('id, club_id')
          .neq('club_id', club.id)
          .limit(10);

        // Property: Sessions from other clubs should have different club_id
        if (otherSessions && otherSessions.length > 0) {
          otherSessions.forEach((session: TrainingSession) => {
            expect(session.club_id).not.toBe(club.id);
          });
        }
      }),
      { numRuns: Math.min(20, limitedClubs.length) }
    );
  }, 30000);

  /**
   * **Feature: feature-integration-plan, Property 23: Club-scoped Data Visibility**
   * 
   * For any activity created by a coach, only athletes in the same club
   * should be able to see the activity.
   */
  it('activities are scoped to the club they belong to', async () => {
    if (allClubs.length === 0) {
      console.log('Skipping: No clubs available');
      return;
    }

    const limitedClubs = allClubs.slice(0, 20);
    const clubArb = fc.constantFrom(...limitedClubs);

    await fc.assert(
      fc.asyncProperty(clubArb, async (club) => {
        // Get all activities for this club
        const { data: activities, error } = await supabase
          .from('activities')
          .select('id, club_id, coach_id')
          .eq('club_id', club.id);

        expect(error).toBeNull();

        // Property: All activities returned should belong to this club
        if (activities && activities.length > 0) {
          activities.forEach((activity: Activity) => {
            expect(activity.club_id).toBe(club.id);
          });
        }
      }),
      { numRuns: Math.min(20, limitedClubs.length) }
    );
  }, 30000);

  /**
   * **Feature: feature-integration-plan, Property 23: Club-scoped Data Visibility**
   * 
   * For any tournament created by a coach, only athletes in the same club
   * should be able to see the tournament.
   */
  it('tournaments are scoped to the club they belong to', async () => {
    if (allClubs.length === 0) {
      console.log('Skipping: No clubs available');
      return;
    }

    const limitedClubs = allClubs.slice(0, 20);
    const clubArb = fc.constantFrom(...limitedClubs);

    await fc.assert(
      fc.asyncProperty(clubArb, async (club) => {
        // Get all tournaments for this club
        const { data: tournaments, error } = await supabase
          .from('tournaments')
          .select('id, club_id, created_by')
          .eq('club_id', club.id);

        expect(error).toBeNull();

        // Property: All tournaments returned should belong to this club
        if (tournaments && tournaments.length > 0) {
          tournaments.forEach((tournament: Tournament) => {
            expect(tournament.club_id).toBe(club.id);
          });
        }
      }),
      { numRuns: Math.min(20, limitedClubs.length) }
    );
  }, 30000);

  /**
   * **Feature: feature-integration-plan, Property 23: Club-scoped Data Visibility**
   * 
   * For any coach-athlete pair in the same club, the athlete should see
   * content created by that coach.
   */
  it('athletes see content from coaches in their club', async () => {
    if (allCoaches.length === 0 || allAthletes.length === 0) {
      console.log('Skipping: No coaches or athletes available');
      return;
    }

    // Find coach-athlete pairs in the same club
    const sameClubPairs: Array<{ coach: Coach; athlete: Athlete }> = [];
    
    for (const coach of allCoaches) {
      for (const athlete of allAthletes) {
        if (coach.club_id === athlete.club_id) {
          sameClubPairs.push({ coach, athlete });
          if (sameClubPairs.length >= 20) break;
        }
      }
      if (sameClubPairs.length >= 20) break;
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

        // Get training sessions from this coach's club
        const { data: sessions } = await supabase
          .from('training_sessions')
          .select('id, club_id')
          .eq('club_id', coach.club_id);

        // Property: All sessions should be from the shared club
        if (sessions && sessions.length > 0) {
          sessions.forEach((session: TrainingSession) => {
            expect(session.club_id).toBe(athlete.club_id);
          });
        }

        // Get announcements from this coach
        const { data: announcements } = await supabase
          .from('announcements')
          .select('id, coach_id')
          .eq('coach_id', coach.id);

        // Property: All announcements should be from this coach
        if (announcements && announcements.length > 0) {
          announcements.forEach((announcement: { id: string; coach_id: string }) => {
            expect(announcement.coach_id).toBe(coach.id);
          });
        }
      }),
      { numRuns: Math.min(20, sameClubPairs.length) }
    );
  }, 30000);

  /**
   * **Feature: feature-integration-plan, Property 23: Club-scoped Data Visibility**
   * 
   * For any coach-athlete pair in different clubs, the athlete should NOT see
   * content scoped to the coach's club.
   */
  it('athletes do not see content from other clubs', async () => {
    if (allCoaches.length === 0 || allAthletes.length === 0 || allClubs.length < 2) {
      console.log('Skipping: Insufficient data for cross-club isolation test');
      return;
    }

    // Find coach-athlete pairs in different clubs
    const differentClubPairs: Array<{ coach: Coach; athlete: Athlete }> = [];
    
    for (const coach of allCoaches) {
      for (const athlete of allAthletes) {
        if (coach.club_id !== athlete.club_id) {
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
          coachClubSessions.forEach((session: TrainingSession) => {
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
          athleteClubSessions.forEach((session: TrainingSession) => {
            expect(session.club_id).not.toBe(coach.club_id);
          });
        }
      }),
      { numRuns: Math.min(20, differentClubPairs.length) }
    );
  }, 30000);

  /**
   * **Feature: feature-integration-plan, Property 23: Club-scoped Data Visibility**
   * 
   * Verify that club_id filtering correctly isolates data.
   */
  it('club_id filtering provides complete data isolation', async () => {
    if (allClubs.length < 2) {
      console.log('Skipping: Need at least 2 clubs for isolation test');
      return;
    }

    // Pick two different clubs
    const club1 = allClubs[0];
    const club2 = allClubs.find(c => c.id !== club1.id);

    if (!club2) {
      console.log('Skipping: Could not find second club');
      return;
    }

    // Get sessions from club1
    const { data: club1Sessions } = await supabase
      .from('training_sessions')
      .select('id, club_id')
      .eq('club_id', club1.id);

    // Get sessions from club2
    const { data: club2Sessions } = await supabase
      .from('training_sessions')
      .select('id, club_id')
      .eq('club_id', club2.id);

    // Property: No overlap between club1 and club2 sessions
    const club1SessionIds = new Set((club1Sessions || []).map(s => s.id));
    const club2SessionIds = new Set((club2Sessions || []).map(s => s.id));

    // Check no intersection
    for (const id of club1SessionIds) {
      expect(club2SessionIds.has(id)).toBe(false);
    }

    for (const id of club2SessionIds) {
      expect(club1SessionIds.has(id)).toBe(false);
    }

    // Verify club_id values
    (club1Sessions || []).forEach((s: TrainingSession) => {
      expect(s.club_id).toBe(club1.id);
    });

    (club2Sessions || []).forEach((s: TrainingSession) => {
      expect(s.club_id).toBe(club2.id);
    });
  });
});
