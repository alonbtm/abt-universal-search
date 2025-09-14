/**
 * API Adapter - Enhanced REST and GraphQL API integration
 * @description Comprehensive API adapter with authentication, CORS, and rate limiting
 */

import { BaseDataSourceAdapter, type AdapterCapabilities } from './BaseAdapter';
import { authManager } from '../utils/AuthenticationManager';
import { requestTransformer } from '../utils/RequestTransformer';
import { responseValidator } from '../utils/ResponseValidator';
import { rateLimiterFactory } from '../utils/RateLimiter';
import { corsHandler } from '../utils/CORSHandler';
import type { APIDataSourceConfig } from '../types/Config';
import type {
  ProcessedQuery,
  Connection,
  RawResult,
  APIConnection,
  APIResponse,
  APIRequestConfig,
} from '../types/Results';
import { ValidationError } from '../utils/validation';

/**
 * Enhanced API adapter for REST and GraphQL endpoints
 */
export class APIAdapter extends BaseDataSourceAdapter {
  private readonly config: APIDataSourceConfig;
  private responseCache = new Map<string, { data: RawResult[]; expires: number }>();

  constructor(config?: unknown) {
    super('api');

    const apiConfig = config as APIDataSourceConfig;
    if (!apiConfig) {
      throw new ValidationError('APIAdapter requires configuration');
    }

    this.config = apiConfig;
    this.validateConfiguration();
  }

