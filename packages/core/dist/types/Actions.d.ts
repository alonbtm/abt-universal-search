/**
 * Action Types for Universal Search Component
 * @description TypeScript interfaces for action handling, callbacks, and lifecycle management
 */
import { SearchResult } from './Results';
/**
 * Action context interface
 */
export interface ActionContext {
    /** Result that triggered the action */
    result: SearchResult;
    /** Search query that produced the result */
    query: string;
    /** Action source information */
    source: {
        component: string;
        timestamp: number;
        userAgent: string;
    };
    /** Additional metadata */
    metadata: Record<string, unknown>;
    /** User state at time of action */
    userState?: {
        authenticated: boolean;
        preferences: Record<string, unknown>;
        permissions: string[];
    };
    /** Browser/environment information */
    environment?: {
        userAgent: string;
        viewport: {
            width: number;
            height: number;
        };
        timezone: string;
        language: string;
    };
}
/**
 * Secure action context with validation
 */
export interface SecureActionContext extends ActionContext {
    /** Security validation status */
    security: {
        validated: boolean;
        sanitized: boolean;
        riskLevel: 'low' | 'medium' | 'high';
        validationTime: number;
    };
    /** Audit trail information */
    audit: {
        contextId: string;
        createdAt: number;
        validatedAt?: number;
        sanitizedAt?: number;
    };
}
/**
 * Action callback options
 */
export interface ActionCallbackOptions {
    /** Callback priority (higher executes first) */
    priority?: number;
    /** Execute callback only once */
    once?: boolean;
    /** Callback execution timeout */
    timeout?: number;
    /** Number of retry attempts */
    retries?: number;
    /** Whether callback can be cancelled */
    cancellable?: boolean;
    /** Additional context for callback */
    context?: Record<string, unknown>;
}
/**
 * Action callback function
 */
export type ActionCallback = (result: SearchResult, context: ActionContext, metadata?: Record<string, unknown>) => unknown | Promise<unknown>;
/**
 * Action callback registration
 */
export interface ActionCallbackRegistration {
    /** Unique callback ID */
    id: string;
    /** Event type to listen for */
    eventType: string;
    /** Callback function */
    callback: ActionCallback;
    /** Callback options */
    options: ActionCallbackOptions;
    /** Registration timestamp */
    registeredAt: number;
    /** Last execution timestamp */
    lastExecutedAt?: number;
    /** Execution count */
    executionCount: number;
}
/**
 * Action interceptor function
 */
export type ActionInterceptor = (result: SearchResult, context: ActionContext, actionType: string) => Promise<ActionInterceptionResult>;
/**
 * Action interception result
 */
