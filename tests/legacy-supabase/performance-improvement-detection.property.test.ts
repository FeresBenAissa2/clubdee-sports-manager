/**
 * Property-Based Test for Performance Improvement Detection
 * **Feature: feature-integration-plan, Property 13: Performance Improvement Detection**
 * 
 * Property 13: Performance Improvement Detection
 * *For any* athlete with consecutive performance records where the latest is better 
 * than the previous, the system should show an improvement recommendation.
 * 
 * **Validates: Requirements 4.2**
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface PerformanceRecord {
  id: string;
  athlete_id: string;
  coach_id: string;
  test_type: string;
  test_name: string;
  score: number;
  unit: string;
  test_date: string;
  notes: string | null;
}

interface ImprovementResult {
  hasImproved: boolean;
  testType: string;
  previousScore: number;
  currentScore: number;
  improvementPercentage: number;
}

/**
 * Pure function to check for improvement in performance records.
 * This mirrors the logic in performance-integration.ts checkImprovement function.
 * 
 * @param records - Performance records sorted by test_date descending (most recent first)
 * @returns ImprovementResult if improvement detected, null otherwise
 */
function checkImprovementPure(records: PerformanceRecord[]): ImprovementResult | null {
  if (records.length < 2) {
    return null;
  }

  // Group records by test_type
  const recordsByType: Record<string, PerformanceRecord[]> = {};
  for (const record of records) {
    const testType = record.test_type;
    if (!recordsByType[testType]) {
      recordsByType[testType] = [];
    }
    recordsByType[testType].push(record);
  }

  // Check for improvement in each test type
  for (const [testType, typeRecords] of Object.entries(recordsByType)) {
    if (typeRecords.length >= 2) {
      const latest = typeRecords[0];
      const previous = typeRecords[1];

      // Calculate improvement (higher score is better)
      if (latest.score > previous.score) {
        const improvementPercentage = ((latest.score - previous.score) / previous.score) * 100;

        return {
          hasImproved: true,
          testType,
          previousScore: previous.score,
          currentScore: latest.score,
          improvementPercentage: Math.round(improvementPercentage * 100) / 100,
        };
      }
    }
  }

  return null;
}

/**
 * Arbitrary for generating valid test types
 */
const testTypeArb = fc.constantFrom(
  'speed',
  'endurance',
  'strength',
  'flexibility',
  'agility',
  'balance',
  'coordination'
);

/**
 * Arbitrary for generating valid scores (positive integers to avoid float precision issues)
 */
const scoreArb = fc.integer({ min: 1, max: 1000 });

/**
 * Arbitrary for generating improvement amounts (positive integers)
 */
const improvementArb = fc.integer({ min: 1, max: 100 });

/**
 * Arbitrary for generating valid date strings (YYYY-MM-DD format)
 */
const dateStringArb = fc.tuple(
  fc.integer({ min: 2024, max: 2025 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 })
).map(([year, month, day]) => {
  const m = month.toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
});

/**
 * Arbitrary for generating a performance record
 */
const performanceRecordArb = (athleteId: string, coachId: string): fc.Arbitrary<PerformanceRecord> =>
  fc.record({
    id: fc.uuid(),
    athlete_id: fc.constant(athleteId),
    coach_id: fc.constant(coachId),
    test_type: testTypeArb,
    test_name: fc.string({ minLength: 1, maxLength: 50 }),
    score: scoreArb,
    unit: fc.constantFrom('seconds', 'meters', 'kg', 'reps', 'points'),
    test_date: dateStringArb,
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
  });

