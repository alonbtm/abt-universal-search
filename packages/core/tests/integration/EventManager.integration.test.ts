/**
 * EventManager Integration Tests
 * Tests the complete event management system
 */

import { eventManager } from '../../src/core/EventManager';
import type { SearchResult } from '../../src/types/Results';
import type { EventListener } from '../../src/core/EventManager';

describe('EventManager Integration', () => {
  let mockResult: SearchResult;

  beforeEach(() => {
    mockResult = {
      id: 'test-result-1',
      title: 'Integration Test Result',
      description: 'A test result for event testing',
      url: 'https://example.com/integration-test',
      metadata: {
        source: 'integration-test',
        relevance: 0.95
      }
    };

    // Clear any existing subscriptions
    eventManager.clear();
  });

  describe('Basic Event Operations', () => {
    it('should subscribe and emit events successfully', async () => {
      let eventReceived = false;
      let receivedData: any;

      const listener: EventListener = (eventData) => {
        eventReceived = true;
        receivedData = eventData.data;
      };

      // Subscribe to event
      const subscriptionId = eventManager.subscribe('test:event', listener);
      expect(subscriptionId).toBeDefined();

      // Emit event
      const result = await eventManager.emit('test:event', { message: 'hello' });

      expect(result.event).toBe('test:event');
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(eventReceived).toBe(true);
      expect(receivedData.message).toBe('hello');
    });

    it('should handle multiple subscribers for the same event', async () => {
      const listeners: EventListener[] = [];
      const receivedMessages: string[] = [];

      // Create multiple listeners
      for (let i = 0; i < 3; i++) {
        const listener: EventListener = (eventData) => {
          receivedMessages.push(`listener-${i}-received`);
        };
        listeners.push(listener);
        eventManager.subscribe('multi:test', listener);
      }

      await eventManager.emit('multi:test', { test: 'data' });

      expect(receivedMessages).toHaveLength(3);
      expect(receivedMessages.every(msg => msg.includes('received'))).toBe(true);
    });

    it('should unsubscribe successfully', async () => {
      let eventCount = 0;
      const listener: EventListener = () => { eventCount++; };

      const subscriptionId = eventManager.subscribe('unsub:test', listener);
      
      // Emit and verify event is received
      await eventManager.emit('unsub:test', {});
      expect(eventCount).toBe(1);

      // Unsubscribe
      const unsubscribed = eventManager.unsubscribe(subscriptionId);
      expect(unsubscribed).toBe(true);

      // Emit again - should not be received
      await eventManager.emit('unsub:test', {});
      expect(eventCount).toBe(1); // Still 1, not 2
    });
  });

  describe('Event Lifecycle Integration', () => {
    it('should handle search lifecycle events', async () => {
      const lifecycle: string[] = [];

      eventManager.subscribe('search:start', () => {
        lifecycle.push('started');
      });

      eventManager.subscribe('search:complete', () => {
        lifecycle.push('completed');
      });

      eventManager.subscribe('search:select', () => {
        lifecycle.push('selected');
      });

      // Simulate search lifecycle
      await eventManager.emit('search:start', { query: 'test' });
      await eventManager.emit('search:complete', { results: [mockResult] });
      await eventManager.emit('search:select', { result: mockResult });

      expect(lifecycle).toEqual(['started', 'completed', 'selected']);
    });

    it('should handle result selection events', async () => {
      let selectedResult: SearchResult | undefined;

      eventManager.subscribe('result:selected', (eventData) => {
        selectedResult = eventData.data.result;
      });

      await eventManager.emit('result:selected', { result: mockResult });

      expect(selectedResult).toBeDefined();
      expect(selectedResult?.id).toBe(mockResult.id);
    });
  });

  describe('Priority and Ordering', () => {
    it('should execute listeners in priority order', async () => {
      const executionOrder: number[] = [];

      // Subscribe with different priorities
      eventManager.subscribe('priority:test', () => {
        executionOrder.push(1);
      }, { priority: 1 });

      eventManager.subscribe('priority:test', () => {
        executionOrder.push(3);
      }, { priority: 3 });

      eventManager.subscribe('priority:test', () => {
        executionOrder.push(2);
      }, { priority: 2 });

      await eventManager.emit('priority:test', {});

      // Should execute in descending priority order: 3, 2, 1
      expect(executionOrder).toEqual([3, 2, 1]);
    });
  });

  describe('Event History and Statistics', () => {
    it('should maintain event history', async () => {
      await eventManager.emit('history:test1', { data: 1 });
      await eventManager.emit('history:test2', { data: 2 });
      await eventManager.emit('history:test3', { data: 3 });

      const history = eventManager.getHistory();
      
      expect(history.length).toBeGreaterThanOrEqual(3);
      
      const recentEvents = history.slice(-3);
      expect(recentEvents.some(e => e.type === 'history:test1')).toBe(true);
      expect(recentEvents.some(e => e.type === 'history:test2')).toBe(true);
      expect(recentEvents.some(e => e.type === 'history:test3')).toBe(true);
    });

    it('should provide event statistics', async () => {
      const listener: EventListener = () => {};
      
      eventManager.subscribe('stats:test', listener);
      await eventManager.emit('stats:test', {});
      await eventManager.emit('stats:test', {});

      const stats = eventManager.getStatistics();

      expect(stats.totalEventsEmitted).toBeGreaterThanOrEqual(2);
      expect(stats.totalListenersExecuted).toBeGreaterThanOrEqual(2);
      expect(stats.eventCounts['stats:test']).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle listener errors gracefully', async () => {
      const workingListener: EventListener = () => {};
      const errorListener: EventListener = () => {
        throw new Error('Test listener error');
      };

      eventManager.subscribe('error:test', workingListener);
      eventManager.subscribe('error:test', errorListener);

      const result = await eventManager.emit('error:test', {});

      // Should still execute successfully for working listeners
      expect(result.successCount).toBeGreaterThanOrEqual(1);
      expect(result.failureCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Wildcard Events', () => {
    it('should handle wildcard subscriptions', async () => {
      let wildcardEventReceived = false;
      let specificEventReceived = false;

      eventManager.subscribe('*', () => {
        wildcardEventReceived = true;
      });

      eventManager.subscribe('wildcard:specific', () => {
        specificEventReceived = true;
      });

      await eventManager.emit('wildcard:specific', {});

      expect(wildcardEventReceived).toBe(true);
      expect(specificEventReceived).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should clear all subscriptions', () => {
      eventManager.subscribe('clear:test1', () => {});
      eventManager.subscribe('clear:test2', () => {});

      expect(eventManager.getActiveSubscriptions().length).toBeGreaterThan(0);

      eventManager.clear();

      expect(eventManager.getActiveSubscriptions().length).toBe(0);
    });

    it('should remove specific event subscriptions', () => {
      eventManager.subscribe('remove:test', () => {});
      eventManager.subscribe('remove:test', () => {});
      eventManager.subscribe('keep:test', () => {});

      const removedCount = eventManager.unsubscribeAll('remove:test');

      expect(removedCount).toBe(2);
      expect(eventManager.getActiveSubscriptions().length).toBe(1);
      expect(eventManager.hasListeners('keep:test')).toBe(true);
      expect(eventManager.hasListeners('remove:test')).toBe(false);
    });
  });
});