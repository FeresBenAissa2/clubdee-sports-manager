// Authentication configuration
export const authConfig = {
  // JWT token expiration (1 hour)
  jwtExpiry: 3600,

  // Rate limiting for auth attempts
  maxLoginAttempts: 5,
  loginAttemptWindow: 60 * 1000, // 1 minute

  // Account lockout settings
  maxFailedAttempts: 3,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes

  // OTP settings
  otpExpiry: 10 * 60 * 1000, // 10 minutes
  otpLength: 6,

  // Password requirements
  passwordMinLength: 8,
  passwordRequirements: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },

  // Redirect URLs
  redirects: {
    afterLogin: '/dashboard',
    afterLogout: '/login',
    afterSignup: '/dashboard',
  },
};

export const getRedirectUrl = (role: 'admin' | 'coach' | 'athlete') => {
  // Always redirect to /dashboard and let middleware handle role-based routing
  return '/dashboard';
};
