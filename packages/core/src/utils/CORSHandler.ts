/**
 * CORS Handler - Handles cross-origin requests with fallback strategies
 * @description Manages CORS preflight, JSONP fallback, and proxy endpoints
 */

import type { CORSConfig, APIDataSourceConfig } from '../types/Config';
import type { APIRequestConfig, APIResponse } from '../types/Results';
import { ValidationError } from './validation';

/**
 * CORS detection and handling utilities
 */
export class CORSHandler {
  private corsCache = new Map<string, boolean>();
  private jsonpCallbacks = new Map<string, (data: unknown) => void>();
  private callbackCounter = 0;

  /**
   * Determine appropriate request method based on CORS constraints
   */
  public async determineRequestMethod(
    config: APIDataSourceConfig,
    requestConfig: APIRequestConfig
  ): Promise<{ config: APIRequestConfig; mode: 'cors' | 'jsonp' | 'proxy' }> {
    if (!config.cors?.enabled) {
      return { config: requestConfig, mode: 'cors' };
    }

    const corsAllowed = await this.checkCORSSupport(requestConfig.url, config.cors);
    
    if (corsAllowed) {
      return { 
        config: this.addCORSHeaders(requestConfig, config.cors), 
        mode: 'cors' 
      };
    }

    // Try fallback strategies
    if (config.cors.jsonpCallback && requestConfig.method === 'GET') {
      return {
        config: this.convertToJSONP(requestConfig, config.cors.jsonpCallback),
        mode: 'jsonp'
      };
    }

    if (config.cors.proxyUrl) {
      return {
        config: this.convertToProxy(requestConfig, config.cors.proxyUrl),
        mode: 'proxy'
      };
    }

    throw new Error(`CORS not supported and no fallback configured for ${requestConfig.url}`);
  }

  /**
   * Check if CORS is supported for the given URL
   */
  public async checkCORSSupport(url: string, corsConfig: CORSConfig): Promise<boolean> {
    const origin = new URL(url).origin;
    
    // Check cache first
    if (this.corsCache.has(origin)) {
      return this.corsCache.get(origin)!;
    }

    try {
      // Perform preflight check
      const preflightSupported = await this.performPreflightCheck(url, corsConfig);
      this.corsCache.set(origin, preflightSupported);
      return preflightSupported;
    } catch (error) {
      // If preflight fails, assume CORS is not supported
      this.corsCache.set(origin, false);
      return false;
    }
  }

