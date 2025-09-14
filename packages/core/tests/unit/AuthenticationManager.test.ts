/**
 * AuthenticationManager Unit Tests
 * Tests for API authentication flows and token management
 */

import { AuthenticationManager } from '../../src/utils/AuthenticationManager';
import type { AuthConfig } from '../../src/types/Config';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock btoa for Node.js environment
global.btoa = jest.fn((str: string) => Buffer.from(str).toString('base64'));

describe('AuthenticationManager', () => {
  let authManager: AuthenticationManager;

  beforeEach(() => {
    authManager = new AuthenticationManager();
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('API Key Authentication', () => {
    it('should generate API key headers with default header name', async () => {
      const config: AuthConfig = {
        type: 'apikey',
        apiKey: { key: 'test-api-key' }
      };

      const headers = await authManager.getAuthHeaders(config, 'https://api.example.com');
      
      expect(headers).toEqual({
        'X-API-Key': 'test-api-key'
      });
    });

    it('should generate API key headers with custom header name', async () => {
      const config: AuthConfig = {
        type: 'apikey',
        apiKey: { 
          key: 'test-api-key',
          header: 'Authorization'
        }
      };

      const headers = await authManager.getAuthHeaders(config, 'https://api.example.com');
      
      expect(headers).toEqual({
        'Authorization': 'test-api-key'
      });
    });

    it('should throw error for missing API key', async () => {
      const config: AuthConfig = {
        type: 'apikey',
        apiKey: { key: '' }
      };

      await expect(authManager.getAuthHeaders(config, 'https://api.example.com'))
        .rejects.toThrow('API key is required for apikey authentication');
    });
  });

  describe('Bearer Token Authentication', () => {
    it('should generate bearer token headers', async () => {
      const config: AuthConfig = {
        type: 'bearer',
        bearer: { token: 'test-bearer-token' }
      };

      const headers = await authManager.getAuthHeaders(config, 'https://api.example.com');
      
      expect(headers).toEqual({
        Authorization: 'Bearer test-bearer-token'
      });
    });

    it('should handle token refresh for expired tokens', async () => {
      const expiredTime = Date.now() - 60000; // 1 minute ago
      const config: AuthConfig = {
        type: 'bearer',
        bearer: { 
          token: 'expired-token',
          refreshToken: 'refresh-token',
          refreshUrl: '/auth/refresh',
          expiresAt: expiredTime
        }
      };

      const mockRefreshResponse = {
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          expires_in: 3600,
          refresh_token: 'new-refresh-token'
        })
      } as Response;

      mockFetch.mockResolvedValue(mockRefreshResponse);

      const headers = await authManager.getAuthHeaders(config, 'https://api.example.com');
      
      expect(headers).toEqual({
        Authorization: 'Bearer new-access-token'
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
    });

    it('should throw error for missing bearer token', async () => {
      const config: AuthConfig = {
        type: 'bearer',
        bearer: { token: '' }
      };

      await expect(authManager.getAuthHeaders(config, 'https://api.example.com'))
        .rejects.toThrow('Bearer token is required for bearer authentication');
    });

    it('should handle refresh token errors', async () => {
      const config: AuthConfig = {
        type: 'bearer',
        bearer: { 
          token: 'expired-token',
          refreshToken: 'invalid-refresh',
          refreshUrl: '/auth/refresh',
          expiresAt: Date.now() - 60000
        }
      };

      const mockErrorResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response;

      mockFetch.mockResolvedValue(mockErrorResponse);

      await expect(authManager.getAuthHeaders(config, 'https://api.example.com'))
        .rejects.toThrow('Token refresh failed: 401 Unauthorized');
    });
  });

  describe('Basic Authentication', () => {
    it('should generate basic auth headers', async () => {
      const config: AuthConfig = {
        type: 'basic',
        basic: {
          username: 'testuser',
          password: 'testpass'
        }
      };

      // Mock btoa to return expected base64
      (global.btoa as jest.Mock).mockReturnValue('dGVzdHVzZXI6dGVzdHBhc3M=');

      const headers = await authManager.getAuthHeaders(config, 'https://api.example.com');
      
      expect(headers).toEqual({
        Authorization: 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
      });
      expect(global.btoa).toHaveBeenCalledWith('testuser:testpass');
    });

    it('should throw error for missing credentials', async () => {
      const config: AuthConfig = {
        type: 'basic',
        basic: { username: 'test', password: '' }
      };

      await expect(authManager.getAuthHeaders(config, 'https://api.example.com'))
        .rejects.toThrow('Username and password are required for basic authentication');
    });
  });

  describe('OAuth2 Authentication', () => {
    it('should handle client credentials flow', async () => {
      const config: AuthConfig = {
        type: 'oauth2',
        oauth2: {
          clientId: 'test-client',
          clientSecret: 'test-secret',
          authUrl: 'https://auth.example.com/authorize',
          tokenUrl: 'https://auth.example.com/token',
          grantType: 'client_credentials',
          scopes: ['read', 'write']
        }
      };

      const mockTokenResponse = {
        ok: true,
        json: async () => ({
          accessToken: 'oauth2-access-token',
          tokenType: 'Bearer',
          expiresIn: 3600,
          scopes: ['read', 'write']
        })
      } as Response;

      mockFetch.mockResolvedValue(mockTokenResponse);

      const headers = await authManager.getAuthHeaders(config, 'https://api.example.com');
      
      expect(headers).toEqual({
        Authorization: 'Bearer oauth2-access-token'
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
    });

    it('should cache OAuth2 tokens', async () => {
      const config: AuthConfig = {
        type: 'oauth2',
        oauth2: {
          clientId: 'test-client',
          tokenUrl: 'https://auth.example.com/token',
          grantType: 'client_credentials'
        }
      };

      const mockTokenResponse = {
        ok: true,
        json: async () => ({
          accessToken: 'cached-token',
          tokenType: 'Bearer',
          expiresIn: 3600
        })
      } as Response;

      mockFetch.mockResolvedValue(mockTokenResponse);

      // First request
      const headers1 = await authManager.getAuthHeaders(config, 'https://api.example.com');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second request should use cached token
      const headers2 = await authManager.getAuthHeaders(config, 'https://api.example.com');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(headers1).toEqual(headers2);
    });

    it('should handle OAuth2 token errors', async () => {
      const config: AuthConfig = {
        type: 'oauth2',
        oauth2: {
          clientId: 'test-client',
          tokenUrl: 'https://auth.example.com/token',
          grantType: 'client_credentials'
        }
      };

      const mockErrorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      } as Response;

      mockFetch.mockResolvedValue(mockErrorResponse);

      await expect(authManager.getAuthHeaders(config, 'https://api.example.com'))
        .rejects.toThrow('OAuth2 token request failed: 400 Bad Request');
    });

    it('should reject unsupported grant types', async () => {
      const config: AuthConfig = {
        type: 'oauth2',
        oauth2: {
          clientId: 'test-client',
          tokenUrl: 'https://auth.example.com/token',
          grantType: 'authorization_code'
        }
      };

      await expect(authManager.getAuthHeaders(config, 'https://api.example.com'))
        .rejects.toThrow("OAuth2 grant type 'authorization_code' is not yet implemented");
    });
  });

  describe('No Authentication', () => {
    it('should return empty headers for no auth', async () => {
      const config: AuthConfig = { type: 'none' };
      const headers = await authManager.getAuthHeaders(config, 'https://api.example.com');
      
      expect(headers).toEqual({});
    });

    it('should return empty headers for undefined config', async () => {
      const headers = await authManager.getAuthHeaders(undefined as any, 'https://api.example.com');
      
      expect(headers).toEqual({});
    });
  });

  describe('Token Management', () => {
    it('should clear token cache', () => {
      authManager.clearTokenCache();
      // Should not throw error
    });

    it('should handle token expiration checks', async () => {
      const futureTime = Date.now() + 3600000; // 1 hour from now
      const config: AuthConfig = {
        type: 'bearer',
        bearer: { 
          token: 'valid-token',
          expiresAt: futureTime
        }
      };

      const headers = await authManager.getAuthHeaders(config, 'https://api.example.com');
      
      expect(headers).toEqual({
        Authorization: 'Bearer valid-token'
      });
    });

    it('should handle concurrent token refresh requests', async () => {
      const config: AuthConfig = {
        type: 'bearer',
        bearer: { 
          token: 'expired-token',
          refreshToken: 'refresh-token',
          refreshUrl: '/auth/refresh',
          expiresAt: Date.now() - 60000
        }
      };

      const mockRefreshResponse = {
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          expires_in: 3600
        })
      } as Response;

      mockFetch.mockResolvedValue(mockRefreshResponse);

      // Make concurrent requests
      const [headers1, headers2] = await Promise.all([
        authManager.getAuthHeaders(config, 'https://api.example.com'),
        authManager.getAuthHeaders(config, 'https://api.example.com')
      ]);

      // Should only make one refresh request
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(headers1).toEqual(headers2);
    });
  });

  describe('URL Resolution', () => {
    it('should resolve relative URLs against base URL', async () => {
      const config: AuthConfig = {
        type: 'bearer',
        bearer: { 
          token: 'expired-token',
          refreshToken: 'refresh-token',
          refreshUrl: 'auth/refresh',
          expiresAt: Date.now() - 60000
        }
      };

      const mockRefreshResponse = {
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          expires_in: 3600
        })
      } as Response;

      mockFetch.mockResolvedValue(mockRefreshResponse);

      await authManager.getAuthHeaders(config, 'https://api.example.com');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/refresh',
        expect.any(Object)
      );
    });

    it('should handle absolute URLs in refresh URL', async () => {
      const config: AuthConfig = {
        type: 'bearer',
        bearer: { 
          token: 'expired-token',
          refreshToken: 'refresh-token',
          refreshUrl: 'https://auth.separate.com/refresh',
          expiresAt: Date.now() - 60000
        }
      };

      const mockRefreshResponse = {
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          expires_in: 3600
        })
      } as Response;

      mockFetch.mockResolvedValue(mockRefreshResponse);

      await authManager.getAuthHeaders(config, 'https://api.example.com');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.separate.com/refresh',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported auth type', async () => {
      const config: AuthConfig = {
        type: 'unsupported' as any
      };

      await expect(authManager.getAuthHeaders(config, 'https://api.example.com'))
        .rejects.toThrow('Unsupported authentication type: unsupported');
    });
  });
});