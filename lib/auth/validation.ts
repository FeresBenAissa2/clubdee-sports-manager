import { authConfig } from './config';
import { sanitizeEmail, sanitizeInput, sanitizePhoneNumber } from '../utils/sanitization';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email) {
    errors.push('Please enter your email');
    return { isValid: false, errors };
  }

  // Sanitize email (lowercase + trim). Demo-friendly: allow any simple local@domain form.
  const sanitized = sanitizeEmail(email);
  if (!sanitized) {
    errors.push('Invalid email format');
    return { isValid: false, errors };
  }

  // Permissive check — school/demo (fake addresses like athlete@gmail.com are OK)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    errors.push('Invalid email format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  const { passwordRequirements } = authConfig;

  if (!password) {
    errors.push('Please enter your password');
    return { isValid: false, errors };
  }

  // Check for null bytes and other dangerous characters
  if (password.includes('\0') || password.includes('\x00')) {
    errors.push('Password contains invalid characters');
    return { isValid: false, errors };
  }

  if (password.length < passwordRequirements.minLength) {
    errors.push(`Password must be at least ${passwordRequirements.minLength} characters`);
  }

  // Maximum length check for security
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must include at least one uppercase letter');
  }

  if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must include at least one lowercase letter');
  }

  if (passwordRequirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must include at least one number');
  }

  if (passwordRequirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must include at least one special character (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePhoneNumber(phone: string): ValidationResult {
  const errors: string[] = [];

  if (!phone) {
    errors.push('Please enter a phone number');
    return { isValid: false, errors };
  }

  // Sanitize phone number
  const sanitized = sanitizePhoneNumber(phone);
  if (!sanitized) {
    errors.push('Invalid phone number format');
    return { isValid: false, errors };
  }

  // Thai phone number: 10 digits starting with 0, or international format
  const thaiPhoneRegex = /^0[0-9]{9}$/;
  const internationalPhoneRegex = /^\+[1-9][0-9]{7,14}$/;

  if (!thaiPhoneRegex.test(sanitized) && !internationalPhoneRegex.test(sanitized)) {
    errors.push('Invalid phone format (example: 0812345678)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateDateOfBirth(dob: string): ValidationResult {
  const errors: string[] = [];

  if (!dob) {
    errors.push('Please enter your date of birth');
    return { isValid: false, errors };
  }

  const date = new Date(dob);
  const today = new Date();

  if (isNaN(date.getTime())) {
    errors.push('Invalid date format');
    return { isValid: false, errors };
  }

  if (date > today) {
    errors.push('Date of birth cannot be in the future');
  }

  // Check minimum age (e.g., 5 years old)
  const minAge = 5;
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - minAge);

  if (date > minDate) {
    errors.push(`You must be at least ${minAge} years old`);
  }

  // Check maximum age (e.g., 100 years old)
  const maxAge = 100;
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - maxAge);

  if (date < maxDate) {
    errors.push('Invalid date of birth');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateRequired(value: string, fieldName: string): ValidationResult {
  const errors: string[] = [];

  if (!value) {
    errors.push(`Please enter ${fieldName}`);
    return { isValid: false, errors };
  }

  // Sanitize and check if empty
  const sanitized = sanitizeInput(value);
  if (sanitized === '') {
    errors.push(`Please enter ${fieldName}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateOTP(otp: string): ValidationResult {
  const errors: string[] = [];

  if (!otp) {
    errors.push('Please enter the OTP code');
    return { isValid: false, errors };
  }

  if (otp.length !== authConfig.otpLength) {
    errors.push(`OTP must be ${authConfig.otpLength} digits`);
  }

  if (!/^\d+$/.test(otp)) {
    errors.push('OTP must contain digits only');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
