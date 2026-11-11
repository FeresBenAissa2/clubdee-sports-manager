/**
 * Enhanced validation utilities for comprehensive input validation
 * Requirement 9.2: Input validation and sanitization
 */

import { sanitizeInput, sanitizeEmail, sanitizePhoneNumber } from './sanitization';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string
): ValidationError | null {
  const sanitized = sanitizeInput(value);

  if (sanitized.length < min) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${min} characters`,
      code: 'MIN_LENGTH',
    };
  }

  if (sanitized.length > max) {
    return {
      field: fieldName,
      message: `${fieldName} must not exceed ${max} characters`,
      code: 'MAX_LENGTH',
    };
  }

  return null;
}

/**
 * Validate required field
 */
export function validateRequired(value: any, fieldName: string): ValidationError | null {
  if (value === null || value === undefined || value === '') {
    return {
      field: fieldName,
      message: `Please enter ${fieldName}`,
      code: 'REQUIRED',
    };
  }

  if (typeof value === 'string' && sanitizeInput(value) === '') {
    return {
      field: fieldName,
      message: `Please enter ${fieldName}`,
      code: 'REQUIRED',
    };
  }

  return null;
}

/**
 * Validate email format with enhanced checks
 */
export function validateEmailFormat(email: string): ValidationError | null {
  const sanitized = sanitizeEmail(email);

  if (!sanitized) {
    return {
      field: 'email',
      message: 'Invalid email format',
      code: 'INVALID_EMAIL',
    };
  }

  // Permissive email check (school/demo)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(sanitized)) {
    return {
      field: 'email',
      message: 'Invalid email format',
      code: 'INVALID_EMAIL',
    };
  }

  // Check for common typos in domain
  const domain = sanitized.split('@')[1];
  const suspiciousDomains = ['gmial.com', 'gmai.com', 'yahooo.com', 'hotmial.com'];

  if (suspiciousDomains.includes(domain)) {
    return {
      field: 'email',
      message: 'The email domain may be misspelled. Please check again.',
      code: 'SUSPICIOUS_DOMAIN',
    };
  }

  return null;
}

/**
 * Validate phone number format
 */
export function validatePhoneFormat(phone: string): ValidationError | null {
  const sanitized = sanitizePhoneNumber(phone);

  if (!sanitized) {
    return {
      field: 'phone',
      message: 'Please enter a phone number',
      code: 'REQUIRED',
    };
  }

  // Thai phone number: 10 digits starting with 0, or international format
  const thaiPhoneRegex = /^0[0-9]{9}$/;
  const internationalPhoneRegex = /^\+[1-9][0-9]{7,14}$/;

  if (!thaiPhoneRegex.test(sanitized) && !internationalPhoneRegex.test(sanitized)) {
    return {
      field: 'phone',
      message: 'Invalid phone format (example: 0812345678)',
      code: 'INVALID_PHONE',
    };
  }

  return null;
}

/**
 * Validate date range
 */
export function validateDateRange(
  date: string,
  minDate?: Date,
  maxDate?: Date,
  fieldName: string = 'Date'
): ValidationError | null {
  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) {
    return {
      field: 'date',
      message: `${fieldName} is invalid`,
      code: 'INVALID_DATE',
    };
  }

  if (minDate && dateObj < minDate) {
    return {
      field: 'date',
      message: `${fieldName} must not be before ${minDate.toLocaleDateString('en-US')}`,
      code: 'DATE_TOO_EARLY',
    };
  }

  if (maxDate && dateObj > maxDate) {
    return {
      field: 'date',
      message: `${fieldName} must not be after ${maxDate.toLocaleDateString('en-US')}`,
      code: 'DATE_TOO_LATE',
    };
  }

  return null;
}

/**
 * Validate age from date of birth
 */
export function validateAge(
  dateOfBirth: string,
  minAge: number,
  maxAge: number
): ValidationError | null {
  const dob = new Date(dateOfBirth);
  const today = new Date();

  if (isNaN(dob.getTime())) {
    return {
      field: 'date_of_birth',
      message: 'Invalid date of birth',
      code: 'INVALID_DATE',
    };
  }

  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  let actualAge = age;
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    actualAge--;
  }

  if (actualAge < minAge) {
    return {
      field: 'date_of_birth',
      message: `You must be at least ${minAge} years old`,
      code: 'AGE_TOO_YOUNG',
    };
  }

  if (actualAge > maxAge) {
    return {
      field: 'date_of_birth',
      message: `Age must not exceed ${maxAge} years`,
      code: 'AGE_TOO_OLD',
    };
  }

  return null;
}

/**
 * Validate numeric range
 */
export function validateNumericRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationError | null {
  if (isNaN(value) || !isFinite(value)) {
    return {
      field: fieldName,
      message: `${fieldName} must be a number`,
      code: 'INVALID_NUMBER',
    };
  }

  if (value < min) {
    return {
      field: fieldName,
      message: `${fieldName} must be greater than or equal to ${min}`,
      code: 'NUMBER_TOO_SMALL',
    };
  }

  if (value > max) {
    return {
      field: fieldName,
      message: `${fieldName} must be less than or equal to ${max}`,
      code: 'NUMBER_TOO_LARGE',
    };
  }

  return null;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationError | null {
  if (!url) {
    return {
      field: 'url',
      message: 'Please enter a URL',
      code: 'REQUIRED',
    };
  }

  try {
    const urlObj = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        field: 'url',
        message: 'URL must use http or https only',
        code: 'INVALID_PROTOCOL',
      };
    }

    return null;
  } catch {
    return {
      field: 'url',
      message: 'Invalid URL format',
      code: 'INVALID_URL',
    };
  }
}

/**
 * Validate UUID format
 */
export function validateUuid(uuid: string, fieldName: string = 'ID'): ValidationError | null {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    return {
      field: fieldName,
      message: `${fieldName} is invalid`,
      code: 'INVALID_UUID',
    };
  }

  return null;
}

/**
 * Validate time format (HH:MM)
 */
export function validateTimeFormat(time: string): ValidationError | null {
  const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

  if (!timeRegex.test(time)) {
    return {
      field: 'time',
      message: 'Invalid time format (example: 14:30)',
      code: 'INVALID_TIME',
    };
  }

  return null;
}

/**
 * Validate time range (start time must be before end time)
 */
export function validateTimeRange(
  startTime: string,
  endTime: string
): ValidationError | null {
  const startError = validateTimeFormat(startTime);
  if (startError) return startError;

  const endError = validateTimeFormat(endTime);
  if (endError) return endError;

  if (startTime >= endTime) {
    return {
      field: 'end_time',
      message: 'End time must be after start time',
      code: 'INVALID_TIME_RANGE',
    };
  }

  return null;
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string,
  allowedValues: T[],
  fieldName: string
): ValidationError | null {
  if (!allowedValues.includes(value as T)) {
    return {
      field: fieldName,
      message: `${fieldName} is invalid`,
      code: 'INVALID_ENUM',
    };
  }

  return null;
}

/**
 * Validate array length
 */
export function validateArrayLength(
  array: any[],
  min: number,
  max: number,
  fieldName: string
): ValidationError | null {
  if (!Array.isArray(array)) {
    return {
      field: fieldName,
      message: `${fieldName} must be an array`,
      code: 'INVALID_TYPE',
    };
  }

  if (array.length < min) {
    return {
      field: fieldName,
      message: `${fieldName} must have at least ${min} items`,
      code: 'ARRAY_TOO_SHORT',
    };
  }

  if (array.length > max) {
    return {
      field: fieldName,
      message: `${fieldName} must not exceed ${max} items`,
      code: 'ARRAY_TOO_LONG',
    };
  }

  return null;
}

/**
 * Batch validation - validate multiple fields at once
 */
export function batchValidate(
  validators: Array<() => ValidationError | null>
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const validator of validators) {
    const error = validator();
    if (error) {
      errors.push(error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
