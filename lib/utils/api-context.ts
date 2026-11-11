/**
 * API Context Utilities
 * 
 * Helpers for extracting and using request context in API routes and server actions.
 * Ensures correlation IDs are propagated through the entire request chain.
 * 
 * Validates: Requirements 20.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext, extractCorrelationId, type RequestContext } from './correlation';
import { createLogger, type Logger } from './logger';

/**
 * Extract request context from Next.js API route request
 */
export function getApiContext(request: NextRequest, userId?: string): RequestContext {
  const correlationId = extractCorrelationId(request.headers);
  
  return createRequestContext(
    correlationId,
    userId,
    request.url,
    request.method
  );
}

/**
 * Extract request context from standard Request object
 */
export function getRequestContextFromRequest(request: Request, userId?: string): RequestContext {
  const headers = new Headers(request.headers);
  const correlationId = extractCorrelationId(headers);
  
  return createRequestContext(
    correlationId,
    userId,
    request.url,
    request.method
  );
}

/**
 * Create a logger for an API route
 */
export function createApiLogger(request: NextRequest, userId?: string): Logger {
  const context = getApiContext(request, userId);
  return createLogger(context);
}

/**
 * Add correlation headers to API response
 */
export function addCorrelationToResponse(
  response: NextResponse,
  context: RequestContext
): NextResponse {
  response.headers.set('X-Correlation-ID', context.correlationId);
  response.headers.set('X-Causation-ID', context.causationId);
  return response;
}

/**
 * Create a JSON response with correlation headers
 */
export function createApiResponse(
  data: any,
  context: RequestContext,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  return addCorrelationToResponse(response, context);
}

/**
 * Create an error response with correlation headers
 */
export function createApiErrorResponse(
  error: string,
  context: RequestContext,
  status: number = 500,
  details?: Record<string, any>
): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: {
        code: 'API_ERROR',
        message: error,
        details,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId: context.correlationId,
        causationId: context.causationId,
      },
    },
    { status }
  );
  
  return addCorrelationToResponse(response, context);
}

/**
 * Wrapper for API route handlers that automatically adds correlation IDs
 */
export function withApiContext(
  handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const context = getApiContext(request);
    const logger = createLogger(context);
    
    try {
      logger.info('API request started', {
        method: request.method,
        url: request.url,
      });
      
      const response = await handler(request, context);
      
      logger.info('API request completed', {
        status: response.status,
      });
      
      return addCorrelationToResponse(response, context);
    } catch (error) {
      logger.error('API request failed', error as Error);
      return createApiErrorResponse(
        'Internal server error',
        context,
        500
      );
    }
  };
}
