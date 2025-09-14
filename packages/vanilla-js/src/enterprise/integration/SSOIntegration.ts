interface SSOConfig {
    provider: 'saml' | 'oauth2' | 'oidc' | 'ldap' | 'azure-ad' | 'okta' | 'auth0';
    clientId: string;
    clientSecret?: string;
    issuer?: string;
    discoveryUrl?: string;
    endpoints: {
        authorization?: string;
        token?: string;
        userInfo?: string;
        logout?: string;
        jwks?: string;
    };
    scopes: string[];
    claims: {
        sub: string;
        email: string;
        name: string;
        roles?: string;
        groups?: string;
    };
    options: {
        autoRefresh: boolean;
        tokenStorage: 'session' | 'local' | 'memory';
        loginRedirect: string;
        logoutRedirect: string;
        errorRedirect: string;
    };
}

interface SSOUser {
    id: string;
    email: string;
    name: string;
    roles: string[];
    groups: string[];
    attributes: Record<string, any>;
    provider: string;
    providerData: Record<string, any>;
    lastLogin: Date;
    tokenInfo: {
        accessToken: string;
        refreshToken?: string;
        idToken?: string;
        expiresAt: Date;
        scope: string[];
    };
}

interface SSOSession {
    sessionId: string;
    userId: string;
    provider: string;
    createdAt: Date;
    lastActivity: Date;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
    active: boolean;
}

interface TokenValidationResult {
    valid: boolean;
    expired: boolean;
    user?: SSOUser;
    error?: string;
    remainingTime?: number;
}

export class SSOIntegration {
    private config: SSOConfig;
    private sessions = new Map<string, SSOSession>();
    private users = new Map<string, SSOUser>();
    private tokenCache = new Map<string, { user: SSOUser; expires: Date }>();
    private loginCallbacks = new Map<string, (user: SSOUser) => void>();

    constructor(config: SSOConfig) {
        this.config = config;
        this.initializeSSO();
    }

    private initializeSSO(): void {
        this.setupEventHandlers();
        this.startTokenRefreshTimer();
        this.loadExistingSessions();
    }

    private setupEventHandlers(): void {
        if (typeof window !== 'undefined') {
            // Handle OAuth callback
            window.addEventListener('message', (event) => {
                if (event.data?.type === 'oauth_callback') {
                    this.handleOAuthCallback(event.data.code, event.data.state);
                }
            });

            // Handle storage events for session synchronization
            window.addEventListener('storage', (event) => {
                if (event.key === 'sso_session') {
                    this.syncSessionFromStorage();
                }
            });
        }
    }

    private startTokenRefreshTimer(): void {
        if (this.config.options.autoRefresh) {
            setInterval(() => {
                this.refreshExpiredTokens();
            }, 60000); // Check every minute
        }
    }