  /**
   * Perform CORS preflight check
   */
  private async performPreflightCheck(url: string, corsConfig: CORSConfig): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': corsConfig.allowedMethods?.[0] || 'GET',
          'Access-Control-Request-Headers': corsConfig.allowedHeaders?.join(', ') || 'Content-Type',
          'Origin': window.location.origin
        },
        mode: 'cors'
      });

      // Check if preflight was successful
      if (response.ok) {
        const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
        return allowOrigin === '*' || allowOrigin === window.location.origin;
      }

      return false;
    } catch (error) {
      // Network error or CORS rejection
      return false;
    }
  }

  /**
   * Add appropriate CORS headers to request
   */
  private addCORSHeaders(requestConfig: APIRequestConfig, corsConfig: CORSConfig): APIRequestConfig {
    const headers = { ...requestConfig.headers };

    // Add standard CORS headers
    headers['Origin'] = window.location.origin;
    
    // Add custom headers if specified
    if (corsConfig.allowedHeaders) {
      // Ensure all custom headers are included
      corsConfig.allowedHeaders.forEach(header => {
        if (!headers[header] && header.toLowerCase() !== 'origin') {
          headers[header] = '';
        }
      });
    }

    return {
      ...requestConfig,
      headers
    };
  }

  /**
   * Convert request to JSONP format
   */
  private convertToJSONP(requestConfig: APIRequestConfig, callbackParam: string): APIRequestConfig {
    if (requestConfig.method !== 'GET') {
      throw new ValidationError('JSONP only supports GET requests');
    }

    const url = new URL(requestConfig.url);
    const callbackName = this.generateCallbackName();
    
    // Add callback parameter
    url.searchParams.set(callbackParam, callbackName);
    
    return {
      ...requestConfig,
      url: url.toString(),
      headers: {
        ...requestConfig.headers,
        'Content-Type': 'application/javascript'
      }
    };
  }

  /**
   * Convert request to use proxy endpoint
   */
  private convertToProxy(requestConfig: APIRequestConfig, proxyUrl: string): APIRequestConfig {
    // Encode the original request configuration
    const proxyData = {
      url: requestConfig.url,
      method: requestConfig.method,
      headers: requestConfig.headers,
      body: requestConfig.body
    };

    return {
      url: proxyUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proxyData),
      timeout: requestConfig.timeout
    };
  }

  /**
   * Execute JSONP request
   */
  public async executeJSONPRequest(requestConfig: APIRequestConfig): Promise<APIResponse> {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const url = new URL(requestConfig.url);
      const callbackName = url.searchParams.get('callback') || url.searchParams.get('jsonp');
      
      if (!callbackName) {
        reject(new Error('JSONP callback parameter not found in URL'));
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = requestConfig.url;

      // Set up callback
      (window as any)[callbackName] = (data: unknown) => {
        const responseTime = performance.now() - startTime;
        
        // Cleanup
        document.head.removeChild(script);
        delete (window as any)[callbackName];
        
        resolve({
          data,
          status: 200,
          headers: { 'Content-Type': 'application/javascript' },
          responseTime
        });
      };

      // Handle errors
      script.onerror = () => {
        // Cleanup
        if (script.parentNode) {
          document.head.removeChild(script);
        }
        delete (window as any)[callbackName];
        
        reject(new Error('JSONP request failed'));
      };

      // Set timeout
      if (requestConfig.timeout) {
        setTimeout(() => {
          if (script.parentNode) {
            document.head.removeChild(script);
            delete (window as any)[callbackName];
            reject(new Error('JSONP request timeout'));
          }
        }, requestConfig.timeout);
      }

      // Execute request
      document.head.appendChild(script);
    });
  }

  /**
   * Execute proxy request
   */
  public async executeProxyRequest(requestConfig: APIRequestConfig): Promise<APIResponse> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(requestConfig.url, {
        method: requestConfig.method,
        headers: requestConfig.headers,
        body: requestConfig.body,
        signal: requestConfig.timeout ? 
          AbortSignal.timeout(requestConfig.timeout) : undefined
      });

      const responseTime = performance.now() - startTime;
      
      // Parse proxy response
      const proxyData = await response.json();
      
      return {
        data: proxyData.body || proxyData.data,
        status: proxyData.status || response.status,
        headers: proxyData.headers || {},
        responseTime
      };
    } catch (error) {
      throw new Error(`Proxy request failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate unique JSONP callback name
   */
  private generateCallbackName(): string {
    return `jsonp_callback_${Date.now()}_${++this.callbackCounter}`;
  }

  /**
   * Detect CORS error from fetch response
   */
  public isCORSError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('cors') || 
           message.includes('cross-origin') ||
           message.includes('access-control');
  }

  /**
   * Handle CORS error with automatic fallback
   */
  public async handleCORSError(
    originalRequest: APIRequestConfig,
    config: APIDataSourceConfig,
    error: Error
  ): Promise<APIResponse> {
    if (!config.cors?.autoFallback || !this.isCORSError(error)) {
      throw error;
    }

    console.warn('CORS error detected, attempting fallback:', error.message);
    
    // Update cache to mark CORS as not supported
    const origin = new URL(originalRequest.url).origin;
    this.corsCache.set(origin, false);

    // Try fallback methods
    try {
      const { config: fallbackConfig, mode } = await this.determineRequestMethod(
        config, 
        originalRequest
      );

      if (mode === 'jsonp') {
        return await this.executeJSONPRequest(fallbackConfig);
      } else if (mode === 'proxy') {
        return await this.executeProxyRequest(fallbackConfig);
      } else {
        throw new Error('No fallback method available');
      }
    } catch (fallbackError) {
      console.error('All CORS fallback methods failed:', fallbackError);
      throw new Error(`CORS error and fallback failed: ${(fallbackError as Error).message}`);
    }
  }

  /**
   * Validate CORS configuration
   */
  public validateCORSConfig(corsConfig: CORSConfig): void {
    if (corsConfig.enabled && corsConfig.jsonpCallback && corsConfig.jsonpCallback.trim().length === 0) {
      throw new ValidationError('JSONP callback parameter name cannot be empty');
    }

    if (corsConfig.enabled && corsConfig.proxyUrl) {
      try {
        new URL(corsConfig.proxyUrl);
      } catch (error) {
        throw new ValidationError('Invalid proxy URL');
      }
    }

    if (corsConfig.allowedMethods) {
      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      for (const method of corsConfig.allowedMethods) {
        if (!validMethods.includes(method.toUpperCase())) {
          throw new ValidationError(`Invalid HTTP method: ${method}`);
        }
      }
    }
  }

  /**
   * Clear CORS cache
   */
  public clearCache(): void {
    this.corsCache.clear();
  }

  /**
   * Get CORS cache status for debugging
   */
  public getCacheStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [origin, supported] of this.corsCache.entries()) {
      status[origin] = supported;
    }
    return status;
  }

  /**
   * Check if running in browser environment
   */
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  /**
   * Get current origin for CORS checks
   */
  private getCurrentOrigin(): string {
    if (this.isBrowser()) {
      return window.location.origin;
    }
    return 'http://localhost';
  }
}

/**
 * Global CORS handler instance
 */
export const corsHandler = new CORSHandler();