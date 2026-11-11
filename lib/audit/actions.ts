'use server';

import { createClient } from '@/lib/db/server';

export type AuditActionType =
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.delete'
  | 'club.create'
  | 'club.update'
  | 'club.delete'
  | 'coach.create'
  | 'coach.assign'
  | 'coach.update'
  | 'athlete.create'
  | 'athlete.update'
  | 'session.create'
  | 'session.update'
  | 'session.delete'
  | 'training_session.create'
  | 'training_session.update'
  | 'training_session.delete'
  | 'attendance.record'
  | 'attendance.create'
  | 'attendance.update'
  | 'performance.record'
  | 'announcement.create'
  | 'announcement.update';

export type AuditEntityType =
  | 'user'
  | 'club'
  | 'coach'
  | 'athlete'
  | 'training_session'
  | 'attendance_log'
  | 'performance_record'
  | 'announcement';

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_role: 'admin' | 'coach' | 'athlete' | null;
  action_type: AuditActionType;
  entity_type: AuditEntityType;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CreateAuditLogParams {
  userId?: string;
  userRole?: 'admin' | 'coach' | 'athlete';
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    const db = await createClient();

    const { data, error } = await db
      .from('audit_logs')
      .insert({
        user_id: params.userId || null,
        user_role: params.userRole || null,
        action_type: params.actionType,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        details: params.details || null,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
      } as any)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create audit log',
    };
  }
}

/**
 * Get audit logs with optional filters
 */
export async function getAuditLogs(params?: {
  userId?: string;
  actionType?: AuditActionType;
  entityType?: AuditEntityType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const db = await createClient();

    let query = db
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.userId) {
      query = query.eq('user_id', params.userId);
    }

    if (params?.actionType) {
      query = query.eq('action_type', params.actionType);
    }

    if (params?.entityType) {
      query = query.eq('entity_type', params.entityType);
    }

    if (params?.startDate) {
      query = query.gte('created_at', params.startDate);
    }

    if (params?.endDate) {
      query = query.lte('created_at', params.endDate);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audit logs',
    };
  }
}

/**
 * Get audit log count
 */
export async function getAuditLogCount(params?: {
  userId?: string;
  actionType?: AuditActionType;
  entityType?: AuditEntityType;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const db = await createClient();

    let query = db
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    if (params?.userId) {
      query = query.eq('user_id', params.userId);
    }

    if (params?.actionType) {
      query = query.eq('action_type', params.actionType);
    }

    if (params?.entityType) {
      query = query.eq('entity_type', params.entityType);
    }

    if (params?.startDate) {
      query = query.gte('created_at', params.startDate);
    }

    if (params?.endDate) {
      query = query.lte('created_at', params.endDate);
    }

    const { count, error } = await query;

    if (error) throw error;

    return { success: true, count: count || 0 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to count audit logs',
      count: 0,
    };
  }
}