export interface ActionInterceptionResult {
    /** Whether the action was intercepted */
    intercepted: boolean;
    /** Whether the action should be prevented */
    prevented: boolean;
    /** Reason for prevention */
    reason?: string;
    /** Custom action to execute instead */
    customAction?: () => unknown | Promise<unknown>;
    /** Custom navigation handling */
    customNavigation?: boolean;
    /** Modified context */
    modifiedContext?: ActionContext;
    /** Interception metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Action execution result
 */
export interface ActionExecutionResult {
    /** Whether action was successful */
    success: boolean;
    /** Action result data */
    result?: unknown;
    /** Execution error if any */
    error?: Error;
    /** Execution metadata */
    metadata: {
        executionTime: number;
        actionType: string;
        intercepted: boolean;
        prevented: boolean;
        callbacksExecuted: number;
    };
}
/**
 * Action prevention configuration
 */
export interface ActionPreventionConfig {
    /** Conditions that should prevent the action */
    preventWhen: Array<{
        condition: (result: SearchResult, context: ActionContext) => boolean;
        reason: string;
        severity: 'low' | 'medium' | 'high';
    }>;
    /** Custom prevention message */
    preventionMessage?: string;
    /** Alternative actions to suggest */
    alternatives?: Array<{
        label: string;
        action: () => unknown | Promise<unknown>;
    }>;
}
/**
 * Navigation configuration
 */
export interface NavigationConfig {
    /** Default navigation behavior */
    defaultBehavior: 'same-window' | 'new-tab' | 'new-window' | 'custom';
    /** Custom navigation handler */
    customHandler?: (url: string, result: SearchResult, context: ActionContext) => Promise<boolean>;
    /** Navigation confirmation settings */
    confirmationRequired?: {
        external: boolean;
        message?: string;
    };
    /** URL transformation rules */
    urlTransforms?: Array<{
        pattern: RegExp;
        transform: (url: string) => string;
    }>;
}
/**
 * Action metrics and statistics
 */
export interface ActionMetrics {
    /** Total actions processed */
    totalActions: number;
    /** Successful actions */
    successfulActions: number;
    /** Failed actions */
    failedActions: number;
    /** Prevented actions */
    preventedActions: number;
    /** Average execution time */
    averageExecutionTime: number;
    /** Action breakdown by type */
    actionsByType: Record<string, number>;
    /** Most common prevention reasons */
    preventionReasons: Record<string, number>;
    /** Performance statistics */
    performance: {
        fastestAction: number;
        slowestAction: number;
        totalExecutionTime: number;
    };
}
/**
 * Action queue item
 */
export interface ActionQueueItem {
    /** Unique action ID */
    id: string;
    /** Action type */
    type: string;
    /** Search result */
    result: SearchResult;
    /** Action context */
    context: ActionContext;
    /** Processing options */
    options: {
        priority: number;
        timeout?: number;
        retries?: number;
    };
    /** Queue timestamps */
    timestamps: {
        queued: number;
        started?: number;
        completed?: number;
    };
}
/**
 * Action handler configuration
 */
export interface ActionHandlerConfiguration {
    /** Enable debug logging */
    debug: boolean;
    /** Default timeout for actions */
    defaultTimeout: number;
    /** Maximum concurrent actions */
    maxConcurrentActions: number;
    /** Enable automatic cleanup */
    autoCleanup: boolean;
    /** Enable performance metrics */
    enableMetrics: boolean;
    /** Error handling strategy */
    errorStrategy: 'throw' | 'callback' | 'both';
    /** Context validation settings */
    contextValidation: {
        enabled: boolean;
        sanitize: boolean;
        strictMode: boolean;
    };
    /** Memory leak detection */
    memoryLeakDetection: {
        enabled: boolean;
        checkInterval: number;
        maxAge: number;
    };
}
/**
 * Cleanup resource types
 */
export type CleanupResourceType = 'callback' | 'context' | 'interceptor' | 'subscription' | 'cache' | 'connection' | 'timer' | 'observer';
/**
 * Cleanup task function
 */
export type CleanupTask = () => void | Promise<void>;
/**
 * Resource tracking information
 */
export interface ResourceTracker {
    /** Unique resource ID */
    id: string;
    /** Resource type */
    type: CleanupResourceType;
    /** Resource name/description */
    name: string;
    /** Cleanup function */
    cleanup: CleanupTask;
    /** Creation timestamp */
    createdAt: number;
    /** Last accessed timestamp */
    lastAccessedAt: number;
    /** Whether resource is critical */
    critical: boolean;
    /** Resource metadata */
    metadata: Record<string, unknown>;
    /** Cleanup priority */
    priority: number;
}
/**
 * Cleanup result
 */
export interface CleanupResult {
    /** Total resources cleaned */
    totalCleaned: number;
    /** Resources by type */
    cleanedByType: Record<CleanupResourceType, number>;
    /** Cleanup errors */
    errors: Array<{
        resourceId: string;
        error: Error;
    }>;
    /** Cleanup duration */
    duration: number;
    /** Memory freed (if available) */
    memoryFreed?: number;
}
/**
 * Memory leak detection result
 */
export interface MemoryLeakResult {
    /** Detected memory leaks */
    leaks: Array<{
        resourceId: string;
        type: CleanupResourceType;
        age: number;
        severity: 'low' | 'medium' | 'high';
        description: string;
    }>;
    /** Total leaked resources */
    totalLeaks: number;
    /** Recommended actions */
    recommendations: string[];
}
/**
 * Context preservation options
 */
export interface ContextPreservationOptions {
    /** Encrypt sensitive data */
    encrypt: boolean;
    /** Compress context data */
    compress: boolean;
    /** Include mutable fields */
    includeMutableFields: boolean;
    /** Expiration time in milliseconds */
    expirationMs?: number;
    /** Storage location */
    storage?: 'memory' | 'session' | 'local' | 'custom';
}
/**
 * Context preservation result
 */
export interface ContextPreservationResult {
    /** Whether preservation was successful */
    success: boolean;
    /** Preserved context data */
    preservedContext?: SecureActionContext;
    /** Preservation error if any */
    error?: Error;
    /** Context ID for restoration */
    contextId?: string;
    /** Preservation metadata */
    metadata?: {
        preservationTime: number;
        contextSize: number;
        encrypted: boolean;
        compressed: boolean;
    };
}
//# sourceMappingURL=Actions.d.ts.map