'use server';

import { createClient } from '@/lib/db/server';
import { Database } from '@/types/database.types';
import { createAuditLog } from '@/lib/audit/actions';
import { getCached, invalidatePattern } from '@/lib/utils/cache';

type TrainingSession = Database['public']['Tables']['training_sessions']['Row'];

interface SessionWithDetails extends TrainingSession {
  clubs?: {
    id: string;
    name: string;
    sport_type: string;
  };
  coaches?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  attendance_count?: number;
}

interface SystemAttendanceStats {
  totalSessions: number;
  totalAttendanceRecords: number;
  averageAttendanceRate: number;
  activeAthletes: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  lateCount: number;
}

interface ClubStats {
  clubId: string;
  clubName: string;
  sportType: string;
  totalSessions: number;
  totalAttendanceRecords: number;
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  lateCount: number;
  activeAthletes: number;
}

/**
 * Get all training sessions across all clubs
 * Admin can view all sessions in the system
 * OPTIMIZED: Added pagination and removed N+1 query for attendance counts
 */
export async function getAllSessions(filter?: {
  clubId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data?: SessionWithDetails[]; total?: number; error?: string }> {
  try {
    const db = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    // Verify user is admin
    const { data: userRole, error: roleError } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // @ts-ignore - type inference issue
    if (roleError || !userRole || userRole.role !== 'admin') {
      return { error: 'Unauthorized: admin access only' };
    }

    // Build query with pagination defaults
    const limit = filter?.limit || 50; // Default page size
    const offset = filter?.offset || 0;

    let query = db
      .from('training_sessions')
      .select(`
        *,
        clubs (
          id,
          name,
          sport_type
        ),
        coaches (
          id,
          first_name,
          last_name
        )
      `, { count: 'exact' })
      .order('session_date', { ascending: false })
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filter?.clubId) {
      query = query.eq('club_id', filter.clubId);
    }

    if (filter?.startDate) {
      query = query.gte('session_date', filter.startDate);
    }

    if (filter?.endDate) {
      query = query.lte('session_date', filter.endDate);
    }

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data: sessions, error: sessionsError, count } = await query;

    if (sessionsError) {
      console.error('Sessions query error:', sessionsError);
      return { error: 'An error occurred while loading training sessions' };
    }

    // OPTIMIZED: Fetch all attendance counts in a single query using aggregation
    // Get session IDs
    const sessionIds = (sessions || []).map((s: any) => s.id);
    
    if (sessionIds.length === 0) {
      return { data: [], total: count || 0 };
    }

    // Fetch attendance counts for all sessions at once
    const { data: attendanceCounts, error: countError } = await db
      .from('attendance')
      .select('training_session_id')
      .in('training_session_id', sessionIds)
      .eq('status', 'present');

    if (countError) {
      console.error('Attendance count error:', countError);
    }

    // Create a map of session_id -> count
    const countMap = new Map<string, number>();
    (attendanceCounts || []).forEach((record: any) => {
      const sessionId = record.training_session_id;
      countMap.set(sessionId, (countMap.get(sessionId) || 0) + 1);
    });

    // Add counts to sessions
    const sessionsWithCounts = (sessions || []).map((session: any) => ({
      ...session,
      attendance_count: countMap.get(session.id) || 0,
    }));

    return { data: sessionsWithCounts, total: count || 0 };
  } catch (error) {
    console.error('Unexpected error in getAllSessions:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get system-wide attendance statistics
 * Provides overview of all attendance across the system
 * OPTIMIZED: Added caching with 5-minute TTL
 */
export async function getAttendanceStats(filter?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ data?: SystemAttendanceStats; error?: string }> {
  try {
    // Create cache key based on filters
    const cacheKey = `attendance-stats:${filter?.startDate || 'all'}:${filter?.endDate || 'all'}`;
    
    // Try to get from cache (5 minute TTL)
    const cached = await getCached<{ data?: SystemAttendanceStats; error?: string }>(
      cacheKey,
      async () => {
        return await computeAttendanceStats(filter);
      },
      5 * 60 * 1000 // 5 minutes
    );
    
    return cached;
  } catch (error) {
    console.error('Unexpected error in getAttendanceStats:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Internal function to compute attendance stats
 */
async function computeAttendanceStats(filter?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ data?: SystemAttendanceStats; error?: string }> {
  try {
    const db = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    // Verify user is admin
    const { data: userRole, error: roleError } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // @ts-ignore - type inference issue
    if (roleError || !userRole || userRole.role !== 'admin') {
      return { error: 'Unauthorized: admin access only' };
    }

    // Get total sessions count
    let sessionsQuery = db
      .from('training_sessions')
      .select('*', { count: 'exact', head: true });

    if (filter?.startDate) {
      sessionsQuery = sessionsQuery.gte('session_date', filter.startDate);
    }

    if (filter?.endDate) {
      sessionsQuery = sessionsQuery.lte('session_date', filter.endDate);
    }

    const { count: totalSessions } = await sessionsQuery;

    // Get all attendance records with date filtering
    let attendanceQuery = db
      .from('attendance')
      .select(`
        *,
        training_sessions!inner (
          session_date
        )
      `);

    if (filter?.startDate) {
      // @ts-ignore
      attendanceQuery = attendanceQuery.gte('training_sessions.session_date', filter.startDate);
    }

    if (filter?.endDate) {
      // @ts-ignore
      attendanceQuery = attendanceQuery.lte('training_sessions.session_date', filter.endDate);
    }

    const { data: attendanceRecords, error: attendanceError } = await attendanceQuery;

    if (attendanceError) {
      console.error('Attendance query error:', attendanceError);
      return { error: 'Error loading statistics' };
    }

    // Calculate statistics
    const totalAttendanceRecords = attendanceRecords?.length || 0;
    // @ts-ignore
    const presentCount = attendanceRecords?.filter((a) => a.status === 'present').length || 0;
    // @ts-ignore
    const absentCount = attendanceRecords?.filter((a) => a.status === 'absent').length || 0;
    // @ts-ignore
    const excusedCount = attendanceRecords?.filter((a) => a.status === 'excused').length || 0;
    // @ts-ignore
    const lateCount = attendanceRecords?.filter((a) => a.status === 'late').length || 0;

    // Calculate average attendance rate
    const averageAttendanceRate =
      totalAttendanceRecords > 0
        ? Math.round(((presentCount + lateCount) / totalAttendanceRecords) * 100 * 10) / 10
        : 0;

    // Get count of unique active athletes (athletes with at least one attendance record)
    const uniqueAthletes = new Set(
      // @ts-ignore
      attendanceRecords?.map((record) => record.athlete_id) || []
    );
    const activeAthletes = uniqueAthletes.size;

    const stats: SystemAttendanceStats = {
      totalSessions: totalSessions || 0,
      totalAttendanceRecords,
      averageAttendanceRate,
      activeAthletes,
      presentCount,
      absentCount,
      excusedCount,
      lateCount,
    };

    return { data: stats };
  } catch (error) {
    console.error('Unexpected error in getAttendanceStats:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get attendance statistics broken down by club
 * Shows performance comparison across clubs
 * OPTIMIZED: Eliminated N+1 queries by fetching all data in bulk + caching
 */
export async function getClubStats(filter?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ data?: ClubStats[]; error?: string }> {
  try {
    // Create cache key based on filters
    const cacheKey = `club-stats:${filter?.startDate || 'all'}:${filter?.endDate || 'all'}`;
    
    // Try to get from cache (5 minute TTL)
    const cached = await getCached<{ data?: ClubStats[]; error?: string }>(
      cacheKey,
      async () => {
        return await computeClubStats(filter);
      },
      5 * 60 * 1000 // 5 minutes
    );
    
    return cached;
  } catch (error) {
    console.error('Unexpected error in getClubStats:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Internal function to compute club stats
 */
async function computeClubStats(filter?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ data?: ClubStats[]; error?: string }> {
  try {
    const db = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    // Verify user is admin
    const { data: userRole, error: roleError } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // @ts-ignore - type inference issue
    if (roleError || !userRole || userRole.role !== 'admin') {
      return { error: 'Unauthorized: admin access only' };
    }

    // Get all clubs
    const { data: clubs, error: clubsError } = await db
      .from('clubs')
      .select('id, name, sport_type')
      .order('name');

    if (clubsError) {
      console.error('Clubs query error:', clubsError);
      return { error: 'An error occurred while loading clubs' };
    }

    if (!clubs || clubs.length === 0) {
      return { data: [] };
    }

    // OPTIMIZED: Fetch all sessions for all clubs in one query
    let sessionsQuery = db
      .from('training_sessions')
      .select('id, club_id');

    if (filter?.startDate) {
      sessionsQuery = sessionsQuery.gte('session_date', filter.startDate);
    }

    if (filter?.endDate) {
      sessionsQuery = sessionsQuery.lte('session_date', filter.endDate);
    }

    const { data: allSessions, error: sessionsError } = await sessionsQuery;

    if (sessionsError) {
      console.error('Sessions query error:', sessionsError);
      return { error: 'An error occurred while loading training sessions' };
    }

    // OPTIMIZED: Fetch all attendance records for all clubs in one query
    let attendanceQuery = db
      .from('attendance')
      .select(`
        athlete_id,
        status,
        training_sessions!inner (
          club_id,
          session_date
        )
      `);

    if (filter?.startDate) {
      // @ts-ignore
      attendanceQuery = attendanceQuery.gte('training_sessions.session_date', filter.startDate);
    }

    if (filter?.endDate) {
      // @ts-ignore
      attendanceQuery = attendanceQuery.lte('training_sessions.session_date', filter.endDate);
    }

    const { data: allAttendance, error: attendanceError } = await attendanceQuery;

    if (attendanceError) {
      console.error('Attendance query error:', attendanceError);
      return { error: 'An error occurred while loading attendance data' };
    }

    // Build maps for efficient lookup
    const sessionsByClub = new Map<string, number>();
    (allSessions || []).forEach((session: any) => {
      const clubId = session.club_id;
      sessionsByClub.set(clubId, (sessionsByClub.get(clubId) || 0) + 1);
    });

    const attendanceByClub = new Map<string, any[]>();
    (allAttendance || []).forEach((record: any) => {
      // @ts-ignore
      const clubId = record.training_sessions?.club_id;
      if (clubId) {
        if (!attendanceByClub.has(clubId)) {
          attendanceByClub.set(clubId, []);
        }
        attendanceByClub.get(clubId)!.push(record);
      }
    });

    // Calculate stats for each club
    const clubStats: ClubStats[] = clubs.map((club: any) => {
      const clubId = club.id;
      const totalSessions = sessionsByClub.get(clubId) || 0;
      const attendanceRecords = attendanceByClub.get(clubId) || [];
      
      const totalAttendanceRecords = attendanceRecords.length;
      const presentCount = attendanceRecords.filter((a: any) => a.status === 'present').length;
      const absentCount = attendanceRecords.filter((a: any) => a.status === 'absent').length;
      const excusedCount = attendanceRecords.filter((a: any) => a.status === 'excused').length;
      const lateCount = attendanceRecords.filter((a: any) => a.status === 'late').length;

      // Calculate attendance rate
      const attendanceRate =
        totalAttendanceRecords > 0
          ? Math.round(((presentCount + lateCount) / totalAttendanceRecords) * 100 * 10) / 10
          : 0;

      // Get count of unique active athletes
      const uniqueAthletes = new Set(
        attendanceRecords.map((record: any) => record.athlete_id)
      );
      const activeAthletes = uniqueAthletes.size;

      return {
        clubId,
        clubName: club.name,
        sportType: club.sport_type,
        totalSessions,
        totalAttendanceRecords,
        attendanceRate,
        presentCount,
        absentCount,
        excusedCount,
        lateCount,
        activeAthletes,
      };
    });

    // Sort by attendance rate (highest first)
    clubStats.sort((a, b) => b.attendanceRate - a.attendanceRate);

    return { data: clubStats };
  } catch (error) {
    console.error('Unexpected error in getClubStats:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update any training session (admin privilege)
 * Admin can modify any session regardless of club or coach
 * Requirements: BR3 - Admin can edit everything
 */
export async function updateAnySession(
  sessionId: string,
  updates: {
    title?: string;
    session_date?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    description?: string;
    max_participants?: number | null;
    status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  }
): Promise<{ data?: TrainingSession; error?: string }> {
  try {
    const db = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    // Verify user is admin
    const { data: userRole, error: roleError } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // @ts-ignore - type inference issue
    if (roleError || !userRole || userRole.role !== 'admin') {
      return { error: 'Unauthorized: admin access only' };
    }

    // Validate session exists
    const { data: existingSession, error: fetchError } = await db
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError || !existingSession) {
      return { error: 'Training session to update was not found' };
    }

    // Validate date is not in the past (if updating session_date)
    if (updates.session_date) {
      const sessionDate = new Date(updates.session_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (sessionDate < today) {
        return { error: 'Cannot set a date in the past' };
      }
    }

    // Validate time range (if updating times)
    if (updates.start_time && updates.end_time) {
      if (updates.start_time >= updates.end_time) {
        return { error: 'Start time must be before end time' };
      }
    }

    // Update the session
    const { data: updatedSession, error: updateError } = await db
      .from('training_sessions')
      // @ts-ignore - type inference issue with update
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Session update error:', updateError);
      return { error: 'An error occurred while updating the training session' };
    }

    // Create audit log
    await createAuditLog({
      userId: user.id,
      userRole: 'admin',
      actionType: 'training_session.update',
      entityType: 'training_session',
      entityId: sessionId,
      details: {
        updates,
        // @ts-ignore
        previousValues: existingSession,
      },
    });

    return { data: updatedSession };
  } catch (error) {
    console.error('Unexpected error in updateAnySession:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a training session (hard delete - admin only)
 * This permanently removes the session and all related attendance records
 * Requirements: BR3 - Admin can delete everything
 */
export async function deleteSession(sessionId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const db = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: please sign in' };
    }

    // Verify user is admin
    const { data: userRole, error: roleError } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // @ts-ignore - type inference issue
    if (roleError || !userRole || userRole.role !== 'admin') {
      return { error: 'Unauthorized: admin access only' };
    }

    // Get session details before deletion for audit log
    const { data: sessionToDelete, error: fetchError } = await db
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError || !sessionToDelete) {
      return { error: 'Training session to delete was not found' };
    }

    // Delete related attendance records first (cascade delete)
    const { error: attendanceDeleteError } = await db
      .from('attendance')
      .delete()
      .eq('session_id', sessionId);

    if (attendanceDeleteError) {
      console.error('Attendance delete error:', attendanceDeleteError);
      return { error: 'An error occurred while deleting attendance records' };
    }

    // Delete related leave requests
    const { error: leaveDeleteError } = await db
      .from('leave_requests')
      .delete()
      .eq('session_id', sessionId);

    if (leaveDeleteError) {
      console.error('Leave requests delete error:', leaveDeleteError);
      // Continue even if this fails - leave_requests might not exist
    }

    // Delete the session
    const { error: deleteError } = await db
      .from('training_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Session delete error:', deleteError);
      return { error: 'An error occurred while deleting the training session' };
    }

    // Create audit log
    await createAuditLog({
      userId: user.id,
      userRole: 'admin',
      actionType: 'training_session.delete',
      entityType: 'training_session',
      entityId: sessionId,
      details: {
        // @ts-ignore
        deletedSession: sessionToDelete,
        deletedAt: new Date().toISOString(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in deleteSession:', error);
    return { error: 'An unexpected error occurred' };
  }
}
