import { describe, it, expect } from 'vitest';
import {
  validateLength,
  validateRequired,
  validateEmailFormat,
  validatePhoneFormat,
  validateDateRange,
  validateAge,
  validateNumericRange,
  validateTimeFormat,
  validateTimeRange,
  validateEnum,
  batchValidate,
} from '@/lib/utils/enhanced-validation';

describe('Enhanced Validation Functions', () => {
  describe('validateLength', () => {
    it('should accept valid length', () => {
      const result = validateLength('Hello', 2, 10, 'Name');
      expect(result).toBeNull();
    });

    it('should reject too short', () => {
      const result = validateLength('H', 2, 10, 'Name');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('MIN_LENGTH');
    });

    it('should reject too long', () => {
      const result = validateLength('Hello World!', 2, 10, 'Name');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('MAX_LENGTH');
    });
  });

  describe('validateRequired', () => {
    it('should accept non-empty value', () => {
      const result = validateRequired('Hello', 'Name');
      expect(result).toBeNull();
    });

    it('should reject empty string', () => {
      const result = validateRequired('', 'Name');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('REQUIRED');
    });

    it('should reject whitespace-only string', () => {
      const result = validateRequired('   ', 'Name');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('REQUIRED');
    });

    it('should reject null', () => {
      const result = validateRequired(null, 'Name');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('REQUIRED');
    });
  });

  describe('validateEmailFormat', () => {
    it('should accept valid email', () => {
      const result = validateEmailFormat('user@example.com');
      expect(result).toBeNull();
    });

    it('should reject invalid email', () => {
      const result = validateEmailFormat('invalid-email');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_EMAIL');
    });

    it('should reject email without @', () => {
      const result = validateEmailFormat('userexample.com');
      expect(result).not.toBeNull();
    });

    it('should reject email without domain', () => {
      const result = validateEmailFormat('user@');
      expect(result).not.toBeNull();
    });

    it('should detect common typos', () => {
      const result = validateEmailFormat('user@gmial.com');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('SUSPICIOUS_DOMAIN');
    });
  });

  describe('validatePhoneFormat', () => {
    it('should accept valid Thai phone', () => {
      const result = validatePhoneFormat('0812345678');
      expect(result).toBeNull();
    });

    it('should accept valid international phone', () => {
      const result = validatePhoneFormat('+66812345678');
      expect(result).toBeNull();
    });

    it('should reject invalid format', () => {
      const result = validatePhoneFormat('123');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_PHONE');
    });

    it('should reject phone not starting with 0', () => {
      const result = validatePhoneFormat('1812345678');
      expect(result).not.toBeNull();
    });
  });

  describe('validateDateRange', () => {
    it('should accept date within range', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const result = validateDateRange(
        tomorrow.toISOString().split('T')[0],
        today,
        undefined,
        'Date'
      );
      expect(result).toBeNull();
    });

    it('should reject date before minimum', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const result = validateDateRange(
        yesterday.toISOString().split('T')[0],
        today,
        undefined,
        'Date'
      );
      expect(result).not.toBeNull();
      expect(result?.code).toBe('DATE_TOO_EARLY');
    });

    it('should reject invalid date', () => {
      const result = validateDateRange('invalid-date', undefined, undefined, 'Date');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_DATE');
    });
  });

  describe('validateAge', () => {
    it('should accept valid age', () => {
      const today = new Date();
      const dob = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
      
      const result = validateAge(dob.toISOString().split('T')[0], 5, 100);
      expect(result).toBeNull();
    });

    it('should reject too young', () => {
      const today = new Date();
      const dob = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
      
      const result = validateAge(dob.toISOString().split('T')[0], 5, 100);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('AGE_TOO_YOUNG');
    });

    it('should reject too old', () => {
      const today = new Date();
      const dob = new Date(today.getFullYear() - 150, today.getMonth(), today.getDate());
      
      const result = validateAge(dob.toISOString().split('T')[0], 5, 100);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('AGE_TOO_OLD');
    });
  });

  describe('validateNumericRange', () => {
    it('should accept value within range', () => {
      const result = validateNumericRange(50, 0, 100, 'Score');
      expect(result).toBeNull();
    });

    it('should reject value below minimum', () => {
      const result = validateNumericRange(-10, 0, 100, 'Score');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('NUMBER_TOO_SMALL');
    });

    it('should reject value above maximum', () => {
      const result = validateNumericRange(150, 0, 100, 'Score');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('NUMBER_TOO_LARGE');
    });

    it('should reject NaN', () => {
      const result = validateNumericRange(NaN, 0, 100, 'Score');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_NUMBER');
    });
  });

  describe('validateTimeFormat', () => {
    it('should accept valid time', () => {
      const result = validateTimeFormat('14:30');
      expect(result).toBeNull();
    });

    it('should reject invalid format', () => {
      const result = validateTimeFormat('25:00');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_TIME');
    });

    it('should reject invalid minutes', () => {
      const result = validateTimeFormat('14:60');
      expect(result).not.toBeNull();
    });
  });

  describe('validateTimeRange', () => {
    it('should accept valid time range', () => {
      const result = validateTimeRange('09:00', '17:00');
      expect(result).toBeNull();
    });

    it('should reject end time before start time', () => {
      const result = validateTimeRange('17:00', '09:00');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_TIME_RANGE');
    });

    it('should reject equal times', () => {
      const result = validateTimeRange('09:00', '09:00');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_TIME_RANGE');
    });
  });

  describe('validateEnum', () => {
    it('should accept valid enum value', () => {
      const result = validateEnum('active', ['active', 'inactive', 'pending'], 'Status');
      expect(result).toBeNull();
    });

    it('should reject invalid enum value', () => {
      const result = validateEnum('invalid', ['active', 'inactive', 'pending'], 'Status');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_ENUM');
    });
  });

  describe('batchValidate', () => {
    it('should pass when all validations pass', () => {
      const result = batchValidate([
        () => validateRequired('John', 'Name'),
        () => validateLength('John', 2, 50, 'Name'),
        () => validateEmailFormat('john@example.com'),
      ]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when any validation fails', () => {
      const result = batchValidate([
        () => validateRequired('John', 'Name'),
        () => validateLength('J', 2, 50, 'Name'), // Too short
        () => validateEmailFormat('john@example.com'),
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should collect all errors', () => {
      const result = batchValidate([
        () => validateRequired('', 'Name'), // Fail
        () => validateEmailFormat('invalid'), // Fail
        () => validatePhoneFormat('123'), // Fail
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });
});
