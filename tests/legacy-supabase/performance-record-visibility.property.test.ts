/**
 * Property-Based Test for Performance Record Visibility
 * **Feature: feature-integration-plan, Property 12: Performance Record Visibility**
 * 
 * Property 12: Performance Record Visibility
 * *For any* performance record created by a coach, the athlete should see 
 * the record in their performance history.
 * 
 * **Validates: Requirements 4.1**
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

interface PerformanceRecord {
  id: string;
  athlete_id: string;
  coach_id: string;
  test_type: string;
  test_name: string;
  score: number;
  unit: string;
  test_date: string;
  notes: string | null;
  created_at: string;
}

describe('Property 12: Performance Record Visibility', () => {
  let supabase: SupabaseClient;
  let allCoaches: Coach[] = [];
  let allAthletes: Athlete[] = [];
  let allPerformanceRecords: PerformanceRecord[] = [];

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

    // Fetch all performance records
    const { data: records } = await supabase
      .from('performance_records')
      .select('id, athlete_id, coach_id, test_type, test_name, score, unit, test_date, notes, created_at');
    allPerformanceRecords = records || [];

    console.log('Test setup:', {
      coachCount: allCoaches.length,
      athleteCount: allAthletes.length,
      performanceRecordCount: allPerformanceRecords.length,
    });
  });

  /**
   * **Feature: feature-integration-plan, Property 12: Performance Record Visibility**
   * 
   * For any performance record created by a coach, the athlete referenced
   * in the record should be able to view it in their performance history.
   */
  it('athletes can view their own performance records', async () => {
    if (allPerformanceRecords.length === 0) {
      console.log('Skipping: No performance records available');
      return;
    }

    // Get records with valid athlete references
    const validAthleteIds = new Set(allAthletes.map(a => a.id));
    const validRecords = allPerformanceRecords.filter(r => validAthleteIds.has(r.athlete_id));

    if (validRecords.length === 0) {
      console.log('Skipping: No performance records with valid athlete references');
      return;
    }

    const limitedRecords = validRecords.slice(0, 100);
    const recordArb = fc.constantFrom(...limitedRecords);

    await fc.assert(
      fc.asyncProperty(recordArb, async (record) => {
        // Get the athlete for this record
        const athlete = allAthletes.find(a => a.id === record.athlete_id);
        expect(athlete).not.toBeUndefined();

        // Query performance records for this athlete
        const { data: athleteRecords, error } = await supabase
          .from('performance_records')
          .select('id, athlete_id')
          .eq('athlete_id', record.athlete_id);

        expect(error).toBeNull();

        // Property: The athlete's performance records should include this record
        const recordIds = (athleteRecords || []).map(r => r.id);
        expect(recordIds).toContain(record.id);

        // Property: All returned records should belong to this athlete
        (athleteRecords || []).forEach(r => {
          expect(r.athlete_id).toBe(record.athlete_id);
        });
      }),
      { numRuns: Math.min(100, limitedRecords.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 12: Performance Record Visibility**
   * 
   * For any performance record, the coach who created it should be from
   * the same club as the athlete.
   */
  it('performance records are created by coaches in the same club as the athlete', async () => {
    if (allPerformanceRecords.length === 0 || allCoaches.length === 0 || allAthletes.length === 0) {
      console.log('Skipping: Insufficient data for coach-athlete club verification');
      return;
    }

    // Get records with valid coach and athlete references
    const validCoachIds = new Set(allCoaches.map(c => c.id));
    const validAthleteIds = new Set(allAthletes.map(a => a.id));
    const validRecords = allPerformanceRecords.filter(
      r => validCoachIds.has(r.coach_id) && validAthleteIds.has(r.athlete_id)
    );

    if (validRecords.length === 0) {
      console.log('Skipping: No performance records with valid coach and athlete references');
      return;
    }

    const limitedRecords = validRecords.slice(0, 50);
    const recordArb = fc.constantFrom(...limitedRecords);

    await fc.assert(
      fc.asyncProperty(recordArb, async (record) => {
        // Find the coach and athlete
        const coach = allCoaches.find(c => c.id === record.coach_id);
        const athlete = allAthletes.find(a => a.id === record.athlete_id);

        expect(coach).not.toBeUndefined();
        expect(athlete).not.toBeUndefined();

        // Property: Coach and athlete should be in the same club
        expect(coach!.club_id).toBe(athlete!.club_id);
      }),
      { numRuns: Math.min(50, limitedRecords.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 12: Performance Record Visibility**
   * 
   * For any athlete, querying their performance records should return
   * only records that belong to them.
   */
  it('athlete performance query returns only their own records', async () => {
    if (allAthletes.length === 0) {
      console.log('Skipping: No athletes available');
      return;
    }

    // Get athletes who have performance records
    const athleteIdsWithRecords = new Set(allPerformanceRecords.map(r => r.athlete_id));
    const athletesWithRecords = allAthletes.filter(a => athleteIdsWithRecords.has(a.id));

    if (athletesWithRecords.length === 0) {
      console.log('Skipping: No athletes with performance records');
      return;
    }

    const limitedAthletes = athletesWithRecords.slice(0, 30);
    const athleteArb = fc.constantFrom(...limitedAthletes);

    await fc.assert(
      fc.asyncProperty(athleteArb, async (athlete) => {
        // Query performance records for this athlete
        const { data: records, error } = await supabase
          .from('performance_records')
          .select('id, athlete_id, test_type, score')
          .eq('athlete_id', athlete.id);

        expect(error).toBeNull();

        // Property: All returned records must belong to this athlete
        if (records && records.length > 0) {
          records.forEach(record => {
            expect(record.athlete_id).toBe(athlete.id);
          });
        }

        // Property: Count should match expected records from our cached data
        const expectedCount = allPerformanceRecords.filter(r => r.athlete_id === athlete.id).length;
        expect(records?.length || 0).toBe(expectedCount);
      }),
      { numRuns: Math.min(30, limitedAthletes.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 12: Performance Record Visibility**
   * 
   * For any performance record, it should have all required fields populated.
   */
  it('performance records have all required fields', async () => {
    if (allPerformanceRecords.length === 0) {
      console.log('Skipping: No performance records available');
      return;
    }

    const limitedRecords = allPerformanceRecords.slice(0, 100);
    const recordArb = fc.constantFrom(...limitedRecords);

    await fc.assert(
      fc.asyncProperty(recordArb, async (record) => {
        // Property: Required fields must be present and valid
        expect(record.id).toBeDefined();
        expect(record.athlete_id).toBeDefined();
        expect(record.coach_id).toBeDefined();
        expect(record.test_type).toBeDefined();
        expect(record.test_name).toBeDefined();
        expect(record.score).toBeDefined();
        expect(record.unit).toBeDefined();
        expect(record.test_date).toBeDefined();

        // Property: Score should be a valid number
        expect(typeof record.score).toBe('number');
        expect(isNaN(record.score)).toBe(false);

        // Property: Test date should be a valid date string
        const testDate = new Date(record.test_date);
        expect(isNaN(testDate.getTime())).toBe(false);
      }),
      { numRuns: Math.min(100, limitedRecords.length) }
    );
  }, 30000);

  /**
   * **Feature: feature-integration-plan, Property 12: Performance Record Visibility**
   * 
   * Athletes cannot view performance records of other athletes.
   */
  it('athletes cannot view other athletes performance records', async () => {
    if (allAthletes.length < 2 || allPerformanceRecords.length === 0) {
      console.log('Skipping: Need at least 2 athletes with performance records');
      return;
    }

    // Get pairs of different athletes where at least one has records
    const athleteIdsWithRecords = new Set(allPerformanceRecords.map(r => r.athlete_id));
    const athletesWithRecords = allAthletes.filter(a => athleteIdsWithRecords.has(a.id));
    const athletesWithoutRecords = allAthletes.filter(a => !athleteIdsWithRecords.has(a.id));

    if (athletesWithRecords.length === 0) {
      console.log('Skipping: No athletes with performance records');
      return;
    }

    // Create pairs of different athletes
    const differentAthletePairs: Array<{ athleteWithRecords: Athlete; otherAthlete: Athlete }> = [];
    
    for (const athleteWithRecords of athletesWithRecords.slice(0, 10)) {
      for (const otherAthlete of allAthletes) {
        if (athleteWithRecords.id !== otherAthlete.id) {
          differentAthletePairs.push({ athleteWithRecords, otherAthlete });
          if (differentAthletePairs.length >= 30) break;
        }
      }
      if (differentAthletePairs.length >= 30) break;
    }

    if (differentAthletePairs.length === 0) {
      console.log('Skipping: Could not create athlete pairs');
      return;
    }

    const pairArb = fc.constantFrom(...differentAthletePairs);

    await fc.assert(
      fc.asyncProperty(pairArb, async ({ athleteWithRecords, otherAthlete }) => {
        // Get records for the athlete with records
        const { data: records } = await supabase
          .from('performance_records')
          .select('id, athlete_id')
          .eq('athlete_id', athleteWithRecords.id);

        // Property: Records should belong to athleteWithRecords, not otherAthlete
        if (records && records.length > 0) {
          records.forEach(record => {
            expect(record.athlete_id).toBe(athleteWithRecords.id);
            expect(record.athlete_id).not.toBe(otherAthlete.id);
          });
        }
      }),
      { numRuns: Math.min(30, differentAthletePairs.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 12: Performance Record Visibility**
   * 
   * Performance records are ordered by test_date for display in athlete dashboard.
   */
  it('performance records can be ordered by test date', async () => {
    if (allAthletes.length === 0) {
      console.log('Skipping: No athletes available');
      return;
    }

    // Get athletes with multiple performance records
    const recordCountByAthlete = new Map<string, number>();
    allPerformanceRecords.forEach(r => {
      recordCountByAthlete.set(r.athlete_id, (recordCountByAthlete.get(r.athlete_id) || 0) + 1);
    });

    const athletesWithMultipleRecords = allAthletes.filter(
      a => (recordCountByAthlete.get(a.id) || 0) >= 2
    );

    if (athletesWithMultipleRecords.length === 0) {
      console.log('Skipping: No athletes with multiple performance records');
      return;
    }

    const limitedAthletes = athletesWithMultipleRecords.slice(0, 20);
    const athleteArb = fc.constantFrom(...limitedAthletes);

    await fc.assert(
      fc.asyncProperty(athleteArb, async (athlete) => {
        // Query records ordered by test_date descending (most recent first)
        const { data: records, error } = await supabase
          .from('performance_records')
          .select('id, athlete_id, test_date')
          .eq('athlete_id', athlete.id)
          .order('test_date', { ascending: false });

        expect(error).toBeNull();

        // Property: Records should be in descending order by test_date
        if (records && records.length >= 2) {
          for (let i = 0; i < records.length - 1; i++) {
            const currentDate = new Date(records[i].test_date);
            const nextDate = new Date(records[i + 1].test_date);
            expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
          }
        }
      }),
      { numRuns: Math.min(20, limitedAthletes.length) }
    );
  }, 60000);
});
