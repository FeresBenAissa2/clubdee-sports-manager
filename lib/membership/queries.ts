'use server';

/**
 * Membership Application Query Functions
 * 
 * This module provides server-side query functions for the membership registration system.
 * All functions include proper authentication, authorization, and error handling.
 * 
 * Functions:
 * - getAvailableClubs(): Fetch clubs with coach info and member count (US-2)
 * - getMyApplications(userId): Athlete's applications with club details (US-4)
 * - getClubApplications(clubId): Coach's applications for their club (US-3)
 * - getAllApplications(filters): Admin view with optional filters (US-7)
 * - getApplicationDetails(applicationId): Full application with JSONB data (US-3, US-4, US-8)
 * 
 * Security:
 * - All queries respect RLS policies
 * - Athletes can only view their own applications
 * - Coaches can only view applications for their clubs
 * - Admins can view all applications
 */

import { createClient } from '@/lib/db/server';
import { MembershipApplication, ApplicationStatus } from '@/types/database.types';

/**
 * Get available clubs with member count and coach count
 * Used for sport selection during registration
 * Coach information is not shown during registration as per AC1 (Club-Based Application)
 * Coach will be assigned after approval by the club's coach
 * Validates: Requirements AC1, Task 3.1
 */
export async function getAvailableClubs() {
  try {
    const db = await createClient();

    // Fetch clubs without coach information
    const { data: clubs, error: clubsError } = await db
      .from('clubs')
      .select(
        `
        id,
        name,
        description,
        sport_type
      `
      )
      .order('name');

    if (clubsError) {
      console.error('Error fetching clubs:', clubsError);
      return { error: 'Could not load sports clubs' };
    }

    if (!clubs || clubs.length === 0) {
      console.warn(
        '[getAvailableClubs] No clubs returned. Check RLS (run scripts/fix-clubs-public-read.sql) and that clubs exist.'
      );
    }

    // Get member count and coach count for each club
    const clubsWithCount = await Promise.all(
      (clubs || []).map(async (club: any) => {
        // Get athlete count
        const { count: memberCount, error: memberCountError } = await db
          .from('athletes')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', club.id);

        if (memberCountError) {
          console.error('Error counting members:', memberCountError);
        }

        // Get coach count
        const { count: coachCount, error: coachCountError } = await db
          .from('coaches')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', club.id);

        if (coachCountError) {
          console.error('Error counting coaches:', coachCountError);
        }

        return {
          ...club,
          member_count: memberCount || 0,
          coach_count: coachCount || 0,
        };
      })
    );

    // Only clubs with at least one coach can accept applications
    const openClubs = clubsWithCount.filter((c) => (c.coach_count || 0) > 0);

    if (clubsWithCount.length > 0 && openClubs.length === 0) {
      console.warn(
        '[getAvailableClubs] Clubs exist but none have a coach. Link a coach via coaches table / seed-demo-coach.sql.'
      );
      return {
        error:
          'Clubs exist but none have a coach assigned yet. Ask an admin to assign a coach to each club.',
        data: [],
      };
    }

    return { data: openClubs };
  } catch (error) {
    console.error('Unexpected error in getAvailableClubs:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get athlete's own applications with club details
 * Validates: Requirements US-4
 */
export async function getMyApplications(userId: string) {
  try {
    const db = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    // Verify user is requesting their own applications
    if (user.id !== userId) {
      return { error: 'Unauthorized: you can only view your own applications' };
    }

    // Fetch applications with club details
    const { data: applications, error } = await db
      .from('membership_applications')
      .select(
        `
        *,
        clubs (
          id,
          name,
          sport_type,
          description
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      return { error: 'Could not load applications' };
    }

    return { data: applications as (MembershipApplication & { clubs: any })[] };
  } catch (error) {
    console.error('Unexpected error in getMyApplications:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get applications for a specific club (for coaches)
 * Validates: Requirements US-3
 */
export async function getClubApplications(clubId: string) {
  try {
    const db = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    // Verify user is a coach for this club
    const { data: coach, error: coachError } = await db
      .from('coaches')
      .select('id, club_id')
      .eq('user_id', user.id)
      .eq('club_id', clubId)
      .maybeSingle();

    if (coachError || !coach) {
      return { error: 'Unauthorized: you are not a coach for this sport' };
    }

    // Fetch applications for the club with applicant info
    const { data: applications, error } = await db
      .from('membership_applications')
      .select(
        `
        *,
        clubs (
          id,
          name,
          sport_type
        )
      `
      )
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching club applications:', error);
      return { error: 'Could not load applications' };
    }

    return { data: applications as (MembershipApplication & { clubs: any })[] };
  } catch (error) {
    console.error('Unexpected error in getClubApplications:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get applications for ALL clubs this coach belongs to
 * (demo coach is linked to multiple clubs — do not use limit(1) club only)
 */
export async function getCoachApplications() {
  try {
    const db = await createClient();

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    const { data: coachRows, error: coachError } = await db
      .from('coaches')
      .select('club_id')
      .eq('user_id', user.id);

    if (coachError) {
      console.error('Error loading coach clubs:', coachError);
      return { error: 'Could not load coach profile' };
    }

    const clubIds = [...new Set((coachRows || []).map((r: { club_id: string }) => r.club_id).filter(Boolean))];

    if (clubIds.length === 0) {
      return { error: 'Unauthorized: you are not a coach for any club', data: [], clubIds: [] };
    }

    const { data: applications, error } = await db
      .from('membership_applications')
      .select(
        `
        *,
        clubs (
          id,
          name,
          sport_type
        )
      `
      )
      .in('club_id', clubIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coach applications:', error);
      return { error: 'Could not load applications' };
    }

    return {
      data: applications as (MembershipApplication & { clubs: any })[],
      clubIds,
    };
  } catch (error) {
    console.error('Unexpected error in getCoachApplications:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get all applications with optional filters (for admins)
 * Validates: Requirements US-7
 */
export async function getAllApplications(filters?: {
  clubId?: string;
  status?: ApplicationStatus;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const db = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    // Verify user is an admin
    const { data: userRole, error: roleError } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError || !userRole || (userRole as any).role !== 'admin') {
      return { error: 'Unauthorized: administrators only' };
    }

    // Build query with filters
    let query = db
      .from('membership_applications')
      .select(
        `
        *,
        clubs (
          id,
          name,
          sport_type
        )
      `
      );

    // Apply filters
    if (filters?.clubId) {
      query = query.eq('club_id', filters.clubId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    // Execute query
    const { data: applications, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all applications:', error);
      return { error: 'Could not load applications' };
    }

    return { data: applications as (MembershipApplication & { clubs: any })[] };
  } catch (error) {
    console.error('Unexpected error in getAllApplications:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Validate that a club exists and is available for registration
 * Validates: Requirements AC1 (Club-Based Application)
 * 
 * @param clubId - UUID of the club to validate
 * @returns { valid: boolean, error?: string, club?: any }
 */
export async function validateClubSelection(clubId: string) {
  try {
    const db = await createClient();

    // Check if club exists
    const { data: club, error } = await db
      .from('clubs')
      .select('id, name, sport_type, description')
      .eq('id', clubId)
      .maybeSingle();

    if (error) {
      console.error('Error validating club:', error);
      return { valid: false, error: 'Could not verify sport' };
    }

    if (!club) {
      return { valid: false, error: 'Selected sport not found. Please choose again' };
    }

    // Check if club has at least one coach
    const { count: coachCount, error: coachError } = await db
      .from('coaches')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId);

    if (coachError) {
      console.error('Error checking coaches:', coachError);
      return { valid: false, error: 'Could not verify coach assignment' };
    }

    if (!coachCount || coachCount === 0) {
      return { 
        valid: false, 
        error: `${(club as any).name} has no coaches yet and cannot accept applications`
      };
    }

    return { valid: true, club };
  } catch (error) {
    console.error('Unexpected error in validateClubSelection:', error);
    return { valid: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get full application details with all JSONB data
 * Validates: Requirements US-3, US-4, US-8
 */
export async function getApplicationDetails(applicationId: string) {
  try {
    const db = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    // Fetch application with club details
    const { data: application, error } = await db
      .from('membership_applications')
      .select(
        `
        *,
        clubs (
          id,
          name,
          sport_type,
          description
        )
      `
      )
      .eq('id', applicationId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching application details:', error);
      return { error: 'Could not load application details' };
    }

    if (!application) {
      return { error: 'Application not found' };
    }

    // Verify user has permission to view this application
    // Athletes can view their own, coaches can view their club's, admins can view all
    const { data: userRole } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const isAdmin = (userRole as any)?.role === 'admin';
    const isOwner = (application as any).user_id === user.id;

    // Check if user is coach of the club
    let isCoach = false;
    if (!isOwner && !isAdmin) {
      const { data: coach } = await db
        .from('coaches')
        .select('id')
        .eq('user_id', user.id)
        .eq('club_id', (application as any).club_id)
        .maybeSingle();

      isCoach = !!coach;
    }

    if (!isOwner && !isCoach && !isAdmin) {
      return { error: 'Unauthorized: you cannot view this application' };
    }

    return { data: application as MembershipApplication & { clubs: any } };
  } catch (error) {
    console.error('Unexpected error in getApplicationDetails:', error);
    return { error: 'An unexpected error occurred' };
  }
}
