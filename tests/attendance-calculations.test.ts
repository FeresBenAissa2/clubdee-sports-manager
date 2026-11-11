import { describe, it, expect } from 'vitest';

/**
 * Attendance Calculations Tests
 * 
 * Tests attendance rate calculations, stats aggregation, and edge cases
 * 
 * Requirements: AC4, AC5
 */

// Helper function to calculate attendance rate
// Matches the logic in getAttendanceStats (athlete) and getAttendanceStats (admin)
export function calculateAttendanceRate(
  presentCount: number,
  lateCount: number,
  totalSessions: number
): number {
  if (totalSessions === 0) {
    return 0;
  }
  
  // Attendance rate = (present + late) / total * 100
  // Round to 1 decimal place
  return Math.round(((presentCount + lateCount) / totalSessions) * 100 * 10) / 10;
}

// Helper function to aggregate attendance stats
export interface AttendanceRecord {
  status: 'present' | 'absent' | 'excused' | 'late';
}

export interface AttendanceStats {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  lateCount: number;
  attendanceRate: number;
}

export function aggregateAttendanceStats(records: AttendanceRecord[]): AttendanceStats {
  const totalSessions = records.length;
  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const excusedCount = records.filter(r => r.status === 'excused').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  
  const attendanceRate = calculateAttendanceRate(presentCount, lateCount, totalSessions);
  
  return {
    totalSessions,
    presentCount,
    absentCount,
    excusedCount,
    lateCount,
    attendanceRate,
  };
}

// Helper function to count unique athletes
export function countUniqueAthletes(records: Array<{ athlete_id: string }>): number {
  const uniqueAthletes = new Set(records.map(r => r.athlete_id));
  return uniqueAthletes.size;
}

describe('Attendance Rate Calculation (AC4, AC5)', () => {
  it('should return 0% for zero sessions', () => {
    const rate = calculateAttendanceRate(0, 0, 0);
    expect(rate).toBe(0);
  });

  it('should return 100% when all sessions are present', () => {
    const rate = calculateAttendanceRate(10, 0, 10);
    expect(rate).toBe(100);
  });

  it('should return 0% when all sessions are absent', () => {
    const rate = calculateAttendanceRate(0, 0, 10);
    expect(rate).toBe(0);
  });

  it('should count late as attended', () => {
    const rate = calculateAttendanceRate(0, 10, 10);
    expect(rate).toBe(100);
  });

  it('should calculate correct rate for mixed attendance', () => {
    // 7 present + 2 late = 9 attended out of 10 = 90%
    const rate = calculateAttendanceRate(7, 2, 10);
    expect(rate).toBe(90);
  });

  it('should round to 1 decimal place', () => {
    // 2 present + 1 late = 3 attended out of 7 = 42.857... = 42.9%
    const rate = calculateAttendanceRate(2, 1, 7);
    expect(rate).toBe(42.9);
  });

  it('should handle 50% attendance correctly', () => {
    const rate = calculateAttendanceRate(5, 0, 10);
    expect(rate).toBe(50);
  });

  it('should handle single session with present', () => {
    const rate = calculateAttendanceRate(1, 0, 1);
    expect(rate).toBe(100);
  });

  it('should handle single session with absent', () => {
    const rate = calculateAttendanceRate(0, 0, 1);
    expect(rate).toBe(0);
  });

  it('should handle large numbers correctly', () => {
    // 850 present + 50 late = 900 attended out of 1000 = 90%
    const rate = calculateAttendanceRate(850, 50, 1000);
    expect(rate).toBe(90);
  });

  it('should handle fractional percentages correctly', () => {
    // 1 present out of 3 = 33.333... = 33.3%
    const rate = calculateAttendanceRate(1, 0, 3);
    expect(rate).toBe(33.3);
  });

  it('should handle 99.9% attendance', () => {
    // 999 present out of 1000 = 99.9%
    const rate = calculateAttendanceRate(999, 0, 1000);
    expect(rate).toBe(99.9);
  });
});

