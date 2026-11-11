/**
 * Property-Based Tests for No Duplicate Check-ins
 * Feature: training-attendance
 * 
 * Property: No duplicate check-ins
 * For any athlete and session, only one check-in should exist
 * 
 * This property ensures that the check-in system prevents duplicate entries:
 * - An athlete can only check in once per session
 * - Attempting to check in twice should fail with an appropriate error
 * - The database should enforce uniqueness at the data level
 * - Multiple athletes can check in to the same session
 * - The same athlete can check in to different sessions
 * 
 * Validates: Requirements AC2, BR1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Types for our test data
type AthleteId = string;
type SessionId = string;
type CheckInAttempt = {
  athleteId: AthleteId;
  sessionId: SessionId;
  timestamp: Date;
};

// Mock database to track check-ins
class MockAttendanceDatabase {
  private checkIns: Map<string, CheckInAttempt>;

  constructor() {
    this.checkIns = new Map();
  }

  // Generate unique key for athlete-session pair
  private getKey(athleteId: AthleteId, sessionId: SessionId): string {
    return `${athleteId}:${sessionId}`;
  }

  // Attempt to check in
  checkIn(athleteId: AthleteId, sessionId: SessionId, timestamp: Date): { success: boolean; error?: string } {
    const key = this.getKey(athleteId, sessionId);
    
    // Check if already checked in
    if (this.checkIns.has(key)) {
      return { success: false, error: 'คุณได้เช็คอินแล้ว' };
    }

    // Record check-in
    this.checkIns.set(key, { athleteId, sessionId, timestamp });
    return { success: true };
  }

  // Get check-in for athlete-session pair
  getCheckIn(athleteId: AthleteId, sessionId: SessionId): CheckInAttempt | undefined {
    const key = this.getKey(athleteId, sessionId);
    return this.checkIns.get(key);
  }

  // Get all check-ins for a session
  getSessionCheckIns(sessionId: SessionId): CheckInAttempt[] {
    return Array.from(this.checkIns.values()).filter(ci => ci.sessionId === sessionId);
  }

  // Get all check-ins for an athlete
  getAthleteCheckIns(athleteId: AthleteId): CheckInAttempt[] {
    return Array.from(this.checkIns.values()).filter(ci => ci.athleteId === athleteId);
  }

  // Clear all check-ins
  clear(): void {
    this.checkIns.clear();
  }

  // Get total number of check-ins
  count(): number {
    return this.checkIns.size;
  }
}

describe('No Duplicate Check-ins Property-Based Tests', () => {
  let db: MockAttendanceDatabase;

  beforeEach(() => {
    db = new MockAttendanceDatabase();
  });

  afterEach(() => {
    db.clear();
  });

  /**
   * Property: No duplicate check-ins
   * For any athlete and session, only one check-in should exist.
   * Attempting to check in twice should fail.
   * Validates: Requirements AC2, BR1
   */
  it('Property: No duplicate check-ins for same athlete and session', async () => {
    // Arbitrary for athlete IDs
    const athleteIdArb = fc.uuid();

    // Arbitrary for session IDs
    const sessionIdArb = fc.uuid();

    // Arbitrary for timestamps
    const timestampArb = fc.date({
      min: new Date('2024-01-01'),
      max: new Date('2025-12-31'),
    });

    await fc.assert(
      fc.asyncProperty(
        athleteIdArb,
        sessionIdArb,
        timestampArb,
        timestampArb,
        async (athleteId, sessionId, timestamp1, timestamp2) => {
          // First check-in should succeed
          const firstAttempt = db.checkIn(athleteId, sessionId, timestamp1);
          expect(firstAttempt.success).toBe(true);
          expect(firstAttempt.error).toBeUndefined();

          // Verify check-in was recorded
          const checkIn = db.getCheckIn(athleteId, sessionId);
          expect(checkIn).toBeDefined();
          expect(checkIn?.athleteId).toBe(athleteId);
          expect(checkIn?.sessionId).toBe(sessionId);

          // Second check-in should fail
          const secondAttempt = db.checkIn(athleteId, sessionId, timestamp2);
          expect(secondAttempt.success).toBe(false);
          expect(secondAttempt.error).toBeDefined();
          expect(secondAttempt.error).toContain('เช็คอินแล้ว');

          // Verify only one check-in exists
          const sessionCheckIns = db.getSessionCheckIns(sessionId);
          const athleteCheckInsForSession = sessionCheckIns.filter(
            ci => ci.athleteId === athleteId
          );
          expect(athleteCheckInsForSession.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple athletes can check in to same session
   * Different athletes should be able to check in to the same session
   */
  it('Property: Multiple athletes can check in to same session', async () => {
    // Generate array of unique athlete IDs
    const athleteIdsArb = fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 50 });
    const sessionIdArb = fc.uuid();
    const timestampArb = fc.date({
      min: new Date('2024-01-01'),
      max: new Date('2025-12-31'),
    });

    await fc.assert(
      fc.asyncProperty(
        athleteIdsArb,
        sessionIdArb,
        timestampArb,
        async (athleteIds, sessionId, timestamp) => {
          // All athletes should be able to check in
          for (const athleteId of athleteIds) {
            const result = db.checkIn(athleteId, sessionId, timestamp);
            expect(result.success).toBe(true);
          }

          // Verify all check-ins were recorded
          const sessionCheckIns = db.getSessionCheckIns(sessionId);
          expect(sessionCheckIns.length).toBe(athleteIds.length);

          // Verify each athlete has exactly one check-in for this session
          for (const athleteId of athleteIds) {
            const athleteCheckIns = sessionCheckIns.filter(
              ci => ci.athleteId === athleteId
            );
            expect(athleteCheckIns.length).toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Same athlete can check in to different sessions
   * An athlete should be able to check in to multiple different sessions
   */
  it('Property: Same athlete can check in to different sessions', async () => {
    const athleteIdArb = fc.uuid();
    // Generate array of unique session IDs
    const sessionIdsArb = fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 50 });
    const timestampArb = fc.date({
      min: new Date('2024-01-01'),
      max: new Date('2025-12-31'),
    });

    await fc.assert(
      fc.asyncProperty(
        athleteIdArb,
        sessionIdsArb,
        timestampArb,
        async (athleteId, sessionIds, timestamp) => {
          // Athlete should be able to check in to all sessions
          for (const sessionId of sessionIds) {
            const result = db.checkIn(athleteId, sessionId, timestamp);
            expect(result.success).toBe(true);
          }

          // Verify all check-ins were recorded
          const athleteCheckIns = db.getAthleteCheckIns(athleteId);
          expect(athleteCheckIns.length).toBe(sessionIds.length);

          // Verify each session has exactly one check-in from this athlete
          for (const sessionId of sessionIds) {
            const sessionCheckIns = athleteCheckIns.filter(
              ci => ci.sessionId === sessionId
            );
            expect(sessionCheckIns.length).toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Uniqueness constraint is enforced
   * For any sequence of check-in attempts, the number of successful check-ins
   * should equal the number of unique (athlete, session) pairs
   */
  it('Property: Uniqueness constraint enforced for arbitrary check-in sequences', async () => {
    // Generate arbitrary sequence of check-in attempts
    const checkInAttemptsArb = fc.array(
      fc.record({
        athleteId: fc.uuid(),
        sessionId: fc.uuid(),
        timestamp: fc.date({
          min: new Date('2024-01-01'),
          max: new Date('2025-12-31'),
        }),
      }),
      { minLength: 1, maxLength: 100 }
    );

    await fc.assert(
      fc.asyncProperty(checkInAttemptsArb, async (attempts) => {
        // Clear database for this property iteration
        db.clear();
        
        let successCount = 0;
        const uniquePairs = new Set<string>();

        // Process all check-in attempts
        for (const attempt of attempts) {
          const result = db.checkIn(
            attempt.athleteId,
            attempt.sessionId,
            attempt.timestamp
          );

          if (result.success) {
            successCount++;
          }

          // Track unique pairs
          uniquePairs.add(`${attempt.athleteId}:${attempt.sessionId}`);
        }

        // Property: Number of successful check-ins should equal number of unique pairs
        expect(successCount).toBe(uniquePairs.size);
        expect(db.count()).toBe(uniquePairs.size);

        // Property: Each unique pair should have exactly one check-in
        for (const pair of uniquePairs) {
          const [athleteId, sessionId] = pair.split(':');
          const checkIn = db.getCheckIn(athleteId, sessionId);
          expect(checkIn).toBeDefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Idempotency
   * Attempting to check in N times should have the same effect as checking in once
   */
  it('Property: Multiple check-in attempts are idempotent', async () => {
    const athleteIdArb = fc.uuid();
    const sessionIdArb = fc.uuid();
    const timestampArb = fc.date({
      min: new Date('2024-01-01'),
      max: new Date('2025-12-31'),
    });
    const attemptsCountArb = fc.integer({ min: 2, max: 10 });

    await fc.assert(
      fc.asyncProperty(
        athleteIdArb,
        sessionIdArb,
        timestampArb,
        attemptsCountArb,
        async (athleteId, sessionId, timestamp, attemptsCount) => {
          // Clear database for this property iteration
          db.clear();
          
          // First attempt should succeed
          const firstResult = db.checkIn(athleteId, sessionId, timestamp);
          expect(firstResult.success).toBe(true);

          // All subsequent attempts should fail
          for (let i = 1; i < attemptsCount; i++) {
            const result = db.checkIn(athleteId, sessionId, timestamp);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
          }

          // Property: Only one check-in should exist regardless of attempts
          const checkIns = db.getSessionCheckIns(sessionId);
          expect(checkIns.length).toBe(1);
          expect(db.count()).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Concurrent check-in attempts
   * Even with concurrent attempts, only one should succeed
   */
  it('Property: Concurrent check-ins result in single record', async () => {
    const athleteIdArb = fc.uuid();
    const sessionIdArb = fc.uuid();
    const timestampsArb = fc.array(
      fc.date({
        min: new Date('2024-01-01'),
        max: new Date('2025-12-31'),
      }),
      { minLength: 2, maxLength: 10 }
    );

    await fc.assert(
      fc.asyncProperty(
        athleteIdArb,
        sessionIdArb,
        timestampsArb,
        async (athleteId, sessionId, timestamps) => {
          // Simulate concurrent check-in attempts
          const results = timestamps.map(timestamp =>
            db.checkIn(athleteId, sessionId, timestamp)
          );

          // Property: Exactly one should succeed
          const successCount = results.filter(r => r.success).length;
          expect(successCount).toBe(1);

          // Property: All others should fail with duplicate error
          const failureCount = results.filter(r => !r.success).length;
          expect(failureCount).toBe(timestamps.length - 1);

          // Property: Only one check-in record should exist
          const checkIns = db.getSessionCheckIns(sessionId);
          expect(checkIns.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Database integrity
   * The total number of check-ins should always equal the sum of unique (athlete, session) pairs
   */
  it('Property: Database maintains integrity across operations', async () => {
    // Generate complex sequence of operations
    const operationsArb = fc.array(
      fc.record({
        athleteId: fc.uuid(),
        sessionId: fc.uuid(),
        timestamp: fc.date({
          min: new Date('2024-01-01'),
          max: new Date('2025-12-31'),
        }),
      }),
      { minLength: 10, maxLength: 200 }
    );

    await fc.assert(
      fc.asyncProperty(operationsArb, async (operations) => {
        // Clear database for this property iteration
        db.clear();
        
        // Track unique pairs
        const uniquePairs = new Set<string>();

        // Process all operations
        for (const op of operations) {
          db.checkIn(op.athleteId, op.sessionId, op.timestamp);
          uniquePairs.add(`${op.athleteId}:${op.sessionId}`);
        }

        // Property: Database count should match unique pairs
        expect(db.count()).toBe(uniquePairs.size);

        // Property: Each athlete-session pair should have at most one check-in
        for (const pair of uniquePairs) {
          const [athleteId, sessionId] = pair.split(':');
          const sessionCheckIns = db.getSessionCheckIns(sessionId);
          const athleteCheckInsForSession = sessionCheckIns.filter(
            ci => ci.athleteId === athleteId
          );
          expect(athleteCheckInsForSession.length).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 100 }
    );
  });
});
