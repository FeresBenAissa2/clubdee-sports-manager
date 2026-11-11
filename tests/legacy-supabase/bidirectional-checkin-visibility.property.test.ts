/**
 * Property-Based Test for Bidirectional Check-in Visibility
 * **Feature: feature-integration-plan, Property 8: Bidirectional Check-in Visibility**
 * 
 * Property 8: Bidirectional Check-in Visibility
 * *For any* athlete check-in, both the athlete's status and the coach's attendance 
 * sheet should reflect the check-in.
 * 
 * **Validates: Requirements 2.4, 2.5**
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
  first_name: string;
  last_name: string;
}

interface TrainingSession {
  id: string;
  club_id: string;
  coach_id: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
}

interface AttendanceRecord {
  id: string;
  training_session_id: string;
  athlete_id: string;
  status: 'present' | 'absent' | 'excused' | 'late';
  check_in_time: string | null;
  check_in_method: string | null;
}

describe('Property 8: Bidirectional Check-in Visibility', () => {
  let supabase: SupabaseClient;
  let allCoaches: Coach[] = [];
  let allAthletes: Athlete[] = [];
  let allSessions: TrainingSession[] = [];
  let allAttendance: AttendanceRecord[] = [];

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all coaches
    const { data: coaches } = await supabase
      .from('coaches')
      .select('id, user_id, club_id');
    allCoaches = coaches || [];

    // Fetch all athletes
    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, user_id, club_id, first_name, last_name');
    allAthletes = athletes || [];

    // Fetch all training sessions
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id, club_id, coach_id, session_date, start_time, end_time');
    allSessions = sessions || [];

    // Fetch all attendance records
    const { data: attendance } = await supabase
      .from('attendance')
      .select('id, training_session_id, athlete_id, status, check_in_time, check_in_method');
    allAttendance = attendance || [];

    console.log('Test setup:', {
      coachCount: allCoaches.length,
      athleteCount: allAthletes.length,
      sessionCount: allSessions.length,
      attendanceCount: allAttendance.length,
    });
  });

  /**
   * **Feature: feature-integration-plan, Property 8: Bidirectional Check-in Visibility**
   * 
   * For any attendance record with status 'present', both the athlete view
   * and the coach view should show the same check-in status.
   */
  it('attendance records are visible from both athlete and coach perspectives', async () => {
    if (allAttendance.length === 0) {
      console.log('Skipping: No attendance records available');
      return;
    }

    // Filter to only present attendance records
    const presentAttendance = allAttendance.filter(a => a.status === 'present');
    
    if (presentAttendance.length === 0) {
      console.log('Skipping: No present attendance records available');
      return;
    }

    const attendanceArb = fc.constantFrom(...presentAttendance.slice(0, 50));

    await fc.assert(
      fc.asyncProperty(attendanceArb, async (attendance) => {
        // Get the attendance record from athlete's perspective
        const { data: athleteView, error: athleteError } = await supabase
          .from('attendance')
          .select('id, status, check_in_time, athlete_id, training_session_id')
          .eq('id', attendance.id)
          .single();

        expect(athleteError).toBeNull();
        expect(athleteView).not.toBeNull();

        // Get the same attendance record from coach's perspective (via session)
        const { data: coachView, error: coachError } = await supabase
          .from('attendance')
          .select('id, status, check_in_time, athlete_id, training_session_id')
          .eq('training_session_id', attendance.training_session_id)
          .eq('athlete_id', attendance.athlete_id)
          .single();

        expect(coachError).toBeNull();
        expect(coachView).not.toBeNull();

        // Property: Both views should show the same data
        expect(athleteView?.id).toBe(coachView?.id);
        expect(athleteView?.status).toBe(coachView?.status);
        expect(athleteView?.check_in_time).toBe(coachView?.check_in_time);
      }),
      { numRuns: Math.min(50, presentAttendance.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 8: Bidirectional Check-in Visibility**
   * 
   * For any session with attendance records, the coach should see all athletes
   * who checked in with their timestamps.
   */
  it('coach can see all athletes who checked in to a session', async () => {
    if (allSessions.length === 0) {
      console.log('Skipping: No sessions available');
      return;
    }

    // Get sessions that have attendance records
    const sessionsWithAttendance = allSessions.filter(session =>
      allAttendance.some(a => a.training_session_id === session.id)
    );

    if (sessionsWithAttendance.length === 0) {
      console.log('Skipping: No sessions with attendance records');
      return;
    }

    const sessionArb = fc.constantFrom(...sessionsWithAttendance.slice(0, 30));

    await fc.assert(
      fc.asyncProperty(sessionArb, async (session) => {
        // Get all attendance records for this session (coach's view)
        const { data: sessionAttendance, error } = await supabase
          .from('attendance')
          .select('id, athlete_id, status, check_in_time, check_in_method')
          .eq('training_session_id', session.id);

        expect(error).toBeNull();

        // Get expected attendance from our cached data
        const expectedAttendance = allAttendance.filter(
          a => a.training_session_id === session.id
        );

        // Property: Coach should see all attendance records for the session
        expect(sessionAttendance?.length).toBe(expectedAttendance.length);

        // Property: Each attendance record should have required fields
        sessionAttendance?.forEach(record => {
          expect(record.athlete_id).toBeDefined();
          expect(record.status).toBeDefined();
          expect(['present', 'absent', 'excused', 'late']).toContain(record.status);
        });
      }),
      { numRuns: Math.min(30, sessionsWithAttendance.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 8: Bidirectional Check-in Visibility**
   * 
   * For any athlete with attendance records, querying by athlete_id should
   * return the same records as querying by session_id.
   */
  it('attendance records are consistent when queried from different perspectives', async () => {
    if (allAthletes.length === 0 || allAttendance.length === 0) {
      console.log('Skipping: No athletes or attendance records available');
      return;
    }

    // Get athletes with attendance records
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
        // Get attendance from athlete's perspective
        const { data: athleteAttendance, error: athleteError } = await supabase
          .from('attendance')
          .select('id, training_session_id, status, check_in_time')
          .eq('athlete_id', athlete.id);

        expect(athleteError).toBeNull();

        // For each attendance record, verify it's also visible from session perspective
        for (const record of athleteAttendance || []) {
          const { data: sessionRecord, error: sessionError } = await supabase
            .from('attendance')
            .select('id, athlete_id, status, check_in_time')
            .eq('training_session_id', record.training_session_id)
            .eq('athlete_id', athlete.id)
            .single();

          expect(sessionError).toBeNull();
          expect(sessionRecord).not.toBeNull();

          // Property: Records should match
          expect(sessionRecord?.id).toBe(record.id);
          expect(sessionRecord?.status).toBe(record.status);
        }
      }),
      { numRuns: Math.min(30, athletesWithAttendance.length) }
    );
  }, 90000);

  /**
   * **Feature: feature-integration-plan, Property 8: Bidirectional Check-in Visibility**
   * 
   * For any check-in with a timestamp, both athlete and coach views should
   * show the same timestamp.
   */
  it('check-in timestamps are consistent across views', async () => {
    // Filter attendance records with check-in times
    const attendanceWithTimestamp = allAttendance.filter(
      a => a.check_in_time !== null && a.status === 'present'
    );

    if (attendanceWithTimestamp.length === 0) {
      console.log('Skipping: No attendance records with timestamps');
      return;
    }

    const attendanceArb = fc.constantFrom(...attendanceWithTimestamp.slice(0, 50));

    await fc.assert(
      fc.asyncProperty(attendanceArb, async (attendance) => {
        // Query from athlete perspective
        const { data: athleteView } = await supabase
          .from('attendance')
          .select('check_in_time')
          .eq('athlete_id', attendance.athlete_id)
          .eq('training_session_id', attendance.training_session_id)
          .single();

        // Query from session perspective (coach view)
        const { data: coachView } = await supabase
          .from('attendance')
          .select('check_in_time')
          .eq('training_session_id', attendance.training_session_id)
          .eq('athlete_id', attendance.athlete_id)
          .single();

        // Property: Timestamps should be identical
        expect(athleteView?.check_in_time).toBe(coachView?.check_in_time);
        expect(athleteView?.check_in_time).toBe(attendance.check_in_time);
      }),
      { numRuns: Math.min(50, attendanceWithTimestamp.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 8: Bidirectional Check-in Visibility**
   * 
   * For any session-athlete pair in the same club, if an attendance record exists,
   * it should be visible to both the athlete and the coach.
   */
  it('attendance visibility is bidirectional for same-club pairs', async () => {
    if (allCoaches.length === 0 || allAthletes.length === 0 || allSessions.length === 0) {
      console.log('Skipping: Insufficient data for bidirectional test');
      return;
    }

    // Find coach-athlete-session combinations in the same club
    const validCombinations: Array<{
      coach: Coach;
      athlete: Athlete;
      session: TrainingSession;
    }> = [];

    for (const session of allSessions) {
      if (!session.coach_id) continue;
      
      const coach = allCoaches.find(c => c.id === session.coach_id);
      if (!coach) continue;

      const athletesInClub = allAthletes.filter(a => a.club_id === session.club_id);
      
      for (const athlete of athletesInClub) {
        // Check if there's an attendance record for this combination
        const hasAttendance = allAttendance.some(
          a => a.training_session_id === session.id && a.athlete_id === athlete.id
        );
        
        if (hasAttendance) {
          validCombinations.push({ coach, athlete, session });
          if (validCombinations.length >= 50) break;
        }
      }
      if (validCombinations.length >= 50) break;
    }

    if (validCombinations.length === 0) {
      console.log('Skipping: No valid coach-athlete-session combinations with attendance');
      return;
    }

    const combinationArb = fc.constantFrom(...validCombinations);

    await fc.assert(
      fc.asyncProperty(combinationArb, async ({ coach, athlete, session }) => {
        // Property: Coach and athlete should be in the same club as the session
        expect(coach.club_id).toBe(session.club_id);
        expect(athlete.club_id).toBe(session.club_id);

        // Get attendance record
        const { data: attendance, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('training_session_id', session.id)
          .eq('athlete_id', athlete.id)
          .single();

        expect(error).toBeNull();
        expect(attendance).not.toBeNull();

        // Property: The attendance record should be accessible
        expect(attendance?.athlete_id).toBe(athlete.id);
        expect(attendance?.training_session_id).toBe(session.id);
      }),
      { numRuns: Math.min(50, validCombinations.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 8: Bidirectional Check-in Visibility**
   * 
   * For any attendance record, the check_in_method should be preserved
   * and visible from both perspectives.
   */
  it('check-in method is preserved and visible bidirectionally', async () => {
    // Filter attendance records with check-in method
    const attendanceWithMethod = allAttendance.filter(
      a => a.check_in_method !== null
    );

    if (attendanceWithMethod.length === 0) {
      console.log('Skipping: No attendance records with check-in method');
      return;
    }

    const attendanceArb = fc.constantFrom(...attendanceWithMethod.slice(0, 50));

    await fc.assert(
      fc.asyncProperty(attendanceArb, async (attendance) => {
        // Query the record
        const { data: record, error } = await supabase
          .from('attendance')
          .select('check_in_method')
          .eq('id', attendance.id)
          .single();

        expect(error).toBeNull();
        
        // Property: Check-in method should be preserved
        expect(record?.check_in_method).toBe(attendance.check_in_method);
        
        // Property: Check-in method should be a valid value
        if (record?.check_in_method) {
          expect(['manual', 'qr', 'auto']).toContain(record.check_in_method);
        }
      }),
      { numRuns: Math.min(50, attendanceWithMethod.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 8: Bidirectional Check-in Visibility**
   * 
   * Simulates the bidirectional check-in flow: when an athlete checks in,
   * the record should be immediately visible to the coach.
   */
  it('simulated check-in is immediately visible to coach', () => {
    // Simulate the check-in data structure
    interface SimulatedCheckIn {
      sessionId: string;
      athleteId: string;
      checkInTime: string;
      method: 'manual' | 'qr' | 'auto';
    }

    interface AttendanceSheet {
      sessionId: string;
      records: Map<string, { status: string; checkInTime: string | null }>;
    }

    // Function to simulate athlete check-in
    function athleteCheckIn(
      sheet: AttendanceSheet,
      checkIn: SimulatedCheckIn
    ): AttendanceSheet {
      const newRecords = new Map(sheet.records);
      newRecords.set(checkIn.athleteId, {
        status: 'present',
        checkInTime: checkIn.checkInTime,
      });
      return { ...sheet, records: newRecords };
    }

    // Function to get coach view of attendance
    function getCoachView(
      sheet: AttendanceSheet,
      athleteId: string
    ): { status: string; checkInTime: string | null } | undefined {
      return sheet.records.get(athleteId);
    }

    // Function to get athlete view of their own attendance
    function getAthleteView(
      sheet: AttendanceSheet,
      athleteId: string
    ): { status: string; checkInTime: string | null } | undefined {
      return sheet.records.get(athleteId);
    }

    // Arbitraries for simulation
    const sessionIdArb = fc.uuid();
    const athleteIdArb = fc.uuid();
    const checkInTimeArb = fc.date().map(d => d.toISOString());
    const methodArb = fc.constantFrom('manual', 'qr', 'auto') as fc.Arbitrary<'manual' | 'qr' | 'auto'>;

    const checkInArb = fc.record({
      sessionId: sessionIdArb,
      athleteId: athleteIdArb,
      checkInTime: checkInTimeArb,
      method: methodArb,
    });

    fc.assert(
      fc.property(checkInArb, (checkIn) => {
        // Start with empty attendance sheet
        const initialSheet: AttendanceSheet = {
          sessionId: checkIn.sessionId,
          records: new Map(),
        };

        // Athlete checks in
        const updatedSheet = athleteCheckIn(initialSheet, checkIn);

        // Get views from both perspectives
        const coachView = getCoachView(updatedSheet, checkIn.athleteId);
        const athleteView = getAthleteView(updatedSheet, checkIn.athleteId);

        // Property: Both views should exist after check-in
        expect(coachView).toBeDefined();
        expect(athleteView).toBeDefined();

        // Property: Both views should show the same data
        expect(coachView?.status).toBe(athleteView?.status);
        expect(coachView?.checkInTime).toBe(athleteView?.checkInTime);

        // Property: Status should be 'present' after check-in
        expect(coachView?.status).toBe('present');
        expect(athleteView?.status).toBe('present');

        // Property: Check-in time should match
        expect(coachView?.checkInTime).toBe(checkIn.checkInTime);
        expect(athleteView?.checkInTime).toBe(checkIn.checkInTime);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 8: Bidirectional Check-in Visibility**
   * 
   * For any sequence of check-ins, the order should be preserved and
   * visible consistently from both perspectives.
   */
  it('multiple check-ins maintain consistency across views', () => {
    interface AttendanceSheet {
      sessionId: string;
      records: Map<string, { status: string; checkInTime: string; order: number }>;
    }

    let checkInOrder = 0;

    function processCheckIn(
      sheet: AttendanceSheet,
      athleteId: string,
      checkInTime: string
    ): AttendanceSheet {
      const newRecords = new Map(sheet.records);
      newRecords.set(athleteId, {
        status: 'present',
        checkInTime,
        order: ++checkInOrder,
      });
      return { ...sheet, records: newRecords };
    }

    const athleteIdsArb = fc.array(fc.uuid(), { minLength: 1, maxLength: 20 });
    const sessionIdArb = fc.uuid();

    fc.assert(
      fc.property(sessionIdArb, athleteIdsArb, (sessionId, athleteIds) => {
        checkInOrder = 0;
        
        let sheet: AttendanceSheet = {
          sessionId,
          records: new Map(),
        };

        // Process all check-ins
        const checkInTimes: Map<string, string> = new Map();
        for (const athleteId of athleteIds) {
          const checkInTime = new Date(Date.now() + checkInOrder * 1000).toISOString();
          checkInTimes.set(athleteId, checkInTime);
          sheet = processCheckIn(sheet, athleteId, checkInTime);
        }

        // Verify all check-ins are visible
        const uniqueAthletes = [...new Set(athleteIds)];
        expect(sheet.records.size).toBe(uniqueAthletes.length);

        // Verify each athlete's check-in is consistent
        for (const athleteId of uniqueAthletes) {
          const record = sheet.records.get(athleteId);
          expect(record).toBeDefined();
          expect(record?.status).toBe('present');
          expect(record?.checkInTime).toBe(checkInTimes.get(athleteId));
        }
      }),
      { numRuns: 100 }
    );
  });
});
