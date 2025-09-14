/**
 * Action Interceptor - Action prevention and custom navigation utilities
 * @description Provides action interception, prevention, and custom navigation handling
 */
import type { SearchResult } from '../types/Results';
import type { ActionContext } from './ContextPreserver';
/**
 * Action interception result
 */
export interface ActionInterceptionResult {
    /** Whether the action should be prevented */
    preventDefault: boolean;
    /** Whether to stop further processing */
    stopProcessing: boolean;
    /** Custom action to execute instead */
    customAction?: () => void | Promise<void>;
    /** Reason for interception */
    reason?: string;
    /** Metadata about the interception */
    metadata?: Record<string, unknown>;
}
/**
 * Action interceptor function type
 */
export type ActionInterceptor = (result: SearchResult, context: ActionContext, actionType: string) => ActionInterceptionResult | Promise<ActionInterceptionResult>;
/**
 * Navigation handler configuration
 */
export interface NavigationConfig {
    /** Custom navigation handler */
    handler?: (url: string, result: SearchResult, context: ActionContext) => void | Promise<void>;
    /** Target for navigation (_self, _blank, _parent, _top) */
    target?: string;
    /** Whether to prevent default browser navigation */
    preventDefault?: boolean;
    /** URL transformation function */
    urlTransformer?: (url: string, result: SearchResult, context: ActionContext) => string;
    /** Navigation middleware */
    middleware?: Array<(url: string, result: SearchResult, context: ActionContext) => boolean | Promise<boolean>>;
}
/**
 * Action prevention configuration
 */
export interface ActionPreventionConfig {
    /** Global preventDefault setting */
    globalPreventDefault?: boolean;
    /** Conditions for preventing actions */
    preventConditions?: Array<(result: SearchResult, context: ActionContext) => boolean>;
    /** Custom prevention handler */
    preventionHandler?: (result: SearchResult, context: ActionContext, reason: string) => void;
    /** Allowed actions even when prevention is active */
    allowedActions?: string[];
}
/**
 * Action execution result
 */
export interface ActionExecutionResult {
    /** Whether action was executed */
    executed: boolean;
    /** Whether action was prevented */
    prevented: boolean;
    /** Whether custom navigation was used */
    customNavigation: boolean;
    /** Execution time */
    executionTime: number;
    /** Error if execution failed */
    error?: Error;
    /** Prevention reason */
    preventionReason?: string;
    /** Action metadata */
    metadata: Record<string, unknown>;
}
/**
 * Action registry entry
 */
export interface ActionRegistration {
    /** Action type identifier */
    type: string;
    /** Action handler function */
    handler: (result: SearchResult, context: ActionContext) => void | Promise<void>;
    /** Action priority (higher executes first) */
    priority: number;
    /** Whether action can be prevented */
    preventable: boolean;
    /** Action metadata */
    metadata?: Record<string, unknown>;
    /** Registration timestamp */
    registered: number;
}
/**
 * Advanced action interceptor with custom navigation and prevention
 */
export declare class AdvancedActionInterceptor {
    private interceptors;
    private actionRegistry;
    private navigationConfig;
    private preventionConfig;
    private statistics;
    private debugMode;
    constructor(options?: {
        debugMode?: boolean;
        defaultNavigationConfig?: NavigationConfig;
        defaultPreventionConfig?: ActionPreventionConfig;
    });
    /**
     * Register an action interceptor
     */
    addInterceptor(interceptor: ActionInterceptor, priority?: number): string;
    /**
     * Remove an action interceptor
     */
    removeInterceptor(interceptor: ActionInterceptor): boolean;
    /**
     * Register a custom action handler
     */
    registerAction(type: string, handler: ActionRegistration['handler'], options?: {
        priority?: number;
        preventable?: boolean;
        metadata?: Record<string, unknown>;
    }): void;
    /**
     * Unregister a custom action handler
     */
    unregisterAction(type: string): boolean;
    /**
     * Configure navigation handling
     */
    configureNavigation(config: NavigationConfig): void;
    /**
     * Configure action prevention
     */
    configurePrevention(config: ActionPreventionConfig): void;
    /**
     * Intercept and potentially prevent an action
     */
    interceptAction(result: SearchResult, context: ActionContext, actionType?: string): Promise<ActionExecutionResult>;
    /**
     * Handle navigation with custom logic
     */
    handleNavigation(result: SearchResult, context: ActionContext, url?: string): Promise<ActionExecutionResult>;
    /**
     * Execute a registered action
     */
    executeAction(actionType: string, result: SearchResult, context: ActionContext): Promise<ActionExecutionResult>;
    /**
     * Get registered actions
     */
    getRegisteredActions(): ActionRegistration[];
    /**
     * Check if an action type is registered
     */
    hasAction(actionType: string): boolean;
    /**
     * Get interception statistics
     */
    getStatistics(): typeof this.statistics;
    /**
     * Reset statistics
     */
    resetStatistics(): void;
    /**
     * Clear all interceptors and actions
     */
    clear(): void;
    /**
     * Create a conditional interceptor
     */
    createConditionalInterceptor(condition: (result: SearchResult, context: ActionContext) => boolean, action: Partial<ActionInterceptionResult>): ActionInterceptor;
    /**
     * Create a URL-based navigation interceptor
     */
    createUrlInterceptor(urlPattern: RegExp, customHandler: (url: string, result: SearchResult, context: ActionContext) => void): ActionInterceptor;
    /**
     * Update statistics
     */
    private updateStatistics;
    /**
     * Generate interceptor ID
     */
    private generateInterceptorId;
}
/**
 * Common interceptor factories
 */
export declare class InterceptorFactories {
    /**
     * Create an interceptor that prevents actions for specific result types
     */
    static preventByCategory(categories: string[], reason?: string): ActionInterceptor;
    /**
     * Create an interceptor that requires user permissions
     */
    static requirePermissions(requiredPermissions: string[], reason?: string): ActionInterceptor;
    /**
     * Create an interceptor that adds tracking to actions
     */
    static addTracking(trackingFunction: (result: SearchResult, context: ActionContext) => void): ActionInterceptor;
}
/**
 * Global action interceptor instance
 */
export declare const actionInterceptor: AdvancedActionInterceptor;
//# sourceMappingURL=ActionInterceptor.d.ts.map