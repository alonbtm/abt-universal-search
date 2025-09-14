interface APIGatewayConfig {
    baseUrl: string;
    apiKey?: string;
    authentication: {
        type: 'none' | 'apikey' | 'oauth2' | 'jwt' | 'basic';
        credentials?: Record<string, string>;
    };
    rateLimit: {
        enabled: boolean;
        requests: number;
        window: number; // milliseconds
        strategy: 'fixed' | 'sliding' | 'token-bucket';
    };
    retry: {
        enabled: boolean;
        attempts: number;
        backoff: 'linear' | 'exponential' | 'fixed';
        baseDelay: number;
        maxDelay: number;
    };
    timeout: {
        connect: number;
        read: number;
        total: number;
    };
    circuitBreaker: {
        enabled: boolean;
        threshold: number;
        timeout: number;
        resetTimeout: number;
    };
    logging: {
        enabled: boolean;
        level: 'debug' | 'info' | 'warn' | 'error';
        logRequests: boolean;
        logResponses: boolean;
        sanitizeHeaders: string[];
    };
}

interface APIRoute {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    upstream: {
        service: string;
        version?: string;
        timeout?: number;
        retries?: number;
    };
    middleware: MiddlewareConfig[];
    authentication?: {
        required: boolean;
        scopes?: string[];
        roles?: string[];
    };
    rateLimit?: {
        requests: number;
        window: number;
        skipIf?: string; // condition expression
    };
    transform?: {
        request?: TransformConfig;
        response?: TransformConfig;
    };
    cache?: {
        enabled: boolean;
        ttl: number;
        varyBy: string[];
        skipIf?: string;
    };
}

interface MiddlewareConfig {
    name: string;
    enabled: boolean;
    config: Record<string, any>;
    order: number;
}

interface TransformConfig {
    headers?: Record<string, string>;
    body?: {
        template?: string;
        remove?: string[];
        add?: Record<string, any>;
        map?: Record<string, string>;
    };
}

interface ServiceRegistry {
    name: string;
    version: string;
    endpoints: string[];
    healthCheck: string;
    weight: number;
    status: 'healthy' | 'unhealthy' | 'draining';
    metadata: Record<string, string>;
    lastHealthCheck: Date;
}

interface RequestMetrics {
    timestamp: Date;
    method: string;
    path: string;
    service: string;
    status: number;
    duration: number;
    size: {
        request: number;
        response: number;
    };
    error?: string;
    userId?: string;
}

interface CircuitBreakerState {
    service: string;
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure?: Date;
    nextAttempt?: Date;
    totalRequests: number;
    successfulRequests: number;
}

export class APIGatewayAdapter {
    private config: APIGatewayConfig;
    private routes = new Map<string, APIRoute>();
    private services = new Map<string, ServiceRegistry[]>();
    private circuitBreakers = new Map<string, CircuitBreakerState>();
    private rateLimiters = new Map<string, { count: number; resetTime: number }>();
    private requestMetrics: RequestMetrics[] = [];
    private middlewareStack: ((req: any, res: any, next: () => void) => void)[] = [];

    constructor(config: APIGatewayConfig) {
        this.config = config;
        this.initializeMiddleware();
        this.setupHealthChecks();
    }

    private initializeMiddleware(): void {
        // Add built-in middleware
        this.addMiddleware('cors', this.corsMiddleware.bind(this), 1);
        this.addMiddleware('auth', this.authenticationMiddleware.bind(this), 2);
        this.addMiddleware('rateLimit', this.rateLimitMiddleware.bind(this), 3);
        this.addMiddleware('circuitBreaker', this.circuitBreakerMiddleware.bind(this), 4);
        this.addMiddleware('logging', this.loggingMiddleware.bind(this), 5);
        this.addMiddleware('metrics', this.metricsMiddleware.bind(this), 6);
    }

    private setupHealthChecks(): void {
        setInterval(() => {
            this.performHealthChecks();
        }, 30000); // Check every 30 seconds
    }

    addRoute(route: APIRoute): void {
        const routeKey = `${route.method}:${route.path}`;
        this.routes.set(routeKey, route);

        console.log(`Route registered: ${route.method} ${route.path} -> ${route.upstream.service}`);
    }

    registerService(service: ServiceRegistry): void {
        if (!this.services.has(service.name)) {
            this.services.set(service.name, []);
        }

        const serviceInstances = this.services.get(service.name)!;
        const existingIndex = serviceInstances.findIndex(s =>
            s.endpoints.some(e => service.endpoints.includes(e))
        );

        if (existingIndex >= 0) {
            serviceInstances[existingIndex] = service;
        } else {
            serviceInstances.push(service);
        }

        console.log(`Service registered: ${service.name}@${service.version} with ${service.endpoints.length} endpoints`);
    }

