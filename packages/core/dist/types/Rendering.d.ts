/**
 * Rendering Types - Type definitions for secure output rendering and escaping
 * @description TypeScript interfaces for HTML escaping, safe rendering, and output validation
 */
/**
 * HTML escaping configuration
 */
export interface HTMLEscapingConfig {
    /** Escape HTML entities */
    escapeHTMLEntities: boolean;
    /** Escape attribute values */
    escapeAttributes: boolean;
    /** Escape URL components */
    escapeURLs: boolean;
    /** Preserve specific HTML tags */
    preserveTags?: string[];
    /** Maximum content length for escaping */
    maxContentLength: number;
    /** Enable strict escaping mode */
    strictMode: boolean;
}
/**
 * Safe DOM insertion options
 */
export interface SafeDOMInsertionOptions {
    /** Target element for insertion */
    targetElement: HTMLElement;
    /** Content to insert */
    content: string;
    /** Insertion method */
    method: 'textContent' | 'createElement' | 'documentFragment';
    /** Validate before insertion */
    validate: boolean;
    /** Clear target before insertion */
    clearTarget: boolean;
}
/**
 * HTML escaping result
 */
export interface HTMLEscapingResult {
    /** Escaped content */
    escaped: string;
    /** Whether content was modified */
    modified: boolean;
    /** Original content length */
    originalLength: number;
    /** Escaped content length */
    escapedLength: number;
    /** Characters that were escaped */
    escapedCharacters: string[];
    /** Performance metrics */
    processingTime: number;
}
/**
 * Attribute sanitization configuration
 */
export interface AttributeSanitizationConfig {
    /** Allowed attribute names */
    allowedAttributes: string[];
    /** Attribute value length limit */
    maxAttributeLength: number;
    /** Allow data attributes */
    allowDataAttributes: boolean;
    /** Allowed data attribute prefixes */
    allowedDataPrefixes?: string[];
    /** Sanitize attribute values */
    sanitizeValues: boolean;
    /** Remove empty attributes */
    removeEmptyAttributes: boolean;
}
/**
 * Attribute sanitization result
 */
export interface AttributeSanitizationResult {
    /** Sanitized attributes */
    sanitizedAttributes: Record<string, string>;
    /** Whether attributes were modified */
    modified: boolean;
    /** Removed attributes */
    removedAttributes: string[];
    /** Modified attribute values */
    modifiedValues: Record<string, {
        original: string;
        sanitized: string;
    }>;
    /** Validation warnings */
    warnings: string[];
}
/**
 * URL validation configuration
 */
export interface URLValidationConfig {
    /** Allowed protocols */
    allowedProtocols: string[];
    /** Allow relative URLs */
    allowRelativeURLs: boolean;
    /** Allowed domains */
    allowedDomains?: string[];
    /** Block suspicious patterns */
    blockSuspiciousPatterns: boolean;
    /** Maximum URL length */
    maxURLLength: number;
    /** Validate domain existence */
    validateDomains: boolean;
}
/**
 * URL validation result
 */
export interface URLValidationResult {
    /** Whether URL is valid */
    isValid: boolean;
    /** Sanitized URL */
    sanitizedURL: string;
    /** Validation errors */
    errors: string[];
    /** URL components */
    components: {
        protocol: string;
        hostname: string;
        pathname: string;
        search: string;
        hash: string;
    };
    /** Security warnings */
    warnings: string[];
}
/**
 * Safe template configuration
 */
export interface SafeTemplateConfig {
    /** Template delimiter pattern */
    delimiterPattern: RegExp;
    /** Allow nested templates */
    allowNested: boolean;
    /** Maximum template depth */
    maxDepth: number;
    /** Validate template variables */
    validateVariables: boolean;
    /** Escape template output */
    escapeOutput: boolean;
    /** Template cache size */
    cacheSize: number;
}
/**
 * Template rendering context
 */
export interface TemplateRenderingContext {
    /** Template variables */
    variables: Record<string, any>;
    /** Template metadata */
    metadata?: Record<string, any>;
    /** Rendering timestamp */
    timestamp: number;
    /** Security context */
    securityContext: {
        cspNonce?: string;
        trustedContent: boolean;
        sanitizationLevel: 'strict' | 'moderate' | 'minimal';
    };
}
/**
 * Template rendering result
 */
export interface TemplateRenderingResult {
    /** Rendered content */
    content: string;
    /** Whether content was escaped */
    escaped: boolean;
    /** Template variables used */
    variablesUsed: string[];
    /** Rendering errors */
    errors: string[];
    /** Performance metrics */
    metrics: {
        renderTime: number;
        templateSize: number;
        outputSize: number;
    };
}
/**
 * CSP compliance configuration
 */
export interface CSPComplianceConfig {
    /** CSP nonce for scripts */
    scriptNonce?: string;
    /** CSP nonce for styles */
    styleNonce?: string;
    /** Allow inline styles */
    allowInlineStyles: boolean;
    /** Allow inline scripts */
    allowInlineScripts: boolean;
    /** Report CSP violations */
    reportViolations: boolean;
    /** CSP policy enforcement */
    enforcement: 'strict' | 'moderate' | 'report-only';
}
/**
 * CSP violation report
 */
export interface CSPViolationReport {
    /** Violation type */
    violationType: 'script-src' | 'style-src' | 'img-src' | 'connect-src' | 'frame-src';
    /** Blocked URI */
    blockedURI: string;
    /** Document URI */
    documentURI: string;
    /** Line number */
    lineNumber?: number;
    /** Column number */
    columnNumber?: number;
    /** Original policy */
    originalPolicy: string;
    /** Violation timestamp */
    timestamp: number;
}
/**
 * Secure error display configuration
 */
