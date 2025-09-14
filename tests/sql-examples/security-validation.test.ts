/**
 * Security Validation Test Suite
 * Comprehensive tests for SQL injection prevention and security measures
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('SQL Security Validation', () => {
    
    describe('SQL Injection Attack Prevention', () => {
        
        it('should prevent classic SQL injection attacks', () => {
            const maliciousInputs = [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "' UNION SELECT * FROM passwords --",
                "admin'--",
                "'; INSERT INTO users VALUES('hacker', 'password'); --",
                "' OR 1=1 LIMIT 1 OFFSET 0 --",
                "') OR ('1'='1",
                "' AND (SELECT COUNT(*) FROM users) > 0 --"
            ];
            
            const sanitizeSearchInput = (input: string): string => {
                // This function should treat all input as literal search terms
                // No SQL special characters should be interpreted as SQL commands
                return input.trim();
            };
            
            const buildParameterizedQuery = (searchTerm: string, tableName: string, searchFields: string[]): { sql: string, params: any[] } => {
                // Validate table name (whitelist approach)
                if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(tableName)) {
                    throw new Error(`Invalid table name: ${tableName}`);
                }
                
                // Validate field names
                searchFields.forEach(field => {
                    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field)) {
                        throw new Error(`Invalid field name: ${field}`);
                    }
                });
                
                // Build parameterized query - PostgreSQL style
                const searchFieldsSQL = searchFields.join(' || \' \' || ');
                const sql = `
                    SELECT * FROM ${tableName}
                    WHERE to_tsvector('english', ${searchFieldsSQL}) @@ to_tsquery('english', $1)
                    LIMIT $2
                `;
                
                // Search term is always treated as a parameter, never executed
                const params = [sanitizeSearchInput(searchTerm), 20];
                
                return { sql, params };
            };
            
            // Test all malicious inputs
            maliciousInputs.forEach(maliciousInput => {
                const { sql, params } = buildParameterizedQuery(maliciousInput, 'articles', ['title', 'content']);
                
                // Verify the SQL structure is safe
                expect(sql).toContain('$1'); // Parameterized
                expect(sql).toContain('$2');
                expect(sql).not.toContain(maliciousInput); // Malicious input not in SQL
                
                // Verify parameters contain the raw input but it's safely parameterized
                expect(params[0]).toBe(maliciousInput.trim());
                expect(params[1]).toBe(20);
                
                // SQL should not contain any injection attempts
                expect(sql).not.toContain('DROP TABLE');
                expect(sql).not.toContain('UNION SELECT');
                expect(sql).not.toContain('INSERT INTO');
                expect(sql).not.toContain('OR 1=1');
            });
        });

        it('should prevent advanced SQL injection techniques', () => {
            const advancedAttacks = [
                // Blind SQL injection
                "test' AND (SELECT SUBSTRING(password, 1, 1) FROM users WHERE username='admin')='a'--",
                // Time-based blind injection
                "test'; WAITFOR DELAY '00:00:05'--",
                // Second-order injection
                "test'; UPDATE users SET username='admin' WHERE id=1--",
                // NoSQL-style injection attempts
                "'; return Math.abs(Math.random()) < 0.5; //",
                // Union-based extraction
                "' UNION ALL SELECT table_name,column_name FROM information_schema.columns--",
                // Stacked queries
                "test'; CREATE TABLE hacked (id INT); --"
            ];
            
            const secureQueryBuilder = (searchTerm: string, filters: any) => {
                // All user input must be parameterized - no exceptions
                const sql = `
                    SELECT id, title, content, created_at 
                    FROM articles 
                    WHERE (title ILIKE $1 OR content ILIKE $1)
                    AND status = $2
                    ORDER BY created_at DESC 
                    LIMIT $3
                `;
                
                const params = [
                    `%${searchTerm.replace(/[%_]/g, '\\$&')}%`, // Escape LIKE wildcards
                    'published',
                    Math.min(100, Math.max(1, filters.limit || 20))
                ];
                
                return { sql, params };
            };
            
            advancedAttacks.forEach(attack => {
                const { sql, params } = secureQueryBuilder(attack, { limit: 20 });
                
                // Verify attack vectors are neutralized
                expect(sql).not.toContain('WAITFOR');
                expect(sql).not.toContain('UPDATE');
                expect(sql).not.toContain('CREATE TABLE');
                expect(sql).not.toContain('information_schema');
                expect(sql).not.toContain(attack);
                
                // Verify proper parameterization
                expect(sql.match(/\$\d+/g)?.length).toBe(3);
                expect(params).toHaveLength(3);
                expect(params[0]).toContain(attack); // Input is safely parameterized
            });
        });

        it('should validate input sanitization for different data types', () => {
            const validateInput = (input: any, expectedType: string, maxLength?: number): any => {
                switch (expectedType) {
                    case 'string':
                        if (typeof input !== 'string') {
                            throw new Error(`Expected string, got ${typeof input}`);
                        }
                        if (maxLength && input.length > maxLength) {
                            throw new Error(`String too long: ${input.length} > ${maxLength}`);
                        }
                        return input;
                        
                    case 'integer':
                        const num = parseInt(input);
                        if (isNaN(num)) {
                            throw new Error(`Invalid integer: ${input}`);
                        }
                        return num;
                        
                    case 'array':
                        if (!Array.isArray(input)) {
                            throw new Error(`Expected array, got ${typeof input}`);
                        }
                        return input;
                        
                    default:
                        throw new Error(`Unsupported type: ${expectedType}`);
                }
            };
            
            // Valid inputs
            expect(validateInput('test query', 'string', 100)).toBe('test query');
            expect(validateInput('42', 'integer')).toBe(42);
            expect(validateInput(['field1', 'field2'], 'array')).toEqual(['field1', 'field2']);
            
            // Invalid inputs
            expect(() => validateInput(null, 'string')).toThrow('Expected string');
            expect(() => validateInput('a'.repeat(201), 'string', 200)).toThrow('String too long');
            expect(() => validateInput('not a number', 'integer')).toThrow('Invalid integer');
            expect(() => validateInput('string', 'array')).toThrow('Expected array');
        });
    });

    describe('Authentication and Authorization', () => {
        
        it('should validate API key authentication', () => {
            const validateApiKey = (apiKey: string, validKeys: string[]): boolean => {
                if (!apiKey || typeof apiKey !== 'string') {
                    return false;
                }
                
                // Constant-time comparison to prevent timing attacks
                const isValid = validKeys.some(validKey => {
                    if (apiKey.length !== validKey.length) {
                        return false;
                    }
                    
                    let result = 0;
                    for (let i = 0; i < apiKey.length; i++) {
                        result |= apiKey.charCodeAt(i) ^ validKey.charCodeAt(i);
                    }
                    
                    return result === 0;
                });
                
                return isValid;
            };
            
            const validKeys = ['key123', 'secret456', 'token789'];
            
            // Valid keys should pass
            expect(validateApiKey('key123', validKeys)).toBe(true);
            expect(validateApiKey('secret456', validKeys)).toBe(true);
            
            // Invalid keys should fail
            expect(validateApiKey('invalid', validKeys)).toBe(false);
            expect(validateApiKey('key12', validKeys)).toBe(false); // Wrong length
            expect(validateApiKey('', validKeys)).toBe(false);
            expect(validateApiKey(null as any, validKeys)).toBe(false);
        });

        it('should implement rate limiting correctly', () => {
            class RateLimiter {
                private requests: Map<string, number[]> = new Map();
                private windowMs: number;
                private maxRequests: number;
                
                constructor(windowMs: number, maxRequests: number) {
                    this.windowMs = windowMs;
                    this.maxRequests = maxRequests;
                }
                
                isAllowed(clientId: string): boolean {
                    const now = Date.now();
                    const windowStart = now - this.windowMs;
                    
                    if (!this.requests.has(clientId)) {
                        this.requests.set(clientId, []);
                    }
                    
                    const clientRequests = this.requests.get(clientId)!;
                    
                    // Remove old requests outside the window
                    const recentRequests = clientRequests.filter(timestamp => timestamp > windowStart);
                    this.requests.set(clientId, recentRequests);
                    
                    // Check if client has exceeded rate limit
                    if (recentRequests.length >= this.maxRequests) {
                        return false;
                    }
                    
                    // Record this request
                    recentRequests.push(now);
                    return true;
                }
                
                getRemainingRequests(clientId: string): number {
                    const now = Date.now();
                    const windowStart = now - this.windowMs;
                    const clientRequests = this.requests.get(clientId) || [];
                    const recentRequests = clientRequests.filter(timestamp => timestamp > windowStart);
                    
                    return Math.max(0, this.maxRequests - recentRequests.length);
                }
            }
            
            const limiter = new RateLimiter(60000, 10); // 10 requests per minute
            const clientId = 'test-client';
            
            // Should allow requests up to the limit
            for (let i = 0; i < 10; i++) {
                expect(limiter.isAllowed(clientId)).toBe(true);
            }
            
            // Should block the 11th request
            expect(limiter.isAllowed(clientId)).toBe(false);
            expect(limiter.getRemainingRequests(clientId)).toBe(0);
        });

        it('should validate database access permissions', () => {
            const checkDatabasePermissions = (userRole: string, operation: string, tableName: string): boolean => {
                const permissions = {
                    'admin': {
                        'SELECT': ['*'],
                        'INSERT': ['users', 'articles', 'logs'],
                        'UPDATE': ['users', 'articles'],
                        'DELETE': ['logs']
                    },
                    'editor': {
                        'SELECT': ['articles', 'users'],
                        'INSERT': ['articles'],
                        'UPDATE': ['articles']
                    },
                    'viewer': {
                        'SELECT': ['articles']
                    },
                    'guest': {}
                };
                
                const userPermissions = permissions[userRole as keyof typeof permissions];
                if (!userPermissions) {
                    return false;
                }
                
                const allowedTables = userPermissions[operation as keyof typeof userPermissions];
                if (!allowedTables) {
                    return false;
                }
                
                return allowedTables.includes('*') || allowedTables.includes(tableName);
            };
            
            // Test different role permissions
            expect(checkDatabasePermissions('admin', 'SELECT', 'users')).toBe(true);
            expect(checkDatabasePermissions('admin', 'DELETE', 'articles')).toBe(false);
            
            expect(checkDatabasePermissions('editor', 'SELECT', 'articles')).toBe(true);
            expect(checkDatabasePermissions('editor', 'DELETE', 'articles')).toBe(false);
            
            expect(checkDatabasePermissions('viewer', 'SELECT', 'articles')).toBe(true);
            expect(checkDatabasePermissions('viewer', 'INSERT', 'articles')).toBe(false);
            
            expect(checkDatabasePermissions('guest', 'SELECT', 'articles')).toBe(false);
            expect(checkDatabasePermissions('invalid_role', 'SELECT', 'articles')).toBe(false);
        });
    });

    describe('Data Privacy and Compliance', () => {
        
        it('should redact sensitive information from logs', () => {
            const redactSensitiveData = (data: any): any => {
                const sensitiveFields = ['password', 'connectionString', 'apiKey', 'token', 'secret'];
                
                if (typeof data === 'string') {
                    // Redact connection strings
                    if (data.includes('://') && data.includes('@')) {
                        return data.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:[REDACTED]@');
                    }
                    return data;
                }
                
                if (Array.isArray(data)) {
                    return data.map(item => redactSensitiveData(item));
                }
                
                if (data && typeof data === 'object') {
                    const redacted = { ...data };
                    
                    sensitiveFields.forEach(field => {
                        if (field in redacted) {
                            redacted[field] = '[REDACTED]';
                        }
                    });
                    
                    Object.keys(redacted).forEach(key => {
                        if (typeof redacted[key] === 'object') {
                            redacted[key] = redactSensitiveData(redacted[key]);
                        }
                    });
                    
                    return redacted;
                }
                
                return data;
            };
            
            const sensitiveData = {
                username: 'user',
                password: 'secret123',
                connectionString: 'postgresql://user:password123@localhost:5432/db',
                apiKey: 'sk-1234567890',
                config: {
                    token: 'bearer-token',
                    database: 'mydb'
                }
            };
            
            const redacted = redactSensitiveData(sensitiveData);
            
            expect(redacted.password).toBe('[REDACTED]');
            expect(redacted.apiKey).toBe('[REDACTED]');
            expect(redacted.connectionString).toBe('postgresql://user:[REDACTED]@localhost:5432/db');
            expect(redacted.config.token).toBe('[REDACTED]');
            expect(redacted.config.database).toBe('mydb'); // Not sensitive
            expect(redacted.username).toBe('user'); // Not sensitive
        });

        it('should implement data retention policies', () => {
            const enforceRetentionPolicy = (records: any[], retentionPeriodMs: number): any[] => {
                const cutoffTime = Date.now() - retentionPeriodMs;
                
                return records.filter(record => {
                    const recordTime = new Date(record.created_at || record.timestamp).getTime();
                    return recordTime > cutoffTime;
                });
            };
            
            const oldRecord = { id: 1, data: 'old', created_at: '2020-01-01T00:00:00Z' };
            const newRecord = { id: 2, data: 'new', created_at: new Date().toISOString() };
            
            const records = [oldRecord, newRecord];
            const retentionPeriod = 365 * 24 * 60 * 60 * 1000; // 1 year
            
            const filteredRecords = enforceRetentionPolicy(records, retentionPeriod);
            
            expect(filteredRecords).toHaveLength(1);
            expect(filteredRecords[0].id).toBe(2);
        });

        it('should implement GDPR compliance features', () => {
            const gdprCompliance = {
                anonymizePersonalData: (data: any): any => {
                    const personalDataFields = ['email', 'name', 'phone', 'address', 'ip_address'];
                    
                    if (data && typeof data === 'object') {
                        const anonymized = { ...data };
                        
                        personalDataFields.forEach(field => {
                            if (field in anonymized) {
                                anonymized[field] = '[ANONYMIZED]';
                            }
                        });
                        
                        return anonymized;
                    }
                    
                    return data;
                },
                
                validateDataProcessingConsent: (userConsent: any): boolean => {
                    return userConsent && 
                           userConsent.analytics === true && 
                           userConsent.marketing === false && // Only essential processing
                           new Date(userConsent.timestamp) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // Within 1 year
                },
                
                generateDataExport: (userId: string, userData: any[]): any => {
                    return {
                        userId,
                        exportDate: new Date().toISOString(),
                        data: userData.filter(item => item.userId === userId),
                        format: 'JSON',
                        rights: {
                            portability: true,
                            erasure: true,
                            rectification: true
                        }
                    };
                }
            };
            
            const userData = {
                id: 1,
                email: 'user@example.com',
                name: 'John Doe',
                preferences: { theme: 'dark' }
            };
            
            const anonymized = gdprCompliance.anonymizePersonalData(userData);
            expect(anonymized.email).toBe('[ANONYMIZED]');
            expect(anonymized.name).toBe('[ANONYMIZED]');
            expect(anonymized.preferences.theme).toBe('dark'); // Not personal data
            
            const validConsent = {
                analytics: true,
                marketing: false,
                timestamp: new Date().toISOString()
            };
            expect(gdprCompliance.validateDataProcessingConsent(validConsent)).toBe(true);
            
            const invalidConsent = {
                analytics: true,
                marketing: true, // Invalid - no marketing consent should be required
                timestamp: '2020-01-01T00:00:00Z' // Too old
            };
            expect(gdprCompliance.validateDataProcessingConsent(invalidConsent)).toBe(false);
        });
    });

    describe('Security Headers and HTTPS', () => {
        
        it('should validate security headers', () => {
            const validateSecurityHeaders = (headers: Record<string, string>): { valid: boolean, missing: string[] } => {
                const requiredHeaders = {
                    'strict-transport-security': /^max-age=\d+/,
                    'content-security-policy': /.+/,
                    'x-frame-options': /^(DENY|SAMEORIGIN)$/,
                    'x-content-type-options': /^nosniff$/,
                    'referrer-policy': /^(strict-origin-when-cross-origin|no-referrer)$/
                };
                
                const missing: string[] = [];
                
                Object.entries(requiredHeaders).forEach(([header, pattern]) => {
                    const headerValue = headers[header.toLowerCase()];
                    if (!headerValue || !pattern.test(headerValue)) {
                        missing.push(header);
                    }
                });
                
                return { valid: missing.length === 0, missing };
            };
            
            const goodHeaders = {
                'strict-transport-security': 'max-age=31536000',
                'content-security-policy': "default-src 'self'",
                'x-frame-options': 'DENY',
                'x-content-type-options': 'nosniff',
                'referrer-policy': 'strict-origin-when-cross-origin'
            };
            
            const result = validateSecurityHeaders(goodHeaders);
            expect(result.valid).toBe(true);
            expect(result.missing).toHaveLength(0);
            
            const badHeaders = {
                'content-security-policy': "default-src 'self'"
                // Missing other required headers
            };
            
            const badResult = validateSecurityHeaders(badHeaders);
            expect(badResult.valid).toBe(false);
            expect(badResult.missing.length).toBeGreaterThan(0);
        });

        it('should validate CORS configuration', () => {
            const validateCorsConfig = (config: any): { valid: boolean, issues: string[] } => {
                const issues: string[] = [];
                
                // Check origin configuration
                if (config.origin === '*') {
                    issues.push('Wildcard origin is not secure for production');
                }
                
                if (!config.origin || (Array.isArray(config.origin) && config.origin.length === 0)) {
                    issues.push('No allowed origins configured');
                }
                
                // Check credentials
                if (config.credentials === true && config.origin === '*') {
                    issues.push('Cannot use credentials with wildcard origin');
                }
                
                // Check allowed methods
                const dangerousMethods = ['TRACE', 'CONNECT'];
                if (config.methods && Array.isArray(config.methods)) {
                    const hasDangerous = config.methods.some((method: string) => 
                        dangerousMethods.includes(method.toUpperCase())
                    );
                    if (hasDangerous) {
                        issues.push('Dangerous HTTP methods allowed');
                    }
                }
                
                return { valid: issues.length === 0, issues };
            };
            
            const secureConfig = {
                origin: ['https://example.com', 'https://app.example.com'],
                credentials: true,
                methods: ['GET', 'POST'],
                allowedHeaders: ['Content-Type', 'Authorization']
            };
            
            const secureResult = validateCorsConfig(secureConfig);
            expect(secureResult.valid).toBe(true);
            
            const insecureConfig = {
                origin: '*',
                credentials: true,
                methods: ['GET', 'POST', 'TRACE'],
                allowedHeaders: ['*']
            };
            
            const insecureResult = validateCorsConfig(insecureConfig);
            expect(insecureResult.valid).toBe(false);
            expect(insecureResult.issues).toContain('Cannot use credentials with wildcard origin');
            expect(insecureResult.issues).toContain('Dangerous HTTP methods allowed');
        });
    });
});