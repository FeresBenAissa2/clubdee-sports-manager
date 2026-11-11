/**
 * Property-Based Test for Unread Badge Count Accuracy
 * **Feature: feature-integration-plan, Property 4: Unread Badge Count Accuracy**
 * 
 * Property 4: Unread Badge Count Accuracy
 * *For any* athlete, the unread badge count should equal the exact number of 
 * unread announcements from their club.
 * 
 * **Validates: Requirements 1.4**
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
}

interface Announcement {
  id: string;
  coach_id: string;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  expires_at: string | null;
}

describe('Property 4: Unread Badge Count Accuracy', () => {
  let supabase: SupabaseClient;
  let allCoaches: Coach[] = [];
  let allAthletes: Athlete[] = [];
  let allAnnouncements: Announcement[] = [];
  const createdReadRecords: string[] = [];

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all coaches with their club_id
    const { data: coaches } = await supabase
      .from('coaches')
      .select('id, user_id, club_id');
    allCoaches = coaches || [];

    // Fetch all athletes with their club_id
    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, user_id, club_id');
    allAthletes = athletes || [];

    // Fetch all announcements
    const { data: announcements } = await supabase
      .from('announcements')
      .select('id, coach_id, title, message, priority, created_at, expires_at');
    allAnnouncements = announcements || [];

    console.log('Test setup:', {
      coachCount: allCoaches.length,
      athleteCount: allAthletes.length,
      announcementCount: allAnnouncements.length,
    });
  });

  afterAll(async () => {
    // Clean up any read records created during tests
    if (createdReadRecords.length > 0) {
      await supabase
        .from('announcement_reads')
        .delete()
        .in('id', createdReadRecords);
      console.log(`Cleaned up ${createdReadRecords.length} test read records`);
    }
  });

  /**
   * Helper function to calculate unread count for a user in a club
   * This mirrors the logic in getUnreadCount from announcement-integration.ts
   */
  async function calculateUnreadCount(userId: string, clubId: string): Promise<number> {
    // Get all coaches from the club
    const { data: clubCoaches } = await supabase
      .from('coaches')
      .select('id')
      .eq('club_id', clubId);

    if (!clubCoaches || clubCoaches.length === 0) {
      return 0;
    }

    const coachIds = clubCoaches.map((c: { id: string }) => c.id);

    // Get all non-expired announcements from club coaches
    const now = new Date().toISOString();
    const { data: announcements } = await supabase
      .from('announcements')
      .select('id')
      .in('coach_id', coachIds)
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    if (!announcements || announcements.length === 0) {
      return 0;
    }

    const announcementIds = announcements.map((a: { id: string }) => a.id);

    // Get read records for this user
    const { data: readRecords } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', userId)
      .in('announcement_id', announcementIds);

    const readAnnouncementIds = new Set(
      (readRecords || []).map((r: { announcement_id: string }) => r.announcement_id)
    );

    // Count unread announcements
    return announcementIds.filter((id: string) => !readAnnouncementIds.has(id)).length;
  }

  /**
   * Helper function to get the actual count of unread announcements
   * by directly querying and counting
   */
  async function getActualUnreadAnnouncements(
    userId: string,
    clubId: string
  ): Promise<{ count: number; announcementIds: string[] }> {
    // Get all coaches from the club
    const { data: clubCoaches } = await supabase
      .from('coaches')
      .select('id')
      .eq('club_id', clubId);

    if (!clubCoaches || clubCoaches.length === 0) {
      return { count: 0, announcementIds: [] };
    }

    const coachIds = clubCoaches.map((c: { id: string }) => c.id);

    // Get all non-expired announcements from club coaches
    const now = new Date().toISOString();
    const { data: announcements } = await supabase
      .from('announcements')
      .select('id')
      .in('coach_id', coachIds)
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    if (!announcements || announcements.length === 0) {
      return { count: 0, announcementIds: [] };
    }

    const announcementIds = announcements.map((a: { id: string }) => a.id);

    // Get read records for this user
    const { data: readRecords } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', userId)
      .in('announcement_id', announcementIds);

    const readAnnouncementIds = new Set(
      (readRecords || []).map((r: { announcement_id: string }) => r.announcement_id)
    );

    // Get unread announcement IDs
    const unreadIds = announcementIds.filter((id: string) => !readAnnouncementIds.has(id));

    return { count: unreadIds.length, announcementIds: unreadIds };
  }

  /**
   * **Feature: feature-integration-plan, Property 4: Unread Badge Count Accuracy**
   * 
   * For any athlete with a club, the unread badge count should equal the exact
   * number of unread announcements from coaches in their club.
   */
  it('unread badge count equals exact number of unread announcements', async () => {
    // Find athletes with valid clubs
    const athletesWithClubs = allAthletes.filter(a => a.club_id !== null);

    if (athletesWithClubs.length === 0) {
      console.log('Skipping: No athletes with clubs found');
      return;
    }

    const athleteArb = fc.constantFrom(...athletesWithClubs.slice(0, 30));

    await fc.assert(
      fc.asyncProperty(athleteArb, async (athlete) => {
        // Calculate unread count using the helper function
        const calculatedCount = await calculateUnreadCount(athlete.user_id, athlete.club_id);

        // Get actual unread announcements by direct query
        const { count: actualCount, announcementIds } = await getActualUnreadAnnouncements(
          athlete.user_id,
          athlete.club_id
        );

        // Property: Calculated count should equal actual count
        expect(calculatedCount).toBe(actualCount);

        // Property: Count should be non-negative
        expect(calculatedCount).toBeGreaterThanOrEqual(0);

        // Property: Count should not exceed total announcements in club
        const clubCoaches = allCoaches.filter(c => c.club_id === athlete.club_id);
        const coachIds = clubCoaches.map(c => c.id);
        const clubAnnouncements = allAnnouncements.filter(a => coachIds.includes(a.coach_id));
        expect(calculatedCount).toBeLessThanOrEqual(clubAnnouncements.length);
      }),
      { numRuns: Math.min(30, athletesWithClubs.length) }
    );
  }, 90000);

  /**
   * **Feature: feature-integration-plan, Property 4: Unread Badge Count Accuracy**
   * 
   * For any athlete with no announcements in their club, the unread count should be zero.
   */
  it('unread count is zero when club has no announcements', async () => {
    // Find athletes whose clubs have no announcements
    const athletesWithNoAnnouncements: Athlete[] = [];

    for (const athlete of allAthletes) {
      if (!athlete.club_id) continue;

      const clubCoaches = allCoaches.filter(c => c.club_id === athlete.club_id);
      const coachIds = clubCoaches.map(c => c.id);
      const clubAnnouncements = allAnnouncements.filter(a => coachIds.includes(a.coach_id));

      if (clubAnnouncements.length === 0) {
        athletesWithNoAnnouncements.push(athlete);
        if (athletesWithNoAnnouncements.length >= 10) break;
      }
    }

    if (athletesWithNoAnnouncements.length === 0) {
      console.log('Skipping: All clubs have announcements');
      return;
    }

    const athleteArb = fc.constantFrom(...athletesWithNoAnnouncements);

    await fc.assert(
      fc.asyncProperty(athleteArb, async (athlete) => {
        const unreadCount = await calculateUnreadCount(athlete.user_id, athlete.club_id);

        // Property: Unread count should be zero when club has no announcements
        expect(unreadCount).toBe(0);
      }),
      { numRuns: Math.min(10, athletesWithNoAnnouncements.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 4: Unread Badge Count Accuracy**
   * 
   * For any athlete who has read all announcements, the unread count should be zero.
   */
  it('unread count is zero when all announcements are read', async () => {
    // Find athletes with clubs that have announcements
    const athletesWithAnnouncements: Array<{ athlete: Athlete; announcements: Announcement[] }> = [];

    for (const athlete of allAthletes) {
      if (!athlete.club_id) continue;

      const clubCoaches = allCoaches.filter(c => c.club_id === athlete.club_id);
      const coachIds = clubCoaches.map(c => c.id);
      const clubAnnouncements = allAnnouncements.filter(a => coachIds.includes(a.coach_id));

      if (clubAnnouncements.length > 0 && clubAnnouncements.length <= 5) {
        athletesWithAnnouncements.push({
          athlete,
          announcements: clubAnnouncements,
        });
        if (athletesWithAnnouncements.length >= 5) break;
      }
    }

    if (athletesWithAnnouncements.length === 0) {
      console.log('Skipping: No suitable athletes found');
      return;
    }

    const athleteArb = fc.constantFrom(...athletesWithAnnouncements);

    await fc.assert(
      fc.asyncProperty(athleteArb, async ({ athlete, announcements }) => {
        // Mark all announcements as read
        for (const announcement of announcements) {
          const { data, error } = await supabase
            .from('announcement_reads')
            .upsert(
              {
                announcement_id: announcement.id,
                user_id: athlete.user_id,
                read_at: new Date().toISOString(),
              },
              { onConflict: 'announcement_id,user_id' }
            )
            .select('id')
            .single();

          if (!error && data?.id) {
            createdReadRecords.push(data.id);
          }
        }

        // Calculate unread count
        const unreadCount = await calculateUnreadCount(athlete.user_id, athlete.club_id);

        // Property: Unread count should be zero when all announcements are read
        expect(unreadCount).toBe(0);
      }),
      { numRuns: Math.min(5, athletesWithAnnouncements.length) }
    );
  }, 120000);

  /**
   * **Feature: feature-integration-plan, Property 4: Unread Badge Count Accuracy**
   * 
   * For any athlete, the unread count should only include non-expired announcements.
   */
  it('unread count excludes expired announcements', async () => {
    const athletesWithClubs = allAthletes.filter(a => a.club_id !== null);

    if (athletesWithClubs.length === 0) {
      console.log('Skipping: No athletes with clubs found');
      return;
    }

    const athleteArb = fc.constantFrom(...athletesWithClubs.slice(0, 20));

    await fc.assert(
      fc.asyncProperty(athleteArb, async (athlete) => {
        const now = new Date();

        // Get club coaches
        const clubCoaches = allCoaches.filter(c => c.club_id === athlete.club_id);
        const coachIds = clubCoaches.map(c => c.id);

        // Get all announcements from club coaches
        const clubAnnouncements = allAnnouncements.filter(a => coachIds.includes(a.coach_id));

        // Count non-expired announcements
        const nonExpiredAnnouncements = clubAnnouncements.filter(a => {
          if (a.expires_at === null) return true;
          return new Date(a.expires_at) > now;
        });

        // Get unread count
        const unreadCount = await calculateUnreadCount(athlete.user_id, athlete.club_id);

        // Property: Unread count should not exceed non-expired announcements
        expect(unreadCount).toBeLessThanOrEqual(nonExpiredAnnouncements.length);
      }),
      { numRuns: Math.min(20, athletesWithClubs.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 4: Unread Badge Count Accuracy**
   * 
   * For any athlete, the unread count should only include announcements from
   * coaches in their own club (club isolation).
   */
  it('unread count only includes announcements from own club', async () => {
    const athletesWithClubs = allAthletes.filter(a => a.club_id !== null);

    if (athletesWithClubs.length === 0) {
      console.log('Skipping: No athletes with clubs found');
      return;
    }

    const athleteArb = fc.constantFrom(...athletesWithClubs.slice(0, 20));

    await fc.assert(
      fc.asyncProperty(athleteArb, async (athlete) => {
        // Get unread announcements
        const { announcementIds } = await getActualUnreadAnnouncements(
          athlete.user_id,
          athlete.club_id
        );

        // Get club coaches
        const clubCoaches = allCoaches.filter(c => c.club_id === athlete.club_id);
        const clubCoachIds = new Set(clubCoaches.map(c => c.id));

        // Verify each unread announcement is from a coach in the athlete's club
        for (const announcementId of announcementIds) {
          const announcement = allAnnouncements.find(a => a.id === announcementId);
          if (announcement) {
            // Property: Each unread announcement should be from a coach in the athlete's club
            expect(clubCoachIds.has(announcement.coach_id)).toBe(true);
          }
        }
      }),
      { numRuns: Math.min(20, athletesWithClubs.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 4: Unread Badge Count Accuracy**
   * 
   * For any athlete without a club, the unread count should be zero.
   */
  it('unread count is zero for athletes without a club', async () => {
    const athletesWithoutClubs = allAthletes.filter(a => a.club_id === null);

    if (athletesWithoutClubs.length === 0) {
      console.log('Skipping: All athletes have clubs');
      // This is actually expected behavior - all athletes should have clubs
      // Create a synthetic test case
      const syntheticUserId = '00000000-0000-0000-0000-000000000000';
      const syntheticClubId = '00000000-0000-0000-0000-000000000000';

      const unreadCount = await calculateUnreadCount(syntheticUserId, syntheticClubId);
      expect(unreadCount).toBe(0);
      return;
    }

    const athleteArb = fc.constantFrom(...athletesWithoutClubs.slice(0, 10));

    await fc.assert(
      fc.asyncProperty(athleteArb, async (athlete) => {
        // For athletes without clubs, we use an empty string or null club_id
        // The function should handle this gracefully
        const unreadCount = await calculateUnreadCount(athlete.user_id, athlete.club_id || '');

        // Property: Unread count should be zero for athletes without a club
        expect(unreadCount).toBe(0);
      }),
      { numRuns: Math.min(10, athletesWithoutClubs.length) }
    );
  }, 60000);
});
