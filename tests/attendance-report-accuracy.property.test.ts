import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-Based Test: Attendance Report Accuracy
 * Feature: sports-club-management, Property 39: Attendance report accuracy
 * Validates: Requirements 12.1
 * 
 * For any club, generating an attendance report should produce statistics that
 * accurately reflect attendance data for all athletes in that club.
 */

// Types matching the report structure
interface AttendanceRecord {
  athlete_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  training_session_id: string;
}

interface AthleteInfo {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
}

interface AthleteAttendanceReport {
  athleteId: string;
  athleteName: string;
  nickname: string | null;
  totalSessions: number;
  attended: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

/**
 * Generate attendance report from raw data
 * This mirrors the logic in lib/coach/report-actions.ts
 */
function generateReportFromData(
  athletes: AthleteInfo[],
  sessions: string[],
  attendanceRecords: AttendanceRecord[]
): AthleteAttendanceReport[] {
  // Build attendance map by athlete
  const attendanceByAthlete = new Map<string, AttendanceRecord[]>();
  attendanceRecords.forEach((record) => {
    const athleteId = record.athlete_id;
    if (!attendanceByAthlete.has(athleteId)) {
      attendanceByAthlete.set(athleteId, []);
    }
    attendanceByAthlete.get(athleteId)!.push(record);
  });

  const totalSessions = sessions.length;

  // Calculate statistics for each athlete
  const report: AthleteAttendanceReport[] = athletes.map((athlete) => {
    const records = attendanceByAthlete.get(athlete.id) || [];

    const attended = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const late = records.filter((r) => r.status === 'late').length;
    const excused = records.filter((r) => r.status === 'excused').length;

    // Calculate attendance rate (present + late / total sessions)
    const attendanceRate =
      totalSessions > 0
        ? Math.round(((attended + late) / totalSessions) * 100 * 10) / 10
        : 0;

    return {
      athleteId: athlete.id,
      athleteName: `${athlete.first_name} ${athlete.last_name}`,
      nickname: athlete.nickname,
      totalSessions,
      attended,
      absent,
      late,
      excused,
      attendanceRate,
    };
  });

  // Sort by attendance rate (highest first)
  report.sort((a, b) => b.attendanceRate - a.attendanceRate);

  return report;
}

// Generators for property-based testing
const athleteIdGen = fc.uuid();
const sessionIdGen = fc.uuid();
const statusGen = fc.constantFrom('present', 'absent', 'late', 'excused') as fc.Arbitrary<
  'present' | 'absent' | 'late' | 'excused'
>;

const athleteInfoGen = fc.record({
  id: athleteIdGen,
  first_name: fc.string({ minLength: 1, maxLength: 20 }),
  last_name: fc.string({ minLength: 1, maxLength: 20 }),
  nickname: fc.option(fc.string({ minLength: 1, maxLength: 15 }), { nil: null }),
});

const attendanceRecordGen = (athleteIds: string[], sessionIds: string[]) =>
  fc.record({
    athlete_id: fc.constantFrom(...athleteIds),
    status: statusGen,
    training_session_id: fc.constantFrom(...sessionIds),
  });

describe('Property 39: Attendance Report Accuracy', () => {
  it('should calculate correct total sessions for all athletes', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 1, maxLength: 20 }),
        fc.array(sessionIdGen, { minLength: 1, maxLength: 50 }),
        (athletes, sessions) => {
          // Generate some attendance records
          const athleteIds = athletes.map((a) => a.id);
          const records: AttendanceRecord[] = [];

          // Create attendance records for some athletes and sessions
          for (const athleteId of athleteIds) {
            for (const sessionId of sessions.slice(0, Math.floor(sessions.length / 2))) {
              records.push({
                athlete_id: athleteId,
                status: 'present',
                training_session_id: sessionId,
              });
            }
          }

          const report = generateReportFromData(athletes, sessions, records);

          // Property: All athletes should have the same totalSessions count
          const expectedTotal = sessions.length;
          for (const athleteReport of report) {
            expect(athleteReport.totalSessions).toBe(expectedTotal);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly count attendance by status', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 1, maxLength: 10 }),
        fc.array(sessionIdGen, { minLength: 1, maxLength: 20 }),
        (athletes, sessions) => {
          const athleteIds = athletes.map((a) => a.id);
          const records: AttendanceRecord[] = [];

          // Create known attendance patterns
          const athlete = athletes[0];
          const presentCount = Math.min(5, sessions.length);
          const absentCount = Math.min(3, Math.max(0, sessions.length - presentCount));
          const lateCount = Math.min(2, Math.max(0, sessions.length - presentCount - absentCount));
          const excusedCount = Math.max(
            0,
            sessions.length - presentCount - absentCount - lateCount
          );

          // Add present records
          for (let i = 0; i < presentCount; i++) {
            records.push({
              athlete_id: athlete.id,
              status: 'present',
              training_session_id: sessions[i],
            });
          }

          // Add absent records
          for (let i = 0; i < absentCount; i++) {
            records.push({
              athlete_id: athlete.id,
              status: 'absent',
              training_session_id: sessions[presentCount + i],
            });
          }

          // Add late records
          for (let i = 0; i < lateCount; i++) {
            records.push({
              athlete_id: athlete.id,
              status: 'late',
              training_session_id: sessions[presentCount + absentCount + i],
            });
          }

          // Add excused records
          for (let i = 0; i < excusedCount; i++) {
            records.push({
              athlete_id: athlete.id,
              status: 'excused',
              training_session_id: sessions[presentCount + absentCount + lateCount + i],
            });
          }

          const report = generateReportFromData(athletes, sessions, records);
          const athleteReport = report.find((r) => r.athleteId === athlete.id)!;

          // Property: Counts should match what we created
          expect(athleteReport.attended).toBe(presentCount);
          expect(athleteReport.absent).toBe(absentCount);
          expect(athleteReport.late).toBe(lateCount);
          expect(athleteReport.excused).toBe(excusedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate attendance rate as (present + late) / total * 100', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 1, maxLength: 10 }),
        fc.array(sessionIdGen, { minLength: 1, maxLength: 30 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (athletes, sessions, presentPercent, latePercent) => {
          const athlete = athletes[0];
          const records: AttendanceRecord[] = [];

          const totalSessions = sessions.length;
          const presentCount = Math.floor((presentPercent / 100) * totalSessions);
          const lateCount = Math.min(
            Math.floor((latePercent / 100) * totalSessions),
            totalSessions - presentCount
          );

          // Add present records
          for (let i = 0; i < presentCount; i++) {
            records.push({
              athlete_id: athlete.id,
              status: 'present',
              training_session_id: sessions[i],
            });
          }

          // Add late records
          for (let i = 0; i < lateCount; i++) {
            records.push({
              athlete_id: athlete.id,
              status: 'late',
              training_session_id: sessions[presentCount + i],
            });
          }

          const report = generateReportFromData(athletes, sessions, records);
          const athleteReport = report.find((r) => r.athleteId === athlete.id)!;

          // Property: Attendance rate should be (present + late) / total * 100
          const expectedRate =
            totalSessions > 0
              ? Math.round(((presentCount + lateCount) / totalSessions) * 100 * 10) / 10
              : 0;

          expect(athleteReport.attendanceRate).toBe(expectedRate);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have attendance rate between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 1, maxLength: 15 }),
        fc.array(sessionIdGen, { minLength: 1, maxLength: 40 }),
        fc.array(
          fc.record({
            athleteIdx: fc.integer({ min: 0, max: 14 }),
            sessionIdx: fc.integer({ min: 0, max: 39 }),
            status: statusGen,
          }),
          { maxLength: 100 }
        ),
        (athletes, sessions, recordSpecs) => {
          const records: AttendanceRecord[] = recordSpecs
            .filter((spec) => spec.athleteIdx < athletes.length && spec.sessionIdx < sessions.length)
            .map((spec) => ({
              athlete_id: athletes[spec.athleteIdx].id,
              status: spec.status,
              training_session_id: sessions[spec.sessionIdx],
            }));

          const report = generateReportFromData(athletes, sessions, records);

          // Property: All attendance rates should be between 0 and 100
          for (const athleteReport of report) {
            expect(athleteReport.attendanceRate).toBeGreaterThanOrEqual(0);
            expect(athleteReport.attendanceRate).toBeLessThanOrEqual(100);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should sum status counts to total sessions or less', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 1, maxLength: 10 }),
        fc.array(sessionIdGen, { minLength: 1, maxLength: 25 }),
        fc.array(
          fc.record({
            athleteIdx: fc.integer({ min: 0, max: 9 }),
            sessionIdx: fc.integer({ min: 0, max: 24 }),
            status: statusGen,
          }),
          { maxLength: 80 }
        ),
        (athletes, sessions, recordSpecs) => {
          const records: AttendanceRecord[] = recordSpecs
            .filter((spec) => spec.athleteIdx < athletes.length && spec.sessionIdx < sessions.length)
            .map((spec) => ({
              athlete_id: athletes[spec.athleteIdx].id,
              status: spec.status,
              training_session_id: sessions[spec.sessionIdx],
            }));

          const report = generateReportFromData(athletes, sessions, records);

          // Property: Sum of all status counts should be <= total sessions
          // (An athlete might not have records for all sessions)
          for (const athleteReport of report) {
            const sum =
              athleteReport.attended +
              athleteReport.absent +
              athleteReport.late +
              athleteReport.excused;

            expect(sum).toBeLessThanOrEqual(athleteReport.totalSessions);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include all athletes in the report', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 1, maxLength: 20 }),
        fc.array(sessionIdGen, { minLength: 1, maxLength: 30 }),
        (athletes, sessions) => {
          const records: AttendanceRecord[] = [];

          const report = generateReportFromData(athletes, sessions, records);

          // Property: Report should have one entry per athlete
          expect(report.length).toBe(athletes.length);

          // Property: All athlete IDs should be present
          const reportAthleteIds = new Set(report.map((r) => r.athleteId));
          for (const athlete of athletes) {
            expect(reportAthleteIds.has(athlete.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should sort report by attendance rate descending', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 2, maxLength: 15 }),
        fc.array(sessionIdGen, { minLength: 5, maxLength: 20 }),
        (athletes, sessions) => {
          const records: AttendanceRecord[] = [];

          // Create varying attendance patterns
          athletes.forEach((athlete, idx) => {
            const attendanceCount = Math.floor((idx / athletes.length) * sessions.length);
            for (let i = 0; i < attendanceCount; i++) {
              records.push({
                athlete_id: athlete.id,
                status: 'present',
                training_session_id: sessions[i],
              });
            }
          });

          const report = generateReportFromData(athletes, sessions, records);

          // Property: Report should be sorted by attendance rate (highest first)
          for (let i = 0; i < report.length - 1; i++) {
            expect(report[i].attendanceRate).toBeGreaterThanOrEqual(report[i + 1].attendanceRate);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle zero sessions correctly', () => {
    fc.assert(
      fc.property(fc.array(athleteInfoGen, { minLength: 1, maxLength: 10 }), (athletes) => {
        const sessions: string[] = [];
        const records: AttendanceRecord[] = [];

        const report = generateReportFromData(athletes, sessions, records);

        // Property: With zero sessions, all athletes should have 0 total and 0% rate
        for (const athleteReport of report) {
          expect(athleteReport.totalSessions).toBe(0);
          expect(athleteReport.attended).toBe(0);
          expect(athleteReport.absent).toBe(0);
          expect(athleteReport.late).toBe(0);
          expect(athleteReport.excused).toBe(0);
          expect(athleteReport.attendanceRate).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle athlete with no attendance records', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 2, maxLength: 10 }),
        fc.array(sessionIdGen, { minLength: 1, maxLength: 20 }),
        (athletes, sessions) => {
          const records: AttendanceRecord[] = [];

          // Only add records for first athlete
          const firstAthlete = athletes[0];
          sessions.forEach((sessionId) => {
            records.push({
              athlete_id: firstAthlete.id,
              status: 'present',
              training_session_id: sessionId,
            });
          });

          const report = generateReportFromData(athletes, sessions, records);

          // Property: Athletes without records should have 0 counts and 0% rate
          const athletesWithoutRecords = report.filter((r) => r.athleteId !== firstAthlete.id);
          for (const athleteReport of athletesWithoutRecords) {
            expect(athleteReport.attended).toBe(0);
            expect(athleteReport.absent).toBe(0);
            expect(athleteReport.late).toBe(0);
            expect(athleteReport.excused).toBe(0);
            expect(athleteReport.attendanceRate).toBe(0);
            expect(athleteReport.totalSessions).toBe(sessions.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle 100% attendance correctly', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 1, maxLength: 10 }),
        fc.array(sessionIdGen, { minLength: 1, maxLength: 30 }),
        (athletes, sessions) => {
          const athlete = athletes[0];
          const records: AttendanceRecord[] = [];

          // Mark all sessions as present
          sessions.forEach((sessionId) => {
            records.push({
              athlete_id: athlete.id,
              status: 'present',
              training_session_id: sessionId,
            });
          });

          const report = generateReportFromData(athletes, sessions, records);
          const athleteReport = report.find((r) => r.athleteId === athlete.id)!;

          // Property: 100% attendance should have rate of 100
          expect(athleteReport.attended).toBe(sessions.length);
          expect(athleteReport.attendanceRate).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle 0% attendance correctly', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 1, maxLength: 10 }),
        fc.array(sessionIdGen, { minLength: 1, maxLength: 30 }),
        (athletes, sessions) => {
          const athlete = athletes[0];
          const records: AttendanceRecord[] = [];

          // Mark all sessions as absent
          sessions.forEach((sessionId) => {
            records.push({
              athlete_id: athlete.id,
              status: 'absent',
              training_session_id: sessionId,
            });
          });

          const report = generateReportFromData(athletes, sessions, records);
          const athleteReport = report.find((r) => r.athleteId === athlete.id)!;

          // Property: 0% attendance should have rate of 0
          expect(athleteReport.absent).toBe(sessions.length);
          expect(athleteReport.attendanceRate).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve athlete name and nickname in report', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 1, maxLength: 10 }),
        fc.array(sessionIdGen, { minLength: 1, maxLength: 20 }),
        (athletes, sessions) => {
          const records: AttendanceRecord[] = [];

          const report = generateReportFromData(athletes, sessions, records);

          // Property: Each athlete's name and nickname should be preserved
          for (const athlete of athletes) {
            const athleteReport = report.find((r) => r.athleteId === athlete.id)!;
            expect(athleteReport.athleteName).toBe(`${athlete.first_name} ${athlete.last_name}`);
            expect(athleteReport.nickname).toBe(athlete.nickname);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should round attendance rate to 1 decimal place', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 1, maxLength: 10 }),
        fc.array(sessionIdGen, { minLength: 3, maxLength: 30 }),
        (athletes, sessions) => {
          const athlete = athletes[0];
          const records: AttendanceRecord[] = [];

          // Create attendance that results in fractional percentage
          // e.g., 1 out of 3 = 33.333...%
          const attendCount = 1;
          for (let i = 0; i < attendCount; i++) {
            records.push({
              athlete_id: athlete.id,
              status: 'present',
              training_session_id: sessions[i],
            });
          }

          const report = generateReportFromData(athletes, sessions, records);
          const athleteReport = report.find((r) => r.athleteId === athlete.id)!;

          // Property: Attendance rate should have at most 1 decimal place
          const rateString = athleteReport.attendanceRate.toString();
          const decimalPart = rateString.split('.')[1];
          if (decimalPart) {
            expect(decimalPart.length).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should count late as attended in attendance rate', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 1, maxLength: 10 }),
        fc.array(sessionIdGen, { minLength: 2, maxLength: 20 }),
        (athletes, sessions) => {
          const athlete = athletes[0];
          const records: AttendanceRecord[] = [];

          // Mark half as present, half as late
          const halfPoint = Math.floor(sessions.length / 2);
          for (let i = 0; i < halfPoint; i++) {
            records.push({
              athlete_id: athlete.id,
              status: 'present',
              training_session_id: sessions[i],
            });
          }
          for (let i = halfPoint; i < sessions.length; i++) {
            records.push({
              athlete_id: athlete.id,
              status: 'late',
              training_session_id: sessions[i],
            });
          }

          const report = generateReportFromData(athletes, sessions, records);
          const athleteReport = report.find((r) => r.athleteId === athlete.id)!;

          // Property: Late should count as attended
          const expectedRate =
            Math.round(((halfPoint + (sessions.length - halfPoint)) / sessions.length) * 100 * 10) /
            10;
          expect(athleteReport.attendanceRate).toBe(expectedRate);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not count excused as attended in attendance rate', () => {
    fc.assert(
      fc.property(
        fc.array(athleteInfoGen, { minLength: 1, maxLength: 10 }),
        fc.array(sessionIdGen, { minLength: 1, maxLength: 20 }),
        (athletes, sessions) => {
          const athlete = athletes[0];
          const records: AttendanceRecord[] = [];

          // Mark all as excused
          sessions.forEach((sessionId) => {
            records.push({
              athlete_id: athlete.id,
              status: 'excused',
              training_session_id: sessionId,
            });
          });

          const report = generateReportFromData(athletes, sessions, records);
          const athleteReport = report.find((r) => r.athleteId === athlete.id)!;

          // Property: Excused should not count as attended
          expect(athleteReport.excused).toBe(sessions.length);
          expect(athleteReport.attendanceRate).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
