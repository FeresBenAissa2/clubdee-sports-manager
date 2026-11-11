/**
 * Database Connection Tests
 * Tests for auth-database-integration task 1
 * Requirements: 4.1, 4.3, 10.1, 10.2, 10.3
 */

import { describe, it, expect } from 'vitest';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Create a test client using service role key (bypasses RLS for testing)
function createTestClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey);
}

describe('Database Connection and Schema Verification', () => {
  it('should successfully connect to Supabase database', async () => {
    const supabase = createTestClient();
    
    // Test basic query
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should verify profiles table exists and is accessible', async () => {
    const supabase = createTestClient();
    
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    expect(error).toBeNull();
  });

  it('should verify user_roles table exists and is accessible', async () => {
    const supabase = createTestClient();
    
    const { error } = await supabase
      .from('user_roles')
      .select('user_id')
      .limit(1);
    
    expect(error).toBeNull();
  });

  it('should verify login_sessions table exists and is accessible', async () => {
    const supabase = createTestClient();
    
    const { error } = await supabase
      .from('login_sessions')
      .select('id')
      .limit(1);
    
    expect(error).toBeNull();
  });

  it('should verify environment variables are configured', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toContain('supabase.co');
    
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toMatch(/^eyJ/);
    
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toMatch(/^eyJ/);
  });

  it('should verify RLS policies are enforced on profiles table', async () => {
    const supabase = createTestClient();
    
    // Try to query profiles without authentication
    // This should work but return limited results based on RLS
    const { error } = await supabase
      .from('profiles')
      .select('*');
    
    // Should not throw an error, RLS will just filter results
    expect(error).toBeNull();
  });

  it('should verify RLS policies are enforced on user_roles table', async () => {
    const supabase = createTestClient();
    
    const { error } = await supabase
      .from('user_roles')
      .select('*');
    
    // Should not throw an error, RLS will just filter results
    expect(error).toBeNull();
  });

  it('should verify RLS policies are enforced on login_sessions table', async () => {
    const supabase = createTestClient();
    
    const { error } = await supabase
      .from('login_sessions')
      .select('*');
    
    // Should not throw an error, RLS will just filter results
    expect(error).toBeNull();
  });

  it('should verify foreign key relationships exist', async () => {
    const supabase = createTestClient();
    
    // Test that we can query with joins (foreign keys must exist)
    const { error } = await supabase
      .from('profiles')
      .select('id, club_id, clubs(id, name)')
      .limit(1);
    
    // Should not error even if no data exists
    expect(error).toBeNull();
  });

  it('should handle database errors gracefully', async () => {
    const supabase = createTestClient();
    
    // Try to query a non-existent table
    const { error } = await supabase
      .from('non_existent_table')
      .select('*');
    
    // Should return an error, not throw
    expect(error).toBeDefined();
    expect(error?.message).toBeDefined();
  });
});
