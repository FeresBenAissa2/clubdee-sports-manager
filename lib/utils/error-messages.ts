/**
 * Error message utilities for user-friendly error handling
 * Provides consistent, localized error messages across the application
 */

export const ErrorMessages = {
  // Authentication errors
  AUTH_REQUIRED: 'Please sign in to continue',
  AUTH_FAILED: 'Authentication failed. Please sign in again',
  UNAUTHORIZED: 'You do not have permission to perform this action',
  
  // Profile errors
  PROFILE_NOT_FOUND: 'User profile not found. Please contact an administrator',
  COACH_NOT_FOUND: 'Coach profile not found',
  ATHLETE_NOT_FOUND: 'Athlete profile not found',
  
  // Session errors
  SESSION_NOT_FOUND: 'Training session not found',
  SESSION_CANCELLED: 'This training session has been cancelled',
  SESSION_CREATE_FAILED: 'Could not create training session. Please try again',
  SESSION_UPDATE_FAILED: 'Could not update training session. Please try again',
  SESSION_DELETE_FAILED: 'Could not delete training session. Please try again',
  SESSION_PAST_DATE: 'Cannot create or edit sessions in the past',
  SESSION_INVALID_TIME: 'Start time must be before end time',
  SESSION_CANCEL_TOO_LATE: 'Cannot cancel session. Cancel at least 2 hours before start time',
  
  // Check-in errors
  CHECKIN_ALREADY_EXISTS: 'You have already checked in for this session',
  CHECKIN_TOO_EARLY: 'Check-in is not open yet (available 30 minutes before start)',
  CHECKIN_TOO_LATE: 'Check-in window has closed (available until 15 minutes after start)',
  CHECKIN_FAILED: 'Could not record check-in. Please try again',
  CHECKIN_WRONG_CLUB: "You cannot check in to another club's session",
  
  // Leave request errors
  LEAVE_ALREADY_EXISTS: 'You have already submitted leave for this session',
  LEAVE_TOO_LATE: 'Leave must be requested at least 2 hours before start time',
  LEAVE_REASON_TOO_SHORT: 'Please enter a reason of at least 10 characters',
  LEAVE_AFTER_CHECKIN: 'You have already checked in and cannot request leave',
  LEAVE_FAILED: 'Could not submit leave request. Please try again',
  LEAVE_WRONG_CLUB: "You cannot request leave for another club's session",
  
  // Attendance errors
  ATTENDANCE_NOT_FOUND: 'Attendance record not found',
  ATTENDANCE_UPDATE_FAILED: 'Could not update attendance. Please try again',
  ATTENDANCE_FETCH_FAILED: 'Could not load attendance. Please try again',
  
  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'Please fill in required fields',
  VALIDATION_INVALID_DATE: 'Invalid date',
  VALIDATION_INVALID_TIME: 'Invalid time',
  VALIDATION_INVALID_EMAIL: 'Invalid email',
  
  // Database errors
  DB_CONNECTION_ERROR: 'Could not connect to the database. Please try again',
  DB_QUERY_ERROR: 'Error loading data. Please try again',
  DB_INSERT_ERROR: 'Error saving data. Please try again',
  DB_UPDATE_ERROR: 'Error updating data. Please try again',
  DB_DELETE_ERROR: 'Error deleting data. Please try again',
  
  // Generic errors
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again or contact support',
  NETWORK_ERROR: 'Connection error. Please check your internet connection',
  SERVER_ERROR: 'Server error. Please try again later',
} as const;

/**
 * Get user-friendly error message from error code or message
 */
export function getUserFriendlyError(error: string | Error | unknown): string {
  if (typeof error === 'string') {
    // Check if it's a known error code
    if (error in ErrorMessages) {
      return ErrorMessages[error as keyof typeof ErrorMessages];
    }
    // Return the error string as-is if it's already user-friendly
    return error;
  }
  
  if (error instanceof Error) {
    // Try to match error message to known patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('auth') || message.includes('unauthorized')) {
      return ErrorMessages.AUTH_REQUIRED;
    }
    
    if (message.includes('not found')) {
      return ErrorMessages.SESSION_NOT_FOUND;
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorMessages.NETWORK_ERROR;
    }
    
    // Return the original error message if no match
    return error.message;
  }
  
  // Unknown error type
  return ErrorMessages.UNEXPECTED_ERROR;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: Record<string, string>): string {
  const errorMessages = Object.values(errors);
  if (errorMessages.length === 0) return '';
  if (errorMessages.length === 1) return errorMessages[0];
  return `Please fix the following errors:\n${errorMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}`;
}
