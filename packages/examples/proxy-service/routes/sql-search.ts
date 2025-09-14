/**
 * SQL Search Route - Secure Proxy Endpoint for Database Operations
 * 
 * This route provides a secure RESTful API for SQL database search operations,
 * with built-in security middleware, rate limiting, and comprehensive error handling.
 */

import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { body, query, validationResult } from 'express-validator';
import DatabaseService from '../DatabaseService';

const router = express.Router();

// Enhanced security middleware
router.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration for production
router.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Rate limiting to prevent abuse
const searchRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: {
        error: 'Too many search requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
    }
});

// Database service instances (initialized based on configuration)
const databaseServices = new Map<string, DatabaseService>();

/**
 * Authentication middleware (example implementation)
 */
const authenticateRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiKey = req.headers['x-api-key'] as string;
        const authHeader = req.headers.authorization;
        
        // API Key authentication
        if (apiKey) {
            if (await validateApiKey(apiKey)) {
                req.user = { apiKey, type: 'api-key' };
                return next();
            }
        }
        
        // Bearer token authentication
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            if (await validateBearerToken(token)) {
                req.user = { token, type: 'bearer' };
                return next();
            }
        }
        
        // For development/testing, allow unauthenticated requests
        if (process.env.NODE_ENV === 'development') {
            req.user = { type: 'development' };
            return next();
        }
        
        res.status(401).json({
            error: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED'
        });
    } catch (error) {
        res.status(401).json({
            error: 'Authentication failed',
            code: 'AUTHENTICATION_FAILED'
        });
    }
};

/**
 * Validate API key (implement based on your authentication system)
 */
async function validateApiKey(apiKey: string): Promise<boolean> {
    // Implement your API key validation logic here
    // This could involve database lookup, external service call, etc.
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    return validApiKeys.includes(apiKey);
}

/**
 * Validate bearer token (implement based on your authentication system)
 */
async function validateBearerToken(token: string): Promise<boolean> {
    // Implement JWT validation, OAuth validation, etc.
    // This is a placeholder implementation
    try {
        // Example: JWT validation
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // return !!decoded;
        return token.length > 10; // Placeholder validation
    } catch {
        return false;
    }
}

/**
 * Get or create database service instance
 */
async function getDatabaseService(connectionId: string, config: any): Promise<DatabaseService> {
    if (!databaseServices.has(connectionId)) {
        const service = new DatabaseService(config.database, config.pool);
        await service.connect();
        databaseServices.set(connectionId, service);
    }
    return databaseServices.get(connectionId)!;
}

/**
 * Search validation middleware
 */
