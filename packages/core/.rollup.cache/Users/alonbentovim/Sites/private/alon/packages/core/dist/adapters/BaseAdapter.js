/**
 * Base Data Source Adapter - Abstract Base Class and Interface
 * @description Provides unified interface for all data source adapters with common functionality
 */
/**
 * Abstract base data source adapter class
 */
export class BaseDataSourceAdapter {
    constructor(type) {
        this.connections = new Map();
        this.metrics = new Map();
        this.adapterType = type;
    }
    /**
     * Get adapter type
     */
    get type() {
        return this.adapterType;
    }
    /**
     * Default health check implementation
     */
    async healthCheck(connection) {
        try {
            return connection.status === 'connected';
        }
        catch {
            return false;
        }
    }
    /**
     * Get all active connections
     */
    getActiveConnections() {
        return Array.from(this.connections.values())
            .filter(conn => conn.status === 'connected');
    }
    /**
     * Get connection by ID
     */
    getConnection(connectionId) {
        return this.connections.get(connectionId);
    }
    /**
     * Get connection metrics
     */
    getConnectionMetrics(connectionId) {
        if (connectionId) {
            return this.metrics.get(connectionId) || [];
        }
        // Return all metrics
        const allMetrics = [];
        for (const metrics of this.metrics.values()) {
            allMetrics.push(...metrics);
        }
        return allMetrics;
    }
    /**
     * Create a new connection object
     */
    createConnection(connectionId, metadata = {}) {
        const connection = {
            id: connectionId,
            adapterType: this.adapterType,
            status: 'connecting',
            createdAt: Date.now(),
            lastUsedAt: Date.now(),
            metadata: { ...metadata }
        };
        this.connections.set(connectionId, connection);
        return connection;
    }
    /**
     * Update connection status
     */
    updateConnectionStatus(connectionId, status, metadata) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.status = status;
            connection.lastUsedAt = Date.now();
            if (metadata) {
                connection.metadata = { ...connection.metadata, ...metadata };
            }
        }
    }
    /**
     * Remove connection from tracking
     */
    removeConnection(connectionId) {
        this.connections.delete(connectionId);
        this.metrics.delete(connectionId);
    }
    /**
     * Record connection metrics
     */
    recordMetrics(connectionId, metrics) {
        if (!this.metrics.has(connectionId)) {
            this.metrics.set(connectionId, []);
        }
        const connectionMetrics = this.metrics.get(connectionId);
        connectionMetrics.push(metrics);
        // Keep only last 100 metrics per connection
        if (connectionMetrics.length > 100) {
            connectionMetrics.splice(0, connectionMetrics.length - 100);
        }
    }
    /**
     * Create standardized error
     */
    createError(message, type, code, originalError, context) {
        const error = new Error(message);
        error.type = type;
        error.code = code;
        if (originalError) {
            error.originalError = originalError;
        }
        error.context = {
            adapter: this.adapterType,
            timestamp: Date.now(),
            ...context
        };
        // Add recovery suggestions based on error type
        switch (type) {
            case 'connection':
                error.recovery = {
                    retryable: true,
                    suggestions: [
                        'Check network connectivity',
                        'Verify connection configuration',
                        'Ensure service is running'
                    ],
                    fallbackOptions: ['Use cached results', 'Try alternative adapter']
                };
                break;
            case 'timeout':
                error.recovery = {
                    retryable: true,
                    suggestions: [
                        'Increase timeout configuration',
                        'Optimize query complexity',
                        'Check system performance'
                    ]
                };
                break;
            case 'validation':
                error.recovery = {
                    retryable: false,
                    suggestions: [
                        'Check configuration format',
                        'Verify required fields',
                        'Review data types'
                    ]
                };
                break;
            default:
                error.recovery = {
                    retryable: true,
                    suggestions: ['Check logs for details', 'Try again later']
                };
        }
        return error;
    }
    /**
     * Execute operation with performance tracking
     */
    async executeWithMetrics(connectionId, operation, operationType) {
        const startTime = performance.now();
        let success = false;
        let resultCount = 0;
        try {
            const result = await operation();
            success = true;
            // Try to count results if it's an array
            if (Array.isArray(result)) {
                resultCount = result.length;
            }
            return result;
        }
        finally {
            const totalTime = performance.now() - startTime;
            this.recordMetrics(connectionId, {
                connectionTime: 0, // Will be set by specific operations
                queryTime: operationType === 'query' ? totalTime : 0,
                totalTime,
                success,
                resultCount
            });
        }
    }
    /**
     * Cleanup all resources
     */
    async destroy() {
        // Disconnect all connections
        const disconnectPromises = Array.from(this.connections.values())
            .map(connection => this.disconnect(connection).catch(() => { })); // Ignore errors during cleanup
        await Promise.allSettled(disconnectPromises);
        // Clear tracking
        this.connections.clear();
        this.metrics.clear();
    }
}
//# sourceMappingURL=BaseAdapter.js.map