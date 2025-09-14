/**
 * APIAdapter Unit Tests
 * Tests for the comprehensive API adapter functionality
 */

import { APIAdapter, type APIAdapterConfig } from '../../src/adapters/APIAdapter';
import { ValidationError } from '../../src/utils/validation';
import type { ProcessedQuery } from '../../src/types/Results';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock utilities
jest.mock('../../src/utils/AuthenticationManager', () => ({
  authManager: {
    getAuthHeaders: jest.fn().mockResolvedValue({}),
    clearTokenCache: jest.fn()
  }
}));

jest.mock('../../src/utils/RateLimiter', () => ({
  rateLimiterFactory: {
    getLimiter: jest.fn().mockReturnValue({
      waitForPermission: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue({
        remaining: 100,
        limit: 1000,
        reset: Date.now() + 60000,
        windowStart: Date.now(),
        shouldQueue: false
      }),
      updateFromHeaders: jest.fn()
    }),
    removeLimiter: jest.fn()
  }
}));

jest.mock('../../src/utils/CORSHandler', () => ({
  corsHandler: {
    validateCORSConfig: jest.fn(),
    determineRequestMethod: jest.fn().mockResolvedValue({
      config: { url: 'test', method: 'GET', headers: {} },
      mode: 'cors'
    }),
    executeJSONPRequest: jest.fn(),
    executeProxyRequest: jest.fn(),
    isCORSError: jest.fn().mockReturnValue(false),
    handleCORSError: jest.fn()
  }
}));

jest.mock('../../src/utils/RequestTransformer', () => ({
  requestTransformer: {
    transformRequest: jest.fn().mockReturnValue({
      url: 'https://api.example.com/search?q=test',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }),
    validateTransformConfig: jest.fn()
  }
}));

jest.mock('../../src/utils/ResponseValidator', () => ({
  responseValidator: {
    validateResponse: jest.fn().mockResolvedValue({
      data: { results: [{ id: 1, title: 'Test' }] },
      status: 200,
      headers: {},
      responseTime: 100
    }),
    transformToResults: jest.fn().mockReturnValue([
      {
        id: '1',
        data: { title: 'Test Result' },
        score: 1.0,
        matchedFields: [],
        metadata: { source: 'api' }
      }
    ]),
    isErrorResponse: jest.fn().mockReturnValue(false),
    extractErrorMessage: jest.fn().mockReturnValue('')
  }
}));

