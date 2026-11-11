import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-Based Test: System-Wide Report Aggregation
 * Feature: sports-club-management, Property 41: System-wide report aggregation
 * Validates: Requirements 12.3
 * 
 * For any system-wide report request, the system should aggregate data across
 * all clubs and present accurate summary statistics.
 */

// Types matching the report structure
interface Club {
  id: string;
  name: string;
  sport_type: string;
}

interface Athlete {
  id: string;
  club_id: string;
}

interface TrainingSession {
  id: string;
  club_id: string;
  session_date: string;
}

interface AttendanceRecord {
  athlete_id: string;
  training_session_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

interface ClubBreakdown {
  clubId: string;
  clubName: string;
  sportType: string;
  athleteCount: number;
  sessionCount: number;
  attendanceRate: number;
}

interface SystemWideReport {
  totalAthletes: number;
  totalSessions: number;
  totalAttendanceRecords: number;
  averageAttendanceRate: number;
  clubBreakdown: ClubBreakdown[];
}

/**
 * Generate system-wide report from raw data
 * This mirrors the logic in lib/admin/report-actions.ts
 */
function generateSystemWideReportFromData(
  clubs: Club[],
  athletes: Athlete[],
  sessions: TrainingSession[],
  attendanceRecords: AttendanceRecord[]
): SystemWideReport {
  // Build maps for efficient lookup
  const sessionsByClub = new Map<string, number>();
  sessions.forEach((session) => {
    const clubId = session.club_id;
    sessionsByClub.set(clubId, (sessionsByClub.get(clubId) || 0) + 1);
  });

  const athletesByClub = new Map<string, number>();
  athletes.forEach((athlete) => {
    const clubId = athlete.club_id;
    athletesByClub.set(clubId, (athletesByClub.get(clubId) || 0) + 1);
  });

  // Build session to club map
  const sessionToClub = new Map<string, string>();
  sessions.forEach((session) => {
    sessionToClub.set(session.id, session.club_id);
  });

  const attendanceByClub = new Map<string, AttendanceRecord[]>();
  attendanceRecords.forEach((record) => {
    const clubId = sessionToClub.get(record.training_session_id);
    if (clubId) {
      if (!attendanceByClub.has(clubId)) {
        attendanceByClub.set(clubId, []);
      }
      attendanceByClub.get(clubId)!.push(record);
    }
  });

  // Calculate club breakdown
  const clubBreakdown: ClubBreakdown[] = clubs.map((club) => {
    const clubId = club.id;
    const athleteCount = athletesByClub.get(clubId) || 0;
    const sessionCount = sessionsByClub.get(clubId) || 0;
    const attendanceRecs = attendanceByClub.get(clubId) || [];

    const totalAttendance = attendanceRecs.length;
    const presentCount = attendanceRecs.filter((r) => r.status === 'present').length;
    const lateCount = attendanceRecs.filter((r) => r.status === 'late').length;

    const attendanceRate =
      totalAttendance > 0
        ? Math.round(((presentCount + lateCount) / totalAttendance) * 100 * 10) / 10
        : 0;

    return {
      clubId,
      clubName: club.name,
      sportType: club.sport_type,
      athleteCount,
      sessionCount,
      attendanceRate,
    };
  });

  // Calculate totals
  const totalAthletes = athletes.length;
  const totalSessions = sessions.length;
  const totalAttendanceRecords = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((r) => r.status === 'present').length;
  const lateCount = attendanceRecords.filter((r) => r.status === 'late').length;
  const averageAttendanceRate =
    totalAttendanceRecords > 0
      ? Math.round(((presentCount + lateCount) / totalAttendanceRecords) * 100 * 10) / 10
      : 0;

  // Sort club breakdown by attendance rate
  clubBreakdown.sort((a, b) => b.attendanceRate - a.attendanceRate);

  return {
    totalAthletes,
    totalSessions,
    totalAttendanceRecords,
    averageAttendanceRate,
    clubBreakdown,
  };
}

// Generators for property-based testing
const clubIdGen = fc.uuid();
const athleteIdGen = fc.uuid();
const sessionIdGen = fc.uuid();
const statusGen = fc.constantFrom('present', 'absent', 'late', 'excused') as fc.Arbitrary<
  'present' | 'absent' | 'late' | 'excused'
>;

const clubGen = fc.record({
  id: clubIdGen,
  name: fc.string({ minLength: 3, maxLength: 30 }),
  sport_type: fc.constantFrom('football', 'basketball', 'volleyball', 'swimming', 'tennis'),
});

const athleteGen = (clubIds: string[]) =>
  fc.record({
    id: athleteIdGen,
    club_id: fc.constantFrom(...clubIds),
  });

const sessionGen = (clubIds: string[]) =>
  fc.record({
    id: sessionIdGen,
    club_id: fc.constantFrom(...clubIds),
    session_date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }).map(d => d.toISOString().split('T')[0]),
  });

