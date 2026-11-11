/**
 * Property-Based Test for Announcement Read Status
 * **Feature: feature-integration-plan, Property 2: Announcement Read Status**
 * 
 * Property 2: Announcement Read Status
 * *For any* announcement viewed by an athlete, the system should mark it as read 
 * and the unread count should decrease by exactly one.
 * 
 * **Validates: Requirements 1.2**
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

interface AnnouncementRead {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

describe('Property 2: Announcement Read Status', () => {
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
   * Helper function to get unread count for a user in a club
   */
  async function getUnreadCount(userId: string, clubId: string): Promise<number> {
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

    const readAnnouncementIds = new Set((readRecords || []).map((r: { announcement_id: string }) => r.announcement_id));

    // Count unread announcements
    return announcementIds.filter((id: string) => !readAnnouncementIds.has(id)).length;
  }

  /**
   * Helper function to mark an announcement as read
   */
  async function markAsRead(announcementId: string, userId: string): Promise<{ success: boolean; recordId?: string }> {
    const { data, error } = await supabase
      .from('announcement_reads')
      .upsert(
        {
          announcement_id: announcementId,
          user_id: userId,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: 'announcement_id,user_id',
        }
      )
      .select('id')
      .single();

    if (error) {
      console.error('Error marking as read:', error);
      return { success: false };
    }

    return { success: true, recordId: data?.id };
  }

  /**
   * **Feature: feature-integration-plan, Property 2: Announcement Read Status**
   * 
   * For any announcement marked as read by an athlete, the read status should be recorded
   * in the announcement_reads table.
   */
  it('marking an announcement as read creates a read record', async () => {
    // Find athlete-announcement pairs where athlete is in the same club as the announcement's coach
    const validPairs: Array<{ athlete: Athlete; announcement: Announcement; clubId: string }> = [];

    for (const announcement of allAnnouncements.slice(0, 20)) {
      const coach = allCoaches.find(c => c.id === announcement.coach_id);
      if (!coach || !coach.club_id) continue;

      const athletesInClub = allAthletes.filter(a => a.club_id === coach.club_id);
      for (const athlete of athletesInClub.slice(0, 3)) {
        validPairs.push({
          athlete,
          announcement,
          clubId: coach.club_id,
        });
        if (validPairs.length >= 30) break;
      }
      if (validPairs.length >= 30) break;
    }

    if (validPairs.length === 0) {
      console.log('Skipping: No valid athlete-announcement pairs found');
      return;
    }

    const pairArb = fc.constantFrom(...validPairs);

    await fc.assert(
      fc.asyncProperty(pairArb, async ({ athlete, announcement }) => {
        // Mark the announcement as read
        const result = await markAsRead(announcement.id, athlete.user_id);
        
        // Property: Marking as read should succeed
        expect(result.success).toBe(true);

        if (result.recordId) {
          createdReadRecords.push(result.recordId);
        }

        // Verify the read record exists
        const { data: readRecord, error } = await supabase
          .from('announcement_reads')
          .select('*')
          .eq('announcement_id', announcement.id)
          .eq('user_id', athlete.user_id)
          .single();

        // Property: A read record should exist for this announcement-user pair
        expect(error).toBeNull();
        expect(readRecord).not.toBeNull();
        expect(readRecord?.announcement_id).toBe(announcement.id);
        expect(readRecord?.user_id).toBe(athlete.user_id);
        expect(readRecord?.read_at).not.toBeNull();
      }),
      { numRuns: Math.min(20, validPairs.length) }
    );
  }, 90000);

  /**
   * **Feature: feature-integration-plan, Property 2: Announcement Read Status**
   * 
   * For any announcement that is already read, marking it as read again should be idempotent
   * (no duplicate records, same read status).
   */
  it('marking an announcement as read is idempotent', async () => {
    // Find athlete-announcement pairs
    const validPairs: Array<{ athlete: Athlete; announcement: Announcement }> = [];

    for (const announcement of allAnnouncements.slice(0, 10)) {
      const coach = allCoaches.find(c => c.id === announcement.coach_id);
      if (!coach || !coach.club_id) continue;

      const athletesInClub = allAthletes.filter(a => a.club_id === coach.club_id);
      for (const athlete of athletesInClub.slice(0, 2)) {
        validPairs.push({ athlete, announcement });
        if (validPairs.length >= 15) break;
      }
      if (validPairs.length >= 15) break;
    }

    if (validPairs.length === 0) {
      console.log('Skipping: No valid athlete-announcement pairs found');
      return;
    }

    const pairArb = fc.constantFrom(...validPairs);

    await fc.assert(
      fc.asyncProperty(pairArb, async ({ athlete, announcement }) => {
        // Mark as read first time
        const result1 = await markAsRead(announcement.id, athlete.user_id);
        expect(result1.success).toBe(true);
        if (result1.recordId) createdReadRecords.push(result1.recordId);

        // Get the read record
        const { data: firstRead } = await supabase
          .from('announcement_reads')
          .select('*')
          .eq('announcement_id', announcement.id)
          .eq('user_id', athlete.user_id)
          .single();

        // Mark as read second time
        const result2 = await markAsRead(announcement.id, athlete.user_id);
        expect(result2.success).toBe(true);

        // Get all read records for this pair
        const { data: allReads } = await supabase
          .from('announcement_reads')
          .select('*')
          .eq('announcement_id', announcement.id)
          .eq('user_id', athlete.user_id);

        // Property: There should be exactly one read record (idempotent)
        expect(allReads).not.toBeNull();
        expect(allReads?.length).toBe(1);

        // Property: The record should still exist with valid data
        expect(allReads?.[0].announcement_id).toBe(announcement.id);
        expect(allReads?.[0].user_id).toBe(athlete.user_id);
      }),
      { numRuns: Math.min(10, validPairs.length) }
    );
  }, 90000);

  /**
   * **Feature: feature-integration-plan, Property 2: Announcement Read Status**
   * 
   * For any athlete with unread announcements, marking one as read should decrease
   * the unread count by exactly one.
   */
  it('marking an announcement as read decreases unread count by one', async () => {
    // Find athletes with clubs that have announcements
    const athletesWithAnnouncements: Array<{ athlete: Athlete; clubId: string; announcements: Announcement[] }> = [];

    for (const athlete of allAthletes) {
      if (!athlete.club_id) continue;

      const clubCoaches = allCoaches.filter(c => c.club_id === athlete.club_id);
      if (clubCoaches.length === 0) continue;

      const coachIds = clubCoaches.map(c => c.id);
      const clubAnnouncements = allAnnouncements.filter(a => coachIds.includes(a.coach_id));

      if (clubAnnouncements.length > 0) {
        athletesWithAnnouncements.push({
          athlete,
          clubId: athlete.club_id,
          announcements: clubAnnouncements,
        });
        if (athletesWithAnnouncements.length >= 10) break;
      }
    }

    if (athletesWithAnnouncements.length === 0) {
      console.log('Skipping: No athletes with club announcements found');
      return;
    }

    const athleteArb = fc.constantFrom(...athletesWithAnnouncements);

    await fc.assert(
      fc.asyncProperty(athleteArb, async ({ athlete, clubId, announcements }) => {
        // Get initial unread count
        const initialUnreadCount = await getUnreadCount(athlete.user_id, clubId);

        if (initialUnreadCount === 0) {
          // All announcements already read, skip this test case
          return;
        }

        // Find an unread announcement
        const { data: readRecords } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', athlete.user_id);

        const readAnnouncementIds = new Set((readRecords || []).map((r: { announcement_id: string }) => r.announcement_id));
        const unreadAnnouncement = announcements.find(a => !readAnnouncementIds.has(a.id));

        if (!unreadAnnouncement) {
          // No unread announcements found, skip
          return;
        }

        // Mark the announcement as read
        const result = await markAsRead(unreadAnnouncement.id, athlete.user_id);
        expect(result.success).toBe(true);
        if (result.recordId) createdReadRecords.push(result.recordId);

        // Get new unread count
        const newUnreadCount = await getUnreadCount(athlete.user_id, clubId);

        // Property: Unread count should decrease by exactly one
        expect(newUnreadCount).toBe(initialUnreadCount - 1);
      }),
      { numRuns: Math.min(10, athletesWithAnnouncements.length) }
    );
  }, 120000);

  /**
   * **Feature: feature-integration-plan, Property 2: Announcement Read Status**
   * 
   * For any read record, the read_at timestamp should be a valid date.
   */
  it('read records have valid timestamps', async () => {
    const { data: readRecords, error } = await supabase
      .from('announcement_reads')
      .select('*')
      .limit(100);

    expect(error).toBeNull();

    if (!readRecords || readRecords.length === 0) {
      console.log('Skipping: No read records available');
      return;
    }

    const readArb = fc.constantFrom(...readRecords);

    await fc.assert(
      fc.asyncProperty(readArb, async (readRecord: AnnouncementRead) => {
        // Property: read_at should be a valid date
        expect(readRecord.read_at).not.toBeNull();
        const readAt = new Date(readRecord.read_at);
        expect(readAt.toString()).not.toBe('Invalid Date');

        // Property: read_at should not be in the future
        expect(readAt.getTime()).toBeLessThanOrEqual(Date.now() + 60000); // Allow 1 minute tolerance

        // Property: announcement_id and user_id should be valid UUIDs
        expect(readRecord.announcement_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        expect(readRecord.user_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }),
      { numRuns: Math.min(50, readRecords.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 2: Announcement Read Status**
   * 
   * For any announcement, the read count should equal the number of unique users
   * who have read records for that announcement.
   */
  it('read count equals number of unique read records', async () => {
    if (allAnnouncements.length === 0) {
      console.log('Skipping: No announcements available');
      return;
    }

    const limitedAnnouncements = allAnnouncements.slice(0, 50);
    const announcementArb = fc.constantFrom(...limitedAnnouncements);

    await fc.assert(
      fc.asyncProperty(announcementArb, async (announcement) => {
        // Get all read records for this announcement
        const { data: readRecords, error } = await supabase
          .from('announcement_reads')
          .select('user_id')
          .eq('announcement_id', announcement.id);

        expect(error).toBeNull();

        // Count unique users
        const uniqueUsers = new Set((readRecords || []).map((r: { user_id: string }) => r.user_id));
        const readCount = uniqueUsers.size;

        // Property: Read count should be non-negative
        expect(readCount).toBeGreaterThanOrEqual(0);

        // Property: Read count should equal the number of read records (since each user can only have one record)
        expect(readCount).toBe((readRecords || []).length);
      }),
      { numRuns: Math.min(50, limitedAnnouncements.length) }
    );
  }, 60000);
});
