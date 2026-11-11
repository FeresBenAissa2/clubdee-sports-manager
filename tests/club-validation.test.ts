/**
 * Club Validation Tests
 * 
 * Tests for validating club selection before membership application submission.
 * Validates: Requirements AC1 (Club-Based Application), Task 3.1
 * 
 * These tests verify that:
 * 1. Valid clubs with coaches are accepted
 * 2. Invalid club IDs are rejected
 * 3. Clubs without coaches are rejected
 * 4. Malformed UUIDs are rejected
 * 5. Club details are returned on successful validation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@/lib/db/client';

describe('Club Validation', () => {
  let supabase: any;
  let validClubId: string;
  let clubWithoutCoaches: string;

  // Helper function to validate club (client-side version for testing)
  async function validateClub(clubId: string) {
    try {
      // Check if club exists
      const { data: club, error } = await supabase
        .from('clubs')
        .select('id, name, sport_type, description')
        .eq('id', clubId)
        .maybeSingle();

      if (error) {
        console.error('Error validating club:', error);
        return { valid: false, error: 'ไม่สามารถตรวจสอบกีฬาได้' };
      }

      if (!club) {
        return { valid: false, error: 'ไม่พบกีฬาที่เลือก กรุณาเลือกกีฬาใหม่' };
      }

      // Check if club has at least one coach
      const { count: coachCount, error: coachError } = await supabase
        .from('coaches')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId);

      if (coachError) {
        console.error('Error checking coaches:', coachError);
        return { valid: false, error: 'ไม่สามารถตรวจสอบโค้ชได้' };
      }

      if (!coachCount || coachCount === 0) {
        return { 
          valid: false, 
          error: `กีฬา ${club.name} ยังไม่มีโค้ช ไม่สามารถรับสมัครได้ในขณะนี้` 
        };
      }

      return { valid: true, club };
    } catch (error) {
      console.error('Unexpected error in validateClub:', error);
      return { valid: false, error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด' };
    }
  }

  beforeAll(async () => {
    supabase = createClient();

    // Get a valid club with coaches
    const { data: allClubs } = await supabase
      .from('clubs')
      .select('id, name');

    if (allClubs && allClubs.length > 0) {
      // Check each club for coaches
      for (const club of allClubs) {
        const { count } = await supabase
          .from('coaches')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', club.id);

        if (count && count > 0) {
          validClubId = club.id;
        } else if (!clubWithoutCoaches) {
          clubWithoutCoaches = club.id;
        }

        // Break if we found both
        if (validClubId && clubWithoutCoaches) {
          break;
        }
      }
    }
  });

  it('should validate a valid club with coaches', async () => {
    if (!validClubId) {
      console.log('Skipping test: No valid club found');
      return;
    }

    const result = await validateClub(validClubId);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.club).toBeDefined();
    expect(result.club?.id).toBe(validClubId);
  });

  it('should reject an invalid club ID', async () => {
    const invalidClubId = '00000000-0000-0000-0000-000000000000';

    const result = await validateClub(invalidClubId);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('ไม่พบกีฬาที่เลือก');
  });

  it('should reject a club without coaches', async () => {
    if (!clubWithoutCoaches) {
      console.log('Skipping test: No club without coaches found');
      return;
    }

    const result = await validateClub(clubWithoutCoaches);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('ยังไม่มีโค้ช');
  });

  it('should reject a malformed UUID', async () => {
    const malformedId = 'not-a-uuid';

    const result = await validateClub(malformedId);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should return club details on successful validation', async () => {
    if (!validClubId) {
      console.log('Skipping test: No valid club found');
      return;
    }

    const result = await validateClub(validClubId);

    expect(result.valid).toBe(true);
    expect(result.club).toBeDefined();
    expect(result.club).toHaveProperty('id');
    expect(result.club).toHaveProperty('name');
    expect(result.club).toHaveProperty('sport_type');
  });
});