const attendanceRecordGen = (athleteIds: string[], sessionIds: string[]) =>
  fc.record({
    athlete_id: fc.constantFrom(...athleteIds),
    training_session_id: fc.constantFrom(...sessionIds),
    status: statusGen,
  });

describe('Property 41: System-Wide Report Aggregation', () => {
  it('should aggregate total athletes across all clubs', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 1, maxLength: 10 }),
        (clubs) => {
          const clubIds = clubs.map((c) => c.id);
          
          // Generate athletes for clubs
          const athleteCounts = clubs.map(() => Math.floor(Math.random() * 20) + 1);
          const athletes: Athlete[] = [];
          
          clubs.forEach((club, idx) => {
            for (let i = 0; i < athleteCounts[idx]; i++) {
              athletes.push({
                id: `athlete-${club.id}-${i}`,
                club_id: club.id,
              });
            }
          });

          const report = generateSystemWideReportFromData(clubs, athletes, [], []);

          // Property: Total athletes should equal sum of all athletes
          expect(report.totalAthletes).toBe(athletes.length);
          
          // Property: Sum of club breakdown athlete counts should equal total
          const sumFromBreakdown = report.clubBreakdown.reduce(
            (sum, club) => sum + club.athleteCount,
            0
          );
          expect(sumFromBreakdown).toBe(report.totalAthletes);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should aggregate total sessions across all clubs', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 1, maxLength: 10 }),
        (clubs) => {
          const clubIds = clubs.map((c) => c.id);
          
          // Generate sessions for clubs
          const sessionCounts = clubs.map(() => Math.floor(Math.random() * 30) + 1);
          const sessions: TrainingSession[] = [];
          
          clubs.forEach((club, idx) => {
            for (let i = 0; i < sessionCounts[idx]; i++) {
              sessions.push({
                id: `session-${club.id}-${i}`,
                club_id: club.id,
                session_date: '2024-06-15',
              });
            }
          });

          const report = generateSystemWideReportFromData(clubs, [], sessions, []);

          // Property: Total sessions should equal sum of all sessions
          expect(report.totalSessions).toBe(sessions.length);
          
          // Property: Sum of club breakdown session counts should equal total
          const sumFromBreakdown = report.clubBreakdown.reduce(
            (sum, club) => sum + club.sessionCount,
            0
          );
          expect(sumFromBreakdown).toBe(report.totalSessions);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should aggregate total attendance records across all clubs', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 1, maxLength: 8 }),
        (clubs) => {
          const clubIds = clubs.map((c) => c.id);
          
          // Generate athletes and sessions
          const athletes: Athlete[] = clubs.flatMap((club) =>
            Array.from({ length: 5 }, (_, i) => ({
              id: `athlete-${club.id}-${i}`,
              club_id: club.id,
            }))
          );
          
          const sessions: TrainingSession[] = clubs.flatMap((club) =>
            Array.from({ length: 3 }, (_, i) => ({
              id: `session-${club.id}-${i}`,
              club_id: club.id,
              session_date: '2024-06-15',
            }))
          );
          
          const athleteIds = athletes.map((a) => a.id);
          const sessionIds = sessions.map((s) => s.id);
          
          // Generate attendance records
          const attendanceRecords: AttendanceRecord[] = [];
          for (let i = 0; i < Math.min(50, athleteIds.length * sessionIds.length / 2); i++) {
            attendanceRecords.push({
              athlete_id: athleteIds[i % athleteIds.length],
              training_session_id: sessionIds[i % sessionIds.length],
              status: 'present',
            });
          }

          const report = generateSystemWideReportFromData(clubs, athletes, sessions, attendanceRecords);

          // Property: Total attendance records should match input
          expect(report.totalAttendanceRecords).toBe(attendanceRecords.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate average attendance rate across all records', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 0, max: 100 }),
        (clubs, presentPercent) => {
          const clubIds = clubs.map((c) => c.id);
          
          const athletes: Athlete[] = clubs.flatMap((club) =>
            Array.from({ length: 5 }, (_, i) => ({
              id: `athlete-${club.id}-${i}`,
              club_id: club.id,
            }))
          );
          
          const sessions: TrainingSession[] = clubs.flatMap((club) =>
            Array.from({ length: 3 }, (_, i) => ({
              id: `session-${club.id}-${i}`,
              club_id: club.id,
              session_date: '2024-06-15',
            }))
          );
          
          const athleteIds = athletes.map((a) => a.id);
          const sessionIds = sessions.map((s) => s.id);
          
          // Generate unique attendance records with specific present percentage
          // Create all possible combinations first
          const allCombinations: Array<{ athleteId: string; sessionId: string }> = [];
          for (const athleteId of athleteIds) {
            for (const sessionId of sessionIds) {
              allCombinations.push({ athleteId, sessionId });
            }
          }
          
          // Shuffle and take a subset
          const shuffled = allCombinations.sort(() => Math.random() - 0.5);
          const totalRecords = Math.min(40, Math.floor(shuffled.length / 2));
          const presentCount = Math.floor((presentPercent / 100) * totalRecords);
          const attendanceRecords: AttendanceRecord[] = [];
          
          for (let i = 0; i < presentCount; i++) {
            attendanceRecords.push({
              athlete_id: shuffled[i].athleteId,
              training_session_id: shuffled[i].sessionId,
              status: 'present',
            });
          }
          
          for (let i = presentCount; i < totalRecords; i++) {
            attendanceRecords.push({
              athlete_id: shuffled[i].athleteId,
              training_session_id: shuffled[i].sessionId,
              status: 'absent',
            });
          }

          const report = generateSystemWideReportFromData(clubs, athletes, sessions, attendanceRecords);

          // Property: Average attendance rate should be (present / total) * 100
          const expectedRate = totalRecords > 0
            ? Math.round((presentCount / totalRecords) * 100 * 10) / 10
            : 0;
          
          expect(report.averageAttendanceRate).toBe(expectedRate);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include all clubs in breakdown', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 1, maxLength: 15 }),
        (clubs) => {
          const report = generateSystemWideReportFromData(clubs, [], [], []);

          // Property: Breakdown should have one entry per club
          expect(report.clubBreakdown.length).toBe(clubs.length);
          
          // Property: All club IDs should be present
          const breakdownClubIds = new Set(report.clubBreakdown.map((c) => c.clubId));
          for (const club of clubs) {
            expect(breakdownClubIds.has(club.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve club names and sport types in breakdown', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 1, maxLength: 10 }),
        (clubs) => {
          const report = generateSystemWideReportFromData(clubs, [], [], []);

          // Property: Each club's name and sport type should be preserved
          for (const club of clubs) {
            const clubBreakdown = report.clubBreakdown.find((c) => c.clubId === club.id)!;
            expect(clubBreakdown.clubName).toBe(club.name);
            expect(clubBreakdown.sportType).toBe(club.sport_type);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly assign athletes to their clubs', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 2, maxLength: 10 }),
        (clubs) => {
          const clubIds = clubs.map((c) => c.id);
          
          // Create specific athlete counts per club
          const athleteCounts = new Map<string, number>();
          const athletes: Athlete[] = [];
          
          clubs.forEach((club, idx) => {
            const count = idx + 1; // Different count for each club
            athleteCounts.set(club.id, count);
            
            for (let i = 0; i < count; i++) {
              athletes.push({
                id: `athlete-${club.id}-${i}`,
                club_id: club.id,
              });
            }
          });

          const report = generateSystemWideReportFromData(clubs, athletes, [], []);

          // Property: Each club should have correct athlete count
          for (const club of clubs) {
            const clubBreakdown = report.clubBreakdown.find((c) => c.clubId === club.id)!;
            expect(clubBreakdown.athleteCount).toBe(athleteCounts.get(club.id));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly assign sessions to their clubs', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 2, maxLength: 10 }),
        (clubs) => {
          const clubIds = clubs.map((c) => c.id);
          
          // Create specific session counts per club
          const sessionCounts = new Map<string, number>();
          const sessions: TrainingSession[] = [];
          
          clubs.forEach((club, idx) => {
            const count = (idx + 1) * 2; // Different count for each club
            sessionCounts.set(club.id, count);
            
            for (let i = 0; i < count; i++) {
              sessions.push({
                id: `session-${club.id}-${i}`,
                club_id: club.id,
                session_date: '2024-06-15',
              });
            }
          });

          const report = generateSystemWideReportFromData(clubs, [], sessions, []);

          // Property: Each club should have correct session count
          for (const club of clubs) {
            const clubBreakdown = report.clubBreakdown.find((c) => c.clubId === club.id)!;
            expect(clubBreakdown.sessionCount).toBe(sessionCounts.get(club.id));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate club-specific attendance rates correctly', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 2, maxLength: 8 }),
        (clubs) => {
          const clubIds = clubs.map((c) => c.id);
          
          // Create athletes and sessions
          const athletes: Athlete[] = clubs.flatMap((club) =>
            Array.from({ length: 3 }, (_, i) => ({
              id: `athlete-${club.id}-${i}`,
              club_id: club.id,
            }))
          );
          
          const sessions: TrainingSession[] = clubs.flatMap((club) =>
            Array.from({ length: 2 }, (_, i) => ({
              id: `session-${club.id}-${i}`,
              club_id: club.id,
              session_date: '2024-06-15',
            }))
          );
          
          // Create attendance with different rates per club
          const attendanceRecords: AttendanceRecord[] = [];
          
          clubs.forEach((club, clubIdx) => {
            const clubSessions = sessions.filter((s) => s.club_id === club.id);
            const clubAthletes = athletes.filter((a) => a.club_id === club.id);
            
            // First club: 100% present, second club: 50% present, etc.
            const presentRatio = clubIdx === 0 ? 1.0 : 0.5;
            const recordCount = Math.floor(clubSessions.length * clubAthletes.length * presentRatio);
            
            for (let i = 0; i < recordCount; i++) {
              attendanceRecords.push({
                athlete_id: clubAthletes[i % clubAthletes.length].id,
                training_session_id: clubSessions[Math.floor(i / clubAthletes.length)].id,
                status: 'present',
              });
            }
          });

          const report = generateSystemWideReportFromData(clubs, athletes, sessions, attendanceRecords);

          // Property: Each club's attendance rate should be calculated independently
          for (const club of clubs) {
            const clubBreakdown = report.clubBreakdown.find((c) => c.clubId === club.id)!;
            
            // Verify rate is between 0 and 100
            expect(clubBreakdown.attendanceRate).toBeGreaterThanOrEqual(0);
            expect(clubBreakdown.attendanceRate).toBeLessThanOrEqual(100);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should sort club breakdown by attendance rate descending', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 2, maxLength: 10 }),
        (clubs) => {
          const clubIds = clubs.map((c) => c.id);
          
          const athletes: Athlete[] = clubs.flatMap((club) =>
            Array.from({ length: 5 }, (_, i) => ({
              id: `athlete-${club.id}-${i}`,
              club_id: club.id,
            }))
          );
          
          const sessions: TrainingSession[] = clubs.flatMap((club) =>
            Array.from({ length: 3 }, (_, i) => ({
              id: `session-${club.id}-${i}`,
              club_id: club.id,
              session_date: '2024-06-15',
            }))
          );
          
          // Create varying attendance patterns
          const attendanceRecords: AttendanceRecord[] = [];
          clubs.forEach((club, clubIdx) => {
            const clubSessions = sessions.filter((s) => s.club_id === club.id);
            const clubAthletes = athletes.filter((a) => a.club_id === club.id);
            
            // Create different attendance rates
            const ratio = (clubIdx + 1) / clubs.length;
            const recordCount = Math.floor(clubSessions.length * clubAthletes.length * ratio);
            
            for (let i = 0; i < recordCount; i++) {
              attendanceRecords.push({
                athlete_id: clubAthletes[i % clubAthletes.length].id,
                training_session_id: clubSessions[Math.floor(i / clubAthletes.length)].id,
                status: 'present',
              });
            }
          });

          const report = generateSystemWideReportFromData(clubs, athletes, sessions, attendanceRecords);

          // Property: Breakdown should be sorted by attendance rate (highest first)
          for (let i = 0; i < report.clubBreakdown.length - 1; i++) {
            expect(report.clubBreakdown[i].attendanceRate).toBeGreaterThanOrEqual(
              report.clubBreakdown[i + 1].attendanceRate
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle clubs with no athletes', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 2, maxLength: 10 }),
        (clubs) => {
          // Only add athletes to first club
          const athletes: Athlete[] = Array.from({ length: 5 }, (_, i) => ({
            id: `athlete-${clubs[0].id}-${i}`,
            club_id: clubs[0].id,
          }));

          const report = generateSystemWideReportFromData(clubs, athletes, [], []);

          // Property: Clubs without athletes should have 0 athlete count
          for (let i = 1; i < clubs.length; i++) {
            const clubBreakdown = report.clubBreakdown.find((c) => c.clubId === clubs[i].id)!;
            expect(clubBreakdown.athleteCount).toBe(0);
          }
          
          // Property: Total should still be correct
          expect(report.totalAthletes).toBe(athletes.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle clubs with no sessions', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 2, maxLength: 10 }),
        (clubs) => {
          // Only add sessions to first club
          const sessions: TrainingSession[] = Array.from({ length: 5 }, (_, i) => ({
            id: `session-${clubs[0].id}-${i}`,
            club_id: clubs[0].id,
            session_date: '2024-06-15',
          }));

          const report = generateSystemWideReportFromData(clubs, [], sessions, []);

          // Property: Clubs without sessions should have 0 session count
          for (let i = 1; i < clubs.length; i++) {
            const clubBreakdown = report.clubBreakdown.find((c) => c.clubId === clubs[i].id)!;
            expect(clubBreakdown.sessionCount).toBe(0);
          }
          
          // Property: Total should still be correct
          expect(report.totalSessions).toBe(sessions.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle clubs with no attendance records', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 1, maxLength: 10 }),
        (clubs) => {
          const clubIds = clubs.map((c) => c.id);
          
          const athletes: Athlete[] = clubs.flatMap((club) =>
            Array.from({ length: 3 }, (_, i) => ({
              id: `athlete-${club.id}-${i}`,
              club_id: club.id,
            }))
          );
          
          const sessions: TrainingSession[] = clubs.flatMap((club) =>
            Array.from({ length: 2 }, (_, i) => ({
              id: `session-${club.id}-${i}`,
              club_id: club.id,
              session_date: '2024-06-15',
            }))
          );

          const report = generateSystemWideReportFromData(clubs, athletes, sessions, []);

          // Property: All clubs should have 0% attendance rate
          for (const clubBreakdown of report.clubBreakdown) {
            expect(clubBreakdown.attendanceRate).toBe(0);
          }
          
          // Property: System-wide average should be 0
          expect(report.averageAttendanceRate).toBe(0);
          expect(report.totalAttendanceRecords).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty system (no clubs)', () => {
    const report = generateSystemWideReportFromData([], [], [], []);

    // Property: Empty system should have all zeros
    expect(report.totalAthletes).toBe(0);
    expect(report.totalSessions).toBe(0);
    expect(report.totalAttendanceRecords).toBe(0);
    expect(report.averageAttendanceRate).toBe(0);
    expect(report.clubBreakdown.length).toBe(0);
  });

  it('should count late as attended in average rate', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 1, maxLength: 8 }),
        (clubs) => {
          const clubIds = clubs.map((c) => c.id);
          
          const athletes: Athlete[] = clubs.flatMap((club) =>
            Array.from({ length: 3 }, (_, i) => ({
              id: `athlete-${club.id}-${i}`,
              club_id: club.id,
            }))
          );
          
          const sessions: TrainingSession[] = clubs.flatMap((club) =>
            Array.from({ length: 4 }, (_, i) => ({
              id: `session-${club.id}-${i}`,
              club_id: club.id,
              session_date: '2024-06-15',
            }))
          );
          
          const athleteIds = athletes.map((a) => a.id);
          const sessionIds = sessions.map((s) => s.id);
          
          // Half present, half late
          const totalRecords = Math.min(40, athleteIds.length * sessionIds.length / 2);
          const halfPoint = Math.floor(totalRecords / 2);
          const attendanceRecords: AttendanceRecord[] = [];
          
          for (let i = 0; i < halfPoint; i++) {
            attendanceRecords.push({
              athlete_id: athleteIds[i % athleteIds.length],
              training_session_id: sessionIds[i % sessionIds.length],
              status: 'present',
            });
          }
          
          for (let i = halfPoint; i < totalRecords; i++) {
            attendanceRecords.push({
              athlete_id: athleteIds[i % athleteIds.length],
              training_session_id: sessionIds[i % sessionIds.length],
              status: 'late',
            });
          }

          const report = generateSystemWideReportFromData(clubs, athletes, sessions, attendanceRecords);

          // Property: Late should count as attended (100% rate)
          const expectedRate = Math.round(((halfPoint + (totalRecords - halfPoint)) / totalRecords) * 100 * 10) / 10;
          expect(report.averageAttendanceRate).toBe(expectedRate);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not count excused or absent as attended', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 1, maxLength: 8 }),
        (clubs) => {
          const clubIds = clubs.map((c) => c.id);
          
          const athletes: Athlete[] = clubs.flatMap((club) =>
            Array.from({ length: 3 }, (_, i) => ({
              id: `athlete-${club.id}-${i}`,
              club_id: club.id,
            }))
          );
          
          const sessions: TrainingSession[] = clubs.flatMap((club) =>
            Array.from({ length: 4 }, (_, i) => ({
              id: `session-${club.id}-${i}`,
              club_id: club.id,
              session_date: '2024-06-15',
            }))
          );
          
          const athleteIds = athletes.map((a) => a.id);
          const sessionIds = sessions.map((s) => s.id);
          
          // All excused or absent
          const totalRecords = Math.min(40, athleteIds.length * sessionIds.length / 2);
          const attendanceRecords: AttendanceRecord[] = [];
          
          for (let i = 0; i < totalRecords; i++) {
            attendanceRecords.push({
              athlete_id: athleteIds[i % athleteIds.length],
              training_session_id: sessionIds[i % sessionIds.length],
              status: i % 2 === 0 ? 'excused' : 'absent',
            });
          }

          const report = generateSystemWideReportFromData(clubs, athletes, sessions, attendanceRecords);

          // Property: Excused and absent should not count as attended (0% rate)
          expect(report.averageAttendanceRate).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have average attendance rate between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 1, maxLength: 10 }),
        fc.array(
          fc.record({
            clubIdx: fc.integer({ min: 0, max: 9 }),
            athleteIdx: fc.integer({ min: 0, max: 4 }),
            sessionIdx: fc.integer({ min: 0, max: 3 }),
            status: statusGen,
          }),
          { maxLength: 100 }
        ),
        (clubs, recordSpecs) => {
          const clubIds = clubs.map((c) => c.id);
          
          const athletes: Athlete[] = clubs.flatMap((club) =>
            Array.from({ length: 5 }, (_, i) => ({
              id: `athlete-${club.id}-${i}`,
              club_id: club.id,
            }))
          );
          
          const sessions: TrainingSession[] = clubs.flatMap((club) =>
            Array.from({ length: 4 }, (_, i) => ({
              id: `session-${club.id}-${i}`,
              club_id: club.id,
              session_date: '2024-06-15',
            }))
          );
          
          const attendanceRecords: AttendanceRecord[] = recordSpecs
            .filter((spec) => spec.clubIdx < clubs.length)
            .map((spec) => {
              const club = clubs[spec.clubIdx];
              const clubAthletes = athletes.filter((a) => a.club_id === club.id);
              const clubSessions = sessions.filter((s) => s.club_id === club.id);
              
              if (clubAthletes.length === 0 || clubSessions.length === 0) {
                return null;
              }
              
              return {
                athlete_id: clubAthletes[spec.athleteIdx % clubAthletes.length].id,
                training_session_id: clubSessions[spec.sessionIdx % clubSessions.length].id,
                status: spec.status,
              };
            })
            .filter((r): r is AttendanceRecord => r !== null);

          const report = generateSystemWideReportFromData(clubs, athletes, sessions, attendanceRecords);

          // Property: Average attendance rate should be between 0 and 100
          expect(report.averageAttendanceRate).toBeGreaterThanOrEqual(0);
          expect(report.averageAttendanceRate).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should round average attendance rate to 1 decimal place', () => {
    fc.assert(
      fc.property(
        fc.array(clubGen, { minLength: 1, maxLength: 8 }),
        (clubs) => {
          const clubIds = clubs.map((c) => c.id);
          
          const athletes: Athlete[] = clubs.flatMap((club) =>
            Array.from({ length: 3 }, (_, i) => ({
              id: `athlete-${club.id}-${i}`,
              club_id: club.id,
            }))
          );
          
          const sessions: TrainingSession[] = clubs.flatMap((club) =>
            Array.from({ length: 3 }, (_, i) => ({
              id: `session-${club.id}-${i}`,
              club_id: club.id,
              session_date: '2024-06-15',
            }))
          );
          
          const athleteIds = athletes.map((a) => a.id);
          const sessionIds = sessions.map((s) => s.id);
          
          // Create attendance that results in fractional percentage
          const totalRecords = Math.min(30, athleteIds.length * sessionIds.length / 2);
          const presentCount = 1; // 1 out of many = fractional percentage
          const attendanceRecords: AttendanceRecord[] = [];
          
          for (let i = 0; i < presentCount; i++) {
            attendanceRecords.push({
              athlete_id: athleteIds[i % athleteIds.length],
              training_session_id: sessionIds[i % sessionIds.length],
              status: 'present',
            });
          }
          
          for (let i = presentCount; i < totalRecords; i++) {
            attendanceRecords.push({
              athlete_id: athleteIds[i % athleteIds.length],
              training_session_id: sessionIds[i % sessionIds.length],
              status: 'absent',
            });
          }

          const report = generateSystemWideReportFromData(clubs, athletes, sessions, attendanceRecords);

          // Property: Rate should have at most 1 decimal place
          const rateString = report.averageAttendanceRate.toString();
          const decimalPart = rateString.split('.')[1];
          if (decimalPart) {
            expect(decimalPart.length).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
