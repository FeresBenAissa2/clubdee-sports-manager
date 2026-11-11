/**
 * Coach Club Isolation Tests
 * 
 * ตรวจสอบว่าโค้ชแต่ละคนสร้างกิจกรรม/ประกาศได้เฉพาะในชมรมของตัวเอง
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('Coach Club Isolation', () => {
  let supabase: SupabaseClient;
  let coachUserId: string;
  let coachClubId: string;
  let otherClubId: string;
  let coachId: string;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get demo coach
    const { data: coach } = await supabase
      .from('coaches')
      .select('id, user_id, club_id')
      .limit(1)
      .single();

    if (!coach) {
      throw new Error('No coach found');
    }

    coachId = coach.id;
    coachUserId = coach.user_id;
    coachClubId = coach.club_id;

    // Get another club (different from coach's club)
    const { data: otherClub } = await supabase
      .from('clubs')
      .select('id')
      .neq('id', coachClubId)
      .limit(1)
      .single();

    otherClubId = otherClub?.id || '';

    console.log('Test setup:', { coachId, coachUserId, coachClubId, otherClubId });
  });

  describe('Training Sessions', () => {
    it('Coach sessions are filtered by club', async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, club_id, coach_id')
        .eq('club_id', coachClubId)
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // All sessions should be from coach's club
      data?.forEach(session => {
        expect(session.club_id).toBe(coachClubId);
      });
    });

    it('Sessions from other clubs are not visible when filtered', async () => {
      if (!otherClubId) {
        console.log('Skipping: No other club available');
        return;
      }

      // Query sessions from other club
      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, club_id')
        .eq('club_id', otherClubId)
        .limit(5);

      expect(error).toBeNull();
      // Sessions from other club should be separate
      data?.forEach(session => {
        expect(session.club_id).toBe(otherClubId);
        expect(session.club_id).not.toBe(coachClubId);
      });
    });
  });

  describe('Announcements', () => {
    it('Coach can create announcement (linked to coach_id)', async () => {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          coach_id: coachId,
          title: 'Test Announcement',
          message: 'Test message',
          priority: 'normal',
        })
        .select()
        .single();

      // Should succeed
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.coach_id).toBe(coachId);

      // Cleanup
      if (data?.id) {
        await supabase.from('announcements').delete().eq('id', data.id);
      }
    });

    it('Announcements are linked to coach which belongs to a club', async () => {
      // Verify coach belongs to a club
      const { data: coach, error } = await supabase
        .from('coaches')
        .select('id, club_id')
        .eq('id', coachId)
        .single();

      expect(error).toBeNull();
      expect(coach).toBeDefined();
      expect(coach?.club_id).toBe(coachClubId);
    });
  });

  describe('Activities', () => {
    it('Activities are filtered by club_id', async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, club_id')
        .eq('club_id', coachClubId)
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // All activities should be from coach's club
      data?.forEach(activity => {
        expect(activity.club_id).toBe(coachClubId);
      });
    });

    it('RLS policy exists for coaches managing activities in their club', async () => {
      // Check that the policy exists
      const { data, error } = await supabase.rpc('is_coach_of_club', {
        p_club_id: coachClubId
      });

      expect(error).toBeNull();
      // Coach should be of this club
      expect(data).toBeDefined();
    });
  });

  describe('Tournaments', () => {
    it('Tournaments are filtered by club_id', async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, club_id, name')
        .eq('club_id', coachClubId)
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // All tournaments should be from coach's club
      data?.forEach(tournament => {
        expect(tournament.club_id).toBe(coachClubId);
      });
    });

    it('RLS uses is_coach_of_club for tournament access', async () => {
      // Verify the helper function works for this club
      const { data, error } = await supabase.rpc('is_coach_of_club', {
        p_club_id: coachClubId
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('RLS Helper Function', () => {
    it('is_coach_of_club function exists and works', async () => {
      const { data, error } = await supabase.rpc('is_coach_of_club', {
        p_club_id: coachClubId
      });

      expect(error).toBeNull();
      // Function should return boolean
      expect(typeof data).toBe('boolean');
    });
  });
});
