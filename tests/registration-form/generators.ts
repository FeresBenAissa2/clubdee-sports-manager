/**
 * Test Data Generators for Registration Form Tests
 * 
 * Provides comprehensive test data generation for:
 * - Valid and invalid inputs
 * - Edge cases
 * - Boundary conditions
 * - Random data generation
 */

import * as fc from 'fast-check';

// ============================================================================
// Email Generators
// ============================================================================

/**
 * Generates valid email addresses
 */
export const validEmailArbitrary = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{3,20}$/),
    fc.constantFrom('gmail.com', 'yahoo.com', 'outlook.com', 'example.com', 'test.com')
  )
  .map(([local, domain]) => `${local}@${domain}`);

/**
 * Generates invalid email addresses
 */
export const invalidEmailArbitrary = fc.oneof(
  fc.string().filter((s) => !s.includes('@')), // No @ symbol
  fc.string().map((s) => `${s}@`), // Missing domain
  fc.string().map((s) => `@${s}`), // Missing local part
  fc.constant(''), // Empty string
  fc.constant('not-an-email'), // Plain text
);

/**
 * Common valid email examples
 */
export const validEmails = [
  'test@example.com',
  'user123@gmail.com',
  'athlete@test.com',
  'john.doe@outlook.com',
  'test.user+tag@example.com',
];

/**
 * Common invalid email examples
 */
export const invalidEmails = [
  '', // Empty
  'invalid', // No @
  '@example.com', // No local part
  'test@', // No domain
  'test @example.com', // Space
  'test@.com', // Invalid domain
];

// ============================================================================
// Password Generators
// ============================================================================

/**
 * Generates valid passwords (8+ chars, uppercase, lowercase, number)
 */
export const validPasswordArbitrary = fc
  .tuple(
    fc.stringMatching(/^[A-Z][a-z]{5,15}$/), // Starts with uppercase
    fc.integer({ min: 0, max: 999 }), // Number
    fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*') // Special char (optional)
  )
  .map(([base, num, special]) => `${base}${num}${special}`);

/**
 * Generates invalid passwords
 */
export const invalidPasswordArbitrary = fc.oneof(
  fc.constant(''), // Empty
  fc.constant('short'), // Too short
  fc.constant('alllowercase123'), // No uppercase
  fc.constant('ALLUPPERCASE123'), // No lowercase
  fc.constant('NoNumbers'), // No numbers
);

/**
 * Common valid password examples
 */
export const validPasswords = [
  'ValidPass123!',
  'SecurePassword1',
  'MyPass2024@',
  'TestUser123',
  'Athlete2024!',
];

/**
 * Common invalid password examples
 */
export const invalidPasswords = [
  '', // Empty
  'short', // Too short
  'nouppercase123', // No uppercase
  'NOLOWERCASE123', // No lowercase
  'NoNumbers', // No numbers
  '1234567', // Only numbers
];

// ============================================================================
// Phone Number Generators
// ============================================================================

/**
 * Generates valid Thai phone numbers (0XX-XXX-XXXX format)
 */
export const validPhoneArbitrary = fc
  .tuple(
    fc.constantFrom('08', '09', '06', '02'), // Valid prefixes
    fc.integer({ min: 0, max: 9 }), // Third digit
    fc.integer({ min: 100, max: 999 }), // Middle part
    fc.integer({ min: 1000, max: 9999 }) // Last part
  )
  .map(([prefix, third, middle, last]) => `${prefix}${third}-${middle}-${last}`);

/**
 * Generates invalid phone numbers
 */
export const invalidPhoneArbitrary = fc.oneof(
  fc.constant(''), // Empty
  fc.constant('1234567890'), // No dashes
  fc.constant('081-234-567'), // Too short
  fc.constant('081-234-56789'), // Too long
  fc.constant('181-234-5678'), // Invalid prefix
  fc.string().filter((s) => !/^\d{3}-\d{3}-\d{4}$/.test(s)), // Random invalid
);

/**
 * Common valid phone number examples
 */
