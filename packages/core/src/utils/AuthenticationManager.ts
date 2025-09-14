/**
 * Authentication Manager - Handles all API authentication flows
 * @description Manages authentication tokens, OAuth2 flows, and credential refresh
 */

import type { AuthConfig, AuthToken, OAuth2Result } from '../types/Config';
import type { APIResponse } from '../types/Results';
import { ValidationError } from './validation';

/**
 * Authentication manager for API requests
 */
export class AuthenticationManager {
  private tokenCache = new Map<string, AuthToken>();
  private refreshPromises = new Map<string, Promise<AuthToken>>();

  /**
   * Get authentication headers for a request
   */
  public async getAuthHeaders(config: AuthConfig, baseUrl: string): Promise<Record<string, string>> {
    if (!config || config.type === 'none') {
      return {};
    }

    switch (config.type) {
      case 'apikey':
        return this.getApiKeyHeaders(config);
      case 'bearer':
        return await this.getBearerHeaders(config, baseUrl);
      case 'oauth2':
        return await this.getOAuth2Headers(config, baseUrl);
      case 'basic':
        return this.getBasicHeaders(config);
      default:
        throw new ValidationError(`Unsupported authentication type: ${(config as any).type}`);
    }
  }

  /**
   * Get API key authentication headers
   */
  private getApiKeyHeaders(config: AuthConfig): Record<string, string> {
    if (!config.apiKey?.key) {
      throw new ValidationError('API key is required for apikey authentication');
    }

    const headers: Record<string, string> = {};
    const headerName = config.apiKey.header || 'X-API-Key';
    headers[headerName] = config.apiKey.key;
    return headers;
  }

  /**
   * Get bearer token authentication headers
   */
  private async getBearerHeaders(config: AuthConfig, baseUrl: string): Promise<Record<string, string>> {
    if (!config.bearer?.token) {
      throw new ValidationError('Bearer token is required for bearer authentication');
    }

    let token = config.bearer.token;
    
    // Check if token needs refresh
    if (this.isTokenExpired(config.bearer)) {
      token = await this.refreshBearerToken(config, baseUrl);
    }

    return {
      Authorization: `Bearer ${token}`
    };
  }

  /**
   * Get OAuth2 authentication headers
   */
  private async getOAuth2Headers(config: AuthConfig, baseUrl: string): Promise<Record<string, string>> {
    if (!config.oauth2) {
      throw new ValidationError('OAuth2 configuration is required for oauth2 authentication');
    }

    const cacheKey = this.getTokenCacheKey(config, baseUrl);
    let token = this.tokenCache.get(cacheKey);

    // Check if we need to get or refresh the token
    if (!token || this.isTokenExpired(token)) {
      token = await this.getOAuth2Token(config, baseUrl);
      this.tokenCache.set(cacheKey, token);
    }

    return {
      Authorization: `${token.type} ${token.token}`
    };
  }

  /**
   * Get basic authentication headers
   */
  private getBasicHeaders(config: AuthConfig): Record<string, string> {
    if (!config.basic?.username || !config.basic?.password) {
      throw new ValidationError('Username and password are required for basic authentication');
    }

    const credentials = btoa(`${config.basic.username}:${config.basic.password}`);
    return {
      Authorization: `Basic ${credentials}`
    };
  }

  /**
   * Check if a token is expired
   */
  private isTokenExpired(tokenInfo: { expiresAt?: number }): boolean {
    if (!tokenInfo.expiresAt) {
      return false; // No expiration set
    }
    
    // Add 5 minute buffer before expiration
    const bufferMs = 5 * 60 * 1000;
    return Date.now() >= (tokenInfo.expiresAt - bufferMs);
  }

  /**
   * Refresh a bearer token
   */
  private async refreshBearerToken(config: AuthConfig, baseUrl: string): Promise<string> {
    if (!config.bearer?.refreshToken || !config.bearer?.refreshUrl) {
      throw new ValidationError('Refresh token and URL are required for token refresh');
    }

    const cacheKey = `refresh-${this.getTokenCacheKey(config, baseUrl)}`;
    
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromises.has(cacheKey)) {
      const token = await this.refreshPromises.get(cacheKey)!;
      return token.token;
    }