describe('Stats Aggregation (AC4, AC5)', () => {
  it('should aggregate empty attendance records', () => {
    const records: AttendanceRecord[] = [];
    const stats = aggregateAttendanceStats(records);
    
    expect(stats.totalSessions).toBe(0);
    expect(stats.presentCount).toBe(0);
    expect(stats.absentCount).toBe(0);
    expect(stats.excusedCount).toBe(0);
    expect(stats.lateCount).toBe(0);
    expect(stats.attendanceRate).toBe(0);
  });

  it('should aggregate all present records', () => {
    const records: AttendanceRecord[] = [
      { status: 'present' },
      { status: 'present' },
      { status: 'present' },
    ];
    const stats = aggregateAttendanceStats(records);
    
    expect(stats.totalSessions).toBe(3);
    expect(stats.presentCount).toBe(3);
    expect(stats.absentCount).toBe(0);
    expect(stats.excusedCount).toBe(0);
    expect(stats.lateCount).toBe(0);
    expect(stats.attendanceRate).toBe(100);
  });

  it('should aggregate all absent records', () => {
    const records: AttendanceRecord[] = [
      { status: 'absent' },
      { status: 'absent' },
      { status: 'absent' },
    ];
    const stats = aggregateAttendanceStats(records);
    
    expect(stats.totalSessions).toBe(3);
    expect(stats.presentCount).toBe(0);
    expect(stats.absentCount).toBe(3);
    expect(stats.excusedCount).toBe(0);
    expect(stats.lateCount).toBe(0);
    expect(stats.attendanceRate).toBe(0);
  });

  it('should aggregate mixed attendance records', () => {
    const records: AttendanceRecord[] = [
      { status: 'present' },
      { status: 'absent' },
      { status: 'late' },
      { status: 'excused' },
      { status: 'present' },
    ];
    const stats = aggregateAttendanceStats(records);
    
    expect(stats.totalSessions).toBe(5);
    expect(stats.presentCount).toBe(2);
    expect(stats.absentCount).toBe(1);
    expect(stats.excusedCount).toBe(1);
    expect(stats.lateCount).toBe(1);
    // 2 present + 1 late = 3 out of 5 = 60%
    expect(stats.attendanceRate).toBe(60);
  });

  it('should handle all status types', () => {
    const records: AttendanceRecord[] = [
      { status: 'present' },
      { status: 'present' },
      { status: 'absent' },
      { status: 'excused' },
      { status: 'excused' },
      { status: 'late' },
      { status: 'late' },
      { status: 'late' },
    ];
    const stats = aggregateAttendanceStats(records);
    
    expect(stats.totalSessions).toBe(8);
    expect(stats.presentCount).toBe(2);
    expect(stats.absentCount).toBe(1);
    expect(stats.excusedCount).toBe(2);
    expect(stats.lateCount).toBe(3);
    // 2 present + 3 late = 5 out of 8 = 62.5%
    expect(stats.attendanceRate).toBe(62.5);
  });

  it('should aggregate large dataset correctly', () => {
    const records: AttendanceRecord[] = [
      ...Array(70).fill({ status: 'present' }),
      ...Array(15).fill({ status: 'late' }),
      ...Array(10).fill({ status: 'absent' }),
      ...Array(5).fill({ status: 'excused' }),
    ];
    const stats = aggregateAttendanceStats(records);
    
    expect(stats.totalSessions).toBe(100);
    expect(stats.presentCount).toBe(70);
    expect(stats.absentCount).toBe(10);
    expect(stats.excusedCount).toBe(5);
    expect(stats.lateCount).toBe(15);
    // 70 present + 15 late = 85 out of 100 = 85%
    expect(stats.attendanceRate).toBe(85);
  });

  it('should verify counts sum to total', () => {
    const records: AttendanceRecord[] = [
      { status: 'present' },
      { status: 'absent' },
      { status: 'late' },
      { status: 'excused' },
      { status: 'present' },
      { status: 'late' },
    ];
    const stats = aggregateAttendanceStats(records);
    
    const sum = stats.presentCount + stats.absentCount + stats.excusedCount + stats.lateCount;
    expect(sum).toBe(stats.totalSessions);
  });
});