const validateSearchRequest = [
    body('searchTerm')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Search term must be between 1 and 200 characters'),
    
    body('tableName')
        .trim()
        .matches(/^[a-zA-Z][a-zA-Z0-9_]*$/)
        .withMessage('Invalid table name format'),
    
    body('searchFields')
        .isArray({ min: 1, max: 10 })
        .withMessage('Search fields must be an array with 1-10 items'),
    
    body('searchFields.*')
        .trim()
        .matches(/^[a-zA-Z][a-zA-Z0-9_]*$/)
        .withMessage('Invalid search field format'),
    
    body('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    body('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer'),
    
    body('whereClause')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Where clause must be a string with max 500 characters'),
    
    body('orderBy')
        .optional()
        .matches(/^[a-zA-Z][a-zA-Z0-9_]*(\s+(ASC|DESC))?$/)
        .withMessage('Invalid order by format')
];

/**
 * POST /search - Execute search query
 */
router.post('/search', 
    searchRateLimit,
    authenticateRequest,
    validateSearchRequest,
    async (req: Request, res: Response) => {
        try {
            // Check validation results
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: errors.array()
                });
            }

            // Extract and validate database configuration
            const databaseConfig = {
                database: {
                    type: req.body.databaseType || 'postgresql',
                    connectionString: req.body.connectionString,
                    host: req.body.host,
                    port: req.body.port,
                    database: req.body.database,
                    username: req.body.username,
                    password: req.body.password,
                    filename: req.body.filename
                },
                pool: {
                    min: 2,
                    max: 10,
                    idleTimeoutMs: 30000,
                    connectionTimeoutMs: 2000,
                    statementTimeout: 5000
                }
            };

            // Create connection identifier for pooling
            const connectionId = createConnectionId(databaseConfig.database);
            
            // Get database service
            const dbService = await getDatabaseService(connectionId, databaseConfig);
            
            // Execute search
            const searchQuery = {
                searchTerm: req.body.searchTerm,
                tableName: req.body.tableName,
                searchFields: req.body.searchFields,
                whereClause: req.body.whereClause,
                orderBy: req.body.orderBy,
                limit: req.body.limit || 20,
                offset: req.body.offset || 0
            };

            const result = await dbService.search(searchQuery);
            
            // Log successful search for monitoring
            console.log('Search executed successfully:', {
                user: req.user,
                query: {
                    ...searchQuery,
                    searchTerm: searchQuery.searchTerm.substring(0, 50) + '...' // Truncate for logging
                },
                resultCount: result.data.length,
                executionTime: result.executionTime
            });

            res.json({
                success: true,
                data: result.data,
                metadata: {
                    total: result.total,
                    limit: searchQuery.limit,
                    offset: searchQuery.offset,
                    executionTime: result.executionTime,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Search request failed:', {
                error: error.message,
                user: req.user,
                body: { ...req.body, password: '[REDACTED]', connectionString: '[REDACTED]' }
            });

            res.status(500).json({
                error: 'Search request failed',
                code: 'SEARCH_ERROR',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }
);

/**
 * GET /health - Database health check endpoint
 */
router.get('/health', 
    authenticateRequest,
    async (req: Request, res: Response) => {
        try {
            const healthResults = new Map();
            
            // Check health of all active database connections
            for (const [connectionId, service] of databaseServices) {
                try {
                    const health = await service.healthCheck();
                    healthResults.set(connectionId, health);
                } catch (error) {
                    healthResults.set(connectionId, {
                        status: 'error',
                        details: { error: error.message }
                    });
                }
            }

            const allHealthy = Array.from(healthResults.values())
                .every(result => result.status === 'healthy');

            res.status(allHealthy ? 200 : 503).json({
                status: allHealthy ? 'healthy' : 'degraded',
                connections: Object.fromEntries(healthResults),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * GET /metrics - Performance metrics endpoint
 */
router.get('/metrics', 
    authenticateRequest,
    async (req: Request, res: Response) => {
        try {
            const metrics = new Map();
            
            for (const [connectionId, service] of databaseServices) {
                metrics.set(connectionId, service.getMetrics());
            }

            res.json({
                success: true,
                metrics: Object.fromEntries(metrics),
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                error: 'Failed to retrieve metrics',
                code: 'METRICS_ERROR',
                message: error.message
            });
        }
    }
);

/**
 * GET /config/validate - Validate database configuration
 */
router.post('/config/validate',
    authenticateRequest,
    [
        body('databaseType').isIn(['postgresql', 'mysql', 'sqlite']).withMessage('Invalid database type'),
        body('connectionString').optional().isString().withMessage('Connection string must be a string'),
        body('host').optional().isString().withMessage('Host must be a string'),
        body('database').optional().isString().withMessage('Database must be a string')
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    valid: false,
                    errors: errors.array()
                });
            }

            const config = {
                type: req.body.databaseType,
                connectionString: req.body.connectionString,
                host: req.body.host,
                port: req.body.port,
                database: req.body.database,
                username: req.body.username,
                password: req.body.password,
                filename: req.body.filename
            };

            // Test connection without storing it
            const testService = new DatabaseService(config);
            await testService.connect();
            const health = await testService.healthCheck();
            await testService.close();

            res.json({
                valid: true,
                health,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.json({
                valid: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * Create unique connection identifier for connection pooling
 */
function createConnectionId(config: any): string {
    const key = config.connectionString || 
                `${config.type}://${config.host}:${config.port}/${config.database}` ||
                config.filename || 
                'default';
    return Buffer.from(key).toString('base64').substring(0, 16);
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(): Promise<void> {
    console.log('Closing database connections...');
    
    const closePromises = Array.from(databaseServices.values()).map(service => 
        service.close().catch(error => 
            console.error('Error closing database connection:', error)
        )
    );
    
    await Promise.all(closePromises);
    databaseServices.clear();
    console.log('All database connections closed');
}

// Handle process signals for graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default router;

// Extend Express Request interface for TypeScript
declare global {
    namespace Express {
        interface Request {
            user?: {
                apiKey?: string;
                token?: string;
                type: string;
            };
        }
    }
}