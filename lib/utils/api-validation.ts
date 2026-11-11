/**
 * API validation middleware and utilities
 * Requirement 9.2: Input validation for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeObject, sanitizeInput } from './sanitization';
import { z, ZodType } from 'zod';

export interface ApiValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiErrorResponse {
  error: string;
  errors?: ApiValidationError[];
  code: string;
  timestamp: string;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  code: string = 'VALIDATION_ERROR',
  errors?: ApiValidationError[],
  status: number = 400
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      errors,
      code,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Validate request body against Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodType<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();

    // Sanitize the body before validation
    const sanitized = sanitizeObject(body);

    // Validate against schema
    const result = schema.safeParse(sanitized);

    if (!result.success) {
      const errors: ApiValidationError[] = (result.error as any).errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      return {
        success: false,
        response: createErrorResponse('Invalid data', 'VALIDATION_ERROR', errors),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      response: createErrorResponse(
        'Cannot read data',
        'INVALID_JSON',
        undefined,
        400
      ),
    };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams(
  request: NextRequest,
  schema: ZodType
): { success: true; data: any } | { success: false; response: NextResponse } {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      params[key] = sanitizeInput(value);
    });

    const result = schema.safeParse(params);

    if (!result.success) {
      const errors: ApiValidationError[] = (result.error as any).errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      return {
        success: false,
        response: createErrorResponse(
          'Invalid parameters',
          'VALIDATION_ERROR',
          errors
        ),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      response: createErrorResponse('Cannot read parameters', 'INVALID_PARAMS'),
    };
  }
}

/**
 * Validate request headers
 */
export function validateHeaders(
  request: NextRequest,
  requiredHeaders: string[]
): { success: true } | { success: false; response: NextResponse } {
  const missingHeaders: string[] = [];

  for (const header of requiredHeaders) {
    if (!request.headers.get(header)) {
      missingHeaders.push(header);
    }
  }

  if (missingHeaders.length > 0) {
    return {
      success: false,
      response: createErrorResponse(
        `Missing required headers: ${missingHeaders.join(', ')}`,
        'MISSING_HEADERS',
        undefined,
        400
      ),
    };
  }

  return { success: true };
}

/**
 * Rate limiting check (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { success: true } | { success: false; response: NextResponse } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    // Create new record
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { success: true };
  }

  if (record.count >= maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Too many requests. Please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      ),
    };
  }

  // Increment count
  record.count++;
  return { success: true };
}

/**
 * Validate content type
 */
export function validateContentType(
  request: NextRequest,
  expectedType: string = 'application/json'
): { success: true } | { success: false; response: NextResponse } {
  const contentType = request.headers.get('content-type');

  if (!contentType || !contentType.includes(expectedType)) {
    return {
      success: false,
      response: createErrorResponse(
        `Content-Type must be ${expectedType}`,
        'INVALID_CONTENT_TYPE',
        undefined,
        415
      ),
    };
  }

  return { success: true };
}

/**
 * Validate request method
 */
export function validateMethod(
  request: NextRequest,
  allowedMethods: string[]
): { success: true } | { success: false; response: NextResponse } {
  if (!allowedMethods.includes(request.method)) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: `Method ${request.method} is not allowed`,
          code: 'METHOD_NOT_ALLOWED',
          timestamp: new Date().toISOString(),
        },
        {
          status: 405,
          headers: {
            Allow: allowedMethods.join(', '),
          },
        }
      ),
    };
  }

  return { success: true };
}

/**
 * Sanitize and validate file upload from FormData
 */
export async function validateFormDataFile(
  request: NextRequest,
  fieldName: string,
  options: {
    required?: boolean;
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
): Promise<
  | { success: true; file: File }
  | { success: false; response: NextResponse }
> {
  try {
    const formData = await request.formData();
    const file = formData.get(fieldName) as File | null;

    if (!file) {
      if (options.required) {
        return {
          success: false,
          response: createErrorResponse(
            `File not found: ${fieldName}`,
            'MISSING_FILE'
          ),
        };
      }
      return { success: true, file: null as any };
    }

    // Validate file size
    if (options.maxSize && file.size > options.maxSize) {
      const maxSizeMB = (options.maxSize / (1024 * 1024)).toFixed(2);
      return {
        success: false,
        response: createErrorResponse(
          `File size must not exceed ${maxSizeMB} MB`,
          'FILE_TOO_LARGE'
        ),
      };
    }

    // Validate file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      return {
        success: false,
        response: createErrorResponse(
          `Invalid file type (allowed: ${options.allowedTypes.join(', ')})`,
          'INVALID_FILE_TYPE'
        ),
      };
    }

    return { success: true, file };
  } catch (error) {
    return {
      success: false,
      response: createErrorResponse(
        'Cannot read file data',
        'INVALID_FORM_DATA'
      ),
    };
  }
}

/**
 * Combine multiple validation checks
 */
export function combineValidations(
  ...validations: Array<
    { success: true } | { success: false; response: NextResponse }
  >
): { success: true } | { success: false; response: NextResponse } {
  for (const validation of validations) {
    if (!validation.success) {
      return validation;
    }
  }
  return { success: true };
}
