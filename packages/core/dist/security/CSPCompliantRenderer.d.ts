/**
 * CSPCompliantRenderer - Content Security Policy compliant rendering system
 * @description Provides CSP-compliant rendering with eval() removal and nonce-based execution
 */
import { CSPComplianceConfig, CSPViolationReport, OutputRenderer } from '../types/Rendering';
/**
 * Default CSP compliance configuration
 */
export declare const DEFAULT_CSP_COMPLIANCE_CONFIG: CSPComplianceConfig;
/**
 * CSPCompliantRenderer class for Content Security Policy compliant rendering
 */
export declare class CSPCompliantRenderer implements OutputRenderer {
    private config;
    private escaper;
    private sanitizer;
    private urlValidator;
    private safeRenderer;
    private violationReports;
    private nonceCounter;
    constructor(config?: Partial<CSPComplianceConfig>);
    /**
     * Set CSP configuration
     */
    setCSPConfig(config: CSPComplianceConfig): void;
    /**
     * Generate cryptographically secure nonce
     */
    generateNonce(): string;
    /**
     * Validate CSP compliance of content
     */
    validateCSPCompliance(content: string): boolean;
    /**
     * Remove CSP violations from content
     */
    sanitizeForCSP(content: string): string;
    /**
     * Create CSP-compliant script element
     */
    createSafeScript(scriptContent: string, nonce?: string): HTMLScriptElement;
    /**
     * Create CSP-compliant style element
     */
    createSafeStyle(styleContent: string, nonce?: string): HTMLStyleElement;
    /**
     * Add event listener in CSP-compliant way
     */
    addSafeEventListener(element: HTMLElement, eventType: string, handler: EventListener, options?: AddEventListenerOptions): void;
    /**
     * Report CSP violation
     */
    reportViolation(violation: CSPViolationReport): void;
    /**
     * Detect CSP violations in content
     */
    private detectCSPViolations;
    /**
     * Validate script content for CSP compliance
     */
    private validateScriptContent;
    /**
     * Validate style content for CSP compliance
     */
    private validateStyleContent;
    /**
     * Escape HTML content
     */
    escapeHTML(content: string, config?: any): import("../types/Rendering").HTMLEscapingResult;
    /**
     * Sanitize attributes
     */
    sanitizeAttributes(attributes: Record<string, any>, config?: any): import("../types/Rendering").AttributeSanitizationResult;
    /**
     * Validate URL
     */
    validateURL(url: string, config?: any): import("../types/Rendering").URLValidationResult;
    /**
     * Render template safely
     */
    renderTemplate(template: string, context: any, config?: any): import("../types/Rendering").TemplateRenderingResult;
    /**
     * Insert content safely into DOM
     */
    safeInsert(options: any): void;
    /**
     * Render search result with CSP compliance
     */
    renderSearchResult(data: any): {
        element: HTMLDivElement;
        escapingResults: {
            title: import("../types/Rendering").HTMLEscapingResult;
            description: import("../types/Rendering").HTMLEscapingResult;
            metadata: import("../types/Rendering").AttributeSanitizationResult;
            url: import("../types/Rendering").URLValidationResult;
        };
        performance: {
            renderTime: number;
            templateSize: number;
            outputSize: number;
        };
        securityValidation: {
            passed: boolean;
            errors: never[];
            warnings: never[];
        };
    };
    /**
     * Display error safely with CSP compliance
     */
    displayError(error: Error, config?: any): {
        userMessage: string;
        technicalDetails: string;
        errorCode: string;
        sanitized: boolean;
        suggestions: string[];
        metadata: {
            timestamp: number;
        };
    };
    /**
     * Get CSP violation reports
     */
    getViolationReports(): CSPViolationReport[];
    /**
     * Clear violation reports
     */
    clearViolationReports(): void;
    /**
     * Generate CSP header value
     */
    generateCSPHeader(): string;
    /**
     * Get current configuration
     */
    getConfig(): CSPComplianceConfig;
}
/**
 * Default CSPCompliantRenderer instance
 */
export declare const defaultCSPCompliantRenderer: CSPCompliantRenderer;
/**
 * Convenience function for CSP-compliant rendering
 */
export declare function renderWithCSP(content: string, config?: Partial<CSPComplianceConfig>): string;
/**
 * Convenience function for generating nonce
 */
export declare function generateCSPNonce(): string;
//# sourceMappingURL=CSPCompliantRenderer.d.ts.map