/**
 * SecureErrorDisplay - Security-safe error message rendering with information disclosure prevention
 * @description Provides secure error message display that prevents sensitive information exposure
 */

import { SecureErrorDisplayConfig, ErrorDisplayResult } from '../types/Rendering';
import { OutputEscaper } from './OutputEscaper';

/**
 * Sensitive information patterns that should be redacted from error messages
 */
const SENSITIVE_PATTERNS = [
  // File paths
  /[A-Za-z]:\\[\w\s\-\\.\\]+/g, // Windows paths
  /\/[\w\s\-\.\/]+/g, // Unix paths (be careful not to match URLs)
  // Database connection strings
  /(?:mongodb|mysql|postgresql|sqlite):\/\/[^\s]+/gi,
  // API keys and tokens
  /(?:api[_-]?key|token|secret)["\s]*[:=]["\s]*[\w\-\.]+/gi,
  // Email addresses in error contexts
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // IP addresses
  /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  // Stack trace file references
  /at\s+[\w\.]+\s+\([^)]+\)/g,
  // SQL error details
  /(?:ORA-\d+|ERROR\s+\d+|SQLSTATE)/gi,
  // Server internal paths
  /\/var\/www\/|\/usr\/local\/|\/opt\/|C:\\inetpub\\/gi,
  // Version numbers that might leak info
  /version\s+[\d\.]+/gi,
  // Internal hostnames
  /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b/g,
];

/**
 * Error classification patterns
 */
const ERROR_CLASSIFICATIONS = {
  validation: [
    /validation/i,
    /invalid/i,
    /required/i,
    /format/i,
    /length/i,
  ],
  authentication: [
    /auth/i,
    /login/i,
    /credential/i,
    /permission/i,
    /unauthorized/i,
  ],
  network: [
    /network/i,
    /connection/i,
    /timeout/i,
    /unreachable/i,
    /dns/i,
  ],
  server: [
    /server/i,
    /internal/i,
    /database/i,
    /service/i,
    /unavailable/i,
  ],
  client: [
    /client/i,
    /browser/i,
    /javascript/i,
    /syntax/i,
    /reference/i,
  ],
};

/**
 * User-friendly error messages by category
 */
const FRIENDLY_ERROR_MESSAGES = {
  validation: 'Please check your input and try again.',
  authentication: 'Authentication failed. Please check your credentials.',
  network: 'Network connection issue. Please check your internet connection.',
  server: 'Server temporarily unavailable. Please try again later.',
  client: 'An error occurred in your browser. Please refresh the page.',
  generic: 'An unexpected error occurred. Please try again.',
};

/**
 * Recovery suggestions by error type
 */
const RECOVERY_SUGGESTIONS = {
  validation: [
    'Check that all required fields are filled',
    'Verify the format of your input',
    'Ensure values are within acceptable ranges',
  ],
  authentication: [
    'Verify your username and password',
    'Check if your account is active',
    'Try logging out and logging back in',
  ],
  network: [
    'Check your internet connection',
    'Try refreshing the page',
    'Wait a moment and try again',
  ],
  server: [
    'Wait a few minutes and try again',
    'Check if the service is under maintenance',
    'Contact support if the problem persists',
  ],
  client: [
    'Refresh the page',
    'Clear your browser cache',
    'Try using a different browser',
  ],
  generic: [
    'Refresh the page and try again',
    'Check your internet connection',
    'Contact support if the problem continues',
  ],
};

/**
 * Default secure error display configuration
 */
export const DEFAULT_SECURE_ERROR_DISPLAY_CONFIG: SecureErrorDisplayConfig = {
  showTechnicalDetails: false,
  maxMessageLength: 200,
  sanitizeMessages: true,
  allowHTML: false,
  messageTemplate: 'An error occurred: {{message}}',
  loggingLevel: 'errors',
};

/**
 * SecureErrorDisplay class for safe error message rendering
 */
export class SecureErrorDisplay {
  private config: SecureErrorDisplayConfig;
  private escaper: OutputEscaper;

  constructor(config: Partial<SecureErrorDisplayConfig> = {}) {
    this.config = { ...DEFAULT_SECURE_ERROR_DISPLAY_CONFIG, ...config };
    this.escaper = new OutputEscaper();
  }

