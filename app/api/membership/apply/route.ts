/**
 * Membership Application API Route with Idempotency Support
 * 
 * POST /api/membership/apply
 * 
 * Handles membership application submission with idempotency to prevent duplicate applications.
 * Requirements: 20.6, 20.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';
import { 
  handleIdempotentRequest, 
  extractIdempotencyKey, 
  isValidIdempotencyKey 
} from '@/lib/utils/idempotency';
import { submitApplication } from '@/lib/membership/actions';
import type { ApplicationSubmissionInput } from '@/lib/membership/validation';

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
    const body = await request.json() as ApplicationSubmissionInput;

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
        '/api/membership/apply',
        async () => {
          const submitResult = await submitApplication(body);
          
          if (!submitResult.success) {
            throw new Error(submitResult.error || 'Failed to submit application');
          }
          
          return {
            applicationId: submitResult.applicationId
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
    const result = await submitApplication(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SUBMISSION_FAILED',
            message: result.error || 'Failed to submit application'
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        applicationId: result.applicationId
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Membership application API error:', error);
    
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
