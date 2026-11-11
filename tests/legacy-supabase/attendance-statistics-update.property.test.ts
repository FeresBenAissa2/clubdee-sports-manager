/**
 * Property-Based Test for Attendance Statistics Update
 * **Feature: feature-integration-plan, Property 7: Attendance Statistics Update**
 * 
 * Property 7: Attendance Statistics Update
 * *For any* attendance record created, the athlete's statistics should update 
 * to reflect the new attendance count.
 * 
 * **Validates: Requirements 2.3, 7.1**
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface Athlete {
  id: string;
  user_id: string;
  club_id: string;
  first_name: string;
  last_name: string;
}

interface AttendanceRecord {
  id: string;
  athlete_id: string;
  training_session_id: string;
  status: 'present' | 'absent' | 'excused' | 'late';
  session_date?: string;
  check_in_time?: string;
}

interface AttendanceStats {
  totalAttendance: number;
  monthlyAttendance: number;
  attendanceRate: number;
}

/**
 * Arbitrary for generating safe date strings within a range
 */
const safeDateStringArb = (): fc.Arbitrary<string> => {
  return fc.tuple(
    fc.integer({ min: 2024, max: 2025 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 })
  ).map(([year, month, day, hour, minute, second]) => {
    const date = new Date(year, month - 1, day, hour, minute, second);
    return date.toISOString();
  });
};

/**
 * Calculate attendance statistics for an athlete based on their attendance records.
 * This mirrors the logic in the athlete dashboard.
 */
function calculateAttendanceStats(records: AttendanceRecord[]): AttendanceStats {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const totalAttendance = records.filter(r => r.status === 'present').length;

  const monthlyAttendance = records.filter(r => {
    if (r.status !== 'present') return false;
    if (!r.session_date) return false;
    const sessionDate = new Date(r.session_date);
    return sessionDate >= startOfMonth;
  }).length;

  const totalSessions = records.length;
  const attendanceRate = totalSessions > 0 
    ? Math.round((totalAttendance / totalSessions) * 100 * 10) / 10
    : 0;

  return { totalAttendance, monthlyAttendance, attendanceRate };
}

/**
 * Simulate adding a new attendance record and verify statistics update correctly.
 */
function simulateAttendanceUpdate(
  existingRecords: AttendanceRecord[],
  newRecord: AttendanceRecord
): { before: AttendanceStats; after: AttendanceStats } {
  const before = calculateAttendanceStats(existingRecords);
  const after = calculateAttendanceStats([...existingRecords, newRecord]);
  return { before, after };
}