  /**
   * Display error safely with information disclosure prevention
   */
  public displayError(
    error: Error | string,
    customConfig?: Partial<SecureErrorDisplayConfig>
  ): ErrorDisplayResult {
    const config = customConfig ? { ...this.config, ...customConfig } : this.config;
    
    // Extract error information
    const errorInfo = this.extractErrorInfo(error);
    
    // Classify error type
    const errorType = this.classifyError(errorInfo.message);
    
    // Generate user-friendly message
    const userMessage = this.generateUserFriendlyMessage(
      errorInfo.message,
      errorType,
      config
    );
    
    // Sanitize technical details
    const technicalDetails = this.sanitizeTechnicalDetails(
      errorInfo.stack || errorInfo.message,
      config
    );
    
    // Generate error code
    const errorCode = this.generateErrorCode(errorType, errorInfo.message);
    
    // Get recovery suggestions
    const suggestions = RECOVERY_SUGGESTIONS[errorType] || RECOVERY_SUGGESTIONS.generic;
    
    return {
      userMessage,
      technicalDetails,
      errorCode,
      sanitized: true,
      suggestions: [...suggestions],
      metadata: {
        timestamp: Date.now(),
        errorType,
        originalLength: errorInfo.message.length,
        sanitizedLength: userMessage.length,
      },
    };
  }

  /**
   * Sanitize error message for safe display
   */
  public sanitizeErrorMessage(message: string): string {
    let sanitized = message;

    // Remove sensitive information
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // Limit message length
    if (sanitized.length > this.config.maxMessageLength) {
      sanitized = sanitized.substring(0, this.config.maxMessageLength - 3) + '...';
    }

    // Escape HTML if sanitization is enabled
    if (this.config.sanitizeMessages) {
      const escapeResult = this.escaper.escapeHTML(sanitized);
      sanitized = escapeResult.escaped;
    }

    return sanitized;
  }

  /**
   * Create safe error element for DOM insertion
   */
  public createErrorElement(
    error: Error | string,
    className: string = 'error-message'
  ): HTMLElement {
    const errorResult = this.displayError(error);
    
    const errorElement = document.createElement('div');
    errorElement.className = className;
    errorElement.setAttribute('role', 'alert');
    errorElement.setAttribute('aria-live', 'polite');
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'error-text';
    messageElement.textContent = errorResult.userMessage;
    errorElement.appendChild(messageElement);
    
    // Add error code if available
    if (errorResult.errorCode) {
      const codeElement = document.createElement('div');
      codeElement.className = 'error-code';
      codeElement.textContent = `Error Code: ${errorResult.errorCode}`;
      errorElement.appendChild(codeElement);
    }
    
    // Add suggestions if configured
    if (errorResult.suggestions.length > 0) {
      const suggestionsElement = document.createElement('div');
      suggestionsElement.className = 'error-suggestions';
      
      const suggestionsList = document.createElement('ul');
      for (const suggestion of errorResult.suggestions.slice(0, 3)) { // Limit to 3 suggestions
        const listItem = document.createElement('li');
        listItem.textContent = suggestion;
        suggestionsList.appendChild(listItem);
      }
      
      suggestionsElement.appendChild(suggestionsList);
      errorElement.appendChild(suggestionsElement);
    }
    
    return errorElement;
  }

  /**
   * Extract error information from various error types
   */
  private extractErrorInfo(error: Error | string): {
    message: string;
    stack?: string;
    name?: string;
  } {
    if (typeof error === 'string') {
      return { message: error };
    }
    
    if (error instanceof Error) {
      const result: { message: string; stack?: string; name?: string } = {
        message: error.message || 'Unknown error',
      };
      if (error.stack) result.stack = error.stack;
      if (error.name) result.name = error.name;
      return result;
    }
    
    // Handle error-like objects
    if (error && typeof error === 'object') {
      return {
        message: (error as any).message || 'Unknown error',
        stack: (error as any).stack,
        name: (error as any).name,
      };
    }
    
    return { message: 'Unknown error' };
  }