export const validPhoneNumbers = [
  '081-234-5678',
  '089-999-9999',
  '062-123-4567',
  '091-555-1234',
  '080-000-0000',
];

/**
 * Common invalid phone number examples
 */
export const invalidPhoneNumbers = [
  '', // Empty
  '1234567890', // No dashes
  '081-234-567', // Too short
  '181-234-5678', // Invalid prefix
  'abc-def-ghij', // Letters
  '081 234 5678', // Spaces instead of dashes
];

// ============================================================================
// Name Generators
// ============================================================================

/**
 * Generates valid Thai names
 */
export const validThaiNameArbitrary = fc
  .tuple(
    fc.stringMatching(/^[ก-๙]{2,20}$/), // Thai first name
    fc.stringMatching(/^[ก-๙]{2,20}$/) // Thai last name
  )
  .map(([first, last]) => `${first} ${last}`);

/**
 * Generates valid English names
 */
export const validEnglishNameArbitrary = fc
  .tuple(
    fc.stringMatching(/^[A-Z][a-z]{2,15}$/), // English first name
    fc.stringMatching(/^[A-Z][a-z]{2,15}$/) // English last name
  )
  .map(([first, last]) => `${first} ${last}`);

/**
 * Common valid name examples
 */
export const validNames = [
  'ทดสอบ ทดสอบ',
  'สมชาย ใจดี',
  'สมหญิง รักษ์ดี',
  'John Doe',
  'Jane Smith',
];

/**
 * Common invalid name examples
 */
export const invalidNames = [
  '', // Empty
  ' ', // Only space
  'A', // Too short
];

// ============================================================================
// Address Generators
// ============================================================================

/**
 * Generates valid Thai addresses
 */
export const validAddressArbitrary = fc
  .tuple(
    fc.integer({ min: 1, max: 999 }), // House number
    fc.stringMatching(/^[ก-๙]{3,20}$/), // Street
    fc.stringMatching(/^[ก-๙]{3,20}$/), // District
    fc.stringMatching(/^[ก-๙]{3,20}$/), // Province
    fc.integer({ min: 10000, max: 99999 }) // Postal code
  )
  .map(([num, street, district, province, postal]) => 
    `${num} ถนน${street} เขต${district} จังหวัด${province} ${postal}`
  );

/**
 * Common valid address examples
 */
export const validAddresses = [
  'ที่อยู่ทดสอบ 123 ถนนทดสอบ เขตทดสอบ กรุงเทพฯ 10100',
  '456 ถนนสุขุมวิท เขตคลองเตย กรุงเทพฯ 10110',
  '789 ถนนพระราม 4 เขตปทุมวัน กรุงเทพฯ 10330',
];

/**
 * Common invalid address examples
 */
export const invalidAddresses = [
  '', // Empty
  ' ', // Only space
  'A', // Too short
];

// ============================================================================
// Document Generators
// ============================================================================

/**
 * Generates valid document data
 */
export function generateDocumentData(type: 'id_card' | 'house_registration' | 'birth_certificate') {
  return {
    type,
    url: `https://example.com/${type}-${Date.now()}.jpg`,
    uploaded_at: new Date().toISOString(),
    file_name: `${type}.jpg`,
    file_size: Math.floor(Math.random() * 4 * 1024 * 1024) + 100000, // 100KB - 4MB
  };
}

/**
 * Generates all three required documents
 */
export function generateAllDocuments() {
  return [
    generateDocumentData('id_card'),
    generateDocumentData('house_registration'),
    generateDocumentData('birth_certificate'),
  ];
}

// ============================================================================
// File Generators
// ============================================================================

/**
 * Valid file types for document upload
 */
export const validFileTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];

/**
 * Invalid file types
 */
export const invalidFileTypes = [
  'text/plain',
  'application/msword',
  'image/gif',
  'video/mp4',
  'application/zip',
];

/**
 * Generates a mock File object
 */
