/**
 * Rate Limiting Middleware for Next.js
 * 
 * Provides middleware functions to apply rate limiting to API routes
 * and other endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig,
} from './rate-limit';

/**
 * Create a rate limiting middleware for API routes
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (request: NextRequest) => {
    const clientId = getClientIdentifier(request);
    const { allowed, retryAfter } = checkRateLimit(clientId, config);

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Too many requests. Please wait and try again',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter?.toString() || '60',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(
              Date.now() + (retryAfter || 60) * 1000
            ).toISOString(),
          },
        }
      );
    }

    return null; // Allow request to proceed
  };
}

/**
 * Wrap an API route handler with rate limiting
 * @param handler - API route handler
 * @param config - Rate limit configuration
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async (request: NextRequest) => {
    const clientId = getClientIdentifier(request);
    const { allowed, retryAfter } = checkRateLimit(clientId, config);

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Too many requests. Please wait and try again',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter?.toString() || '60',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(
              Date.now() + (retryAfter || 60) * 1000
            ).toISOString(),
          },
        }
      );
    }

    // Call the actual handler
    return handler(request);
  };
}

/**
 * Predefined middleware creators for common endpoints
 */
export const rateLimitMiddleware = {
  /**
   * Rate limiting for authentication endpoints (5 per minute)
   */
  auth: createRateLimitMiddleware(RATE_LIMIT_CONFIGS.AUTH),

  /**
   * Rate limiting for general API endpoints (100 per minute)
   */
  api: createRateLimitMiddleware(RATE_LIMIT_CONFIGS.API),

  /**
   * Rate limiting for sensitive operations (3 per minute)
   */
  sensitive: createRateLimitMiddleware(RATE_LIMIT_CONFIGS.SENSITIVE),
};

/**
 * Predefined wrappers for common endpoints
 */
export const withRateLimitAuth = (
  handler: (request: NextRequest) => Promise<NextResponse>
) => withRateLimit(handler, RATE_LIMIT_CONFIGS.AUTH);

export const withRateLimitApi = (
  handler: (request: NextRequest) => Promise<NextResponse>
) => withRateLimit(handler, RATE_LIMIT_CONFIGS.API);

export const withRateLimitSensitive = (
  handler: (request: NextRequest) => Promise<NextResponse>
) => withRateLimit(handler, RATE_LIMIT_CONFIGS.SENSITIVE);
