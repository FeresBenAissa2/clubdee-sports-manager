'use server';

/**
 * Access Control Functions
 * 
 * SINGLE SOURCE OF TRUTH: profiles.membership_status
 * 
 * This module provides access control checks for different user roles.
 * All access decisions are based on profiles.membership_status field.
 * 
 * Validates: Requirements AC4, AC5, AC6
 * - AC4: Post-Approval Access - Athletes with 'active' status can access dashboard
 * - AC5: Rejection Handling - Athletes with 'rejected' status cannot access
 * - AC6: Pending State Restrictions - Athletes with 'pending' status cannot access
 * 
 * Functions:
 * - checkAthleteAccess(userId): Check if athlete has active membership
 * - getAthleteAccessStatus(userId): Get detailed access status with reason
 */

import { createClient } from '@/lib/db/server';

export type AthleteAccessStatus = {
  hasAccess: boolean;
  membershipStatus: 'pending' | 'active' | 'rejected' | 'suspended' | null;
  reason?: string;
  applicationId?: string;
  clubName?: string;
  rejectionReason?: string;
};

/**
 * Check if athlete has access to dashboard features
 * 
 * SINGLE SOURCE OF TRUTH: profiles.membership_status
 * 
 * Validates: Requirements AC4, AC5, AC6
 * - AC4: Post-Approval Access - Athletes with 'active' status can access dashboard
 * - AC5: Rejection Handling - Athletes with 'rejected' status cannot access
 * - AC6: Pending State Restrictions - Athletes with 'pending' status cannot access
 * 
 * Business Rule BR1: Athletes must have active membership to access features
 * 
 * Access Logic:
 * 1. Non-athletes (coach, admin) always have access
 * 2. Athletes ONLY have access if membership_status === 'active'
 * 3. All other statuses (pending, rejected, suspended, null) deny access
 * 
 * @param userId - User ID to check
 * @returns boolean - true if athlete has access, false otherwise
 */
export async function checkAthleteAccess(userId: string): Promise<boolean> {
  try {
    const db = await createClient();

    // Get user's role from user_roles table
    const { data: userRole, error: roleError } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleError) {
      console.error('Error checking user role:', roleError);
      return false;
    }

    // Non-athletes (coach, admin) always have access
    if (userRole && (userRole as any).role !== 'athlete') {
      return true;
    }

    // For athletes, check membership_status (SINGLE SOURCE OF TRUTH)
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('membership_status')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking athlete access:', profileError);
      return false;
    }

    if (!profile) {
      return false;
    }

    // Athletes must have 'active' membership_status - this is the ONLY condition
    // pending, rejected, suspended, or null all result in denied access
    return (profile as any).membership_status === 'active';
  } catch (error) {
    console.error('Unexpected error in checkAthleteAccess:', error);
    return false;
  }
}

/**
 * Get detailed athlete access status with reason
 * 
 * SINGLE SOURCE OF TRUTH: profiles.membership_status
 * 
 * Provides detailed information about why athlete has or doesn't have access.
 * Used for displaying appropriate messages and redirects in the UI.
 * 
 * Status Mapping (based on membership_status):
 * - 'active': hasAccess = true
 * - 'pending': hasAccess = false, show waiting message
 * - 'rejected': hasAccess = false, show rejection reason
 * - 'suspended': hasAccess = false, show suspension message
 * - null: hasAccess = false, prompt to register
 * 
 * @param userId - User ID to check
 * @returns AthleteAccessStatus - Detailed access status with reason
 */
export async function getAthleteAccessStatus(
  userId: string
): Promise<AthleteAccessStatus> {
  try {
    const db = await createClient();

    // Get user's role from user_roles table
    const { data: userRole, error: roleError } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleError) {
      return {
        hasAccess: false,
        membershipStatus: null,
        reason: 'User not found',
      };
    }

    // Non-athletes (coach, admin) always have access
    if (userRole && (userRole as any).role !== 'athlete') {
      return {
        hasAccess: true,
        membershipStatus: 'active',
      };
    }

    // For athletes, get membership_status (SINGLE SOURCE OF TRUTH)
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('membership_status')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return {
        hasAccess: false,
        membershipStatus: null,
        reason: 'User not found',
      };
    }

    const membershipStatus = (profile as any).membership_status;

    // ACTIVE status: Grant access
    if (membershipStatus === 'active') {
      return {
        hasAccess: true,
        membershipStatus: 'active',
      };
    }

    // For non-active statuses, get application details for better messaging
    const { data: application } = await db
      .from('membership_applications')
      .select(
        `
        id,
        status,
        rejection_reason,
        clubs (
          name
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // PENDING status: Deny access, show waiting message
    if (membershipStatus === 'pending') {
      return {
        hasAccess: false,
        membershipStatus: 'pending',
        reason: 'Your membership application is pending review',
        applicationId: (application as any)?.id,
        clubName: (application as any)?.clubs?.name,
      };
    }

    // REJECTED status: Deny access, show rejection reason
    if (membershipStatus === 'rejected') {
      return {
        hasAccess: false,
        membershipStatus: 'rejected',
        reason: 'Your membership application was rejected',
        rejectionReason: (application as any)?.rejection_reason,
        clubName: (application as any)?.clubs?.name,
      };
    }

    // SUSPENDED status: Deny access, show suspension message
    if (membershipStatus === 'suspended') {
      return {
        hasAccess: false,
        membershipStatus: 'suspended',
        reason: 'Your account is temporarily suspended',
      };
    }

    // NULL or unknown status: Deny access, prompt to register
    return {
      hasAccess: false,
      membershipStatus: null,
      reason: 'Please register to access the system',
    };
  } catch (error) {
    console.error('Unexpected error in getAthleteAccessStatus:', error);
    return {
      hasAccess: false,
      membershipStatus: null,
      reason: 'Error checking access permissions',
    };
  }
}
