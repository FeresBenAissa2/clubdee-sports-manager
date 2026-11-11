/**
 * Integration tests for admin session management
 * Tests updateAnySession() and deleteSession() functions
 * Requirements: BR3 - Admin can edit and delete everything
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { updateAnySession, deleteSession } from '@/lib/admin/attendance-actions';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('Admin Session Management', () => {
  let supabase: ReturnType<typeof createClient>;
  let testSessionId: string;
  let adminUserId: string;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get admin user
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!adminRole) {
      throw new Error('No admin user found in database');
    }

    adminUserId = adminRole.user_id;

    // Get first available club
    const { data: club } = await supabase
      .from('clubs')
      .select('id')
      .limit(1)
      .single();

    if (!club) {
      throw new Error('No clubs found in database');
    }

    // Create a test session
    const { data: session, error } = await supabase
      .from('training_sessions')
      .insert({
        club_id: club.id,
        coach_id: adminUserId,
        title: 'Test Session for Admin Management',
        session_date: '2025-12-01',
        start_time: '10:00:00',
        end_time: '12:00:00',
        location: 'Test Location',
        status: 'scheduled',
      })
      .select()
      .single();

    if (error || !session) {
      console.error('Session creation error:', error);
      throw new Error('Failed to create test session');
    }

    testSessionId = session.id;
  });

  it('should update a session with valid data', async () => {
    const updates = {
      title: 'Updated Test Session',
      location: 'Updated Location',
      description: 'Updated description',
    };

    const result = await updateAnySession(testSessionId, updates);

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data?.title).toBe('Updated Test Session');
    expect(result.data?.location).toBe('Updated Location');
    expect(result.data?.description).toBe('Updated description');
  });

  it('should validate date is not in the past', async () => {
    const updates = {
      session_date: '2020-01-01', // Past date
    };

    const result = await updateAnySession(testSessionId, updates);

    expect(result.error).toBeDefined();
    expect(result.error).toContain('อดีต');
  });

  it('should validate time range', async () => {
    const updates = {
      start_time: '14:00:00',
      end_time: '12:00:00', // End before start
    };

    const result = await updateAnySession(testSessionId, updates);

    expect(result.error).toBeDefined();
    expect(result.error).toContain('เวลา');
  });

  it('should delete a session and related records', async () => {
    // Create attendance record for the session
    await supabase.from('attendance').insert({
      training_session_id: testSessionId,
      athlete_id: adminUserId,
      status: 'present',
      check_in_method: 'manual',
    });

    const result = await deleteSession(testSessionId);

    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);

    // Verify session is deleted
    const { data: deletedSession } = await supabase
      .from('training_sessions')
      .select()
      .eq('id', testSessionId)
      .single();

    expect(deletedSession).toBeNull();

    // Verify attendance records are deleted
    const { data: attendanceRecords } = await supabase
      .from('attendance')
      .select()
      .eq('training_session_id', testSessionId);

    expect(attendanceRecords).toHaveLength(0);
  });

  it('should create audit logs for updates', async () => {
    // Get first available club
    const { data: club } = await supabase
      .from('clubs')
      .select('id')
      .limit(1)
      .single();

    if (!club) {
      throw new Error('No clubs found in database');
    }

    // Create a new session for this test
    const { data: newSession } = await supabase
      .from('training_sessions')
      .insert({
        club_id: club.id,
        coach_id: adminUserId,
        title: 'Audit Test Session',
        session_date: '2025-12-15',
        start_time: '10:00:00',
        end_time: '12:00:00',
        location: 'Test Location',
        status: 'scheduled',
      })
      .select()
      .single();

    if (!newSession) {
      throw new Error('Failed to create test session');
    }

    // Update the session
    await updateAnySession(newSession.id, {
      title: 'Updated for Audit',
    });

    // Check audit log was created
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select()
      .eq('entity_id', newSession.id)
      .eq('action_type', 'training_session.update')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(auditLogs).toBeDefined();
    expect(auditLogs?.length).toBeGreaterThan(0);
    expect(auditLogs?.[0].user_role).toBe('admin');

    // Clean up
    await deleteSession(newSession.id);
  });

  it('should create audit logs for deletions', async () => {
    // Get first available club
    const { data: club } = await supabase
      .from('clubs')
      .select('id')
      .limit(1)
      .single();

    if (!club) {
      throw new Error('No clubs found in database');
    }

    // Create a new session for this test
    const { data: newSession } = await supabase
      .from('training_sessions')
      .insert({
        club_id: club.id,
        coach_id: adminUserId,
        title: 'Delete Audit Test Session',
        session_date: '2025-12-20',
        start_time: '10:00:00',
        end_time: '12:00:00',
        location: 'Test Location',
        status: 'scheduled',
      })
      .select()
      .single();

    if (!newSession) {
      throw new Error('Failed to create test session');
    }

    const sessionId = newSession.id;

    // Delete the session
    await deleteSession(sessionId);

    // Check audit log was created
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select()
      .eq('entity_id', sessionId)
      .eq('action_type', 'training_session.delete')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(auditLogs).toBeDefined();
    expect(auditLogs?.length).toBeGreaterThan(0);
    expect(auditLogs?.[0].user_role).toBe('admin');
  });
});
