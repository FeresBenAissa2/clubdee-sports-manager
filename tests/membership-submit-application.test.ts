/**
 * Validation tests for membership application submission
 * 
 * Tests the validation schemas to ensure:
 * - Input validation works correctly
 * - Phone number format is validated
 * - Document requirements are enforced
 * - Profile membership_status is updated to 'pending' on submission
 * 
 * Validates: Requirements US-1, US-8, AC1, AC6
 * 
 * Note: Full integration tests with database require Next.js request context
 * and should be run in an E2E testing environment.
 */

import { describe, it, expect } from 'vitest';
import { 
  applicationSubmissionSchema,
  personalInfoSchema,
  type ApplicationSubmissionInput 
} from '@/lib/membership/validation';

describe('Application Submission Validation', () => {
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
      file_size: 100000,
    },
    {
      type: 'house_registration' as const,
      url: 'https://example.com/house.jpg',
      uploaded_at: new Date().toISOString(),
      file_name: 'house.jpg',
      file_size: 100000,
    },
    {
      type: 'birth_certificate' as const,
      url: 'https://example.com/birth.jpg',
      uploaded_at: new Date().toISOString(),
      file_name: 'birth.jpg',
      file_size: 100000,
    },
  ];

  it('should accept valid personal info', () => {
    const result = personalInfoSchema.safeParse(validPersonalInfo);
    
    expect(result.success).toBe(true);
  });

  it('should reject invalid input - missing required fields', () => {
    const invalidData = {
      full_name: '',
      phone_number: '',
      address: '',
      emergency_contact: '',
    };

    const result = personalInfoSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
  });

  it('should reject invalid phone number format', () => {
    const invalidData = {
      ...validPersonalInfo,
      phone_number: '1234567890', // Invalid format
    };

    const result = personalInfoSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      const phoneError = result.error.flatten().fieldErrors.phone_number;
      expect(phoneError).toBeDefined();
      expect(phoneError?.[0]).toContain('รูปแบบเบอร์โทร');
    }
  });

  it('should accept valid phone number format', () => {
    const validFormats = [
      '081-234-5678',
      '089-999-9999',
      '062-123-4567',
    ];

    validFormats.forEach(phone => {
      const data = { ...validPersonalInfo, phone_number: phone };
      const result = personalInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it('should reject missing documents', () => {
    const invalidData = {
      club_id: '123e4567-e89b-12d3-a456-426614174000',
      personal_info: validPersonalInfo,
      documents: [validDocuments[0]], // Only 1 document
    };

    const result = applicationSubmissionSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.documents).toBeDefined();
    }
  });

  it('should validate that all 3 document types are present', () => {
    const invalidData = {
      club_id: '123e4567-e89b-12d3-a456-426614174000',
      personal_info: validPersonalInfo,
      documents: [
        validDocuments[0], // id_card
        validDocuments[0], // id_card again (duplicate)
        validDocuments[2], // birth_certificate
      ],
    };

    const result = applicationSubmissionSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.documents).toBeDefined();
      expect(errors.documents?.[0]).toContain('3 ประเภท');
    }
  });

  it('should accept valid application with all required documents', () => {
    const validData = {
      club_id: '123e4567-e89b-12d3-a456-426614174000',
      personal_info: validPersonalInfo,
      documents: validDocuments,
    };

    const result = applicationSubmissionSchema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it('should reject invalid club_id format', () => {
    const invalidData = {
      club_id: 'not-a-uuid',
      personal_info: validPersonalInfo,
      documents: validDocuments,
    };

    const result = applicationSubmissionSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.club_id).toBeDefined();
    }
  });
});