export function generateMockFile(options: {
  name?: string;
  type?: string;
  size?: number;
  content?: string;
} = {}) {
  const {
    name = 'test-document.jpg',
    type = 'image/jpeg',
    size = 1024 * 1024, // 1MB
    content = 'mock file content',
  } = options;

  // Create a blob with the specified size
  const blob = new Blob([content.padEnd(size, ' ')], { type });
  return new File([blob], name, { type, lastModified: Date.now() });
}

/**
 * Generates valid file examples
 */
export function generateValidFiles() {
  return [
    generateMockFile({ name: 'id_card.jpg', type: 'image/jpeg' }),
    generateMockFile({ name: 'house_registration.png', type: 'image/png' }),
    generateMockFile({ name: 'birth_certificate.pdf', type: 'application/pdf' }),
  ];
}

/**
 * Generates invalid file examples
 */
export function generateInvalidFiles() {
  return [
    generateMockFile({ name: 'document.txt', type: 'text/plain' }), // Wrong type
    generateMockFile({ name: 'document.jpg', size: 6 * 1024 * 1024 }), // Too large (6MB)
    generateMockFile({ name: 'document.jpg', size: 0 }), // Empty file
  ];
}

// ============================================================================
// Complete Form Data Generators
// ============================================================================

/**
 * Generates complete valid form data
 */
export function generateCompleteValidFormData() {
  return {
    account: {
      email: 'test@example.com',
      password: 'ValidPass123!',
      confirmPassword: 'ValidPass123!',
    },
    personalInfo: {
      full_name: 'ทดสอบ ทดสอบ',
      phone_number: '081-234-5678',
      address: 'ที่อยู่ทดสอบ 123 ถนนทดสอบ เขตทดสอบ กรุงเทพฯ 10100',
      emergency_contact: '089-999-9999',
      date_of_birth: '',
      blood_type: '',
      medical_conditions: '',
    },
    documents: {
      id_card: {
        url: 'https://example.com/id_card.jpg',
        file_name: 'id_card.jpg',
        file_size: 1024 * 1024,
      },
      house_registration: {
        url: 'https://example.com/house_registration.jpg',
        file_name: 'house_registration.jpg',
        file_size: 1024 * 1024,
      },
      birth_certificate: {
        url: 'https://example.com/birth_certificate.jpg',
        file_name: 'birth_certificate.jpg',
        file_size: 1024 * 1024,
      },
    },
    clubId: '123e4567-e89b-12d3-a456-426614174000',
  };
}

/**
 * Property-based arbitrary for complete form data
 */
export const completeFormDataArbitrary = fc.record({
  account: fc.record({
    email: validEmailArbitrary,
    password: validPasswordArbitrary,
    confirmPassword: validPasswordArbitrary,
  }),
  personalInfo: fc.record({
    full_name: fc.oneof(validThaiNameArbitrary, validEnglishNameArbitrary),
    phone_number: validPhoneArbitrary,
    address: validAddressArbitrary,
    emergency_contact: validPhoneArbitrary,
    date_of_birth: fc.constant(''),
    blood_type: fc.constant(''),
    medical_conditions: fc.constant(''),
  }),
  clubId: fc.uuid(),
});

// ============================================================================
// Edge Cases
// ============================================================================

/**
 * Edge case test data
 */
export const edgeCases = {
  emptyStrings: {
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone_number: '',
    address: '',
    emergency_contact: '',
  },
  whitespaceOnly: {
    email: '   ',
    password: '   ',
    full_name: '   ',
    address: '   ',
  },
  veryLongStrings: {
    email: 'a'.repeat(100) + '@example.com',
    password: 'ValidPass123!' + 'a'.repeat(100),
    full_name: 'ทดสอบ'.repeat(50),
    address: 'ที่อยู่ทดสอบ'.repeat(100),
  },
  specialCharacters: {
    email: 'test+tag@example.com',
    full_name: 'Test-Name O\'Brien',
    address: '123/456 ถนนทดสอบ (ซอย 1) เขตทดสอบ',
  },
};
