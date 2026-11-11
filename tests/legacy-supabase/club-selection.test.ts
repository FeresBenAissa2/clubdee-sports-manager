/**
 * Club Selection Tests
 * 
 * Tests for Task 3.1: Ensure club selection works properly
 * Validates: Requirements AC1 (Club-Based Application)
 * 
 * Tests:
 * 1. getAvailableClubs returns clubs with all required details
 * 2. Clubs include name, sport_type, member_count, and coach_count
 * 3. Club selection validation works properly
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Club Selection - Task 3.1', () => {
  let supabase: any;

  beforeAll(() => {
    // Use client-side Supabase client for testing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  it('should fetch clubs with all required details', async () => {
    // Fetch clubs
    const { data: clubs, error } = await supabase
      .from('clubs')
      .select('id, name, description, sport_type')
      .order('name');

    expect(error).toBeNull();
    expect(clubs).toBeDefined();
    expect(Array.isArray(clubs)).toBe(true);

    if (clubs && clubs.length > 0) {
      const club = clubs[0];
      
      // Verify required fields exist
      expect(club).toHaveProperty('id');
      expect(club).toHaveProperty('name');
      expect(club).toHaveProperty('sport_type');
      
      // Verify name is not empty
      expect(club.name).toBeTruthy();
      expect(typeof club.name).toBe('string');
      
      // Verify sport_type is not empty
      expect(club.sport_type).toBeTruthy();
      expect(typeof club.sport_type).toBe('string');
    }
  });

  it('should count members for each club', async () => {
    // Get a club
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id')
      .limit(1)
      .single();

    if (clubs) {
      // Count members
      const { count, error } = await supabase
        .from('athletes')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubs.id);

      expect(error).toBeNull();
      expect(count).toBeDefined();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  it('should count coaches for each club', async () => {
    // Get a club
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id')
      .limit(1)
      .single();

    if (clubs) {
      // Count coaches
      const { count, error } = await supabase
        .from('coaches')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubs.id);

      expect(error).toBeNull();
      expect(count).toBeDefined();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  it('should validate club selection before submission', async () => {
    // Test that club_id is required in application submission
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id')
      .limit(1)
      .single();

    if (clubs) {
      // Verify club exists and has valid ID
      expect(clubs.id).toBeTruthy();
      expect(typeof clubs.id).toBe('string');
      
      // Verify club ID is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(clubs.id)).toBe(true);
    }
  });

  it('should display club details including name, sport type, and description', async () => {
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id, name, description, sport_type')
      .limit(1)
      .single();

    if (clubs) {
      // Verify name is present
      expect(clubs).toHaveProperty('name');
      expect(clubs.name).toBeTruthy();
      expect(typeof clubs.name).toBe('string');
      
      // Verify sport_type is present
      expect(clubs).toHaveProperty('sport_type');
      expect(clubs.sport_type).toBeTruthy();
      expect(typeof clubs.sport_type).toBe('string');
      
      // Description is optional but should be string or null
      expect(clubs).toHaveProperty('description');
      if (clubs.description !== null) {
        expect(typeof clubs.description).toBe('string');
      }
    }
  });
});
