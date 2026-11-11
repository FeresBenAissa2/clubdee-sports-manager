/**
 * Property-Based Tests for Attendance Rate Bounds
 * Feature: training-attendance
 * 
 * Property: Attendance rate bounds
 * For any set of attendance records, rate should be 0-100%
 * 
 * This property ensures that the attendance rate calculation is always valid:
 * - The rate is always between 0 and 100 (inclusive)
 * - The rate is never NaN or infinite
 * - The rate has at most 1 decimal place
 * - The calculation correctly handles edge cases (zero sessions, all present, all absent)
 * 
 * Validates: Requirements AC4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  calculateAttendanceRate, 
  aggregateAttendanceStats,
  type AttendanceRecord 
} from './attendance-calculations.test';

describe('Attendance Rate Bounds Property-Based Tests', () => {
  /**
   * Property: Attendance rate bounds
   * For any set of attendance records, the calculated attendance rate should always 
   * be between 0 and 100 (inclusive), never NaN, and always finite.
   * Validates: Requirements AC4
   */
  it('Property: Attendance rate is always between 0 and 100', async () => {
    // Arbitrary for attendance status
    const statusArb = fc.constantFrom('present', 'absent', 'excused', 'late') as fc.Arbitrary<
      'present' | 'absent' | 'excused' | 'late'
    >;

    // Arbitrary for a single attendance record
    const attendanceRecordArb: fc.Arbitrary<AttendanceRecord> = fc.record({
      status: statusArb,
    });

    // Arbitrary for an array of attendance records (0 to 1000 records)
    const attendanceRecordsArb = fc.array(attendanceRecordArb, { minLength: 0, maxLength: 1000 });

    await fc.assert(
      fc.property(attendanceRecordsArb, (records) => {
        // Calculate stats using the aggregation function
        const stats = aggregateAttendanceStats(records);

        // Property 1: Attendance rate should be between 0 and 100 (inclusive)
        expect(stats.attendanceRate).toBeGreaterThanOrEqual(0);
        expect(stats.attendanceRate).toBeLessThanOrEqual(100);

        // Property 2: Attendance rate should never be NaN
        expect(Number.isNaN(stats.attendanceRate)).toBe(false);

        // Property 3: Attendance rate should always be finite
        expect(Number.isFinite(stats.attendanceRate)).toBe(true);

        // Property 4: Attendance rate should have at most 1 decimal place
        const decimalPlaces = (stats.attendanceRate.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(1);

        // Property 5: Total sessions should equal sum of all status counts
        const totalCount = 
          stats.presentCount + 
          stats.absentCount + 
          stats.excusedCount + 
          stats.lateCount;
        expect(totalCount).toBe(stats.totalSessions);

        // Property 6: If all records are present or late, rate should be 100
        const allAttended = records.every(r => r.status === 'present' || r.status === 'late');
        if (allAttended && records.length > 0) {
          expect(stats.attendanceRate).toBe(100);
        }

        // Property 7: If all records are absent or excused, rate should be 0
        const noneAttended = records.every(r => r.status === 'absent' || r.status === 'excused');
        if (noneAttended && records.length > 0) {
          expect(stats.attendanceRate).toBe(0);
        }

        // Property 8: If no records, rate should be 0
        if (records.length === 0) {
          expect(stats.attendanceRate).toBe(0);
          expect(stats.totalSessions).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Direct calculation bounds
   * For any combination of present count, late count, and total sessions,
   * the attendance rate should always be between 0 and 100.
   */
  it('Property: Direct calculation always returns valid rate', async () => {
    // Generate arbitrary counts where present + late <= total
    const countsArb = fc
      .tuple(
        fc.integer({ min: 0, max: 10000 }), // total sessions
        fc.integer({ min: 0, max: 1 }) // ratio for present (0 to 1)
      )
      .chain(([total, ratio]) => {
        const maxAttended = total;
        return fc.tuple(
          fc.constant(total),
          fc.integer({ min: 0, max: maxAttended }), // present count
          fc.integer({ min: 0, max: maxAttended }) // late count
        );
      })
      .filter(([total, present, late]) => present + late <= total);

    await fc.assert(
      fc.property(countsArb, ([total, present, late]) => {
        const rate = calculateAttendanceRate(present, late, total);

        // Property 1: Rate should be between 0 and 100
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);

        // Property 2: Rate should never be NaN
        expect(Number.isNaN(rate)).toBe(false);

        // Property 3: Rate should always be finite
        expect(Number.isFinite(rate)).toBe(true);

        // Property 4: Rate should have at most 1 decimal place
        const decimalPlaces = (rate.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(1);

        // Property 5: If total is 0, rate should be 0
        if (total === 0) {
          expect(rate).toBe(0);
        }

        // Property 6: If present + late equals total, rate should be 100
        if (total > 0 && present + late === total) {
          expect(rate).toBe(100);
        }

        // Property 7: If present + late is 0, rate should be 0
        if (total > 0 && present + late === 0) {
          expect(rate).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Edge cases with extreme values
   * Test with very large numbers to ensure no overflow or precision issues
   */
  it('Property: Handles extreme values correctly', async () => {
    const extremeCountsArb = fc
      .tuple(
        fc.integer({ min: 1, max: 1000000 }), // very large total
        fc.double({ min: 0, max: 1, noNaN: true }) // ratio
      )
      .map(([total, ratio]) => {
        const attended = Math.floor(total * ratio);
        const present = Math.floor(attended * 0.7); // 70% present
        const late = attended - present; // rest are late
        return { total, present, late };
      });

    await fc.assert(
      fc.property(extremeCountsArb, ({ total, present, late }) => {
        const rate = calculateAttendanceRate(present, late, total);

        // Property 1: Rate should still be between 0 and 100
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);

        // Property 2: Rate should never be NaN
        expect(Number.isNaN(rate)).toBe(false);

        // Property 3: Rate should always be finite
        expect(Number.isFinite(rate)).toBe(true);

        // Property 4: Rate should be reasonably accurate
        const expectedRate = ((present + late) / total) * 100;
        const tolerance = 0.1; // Allow 0.1% difference due to rounding
        expect(Math.abs(rate - expectedRate)).toBeLessThanOrEqual(tolerance);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Monotonicity
   * Adding more attended sessions should never decrease the attendance rate
   */
  it('Property: Adding attended sessions increases or maintains rate', async () => {
    const baseRecordsArb = fc.array(
      fc.record({
        status: fc.constantFrom('present', 'absent', 'excused', 'late') as fc.Arbitrary<
          'present' | 'absent' | 'excused' | 'late'
        >,
      }),
      { minLength: 1, maxLength: 100 }
    );

    const additionalAttendedArb = fc.constantFrom('present', 'late') as fc.Arbitrary<
      'present' | 'late'
    >;

    await fc.assert(
      fc.property(baseRecordsArb, additionalAttendedArb, (baseRecords, additionalStatus) => {
        // Calculate initial rate
        const initialStats = aggregateAttendanceStats(baseRecords);
        const initialRate = initialStats.attendanceRate;

        // Add an attended session
        const newRecords = [...baseRecords, { status: additionalStatus }];
        const newStats = aggregateAttendanceStats(newRecords);
        const newRate = newStats.attendanceRate;

        // Property: New rate should be >= initial rate (or very close due to rounding)
        // Allow small tolerance for rounding differences
        expect(newRate).toBeGreaterThanOrEqual(initialRate - 0.2);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Symmetry
   * The attendance rate should be the same regardless of the order of records
   */
  it('Property: Order of records does not affect rate', async () => {
    const recordsArb = fc.array(
      fc.record({
        status: fc.constantFrom('present', 'absent', 'excused', 'late') as fc.Arbitrary<
          'present' | 'absent' | 'excused' | 'late'
        >,
      }),
      { minLength: 1, maxLength: 100 }
    );

    await fc.assert(
      fc.property(recordsArb, (records) => {
        // Calculate rate with original order
        const stats1 = aggregateAttendanceStats(records);

        // Calculate rate with shuffled order
        const shuffled = [...records].sort(() => Math.random() - 0.5);
        const stats2 = aggregateAttendanceStats(shuffled);

        // Property: Rates should be identical
        expect(stats1.attendanceRate).toBe(stats2.attendanceRate);
        expect(stats1.totalSessions).toBe(stats2.totalSessions);
        expect(stats1.presentCount).toBe(stats2.presentCount);
        expect(stats1.absentCount).toBe(stats2.absentCount);
        expect(stats1.excusedCount).toBe(stats2.excusedCount);
        expect(stats1.lateCount).toBe(stats2.lateCount);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Inverse relationship
   * If we know the attended count and total, the rate should correctly represent the ratio
   */
  it('Property: Rate correctly represents attended/total ratio', async () => {
    const countsArb = fc
      .tuple(
        fc.integer({ min: 1, max: 1000 }), // total (at least 1)
        fc.integer({ min: 0, max: 1000 }) // attended count
      )
      .filter(([total, attended]) => attended <= total)
      .map(([total, attended]) => {
        const present = Math.floor(attended * 0.6); // 60% present
        const late = attended - present; // rest late
        const expectedRate = (attended / total) * 100;
        return { total, present, late, expectedRate };
      });

    await fc.assert(
      fc.property(countsArb, ({ total, present, late, expectedRate }) => {
        const rate = calculateAttendanceRate(present, late, total);

        // Property: Calculated rate should match the expected rate
        // Allow small tolerance for rounding (0.1% due to 1 decimal place precision)
        const tolerance = 0.1;
        expect(Math.abs(rate - expectedRate)).toBeLessThanOrEqual(tolerance);
      }),
      { numRuns: 100 }
    );
  });
});
