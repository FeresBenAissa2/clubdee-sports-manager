/**
 * Idempotency Middleware for Next.js API Routes
 * 
 * Provides a wrapper for API route handlers to automatically handle idempotency.
 * Requirements: 20.6, 20.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  handleIdempotentRequest, 
  extractIdempotencyKey, 
  isValidIdempotencyKey,
  IdempotencyResult 
} from './idempotency';

export interface IdempotentApiHandler<T = any> {
  (request: NextRequest): Promise<T>;
}

/**
 * Wrap an API route handler with idempotency support
 * 
 * @param handler - The API route handler function
 * @param options - Configuration options
 * @returns Wrapped handler with idempotency support
 */
export function withIdempotency<T = any>(
  handler: IdempotentApiHandler<T>,
  options: {
    requireIdempotencyKey?: boolean;
    endpoint?: string;
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { requireIdempotencyKey = false, endpoint } = options;

    // Only apply idempotency to mutation methods
    const method = request.method;
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      // For GET and other safe methods, just call the handler
      const result = await handler(request);
      return NextResponse.json(result);
    }

    // Extract idempotency key from headers
    const idempotencyKey = extractIdempotencyKey(request.headers);

    // If idempotency key is required but not provided, return error
    if (requireIdempotencyKey && !idempotencyKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_IDEMPOTENCY_KEY',
            message: 'Idempotency-Key header is required for this endpoint'
          }
        },
        { status: 400 }
      );
    }

    // If no idempotency key provided, just execute the handler
    if (!idempotencyKey) {
      const result = await handler(request);
      return NextResponse.json(result);
    }

    // Validate idempotency key format
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_IDEMPOTENCY_KEY',
            message: 'Idempotency-Key must be a valid UUID or alphanumeric string (16-255 characters)'
          }
        },
        { status: 400 }
      );
    }

    // Get user ID from request (assuming it's set by auth middleware)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User must be authenticated to use idempotency'
          }
        },
        { status: 401 }
      );
    }

    // Determine endpoint path
    const endpointPath = endpoint || new URL(request.url).pathname;

    // Handle idempotent request
    const result = await handleIdempotentRequest<T>(
      idempotencyKey,
      userId,
      endpointPath,
      () => handler(request)
    );

    // Set response headers
    const headers: Record<string, string> = {
      'X-Request-Id': result.metadata?.requestId || '',
    };

    if (result.metadata?.cached) {
      headers['X-Idempotency-Cached'] = 'true';
      headers['X-Original-Timestamp'] = result.metadata.originalTimestamp || '';
    }

    // Return response
    if (result.success) {
      return NextResponse.json(result, { 
        status: 200,
        headers 
      });
    } else {
      return NextResponse.json(result, { 
        status: 500,
        headers 
      });
    }
  };
}

/**
 * Helper to create an idempotent API response
 * 
 * @param data - Response data
 * @param options - Response options
 * @returns NextResponse with proper headers
 */
export function createIdempotentResponse<T>(
  data: T,
  options: {
    status?: number;
    cached?: boolean;
    originalTimestamp?: string;
    requestId?: string;
  } = {}
): NextResponse {
  const { status = 200, cached = false, originalTimestamp, requestId } = options;

  const headers: Record<string, string> = {};
  
  if (requestId) {
    headers['X-Request-Id'] = requestId;
  }
  
  if (cached) {
    headers['X-Idempotency-Cached'] = 'true';
    if (originalTimestamp) {
      headers['X-Original-Timestamp'] = originalTimestamp;
    }
  }

  return NextResponse.json(
    {
      success: true,
      data,
      metadata: {
        cached,
        originalTimestamp,
        timestamp: new Date().toISOString(),
        requestId
      }
    },
    { status, headers }
  );
}

/**
 * Helper to create an error response
 * 
 * @param code - Error code
 * @param message - Error message
 * @param status - HTTP status code
 * @returns NextResponse with error
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    },
    { status }
  );
}