describe('APIAdapter', () => {
  const basicConfig: APIAdapterConfig = {
    type: 'api',
    url: 'https://api.example.com/search'
  };

  const sampleQuery: ProcessedQuery = {
    original: 'test query',
    normalized: 'test query',
    terms: ['test', 'query'],
    filters: [],
    metadata: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Constructor', () => {
    it('should create adapter with valid configuration', () => {
      const adapter = new APIAdapter(basicConfig);
      expect(adapter).toBeInstanceOf(APIAdapter);
      expect(adapter.getConfig()).toEqual(basicConfig);
    });

    it('should throw ValidationError for missing configuration', () => {
      expect(() => {
        new APIAdapter();
      }).toThrow(ValidationError);
      expect(() => {
        new APIAdapter();
      }).toThrow('APIAdapter requires configuration');
    });

    it('should throw ValidationError for invalid URL', () => {
      expect(() => {
        new APIAdapter({ type: 'api', url: 'invalid-url' });
      }).toThrow(ValidationError);
    });

    it('should validate configuration on creation', () => {
      const validConfig: APIAdapterConfig = {
        type: 'api',
        url: 'https://api.example.com',
        method: 'POST',
        headers: { 'Custom-Header': 'value' }
      };
      
      const adapter = new APIAdapter(validConfig);
      expect(adapter.getConfig().method).toBe('POST');
      expect(adapter.getConfig().headers).toEqual({ 'Custom-Header': 'value' });
    });
  });

  describe('Connection Management', () => {
    it('should establish connection with basic configuration', async () => {
      const adapter = new APIAdapter(basicConfig);
      const connection = await adapter.connect(basicConfig);
      
      expect(connection).toBeDefined();
      expect(connection.id).toMatch(/^api-/);
      expect(connection.adapterType).toBe('api');
      expect(connection.status).toBe('connecting');
    });

    it('should establish connection with authentication', async () => {
      const configWithAuth: APIAdapterConfig = {
        ...basicConfig,
        auth: {
          type: 'bearer',
          bearer: { token: 'test-token' }
        }
      };

      const adapter = new APIAdapter(configWithAuth);
      const connection = await adapter.connect(configWithAuth);
      
      expect(connection).toBeDefined();
      expect(connection.status).toBe('connecting');
    });

    it('should establish connection with rate limiting', async () => {
      const configWithRateLimit: APIAdapterConfig = {
        ...basicConfig,
        rateLimit: {
          requestsPerMinute: 60,
          queueSize: 10
        }
      };

      const adapter = new APIAdapter(configWithRateLimit);
      const connection = await adapter.connect(configWithRateLimit);
      
      expect(connection).toBeDefined();
      expect((connection as any).rateLimiter).toBeDefined();
    });

    it('should disconnect and cleanup resources', async () => {
      const adapter = new APIAdapter(basicConfig);
      const connection = await adapter.connect(basicConfig);
      
      await adapter.disconnect(connection);
      // Check that connection is removed from adapter's tracking
      const trackedConnection = adapter.getConnection(connection.id);
      expect(trackedConnection).toBeUndefined();
    });
  });

  describe('Query Execution', () => {
    it('should execute basic GET request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ results: [{ id: 1, title: 'Test' }] })
      } as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new APIAdapter(basicConfig);
      const connection = await adapter.connect(basicConfig);
      const results = await adapter.query(connection, sampleQuery);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should execute POST request with body', async () => {
      const postConfig: APIAdapterConfig = {
        ...basicConfig,
        method: 'POST',
        requestTransform: {
          queryMapping: { field: 'search' }
        }
      };

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ data: [{ id: 1, title: 'Test' }] })
      } as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new APIAdapter(postConfig);
      const connection = await adapter.connect(postConfig);
      const results = await adapter.query(connection, sampleQuery);

      expect(results).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle rate limiting', async () => {
      const configWithRateLimit: APIAdapterConfig = {
        ...basicConfig,
        rateLimit: {
          requestsPerMinute: 60
        }
      };

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'x-ratelimit-remaining': '99' }),
        json: async () => ({ results: [] })
      } as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new APIAdapter(configWithRateLimit);
      const connection = await adapter.connect(configWithRateLimit);
      const results = await adapter.query(connection, sampleQuery);

      expect(results).toBeDefined();
    });

    it('should handle authentication in requests', async () => {
      const configWithAuth: APIAdapterConfig = {
        ...basicConfig,
        auth: {
          type: 'apikey',
          apiKey: { key: 'test-api-key' }
        }
      };

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ results: [] })
      } as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new APIAdapter(configWithAuth);
      const connection = await adapter.connect(configWithAuth);
      const results = await adapter.query(connection, sampleQuery);

      expect(results).toBeDefined();
    });

    it('should cache responses when enabled', async () => {
      const configWithCache: APIAdapterConfig = {
        ...basicConfig,
        response: {
          cache: {
            enabled: true,
            ttlMs: 60000
          }
        }
      };

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ results: [{ id: 1, title: 'Cached' }] })
      } as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new APIAdapter(configWithCache);
      const connection = await adapter.connect(configWithCache);
      
      // First request
      const results1 = await adapter.query(connection, sampleQuery);
      expect(results1).toBeDefined();
      
      // Second request should use cache
      const results2 = await adapter.query(connection, sampleQuery);
      expect(results2).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const adapter = new APIAdapter(basicConfig);
      const connection = await adapter.connect(basicConfig);
      
      await expect(adapter.query(connection, sampleQuery))
        .rejects.toThrow('API request failed');
    });

    it('should handle HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: async () => ({ error: 'Not found' })
      } as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const { responseValidator } = require('../../src/utils/ResponseValidator');
      responseValidator.validateResponse.mockRejectedValue(new Error('HTTP 404: Not Found'));

      const adapter = new APIAdapter(basicConfig);
      const connection = await adapter.connect(basicConfig);
      
      await expect(adapter.query(connection, sampleQuery))
        .rejects.toThrow();
    });

    it('should handle authentication errors', async () => {
      const { authManager } = require('../../src/utils/AuthenticationManager');
      authManager.getAuthHeaders.mockRejectedValue(new Error('Auth failed'));

      const configWithAuth: APIAdapterConfig = {
        ...basicConfig,
        auth: {
          type: 'bearer',
          bearer: { token: 'invalid-token' }
        }
      };

      const adapter = new APIAdapter(configWithAuth);
      
      await expect(adapter.connect(configWithAuth))
        .rejects.toThrow('Authentication failed');
    });

    it('should handle CORS errors with fallback', async () => {
      const corsError = new Error('CORS error');
      mockFetch.mockRejectedValueOnce(corsError);

      const { corsHandler } = require('../../src/utils/CORSHandler');
      corsHandler.isCORSError.mockReturnValue(true);
      corsHandler.handleCORSError.mockResolvedValue({
        data: { results: [] },
        status: 200,
        headers: {},
        responseTime: 100
      });

      const { responseValidator } = require('../../src/utils/ResponseValidator');
      responseValidator.validateResponse.mockResolvedValue({
        data: { results: [] },
        status: 200,
        headers: {},
        responseTime: 100
      });

      const configWithCORS: APIAdapterConfig = {
        ...basicConfig,
        cors: {
          enabled: true,
          autoFallback: true,
          jsonpCallback: 'callback'
        }
      };

      const adapter = new APIAdapter(configWithCORS);
      const connection = await adapter.connect(configWithCORS);
      const results = await adapter.query(connection, sampleQuery);

      expect(results).toBeDefined();
      expect(corsHandler.handleCORSError).toHaveBeenCalled();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate basic configuration', async () => {
      const adapter = new APIAdapter(basicConfig);
      await expect(adapter.validateConfig(basicConfig)).resolves.not.toThrow();
    });

    it('should reject invalid configuration type', async () => {
      const adapter = new APIAdapter(basicConfig);
      await expect(adapter.validateConfig({ type: 'invalid', url: 'test' }))
        .rejects.toThrow('Configuration type must be "api"');
    });

    it('should reject missing URL', async () => {
      const adapter = new APIAdapter(basicConfig);
      await expect(adapter.validateConfig({ type: 'api' }))
        .rejects.toThrow('API URL is required');
    });

    it('should reject invalid URL format', async () => {
      const adapter = new APIAdapter(basicConfig);
      await expect(adapter.validateConfig({ type: 'api', url: 'not-a-url' }))
        .rejects.toThrow('Invalid API URL format');
    });

    it('should reject invalid HTTP method', async () => {
      const adapter = new APIAdapter(basicConfig);
      await expect(adapter.validateConfig({ 
        type: 'api', 
        url: 'https://example.com', 
        method: 'INVALID' as any 
      })).rejects.toThrow('Invalid HTTP method');
    });

    it('should validate authentication configuration', async () => {
      const adapter = new APIAdapter(basicConfig);
      
      // Valid auth config
      await expect(adapter.validateConfig({
        type: 'api',
        url: 'https://example.com',
        auth: {
          type: 'bearer',
          bearer: { token: 'test' }
        }
      })).resolves.not.toThrow();

      // Invalid auth config
      await expect(adapter.validateConfig({
        type: 'api',
        url: 'https://example.com',
        auth: {
          type: 'bearer'
        }
      })).rejects.toThrow('Bearer token is required');
    });

    it('should validate rate limit configuration', async () => {
      const adapter = new APIAdapter(basicConfig);
      
      await expect(adapter.validateConfig({
        type: 'api',
        url: 'https://example.com',
        rateLimit: {
          requestsPerMinute: -1
        }
      })).rejects.toThrow('Requests per minute must be a positive number');
    });
  });

  describe('Capabilities', () => {
    it('should return correct adapter capabilities', () => {
      const adapter = new APIAdapter(basicConfig);
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities).toEqual({
        supportsPooling: true,
        supportsRealTime: false,
        supportsPagination: true,
        supportsSorting: false,
        supportsFiltering: true,
        maxConcurrentConnections: 10,
        supportedQueryTypes: ['text', 'partial', 'exact', 'graphql']
      });
    });

    it('should adjust max concurrent connections based on rate limit', () => {
      const configWithRateLimit: APIAdapterConfig = {
        ...basicConfig,
        rateLimit: {
          requestsPerMinute: 120,
          requestsPerSecond: 5
        }
      };

      const adapter = new APIAdapter(configWithRateLimit);
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities.maxConcurrentConnections).toBe(5);
    });
  });

  describe('Cache Management', () => {
    it('should clear response cache', () => {
      const adapter = new APIAdapter(basicConfig);
      adapter.clearCache();
      // No error should be thrown
    });
  });

  describe('GraphQL Support', () => {
    it('should handle GraphQL requests', async () => {
      const graphqlConfig: APIAdapterConfig = {
        ...basicConfig,
        method: 'POST',
        requestTransform: {
          graphql: {
            query: 'query Search($query: String!) { search(query: $query) { id title } }',
            variables: { limit: 10 }
          }
        }
      };

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ data: { search: [{ id: 1, title: 'GraphQL Result' }] } })
      } as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new APIAdapter(graphqlConfig);
      const connection = await adapter.connect(graphqlConfig);
      const results = await adapter.query(connection, sampleQuery);

      expect(results).toBeDefined();
    });
  });

  describe('Custom Headers and Parameters', () => {
    it('should handle custom headers', async () => {
      const configWithHeaders: APIAdapterConfig = {
        ...basicConfig,
        headers: { 'X-Custom-Header': 'test-value' },
        requestTransform: {
          dynamicHeaders: {
            'X-Request-ID': '{{uuid}}'
          }
        }
      };

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ results: [] })
      } as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new APIAdapter(configWithHeaders);
      const connection = await adapter.connect(configWithHeaders);
      const results = await adapter.query(connection, sampleQuery);

      expect(results).toBeDefined();
    });

    it('should handle additional parameters', async () => {
      const configWithParams: APIAdapterConfig = {
        ...basicConfig,
        requestTransform: {
          additionalParams: {
            format: 'json',
            limit: 20
          }
        }
      };

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ results: [] })
      } as Response;

      mockFetch.mockResolvedValue(mockResponse);

      const adapter = new APIAdapter(configWithParams);
      const connection = await adapter.connect(configWithParams);
      const results = await adapter.query(connection, sampleQuery);

      expect(results).toBeDefined();
    });
  });
});