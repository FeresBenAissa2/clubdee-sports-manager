'use server';

/**
 * Membership Application Server Actions
 * 
 * This module provides server-side actions for the membership registration system.
 * All actions include proper authentication, authorization, validation, and error handling.
 * 
 * Actions:
 * - submitApplication(data): Submit new membership application (US-1, US-8)
 * - reviewApplication(applicationId, action, reason): Review application (US-3, US-5)
 * - createAthleteProfile(application): Create athlete profile from approved application (US-5)
 * 
 * Security:
 * - All actions verify authentication
 * - Input validation with Zod schemas
 * - RLS policies enforced at database level
 * - Activity logging for audit trail
 */

import { createClient } from '@/lib/db/server';
import { 
  applicationSubmissionSchema, 
  type ApplicationSubmissionInput 
} from './validation';
import type { MembershipApplication, PersonalInfo } from '@/types/database.types';
import { validateClubSelection } from './queries';

/**
 * Submit a new membership application
 * 
 * Validates: Requirements US-1, US-8, AC1, AC6
 * 
 * Process:
 * 1. Validate input with Zod schemas
 * 2. Verify authentication
 * 3. Validate club selection (club exists and has coaches)
 * 4. Check for duplicate application (UNIQUE constraint on user_id + club_id)
 * 5. Create application record with JSONB data structure
 * 6. Update profile membership_status to 'pending' (AC6)
 * 7. Add initial activity log entry via add_activity_log() function
 * 8. Return success with application ID
 * 
 * @param data - Application submission data (club_id, personal_info, documents)
 * @returns { success: boolean, applicationId?: string, error?: string }
 */
export async function submitApplication(
  data: ApplicationSubmissionInput
): Promise<{ success: boolean; applicationId?: string; error?: string }> {
  try {
    // Step 1: Validate input with Zod schema
    const validationResult = applicationSubmissionSchema.safeParse(data);
    
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0];
      return { 
        success: false, 
        error: firstError || 'Invalid data' 
      };
    }

    const validatedData = validationResult.data;

    // Step 2: Verify authentication
    const db = await createClient();
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { 
        success: false, 
        error: 'Unauthorized: please sign in' 
      };
    }

    // Step 3: Validate club selection
    // Validates: Requirements AC1 (Club-Based Application)
    const clubValidation = await validateClubSelection(validatedData.club_id);
    
    if (!clubValidation.valid) {
      return {
        success: false,
        error: clubValidation.error || 'Invalid sport selection'
      };
    }

    // Step 4: Check for duplicate pending application (direct query — no RPC required)
    const { data: pendingApps, error: checkError } = await db
      .from('membership_applications')
      .select('id, club_id, created_at, clubs(name)')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1);

    if (checkError) {
      console.error('Error checking for duplicate application:', checkError);
      return {
        success: false,
        error: 'Error checking existing applications',
      };
    }

    if (pendingApps && pendingApps.length > 0) {
      const pendingApp = pendingApps[0] as any;
      const clubName = pendingApp.clubs?.name || 'another club';
      return {
        success: false,
        error: `You already have a pending application for ${clubName}. Please wait for a decision before applying again.`,
      };
    }

    // Step 5: Create application record with JSONB data structure
    const insertData = {
      user_id: user.id,
      club_id: validatedData.club_id,
      personal_info: validatedData.personal_info as any,
      documents: validatedData.documents as any,
      status: 'pending' as const,
      activity_log: [] as any, // Will be populated by trigger/function
    };

    const { data: newApplication, error: insertError } = await (db
      .from('membership_applications') as any)
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating application:', insertError);
      
      // Handle UNIQUE constraint violation
      if (insertError.code === '23505') {
        return { 
          success: false, 
          error: 'You already have an application for this sport' 
        };
      }

      return { 
        success: false, 
        error: 'Could not create application' 
      };
    }

    if (!newApplication) {
      return { 
        success: false, 
        error: 'Could not create application' 
      };
    }

    // Step 6: Update profile membership_status to 'pending'
    // Business Rule AC6: Pending State Restrictions
    const { error: profileUpdateError } = await (db
      .from('profiles') as any)
      .update({ membership_status: 'pending' })
      .eq('id', user.id);

    if (profileUpdateError) {
      console.error('Error updating profile membership_status:', profileUpdateError);
      // Don't fail the entire operation - application was created successfully
      // The profile status can be updated later if needed
    }

    // Step 7: Activity log (prefer RPC; fall back to direct JSONB update)
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'submitted',
      by_user: user.id,
      by_role: 'athlete',
      club_id: validatedData.club_id,
    };
    const { error: logRpcError } = await db.rpc('add_activity_log', {
      p_application_id: (newApplication as any).id,
      p_action: 'submitted',
      p_by_user: user.id,
      p_details: { club_id: validatedData.club_id } as any,
    } as any);

    if (logRpcError) {
      await (db.from('membership_applications') as any)
        .update({ activity_log: [logEntry] })
        .eq('id', (newApplication as any).id);
    }

    // Step 8: Return success with application ID
    return { 
      success: true, 
      applicationId: (newApplication as any).id 
    };

  } catch (error) {
    console.error('Unexpected error in submitApplication:', error);
    return { 
      success: false, 
      error: 'An unexpected error occurred' 
    };
  }
}

