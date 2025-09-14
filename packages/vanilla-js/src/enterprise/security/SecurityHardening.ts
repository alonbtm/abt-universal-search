interface SecurityConfig {
    owasp: {
        injection: boolean;
        authentication: boolean;
        sensitiveData: boolean;
        xmlEntities: boolean;
        brokenAccess: boolean;
        misconfig: boolean;
        xss: boolean;
        deserialization: boolean;
        components: boolean;
        logging: boolean;
    };
    csp: {
        level: 'strict' | 'moderate' | 'permissive';
        reportUri?: string;
        nonce?: string;
    };
    headers: {
        hsts: boolean;
        xFrameOptions: boolean;
        xContentType: boolean;
        referrerPolicy: string;
    };
    rateLimiting: {
        requests: number;
        window: number;
        blockDuration: number;
    };
}

interface SecurityViolation {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp: Date;
    ip?: string;
    userAgent?: string;
    payload?: any;
}

export class SecurityHardening {
    private config: SecurityConfig;
    private violations: SecurityViolation[] = [];
    private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
    private nonces = new Set<string>();

    constructor(config: SecurityConfig) {
        this.config = config;
        this.initializeSecurityMeasures();
    }

    private initializeSecurityMeasures(): void {
        this.setupCSP();
        this.setupSecurityHeaders();
        this.setupXSSProtection();
        this.setupInputValidation();
    }