    const refreshPromise = this.performTokenRefresh(config, baseUrl);
    this.refreshPromises.set(cacheKey, refreshPromise);

    try {
      const token = await refreshPromise;
      return token.token;
    } finally {
      this.refreshPromises.delete(cacheKey);
    }
  }

  /**
   * Perform the actual token refresh request
   */
  private async performTokenRefresh(config: AuthConfig, baseUrl: string): Promise<AuthToken> {
    const refreshUrl = this.resolveUrl(config.bearer!.refreshUrl!, baseUrl);
    
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${config.bearer!.refreshToken}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: config.bearer!.refreshToken!
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      token: data.access_token,
      type: 'Bearer',
      expiresAt: data.expires_in ? Date.now() + (data.expires_in * 1000) : undefined,
      refreshToken: data.refresh_token || config.bearer!.refreshToken
    };
  }

  /**
   * Get OAuth2 token using configured grant type
   */
  private async getOAuth2Token(config: AuthConfig, baseUrl: string): Promise<AuthToken> {
    if (!config.oauth2) {
      throw new ValidationError('OAuth2 configuration is required');
    }

    const cacheKey = this.getTokenCacheKey(config, baseUrl);
    
    // Prevent multiple concurrent token requests
    if (this.refreshPromises.has(cacheKey)) {
      return await this.refreshPromises.get(cacheKey)!;
    }

    const tokenPromise = this.performOAuth2Request(config, baseUrl);
    this.refreshPromises.set(cacheKey, tokenPromise);

    try {
      return await tokenPromise;
    } finally {
      this.refreshPromises.delete(cacheKey);
    }
  }

  /**
   * Perform OAuth2 token request
   */
  private async performOAuth2Request(config: AuthConfig, baseUrl: string): Promise<AuthToken> {
    const oauth2Config = config.oauth2!;
    const tokenUrl = this.resolveUrl(oauth2Config.tokenUrl, baseUrl);

    let body: URLSearchParams;
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    if (oauth2Config.grantType === 'client_credentials') {
      body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: oauth2Config.clientId
      });

      if (oauth2Config.clientSecret) {
        body.append('client_secret', oauth2Config.clientSecret);
      }

      if (oauth2Config.scopes) {
        body.append('scope', oauth2Config.scopes.join(' '));
      }
    } else {
      throw new ValidationError(`OAuth2 grant type '${oauth2Config.grantType}' is not yet implemented`);
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data: OAuth2Result = await response.json();
    
    return {
      token: data.accessToken,
      type: data.tokenType || 'Bearer',
      expiresAt: data.expiresIn ? Date.now() + (data.expiresIn * 1000) : undefined,
      scopes: data.scopes
    };
  }

  /**
   * Generate cache key for token storage
   */
  private getTokenCacheKey(config: AuthConfig, baseUrl: string): string {
    const configHash = JSON.stringify({
      type: config.type,
      oauth2: config.oauth2 ? {
        clientId: config.oauth2.clientId,
        tokenUrl: config.oauth2.tokenUrl,
        scopes: config.oauth2.scopes
      } : undefined,
      bearer: config.bearer ? {
        refreshUrl: config.bearer.refreshUrl
      } : undefined
    });
    
    return `${baseUrl}-${btoa(configHash)}`;
  }

  /**
   * Resolve relative URLs against base URL
   */
  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  }

  /**
   * Clear cached tokens
   */
  public clearTokenCache(): void {
    this.tokenCache.clear();
    this.refreshPromises.clear();
  }

  /**
   * Get cached token for debugging
   */
  public getCachedToken(config: AuthConfig, baseUrl: string): AuthToken | undefined {
    return this.tokenCache.get(this.getTokenCacheKey(config, baseUrl));
  }

  /**
   * Manually set a token in cache
   */
  public setCachedToken(config: AuthConfig, baseUrl: string, token: AuthToken): void {
    this.tokenCache.set(this.getTokenCacheKey(config, baseUrl), token);
  }
}

/**
 * Global authentication manager instance
 */
export const authManager = new AuthenticationManager();