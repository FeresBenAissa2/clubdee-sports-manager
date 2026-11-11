/**
 * Component Tests for AccountCreationForm
 * 
 * Tests the account creation step of the registration form.
 * Validates: Requirements 1.1, 1.2, 1.4
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountCreationForm from '@/components/membership/AccountCreationForm';
import { generateValidAccountData, generateInvalidAccountData } from './test-utils';

describe('AccountCreationForm', () => {
  // Test 3.1: Rendering with empty fields
  describe('Rendering', () => {
    it('should render form with empty fields', () => {
      const mockOnChange = vi.fn();
      const emptyValue = {
        email: '',
        password: '',
        confirmPassword: '',
      };

      render(
        <AccountCreationForm
          value={emptyValue}
          onChange={mockOnChange}
          errors={{}}
        />
      );

      // Verify all input fields are present
      expect(screen.getByLabelText(/อีเมล/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^รหัสผ่าน/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ยืนยันรหัสผ่าน/i)).toBeInTheDocument();

      // Verify fields are empty
      expect(screen.getByLabelText(/อีเมล/i)).toHaveValue('');
      expect(screen.getByLabelText(/^รหัสผ่าน/i)).toHaveValue('');
      expect(screen.getByLabelText(/ยืนยันรหัสผ่าน/i)).toHaveValue('');
    });

    it('should display all required field indicators', () => {
      const mockOnChange = vi.fn();
      const emptyValue = {
        email: '',
        password: '',
        confirmPassword: '',
      };

      render(
        <AccountCreationForm
          value={emptyValue}
          onChange={mockOnChange}
          errors={{}}
        />
      );

      // Check for required field asterisks
      const labels = screen.getAllByText('*');
      expect(labels.length).toBeGreaterThanOrEqual(3);
    });
  });

  // Test 3.2: Valid email and password input
  describe('Valid Input', () => {
    it('should accept valid email and password without errors', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const validData = generateValidAccountData();
      const value = {
        email: '',
        password: '',
        confirmPassword: '',
      };

      render(
        <AccountCreationForm
          value={value}
          onChange={mockOnChange}
          errors={{}}
        />
      );

      // Enter valid email
      const emailInput = screen.getByLabelText(/อีเมล/i);
      await user.type(emailInput, validData.email);

      // Enter valid password
      const passwordInput = screen.getByLabelText(/^รหัสผ่าน/i);
      await user.type(passwordInput, validData.password);

      // Enter matching confirm password
      const confirmPasswordInput = screen.getByLabelText(/ยืนยันรหัสผ่าน/i);
      await user.type(confirmPasswordInput, validData.confirmPassword);

      // Verify onChange was called for each input
      expect(mockOnChange).toHaveBeenCalled();
      expect(mockOnChange.mock.calls.length).toBeGreaterThan(0);

      // Verify no error messages are displayed (check for red error text, not gray help text)
      const errorMessages = screen.queryAllByText(/อีเมลไม่ถูกต้อง|รหัสผ่านไม่ตรงกัน/i);
      const redErrors = errorMessages.filter(el => el.className.includes('text-red'));
      expect(redErrors.length).toBe(0);
    });

    it('should call onChange with correct data structure', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const value = {
        email: '',
        password: '',
        confirmPassword: '',
      };

      render(
        <AccountCreationForm
          value={value}
          onChange={mockOnChange}
          errors={{}}
        />
      );

      const emailInput = screen.getByLabelText(/อีเมล/i);
      await user.type(emailInput, 't');

      // Verify onChange was called with correct structure
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.any(String),
          password: expect.any(String),
          confirmPassword: expect.any(String),
        })
      );
    });
  });

  // Test 3.3: Invalid email error display
  describe('Invalid Email', () => {
    it('should display error message for invalid email', () => {
      const mockOnChange = vi.fn();
      const invalidData = generateInvalidAccountData('email');
      const errors = {
        email: 'รูปแบบอีเมลไม่ถูกต้อง',
      };

      render(
        <AccountCreationForm
          value={invalidData}
          onChange={mockOnChange}
          errors={errors}
        />
      );

      // Verify error message is displayed
      expect(screen.getByText(/รูปแบบอีเมลไม่ถูกต้อง/i)).toBeInTheDocument();

      // Verify email input has error styling
      const emailInput = screen.getByLabelText(/อีเมล/i);
      expect(emailInput).toHaveClass('border-red-500');
    });

    it('should display error for empty email', () => {
      const mockOnChange = vi.fn();
      const value = {
        email: '',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      };
      const errors = {
        email: 'กรุณากรอกอีเมล',
      };

      render(
        <AccountCreationForm
          value={value}
          onChange={mockOnChange}
          errors={errors}
        />
      );

      expect(screen.getByText(/กรุณากรอกอีเมล/i)).toBeInTheDocument();
    });
  });

  // Test 3.4: Password mismatch error
  describe('Password Mismatch', () => {
    it('should display error when passwords do not match', () => {
      const mockOnChange = vi.fn();
      const mismatchData = generateInvalidAccountData('mismatch');
      const errors = {
        confirmPassword: 'รหัสผ่านไม่ตรงกัน',
      };

      render(
        <AccountCreationForm
          value={mismatchData}
          onChange={mockOnChange}
          errors={errors}
        />
      );

      // Verify mismatch error is displayed
      expect(screen.getByText(/รหัสผ่านไม่ตรงกัน/i)).toBeInTheDocument();

      // Verify confirm password input has error styling
      const confirmPasswordInput = screen.getByLabelText(/ยืนยันรหัสผ่าน/i);
      expect(confirmPasswordInput).toHaveClass('border-red-500');
    });

    it('should display error for weak password', () => {
      const mockOnChange = vi.fn();
      const weakPasswordData = generateInvalidAccountData('password');
      const errors = {
        password: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
      };

      render(
        <AccountCreationForm
          value={weakPasswordData}
          onChange={mockOnChange}
          errors={errors}
        />
      );

      // Check for the error message specifically (red text, not gray help text)
      const errorElements = screen.getAllByText(/รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร/i);
      const redError = errorElements.find(el => el.className.includes('text-red'));
      expect(redError).toBeInTheDocument();
    });
  });

  // Additional tests for password visibility toggle
  describe('Password Visibility', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const value = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      render(
        <AccountCreationForm
          value={value}
          onChange={mockOnChange}
          errors={{}}
        />
      );

      const passwordInput = screen.getByLabelText(/^รหัสผ่าน/i);
      
      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Find and click the eye icon button for password field
      const toggleButtons = screen.getAllByRole('button', { name: '' });
      await user.click(toggleButtons[0]);

      // Password should now be visible
      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    it('should toggle confirm password visibility', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const value = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      render(
        <AccountCreationForm
          value={value}
          onChange={mockOnChange}
          errors={{}}
        />
      );

      const confirmPasswordInput = screen.getByLabelText(/ยืนยันรหัสผ่าน/i);
      
      // Initially confirm password should be hidden
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      // Find and click the eye icon button for confirm password field
      const toggleButtons = screen.getAllByRole('button', { name: '' });
      await user.click(toggleButtons[1]);

      // Confirm password should now be visible
      expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    });
  });

  // Test for informational content
  describe('Informational Content', () => {
    it('should display welcome message', () => {
      const mockOnChange = vi.fn();
      const value = {
        email: '',
        password: '',
        confirmPassword: '',
      };

      render(
        <AccountCreationForm
          value={value}
          onChange={mockOnChange}
          errors={{}}
        />
      );

      expect(screen.getByText(/ยินดีต้อนรับสู่ระบบจัดการสโมสรกีฬา/i)).toBeInTheDocument();
    });

    it('should display next steps information', () => {
      const mockOnChange = vi.fn();
      const value = {
        email: '',
        password: '',
        confirmPassword: '',
      };

      render(
        <AccountCreationForm
          value={value}
          onChange={mockOnChange}
          errors={{}}
        />
      );

      expect(screen.getByText(/ขั้นตอนต่อไป/i)).toBeInTheDocument();
      expect(screen.getByText(/กรอกข้อมูลส่วนตัว/i)).toBeInTheDocument();
      expect(screen.getByText(/อัปโหลดเอกสารประกอบ/i)).toBeInTheDocument();
      expect(screen.getByText(/เลือกกีฬาที่ต้องการสมัคร/i)).toBeInTheDocument();
    });
  });
});
