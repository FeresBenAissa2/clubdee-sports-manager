/**
 * Unit Tests for Registration Error Handling
 * Feature: auth-database-integration
 * 
 * Tests duplicate email and rate limit error handling
 * Validates: Requirements 1.5, 5.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  auth: {
    signUp: vi.fn(),
  },
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      error: null,
    })),
  })),
};

// Mock the Supabase server module
vi.mock('@/lib/db/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

// Import after mocking
const { signUp } = await import('@/lib/auth/actions');

describe('Registration Error Handling - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test 2.5: Duplicate email error returns Thai error message
   * When registration fails due to duplicate email,
   * the system should return a clear Thai error message
   * Validates: Requirements 1.5
   */
  it('should return Thai error message for duplicate email', async () => {
    // Mock duplicate email error from Supabase
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'User already registered',
        status: 400,
      },
    });

    const result = await signUp('existing@example.com', 'ValidPass123!');

    // Verify the result
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toBe('อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น');
    expect(result.userId).toBeUndefined();
  });

  /**
   * Test 2.5: Duplicate email error (alternative message format)
   * Test with different error message format from Supabase
   */
  it('should handle "already been registered" error message', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Email has already been registered',
        status: 400,
      },
    });

    const result = await signUp('duplicate@example.com', 'ValidPass123!');

    expect(result.success).toBe(false);
    expect(result.error).toBe('อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น');
  });

  /**
   * Test 2.6: Rate limit error returns Thai error message
   * When registration fails due to rate limiting,
   * the system should return a Thai error message asking user to wait
   * Validates: Requirements 5.1
   */
  it('should return Thai error message for rate limit error', async () => {
    // Mock rate limit error from Supabase
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Email rate limit exceeded',
        status: 429,
      },
    });

    const result = await signUp('test@example.com', 'ValidPass123!');

    // Verify the result
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toBe('ลองสมัครบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง (1-2 นาที)');
    expect(result.userId).toBeUndefined();
  });

  /**
   * Test 2.6: Rate limit error (alternative message format)
   * Test with "too many" error message format
   */
  it('should handle "too many" rate limit error message', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Too many requests',
        status: 429,
      },
    });

    const result = await signUp('test2@example.com', 'ValidPass123!');

    expect(result.success).toBe(false);
    expect(result.error).toBe('ลองสมัครบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง (1-2 นาที)');
  });

  /**
   * Test 2.6: Rate limit error (case insensitive)
   * Test with uppercase "RATE LIMIT" message
   */
  it('should handle rate limit error case insensitively', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'RATE LIMIT exceeded',
        status: 429,
      },
    });

    const result = await signUp('test3@example.com', 'ValidPass123!');

    expect(result.success).toBe(false);
    expect(result.error).toBe('ลองสมัครบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง (1-2 นาที)');
  });

  /**
   * Additional test: Invalid email format error
   * Verify Thai error message for invalid email
   */
  it('should return Thai error message for invalid email format', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Invalid email format',
        status: 400,
      },
    });

    const result = await signUp('invalid-email', 'ValidPass123!');

    expect(result.success).toBe(false);
    expect(result.error).toBe('รูปแบบอีเมลไม่ถูกต้อง กรุณาใช้อีเมลจริง (เช่น example@gmail.com)');
  });

  /**
   * Additional test: Password error
   * Verify Thai error message for password errors
   */
  it('should return Thai error message for password errors', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Password is too weak',
        status: 400,
      },
    });

    const result = await signUp('test@example.com', 'weak');

    expect(result.success).toBe(false);
    expect(result.error).toBe('รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
  });

  /**
   * Additional test: Generic error
   * Verify Thai error message for unexpected errors
   */
  it('should return generic Thai error message for unknown errors', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Some unexpected database error',
        status: 500,
      },
    });

    const result = await signUp('test@example.com', 'ValidPass123!');

    expect(result.success).toBe(false);
    expect(result.error).toBe('เกิดข้อผิดพลาดในการสร้างบัญชี กรุณาลองใหม่อีกครั้ง');
  });

  /**
   * Additional test: Successful registration
   * Verify successful registration returns success
   */
  it('should return success for valid registration', async () => {
    const mockUserId = 'user-123';
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: {
        user: {
          id: mockUserId,
          email: 'newuser@example.com',
          created_at: new Date().toISOString(),
        },
        session: null,
      },
      error: null,
    });

    const result = await signUp('newuser@example.com', 'ValidPass123!');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.userId).toBe(mockUserId);
  });
});