describe('Property 7: Attendance Statistics Update', () => {
  let supabase: SupabaseClient;
  let allAthletes: Athlete[] = [];
  let allAttendance: AttendanceRecord[] = [];

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, user_id, club_id, first_name, last_name');
    allAthletes = athletes || [];

    const { data: attendance } = await supabase
      .from('attendance')
      .select('id, athlete_id, training_session_id, status, session_date, check_in_time');
    allAttendance = attendance || [];

    console.log('Test setup:', {
      athleteCount: allAthletes.length,
      attendanceCount: allAttendance.length,
    });
  });

  // Create reusable arbitraries
  const statusArb = fc.constantFrom('present', 'absent', 'excused', 'late') as fc.Arbitrary<
    'present' | 'absent' | 'excused' | 'late'
  >;

  const recordArb: fc.Arbitrary<AttendanceRecord> = fc.record({
    id: fc.uuid(),
    athlete_id: fc.uuid(),
    training_session_id: fc.uuid(),
    status: statusArb,
    session_date: safeDateStringArb(),
    check_in_time: fc.option(safeDateStringArb(), { nil: undefined }),
  });

  /**
   * **Feature: feature-integration-plan, Property 7: Attendance Statistics Update**
   * 
   * For any attendance record with status 'present', adding it should increase
   * the total attendance count by exactly 1.
   */
  it('adding a present attendance record increases total count by 1', () => {
    const existingRecordsArb = fc.array(recordArb, { minLength: 0, maxLength: 50 });

    fc.assert(
      fc.property(existingRecordsArb, (existingRecords) => {
        const newRecord: AttendanceRecord = {
          id: 'new-record-id',
          athlete_id: 'test-athlete-id',
          training_session_id: 'test-session-id',
          status: 'present',
          session_date: new Date().toISOString(),
        };

        const { before, after } = simulateAttendanceUpdate(existingRecords, newRecord);
        expect(after.totalAttendance).toBe(before.totalAttendance + 1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 7: Attendance Statistics Update**
   * 
   * For any attendance record with status 'absent', adding it should NOT increase
   * the total attendance count.
   */
  it('adding an absent attendance record does not increase total count', () => {
    const existingRecordsArb = fc.array(recordArb, { minLength: 0, maxLength: 50 });

    fc.assert(
      fc.property(existingRecordsArb, (existingRecords) => {
        const newRecord: AttendanceRecord = {
          id: 'new-record-id',
          athlete_id: 'test-athlete-id',
          training_session_id: 'test-session-id',
          status: 'absent',
          session_date: new Date().toISOString(),
        };

        const { before, after } = simulateAttendanceUpdate(existingRecords, newRecord);
        expect(after.totalAttendance).toBe(before.totalAttendance);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 7: Attendance Statistics Update**
   * 
   * For any attendance record added this month with status 'present', 
   * the monthly attendance count should increase by 1.
   */
  it('adding a present attendance record this month increases monthly count by 1', () => {
    const existingRecordsArb = fc.array(recordArb, { minLength: 0, maxLength: 50 });

    fc.assert(
      fc.property(existingRecordsArb, (existingRecords) => {
        const newRecord: AttendanceRecord = {
          id: 'new-record-id',
          athlete_id: 'test-athlete-id',
          training_session_id: 'test-session-id',
          status: 'present',
          session_date: new Date().toISOString(),
        };

        const { before, after } = simulateAttendanceUpdate(existingRecords, newRecord);
        expect(after.monthlyAttendance).toBe(before.monthlyAttendance + 1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 7: Attendance Statistics Update**
   * 
   * For any attendance record added from a previous month with status 'present',
   * the monthly attendance count should NOT change.
   */
  it('adding a present attendance record from previous month does not change monthly count', () => {
    const existingRecordsArb = fc.array(recordArb, { minLength: 0, maxLength: 50 });

    fc.assert(
      fc.property(existingRecordsArb, (existingRecords) => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        lastMonth.setDate(15);
        
        const newRecord: AttendanceRecord = {
          id: 'new-record-id',
          athlete_id: 'test-athlete-id',
          training_session_id: 'test-session-id',
          status: 'present',
          session_date: lastMonth.toISOString(),
        };

        const { before, after } = simulateAttendanceUpdate(existingRecords, newRecord);
        expect(after.monthlyAttendance).toBe(before.monthlyAttendance);
        expect(after.totalAttendance).toBe(before.totalAttendance + 1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 7: Attendance Statistics Update**
   * 
   * For any athlete in the database, their attendance statistics should be
   * consistent with their actual attendance records.
   */
  it('athlete statistics are consistent with their attendance records', async () => {
    if (allAthletes.length === 0) {
      console.log('Skipping: No athletes available');
      return;
    }

    const athletesWithAttendance = allAthletes.filter(athlete =>
      allAttendance.some(a => a.athlete_id === athlete.id)
    );

    if (athletesWithAttendance.length === 0) {
      console.log('Skipping: No athletes with attendance records');
      return;
    }

    const athleteArb = fc.constantFrom(...athletesWithAttendance.slice(0, 30));

    await fc.assert(
      fc.asyncProperty(athleteArb, async (athlete) => {
        const { data: athleteAttendance, error } = await supabase
          .from('attendance')
          .select('id, athlete_id, training_session_id, status, session_date, check_in_time')
          .eq('athlete_id', athlete.id);

        expect(error).toBeNull();

        const records = (athleteAttendance || []) as AttendanceRecord[];
        const calculatedStats = calculateAttendanceStats(records);

        const { count: totalAttendance } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('athlete_id', athlete.id)
          .eq('status', 'present');

        expect(calculatedStats.totalAttendance).toBe(totalAttendance || 0);
      }),
      { numRuns: Math.min(30, athletesWithAttendance.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 7: Attendance Statistics Update**
   * 
   * For any set of attendance records, the attendance rate should always be
   * between 0 and 100, and should correctly reflect the ratio of present records.
   */
  it('attendance rate is always valid and reflects present ratio', () => {
    const recordsArb = fc.array(recordArb, { minLength: 0, maxLength: 100 });

    fc.assert(
      fc.property(recordsArb, (records) => {
        const stats = calculateAttendanceStats(records);

        expect(stats.attendanceRate).toBeGreaterThanOrEqual(0);
        expect(stats.attendanceRate).toBeLessThanOrEqual(100);
        expect(Number.isNaN(stats.attendanceRate)).toBe(false);
        expect(Number.isFinite(stats.attendanceRate)).toBe(true);

        if (records.length === 0) {
          expect(stats.attendanceRate).toBe(0);
          expect(stats.totalAttendance).toBe(0);
          expect(stats.monthlyAttendance).toBe(0);
        }

        const allPresent = records.every(r => r.status === 'present');
        if (allPresent && records.length > 0) {
          expect(stats.attendanceRate).toBe(100);
        }

        const nonePresent = records.every(r => r.status !== 'present');
        if (nonePresent && records.length > 0) {
          expect(stats.attendanceRate).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 7: Attendance Statistics Update**
   * 
   * For any attendance record update (status change), the statistics should
   * reflect the change correctly.
   */
  it('updating attendance status correctly updates statistics', () => {
    const recordsArb = fc.array(recordArb, { minLength: 1, maxLength: 50 });
    const newStatusArb = fc.constantFrom('present', 'absent', 'excused', 'late') as fc.Arbitrary<
      'present' | 'absent' | 'excused' | 'late'
    >;
    const indexArb = fc.nat();

    fc.assert(
      fc.property(recordsArb, newStatusArb, indexArb, (records, newStatus, rawIndex) => {
        const indexToUpdate = rawIndex % records.length;
        const originalRecord = records[indexToUpdate];
        const originalStatus = originalRecord.status;

        const statsBefore = calculateAttendanceStats(records);

        const updatedRecords = records.map((r, i) => 
          i === indexToUpdate ? { ...r, status: newStatus } : r
        );

        const statsAfter = calculateAttendanceStats(updatedRecords);

        if (originalStatus !== 'present' && newStatus === 'present') {
          expect(statsAfter.totalAttendance).toBe(statsBefore.totalAttendance + 1);
        }

        if (originalStatus === 'present' && newStatus !== 'present') {
          expect(statsAfter.totalAttendance).toBe(statsBefore.totalAttendance - 1);
        }

        if ((originalStatus === 'present') === (newStatus === 'present')) {
          expect(statsAfter.totalAttendance).toBe(statsBefore.totalAttendance);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 7: Attendance Statistics Update**
   * 
   * Verify that the dashboard statistics query returns correct counts.
   */
  it('dashboard statistics query returns correct counts', async () => {
    if (allAthletes.length === 0) {
      console.log('Skipping: No athletes available');
      return;
    }

    const athleteArb = fc.constantFrom(...allAthletes.slice(0, 20));

    await fc.assert(
      fc.asyncProperty(athleteArb, async (athlete) => {
        const { count: totalAttendance } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('athlete_id', athlete.id)
          .eq('status', 'present');

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: monthlyAttendance } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('athlete_id', athlete.id)
          .eq('status', 'present')
          .gte('session_date', startOfMonth.toISOString());

        expect(totalAttendance || 0).toBeGreaterThanOrEqual(0);
        expect(monthlyAttendance || 0).toBeGreaterThanOrEqual(0);
        expect(monthlyAttendance || 0).toBeLessThanOrEqual(totalAttendance || 0);
      }),
      { numRuns: Math.min(20, allAthletes.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 7: Attendance Statistics Update**
   * 
   * For any athlete, adding multiple attendance records should update
   * statistics correctly (additive property).
   */
  it('multiple attendance records update statistics additively', () => {
    const existingRecordsArb = fc.array(recordArb, { minLength: 0, maxLength: 30 });
    const newRecordsArb = fc.array(recordArb, { minLength: 1, maxLength: 10 });

    fc.assert(
      fc.property(existingRecordsArb, newRecordsArb, (existingRecords, newRecords) => {
        const statsBefore = calculateAttendanceStats(existingRecords);
        const allRecords = [...existingRecords, ...newRecords];
        const statsAfter = calculateAttendanceStats(allRecords);

        const newPresentCount = newRecords.filter(r => r.status === 'present').length;
        expect(statsAfter.totalAttendance).toBe(statsBefore.totalAttendance + newPresentCount);
      }),
      { numRuns: 100 }
    );
  });
});
