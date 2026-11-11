/**
 * Property-Based Tests for Membership Registration System
 * Feature: membership-registration
 * 
 * Properties tested:
 * 1. No duplicate applications per user+club pair (UNIQUE constraint)
 * 2. Approved applications always have athlete profile_id set
 * 3. Rejected applications always have notes in review_info
 * 4. Activity log is append-only (entries never removed, only added)
 * 5. Status transitions are valid (pending→approved/rejected, not reversed)
 * 
 * Validates: Requirements US-5, US-6, US-8
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import type { 
  MembershipApplication, 
  PersonalInfo, 
  DocumentEntry,
  ActivityLogEntry,
  ApplicationStatus
} from '@/types/database.types';

// Mock database to track applications
class MockMembershipDatabase {
  private applications: Map<string, MembershipApplication>;
  private nextId: number;

  constructor() {
    this.applications = new Map();
    this.nextId = 1;
  }

  // Generate unique key for user-club pair
  private getKey(userId: string, clubId: string): string {
    return `${userId}:${clubId}`;
  }

  // Generate unique ID
  private generateId(): string {
    return `app-${this.nextId++}`;
  }

  // Create application
  createApplication(
    userId: string,
    clubId: string,
    personalInfo: PersonalInfo,
    documents: DocumentEntry[]
  ): { success: boolean; applicationId?: string; error?: string } {
    const key = this.getKey(userId, clubId);
    
    // Check for duplicate
    if (this.applications.has(key)) {
      return { success: false, error: 'Duplicate application for user-club pair' };
    }

    const applicationId = this.generateId();
    const application: MembershipApplication = {
      id: applicationId,
      user_id: userId,
      club_id: clubId,
      personal_info: personalInfo,
      documents,
      status: 'pending',
      review_info: null,
      activity_log: [
        {
          timestamp: new Date().toISOString(),
          action: 'submitted',
          by_user: userId,
          by_role: 'athlete',
        },
      ],
      profile_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.applications.set(key, application);
    return { success: true, applicationId };
  }

  // Approve application
  approveApplication(
    applicationId: string,
    reviewedBy: string,
    notes?: string
  ): { success: boolean; error?: string } {
    const application = this.getApplicationById(applicationId);
    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    if (application.status !== 'pending') {
      return { success: false, error: 'Can only approve pending applications' };
    }

    // Update status
    application.status = 'approved';
    application.review_info = {
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      reviewer_role: 'coach',
      notes: notes || 'อนุมัติ',
    };

    // Create profile_id (simulate profile creation)
    application.profile_id = `profile-${applicationId}`;

    // Add activity log entry
    application.activity_log.push({
      timestamp: new Date().toISOString(),
      action: 'status_changed',
      by_user: reviewedBy,
      by_role: 'coach',
      from: 'pending',
      to: 'approved',
      notes: notes || 'อนุมัติ',
    });

    application.updated_at = new Date().toISOString();

    return { success: true };
  }

  // Reject application
  rejectApplication(
    applicationId: string,
    reviewedBy: string,
    notes: string
  ): { success: boolean; error?: string } {
    const application = this.getApplicationById(applicationId);
    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    if (application.status !== 'pending') {
      return { success: false, error: 'Can only reject pending applications' };
    }

    if (!notes || notes.trim() === '') {
      return { success: false, error: 'Rejection reason is required' };
    }

    // Update status
    application.status = 'rejected';
    application.review_info = {
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      reviewer_role: 'coach',
      notes,
    };

    // Add activity log entry
    application.activity_log.push({
      timestamp: new Date().toISOString(),
      action: 'status_changed',
      by_user: reviewedBy,
      by_role: 'coach',
      from: 'pending',
      to: 'rejected',
      notes,
    });

    application.updated_at = new Date().toISOString();

    return { success: true };
  }

  // Add activity log entry
  addActivityLog(
    applicationId: string,
    action: string,
    byUser: string,
    details?: Record<string, any>
  ): { success: boolean; error?: string } {
    const application = this.getApplicationById(applicationId);
    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    const logEntry: ActivityLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      by_user: byUser,
      by_role: 'athlete',
      ...details,
    };

    application.activity_log.push(logEntry);
    application.updated_at = new Date().toISOString();

    return { success: true };
  }

  // Get application by ID
  getApplicationById(applicationId: string): MembershipApplication | undefined {
    for (const app of this.applications.values()) {
      if (app.id === applicationId) {
        return app;
      }
    }
    return undefined;
  }

  // Get application by user-club pair
  getApplication(userId: string, clubId: string): MembershipApplication | undefined {
    const key = this.getKey(userId, clubId);
    return this.applications.get(key);
  }

  // Get all applications
  getAllApplications(): MembershipApplication[] {
    return Array.from(this.applications.values());
  }

  // Clear all applications
  clear(): void {
    this.applications.clear();
    this.nextId = 1;
  }

  // Get count
  count(): number {
    return this.applications.size;
  }
}

describe('Membership Registration Property-Based Tests', () => {
  let db: MockMembershipDatabase;

  beforeEach(() => {
    db = new MockMembershipDatabase();
  });

  afterEach(() => {
    db.clear();
  });

  /**
   * Property 1: No duplicate applications per user+club pair
   * For any user and club, only one application should exist.
   * Attempting to create a duplicate should fail.
   * Validates: Requirements US-6
   */
  it('Property 1: No duplicate applications per user+club pair', async () => {
    const userIdArb = fc.uuid();
    const clubIdArb = fc.uuid();
    const personalInfoArb = fc.record({
      full_name: fc.string({ minLength: 2, maxLength: 100 }),
      phone_number: fc.constantFrom('081-234-5678', '089-999-9999', '062-123-4567'),
      address: fc.string({ minLength: 10, maxLength: 500 }),
      emergency_contact: fc.constantFrom('081-111-1111', '089-888-8888'),
    });
    const documentsArb = fc.constant([
      {
        type: 'id_card' as const,
        url: 'https://example.com/id.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'id.jpg',
        file_size: 100000,
      },
      {
        type: 'house_registration' as const,
        url: 'https://example.com/house.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'house.jpg',
        file_size: 100000,
      },
      {
        type: 'birth_certificate' as const,
        url: 'https://example.com/birth.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'birth.jpg',
        file_size: 100000,
      },
    ]);

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        clubIdArb,
        personalInfoArb,
        documentsArb,
        async (userId, clubId, personalInfo, documents) => {
          // Clear database for this iteration
          db.clear();
          
          // First application should succeed
          const firstResult = db.createApplication(userId, clubId, personalInfo, documents);
          expect(firstResult.success).toBe(true);
          expect(firstResult.applicationId).toBeDefined();

          // Second application with same user-club pair should fail
          const secondResult = db.createApplication(userId, clubId, personalInfo, documents);
          expect(secondResult.success).toBe(false);
          expect(secondResult.error).toBeDefined();
          expect(secondResult.error).toContain('Duplicate');

          // Verify only one application exists
          const application = db.getApplication(userId, clubId);
          expect(application).toBeDefined();
          expect(application?.id).toBe(firstResult.applicationId);

          // Verify total count is 1
          expect(db.count()).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Approved applications always have athlete profile_id set
   * For any application that is approved, the profile_id field must be set.
   * Validates: Requirements US-5
   */
  it('Property 2: Approved applications always have athlete profile_id set', async () => {
    const userIdArb = fc.uuid();
    const clubIdArb = fc.uuid();
    const reviewerIdArb = fc.uuid();
    const personalInfoArb = fc.record({
      full_name: fc.string({ minLength: 2, maxLength: 100 }),
      phone_number: fc.constantFrom('081-234-5678', '089-999-9999', '062-123-4567'),
      address: fc.string({ minLength: 10, maxLength: 500 }),
      emergency_contact: fc.constantFrom('081-111-1111', '089-888-8888'),
    });
    const documentsArb = fc.constant([
      {
        type: 'id_card' as const,
        url: 'https://example.com/id.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'id.jpg',
        file_size: 100000,
      },
      {
        type: 'house_registration' as const,
        url: 'https://example.com/house.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'house.jpg',
        file_size: 100000,
      },
      {
        type: 'birth_certificate' as const,
        url: 'https://example.com/birth.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'birth.jpg',
        file_size: 100000,
      },
    ]);
    const notesArb = fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined });

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        clubIdArb,
        reviewerIdArb,
        personalInfoArb,
        documentsArb,
        notesArb,
        async (userId, clubId, reviewerId, personalInfo, documents, notes) => {
          // Clear database for this iteration
          db.clear();
          
          // Create application
          const createResult = db.createApplication(userId, clubId, personalInfo, documents);
          expect(createResult.success).toBe(true);
          const applicationId = createResult.applicationId!;

          // Approve application
          const approveResult = db.approveApplication(applicationId, reviewerId, notes);
          expect(approveResult.success).toBe(true);

          // Verify application is approved
          const application = db.getApplicationById(applicationId);
          expect(application).toBeDefined();
          expect(application?.status).toBe('approved');

          // Property: profile_id must be set
          expect(application?.profile_id).toBeDefined();
          expect(application?.profile_id).not.toBeNull();
          expect(typeof application?.profile_id).toBe('string');
          expect(application?.profile_id).toContain('profile-');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Rejected applications always have notes in review_info
   * For any application that is rejected, the review_info.notes field must contain
   * the rejection reason.
   * Validates: Requirements US-5
   */
  it('Property 3: Rejected applications always have notes in review_info', async () => {
    const userIdArb = fc.uuid();
    const clubIdArb = fc.uuid();
    const reviewerIdArb = fc.uuid();
    const personalInfoArb = fc.record({
      full_name: fc.string({ minLength: 2, maxLength: 100 }),
      phone_number: fc.constantFrom('081-234-5678', '089-999-9999', '062-123-4567'),
      address: fc.string({ minLength: 10, maxLength: 500 }),
      emergency_contact: fc.constantFrom('081-111-1111', '089-888-8888'),
    });
    const documentsArb = fc.constant([
      {
        type: 'id_card' as const,
        url: 'https://example.com/id.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'id.jpg',
        file_size: 100000,
      },
      {
        type: 'house_registration' as const,
        url: 'https://example.com/house.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'house.jpg',
        file_size: 100000,
      },
      {
        type: 'birth_certificate' as const,
        url: 'https://example.com/birth.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'birth.jpg',
        file_size: 100000,
      },
    ]);
    const rejectionNotesArb = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        clubIdArb,
        reviewerIdArb,
        personalInfoArb,
        documentsArb,
        rejectionNotesArb,
        async (userId, clubId, reviewerId, personalInfo, documents, rejectionNotes) => {
          // Clear database for this iteration
          db.clear();
          
          // Create application
          const createResult = db.createApplication(userId, clubId, personalInfo, documents);
          expect(createResult.success).toBe(true);
          const applicationId = createResult.applicationId!;

          // Reject application
          const rejectResult = db.rejectApplication(applicationId, reviewerId, rejectionNotes);
          expect(rejectResult.success).toBe(true);

          // Verify application is rejected
          const application = db.getApplicationById(applicationId);
          expect(application).toBeDefined();
          expect(application?.status).toBe('rejected');

          // Property: review_info must exist and contain notes
          expect(application?.review_info).toBeDefined();
          expect(application?.review_info).not.toBeNull();
          expect(application?.review_info?.notes).toBeDefined();
          expect(application?.review_info?.notes).not.toBeNull();
          expect(typeof application?.review_info?.notes).toBe('string');
          expect(application?.review_info?.notes?.length).toBeGreaterThan(0);
          expect(application?.review_info?.notes).toBe(rejectionNotes);

          // Property: profile_id should remain null for rejected applications
          expect(application?.profile_id).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Activity log is append-only (entries never removed, only added)
   * For any sequence of operations on an application, the activity log should
   * only grow, never shrink. Old entries should never be removed or modified.
   * Validates: Requirements US-8
   */
  it('Property 4: Activity log is append-only (entries never removed, only added)', async () => {
    const userIdArb = fc.uuid();
    const clubIdArb = fc.uuid();
    const reviewerIdArb = fc.uuid();
    const personalInfoArb = fc.record({
      full_name: fc.string({ minLength: 2, maxLength: 100 }),
      phone_number: fc.constantFrom('081-234-5678', '089-999-9999', '062-123-4567'),
      address: fc.string({ minLength: 10, maxLength: 500 }),
      emergency_contact: fc.constantFrom('081-111-1111', '089-888-8888'),
    });
    const documentsArb = fc.constant([
      {
        type: 'id_card' as const,
        url: 'https://example.com/id.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'id.jpg',
        file_size: 100000,
      },
      {
        type: 'house_registration' as const,
        url: 'https://example.com/house.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'house.jpg',
        file_size: 100000,
      },
      {
        type: 'birth_certificate' as const,
        url: 'https://example.com/birth.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'birth.jpg',
        file_size: 100000,
      },
    ]);
    const additionalActionsArb = fc.array(
      fc.record({
        action: fc.constantFrom('comment_added', 'document_updated', 'info_requested'),
        byUser: fc.uuid(),
      }),
      { minLength: 1, maxLength: 10 }
    );

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        clubIdArb,
        reviewerIdArb,
        personalInfoArb,
        documentsArb,
        additionalActionsArb,
        async (userId, clubId, reviewerId, personalInfo, documents, additionalActions) => {
          // Clear database for this iteration
          db.clear();
          
          // Create application
          const createResult = db.createApplication(userId, clubId, personalInfo, documents);
          expect(createResult.success).toBe(true);
          const applicationId = createResult.applicationId!;

          // Get initial activity log
          let application = db.getApplicationById(applicationId);
          expect(application).toBeDefined();
          const initialLogLength = application!.activity_log.length;
          expect(initialLogLength).toBe(1); // Should have 'submitted' entry

          // Store initial log entries for comparison
          const initialLog = [...application!.activity_log];

          // Perform additional actions
          for (const action of additionalActions) {
            const addResult = db.addActivityLog(applicationId, action.action, action.byUser);
            expect(addResult.success).toBe(true);

            // Verify log grew
            application = db.getApplicationById(applicationId);
            expect(application).toBeDefined();
            const currentLogLength = application!.activity_log.length;
            expect(currentLogLength).toBeGreaterThan(initialLogLength);

            // Property: Old entries should remain unchanged
            for (let i = 0; i < initialLog.length; i++) {
              expect(application!.activity_log[i]).toEqual(initialLog[i]);
            }
          }

          // Final verification
          application = db.getApplicationById(applicationId);
          const finalLogLength = application!.activity_log.length;

          // Property: Log should have grown by exactly the number of actions
          expect(finalLogLength).toBe(initialLogLength + additionalActions.length);

          // Property: All initial entries should still be present and unchanged
          for (let i = 0; i < initialLog.length; i++) {
            expect(application!.activity_log[i]).toEqual(initialLog[i]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Status transitions are valid (pending→approved/rejected, not reversed)
   * For any application, status transitions should follow valid paths:
   * - pending → approved (valid)
   * - pending → rejected (valid)
   * - approved → rejected (invalid)
   * - rejected → approved (invalid)
   * - approved → pending (invalid)
   * - rejected → pending (invalid)
   * Validates: Requirements US-8
   */
  it('Property 5: Status transitions are valid (pending→approved/rejected, not reversed)', async () => {
    const userIdArb = fc.uuid();
    const clubIdArb = fc.uuid();
    const reviewerIdArb = fc.uuid();
    const personalInfoArb = fc.record({
      full_name: fc.string({ minLength: 2, maxLength: 100 }),
      phone_number: fc.constantFrom('081-234-5678', '089-999-9999', '062-123-4567'),
      address: fc.string({ minLength: 10, maxLength: 500 }),
      emergency_contact: fc.constantFrom('081-111-1111', '089-888-8888'),
    });
    const documentsArb = fc.constant([
      {
        type: 'id_card' as const,
        url: 'https://example.com/id.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'id.jpg',
        file_size: 100000,
      },
      {
        type: 'house_registration' as const,
        url: 'https://example.com/house.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'house.jpg',
        file_size: 100000,
      },
      {
        type: 'birth_certificate' as const,
        url: 'https://example.com/birth.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'birth.jpg',
        file_size: 100000,
      },
    ]);
    const firstActionArb = fc.constantFrom('approve', 'reject');

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        clubIdArb,
        reviewerIdArb,
        personalInfoArb,
        documentsArb,
        firstActionArb,
        async (userId, clubId, reviewerId, personalInfo, documents, firstAction) => {
          // Clear database for this iteration
          db.clear();
          
          // Create application
          const createResult = db.createApplication(userId, clubId, personalInfo, documents);
          expect(createResult.success).toBe(true);
          const applicationId = createResult.applicationId!;

          // Verify initial status is pending
          let application = db.getApplicationById(applicationId);
          expect(application?.status).toBe('pending');

          // Perform first action (approve or reject)
          if (firstAction === 'approve') {
            const approveResult = db.approveApplication(applicationId, reviewerId, 'อนุมัติ');
            expect(approveResult.success).toBe(true);

            application = db.getApplicationById(applicationId);
            expect(application?.status).toBe('approved');

            // Property: Cannot reject after approval
            const rejectResult = db.rejectApplication(applicationId, reviewerId, 'ปฏิเสธ');
            expect(rejectResult.success).toBe(false);
            expect(rejectResult.error).toContain('pending');

            // Verify status remains approved
            application = db.getApplicationById(applicationId);
            expect(application?.status).toBe('approved');
          } else {
            const rejectResult = db.rejectApplication(applicationId, reviewerId, 'ปฏิเสธ');
            expect(rejectResult.success).toBe(true);

            application = db.getApplicationById(applicationId);
            expect(application?.status).toBe('rejected');

            // Property: Cannot approve after rejection
            const approveResult = db.approveApplication(applicationId, reviewerId, 'อนุมัติ');
            expect(approveResult.success).toBe(false);
            expect(approveResult.error).toContain('pending');

            // Verify status remains rejected
            application = db.getApplicationById(applicationId);
            expect(application?.status).toBe('rejected');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Property: Same user can apply to different clubs
   * A user should be able to submit applications to multiple different clubs.
   */
  it('Additional Property: Same user can apply to different clubs', async () => {
    const userIdArb = fc.uuid();
    const clubIdsArb = fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 10 });
    const personalInfoArb = fc.record({
      full_name: fc.string({ minLength: 2, maxLength: 100 }),
      phone_number: fc.constantFrom('081-234-5678', '089-999-9999', '062-123-4567'),
      address: fc.string({ minLength: 10, maxLength: 500 }),
      emergency_contact: fc.constantFrom('081-111-1111', '089-888-8888'),
    });
    const documentsArb = fc.constant([
      {
        type: 'id_card' as const,
        url: 'https://example.com/id.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'id.jpg',
        file_size: 100000,
      },
      {
        type: 'house_registration' as const,
        url: 'https://example.com/house.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'house.jpg',
        file_size: 100000,
      },
      {
        type: 'birth_certificate' as const,
        url: 'https://example.com/birth.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'birth.jpg',
        file_size: 100000,
      },
    ]);

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        clubIdsArb,
        personalInfoArb,
        documentsArb,
        async (userId, clubIds, personalInfo, documents) => {
          // Clear database for this iteration
          db.clear();
          
          // User should be able to apply to all clubs
          for (const clubId of clubIds) {
            const result = db.createApplication(userId, clubId, personalInfo, documents);
            expect(result.success).toBe(true);
          }

          // Verify all applications were created
          const allApplications = db.getAllApplications();
          expect(allApplications.length).toBe(clubIds.length);

          // Verify each club has exactly one application from this user
          for (const clubId of clubIds) {
            const application = db.getApplication(userId, clubId);
            expect(application).toBeDefined();
            expect(application?.user_id).toBe(userId);
            expect(application?.club_id).toBe(clubId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Property: Different users can apply to same club
   * Multiple different users should be able to apply to the same club.
   */
  it('Additional Property: Different users can apply to same club', async () => {
    const userIdsArb = fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 10 });
    const clubIdArb = fc.uuid();
    const personalInfoArb = fc.record({
      full_name: fc.string({ minLength: 2, maxLength: 100 }),
      phone_number: fc.constantFrom('081-234-5678', '089-999-9999', '062-123-4567'),
      address: fc.string({ minLength: 10, maxLength: 500 }),
      emergency_contact: fc.constantFrom('081-111-1111', '089-888-8888'),
    });
    const documentsArb = fc.constant([
      {
        type: 'id_card' as const,
        url: 'https://example.com/id.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'id.jpg',
        file_size: 100000,
      },
      {
        type: 'house_registration' as const,
        url: 'https://example.com/house.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'house.jpg',
        file_size: 100000,
      },
      {
        type: 'birth_certificate' as const,
        url: 'https://example.com/birth.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'birth.jpg',
        file_size: 100000,
      },
    ]);

    await fc.assert(
      fc.asyncProperty(
        userIdsArb,
        clubIdArb,
        personalInfoArb,
        documentsArb,
        async (userIds, clubId, personalInfo, documents) => {
          // Clear database for this iteration
          db.clear();
          
          // All users should be able to apply to the same club
          for (const userId of userIds) {
            const result = db.createApplication(userId, clubId, personalInfo, documents);
            expect(result.success).toBe(true);
          }

          // Verify all applications were created
          const allApplications = db.getAllApplications();
          expect(allApplications.length).toBe(userIds.length);

          // Verify each user has exactly one application for this club
          for (const userId of userIds) {
            const application = db.getApplication(userId, clubId);
            expect(application).toBeDefined();
            expect(application?.user_id).toBe(userId);
            expect(application?.club_id).toBe(clubId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Property: Rejection requires non-empty notes
   * For any rejection attempt, notes must be provided and non-empty.
   */
  it('Additional Property: Rejection requires non-empty notes', async () => {
    const userIdArb = fc.uuid();
    const clubIdArb = fc.uuid();
    const reviewerIdArb = fc.uuid();
    const personalInfoArb = fc.record({
      full_name: fc.string({ minLength: 2, maxLength: 100 }),
      phone_number: fc.constantFrom('081-234-5678', '089-999-9999', '062-123-4567'),
      address: fc.string({ minLength: 10, maxLength: 500 }),
      emergency_contact: fc.constantFrom('081-111-1111', '089-888-8888'),
    });
    const documentsArb = fc.constant([
      {
        type: 'id_card' as const,
        url: 'https://example.com/id.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'id.jpg',
        file_size: 100000,
      },
      {
        type: 'house_registration' as const,
        url: 'https://example.com/house.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'house.jpg',
        file_size: 100000,
      },
      {
        type: 'birth_certificate' as const,
        url: 'https://example.com/birth.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'birth.jpg',
        file_size: 100000,
      },
    ]);
    const emptyNotesArb = fc.constantFrom('', '   ', '\t', '\n');

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        clubIdArb,
        reviewerIdArb,
        personalInfoArb,
        documentsArb,
        emptyNotesArb,
        async (userId, clubId, reviewerId, personalInfo, documents, emptyNotes) => {
          // Clear database for this iteration
          db.clear();
          
          // Create application
          const createResult = db.createApplication(userId, clubId, personalInfo, documents);
          expect(createResult.success).toBe(true);
          const applicationId = createResult.applicationId!;

          // Attempt to reject with empty notes
          const rejectResult = db.rejectApplication(applicationId, reviewerId, emptyNotes);

          // Property: Rejection should fail
          expect(rejectResult.success).toBe(false);
          expect(rejectResult.error).toBeDefined();
          expect(rejectResult.error).toContain('required');

          // Verify status remains pending
          const application = db.getApplicationById(applicationId);
          expect(application?.status).toBe('pending');
          expect(application?.review_info).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Property: Activity log records all status changes
   * For any status change, an activity log entry should be created with
   * the correct from/to status values.
   */
  it('Additional Property: Activity log records all status changes', async () => {
    const userIdArb = fc.uuid();
    const clubIdArb = fc.uuid();
    const reviewerIdArb = fc.uuid();
    const personalInfoArb = fc.record({
      full_name: fc.string({ minLength: 2, maxLength: 100 }),
      phone_number: fc.constantFrom('081-234-5678', '089-999-9999', '062-123-4567'),
      address: fc.string({ minLength: 10, maxLength: 500 }),
      emergency_contact: fc.constantFrom('081-111-1111', '089-888-8888'),
    });
    const documentsArb = fc.constant([
      {
        type: 'id_card' as const,
        url: 'https://example.com/id.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'id.jpg',
        file_size: 100000,
      },
      {
        type: 'house_registration' as const,
        url: 'https://example.com/house.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'house.jpg',
        file_size: 100000,
      },
      {
        type: 'birth_certificate' as const,
        url: 'https://example.com/birth.jpg',
        uploaded_at: new Date().toISOString(),
        file_name: 'birth.jpg',
        file_size: 100000,
      },
    ]);
    const actionArb = fc.constantFrom('approve', 'reject');

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        clubIdArb,
        reviewerIdArb,
        personalInfoArb,
        documentsArb,
        actionArb,
        async (userId, clubId, reviewerId, personalInfo, documents, action) => {
          // Clear database for this iteration
          db.clear();
          
          // Create application
          const createResult = db.createApplication(userId, clubId, personalInfo, documents);
          expect(createResult.success).toBe(true);
          const applicationId = createResult.applicationId!;

          // Get initial log length
          let application = db.getApplicationById(applicationId);
          const initialLogLength = application!.activity_log.length;

          // Perform action
          if (action === 'approve') {
            db.approveApplication(applicationId, reviewerId, 'อนุมัติ');
          } else {
            db.rejectApplication(applicationId, reviewerId, 'ปฏิเสธ');
          }

          // Verify activity log was updated
          application = db.getApplicationById(applicationId);
          expect(application!.activity_log.length).toBe(initialLogLength + 1);

          // Find the status change entry
          const statusChangeEntry = application!.activity_log.find(
            (entry) => entry.action === 'status_changed'
          );

          // Property: Status change entry should exist
          expect(statusChangeEntry).toBeDefined();
          expect(statusChangeEntry?.from).toBe('pending');
          expect(statusChangeEntry?.to).toBe(action === 'approve' ? 'approved' : 'rejected');
          expect(statusChangeEntry?.by_user).toBe(reviewerId);
          expect(statusChangeEntry?.timestamp).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
