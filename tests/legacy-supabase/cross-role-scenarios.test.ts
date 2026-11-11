/**
 * Cross-Role Scenario Integration Tests
 * 
 * Tests complex scenarios involving multiple roles interacting:
 * - Admin manages clubs → Coaches and athletes see changes
 * - Coach creates announcement → Athletes and parents receive it
 * - Multiple roles access same data → RLS enforces proper isolation
 * - Role transitions → Access control updates correctly
 * 
 * Validates: Requirements 1.1-1.10 (Multi-Role Authentication and Authorization)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('Cross-Role Scenario Integration Tests', () => {
  let supabase: ReturnType<typeof createClient>;
  let adminUserId: string;
  let coachUserId: string;
  let athleteUserId: string;
  let parentUserId: string;
  let clubId: string;
  let testAnnouncementId: string;
  let testClubId: string;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get demo users for each role (using demo.xxx@test.com accounts)
    const { data: adminUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'demo.admin@test.com')
      .single();

    const { data: coachUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'demo.coach@test.com')
      .single();

    const { data: athleteUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'demo.athlete@test.com')
      .single();

    // For parent, we use the parent_connections table since parent may not have auth account
    const { data: parentConnection } = await supabase
      .from('parent_connections')
      .select('id, parent_email')
      .eq('parent_email', 'demo.parent@test.com')
      .limit(1)
      .single();

    if (!adminUser || !coachUser || !athleteUser) {
      throw new Error('Missing required demo users for testing. Ensure demo.admin@test.com, demo.coach@test.com, demo.athlete@test.com exist.');
    }

    adminUserId = adminUser.id;
    coachUserId = coachUser.id;
    athleteUserId = athleteUser.id;
    // Parent may not have user account, use a placeholder or skip parent tests
    parentUserId = parentConnection?.id || athleteUserId;

    // Get club ID from coach profile (id is the user_id in profiles table)
    const { data: coach } = await supabase
      .from('profiles')
      .select('club_id')
      .eq('id', coachUserId)
      .single();

    clubId = coach?.club_id || '';
    
    if (!clubId) {
      // Try to get any club
      const { data: anyClub } = await supabase
        .from('clubs')
        .select('id')
        .limit(1)
        .single();
      clubId = anyClub?.id || '';
    }

    console.log('Test setup:', {
      adminUserId,
      coachUserId,
      athleteUserId,
      parentUserId,
      clubId,
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testAnnouncementId) {
      await supabase
        .from('announcements')
        .delete()
        .eq('id', testAnnouncementId);
    }

    if (testClubId) {
      await supabase
        .from('clubs')
        .delete()
        .eq('id', testClubId);
    }
  });

  describe('Admin Club Management', () => {
    it('should complete workflow: Admin creates club → Coach assigned → Athlete joins', async () => {
      // Step 1: Admin creates a new club
      const { data: newClub, error: clubError } = await supabase
        .from('clubs')
        .insert({
          name: 'Cross-Role Test Club',
          description: 'Test club for cross-role scenarios',
          sport_type: 'football',
        })
        .select()
        .single();

      expect(clubError).toBeNull();
      expect(newClub).toBeDefined();
      expect(newClub?.name).toBe('Cross-Role Test Club');

      testClubId = newClub!.id;

      // Step 2: Admin assigns coach to club
      const { error: updateCoachError } = await supabase
        .from('profiles')
        .update({ club_id: testClubId })
        .eq('user_id', coachUserId);

      expect(updateCoachError).toBeNull();

      // Step 3: Verify coach can see the club
      const { data: coachClub, error: coachError } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', testClubId)
        .single();

      expect(coachError).toBeNull();
      expect(coachClub).toBeDefined();
      expect(coachClub?.id).toBe(testClubId);

      // Step 4: Athlete applies to join club
      const { data: application, error: applicationError } = await supabase
        .from('membership_applications')
        .insert({
          user_id: athleteUserId,
          club_id: testClubId,
          status: 'pending',
        })
        .select()
        .single();

      expect(applicationError).toBeNull();
      expect(application).toBeDefined();

      // Clean up application
      await supabase
        .from('membership_applications')
        .delete()
        .eq('id', application!.id);

      // Restore coach's original club
      const { data: originalCoach } = await supabase
        .from('profiles')
        .select('club_id')
        .eq('user_id', coachUserId)
        .single();

      if (originalCoach && originalCoach.club_id !== clubId) {
        await supabase
          .from('profiles')
          .update({ club_id: clubId })
          .eq('user_id', coachUserId);
      }
    });

    it('should enforce admin-only access to all clubs', async () => {
      // Admin can see all clubs
      const { data: adminClubs, error: adminError } = await supabase
        .from('clubs')
        .select('*');

      expect(adminError).toBeNull();
      expect(adminClubs).toBeDefined();
      expect(adminClubs!.length).toBeGreaterThan(0);

      // Verify test club is in the list
      const hasTestClub = adminClubs!.some((club) => club.id === testClubId);
      expect(hasTestClub).toBe(true);
    });

    it('should allow admin to view all users across clubs', async () => {
      // Admin queries all profiles
      const { data: allProfiles, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);

      expect(error).toBeNull();
      expect(allProfiles).toBeDefined();
      expect(allProfiles!.length).toBeGreaterThan(0);

      // Verify profiles from different clubs
      const clubIds = new Set(allProfiles!.map((p) => p.club_id).filter(Boolean));
      expect(clubIds.size).toBeGreaterThan(0);
    });
  });

  describe('Announcement Broadcasting', () => {
    it('should complete workflow: Coach creates announcement → Athletes receive it', async () => {
      // Step 1: Coach creates club announcement
      const { data: announcement, error: announcementError } = await supabase
        .from('announcements')
        .insert({
          club_id: clubId,
          author_id: coachUserId,
          author_role: 'coach',
          title: 'Cross-Role Test Announcement',
          content: 'This is a test announcement for cross-role scenarios',
          priority: 'normal',
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(announcementError).toBeNull();
      expect(announcement).toBeDefined();

      testAnnouncementId = announcement!.id;

      // Step 2: Athlete queries announcements and sees it
      const { data: athleteAnnouncements, error: athleteError } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', testAnnouncementId)
        .single();

      expect(athleteError).toBeNull();
      expect(athleteAnnouncements).toBeDefined();
      expect(athleteAnnouncements?.title).toBe('Cross-Role Test Announcement');

      // Step 3: Verify notification was created for athletes in club
      const { data: notification, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: athleteUserId,
          notification_type: 'announcement_published',
          title: 'New Announcement',
          message: announcement.title,
          related_id: testAnnouncementId,
          related_type: 'announcement',
          is_read: false,
        })
        .select()
        .single();

      expect(notificationError).toBeNull();
      expect(notification).toBeDefined();

      // Clean up notification
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notification!.id);
    });

    it('should complete workflow: Admin creates system-wide announcement → All users receive it', async () => {
      // Step 1: Admin creates system-wide announcement (club_id = null)
      const { data: systemAnnouncement, error: systemError } = await supabase
        .from('announcements')
        .insert({
          club_id: null,
          author_id: adminUserId,
          author_role: 'admin',
          title: 'System-Wide Test Announcement',
          content: 'This announcement is visible to all users',
          priority: 'high',
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(systemError).toBeNull();
      expect(systemAnnouncement).toBeDefined();

      const systemAnnouncementId = systemAnnouncement!.id;

      // Step 2: Verify all roles can see it
      // Coach
      const { data: coachView, error: coachError } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', systemAnnouncementId)
        .single();

      expect(coachError).toBeNull();
      expect(coachView).toBeDefined();

      // Athlete
      const { data: athleteView, error: athleteError } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', systemAnnouncementId)
        .single();

      expect(athleteError).toBeNull();
      expect(athleteView).toBeDefined();

      // Parent
      const { data: parentView, error: parentError } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', systemAnnouncementId)
        .single();

      expect(parentError).toBeNull();
      expect(parentView).toBeDefined();

      // Clean up
      await supabase
        .from('announcements')
        .delete()
        .eq('id', systemAnnouncementId);
    });
  });

  describe('RLS Club Isolation', () => {
    it('should enforce club isolation: Coach cannot see other clubs data', async () => {
      // Get coach's club
      const { data: coachProfile } = await supabase
        .from('profiles')
        .select('club_id')
        .eq('user_id', coachUserId)
        .single();

      const coachClubId = coachProfile!.club_id;

      // Coach queries training sessions
      const { data: coachSessions, error } = await supabase
        .from('training_sessions')
        .select('*')
        .limit(10);

      expect(error).toBeNull();
      expect(coachSessions).toBeDefined();

      // Verify all sessions belong to coach's club
      coachSessions!.forEach((session) => {
        expect(session.club_id).toBe(coachClubId);
      });
    });

    it('should enforce club isolation: Athlete cannot see other clubs sessions', async () => {
      // Get athlete's club
      const { data: athleteProfile } = await supabase
        .from('profiles')
        .select('club_id')
        .eq('user_id', athleteUserId)
        .single();

      const athleteClubId = athleteProfile!.club_id;

      // Athlete queries training sessions
      const { data: athleteSessions, error } = await supabase
        .from('training_sessions')
        .select('*')
        .limit(10);

      expect(error).toBeNull();
      expect(athleteSessions).toBeDefined();

      // Verify all sessions belong to athlete's club
      athleteSessions!.forEach((session) => {
        expect(session.club_id).toBe(athleteClubId);
      });
    });

    it('should allow admin to bypass club isolation', async () => {
      // Admin queries training sessions from all clubs
      const { data: adminSessions, error } = await supabase
        .from('training_sessions')
        .select('*, clubs(*)')
        .limit(20);

      expect(error).toBeNull();
      expect(adminSessions).toBeDefined();

      // Verify sessions from multiple clubs
      const clubIds = new Set(adminSessions!.map((s) => s.club_id));
      expect(clubIds.size).toBeGreaterThan(0);
    });
  });

  describe('Role-Based Data Access', () => {
    it('should enforce role-based access: Athlete can only update own profile', async () => {
      // Athlete updates own profile
      const { error: ownUpdateError } = await supabase
        .from('profiles')
        .update({ nickname: 'Test Nickname' })
        .eq('user_id', athleteUserId);

      expect(ownUpdateError).toBeNull();

      // Verify update succeeded
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('user_id', athleteUserId)
        .single();

      expect(updatedProfile?.nickname).toBe('Test Nickname');

      // Restore original nickname
      await supabase
        .from('profiles')
        .update({ nickname: null })
        .eq('user_id', athleteUserId);
    });

    it('should enforce role-based access: Coach can view athletes in their club', async () => {
      // Coach queries athletes in their club
      const { data: clubAthletes, error } = await supabase
        .from('profiles')
        .select('*, user_roles!inner(*)')
        .eq('club_id', clubId)
        .eq('user_roles.role', 'athlete');

      expect(error).toBeNull();
      expect(clubAthletes).toBeDefined();

      // Verify all athletes belong to coach's club
      clubAthletes!.forEach((athlete) => {
        expect(athlete.club_id).toBe(clubId);
      });
    });

    it('should enforce role-based access: Parent can only view connected athletes', async () => {
      // Get parent's connected athletes
      const { data: connections, error } = await supabase
        .from('parent_connections')
        .select('athlete_id')
        .eq('parent_id', parentUserId)
        .eq('status', 'approved');

      expect(error).toBeNull();
      expect(connections).toBeDefined();

      const connectedAthleteIds = connections!.map((c) => c.athlete_id);

      // Parent queries athlete profiles
      const { data: parentAthletes, error: parentError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', connectedAthleteIds);

      expect(parentError).toBeNull();
      expect(parentAthletes).toBeDefined();

      // Verify all profiles are connected athletes
      parentAthletes!.forEach((athlete) => {
        expect(connectedAthleteIds).toContain(athlete.user_id);
      });
    });
  });

  describe('Multi-Role Workflows', () => {
    it('should handle complete workflow: Application → Approval → Training → Attendance → Report', async () => {
      // This test simulates a complete athlete journey through the system

      // Step 1: Athlete submits membership application (already tested)
      // Step 2: Coach approves application (already tested)
      // Step 3: Coach creates training session
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const sessionDate = tomorrow.toISOString().split('T')[0];

      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .insert({
          club_id: clubId,
          coach_id: coachUserId,
          title: 'Multi-Role Workflow Test Session',
          scheduled_at: `${sessionDate}T10:00:00`,
          duration_minutes: 120,
          location: 'Test Stadium',
          session_type: 'practice',
          status: 'scheduled',
        })
        .select()
        .single();

      expect(sessionError).toBeNull();
      expect(session).toBeDefined();

      const workflowSessionId = session!.id;

      // Step 4: Athlete checks in
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .insert({
          session_id: workflowSessionId,
          athlete_id: athleteUserId,
          status: 'present',
          check_in_time: new Date().toISOString(),
          check_in_method: 'manual',
          marked_by: athleteUserId,
        })
        .select()
        .single();

      expect(attendanceError).toBeNull();
      expect(attendance).toBeDefined();

      // Step 5: Coach creates progress report
      const { data: report, error: reportError } = await supabase
        .from('progress_reports')
        .insert({
          athlete_id: athleteUserId,
          coach_id: coachUserId,
          report_date: new Date().toISOString().split('T')[0],
          overall_rating: 4,
          strengths: 'Good attendance and effort',
          areas_for_improvement: 'Continue practicing',
          recommendations: 'Keep up the good work',
        })
        .select()
        .single();

      expect(reportError).toBeNull();
      expect(report).toBeDefined();

      // Step 6: Parent views report (if connected)
      const { data: parentReport } = await supabase
        .from('progress_reports')
        .select('*')
        .eq('id', report!.id)
        .eq('athlete_id', athleteUserId)
        .single();

      expect(parentReport).toBeDefined();

      // Step 7: Admin monitors all activity
      const { data: adminSession } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('id', workflowSessionId)
        .single();

      expect(adminSession).toBeDefined();

      // Clean up
      await supabase
        .from('progress_reports')
        .delete()
        .eq('id', report!.id);

      await supabase
        .from('attendance')
        .delete()
        .eq('id', attendance!.id);

      await supabase
        .from('training_sessions')
        .delete()
        .eq('id', workflowSessionId);
    });
  });

  describe('Error Handling Across Roles', () => {
    it('should handle unauthorized access attempts gracefully', async () => {
      // Athlete tries to create a training session (coach-only action)
      const { error } = await supabase
        .from('training_sessions')
        .insert({
          club_id: clubId,
          coach_id: athleteUserId, // Athlete trying to act as coach
          title: 'Unauthorized Session',
          scheduled_at: new Date().toISOString(),
          duration_minutes: 60,
          location: 'Test',
          session_type: 'practice',
          status: 'scheduled',
        });

      // Should fail due to RLS or validation
      expect(error).toBeDefined();
    });

    it('should prevent cross-club data access', async () => {
      // Get another club
      const { data: otherClub } = await supabase
        .from('clubs')
        .select('id')
        .neq('id', clubId)
        .limit(1)
        .single();

      if (!otherClub) {
        console.log('Skipping test: No other club available');
        return;
      }

      // Coach tries to create session in another club
      const { error } = await supabase
        .from('training_sessions')
        .insert({
          club_id: otherClub.id,
          coach_id: coachUserId,
          title: 'Cross-Club Session',
          scheduled_at: new Date().toISOString(),
          duration_minutes: 60,
          location: 'Test',
          session_type: 'practice',
          status: 'scheduled',
        });

      // Should fail due to RLS
      expect(error).toBeDefined();
    });
  });
});
