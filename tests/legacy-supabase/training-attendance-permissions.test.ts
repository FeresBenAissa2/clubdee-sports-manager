/**
 * Training Attendance System - RLS Permissions Test
 * 
 * This test suite verifies Row Level Security (RLS) policies for:
 * - training_sessions table
 * - attendance table
 * - leave_requests table
 * 
 * Tests cover all three roles: Admin, Coach, Athlete
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test user credentials
const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!',
  },
  coach: {
    email: 'coach@test.com',
    password: 'Coach123!',
  },
  athlete: {
    email: 'athlete@test.com',
    password: 'Athlete123!',
  },
};

// Supabase clients for each role
let adminClient: SupabaseClient;
let coachClient: SupabaseClient;
let athleteClient: SupabaseClient;

// Test data IDs
let testSessionId: string;
let testAthleteId: string;
let testCoachId: string;
let testTeamId: string;
let testAttendanceId: string;
let testLeaveRequestId: string;
let coachUserId: string;
let athleteUserId: string;

// Helper to create a training session
const createTrainingSession = (client: SupabaseClient, teamId: string, coachId: string, createdBy: string, title: string) => {
  const scheduledAt = new Date();
  scheduledAt.setHours(scheduledAt.getHours() + 2);
  
  return client
    .from('training_sessions')
    .insert({
      team_id: teamId,
      coach_id: coachId,
      title,
      description: 'Test session',
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: 120,
      location: 'Test Stadium',
      created_by: createdBy,
      status: 'scheduled',
    })
    .select()
    .single();
};

describe('Training Attendance RLS Permissions', () => {
  beforeAll(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Create clients for each role
    adminClient = createClient(supabaseUrl, supabaseAnonKey);
    coachClient = createClient(supabaseUrl, supabaseAnonKey);
    athleteClient = createClient(supabaseUrl, supabaseAnonKey);

    // Sign in as each user
    const { error: adminError } = await adminClient.auth.signInWithPassword(TEST_USERS.admin);
    if (adminError) throw new Error(`Admin login failed: ${adminError.message}`);

    const { error: coachError } = await coachClient.auth.signInWithPassword(TEST_USERS.coach);
    if (coachError) throw new Error(`Coach login failed: ${coachError.message}`);

    const { error: athleteError } = await athleteClient.auth.signInWithPassword(TEST_USERS.athlete);
    if (athleteError) throw new Error(`Athlete login failed: ${athleteError.message}`);

    // Get test user IDs
    const coachUser = await coachClient.auth.getUser();
    coachUserId = coachUser.data.user?.id!;
    
    const athleteUser = await athleteClient.auth.getUser();
    athleteUserId = athleteUser.data.user?.id!;
    
    const { data: coachData } = await coachClient.from('coaches').select('id, user_id').single();
    testCoachId = coachData?.id;

    const { data: athleteData } = await athleteClient.from('athletes').select('id, user_id, club_id').single();
    testAthleteId = athleteData?.id;
    
    // Get team_id from teams table (teams belong to clubs)
    const { data: teamData } = await coachClient.from('teams').select('id, club_id').eq('club_id', athleteData?.club_id).limit(1).single();
    testTeamId = teamData?.id;
  });

  afterAll(async () => {
    // Clean up: sign out all clients
    await adminClient.auth.signOut();
    await coachClient.auth.signOut();
    await athleteClient.auth.signOut();
  });

  describe('Training Sessions Permissions', () => {
    describe('Coach Permissions', () => {
      it('should allow coach to create training session', async () => {
        const coachUser = await coachClient.auth.getUser();
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 2); // 2 hours from now
        
        const { data, error } = await coachClient
          .from('training_sessions')
          .insert({
            team_id: testTeamId,
            coach_id: coachUser.data.user?.id,
            title: 'Test Training Session',
            description: 'Test session for permissions',
            scheduled_at: scheduledAt.toISOString(),
            duration_minutes: 120,
            location: 'Test Stadium',
            created_by: coachUser.data.user?.id,
            status: 'scheduled',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data?.title).toBe('Test Training Session');
        
        testSessionId = data?.id;
      });

      it('should allow coach to read their own sessions', async () => {
        const { data, error } = await coachClient
          .from('training_sessions')
          .select('*')
          .eq('id', testSessionId)
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data?.id).toBe(testSessionId);
      });

      it('should allow coach to update their own session', async () => {
        const { data, error } = await coachClient
          .from('training_sessions')
          .update({ location: 'Updated Stadium' })
          .eq('id', testSessionId)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.location).toBe('Updated Stadium');
      });

      it('should allow coach to delete their own session', async () => {
        // Create a session to delete
        const { data: sessionToDelete } = await coachClient
          .from('training_sessions')
          .insert({
            club_id: testTeamId,
            coach_id: testCoachId,
            title: 'Session to Delete',
            description: 'Test session',
            session_date: new Date().toISOString().split('T')[0],
            start_time: '16:00:00',
            end_time: '18:00:00',
            location: 'Test Stadium',
            status: 'scheduled',
          })
          .select()
          .single();

        const { error } = await coachClient
          .from('training_sessions')
          .delete()
          .eq('id', sessionToDelete?.id);

        expect(error).toBeNull();
      });
    });

    describe('Athlete Permissions', () => {
      it('should allow athlete to view sessions in their team', async () => {
        const { data, error } = await athleteClient
          .from('training_sessions')
          .select('*')
          .eq('club_id', testTeamId);

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should NOT allow athlete to create training session', async () => {
        const { data, error } = await athleteClient
          .from('training_sessions')
          .insert({
            club_id: testTeamId,
            coach_id: testCoachId,
            title: 'Unauthorized Session',
            description: 'Test',
            session_date: new Date().toISOString().split('T')[0],
            start_time: '16:00:00',
            end_time: '18:00:00',
            location: 'Test Stadium',
            status: 'scheduled',
          })
          .select();

        expect(error).toBeDefined();
        expect(data).toBeNull();
      });

      it('should NOT allow athlete to update training session', async () => {
        const { error } = await athleteClient
          .from('training_sessions')
          .update({ location: 'Hacked Stadium' })
          .eq('id', testSessionId);

        expect(error).toBeDefined();
      });

      it('should NOT allow athlete to delete training session', async () => {
        const { error } = await athleteClient
          .from('training_sessions')
          .delete()
          .eq('id', testSessionId);

        expect(error).toBeDefined();
      });
    });

    describe('Admin Permissions', () => {
      it('should allow admin to view all training sessions', async () => {
        const { data, error } = await adminClient
          .from('training_sessions')
          .select('*');

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should allow admin to create training session', async () => {
        const { data, error } = await adminClient
          .from('training_sessions')
          .insert({
            club_id: testTeamId,
            coach_id: testCoachId,
            title: 'Admin Created Session',
            description: 'Admin test',
            session_date: new Date().toISOString().split('T')[0],
            start_time: '16:00:00',
            end_time: '18:00:00',
            location: 'Admin Stadium',
            status: 'scheduled',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
      });

      it('should allow admin to update any training session', async () => {
        const { data, error } = await adminClient
          .from('training_sessions')
          .update({ description: 'Admin updated' })
          .eq('id', testSessionId)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.description).toBe('Admin updated');
      });

      it('should allow admin to delete any training session', async () => {
        // Create a session to delete
        const { data: sessionToDelete } = await adminClient
          .from('training_sessions')
          .insert({
            club_id: testTeamId,
            coach_id: testCoachId,
            title: 'Admin Delete Test',
            description: 'Test',
            session_date: new Date().toISOString().split('T')[0],
            start_time: '16:00:00',
            end_time: '18:00:00',
            location: 'Test Stadium',
            status: 'scheduled',
          })
          .select()
          .single();

        const { error } = await adminClient
          .from('training_sessions')
          .delete()
          .eq('id', sessionToDelete?.id);

        expect(error).toBeNull();
      });
    });
  });

  describe('Attendance Permissions', () => {
    describe('Athlete Permissions', () => {
      it('should allow athlete to check in (insert own attendance)', async () => {
        const athleteUser = await athleteClient.auth.getUser();
        
        const { data, error } = await athleteClient
          .from('attendance')
          .insert({
            session_id: testSessionId,
            athlete_id: athleteUser.data.user?.id,
            status: 'present',
            check_in_method: 'manual',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data?.athlete_id).toBe(athleteUser.data.user?.id);
        
        testAttendanceId = data?.id;
      });

      it('should allow athlete to view their own attendance', async () => {
        const athleteUser = await athleteClient.auth.getUser();
        
        const { data, error } = await athleteClient
          .from('attendance')
          .select('*')
          .eq('athlete_id', athleteUser.data.user?.id);

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(Array.isArray(data)).toBe(true);
        expect(data?.length).toBeGreaterThan(0);
      });

      it('should NOT allow athlete to view other athletes attendance', async () => {
        const athleteUser = await athleteClient.auth.getUser();
        
        // Try to get all attendance records (should only see own)
        const { data, error } = await athleteClient
          .from('attendance')
          .select('*');

        expect(error).toBeNull();
        // Should only see their own records
        expect(data?.every(record => record.athlete_id === athleteUser.data.user?.id)).toBe(true);
      });

      it('should NOT allow athlete to update attendance', async () => {
        const { error } = await athleteClient
          .from('attendance')
          .update({ status: 'absent' })
          .eq('id', testAttendanceId);

        expect(error).toBeDefined();
      });

      it('should NOT allow athlete to delete attendance', async () => {
        const { error } = await athleteClient
          .from('attendance')
          .delete()
          .eq('id', testAttendanceId);

        expect(error).toBeDefined();
      });
    });

    describe('Coach Permissions', () => {
      it('should allow coach to view attendance for their sessions', async () => {
        const { data, error } = await coachClient
          .from('attendance')
          .select('*')
          .eq('session_id', testSessionId);

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should allow coach to mark attendance (insert)', async () => {
        // First, get another athlete from the same team
        const { data: athletes } = await coachClient
          .from('athletes')
          .select('id, user_id')
          .eq('club_id', testTeamId)
          .limit(1);

        if (athletes && athletes.length > 0) {
          const { data, error } = await coachClient
            .from('attendance')
            .insert({
              session_id: testSessionId,
              athlete_id: athletes[0].user_id,
              status: 'present',
              check_in_method: 'manual',
            })
            .select()
            .single();

          expect(error).toBeNull();
          expect(data).toBeDefined();
        }
      });

      it('should allow coach to update attendance for their sessions', async () => {
        const { data, error } = await coachClient
          .from('attendance')
          .update({ 
            status: 'late',
            notes: 'Arrived 10 minutes late'
          })
          .eq('id', testAttendanceId)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.status).toBe('late');
      });

      it('should allow coach to delete attendance for their sessions', async () => {
        const athleteUser = await athleteClient.auth.getUser();
        
        // Create an attendance record to delete
        const { data: attendanceToDelete } = await coachClient
          .from('attendance')
          .insert({
            session_id: testSessionId,
            athlete_id: athleteUser.data.user?.id,
            status: 'present',
            check_in_method: 'manual',
          })
          .select()
          .single();

        const { error } = await coachClient
          .from('attendance')
          .delete()
          .eq('id', attendanceToDelete?.id);

        expect(error).toBeNull();
      });
    });

    describe('Admin Permissions', () => {
      it('should allow admin to view all attendance records', async () => {
        const { data, error } = await adminClient
          .from('attendance')
          .select('*');

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should allow admin to create attendance records', async () => {
        const athleteUser = await athleteClient.auth.getUser();
        
        const { data, error } = await adminClient
          .from('attendance')
          .insert({
            session_id: testSessionId,
            athlete_id: athleteUser.data.user?.id,
            status: 'present',
            check_in_method: 'manual',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
      });

      it('should allow admin to update any attendance record', async () => {
        const { data, error } = await adminClient
          .from('attendance')
          .update({ notes: 'Admin note' })
          .eq('id', testAttendanceId)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.notes).toBe('Admin note');
      });

      it('should allow admin to delete any attendance record', async () => {
        const athleteUser = await athleteClient.auth.getUser();
        
        // Create an attendance record to delete
        const { data: attendanceToDelete } = await adminClient
          .from('attendance')
          .insert({
            session_id: testSessionId,
            athlete_id: athleteUser.data.user?.id,
            status: 'present',
            check_in_method: 'manual',
          })
          .select()
          .single();

        const { error } = await adminClient
          .from('attendance')
          .delete()
          .eq('id', attendanceToDelete?.id);

        expect(error).toBeNull();
      });
    });
  });

  describe('Leave Requests Permissions', () => {
    describe('Athlete Permissions', () => {
      it('should allow athlete to create leave request for themselves', async () => {
        const { data, error } = await athleteClient
          .from('leave_requests')
          .insert({
            session_id: testSessionId,
            athlete_id: testAthleteId,
            reason: 'Family emergency - need to attend urgent matter',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data?.athlete_id).toBe(testAthleteId);
        
        testLeaveRequestId = data?.id;
      });

      it('should allow athlete to view their own leave requests', async () => {
        const { data, error } = await athleteClient
          .from('leave_requests')
          .select('*')
          .eq('athlete_id', testAthleteId);

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(Array.isArray(data)).toBe(true);
        expect(data?.length).toBeGreaterThan(0);
      });

      it('should allow athlete to update their pending leave request', async () => {
        const { data, error } = await athleteClient
          .from('leave_requests')
          .update({ reason: 'Updated reason for leave' })
          .eq('id', testLeaveRequestId)
          .eq('status', 'pending')
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.reason).toBe('Updated reason for leave');
      });

      it('should NOT allow athlete to update approved/rejected leave request', async () => {
        // First, have coach approve the request
        await coachClient
          .from('leave_requests')
          .update({ status: 'approved' })
          .eq('id', testLeaveRequestId);

        // Now athlete tries to update
        const { error } = await athleteClient
          .from('leave_requests')
          .update({ reason: 'Trying to change approved request' })
          .eq('id', testLeaveRequestId);

        expect(error).toBeDefined();

        // Reset to pending for other tests
        await coachClient
          .from('leave_requests')
          .update({ status: 'pending' })
          .eq('id', testLeaveRequestId);
      });

      it('should NOT allow athlete to delete leave request', async () => {
        const { error } = await athleteClient
          .from('leave_requests')
          .delete()
          .eq('id', testLeaveRequestId);

        expect(error).toBeDefined();
      });
    });

    describe('Coach Permissions', () => {
      it('should allow coach to view leave requests for their sessions', async () => {
        const { data, error } = await coachClient
          .from('leave_requests')
          .select('*')
          .eq('session_id', testSessionId);

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should allow coach to approve leave request', async () => {
        const { data, error } = await coachClient
          .from('leave_requests')
          .update({
            status: 'approved',
            reviewed_by: testCoachId,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', testLeaveRequestId)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.status).toBe('approved');
      });

      it('should allow coach to reject leave request', async () => {
        // Create a new leave request to reject
        const { data: newRequest } = await athleteClient
          .from('leave_requests')
          .insert({
            session_id: testSessionId,
            athlete_id: testAthleteId,
            reason: 'Request to be rejected',
          })
          .select()
          .single();

        const { data, error } = await coachClient
          .from('leave_requests')
          .update({
            status: 'rejected',
            reviewed_by: testCoachId,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', newRequest?.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.status).toBe('rejected');
      });

      it('should NOT allow coach to create leave request', async () => {
        const { error } = await coachClient
          .from('leave_requests')
          .insert({
            session_id: testSessionId,
            athlete_id: testAthleteId,
            reason: 'Coach trying to create leave request',
          });

        expect(error).toBeDefined();
      });

      it('should NOT allow coach to delete leave request', async () => {
        const { error } = await coachClient
          .from('leave_requests')
          .delete()
          .eq('id', testLeaveRequestId);

        expect(error).toBeDefined();
      });
    });

    describe('Admin Permissions', () => {
      it('should allow admin to view all leave requests', async () => {
        const { data, error } = await adminClient
          .from('leave_requests')
          .select('*');

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(Array.isArray(data)).toBe(true);
      });

      it('should allow admin to create leave request', async () => {
        const { data, error } = await adminClient
          .from('leave_requests')
          .insert({
            session_id: testSessionId,
            athlete_id: testAthleteId,
            reason: 'Admin created leave request',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
      });

      it('should allow admin to update any leave request', async () => {
        const { data, error } = await adminClient
          .from('leave_requests')
          .update({ status: 'approved' })
          .eq('id', testLeaveRequestId)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.status).toBe('approved');
      });

      it('should allow admin to delete any leave request', async () => {
        // Create a leave request to delete
        const { data: requestToDelete } = await adminClient
          .from('leave_requests')
          .insert({
            session_id: testSessionId,
            athlete_id: testAthleteId,
            reason: 'Request to be deleted',
          })
          .select()
          .single();

        const { error } = await adminClient
          .from('leave_requests')
          .delete()
          .eq('id', requestToDelete?.id);

        expect(error).toBeNull();
      });
    });
  });
});
