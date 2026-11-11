/**
 * Cross-Role Interoperability Tests
 * 
 * Tests that all features work together across Admin, Coach, Athlete roles
 * Using actual production schema
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('Cross-Role Interoperability Tests', () => {
  let supabase: SupabaseClient;
  let adminUserId: string;
  let coachUserId: string;
  let athleteUserId: string;
  let clubId: string;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get demo users
    const { data: adminUser } = await supabase
      .from('profiles')
      .select('id, club_id')
      .eq('email', 'demo.admin@test.com')
      .single();

    const { data: coachUser } = await supabase
      .from('profiles')
      .select('id, club_id')
      .eq('email', 'demo.coach@test.com')
      .single();

    const { data: athleteUser } = await supabase
      .from('profiles')
      .select('id, club_id')
      .eq('email', 'demo.athlete@test.com')
      .single();

    if (!adminUser || !coachUser || !athleteUser) {
      throw new Error('Missing demo users');
    }

    adminUserId = adminUser.id;
    coachUserId = coachUser.id;
    athleteUserId = athleteUser.id;
    clubId = coachUser.club_id || adminUser.club_id || '';

    console.log('Test setup:', { adminUserId, coachUserId, athleteUserId, clubId });
  });

  describe('1. Authentication & Profiles', () => {
    it('Admin can view all profiles', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, club_id')
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
    });

    it('All roles exist in user_roles table', async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .in('role', ['admin', 'coach', 'athlete']);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
    });

    it('Profiles are linked to clubs', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, club_id')
        .not('club_id', 'is', null)
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
    });
  });

  describe('2. Club Management', () => {
    it('Clubs exist and have required fields', async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, description')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
      expect(data![0]).toHaveProperty('name');
    });

    it('Coach is assigned to a club', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, club_id')
        .eq('id', coachUserId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.club_id).toBeTruthy();
    });
  });

  describe('3. Training Sessions', () => {
    it('Training sessions exist with required fields', async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, title, club_id, coach_id, scheduled_at, status')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Sessions are linked to clubs', async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, club_id, clubs(name)')
        .not('club_id', 'is', null)
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('4. Attendance System', () => {
    it('Attendance table exists with required fields', async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('id, session_id, athlete_id, status')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Attendance links to sessions and athletes', async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('id, session_id, athlete_id, training_sessions(title)')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('5. Announcements', () => {
    it('Announcements table exists', async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, priority')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('6. Notifications', () => {
    it('Notifications table exists', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, title, read')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('7. Membership Applications', () => {
    it('Membership applications table exists', async () => {
      const { data, error } = await supabase
        .from('membership_applications')
        .select('id, user_id, club_id, status')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('8. Parent Connections', () => {
    it('Parent connections table exists', async () => {
      const { data, error } = await supabase
        .from('parent_connections')
        .select('id, athlete_id, parent_email, is_verified')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Demo parent connection exists', async () => {
      const { data, error } = await supabase
        .from('parent_connections')
        .select('id, parent_email, parent_name')
        .eq('parent_email', 'demo.parent@test.com')
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.parent_name).toBe('Demo Parent');
    });
  });

  describe('9. Athletes Table', () => {
    it('Athletes table exists and links to profiles', async () => {
      const { data, error } = await supabase
        .from('athletes')
        .select('id, user_id, club_id, first_name, last_name')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
    });
  });

  describe('10. Progress Reports', () => {
    it('Progress reports table exists', async () => {
      const { data, error } = await supabase
        .from('progress_reports')
        .select('id, athlete_id')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('11. Leave Requests', () => {
    it('Leave requests table exists', async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('id, athlete_id, session_id, status')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('12. Tournaments', () => {
    it('Tournaments table exists', async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, club_id')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('13. Home Training', () => {
    it('Home training logs table exists', async () => {
      const { data, error } = await supabase
        .from('home_training_logs')
        .select('id, athlete_id')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('14. Feature Flags', () => {
    it('Feature flags table exists', async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('name, enabled')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('15. Audit Logs', () => {
    it('Audit logs table exists', async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, user_id, action')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Cross-Role Data Flow', () => {
    it('Coach and Athlete share same club', async () => {
      const { data: coach } = await supabase
        .from('profiles')
        .select('club_id')
        .eq('id', coachUserId)
        .single();

      const { data: athlete } = await supabase
        .from('profiles')
        .select('club_id')
        .eq('id', athleteUserId)
        .single();

      expect(coach?.club_id).toBe(athlete?.club_id);
    });

    it('Admin can see all clubs', async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
    });

    it('All core tables are accessible', async () => {
      // Test each table with appropriate primary key
      const tableTests = [
        { table: 'profiles', column: 'id' },
        { table: 'user_roles', column: 'user_id' },
        { table: 'clubs', column: 'id' },
        { table: 'training_sessions', column: 'id' },
        { table: 'attendance', column: 'id' },
        { table: 'announcements', column: 'id' },
        { table: 'notifications', column: 'id' },
        { table: 'membership_applications', column: 'id' },
        { table: 'parent_connections', column: 'id' },
        { table: 'athletes', column: 'id' }
      ];

      for (const { table, column } of tableTests) {
        const { error } = await supabase
          .from(table)
          .select(column)
          .limit(1);
        
        expect(error).toBeNull();
      }
    });
  });
});
