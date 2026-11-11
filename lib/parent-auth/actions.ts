'use server';

import { createClient } from '@/lib/db/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const PARENT_SESSION_COOKIE = 'parent_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface ParentUser {
  id: string;
  email: string;
  last_login_at?: string;
  login_count: number;
}

/**
 * Confirm email and set password
 */
export async function verifyAndSetPassword(token: string, password: string) {
  try {
    const db = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    
    // Validation
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    
    // Verify token
    const { data: connection, error: connError } = await sb
      .from('parent_connections')
      .select('*')
      .eq('verification_token', token)
      .eq('is_verified', false)
      .single();
    
    if (connError || !connection) {
      return { success: false, error: 'Confirmation link is invalid or expired' };
    }
    
    // Check expiry (7 days)
    const sentAt = new Date(connection.verification_sent_at);
    const now = new Date();
    const daysDiff = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 7) {
      return { success: false, error: 'Confirmation link has expired. Please request a new link.' };
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create parent_user
    const { data: parentUser, error: userError } = await sb
      .from('parent_users')
      .insert({
        email: connection.parent_email,
        password_hash: passwordHash,
      })
      .select()
      .single();
    
    if (userError) {
      if (userError.code === '23505') {
        return { success: false, error: 'This email is already in use' };
      }
      return { success: false, error: userError.message };
    }
    
    // Update parent_connections
    await sb
      .from('parent_connections')
      .update({
        parent_user_id: parentUser.id,
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', connection.id);
    
    // Create session
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    
    await sb
      .from('parent_sessions')
      .insert({
        parent_user_id: parentUser.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      });
    
    // Set cookie
    (await cookies()).set(PARENT_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/parent',
    });
    
    return { 
      success: true, 
      message: 'Email confirmed and account created successfully',
      user: {
        id: parentUser.id,
        email: parentUser.email,
      }
    };
  } catch (error) {
    console.error('Error verifying and setting password:', error);
    return { success: false, error: 'An error occurred while creating your account' };
  }
}

/**
 * Log in
 */
export async function parentLogin(email: string, password: string) {
  try {
    const db = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    
    // Validation
    if (!email || !password) {
      return { success: false, error: 'Please enter your email and password' };
    }
    
    // Load parent_user
    const { data: parentUser, error: userError } = await sb
      .from('parent_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();
    
    if (userError || !parentUser) {
      return { success: false, error: 'Incorrect email or password' };
    }
    
    // Check if account is locked
    if (parentUser.locked_until) {
      const lockedUntil = new Date(parentUser.locked_until);
      if (lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / (1000 * 60));
        return { 
          success: false, 
          error: `Account is locked. Please wait ${minutesLeft} minutes.` 
        };
      }
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, parentUser.password_hash);
    
    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = (parentUser.failed_login_attempts || 0) + 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any = { failed_login_attempts: failedAttempts };
      
      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updates.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
      }
      
      await sb
        .from('parent_users')
        .update(updates)
        .eq('id', parentUser.id);
      
      return { success: false, error: 'Incorrect email or password' };
    }
    
    // Successful login — reset failed attempts
    await sb
      .from('parent_users')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
        login_count: (parentUser.login_count || 0) + 1,
      })
      .eq('id', parentUser.id);
    
    // Create session
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    
    await sb
      .from('parent_sessions')
      .insert({
        parent_user_id: parentUser.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      });
    
    // Set cookie
    (await cookies()).set(PARENT_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/parent',
    });
    
    return { 
      success: true, 
      message: 'Signed in successfully',
      user: {
        id: parentUser.id,
        email: parentUser.email,
      }
    };
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: 'An error occurred while signing in' };
  }
}

/**
 * Log out
 */
