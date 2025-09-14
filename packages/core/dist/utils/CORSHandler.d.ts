/**
 * CORS Handler - Handles cross-origin requests with fallback strategies
 * @description Manages CORS preflight, JSONP fallback, and proxy endpoints
 */
import type { CORSConfig, APIDataSourceConfig } from '../types/Config';
import type { APIRequestConfig, APIResponse } from '../types/Results';
/**
 * CORS detection and handling utilities
 */
export declare class CORSHandler {
    private corsCache;
    private jsonpCallbacks;
    private callbackCounter;
    /**
     * Determine appropriate request method based on CORS constraints
     */
    determineRequestMethod(config: APIDataSourceConfig, requestConfig: APIRequestConfig): Promise<{
        config: APIRequestConfig;
        mode: 'cors' | 'jsonp' | 'proxy';
    }>;
    /**
     * Check if CORS is supported for the given URL
     */
    checkCORSSupport(url: string, corsConfig: CORSConfig): Promise<boolean>;
    /**
     * Perform CORS preflight check
     */
    private performPreflightCheck;
    /**
     * Add appropriate CORS headers to request
     */
    private addCORSHeaders;
    /**
     * Convert request to JSONP format
     */
    private convertToJSONP;
    /**
     * Convert request to use proxy endpoint
     */
    private convertToProxy;
    /**
     * Execute JSONP request
     */
    executeJSONPRequest(requestConfig: APIRequestConfig): Promise<APIResponse>;
    /**
     * Execute proxy request
     */
    executeProxyRequest(requestConfig: APIRequestConfig): Promise<APIResponse>;
    /**
     * Generate unique JSONP callback name
     */
    private generateCallbackName;
    /**
     * Detect CORS error from fetch response
     */
    isCORSError(error: Error): boolean;
    /**
     * Handle CORS error with automatic fallback
     */
    handleCORSError(originalRequest: APIRequestConfig, config: APIDataSourceConfig, error: Error): Promise<APIResponse>;
    /**
     * Validate CORS configuration
     */
    validateCORSConfig(corsConfig: CORSConfig): void;
    /**
     * Clear CORS cache
     */
    clearCache(): void;
    /**
     * Get CORS cache status for debugging
     */
    getCacheStatus(): Record<string, boolean>;
    /**
     * Check if running in browser environment
     */
    private isBrowser;
    /**
     * Get current origin for CORS checks
     */
    private getCurrentOrigin;
}
/**
 * Global CORS handler instance
 */
export declare const corsHandler: CORSHandler;
//# sourceMappingURL=CORSHandler.d.ts.map