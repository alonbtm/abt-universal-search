/**
 * InputSanitizer - XSS prevention and input sanitization
 * @description Provides comprehensive input sanitization using DOMPurify with configurable policies
 */

import DOMPurify from 'dompurify';
import { SecurityConfig, XSSProtectionConfig, SecurityValidationResult, SecurityError } from '../types/Security';

/**
 * Sanitization policy configuration
 */
export interface SanitizationPolicy {
  /** Allow HTML tags */
  allowHtml: boolean;
  /** Allowed HTML tags */
  allowedTags: string[];
  /** Allowed HTML attributes */
  allowedAttributes: string[];
  /** Remove scripts completely */
  removeScripts: boolean;
  /** Remove event handlers */
  removeEventHandlers: boolean;
  /** Remove data URLs */
  removeDataUrls: boolean;
  /** Custom sanitization rules */
  customRules?: (input: string) => string;
}

/**
 * Default sanitization policy for search queries
 */
export const DEFAULT_SEARCH_POLICY: SanitizationPolicy = {
  allowHtml: false,
  allowedTags: [],
  allowedAttributes: [],
  removeScripts: true,
  removeEventHandlers: true,
  removeDataUrls: true,
};

/**
 * Permissive policy for rich text content
 */
export const RICH_TEXT_POLICY: SanitizationPolicy = {
  allowHtml: true,
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'span'],
  allowedAttributes: ['class', 'style'],
  removeScripts: true,
  removeEventHandlers: true,
  removeDataUrls: true,
};

/**
 * Input sanitizer with XSS protection
 */
export class InputSanitizer {
  private config: SecurityConfig;
  private xssConfig: XSSProtectionConfig;

  constructor(config: SecurityConfig, xssConfig?: XSSProtectionConfig) {
    this.config = config;
    this.xssConfig = xssConfig || {
      allowedTags: [],
      allowedAttributes: [],
      blockScripts: true,
      blockEventHandlers: true,
      blockDataUrls: true,
    };

    // Configure DOMPurify
    this.configureDOMPurify();
  }

  /**
   * Sanitize input string using specified policy
   */
  public sanitize(input: string, policy: SanitizationPolicy = DEFAULT_SEARCH_POLICY): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // Apply custom rules first if provided
    if (policy.customRules) {
      sanitized = policy.customRules(sanitized);
    }

    // Apply DOMPurify sanitization
    if (policy.allowHtml) {
      sanitized = this.sanitizeHtml(sanitized, policy);
    } else {
      // Strip all HTML for plain text
      sanitized = this.stripHtml(sanitized);
    }

    // Additional security measures
    sanitized = this.removeScriptPatterns(sanitized);
    sanitized = this.removeEventHandlers(sanitized);
    
    if (policy.removeDataUrls) {
      sanitized = this.removeDataUrls(sanitized);
    }

    return sanitized.trim();
  }

  /**
   * Sanitize HTML content with DOMPurify
   */
  private sanitizeHtml(input: string, policy: SanitizationPolicy): string {
    const config = {
      ALLOWED_TAGS: policy.allowedTags,
      ALLOWED_ATTR: policy.allowedAttributes,
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
    };

    return DOMPurify.sanitize(input, config);
  }

  /**
   * Strip all HTML tags from input
   */
  private stripHtml(input: string): string {
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true 
    });
  }

  /**
   * Remove script patterns that might bypass HTML sanitization
   */
  private removeScriptPatterns(input: string): string {
    const scriptPatterns = [
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /data:application\/javascript/gi,
      /<script[^>]*>.*?<\/script>/gis,
      /on\w+\s*=/gi, // Event handlers
      /expression\s*\(/gi, // CSS expressions
      /url\s*\(\s*javascript:/gi,
    ];

    let sanitized = input;
    scriptPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  /**
   * Remove event handler attributes
   */
  private removeEventHandlers(input: string): string {
    const eventHandlers = [
      'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
      'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown',
      'onkeyup', 'onkeypress', 'onmousedown', 'onmouseup'
    ];

    let sanitized = input;
    eventHandlers.forEach(handler => {
      const pattern = new RegExp(`${handler}\\s*=\\s*['""][^'"]*['"]`, 'gi');
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  /**
   * Remove data URLs that could contain malicious content
   */
  private removeDataUrls(input: string): string {
    return input.replace(/data:[^;]*;[^,]*,/gi, '');
  }

  /**
   * Validate input for XSS patterns
   */
  public validateForXSS(input: string): SecurityValidationResult {
    const errors: SecurityError[] = [];
    const warnings: any[] = [];

    // Check for script tags
    if (/<script[^>]*>/i.test(input)) {
      errors.push({
        type: 'xss',
        message: 'Script tags detected in input',
        severity: 'high',
        position: input.search(/<script[^>]*>/i),
        suggestion: 'Remove script tags from input'
      });
    }

    // Check for javascript: URLs
    if (/javascript:/i.test(input)) {
      errors.push({
        type: 'xss',
        message: 'JavaScript URL detected',
        severity: 'high',
        position: input.search(/javascript:/i),
        suggestion: 'Remove javascript: URLs'
      });
    }

    // Check for event handlers
    if (/on\w+\s*=/i.test(input)) {
      errors.push({
        type: 'xss',
        message: 'Event handler attributes detected',
        severity: 'medium',
        position: input.search(/on\w+\s*=/i),
        suggestion: 'Remove event handler attributes'
      });
    }

    // Check for data URLs
    if (/data:[^;]*;[^,]*,/i.test(input)) {
      warnings.push({
        type: 'suspicious_pattern',
        message: 'Data URL detected',
        position: input.search(/data:[^;]*;[^,]*,/i),
        recommendation: 'Review data URL content for security'
      });
    }

    const riskLevel = errors.length > 0 ? 
      (errors.some(e => e.severity === 'high') ? 'high' : 'medium') : 'low';

    return {
      isSecure: errors.length === 0,
      errors,
      warnings,
      riskLevel: riskLevel as any,
      recommendations: errors.map(e => e.suggestion || 'Review input for security issues')
    };
  }

  /**
   * Configure DOMPurify with security settings
   */
  private configureDOMPurify(): void {
    // Add custom hooks for additional security
    DOMPurify.addHook('beforeSanitizeElements', (node) => {
      // Remove any remaining script elements
      if (node.nodeName === 'SCRIPT') {
        node.remove();
      }
    });

    DOMPurify.addHook('beforeSanitizeAttributes', (node) => {
      // Remove event handler attributes
      if (node.hasAttributes()) {
        const attrs = Array.from(node.attributes);
        attrs.forEach(attr => {
          if (attr.name.startsWith('on')) {
            node.removeAttribute(attr.name);
          }
        });
      }
    });
  }

  /**
   * Get sanitization statistics
   */
  public getSanitizationStats(original: string, sanitized: string) {
    return {
      originalLength: original.length,
      sanitizedLength: sanitized.length,
      charactersRemoved: original.length - sanitized.length,
      htmlTagsRemoved: (original.match(/<[^>]*>/g) || []).length - 
                      (sanitized.match(/<[^>]*>/g) || []).length,
      potentialThreats: this.validateForXSS(original).errors.length
    };
  }
}