  /**
   * Classify error type based on message content
   */
  private classifyError(message: string): keyof typeof ERROR_CLASSIFICATIONS | 'generic' {
    const lowerMessage = message.toLowerCase();
    
    for (const [type, patterns] of Object.entries(ERROR_CLASSIFICATIONS)) {
      if (patterns.some(pattern => pattern.test(lowerMessage))) {
        return type as keyof typeof ERROR_CLASSIFICATIONS;
      }
    }
    
    return 'generic';
  }

  /**
   * Generate user-friendly error message
   */
  private generateUserFriendlyMessage(
    originalMessage: string,
    errorType: keyof typeof ERROR_CLASSIFICATIONS | 'generic',
    config: SecureErrorDisplayConfig
  ): string {
    // Use friendly message for the error type
    let friendlyMessage = FRIENDLY_ERROR_MESSAGES[errorType];
    
    // If showing technical details is allowed, append sanitized original message
    if (config.showTechnicalDetails) {
      const sanitizedOriginal = this.sanitizeErrorMessage(originalMessage);
      if (sanitizedOriginal && sanitizedOriginal !== '[REDACTED]') {
        friendlyMessage += ` (${sanitizedOriginal})`;
      }
    }
    
    // Apply message template if configured
    if (config.messageTemplate && config.messageTemplate !== DEFAULT_SECURE_ERROR_DISPLAY_CONFIG.messageTemplate) {
      friendlyMessage = config.messageTemplate.replace('{{message}}', friendlyMessage);
    }
    
    return friendlyMessage;
  }

  /**
   * Sanitize technical details for logging
   */
  private sanitizeTechnicalDetails(
    details: string,
    config: SecureErrorDisplayConfig
  ): string {
    if (!details) return '';
    
    let sanitized = details;
    
    // Remove sensitive information
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    
    // Truncate if too long
    const maxTechnicalLength = 1000;
    if (sanitized.length > maxTechnicalLength) {
      sanitized = sanitized.substring(0, maxTechnicalLength) + '... [TRUNCATED]';
    }
    
    return sanitized;
  }

  /**
   * Generate error code for tracking
   */
  private generateErrorCode(
    errorType: string,
    message: string
  ): string {
    // Create a simple hash of the error message for tracking
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const typePrefix = errorType.toUpperCase().substring(0, 3);
    const hashSuffix = Math.abs(hash).toString(16).substring(0, 6).toUpperCase();
    
    return `${typePrefix}-${hashSuffix}`;
  }

  /**
   * Log error securely
   */
  public logError(
    error: Error | string,
    context?: Record<string, any>
  ): void {
    if (this.config.loggingLevel === 'none') return;
    
    const errorResult = this.displayError(error);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: errorResult.userMessage,
      errorCode: errorResult.errorCode,
      technicalDetails: errorResult.technicalDetails,
      context: context ? this.sanitizeContext(context) : undefined,
    };
    
    // Log based on configuration
    switch (this.config.loggingLevel) {
      case 'debug':
        console.debug('Error Debug:', logEntry);
        break;
      case 'info':
        console.info('Error Info:', logEntry);
        break;
      case 'warnings':
        console.warn('Error Warning:', logEntry);
        break;
      case 'errors':
      default:
        console.error('Error:', logEntry);
        break;
    }
  }

  /**
   * Sanitize context object for logging
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeErrorMessage(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[OBJECT]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Get error display statistics
   */
  public getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    averageMessageLength: number;
    redactionRate: number;
  } {
    // This would typically be implemented with actual error tracking
    return {
      totalErrors: 0,
      errorsByType: {},
      averageMessageLength: 0,
      redactionRate: 0,
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<SecureErrorDisplayConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): SecureErrorDisplayConfig {
    return { ...this.config };
  }
}

/**
 * Default SecureErrorDisplay instance
 */
export const defaultSecureErrorDisplay = new SecureErrorDisplay();

/**
 * Convenience function for safe error display
 */
export function displayError(
  error: Error | string,
  config?: Partial<SecureErrorDisplayConfig>
): string {
  return defaultSecureErrorDisplay.displayError(error, config).userMessage;
}

/**
 * Convenience function for creating error elements
 */
export function createErrorElement(
  error: Error | string,
  className?: string
): HTMLElement {
  return defaultSecureErrorDisplay.createErrorElement(error, className);
}
