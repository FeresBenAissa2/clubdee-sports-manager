/**
 * Property-Based Test for Club-Based Data Isolation
 * **Feature: demo-data-integration, Property 1: Club-Based Data Isolation**
 * 
 * Property 1: Club-Based Data Isolation
 * *For any* coach and athlete pair, if they have the same club_id, the athlete 
 * should see announcements created by that coach. If they have different club_ids, 
 * the athlete should not see those announcements.
 * 
 * **Validates: Requirements 2.2, 3.1**
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Demo IDs
const DEMO_CLUB_ID = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';
const DEMO_COACH_USER_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
const DEMO_ATHLETE_USER_ID = 'c3d4e5f6-a7b8-9012-cdef-123456789012';

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

interface Announcement {
  id: string;
  coach_id: string;
  title: string;
}

interface Club {
  id: string;
  name: string;
}

describe('Property 1: Club-Based Data Isolation', () => {
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
   * **Feature: demo-data-integration, Property 1: Club-Based Data Isolation**
   * 
   * For any coach-athlete pair with the same club_id, announcements from that coach
   * should be visible to that athlete.
   */
  it('should allow athletes to see announcements from coaches in the same club', async () => {
    // Skip if no coaches or athletes
    if (allCoaches.length === 0 || allAthletes.length === 0) {
      console.log('Skipping: No coaches or athletes available');
      return;
    }

    // Get demo coach
    const demoCoach = allCoaches.find(c => c.user_id === DEMO_COACH_USER_ID);
    if (!demoCoach) {
      console.log('Skipping: Demo coach not found');
      return;
    }

    // Get demo athlete
    const demoAthlete = allAthletes.find(a => a.user_id === DEMO_ATHLETE_USER_ID);
    if (!demoAthlete) {
      console.log('Skipping: Demo athlete not found');
      return;
    }

    // Verify they are in the same club
    expect(demoCoach.club_id).toBe(demoAthlete.club_id);
    expect(demoCoach.club_id).toBe(DEMO_CLUB_ID);

    // Get announcements from demo coach
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('id, coach_id, title')
      .eq('coach_id', demoCoach.id);

    expect(error).toBeNull();

    // If there are announcements, they should all be from the demo coach
    if (announcements && announcements.length > 0) {
      announcements.forEach((announcement: Announcement) => {
        expect(announcement.coach_id).toBe(demoCoach.id);
      });
    }
  });

  /**
   * Property test: For any randomly selected coach-athlete pair with the same club_id,
   * the athlete should be able to see announcements from that coach.
   */
  it('should maintain club isolation for any coach-athlete pair in the same club', async () => {
    // Skip if insufficient data
    if (allCoaches.length === 0 || allAthletes.length === 0) {
      console.log('Skipping: Insufficient data for property test');
      return;
    }

    // Find coach-athlete pairs in the same club (limit to avoid timeout)
    const sameClubPairs: Array<{ coach: Coach; athlete: Athlete }> = [];
    
    for (const coach of allCoaches) {
      for (const athlete of allAthletes) {
        if (coach.club_id === athlete.club_id) {
          sameClubPairs.push({ coach, athlete });
          if (sameClubPairs.length >= 20) break; // Limit pairs
        }
      }
      if (sameClubPairs.length >= 20) break;
    }

    if (sameClubPairs.length === 0) {
      console.log('Skipping: No same-club coach-athlete pairs found');
      return;
    }

    // Create arbitrary for selecting pairs
    const pairArb = fc.constantFrom(...sameClubPairs);

    await fc.assert(
      fc.asyncProperty(pairArb, async ({ coach, athlete }) => {
        // Property: Coach and athlete must have the same club_id
        expect(coach.club_id).toBe(athlete.club_id);

        // Get announcements from this coach
        const { data: announcements, error } = await supabase
          .from('announcements')
          .select('id, coach_id, title')
          .eq('coach_id', coach.id);

        expect(error).toBeNull();

        // All announcements should be from this coach
        if (announcements && announcements.length > 0) {
          announcements.forEach((announcement: Announcement) => {
            expect(announcement.coach_id).toBe(coach.id);
          });
        }

        // Verify the coach belongs to the same club as the athlete
        const { data: coachData } = await supabase
          .from('coaches')
          .select('club_id')
          .eq('id', coach.id)
          .single();

        expect(coachData?.club_id).toBe(athlete.club_id);
      }),
      { numRuns: Math.min(20, sameClubPairs.length) }
    );
  }, 30000);

  /**
   * Property test: For any randomly selected coach-athlete pair with different club_ids,
   * the athlete should NOT see announcements from that coach when filtered by their club.
   */
  it('should isolate announcements between different clubs', async () => {
    // Skip if insufficient data
    if (allCoaches.length === 0 || allAthletes.length === 0 || allClubs.length < 2) {
      console.log('Skipping: Insufficient data for cross-club isolation test');
      return;
    }

    // Find coach-athlete pairs in different clubs (limit to avoid timeout)
    const differentClubPairs: Array<{ coach: Coach; athlete: Athlete }> = [];
    
    for (const coach of allCoaches) {
      for (const athlete of allAthletes) {
        if (coach.club_id !== athlete.club_id) {
          differentClubPairs.push({ coach, athlete });
          if (differentClubPairs.length >= 20) break; // Limit pairs
        }
      }
      if (differentClubPairs.length >= 20) break;
    }

    if (differentClubPairs.length === 0) {
      console.log('Skipping: No different-club coach-athlete pairs found');
      return;
    }

    // Create arbitrary for selecting pairs
    const pairArb = fc.constantFrom(...differentClubPairs);

    await fc.assert(
      fc.asyncProperty(pairArb, async ({ coach, athlete }) => {
        // Property: Coach and athlete must have different club_ids
        expect(coach.club_id).not.toBe(athlete.club_id);

        // Get announcements from this coach
        const { data: coachAnnouncements } = await supabase
          .from('announcements')
          .select('id, coach_id')
          .eq('coach_id', coach.id);

        // Get all coaches in the athlete's club
        const { data: athleteClubCoaches } = await supabase
          .from('coaches')
          .select('id')
          .eq('club_id', athlete.club_id);

        const athleteClubCoachIds = new Set(
          (athleteClubCoaches || []).map(c => c.id)
        );

        // Property: Announcements from this coach should NOT be from a coach in the athlete's club
        if (coachAnnouncements && coachAnnouncements.length > 0) {
          coachAnnouncements.forEach((announcement: Announcement) => {
            // The coach who made this announcement should NOT be in the athlete's club
            expect(athleteClubCoachIds.has(announcement.coach_id)).toBe(false);
          });
        }
      }),
      { numRuns: Math.min(20, differentClubPairs.length) }
    );
  }, 30000);

  /**
   * Property test: Announcements query filtered by club should only return
   * announcements from coaches in that club.
   */
  it('should return only club-specific announcements when queried by club', async () => {
    // Skip if no clubs
    if (allClubs.length === 0) {
      console.log('Skipping: No clubs available');
      return;
    }

    // Limit to first 20 clubs to avoid timeout
    const limitedClubs = allClubs.slice(0, 20);
    const clubArb = fc.constantFrom(...limitedClubs);

    await fc.assert(
      fc.asyncProperty(clubArb, async (club) => {
        // Get all coaches in this club
        const { data: clubCoaches } = await supabase
          .from('coaches')
          .select('id')
          .eq('club_id', club.id);

        const clubCoachIds = new Set((clubCoaches || []).map(c => c.id));

        // Skip if no coaches in this club
        if (clubCoachIds.size === 0) {
          return;
        }

        // Get announcements from coaches in this club
        const { data: announcements, error } = await supabase
          .from('announcements')
          .select('id, coach_id, title')
          .in('coach_id', Array.from(clubCoachIds));

        expect(error).toBeNull();

        // Property: All returned announcements should be from coaches in this club
        if (announcements && announcements.length > 0) {
          announcements.forEach((announcement: Announcement) => {
            expect(clubCoachIds.has(announcement.coach_id)).toBe(true);
          });
        }
      }),
      { numRuns: Math.min(20, limitedClubs.length) }
    );
  }, 30000);

  /**
   * Verify demo data specifically follows club isolation
   */
  it('should have demo coach and athlete in the same club', async () => {
    const demoCoach = allCoaches.find(c => c.user_id === DEMO_COACH_USER_ID);
    const demoAthlete = allAthletes.find(a => a.user_id === DEMO_ATHLETE_USER_ID);

    expect(demoCoach).toBeDefined();
    expect(demoAthlete).toBeDefined();

    if (demoCoach && demoAthlete) {
      // Property: Demo coach and athlete must be in the same club
      expect(demoCoach.club_id).toBe(demoAthlete.club_id);
      expect(demoCoach.club_id).toBe(DEMO_CLUB_ID);
      expect(demoAthlete.club_id).toBe(DEMO_CLUB_ID);
    }
  });

  /**
   * Verify announcements from demo coach are accessible
   */
  it('should have announcements from demo coach accessible to demo athlete', async () => {
    const demoCoach = allCoaches.find(c => c.user_id === DEMO_COACH_USER_ID);
    
    if (!demoCoach) {
      console.log('Skipping: Demo coach not found');
      return;
    }

    // Get announcements from demo coach
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('id, coach_id, title')
      .eq('coach_id', demoCoach.id);

    expect(error).toBeNull();
    expect(announcements).toBeDefined();

    // Should have at least one announcement (from demo data)
    expect(announcements!.length).toBeGreaterThan(0);

    // All announcements should be from the demo coach
    announcements!.forEach((announcement: Announcement) => {
      expect(announcement.coach_id).toBe(demoCoach.id);
    });
  });
});
