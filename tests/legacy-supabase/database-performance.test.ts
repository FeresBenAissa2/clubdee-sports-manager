/**
 * Database Performance Testing
 * 
 * Tests database query performance, index usage, and optimization
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('Database Query Performance', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  });

  describe('Index Usage Verification', () => {
    it('should use index for profile lookups by user_id', async () => {
      const start = Date.now();

      await supabase
        .from('profiles')
        .select('id, full_name, club_id')
        .eq('user_id', '00000000-0000-0000-0000-000000000000')
        .single();

      const duration = Date.now() - start;

      console.log(`Profile lookup by user_id: ${duration}ms`);
      // Note: Includes network latency for remote database + cold start
      expect(duration).toBeLessThan(2000); // Should be fast with PK/unique index
    });

    it('should use index for sessions by club_id', async () => {
      const { data: club } = await supabase
        .from('clubs')
        .select('id')
        .limit(1)
        .single() as { data: { id: string } | null };

      if (!club) {
        console.log('⚠️  No clubs found, skipping test');
        return;
      }

      const start = Date.now();

      await supabase
        .from('training_sessions')
        .select('id, title, scheduled_at')
        .eq('club_id', club.id)
        .order('scheduled_at', { ascending: false })
        .limit(20);

      const duration = Date.now() - start;

      console.log(`Sessions by club_id: ${duration}ms`);
      expect(duration).toBeLessThan(1000); // Should use idx_training_sessions_club_id
    });

    it('should use index for attendance by session_id', async () => {
      const { data: session } = await supabase
        .from('training_sessions')
        .select('id')
        .limit(1)
        .single() as { data: { id: string } | null };

      if (!session) {
        console.log('⚠️  No sessions found, skipping test');
        return;
      }

      const start = Date.now();

      await supabase
        .from('attendance')
        .select('id, status, athlete_id')
        .eq('session_id', session.id);

      const duration = Date.now() - start;

      console.log(`Attendance by session_id: ${duration}ms`);
      expect(duration).toBeLessThan(1000); // Should use idx_attendance_session_id
    });

    it('should use index for attendance by athlete_id', async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single() as { data: { id: string } | null };

      if (!profile) {
        console.log('⚠️  No profiles found, skipping test');
        return;
      }

      const start = Date.now();

      await supabase
        .from('attendance')
        .select('id, status, session_id')
        .eq('athlete_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const duration = Date.now() - start;

      console.log(`Attendance by athlete_id: ${duration}ms`);
      expect(duration).toBeLessThan(1000); // Should use idx_attendance_athlete_id
    });

    it('should use composite index for attendance queries', async () => {
      const { data: session } = await supabase
        .from('training_sessions')
        .select('id')
        .limit(1)
        .single() as { data: { id: string } | null };

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single() as { data: { id: string } | null };

      if (!session || !profile) {
        console.log('⚠️  No test data found, skipping test');
        return;
      }

      const start = Date.now();

      await supabase
        .from('attendance')
        .select('id, status')
        .eq('session_id', session.id)
        .eq('athlete_id', profile.id)
        .single();

      const duration = Date.now() - start;

      console.log(`Attendance by session_id + athlete_id: ${duration}ms`);
      expect(duration).toBeLessThan(1000); // Should use composite index
    });
  });

  describe('Complex Query Performance', () => {
    it('should efficiently join profiles with attendance', async () => {
      const { data: session } = await supabase
        .from('training_sessions')
        .select('id')
        .limit(1)
        .single() as { data: { id: string } | null };

      if (!session) {
        console.log('⚠️  No sessions found, skipping test');
        return;
      }

      const start = Date.now();

      await supabase
        .from('attendance')
        .select(
          `
          id,
          status,
          check_in_time,
          athlete:profiles!attendance_athlete_id_fkey(
            id,
            full_name,
            nickname
          )
        `
        )
        .eq('session_id', session.id);

      const duration = Date.now() - start;

      console.log(`Attendance with athlete join: ${duration}ms`);
      expect(duration).toBeLessThan(1000); // 2-table join should be fast
    });

    it('should efficiently join sessions with club and coach', async () => {
      const { data: club } = await supabase
        .from('clubs')
        .select('id')
        .limit(1)
        .single() as { data: { id: string } | null };

      if (!club) {
        console.log('⚠️  No clubs found, skipping test');
        return;
      }

      const start = Date.now();

      await supabase
        .from('training_sessions')
        .select(
          `
          id,
          title,
          scheduled_at,
          club:clubs(
            id,
            name
          ),
          coach:profiles!training_sessions_coach_id_fkey(
            id,
            full_name
          )
        `
        )
        .eq('club_id', club.id)
        .limit(20);

      const duration = Date.now() - start;

      console.log(`Sessions with club and coach join: ${duration}ms`);
      expect(duration).toBeLessThan(1000); // 3-table join
    });

    it('should efficiently calculate attendance statistics', async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single() as { data: { id: string } | null };

      if (!profile) {
        console.log('⚠️  No profiles found, skipping test');
        return;
      }

      const start = Date.now();

      // Simulate attendance statistics calculation
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('athlete_id', profile.id) as { data: Array<{ status: string }> | null };

      if (attendance) {
        // Calculate stats to simulate real usage
        const _stats = {
          total: attendance.length,
          present: attendance.filter((a) => a.status === 'present').length,
          absent: attendance.filter((a) => a.status === 'absent').length,
          late: attendance.filter((a) => a.status === 'late').length,
          excused: attendance.filter((a) => a.status === 'excused').length,
        };
      }

      const duration = Date.now() - start;

      console.log(`Attendance statistics calculation: ${duration}ms`);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Bulk Operation Performance', () => {
    it('should efficiently query large result sets with pagination', async () => {
      const pageSize = 50;
      const start = Date.now();

      await supabase
        .from('profiles')
        .select('id, full_name, club_id')
        .range(0, pageSize - 1);

      const duration = Date.now() - start;

      console.log(`Paginated query (${pageSize} records): ${duration}ms`);
      expect(duration).toBeLessThan(1000);
    });

    it('should efficiently count records', async () => {
      const start = Date.now();

      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const duration = Date.now() - start;

      console.log(`Count query: ${duration}ms (${count} records)`);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('RLS Policy Performance', () => {
    it('should efficiently apply RLS policies on queries', async () => {
      // Create a test user session
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      if (!authData.user) {
        console.log('⚠️  Test user not found, skipping RLS test');
        return;
      }

      const start = Date.now();

      // Query with RLS enforcement
      await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(10);

      const duration = Date.now() - start;

      console.log(`Query with RLS enforcement: ${duration}ms`);
      expect(duration).toBeLessThan(2000);

      await supabase.auth.signOut();
    });
  });

  describe('Query Optimization Recommendations', () => {
    it('should identify slow queries', { timeout: 10000 }, async () => {
      const queries = [
        {
          name: 'Profile lookup',
          fn: () => supabase.from('profiles').select('*').limit(1),
          threshold: 2000, // Adjusted for network latency
        },
        {
          name: 'Session list',
          fn: () => supabase.from('training_sessions').select('*').limit(20),
          threshold: 2000, // Adjusted for network latency
        },
        {
          name: 'Attendance list',
          fn: () => supabase.from('attendance').select('*').limit(50),
          threshold: 2000, // Adjusted for network latency
        },
      ];

      const slowQueries: string[] = [];

      for (const { name, fn, threshold } of queries) {
        const start = Date.now();
        await fn();
        const duration = Date.now() - start;

        console.log(`${name}: ${duration}ms (threshold: ${threshold}ms)`);

        if (duration > threshold) {
          slowQueries.push(`${name} (${duration}ms > ${threshold}ms)`);
        }
      }

      if (slowQueries.length > 0) {
        console.warn('\n⚠️  Slow queries detected:');
        slowQueries.forEach((q) => console.warn(`   - ${q}`));
      }

      expect(slowQueries.length).toBe(0);
    });
  });

  describe('Connection Pool Performance', () => {
    it('should handle multiple concurrent queries efficiently', async () => {
      const concurrentQueries = 20;
      const start = Date.now();

      const promises = Array.from({ length: concurrentQueries }, () =>
        supabase.from('profiles').select('id').limit(1)
      );

      await Promise.all(promises);

      const duration = Date.now() - start;
      const avgDuration = duration / concurrentQueries;

      console.log(
        `${concurrentQueries} concurrent queries: ${duration}ms total, ${avgDuration.toFixed(2)}ms avg`
      );

      expect(avgDuration).toBeLessThan(200); // Adjusted for network latency
    });
  });
});

describe('Query Plan Analysis', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  });

  it('should verify no full table scans on large tables', async () => {
    // This test would ideally use EXPLAIN ANALYZE, but Supabase doesn't expose that
    // Instead, we verify that queries complete within expected time bounds

    const largeTableQueries = [
      {
        table: 'profiles',
        query: () =>
          supabase
            .from('profiles')
            .select('id')
            .eq('club_id', '00000000-0000-0000-0000-000000000000'),
        maxTime: 1000,
      },
      {
        table: 'training_sessions',
        query: () =>
          supabase
            .from('training_sessions')
            .select('id')
            .eq('club_id', '00000000-0000-0000-0000-000000000000'),
        maxTime: 1000,
      },
      {
        table: 'attendance',
        query: () =>
          supabase
            .from('attendance')
            .select('id')
            .eq('session_id', '00000000-0000-0000-0000-000000000000'),
        maxTime: 1000,
      },
    ];

    for (const { table, query, maxTime } of largeTableQueries) {
      const start = Date.now();
      await query();
      const duration = Date.now() - start;

      console.log(`${table} indexed query: ${duration}ms`);

      // If query takes too long, likely doing full table scan
      expect(duration).toBeLessThan(maxTime);
    }
  });
});
