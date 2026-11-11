/**
 * Correlation and Causation ID Utilities
 * 
 * Implements request tracing for debugging and monitoring.
 * - Correlation ID: Groups related operations across the system
 * - Causation ID: Links cause and effect within a correlation
 * 
 * Validates: Requirements 20.5
 */

/**
 * Request context containing tracing IDs
 */
export interface RequestContext {
  correlationId: string;
  causationId: string;
  userId?: string;
  timestamp: string;
  requestUrl?: string;
  requestMethod?: string;
}

/**
 * Generate a new correlation ID
 * Used when a request enters the system without an existing correlation ID
 * Uses Web Crypto API for Edge Runtime compatibility
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a new causation ID
 * Each operation within a correlation creates a new causation ID
 * Uses Web Crypto API for Edge Runtime compatibility
 */
export function generateCausationId(): string {
  return crypto.randomUUID();
}

/**
 * Create a request context from headers and request data
 */
export function createRequestContext(
  correlationId: string | null,
  userId?: string,
  requestUrl?: string,
  requestMethod?: string
): RequestContext {
  return {
    correlationId: correlationId || generateCorrelationId(),
    causationId: generateCausationId(),
    userId,
    timestamp: new Date().toISOString(),
    requestUrl,
    requestMethod,
  };
}

/**
 * Extract correlation ID from request headers
 */
export function extractCorrelationId(headers: Headers): string | null {
  return headers.get('x-correlation-id') || headers.get('X-Correlation-ID');
}

/**
 * Extract causation ID from request headers
 */
export function extractCausationId(headers: Headers): string | null {
  return headers.get('x-causation-id') || headers.get('X-Causation-ID');
}

/**
 * Create child context for nested operations
 * Preserves correlation ID but generates new causation ID
 */
export function createChildContext(
  parentContext: RequestContext,
  userId?: string
): RequestContext {
  return {
    correlationId: parentContext.correlationId,
    causationId: generateCausationId(),
    userId: userId || parentContext.userId,
    timestamp: new Date().toISOString(),
    requestUrl: parentContext.requestUrl,
    requestMethod: parentContext.requestMethod,
  };
}

/**
 * Format context for logging
 */
export function formatContextForLogging(context: RequestContext): Record<string, any> {
  return {
    correlationId: context.correlationId,
    causationId: context.causationId,
    userId: context.userId,
    timestamp: context.timestamp,
    requestUrl: context.requestUrl,
    requestMethod: context.requestMethod,
  };
}
