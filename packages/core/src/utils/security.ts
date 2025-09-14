/**
 * Security utilities for Universal Search Component
 * @description XSS prevention, SQL injection protection, and input sanitization
 */

/**
 * XSS protection patterns
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /style\s*=/gi,
  /%3c/gi, // URL encoded <
  /%3e/gi, // URL encoded >
  /&lt;script/gi,
  /&lt;\/script&gt;/gi,
  /vbscript:/gi,
  /data:text\/html/gi
];

/**
 * SQL injection protection patterns
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(;|\||&|\$|\+|--|\/\*|\*\/|xp_|sp_)/gi,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  /(\b(OR|AND)\s+['"]\w+['"]?\s*=\s*['"]\w+['"]?)/gi,
  /'(\s|%20)*(or|and)(\s|%20)*'/gi,
  /"(\s|%20)*(or|and)(\s|%20)*"/gi,
  /(\bunion\s+(all\s+)?select)/gi
];

/**
 * Sanitizes query string to prevent XSS attacks
 */
export function sanitizeForXSS(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }

  let sanitized = query;
  
  // Remove XSS patterns
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // HTML encode dangerous characters
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Sanitizes query string to prevent SQL injection attacks
 */
export function sanitizeForSQLInjection(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }

  let sanitized = query;
  
  // Remove SQL injection patterns
  SQL_INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Escape single quotes
  sanitized = sanitized.replace(/'/g, "''");

  return sanitized;
}

/**
 * Comprehensive input sanitization
 */
export function sanitizeInput(query: string, options: {
  xssProtection?: boolean;
  sqlInjectionProtection?: boolean;
} = {}): string {
  if (typeof query !== 'string') {
    return '';
  }

  const { xssProtection = true, sqlInjectionProtection = true } = options;

  let sanitized = query;

  if (xssProtection) {
    sanitized = sanitizeForXSS(sanitized);
  }

  if (sqlInjectionProtection) {
    sanitized = sanitizeForSQLInjection(sanitized);
  }

  return sanitized;
}

/**
 * Checks if query contains XSS patterns
 */
export function containsXSS(query: string): boolean {
  if (typeof query !== 'string') {
    return false;
  }

  return XSS_PATTERNS.some(pattern => pattern.test(query));
}

/**
 * Checks if query contains SQL injection patterns
 */
export function containsSQLInjection(query: string): boolean {
  if (typeof query !== 'string') {
    return false;
  }

  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(query));
}

/**
 * Validates query for security threats
 */
export interface SecurityValidationResult {
  isSecure: boolean;
  threats: {
    xss: boolean;
    sqlInjection: boolean;
  };
  sanitized: string;
}

export function validateQuerySecurity(query: string, options: {
  xssProtection?: boolean;
  sqlInjectionProtection?: boolean;
} = {}): SecurityValidationResult {
  const { xssProtection = true, sqlInjectionProtection = true } = options;

  const threats = {
    xss: xssProtection ? containsXSS(query) : false,
    sqlInjection: sqlInjectionProtection ? containsSQLInjection(query) : false
  };

  const isSecure = !threats.xss && !threats.sqlInjection;
  const sanitized = sanitizeInput(query, options);

  return {
    isSecure,
    threats,
    sanitized
  };
}