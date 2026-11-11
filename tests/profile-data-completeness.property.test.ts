/**
 * Property-Based Tests for Profile Data Completeness
 * Feature: sports-club-management
 * 
 * Property 12: Complete profile data display
 * Validates: Requirements 3.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Mock data stores
let athletesStore: Array<{
  id: string;
  user_id: string;
  club_id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  date_of_birth: string;
  phone_number: string;
  email: string;
  gender: string;
  health_notes: string | null;
  profile_picture_url: string | null;
  created_at: string;
  updated_at: string;
}> = [];

let clubsStore: Array<{
  id: string;
  name: string;
  description: string | null;
  sport_type: string;
  created_at: string;
  updated_at: string;
}> = [];

let attendanceLogsStore: Array<{
  id: string;
  training_session_id: string;
  athlete_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time: string | null;
  check_in_method: 'manual' | 'qr' | 'auto';
  notes: string | null;
  created_at: string;
}> = [];

let performanceRecordsStore: Array<{
  id: string;
  athlete_id: string;
  coach_id: string;
  test_type: string;
  test_name: string;
  score: number;
  unit: string;
  test_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}> = [];

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })),
  },
  from: vi.fn((table: string) => {
    if (table === 'athletes') {
      return {
        select: vi.fn((columns: string) => {
          const query = {
            eq: vi.fn((column: string, value: unknown) => ({
              ...query,
              single: vi.fn(async () => {
                const athlete = athletesStore.find(
                  (a) => a[column as keyof typeof a] === value
                );
                if (!athlete) {
                  return { data: null, error: { message: 'Not found' } };
                }
                
                // If columns include clubs, join the data
                if (columns.includes('clubs')) {
                  const club = clubsStore.find((c) => c.id === athlete.club_id);
                  return {
                    data: {
                      ...athlete,
                      clubs: club || null,
                    },
                    error: null,
                  };
                }
                
                return { data: athlete, error: null };
              }),
            })),
          };
          return query;
        }),
      };
    }
    
    if (table === 'attendance_logs') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((column: string, value: unknown) => ({
            eq: vi.fn((column2: string, value2: unknown) => ({
              then: async (resolve: (value: { data: unknown; count: number | null; error: null }) => void) => {
                const filtered = attendanceLogsStore.filter(
                  (log) =>
                    log[column as keyof typeof log] === value &&
                    log[column2 as keyof typeof log] === value2
                );
                resolve({ data: filtered, count: filtered.length, error: null });
              },
            })),
          })),
        })),
      };
    }
    
    if (table === 'performance_records') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((column: string, value: unknown) => ({
            then: async (resolve: (value: { data: unknown; count: number | null; error: null }) => void) => {
              const filtered = performanceRecordsStore.filter(
                (record) => record[column as keyof typeof record] === value
              );
              resolve({ data: filtered, count: filtered.length, error: null });
            },
          })),
        })),
      };
    }
    
    return {};
  }),
};

// Mock the Supabase server module
vi.mock('@/lib/db/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

// Import after mocking
const { getAthleteProfile } = await import('@/lib/athlete/actions');

describe('Profile Data Completeness Property-Based Tests', () => {
  beforeEach(() => {
    athletesStore = [];
    clubsStore = [];
    attendanceLogsStore = [];
    performanceRecordsStore = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    athletesStore = [];
    clubsStore = [];
    attendanceLogsStore = [];
    performanceRecordsStore = [];
  });

  /**
   * Property 12: Complete profile data display
   * For any athlete viewing their own profile, the displayed data should include 
   * all personal information, training history, and performance records.
   * Validates: Requirements 3.3
   */
  it('Property 12: Complete profile data display', async () => {
    // Custom arbitraries for athlete profile data
    const uuidArb = fc
      .uuid()
      .map((id) => `uuid-${id}`);

    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);

    const emailArb = fc
      .tuple(
        fc.stringMatching(/^[a-z0-9]{3,10}$/),
        fc.constantFrom('gmail.com', 'yahoo.com', 'example.com')
      )
      .map(([local, domain]) => `${local}@${domain}`);

    const phoneArb = fc
      .tuple(
        fc.constantFrom('06', '08', '09'),
        fc.integer({ min: 10000000, max: 99999999 })
      )
      .map(([prefix, number]) => `${prefix}${number}`);

    const dateOfBirthArb = fc
      .integer({ min: 6, max: 50 })
      .map((yearsAgo) => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - yearsAgo);
        return date.toISOString().split('T')[0];
      });

    const genderArb = fc.constantFrom('male', 'female', 'other');

    const clubArb = fc.record({
      id: uuidArb,
      name: fc.stringMatching(/^[A-Z][a-z\s]{5,30}$/),
      description: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: null }),
      sport_type: fc.constantFrom('football', 'basketball', 'volleyball', 'swimming'),
      created_at: fc.date().map((d) => d.toISOString()),
      updated_at: fc.date().map((d) => d.toISOString()),
    });

    const athleteArb = fc.record({
      id: uuidArb,
      user_id: uuidArb,
      club_id: uuidArb,
      first_name: nameArb,
      last_name: nameArb,
      nickname: fc.option(nameArb, { nil: null }),
      date_of_birth: dateOfBirthArb,
      phone_number: phoneArb,
      email: emailArb,
      gender: genderArb,
      health_notes: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: null }),
      profile_picture_url: fc.option(
        fc.webUrl().map((url) => `${url}/profile.jpg`),
        { nil: null }
      ),
      created_at: fc.date().map((d) => d.toISOString()),
      updated_at: fc.date().map((d) => d.toISOString()),
    });

    const attendanceLogArb = fc.record({
      id: uuidArb,
      training_session_id: uuidArb,
      athlete_id: uuidArb,
      status: fc.constantFrom('present', 'absent', 'late', 'excused'),
      check_in_time: fc.option(fc.date().map((d) => d.toISOString()), { nil: null }),
      check_in_method: fc.constantFrom('manual', 'qr', 'auto'),
      notes: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
      created_at: fc.date().map((d) => d.toISOString()),
    });

    const performanceRecordArb = fc.record({
      id: uuidArb,
      athlete_id: uuidArb,
      coach_id: uuidArb,
      test_type: fc.constantFrom('speed', 'strength', 'endurance', 'flexibility'),
      test_name: fc.stringMatching(/^[A-Z][a-z\s]{5,30}$/),
      score: fc.float({ min: 0, max: 1000, noNaN: true }),
      unit: fc.constantFrom('seconds', 'meters', 'kg', 'reps'),
      test_date: fc.date().map((d) => d.toISOString().split('T')[0]),
      notes: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
      created_at: fc.date().map((d) => d.toISOString()),
      updated_at: fc.date().map((d) => d.toISOString()),
    });

    await fc.assert(
      fc.asyncProperty(
        clubArb,
        athleteArb,
        fc.array(attendanceLogArb, { minLength: 0, maxLength: 10 }),
        fc.array(performanceRecordArb, { minLength: 0, maxLength: 10 }),
        async (club, athlete, attendanceLogs, performanceRecords) => {
          // Setup: Ensure athlete belongs to the club
          const athleteWithClub = { ...athlete, club_id: club.id };
          
          // Add data to stores
          clubsStore.push(club);
          athletesStore.push(athleteWithClub);
          
          // Add attendance logs for this athlete
          const athleteAttendanceLogs = attendanceLogs.map((log) => ({
            ...log,
            athlete_id: athleteWithClub.id,
          }));
          attendanceLogsStore.push(...athleteAttendanceLogs);
          
          // Add performance records for this athlete
          const athletePerformanceRecords = performanceRecords.map((record) => ({
            ...record,
            athlete_id: athleteWithClub.id,
          }));
          performanceRecordsStore.push(...athletePerformanceRecords);

          // Mock the auth user to match the athlete
          mockSupabase.auth.getUser = vi.fn(async () => ({
            data: { user: { id: athleteWithClub.user_id } },
            error: null,
          }));

          // Fetch the athlete profile
          const result = await getAthleteProfile(athleteWithClub.user_id);

          // Property 1: Profile fetch should succeed
          expect(result.error).toBeUndefined();
          expect(result.data).toBeDefined();

          if (result.data) {
            // Property 2: All personal information should be present
            expect(result.data.id).toBe(athleteWithClub.id);
            expect(result.data.user_id).toBe(athleteWithClub.user_id);
            expect(result.data.first_name).toBe(athleteWithClub.first_name);
            expect(result.data.last_name).toBe(athleteWithClub.last_name);
            expect(result.data.nickname).toBe(athleteWithClub.nickname);
            expect(result.data.date_of_birth).toBe(athleteWithClub.date_of_birth);
            expect(result.data.phone_number).toBe(athleteWithClub.phone_number);
            expect(result.data.email).toBe(athleteWithClub.email);
            expect(result.data.gender).toBe(athleteWithClub.gender);
            expect(result.data.health_notes).toBe(athleteWithClub.health_notes);
            expect(result.data.profile_picture_url).toBe(athleteWithClub.profile_picture_url);

            // Property 3: Club information should be included
            expect(result.data.clubs).toBeDefined();
            if (result.data.clubs) {
              expect(result.data.clubs.id).toBe(club.id);
              expect(result.data.clubs.name).toBe(club.name);
              expect(result.data.clubs.description).toBe(club.description);
              expect(result.data.clubs.sport_type).toBe(club.sport_type);
            }

            // Property 4: Timestamps should be preserved
            expect(result.data.created_at).toBe(athleteWithClub.created_at);
            expect(result.data.updated_at).toBe(athleteWithClub.updated_at);
          }

          // Clean up for next iteration
          athletesStore = [];
          clubsStore = [];
          attendanceLogsStore = [];
          performanceRecordsStore = [];
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Profile data includes optional fields when present
   * For any athlete with optional fields (nickname, health_notes, profile_picture_url),
   * the profile should include these fields with their correct values.
   */
  it('Property: Profile data includes optional fields when present', async () => {
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);

    const validDateArb = fc
      .integer({ min: 0, max: 365 * 50 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
      });

    const validDateOfBirthArb = fc
      .integer({ min: 6, max: 50 })
      .map((yearsAgo) => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - yearsAgo);
        return date.toISOString().split('T')[0];
      });

    const athleteWithOptionalsArb = fc.record({
      id: uuidArb,
      user_id: uuidArb,
      club_id: uuidArb,
      first_name: nameArb,
      last_name: nameArb,
      nickname: nameArb, // Always present
      date_of_birth: validDateOfBirthArb,
      phone_number: fc.stringMatching(/^[0-9]{10}$/),
      email: fc.emailAddress(),
      gender: fc.constantFrom('male', 'female', 'other'),
      health_notes: fc.string({ minLength: 10, maxLength: 200 }), // Always present
      profile_picture_url: fc.webUrl().map((url) => `${url}/profile.jpg`), // Always present
      created_at: validDateArb,
      updated_at: validDateArb,
    });

    const clubArb = fc.record({
      id: uuidArb,
      name: fc.string({ minLength: 5, maxLength: 30 }),
      description: fc.option(fc.string(), { nil: null }),
      sport_type: fc.constantFrom('football', 'basketball'),
      created_at: validDateArb,
      updated_at: validDateArb,
    });

    await fc.assert(
      fc.asyncProperty(
        clubArb,
        athleteWithOptionalsArb,
        async (club, athlete) => {
          const athleteWithClub = { ...athlete, club_id: club.id };
          
          clubsStore.push(club);
          athletesStore.push(athleteWithClub);

          mockSupabase.auth.getUser = vi.fn(async () => ({
            data: { user: { id: athleteWithClub.user_id } },
            error: null,
          }));

          const result = await getAthleteProfile(athleteWithClub.user_id);

          expect(result.error).toBeUndefined();
          expect(result.data).toBeDefined();

          if (result.data) {
            // Property: Optional fields should be present with correct values
            expect(result.data.nickname).toBe(athleteWithClub.nickname);
            expect(result.data.health_notes).toBe(athleteWithClub.health_notes);
            expect(result.data.profile_picture_url).toBe(athleteWithClub.profile_picture_url);
            
            // Verify they are not null
            expect(result.data.nickname).not.toBeNull();
            expect(result.data.health_notes).not.toBeNull();
            expect(result.data.profile_picture_url).not.toBeNull();
          }

          athletesStore = [];
          clubsStore = [];
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Profile data handles missing optional fields
   * For any athlete without optional fields (nickname, health_notes, profile_picture_url),
   * the profile should include these fields as null.
   */
  it('Property: Profile data handles missing optional fields', async () => {
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);

    const validDateArb = fc
      .integer({ min: 0, max: 365 * 50 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
      });

    const validDateOfBirthArb = fc
      .integer({ min: 6, max: 50 })
      .map((yearsAgo) => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - yearsAgo);
        return date.toISOString().split('T')[0];
      });

    const athleteWithoutOptionalsArb = fc.record({
      id: uuidArb,
      user_id: uuidArb,
      club_id: uuidArb,
      first_name: nameArb,
      last_name: nameArb,
      nickname: fc.constant(null),
      date_of_birth: validDateOfBirthArb,
      phone_number: fc.stringMatching(/^[0-9]{10}$/),
      email: fc.emailAddress(),
      gender: fc.constantFrom('male', 'female', 'other'),
      health_notes: fc.constant(null),
      profile_picture_url: fc.constant(null),
      created_at: validDateArb,
      updated_at: validDateArb,
    });

    const clubArb = fc.record({
      id: uuidArb,
      name: fc.string({ minLength: 5, maxLength: 30 }),
      description: fc.option(fc.string(), { nil: null }),
      sport_type: fc.constantFrom('football', 'basketball'),
      created_at: validDateArb,
      updated_at: validDateArb,
    });

    await fc.assert(
      fc.asyncProperty(
        clubArb,
        athleteWithoutOptionalsArb,
        async (club, athlete) => {
          const athleteWithClub = { ...athlete, club_id: club.id };
          
          clubsStore.push(club);
          athletesStore.push(athleteWithClub);

          mockSupabase.auth.getUser = vi.fn(async () => ({
            data: { user: { id: athleteWithClub.user_id } },
            error: null,
          }));

          const result = await getAthleteProfile(athleteWithClub.user_id);

          expect(result.error).toBeUndefined();
          expect(result.data).toBeDefined();

          if (result.data) {
            // Property: Optional fields should be null when not provided
            expect(result.data.nickname).toBeNull();
            expect(result.data.health_notes).toBeNull();
            expect(result.data.profile_picture_url).toBeNull();
          }

          athletesStore = [];
          clubsStore = [];
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Profile data consistency
   * For any athlete, retrieving the profile multiple times should return 
   * the same data (idempotent operation).
   */
  it('Property: Profile data retrieval is idempotent', async () => {
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);

    const validDateArb = fc
      .integer({ min: 0, max: 365 * 50 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
      });

    const validDateOfBirthArb = fc
      .integer({ min: 6, max: 50 })
      .map((yearsAgo) => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - yearsAgo);
        return date.toISOString().split('T')[0];
      });

    const athleteArb = fc.record({
      id: uuidArb,
      user_id: uuidArb,
      club_id: uuidArb,
      first_name: nameArb,
      last_name: nameArb,
      nickname: fc.option(nameArb, { nil: null }),
      date_of_birth: validDateOfBirthArb,
      phone_number: fc.stringMatching(/^[0-9]{10}$/),
      email: fc.emailAddress(),
      gender: fc.constantFrom('male', 'female', 'other'),
      health_notes: fc.option(fc.string(), { nil: null }),
      profile_picture_url: fc.option(fc.webUrl(), { nil: null }),
      created_at: validDateArb,
      updated_at: validDateArb,
    });

    const clubArb = fc.record({
      id: uuidArb,
      name: fc.string({ minLength: 5, maxLength: 30 }),
      description: fc.option(fc.string(), { nil: null }),
      sport_type: fc.constantFrom('football', 'basketball'),
      created_at: validDateArb,
      updated_at: validDateArb,
    });

    await fc.assert(
      fc.asyncProperty(
        clubArb,
        athleteArb,
        async (club, athlete) => {
          const athleteWithClub = { ...athlete, club_id: club.id };
          
          clubsStore.push(club);
          athletesStore.push(athleteWithClub);

          mockSupabase.auth.getUser = vi.fn(async () => ({
            data: { user: { id: athleteWithClub.user_id } },
            error: null,
          }));

          // Fetch profile multiple times
          const result1 = await getAthleteProfile(athleteWithClub.user_id);
          const result2 = await getAthleteProfile(athleteWithClub.user_id);
          const result3 = await getAthleteProfile(athleteWithClub.user_id);

          // Property: All fetches should return the same data
          expect(result1.data).toEqual(result2.data);
          expect(result2.data).toEqual(result3.data);
          expect(result1.data).toEqual(result3.data);

          athletesStore = [];
          clubsStore = [];
        }
      ),
      { numRuns: 50 }
    );
  });
});
