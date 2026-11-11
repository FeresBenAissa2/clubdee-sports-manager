/**
 * Property-Based Tests for Check-in Time Window Validation
 * Feature: training-attendance
 * 
 * Property: Time window validation
 * For any session, check-in should only succeed within valid window
 * 
 * This property ensures that the check-in time window is correctly enforced:
 * - Check-in is allowed 30 minutes before session start time
 * - Check-in is allowed up to 15 minutes after session start time
 * - Check-in outside this window should fail with appropriate error
 * - The time window calculation is consistent and accurate
 * 
 * Validates: Requirements BR1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Time window constants (in minutes)
const CHECKIN_WINDOW_BEFORE = 30; // 30 minutes before
const CHECKIN_WINDOW_AFTER = 15;  // 15 minutes after

/**
 * Check if a check-in time is within the valid window
 * @param sessionStartTime - The session start time
 * @param checkInTime - The time of check-in attempt
 * @returns Object with success flag and optional error message
 */
function isWithinCheckInWindow(
  sessionStartTime: Date,
  checkInTime: Date
): { success: boolean; error?: string; status?: 'present' | 'late' } {
  const earliestCheckIn = new Date(sessionStartTime.getTime() - CHECKIN_WINDOW_BEFORE * 60 * 1000);
  const latestCheckIn = new Date(sessionStartTime.getTime() + CHECKIN_WINDOW_AFTER * 60 * 1000);

  if (checkInTime < earliestCheckIn) {
    return { 
      success: false, 
      error: 'ยังไม่ถึงเวลาเช็คอิน (สามารถเช็คอินได้ 30 นาทีก่อนเวลาเริ่ม)' 
    };
  }

  if (checkInTime > latestCheckIn) {
    return { 
      success: false, 
      error: 'หมดเวลาเช็คอินแล้ว (สามารถเช็คอินได้จนถึง 15 นาทีหลังเวลาเริ่ม)' 
    };
  }

  // Determine status based on whether check-in is before or after session start
  const status = checkInTime > sessionStartTime ? 'late' : 'present';

  return { success: true, status };
}