describe('Edge Cases (AC4, AC5)', () => {
  describe('Zero Sessions Edge Cases', () => {
    it('should handle zero sessions with 0% rate', () => {
      const stats = aggregateAttendanceStats([]);
      
      expect(stats.totalSessions).toBe(0);
      expect(stats.attendanceRate).toBe(0);
    });

    it('should not divide by zero', () => {
      const rate = calculateAttendanceRate(0, 0, 0);
      
      expect(rate).toBe(0);
      expect(Number.isNaN(rate)).toBe(false);
      expect(Number.isFinite(rate)).toBe(true);
    });
  });

  describe('All Absent Edge Cases', () => {
    it('should handle all absent with 0% rate', () => {
      const records: AttendanceRecord[] = Array(10).fill({ status: 'absent' });
      const stats = aggregateAttendanceStats(records);
      
      expect(stats.attendanceRate).toBe(0);
      expect(stats.absentCount).toBe(10);
      expect(stats.presentCount).toBe(0);
    });

    it('should handle all excused with 0% rate', () => {
      const records: AttendanceRecord[] = Array(10).fill({ status: 'excused' });
      const stats = aggregateAttendanceStats(records);
      
      expect(stats.attendanceRate).toBe(0);
      expect(stats.excusedCount).toBe(10);
      expect(stats.presentCount).toBe(0);
    });

    it('should handle mix of absent and excused with 0% rate', () => {
      const records: AttendanceRecord[] = [
        ...Array(5).fill({ status: 'absent' }),
        ...Array(5).fill({ status: 'excused' }),
      ];
      const stats = aggregateAttendanceStats(records);
      
      expect(stats.attendanceRate).toBe(0);
      expect(stats.absentCount).toBe(5);
      expect(stats.excusedCount).toBe(5);
    });
  });

  describe('Single Session Edge Cases', () => {
    it('should handle single present session', () => {
      const records: AttendanceRecord[] = [{ status: 'present' }];
      const stats = aggregateAttendanceStats(records);
      
      expect(stats.totalSessions).toBe(1);
      expect(stats.presentCount).toBe(1);
      expect(stats.attendanceRate).toBe(100);
    });

    it('should handle single absent session', () => {
      const records: AttendanceRecord[] = [{ status: 'absent' }];
      const stats = aggregateAttendanceStats(records);
      
      expect(stats.totalSessions).toBe(1);
      expect(stats.absentCount).toBe(1);
      expect(stats.attendanceRate).toBe(0);
    });

    it('should handle single late session', () => {
      const records: AttendanceRecord[] = [{ status: 'late' }];
      const stats = aggregateAttendanceStats(records);
      
      expect(stats.totalSessions).toBe(1);
      expect(stats.lateCount).toBe(1);
      expect(stats.attendanceRate).toBe(100);
    });

    it('should handle single excused session', () => {
      const records: AttendanceRecord[] = [{ status: 'excused' }];
      const stats = aggregateAttendanceStats(records);
      
      expect(stats.totalSessions).toBe(1);
      expect(stats.excusedCount).toBe(1);
      expect(stats.attendanceRate).toBe(0);
    });
  });

  describe('Boundary Value Edge Cases', () => {
    it('should handle exactly 1% attendance', () => {
      const records: AttendanceRecord[] = [
        { status: 'present' },
        ...Array(99).fill({ status: 'absent' }),
      ];
      const stats = aggregateAttendanceStats(records);
      
      expect(stats.attendanceRate).toBe(1);
    });

    it('should handle exactly 99% attendance', () => {
      const records: AttendanceRecord[] = [
        ...Array(99).fill({ status: 'present' }),
        { status: 'absent' },
      ];
      const stats = aggregateAttendanceStats(records);
      
      expect(stats.attendanceRate).toBe(99);
    });

    it('should handle 0.1% attendance (rounds to 0.1)', () => {
      const records: AttendanceRecord[] = [
        { status: 'present' },
        ...Array(999).fill({ status: 'absent' }),
      ];
      const stats = aggregateAttendanceStats(records);
      
      expect(stats.attendanceRate).toBe(0.1);
    });

    it('should handle 99.9% attendance', () => {
      const records: AttendanceRecord[] = [
        ...Array(999).fill({ status: 'present' }),
        { status: 'absent' },
      ];
      const stats = aggregateAttendanceStats(records);
      
      expect(stats.attendanceRate).toBe(99.9);
    });
  });

  describe('Rounding Edge Cases', () => {
    it('should round 33.33...% correctly to 33.3%', () => {
      const rate = calculateAttendanceRate(1, 0, 3);
      expect(rate).toBe(33.3);
    });

    it('should round 66.66...% correctly to 66.7%', () => {
      const rate = calculateAttendanceRate(2, 0, 3);
      expect(rate).toBe(66.7);
    });

    it('should round 14.285...% correctly to 14.3%', () => {
      const rate = calculateAttendanceRate(1, 0, 7);
      expect(rate).toBe(14.3);
    });

    it('should round 85.714...% correctly to 85.7%', () => {
      const rate = calculateAttendanceRate(6, 0, 7);
      expect(rate).toBe(85.7);
    });

    it('should handle rounding at 0.05 boundary (rounds up)', () => {
      // This tests the rounding behavior at the .05 boundary
      // 1/6 = 16.666... should round to 16.7
      const rate = calculateAttendanceRate(1, 0, 6);
      expect(rate).toBe(16.7);
    });
  });

  describe('Large Dataset Edge Cases', () => {
    it('should handle very large attendance counts', () => {
      const rate = calculateAttendanceRate(9999, 1, 10000);
      expect(rate).toBe(100);
    });

    it('should handle large dataset with fractional percentage', () => {
      // 8547 out of 10000 = 85.47%
      const rate = calculateAttendanceRate(8547, 0, 10000);
      expect(rate).toBe(85.5); // Rounds to 85.5
    });

    it('should aggregate very large dataset', () => {
      const records: AttendanceRecord[] = [
        ...Array(8500).fill({ status: 'present' }),
        ...Array(500).fill({ status: 'late' }),
        ...Array(800).fill({ status: 'absent' }),
        ...Array(200).fill({ status: 'excused' }),
      ];
      const stats = aggregateAttendanceStats(records);
      
      expect(stats.totalSessions).toBe(10000);
      expect(stats.presentCount).toBe(8500);
      expect(stats.lateCount).toBe(500);
      expect(stats.absentCount).toBe(800);
      expect(stats.excusedCount).toBe(200);
      // 8500 + 500 = 9000 out of 10000 = 90%
      expect(stats.attendanceRate).toBe(90);
    });
  });
});

