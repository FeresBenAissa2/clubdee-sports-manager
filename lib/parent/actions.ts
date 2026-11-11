'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';

export interface ParentConnection {
  id: string;
  athlete_id: string;
  parent_email: string;
  parent_name: string;
  relationship: 'father' | 'mother' | 'guardian';
  phone_number?: string;
  is_verified: boolean;
  verification_token?: string;
  verification_sent_at?: string;
  verified_at?: string;
  notify_attendance: boolean;
  notify_performance: boolean;
  notify_leave_requests: boolean;
  notify_announcements: boolean;
  notify_goals: boolean;
  notification_frequency: 'immediate' | 'daily' | 'weekly';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddParentInput {
  parentEmail: string;
  parentName: string;
  relationship: 'father' | 'mother' | 'guardian';
  phoneNumber?: string;
}

export interface NotificationPreferences {
  notify_attendance?: boolean;
  notify_performance?: boolean;
  notify_leave_requests?: boolean;
  notify_announcements?: boolean;
  notify_goals?: boolean;
  notification_frequency?: 'immediate' | 'daily' | 'weekly';
}

/**
 * Add a parent connection
 */
export async function addParentConnection(input: AddParentInput) {
  try {
    const db = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    
    // Get athlete profile
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'User not found' };
    }
    
    const { data: athlete, error: athleteError } = await sb
      .from('athletes')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (athleteError || !athlete) {
      return { success: false, error: 'Athlete profile not found' };
    }
    
    // Generate verification token
    const verificationToken = crypto.randomUUID();
    
    // Insert parent connection
    const { data, error } = await sb
      .from('parent_connections')
      .insert({
        athlete_id: athlete.id,
        parent_email: input.parentEmail,
        parent_name: input.parentName,
        relationship: input.relationship,
        phone_number: input.phoneNumber,
        verification_token: verificationToken,
        verification_sent_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'This email has already been added' };
      }
      return { success: false, error: error.message };
    }
    
    // TODO: Send verification email
    // await sendVerificationEmail(input.parentEmail, verificationToken);
    
    revalidatePath('/dashboard/athlete/profile');
    return { 
      success: true, 
      data,
      message: 'Parent added successfully. Ask them to check their email to confirm.'
    };
  } catch (error) {
    console.error('Error adding parent connection:', error);
    return { success: false, error: 'An error occurred while adding the parent' };
  }
}

/**
 * Confirm parent email
 */
export async function verifyParentConnection(token: string) {
  try {
    const db = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    
    const { data, error } = await sb
      .from('parent_connections')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('verification_token', token)
      .eq('is_verified', false)
      .select()
      .single();
    
    if (error) {
      return { success: false, error: 'Confirmation link is invalid or expired' };
    }
    
    return { 
      success: true, 
      data,
      message: 'Email confirmed successfully. You will receive notifications about your athlete.'
    };
  } catch (error) {
    console.error('Error verifying parent connection:', error);
    return { success: false, error: 'An error occurred while confirming email' };
  }
}

/**
 * List parent connections
 */
export async function getParentConnections(): Promise<ParentConnection[]> {
  try {
    const db = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) {
      throw new Error('User not found');
    }
    
    const { data: athlete, error: athleteError } = await sb
      .from('athletes')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (athleteError || !athlete) {
      throw new Error('Athlete profile not found');
    }
    
    const { data, error } = await sb
      .from('parent_connections')
      .select('*')
      .eq('athlete_id', athlete.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting parent connections:', error);
    return [];
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  connectionId: string,
  preferences: NotificationPreferences
) {
  try {
    const db = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    
    const { data, error } = await sb
      .from('parent_connections')
      .update(preferences)
      .eq('id', connectionId)
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath('/dashboard/athlete/profile');
    return { 
      success: true, 
      data,
      message: 'Settings updated successfully'
    };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return { success: false, error: 'An error occurred while updating settings' };
  }
}

/**
 * Resend confirmation email
 */
export async function resendVerificationEmail(connectionId: string) {
  try {
    const db = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    
    // Generate new token
    const verificationToken = crypto.randomUUID();
    
    const { data, error } = await sb
      .from('parent_connections')
      .update({
        verification_token: verificationToken,
        verification_sent_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .eq('is_verified', false)
      .select()
      .single();
    
    if (error) {
      return { success: false, error: 'Could not send confirmation email' };
    }
    
    // TODO: Send verification email
    // await sendVerificationEmail(data.parent_email, verificationToken);
    
    return { 
      success: true,
      message: 'Confirmation email sent successfully'
    };
  } catch (error) {
    console.error('Error resending verification email:', error);
    return { success: false, error: 'An error occurred while sending email' };
  }
}

/**
 * Remove a parent connection
 */
export async function removeParentConnection(connectionId: string) {
  try {
    const db = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    
    const { error } = await sb
      .from('parent_connections')
      .delete()
      .eq('id', connectionId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath('/dashboard/athlete/profile');
    return { 
      success: true,
      message: 'Parent removed successfully'
    };
  } catch (error) {
    console.error('Error removing parent connection:', error);
    return { success: false, error: 'An error occurred while removing the parent' };
  }
}

/**
 * Notification stats (for coach/admin)
 */
export async function getParentNotificationStats(athleteId: string) {
  try {
    const db = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    
    const { data, error } = await sb
      .from('parent_notifications')
      .select('type, delivery_status')
      .eq('athlete_id', athleteId);
    
    if (error) throw error;
    
    const stats = {
      total: data.length,
      sent: data.filter((n: { delivery_status: string }) => n.delivery_status === 'sent').length,
      pending: data.filter((n: { delivery_status: string }) => n.delivery_status === 'pending').length,
      failed: data.filter((n: { delivery_status: string }) => n.delivery_status === 'failed').length,
      byType: {
        attendance: data.filter((n: { type: string }) => n.type === 'attendance').length,
        performance: data.filter((n: { type: string }) => n.type === 'performance').length,
        leave: data.filter((n: { type: string }) => n.type === 'leave').length,
        announcement: data.filter((n: { type: string }) => n.type === 'announcement').length,
        goal: data.filter((n: { type: string }) => n.type === 'goal').length,
        report: data.filter((n: { type: string }) => n.type === 'report').length,
      }
    };
    
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting notification stats:', error);
    return { success: false, error: 'An error occurred while loading statistics' };
  }
}
