'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';
import {
  MembershipApplicationData,
  ApplicationIntegration,
  IntegrationError,
  IntegrationErrorType,
} from '@/types/integration';

/**
 * Application Integration Module
 * 
 * Handles the integration between membership applications and dashboards.
 * Implements the ApplicationIntegration interface from the design document.
 * 
 * Features:
 * - Athlete submits application → Coach sees pending count badge
 * - Coach approves → Athlete appears in athlete list
 * - Coach rejects → Athlete receives notification with reason
 */

/**
 * Called when an athlete submits a new membership application.
 * Triggers revalidation of coach dashboards to show updated pending count.
 * 
 * @param application - The newly submitted application
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 5.3** - Pending application badge update
 */
export async function onApplicationSubmitted(
  application: MembershipApplicationData
): Promise<void> {
  try {
    // Revalidate coach dashboard paths to show updated pending count
    revalidatePath('/dashboard/coach');
    revalidatePath('/dashboard/coach/applications');
    
    console.log(`[ApplicationIntegration] Application submitted: ${application.id}`);
  } catch (error) {
    console.error('[ApplicationIntegration] Error in onApplicationSubmitted:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to process application submission',
      { applicationId: application.id }
    );
  }
}


/**
 * Called when a coach approves a membership application.
 * Updates athlete list and unlocks club features for the athlete.
 * 
 * @param applicationId - The ID of the approved application
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 5.1, 5.4** - Athlete appears in list and features unlocked
 */
export async function onApplicationApproved(applicationId: string): Promise<void> {
  const db = await createClient();

  try {
    // Get application details
    const { data: application, error: fetchError } = await db
      .from('membership_applications')
      .select('id, user_id, club_id, status')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      throw new IntegrationError(
        IntegrationErrorType.DATABASE_ERROR,
        'Application not found',
        { applicationId }
      );
    }

    // Verify application is approved
    if ((application as any).status !== 'approved') {
      console.warn(`[ApplicationIntegration] Application ${applicationId} is not approved`);
      return;
    }

    // Revalidate all relevant paths
    revalidatePath('/dashboard/coach');
    revalidatePath('/dashboard/coach/applications');
    revalidatePath('/dashboard/coach/athletes');
    revalidatePath('/dashboard/athlete');

    // Create notification for the athlete
    const { error: notificationError } = await (db as any)
      .from('notifications')
      .insert({
        user_id: (application as any).user_id,
        type: 'application_approved',
        title: 'Application approved',
        message: 'Welcome! Your application was approved. You now have full access to club features.',
        is_read: false,
      });

    if (notificationError) {
      console.error('[ApplicationIntegration] Error creating approval notification:', notificationError);
      // Don't fail the entire operation if notification fails
    }

    console.log(`[ApplicationIntegration] Application approved: ${applicationId}`);
  } catch (error) {
    if (error instanceof IntegrationError) {
      throw error;
    }
    console.error('[ApplicationIntegration] Error in onApplicationApproved:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to process application approval',
      { applicationId }
    );
  }
}

/**
 * Called when a coach rejects a membership application.
 * Sends notification to the athlete with the rejection reason.
 * 
 * @param applicationId - The ID of the rejected application
 * @param reason - The reason for rejection
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 5.2** - Rejection notification with reason
 */
export async function onApplicationRejected(
  applicationId: string,
  reason: string
): Promise<void> {
  const db = await createClient();

  try {
    // Get application details
    const { data: application, error: fetchError } = await db
      .from('membership_applications')
      .select('id, user_id, club_id, status')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      throw new IntegrationError(
        IntegrationErrorType.DATABASE_ERROR,
        'Application not found',
        { applicationId }
      );
    }

    // Revalidate paths
    revalidatePath('/dashboard/coach');
    revalidatePath('/dashboard/coach/applications');
    revalidatePath('/dashboard/athlete');

    // Create notification for the athlete with rejection reason
    const { error: notificationError } = await (db as any)
      .from('notifications')
      .insert({
        user_id: (application as any).user_id,
        type: 'application_rejected',
        title: 'Application not approved',
        message: `Your application was not approved. Reason: ${reason}`,
        is_read: false,
      });

    if (notificationError) {
      console.error('[ApplicationIntegration] Error creating rejection notification:', notificationError);
      // Don't fail the entire operation if notification fails
    }

    console.log(`[ApplicationIntegration] Application rejected: ${applicationId}, reason: ${reason}`);
  } catch (error) {
    if (error instanceof IntegrationError) {
      throw error;
    }
    console.error('[ApplicationIntegration] Error in onApplicationRejected:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to process application rejection',
      { applicationId }
    );
  }
}