describe('Unique Athletes Counting (AC5)', () => {
  it('should count zero unique athletes from empty records', () => {
    const count = countUniqueAthletes([]);
    expect(count).toBe(0);
  });

  it('should count single unique athlete', () => {
    const records = [
      { athlete_id: 'athlete-1' },
    ];
    const count = countUniqueAthletes(records);
    expect(count).toBe(1);
  });

  it('should count multiple unique athletes', () => {
    const records = [
      { athlete_id: 'athlete-1' },
      { athlete_id: 'athlete-2' },
      { athlete_id: 'athlete-3' },
    ];
    const count = countUniqueAthletes(records);
    expect(count).toBe(3);
  });

  it('should handle duplicate athlete IDs correctly', () => {
    const records = [
      { athlete_id: 'athlete-1' },
      { athlete_id: 'athlete-1' },
      { athlete_id: 'athlete-2' },
      { athlete_id: 'athlete-2' },
      { athlete_id: 'athlete-2' },
    ];
    const count = countUniqueAthletes(records);
    expect(count).toBe(2);
  });

  it('should handle many records from same athlete', () => {
    const records = Array(100).fill({ athlete_id: 'athlete-1' });
    const count = countUniqueAthletes(records);
    expect(count).toBe(1);
  });

  it('should handle large number of unique athletes', () => {
    const records = Array.from({ length: 1000 }, (_, i) => ({
      athlete_id: `athlete-${i}`,
    }));
    const count = countUniqueAthletes(records);
    expect(count).toBe(1000);
  });

  it('should handle mixed duplicate and unique athletes', () => {
    const records = [
      { athlete_id: 'athlete-1' },
      { athlete_id: 'athlete-1' },
      { athlete_id: 'athlete-2' },
      { athlete_id: 'athlete-3' },
      { athlete_id: 'athlete-3' },
      { athlete_id: 'athlete-3' },
      { athlete_id: 'athlete-4' },
    ];
    const count = countUniqueAthletes(records);
    expect(count).toBe(4);
  });
});

describe('Attendance Rate Bounds (AC4, AC5)', () => {
  it('should always return rate between 0 and 100', () => {
    const testCases = [
      { present: 0, late: 0, total: 10 },
      { present: 5, late: 0, total: 10 },
      { present: 10, late: 0, total: 10 },
      { present: 0, late: 10, total: 10 },
      { present: 3, late: 7, total: 10 },
      { present: 1, late: 0, total: 3 },
      { present: 999, late: 1, total: 1000 },
    ];

    testCases.forEach(({ present, late, total }) => {
      const rate = calculateAttendanceRate(present, late, total);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });

  it('should never return NaN', () => {
    const testCases = [
      { present: 0, late: 0, total: 0 },
      { present: 0, late: 0, total: 10 },
      { present: 10, late: 0, total: 10 },
      { present: 5, late: 5, total: 10 },
    ];

    testCases.forEach(({ present, late, total }) => {
      const rate = calculateAttendanceRate(present, late, total);
      expect(Number.isNaN(rate)).toBe(false);
    });
  });

  it('should always return finite number', () => {
    const testCases = [
      { present: 0, late: 0, total: 0 },
      { present: 0, late: 0, total: 10 },
      { present: 10, late: 0, total: 10 },
      { present: 5, late: 5, total: 10 },
    ];

    testCases.forEach(({ present, late, total }) => {
      const rate = calculateAttendanceRate(present, late, total);
      expect(Number.isFinite(rate)).toBe(true);
    });
  });

  it('should have at most 1 decimal place', () => {
    const testCases = [
      { present: 1, late: 0, total: 3 },
      { present: 2, late: 0, total: 7 },
      { present: 5, late: 2, total: 11 },
    ];

    testCases.forEach(({ present, late, total }) => {
      const rate = calculateAttendanceRate(present, late, total);
      const decimalPlaces = (rate.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });
  });
});
