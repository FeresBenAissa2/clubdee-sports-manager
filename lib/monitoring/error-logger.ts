'use server';

import { createClient } from '@/lib/db/server';

export type ErrorType = 
  | 'auth' 
  | 'registration' 
  | 'rate_limit' 
  | 'validation' 
  | 'database' 
  | 'unknown';

interface LogErrorParams {
  errorType: ErrorType;
  errorCode?: string;
  errorMessage: string;
  errorDetails?: Record<string, any>;
  pageUrl?: string;
}

/**
 * Log errors to the database to track user-facing issues
 */
export async function logError(params: LogErrorParams) {
  try {
    const db = await createClient();
    
    // Load user (if signed in)
    const { data: { user } } = await db.auth.getUser();
    
    // Write error log
    const { error } = await (db as any)
      .from('error_logs')
      .insert({
        user_id: user?.id || null,
        error_type: params.errorType,
        error_code: params.errorCode,
        error_message: params.errorMessage,
        error_details: params.errorDetails || null,
        page_url: params.pageUrl,
        // Note: ip_address and user_agent may be set by a database trigger or middleware
      });
    
    if (error) {
      console.error('Failed to log error:', error);
    }
  } catch (err) {
    // Do not throw — avoid breaking the main flow
    console.error('Error in logError:', err);
  }
}

/**
 * Log registration steps to see where users get stuck
 */
export async function logRegistrationStep(
  step: 'started' | 'auth_created' | 'profile_created' | 'athlete_created' | 'completed' | 'failed',
  email: string,
  userId?: string,
  stepData?: Record<string, any>,
  errorMessage?: string
) {
  try {
    const db = await createClient();
    
    const { error } = await (db as any)
      .from('registration_audit')
      .insert({
        user_id: userId || null,
        email,
        step,
        step_data: stepData || null,
        error_message: errorMessage || null,
      });
    
    if (error) {
      console.error('Failed to log registration step:', error);
    }
  } catch (err) {
    console.error('Error in logRegistrationStep:', err);
  }
}

/**
 * Fetch common errors (for admin)
 */
export async function getCommonErrors(hours: number = 24) {
  const db = await createClient();
  
  const { data, error } = await (db as any)
    .from('error_logs')
    .select('error_type, error_code, error_message')
    .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false});
  
  if (error) {
    console.error('Failed to get common errors:', error);
    return [];
  }
  
  // Count each distinct error
  const errorCounts = (data || []).reduce((acc: any, err: any) => {
    const key = `${err.error_type}:${err.error_code}`;
    if (!acc[key]) {
      acc[key] = {
        error_type: err.error_type,
        error_code: err.error_code,
        error_message: err.error_message,
        count: 0,
      };
    }
    acc[key].count++;
    return acc;
  }, {} as Record<string, any>);
  
  return Object.values(errorCounts)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Fetch incomplete registrations (for admin)
 */
export async function getIncompleteRegistrations() {
  const db = await createClient();
  
  const { data, error } = await db
    .from('incomplete_registrations')
    .select('*')
    .limit(50);
  
  if (error) {
    console.error('Failed to get incomplete registrations:', error);
    return [];
  }
  
  return data;
}