/**
 * Gets the count of pending membership applications for a specific club.
 * Used for displaying badge counts on the coach dashboard.
 * 
 * @param clubId - The ID of the club
 * @returns The number of pending applications
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 5.3** - Pending application badge count
 */
export async function getPendingCount(clubId: string | string[]): Promise<number> {
  const db = await createClient();
  const clubIds = Array.isArray(clubId) ? clubId : [clubId];

  try {
    if (clubIds.length === 0) return 0;

    let query = db
      .from('membership_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    query =
      clubIds.length === 1
        ? query.eq('club_id', clubIds[0])
        : query.in('club_id', clubIds);

    const { count, error } = await query;

    if (error) {
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('[ApplicationIntegration] Error in getPendingCount:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get pending application count',
      { clubId: clubIds }
    );
  }
}

/**
 * Gets all pending applications for a club with applicant details.
 * 
 * @param clubId - The ID of the club
 * @returns Array of pending applications with details
 */
export async function getPendingApplications(clubId: string): Promise<MembershipApplicationData[]> {
  const db = await createClient();

  try {
    const { data: applications, error } = await db
      .from('membership_applications')
      .select('*')
      .eq('club_id', clubId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (applications || []).map((app: any) => ({
      id: app.id,
      userId: app.user_id,
      clubId: app.club_id,
      status: app.status,
      createdAt: app.created_at,
      updatedAt: app.updated_at,
    }));
  } catch (error) {
    console.error('[ApplicationIntegration] Error in getPendingApplications:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get pending applications',
      { clubId }
    );
  }
}

/**
 * Checks if an athlete has access to club features.
 * An athlete has access if they have an approved application for the club.
 * 
 * @param userId - The ID of the user
 * @param clubId - The ID of the club
 * @returns true if the athlete has access
 * 
 * **Validates: Requirements 5.4** - Feature access after approval
 */
export async function hasClubAccess(userId: string, clubId: string): Promise<boolean> {
  const db = await createClient();

  try {
    // Check if user has an approved application for this club
    const { data: application, error: appError } = await db
      .from('membership_applications')
      .select('id, status')
      .eq('user_id', userId)
      .eq('club_id', clubId)
      .eq('status', 'approved')
      .maybeSingle();

    if (appError) {
      throw appError;
    }

    if (application) {
      return true;
    }

    // Also check if user is already an athlete in the club
    const { data: athlete, error: athleteError } = await db
      .from('athletes')
      .select('id')
      .eq('user_id', userId)
      .eq('club_id', clubId)
      .maybeSingle();

    if (athleteError) {
      throw athleteError;
    }

    return !!athlete;
  } catch (error) {
    console.error('[ApplicationIntegration] Error in hasClubAccess:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to check club access',
      { userId, clubId }
    );
  }
}

/**
 * Gets the application status for a user in a specific club.
 * 
 * @param userId - The ID of the user
 * @param clubId - The ID of the club
 * @returns The application status or null if no application exists
 */
export async function getApplicationStatus(
  userId: string,
  clubId: string
): Promise<'pending' | 'approved' | 'rejected' | 'info_requested' | null> {
  const db = await createClient();

  try {
    const { data: application, error } = await db
      .from('membership_applications')
      .select('status')
      .eq('user_id', userId)
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (application as any)?.status || null;
  } catch (error) {
    console.error('[ApplicationIntegration] Error in getApplicationStatus:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get application status',
      { userId, clubId }
    );
  }
}

// Note: ApplicationIntegration object export removed because 'use server' files
// can only export async functions. Use the individual exported functions directly.
