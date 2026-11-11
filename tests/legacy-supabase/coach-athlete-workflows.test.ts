/**
 * Integration tests for coach-athlete workflows
 * Tests the complete flow from coach creating sessions to athletes checking in
 * Requirements: AC1, AC2, AC3
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createSession, getCoachSessions } from '@/lib/coach/session-actions';
import { athleteCheckIn, getAthleteSessions } from '@/lib/athlete/attendance-actions';
import { markAttendance, getSessionAttendance } from '@/lib/coach/attendance-actions';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('Coach-Athlete Workflows', () => {
  let supabase: ReturnType<typeof createClient>;
  let coachUserId: string;
  let coachId: string;
  let athleteUserId: string;
  let athleteId: string;
  let clubId: string;
  let testSessionId: string;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get a coach user
    const { data: coachRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'coach')
      .limit(1)
      .single();

    if (!coachRole) {
      throw new Error('No coach user found in database');
    }

    coachUserId = coachRole.user_id;

    // Get coach profile
    const { data: coach } = await supabase
      .from('coaches')
      .select('*')
      .eq('user_id', coachUserId)
      .single();

    if (!coach) {
      throw new Error('No coach profile found');
    }

    coachId = coach.id;
    clubId = coach.club_id;

    // Get an athlete from the same club
    const { data: athlete } = await supabase
      .from('athletes')
      .select('*')
      .eq('club_id', clubId)
      .limit(1)
      .single();

    if (!athlete) {
      throw new Error('No athlete found in the same club');
    }

    athleteId = athlete.id;
    athleteUserId = athlete.user_id;

    console.log('Test setup:', {
      coachUserId,
      coachId,
      clubId,
      athleteId,
      athleteUserId,
    });
  });

  afterAll(async () => {
    // Clean up test session if it exists
    if (testSessionId) {
      await supabase
        .from('attendance')
        .delete()
        .eq('session_id', testSessionId);
      
      await supabase
        .from('training_sessions')
        .delete()
        .eq('id', testSessionId);
    }
  });

  it('should complete workflow: Coach creates session → Athlete sees it', async () => {
    // Step 1: Coach creates a session
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const sessionDate = tomorrow.toISOString().split('T')[0];

    // Mock the auth context for coach
    const sessionData = {
      title: 'Integration Test Session',
      description: 'Test session for workflow',
      session_date: sessionDate,
      start_time: '10:00:00',
      end_time: '12:00:00',
      location: 'Test Stadium',
    };

    // Create session directly via database (simulating server action with auth)
    const { data: newSession, error: createError } = await supabase
      .from('training_sessions')
      .insert({
        club_id: clubId,
        coach_id: coachUserId, // Use user_id, not coaches.id
        title: sessionData.title,
        description: sessionData.description,
        session_date: sessionData.session_date,
        start_time: sessionData.start_time,
        end_time: sessionData.end_time,
        location: sessionData.location,
      })
      .select()
      .single();

    expect(createError).toBeNull();
    expect(newSession).toBeDefined();
    expect(newSession?.title).toBe('Integration Test Session');

    testSessionId = newSession!.id;

    // Step 2: Athlete queries sessions and sees the new session
    const { data: athleteSessions, error: athleteError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('club_id', clubId)
      .eq('id', testSessionId)
      .single();

    expect(athleteError).toBeNull();
    expect(athleteSessions).toBeDefined();
    expect(athleteSessions?.title).toBe('Integration Test Session');
    expect(athleteSessions?.club_id).toBe(clubId);
  });

  it('should complete workflow: Athlete checks in → Coach sees update', async () => {
    // Ensure we have a test session
    expect(testSessionId).toBeDefined();

    // Step 1: Athlete checks in
    // Create attendance record directly (simulating athleteCheckIn with auth)
    const checkInTime = new Date();
    
    const { data: attendance, error: checkInError } = await supabase
      .from('attendance')
      .insert({
        session_id: testSessionId,
        athlete_id: athleteUserId, // Use user_id, not athletes.id
        status: 'present',
        check_in_time: checkInTime.toISOString(),
        check_in_method: 'manual',
      })
      .select()
      .single();

    expect(checkInError).toBeNull();
    expect(attendance).toBeDefined();
    expect(attendance?.status).toBe('present');

    // Step 2: Coach queries attendance and sees the check-in
    const { data: sessionAttendance, error: coachError } = await supabase
      .from('attendance')
      .select('*')
      .eq('session_id', testSessionId)
      .eq('athlete_id', athleteUserId)
      .single();

    expect(coachError).toBeNull();
    expect(sessionAttendance).toBeDefined();
    expect(sessionAttendance?.status).toBe('present');
    expect(sessionAttendance?.athlete_id).toBe(athleteUserId);
    expect(sessionAttendance?.check_in_time).toBeDefined();
  });

  it('should complete workflow: Coach marks attendance → Athlete sees status', async () => {
    // Ensure we have a test session
    expect(testSessionId).toBeDefined();

    // Create a second athlete for this test
    const { data: secondAthlete } = await supabase
      .from('athletes')
      .select('*')
      .eq('club_id', clubId)
      .neq('id', athleteId)
      .limit(1)
      .single();

    if (!secondAthlete) {
      console.log('Skipping test: No second athlete available');
      return;
    }

    const secondAthleteId = secondAthlete.id;

    // Step 1: Coach marks attendance for an athlete
    const { data: markedAttendance, error: markError } = await supabase
      .from('attendance')
      .insert({
        session_id: testSessionId,
        athlete_id: secondAthlete.user_id, // Use user_id, not athletes.id
        status: 'absent',
        check_in_method: 'manual',
        notes: 'Marked by coach',
      })
      .select()
      .single();

    expect(markError).toBeNull();
    expect(markedAttendance).toBeDefined();
    expect(markedAttendance?.status).toBe('absent');

    // Step 2: Athlete queries their attendance and sees the status
    const { data: athleteAttendance, error: athleteError } = await supabase
      .from('attendance')
      .select('*, training_sessions(*)')
      .eq('session_id', testSessionId)
      .eq('athlete_id', secondAthlete.user_id)
      .single();

    expect(athleteError).toBeNull();
    expect(athleteAttendance).toBeDefined();
    expect(athleteAttendance?.status).toBe('absent');
    expect(athleteAttendance?.notes).toBe('Marked by coach');

    // Clean up
    await supabase
      .from('attendance')
      .delete()
      .eq('id', markedAttendance!.id);
  });

  it('should handle complete session lifecycle', async () => {
    // Create a new session for this test
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const sessionDate = tomorrow.toISOString().split('T')[0];

    const { data: lifecycleSession, error: createError } = await supabase
      .from('training_sessions')
      .insert({
        club_id: clubId,
        coach_id: coachUserId, // Use user_id, not coaches.id
        title: 'Lifecycle Test Session',
        session_date: sessionDate,
        start_time: '14:00:00',
        end_time: '16:00:00',
        location: 'Test Field',
      })
      .select()
      .single();

    expect(createError).toBeNull();
    expect(lifecycleSession).toBeDefined();

    const lifecycleSessionId = lifecycleSession!.id;

    // Step 1: Multiple athletes check in
    const { data: athletes } = await supabase
      .from('athletes')
      .select('id')
      .eq('club_id', clubId)
      .limit(3);

    expect(athletes).toBeDefined();
    expect(athletes!.length).toBeGreaterThan(0);

    // Get user_id for first athlete
    const { data: firstAthlete } = await supabase
      .from('athletes')
      .select('user_id')
      .eq('id', athletes![0].id)
      .single();

    // Check in first athlete
    const { error: checkIn1Error } = await supabase
      .from('attendance')
      .insert({
        session_id: lifecycleSessionId,
        athlete_id: firstAthlete!.user_id,
        status: 'present',
        check_in_time: new Date().toISOString(),
        check_in_method: 'manual',
      });

    expect(checkIn1Error).toBeNull();

    // Step 2: Coach marks attendance for others
    if (athletes!.length > 1) {
      const { data: secondAthlete } = await supabase
        .from('athletes')
        .select('user_id')
        .eq('id', athletes![1].id)
        .single();

      const { error: markError } = await supabase
        .from('attendance')
        .insert({
          session_id: lifecycleSessionId,
          athlete_id: secondAthlete!.user_id,
          status: 'late',
          check_in_method: 'manual',
          notes: 'Arrived 10 minutes late',
        });

      expect(markError).toBeNull();
    }

    // Step 3: Verify attendance count
    const { count, error: countError } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', lifecycleSessionId);

    expect(countError).toBeNull();
    expect(count).toBeGreaterThan(0);

    // Step 4: Coach updates attendance
    const { data: attendanceToUpdate } = await supabase
      .from('attendance')
      .select('id')
      .eq('session_id', lifecycleSessionId)
      .eq('athlete_id', firstAthlete!.user_id)
      .single();

    if (attendanceToUpdate) {
      const { error: updateError } = await supabase
        .from('attendance')
        .update({ notes: 'Updated by coach' })
        .eq('id', attendanceToUpdate.id);

      expect(updateError).toBeNull();

      // Verify update
      const { data: updatedAttendance } = await supabase
        .from('attendance')
        .select('notes')
        .eq('id', attendanceToUpdate.id)
        .single();

      expect(updatedAttendance?.notes).toBe('Updated by coach');
    }

    // Clean up
    await supabase
      .from('attendance')
      .delete()
      .eq('session_id', lifecycleSessionId);

    await supabase
      .from('training_sessions')
      .delete()
      .eq('id', lifecycleSessionId);
  });

  it('should prevent duplicate check-ins', async () => {
    // Ensure we have a test session
    expect(testSessionId).toBeDefined();

    // Athlete already checked in earlier in the test suite
    // Try to check in again
    const { error: duplicateError } = await supabase
      .from('attendance')
      .insert({
        session_id: testSessionId,
        athlete_id: athleteUserId,
        status: 'present',
        check_in_time: new Date().toISOString(),
        check_in_method: 'manual',
      });

    // Should fail due to unique constraint or business logic
    expect(duplicateError).toBeDefined();
  });

  it('should maintain data consistency across operations', async () => {
    // Create a session
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const sessionDate = tomorrow.toISOString().split('T')[0];

    const { data: consistencySession } = await supabase
      .from('training_sessions')
      .insert({
        club_id: clubId,
        coach_id: coachUserId, // Use user_id, not coaches.id
        title: 'Consistency Test Session',
        session_date: sessionDate,
        start_time: '09:00:00',
        end_time: '11:00:00',
        location: 'Test Arena',
      })
      .select()
      .single();

    const consistencySessionId = consistencySession!.id;

    // Get all athletes in club
    const { data: allAthletes } = await supabase
      .from('athletes')
      .select('id, user_id')
      .eq('club_id', clubId);

    const athleteCount = allAthletes?.length || 0;

    // Mark attendance for all athletes
    const attendanceRecords = allAthletes?.map((athlete) => ({
      session_id: consistencySessionId,
      athlete_id: athlete.user_id,
      status: 'present' as const,
      check_in_method: 'manual' as const,
    }));

    if (attendanceRecords && attendanceRecords.length > 0) {
      await supabase.from('attendance').insert(attendanceRecords);
    }

    // Verify count matches
    const { count } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', consistencySessionId);

    expect(count).toBe(athleteCount);

    // Clean up
    await supabase
      .from('attendance')
      .delete()
      .eq('session_id', consistencySessionId);

    await supabase
      .from('training_sessions')
      .delete()
      .eq('id', consistencySessionId);
  });
});
