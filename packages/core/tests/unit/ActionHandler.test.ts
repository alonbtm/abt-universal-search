/**
 * ActionHandler Unit Tests
 * Tests for the enhanced action processing pipeline
 */

import { AdvancedActionHandler } from '../../src/core/ActionHandler';
import { eventManager } from '../../src/core/EventManager';
import { callbackExecutor } from '../../src/utils/CallbackExecutor';
import { contextPreserver } from '../../src/utils/ContextPreserver';
import { actionInterceptor } from '../../src/utils/ActionInterceptor';
import { cleanupManager } from '../../src/utils/CleanupManager';
import type { SearchResult } from '../../src/types/Results';
import type { ActionProcessingOptions } from '../../src/core/ActionHandler';

// Mock the utility modules
jest.mock('../../src/core/EventManager');
jest.mock('../../src/utils/CallbackExecutor');
jest.mock('../../src/utils/ContextPreserver');
jest.mock('../../src/utils/ActionInterceptor');
jest.mock('../../src/utils/CleanupManager');

describe('AdvancedActionHandler', () => {
  let actionHandler: AdvancedActionHandler;
  let mockResult: SearchResult;

  beforeEach(() => {
    jest.clearAllMocks();
    actionHandler = new AdvancedActionHandler({
      debug: false,
      maxConcurrentActions: 5,
      autoCleanup: false
    });

    mockResult = {
      id: 'test-result-1',
      title: 'Test Result',
      description: 'A test result for action processing',
      url: 'https://example.com/test',
      metadata: {
        source: 'test',
        relevance: 0.9
      }
    };

    // Setup default mocks
    (eventManager.emit as jest.Mock).mockResolvedValue({
      results: [{ success: true }],
      totalTime: 10,
      successCount: 1,
      failureCount: 0
    });

    (contextPreserver.createContext as jest.Mock).mockReturnValue({
      result: mockResult,
      query: '',
      source: { component: 'ActionHandler', timestamp: Date.now(), userAgent: 'test' },
      metadata: {}
    });

    (contextPreserver.preserveContext as jest.Mock).mockReturnValue({
      success: true,
      preservedContext: { preserved: true }
    });

    (actionInterceptor.interceptAction as jest.Mock).mockResolvedValue({
      intercepted: false,
      prevented: false
    });

    (callbackExecutor.execute as jest.Mock).mockResolvedValue({
      success: true,
      result: { executed: true }
    });

    (cleanupManager.trackResource as jest.Mock).mockReturnValue('cleanup-id');
    (cleanupManager.cleanup as jest.Mock).mockResolvedValue(true);
  });

  describe('Constructor', () => {
    it('should create instance with default configuration', () => {
      const handler = new AdvancedActionHandler();
      expect(handler).toBeInstanceOf(AdvancedActionHandler);
    });

    it('should create instance with custom configuration', () => {
      const handler = new AdvancedActionHandler({
        debug: true,
        timeout: 5000,
        maxConcurrentActions: 3
      });
      expect(handler).toBeInstanceOf(AdvancedActionHandler);
    });

    it('should initialize with correct default statistics', () => {
      const handler = new AdvancedActionHandler();
      const stats = handler.getStatistics();

      expect(stats.totalActions).toBe(0);
      expect(stats.successfulActions).toBe(0);
      expect(stats.failedActions).toBe(0);
      expect(stats.preventedActions).toBe(0);
    });
  });

  describe('processAction', () => {
    it('should process a simple action successfully', async () => {
      const result = await actionHandler.processAction(mockResult);

      expect(result.success).toBe(true);
      expect(result.metadata.actionId).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.intercepted).toBe(false);
      expect(result.metadata.prevented).toBe(false);

      // Verify event emissions
      expect(eventManager.emit).toHaveBeenCalledWith('action:start', expect.any(Object));
      expect(eventManager.emit).toHaveBeenCalledWith('action:complete', expect.any(Object));
    });

    it('should handle context creation failure', async () => {
      (contextPreserver.preserveContext as jest.Mock).mockReturnValue({
        success: false,
        error: new Error('Context creation failed')
      });

      const result = await actionHandler.processAction(mockResult);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Context creation failed');
    });

    it('should handle prevented actions', async () => {
      (actionInterceptor.interceptAction as jest.Mock).mockResolvedValue({
        intercepted: true,
        prevented: true,
        reason: 'Test prevention'
      });

      const result = await actionHandler.processAction(mockResult);

      expect(result.success).toBe(false);
      expect(result.metadata.intercepted).toBe(true);
      expect(result.metadata.prevented).toBe(true);
      expect(result.error?.message).toContain('Test prevention');
    });

    it('should handle custom actions from interception', async () => {
      const customAction = jest.fn().mockResolvedValue('custom result');
      (actionInterceptor.interceptAction as jest.Mock).mockResolvedValue({
        intercepted: true,
        prevented: false,
        customAction
      });

      const result = await actionHandler.processAction(mockResult);

      expect(result.success).toBe(true);
      expect(customAction).toHaveBeenCalled();
      expect(result.metadata.intercepted).toBe(true);
    });

    it('should handle custom navigation', async () => {
      (actionInterceptor.interceptAction as jest.Mock).mockResolvedValue({
        intercepted: true,
        prevented: false,
        customNavigation: true
      });

      (actionInterceptor.handleNavigation as jest.Mock).mockResolvedValue({
        success: true,
        result: { navigated: true }
      });

      const result = await actionHandler.processAction(mockResult);

      expect(result.success).toBe(true);
      expect(actionInterceptor.handleNavigation).toHaveBeenCalled();
    });

    it('should perform cleanup when configured', async () => {
      const handler = new AdvancedActionHandler({ autoCleanup: true });
      await handler.processAction(mockResult);

      expect(cleanupManager.trackResource).toHaveBeenCalled();
      expect(cleanupManager.cleanup).toHaveBeenCalled();
    });

    it('should emit error events on failure', async () => {
      const testError = new Error('Test processing error');
      (contextPreserver.createContext as jest.Mock).mockImplementation(() => {
        throw testError;
      });

      try {
        await actionHandler.processAction(mockResult);
      } catch (error) {
        // Expected to throw
      }

      expect(eventManager.emit).toHaveBeenCalledWith('action:error', expect.objectContaining({
        error: testError
      }));
    });
  });

  describe('processActionsParallel', () => {
    it('should process multiple actions in parallel', async () => {
      const actions = [
        { result: mockResult },
        { result: { ...mockResult, id: 'test-2' } },
        { result: { ...mockResult, id: 'test-3' } }
      ];

      const results = await actionHandler.processActionsParallel(actions);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle mixed success and failure in parallel processing', async () => {
      let callCount = 0;
      (contextPreserver.preserveContext as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return { success: false, error: new Error('Second action failed') };
        }
        return { success: true, preservedContext: { preserved: true } };
      });

      const actions = [
        { result: mockResult },
        { result: { ...mockResult, id: 'test-2' } },
        { result: { ...mockResult, id: 'test-3' } }
      ];

      const results = await actionHandler.processActionsParallel(actions);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('registerActionCallback', () => {
    it('should register callback with event manager', () => {
      const mockCallback = jest.fn();
      (eventManager.subscribe as jest.Mock).mockReturnValue('subscription-id');

      const subscriptionId = actionHandler.registerActionCallback(
        'action:complete',
        mockCallback,
        { priority: 1 }
      );

      expect(eventManager.subscribe).toHaveBeenCalledWith(
        'action:complete',
        expect.any(Function),
        expect.objectContaining({ priority: 1 })
      );
      expect(subscriptionId).toBe('subscription-id');
    });

    it('should execute callback through callback executor', async () => {
      let capturedCallback: any;
      (eventManager.subscribe as jest.Mock).mockImplementation((event, callback) => {
        capturedCallback = callback;
        return 'subscription-id';
      });

      const mockCallback = jest.fn();
      actionHandler.registerActionCallback('action:complete', mockCallback);

      // Simulate event emission
      const eventData = { result: mockResult, context: { test: true } };
      await capturedCallback(eventData);

      expect(callbackExecutor.execute).toHaveBeenCalledWith(
        mockCallback,
        [mockResult, { test: true }],
        expect.any(Object)
      );
    });
  });

  describe('concurrency management', () => {
    it('should queue actions when at concurrent limit', async () => {
      const handler = new AdvancedActionHandler({ maxConcurrentActions: 1 });
      
      // Mock slow action processing
      let resolveFirst: any;
      (contextPreserver.preserveContext as jest.Mock).mockImplementation(() => {
        return new Promise(resolve => {
          if (!resolveFirst) {
            resolveFirst = () => resolve({ success: true, preservedContext: {} });
          } else {
            resolve({ success: true, preservedContext: {} });
          }
        });
      });

      const promise1 = handler.processAction(mockResult);
      const promise2 = handler.processAction({ ...mockResult, id: 'test-2' });

      // Resolve the first action
      setTimeout(() => resolveFirst(), 10);

      const results = await Promise.all([promise1, promise2]);
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('statistics and metrics', () => {
    it('should track successful actions', async () => {
      await actionHandler.processAction(mockResult);
      
      const stats = actionHandler.getStatistics();
      expect(stats.totalActions).toBe(1);
      expect(stats.successfulActions).toBe(1);
      expect(stats.failedActions).toBe(0);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should track failed actions', async () => {
      (contextPreserver.preserveContext as jest.Mock).mockReturnValue({
        success: false,
        error: new Error('Test failure')
      });

      const result = await actionHandler.processAction(mockResult);
      
      expect(result.success).toBe(false);
      
      const stats = actionHandler.getStatistics();
      expect(stats.totalActions).toBe(1);
      expect(stats.successfulActions).toBe(0);
      expect(stats.failedActions).toBe(1);
    });

    it('should track prevented actions', async () => {
      (actionInterceptor.interceptAction as jest.Mock).mockResolvedValue({
        intercepted: true,
        prevented: true,
        reason: 'Test prevention'
      });

      await actionHandler.processAction(mockResult);
      
      const stats = actionHandler.getStatistics();
      expect(stats.preventedActions).toBe(1);
    });

    it('should reset statistics', () => {
      // Process some actions first
      const stats1 = actionHandler.getStatistics();
      stats1.totalActions = 5; // Simulate some activity
      
      actionHandler.resetStatistics();
      
      const stats2 = actionHandler.getStatistics();
      expect(stats2.totalActions).toBe(0);
      expect(stats2.successfulActions).toBe(0);
      expect(stats2.failedActions).toBe(0);
    });
  });

  describe('cleanup functionality', () => {
    it('should perform immediate cleanup', async () => {
      (cleanupManager.cleanupAll as jest.Mock).mockResolvedValue({
        totalCleaned: 5,
        errors: []
      });

      const result = await actionHandler.cleanup();

      expect(cleanupManager.cleanupAll).toHaveBeenCalledWith(false);
      expect(result.cleaned).toBe(5);
      expect(result.errors).toBe(0);
    });

    it('should handle cleanup errors', async () => {
      (cleanupManager.cleanupAll as jest.Mock).mockResolvedValue({
        totalCleaned: 3,
        errors: [new Error('Cleanup error 1'), new Error('Cleanup error 2')]
      });

      const result = await actionHandler.cleanup();

      expect(result.cleaned).toBe(3);
      expect(result.errors).toBe(2);
    });
  });

  describe('error handling strategies', () => {
    it('should throw errors when strategy is "throw"', async () => {
      const handler = new AdvancedActionHandler({ errorStrategy: 'throw' });
      const testError = new Error('Test error');
      
      (contextPreserver.createContext as jest.Mock).mockImplementation(() => {
        throw testError;
      });

      await expect(handler.processAction(mockResult)).rejects.toThrow('Test error');
    });

    it('should return error result when strategy is "callback"', async () => {
      const handler = new AdvancedActionHandler({ errorStrategy: 'callback' });
      const testError = new Error('Test error');
      
      (contextPreserver.createContext as jest.Mock).mockImplementation(() => {
        throw testError;
      });

      const result = await handler.processAction(mockResult);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(testError);
    });
  });

  describe('processing options', () => {
    it('should pass context configuration options', async () => {
      const options: ActionProcessingOptions = {
        contextConfig: {
          includeMetadata: false,
          sanitize: true,
          validate: false
        }
      };

      await actionHandler.processAction(mockResult, options);

      expect(contextPreserver.createContext).toHaveBeenCalledWith(
        mockResult,
        '',
        expect.any(Object),
        expect.objectContaining({
          includeMetadata: false,
          sanitize: true,
          validate: false
        })
      );
    });

    it('should pass interception configuration options', async () => {
      const options: ActionProcessingOptions = {
        actionType: 'custom-action',
        interceptionConfig: {
          preventable: true,
          priority: 5
        }
      };

      await actionHandler.processAction(mockResult, options);

      expect(actionInterceptor.interceptAction).toHaveBeenCalledWith(
        mockResult,
        expect.any(Object),
        'custom-action'
      );
    });
  });
});