/**
 * Review a membership application (approve or reject)
 * 
 * Validates: Requirements US-3, US-5
 * 
 * Process:
 * 1. Verify authentication
 * 2. Verify coach/admin permission (check club_id match or admin role)
 * 3. Validate action and reason (reason required for rejection)
 * 4. Call update_application_status() database helper function
 * 5. If approved: call createAthleteProfile() to create athlete record
 * 6. Activity log entry added automatically via database function
 * 7. Return success/error with appropriate messages
 * 
 * @param applicationId - UUID of the application to review
 * @param action - 'approve' or 'reject'
 * @param reason - Optional reason for rejection (required if action is 'reject')
 * @returns { success: boolean, error?: string, profileId?: string }
 */
export async function reviewApplication(
  applicationId: string,
  action: 'approve' | 'reject',
  reason?: string
): Promise<{ success: boolean; error?: string; profileId?: string }> {
  try {
    // Step 1: Verify authentication
    const db = await createClient();
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { 
        success: false, 
        error: 'Unauthorized: please sign in' 
      };
    }

    // Step 2: Get application details and verify permission
    const { data: application, error: fetchError } = await db
      .from('membership_applications')
      .select('*, clubs(name, sport_type)')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      console.error('Error fetching application:', fetchError);
      return { 
        success: false, 
        error: 'Application not found' 
      };
    }

    // Check if user is coach for this club or admin
    const { data: coachRecord } = await db
      .from('coaches')
      .select('id')
      .eq('user_id', user.id)
      .eq('club_id', (application as any).club_id)
      .maybeSingle();

    const { data: adminRecord } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const isCoach = !!coachRecord;
    const isAdmin = !!adminRecord;

    if (!isCoach && !isAdmin) {
      return { 
        success: false, 
        error: 'You cannot review this application' 
      };
    }

    // Step 3: Validate action and reason
    if (action === 'reject' && !reason) {
      return { 
        success: false, 
        error: 'Please provide a rejection reason' 
      };
    }

    // Check if application is already processed
    const currentStatus = (application as any).status as string;
    if (currentStatus !== 'pending' && currentStatus !== 'info_requested') {
      const statusMap: Record<string, string> = {
        approved: 'Approved',
        rejected: 'already rejected',
      };
      return { 
        success: false, 
        error: `This application is ${statusMap[currentStatus] || 'already processed'}`
      };
    }

    // Step 4: Update status (RPC if present, else direct update)
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const reviewInfo = {
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      reviewer_role: isCoach ? 'coach' : 'admin',
      notes: reason || null,
    };
    const statusLogEntry = {
      timestamp: new Date().toISOString(),
      action: 'status_changed',
      by_user: user.id,
      by_role: isCoach ? 'coach' : 'admin',
      from: currentStatus,
      to: newStatus,
      notes: reason || null,
    };

    const { error: rpcUpdateError } = await db.rpc('update_application_status', {
      p_application_id: applicationId,
      p_new_status: newStatus,
      p_reviewed_by: user.id,
      p_notes: reason || null,
    } as any);

    if (rpcUpdateError) {
      const existingLog = Array.isArray((application as any).activity_log)
        ? (application as any).activity_log
        : [];
      const { error: updateError } = await (db
        .from('membership_applications') as any)
        .update({
          status: newStatus,
          review_info: reviewInfo,
          activity_log: [...existingLog, statusLogEntry],
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (updateError) {
        console.error('Error updating application status:', updateError);
        return {
          success: false,
          error: 'Could not update application status',
        };
      }
    }

    // Step 5: If approved, create athlete profile + set membership active
    let profileId: string | undefined;
    if (action === 'approve') {
      const profileResult = await createAthleteProfile(application as any);

      if (!profileResult.success) {
        await (db.from('membership_applications') as any)
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', applicationId);

        return {
          success: false,
          error: profileResult.error || 'Could not create athlete profile',
        };
      }

      profileId = profileResult.profileId;

      await (db.from('profiles') as any)
        .update({ membership_status: 'active', club_id: (application as any).club_id })
        .eq('id', (application as any).user_id);
    } else if (action === 'reject') {
      await (db.from('profiles') as any)
        .update({ membership_status: 'rejected' })
        .eq('id', (application as any).user_id);
    }

    return {
      success: true,
      profileId,
    };

  } catch (error) {
    console.error('Unexpected error in reviewApplication:', error);
    return { 
      success: false, 
      error: 'An unexpected error occurred' 
    };
  }
}

