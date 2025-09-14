/**
 * CSPCompliantRenderer - Content Security Policy compliant rendering system
 * @description Provides CSP-compliant rendering with eval() removal and nonce-based execution
 */
import { OutputEscaper } from './OutputEscaper';
import { AttributeSanitizer } from './AttributeSanitizer';
import { URLValidator } from './URLValidator';
import { SafeRenderer } from './SafeRenderer';
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
export const DEFAULT_CSP_COMPLIANCE_CONFIG = {
    allowInlineStyles: false,
    allowInlineScripts: false,
    reportViolations: true,
    enforcement: 'strict',
};
/**
 * CSPCompliantRenderer class for Content Security Policy compliant rendering
 */
export class CSPCompliantRenderer {
    constructor(config = {}) {
        this.violationReports = [];
        this.nonceCounter = 0;
        this.config = { ...DEFAULT_CSP_COMPLIANCE_CONFIG, ...config };
        this.escaper = new OutputEscaper();
        this.sanitizer = new AttributeSanitizer();
        this.urlValidator = new URLValidator();
        this.safeRenderer = new SafeRenderer();
    }
    /**
     * Set CSP configuration
     */
    setCSPConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Generate cryptographically secure nonce
     */
    generateNonce() {
        // Use crypto API if available, fallback to secure random
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint8Array(16);
            crypto.getRandomValues(array);
            return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '');
        }
        else {
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
    validateCSPCompliance(content) {
        const violations = this.detectCSPViolations(content);
        return violations.length === 0;
    }
    /**
     * Remove CSP violations from content
     */
    sanitizeForCSP(content) {
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
    createSafeScript(scriptContent, nonce) {
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
    createSafeStyle(styleContent, nonce) {
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
    addSafeEventListener(element, eventType, handler, options) {
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
    reportViolation(violation) {
        this.violationReports.push(violation);
        if (this.config.reportViolations) {
            console.warn('CSP Violation detected:', violation);
            // Send to violation reporting endpoint if configured
            if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
                try {
                    navigator.sendBeacon('/csp-violation-report', JSON.stringify(violation));
                }
                catch (error) {
                    console.error('Failed to report CSP violation:', error);
                }
            }
        }
    }
    /**
     * Detect CSP violations in content
     */
    detectCSPViolations(content) {
        const violations = [];
        for (const [directive, patterns] of Object.entries(CSP_VIOLATION_PATTERNS)) {
            for (const pattern of patterns) {
                const matches = content.match(pattern);
                if (matches) {
                    for (const match of matches) {
                        violations.push({
                            violationType: directive,
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
    validateScriptContent(content) {
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
    validateStyleContent(content) {
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
    escapeHTML(content, config) {
        return this.escaper.escapeHTML(content, config);
    }
    /**
     * Sanitize attributes
     */
    sanitizeAttributes(attributes, config) {
        return this.sanitizer.sanitizeAttributes(attributes, config);
    }
    /**
     * Validate URL
     */
    validateURL(url, config) {
        return this.urlValidator.validateURL(url, config);
    }
    /**
     * Render template safely
     */
    renderTemplate(template, context, config) {
        return this.safeRenderer.renderTemplate(template, context, config);
    }
    /**
     * Insert content safely into DOM
     */
    safeInsert(options) {
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
    renderSearchResult(data) {
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
                sanitizationLevel: 'strict',
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
    displayError(error, config) {
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
                sanitizationLevel: 'strict',
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
    getViolationReports() {
        return [...this.violationReports];
    }
    /**
     * Clear violation reports
     */
    clearViolationReports() {
        this.violationReports = [];
    }
    /**
     * Generate CSP header value
     */
    generateCSPHeader() {
        const directives = [];
        // Script source
        if (this.config.scriptNonce) {
            directives.push(`script-src 'self' 'nonce-${this.config.scriptNonce}'`);
        }
        else {
            directives.push("script-src 'self'");
        }
        // Style source
        if (this.config.styleNonce) {
            directives.push(`style-src 'self' 'nonce-${this.config.styleNonce}'`);
        }
        else {
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
    getConfig() {
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
export function renderWithCSP(content, config) {
    const renderer = new CSPCompliantRenderer(config);
    return renderer.sanitizeForCSP(content);
}
/**
 * Convenience function for generating nonce
 */
export function generateCSPNonce() {
    return defaultCSPCompliantRenderer.generateNonce();
}
//# sourceMappingURL=CSPCompliantRenderer.js.map