export interface SecureErrorDisplayConfig {
    /** Show technical details */
    showTechnicalDetails: boolean;
    /** Maximum error message length */
    maxMessageLength: number;
    /** Sanitize error messages */
    sanitizeMessages: boolean;
    /** Allow HTML in error messages */
    allowHTML: boolean;
    /** Error message template */
    messageTemplate: string;
    /** Logging level */
    loggingLevel: 'none' | 'errors' | 'warnings' | 'info' | 'debug';
}
/**
 * Error display result
 */
export interface ErrorDisplayResult {
    /** User-friendly error message */
    userMessage: string;
    /** Technical error details (for logging) */
    technicalDetails: string;
    /** Error code */
    errorCode: string;
    /** Whether message was sanitized */
    sanitized: boolean;
    /** Recovery suggestions */
    suggestions: string[];
    /** Error metadata */
    metadata: Record<string, any>;
}
/**
 * Rendering performance metrics
 */
export interface RenderingPerformanceMetrics {
    /** Total rendering time */
    totalTime: number;
    /** HTML escaping time */
    escapingTime: number;
    /** Attribute sanitization time */
    attributeTime: number;
    /** URL validation time */
    urlValidationTime: number;
    /** Template rendering time */
    templateTime: number;
    /** DOM insertion time */
    domInsertionTime: number;
    /** Content size metrics */
    sizes: {
        originalSize: number;
        processedSize: number;
        finalSize: number;
    };
}
/**
 * Search result rendering data
 */
export interface SearchResultRenderData {
    /** Result title */
    title: string;
    /** Result description */
    description: string;
    /** Result URL */
    url?: string;
    /** Result metadata */
    metadata: Record<string, any>;
    /** Result icon */
    icon?: string;
    /** Result category */
    category?: string;
    /** Custom attributes */
    attributes?: Record<string, string>;
    /** Security context */
    securityContext: {
        trusted: boolean;
        sanitizationLevel: 'strict' | 'moderate' | 'minimal';
        source: string;
    };
}
/**
 * Rendered search result
 */
export interface RenderedSearchResult {
    /** Rendered HTML element */
    element: HTMLElement;
    /** Escaping results */
    escapingResults: {
        title: HTMLEscapingResult;
        description: HTMLEscapingResult;
        metadata: AttributeSanitizationResult;
        url?: URLValidationResult;
    };
    /** Rendering performance */
    performance: RenderingPerformanceMetrics;
    /** Security validation results */
    securityValidation: {
        passed: boolean;
        errors: string[];
        warnings: string[];
    };
}
/**
 * Output renderer interface
 */
export interface OutputRenderer {
    /** Escape HTML content */
    escapeHTML(content: string, config?: HTMLEscapingConfig): HTMLEscapingResult;
    /** Sanitize attributes */
    sanitizeAttributes(attributes: Record<string, any>, config?: AttributeSanitizationConfig): AttributeSanitizationResult;
    /** Validate URL */
    validateURL(url: string, config?: URLValidationConfig): URLValidationResult;
    /** Render template safely */
    renderTemplate(template: string, context: TemplateRenderingContext, config?: SafeTemplateConfig): TemplateRenderingResult;
    /** Insert content safely into DOM */
    safeInsert(options: SafeDOMInsertionOptions): void;
    /** Render search result */
    renderSearchResult(data: SearchResultRenderData): RenderedSearchResult;
    /** Display error safely */
    displayError(error: Error, config?: SecureErrorDisplayConfig): ErrorDisplayResult;
}
/**
 * CSP-compliant renderer interface
 */
export interface CSPCompliantRenderer extends OutputRenderer {
    /** Set CSP configuration */
    setCSPConfig(config: CSPComplianceConfig): void;
    /** Generate CSP nonce */
    generateNonce(): string;
    /** Report CSP violation */
    reportViolation(violation: CSPViolationReport): void;
    /** Validate CSP compliance */
    validateCSPCompliance(content: string): boolean;
}
/**
 * Rendering event types
 */
export type RenderingEventType = 'render_start' | 'render_complete' | 'escape_applied' | 'attribute_sanitized' | 'url_validated' | 'template_rendered' | 'csp_violation' | 'error_displayed' | 'performance_warning';
/**
 * Rendering event data
 */
export interface RenderingEvent {
    /** Event type */
    type: RenderingEventType;
    /** Event timestamp */
    timestamp: number;
    /** Event data */
    data: {
        resultId?: string;
        processingTime?: number;
        contentSize?: number;
        securityLevel?: string;
        error?: string;
        violation?: CSPViolationReport;
    };
    /** Event context */
    context: {
        component: string;
        method: string;
        security: boolean;
    };
}
/**
 * Safe rendering options
 */
export interface SafeRenderingOptions {
    /** HTML escaping configuration */
    htmlEscaping: HTMLEscapingConfig;
    /** Attribute sanitization configuration */
    attributeSanitization: AttributeSanitizationConfig;
    /** URL validation configuration */
    urlValidation: URLValidationConfig;
    /** Template rendering configuration */
    templateRendering: SafeTemplateConfig;
    /** CSP compliance configuration */
    cspCompliance: CSPComplianceConfig;
    /** Error display configuration */
    errorDisplay: SecureErrorDisplayConfig;
    /** Performance monitoring */
    performanceMonitoring: boolean;
    /** Event reporting */
    eventReporting: boolean;
}
//# sourceMappingURL=Rendering.d.ts.map