/**
 * Training Session API Route with Idempotency Support
 * 
 * POST /api/coach/sessions
 * 
 * Handles training session creation with idempotency to prevent duplicate sessions.
 * Requirements: 20.6, 20.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';
import { 
  handleIdempotentRequest, 
  extractIdempotencyKey, 
  isValidIdempotencyKey 
} from '@/lib/utils/idempotency';
import { createSession } from '@/lib/coach/session-actions';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Please sign in'
          }
        },
        { status: 401 }
      );
    }

    // Extract idempotency key
    const idempotencyKey = extractIdempotencyKey(request.headers);

    // Parse request body
    const body = await request.json();

    // If idempotency key is provided, use idempotent handler
    if (idempotencyKey) {
      // Validate idempotency key format
      if (!isValidIdempotencyKey(idempotencyKey)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_IDEMPOTENCY_KEY',
              message: 'Idempotency-Key must be a valid UUID or alphanumeric string'
            }
          },
          { status: 400 }
        );
      }

      // Handle with idempotency
      const result = await handleIdempotentRequest(
        idempotencyKey,
        user.id,
        '/api/coach/sessions',
        async () => {
          const sessionResult = await createSession(body);
          
          if (sessionResult.error) {
            throw new Error(sessionResult.error);
          }
          
          return {
            session: sessionResult.data
          };
        }
      );

      // Set response headers
      const headers: Record<string, string> = {
        'X-Request-Id': result.metadata?.requestId || '',
      };

      if (result.metadata?.cached) {
        headers['X-Idempotency-Cached'] = 'true';
        headers['X-Original-Timestamp'] = result.metadata.originalTimestamp || '';
      }

      return NextResponse.json(result, { 
        status: result.success ? 200 : 400,
        headers 
      });
    }

    // No idempotency key, execute normally
    const result = await createSession(body);

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_CREATION_FAILED',
            message: result.error
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        session: result.data
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Session creation API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      },
      { status: 500 }
    );
  }
}
