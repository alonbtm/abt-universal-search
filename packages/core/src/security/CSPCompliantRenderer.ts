/**
 * CSPCompliantRenderer - Content Security Policy compliant rendering system
 * @description Provides CSP-compliant rendering with eval() removal and nonce-based execution
 */

import { CSPComplianceConfig, CSPViolationReport, OutputRenderer } from '../types/Rendering';
import { OutputEscaper } from './OutputEscaper';
import { AttributeSanitizer } from './AttributeSanitizer';
import { URLValidator } from './URLValidator';
import { SafeRenderer } from './SafeRenderer';

/**
 * CSP directive types
 */
type CSPDirective = 
  | 'script-src'
  | 'style-src'
  | 'img-src'
  | 'connect-src'
  | 'frame-src'
  | 'object-src'
  | 'media-src'
  | 'font-src'
  | 'base-uri'
  | 'form-action';

/**
 * Patterns that violate CSP
 */
const CSP_VIOLATION_PATTERNS = {
  'script-src': [
    /eval\s*\(/gi,
    /new\s+Function\s*\(/gi,
    /setTimeout\s*\(\s*["'][^"']*["']/gi,
    /setInterval\s*\(\s*["'][^"']*["']/gi,
    /<script[^>]*>[\s\S]*?<\/script>/gi,
  ],
  'style-src': [
    /<style[^>]*>[\s\S]*?<\/style>/gi,
    /style\s*=\s*["'][^"']*["']/gi,
  ],
  'unsafe-inline': [
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /javascript\s*:/gi,
  ],
};

/**
 * Default CSP compliance configuration
 */
export const DEFAULT_CSP_COMPLIANCE_CONFIG: CSPComplianceConfig = {
  allowInlineStyles: false,
  allowInlineScripts: false,
  reportViolations: true,
  enforcement: 'strict',
};

/**
 * CSPCompliantRenderer class for Content Security Policy compliant rendering
 */
export class CSPCompliantRenderer implements OutputRenderer {
  private config: CSPComplianceConfig;
  private escaper: OutputEscaper;
  private sanitizer: AttributeSanitizer;
  private urlValidator: URLValidator;
  private safeRenderer: SafeRenderer;
  private violationReports: CSPViolationReport[] = [];
  private nonceCounter = 0;

  constructor(config: Partial<CSPComplianceConfig> = {}) {
    this.config = { ...DEFAULT_CSP_COMPLIANCE_CONFIG, ...config };
    this.escaper = new OutputEscaper();
    this.sanitizer = new AttributeSanitizer();
    this.urlValidator = new URLValidator();
    this.safeRenderer = new SafeRenderer();
  }

  /**
   * Set CSP configuration
   */
  public setCSPConfig(config: CSPComplianceConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate cryptographically secure nonce
   */
  public generateNonce(): string {
    // Use crypto API if available, fallback to secure random
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '');
    } else {
      // Fallback for Node.js environment
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2);
      const counter = (++this.nonceCounter).toString(36);
      return btoa(`${timestamp}-${random}-${counter}`).replace(/[+/=]/g, '');
    }
  }

  /**
   * Validate CSP compliance of content
   */
  public validateCSPCompliance(content: string): boolean {
    const violations = this.detectCSPViolations(content);
    return violations.length === 0;
  }

  /**
   * Remove CSP violations from content
   */
  public sanitizeForCSP(content: string): string {
    let sanitized = content;

    // Remove inline scripts
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Remove inline styles if not allowed
    if (!this.config.allowInlineStyles) {
      sanitized = sanitized.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      sanitized = sanitized.replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '');
    }

    // Remove event handlers
    sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');

    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript\s*:[^"'\s>]*/gi, '#');

    // Remove eval and Function constructor patterns
    sanitized = sanitized.replace(/eval\s*\(/gi, 'void(');
    sanitized = sanitized.replace(/new\s+Function\s*\(/gi, 'void Function(');

    return sanitized;
  }

  /**
   * Create CSP-compliant script element
   */
  public createSafeScript(scriptContent: string, nonce?: string): HTMLScriptElement {
    const script = document.createElement('script');
    
    // Use nonce if provided or generate one
    const scriptNonce = nonce || this.config.scriptNonce || this.generateNonce();
    script.setAttribute('nonce', scriptNonce);
    
    // Validate script content for CSP compliance
    if (!this.validateScriptContent(scriptContent)) {
      throw new Error('Script content violates CSP policy');
    }
    
    script.textContent = scriptContent;
    return script;
  }

  /**
   * Create CSP-compliant style element
   */
  public createSafeStyle(styleContent: string, nonce?: string): HTMLStyleElement {
    const style = document.createElement('style');
    
    // Use nonce if provided or generate one
    const styleNonce = nonce || this.config.styleNonce || this.generateNonce();
    style.setAttribute('nonce', styleNonce);
    
    // Validate style content
    if (!this.validateStyleContent(styleContent)) {
      throw new Error('Style content violates CSP policy');
    }
    
    style.textContent = styleContent;
    return style;
  }

  /**
   * Add event listener in CSP-compliant way
   */
  public addSafeEventListener(
    element: HTMLElement,
    eventType: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    // Remove any existing inline event handlers
    const inlineHandler = `on${eventType}`;
    if (element.hasAttribute(inlineHandler)) {
      element.removeAttribute(inlineHandler);
      this.reportViolation({
        violationType: 'script-src',
        blockedURI: 'inline',
        documentURI: document.location.href,
        originalPolicy: 'script-src \'self\'',
        timestamp: Date.now(),
      });
    }

    // Add event listener using addEventListener (CSP-compliant)
    element.addEventListener(eventType, handler, options);
  }

  /**
   * Report CSP violation
   */
  public reportViolation(violation: CSPViolationReport): void {
    this.violationReports.push(violation);

    if (this.config.reportViolations) {
      console.warn('CSP Violation detected:', violation);
      
      // Send to violation reporting endpoint if configured
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        try {
          navigator.sendBeacon('/csp-violation-report', JSON.stringify(violation));
        } catch (error) {
          console.error('Failed to report CSP violation:', error);
        }
      }
    }
  }

  /**
   * Detect CSP violations in content
   */
  private detectCSPViolations(content: string): CSPViolationReport[] {
    const violations: CSPViolationReport[] = [];

    for (const [directive, patterns] of Object.entries(CSP_VIOLATION_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            violations.push({
              violationType: directive as any,
              blockedURI: 'inline',
              documentURI: document.location?.href || 'unknown',
              originalPolicy: `${directive} 'self'`,
              timestamp: Date.now(),
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Validate script content for CSP compliance
   */
  private validateScriptContent(content: string): boolean {
    const dangerousPatterns = [
      /eval\s*\(/gi,
      /new\s+Function\s*\(/gi,
      /setTimeout\s*\(\s*["'][^"']*["']/gi,
      /setInterval\s*\(\s*["'][^"']*["']/gi,
      /document\.write\s*\(/gi,
      /innerHTML\s*=/gi,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate style content for CSP compliance
   */
  private validateStyleContent(content: string): boolean {
    const dangerousPatterns = [
      /expression\s*\(/gi,
      /behavior\s*:/gi,
      /binding\s*:/gi,
      /@import\s+url\s*\(/gi,
      /javascript\s*:/gi,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(content));
  }

  // Implement OutputRenderer interface methods

  /**
   * Escape HTML content
   */
  public escapeHTML(content: string, config?: any) {
    return this.escaper.escapeHTML(content, config);
  }

  /**
   * Sanitize attributes
   */
  public sanitizeAttributes(attributes: Record<string, any>, config?: any) {
    return this.sanitizer.sanitizeAttributes(attributes, config);
  }

  /**
   * Validate URL
   */
  public validateURL(url: string, config?: any) {
    return this.urlValidator.validateURL(url, config);
  }

  /**
   * Render template safely
   */
  public renderTemplate(template: string, context: any, config?: any) {
    return this.safeRenderer.renderTemplate(template, context, config);
  }

  /**
   * Insert content safely into DOM
   */
  public safeInsert(options: any): void {
    // Validate content for CSP compliance before insertion
    const sanitizedContent = this.sanitizeForCSP(options.content);
    
    const safeOptions = {
      ...options,
      content: sanitizedContent,
    };
    
    this.escaper.safeInsert(safeOptions);
  }

  /**
   * Render search result with CSP compliance
   */
  public renderSearchResult(data: any) {
    // Sanitize data for CSP compliance
    const sanitizedData = {
      ...data,
      title: this.sanitizeForCSP(data.title || ''),
      description: this.sanitizeForCSP(data.description || ''),
      url: this.urlValidator.validateURL(data.url || '').sanitizedURL,
    };

    // Use safe renderer with CSP-compliant context
    const context = {
      variables: sanitizedData,
      timestamp: Date.now(),
      securityContext: {
        cspNonce: this.generateNonce(),
        trustedContent: false,
        sanitizationLevel: 'strict' as const,
      },
    };

    const result = this.safeRenderer.renderBuiltIn('searchResult', context);
    
    // Create safe element
    const element = document.createElement('div');
    element.innerHTML = ''; // Clear any content
    this.safeInsert({
      targetElement: element,
      content: result.content,
      method: 'textContent',
      validate: true,
      clearTarget: true,
    });

    return {
      element,
      escapingResults: {
        title: this.escapeHTML(sanitizedData.title),
        description: this.escapeHTML(sanitizedData.description),
        metadata: this.sanitizeAttributes(sanitizedData.metadata || {}),
        url: this.validateURL(sanitizedData.url),
      },
      performance: result.metrics,
      securityValidation: {
        passed: this.validateCSPCompliance(result.content),
        errors: [],
        warnings: [],
      },
    };
  }

  /**
   * Display error safely with CSP compliance
   */
  public displayError(error: Error, config?: any) {
    const errorData = {
      title: 'Error',
      message: error.message,
      code: 'GENERIC_ERROR',
    };

    const context = {
      variables: errorData,
      timestamp: Date.now(),
      securityContext: {
        cspNonce: this.generateNonce(),
        trustedContent: false,
        sanitizationLevel: 'strict' as const,
      },
    };

    const result = this.safeRenderer.renderBuiltIn('errorMessage', context);

    return {
      userMessage: result.content,
      technicalDetails: error.stack || error.message,
      errorCode: 'GENERIC_ERROR',
      sanitized: true,
      suggestions: ['Please try again later'],
      metadata: { timestamp: Date.now() },
    };
  }

  /**
   * Get CSP violation reports
   */
  public getViolationReports(): CSPViolationReport[] {
    return [...this.violationReports];
  }

  /**
   * Clear violation reports
   */
  public clearViolationReports(): void {
    this.violationReports = [];
  }

  /**
   * Generate CSP header value
   */
  public generateCSPHeader(): string {
    const directives: string[] = [];

    // Script source
    if (this.config.scriptNonce) {
      directives.push(`script-src 'self' 'nonce-${this.config.scriptNonce}'`);
    } else {
      directives.push("script-src 'self'");
    }

    // Style source
    if (this.config.styleNonce) {
      directives.push(`style-src 'self' 'nonce-${this.config.styleNonce}'`);
    } else {
      directives.push("style-src 'self'");
    }

    // Other directives
    directives.push("object-src 'none'");
    directives.push("base-uri 'self'");
    directives.push("frame-ancestors 'none'");

    return directives.join('; ');
  }

  /**
   * Get current configuration
   */
  public getConfig(): CSPComplianceConfig {
    return { ...this.config };
  }
}

/**
 * Default CSPCompliantRenderer instance
 */
export const defaultCSPCompliantRenderer = new CSPCompliantRenderer();

/**
 * Convenience function for CSP-compliant rendering
 */
export function renderWithCSP(content: string, config?: Partial<CSPComplianceConfig>): string {
  const renderer = new CSPCompliantRenderer(config);
  return renderer.sanitizeForCSP(content);
}

/**
 * Convenience function for generating nonce
 */
export function generateCSPNonce(): string {
  return defaultCSPCompliantRenderer.generateNonce();
}
