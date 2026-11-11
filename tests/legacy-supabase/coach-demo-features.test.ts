/**
 * Integration tests for coach features with demo data
 * Tests that demo coach can see demo athlete and that data flows correctly
 * 
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Demo user IDs from 117-comprehensive-demo-data.sql
const DEMO_CLUB_ID = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';
const DEMO_ADMIN_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const DEMO_COACH_USER_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
const DEMO_ATHLETE_USER_ID = 'c3d4e5f6-a7b8-9012-cdef-123456789012';

describe('Coach Demo Features - Task 5', () => {
  let supabase: ReturnType<typeof createClient>;
  let demoCoachId: string;
  let demoAthleteId: string;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get demo coach ID from coaches table
    const { data: coach } = await supabase
      .from('coaches')
      .select('id, club_id')
      .eq('user_id', DEMO_COACH_USER_ID)
      .single();

    if (!coach) {
      throw new Error('Demo coach not found. Ensure demo data is set up.');
    }
    demoCoachId = coach.id;

    // Get demo athlete ID from athletes table
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id, club_id')
      .eq('user_id', DEMO_ATHLETE_USER_ID)
      .single();

    if (!athlete) {
      throw new Error('Demo athlete not found. Ensure demo data is set up.');
    }
    demoAthleteId = athlete.id;
  });

  describe('5.1 Verify coach can see demo athlete in athletes list', () => {
    it('should have demo coach with correct club_id', async () => {
      const { data: coach, error } = await supabase
        .from('coaches')
        .select('id, user_id, club_id, first_name, last_name')
        .eq('user_id', DEMO_COACH_USER_ID)
        .single();

      expect(error).toBeNull();
      expect(coach).toBeDefined();
      expect(coach?.club_id).toBe(DEMO_CLUB_ID);
    });

    it('should have demo athlete with correct club_id', async () => {
      const { data: athlete, error } = await supabase
        .from('athletes')
        .select('id, user_id, club_id, first_name, last_name, email')
        .eq('user_id', DEMO_ATHLETE_USER_ID)
        .single();

      expect(error).toBeNull();
      expect(athlete).toBeDefined();
      expect(athlete?.club_id).toBe(DEMO_CLUB_ID);
    });

    it('should return demo athlete when coach queries athletes by club_id', async () => {
      // This simulates the query in /dashboard/coach/athletes/page.tsx
      const { data: coach } = await supabase
        .from('coaches')
        .select('id, club_id')
        .eq('user_id', DEMO_COACH_USER_ID)
        .single();

      expect(coach).toBeDefined();

      // Query athletes in the same club (same as page.tsx)
      const { data: athletes, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('club_id', coach!.club_id)
        .order('first_name', { ascending: true });

      expect(error).toBeNull();
      expect(athletes).toBeDefined();
      expect(athletes!.length).toBeGreaterThan(0);

      // Verify demo athlete is in the list
      const demoAthlete = athletes!.find(a => a.user_id === DEMO_ATHLETE_USER_ID);
      expect(demoAthlete).toBeDefined();
      expect(demoAthlete?.email).toBe('demo.athlete@clubdee.com');
    });
  });

  describe('5.2 Verify coach announcements are visible to athlete', () => {
    it('should have announcements from demo coach', async () => {
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('id, coach_id, title, message, priority')
        .eq('coach_id', demoCoachId);

      expect(error).toBeNull();
      expect(announcements).toBeDefined();
      expect(announcements!.length).toBeGreaterThan(0);
    });

    it('should allow athlete to see announcements from coaches in same club', async () => {
      // Get athlete's club_id
      const { data: athlete } = await supabase
        .from('athletes')
        .select('club_id')
        .eq('user_id', DEMO_ATHLETE_USER_ID)
        .single();

      expect(athlete).toBeDefined();

      // Get coaches in the same club
      const { data: coaches } = await supabase
        .from('coaches')
        .select('id')
        .eq('club_id', athlete!.club_id);

      expect(coaches).toBeDefined();
      expect(coaches!.length).toBeGreaterThan(0);

      const coachIds = coaches!.map(c => c.id);

      // Query announcements from coaches in the same club
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('id, coach_id, title, message, priority, created_at')
        .in('coach_id', coachIds)
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(announcements).toBeDefined();
      expect(announcements!.length).toBeGreaterThan(0);

      // Verify demo coach's announcements are included
      const demoCoachAnnouncements = announcements!.filter(a => a.coach_id === demoCoachId);
      expect(demoCoachAnnouncements.length).toBeGreaterThan(0);
    });

    it('should have expected demo announcements with correct content', async () => {
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('coach_id', demoCoachId)
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(announcements).toBeDefined();

      // Check for expected announcements from demo data
      const titles = announcements!.map(a => a.title);
      expect(titles).toContain('ยินดีต้อนรับสู่ ClubDee Demo');
      expect(titles).toContain('ตารางฝึกซ้อมประจำสัปดาห์');
      expect(titles).toContain('การแข่งขันรายการสำคัญ');
    });
  });

  describe('5.3 Verify coach training sessions are visible to athlete', () => {
    it('should have training sessions for demo club', async () => {
      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('id, club_id, coach_id, title, session_date, status')
        .eq('club_id', DEMO_CLUB_ID);

      expect(error).toBeNull();
      expect(sessions).toBeDefined();
      expect(sessions!.length).toBeGreaterThan(0);
    });

    it('should allow athlete to see training sessions for their club', async () => {
      // Get athlete's club_id
      const { data: athlete } = await supabase
        .from('athletes')
        .select('club_id')
        .eq('user_id', DEMO_ATHLETE_USER_ID)
        .single();

      expect(athlete).toBeDefined();

      // Query training sessions for the club (same as athlete schedule page)
      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('club_id', athlete!.club_id)
        .order('session_date', { ascending: true });

      expect(error).toBeNull();
      expect(sessions).toBeDefined();
      expect(sessions!.length).toBeGreaterThan(0);
    });

    it('should have sessions with various statuses (past, today, future)', async () => {
      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('id, title, session_date, status')
        .eq('club_id', DEMO_CLUB_ID)
        .order('session_date', { ascending: true });

      expect(error).toBeNull();
      expect(sessions).toBeDefined();

      const today = new Date().toISOString().split('T')[0];
      
      // Check for completed (past) sessions
      const completedSessions = sessions!.filter(s => s.status === 'completed');
      expect(completedSessions.length).toBeGreaterThan(0);

      // Check for scheduled (future or today) sessions
      const scheduledSessions = sessions!.filter(s => s.status === 'scheduled');
      expect(scheduledSessions.length).toBeGreaterThan(0);
    });

    it('should have expected demo training sessions', async () => {
      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('club_id', DEMO_CLUB_ID);

      expect(error).toBeNull();
      expect(sessions).toBeDefined();

      // Check for expected sessions from demo data
      const titles = sessions!.map(s => s.title);
      expect(titles).toContain('ฝึกซ้อมพื้นฐาน - Basic Training');
      expect(titles).toContain('ฝึกซ้อมเทคนิค - Technique Training');
    });

    it('should have sessions created by demo coach', async () => {
      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('club_id', DEMO_CLUB_ID)
        .eq('coach_id', DEMO_COACH_USER_ID);

      expect(error).toBeNull();
      expect(sessions).toBeDefined();
      expect(sessions!.length).toBeGreaterThan(0);
    });
  });
});
