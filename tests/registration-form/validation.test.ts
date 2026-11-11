/**
 * Validation Unit Tests
 * 
 * Tests for validation functions used in the registration form.
 * Covers email, password, phone number, file validation, and schemas.
 */

import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from '@/lib/auth/validation';
import {
  isValidPhoneNumber,
  validateFile,
  personalInfoSchema,
  applicationSubmissionSchema,
  fileValidationSchema,
} from '@/lib/membership/validation';
import { generateValidFile, generateInvalidFile } from './test-utils';

// ============================================================================
// 2.1 Email Validation Tests
// ============================================================================

describe('Email Validation', () => {
  describe('Valid email formats', () => {
    it('should accept standard email format', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept email with numbers', () => {
      const result = validateEmail('user123@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept email with dots in local part', () => {
      const result = validateEmail('first.last@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept email with plus sign', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid email formats', () => {
    it('should reject email without @', () => {
      const result = validateEmail('testexample.com');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject email without domain', () => {
      const result = validateEmail('test@');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject email without local part', () => {
      const result = validateEmail('@example.com');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject email without TLD', () => {
      const result = validateEmail('test@example');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject email with spaces', () => {
      const result = validateEmail('test @example.com');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject email with multiple @ symbols', () => {
      const result = validateEmail('test@@example.com');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should reject empty string', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle very long email', () => {
      const longEmail = 'a'.repeat(100) + '@example.com';
      const result = validateEmail(longEmail);
      // Should still validate based on format, not length
      expect(result.isValid).toBe(true);
    });

    it('should reject email with only whitespace', () => {
      const result = validateEmail('   ');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// 2.2 Password Validation Tests
// ============================================================================

describe('Password Validation', () => {
  describe('Valid passwords', () => {
    it('should accept password meeting all requirements', () => {
      const result = validatePassword('ValidPass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept password with special characters', () => {
      const result = validatePassword('ValidPass123!@#');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept minimum length password with requirements', () => {
      const result = validatePassword('Pass123a');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept very long password', () => {
      const result = validatePassword('ValidPassword123' + 'a'.repeat(100));
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid passwords - failing each requirement', () => {
    it('should reject password shorter than minimum length', () => {
      const result = validatePassword('Pass1');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('8'))).toBe(true);
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePassword('password123');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('พิมพ์ใหญ่'))).toBe(true);
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePassword('PASSWORD123');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('พิมพ์เล็ก'))).toBe(true);
    });

    it('should reject password without number', () => {
      const result = validatePassword('PasswordOnly');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('ตัวเลข'))).toBe(true);
    });

    it('should reject password failing multiple requirements', () => {
      const result = validatePassword('pass');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Edge cases', () => {
    it('should reject empty string', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject password with only whitespace', () => {
      const result = validatePassword('        ');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle password with unicode characters', () => {
      const result = validatePassword('ValidPass123ไทย');
      expect(result.isValid).toBe(true);
    });
  });
});

// ============================================================================
// 2.3 Phone Number Validation Tests
// ============================================================================

describe('Phone Number Validation', () => {
  describe('Valid phone formats', () => {
    it('should accept valid format 0XX-XXX-XXXX', () => {
      expect(isValidPhoneNumber('081-234-5678')).toBe(true);
    });

    it('should accept different area codes', () => {
      expect(isValidPhoneNumber('089-999-9999')).toBe(true);
      expect(isValidPhoneNumber('062-123-4567')).toBe(true);
      expect(isValidPhoneNumber('098-765-4321')).toBe(true);
    });
  });

  describe('Invalid phone formats', () => {
    it('should reject phone without dashes', () => {
      expect(isValidPhoneNumber('0812345678')).toBe(false);
    });

    it('should reject phone with wrong dash positions', () => {
      expect(isValidPhoneNumber('0812-34-5678')).toBe(false);
      expect(isValidPhoneNumber('08-1234-5678')).toBe(false);
    });

    it('should reject phone with wrong length', () => {
      expect(isValidPhoneNumber('081-234-567')).toBe(false);
      expect(isValidPhoneNumber('081-234-56789')).toBe(false);
    });

    it('should reject phone not starting with 0', () => {
      expect(isValidPhoneNumber('181-234-5678')).toBe(false);
    });

    it('should reject phone with letters', () => {
      expect(isValidPhoneNumber('08a-234-5678')).toBe(false);
    });

    it('should reject international format', () => {
      expect(isValidPhoneNumber('+66812345678')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should reject empty string', () => {
      expect(isValidPhoneNumber('')).toBe(false);
    });

    it('should reject phone with spaces instead of dashes', () => {
      expect(isValidPhoneNumber('081 234 5678')).toBe(false);
    });

    it('should reject phone with special characters', () => {
      expect(isValidPhoneNumber('081@234#5678')).toBe(false);
    });
  });
});

// ============================================================================
// 2.4 File Validation Tests
// ============================================================================

describe('File Validation', () => {
  describe('Valid file types', () => {
    it('should accept JPEG file', () => {
      const file = generateValidFile({ type: 'image/jpeg', name: 'test.jpg' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept PNG file', () => {
      const file = generateValidFile({ type: 'image/png', name: 'test.png' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept PDF file', () => {
      const file = generateValidFile({ type: 'application/pdf', name: 'test.pdf' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Invalid file types', () => {
    it('should reject GIF file', () => {
      const file = generateValidFile({ type: 'image/gif', name: 'test.gif' });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject DOCX file', () => {
      const file = generateValidFile({ 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        name: 'test.docx'
      });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject TXT file', () => {
      const file = generateInvalidFile('wrong_type');
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('File size limits', () => {
    it('should accept file under 5MB', () => {
      const file = generateValidFile({ size: 1024 * 1024 }); // 1MB
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept file exactly 5MB', () => {
      const file = generateValidFile({ size: 5 * 1024 * 1024 }); // 5MB
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject file over 5MB', () => {
      const file = generateInvalidFile('too_large');
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5MB');
    });
  });

  describe('Edge cases', () => {
    it('should handle very small valid file', () => {
      const file = generateValidFile({ size: 100 }); // 100 bytes
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should handle 1 byte file', () => {
      const file = generateValidFile({ size: 1 });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// 2.5 Personal Info Schema Tests
// ============================================================================

describe('Personal Info Schema Validation', () => {
  describe('Valid personal information', () => {
    it('should accept complete valid personal info', () => {
      const data = {
        full_name: 'ทดสอบ ทดสอบ',
        phone_number: '081-234-5678',
        address: 'ที่อยู่ทดสอบ 123 ถนนทดสอบ เขตทดสอบ กรุงเทพฯ 10100',
        emergency_contact: '089-999-9999',
      };

      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept personal info with optional fields', () => {
      const data = {
        full_name: 'ทดสอบ ทดสอบ',
        phone_number: '081-234-5678',
        address: 'ที่อยู่ทดสอบ 123 ถนนทดสอบ เขตทดสอบ กรุงเทพฯ 10100',
        emergency_contact: '089-999-9999',
        date_of_birth: '2000-01-01',
        blood_type: 'A',
        medical_conditions: 'ไม่มี',
      };

      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept minimum length name', () => {
      const data = {
        full_name: 'AB',
        phone_number: '081-234-5678',
        address: 'ที่อยู่ทดสอบ 123',
        emergency_contact: '089-999-9999',
      };

      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Missing required fields', () => {
    it('should reject missing full_name', () => {
      const data = {
        phone_number: '081-234-5678',
        address: 'ที่อยู่ทดสอบ 123 ถนนทดสอบ',
        emergency_contact: '089-999-9999',
      };

      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject missing phone_number', () => {
      const data = {
        full_name: 'ทดสอบ ทดสอบ',
        address: 'ที่อยู่ทดสอบ 123 ถนนทดสอบ',
        emergency_contact: '089-999-9999',
      };

      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject missing address', () => {
      const data = {
        full_name: 'ทดสอบ ทดสอบ',
        phone_number: '081-234-5678',
        emergency_contact: '089-999-9999',
      };

      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject missing emergency_contact', () => {
      const data = {
        full_name: 'ทดสอบ ทดสอบ',
        phone_number: '081-234-5678',
        address: 'ที่อยู่ทดสอบ 123 ถนนทดสอบ',
      };

      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid field values', () => {
    it('should reject name that is too short', () => {
      const data = {
        full_name: 'A',
        phone_number: '081-234-5678',
        address: 'ที่อยู่ทดสอบ 123 ถนนทดสอบ',
        emergency_contact: '089-999-9999',
      };

      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject name that is too long', () => {
      const data = {
        full_name: 'A'.repeat(101),
        phone_number: '081-234-5678',
        address: 'ที่อยู่ทดสอบ 123 ถนนทดสอบ',
        emergency_contact: '089-999-9999',
      };

      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid phone format', () => {
      const data = {
        full_name: 'ทดสอบ ทดสอบ',
        phone_number: '1234567890',
        address: 'ที่อยู่ทดสอบ 123 ถนนทดสอบ',
        emergency_contact: '089-999-9999',
      };

      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject address that is too short', () => {
      const data = {
        full_name: 'ทดสอบ ทดสอบ',
        phone_number: '081-234-5678',
        address: 'short',
        emergency_contact: '089-999-9999',
      };

      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject address that is too long', () => {
      const data = {
        full_name: 'ทดสอบ ทดสอบ',
        phone_number: '081-234-5678',
        address: 'A'.repeat(501),
        emergency_contact: '089-999-9999',
      };

      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid emergency contact format', () => {
      const data = {
        full_name: 'ทดสอบ ทดสอบ',
        phone_number: '081-234-5678',
        address: 'ที่อยู่ทดสอบ 123 ถนนทดสอบ',
        emergency_contact: 'invalid',
      };

      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// 2.6 Application Submission Schema Tests
// ============================================================================

describe('Application Submission Schema Validation', () => {
  const validPersonalInfo = {
    full_name: 'ทดสอบ ทดสอบ',
    phone_number: '081-234-5678',
    address: 'ที่อยู่ทดสอบ 123 ถนนทดสอบ เขตทดสอบ กรุงเทพฯ 10100',
    emergency_contact: '089-999-9999',
  };

  const validDocuments = [
    {
      type: 'id_card' as const,
      url: 'https://example.com/id.jpg',
      uploaded_at: new Date().toISOString(),
      file_name: 'id_card.jpg',
      file_size: 1024 * 1024,
    },
    {
      type: 'house_registration' as const,
      url: 'https://example.com/house.jpg',
      uploaded_at: new Date().toISOString(),
      file_name: 'house_registration.jpg',
      file_size: 1024 * 1024,
    },
    {
      type: 'birth_certificate' as const,
      url: 'https://example.com/birth.jpg',
      uploaded_at: new Date().toISOString(),
      file_name: 'birth_certificate.jpg',
      file_size: 1024 * 1024,
    },
  ];

  describe('Valid application with all documents', () => {
    it('should accept complete application', () => {
      const data = {
        club_id: '123e4567-e89b-12d3-a456-426614174000',
        personal_info: validPersonalInfo,
        documents: validDocuments,
      };

      const result = applicationSubmissionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept application with documents in different order', () => {
      const data = {
        club_id: '123e4567-e89b-12d3-a456-426614174000',
        personal_info: validPersonalInfo,
        documents: [validDocuments[2], validDocuments[0], validDocuments[1]],
      };

      const result = applicationSubmissionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Missing documents', () => {
    it('should reject application with no documents', () => {
      const data = {
        club_id: '123e4567-e89b-12d3-a456-426614174000',
        personal_info: validPersonalInfo,
        documents: [],
      };

      const result = applicationSubmissionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject application with only 1 document', () => {
      const data = {
        club_id: '123e4567-e89b-12d3-a456-426614174000',
        personal_info: validPersonalInfo,
        documents: [validDocuments[0]],
      };

      const result = applicationSubmissionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject application with only 2 documents', () => {
      const data = {
        club_id: '123e4567-e89b-12d3-a456-426614174000',
        personal_info: validPersonalInfo,
        documents: [validDocuments[0], validDocuments[1]],
      };

      const result = applicationSubmissionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject application missing id_card', () => {
      const data = {
        club_id: '123e4567-e89b-12d3-a456-426614174000',
        personal_info: validPersonalInfo,
        documents: [validDocuments[1], validDocuments[2]],
      };

      const result = applicationSubmissionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject application missing house_registration', () => {
      const data = {
        club_id: '123e4567-e89b-12d3-a456-426614174000',
        personal_info: validPersonalInfo,
        documents: [validDocuments[0], validDocuments[2]],
      };

      const result = applicationSubmissionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject application missing birth_certificate', () => {
      const data = {
        club_id: '123e4567-e89b-12d3-a456-426614174000',
        personal_info: validPersonalInfo,
        documents: [validDocuments[0], validDocuments[1]],
      };

      const result = applicationSubmissionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid document combinations', () => {
    it('should reject application with duplicate document types', () => {
      const data = {
        club_id: '123e4567-e89b-12d3-a456-426614174000',
        personal_info: validPersonalInfo,
        documents: [validDocuments[0], validDocuments[0], validDocuments[1]],
      };

      const result = applicationSubmissionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject application with more than 3 documents', () => {
      const data = {
        club_id: '123e4567-e89b-12d3-a456-426614174000',
        personal_info: validPersonalInfo,
        documents: [...validDocuments, validDocuments[0]],
      };

      const result = applicationSubmissionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject application with invalid club_id', () => {
      const data = {
        club_id: 'not-a-uuid',
        personal_info: validPersonalInfo,
        documents: validDocuments,
      };

      const result = applicationSubmissionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject application with invalid document URL', () => {
      const invalidDocs = [
        { ...validDocuments[0], url: 'not-a-url' },
        validDocuments[1],
        validDocuments[2],
      ];

      const data = {
        club_id: '123e4567-e89b-12d3-a456-426614174000',
        personal_info: validPersonalInfo,
        documents: invalidDocs,
      };

      const result = applicationSubmissionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject application with invalid file size', () => {
      const invalidDocs = [
        { ...validDocuments[0], file_size: -1 },
        validDocuments[1],
        validDocuments[2],
      ];

      const data = {
        club_id: '123e4567-e89b-12d3-a456-426614174000',
        personal_info: validPersonalInfo,
        documents: invalidDocs,
      };

      const result = applicationSubmissionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
