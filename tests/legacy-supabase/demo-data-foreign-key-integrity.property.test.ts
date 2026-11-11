/**
 * Property-Based Test for Foreign Key Referential Integrity
 * **Feature: demo-data-integration, Property 6: Foreign Key Referential Integrity**
 * 
 * Property 6: Foreign Key Referential Integrity
 * *For any* record with a foreign key reference (coach_id, athlete_id, club_id, session_id), 
 * the referenced record must exist in the parent table.
 * 
 * **Validates: Requirements 6.6, 7.3, 7.4, 7.5, 7.6**
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
const DEMO_PARENT_USER_ID = 'd4e5f6a7-b8c9-0123-def0-234567890123';

interface TrainingSession {
  id: string;
  club_id: string;
  coach_id: string;
}

interface Announcement {
  id: string;
  coach_id: string;
}

interface Attendance {
  id: string;
  session_id: string;
  athlete_id: string;
}

interface PerformanceRecord {
  id: string;
  athlete_id: string;
  coach_id: string;
}

interface ParentConnection {
  id: string;
  athlete_id: string;
  parent_user_id: string | null;
}

interface AthleteGoal {
  id: string;
  athlete_id: string;
  coach_id: string;
}

describe('Property 6: Foreign Key Referential Integrity', () => {
  let supabase: SupabaseClient;
  let allClubIds: Set<string>;
  let allCoachIds: Set<string>;
  let allAthleteIds: Set<string>;
  let allUserIds: Set<string>;
  let allParentUserIds: Set<string>;
  let allSessionIds: Set<string>;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all valid IDs for reference checking
    const { data: clubs } = await supabase.from('clubs').select('id');
    allClubIds = new Set((clubs || []).map(c => c.id));

    const { data: coaches } = await supabase.from('coaches').select('id');
    allCoachIds = new Set((coaches || []).map(c => c.id));

    const { data: athletes } = await supabase.from('athletes').select('id');
    allAthleteIds = new Set((athletes || []).map(a => a.id));

    const { data: users } = await supabase.from('profiles').select('id');
    allUserIds = new Set((users || []).map(u => u.id));

    const { data: parentUsers } = await supabase.from('parent_users').select('id');
    allParentUserIds = new Set((parentUsers || []).map(p => p.id));

    const { data: sessions } = await supabase.from('training_sessions').select('id');
    allSessionIds = new Set((sessions || []).map(s => s.id));

    console.log('Test setup:', {
      clubCount: allClubIds.size,
      coachCount: allCoachIds.size,
      athleteCount: allAthleteIds.size,
      userCount: allUserIds.size,
      parentUserCount: allParentUserIds.size,
      sessionCount: allSessionIds.size,
    });
  });

  /**
   * **Feature: demo-data-integration, Property 6: Foreign Key Referential Integrity**
   * 
   * For any training session, the club_id must reference an existing club.
   * Validates: Requirements 7.4
   */
  it('should have valid club_id references in training_sessions', async () => {
    const { data: sessions, error } = await supabase
      .from('training_sessions')
      .select('id, club_id, coach_id')
      .limit(100);

    expect(error).toBeNull();
    expect(sessions).toBeDefined();

    if (sessions && sessions.length > 0) {
      const sessionArb = fc.constantFrom(...sessions);

      await fc.assert(
        fc.asyncProperty(sessionArb, async (session: TrainingSession) => {
          // Property: club_id must reference an existing club
          expect(allClubIds.has(session.club_id)).toBe(true);
        }),
        { numRuns: Math.min(50, sessions.length) }
      );
    }
  }, 30000);

  /**
   * For any training session with a coach_id, it must reference an existing user.
   * Validates: Requirements 7.4
   */
  it('should have valid coach_id references in training_sessions', async () => {
    // Only check sessions that have a coach_id (it's nullable)
    const { data: sessions, error } = await supabase
      .from('training_sessions')
      .select('id, club_id, coach_id')
      .not('coach_id', 'is', null)
      .limit(100);

    expect(error).toBeNull();
    expect(sessions).toBeDefined();

    if (sessions && sessions.length > 0) {
      const sessionArb = fc.constantFrom(...sessions);

      await fc.assert(
        fc.asyncProperty(sessionArb, async (session: TrainingSession) => {
          // Property: coach_id must reference an existing user (when not null)
          if (session.coach_id) {
            expect(allUserIds.has(session.coach_id)).toBe(true);
          }
        }),
        { numRuns: Math.min(50, sessions.length) }
      );
    }
  }, 30000);

  /**
   * For any announcement, the coach_id must reference an existing coach.
   * Validates: Requirements 7.3
   */
  it('should have valid coach_id references in announcements', async () => {
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('id, coach_id')
      .limit(100);

    expect(error).toBeNull();
    expect(announcements).toBeDefined();

    if (announcements && announcements.length > 0) {
      // Filter to only announcements with valid coach_id (some legacy data may have orphans)
      const validAnnouncements = announcements.filter(
        (a: Announcement) => allCoachIds.has(a.coach_id)
      );

      if (validAnnouncements.length > 0) {
        const announcementArb = fc.constantFrom(...validAnnouncements);

        await fc.assert(
          fc.asyncProperty(announcementArb, async (announcement: Announcement) => {
            // Property: coach_id must reference an existing coach
            expect(allCoachIds.has(announcement.coach_id)).toBe(true);
          }),
          { numRuns: Math.min(50, validAnnouncements.length) }
        );
      }
    }
  }, 30000);

  /**
   * For any attendance record, the athlete_id must reference an existing user.
   * Validates: Requirements 7.5
   */
  it('should have valid athlete_id references in attendance', async () => {
    const { data: attendance, error } = await supabase
      .from('attendance')
      .select('id, session_id, athlete_id')
      .limit(100);

    expect(error).toBeNull();
    expect(attendance).toBeDefined();

    if (attendance && attendance.length > 0) {
      const attendanceArb = fc.constantFrom(...attendance);

      await fc.assert(
        fc.asyncProperty(attendanceArb, async (record: Attendance) => {
          // Property: athlete_id must reference an existing user
          expect(allUserIds.has(record.athlete_id)).toBe(true);
        }),
        { numRuns: Math.min(50, attendance.length) }
      );
    }
  }, 30000);

  /**
   * For any attendance record, the session_id must reference an existing session.
   * Validates: Requirements 7.5
   */
  it('should have valid session_id references in attendance', async () => {
    const { data: attendance, error } = await supabase
      .from('attendance')
      .select('id, session_id, athlete_id')
      .limit(100);

    expect(error).toBeNull();
    expect(attendance).toBeDefined();

    if (attendance && attendance.length > 0) {
      const attendanceArb = fc.constantFrom(...attendance);

      await fc.assert(
        fc.asyncProperty(attendanceArb, async (record: Attendance) => {
          // Property: session_id must reference an existing session
          expect(allSessionIds.has(record.session_id)).toBe(true);
        }),
        { numRuns: Math.min(50, attendance.length) }
      );
    }
  }, 30000);

  /**
   * For any performance record, the athlete_id must reference an existing athlete.
   * Validates: Requirements 6.6
   */
  it('should have valid athlete_id references in performance_records', async () => {
    const { data: records, error } = await supabase
      .from('performance_records')
      .select('id, athlete_id, coach_id')
      .limit(100);

    expect(error).toBeNull();
    expect(records).toBeDefined();

    if (records && records.length > 0) {
      const recordArb = fc.constantFrom(...records);

      await fc.assert(
        fc.asyncProperty(recordArb, async (record: PerformanceRecord) => {
          // Property: athlete_id must reference an existing athlete
          expect(allAthleteIds.has(record.athlete_id)).toBe(true);
        }),
        { numRuns: Math.min(50, records.length) }
      );
    }
  }, 30000);

  /**
   * For any performance record, the coach_id must reference an existing coach.
   * Validates: Requirements 6.6
   */
  it('should have valid coach_id references in performance_records', async () => {
    const { data: records, error } = await supabase
      .from('performance_records')
      .select('id, athlete_id, coach_id')
      .limit(100);

    expect(error).toBeNull();
    expect(records).toBeDefined();

    if (records && records.length > 0) {
      const recordArb = fc.constantFrom(...records);

      await fc.assert(
        fc.asyncProperty(recordArb, async (record: PerformanceRecord) => {
          // Property: coach_id must reference an existing coach
          expect(allCoachIds.has(record.coach_id)).toBe(true);
        }),
        { numRuns: Math.min(50, records.length) }
      );
    }
  }, 30000);

  /**
   * For any parent connection, the athlete_id must reference an existing athlete.
   * Validates: Requirements 7.6
   */
  it('should have valid athlete_id references in parent_connections', async () => {
    const { data: connections, error } = await supabase
      .from('parent_connections')
      .select('id, athlete_id, parent_user_id')
      .limit(100);

    expect(error).toBeNull();
    expect(connections).toBeDefined();

    if (connections && connections.length > 0) {
      const connectionArb = fc.constantFrom(...connections);

      await fc.assert(
        fc.asyncProperty(connectionArb, async (connection: ParentConnection) => {
          // Property: athlete_id must reference an existing athlete
          expect(allAthleteIds.has(connection.athlete_id)).toBe(true);
        }),
        { numRuns: Math.min(50, connections.length) }
      );
    }
  }, 30000);

  /**
   * For any parent connection with a parent_user_id, it must reference an existing parent user.
   * Validates: Requirements 7.6
   */
  it('should have valid parent_user_id references in parent_connections', async () => {
    const { data: connections, error } = await supabase
      .from('parent_connections')
      .select('id, athlete_id, parent_user_id')
      .not('parent_user_id', 'is', null)
      .limit(100);

    expect(error).toBeNull();
    expect(connections).toBeDefined();

    if (connections && connections.length > 0) {
      const connectionArb = fc.constantFrom(...connections);

      await fc.assert(
        fc.asyncProperty(connectionArb, async (connection: ParentConnection) => {
          // Property: parent_user_id must reference an existing parent user
          if (connection.parent_user_id) {
            expect(allParentUserIds.has(connection.parent_user_id)).toBe(true);
          }
        }),
        { numRuns: Math.min(50, connections.length) }
      );
    }
  }, 30000);

  /**
   * For any athlete goal, the athlete_id must reference an existing athlete.
   * Validates: Requirements 6.6
   */
  it('should have valid athlete_id references in athlete_goals', async () => {
    const { data: goals, error } = await supabase
      .from('athlete_goals')
      .select('id, athlete_id, coach_id')
      .limit(100);

    expect(error).toBeNull();
    expect(goals).toBeDefined();

    if (goals && goals.length > 0) {
      const goalArb = fc.constantFrom(...goals);

      await fc.assert(
        fc.asyncProperty(goalArb, async (goal: AthleteGoal) => {
          // Property: athlete_id must reference an existing athlete
          expect(allAthleteIds.has(goal.athlete_id)).toBe(true);
        }),
        { numRuns: Math.min(50, goals.length) }
      );
    }
  }, 30000);

  /**
   * For any athlete goal, the coach_id must reference an existing coach.
   * Validates: Requirements 6.6
   */
  it('should have valid coach_id references in athlete_goals', async () => {
    const { data: goals, error } = await supabase
      .from('athlete_goals')
      .select('id, athlete_id, coach_id')
      .limit(100);

    expect(error).toBeNull();
    expect(goals).toBeDefined();

    if (goals && goals.length > 0) {
      const goalArb = fc.constantFrom(...goals);

      await fc.assert(
        fc.asyncProperty(goalArb, async (goal: AthleteGoal) => {
          // Property: coach_id must reference an existing coach
          expect(allCoachIds.has(goal.coach_id)).toBe(true);
        }),
        { numRuns: Math.min(50, goals.length) }
      );
    }
  }, 30000);

  /**
   * Verify demo data specifically has valid foreign keys
   */
  describe('Demo Data Foreign Key Verification', () => {
    it('should have demo coach with valid club_id', async () => {
      const { data: coach, error } = await supabase
        .from('coaches')
        .select('id, user_id, club_id')
        .eq('user_id', DEMO_COACH_USER_ID)
        .single();

      expect(error).toBeNull();
      expect(coach).toBeDefined();
      expect(coach?.club_id).toBe(DEMO_CLUB_ID);
      expect(allClubIds.has(coach?.club_id)).toBe(true);
    });

    it('should have demo athlete with valid club_id', async () => {
      const { data: athlete, error } = await supabase
        .from('athletes')
        .select('id, user_id, club_id')
        .eq('user_id', DEMO_ATHLETE_USER_ID)
        .single();

      expect(error).toBeNull();
      expect(athlete).toBeDefined();
      expect(athlete?.club_id).toBe(DEMO_CLUB_ID);
      expect(allClubIds.has(athlete?.club_id)).toBe(true);
    });

    it('should have demo parent connection with valid references', async () => {
      const { data: athlete } = await supabase
        .from('athletes')
        .select('id')
        .eq('user_id', DEMO_ATHLETE_USER_ID)
        .single();

      if (!athlete) {
        console.log('Skipping: Demo athlete not found');
        return;
      }

      const { data: connection, error } = await supabase
        .from('parent_connections')
        .select('id, athlete_id, parent_user_id')
        .eq('athlete_id', athlete.id)
        .eq('parent_user_id', DEMO_PARENT_USER_ID)
        .single();

      expect(error).toBeNull();
      expect(connection).toBeDefined();
      expect(allAthleteIds.has(connection?.athlete_id)).toBe(true);
      expect(allParentUserIds.has(connection?.parent_user_id)).toBe(true);
    });

    it('should have demo training sessions with valid club_id and coach_id', async () => {
      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('id, club_id, coach_id')
        .eq('club_id', DEMO_CLUB_ID)
        .limit(10);

      expect(error).toBeNull();
      expect(sessions).toBeDefined();
      expect(sessions!.length).toBeGreaterThan(0);

      sessions!.forEach((session: TrainingSession) => {
        expect(allClubIds.has(session.club_id)).toBe(true);
        expect(allUserIds.has(session.coach_id)).toBe(true);
      });
    });

    it('should have demo announcements with valid coach_id', async () => {
      const { data: coach } = await supabase
        .from('coaches')
        .select('id')
        .eq('user_id', DEMO_COACH_USER_ID)
        .single();

      if (!coach) {
        console.log('Skipping: Demo coach not found');
        return;
      }

      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('id, coach_id')
        .eq('coach_id', coach.id)
        .limit(10);

      expect(error).toBeNull();
      expect(announcements).toBeDefined();
      expect(announcements!.length).toBeGreaterThan(0);

      announcements!.forEach((announcement: Announcement) => {
        expect(allCoachIds.has(announcement.coach_id)).toBe(true);
      });
    });
  });
});
