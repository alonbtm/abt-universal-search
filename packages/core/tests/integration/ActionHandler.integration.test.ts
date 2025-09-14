/**
 * ActionHandler Integration Tests
 * Tests the complete action processing pipeline
 */

import { AdvancedActionHandler } from '../../src/core/ActionHandler';
import { eventManager } from '../../src/core/EventManager';
import { actionHandler } from '../../src/core/ActionHandler';
import type { SearchResult } from '../../src/types/Results';

describe('ActionHandler Integration', () => {
  let mockResult: SearchResult;

  beforeEach(() => {
    mockResult = {
      id: 'test-result-1',
      title: 'Integration Test Result',
      description: 'A test result for integration testing',
      url: 'https://example.com/integration-test',
      metadata: {
        source: 'integration-test',
        relevance: 0.95,
        originalIndex: 0,
        queryTime: 150
      }
    };

    // Clear any existing subscriptions
    eventManager.clear();
  });

  describe('Basic Action Processing', () => {
    it('should process action end-to-end successfully', async () => {
      const result = await actionHandler.processAction(mockResult);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.metadata.actionId).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.context).toBeDefined();
    });

    it('should handle action with context enrichment', async () => {
      const options = {
        contextConfig: {
          includeMetadata: true,
          sanitize: false,
          validate: true
        }
      };

      const result = await actionHandler.processAction(mockResult, options);

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
    });
  });

  describe('Event System Integration', () => {
    it('should emit action lifecycle events', async () => {
      const events: string[] = [];

      // Subscribe to action events
      eventManager.subscribe('action:start', () => {
        events.push('start');
      });

      eventManager.subscribe('action:complete', () => {
        events.push('complete');
      });

      await actionHandler.processAction(mockResult);

      expect(events).toContain('start');
      expect(events).toContain('complete');
    });

    it('should handle selection callbacks', async () => {
      let callbackExecuted = false;
      let receivedResult: SearchResult | undefined;

      // Register callback for selection events
      actionHandler.registerActionCallback(
        'action:complete',
        (result) => {
          callbackExecuted = true;
          receivedResult = result;
        }
      );

      await actionHandler.processAction(mockResult);

      expect(callbackExecuted).toBe(true);
      expect(receivedResult).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle and recover from errors gracefully', async () => {
      const handler = new AdvancedActionHandler({ errorStrategy: 'callback' });

      // This should not crash the system
      const invalidResult = {
        ...mockResult,
        metadata: null // This might cause issues in context creation
      };

      const result = await handler.processAction(invalidResult as any);

      // Should handle the error gracefully
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track action statistics correctly', async () => {
      const initialStats = actionHandler.getStatistics();

      await actionHandler.processAction(mockResult);
      await actionHandler.processAction({ ...mockResult, id: 'test-2' });

      const finalStats = actionHandler.getStatistics();

      expect(finalStats.totalActions).toBeGreaterThan(initialStats.totalActions);
      expect(finalStats.successfulActions).toBeGreaterThan(initialStats.successfulActions);
    });

    it('should provide performance metrics', async () => {
      await actionHandler.processAction(mockResult);

      const stats = actionHandler.getStatistics();

      expect(stats.averageProcessingTime).toBeGreaterThan(0);
      expect(stats.performance.totalProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('Cleanup Integration', () => {
    it('should perform cleanup operations', async () => {
      const cleanupResult = await actionHandler.cleanup();

      expect(cleanupResult).toBeDefined();
      expect(typeof cleanupResult.cleaned).toBe('number');
      expect(typeof cleanupResult.errors).toBe('number');
    });
  });

  describe('Parallel Processing', () => {
    it('should handle parallel action processing', async () => {
      const actions = [
        { result: mockResult },
        { result: { ...mockResult, id: 'parallel-2' } },
        { result: { ...mockResult, id: 'parallel-3' } }
      ];

      const results = await actionHandler.processActionsParallel(actions);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.metadata.actionId)).toBeTruthy();
    });
  });
});