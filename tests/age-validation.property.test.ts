/**
 * Property-Based Test for Age Validation
 * **Feature: auth-database-integration, Property 21: Age validation**
 * 
 * Property 21: Age validation
 * For any date input, the date of birth validator should reject dates less than 5 years ago.
 * 
 * Validates: Requirements 8.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateDateOfBirth } from '@/lib/auth/validation';

describe('Property 21: Age validation', () => {
  /**
   * **Feature: auth-database-integration, Property 21: Age validation**
   * 
   * For any date less than 5 years ago, the validator should reject it.
   * This test verifies that:
   * 1. Dates representing ages less than 5 years are rejected
   * 2. The validation returns isValid: false
   * 3. An appropriate error message is returned
   */
  it('should reject dates less than 5 years ago', async () => {
    // Generator for dates less than 5 years ago (too young)
    const tooYoungDateArb = fc
      .integer({ min: 0, max: 4 }) // 0 to 4 years
      .chain((years) =>
        fc.integer({ min: 0, max: 364 }).map((days) => {
          const date = new Date();
          date.setFullYear(date.getFullYear() - years);
          date.setDate(date.getDate() - days);
          return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        })
      );

    await fc.assert(
      fc.property(tooYoungDateArb, (dob) => {
        const result = validateDateOfBirth(dob);

        // Property: Dates less than 5 years ago should be rejected
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(err => err.includes('อายุ') || err.includes('5 ปี'))).toBe(true);
      }),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });

  /**
   * For any date representing an age of 5 years or older (up to just under 100 years),
   * the validator should accept it.
   */
  it('should accept dates representing ages between 5 and 100 years', async () => {
    // Generator for valid ages (5 to 99 years old)
    // Note: We use 99 years max because the validation checks date < maxDate (100 years ago)
    // which means dates exactly 100 years ago might be rejected depending on time of day
    const validAgeArb = fc
      .integer({ min: 5, max: 99 }) // 5 to 99 years
      .chain((years) =>
        fc.integer({ min: 0, max: 364 }).map((days) => {
          const date = new Date();
          date.setFullYear(date.getFullYear() - years);
          date.setDate(date.getDate() - days);
          return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        })
      );

    await fc.assert(
      fc.property(validAgeArb, (dob) => {
        const result = validateDateOfBirth(dob);

        // Property: Valid ages should be accepted
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any date in the future, the validator should reject it.
   */
  it('should reject future dates', async () => {
    // Generator for future dates
    const futureDateArb = fc
      .integer({ min: 1, max: 365 * 10 }) // 1 day to 10 years in the future
      .map((daysAhead) => {
        const date = new Date();
        date.setDate(date.getDate() + daysAhead);
        return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      });

    await fc.assert(
      fc.property(futureDateArb, (dob) => {
        const result = validateDateOfBirth(dob);

        // Property: Future dates should be rejected
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(err => err.includes('ปัจจุบัน'))).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any date representing an age over 100 years, the validator should reject it.
   */
  it('should reject dates representing ages over 100 years', async () => {
    // Generator for dates over 100 years ago
    const tooOldDateArb = fc
      .integer({ min: 101, max: 150 }) // 101 to 150 years
      .chain((years) =>
        fc.integer({ min: 0, max: 364 }).map((days) => {
          const date = new Date();
          date.setFullYear(date.getFullYear() - years);
          date.setDate(date.getDate() - days);
          return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        })
      );

    await fc.assert(
      fc.property(tooOldDateArb, (dob) => {
        const result = validateDateOfBirth(dob);

        // Property: Ages over 100 years should be rejected
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Empty string should be rejected
   */
  it('should reject empty date of birth', () => {
    const result = validateDateOfBirth('');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('กรุณากรอกวันเกิด');
  });

  /**
   * Edge case: Invalid date format should be rejected
   */
  it('should reject invalid date formats', async () => {
    const invalidDateArb = fc.oneof(
      fc.constant('not-a-date'),
      fc.constant('2024-13-01'), // Invalid month
      fc.constant('2024-02-30'), // Invalid day
      fc.constant('invalid'),
      fc.constant('12/31/2020'), // Wrong format
      fc.constant('2020.12.31'), // Wrong separator
    );

    await fc.assert(
      fc.property(invalidDateArb, (dob) => {
        const result = validateDateOfBirth(dob);

        // Property: Invalid date formats should be rejected
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Test boundary: Exactly 5 years ago should be accepted
   */
  it('should accept date exactly 5 years ago', () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 5);
    const dob = date.toISOString().split('T')[0];

    const result = validateDateOfBirth(dob);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * Test boundary: A date 99 years and 364 days ago should be accepted
   * Note: We don't test exactly 100 years because the validation uses
   * date < maxDate which includes time, making the boundary time-dependent
   */
  it('should accept date just under 100 years ago', () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 99);
    date.setDate(date.getDate() - 364);
    const dob = date.toISOString().split('T')[0];

    const result = validateDateOfBirth(dob);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * Test boundary: One day less than 5 years should be rejected
   */
  it('should reject date one day less than 5 years ago', () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 5);
    date.setDate(date.getDate() + 1); // One day less than 5 years
    const dob = date.toISOString().split('T')[0];

    const result = validateDateOfBirth(dob);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /**
   * Test boundary: One day more than 100 years should be rejected
   */
  it('should reject date one day more than 100 years ago', () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 100);
    date.setDate(date.getDate() - 1); // One day more than 100 years
    const dob = date.toISOString().split('T')[0];

    const result = validateDateOfBirth(dob);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /**
   * Test that today's date is rejected (age 0)
   */
  it('should reject today\'s date', () => {
    const today = new Date().toISOString().split('T')[0];

    const result = validateDateOfBirth(today);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  /**
   * Test common valid date patterns
   */
  it('should accept common valid dates', () => {
    const validDates = [
      '2000-01-01', // 24 years old
      '1990-06-15', // 34 years old
      '1980-12-31', // 44 years old
      '1970-03-20', // 54 years old
      '1960-08-10', // 64 years old
      '1950-11-25', // 74 years old
    ];

    validDates.forEach((dob) => {
      const result = validateDateOfBirth(dob);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  /**
   * Test that error messages are in Thai
   */
  it('should return error messages in Thai', async () => {
    const invalidDateArb = fc.oneof(
      // Too young
      fc.constant(new Date().toISOString().split('T')[0]),
      // Future date
      fc.constant(new Date(Date.now() + 86400000).toISOString().split('T')[0]),
      // Empty
      fc.constant(''),
    );

    await fc.assert(
      fc.property(invalidDateArb, (dob) => {
        const result = validateDateOfBirth(dob);

        // Property: All error messages should be in Thai
        expect(result.isValid).toBe(false);
        result.errors.forEach((error) => {
          // Check that error contains Thai characters or common Thai words
          expect(
            error.includes('กรุณา') ||
            error.includes('ต้อง') ||
            error.includes('ไม่') ||
            error.includes('วัน') ||
            error.includes('อายุ') ||
            error.includes('ปี')
          ).toBe(true);
        });
      }),
      { numRuns: 50 }
    );
  });
});