    private loadExistingSessions(): void {
        if (typeof window !== 'undefined' && this.config.options.tokenStorage !== 'memory') {
            const storage = this.config.options.tokenStorage === 'local' ? localStorage : sessionStorage;
            const sessionData = storage.getItem('sso_session');

            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    if (new Date(session.expiresAt) > new Date()) {
                        this.sessions.set(session.sessionId, {
                            ...session,
                            createdAt: new Date(session.createdAt),
                            lastActivity: new Date(session.lastActivity),
                            expiresAt: new Date(session.expiresAt)
                        });
                    }
                } catch (error) {
                    console.error('Failed to load SSO session:', error);
                    storage.removeItem('sso_session');
                }
            }
        }
    }

    async login(redirectUri?: string): Promise<void> {
        const state = this.generateState();
        const nonce = this.generateNonce();

        // Store state and redirect URI for validation
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('sso_state', state);
            sessionStorage.setItem('sso_nonce', nonce);
            if (redirectUri) {
                sessionStorage.setItem('sso_redirect', redirectUri);
            }
        }

        const authUrl = await this.buildAuthorizationUrl(state, nonce);

        if (typeof window !== 'undefined') {
            window.location.href = authUrl;
        } else {
            throw new Error('Browser environment required for SSO login');
        }
    }

    private async buildAuthorizationUrl(state: string, nonce: string): Promise<string> {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            response_type: this.config.provider === 'saml' ? 'POST' : 'code',
            scope: this.config.scopes.join(' '),
            state,
            redirect_uri: this.getRedirectUri()
        });

        if (this.config.provider === 'oidc') {
            params.append('nonce', nonce);
        }

        let authEndpoint = this.config.endpoints.authorization;

        if (!authEndpoint && this.config.discoveryUrl) {
            try {
                const discovery = await this.fetchDiscoveryDocument();
                authEndpoint = discovery.authorization_endpoint;
            } catch (error) {
                throw new Error('Failed to discover authorization endpoint');
            }
        }

        if (!authEndpoint) {
            throw new Error('Authorization endpoint not configured');
        }

        return `${authEndpoint}?${params.toString()}`;
    }

    private async fetchDiscoveryDocument(): Promise<any> {
        if (!this.config.discoveryUrl) {
            throw new Error('Discovery URL not configured');
        }

        const response = await fetch(this.config.discoveryUrl);
        if (!response.ok) {
            throw new Error(`Discovery request failed: ${response.status}`);
        }

        return await response.json();
    }

    private getRedirectUri(): string {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/auth/callback`;
        }
        return 'http://localhost:3000/auth/callback';
    }

    async handleCallback(code: string, state: string): Promise<SSOUser> {
        // Validate state parameter
        if (typeof sessionStorage !== 'undefined') {
            const storedState = sessionStorage.getItem('sso_state');
            if (storedState !== state) {
                throw new Error('Invalid state parameter');
            }
            sessionStorage.removeItem('sso_state');
        }

        // Exchange code for tokens
        const tokens = await this.exchangeCodeForTokens(code);

        // Get user info
        const user = await this.getUserInfo(tokens.access_token);

        // Create session
        const session = await this.createSession(user, tokens);

        // Store session
        this.sessions.set(session.sessionId, session);
        this.users.set(user.id, user);
        this.persistSession(session);

        // Execute login callbacks
        this.executeLoginCallbacks(user);

        return user;
    }

    private async handleOAuthCallback(code: string, state: string): Promise<void> {
        try {
            const user = await this.handleCallback(code, state);

            // Redirect to original destination
            const redirectUri = sessionStorage?.getItem('sso_redirect') || this.config.options.loginRedirect;
            sessionStorage?.removeItem('sso_redirect');

            if (typeof window !== 'undefined') {
                window.location.href = redirectUri;
            }
        } catch (error) {
            console.error('OAuth callback error:', error);
            if (typeof window !== 'undefined') {
                window.location.href = this.config.options.errorRedirect;
            }
        }
    }

    private async exchangeCodeForTokens(code: string): Promise<any> {
        let tokenEndpoint = this.config.endpoints.token;

        if (!tokenEndpoint && this.config.discoveryUrl) {
            const discovery = await this.fetchDiscoveryDocument();
            tokenEndpoint = discovery.token_endpoint;
        }

        if (!tokenEndpoint) {
            throw new Error('Token endpoint not configured');
        }

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: this.getRedirectUri()
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token exchange failed: ${error}`);
        }

        return await response.json();
    }

    private async getUserInfo(accessToken: string): Promise<SSOUser> {
        let userInfoEndpoint = this.config.endpoints.userInfo;

        if (!userInfoEndpoint && this.config.discoveryUrl) {
            const discovery = await this.fetchDiscoveryDocument();
            userInfoEndpoint = discovery.userinfo_endpoint;
        }

        if (!userInfoEndpoint) {
            // Try to extract user info from ID token if available
            return this.getUserInfoFromToken(accessToken);
        }

        const response = await fetch(userInfoEndpoint, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`User info request failed: ${response.status}`);
        }

        const userInfo = await response.json();
        return this.mapUserInfo(userInfo);
    }

    private getUserInfoFromToken(token: string): SSOUser {
        try {
            // Decode JWT token (simplified - in production use proper JWT library)
            const payload = JSON.parse(atob(token.split('.')[1]));
            return this.mapUserInfo(payload);
        } catch (error) {
            throw new Error('Failed to extract user info from token');
        }
    }

    private mapUserInfo(userInfo: any): SSOUser {
        const claims = this.config.claims;

        return {
            id: userInfo[claims.sub] || userInfo.sub,
            email: userInfo[claims.email] || userInfo.email,
            name: userInfo[claims.name] || userInfo.name || userInfo.preferred_username,
            roles: this.extractArrayClaim(userInfo, claims.roles) || [],
            groups: this.extractArrayClaim(userInfo, claims.groups) || [],
            attributes: userInfo,
            provider: this.config.provider,
            providerData: userInfo,
            lastLogin: new Date(),
            tokenInfo: {
                accessToken: '', // Will be set by caller
                expiresAt: new Date(Date.now() + 3600 * 1000), // Default 1 hour
                scope: this.config.scopes
            }
        };
    }

    private extractArrayClaim(userInfo: any, claimPath?: string): string[] {
        if (!claimPath) return [];

        const value = claimPath.split('.').reduce((obj, key) => obj?.[key], userInfo);

        if (Array.isArray(value)) {
            return value;
        } else if (typeof value === 'string') {
            return value.split(',').map(v => v.trim());
        }

        return [];
    }

    private async createSession(user: SSOUser, tokens: any): Promise<SSOSession> {
        const sessionId = this.generateSessionId();
        const expiresAt = tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours default

        // Update user with token info
        user.tokenInfo = {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            idToken: tokens.id_token,
            expiresAt,
            scope: this.config.scopes
        };

        return {
            sessionId,
            userId: user.id,
            provider: this.config.provider,
            createdAt: new Date(),
            lastActivity: new Date(),
            expiresAt,
            active: true
        };
    }

    private persistSession(session: SSOSession): void {
        if (typeof window !== 'undefined' && this.config.options.tokenStorage !== 'memory') {
            const storage = this.config.options.tokenStorage === 'local' ? localStorage : sessionStorage;
            storage.setItem('sso_session', JSON.stringify(session));
        }
    }

    private syncSessionFromStorage(): void {
        if (typeof window !== 'undefined' && this.config.options.tokenStorage !== 'memory') {
            const storage = this.config.options.tokenStorage === 'local' ? localStorage : sessionStorage;
            const sessionData = storage.getItem('sso_session');

            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    this.sessions.set(session.sessionId, {
                        ...session,
                        createdAt: new Date(session.createdAt),
                        lastActivity: new Date(session.lastActivity),
                        expiresAt: new Date(session.expiresAt)
                    });
                } catch (error) {
                    console.error('Failed to sync session from storage:', error);
                }
            }
        }
    }

    async logout(sessionId?: string): Promise<void> {
        let session: SSOSession | undefined;

        if (sessionId) {
            session = this.sessions.get(sessionId);
        } else {
            // Find active session
            session = Array.from(this.sessions.values()).find(s => s.active);
        }

        if (session) {
            // Mark session as inactive
            session.active = false;

            // Remove from storage
            if (typeof window !== 'undefined' && this.config.options.tokenStorage !== 'memory') {
                const storage = this.config.options.tokenStorage === 'local' ? localStorage : sessionStorage;
                storage.removeItem('sso_session');
            }

            // Perform provider logout if configured
            if (this.config.endpoints.logout) {
                const user = this.users.get(session.userId);
                if (user?.tokenInfo.idToken) {
                    const logoutUrl = `${this.config.endpoints.logout}?id_token_hint=${user.tokenInfo.idToken}&post_logout_redirect_uri=${encodeURIComponent(this.config.options.logoutRedirect)}`;

                    if (typeof window !== 'undefined') {
                        window.location.href = logoutUrl;
                    }
                    return;
                }
            }

            // Local logout - redirect to logout page
            if (typeof window !== 'undefined') {
                window.location.href = this.config.options.logoutRedirect;
            }
        }
    }

    async validateToken(token: string): Promise<TokenValidationResult> {
        // Check cache first
        const cached = this.tokenCache.get(token);
        if (cached && cached.expires > new Date()) {
            return {
                valid: true,
                expired: false,
                user: cached.user,
                remainingTime: cached.expires.getTime() - Date.now()
            };
        }

        try {
            // Validate with provider if possible
            if (this.config.endpoints.userInfo) {
                const response = await fetch(this.config.endpoints.userInfo, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const userInfo = await response.json();
                    const user = this.mapUserInfo(userInfo);

                    // Cache result
                    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
                    this.tokenCache.set(token, { user, expires });

                    return {
                        valid: true,
                        expired: false,
                        user,
                        remainingTime: expires.getTime() - Date.now()
                    };
                } else if (response.status === 401) {
                    return { valid: false, expired: true, error: 'Token expired' };
                }
            }

            // Fallback to JWT validation for OIDC
            if (this.config.provider === 'oidc') {
                return this.validateJWTToken(token);
            }

            return { valid: false, expired: false, error: 'Unable to validate token' };

        } catch (error) {
            return { valid: false, expired: false, error: error instanceof Error ? error.message : 'Validation failed' };
        }
    }

    private validateJWTToken(token: string): TokenValidationResult {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                return { valid: false, expired: false, error: 'Invalid JWT format' };
            }

            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);

            if (payload.exp && payload.exp < now) {
                return { valid: false, expired: true, error: 'Token expired' };
            }

            if (payload.nbf && payload.nbf > now) {
                return { valid: false, expired: false, error: 'Token not yet valid' };
            }

            const user = this.mapUserInfo(payload);

            return {
                valid: true,
                expired: false,
                user,
                remainingTime: payload.exp ? (payload.exp * 1000 - Date.now()) : undefined
            };

        } catch (error) {
            return { valid: false, expired: false, error: 'JWT parsing failed' };
        }
    }

    async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
        let tokenEndpoint = this.config.endpoints.token;

        if (!tokenEndpoint && this.config.discoveryUrl) {
            const discovery = await this.fetchDiscoveryDocument();
            tokenEndpoint = discovery.token_endpoint;
        }

        if (!tokenEndpoint) {
            throw new Error('Token endpoint not configured');
        }

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token refresh failed: ${error}`);
        }

        const tokens = await response.json();
        return {
            accessToken: tokens.access_token,
            expiresIn: tokens.expires_in
        };
    }

    private async refreshExpiredTokens(): Promise<void> {
        for (const session of this.sessions.values()) {
            if (!session.active) continue;

            const user = this.users.get(session.userId);
            if (!user || !user.tokenInfo.refreshToken) continue;

            const now = new Date();
            const tokenExpiry = user.tokenInfo.expiresAt;
            const refreshWindow = 5 * 60 * 1000; // 5 minutes before expiry

            if (tokenExpiry.getTime() - now.getTime() < refreshWindow) {
                try {
                    const newTokens = await this.refreshToken(user.tokenInfo.refreshToken);

                    // Update user token info
                    user.tokenInfo.accessToken = newTokens.accessToken;
                    user.tokenInfo.expiresAt = new Date(now.getTime() + newTokens.expiresIn * 1000);

                    // Update session expiry
                    session.expiresAt = user.tokenInfo.expiresAt;
                    this.persistSession(session);

                } catch (error) {
                    console.error('Failed to refresh token:', error);

                    // Mark session as inactive
                    session.active = false;
                }
            }
        }
    }

    getCurrentUser(): SSOUser | null {
        const activeSession = Array.from(this.sessions.values()).find(s => s.active);
        return activeSession ? this.users.get(activeSession.userId) || null : null;
    }

    isAuthenticated(): boolean {
        const user = this.getCurrentUser();
        return user !== null && user.tokenInfo.expiresAt > new Date();
    }

    onLogin(callback: (user: SSOUser) => void): string {
        const callbackId = this.generateCallbackId();
        this.loginCallbacks.set(callbackId, callback);
        return callbackId;
    }

    removeLoginCallback(callbackId: string): void {
        this.loginCallbacks.delete(callbackId);
    }

    private executeLoginCallbacks(user: SSOUser): void {
        for (const callback of this.loginCallbacks.values()) {
            try {
                callback(user);
            } catch (error) {
                console.error('Login callback error:', error);
            }
        }
    }

    getActiveSessions(): SSOSession[] {
        return Array.from(this.sessions.values()).filter(s => s.active);
    }

    revokeSession(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.active = false;
            return true;
        }
        return false;
    }

    private generateState(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private generateNonce(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private generateSessionId(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(24)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private generateCallbackId(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(8)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Static factory methods for common providers
    static createAzureADConfig(tenantId: string, clientId: string, clientSecret: string): SSOConfig {
        return {
            provider: 'azure-ad',
            clientId,
            clientSecret,
            issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
            discoveryUrl: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid_configuration`,
            endpoints: {},
            scopes: ['openid', 'profile', 'email'],
            claims: {
                sub: 'oid',
                email: 'email',
                name: 'name',
                roles: 'roles',
                groups: 'groups'
            },
            options: {
                autoRefresh: true,
                tokenStorage: 'session',
                loginRedirect: '/',
                logoutRedirect: '/login',
                errorRedirect: '/error'
            }
        };
    }

    static createOktaConfig(domain: string, clientId: string, clientSecret: string): SSOConfig {
        return {
            provider: 'okta',
            clientId,
            clientSecret,
            issuer: `https://${domain}`,
            discoveryUrl: `https://${domain}/.well-known/openid_configuration`,
            endpoints: {},
            scopes: ['openid', 'profile', 'email'],
            claims: {
                sub: 'sub',
                email: 'email',
                name: 'name',
                groups: 'groups'
            },
            options: {
                autoRefresh: true,
                tokenStorage: 'session',
                loginRedirect: '/',
                logoutRedirect: '/login',
                errorRedirect: '/error'
            }
        };
    }
}