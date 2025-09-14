/**
 * Action Handler - Enhanced action processing pipeline
 * @description Main pipeline that orchestrates action handling with events, callbacks, and lifecycle management
 */
import { eventManager } from './EventManager';
import { callbackExecutor } from '../utils/CallbackExecutor';
import { contextPreserver } from '../utils/ContextPreserver';
import { actionInterceptor } from '../utils/ActionInterceptor';
import { cleanupManager } from '../utils/CleanupManager';
/**
 * Enhanced action handler with integrated pipeline
 */
export class AdvancedActionHandler {
    constructor(config = {}) {
        this.statistics = this.initializeStatistics();
        this.activeActions = new Map();
        this.processingQueue = [];
        this.isProcessingQueue = false;
        this.config = {
            debug: false,
            timeout: 10000,
            autoCleanup: true,
            maxConcurrentActions: 10,
            enableMetrics: true,
            errorStrategy: 'both',
            validateContext: true,
            detectLeaks: true,
            ...config
        };
        if (this.config.debug) {
            console.log('[ActionHandler] Initialized with config:', this.config);
        }
        // Set up periodic cleanup and leak detection
        if (this.config.autoCleanup) {
            setInterval(() => this.performMaintenanceTasks(), 30000);
        }
    }
    /**
     * Process an action through the complete pipeline
     */
    async processAction(result, options = {}) {
        const actionId = this.generateActionId();
        const startTime = performance.now();
        // Check concurrent action limit
        if (this.activeActions.size >= this.config.maxConcurrentActions) {
            return this.queueAction(actionId, result, options);
        }
        try {
            this.activeActions.set(actionId, { startTime, result });
            this.statistics.totalActions++;
            this.updateConcurrentStats();
            if (this.config.debug) {
                console.log(`[ActionHandler] Processing action ${actionId} for result:`, result.title);
            }
            // Emit action start event
            const startEventResults = await eventManager.emit('action:start', {
                actionId,
                result,
                timestamp: Date.now()
            });
            // Create and validate context
            const contextResult = await this.createActionContext(result, options);
            if (!contextResult.success) {
                throw new Error(`Context creation failed: ${contextResult.error?.message}`);
            }
            const context = contextResult.context;
            // Execute action interception
            const interceptionResult = await this.executeInterception(result, context, options);
            if (interceptionResult.prevented) {
                return this.handlePreventedAction(actionId, result, context, interceptionResult);
            }
            // Execute callbacks
            const callbackResults = await this.executeCallbacks(result, context, options);
            // Perform final action execution
            const executionResult = await this.executeFinalAction(result, context, interceptionResult);
            // Emit action complete event
            const completeEventResults = await eventManager.emit('action:complete', {
                actionId,
                result,
                context,
                success: executionResult.success,
                timestamp: Date.now()
            });
            // Perform cleanup if configured
            let cleanupPerformed = false;
            if (this.config.autoCleanup && options.cleanupConfig?.immediate !== false) {
                cleanupPerformed = await this.performActionCleanup(actionId, context);
            }
            const processingTime = performance.now() - startTime;
            this.updateStatistics(true, processingTime);
            const finalResult = {
                success: executionResult.success,
                result: executionResult.result,
                context,
                metadata: {
                    actionId,
                    processingTime,
                    eventCount: startEventResults.results.length + completeEventResults.results.length,
                    callbackCount: callbackResults.successCount + callbackResults.failureCount,
                    intercepted: interceptionResult.intercepted,
                    prevented: interceptionResult.prevented,
                    cleanupPerformed
                },
                eventResults: [...startEventResults.results, ...completeEventResults.results],
                callbackResults: callbackResults.results
            };
            if (this.config.debug) {
                console.log(`[ActionHandler] Action ${actionId} completed in ${processingTime.toFixed(2)}ms`);
            }
            return finalResult;
        }
        catch (error) {
            const processingTime = performance.now() - startTime;
            this.updateStatistics(false, processingTime);
            // Emit action error event
            await eventManager.emit('action:error', {
                actionId,
                result,
                error: error instanceof Error ? error : new Error(String(error)),
                timestamp: Date.now()
            });
            const errorResult = {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                metadata: {
                    actionId,
                    processingTime,
                    eventCount: 1,
                    callbackCount: 0,
                    intercepted: false,
                    prevented: false,
                    cleanupPerformed: false
                }
            };
            if (this.config.errorStrategy === 'throw' || this.config.errorStrategy === 'both') {
                throw error;
            }
            return errorResult;
        }
        finally {
            this.activeActions.delete(actionId);
            this.processQueuedActions();
        }
    }
    /**
     * Register action callback with specific event
     */
    registerActionCallback(event, callback, options = {}) {
        const subscriptionId = eventManager.subscribe(event, async (data) => {
            if (data && typeof data === 'object' && 'result' in data && 'context' in data) {
                const { result, context } = data;
                return callbackExecutor.execute(callback, [result, context], {
                    timeout: options.timeout || this.config.timeout,
                    retry: options.retries ? {
                        maxAttempts: options.retries,
                        delayMs: 100
                    } : undefined
                });
            }
        }, {
            once: options.once,
            priority: options.priority
        });
        if (this.config.debug) {
            console.log(`[ActionHandler] Registered callback for event '${event}' with ID ${subscriptionId}`);
        }
        return subscriptionId;
    }
    /**
     * Process multiple actions in parallel
     */
    async processActionsParallel(actions, globalOptions = {}) {
        const startTime = performance.now();
        if (this.config.debug) {
            console.log(`[ActionHandler] Processing ${actions.length} actions in parallel`);
        }
        const promises = actions.map(({ result, options = {} }) => this.processAction(result, { ...globalOptions, ...options }));
        try {
            const results = await Promise.allSettled(promises);
            const processedResults = results.map(result => result.status === 'fulfilled'
                ? result.value
                : {
                    success: false,
                    error: new Error('Action processing failed'),
                    metadata: {
                        actionId: this.generateActionId(),
                        processingTime: 0,
                        eventCount: 0,
                        callbackCount: 0,
                        intercepted: false,
                        prevented: false,
                        cleanupPerformed: false
                    }
                });
            const totalTime = performance.now() - startTime;
            if (this.config.debug) {
                console.log(`[ActionHandler] Parallel processing completed in ${totalTime.toFixed(2)}ms`);
            }
            return processedResults;
        }
        catch (error) {
            if (this.config.debug) {
                console.error('[ActionHandler] Parallel processing failed:', error);
            }
            throw error;
        }
    }
    /**
     * Get current statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }
    /**
     * Reset statistics
     */
    resetStatistics() {
        this.statistics = this.initializeStatistics();
        if (this.config.debug) {
            console.log('[ActionHandler] Statistics reset');
        }
    }
    /**
     * Perform immediate cleanup
     */
    async cleanup() {
        const results = await cleanupManager.cleanupAll(false);
        if (this.config.debug) {
            console.log(`[ActionHandler] Cleanup completed: ${results.totalCleaned} resources cleaned`);
        }
        return {
            cleaned: results.totalCleaned,
            errors: results.errors.length
        };
    }
    /**
     * Create action context with validation
     */
    async createActionContext(result, options) {
        try {
            const context = contextPreserver.createContext(result, '', // query will be filled by the context preserver
            {
                component: 'ActionHandler',
                timestamp: Date.now(),
                userAgent: 'AdvancedActionHandler/1.0'
            }, {
                includeMetadata: options.contextConfig?.includeMetadata ?? true,
                sanitize: options.contextConfig?.sanitize ?? this.config.validateContext,
                validate: options.contextConfig?.validate ?? this.config.validateContext
            });
            const preservationResult = contextPreserver.preserveContext(context, {
                encrypt: false,
                compress: false,
                includeMutableFields: true
            }, {
                includeMetadata: options.contextConfig?.includeMetadata ?? true,
                sanitize: options.contextConfig?.sanitize ?? this.config.validateContext
            });
            if (!preservationResult.success) {
                throw new Error(`Context preservation failed: ${preservationResult.error?.message}`);
            }
            return { success: true, context: preservationResult.preservedContext };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }
    /**
     * Execute action interception
     */
    async executeInterception(result, context, options) {
        return actionInterceptor.interceptAction(result, context, options.actionType || 'select');
    }
    /**
     * Execute registered callbacks
     */
    async executeCallbacks(result, context, options) {
        const callbackData = { result, context };
        // Emit callback execution events
        const callbackEvents = [
            eventManager.emit('action:beforeCallback', callbackData),
            eventManager.emit('action:callback', callbackData),
            eventManager.emit('action:afterCallback', callbackData)
        ];
        const eventResults = await Promise.allSettled(callbackEvents);
        return {
            results: eventResults,
            successCount: eventResults.filter(r => r.status === 'fulfilled').length,
            failureCount: eventResults.filter(r => r.status === 'rejected').length
        };
    }
    /**
     * Execute final action
     */
    async executeFinalAction(result, context, interceptionResult) {
        if (interceptionResult.customAction) {
            return { success: true, result: await interceptionResult.customAction() };
        }
        if (interceptionResult.customNavigation) {
            return actionInterceptor.handleNavigation(result, context, result.url);
        }
        // Default action - emit selection event
        await eventManager.emit('result:selected', { result, context });
        return { success: true, result: { action: 'selected', result, context } };
    }
    /**
     * Handle prevented action
     */
    handlePreventedAction(actionId, result, context, interceptionResult) {
        this.statistics.preventedActions++;
        return {
            success: false,
            error: new Error(`Action prevented: ${interceptionResult.reason || 'Unknown reason'}`),
            context,
            metadata: {
                actionId,
                processingTime: 0,
                eventCount: 0,
                callbackCount: 0,
                intercepted: true,
                prevented: true,
                cleanupPerformed: false
            }
        };
    }
    /**
     * Perform action-specific cleanup
     */
    async performActionCleanup(actionId, context) {
        try {
            const cleanupId = cleanupManager.trackResource('context', `action_${actionId}`, async () => {
                // Clean up action context
                if (context && typeof context.cleanup === 'function') {
                    await context.cleanup();
                }
            }, { critical: false, metadata: { actionId } });
            await cleanupManager.cleanup(cleanupId);
            return true;
        }
        catch (error) {
            if (this.config.debug) {
                console.error(`[ActionHandler] Cleanup failed for action ${actionId}:`, error);
            }
            return false;
        }
    }
    /**
     * Queue action when at concurrent limit
     */
    queueAction(actionId, result, options) {
        return new Promise((resolve, reject) => {
            this.processingQueue.push({ id: actionId, result, options, resolve, reject });
            if (this.config.debug) {
                console.log(`[ActionHandler] Action ${actionId} queued (queue size: ${this.processingQueue.length})`);
            }
        });
    }
    /**
     * Process queued actions
     */
    async processQueuedActions() {
        if (this.isProcessingQueue || this.processingQueue.length === 0) {
            return;
        }
        this.isProcessingQueue = true;
        while (this.processingQueue.length > 0 && this.activeActions.size < this.config.maxConcurrentActions) {
            const queuedAction = this.processingQueue.shift();
            if (!queuedAction)
                break;
            try {
                const result = await this.processAction(queuedAction.result, queuedAction.options);
                queuedAction.resolve(result);
            }
            catch (error) {
                queuedAction.reject(error instanceof Error ? error : new Error(String(error)));
            }
        }
        this.isProcessingQueue = false;
    }
    /**
     * Perform periodic maintenance tasks
     */
    async performMaintenanceTasks() {
        try {
            // Check for memory leaks
            if (this.config.detectLeaks) {
                cleanupManager.checkForLeaks();
            }
            // Clean up old contexts
            await cleanupManager.cleanupByAge(300000); // 5 minutes
            // Update memory statistics
            this.statistics.memoryStats = {
                activeContexts: this.activeActions.size,
                cleanupOperations: cleanupManager.getStatistics().totalCleanups,
                memoryLeaks: cleanupManager.getStatistics().memoryLeaks.length
            };
        }
        catch (error) {
            if (this.config.debug) {
                console.error('[ActionHandler] Maintenance tasks failed:', error);
            }
        }
    }
    /**
     * Update processing statistics
     */
    updateStatistics(success, processingTime) {
        if (success) {
            this.statistics.successfulActions++;
        }
        else {
            this.statistics.failedActions++;
        }
        this.statistics.totalProcessingTime += processingTime;
        this.statistics.averageProcessingTime = this.statistics.totalProcessingTime / this.statistics.totalActions;
        if (processingTime < this.statistics.performance.fastestAction || this.statistics.performance.fastestAction === 0) {
            this.statistics.performance.fastestAction = processingTime;
        }
        if (processingTime > this.statistics.performance.slowestAction) {
            this.statistics.performance.slowestAction = processingTime;
        }
        this.statistics.performance.totalProcessingTime = this.statistics.totalProcessingTime;
    }
    /**
     * Update concurrent action statistics
     */
    updateConcurrentStats() {
        this.statistics.concurrentActions = this.activeActions.size;
        if (this.statistics.concurrentActions > this.statistics.peakConcurrentActions) {
            this.statistics.peakConcurrentActions = this.statistics.concurrentActions;
        }
    }
    /**
     * Generate unique action ID
     */
    generateActionId() {
        return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Initialize statistics
     */
    initializeStatistics() {
        return {
            totalActions: 0,
            successfulActions: 0,
            failedActions: 0,
            preventedActions: 0,
            averageProcessingTime: 0,
            concurrentActions: 0,
            peakConcurrentActions: 0,
            memoryStats: {
                activeContexts: 0,
                cleanupOperations: 0,
                memoryLeaks: 0
            },
            performance: {
                fastestAction: 0,
                slowestAction: 0,
                totalProcessingTime: 0
            }
        };
    }
}
/**
 * Global action handler instance
 */
export const actionHandler = new AdvancedActionHandler({
    debug: process.env.NODE_ENV === 'development',
    enableMetrics: true,
    detectLeaks: true
});
//# sourceMappingURL=ActionHandler.js.map