  /**
   * Connect to API endpoint
   */
  public async connect(config: APIDataSourceConfig): Promise<Connection> {
    await this.validateConfig(config);

    const connectionId = `api-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Initialize authentication
    let authHeaders: Record<string, string> = {};
    if (config.auth) {
      try {
        authHeaders = await authManager.getAuthHeaders(config.auth, config.url);
      } catch (error) {
        throw this.createError(
          `Authentication failed: ${(error as Error).message}`,
          'security',
          'AUTH_FAILED',
          error as Error
        );
      }
    }

    // Initialize rate limiter if configured
    let rateLimiter;
    if (config.rateLimit) {
      rateLimiter = rateLimiterFactory.getLimiter(config.url, config.rateLimit);
    }

    // Validate CORS configuration
    if (config.cors?.enabled) {
      corsHandler.validateCORSConfig(config.cors);
    }

    // Create API-specific connection
    const connection: APIConnection = {
      ...this.createConnection(connectionId, {
        endpoint: config.url,
        method: config.method || 'GET',
        authType: config.auth?.type || 'none',
      }),
      baseURL: config.url,
      defaultHeaders: { ...authHeaders, ...config.headers },
      auth: config.auth
        ? {
            type: config.auth.type,
            token: config.auth.bearer?.token || config.auth.apiKey?.key,
            expiresAt: config.auth.bearer?.expiresAt,
          }
        : undefined,
      rateLimiter: rateLimiter
        ? {
            remainingRequests: rateLimiter.getStatus().remaining,
            resetTime: rateLimiter.getStatus().reset,
            windowStart: rateLimiter.getStatus().windowStart,
          }
        : undefined,
      corsMode: 'cors', // Will be determined during first request
    };

    this.updateConnectionStatus(connectionId, 'connected');
    return connection;
  }

  /**
   * Execute API search query
   */
  public async query(connection: Connection, query: ProcessedQuery): Promise<RawResult[]> {
    const apiConnection = connection as APIConnection;

    return this.executeWithMetrics(
      connection.id,
      async () => {
        // Check cache first
        const cacheKey = this.getCacheKey(apiConnection, query);
        if (this.config.response?.cache?.enabled) {
          const cached = this.getCachedResults(cacheKey);
          if (cached) {
            return cached;
          }
        }

        // Handle rate limiting
        if (apiConnection.rateLimiter && this.config.rateLimit) {
          const limiter = rateLimiterFactory.getLimiter(
            apiConnection.baseURL,
            this.config.rateLimit
          );
          await limiter.waitForPermission();

          // Update connection rate limit status
          const status = limiter.getStatus();
          apiConnection.rateLimiter = {
            remainingRequests: status.remaining,
            resetTime: status.reset,
            windowStart: status.windowStart,
          };
        }

        // Transform request
        const requestConfig = requestTransformer.transformRequest(
          query,
          this.config,
          apiConnection.defaultHeaders
        );

        // Handle CORS if enabled
        let finalConfig = requestConfig;
        let requestMode: 'cors' | 'jsonp' | 'proxy' = 'cors';

        if (this.config.cors?.enabled) {
          const corsResult = await corsHandler.determineRequestMethod(this.config, requestConfig);
          finalConfig = corsResult.config;
          requestMode = corsResult.mode;
          apiConnection.corsMode = requestMode;
        }

        // Execute request with appropriate method
        let apiResponse: APIResponse;
        try {
          if (requestMode === 'jsonp') {
            apiResponse = await corsHandler.executeJSONPRequest(finalConfig);
          } else if (requestMode === 'proxy') {
            apiResponse = await corsHandler.executeProxyRequest(finalConfig);
          } else {
            apiResponse = await this.executeStandardRequest(finalConfig);
          }
        } catch (error) {
          // Try CORS fallback if enabled
          if (this.config.cors?.autoFallback && corsHandler.isCORSError(error as Error)) {
            apiResponse = await corsHandler.handleCORSError(
              requestConfig,
              this.config,
              error as Error
            );
          } else {
            throw this.createError(
              `API request failed: ${(error as Error).message}`,
              'network',
              'REQUEST_FAILED',
              error as Error,
              { query: query.original }
            );
          }
        }

        // Handle rate limit updates from response
        if (apiResponse.rateLimit && this.config.rateLimit) {
          const limiter = rateLimiterFactory.getLimiter(
            apiConnection.baseURL,
            this.config.rateLimit
          );
          limiter.updateFromHeaders({
            'x-ratelimit-limit': apiResponse.rateLimit.limit.toString(),
            'x-ratelimit-remaining': apiResponse.rateLimit.remaining.toString(),
            'x-ratelimit-reset': apiResponse.rateLimit.reset.toString(),
          });
        }

        // Validate and parse response
        const validatedResponse = await responseValidator.validateResponse(
          this.createMockResponse(apiResponse),
          this.config.response
        );

        // Check for API errors
        if (responseValidator.isErrorResponse(validatedResponse)) {
          const errorMessage = responseValidator.extractErrorMessage(validatedResponse);
          throw this.createError(`API error: ${errorMessage}`, 'adapter', 'API_ERROR', undefined, {
            query: query.original,
          });
        }

        // Transform to search results
        const results = responseValidator.transformToResults(
          validatedResponse.data,
          this.config.response
        );

        // Cache results if enabled
        if (this.config.response?.cache?.enabled && results.length > 0) {
          this.cacheResults(cacheKey, results, this.config.response.cache.ttlMs);
        }

        return results;
      },
      'query'
    );
  }

  /**
   * Disconnect from API (cleanup resources)
   */
  public async disconnect(connection: Connection): Promise<void> {
    const apiConnection = connection as APIConnection;

    // Clear authentication tokens
    if (this.config.auth) {
      authManager.clearTokenCache();
    }

    // Clear rate limiter
    if (apiConnection.rateLimiter) {
      rateLimiterFactory.removeLimiter(apiConnection.baseURL);
    }

    this.updateConnectionStatus(connection.id, 'disconnected');
    this.removeConnection(connection.id);
  }

  /**
   * Validate API configuration
   */
  public async validateConfig(config: any): Promise<void> {
    const apiConfig = config as APIDataSourceConfig;

    if (apiConfig.type !== 'api') {
      throw new ValidationError('Configuration type must be "api"');
    }

    if (!apiConfig.url || typeof apiConfig.url !== 'string') {
      throw new ValidationError('API URL is required and must be a string', 'url');
    }

    try {
      new URL(apiConfig.url);
    } catch (error) {
      throw new ValidationError('Invalid API URL format', 'url');
    }

    if (apiConfig.method && !['GET', 'POST', 'PUT', 'DELETE'].includes(apiConfig.method)) {
      throw new ValidationError('Invalid HTTP method', 'method');
    }

    // Validate authentication configuration
    if (apiConfig.auth) {
      this.validateAuthConfig(apiConfig.auth);
    }

    // Validate request transformation configuration
    if (apiConfig.requestTransform) {
      requestTransformer.validateTransformConfig(apiConfig.requestTransform);
    }

    // Validate CORS configuration
    if (apiConfig.cors?.enabled) {
      corsHandler.validateCORSConfig(apiConfig.cors);
    }

    // Validate rate limiting configuration
    if (apiConfig.rateLimit) {
      this.validateRateLimitConfig(apiConfig.rateLimit);
    }
  }

  /**
   * Get adapter capabilities
   */
  public getCapabilities(): AdapterCapabilities {
    return {
      supportsPooling: true,
      supportsRealTime: false,
      supportsPagination: true,
      supportsSorting: false,
      supportsFiltering: true,
      maxConcurrentConnections: this.config.rateLimit?.requestsPerSecond || 10,
      supportedQueryTypes: ['text', 'partial', 'exact', 'graphql'],
    };
  }

  /**
   * Execute standard HTTP request
   */
  private async executeStandardRequest(requestConfig: APIRequestConfig): Promise<APIResponse> {
    const startTime = performance.now();

    const fetchOptions: RequestInit = {
      method: requestConfig.method,
      headers: requestConfig.headers,
    };

    if (requestConfig.body) {
      fetchOptions.body = String(requestConfig.body);
    }

    if (requestConfig.timeout) {
      fetchOptions.signal = AbortSignal.timeout(requestConfig.timeout);
    }

    const response = await fetch(requestConfig.url, fetchOptions);

    // Track response time for potential future use
    performance.now() - startTime;

    return responseValidator.validateResponse(response, this.config.response);
  }

  /**
   * Create mock Response object for validation
   */
  private createMockResponse(apiResponse: APIResponse): Response {
    return {
      ok: apiResponse.status >= 200 && apiResponse.status < 300,
      status: apiResponse.status,
      statusText: this.getStatusText(apiResponse.status),
      headers: new Headers(apiResponse.headers),
      json: async () => apiResponse.data,
      text: async () => JSON.stringify(apiResponse.data),
    } as Response;
  }

  /**
   * Get HTTP status text
   */
  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return statusTexts[status] || 'Unknown';
  }

  /**
   * Validate authentication configuration
   */
  private validateAuthConfig(auth: any): void {
    if (!['none', 'apikey', 'bearer', 'oauth2', 'basic'].includes(auth.type)) {
      throw new ValidationError('Invalid authentication type');
    }

    switch (auth.type) {
      case 'apikey':
        if (!auth.apiKey?.key) {
          throw new ValidationError('API key is required for apikey authentication');
        }
        break;
      case 'bearer':
        if (!auth.bearer?.token) {
          throw new ValidationError('Bearer token is required for bearer authentication');
        }
        break;
      case 'oauth2':
        if (!auth.oauth2?.clientId || !auth.oauth2?.tokenUrl) {
          throw new ValidationError('Client ID and token URL are required for OAuth2');
        }
        break;
      case 'basic':
        if (!auth.basic?.username || !auth.basic?.password) {
          throw new ValidationError('Username and password are required for basic authentication');
        }
        break;
    }
  }

  /**
   * Validate rate limit configuration
   */
  private validateRateLimitConfig(rateLimit: any): void {
    if (!rateLimit.requestsPerMinute || rateLimit.requestsPerMinute <= 0) {
      throw new ValidationError('Requests per minute must be a positive number');
    }

    if (rateLimit.queueSize && rateLimit.queueSize < 0) {
      throw new ValidationError('Queue size must be non-negative');
    }

    if (
      rateLimit.backoffStrategy &&
      !['exponential', 'linear', 'fixed'].includes(rateLimit.backoffStrategy)
    ) {
      throw new ValidationError('Invalid backoff strategy');
    }
  }

  /**
   * Get cache key for request
   */
  private getCacheKey(connection: APIConnection, query: ProcessedQuery): string {
    const key = {
      url: connection.baseURL,
      query: query.normalized,
      headers: connection.defaultHeaders,
    };
    return btoa(JSON.stringify(key));
  }

  /**
   * Get cached results
   */
  private getCachedResults(cacheKey: string): RawResult[] | null {
    const cached = this.responseCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expires) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Cache results
   */
  private cacheResults(cacheKey: string, results: RawResult[], ttlMs: number): void {
    this.responseCache.set(cacheKey, {
      data: results,
      expires: Date.now() + ttlMs,
    });

    // Limit cache size
    if (this.responseCache.size > 100) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }
  }

  /**
   * Validate initial configuration
   */
  private validateConfiguration(): void {
    if (!this.config.url) {
      throw new ValidationError('API URL is required');
    }

    try {
      new URL(this.config.url);
    } catch (error) {
      throw new ValidationError('Invalid API URL format');
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): APIDataSourceConfig {
    return { ...this.config };
  }

  /**
   * Clear response cache
   */
  public clearCache(): void {
    this.responseCache.clear();
  }
}

/**
 * API adapter configuration type export
 */
export type APIAdapterConfig = APIDataSourceConfig;