    async handleRequest(method: string, path: string, headers: Record<string, string>, body?: any): Promise<{
        status: number;
        headers: Record<string, string>;
        body: any;
        duration: number;
    }> {
        const startTime = Date.now();
        const routeKey = `${method}:${path}`;
        const route = this.findMatchingRoute(method, path);

        if (!route) {
            return {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
                body: { error: 'Route not found' },
                duration: Date.now() - startTime
            };
        }

        try {
            // Create request context
            const context = {
                method,
                path,
                headers: { ...headers },
                body,
                route,
                startTime,
                user: null as any,
                metadata: {} as Record<string, any>
            };

            // Execute middleware stack
            await this.executeMiddleware(context);

            // Forward to upstream service
            const response = await this.forwardRequest(context);

            // Record metrics
            this.recordMetrics({
                timestamp: new Date(),
                method,
                path,
                service: route.upstream.service,
                status: response.status,
                duration: Date.now() - startTime,
                size: {
                    request: JSON.stringify(body || {}).length,
                    response: JSON.stringify(response.body || {}).length
                },
                userId: context.user?.id
            });

            return response;

        } catch (error) {
            const errorResponse = {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
                body: { error: 'Internal server error' },
                duration: Date.now() - startTime
            };

            this.recordMetrics({
                timestamp: new Date(),
                method,
                path,
                service: route.upstream.service,
                status: 500,
                duration: errorResponse.duration,
                size: { request: 0, response: 0 },
                error: error instanceof Error ? error.message : String(error)
            });

            if (this.config.logging.enabled) {
                console.error('Gateway request error:', error);
            }

            return errorResponse;
        }
    }

    private findMatchingRoute(method: string, path: string): APIRoute | null {
        // First try exact match
        const exactKey = `${method}:${path}`;
        if (this.routes.has(exactKey)) {
            return this.routes.get(exactKey)!;
        }

        // Then try pattern matching
        for (const [routeKey, route] of this.routes) {
            const [routeMethod, routePath] = routeKey.split(':');
            if (routeMethod === method && this.pathMatches(routePath, path)) {
                return route;
            }
        }

        return null;
    }

