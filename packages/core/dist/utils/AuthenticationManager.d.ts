/**
 * Authentication Manager - Handles all API authentication flows
 * @description Manages authentication tokens, OAuth2 flows, and credential refresh
 */
import type { AuthConfig, AuthToken } from '../types/Config';
/**
 * Authentication manager for API requests
 */
export declare class AuthenticationManager {
    private tokenCache;
    private refreshPromises;
    /**
     * Get authentication headers for a request
     */
    getAuthHeaders(config: AuthConfig, baseUrl: string): Promise<Record<string, string>>;
    /**
     * Get API key authentication headers
     */
    private getApiKeyHeaders;
    /**
     * Get bearer token authentication headers
     */
    private getBearerHeaders;
    /**
     * Get OAuth2 authentication headers
     */
    private getOAuth2Headers;
    /**
     * Get basic authentication headers
     */
    private getBasicHeaders;
    /**
     * Check if a token is expired
     */
    private isTokenExpired;
    /**
     * Refresh a bearer token
     */
    private refreshBearerToken;
    /**
     * Perform the actual token refresh request
     */
    private performTokenRefresh;
    /**
     * Get OAuth2 token using configured grant type
     */
    private getOAuth2Token;
    /**
     * Perform OAuth2 token request
     */
    private performOAuth2Request;
    /**
     * Generate cache key for token storage
     */
    private getTokenCacheKey;
    /**
     * Resolve relative URLs against base URL
     */
    private resolveUrl;
    /**
     * Clear cached tokens
     */
    clearTokenCache(): void;
    /**
     * Get cached token for debugging
     */
    getCachedToken(config: AuthConfig, baseUrl: string): AuthToken | undefined;
    /**
     * Manually set a token in cache
     */
    setCachedToken(config: AuthConfig, baseUrl: string, token: AuthToken): void;
}
/**
 * Global authentication manager instance
 */
export declare const authManager: AuthenticationManager;
//# sourceMappingURL=AuthenticationManager.d.ts.map