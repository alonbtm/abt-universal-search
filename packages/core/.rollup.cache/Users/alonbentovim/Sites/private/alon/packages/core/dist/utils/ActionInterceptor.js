/**
 * Action Interceptor - Action prevention and custom navigation utilities
 * @description Provides action interception, prevention, and custom navigation handling
 */
/**
 * Advanced action interceptor with custom navigation and prevention
 */
export class AdvancedActionInterceptor {
    constructor(options = {}) {
        this.interceptors = [];
        this.actionRegistry = new Map();
        this.navigationConfig = {};
        this.preventionConfig = {};
        this.statistics = {
            totalInterceptions: 0,
            preventedActions: 0,
            customNavigations: 0,
            executedActions: 0,
            averageInterceptionTime: 0,
            totalInterceptionTime: 0
        };
        this.debugMode = false;
        this.debugMode = options.debugMode || false;
        this.navigationConfig = options.defaultNavigationConfig || {};
        this.preventionConfig = options.defaultPreventionConfig || {};
    }
    /**
     * Register an action interceptor
     */
    addInterceptor(interceptor, priority = 0) {
        const id = this.generateInterceptorId();
        // Store interceptor with priority for sorting
        this.interceptors.push(interceptor);
        this.interceptors.sort((a, b) => b.priority - a.priority);
        if (this.debugMode) {
            console.log(`[ActionInterceptor] Registered interceptor with priority ${priority}`);
        }
        return id;
    }
    /**
     * Remove an action interceptor
     */
    removeInterceptor(interceptor) {
        const index = this.interceptors.indexOf(interceptor);
        if (index !== -1) {
            this.interceptors.splice(index, 1);
            if (this.debugMode) {
                console.log('[ActionInterceptor] Removed interceptor');
            }
            return true;
        }
        return false;
    }
    /**
     * Register a custom action handler
     */
    registerAction(type, handler, options = {}) {
        const registration = {
            type,
            handler,
            priority: options.priority || 0,
            preventable: options.preventable !== false,
            metadata: options.metadata,
            registered: Date.now()
        };
        this.actionRegistry.set(type, registration);
        if (this.debugMode) {
            console.log(`[ActionInterceptor] Registered action type: ${type}`);
        }
    }
    /**
     * Unregister a custom action handler
     */
    unregisterAction(type) {
        const removed = this.actionRegistry.delete(type);
        if (removed && this.debugMode) {
            console.log(`[ActionInterceptor] Unregistered action type: ${type}`);
        }
        return removed;
    }
    /**
     * Configure navigation handling
     */
    configureNavigation(config) {
        this.navigationConfig = { ...this.navigationConfig, ...config };
        if (this.debugMode) {
            console.log('[ActionInterceptor] Navigation configuration updated');
        }
    }
    /**
     * Configure action prevention
     */
    configurePrevention(config) {
        this.preventionConfig = { ...this.preventionConfig, ...config };
        if (this.debugMode) {
            console.log('[ActionInterceptor] Prevention configuration updated');
        }
    }
    /**
     * Intercept and potentially prevent an action
     */
    async interceptAction(result, context, actionType = 'select') {
        const startTime = performance.now();
        this.statistics.totalInterceptions++;
        let prevented = false;
        let preventionReason = '';
        let customAction;
        let stopProcessing = false;
        try {
            // Check global prevention settings
            if (this.preventionConfig.globalPreventDefault) {
                prevented = true;
                preventionReason = 'Global preventDefault enabled';
            }
            // Check prevention conditions
            if (!prevented && this.preventionConfig.preventConditions) {
                for (const condition of this.preventionConfig.preventConditions) {
                    if (condition(result, context)) {
                        prevented = true;
                        preventionReason = 'Prevention condition matched';
                        break;
                    }
                }
            }
            // Run interceptors
            if (!prevented) {
                for (const interceptor of this.interceptors) {
                    const interceptionResult = await interceptor(result, context, actionType);
                    if (interceptionResult.preventDefault) {
                        prevented = true;
                        preventionReason = interceptionResult.reason || 'Interceptor prevented action';
                        customAction = interceptionResult.customAction;
                    }
                    if (interceptionResult.stopProcessing) {
                        stopProcessing = true;
                        break;
                    }
                }
            }
            // Handle prevention
            if (prevented) {
                this.statistics.preventedActions++;
                if (this.preventionConfig.preventionHandler) {
                    this.preventionConfig.preventionHandler(result, context, preventionReason);
                }
                // Execute custom action if provided
                if (customAction) {
                    await customAction();
                }
                if (this.debugMode) {
                    console.log(`[ActionInterceptor] Action prevented: ${preventionReason}`);
                }
            }
            const executionTime = performance.now() - startTime;
            this.updateStatistics(executionTime);
            return {
                executed: !prevented,
                prevented,
                customNavigation: false,
                executionTime,
                preventionReason: prevented ? preventionReason : undefined,
                metadata: {
                    actionType,
                    interceptorsRun: this.interceptors.length,
                    stopProcessing
                }
            };
        }
        catch (error) {
            const executionTime = performance.now() - startTime;
            this.updateStatistics(executionTime);
            if (this.debugMode) {
                console.error('[ActionInterceptor] Interception failed:', error);
            }
            return {
                executed: false,
                prevented: true,
                customNavigation: false,
                executionTime,
                error: error instanceof Error ? error : new Error(String(error)),
                preventionReason: 'Interception error',
                metadata: { actionType, error: true }
            };
        }
    }
    /**
     * Handle navigation with custom logic
     */
    async handleNavigation(result, context, url) {
        const startTime = performance.now();
        const targetUrl = url || result.url || '';
        if (!targetUrl) {
            return {
                executed: false,
                prevented: true,
                customNavigation: false,
                executionTime: performance.now() - startTime,
                preventionReason: 'No URL provided',
                metadata: { navigation: true }
            };
        }
        try {
            let finalUrl = targetUrl;
            // Apply URL transformation
            if (this.navigationConfig.urlTransformer) {
                finalUrl = this.navigationConfig.urlTransformer(finalUrl, result, context);
            }
            // Run navigation middleware
            if (this.navigationConfig.middleware) {
                for (const middleware of this.navigationConfig.middleware) {
                    const allowed = await middleware(finalUrl, result, context);
                    if (!allowed) {
                        return {
                            executed: false,
                            prevented: true,
                            customNavigation: false,
                            executionTime: performance.now() - startTime,
                            preventionReason: 'Navigation middleware blocked',
                            metadata: { navigation: true, url: finalUrl }
                        };
                    }
                }
            }
            // Check if custom navigation handler is provided
            if (this.navigationConfig.handler) {
                await this.navigationConfig.handler(finalUrl, result, context);
                this.statistics.customNavigations++;
                return {
                    executed: true,
                    prevented: false,
                    customNavigation: true,
                    executionTime: performance.now() - startTime,
                    metadata: { navigation: true, url: finalUrl, custom: true }
                };
            }
            // Default navigation behavior
            if (!this.navigationConfig.preventDefault) {
                const target = this.navigationConfig.target || '_self';
                if (typeof window !== 'undefined') {
                    if (target === '_self') {
                        window.location.href = finalUrl;
                    }
                    else {
                        window.open(finalUrl, target);
                    }
                }
                return {
                    executed: true,
                    prevented: false,
                    customNavigation: false,
                    executionTime: performance.now() - startTime,
                    metadata: { navigation: true, url: finalUrl, target }
                };
            }
            // Navigation was prevented
            return {
                executed: false,
                prevented: true,
                customNavigation: false,
                executionTime: performance.now() - startTime,
                preventionReason: 'Navigation preventDefault enabled',
                metadata: { navigation: true, url: finalUrl }
            };
        }
        catch (error) {
            if (this.debugMode) {
                console.error('[ActionInterceptor] Navigation failed:', error);
            }
            return {
                executed: false,
                prevented: true,
                customNavigation: false,
                executionTime: performance.now() - startTime,
                error: error instanceof Error ? error : new Error(String(error)),
                preventionReason: 'Navigation error',
                metadata: { navigation: true, url: targetUrl }
            };
        }
    }
    /**
     * Execute a registered action
     */
    async executeAction(actionType, result, context) {
        const startTime = performance.now();
        const registration = this.actionRegistry.get(actionType);
        if (!registration) {
            return {
                executed: false,
                prevented: true,
                customNavigation: false,
                executionTime: performance.now() - startTime,
                preventionReason: `Action type '${actionType}' not registered`,
                metadata: { actionType, registered: false }
            };
        }
        try {
            // Check if action should be intercepted
            if (registration.preventable) {
                const interceptionResult = await this.interceptAction(result, context, actionType);
                if (interceptionResult.prevented) {
                    return interceptionResult;
                }
            }
            // Execute the action
            await registration.handler(result, context);
            this.statistics.executedActions++;
            if (this.debugMode) {
                console.log(`[ActionInterceptor] Executed action: ${actionType}`);
            }
            return {
                executed: true,
                prevented: false,
                customNavigation: false,
                executionTime: performance.now() - startTime,
                metadata: {
                    actionType,
                    registered: true,
                    priority: registration.priority,
                    ...registration.metadata
                }
            };
        }
        catch (error) {
            if (this.debugMode) {
                console.error(`[ActionInterceptor] Action execution failed for ${actionType}:`, error);
            }
            return {
                executed: false,
                prevented: true,
                customNavigation: false,
                executionTime: performance.now() - startTime,
                error: error instanceof Error ? error : new Error(String(error)),
                preventionReason: 'Action execution error',
                metadata: { actionType, registered: true }
            };
        }
    }
    /**
     * Get registered actions
     */
    getRegisteredActions() {
        return Array.from(this.actionRegistry.values())
            .sort((a, b) => b.priority - a.priority);
    }
    /**
     * Check if an action type is registered
     */
    hasAction(actionType) {
        return this.actionRegistry.has(actionType);
    }
    /**
     * Get interception statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }
    /**
     * Reset statistics
     */
    resetStatistics() {
        this.statistics = {
            totalInterceptions: 0,
            preventedActions: 0,
            customNavigations: 0,
            executedActions: 0,
            averageInterceptionTime: 0,
            totalInterceptionTime: 0
        };
        if (this.debugMode) {
            console.log('[ActionInterceptor] Statistics reset');
        }
    }
    /**
     * Clear all interceptors and actions
     */
    clear() {
        const interceptorCount = this.interceptors.length;
        const actionCount = this.actionRegistry.size;
        this.interceptors = [];
        this.actionRegistry.clear();
        this.resetStatistics();
        if (this.debugMode) {
            console.log(`[ActionInterceptor] Cleared ${interceptorCount} interceptors and ${actionCount} actions`);
        }
    }
    /**
     * Create a conditional interceptor
     */
    createConditionalInterceptor(condition, action) {
        return (result, context, actionType) => {
            if (condition(result, context)) {
                return {
                    preventDefault: false,
                    stopProcessing: false,
                    ...action
                };
            }
            return {
                preventDefault: false,
                stopProcessing: false
            };
        };
    }
    /**
     * Create a URL-based navigation interceptor
     */
    createUrlInterceptor(urlPattern, customHandler) {
        return (result, context, actionType) => {
            const url = result.url || '';
            if (urlPattern.test(url)) {
                return {
                    preventDefault: true,
                    stopProcessing: false,
                    customAction: () => customHandler(url, result, context),
                    reason: `URL pattern matched: ${urlPattern.source}`,
                    metadata: { urlPattern: urlPattern.source, url }
                };
            }
            return {
                preventDefault: false,
                stopProcessing: false
            };
        };
    }
    /**
     * Update statistics
     */
    updateStatistics(executionTime) {
        this.statistics.totalInterceptionTime += executionTime;
        this.statistics.averageInterceptionTime =
            this.statistics.totalInterceptionTime / this.statistics.totalInterceptions;
    }
    /**
     * Generate interceptor ID
     */
    generateInterceptorId() {
        return `interceptor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
/**
 * Common interceptor factories
 */
export class InterceptorFactories {
    /**
     * Create an interceptor that prevents actions for specific result types
     */
    static preventByCategory(categories, reason = 'Category not allowed') {
        return (result, context) => {
            const category = result.metadata?.category;
            if (category && categories.includes(category)) {
                return {
                    preventDefault: true,
                    stopProcessing: false,
                    reason
                };
            }
            return {
                preventDefault: false,
                stopProcessing: false
            };
        };
    }
    /**
     * Create an interceptor that requires user permissions
     */
    static requirePermissions(requiredPermissions, reason = 'Insufficient permissions') {
        return (result, context) => {
            const userPermissions = context.user?.permissions || [];
            const hasPermissions = requiredPermissions.every(perm => userPermissions.includes(perm));
            if (!hasPermissions) {
                return {
                    preventDefault: true,
                    stopProcessing: false,
                    reason
                };
            }
            return {
                preventDefault: false,
                stopProcessing: false
            };
        };
    }
    /**
     * Create an interceptor that adds tracking to actions
     */
    static addTracking(trackingFunction) {
        return (result, context) => {
            return {
                preventDefault: false,
                stopProcessing: false,
                customAction: () => trackingFunction(result, context)
            };
        };
    }
}
/**
 * Global action interceptor instance
 */
export const actionInterceptor = new AdvancedActionInterceptor({
    debugMode: process.env.NODE_ENV === 'development'
});
//# sourceMappingURL=ActionInterceptor.js.map