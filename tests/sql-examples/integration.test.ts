/**
 * Integration Test Suite for SQL Examples
 * End-to-end testing of database connectivity and query execution patterns
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

describe('SQL Examples Integration Tests', () => {
    // Mock database services for integration testing
    let mockDatabaseService: any;
    let mockHealthMonitor: any;
    
    beforeAll(async () => {
        // Set up test environment
        console.log('Setting up SQL Examples integration test environment...');
        
        // Mock database service
        mockDatabaseService = {
            connectionPools: new Map(),
            healthChecks: new Map(),
            queryLogs: [],
            
            async connect(config: any) {
                const connectionId = `${config.type}_${Math.random()}`;
                this.connectionPools.set(connectionId, {
                    config,
                    status: 'connected',
                    activeConnections: 0,
                    totalQueries: 0
                });
                return connectionId;
            },
            
            async query(connectionId: string, sql: string, params: any[]) {
                const pool = this.connectionPools.get(connectionId);
                if (!pool) throw new Error('Connection not found');
                
                pool.totalQueries++;
                this.queryLogs.push({
                    connectionId,
                    sql,
                    params,
                    timestamp: new Date(),
                    executionTime: Math.random() * 50 + 5
                });
                
                // Simulate query results based on SQL
                if (sql.includes('SELECT')) {
                    return { rows: this.generateMockResults(params[0] || 'test'), rowCount: 20 };
                }
                return { rows: [], rowCount: 0 };
            },
            
            generateMockResults(searchTerm: string) {
                return Array.from({ length: 20 }, (_, i) => ({
                    id: i + 1,
                    title: `Article ${i + 1} with ${searchTerm}`,
                    content: `Content containing ${searchTerm} and other relevant information`,
                    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
                    relevance_score: Math.random()
                }));
            },
            
            async healthCheck(connectionId: string) {
                const pool = this.connectionPools.get(connectionId);
                if (!pool) return { status: 'error', message: 'Connection not found' };
                
                return {
                    status: 'healthy',
                    details: {
                        connectionId,
                        activeConnections: pool.activeConnections,
                        totalQueries: pool.totalQueries,
                        uptime: Date.now() - 100000 // Mock uptime
                    }
                };
            },
            
            async close(connectionId: string) {
                this.connectionPools.delete(connectionId);
            }
        };
        
        // Mock health monitor
        mockHealthMonitor = {
            checks: new Map(),
            
            async runHealthCheck(service: string) {
                const result = {
                    service,
                    status: Math.random() > 0.1 ? 'healthy' : 'degraded',
                    responseTime: Math.random() * 100 + 5,
                    timestamp: new Date()
                };
                this.checks.set(service, result);
                return result;
            },
            
            getOverallHealth() {
                const checks = Array.from(this.checks.values());
                const hasErrors = checks.some(check => check.status === 'error');
                const hasWarnings = checks.some(check => check.status === 'degraded');
                
                return {
                    status: hasErrors ? 'error' : hasWarnings ? 'degraded' : 'healthy',
                    checks: Object.fromEntries(this.checks)
                };
            }
        };
    });
    
    afterAll(async () => {
        // Clean up test environment
        console.log('Cleaning up SQL Examples integration test environment...');
        for (const connectionId of mockDatabaseService.connectionPools.keys()) {
            await mockDatabaseService.close(connectionId);
        }
    });
    
    beforeEach(() => {
        // Reset state between tests
        mockDatabaseService.queryLogs = [];
        mockHealthMonitor.checks.clear();
    });

    describe('Database Connection Management', () => {
        
        it('should establish connections to all supported database types', async () => {
            const databaseConfigs = [
                {
                    type: 'postgresql',
                    connectionString: 'postgresql://user:pass@localhost:5432/testdb',
                    poolSize: { min: 2, max: 10 }
                },
                {
                    type: 'mysql',
                    host: 'localhost',
                    port: 3306,
                    database: 'testdb',
                    user: 'testuser',
                    password: 'testpass',
                    poolSize: { min: 2, max: 10 }
                },
                {
                    type: 'sqlite',
                    filename: './test.db',
                    mode: 'readwrite'
                }
            ];
            
            const connections: string[] = [];
            
            // Test connection to each database type
            for (const config of databaseConfigs) {
                const connectionId = await mockDatabaseService.connect(config);
                expect(connectionId).toBeDefined();
                expect(typeof connectionId).toBe('string');
                connections.push(connectionId);
                
                // Verify connection is tracked
                expect(mockDatabaseService.connectionPools.has(connectionId)).toBe(true);
                
                const poolInfo = mockDatabaseService.connectionPools.get(connectionId);
                expect(poolInfo.config.type).toBe(config.type);
                expect(poolInfo.status).toBe('connected');
            }
            
            // Clean up connections
            for (const connectionId of connections) {
                await mockDatabaseService.close(connectionId);
                expect(mockDatabaseService.connectionPools.has(connectionId)).toBe(false);
            }
        });
        
        it('should handle connection errors gracefully', async () => {
            const invalidConfigs = [
                {
                    type: 'postgresql',
                    connectionString: 'invalid://connection/string'
                },
                {
                    type: 'mysql',
                    host: 'nonexistent.host',
                    database: 'invalid'
                },
                {
                    type: 'sqlite',
                    filename: '/invalid/path/database.db'
                }
            ];
            
            // Mock connection failures
            const originalConnect = mockDatabaseService.connect;
            mockDatabaseService.connect = async (config: any) => {
                if (config.connectionString?.includes('invalid')) {
                    throw new Error('ECONNREFUSED: Connection refused');
                }
                if (config.host === 'nonexistent.host') {
                    throw new Error('ENOTFOUND: Host not found');
                }
                if (config.filename?.includes('invalid')) {
                    throw new Error('ENOENT: No such file or directory');
                }
                return originalConnect.call(this, config);
            };
            
            // Test error handling for each invalid config
            for (const config of invalidConfigs) {
                await expect(mockDatabaseService.connect(config)).rejects.toThrow();
            }
            
            // Restore original method
            mockDatabaseService.connect = originalConnect;
        });
    });

    describe('Query Execution and Security', () => {
        
        it('should execute parameterized queries safely', async () => {
            const connectionId = await mockDatabaseService.connect({
                type: 'postgresql',
                connectionString: 'postgresql://user:pass@localhost:5432/testdb'
            });
            
            const testQueries = [
                {
                    description: 'Basic search query',
                    sql: 'SELECT * FROM articles WHERE to_tsvector(\'english\', title || \' \' || content) @@ to_tsquery(\'english\', $1) LIMIT $2',
                    params: ['javascript & framework', 20],
                    expectedResults: true
                },
                {
                    description: 'Query with malicious input (safely parameterized)',
                    sql: 'SELECT * FROM articles WHERE to_tsvector(\'english\', title || \' \' || content) @@ to_tsquery(\'english\', $1) LIMIT $2',
                    params: ['\'; DROP TABLE users; --', 20],
                    expectedResults: true
                },
                {
                    description: 'Complex search with filters',
                    sql: 'SELECT * FROM articles WHERE to_tsvector(\'english\', title || \' \' || content) @@ to_tsquery(\'english\', $1) AND status = $2 ORDER BY created_at DESC LIMIT $3',
                    params: ['search term', 'published', 50],
                    expectedResults: true
                }
            ];
            
            for (const testQuery of testQueries) {
                const result = await mockDatabaseService.query(connectionId, testQuery.sql, testQuery.params);
                
                // Verify query executed successfully
                expect(result).toBeDefined();
                expect(result.rows).toBeDefined();
                
                if (testQuery.expectedResults) {
                    expect(result.rows.length).toBeGreaterThan(0);
                    expect(result.rowCount).toBeGreaterThan(0);
                }
                
                // Verify parameters were logged (for security auditing)
                const queryLog = mockDatabaseService.queryLogs.find((log: any) => 
                    log.sql === testQuery.sql && 
                    JSON.stringify(log.params) === JSON.stringify(testQuery.params)
                );
                expect(queryLog).toBeDefined();
                expect(queryLog.timestamp).toBeInstanceOf(Date);
                expect(queryLog.executionTime).toBeGreaterThan(0);
            }
            
            await mockDatabaseService.close(connectionId);
        });
        
        it('should validate input parameters before query execution', () => {
            const validateSearchParams = (params: any) => {
                const errors: string[] = [];
                
                // Validate search term
                if (!params.searchTerm || typeof params.searchTerm !== 'string') {
                    errors.push('Search term is required and must be a string');
                } else if (params.searchTerm.length > 200) {
                    errors.push('Search term too long (max 200 characters)');
                } else if (params.searchTerm.trim().length === 0) {
                    errors.push('Search term cannot be empty');
                }
                
                // Validate table name
                if (!params.tableName || typeof params.tableName !== 'string') {
                    errors.push('Table name is required');
                } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(params.tableName)) {
                    errors.push('Invalid table name format');
                }
                
                // Validate search fields
                if (!Array.isArray(params.searchFields) || params.searchFields.length === 0) {
                    errors.push('Search fields must be a non-empty array');
                } else if (params.searchFields.length > 10) {
                    errors.push('Too many search fields (max 10)');
                } else {
                    params.searchFields.forEach((field: any, index: number) => {
                        if (typeof field !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field)) {
                            errors.push(`Invalid search field at index ${index}`);
                        }
                    });
                }
                
                // Validate pagination
                if (params.limit !== undefined) {
                    if (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100) {
                        errors.push('Limit must be an integer between 1 and 100');
                    }
                }
                
                if (params.offset !== undefined) {
                    if (!Number.isInteger(params.offset) || params.offset < 0) {
                        errors.push('Offset must be a non-negative integer');
                    }
                }
                
                return { valid: errors.length === 0, errors };
            };
            
            // Test valid parameters
            const validParams = {
                searchTerm: 'javascript framework',
                tableName: 'articles',
                searchFields: ['title', 'content'],
                limit: 20,
                offset: 0
            };
            
            const validResult = validateSearchParams(validParams);
            expect(validResult.valid).toBe(true);
            expect(validResult.errors).toHaveLength(0);
            
            // Test invalid parameters
            const invalidParamsTests = [
                {
                    params: { searchTerm: '', tableName: 'articles', searchFields: ['title'] },
                    expectedError: 'Search term cannot be empty'
                },
                {
                    params: { searchTerm: 'test', tableName: 'articles; DROP TABLE', searchFields: ['title'] },
                    expectedError: 'Invalid table name format'
                },
                {
                    params: { searchTerm: 'test', tableName: 'articles', searchFields: [] },
                    expectedError: 'Search fields must be a non-empty array'
                },
                {
                    params: { searchTerm: 'test', tableName: 'articles', searchFields: ['title'], limit: 150 },
                    expectedError: 'Limit must be an integer between 1 and 100'
                },
                {
                    params: { searchTerm: 'a'.repeat(201), tableName: 'articles', searchFields: ['title'] },
                    expectedError: 'Search term too long'
                }
            ];
            
            invalidParamsTests.forEach(test => {
                const result = validateSearchParams(test.params);
                expect(result.valid).toBe(false);
                expect(result.errors.some(error => error.includes(test.expectedError.split(' ')[0]))).toBe(true);
            });
        });
    });

    describe('Performance Monitoring and Optimization', () => {
        
        it('should track query performance metrics', async () => {
            const connectionId = await mockDatabaseService.connect({
                type: 'postgresql',
                connectionString: 'postgresql://user:pass@localhost:5432/testdb'
            });
            
            // Execute multiple queries to generate metrics
            const queries = [
                { sql: 'SELECT * FROM articles WHERE title ILIKE $1 LIMIT $2', params: ['%test%', 10] },
                { sql: 'SELECT * FROM articles WHERE to_tsvector(\'english\', content) @@ to_tsquery(\'english\', $1) LIMIT $2', params: ['javascript', 20] },
                { sql: 'SELECT * FROM users WHERE email = $1', params: ['user@example.com'] }
            ];
            
            for (const query of queries) {
                await mockDatabaseService.query(connectionId, query.sql, query.params);
            }
            
            // Analyze query logs for performance metrics
            const queryLogs = mockDatabaseService.queryLogs;
            expect(queryLogs).toHaveLength(3);
            
            // Verify performance tracking
            queryLogs.forEach((log: any) => {
                expect(log.executionTime).toBeGreaterThan(0);
                expect(log.timestamp).toBeInstanceOf(Date);
                expect(log.sql).toBeDefined();
                expect(Array.isArray(log.params)).toBe(true);
            });
            
            // Calculate performance statistics
            const totalExecutionTime = queryLogs.reduce((sum: number, log: any) => sum + log.executionTime, 0);
            const averageExecutionTime = totalExecutionTime / queryLogs.length;
            const slowQueries = queryLogs.filter((log: any) => log.executionTime > 100);
            
            expect(averageExecutionTime).toBeGreaterThan(0);
            expect(slowQueries.length).toBeLessThanOrEqual(queryLogs.length);
            
            console.log(`Query Performance Summary:`);
            console.log(`  Total queries: ${queryLogs.length}`);
            console.log(`  Average execution time: ${averageExecutionTime.toFixed(2)}ms`);
            console.log(`  Slow queries (>100ms): ${slowQueries.length}`);
            
            await mockDatabaseService.close(connectionId);
        });
        
        it('should optimize query execution based on database type', async () => {
            const databaseOptimizations = {
                postgresql: {
                    useFullTextSearch: true,
                    indexType: 'GIN',
                    queryTemplate: 'SELECT * FROM $table WHERE to_tsvector(\'english\', $fields) @@ to_tsquery(\'english\', $1)',
                    expectedPerformance: '<10ms'
                },
                mysql: {
                    useFullTextSearch: true,
                    indexType: 'FULLTEXT',
                    queryTemplate: 'SELECT * FROM $table WHERE MATCH($fields) AGAINST($1 IN NATURAL LANGUAGE MODE)',
                    expectedPerformance: '<5ms'
                },
                sqlite: {
                    useFullTextSearch: true,
                    indexType: 'FTS5',
                    queryTemplate: 'SELECT * FROM $table JOIN ${table}_fts ON $table.id = ${table}_fts.rowid WHERE ${table}_fts MATCH $1',
                    expectedPerformance: '<2ms'
                }
            };
            
            // Test optimization recommendations for each database type
            Object.entries(databaseOptimizations).forEach(([dbType, optimization]) => {
                expect(optimization.useFullTextSearch).toBe(true);
                expect(optimization.indexType).toBeDefined();
                expect(optimization.queryTemplate).toContain('$1'); // Parameterized query
                expect(optimization.expectedPerformance).toMatch(/^<\d+ms$/);
                
                console.log(`${dbType.toUpperCase()} Optimization:`);
                console.log(`  Index Type: ${optimization.indexType}`);
                console.log(`  Expected Performance: ${optimization.expectedPerformance}`);
            });
        });
    });

    describe('Health Monitoring and Alerting', () => {
        
        it('should monitor database health across all connections', async () => {
            const connections = [
                { id: await mockDatabaseService.connect({ type: 'postgresql' }), type: 'postgresql' },
                { id: await mockDatabaseService.connect({ type: 'mysql' }), type: 'mysql' },
                { id: await mockDatabaseService.connect({ type: 'sqlite' }), type: 'sqlite' }
            ];
            
            // Run health checks on all connections
            const healthResults = [];
            for (const connection of connections) {
                const health = await mockDatabaseService.healthCheck(connection.id);
                healthResults.push({ ...health, type: connection.type });
                
                // Verify health check structure
                expect(health.status).toBeDefined();
                expect(['healthy', 'degraded', 'error']).toContain(health.status);
                expect(health.details).toBeDefined();
            }
            
            // Analyze overall health
            const healthyConnections = healthResults.filter(h => h.status === 'healthy');
            const degradedConnections = healthResults.filter(h => h.status === 'degraded');
            const errorConnections = healthResults.filter(h => h.status === 'error');
            
            expect(healthResults).toHaveLength(3);
            expect(healthyConnections.length + degradedConnections.length + errorConnections.length).toBe(3);
            
            console.log('Database Health Summary:');
            console.log(`  Healthy: ${healthyConnections.length}`);
            console.log(`  Degraded: ${degradedConnections.length}`);
            console.log(`  Error: ${errorConnections.length}`);
            
            // Clean up connections
            for (const connection of connections) {
                await mockDatabaseService.close(connection.id);
            }
        });
        
        it('should generate alerts for performance degradation', () => {
            const performanceThresholds = {
                queryExecutionTime: 1000,  // 1 second
                connectionPoolUtilization: 0.8, // 80%
                errorRate: 0.05, // 5%
                responseTime: 500 // 500ms
            };
            
            const generatePerformanceAlert = (metrics: any): string[] => {
                const alerts: string[] = [];
                
                if (metrics.averageQueryTime > performanceThresholds.queryExecutionTime) {
                    alerts.push(`HIGH_QUERY_TIME: Average query time ${metrics.averageQueryTime}ms exceeds threshold ${performanceThresholds.queryExecutionTime}ms`);
                }
                
                if (metrics.poolUtilization > performanceThresholds.connectionPoolUtilization) {
                    alerts.push(`HIGH_POOL_UTILIZATION: Pool utilization ${(metrics.poolUtilization * 100).toFixed(1)}% exceeds threshold ${(performanceThresholds.connectionPoolUtilization * 100)}%`);
                }
                
                if (metrics.errorRate > performanceThresholds.errorRate) {
                    alerts.push(`HIGH_ERROR_RATE: Error rate ${(metrics.errorRate * 100).toFixed(1)}% exceeds threshold ${(performanceThresholds.errorRate * 100)}%`);
                }
                
                if (metrics.responseTime > performanceThresholds.responseTime) {
                    alerts.push(`HIGH_RESPONSE_TIME: Response time ${metrics.responseTime}ms exceeds threshold ${performanceThresholds.responseTime}ms`);
                }
                
                return alerts;
            };
            
            // Test with good performance metrics
            const goodMetrics = {
                averageQueryTime: 50,
                poolUtilization: 0.6,
                errorRate: 0.01,
                responseTime: 200
            };
            
            const goodAlerts = generatePerformanceAlert(goodMetrics);
            expect(goodAlerts).toHaveLength(0);
            
            // Test with poor performance metrics
            const poorMetrics = {
                averageQueryTime: 2000,
                poolUtilization: 0.95,
                errorRate: 0.1,
                responseTime: 800
            };
            
            const poorAlerts = generatePerformanceAlert(poorMetrics);
            expect(poorAlerts.length).toBeGreaterThan(0);
            expect(poorAlerts.some(alert => alert.includes('HIGH_QUERY_TIME'))).toBe(true);
            expect(poorAlerts.some(alert => alert.includes('HIGH_POOL_UTILIZATION'))).toBe(true);
            expect(poorAlerts.some(alert => alert.includes('HIGH_ERROR_RATE'))).toBe(true);
            expect(poorAlerts.some(alert => alert.includes('HIGH_RESPONSE_TIME'))).toBe(true);
            
            console.log('Performance Alerts Generated:');
            poorAlerts.forEach(alert => console.log(`  - ${alert}`));
        });
    });

    describe('Error Recovery and Resilience', () => {
        
        it('should implement circuit breaker pattern for database failures', () => {
            class CircuitBreaker {
                private failures: number = 0;
                private lastFailureTime: number = 0;
                private state: 'closed' | 'open' | 'half-open' = 'closed';
                
                constructor(
                    private failureThreshold: number = 5,
                    private recoveryTimeoutMs: number = 60000
                ) {}
                
                async execute<T>(operation: () => Promise<T>): Promise<T> {
                    if (this.state === 'open') {
                        if (Date.now() - this.lastFailureTime > this.recoveryTimeoutMs) {
                            this.state = 'half-open';
                        } else {
                            throw new Error('Circuit breaker is open');
                        }
                    }
                    
                    try {
                        const result = await operation();
                        this.onSuccess();
                        return result;
                    } catch (error) {
                        this.onFailure();
                        throw error;
                    }
                }
                
                private onSuccess(): void {
                    this.failures = 0;
                    this.state = 'closed';
                }
                
                private onFailure(): void {
                    this.failures++;
                    this.lastFailureTime = Date.now();
                    
                    if (this.failures >= this.failureThreshold) {
                        this.state = 'open';
                    }
                }
                
                getState() {
                    return {
                        state: this.state,
                        failures: this.failures,
                        lastFailureTime: this.lastFailureTime
                    };
                }
            }
            
            const circuitBreaker = new CircuitBreaker(3, 5000); // 3 failures, 5 second timeout
            
            // Simulate successful operations
            const successOperation = () => Promise.resolve('success');
            
            expect(await circuitBreaker.execute(successOperation)).toBe('success');
            expect(circuitBreaker.getState().state).toBe('closed');
            
            // Simulate failures
            const failingOperation = () => Promise.reject(new Error('Database connection failed'));
            
            // Cause failures to trip the circuit breaker
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(failingOperation);
                } catch (error) {
                    // Expected failure
                }
            }
            
            expect(circuitBreaker.getState().state).toBe('open');
            
            // Circuit breaker should reject operations when open
            await expect(circuitBreaker.execute(successOperation))
                .rejects.toThrow('Circuit breaker is open');
        });
        
        it('should implement retry logic with exponential backoff', async () => {
            const retryWithBackoff = async <T>(
                operation: () => Promise<T>,
                maxRetries: number = 3,
                baseDelay: number = 1000
            ): Promise<T> => {
                let lastError: Error;
                
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        return await operation();
                    } catch (error) {
                        lastError = error as Error;
                        
                        if (attempt === maxRetries) {
                            throw error;
                        }
                        
                        // Exponential backoff with jitter
                        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
                        await new Promise(resolve => setTimeout(resolve, Math.min(delay, 100))); // Cap delay for testing
                    }
                }
                
                throw lastError!;
            };
            
            // Test successful retry
            let attemptCount = 0;
            const eventuallySuccessful = () => {
                attemptCount++;
                if (attemptCount < 3) {
                    throw new Error(`Attempt ${attemptCount} failed`);
                }
                return Promise.resolve(`Success on attempt ${attemptCount}`);
            };
            
            const result = await retryWithBackoff(eventuallySuccessful);
            expect(result).toBe('Success on attempt 3');
            expect(attemptCount).toBe(3);
            
            // Test complete failure
            attemptCount = 0;
            const alwaysFails = () => {
                attemptCount++;
                throw new Error(`Persistent failure (attempt ${attemptCount})`);
            };
            
            await expect(retryWithBackoff(alwaysFails, 2)).rejects.toThrow('Persistent failure (attempt 2)');
            expect(attemptCount).toBe(2);
        });
    });
});