/**
 * Create athlete profile from approved application
 * 
 * Validates: Requirements US-5
 * 
 * Process:
 * 1. Check if athlete record already exists for user+club
 * 2. Extract data from personal_info JSONB field
 * 3. Parse full_name into first_name and last_name
 * 4. Create record in athletes table with proper fields
 * 5. Update application with athlete profile_id reference
 * 6. Add activity log entry for profile creation
 * 7. Handle errors gracefully (duplicate, missing data)
 * 
 * @param application - The approved membership application
 * @returns { success: boolean, profileId?: string, error?: string }
 */
async function createAthleteProfile(
  application: MembershipApplication
): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    const db = await createClient();

    // Step 1: Check if athlete record already exists
    const { data: existingAthlete } = await db
      .from('athletes')
      .select('id')
      .eq('user_id', application.user_id)
      .eq('club_id', application.club_id)
      .maybeSingle();

    if (existingAthlete) {
      // Update application with existing profile_id
      await (db
        .from('membership_applications') as any)
        .update({ profile_id: (existingAthlete as any).id })
        .eq('id', application.id);

      return { 
        success: true, 
        profileId: (existingAthlete as any).id 
      };
    }

    // Step 2: Extract data from personal_info JSONB field
    const personalInfo = application.personal_info as PersonalInfo;
    
    if (!personalInfo.full_name || !personalInfo.phone_number) {
      return { 
        success: false, 
        error: 'Personal information is incomplete' 
      };
    }

    // Validate required fields from new registration form
    if (!(personalInfo as any).gender) {
      return { 
        success: false, 
        error: 'Gender information is incomplete' 
      };
    }

    if (!(personalInfo as any).date_of_birth) {
      return { 
        success: false, 
        error: 'Date of birth is incomplete' 
      };
    }

    // Step 3: Parse full_name into first_name and last_name
    const nameParts = personalInfo.full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';

    // Applicant email (coach is approving — do not use auth.getUser())
    const { data: applicantProfile } = await db
      .from('profiles')
      .select('email')
      .eq('id', application.user_id)
      .maybeSingle();
    const userEmail =
      (applicantProfile as { email?: string } | null)?.email ||
      (personalInfo as { email?: string }).email ||
      '';

    // Step 4: Create record in athletes table
    const athleteData = {
      user_id: application.user_id,
      club_id: application.club_id,
      first_name: firstName,
      last_name: lastName,
      nickname: (personalInfo as any).nickname || null,
      date_of_birth: (personalInfo as any).date_of_birth,
      phone_number: personalInfo.phone_number,
      email: userEmail,
      gender: (personalInfo as any).gender,
      health_notes: personalInfo.medical_conditions || null,
      profile_picture_url: null,
    };

    const { data: newAthlete, error: insertError } = await (db
      .from('athletes') as any)
      .insert(athleteData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating athlete profile:', insertError);
      
      // Handle duplicate constraint
      if (insertError.code === '23505') {
        return { 
          success: false, 
          error: 'An athlete profile for this sport already exists' 
        };
      }

      return { 
        success: false, 
        error: 'Could not create athlete profile' 
      };
    }

    if (!newAthlete) {
      return { 
        success: false, 
        error: 'Could not create athlete profile' 
      };
    }

    const profileId = (newAthlete as any).id;

    // Step 5: Update application with athlete profile_id reference
    const { error: updateError } = await (db
      .from('membership_applications') as any)
      .update({ profile_id: profileId })
      .eq('id', application.id);

    if (updateError) {
      console.error('Error updating application with profile_id:', updateError);
      // Don't fail the entire operation - profile was created successfully
    }

    // Step 6: Add activity log entry for profile creation
    const { error: logError } = await db.rpc('add_activity_log', {
      p_application_id: application.id,
      p_action: 'profile_created',
      p_by_user: application.user_id,
      p_details: {
        profile_id: profileId,
        club_id: application.club_id,
      } as any,
    } as any);

    if (logError) {
      console.error('Error adding activity log:', logError);
      // Don't fail the entire operation
    }

    // Step 7: Return success with profile ID
    return { 
      success: true, 
      profileId 
    };

  } catch (error) {
    console.error('Unexpected error in createAthleteProfile:', error);
    return { 
      success: false, 
      error: 'An unexpected error occurred' 
    };
  }
}
