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
export type ActionInterceptor = (
  result: SearchResult,
  context: ActionContext,
  actionType: string
) => ActionInterceptionResult | Promise<ActionInterceptionResult>;

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
export class AdvancedActionInterceptor {
  private interceptors: ActionInterceptor[] = [];
  private actionRegistry = new Map<string, ActionRegistration>();
  private navigationConfig: NavigationConfig = {};
  private preventionConfig: ActionPreventionConfig = {};
  private statistics = {
    totalInterceptions: 0,
    preventedActions: 0,
    customNavigations: 0,
    executedActions: 0,
    averageInterceptionTime: 0,
    totalInterceptionTime: 0
  };
  private debugMode = false;

  constructor(options: {
    debugMode?: boolean;
    defaultNavigationConfig?: NavigationConfig;
    defaultPreventionConfig?: ActionPreventionConfig;
  } = {}) {
    this.debugMode = options.debugMode || false;
    this.navigationConfig = options.defaultNavigationConfig || {};
    this.preventionConfig = options.defaultPreventionConfig || {};
  }

  /**
   * Register an action interceptor
   */
  public addInterceptor(interceptor: ActionInterceptor, priority = 0): string {
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
  public removeInterceptor(interceptor: ActionInterceptor): boolean {
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
  public registerAction(
    type: string,
    handler: ActionRegistration['handler'],
    options: {
      priority?: number;
      preventable?: boolean;
      metadata?: Record<string, unknown>;
    } = {}
  ): void {
    const registration: ActionRegistration = {
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
  public unregisterAction(type: string): boolean {
    const removed = this.actionRegistry.delete(type);
    if (removed && this.debugMode) {
      console.log(`[ActionInterceptor] Unregistered action type: ${type}`);
    }
    return removed;
  }

  /**
   * Configure navigation handling
   */
  public configureNavigation(config: NavigationConfig): void {
    this.navigationConfig = { ...this.navigationConfig, ...config };
    if (this.debugMode) {
      console.log('[ActionInterceptor] Navigation configuration updated');
    }
  }

  /**
   * Configure action prevention
   */
  public configurePrevention(config: ActionPreventionConfig): void {
    this.preventionConfig = { ...this.preventionConfig, ...config };
    if (this.debugMode) {
      console.log('[ActionInterceptor] Prevention configuration updated');
    }
  }

  /**
   * Intercept and potentially prevent an action
   */
  public async interceptAction(
    result: SearchResult,
    context: ActionContext,
    actionType = 'select'
  ): Promise<ActionExecutionResult> {
    const startTime = performance.now();
    this.statistics.totalInterceptions++;

    let prevented = false;
    let preventionReason = '';
    let customAction: (() => void | Promise<void>) | undefined;
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

    } catch (error) {
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
  public async handleNavigation(
    result: SearchResult,
    context: ActionContext,
    url?: string
  ): Promise<ActionExecutionResult> {
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
          } else {
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

    } catch (error) {
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
  public async executeAction(
    actionType: string,
    result: SearchResult,
    context: ActionContext
  ): Promise<ActionExecutionResult> {
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

    } catch (error) {
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
  public getRegisteredActions(): ActionRegistration[] {
    return Array.from(this.actionRegistry.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if an action type is registered
   */
  public hasAction(actionType: string): boolean {
    return this.actionRegistry.has(actionType);
  }

  /**
   * Get interception statistics
   */
  public getStatistics(): typeof this.statistics {
    return { ...this.statistics };
  }

  /**
   * Reset statistics
   */
  public resetStatistics(): void {
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
  public clear(): void {
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
  public createConditionalInterceptor(
    condition: (result: SearchResult, context: ActionContext) => boolean,
    action: Partial<ActionInterceptionResult>
  ): ActionInterceptor {
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
  public createUrlInterceptor(
    urlPattern: RegExp,
    customHandler: (url: string, result: SearchResult, context: ActionContext) => void
  ): ActionInterceptor {
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
  private updateStatistics(executionTime: number): void {
    this.statistics.totalInterceptionTime += executionTime;
    this.statistics.averageInterceptionTime = 
      this.statistics.totalInterceptionTime / this.statistics.totalInterceptions;
  }

  /**
   * Generate interceptor ID
   */
  private generateInterceptorId(): string {
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
  static preventByCategory(categories: string[], reason = 'Category not allowed'): ActionInterceptor {
    return (result, context) => {
      const category = result.metadata?.category;
      if (category && categories.includes(category as string)) {
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
  static requirePermissions(requiredPermissions: string[], reason = 'Insufficient permissions'): ActionInterceptor {
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
  static addTracking(trackingFunction: (result: SearchResult, context: ActionContext) => void): ActionInterceptor {
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