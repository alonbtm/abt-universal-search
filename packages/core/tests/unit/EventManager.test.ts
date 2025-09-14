/**
 * EventManager Unit Tests
 * Tests for the advanced event management system
 */

import { AdvancedEventManager } from '../../src/core/EventManager';
import { SearchEventType } from '../../src/types/Events';
import type { SearchResult } from '../../src/types/Results';
import type { EventListener, EventListenerOptions } from '../../src/core/EventManager';

describe('AdvancedEventManager', () => {
  let eventManager: AdvancedEventManager;
  let mockResult: SearchResult;

  beforeEach(() => {
    eventManager = new AdvancedEventManager({ debug: false });
    
    mockResult = {
      id: 'test-result-1',
      title: 'Test Result',
      description: 'A test result for event testing',
      url: 'https://example.com/test',
      metadata: {
        source: 'test',
        relevance: 0.9
      }
    };
  });

  describe('Constructor', () => {
    it('should create instance with default configuration', () => {
      const manager = new AdvancedEventManager();
      expect(manager).toBeInstanceOf(AdvancedEventManager);
    });

    it('should create instance with custom configuration', () => {
      const manager = new AdvancedEventManager({
        debug: true,
        maxListeners: 50,
        enableGlobalErrorHandler: false
      });
      expect(manager).toBeInstanceOf(AdvancedEventManager);
    });

    it('should initialize with empty statistics', () => {
      const stats = eventManager.getStatistics();
      expect(stats.totalSubscriptions).toBe(0);
      expect(stats.totalEmissions).toBe(0);
      expect(stats.activeSubscriptions).toBe(0);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to an event successfully', () => {
      const listener: EventListener = jest.fn();
      const subscriptionId = eventManager.subscribe('test:event', listener);

      expect(subscriptionId).toBeDefined();
      expect(typeof subscriptionId).toBe('string');

      const stats = eventManager.getStatistics();
      expect(stats.totalSubscriptions).toBe(1);
      expect(stats.activeSubscriptions).toBe(1);
    });

    it('should subscribe with options', () => {
      const listener: EventListener = jest.fn();
      const options: EventListenerOptions = {
        once: true,
        priority: 5,
        timeout: 1000
      };

      const subscriptionId = eventManager.subscribe('test:event', listener, options);
      expect(subscriptionId).toBeDefined();
    });

    it('should support multiple listeners for the same event', () => {
      const listener1: EventListener = jest.fn();
      const listener2: EventListener = jest.fn();

      const id1 = eventManager.subscribe('test:event', listener1);
      const id2 = eventManager.subscribe('test:event', listener2);

      expect(id1).not.toBe(id2);

      const stats = eventManager.getStatistics();
      expect(stats.activeSubscriptions).toBe(2);
    });

    it('should handle priority-based ordering', async () => {
      const executionOrder: number[] = [];
      
      const listener1: EventListener = jest.fn(() => executionOrder.push(1));
      const listener2: EventListener = jest.fn(() => executionOrder.push(2));
      const listener3: EventListener = jest.fn(() => executionOrder.push(3));

      eventManager.subscribe('test:event', listener1, { priority: 1 });
      eventManager.subscribe('test:event', listener2, { priority: 3 });
      eventManager.subscribe('test:event', listener3, { priority: 2 });

      await eventManager.emit('test:event', { test: true });

      expect(executionOrder).toEqual([2, 3, 1]); // Priority 3, 2, 1
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      expect(listener3).toHaveBeenCalled();
    });

    it('should reject subscription when max listeners exceeded', () => {
      const manager = new AdvancedEventManager({ maxListeners: 2 });
      const listener: EventListener = jest.fn();

      manager.subscribe('test:event', listener);
      manager.subscribe('test:event', listener);

      expect(() => {
        manager.subscribe('test:event', listener);
      }).toThrow('Maximum number of listeners exceeded');
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe successfully', () => {
      const listener: EventListener = jest.fn();
      const subscriptionId = eventManager.subscribe('test:event', listener);

      const result = eventManager.unsubscribe(subscriptionId);
      expect(result).toBe(true);

      const stats = eventManager.getStatistics();
      expect(stats.activeSubscriptions).toBe(0);
    });

    it('should return false for non-existent subscription', () => {
      const result = eventManager.unsubscribe('non-existent-id');
      expect(result).toBe(false);
    });

    it('should handle multiple unsubscriptions', () => {
      const listener1: EventListener = jest.fn();
      const listener2: EventListener = jest.fn();

      const id1 = eventManager.subscribe('test:event', listener1);
      const id2 = eventManager.subscribe('test:event', listener2);

      expect(eventManager.unsubscribe(id1)).toBe(true);
      expect(eventManager.unsubscribe(id2)).toBe(true);

      const stats = eventManager.getStatistics();
      expect(stats.activeSubscriptions).toBe(0);
    });
  });

  describe('emit', () => {
    it('should emit event to single listener', async () => {
      const listener: EventListener = jest.fn();
      eventManager.subscribe('test:event', listener);

      const result = await eventManager.emit('test:event', { test: 'data' });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(0);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          test: 'data'
        })
      );
    });

    it('should emit event to multiple listeners', async () => {
      const listener1: EventListener = jest.fn();
      const listener2: EventListener = jest.fn();

      eventManager.subscribe('test:event', listener1);
      eventManager.subscribe('test:event', listener2);

      const result = await eventManager.emit('test:event', { test: 'data' });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const goodListener: EventListener = jest.fn();
      const badListener: EventListener = jest.fn(() => {
        throw new Error('Listener error');
      });

      eventManager.subscribe('test:event', goodListener);
      eventManager.subscribe('test:event', badListener);

      const result = await eventManager.emit('test:event', { test: 'data' });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Listener error');
    });

    it('should handle async listeners', async () => {
      const asyncListener: EventListener = jest.fn(async (data) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return data;
      });

      eventManager.subscribe('test:event', asyncListener);

      const result = await eventManager.emit('test:event', { test: 'async' });

      expect(result.successCount).toBe(1);
      expect(asyncListener).toHaveBeenCalled();
    });

    it('should handle listener timeouts', async () => {
      const slowListener: EventListener = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      eventManager.subscribe('test:event', slowListener, { timeout: 50 });

      const result = await eventManager.emit('test:event', { test: 'timeout' });

      expect(result.failureCount).toBe(1);
      expect(result.errors[0].message).toContain('timeout');
    });

    it('should handle "once" listeners correctly', async () => {
      const listener: EventListener = jest.fn();
      eventManager.subscribe('test:event', listener, { once: true });

      await eventManager.emit('test:event', { test: 'first' });
      await eventManager.emit('test:event', { test: 'second' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ test: 'first' })
      );

      const stats = eventManager.getStatistics();
      expect(stats.activeSubscriptions).toBe(0);
    });

    it('should emit with metadata', async () => {
      const listener: EventListener = jest.fn();
      eventManager.subscribe('test:event', listener);

      const metadata = { source: 'test', timestamp: Date.now() };
      await eventManager.emit('test:event', { test: 'data' }, metadata);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          test: 'data',
          metadata: expect.objectContaining(metadata)
        })
      );
    });

    it('should handle propagation stopping', async () => {
      const listener1: EventListener = jest.fn((data) => {
        if (data.propagation) {
          data.propagation.stopPropagation();
        }
      });
      const listener2: EventListener = jest.fn();

      eventManager.subscribe('test:event', listener1, { priority: 2 });
      eventManager.subscribe('test:event', listener2, { priority: 1 });

      const result = await eventManager.emit('test:event', { test: 'stop' });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
      expect(result.propagationStopped).toBe(true);
    });
  });

  describe('wildcard events', () => {
    it('should support wildcard subscriptions', async () => {
      const wildcardListener: EventListener = jest.fn();
      eventManager.subscribe('test:*', wildcardListener);

      await eventManager.emit('test:specific', { test: 'wildcard' });

      expect(wildcardListener).toHaveBeenCalled();
    });

    it('should support multiple wildcard patterns', async () => {
      const listener1: EventListener = jest.fn();
      const listener2: EventListener = jest.fn();
      const specificListener: EventListener = jest.fn();

      eventManager.subscribe('action:*', listener1);
      eventManager.subscribe('*:complete', listener2);
      eventManager.subscribe('action:complete', specificListener);

      await eventManager.emit('action:complete', { test: 'wildcards' });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      expect(specificListener).toHaveBeenCalled();
    });
  });

  describe('event types', () => {
    it('should handle SearchEventType constants', async () => {
      const listener: EventListener = jest.fn();
      eventManager.subscribe(SearchEventType.ACTION_START, listener);

      await eventManager.emit(SearchEventType.ACTION_START, {
        actionId: 'test-action',
        result: mockResult
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          actionId: 'test-action',
          result: mockResult
        })
      );
    });

    it('should handle result selection events', async () => {
      const listener: EventListener = jest.fn();
      eventManager.subscribe(SearchEventType.RESULT_SELECTED, listener);

      await eventManager.emit(SearchEventType.RESULT_SELECTED, {
        result: mockResult,
        context: { test: 'context' }
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          result: mockResult,
          context: { test: 'context' }
        })
      );
    });
  });

  describe('statistics and monitoring', () => {
    it('should track emission statistics', async () => {
      const listener: EventListener = jest.fn();
      eventManager.subscribe('test:event', listener);

      await eventManager.emit('test:event', { test: 1 });
      await eventManager.emit('test:event', { test: 2 });

      const stats = eventManager.getStatistics();
      expect(stats.totalEmissions).toBe(2);
      expect(stats.successfulEmissions).toBe(2);
      expect(stats.failedEmissions).toBe(0);
    });

    it('should track failed emissions', async () => {
      const badListener: EventListener = jest.fn(() => {
        throw new Error('Test error');
      });
      eventManager.subscribe('test:event', badListener);

      await eventManager.emit('test:event', { test: 'error' });

      const stats = eventManager.getStatistics();
      expect(stats.failedEmissions).toBe(1);
    });

    it('should calculate average emission time', async () => {
      const listener: EventListener = jest.fn();
      eventManager.subscribe('test:event', listener);

      await eventManager.emit('test:event', { test: 1 });
      await eventManager.emit('test:event', { test: 2 });

      const stats = eventManager.getStatistics();
      expect(stats.averageEmissionTime).toBeGreaterThan(0);
    });

    it('should track events by type', async () => {
      const listener: EventListener = jest.fn();
      
      eventManager.subscribe('type1', listener);
      eventManager.subscribe('type2', listener);

      await eventManager.emit('type1', { test: 1 });
      await eventManager.emit('type1', { test: 2 });
      await eventManager.emit('type2', { test: 3 });

      const stats = eventManager.getStatistics();
      expect(stats.eventsByType.type1).toBe(2);
      expect(stats.eventsByType.type2).toBe(1);
    });
  });

  describe('cleanup and memory management', () => {
    it('should clear all subscriptions', () => {
      const listener: EventListener = jest.fn();
      eventManager.subscribe('test:event1', listener);
      eventManager.subscribe('test:event2', listener);

      const clearedCount = eventManager.clearAllSubscriptions();

      expect(clearedCount).toBe(2);
      
      const stats = eventManager.getStatistics();
      expect(stats.activeSubscriptions).toBe(0);
    });

    it('should clear subscriptions for specific event', () => {
      const listener: EventListener = jest.fn();
      eventManager.subscribe('test:event1', listener);
      eventManager.subscribe('test:event1', listener);
      eventManager.subscribe('test:event2', listener);

      const clearedCount = eventManager.clearSubscriptions('test:event1');

      expect(clearedCount).toBe(2);
      
      const stats = eventManager.getStatistics();
      expect(stats.activeSubscriptions).toBe(1);
    });

    it('should reset statistics', () => {
      const listener: EventListener = jest.fn();
      eventManager.subscribe('test:event', listener);
      
      // Generate some stats
      eventManager.emit('test:event', { test: 1 });
      
      eventManager.resetStatistics();
      
      const stats = eventManager.getStatistics();
      expect(stats.totalEmissions).toBe(0);
      expect(stats.totalSubscriptions).toBe(0);
      // Active subscriptions should remain
      expect(stats.activeSubscriptions).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle invalid event names', async () => {
      const listener: EventListener = jest.fn();
      
      expect(() => {
        eventManager.subscribe('', listener);
      }).toThrow('Event name cannot be empty');
    });

    it('should handle null listeners', () => {
      expect(() => {
        eventManager.subscribe('test:event', null as any);
      }).toThrow('Listener must be a function');
    });

    it('should provide detailed error information', async () => {
      const errorListener: EventListener = jest.fn(() => {
        throw new Error('Detailed test error');
      });
      
      eventManager.subscribe('test:event', errorListener);
      
      const result = await eventManager.emit('test:event', { test: 'error' });
      
      expect(result.errors[0]).toBeInstanceOf(Error);
      expect(result.errors[0].message).toBe('Detailed test error');
    });
  });

  describe('performance', () => {
    it('should handle large numbers of listeners efficiently', async () => {
      const listeners: EventListener[] = [];
      
      // Create 100 listeners
      for (let i = 0; i < 100; i++) {
        const listener: EventListener = jest.fn();
        listeners.push(listener);
        eventManager.subscribe('test:performance', listener);
      }

      const startTime = performance.now();
      await eventManager.emit('test:performance', { test: 'performance' });
      const endTime = performance.now();

      const emissionTime = endTime - startTime;
      expect(emissionTime).toBeLessThan(100); // Should be fast

      // Verify all listeners were called
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalled();
      });
    });

    it('should track performance metrics', async () => {
      const listener: EventListener = jest.fn();
      eventManager.subscribe('test:event', listener);

      await eventManager.emit('test:event', { test: 'perf' });

      const stats = eventManager.getStatistics();
      expect(stats.performance.fastestEmission).toBeGreaterThan(0);
      expect(stats.performance.slowestEmission).toBeGreaterThan(0);
      expect(stats.performance.totalEmissionTime).toBeGreaterThan(0);
    });
  });
});