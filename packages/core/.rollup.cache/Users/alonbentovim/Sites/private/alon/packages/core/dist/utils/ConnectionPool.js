/**
 * Connection Pool - Connection Lifecycle Management and Pooling
 * @description Manages connection pooling, timeouts, and retry logic for data source adapters
 */
import { errorMapper } from './ErrorMapper';
/**
 * Connection pool implementation
 */
export class ConnectionPool {
    constructor(adapterType, factory, config = {}) {
        this.pool = new Map();
        this.waitingQueue = [];
        this.isDestroyed = false;
        this.adapterType = adapterType;
        this.factory = factory;
        this.config = {
            maxConnections: 10,
            idleTimeoutMs: 30000, // 30 seconds
            connectionTimeoutMs: 10000, // 10 seconds
            acquireTimeoutMs: 5000, // 5 seconds
            validateOnAcquire: true,
            validateOnRelease: false,
            retry: {
                attempts: 3,
                backoffMs: 1000,
                maxBackoffMs: 10000
            },
            ...config
        };
        this.startIdleCheck();
    }
    /**
     * Acquire a connection from the pool
     */
    async acquire(config) {
        if (this.isDestroyed) {
            throw errorMapper.mapError(new Error('Connection pool has been destroyed'), this.adapterType, { config });
        }
        // Try to get an existing idle connection
        const idleConnection = await this.findIdleConnection();
        if (idleConnection) {
            return this.prepareConnection(idleConnection, config);
        }
        // Check if we can create a new connection
        if (this.pool.size < this.config.maxConnections) {
            return this.createNewConnection(config);
        }
        // Wait for a connection to be available
        return this.waitForConnection(config);
    }
    /**
     * Release a connection back to the pool
     */
    async release(connection) {
        const pooledConnection = this.pool.get(connection.id);
        if (!pooledConnection) {
            // Connection not from this pool, just destroy it
            await this.factory.destroyConnection(connection).catch(() => { });
            return;
        }
        pooledConnection.inUse = false;
        pooledConnection.lastUsed = Date.now();
        pooledConnection.useCount++;
        // Validate connection if configured
        if (this.config.validateOnRelease) {
            const isValid = await this.factory.validateConnection(connection).catch(() => false);
            if (!isValid) {
                await this.removeConnection(connection.id);
                return;
            }
        }
        // Check if anyone is waiting for a connection
        this.processWaitingQueue();
    }
    /**
     * Execute operation with automatic connection management
     */
    async withConnection(config, operation) {
        const connection = await this.acquire(config);
        try {
            return await operation(connection);
        }
        finally {
            await this.release(connection);
        }
    }
    /**
     * Execute operation with retry logic
     */
    async executeWithRetry(config, operation) {
        let lastError;
        let backoffMs = this.config.retry.backoffMs;
        for (let attempt = 1; attempt <= this.config.retry.attempts; attempt++) {
            try {
                return await this.withConnection(config, operation);
            }
            catch (error) {
                lastError = errorMapper.mapError(error, this.adapterType, {
                    config,
                    attempt,
                    maxAttempts: this.config.retry.attempts
                });
                // Don't retry if error is not retryable
                if (!lastError.recovery?.retryable || attempt === this.config.retry.attempts) {
                    throw lastError;
                }
                // Wait before next attempt
                await this.delay(backoffMs);
                backoffMs = Math.min(backoffMs * 2, this.config.retry.maxBackoffMs);
            }
        }
        throw lastError;
    }
    /**
     * Get pool statistics
     */
    getStats() {
        const idle = Array.from(this.pool.values()).filter(p => !p.inUse).length;
        const active = this.pool.size - idle;
        return {
            totalConnections: this.pool.size,
            idleConnections: idle,
            activeConnections: active,
            waitingRequests: this.waitingQueue.length,
            poolConfig: { ...this.config }
        };
    }
    /**
     * Destroy the connection pool and all connections
     */
    async destroy() {
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;
        // Clear idle check interval
        if (this.idleCheckInterval) {
            clearInterval(this.idleCheckInterval);
        }
        // Reject all waiting requests
        const waitingError = errorMapper.mapError(new Error('Connection pool destroyed'), this.adapterType);
        this.waitingQueue.forEach(({ reject }) => reject(waitingError));
        this.waitingQueue.length = 0;
        // Destroy all connections
        const destroyPromises = Array.from(this.pool.values()).map(async ({ connection }) => {
            try {
                await this.factory.destroyConnection(connection);
            }
            catch {
                // Ignore errors during destruction
            }
        });
        await Promise.allSettled(destroyPromises);
        this.pool.clear();
    }
    /**
     * Find an idle connection that can be reused
     */
    async findIdleConnection() {
        for (const [id, pooledConnection] of this.pool.entries()) {
            if (pooledConnection.inUse) {
                continue;
            }
            // Check if connection is still valid
            if (this.config.validateOnAcquire) {
                const isValid = await this.factory.validateConnection(pooledConnection.connection).catch(() => false);
                if (!isValid) {
                    await this.removeConnection(id);
                    continue;
                }
            }
            return pooledConnection.connection;
        }
        return null;
    }
    /**
     * Create a new connection
     */
    async createNewConnection(config) {
        try {
            const connection = await Promise.race([
                this.factory.createConnection(config),
                this.createTimeoutPromise(this.config.connectionTimeoutMs)
            ]);
            const pooledConnection = {
                connection,
                lastUsed: Date.now(),
                inUse: true,
                createdAt: Date.now(),
                useCount: 0
            };
            this.pool.set(connection.id, pooledConnection);
            return connection;
        }
        catch (error) {
            throw errorMapper.mapError(error, this.adapterType, { config });
        }
    }
    /**
     * Wait for an available connection
     */
    async waitForConnection(config) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
                if (index >= 0) {
                    this.waitingQueue.splice(index, 1);
                }
                reject(errorMapper.mapError(new Error('Connection acquire timeout'), this.adapterType, { config, timeout: this.config.acquireTimeoutMs }));
            }, this.config.acquireTimeoutMs);
            this.waitingQueue.push({
                resolve: (connection) => {
                    clearTimeout(timeout);
                    resolve(connection);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                },
                timestamp: Date.now()
            });
        });
    }
    /**
     * Process waiting queue when a connection becomes available
     */
    async processWaitingQueue() {
        if (this.waitingQueue.length === 0) {
            return;
        }
        const idleConnection = await this.findIdleConnection();
        if (!idleConnection) {
            return;
        }
        const waiter = this.waitingQueue.shift();
        if (waiter) {
            const pooledConnection = this.pool.get(idleConnection.id);
            pooledConnection.inUse = true;
            waiter.resolve(idleConnection);
        }
    }
    /**
     * Prepare connection for use
     */
    prepareConnection(connection, config) {
        const pooledConnection = this.pool.get(connection.id);
        pooledConnection.inUse = true;
        pooledConnection.lastUsed = Date.now();
        // Update connection metadata
        connection.lastUsedAt = Date.now();
        connection.metadata = { ...connection.metadata, config };
        return connection;
    }
    /**
     * Remove connection from pool
     */
    async removeConnection(connectionId) {
        const pooledConnection = this.pool.get(connectionId);
        if (pooledConnection) {
            this.pool.delete(connectionId);
            await this.factory.destroyConnection(pooledConnection.connection).catch(() => { });
        }
    }
    /**
     * Start periodic idle connection cleanup
     */
    startIdleCheck() {
        this.idleCheckInterval = setInterval(() => {
            const now = Date.now();
            const toRemove = [];
            for (const [id, pooledConnection] of this.pool.entries()) {
                if (!pooledConnection.inUse &&
                    now - pooledConnection.lastUsed > this.config.idleTimeoutMs) {
                    toRemove.push(id);
                }
            }
            // Remove idle connections
            toRemove.forEach(id => this.removeConnection(id).catch(() => { }));
        }, this.config.idleTimeoutMs / 2); // Check twice as often as timeout
    }
    /**
     * Create a timeout promise
     */
    createTimeoutPromise(timeoutMs) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });
    }
    /**
     * Delay execution
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=ConnectionPool.js.map