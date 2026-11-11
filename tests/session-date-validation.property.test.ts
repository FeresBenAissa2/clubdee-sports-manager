/**
 * Property-Based Tests for Session Date Validation
 * Feature: training-attendance
 * 
 * Property: Session date validation
 * For any session creation, date should not be in past
 * 
 * This property ensures that session creation validates dates correctly:
 * - Sessions cannot be created with dates in the past
 * - Sessions can be created with today's date
 * - Sessions can be created with future dates
 * - The validation is consistent across all date inputs
 * 
 * Validates: Requirements AC1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Validate if a session date is valid (not in the past)
 * @param sessionDate - The proposed session date
 * @returns Object with success flag and optional error message
 */
function validateSessionDate(sessionDate: Date): { success: boolean; error?: string } {
  // Get today's date at midnight (start of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get session date at midnight for fair comparison
  const sessionDateMidnight = new Date(sessionDate);
  sessionDateMidnight.setHours(0, 0, 0, 0);
  
  // Check if session date is in the past
  if (sessionDateMidnight < today) {
    return { 
      success: false, 
      error: 'ไม่สามารถสร้างตารางในอดีตได้' 
    };
  }
  
  return { success: true };
}

describe('Session Date Validation Property-Based Tests', () => {
  /**
   * Property: Session date validation
   * For any session creation, date should not be in past
   * Validates: Requirements AC1
   */
  it('Property: Session date must not be in the past', () => {
    // Arbitrary for dates spanning past, present, and future
    const dateArb = fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-12-31'),
      noInvalidDate: true,
    });

    fc.assert(
      fc.property(dateArb, (sessionDate) => {
        // Skip invalid dates
        if (isNaN(sessionDate.getTime())) {
          return true;
        }

        const result = validateSessionDate(sessionDate);
        
        // Get today at midnight for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get session date at midnight
        const sessionDateMidnight = new Date(sessionDate);
        sessionDateMidnight.setHours(0, 0, 0, 0);
        
        // Property: Validation should succeed if and only if date is today or future
        const isValidDate = sessionDateMidnight >= today;
        
        expect(result.success).toBe(isValidDate);
        
        // Property: If date is in past, should have error message
        if (!isValidDate) {
          expect(result.error).toBeDefined();
          expect(result.error).toContain('ไม่สามารถสร้างตารางในอดีตได้');
        }
        
        // Property: If date is valid, should not have error
        if (isValidDate) {
          expect(result.error).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Past dates always fail
   * Any date before today should fail validation
   */
  it('Property: All past dates are rejected', () => {
    // Generate dates that are definitely in the past
    const pastDateArb = fc.date({
      min: new Date('2020-01-01'),
      max: new Date(Date.now() - 24 * 60 * 60 * 1000), // At least 1 day ago
      noInvalidDate: true,
    });

    fc.assert(
      fc.property(pastDateArb, (sessionDate) => {
        const result = validateSessionDate(sessionDate);
        
        // Property: All past dates should fail
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('ไม่สามารถสร้างตารางในอดีตได้');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Future dates always succeed
   * Any date after today should pass validation
   */
  it('Property: All future dates are accepted', () => {
    // Generate dates that are definitely in the future
    const futureDateArb = fc.date({
      min: new Date(Date.now() + 24 * 60 * 60 * 1000), // At least 1 day from now
      max: new Date('2030-12-31'),
      noInvalidDate: true,
    });

    fc.assert(
      fc.property(futureDateArb, (sessionDate) => {
        const result = validateSessionDate(sessionDate);
        
        // Property: All future dates should succeed
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Today's date is valid
   * The current date should always be accepted
   */
  it('Property: Today is always a valid session date', () => {
    // Test with current date multiple times
    fc.assert(
      fc.property(fc.constant(new Date()), (today) => {
        const result = validateSessionDate(today);
        
        // Property: Today should always be valid
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Boundary condition - yesterday vs today
   * Yesterday should fail, today should succeed
   */
  it('Property: Boundary between yesterday and today is correct', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayResult = validateSessionDate(today);
    const yesterdayResult = validateSessionDate(yesterday);
    
    // Property: Today should be valid
    expect(todayResult.success).toBe(true);
    expect(todayResult.error).toBeUndefined();
    
    // Property: Yesterday should be invalid
    expect(yesterdayResult.success).toBe(false);
    expect(yesterdayResult.error).toBeDefined();
  });

  /**
   * Property: Boundary condition - today vs tomorrow
   * Both today and tomorrow should succeed
   */
  it('Property: Boundary between today and tomorrow is correct', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayResult = validateSessionDate(today);
    const tomorrowResult = validateSessionDate(tomorrow);
    
    // Property: Both should be valid
    expect(todayResult.success).toBe(true);
    expect(todayResult.error).toBeUndefined();
    
    expect(tomorrowResult.success).toBe(true);
    expect(tomorrowResult.error).toBeUndefined();
  });

  /**
   * Property: Time of day doesn't matter
   * Validation should only consider the date, not the time
   */
  it('Property: Time of day does not affect date validation', () => {
    // Generate dates with various times of day
    const dateArb = fc.date({
      min: new Date('2024-01-01'),
      max: new Date('2030-12-31'),
      noInvalidDate: true,
    });

    fc.assert(
      fc.property(dateArb, (sessionDate) => {
        // Test the same date at different times
        const morning = new Date(sessionDate);
        morning.setHours(6, 0, 0, 0);
        
        const noon = new Date(sessionDate);
        noon.setHours(12, 0, 0, 0);
        
        const evening = new Date(sessionDate);
        evening.setHours(18, 0, 0, 0);
        
        const night = new Date(sessionDate);
        night.setHours(23, 59, 59, 999);
        
        const morningResult = validateSessionDate(morning);
        const noonResult = validateSessionDate(noon);
        const eveningResult = validateSessionDate(evening);
        const nightResult = validateSessionDate(night);
        
        // Property: All times on the same date should have the same validation result
        expect(morningResult.success).toBe(noonResult.success);
        expect(noonResult.success).toBe(eveningResult.success);
        expect(eveningResult.success).toBe(nightResult.success);
        
        // Property: Error messages should be consistent
        if (!morningResult.success) {
          expect(noonResult.error).toBe(morningResult.error);
          expect(eveningResult.error).toBe(morningResult.error);
          expect(nightResult.error).toBe(morningResult.error);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Validation is deterministic
   * Validating the same date multiple times should give the same result
   */
  it('Property: Validation is deterministic for same date', () => {
    const dateArb = fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-12-31'),
      noInvalidDate: true,
    });

    fc.assert(
      fc.property(dateArb, (sessionDate) => {
        // Validate the same date multiple times
        const result1 = validateSessionDate(sessionDate);
        const result2 = validateSessionDate(sessionDate);
        const result3 = validateSessionDate(sessionDate);
        
        // Property: All results should be identical
        expect(result1.success).toBe(result2.success);
        expect(result2.success).toBe(result3.success);
        
        expect(result1.error).toBe(result2.error);
        expect(result2.error).toBe(result3.error);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Relative date ordering
   * If date A is before date B, and A is invalid, then B being valid implies B is today or later
   */
  it('Property: Date ordering is consistent with validation', () => {
    const date1Arb = fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-12-31'),
      noInvalidDate: true,
    });
    
    const date2Arb = fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-12-31'),
      noInvalidDate: true,
    });

    fc.assert(
      fc.property(date1Arb, date2Arb, (date1, date2) => {
        // Normalize to midnight for comparison
        const d1 = new Date(date1);
        d1.setHours(0, 0, 0, 0);
        
        const d2 = new Date(date2);
        d2.setHours(0, 0, 0, 0);
        
        // Skip if dates are the same
        if (d1.getTime() === d2.getTime()) {
          return true;
        }
        
        const result1 = validateSessionDate(date1);
        const result2 = validateSessionDate(date2);
        
        // Property: If date1 < date2, and date2 is invalid, then date1 must also be invalid
        if (d1 < d2 && !result2.success) {
          expect(result1.success).toBe(false);
        }
        
        // Property: If date1 < date2, and date1 is valid, then date2 must also be valid
        if (d1 < d2 && result1.success) {
          expect(result2.success).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Days offset from today
   * Testing with explicit day offsets to ensure boundary logic
   */
  it('Property: Day offset validation is correct', () => {
    const offsetArb = fc.integer({ min: -365, max: 365 });

    fc.assert(
      fc.property(offsetArb, (daysOffset) => {
        const today = new Date();
        const testDate = new Date(today);
        testDate.setDate(testDate.getDate() + daysOffset);
        
        const result = validateSessionDate(testDate);
        
        // Property: Negative offsets (past) should fail, zero or positive (today/future) should succeed
        if (daysOffset < 0) {
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        } else {
          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error message consistency
   * All invalid dates should produce the same error message
   */
  it('Property: Error messages are consistent for all past dates', () => {
    const pastDateArb = fc.date({
      min: new Date('2020-01-01'),
      max: new Date(Date.now() - 24 * 60 * 60 * 1000),
      noInvalidDate: true,
    });

    fc.assert(
      fc.property(pastDateArb, (sessionDate) => {
        const result = validateSessionDate(sessionDate);
        
        // Property: All past dates should have the same error message
        expect(result.success).toBe(false);
        expect(result.error).toBe('ไม่สามารถสร้างตารางในอดีตได้');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Leap year handling
   * Validation should work correctly for leap year dates
   */
  it('Property: Leap year dates are handled correctly', () => {
    // Test Feb 29 on leap years
    const leapYearDates = [
      new Date('2024-02-29'),
      new Date('2028-02-29'),
      new Date('2032-02-29'),
    ];

    for (const date of leapYearDates) {
      const result = validateSessionDate(date);
      
      // Get today for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dateMidnight = new Date(date);
      dateMidnight.setHours(0, 0, 0, 0);
      
      // Property: Leap year dates should follow same rules
      if (dateMidnight >= today) {
        expect(result.success).toBe(true);
      } else {
        expect(result.success).toBe(false);
      }
    }
  });

  /**
   * Property: Month boundaries
   * Validation should work correctly across month boundaries
   */
  it('Property: Month boundaries are handled correctly', () => {
    const today = new Date();
    
    // Last day of previous month
    const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    // First day of current month
    const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // First day of next month
    const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    const result1 = validateSessionDate(lastDayPrevMonth);
    const result2 = validateSessionDate(firstDayCurrentMonth);
    const result3 = validateSessionDate(firstDayNextMonth);
    
    // Property: Results should be consistent with date ordering
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);
    
    const date1Midnight = new Date(lastDayPrevMonth);
    date1Midnight.setHours(0, 0, 0, 0);
    
    const date2Midnight = new Date(firstDayCurrentMonth);
    date2Midnight.setHours(0, 0, 0, 0);
    
    const date3Midnight = new Date(firstDayNextMonth);
    date3Midnight.setHours(0, 0, 0, 0);
    
    expect(result1.success).toBe(date1Midnight >= todayMidnight);
    expect(result2.success).toBe(date2Midnight >= todayMidnight);
    expect(result3.success).toBe(date3Midnight >= todayMidnight);
  });
});
