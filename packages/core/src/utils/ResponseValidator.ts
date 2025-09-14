/**
 * Response Validator - Handles API response parsing and validation
 * @description Parses JSON responses, validates schemas, and handles error mapping
 */

import type { APIResponseConfig } from '../types/Config';
import type { APIResponse } from '../types/Results';
import type { RawResult } from '../types/Results';
import { ValidationError } from './validation';

/**
 * Response validation and parsing utilities
 */
export class ResponseValidator {
  private responseCache = new Map<string, { data: unknown; timestamp: number }>();

  /**
   * Validate and parse API response
   */
  public async validateResponse(
    response: Response,
    config?: APIResponseConfig
  ): Promise<APIResponse> {
    const startTime = performance.now();
    
    // Check if response is successful
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Extract headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Parse response data
    let data: unknown;
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      data = await this.parseJsonResponse(response, config);
    } else if (contentType.includes('application/javascript') && config?.format === 'jsonp') {
      data = await this.parseJsonpResponse(response);
    } else if (contentType.includes('application/xml') && config?.format === 'xml') {
      data = await this.parseXmlResponse(response);
    } else {
      throw new ValidationError(`Unsupported response content type: ${contentType}`);
    }

    const responseTime = performance.now() - startTime;
    
    const apiResponse: APIResponse = {
      data,
      status: response.status,
      headers,
      responseTime,
      rateLimit: this.extractRateLimitInfo(headers)
    };

    // Cache response if enabled
    if (config?.cache?.enabled) {
      this.cacheResponse(response.url, data, config.cache.ttlMs);
    }

