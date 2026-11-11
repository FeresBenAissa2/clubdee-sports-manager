import { z } from 'zod';
import { sanitizeInput, sanitizePhoneNumber } from '../utils/sanitization';

const phoneRegex = /^\+?[0-9][0-9\s\-()]{6,18}[0-9]$/;

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export const personalInfoSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be at most 100 characters')
    .transform((val) => sanitizeInput(val)),
  nickname: z.string().optional().transform((val) => (val ? sanitizeInput(val) : val)),
  gender: z
    .enum(['male', 'female', 'other'])
    .refine((val) => ['male', 'female', 'other'].includes(val), {
      message: 'Please select a gender',
    }),
  date_of_birth: z
    .string()
    .min(1, 'Please select a date of birth')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 5 && age <= 100;
    }, 'Age must be between 5 and 100'),
  phone_number: z
    .string()
    .regex(phoneRegex, 'Enter a valid phone number (e.g. +216 12 345 678)')
    .transform((val) => normalizePhone(sanitizePhoneNumber(val))),
  address: z
    .string()
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address must be at most 500 characters')
    .transform((val) => sanitizeInput(val)),
  emergency_contact: z
    .string()
    .regex(phoneRegex, 'Enter a valid emergency phone number')
    .transform((val) => normalizePhone(sanitizePhoneNumber(val))),
  blood_type: z.string().optional().transform((val) => (val ? sanitizeInput(val) : val)),
  medical_conditions: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeInput(val) : val)),
});

export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;

export const documentTypeSchema = z.enum([
  'id_card',
  'house_registration',
  'birth_certificate',
]);

export const documentEntrySchema = z.object({
  type: documentTypeSchema,
  url: z.string().url('Invalid URL'),
  uploaded_at: z.string(),
  file_name: z.string(),
  file_size: z.number().positive('File size must be greater than 0'),
  is_verified: z.boolean().optional(),
});

export const fileValidationSchema = z.object({
  name: z.string(),
  size: z.number().max(5 * 1024 * 1024, 'File size must be 5MB or less'),
  type: z
    .string()
    .refine(
      (type) => ['image/jpeg', 'image/png', 'application/pdf'].includes(type),
      'File type must be JPG, PNG, or PDF'
    ),
});

// Demo seed IDs like 00000000-0000-0000-0000-000000000001 are valid Postgres UUIDs
// but fail Zod's strict RFC uuid() (version/variant bits). Accept UUID-shaped strings.
const uuidLike = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid club ID'
  );

// Documents optional for school project
export const applicationSubmissionSchema = z.object({
  club_id: uuidLike,
  personal_info: personalInfoSchema,
  documents: z.array(documentEntrySchema).default([]),
});

export type ApplicationSubmissionInput = z.infer<typeof applicationSubmissionSchema>;

export const reviewApplicationSchema = z.object({
  application_id: uuidLike,
  action: z.enum(['approve', 'reject', 'request_info']),
  notes: z.string().optional(),
  requested_changes: z.array(z.string()).optional(),
});

export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;

export function isValidPhoneNumber(phone: string): boolean {
  return phoneRegex.test(phone);
}

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+\s\-()]/g, '').slice(0, 20);
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  try {
    fileValidationSchema.parse({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.issues[0]?.message || 'Invalid file' };
    }
    return { valid: false, error: 'File validation failed' };
  }
}

export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  id_card: 'Athlete ID card',
  house_registration: 'Athlete house registration',
  birth_certificate: 'Birth certificate',
  parent_id_card: 'Parent / guardian ID card',
  parent_house_registration: 'Parent / guardian house registration',
};