    private pathMatches(pattern: string, path: string): boolean {
        // Convert path pattern to regex
        const regexPattern = pattern
            .replace(/\{[^}]+\}/g, '([^/]+)') // Replace {param} with capture group
            .replace(/\*/g, '.*'); // Replace * with wildcard

        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
    }

    private async executeMiddleware(context: any): Promise<void> {
        const middlewares = [...this.middlewareStack];
        middlewares.sort((a, b) => (a as any).order - (b as any).order);

        for (const middleware of middlewares) {
            await new Promise<void>((resolve, reject) => {
                try {
                    middleware(context, null, () => resolve());
                } catch (error) {
                    reject(error);
                }
            });
        }
    }

    private addMiddleware(name: string, handler: (req: any, res: any, next: () => void) => void, order: number): void {
        (handler as any).name = name;
        (handler as any).order = order;
        this.middlewareStack.push(handler);
    }

    private corsMiddleware(context: any, res: any, next: () => void): void {
        // Add CORS headers
        context.headers['Access-Control-Allow-Origin'] = '*';
        context.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        context.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Key';
        next();
    }

    private authenticationMiddleware(context: any, res: any, next: () => void): void {
        const route = context.route;

        if (route.authentication?.required) {
            const token = this.extractToken(context.headers);

            if (!token) {
                throw new Error('Authentication required');
            }

            // Validate token (simplified)
            const user = this.validateToken(token);
            if (!user) {
                throw new Error('Invalid token');
            }

            // Check scopes and roles
            if (route.authentication.scopes?.length > 0) {
                const hasRequiredScope = route.authentication.scopes.some(scope =>
                    user.scopes?.includes(scope)
                );
                if (!hasRequiredScope) {
                    throw new Error('Insufficient scopes');
                }
            }

            if (route.authentication.roles?.length > 0) {
                const hasRequiredRole = route.authentication.roles.some(role =>
                    user.roles?.includes(role)
                );
                if (!hasRequiredRole) {
                    throw new Error('Insufficient permissions');
                }
            }

            context.user = user;
        }

        next();
    }

    private rateLimitMiddleware(context: any, res: any, next: () => void): void {
        if (!this.config.rateLimit.enabled) {
            next();
            return;
        }

        const route = context.route;
        const rateLimitConfig = route.rateLimit || this.config.rateLimit;
        const key = this.getRateLimitKey(context);

        if (this.isRateLimited(key, rateLimitConfig)) {
            throw new Error('Rate limit exceeded');
        }

        next();
    }

    private circuitBreakerMiddleware(context: any, res: any, next: () => void): void {
        if (!this.config.circuitBreaker.enabled) {
            next();
            return;
        }

        const service = context.route.upstream.service;
        const circuitBreaker = this.getCircuitBreaker(service);

        if (circuitBreaker.state === 'open') {
            const now = new Date();
            if (!circuitBreaker.nextAttempt || now < circuitBreaker.nextAttempt) {
                throw new Error('Circuit breaker is open');
            } else {
                // Transition to half-open
                circuitBreaker.state = 'half-open';
            }
        }

        next();
    }

    private loggingMiddleware(context: any, res: any, next: () => void): void {
        if (this.config.logging.enabled && this.config.logging.logRequests) {
            const sanitizedHeaders = { ...context.headers };

            // Remove sensitive headers
            this.config.logging.sanitizeHeaders.forEach(header => {
                if (sanitizedHeaders[header]) {
                    sanitizedHeaders[header] = '[REDACTED]';
                }
            });

            console.log('Gateway request:', {
                method: context.method,
                path: context.path,
                headers: sanitizedHeaders,
                timestamp: new Date().toISOString()
            });
        }

        next();
    }

    private metricsMiddleware(context: any, res: any, next: () => void): void {
        context.metadata.metricsStart = Date.now();
        next();
    }

    private async forwardRequest(context: any): Promise<{
        status: number;
        headers: Record<string, string>;
        body: any;
        duration: number;
    }> {
        const route = context.route;
        const service = await this.selectServiceEndpoint(route.upstream.service);

        if (!service) {
            throw new Error(`Service ${route.upstream.service} not available`);
        }

        const upstreamUrl = `${service}${context.path}`;
        const timeout = route.upstream.timeout || this.config.timeout.total;

        const requestOptions: RequestInit = {
            method: context.method,
            headers: this.buildUpstreamHeaders(context),
            signal: AbortSignal.timeout(timeout)
        };

        if (context.body && context.method !== 'GET') {
            requestOptions.body = JSON.stringify(context.body);
            (requestOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        const response = await fetch(upstreamUrl, requestOptions);

        let responseBody;
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            responseBody = await response.json();
        } else {
            responseBody = await response.text();
        }

        // Update circuit breaker
        this.updateCircuitBreaker(route.upstream.service, response.ok);

        return {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseBody,
            duration: Date.now() - context.startTime
        };
    }

    private buildUpstreamHeaders(context: any): Record<string, string> {
        const headers = { ...context.headers };

        // Add gateway headers
        headers['X-Forwarded-By'] = 'universal-search-gateway';
        headers['X-Request-ID'] = this.generateRequestId();

        if (context.user) {
            headers['X-User-ID'] = context.user.id;
            headers['X-User-Email'] = context.user.email;
            if (context.user.roles?.length > 0) {
                headers['X-User-Roles'] = context.user.roles.join(',');
            }
        }

        // Remove hop-by-hop headers
        const hopByHopHeaders = [
            'connection', 'keep-alive', 'proxy-authenticate',
            'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade'
        ];

        hopByHopHeaders.forEach(header => {
            delete headers[header];
            delete headers[header.toLowerCase()];
        });

        return headers;
    }

    private extractToken(headers: Record<string, string>): string | null {
        const authHeader = headers.authorization || headers.Authorization;
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        const apiKey = headers['x-api-key'] || headers['X-API-Key'];
        if (apiKey) {
            return apiKey;
        }

        return null;
    }

    private validateToken(token: string): any {
        // Simplified token validation
        // In production, this would validate JWT tokens or API keys
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                id: payload.sub,
                email: payload.email,
                roles: payload.roles || [],
                scopes: payload.scope?.split(' ') || []
            };
        } catch {
            return null;
        }
    }

    private getRateLimitKey(context: any): string {
        if (context.user) {
            return `user:${context.user.id}`;
        }

        const clientIP = context.headers['x-forwarded-for'] ||
                        context.headers['x-real-ip'] ||
                        'unknown';

        return `ip:${clientIP}`;
    }

    private isRateLimited(key: string, config: any): boolean {
        const now = Date.now();
        const limiter = this.rateLimiters.get(key);

        if (!limiter || now > limiter.resetTime) {
            this.rateLimiters.set(key, {
                count: 1,
                resetTime: now + config.window
            });
            return false;
        }

        if (limiter.count >= config.requests) {
            return true;
        }

        limiter.count++;
        return false;
    }

    private getCircuitBreaker(service: string): CircuitBreakerState {
        if (!this.circuitBreakers.has(service)) {
            this.circuitBreakers.set(service, {
                service,
                state: 'closed',
                failures: 0,
                totalRequests: 0,
                successfulRequests: 0
            });
        }

        return this.circuitBreakers.get(service)!;
    }

    private updateCircuitBreaker(service: string, success: boolean): void {
        const circuitBreaker = this.getCircuitBreaker(service);
        circuitBreaker.totalRequests++;

        if (success) {
            circuitBreaker.successfulRequests++;
            circuitBreaker.failures = 0;

            if (circuitBreaker.state === 'half-open') {
                circuitBreaker.state = 'closed';
            }
        } else {
            circuitBreaker.failures++;
            circuitBreaker.lastFailure = new Date();

            if (circuitBreaker.failures >= this.config.circuitBreaker.threshold) {
                circuitBreaker.state = 'open';
                circuitBreaker.nextAttempt = new Date(
                    Date.now() + this.config.circuitBreaker.resetTimeout
                );
            }
        }
    }

    private async selectServiceEndpoint(serviceName: string): Promise<string | null> {
        const services = this.services.get(serviceName);
        if (!services || services.length === 0) {
            return null;
        }

        // Filter healthy services
        const healthyServices = services.filter(s => s.status === 'healthy');
        if (healthyServices.length === 0) {
            return null;
        }

        // Weighted random selection
        const totalWeight = healthyServices.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;

        for (const service of healthyServices) {
            random -= service.weight;
            if (random <= 0) {
                // Round-robin selection of endpoints
                const endpoint = service.endpoints[
                    Math.floor(Math.random() * service.endpoints.length)
                ];
                return endpoint;
            }
        }

        // Fallback to first healthy service
        return healthyServices[0].endpoints[0];
    }

    private async performHealthChecks(): Promise<void> {
        for (const [serviceName, serviceInstances] of this.services) {
            for (const service of serviceInstances) {
                try {
                    const response = await fetch(`${service.endpoints[0]}${service.healthCheck}`, {
                        method: 'GET',
                        signal: AbortSignal.timeout(5000)
                    });

                    service.status = response.ok ? 'healthy' : 'unhealthy';
                    service.lastHealthCheck = new Date();

                } catch (error) {
                    service.status = 'unhealthy';
                    service.lastHealthCheck = new Date();
                }
            }
        }
    }

    private recordMetrics(metrics: RequestMetrics): void {
        this.requestMetrics.push(metrics);

        // Keep only last 1000 requests
        if (this.requestMetrics.length > 1000) {
            this.requestMetrics = this.requestMetrics.slice(-1000);
        }
    }

    private generateRequestId(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    getMetrics(timeRange?: { start: Date; end: Date }): {
        totalRequests: number;
        averageLatency: number;
        errorRate: number;
        requestsByService: Record<string, number>;
        statusCodeDistribution: Record<string, number>;
        topEndpoints: { path: string; count: number; avgLatency: number }[];
    } {
        let metrics = this.requestMetrics;

        if (timeRange) {
            metrics = metrics.filter(m =>
                m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
            );
        }

        const totalRequests = metrics.length;
        const averageLatency = metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests || 0;
        const errors = metrics.filter(m => m.status >= 400).length;
        const errorRate = (errors / totalRequests) * 100 || 0;

        const requestsByService = metrics.reduce((acc, m) => {
            acc[m.service] = (acc[m.service] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const statusCodeDistribution = metrics.reduce((acc, m) => {
            const statusClass = `${Math.floor(m.status / 100)}xx`;
            acc[statusClass] = (acc[statusClass] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const endpointStats = metrics.reduce((acc, m) => {
            if (!acc[m.path]) {
                acc[m.path] = { count: 0, totalLatency: 0 };
            }
            acc[m.path].count++;
            acc[m.path].totalLatency += m.duration;
            return acc;
        }, {} as Record<string, { count: number; totalLatency: number }>);

        const topEndpoints = Object.entries(endpointStats)
            .map(([path, stats]) => ({
                path,
                count: stats.count,
                avgLatency: stats.totalLatency / stats.count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            totalRequests,
            averageLatency,
            errorRate,
            requestsByService,
            statusCodeDistribution,
            topEndpoints
        };
    }

    getServiceStatus(): Record<string, {
        instances: number;
        healthy: number;
        unhealthy: number;
        lastHealthCheck: Date;
    }> {
        const status: Record<string, any> = {};

        for (const [serviceName, instances] of this.services) {
            const healthy = instances.filter(s => s.status === 'healthy').length;
            const unhealthy = instances.filter(s => s.status === 'unhealthy').length;
            const lastHealthCheck = Math.max(...instances.map(s => s.lastHealthCheck.getTime()));

            status[serviceName] = {
                instances: instances.length,
                healthy,
                unhealthy,
                lastHealthCheck: new Date(lastHealthCheck)
            };
        }

        return status;
    }

    getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
        return Object.fromEntries(this.circuitBreakers);
    }
}