/**
 * File upload validation utilities
 * Requirement 9.2: File upload validation (type, size, content)
 */

import { sanitizeFileName } from './sanitization';

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedFileName?: string;
}

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
  checkMagicNumbers?: boolean;
}

// Default file size limits (5MB for images, 10MB for PDFs)
export const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const PDF_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed MIME types for membership documents
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
export const ALLOWED_MEMBERSHIP_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// File extensions
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf'];
export const ALLOWED_MEMBERSHIP_EXTENSIONS = [
  ...ALLOWED_IMAGE_EXTENSIONS,
  ...ALLOWED_DOCUMENT_EXTENSIONS,
];

// Magic numbers (file signatures) for validation
const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [
    [0xff, 0xd8, 0xff], // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
  ],
  'application/pdf': [
    [0x25, 0x50, 0x44, 0x46], // PDF (%PDF)
  ],
};

/**
 * Validate file upload
 */
export async function validateFile(
  file: File,
  options: FileValidationOptions = {}
): Promise<FileValidationResult> {
  const errors: string[] = [];

  const {
    maxSize = DEFAULT_MAX_FILE_SIZE,
    allowedTypes = ALLOWED_MEMBERSHIP_TYPES,
    allowedExtensions = ALLOWED_MEMBERSHIP_EXTENSIONS,
    checkMagicNumbers = true,
  } = options;

  // Validate file exists
  if (!file) {
    errors.push('File not found');
    return { isValid: false, errors };
  }

  // Validate file name
  const sanitizedFileName = sanitizeFileName(file.name);
  if (!sanitizedFileName) {
    errors.push('Invalid file name');
    return { isValid: false, errors };
  }

  // Validate file size
  if (file.size === 0) {
    errors.push('Empty file');
  } else if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    errors.push(`File size must not exceed ${maxSizeMB} MB`);
  }

  // Validate MIME type
  if (!allowedTypes.includes(file.type)) {
    errors.push(
      `Invalid file type (allowed: ${allowedTypes.join(', ')})`
    );
  }

  // Validate file extension
  const extension = getFileExtension(file.name);
  if (!allowedExtensions.includes(extension)) {
    errors.push(
      `Invalid file extension (allowed: ${allowedExtensions.join(', ')})`
    );
  }

  // Validate magic numbers (file signature)
  if (checkMagicNumbers && errors.length === 0) {
    const isValidSignature = await validateFileSignature(file);
    if (!isValidSignature) {
      errors.push('File may be corrupt or not the specified type');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedFileName,
  };
}

/**
 * Validate file signature (magic numbers)
 */
async function validateFileSignature(file: File): Promise<boolean> {
  try {
    const signatures = FILE_SIGNATURES[file.type];
    if (!signatures) {
      // If we don't have signature data for this type, skip validation
      return true;
    }

    // Read first 8 bytes of file
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check if file starts with any of the valid signatures
    return signatures.some((signature) => {
      return signature.every((byte, index) => bytes[index] === byte);
    });
  } catch (error) {
    console.error('Error validating file signature:', error);
    return false;
  }
}

/**
 * Get file extension from filename
 */
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot).toLowerCase();
}

/**
 * Validate image dimensions
 */
export async function validateImageDimensions(
  file: File,
  options: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<FileValidationResult> {
  const errors: string[] = [];

  if (!file.type.startsWith('image/')) {
    errors.push('File is not an image');
    return { isValid: false, errors };
  }

  try {
    const dimensions = await getImageDimensions(file);

    if (options.minWidth && dimensions.width < options.minWidth) {
      errors.push(`Image width must be at least ${options.minWidth} pixels`);
    }

    if (options.minHeight && dimensions.height < options.minHeight) {
      errors.push(`Image height must be at least ${options.minHeight} pixels`);
    }

    if (options.maxWidth && dimensions.width > options.maxWidth) {
      errors.push(`Image width must not exceed ${options.maxWidth} pixels`);
    }

    if (options.maxHeight && dimensions.height > options.maxHeight) {
      errors.push(`Image height must not exceed ${options.maxHeight} pixels`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    errors.push('Cannot read image data');
    return { isValid: false, errors };
  }
}

/**
 * Get image dimensions
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Validate multiple files
 */
export async function validateFiles(
  files: File[],
  options: FileValidationOptions = {}
): Promise<{
  isValid: boolean;
  results: Array<FileValidationResult & { fileName: string }>;
}> {
  const results = await Promise.all(
    files.map(async (file) => ({
      fileName: file.name,
      ...(await validateFile(file, options)),
    }))
  );

  const isValid = results.every((result) => result.isValid);

  return { isValid, results };
}

/**
 * Validate file count
 */
export function validateFileCount(
  files: File[],
  min: number,
  max: number
): FileValidationResult {
  const errors: string[] = [];

  if (files.length < min) {
    errors.push(`You must upload at least ${min} files`);
  }

  if (files.length > max) {
    errors.push(`You can upload up to ${max} files`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate total file size
 */
export function validateTotalFileSize(
  files: File[],
  maxTotalSize: number
): FileValidationResult {
  const errors: string[] = [];
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > maxTotalSize) {
    const maxSizeMB = (maxTotalSize / (1024 * 1024)).toFixed(2);
    const currentSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    errors.push(
      `Total file size (${currentSizeMB} MB) exceeds the ${maxSizeMB} MB limit`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
}

/**
 * Check if file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
