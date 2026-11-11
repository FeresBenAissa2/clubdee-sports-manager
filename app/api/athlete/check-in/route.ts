/**
 * Attendance Check-in API Route with Idempotency Support
 * 
 * POST /api/athlete/check-in
 * 
 * Handles athlete check-in with idempotency to prevent duplicate check-ins.
 * Requirements: 20.5, 20.6, 20.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';
import { 
  handleIdempotentRequest, 
  extractIdempotencyKey, 
  isValidIdempotencyKey 
} from '@/lib/utils/idempotency';
// Note: checkInToSession function needs to be implemented in attendance-actions
// For now, we'll handle check-in logic directly here
import { getApiContext } from '@/lib/utils/api-context';
import { createLogger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  // Create request context with correlation IDs
  const context = getApiContext(request);
  const logger = createLogger(context);
  
  try {
    logger.info('Check-in request started');
    
    // Get authenticated user
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    
    // Update context with user ID
    context.userId = user?.id;

    if (authError || !user) {
      logger.warn('Authentication failed', { error: authError?.message });
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Please sign in'
          }
        },
        { status: 401 }
      );
      response.headers.set('X-Correlation-ID', context.correlationId);
      response.headers.set('X-Causation-ID', context.causationId);
      return response;
    }

    // Extract idempotency key
    const idempotencyKey = extractIdempotencyKey(request.headers);

    // Parse request body
    const body = await request.json();
    const { sessionId, method = 'manual' } = body;

    if (!sessionId) {
      logger.warn('Missing session ID in request');
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_SESSION_ID',
            message: 'Session ID is required'
          }
        },
        { status: 400 }
      );
      response.headers.set('X-Correlation-ID', context.correlationId);
      response.headers.set('X-Causation-ID', context.causationId);
      return response;
    }
    
    logger.info('Processing check-in', { sessionId, method, userId: user.id });

    // If idempotency key is provided, use idempotent handler
    if (idempotencyKey) {
      // Validate idempotency key format
      if (!isValidIdempotencyKey(idempotencyKey)) {
        logger.warn('Invalid idempotency key format', { idempotencyKey });
        const response = NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_IDEMPOTENCY_KEY',
              message: 'Idempotency-Key must be a valid UUID or alphanumeric string'
            }
          },
          { status: 400 }
        );
        response.headers.set('X-Correlation-ID', context.correlationId);
        response.headers.set('X-Causation-ID', context.causationId);
        return response;
      }
      
      logger.info('Using idempotent request handler', { idempotencyKey });

      // Handle with idempotency
      const result = await handleIdempotentRequest(
        idempotencyKey,
        user.id,
        '/api/athlete/check-in',
        async () => {
          // TODO: Implement checkInToSession function
          throw new Error('Check-in functionality not yet implemented');
        }
      );

      // Set response headers
      const headers: Record<string, string> = {
        'X-Request-Id': result.metadata?.requestId || '',
        'X-Correlation-ID': context.correlationId,
        'X-Causation-ID': context.causationId,
      };

      if (result.metadata?.cached) {
        headers['X-Idempotency-Cached'] = 'true';
        headers['X-Original-Timestamp'] = result.metadata.originalTimestamp || '';
        logger.info('Returning cached idempotent response', { 
          idempotencyKey,
          originalTimestamp: result.metadata.originalTimestamp 
        });
      } else {
        logger.info('Check-in completed successfully', { sessionId });
      }

      return NextResponse.json(result, { 
        status: result.success ? 200 : 400,
        headers 
      });
    }

    // No idempotency key, execute normally
    logger.info('Executing check-in without idempotency key');
    
    // TODO: Implement checkInToSession function
    logger.warn('Check-in functionality not yet implemented');
    const response = NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Check-in functionality is not yet implemented'
        }
      },
      { status: 501 }
    );
    response.headers.set('X-Correlation-ID', context.correlationId);
    response.headers.set('X-Causation-ID', context.causationId);
    return response;

  } catch (error) {
    logger.error('Check-in API error', error as Error);
    
    const response = NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId: context.correlationId,
          causationId: context.causationId,
        }
      },
      { status: 500 }
    );
    response.headers.set('X-Correlation-ID', context.correlationId);
    response.headers.set('X-Causation-ID', context.causationId);
    return response;
  }
}
