/**
 * Property-Based Tests for Profile Updates
 * Feature: sports-club-management
 * 
 * Property 10: Profile update persistence
 * Property 11: Profile picture storage and retrieval
 * Property 13: Club assignment modification prevention
 * Validates: Requirements 3.1, 3.2, 3.4
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

let storageStore: Map<string, { data: Blob; metadata: any }> = new Map();

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
        select: vi.fn(() => ({
          eq: vi.fn((column: string, value: unknown) => ({
            maybeSingle: vi.fn(async () => {
              const athlete = athletesStore.find(
                (a) => a[column as keyof typeof a] === value
              );
              if (!athlete) {
                return { data: null, error: { message: 'Not found' } };
              }
              return { data: athlete, error: null };
            }),
            single: vi.fn(async () => {
              const athlete = athletesStore.find(
                (a) => a[column as keyof typeof a] === value
              );
              if (!athlete) {
                return { data: null, error: { message: 'Not found' } };
              }
              return { data: athlete, error: null };
            }),
          })),
        })),
        update: vi.fn((updateData: any) => ({
          eq: vi.fn((column: string, value: unknown) => {
            const athleteIndex = athletesStore.findIndex(
              (a) => a[column as keyof typeof a] === value
            );
            if (athleteIndex !== -1) {
              athletesStore[athleteIndex] = {
                ...athletesStore[athleteIndex],
                ...updateData,
                updated_at: new Date().toISOString(),
              };
              return Promise.resolve({ error: null });
            }
            return Promise.resolve({ error: { message: 'Not found' } });
          }),
        })),
      };
    }
    return {};
  }),
  storage: {
    from: vi.fn((bucket: string) => ({
      upload: vi.fn(async (path: string, file: File, options: any) => {
        // Simulate file upload
        storageStore.set(path, {
          data: file,
          metadata: { contentType: file.type, size: file.size },
        });
        return { error: null };
      }),
      getPublicUrl: vi.fn((path: string) => ({
        data: { publicUrl: `https://storage.example.com/${bucket}/${path}` },
      })),
    })),
  },
};

// Mock the Supabase server module
vi.mock('@/lib/db/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

// Mock audit logging
vi.mock('@/lib/audit/actions', () => ({
  createAuditLog: vi.fn(async () => ({ success: true })),
}));

// Mock Next.js cache revalidation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocking
const { updateAthleteProfile, getAthleteProfile } = await import('@/lib/athlete/actions');

describe('Profile Updates Property-Based Tests', () => {
  beforeEach(() => {
    athletesStore = [];
    storageStore.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    athletesStore = [];
    storageStore.clear();
  });

  /**
   * Property 10: Profile update persistence
   * For any athlete and any valid profile update data, updating personal information 
   * should persist the changes and reflect them in subsequent profile retrievals.
   * Validates: Requirements 3.1
   */
  it('Property 10: Profile update persistence', async () => {
    // Custom arbitraries
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);
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

    const athleteArb = fc.record({
      id: uuidArb,
      user_id: uuidArb,
      club_id: uuidArb,
      first_name: nameArb,
      last_name: nameArb,
      nickname: fc.option(nameArb, { nil: null }),
      date_of_birth: dateOfBirthArb,
      phone_number: phoneArb,
      email: fc.emailAddress(),
      gender: fc.constantFrom('male', 'female', 'other'),
      health_notes: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: null }),
      profile_picture_url: fc.option(fc.webUrl(), { nil: null }),
      created_at: fc.date().map((d) => d.toISOString()),
      updated_at: fc.date().map((d) => d.toISOString()),
    });

    const updateDataArb = fc.record({
      nickname: fc.option(nameArb, { nil: null }),
      phone_number: phoneArb,
      health_notes: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: null }),
    });

    await fc.assert(
      fc.asyncProperty(
        athleteArb,
        updateDataArb,
        async (athlete, updateData) => {
          // Setup: Add athlete to store
          athletesStore.push(athlete);

          // Mock auth to match the athlete
          mockSupabase.auth.getUser = vi.fn(async () => ({
            data: { user: { id: athlete.user_id } },
            error: null,
          }));

          // Create FormData with update values
          const formData = new FormData();
          if (updateData.nickname) {
            formData.append('nickname', updateData.nickname);
          }
          formData.append('phone_number', updateData.phone_number);
          if (updateData.health_notes) {
            formData.append('health_notes', updateData.health_notes);
          }

          // Perform update
          const updateResult = await updateAthleteProfile(athlete.id, formData);

          // Property 1: Update should succeed
          expect(updateResult.error).toBeUndefined();
          expect(updateResult.success).toBe(true);

          // Property 2: Retrieve profile and verify changes persisted
          const profileResult = await getAthleteProfile(athlete.user_id);
          expect(profileResult.error).toBeUndefined();
          expect(profileResult.data).toBeDefined();

          if (profileResult.data) {
            // Property 3: Updated fields should match
            expect(profileResult.data.nickname).toBe(updateData.nickname);
            expect(profileResult.data.phone_number).toBe(updateData.phone_number);
            expect(profileResult.data.health_notes).toBe(updateData.health_notes);

            // Property 4: Non-updated fields should remain unchanged
            expect(profileResult.data.first_name).toBe(athlete.first_name);
            expect(profileResult.data.last_name).toBe(athlete.last_name);
            expect(profileResult.data.email).toBe(athlete.email);
            expect(profileResult.data.date_of_birth).toBe(athlete.date_of_birth);
            expect(profileResult.data.gender).toBe(athlete.gender);
            expect(profileResult.data.club_id).toBe(athlete.club_id);
          }

          // Clean up
          athletesStore = [];
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Profile picture storage and retrieval
   * For any valid image file uploaded as a profile picture, the system should 
   * store the image and return the correct image URL when the profile is retrieved.
   * Validates: Requirements 3.2
   */
  it('Property 11: Profile picture storage and retrieval', async () => {
    // Custom arbitraries
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);
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

    const validDateArb = fc
      .integer({ min: 0, max: 365 * 50 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
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
      email: fc.emailAddress(),
      gender: fc.constantFrom('male', 'female', 'other'),
      health_notes: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: null }),
      profile_picture_url: fc.constant(null), // Start with no profile picture
      created_at: validDateArb,
      updated_at: validDateArb,
    });

    // Generate image file data
    const imageFileArb = fc.record({
      name: fc.constantFrom('profile.jpg', 'avatar.png', 'photo.jpeg'),
      type: fc.constantFrom('image/jpeg', 'image/png', 'image/jpg'),
      size: fc.integer({ min: 1024, max: 5 * 1024 * 1024 }), // 1KB to 5MB
    });

    await fc.assert(
      fc.asyncProperty(
        athleteArb,
        imageFileArb,
        async (athlete, imageFileData) => {
          // Setup: Add athlete to store
          athletesStore.push(athlete);

          // Mock auth to match the athlete
          mockSupabase.auth.getUser = vi.fn(async () => ({
            data: { user: { id: athlete.user_id } },
            error: null,
          }));

          // Create a mock File object
          const fileContent = new Uint8Array(imageFileData.size);
          const blob = new Blob([fileContent], { type: imageFileData.type });
          const file = new File([blob], imageFileData.name, { type: imageFileData.type });

          // Create FormData with profile picture
          const formData = new FormData();
          formData.append('nickname', athlete.nickname || '');
          formData.append('phone_number', athlete.phone_number);
          formData.append('health_notes', athlete.health_notes || '');
          formData.append('profile_picture', file);

          // Perform update
          const updateResult = await updateAthleteProfile(athlete.id, formData);

          // Property 1: Update should succeed
          expect(updateResult.error).toBeUndefined();
          expect(updateResult.success).toBe(true);

          // Property 2: Profile picture should be stored
          expect(storageStore.size).toBeGreaterThan(0);

          // Property 3: Retrieve profile and verify picture URL is set
          const profileResult = await getAthleteProfile(athlete.user_id);
          expect(profileResult.error).toBeUndefined();
          expect(profileResult.data).toBeDefined();

          if (profileResult.data) {
            // Property 4: Profile picture URL should be present and valid
            expect(profileResult.data.profile_picture_url).toBeDefined();
            expect(profileResult.data.profile_picture_url).not.toBeNull();
            expect(profileResult.data.profile_picture_url).toContain('https://');
            expect(profileResult.data.profile_picture_url).toContain('storage.example.com');
            expect(profileResult.data.profile_picture_url).toContain('avatars');
            expect(profileResult.data.profile_picture_url).toContain('profile-pictures');
          }

          // Clean up
          athletesStore = [];
          storageStore.clear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13: Club assignment modification prevention
   * For any athlete attempting to modify their club assignment, the system should 
   * reject the modification and require admin or coach approval.
   * Validates: Requirements 3.4
   */
  it('Property 13: Club assignment modification prevention', async () => {
    // Custom arbitraries
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);
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

    const validDateArb = fc
      .integer({ min: 0, max: 365 * 50 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
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
      email: fc.emailAddress(),
      gender: fc.constantFrom('male', 'female', 'other'),
      health_notes: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: null }),
      profile_picture_url: fc.option(fc.webUrl(), { nil: null }),
      created_at: validDateArb,
      updated_at: validDateArb,
    });

    await fc.assert(
      fc.asyncProperty(
        athleteArb,
        uuidArb, // Different club ID to attempt modification
        async (athlete, newClubId) => {
          // Precondition: Ensure the new club ID is different from current
          fc.pre(newClubId !== athlete.club_id);

          // Setup: Add athlete to store
          const originalClubId = athlete.club_id;
          athletesStore.push(athlete);

          // Mock auth to match the athlete
          mockSupabase.auth.getUser = vi.fn(async () => ({
            data: { user: { id: athlete.user_id } },
            error: null,
          }));

          // Create FormData attempting to change club_id
          // Note: The updateAthleteProfile function should NOT accept club_id
          const formData = new FormData();
          formData.append('nickname', athlete.nickname || 'Test');
          formData.append('phone_number', athlete.phone_number);
          formData.append('health_notes', athlete.health_notes || '');
          // Attempt to sneak in club_id (should be ignored)
          formData.append('club_id', newClubId);

          // Perform update
          const updateResult = await updateAthleteProfile(athlete.id, formData);

          // Property 1: Update should succeed (but club_id should be ignored)
          expect(updateResult.error).toBeUndefined();
          expect(updateResult.success).toBe(true);

          // Property 2: Retrieve profile and verify club_id unchanged
          const profileResult = await getAthleteProfile(athlete.user_id);
          expect(profileResult.error).toBeUndefined();
          expect(profileResult.data).toBeDefined();

          if (profileResult.data) {
            // Property 3: Club ID should remain unchanged
            expect(profileResult.data.club_id).toBe(originalClubId);
            expect(profileResult.data.club_id).not.toBe(newClubId);
          }

          // Property 4: Verify in store that club_id was not modified
          const athleteInStore = athletesStore.find((a) => a.id === athlete.id);
          expect(athleteInStore).toBeDefined();
          if (athleteInStore) {
            expect(athleteInStore.club_id).toBe(originalClubId);
            expect(athleteInStore.club_id).not.toBe(newClubId);
          }

          // Clean up
          athletesStore = [];
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Profile update validates phone number format
   * For any invalid phone number format, the update should fail with appropriate error.
   */
  it('Property: Profile update validates phone number format', async () => {
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);
    const validPhoneArb = fc
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

    const athleteArb = fc.record({
      id: uuidArb,
      user_id: uuidArb,
      club_id: uuidArb,
      first_name: nameArb,
      last_name: nameArb,
      nickname: fc.option(nameArb, { nil: null }),
      date_of_birth: dateOfBirthArb,
      phone_number: validPhoneArb,
      email: fc.emailAddress(),
      gender: fc.constantFrom('male', 'female', 'other'),
      health_notes: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: null }),
      profile_picture_url: fc.option(fc.webUrl(), { nil: null }),
      created_at: fc.date().map((d) => d.toISOString()),
      updated_at: fc.date().map((d) => d.toISOString()),
    });

    // Generate invalid phone numbers
    const invalidPhoneArb = fc.oneof(
      fc.constant(''), // Empty
      fc.constant('123'), // Too short
      fc.constant('12345678901234'), // Too long
      fc.stringMatching(/^[a-zA-Z]{10}$/), // Letters
      fc.stringMatching(/^[!@#$%^&*()]{10}$/), // Special chars
    );

    await fc.assert(
      fc.asyncProperty(
        athleteArb,
        invalidPhoneArb,
        async (athlete, invalidPhone) => {
          // Setup: Add athlete to store
          const originalPhone = athlete.phone_number;
          athletesStore.push(athlete);

          // Mock auth to match the athlete
          mockSupabase.auth.getUser = vi.fn(async () => ({
            data: { user: { id: athlete.user_id } },
            error: null,
          }));

          // Create FormData with invalid phone
          const formData = new FormData();
          formData.append('nickname', athlete.nickname || '');
          formData.append('phone_number', invalidPhone);
          formData.append('health_notes', athlete.health_notes || '');

          // Perform update
          const updateResult = await updateAthleteProfile(athlete.id, formData);

          // Property 1: Update should fail for invalid phone
          if (invalidPhone === '') {
            expect(updateResult.error).toBeDefined();
            expect(updateResult.error).toContain('เบอร์โทรศัพท์');
          } else {
            expect(updateResult.error).toBeDefined();
            expect(updateResult.error).toContain('รูปแบบเบอร์โทรศัพท์');
          }

          // Property 2: Phone number should remain unchanged
          const athleteInStore = athletesStore.find((a) => a.id === athlete.id);
          expect(athleteInStore).toBeDefined();
          if (athleteInStore) {
            expect(athleteInStore.phone_number).toBe(originalPhone);
          }

          // Clean up
          athletesStore = [];
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Profile update rejects oversized images
   * For any image file larger than 5MB, the update should fail with appropriate error.
   */
  it('Property: Profile update rejects oversized images', async () => {
    const uuidArb = fc.uuid().map((id) => `uuid-${id}`);
    const nameArb = fc.stringMatching(/^[A-Z][a-z]{2,15}$/);
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

    const validDateArb = fc
      .integer({ min: 0, max: 365 * 50 })
      .map((daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
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
      email: fc.emailAddress(),
      gender: fc.constantFrom('male', 'female', 'other'),
      health_notes: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: null }),
      profile_picture_url: fc.constant(null),
      created_at: validDateArb,
      updated_at: validDateArb,
    });

    // Generate oversized image file (> 5MB)
    const oversizedImageArb = fc.record({
      name: fc.constantFrom('large.jpg', 'huge.png'),
      type: fc.constantFrom('image/jpeg', 'image/png'),
      size: fc.integer({ min: 5 * 1024 * 1024 + 1, max: 10 * 1024 * 1024 }), // > 5MB
    });

    await fc.assert(
      fc.asyncProperty(
        athleteArb,
        oversizedImageArb,
        async (athlete, imageFileData) => {
          // Setup: Add athlete to store
          athletesStore.push(athlete);

          // Mock auth to match the athlete
          mockSupabase.auth.getUser = vi.fn(async () => ({
            data: { user: { id: athlete.user_id } },
            error: null,
          }));

          // Create a mock oversized File object
          const fileContent = new Uint8Array(imageFileData.size);
          const blob = new Blob([fileContent], { type: imageFileData.type });
          const file = new File([blob], imageFileData.name, { type: imageFileData.type });

          // Create FormData with oversized profile picture
          const formData = new FormData();
          formData.append('nickname', athlete.nickname || '');
          formData.append('phone_number', athlete.phone_number);
          formData.append('health_notes', athlete.health_notes || '');
          formData.append('profile_picture', file);

          // Perform update
          const updateResult = await updateAthleteProfile(athlete.id, formData);

          // Property 1: Update should fail with size error
          expect(updateResult.error).toBeDefined();
          expect(updateResult.error).toContain('5MB');

          // Property 2: Profile picture should not be stored
          expect(storageStore.size).toBe(0);

          // Property 3: Profile picture URL should remain null
          const athleteInStore = athletesStore.find((a) => a.id === athlete.id);
          expect(athleteInStore).toBeDefined();
          if (athleteInStore) {
            expect(athleteInStore.profile_picture_url).toBeNull();
          }

          // Clean up
          athletesStore = [];
          storageStore.clear();
        }
      ),
      { numRuns: 100 }
    );
  });
});
