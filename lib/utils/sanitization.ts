/**
 * Sanitization utilities to prevent XSS attacks and ensure data safety
 * Requirement 9.2: Input validation and sanitization
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes potentially dangerous HTML tags and attributes
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove object and embed tags
  sanitized = sanitized.replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');

  // Remove style tags (can contain javascript)
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  return sanitized.trim();
}

/**
 * Sanitize plain text input
 * Escapes HTML special characters to prevent XSS
 */
export function sanitizeText(input: string): string {
  if (!input) return '';

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Sanitize user input for database storage
 * Trims whitespace and removes null bytes
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Remove multiple consecutive spaces
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Sanitize SQL input to prevent SQL injection
 * Note: This is a basic sanitization. Always use parameterized queries!
 */
export function sanitizeSqlInput(input: string): string {
  if (!input) return '';

  // Remove SQL comment markers
  let sanitized = input.replace(/--/g, '');
  sanitized = sanitized.replace(/\/\*/g, '');
  sanitized = sanitized.replace(/\*\//g, '');

  // Remove semicolons (statement terminators)
  sanitized = sanitized.replace(/;/g, '');

  // Remove common SQL keywords that shouldn't be in user input
  const dangerousPatterns = [
    /\bDROP\b/gi,
    /\bDELETE\b/gi,
    /\bTRUNCATE\b/gi,
    /\bEXEC\b/gi,
    /\bEXECUTE\b/gi,
    /\bUNION\b/gi,
    /\bINSERT\b/gi,
    /\bUPDATE\b/gi,
  ];

  dangerousPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized.trim();
}

/**
 * Sanitize file name to prevent directory traversal attacks
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';

  // Remove path separators
  let sanitized = fileName.replace(/[/\\]/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove special characters that could cause issues
  sanitized = sanitized.replace(/[<>:"|?*]/g, '');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    const name = sanitized.substring(0, 255 - ext.length - 1);
    sanitized = `${name}.${ext}`;
  }

  return sanitized;
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '';
    }
  }

  // Only allow http, https, and relative URLs
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('/')
  ) {
    return '';
  }

  return url.trim();
}

/**
 * Sanitize phone number - remove all non-digit characters except +
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // Keep only digits and leading +
  let sanitized = phone.replace(/[^\d+]/g, '');

  // Ensure + is only at the start
  if (sanitized.includes('+')) {
    const hasLeadingPlus = sanitized.startsWith('+');
    sanitized = sanitized.replace(/\+/g, '');
    if (hasLeadingPlus) {
      sanitized = '+' + sanitized;
    }
  }

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  // Convert to lowercase and trim
  let sanitized = email.toLowerCase().trim();

  // Remove any whitespace
  sanitized = sanitized.replace(/\s/g, '');

  // Basic validation - must contain @ and domain
  if (!sanitized.includes('@') || !sanitized.includes('.')) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: string | number): number | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  const num = typeof input === 'string' ? parseFloat(input) : input;

  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  return num;
}

/**
 * Sanitize date input
 */
export function sanitizeDate(dateString: string): string | null {
  if (!dateString) return null;

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return null;
  }

  // Return ISO format
  return date.toISOString().split('T')[0];
}

/**
 * Sanitize object by applying sanitization to all string properties
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    sanitizeHtml?: boolean;
    sanitizeText?: boolean;
  } = {}
): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      if (options.sanitizeHtml) {
        sanitized[key] = sanitizeHtml(sanitized[key]) as any;
      } else if (options.sanitizeText) {
        sanitized[key] = sanitizeText(sanitized[key]) as any;
      } else {
        sanitized[key] = sanitizeInput(sanitized[key]) as any;
      }
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key], options);
    }
  }

  return sanitized;
}