export async function parentLogout() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(PARENT_SESSION_COOKIE)?.value;
    
    if (sessionToken) {
      const db = await createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = db as any;
      
      // Delete session
      await sb
        .from('parent_sessions')
        .delete()
        .eq('session_token', sessionToken);
    }
    
    // Clear cookie
    cookieStore.delete(PARENT_SESSION_COOKIE);
    
    return { success: true, message: 'Signed out successfully' };
  } catch (error) {
    console.error('Error logging out:', error);
    return { success: false, error: 'An error occurred while signing out' };
  }
}

/**
 * Validate session
 */
export async function getParentSession(): Promise<ParentUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(PARENT_SESSION_COOKIE)?.value;
    
    if (!sessionToken) {
      return null;
    }
    
    const db = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    
    // Load session
    const { data: session, error: sessionError } = await sb
      .from('parent_sessions')
      .select('*, parent_users(*)')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (sessionError || !session) {
      // Session expired — clear cookie
      cookieStore.delete(PARENT_SESSION_COOKIE);
      return null;
    }
    
    // Update last_activity_at
    await sb
      .from('parent_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', session.id);
    
    return {
      id: session.parent_users.id,
      email: session.parent_users.email,
      last_login_at: session.parent_users.last_login_at,
      login_count: session.parent_users.login_count,
    };
  } catch (error) {
    console.error('Error getting parent session:', error);
    return null;
  }
}

/**
 * Change password
 */
export async function changeParentPassword(oldPassword: string, newPassword: string) {
  try {
    const parentUser = await getParentSession();
    if (!parentUser) {
      return { success: false, error: 'Please sign in first' };
    }
    
    // Validation
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters' };
    }
    
    const db = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    
    // Load parent_user
    const { data: user, error: userError } = await sb
      .from('parent_users')
      .select('password_hash')
      .eq('id', parentUser.id)
      .single();
    
    if (userError || !user) {
      return { success: false, error: 'User not found' };
    }
    
    // Verify current password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isOldPasswordValid) {
      return { success: false, error: 'Current password is incorrect' };
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await sb
      .from('parent_users')
      .update({
        password_hash: newPasswordHash,
        password_changed_at: new Date().toISOString(),
      })
      .eq('id', parentUser.id);
    
    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: 'An error occurred while changing your password' };
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string) {
  try {
    const db = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    
    // Check if parent_user exists
    const { data: parentUser, error: userError } = await sb
      .from('parent_users')
      .select('id')
      .eq('email', email)
      .eq('is_active', true)
      .single();
    
    // Do not reveal if email was not found (security)
    if (userError || !parentUser) {
      return { 
        success: true, 
        message: 'If this email is registered, we will send a password reset link.' 
      };
    }
    
    // Create reset token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    await sb
      .from('parent_password_resets')
      .insert({
        parent_user_id: parentUser.id,
        reset_token: resetToken,
        expires_at: expiresAt.toISOString(),
      });
    
    // TODO: Send email
    // await sendPasswordResetEmail(email, resetToken);
    
    return { 
      success: true, 
      message: 'If this email is registered, we will send a password reset link.',
      resetToken, // TODO: Remove in production
    };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Reset password
 */
export async function resetPassword(token: string, newPassword: string) {
  try {
    const db = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = db as any;
    
    // Validation
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    
    // Verify token
    const { data: reset, error: resetError } = await sb
      .from('parent_password_resets')
      .select('*')
      .eq('reset_token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (resetError || !reset) {
      return { success: false, error: 'Password reset link is invalid or expired' };
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await sb
      .from('parent_users')
      .update({
        password_hash: newPasswordHash,
        password_changed_at: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq('id', reset.parent_user_id);
    
    // Mark token as used
    await sb
      .from('parent_password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('id', reset.id);
    
    // Delete all sessions
    await sb
      .from('parent_sessions')
      .delete()
      .eq('parent_user_id', reset.parent_user_id);
    
    return { success: true, message: 'Password reset successfully. Please sign in with your new password.' };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: 'An error occurred while resetting your password' };
  }
}