    validateInput(input: string, type: 'search' | 'filter' | 'config'): boolean {
        if (!input || typeof input !== 'string') {
            this.logViolation({
                type: 'invalid_input_type',
                severity: 'medium',
                description: `Invalid input type received: ${typeof input}`,
                timestamp: new Date()
            });
            return false;
        }

        const sqlInjectionPattern = /('|(\\)|;|--|\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi;
        if (sqlInjectionPattern.test(input)) {
            this.logViolation({
                type: 'sql_injection_attempt',
                severity: 'critical',
                description: `SQL injection pattern detected in input: ${input.substring(0, 100)}`,
                timestamp: new Date(),
                payload: { input: input.substring(0, 200) }
            });
            return false;
        }

        const xssPattern = /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/gi;
        if (xssPattern.test(input)) {
            this.logViolation({
                type: 'xss_attempt',
                severity: 'high',
                description: `XSS pattern detected in input: ${input.substring(0, 100)}`,
                timestamp: new Date(),
                payload: { input: input.substring(0, 200) }
            });
            return false;
        }

        const commandInjectionPattern = /[;&|`$(){}[\]\\]/g;
        if (type === 'config' && commandInjectionPattern.test(input)) {
            this.logViolation({
                type: 'command_injection_attempt',
                severity: 'high',
                description: `Command injection pattern detected in config: ${input.substring(0, 100)}`,
                timestamp: new Date()
            });
            return false;
        }

        const maxLength = type === 'search' ? 500 : type === 'filter' ? 100 : 1000;
        if (input.length > maxLength) {
            this.logViolation({
                type: 'input_length_violation',
                severity: 'medium',
                description: `Input exceeds maximum length of ${maxLength} characters`,
                timestamp: new Date()
            });
            return false;
        }

        return true;
    }

    sanitizeOutput(output: any): any {
        if (typeof output === 'string') {
            return output
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        }

        if (Array.isArray(output)) {
            return output.map(item => this.sanitizeOutput(item));
        }

        if (typeof output === 'object' && output !== null) {
            const sanitized: any = {};
            for (const key in output) {
                if (output.hasOwnProperty(key)) {
                    sanitized[key] = this.sanitizeOutput(output[key]);
                }
            }
            return sanitized;
        }

        return output;
    }

    checkRateLimit(identifier: string, userAgent?: string, ip?: string): boolean {
        const now = Date.now();
        const key = `${identifier}_${ip || 'unknown'}`;
        const current = this.rateLimitMap.get(key);

        if (current && now < current.resetTime) {
            if (current.count >= this.config.rateLimiting.requests) {
                this.logViolation({
                    type: 'rate_limit_exceeded',
                    severity: 'medium',
                    description: `Rate limit exceeded for identifier: ${identifier}`,
                    timestamp: new Date(),
                    ip,
                    userAgent
                });
                return false;
            }
            current.count++;
        } else {
            this.rateLimitMap.set(key, {
                count: 1,
                resetTime: now + this.config.rateLimiting.window
            });
        }

        this.cleanupRateLimitMap();
        return true;
    }

    private cleanupRateLimitMap(): void {
        const now = Date.now();
        for (const [key, value] of this.rateLimitMap.entries()) {
            if (now >= value.resetTime) {
                this.rateLimitMap.delete(key);
            }
        }
    }

    private setupCSP(): void {
        let cspPolicy = '';

        switch (this.config.csp.level) {
            case 'strict':
                cspPolicy = [
                    "default-src 'self'",
                    "script-src 'self' 'nonce-{nonce}'",
                    "style-src 'self' 'unsafe-inline'",
                    "img-src 'self' data: https:",
                    "font-src 'self'",
                    "connect-src 'self'",
                    "frame-ancestors 'none'",
                    "form-action 'self'",
                    "base-uri 'self'"
                ].join('; ');
                break;
            case 'moderate':
                cspPolicy = [
                    "default-src 'self' 'unsafe-inline'",
                    "script-src 'self' 'unsafe-inline'",
                    "img-src 'self' data: https:",
                    "frame-ancestors 'self'"
                ].join('; ');
                break;
            case 'permissive':
                cspPolicy = "default-src 'self' 'unsafe-inline' 'unsafe-eval'";
                break;
        }

        if (this.config.csp.reportUri) {
            cspPolicy += `; report-uri ${this.config.csp.reportUri}`;
        }

        if (typeof document !== 'undefined') {
            const meta = document.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = cspPolicy;
            document.head.appendChild(meta);
        }
    }

    private setupSecurityHeaders(): void {
        if (typeof document === 'undefined') return;

        if (this.config.headers.xFrameOptions) {
            const frameOptions = document.createElement('meta');
            frameOptions.httpEquiv = 'X-Frame-Options';
            frameOptions.content = 'DENY';
            document.head.appendChild(frameOptions);
        }

        if (this.config.headers.xContentType) {
            const contentType = document.createElement('meta');
            contentType.httpEquiv = 'X-Content-Type-Options';
            contentType.content = 'nosniff';
            document.head.appendChild(contentType);
        }

        const referrer = document.createElement('meta');
        referrer.name = 'referrer';
        referrer.content = this.config.headers.referrerPolicy;
        document.head.appendChild(referrer);
    }

    private setupXSSProtection(): void {
        if (typeof document === 'undefined') return;

        const xssProtection = document.createElement('meta');
        xssProtection.httpEquiv = 'X-XSS-Protection';
        xssProtection.content = '1; mode=block';
        document.head.appendChild(xssProtection);
    }

    private setupInputValidation(): void {
        if (typeof document === 'undefined') return;

        document.addEventListener('input', (event) => {
            const target = event.target as HTMLInputElement;
            if (target && target.tagName === 'INPUT') {
                this.validateInputEvent(target);
            }
        });
    }

    private validateInputEvent(input: HTMLInputElement): void {
        const value = input.value;
        const type = input.dataset.securityType || 'search';

        if (!this.validateInput(value, type as 'search' | 'filter' | 'config')) {
            input.classList.add('security-violation');
            input.setCustomValidity('Input contains potentially unsafe content');
        } else {
            input.classList.remove('security-violation');
            input.setCustomValidity('');
        }
    }

    generateNonce(): string {
        const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        this.nonces.add(nonce);
        return nonce;
    }

    validateNonce(nonce: string): boolean {
        return this.nonces.has(nonce);
    }

    private logViolation(violation: SecurityViolation): void {
        this.violations.push(violation);

        console.warn(`Security Violation: ${violation.type}`, {
            severity: violation.severity,
            description: violation.description,
            timestamp: violation.timestamp
        });

        if (violation.severity === 'critical') {
            this.escalateViolation(violation);
        }

        this.cleanupViolations();
    }

    private escalateViolation(violation: SecurityViolation): void {
        if (typeof window !== 'undefined' && 'navigator' in window && 'sendBeacon' in navigator) {
            const payload = JSON.stringify({
                type: 'security_incident',
                violation,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });

            navigator.sendBeacon('/api/security/incidents', payload);
        }
    }

    private cleanupViolations(): void {
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const cutoff = new Date(Date.now() - maxAge);
        this.violations = this.violations.filter(v => v.timestamp > cutoff);
    }

    getSecurityReport(): {
        totalViolations: number;
        violationsByType: Record<string, number>;
        violationsBySeverity: Record<string, number>;
        recentViolations: SecurityViolation[];
    } {
        const violationsByType: Record<string, number> = {};
        const violationsBySeverity: Record<string, number> = {};

        this.violations.forEach(v => {
            violationsByType[v.type] = (violationsByType[v.type] || 0) + 1;
            violationsBySeverity[v.severity] = (violationsBySeverity[v.severity] || 0) + 1;
        });

        return {
            totalViolations: this.violations.length,
            violationsByType,
            violationsBySeverity,
            recentViolations: this.violations.slice(-10)
        };
    }

    validateSessionSecurity(sessionData: any): boolean {
        if (!sessionData || typeof sessionData !== 'object') {
            return false;
        }

        if (!sessionData.timestamp || Date.now() - sessionData.timestamp > 8 * 60 * 60 * 1000) {
            this.logViolation({
                type: 'expired_session',
                severity: 'medium',
                description: 'Session has expired',
                timestamp: new Date()
            });
            return false;
        }

        if (!sessionData.signature || !this.validateSessionSignature(sessionData)) {
            this.logViolation({
                type: 'invalid_session_signature',
                severity: 'high',
                description: 'Session signature validation failed',
                timestamp: new Date()
            });
            return false;
        }

        return true;
    }

    private validateSessionSignature(sessionData: any): boolean {
        // In a real implementation, this would validate a cryptographic signature
        // For now, we'll just check for the presence of required fields
        return sessionData.userId && sessionData.signature && sessionData.timestamp;
    }
}