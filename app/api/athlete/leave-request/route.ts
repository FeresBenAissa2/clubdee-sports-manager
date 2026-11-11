/**
 * Leave Request API Route with Idempotency Support
 * 
 * POST /api/athlete/leave-request
 * 
 * Handles leave request submission with idempotency to prevent duplicate requests.
 * Requirements: 20.6, 20.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';
import { 
  handleIdempotentRequest, 
  extractIdempotencyKey, 
  isValidIdempotencyKey 
} from '@/lib/utils/idempotency';
import { requestLeave } from '@/lib/athlete/attendance-actions';

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
    const { sessionId, reason } = body;

    if (!sessionId || !reason) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Session ID and reason are required'
          }
        },
        { status: 400 }
      );
    }

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
        '/api/athlete/leave-request',
        async () => {
          const leaveResult = await requestLeave({ sessionId, reason }) as any;
          
          if (leaveResult.error || !leaveResult.success) {
            throw new Error(leaveResult.error || 'Failed to submit leave request');
          }
          
          return {
            leaveRequest: leaveResult.data || leaveResult
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
    const result = await requestLeave({ sessionId, reason }) as any;

    if (result.error || !result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LEAVE_REQUEST_FAILED',
            message: result.error || 'Failed to submit leave request'
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        leaveRequest: result.data || result
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Leave request API error:', error);
    
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
