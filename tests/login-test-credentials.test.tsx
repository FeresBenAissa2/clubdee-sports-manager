/**
 * Test: Test credentials visibility based on NODE_ENV
 * Validates: Requirements 9.4, 9.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SimpleLoginForm } from '@/components/auth/SimpleLoginForm';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Mock auth actions
vi.mock('@/lib/auth/actions', () => ({
  signIn: vi.fn(),
}));

// Mock device fingerprint
vi.mock('@/lib/utils/device-fingerprint', () => ({
  getDeviceInfo: vi.fn(() => ({
    deviceId: 'test-device',
    userAgent: 'test-agent',
    platform: 'test-platform',
    language: 'th',
    screenResolution: '1920x1080',
    timezone: 'Asia/Bangkok',
  })),
}));

describe('Test Credentials Visibility', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('LoginForm', () => {
    it('should show test credentials in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      render(<LoginForm />);
      
      // Check for test credentials section
      expect(screen.getByText(/คลิกเพื่อกรอกข้อมูลทดสอบอัตโนมัติ/i)).toBeInTheDocument();
      expect(screen.getByText(/👨‍💼 Admin/i)).toBeInTheDocument();
      expect(screen.getByText(/🏃‍♂️ Coach/i)).toBeInTheDocument();
      expect(screen.getByText(/🏅 Athlete/i)).toBeInTheDocument();
    });

    it('should hide test credentials in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      render(<LoginForm />);
      
      // Test credentials section should not be present
      expect(screen.queryByText(/คลิกเพื่อกรอกข้อมูลทดสอบอัตโนมัติ/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/👨‍💼 Admin/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/🏃‍♂️ Coach/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/🏅 Athlete/i)).not.toBeInTheDocument();
    });
  });

  describe('SimpleLoginForm', () => {
    it('should show test credentials toggle in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      render(<SimpleLoginForm />);
      
      // Check for test credentials toggle button
      expect(screen.getByText(/ข้อมูลทดสอบ/i)).toBeInTheDocument();
    });

    it('should hide test credentials toggle in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      render(<SimpleLoginForm />);
      
      // Test credentials toggle should not be present
      expect(screen.queryByText(/ข้อมูลทดสอบ/i)).not.toBeInTheDocument();
    });
  });
});
