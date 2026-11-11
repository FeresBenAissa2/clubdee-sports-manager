/**
 * Rate Limiting Utility
 * 
 * Implements in-memory rate limiting for API endpoints.
 * Uses a sliding window approach with automatic cleanup of expired entries.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

// In-memory store for rate limit data
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Start cleanup interval
if (typeof global !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and retry-after time
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry exists or window has expired, create new entry
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { allowed: true };
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

/**
 * Reset rate limit for an identifier
 * @param identifier - Unique identifier to reset
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get current rate limit status for an identifier
 * @param identifier - Unique identifier
 * @returns Current count and reset time, or null if no entry
 */
export function getRateLimitStatus(identifier: string): RateLimitEntry | null {
  const entry = rateLimitStore.get(identifier);
  if (!entry) return null;

  const now = Date.now();
  if (entry.resetTime < now) {
    rateLimitStore.delete(identifier);
    return null;
  }

  return entry;
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints: 5 requests per minute
  AUTH: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  // API endpoints: 100 requests per minute
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Strict limit for sensitive operations: 3 requests per minute
  SENSITIVE: {
    maxRequests: 3,
    windowMs: 60 * 1000, // 1 minute
  },
};

/**
 * Extract client identifier from request
 * Tries multiple methods: X-Forwarded-For, CF-Connecting-IP, or socket address
 * @param request - NextRequest object
 * @returns Client IP address or identifier
 */
export function getClientIdentifier(request: Request): string {
  const headers = request.headers;

  // Try X-Forwarded-For (proxy)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Try Cloudflare
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Try X-Real-IP
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return 'unknown';
}