    return apiResponse;
  }

  /**
   * Parse JSON response with validation
   */
  private async parseJsonResponse(response: Response, config?: APIResponseConfig): Promise<unknown> {
    const text = await response.text();
    
    if (!text.trim()) {
      return null;
    }

    try {
      const data = JSON.parse(text);
      
      // Validate schema if configured
      if (config?.schema) {
        this.validateSchema(data, config.schema);
      }
      
      return data;
    } catch (error) {
      throw new ValidationError(`Invalid JSON response: ${(error as Error).message}`);
    }
  }

  /**
   * Parse JSONP response
   */
  private async parseJsonpResponse(response: Response): Promise<unknown> {
    const text = await response.text();
    
    // Extract JSON from JSONP callback
    const match = text.match(/^\w+\((.*)\)$/);
    if (!match) {
      throw new ValidationError('Invalid JSONP response format');
    }

    try {
      return JSON.parse(match[1]);
    } catch (error) {
      throw new ValidationError(`Invalid JSON in JSONP response: ${(error as Error).message}`);
    }
  }

  /**
   * Parse XML response (basic implementation)
   */
  private async parseXmlResponse(response: Response): Promise<unknown> {
    const text = await response.text();
    
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/xml');
      
      // Check for parsing errors
      const errors = doc.getElementsByTagName('parsererror');
      if (errors.length > 0) {
        throw new ValidationError('Invalid XML response');
      }
      
      return this.xmlToJson(doc.documentElement);
    } else {
      // Fallback for Node.js environments
      throw new ValidationError('XML parsing not available in this environment');
    }
  }

  /**
   * Convert XML DOM element to JSON
   */
  private xmlToJson(element: Element): unknown {
    const result: Record<string, unknown> = {};
    
    // Handle attributes
    if (element.attributes.length > 0) {
      result['@attributes'] = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        (result['@attributes'] as Record<string, string>)[attr.name] = attr.value;
      }
    }
    
    // Handle child nodes
    if (element.children.length > 0) {
      for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i];
        const childName = child.tagName;
        
        if (!result[childName]) {
          result[childName] = [];
        }
        
        (result[childName] as unknown[]).push(this.xmlToJson(child));
      }
    } else if (element.textContent) {
      return element.textContent.trim();
    }
    
    return result;
  }

  /**
   * Transform API response data to search results
   */
  public transformToResults(data: unknown, config?: APIResponseConfig): RawResult[] {
    if (!data) {
      return [];
    }

    // Extract data from nested path if configured
    let resultsData = data;
    if (config?.dataPath) {
      resultsData = this.extractDataFromPath(data, config.dataPath);
    }

    // Ensure we have an array
    if (!Array.isArray(resultsData)) {
      if (typeof resultsData === 'object' && resultsData !== null) {
        resultsData = [resultsData];
      } else {
        return [];
      }
    }

    // Transform each item to RawResult
    return (resultsData as unknown[]).map((item, index) => ({
      id: this.extractId(item, index),
      data: this.applyFieldMappings(item, config?.fieldMappings),
      score: 1.0, // API results typically don't provide relevance scores
      matchedFields: [],
      metadata: {
        source: 'api',
        originalIndex: index
      }
    }));
  }

  /**
   * Extract data from nested object path
   */
  private extractDataFromPath(data: unknown, path: string): unknown {
    const segments = path.split('.');
    let current = data;
    
    for (const segment of segments) {
      if (current && typeof current === 'object' && segment in current) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return null;
      }
    }
    
    return current;
  }

  /**
   * Extract ID from item
   */
  private extractId(item: unknown, fallbackIndex: number): string {
    if (!item || typeof item !== 'object') {
      return `api-result-${fallbackIndex}`;
    }

    const itemObj = item as Record<string, unknown>;
    
    // Try common ID fields
    for (const idField of ['id', '_id', 'uuid', 'key']) {
      if (idField in itemObj && typeof itemObj[idField] === 'string') {
        return itemObj[idField] as string;
      }
    }
    
    return `api-result-${fallbackIndex}`;
  }

  /**
   * Apply field mappings to transform response structure
   */
  private applyFieldMappings(item: unknown, mappings?: Record<string, string>): unknown {
    if (!mappings || !item || typeof item !== 'object') {
      return item;
    }

    const itemObj = item as Record<string, unknown>;
    const mapped: Record<string, unknown> = {};
    
    for (const [targetField, sourceField] of Object.entries(mappings)) {
      if (sourceField in itemObj) {
        mapped[targetField] = itemObj[sourceField];
      }
    }
    
    // Include original fields that weren't mapped
    for (const [key, value] of Object.entries(itemObj)) {
      if (!Object.values(mappings).includes(key)) {
        mapped[key] = value;
      }
    }
    
    return mapped;
  }

  /**
   * Validate data against schema (basic implementation)
   */
  private validateSchema(data: unknown, schema: Record<string, unknown>): void {
    // This is a basic implementation - in production, consider using a proper JSON schema validator
    if (schema.required && Array.isArray(schema.required)) {
      if (!data || typeof data !== 'object') {
        throw new ValidationError('Response data must be an object');
      }
      
      const dataObj = data as Record<string, unknown>;
      for (const field of schema.required as string[]) {
        if (!(field in dataObj)) {
          throw new ValidationError(`Required field '${field}' missing from response`);
        }
      }
    }
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimitInfo(headers: Record<string, string>): APIResponse['rateLimit'] {
    const rateLimit: APIResponse['rateLimit'] = {
      limit: 0,
      remaining: 0,
      reset: 0
    };

    // Check common rate limit header patterns
    const limitHeaders = ['x-ratelimit-limit', 'x-rate-limit-limit', 'ratelimit-limit'];
    const remainingHeaders = ['x-ratelimit-remaining', 'x-rate-limit-remaining', 'ratelimit-remaining'];
    const resetHeaders = ['x-ratelimit-reset', 'x-rate-limit-reset', 'ratelimit-reset'];

    for (const header of limitHeaders) {
      if (headers[header]) {
        rateLimit.limit = parseInt(headers[header], 10) || 0;
        break;
      }
    }

    for (const header of remainingHeaders) {
      if (headers[header]) {
        rateLimit.remaining = parseInt(headers[header], 10) || 0;
        break;
      }
    }

    for (const header of resetHeaders) {
      if (headers[header]) {
        const reset = parseInt(headers[header], 10);
        rateLimit.reset = reset > 1000000000 ? reset : reset * 1000; // Convert to timestamp if needed
        break;
      }
    }

    return rateLimit.limit > 0 ? rateLimit : undefined;
  }

  /**
   * Cache response data
   */
  private cacheResponse(url: string, data: unknown, ttlMs: number): void {
    this.responseCache.set(url, {
      data,
      timestamp: Date.now() + ttlMs
    });

    // Clean up expired entries
    this.cleanupCache();
  }

  /**
   * Get cached response
   */
  public getCachedResponse(url: string): unknown | null {
    const cached = this.responseCache.get(url);
    
    if (!cached) {
      return null;
    }
    
    if (Date.now() > cached.timestamp) {
      this.responseCache.delete(url);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    for (const [url, cached] of this.responseCache.entries()) {
      if (now > cached.timestamp) {
        this.responseCache.delete(url);
      }
    }
  }

  /**
   * Clear response cache
   */
  public clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Check if response indicates an error condition
   */
  public isErrorResponse(response: APIResponse): boolean {
    return response.status >= 400 || 
           (response.data && typeof response.data === 'object' && 
            'error' in (response.data as Record<string, unknown>));
  }

  /**
   * Extract error message from response
   */
  public extractErrorMessage(response: APIResponse): string {
    if (response.status >= 400) {
      return `HTTP ${response.status}`;
    }
    
    if (response.data && typeof response.data === 'object') {
      const dataObj = response.data as Record<string, unknown>;
      
      // Try common error message fields
      for (const field of ['error', 'message', 'errorMessage', 'error_description']) {
        if (field in dataObj && typeof dataObj[field] === 'string') {
          return dataObj[field] as string;
        }
      }
    }
    
    return 'Unknown API error';
  }
}

/**
 * Global response validator instance
 */
export const responseValidator = new ResponseValidator();