/**
 * Correlation ID Middleware
 * 
 * Generates and propagates correlation and causation IDs through the request chain.
 * Adds tracing headers to all requests and responses.
 * 
 * Validates: Requirements 20.5
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateCorrelationId,
  generateCausationId,
  extractCorrelationId,
  createRequestContext,
  type RequestContext,
} from './correlation';

/**
 * Add correlation and causation IDs to a NextRequest
 * This modifies the request to include tracing headers
 */
export function addCorrelationHeaders(
  request: NextRequest,
  response: NextResponse
): { response: NextResponse; context: RequestContext } {
  // Extract or generate correlation ID
  const existingCorrelationId = extractCorrelationId(request.headers);
  const correlationId = existingCorrelationId || generateCorrelationId();
  
  // Always generate a new causation ID for this operation
  const causationId = generateCausationId();
  
  // Create request context
  const context = createRequestContext(
    correlationId,
    undefined, // userId will be set after auth
    request.url,
    request.method
  );
  
  // Add headers to response
  response.headers.set('X-Correlation-ID', correlationId);
  response.headers.set('X-Causation-ID', causationId);
  
  // Also add to request for downstream handlers
  // Note: We can't modify the original request headers, but we can pass context
  
  return { response, context };
}

/**
 * Middleware function to add correlation IDs
 * This should be called early in the middleware chain
 */
export function withCorrelationId(
  handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Create initial response
    let response = NextResponse.next({ request });
    
    // Add correlation headers
    const { response: updatedResponse, context } = addCorrelationHeaders(request, response);
    
    // Call the handler with context
    const finalResponse = await handler(request, context);
    
    // Ensure correlation headers are on final response
    finalResponse.headers.set('X-Correlation-ID', context.correlationId);
    finalResponse.headers.set('X-Causation-ID', context.causationId);
    
    return finalResponse;
  };
}

/**
 * Extract request context from Next.js request
 * Used in API routes and server actions
 */
export function getRequestContext(request: Request): RequestContext {
  const headers = new Headers(request.headers);
  const correlationId = extractCorrelationId(headers);
  
  return createRequestContext(
    correlationId,
    undefined,
    request.url,
    request.method
  );
}

/**
 * Add correlation headers to a Response object
 */
export function addCorrelationHeadersToResponse(
  response: Response,
  context: RequestContext
): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('X-Correlation-ID', context.correlationId);
  newResponse.headers.set('X-Causation-ID', context.causationId);
  return newResponse;
}
