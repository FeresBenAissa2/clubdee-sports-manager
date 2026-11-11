'use server';

import { createClient } from '@/lib/db/server';
import { revalidatePath } from 'next/cache';
import {
  PerformanceRecord,
  ImprovementResult,
  TrendData,
  IntegrationError,
  IntegrationErrorType,
} from '@/types/integration';

/**
 * Performance Integration Module
 * 
 * Handles the integration between Coach performance recording and Athlete dashboard.
 * Implements the PerformanceIntegration interface from the design document.
 * 
 * Features:
 * - Coach records performance → Athletes see it in their dashboard
 * - Improvement detection for recommendations
 * - Trend analysis for performance charts
 */

/**
 * Called when a coach records a new performance test result.
 * Triggers revalidation of athlete dashboards to show the new record.
 * 
 * @param record - The newly created performance record
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 4.1** - Performance record visibility in athlete dashboard
 */
export async function onPerformanceRecorded(record: PerformanceRecord): Promise<void> {
  try {
    // Revalidate athlete dashboard paths to show new performance record
    revalidatePath('/dashboard/athlete');
    revalidatePath('/dashboard/athlete/performance');
    
    // Revalidate coach paths as well
    revalidatePath('/dashboard/coach/performance');
    revalidatePath(`/dashboard/coach/athletes/${record.athleteId}`);

    console.log(`[PerformanceIntegration] Performance recorded: ${record.id} for athlete ${record.athleteId}`);
  } catch (error) {
    console.error('[PerformanceIntegration] Error in onPerformanceRecorded:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to process performance recording',
      { recordId: record.id }
    );
  }
}

/**
 * Checks if an athlete has improved in any test type.
 * Compares the latest two records of the same test type.
 * 
 * @param athleteId - The ID of the athlete
 * @returns ImprovementResult if improvement detected, null otherwise
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 4.2** - Performance improvement detection
 */
export async function checkImprovement(athleteId: string): Promise<ImprovementResult | null> {
  const db = await createClient();

  try {
    // Get the latest performance records for the athlete
    const { data: records, error } = await db
      .from('performance_records')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('test_date', { ascending: false })
      .limit(20) as { data: any[] | null; error: any };

    if (error) {
      throw error;
    }

    if (!records || records.length < 2) {
      return null;
    }

    // Group records by test_type
    const recordsByType: Record<string, any[]> = {};
    for (const record of records) {
      const testType = record.test_type as string;
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
  } catch (error) {
    console.error('[PerformanceIntegration] Error in checkImprovement:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to check performance improvement',
      { athleteId }
    );
  }
}


/**
 * Gets the performance trend data for an athlete in a specific test type.
 * Used for generating charts showing progress over time.
 * 
 * @param athleteId - The ID of the athlete
 * @param testType - The type of test to get trend for
 * @returns TrendData with data points and trend direction
 * @throws IntegrationError if the operation fails
 * 
 * **Validates: Requirements 4.4** - Performance history with trend analysis
 */
export async function getPerformanceTrend(
  athleteId: string,
  testType: string
): Promise<TrendData> {
  const db = await createClient();

  try {
    // Get all records for this athlete and test type
    const { data: records, error } = await db
      .from('performance_records')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('test_type', testType)
      .order('test_date', { ascending: true });

    if (error) {
      throw error;
    }

    // Transform to data points
    const dataPoints = (records || []).map((record: any) => ({
      date: record.test_date,
      score: record.score,
    }));

    // Calculate trend direction
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    
    if (dataPoints.length >= 2) {
      const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
      const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, p) => sum + p.score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, p) => sum + p.score, 0) / secondHalf.length;
      
      const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
      
      if (changePercent > 5) {
        trend = 'improving';
      } else if (changePercent < -5) {
        trend = 'declining';
      }
    }

    return {
      testType,
      dataPoints,
      trend,
    };
  } catch (error) {
    console.error('[PerformanceIntegration] Error in getPerformanceTrend:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get performance trend',
      { athleteId, testType }
    );
  }
}

/**
 * Gets all performance records for an athlete.
 * 
 * @param athleteId - The ID of the athlete
 * @returns Array of performance records
 * @throws IntegrationError if the operation fails
 */
export async function getAthletePerformanceRecords(
  athleteId: string
): Promise<PerformanceRecord[]> {
  const db = await createClient();

  try {
    const { data: records, error } = await db
      .from('performance_records')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('test_date', { ascending: false }) as { data: any[] | null; error: any };

    if (error) {
      throw error;
    }

    return (records || []).map((record) => ({
      id: record.id,
      athleteId: record.athlete_id,
      coachId: record.coach_id,
      testType: record.test_type,
      testName: record.test_name,
      score: record.score,
      unit: record.unit,
      testDate: record.test_date,
      notes: record.notes,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }));
  } catch (error) {
    console.error('[PerformanceIntegration] Error in getAthletePerformanceRecords:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get athlete performance records',
      { athleteId }
    );
  }
}

/**
 * Gets the latest performance record for an athlete.
 * 
 * @param athleteId - The ID of the athlete
 * @returns The latest performance record or null
 */
export async function getLatestPerformanceRecord(
  athleteId: string
): Promise<PerformanceRecord | null> {
  const db = await createClient();

  try {
    const { data: record, error } = await db
      .from('performance_records')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('test_date', { ascending: false })
      .limit(1)
      .maybeSingle() as { data: any | null; error: any };

    if (error) {
      throw error;
    }

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      athleteId: record.athlete_id,
      coachId: record.coach_id,
      testType: record.test_type,
      testName: record.test_name,
      score: record.score,
      unit: record.unit,
      testDate: record.test_date,
      notes: record.notes,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  } catch (error) {
    console.error('[PerformanceIntegration] Error in getLatestPerformanceRecord:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get latest performance record',
      { athleteId }
    );
  }
}

/**
 * Gets all unique test types for an athlete.
 * 
 * @param athleteId - The ID of the athlete
 * @returns Array of unique test types
 */
export async function getAthleteTestTypes(athleteId: string): Promise<string[]> {
  const db = await createClient();

  try {
    const { data: records, error } = await db
      .from('performance_records')
      .select('test_type')
      .eq('athlete_id', athleteId);

    if (error) {
      throw error;
    }

    // Get unique test types
    const testTypes = [...new Set((records || []).map((r: any) => r.test_type))];
    return testTypes;
  } catch (error) {
    console.error('[PerformanceIntegration] Error in getAthleteTestTypes:', error);
    throw new IntegrationError(
      IntegrationErrorType.DATABASE_ERROR,
      'Failed to get athlete test types',
      { athleteId }
    );
  }
}

// Note: PerformanceIntegration object export removed because 'use server' files
// can only export async functions. Use the individual exported functions directly.