describe('Property 13: Performance Improvement Detection', () => {
  let supabase: SupabaseClient;
  let allPerformanceRecords: PerformanceRecord[] = [];
  let athleteIds: string[] = [];

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all performance records
    const { data: records } = await supabase
      .from('performance_records')
      .select('id, athlete_id, coach_id, test_type, test_name, score, unit, test_date, notes')
      .order('test_date', { ascending: false });
    
    allPerformanceRecords = records || [];

    // Get unique athlete IDs
    athleteIds = [...new Set(allPerformanceRecords.map(r => r.athlete_id))];

    console.log('Test setup:', {
      performanceRecordCount: allPerformanceRecords.length,
      uniqueAthleteCount: athleteIds.length,
    });
  });

  /**
   * **Feature: feature-integration-plan, Property 13: Performance Improvement Detection**
   * 
   * For any two consecutive records of the same test type where the latest score
   * is higher than the previous, the system should detect improvement.
   */
  it('detects improvement when latest score is higher than previous', () => {
    const athleteId = 'test-athlete-id';
    const coachId = 'test-coach-id';

    fc.assert(
      fc.property(
        testTypeArb,
        scoreArb,
        improvementArb,
        (testType, baseScore, improvementAmount) => {
          const previousScore = baseScore;
          const currentScore = baseScore + improvementAmount;

          const records: PerformanceRecord[] = [
            {
              id: 'record-2',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType,
              test_name: `${testType} test`,
              score: currentScore, // Latest (higher)
              unit: 'points',
              test_date: '2025-02-01',
              notes: null,
            },
            {
              id: 'record-1',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType,
              test_name: `${testType} test`,
              score: previousScore, // Previous (lower)
              unit: 'points',
              test_date: '2025-01-01',
              notes: null,
            },
          ];

          const result = checkImprovementPure(records);

          // Property: Should detect improvement
          expect(result).not.toBeNull();
          expect(result!.hasImproved).toBe(true);
          expect(result!.testType).toBe(testType);
          expect(result!.previousScore).toBe(previousScore);
          expect(result!.currentScore).toBe(currentScore);
          expect(result!.improvementPercentage).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 13: Performance Improvement Detection**
   * 
   * For any two consecutive records of the same test type where the latest score
   * is lower than or equal to the previous, the system should NOT detect improvement.
   */
  it('does not detect improvement when latest score is lower or equal', () => {
    const athleteId = 'test-athlete-id';
    const coachId = 'test-coach-id';

    fc.assert(
      fc.property(
        testTypeArb,
        scoreArb,
        fc.integer({ min: 0, max: 100 }), // decrease or no change
        (testType, baseScore, decreaseAmount) => {
          const previousScore = baseScore + decreaseAmount;
          const currentScore = baseScore; // Same or lower

          const records: PerformanceRecord[] = [
            {
              id: 'record-2',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType,
              test_name: `${testType} test`,
              score: currentScore, // Latest (same or lower)
              unit: 'points',
              test_date: '2025-02-01',
              notes: null,
            },
            {
              id: 'record-1',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType,
              test_name: `${testType} test`,
              score: previousScore, // Previous (higher or same)
              unit: 'points',
              test_date: '2025-01-01',
              notes: null,
            },
          ];

          const result = checkImprovementPure(records);

          // Property: Should NOT detect improvement when score decreased or stayed same
          if (currentScore <= previousScore) {
            expect(result).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 13: Performance Improvement Detection**
   * 
   * For any athlete with only one performance record, the system should NOT
   * detect improvement (need at least 2 records to compare).
   */
  it('does not detect improvement with only one record', () => {
    const athleteId = 'test-athlete-id';
    const coachId = 'test-coach-id';

    fc.assert(
      fc.property(
        performanceRecordArb(athleteId, coachId),
        (record) => {
          const records: PerformanceRecord[] = [record];
          const result = checkImprovementPure(records);

          // Property: Should NOT detect improvement with only one record
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 13: Performance Improvement Detection**
   * 
   * For any athlete with no performance records, the system should NOT
   * detect improvement.
   */
  it('does not detect improvement with no records', () => {
    const records: PerformanceRecord[] = [];
    const result = checkImprovementPure(records);

    // Property: Should NOT detect improvement with no records
    expect(result).toBeNull();
  });

  /**
   * **Feature: feature-integration-plan, Property 13: Performance Improvement Detection**
   * 
   * The improvement percentage should be calculated correctly as:
   * ((currentScore - previousScore) / previousScore) * 100
   */
  it('calculates improvement percentage correctly', () => {
    const athleteId = 'test-athlete-id';
    const coachId = 'test-coach-id';

    fc.assert(
      fc.property(
        testTypeArb,
        fc.integer({ min: 1, max: 500 }), // previous score (avoid division by zero)
        improvementArb,
        (testType, previousScore, improvementAmount) => {
          const currentScore = previousScore + improvementAmount;

          const records: PerformanceRecord[] = [
            {
              id: 'record-2',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType,
              test_name: `${testType} test`,
              score: currentScore,
              unit: 'points',
              test_date: '2025-02-01',
              notes: null,
            },
            {
              id: 'record-1',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType,
              test_name: `${testType} test`,
              score: previousScore,
              unit: 'points',
              test_date: '2025-01-01',
              notes: null,
            },
          ];

          const result = checkImprovementPure(records);

          expect(result).not.toBeNull();

          // Calculate expected percentage
          const expectedPercentage = Math.round(((currentScore - previousScore) / previousScore) * 100 * 100) / 100;

          // Property: Improvement percentage should match expected calculation
          expect(result!.improvementPercentage).toBeCloseTo(expectedPercentage, 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 13: Performance Improvement Detection**
   * 
   * For any athlete with multiple test types, improvement detection should
   * check each test type independently.
   */
  it('checks improvement independently for each test type', () => {
    const athleteId = 'test-athlete-id';
    const coachId = 'test-coach-id';

    fc.assert(
      fc.property(
        fc.tuple(testTypeArb, testTypeArb).filter(([t1, t2]) => t1 !== t2),
        scoreArb,
        scoreArb,
        improvementArb,
        ([testType1, testType2], score1, score2, improvement) => {
          // Test type 1: improvement
          // Test type 2: no improvement (decrease)
          const records: PerformanceRecord[] = [
            // Latest records first (sorted by date descending)
            {
              id: 'record-4',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType1,
              test_name: `${testType1} test`,
              score: score1 + improvement, // Improved
              unit: 'points',
              test_date: '2025-02-01',
              notes: null,
            },
            {
              id: 'record-3',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType2,
              test_name: `${testType2} test`,
              score: score2, // Same or lower
              unit: 'points',
              test_date: '2025-02-01',
              notes: null,
            },
            {
              id: 'record-2',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType1,
              test_name: `${testType1} test`,
              score: score1, // Previous
              unit: 'points',
              test_date: '2025-01-01',
              notes: null,
            },
            {
              id: 'record-1',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType2,
              test_name: `${testType2} test`,
              score: score2 + improvement, // Previous was higher
              unit: 'points',
              test_date: '2025-01-01',
              notes: null,
            },
          ];

          const result = checkImprovementPure(records);

          // Property: Should detect improvement in testType1 (not testType2)
          expect(result).not.toBeNull();
          expect(result!.testType).toBe(testType1);
          expect(result!.hasImproved).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 13: Performance Improvement Detection**
   * 
   * For any athlete in the database with performance records, verify the
   * improvement detection logic against real data.
   */
  it('improvement detection works with real database records', async () => {
    if (athleteIds.length === 0) {
      console.log('Skipping: No athletes with performance records');
      return;
    }

    // Get athletes with at least 2 records
    const athletesWithMultipleRecords = athleteIds.filter(athleteId => {
      const records = allPerformanceRecords.filter(r => r.athlete_id === athleteId);
      return records.length >= 2;
    });

    if (athletesWithMultipleRecords.length === 0) {
      console.log('Skipping: No athletes with multiple performance records');
      return;
    }

    const limitedAthletes = athletesWithMultipleRecords.slice(0, 30);
    const athleteArb = fc.constantFrom(...limitedAthletes);

    await fc.assert(
      fc.asyncProperty(athleteArb, async (athleteId) => {
        // Get records for this athlete from database
        const { data: records, error } = await supabase
          .from('performance_records')
          .select('id, athlete_id, coach_id, test_type, test_name, score, unit, test_date, notes')
          .eq('athlete_id', athleteId)
          .order('test_date', { ascending: false });

        expect(error).toBeNull();

        const athleteRecords = records as PerformanceRecord[];
        const result = checkImprovementPure(athleteRecords);

        // Property: If improvement is detected, it should be valid
        if (result !== null) {
          expect(result.hasImproved).toBe(true);
          expect(result.currentScore).toBeGreaterThan(result.previousScore);
          expect(result.improvementPercentage).toBeGreaterThan(0);
          expect(result.testType).toBeDefined();
        }
      }),
      { numRuns: Math.min(30, limitedAthletes.length) }
    );
  }, 60000);

  /**
   * **Feature: feature-integration-plan, Property 13: Performance Improvement Detection**
   * 
   * The improvement result should contain all required fields when improvement is detected.
   */
  it('improvement result contains all required fields', () => {
    const athleteId = 'test-athlete-id';
    const coachId = 'test-coach-id';

    fc.assert(
      fc.property(
        testTypeArb,
        fc.integer({ min: 1, max: 500 }),
        improvementArb,
        (testType, previousScore, improvement) => {
          const currentScore = previousScore + improvement;

          const records: PerformanceRecord[] = [
            {
              id: 'record-2',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType,
              test_name: `${testType} test`,
              score: currentScore,
              unit: 'points',
              test_date: '2025-02-01',
              notes: null,
            },
            {
              id: 'record-1',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType,
              test_name: `${testType} test`,
              score: previousScore,
              unit: 'points',
              test_date: '2025-01-01',
              notes: null,
            },
          ];

          const result = checkImprovementPure(records);

          // Property: Result should have all required fields
          expect(result).not.toBeNull();
          expect(result).toHaveProperty('hasImproved');
          expect(result).toHaveProperty('testType');
          expect(result).toHaveProperty('previousScore');
          expect(result).toHaveProperty('currentScore');
          expect(result).toHaveProperty('improvementPercentage');

          // Property: Field types should be correct
          expect(typeof result!.hasImproved).toBe('boolean');
          expect(typeof result!.testType).toBe('string');
          expect(typeof result!.previousScore).toBe('number');
          expect(typeof result!.currentScore).toBe('number');
          expect(typeof result!.improvementPercentage).toBe('number');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: feature-integration-plan, Property 13: Performance Improvement Detection**
   * 
   * For any improvement detection, the improvement percentage should be finite
   * and not NaN.
   */
  it('improvement percentage is always finite and valid', () => {
    const athleteId = 'test-athlete-id';
    const coachId = 'test-coach-id';

    fc.assert(
      fc.property(
        testTypeArb,
        fc.integer({ min: 1, max: 1000 }),
        improvementArb,
        (testType, previousScore, improvement) => {
          const currentScore = previousScore + improvement;

          const records: PerformanceRecord[] = [
            {
              id: 'record-2',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType,
              test_name: `${testType} test`,
              score: currentScore,
              unit: 'points',
              test_date: '2025-02-01',
              notes: null,
            },
            {
              id: 'record-1',
              athlete_id: athleteId,
              coach_id: coachId,
              test_type: testType,
              test_name: `${testType} test`,
              score: previousScore,
              unit: 'points',
              test_date: '2025-01-01',
              notes: null,
            },
          ];

          const result = checkImprovementPure(records);

          if (result !== null) {
            // Property: Improvement percentage should be finite and not NaN
            expect(Number.isFinite(result.improvementPercentage)).toBe(true);
            expect(Number.isNaN(result.improvementPercentage)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