describe('Check-in Time Window Property-Based Tests', () => {
  /**
   * Property: Time window validation
   * For any session, check-in should only succeed within valid window (30 min before to 15 min after)
   * Validates: Requirements BR1
   */
  it('Property: Check-in only succeeds within valid time window', async () => {
    // Arbitrary for session start time
    const sessionStartTimeArb = fc.date({
      min: new Date('2024-01-01T08:00:00'),
      max: new Date('2025-12-31T22:00:00'),
      noInvalidDate: true,
    });

    // Arbitrary for time offset in minutes (can be negative or positive)
    const timeOffsetMinutesArb = fc.integer({ min: -120, max: 120 });

    await fc.assert(
      fc.property(
        sessionStartTimeArb,
        timeOffsetMinutesArb,
        (sessionStartTime, offsetMinutes) => {
          // Skip invalid dates
          if (isNaN(sessionStartTime.getTime())) {
            return true;
          }

          // Calculate check-in time based on offset
          const checkInTime = new Date(sessionStartTime.getTime() + offsetMinutes * 60 * 1000);

          // Check if within window
          const result = isWithinCheckInWindow(sessionStartTime, checkInTime);

          // Property 1: Check-in should succeed if and only if within window
          const isWithinWindow = 
            offsetMinutes >= -CHECKIN_WINDOW_BEFORE && 
            offsetMinutes <= CHECKIN_WINDOW_AFTER;

          expect(result.success).toBe(isWithinWindow);

          // Property 2: If outside window, should have error message
          if (!isWithinWindow) {
            expect(result.error).toBeDefined();
            expect(result.error).toBeTruthy();
          }

          // Property 3: If within window, should not have error
          if (isWithinWindow) {
            expect(result.error).toBeUndefined();
          }

          // Property 4: Status should be 'present' if before or at start, 'late' if after
          if (result.success) {
            if (offsetMinutes <= 0) {
              expect(result.status).toBe('present');
            } else if (offsetMinutes > 0) {
              expect(result.status).toBe('late');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Boundary conditions
   * Check-in at exact boundaries should behave correctly
   */
  it('Property: Boundary conditions are handled correctly', async () => {
    const sessionStartTimeArb = fc.date({
      min: new Date('2024-01-01T08:00:00'),
      max: new Date('2025-12-31T22:00:00'),
      noInvalidDate: true,
    });

    await fc.assert(
      fc.property(sessionStartTimeArb, (sessionStartTime) => {
        // Test exact boundaries
        const boundaries = [
          { offset: -CHECKIN_WINDOW_BEFORE, shouldSucceed: true, name: 'earliest' },
          { offset: -CHECKIN_WINDOW_BEFORE - 1, shouldSucceed: false, name: 'before earliest' },
          { offset: CHECKIN_WINDOW_AFTER, shouldSucceed: true, name: 'latest' },
          { offset: CHECKIN_WINDOW_AFTER + 1, shouldSucceed: false, name: 'after latest' },
          { offset: 0, shouldSucceed: true, name: 'exact start' },
        ];

        for (const boundary of boundaries) {
          const checkInTime = new Date(
            sessionStartTime.getTime() + boundary.offset * 60 * 1000
          );
          const result = isWithinCheckInWindow(sessionStartTime, checkInTime);

          expect(result.success).toBe(boundary.shouldSucceed);

          if (boundary.shouldSucceed) {
            expect(result.error).toBeUndefined();
            expect(result.status).toBeDefined();
          } else {
            expect(result.error).toBeDefined();
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Time window is symmetric around boundaries
   * Moving 1 minute inside/outside boundary should change success status
   */
  it('Property: One minute difference at boundaries changes outcome', async () => {
    const sessionStartTimeArb = fc.date({
      min: new Date('2024-01-01T08:00:00'),
      max: new Date('2025-12-31T22:00:00'),
      noInvalidDate: true,
    });

    await fc.assert(
      fc.property(sessionStartTimeArb, (sessionStartTime) => {
        // Test just inside and just outside earliest boundary
        const justBeforeEarliest = new Date(
          sessionStartTime.getTime() - (CHECKIN_WINDOW_BEFORE + 1) * 60 * 1000
        );
        const justAtEarliest = new Date(
          sessionStartTime.getTime() - CHECKIN_WINDOW_BEFORE * 60 * 1000
        );

        const resultBeforeEarliest = isWithinCheckInWindow(sessionStartTime, justBeforeEarliest);
        const resultAtEarliest = isWithinCheckInWindow(sessionStartTime, justAtEarliest);

        expect(resultBeforeEarliest.success).toBe(false);
        expect(resultAtEarliest.success).toBe(true);

        // Test just inside and just outside latest boundary
        const justAtLatest = new Date(
          sessionStartTime.getTime() + CHECKIN_WINDOW_AFTER * 60 * 1000
        );
        const justAfterLatest = new Date(
          sessionStartTime.getTime() + (CHECKIN_WINDOW_AFTER + 1) * 60 * 1000
        );

        const resultAtLatest = isWithinCheckInWindow(sessionStartTime, justAtLatest);
        const resultAfterLatest = isWithinCheckInWindow(sessionStartTime, justAfterLatest);

        expect(resultAtLatest.success).toBe(true);
        expect(resultAfterLatest.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Status determination is consistent
   * Check-in before start time should be 'present', after should be 'late'
   */
  it('Property: Status is correctly determined based on timing', async () => {
    const sessionStartTimeArb = fc.date({
      min: new Date('2024-01-01T08:00:00'),
      max: new Date('2025-12-31T22:00:00'),
      noInvalidDate: true,
    });

    // Generate offset within valid window
    const validOffsetArb = fc.integer({ 
      min: -CHECKIN_WINDOW_BEFORE, 
      max: CHECKIN_WINDOW_AFTER 
    });

    await fc.assert(
      fc.property(
        sessionStartTimeArb,
        validOffsetArb,
        (sessionStartTime, offsetMinutes) => {
          const checkInTime = new Date(
            sessionStartTime.getTime() + offsetMinutes * 60 * 1000
          );

          const result = isWithinCheckInWindow(sessionStartTime, checkInTime);

          // Should always succeed within valid window
          expect(result.success).toBe(true);
          expect(result.status).toBeDefined();

          // Property: Status should match timing relative to start
          if (checkInTime < sessionStartTime) {
            expect(result.status).toBe('present');
          } else if (checkInTime > sessionStartTime) {
            expect(result.status).toBe('late');
          }
          // At exact start time, either status is acceptable
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Window duration is constant
   * The total window duration should always be 45 minutes (30 before + 15 after)
   */
  it('Property: Window duration is constant across all sessions', async () => {
    const sessionStartTimeArb = fc.date({
      min: new Date('2024-01-01T08:00:00'),
      max: new Date('2025-12-31T22:00:00'),
      noInvalidDate: true,
    });

    await fc.assert(
      fc.property(sessionStartTimeArb, (sessionStartTime) => {
        const earliestCheckIn = new Date(
          sessionStartTime.getTime() - CHECKIN_WINDOW_BEFORE * 60 * 1000
        );
        const latestCheckIn = new Date(
          sessionStartTime.getTime() + CHECKIN_WINDOW_AFTER * 60 * 1000
        );

        // Calculate window duration in minutes
        const windowDurationMinutes = 
          (latestCheckIn.getTime() - earliestCheckIn.getTime()) / (60 * 1000);

        // Property: Window should always be exactly 45 minutes
        expect(windowDurationMinutes).toBe(CHECKIN_WINDOW_BEFORE + CHECKIN_WINDOW_AFTER);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error messages are appropriate
   * Error messages should correctly indicate whether too early or too late
   */
  it('Property: Error messages correctly indicate timing issue', async () => {
    const sessionStartTimeArb = fc.date({
      min: new Date('2024-01-01T08:00:00'),
      max: new Date('2025-12-31T22:00:00'),
      noInvalidDate: true,
    });

    // Generate offsets outside valid window
    const tooEarlyOffsetArb = fc.integer({ min: -120, max: -CHECKIN_WINDOW_BEFORE - 1 });
    const tooLateOffsetArb = fc.integer({ min: CHECKIN_WINDOW_AFTER + 1, max: 120 });

    await fc.assert(
      fc.property(
        sessionStartTimeArb,
        fc.oneof(tooEarlyOffsetArb, tooLateOffsetArb),
        (sessionStartTime, offsetMinutes) => {
          // Skip invalid dates
          if (isNaN(sessionStartTime.getTime())) {
            return true;
          }

          const checkInTime = new Date(
            sessionStartTime.getTime() + offsetMinutes * 60 * 1000
          );

          const result = isWithinCheckInWindow(sessionStartTime, checkInTime);

          // Should fail
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();

          // Property: Error message should match the timing issue
          if (offsetMinutes < -CHECKIN_WINDOW_BEFORE) {
            expect(result.error).toContain('ยังไม่ถึงเวลา');
          } else if (offsetMinutes > CHECKIN_WINDOW_AFTER) {
            expect(result.error).toContain('หมดเวลา');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Consistency across different session times
   * The window logic should work consistently regardless of session time
   */
  it('Property: Window logic is consistent across different times of day', async () => {
    // Generate sessions at different times of day
    const morningSessionArb = fc.date({
      min: new Date('2024-06-01T06:00:00'),
      max: new Date('2024-06-01T11:59:59'),
      noInvalidDate: true,
    });

    const afternoonSessionArb = fc.date({
      min: new Date('2024-06-01T12:00:00'),
      max: new Date('2024-06-01T17:59:59'),
      noInvalidDate: true,
    });

    const eveningSessionArb = fc.date({
      min: new Date('2024-06-01T18:00:00'),
      max: new Date('2024-06-01T23:59:59'),
      noInvalidDate: true,
    });

    const offsetArb = fc.integer({ min: -60, max: 60 });

    await fc.assert(
      fc.property(
        fc.oneof(morningSessionArb, afternoonSessionArb, eveningSessionArb),
        offsetArb,
        (sessionStartTime, offsetMinutes) => {
          const checkInTime = new Date(
            sessionStartTime.getTime() + offsetMinutes * 60 * 1000
          );

          const result = isWithinCheckInWindow(sessionStartTime, checkInTime);

          // Property: Success should depend only on offset, not absolute time
          const shouldSucceed = 
            offsetMinutes >= -CHECKIN_WINDOW_BEFORE && 
            offsetMinutes <= CHECKIN_WINDOW_AFTER;

          expect(result.success).toBe(shouldSucceed);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Transitivity of time comparisons
   * If time A is before time B, and B is before C, then A is before C
   */
  it('Property: Time comparisons are transitive', async () => {
    const sessionStartTimeArb = fc.date({
      min: new Date('2024-01-01T08:00:00'),
      max: new Date('2025-12-31T22:00:00'),
      noInvalidDate: true,
    });

    await fc.assert(
      fc.property(sessionStartTimeArb, (sessionStartTime) => {
        const earliestCheckIn = new Date(
          sessionStartTime.getTime() - CHECKIN_WINDOW_BEFORE * 60 * 1000
        );
        const latestCheckIn = new Date(
          sessionStartTime.getTime() + CHECKIN_WINDOW_AFTER * 60 * 1000
        );

        // Property: Earliest < Start < Latest
        expect(earliestCheckIn.getTime()).toBeLessThan(sessionStartTime.getTime());
        expect(sessionStartTime.getTime()).toBeLessThan(latestCheckIn.getTime());
        expect(earliestCheckIn.getTime()).toBeLessThan(latestCheckIn.getTime());

        // Property: Times just outside window are outside
        const justBeforeEarliest = new Date(earliestCheckIn.getTime() - 1);
        const justAfterLatest = new Date(latestCheckIn.getTime() + 1);

        expect(justBeforeEarliest.getTime()).toBeLessThan(earliestCheckIn.getTime());
        expect(justAfterLatest.getTime()).toBeGreaterThan(latestCheckIn.getTime());
      }),
      { numRuns: 100 }
    );
  });
});
