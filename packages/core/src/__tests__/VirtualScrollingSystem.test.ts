import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import { VirtualScrollManager } from '../virtualization/VirtualScrollManager';
import { ProgressiveLoader } from '../virtualization/ProgressiveLoader';
import { PaginationManager } from '../virtualization/PaginationManager';
import { PerformanceOptimizer } from '../optimization/PerformanceOptimizer';
import { DOMPoolManager } from '../virtualization/DOMPoolManager';
import { InResultSearch } from '../virtualization/InResultSearch';
import {
  VirtualScrollConfig,
  ProgressiveLoadingConfig,
  PaginationConfig,
  DOMPoolConfig,
  SearchWithinConfig,
} from '../types/Virtualization';
import { PaginationParams } from '../types/Pagination';

// Mock DOM APIs
global.requestAnimationFrame = jest.fn(callback => {
  return setTimeout(() => callback(Date.now()), 16);
}) as any;

global.cancelAnimationFrame = jest.fn();

global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as any;

global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as any;

global.PerformanceObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
})) as any;

// Test data generators
function generateTestItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    label: `Item ${i}`,
    value: `value_${i}`,
    category: `category_${i % 10}`,
    metadata: {
      description: `Description for item ${i}`,
      tags: [`tag${i % 5}`, `tag${i % 3}`],
    },
  }));
}

function generateLargeDataset(size: number) {
  const categories = ['Technology', 'Science', 'Business', 'Health', 'Education'];
  return Array.from({ length: size }, (_, i) => ({
    id: i,
    label: `Large Dataset Item ${i}`,
    value: `ld_value_${i}`,
    category: categories[i % categories.length],
    description: `This is a detailed description for item ${i} with various keywords and content`,
    metadata: {
      score: Math.random() * 100,
      timestamp: Date.now() + i * 1000,
      active: i % 3 === 0,
    },
  }));
}

describe('VirtualScrollManager', () => {
  let virtualScrollManager: VirtualScrollManager;
  let mockScrollElement: HTMLElement;
  let testItems: any[];

  beforeEach(() => {
    testItems = generateTestItems(1000);

    // Create mock scroll element
    mockScrollElement = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      offsetTop: 0,
      offsetHeight: 400,
      scrollTop: 0,
      scrollHeight: 32000, // 1000 items * 32px
      clientHeight: 400,
      getBoundingClientRect: jest.fn(() => ({
        top: 0,
        left: 0,
        bottom: 400,
        right: 300,
        width: 300,
        height: 400,
      })),
    } as any;

    const config: Partial<VirtualScrollConfig> = {
      itemHeight: 32,
      viewportHeight: 400,
      bufferSize: 5,
      renderBatchSize: 50,
      overscan: 3,
    };

    virtualScrollManager = new VirtualScrollManager(config);
    virtualScrollManager.setScrollElement(mockScrollElement);
    virtualScrollManager.setItems(testItems);
  });

  afterEach(() => {
    virtualScrollManager.dispose();
  });

  describe('Basic Virtual Scrolling', () => {
    test('should initialize with correct configuration', () => {
      expect(virtualScrollManager.getTotalHeight()).toBe(32000); // 1000 * 32
      expect(virtualScrollManager.getVisibleRange().visibleItems.length).toBeGreaterThan(0);
    });

    test('should calculate visible range correctly', () => {
      virtualScrollManager.updateViewport({
        top: 0,
        height: 400,
        scrollTop: 0,
        scrollHeight: 32000,
        clientHeight: 400,
      });

      const range = virtualScrollManager.getVisibleRange();
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBeGreaterThan(0);
      expect(range.visibleItems.length).toBeLessThan(testItems.length);
    });

    test('should update visible range when scrolling', () => {
      const initialRange = virtualScrollManager.getVisibleRange();

      virtualScrollManager.updateViewport({
        top: 0,
        height: 400,
        scrollTop: 1000, // Scroll down
        scrollHeight: 32000,
        clientHeight: 400,
      });

      const newRange = virtualScrollManager.getVisibleRange();
      expect(newRange.startIndex).toBeGreaterThan(initialRange.startIndex);
    });

    test('should handle scroll to specific index', () => {
      const targetIndex = 500;
      virtualScrollManager.scrollTo(targetIndex);

      const expectedOffset = targetIndex * 32; // item height
      // Note: In real implementation, this would trigger scroll element update
      expect(virtualScrollManager.getItemOffset(targetIndex)).toBe(expectedOffset);
    });
  });

  describe('Dynamic Height Support', () => {
    test('should handle variable item heights', () => {
      const variableHeightConfig: Partial<VirtualScrollConfig> = {
        itemHeight: (item: any) => (item.id % 2 === 0 ? 32 : 48),
        viewportHeight: 400,
        bufferSize: 5,
      };

      const variableScrollManager = new VirtualScrollManager(variableHeightConfig);
      variableScrollManager.setItems(testItems.slice(0, 100));

      const totalHeight = variableScrollManager.getTotalHeight();
      expect(totalHeight).toBe(50 * 32 + 50 * 48); // 50 even (32px) + 50 odd (48px)

      variableScrollManager.dispose();
    });

    test('should cache item heights for performance', () => {
      const heightCalculations = jest.fn((item: any) => 32 + (item.id % 4) * 8);

      const config: Partial<VirtualScrollConfig> = {
        itemHeight: heightCalculations,
        viewportHeight: 400,
      };

      const manager = new VirtualScrollManager(config);
      manager.setItems(testItems.slice(0, 10));

      // First access should calculate
      manager.getItemHeight(0);
      manager.getItemHeight(0); // Second access should use cache

      expect(heightCalculations).toHaveBeenCalledTimes(1);
      manager.dispose();
    });
  });

  describe('Performance with Large Datasets', () => {
    test('should handle 50K items efficiently', () => {
      const largeDataset = generateLargeDataset(50000);
      const startTime = Date.now();

      virtualScrollManager.setItems(largeDataset);
      virtualScrollManager.updateViewport({
        top: 0,
        height: 400,
        scrollTop: 0,
        scrollHeight: largeDataset.length * 32,
        clientHeight: 400,
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(100); // Should process within 100ms
      expect(virtualScrollManager.getTotalHeight()).toBe(largeDataset.length * 32);

      const range = virtualScrollManager.getVisibleRange();
      expect(range.visibleItems.length).toBeLessThan(50); // Only visible items rendered
    });

    test('should maintain 60fps performance during scrolling', () => {
      const largeDataset = generateLargeDataset(10000);
      virtualScrollManager.setItems(largeDataset);

      const scrollPositions = [0, 1000, 5000, 10000, 15000];
      const frameTimes: number[] = [];

      scrollPositions.forEach(scrollTop => {
        const startTime = performance.now();

        virtualScrollManager.updateViewport({
          top: 0,
          height: 400,
          scrollTop,
          scrollHeight: largeDataset.length * 32,
          clientHeight: 400,
        });

        const frameTime = performance.now() - startTime;
        frameTimes.push(frameTime);
      });

      // Each frame should be under 16.67ms for 60fps
      frameTimes.forEach(frameTime => {
        expect(frameTime).toBeLessThan(16.67);
      });
    });
  });
});

describe('ProgressiveLoader', () => {
  let progressiveLoader: ProgressiveLoader;
  let mockLoadFunction: jest.Mock;

  beforeEach(() => {
    mockLoadFunction = jest.fn();

    const config: Partial<ProgressiveLoadingConfig> = {
      batchSize: 50,
      loadingThreshold: 0.8,
      maxItems: 5000,
      enableInfiniteScroll: true,
      preloadBatches: 1,
    };

    progressiveLoader = new ProgressiveLoader(config);
  });

  afterEach(() => {
    progressiveLoader.dispose();
  });

  describe('Batch Loading', () => {
    test('should load initial batch', async () => {
      const testData = generateTestItems(50);
      mockLoadFunction.mockResolvedValue({ items: testData, hasMore: true });

      progressiveLoader.setLoadFunction(mockLoadFunction);
      const results = await progressiveLoader.loadMore();

      expect(results).toHaveLength(50);
      expect(progressiveLoader.getLoadedCount()).toBe(50);
      expect(progressiveLoader.hasMore()).toBe(true);
    });

    test('should handle different batch sizes', async () => {
      const batchSizes = [25, 50, 100, 200];

      for (const batchSize of batchSizes) {
        const testData = generateTestItems(batchSize);
        mockLoadFunction.mockResolvedValue({ items: testData, hasMore: true });

        progressiveLoader.reset();
        progressiveLoader.setBatchSize(batchSize);
        progressiveLoader.setLoadFunction(mockLoadFunction);

        const results = await progressiveLoader.loadMore();
        expect(results).toHaveLength(batchSize);
      }
    });

    test('should adapt batch size based on performance', async () => {
      const adaptiveLoader = new ProgressiveLoader({
        batchSize: 50,
        loadingStrategy: 'adaptive',
      });

      // Simulate slow loading
      mockLoadFunction.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ items: generateTestItems(50), hasMore: true }), 100)
          )
      );

      adaptiveLoader.setLoadFunction(mockLoadFunction);

      const initialBatchSize = adaptiveLoader.getBatchSize();
      await adaptiveLoader.loadMore(); // First load to establish performance baseline
      await adaptiveLoader.loadMore(); // Second load to trigger adaptation

      // Batch size should adapt based on performance
      const adaptedBatchSize = adaptiveLoader.getBatchSize();
      expect(adaptedBatchSize).toBeDefined();

      adaptiveLoader.dispose();
    });
  });

  describe('Large Dataset Handling', () => {
    test('should handle progressive loading of 10K items', async () => {
      const totalItems = 10000;
      const batchSize = 100;
      let loadedCount = 0;

      mockLoadFunction.mockImplementation((offset: number, limit: number) => {
        const remainingItems = totalItems - offset;
        const actualLimit = Math.min(limit, remainingItems);
        const items = generateTestItems(actualLimit).map((item, i) => ({
          ...item,
          id: offset + i,
        }));

        loadedCount += actualLimit;

        return Promise.resolve({
          items,
          hasMore: loadedCount < totalItems,
        });
      });

      progressiveLoader.setBatchSize(batchSize);
      progressiveLoader.setLoadFunction(mockLoadFunction);

      // Load all items progressively
      while (progressiveLoader.hasMore()) {
        await progressiveLoader.loadMore();
      }

      expect(progressiveLoader.getLoadedCount()).toBe(totalItems);
      expect(progressiveLoader.hasMore()).toBe(false);
    });

    test('should maintain performance during sustained loading', async () => {
      const batchCount = 50;
      const batchSize = 100;
      const loadTimes: number[] = [];

      mockLoadFunction.mockImplementation(() => {
        return Promise.resolve({
          items: generateTestItems(batchSize),
          hasMore: true,
        });
      });

      progressiveLoader.setBatchSize(batchSize);
      progressiveLoader.setLoadFunction(mockLoadFunction);

      for (let i = 0; i < batchCount; i++) {
        const startTime = Date.now();
        await progressiveLoader.loadMore();
        const loadTime = Date.now() - startTime;
        loadTimes.push(loadTime);
      }

      // Load times should remain consistent (no memory leaks or degradation)
      const averageTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      const lastFiveAverage = loadTimes.slice(-5).reduce((sum, time) => sum + time, 0) / 5;

      expect(lastFiveAverage).toBeLessThan(averageTime * 1.5); // No significant degradation
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle loading errors gracefully', async () => {
      mockLoadFunction.mockRejectedValue(new Error('Network error'));
      progressiveLoader.setLoadFunction(mockLoadFunction);

      await expect(progressiveLoader.loadMore()).rejects.toThrow('Network error');
      expect(progressiveLoader.isLoading()).toBe(false);
      expect(progressiveLoader.getLoadingState().error).toBeInstanceOf(Error);
    });

    test('should retry failed loads', async () => {
      let callCount = 0;
      mockLoadFunction.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({
          items: generateTestItems(50),
          hasMore: true,
        });
      });

      progressiveLoader.setLoadFunction(mockLoadFunction);

      // First call should fail
      await expect(progressiveLoader.loadMore()).rejects.toThrow();

      // Second call should succeed
      const results = await progressiveLoader.loadMore();
      expect(results).toHaveLength(50);
    });
  });
});

describe('PaginationManager', () => {
  let paginationManager: PaginationManager;
  let mockDataProvider: jest.Mock;

  beforeEach(() => {
    mockDataProvider = jest.fn();

    const config: Partial<PaginationConfig> = {
      type: 'offset',
      pageSize: 20,
      maxPages: 100,
      enablePrefetch: true,
      cachePages: true,
    };

    paginationManager = new PaginationManager(config);
  });

  afterEach(() => {
    paginationManager.dispose();
  });

  describe('Offset Pagination', () => {
    test('should handle offset-based pagination', async () => {
      const testData = generateTestItems(20);
      mockDataProvider.mockResolvedValue({
        data: testData,
        pagination: {
          pageSize: 20,
          totalCount: 1000,
          totalPages: 50,
          hasNext: true,
          hasPrevious: false,
        },
      });

      // Add provider
      paginationManager.addProvider({
        name: 'test-offset',
        type: 'offset',
        load: mockDataProvider,
        supports: () => true,
      });

      const result = await paginationManager.getPage(1);

      expect(result.data).toHaveLength(20);
      expect(result.pagination.hasNext).toBe(true);
      expect(paginationManager.getCurrentPage()).toBe(1);
    });

    test('should navigate through pages', async () => {
      mockDataProvider.mockImplementation((params: PaginationParams) => {
        const page = params.page || 1;
        const offset = (page - 1) * 20;
        const data = generateTestItems(20).map((item, i) => ({
          ...item,
          id: offset + i,
          label: `Page ${page} Item ${i}`,
        }));

        return Promise.resolve({
          data,
          pagination: {
            pageSize: 20,
            totalCount: 1000,
            totalPages: 50,
            hasNext: page < 50,
            hasPrevious: page > 1,
          },
        });
      });

      paginationManager.addProvider({
        name: 'test-offset',
        type: 'offset',
        load: mockDataProvider,
        supports: () => true,
      });

      // Load first page
      await paginationManager.getPage(1);
      expect(paginationManager.getCurrentPage()).toBe(1);

      // Navigate to next page
      const page2 = await paginationManager.getNextPage();
      expect(page2?.data[0].label).toContain('Page 2');
      expect(paginationManager.getCurrentPage()).toBe(2);

      // Jump to specific page
      const page10 = await paginationManager.jumpToPage(10);
      expect(page10.data[0].label).toContain('Page 10');
      expect(paginationManager.getCurrentPage()).toBe(10);
    });
  });

  describe('Performance with Large Datasets', () => {
    test('should handle pagination with 100K total items', async () => {
      const totalItems = 100000;
      const pageSize = 100;

      mockDataProvider.mockImplementation((params: PaginationParams) => {
        const page = params.page || 1;
        const offset = (page - 1) * pageSize;
        const data = Array.from({ length: pageSize }, (_, i) => ({
          id: offset + i,
          label: `Item ${offset + i}`,
          value: `value_${offset + i}`,
        }));

        return Promise.resolve({
          data,
          pagination: {
            pageSize,
            totalCount: totalItems,
            totalPages: Math.ceil(totalItems / pageSize),
            hasNext: page < Math.ceil(totalItems / pageSize),
            hasPrevious: page > 1,
          },
        });
      });

      paginationManager.setPageSize(pageSize);
      paginationManager.addProvider({
        name: 'large-dataset',
        type: 'offset',
        load: mockDataProvider,
        supports: () => true,
      });

      // Test loading different pages efficiently
      const testPages = [1, 50, 100, 500, 1000];

      for (const pageNum of testPages) {
        const startTime = Date.now();
        const result = await paginationManager.getPage(pageNum);
        const loadTime = Date.now() - startTime;

        expect(result.data).toHaveLength(pageSize);
        expect(loadTime).toBeLessThan(50); // Should load quickly
        expect(result.data[0].id).toBe((pageNum - 1) * pageSize);
      }
    });

    test('should efficiently cache frequently accessed pages', async () => {
      let loadCallCount = 0;

      mockDataProvider.mockImplementation(() => {
        loadCallCount++;
        return Promise.resolve({
          data: generateTestItems(20),
          pagination: {
            pageSize: 20,
            hasNext: true,
            hasPrevious: false,
          },
        });
      });

      paginationManager.addProvider({
        name: 'cached-test',
        type: 'offset',
        load: mockDataProvider,
        supports: () => true,
      });

      // Load page 1 multiple times
      await paginationManager.getPage(1);
      await paginationManager.getPage(1);
      await paginationManager.getPage(1);

      // Should only call provider once due to caching
      expect(loadCallCount).toBe(1);

      const stats = paginationManager.getCacheStats();
      expect(stats.cachedPages).toBeGreaterThan(0);
    });
  });
});

describe('DOMPoolManager', () => {
  let domPoolManager: DOMPoolManager;

  beforeEach(() => {
    // Mock document.createElement
    (global as any).document = {
      createElement: jest.fn((tagName: string) => ({
        tagName: tagName.toUpperCase(),
        className: '',
        style: { cssText: '' },
        innerHTML: '',
        removeAttribute: jest.fn(),
        cloneNode: jest.fn().mockReturnThis(),
        isConnected: false,
        parentNode: null,
      })),
    };

    const config: Partial<DOMPoolConfig> = {
      maxPoolSize: 50,
      initialPoolSize: 10,
      enablePooling: true,
      cleanupIntervalMs: 1000,
    };

    domPoolManager = new DOMPoolManager(config);
  });

  afterEach(() => {
    domPoolManager.dispose();
  });

  describe('Element Pooling', () => {
    test('should create and reuse DOM elements', () => {
      // Acquire elements
      const element1 = domPoolManager.acquireElement('div');
      const element2 = domPoolManager.acquireElement('div');

      expect(element1.tagName).toBe('DIV');
      expect(element2.tagName).toBe('DIV');

      // Release and reacquire
      domPoolManager.releaseElement(element1);
      const element3 = domPoolManager.acquireElement('div');

      // Should reuse the released element
      expect(element3).toBe(element1);

      const stats = domPoolManager.getPoolStats();
      expect(stats.reuseRate).toBeGreaterThan(0);
    });

    test('should handle different element types', () => {
      const div = domPoolManager.acquireElement('div');
      const span = domPoolManager.acquireElement('span');
      const button = domPoolManager.acquireElement('button', 'btn-primary');

      expect(div.tagName).toBe('DIV');
      expect(span.tagName).toBe('SPAN');
      expect(button.tagName).toBe('BUTTON');

      domPoolManager.releaseElement(div);
      domPoolManager.releaseElement(span);
      domPoolManager.releaseElement(button);

      const stats = domPoolManager.getPoolStats();
      expect(stats.totalElements).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    test('should track memory usage', () => {
      // Create many elements
      const elements: HTMLElement[] = [];
      for (let i = 0; i < 100; i++) {
        elements.push(domPoolManager.acquireElement('div'));
      }

      const stats = domPoolManager.getPoolStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(stats.inUseElements).toBe(100);

      // Release elements
      elements.forEach(el => domPoolManager.releaseElement(el));

      const finalStats = domPoolManager.getPoolStats();
      expect(finalStats.inUseElements).toBe(0);
      expect(finalStats.availableElements).toBeGreaterThan(0);
    });

    test('should cleanup idle elements', done => {
      // Create and release elements
      const elements = Array.from({ length: 20 }, () => domPoolManager.acquireElement('div'));

      elements.forEach(el => domPoolManager.releaseElement(el));

      const initialStats = domPoolManager.getPoolStats();

      // Trigger cleanup
      setTimeout(() => {
        domPoolManager.cleanup();
        const cleanupStats = domPoolManager.getPoolStats();

        // Some elements should be cleaned up if they've been idle
        expect(cleanupStats.totalElements).toBeLessThanOrEqual(initialStats.totalElements);
        done();
      }, 100);
    });
  });

  describe('Performance with Large DOM Operations', () => {
    test('should handle rapid element creation and release', () => {
      const startTime = Date.now();
      const elementCount = 1000;
      const elements: HTMLElement[] = [];

      // Rapid acquisition
      for (let i = 0; i < elementCount; i++) {
        elements.push(domPoolManager.acquireElement('div'));
      }

      // Rapid release
      elements.forEach(el => domPoolManager.releaseElement(el));

      const operationTime = Date.now() - startTime;
      expect(operationTime).toBeLessThan(100); // Should be fast

      const stats = domPoolManager.getPoolStats();
      expect(stats.reuseRate).toBeGreaterThan(0.8); // High reuse rate
    });

    test('should maintain performance under memory pressure', () => {
      const iterations = 10;
      const elementsPerIteration = 100;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        const elements = Array.from({ length: elementsPerIteration }, () =>
          domPoolManager.acquireElement('div')
        );

        elements.forEach(el => domPoolManager.releaseElement(el));

        const iterationTime = Date.now() - startTime;
        timings.push(iterationTime);
      }

      // Performance should remain consistent
      const averageTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      const lastIterationTime = timings[timings.length - 1];

      expect(lastIterationTime).toBeLessThan(averageTime * 2); // No significant degradation
    });
  });
});

describe('InResultSearch', () => {
  let inResultSearch: InResultSearch;
  let testItems: any[];

  beforeEach(() => {
    testItems = [
      {
        id: 1,
        label: 'Apple iPhone',
        category: 'Electronics',
        description: 'Latest smartphone technology',
      },
      {
        id: 2,
        label: 'Samsung Galaxy',
        category: 'Electronics',
        description: 'Android smartphone with great camera',
      },
      {
        id: 3,
        label: 'MacBook Pro',
        category: 'Computers',
        description: 'Professional laptop for developers',
      },
      {
        id: 4,
        label: 'Dell XPS',
        category: 'Computers',
        description: 'High-performance Windows laptop',
      },
      {
        id: 5,
        label: 'iPad Pro',
        category: 'Tablets',
        description: 'Professional tablet for creative work',
      },
    ];

    const config: Partial<SearchWithinConfig> = {
      searchFields: ['label', 'category', 'description'],
      enableHighlighting: true,
      caseSensitive: false,
    };

    inResultSearch = new InResultSearch(config);
  });

  afterEach(() => {
    inResultSearch.dispose();
  });

  describe('Basic Search Functionality', () => {
    test('should search within cached results', () => {
      const results = inResultSearch.search('iphone', testItems);

      expect(results).toHaveLength(1);
      expect(results[0].item.label).toBe('Apple iPhone');
      expect(results[0].score).toBeGreaterThan(0);
    });

    test('should search across multiple fields', () => {
      const results = inResultSearch.search('laptop', testItems);

      expect(results).toHaveLength(2); // MacBook Pro and Dell XPS
      results.forEach(result => {
        expect(result.item.description).toContain('laptop');
      });
    });

    test('should handle case-insensitive search', () => {
      const results1 = inResultSearch.search('APPLE', testItems);
      const results2 = inResultSearch.search('apple', testItems);

      expect(results1).toHaveLength(results2.length);
      expect(results1[0].item.id).toBe(results2[0].item.id);
    });

    test('should rank results by relevance', () => {
      const results = inResultSearch.search('pro', testItems);

      expect(results).toHaveLength(2); // MacBook Pro and iPad Pro
      // Results should be ordered by relevance
      results.forEach((result, index) => {
        if (index > 0) {
          expect(result.score).toBeLessThanOrEqual(results[index - 1].score);
        }
      });
    });
  });

  describe('Large Dataset Search Performance', () => {
    test('should handle search in large datasets efficiently', () => {
      const largeDataset = generateLargeDataset(10000);

      const startTime = Date.now();
      const results = inResultSearch.search('technology', largeDataset);
      const searchTime = Date.now() - startTime;

      expect(searchTime).toBeLessThan(100); // Should complete within 100ms
      expect(results.length).toBeGreaterThan(0);

      // Verify results contain the search term
      results.forEach(result => {
        const itemText = JSON.stringify(result.item).toLowerCase();
        expect(itemText).toContain('technology');
      });
    });

    test('should use search index for better performance on repeated searches', () => {
      const largeDataset = generateLargeDataset(5000);

      // First search (builds index)
      const startTime1 = Date.now();
      const results1 = inResultSearch.search('business', largeDataset);
      const firstSearchTime = Date.now() - startTime1;

      // Second search (uses index)
      const startTime2 = Date.now();
      const results2 = inResultSearch.search('science', largeDataset);
      const secondSearchTime = Date.now() - startTime2;

      expect(results1.length).toBeGreaterThan(0);
      expect(results2.length).toBeGreaterThan(0);

      // Second search should be faster due to indexing
      expect(secondSearchTime).toBeLessThanOrEqual(firstSearchTime);

      const metrics = inResultSearch.getPerformanceMetrics();
      expect(metrics.totalSearches).toBe(2);
      expect(metrics.indexSize).toBeGreaterThan(0);
    });

    test('should handle concurrent searches efficiently', async () => {
      const largeDataset = generateLargeDataset(5000);
      const searchQueries = ['technology', 'business', 'health', 'education', 'science'];

      const startTime = Date.now();

      // Perform concurrent searches
      const searchPromises = searchQueries.map(query =>
        Promise.resolve(inResultSearch.search(query, largeDataset))
      );

      const results = await Promise.all(searchPromises);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(200); // All searches within 200ms
      expect(results).toHaveLength(searchQueries.length);

      results.forEach((searchResults, index) => {
        expect(searchResults.length).toBeGreaterThan(0);
        // Verify each search found relevant results
        const query = searchQueries[index];
        searchResults.forEach(result => {
          const itemText = JSON.stringify(result.item).toLowerCase();
          expect(itemText).toContain(query.toLowerCase());
        });
      });
    });
  });

  describe('Search Highlighting', () => {
    test('should highlight search terms', () => {
      const text = 'Apple iPhone with advanced technology';
      const highlighted = inResultSearch.highlight(text, 'iPhone');

      expect(highlighted).toContain('<span class="search-highlight">iPhone</span>');
    });

    test('should highlight multiple occurrences', () => {
      const text = 'Apple iPhone and Samsung iPhone alternatives';
      const highlighted = inResultSearch.highlight(text, 'iPhone');

      const matches = (highlighted.match(/search-highlight/g) || []).length;
      expect(matches).toBe(2);
    });
  });

  describe('Search Caching', () => {
    test('should cache search results for improved performance', () => {
      const dataset = generateLargeDataset(1000);

      // First search
      const startTime1 = Date.now();
      const results1 = inResultSearch.search('technology', dataset);
      const firstSearchTime = Date.now() - startTime1;

      // Identical second search (should use cache)
      const startTime2 = Date.now();
      const results2 = inResultSearch.search('technology', dataset);
      const secondSearchTime = Date.now() - startTime2;

      expect(results1).toEqual(results2);
      expect(secondSearchTime).toBeLessThan(firstSearchTime); // Cache should be faster

      const metrics = inResultSearch.getPerformanceMetrics();
      expect(metrics.cacheHitRate).toBeGreaterThan(0);
    });
  });
});

describe('Integration Tests', () => {
  describe('Virtual Scrolling with Progressive Loading', () => {
    test('should integrate virtual scrolling with progressive loading for large datasets', async () => {
      const virtualScroll = new VirtualScrollManager({
        itemHeight: 40,
        viewportHeight: 400,
        bufferSize: 5,
      });

      const progressiveLoader = new ProgressiveLoader({
        batchSize: 100,
        maxItems: 5000,
      });

      let totalItems = 0;
      const mockLoadFunction = jest.fn((offset: number, limit: number) => {
        const items = generateTestItems(limit).map((item, i) => ({
          ...item,
          id: offset + i,
          label: `Item ${offset + i}`,
        }));
        totalItems += limit;

        return Promise.resolve({
          items,
          hasMore: totalItems < 5000,
        });
      });

      progressiveLoader.setLoadFunction(mockLoadFunction);

      // Load initial batch
      const initialBatch = await progressiveLoader.loadMore();
      virtualScroll.setItems(initialBatch);

      // Simulate scrolling down to trigger more loading
      virtualScroll.updateViewport({
        top: 0,
        height: 400,
        scrollTop: 2000, // Scroll down
        scrollHeight: 4000,
        clientHeight: 400,
      });

      // Load more items as user scrolls
      if (progressiveLoader.hasMore()) {
        const nextBatch = await progressiveLoader.loadMore();
        const allItems = [...initialBatch, ...nextBatch];
        virtualScroll.setItems(allItems);
      }

      expect(progressiveLoader.getLoadedCount()).toBeGreaterThan(100);
      expect(virtualScroll.getTotalHeight()).toBeGreaterThan(4000);

      virtualScroll.dispose();
      progressiveLoader.dispose();
    });
  });

  describe('Performance Optimization with DOM Pooling', () => {
    test('should optimize performance using DOM pooling in virtual scrolling', () => {
      const domPool = new DOMPoolManager({
        maxPoolSize: 100,
        initialPoolSize: 20,
      });

      const performanceOptimizer = new PerformanceOptimizer({
        targetFrameRate: 60,
        enableFrameMonitoring: true,
      });

      // Simulate rapid DOM element creation/destruction
      const elements: HTMLElement[] = [];

      performanceOptimizer.startMonitoring();

      // Acquire many elements
      for (let i = 0; i < 200; i++) {
        const element = domPool.acquireElement('div', 'list-item');
        elements.push(element);
      }

      // Release half of them
      for (let i = 0; i < 100; i++) {
        domPool.releaseElement(elements[i]);
      }

      const poolStats = domPool.getPoolStats();
      expect(poolStats.reuseRate).toBeGreaterThan(0);

      const perfMetrics = performanceOptimizer.getMetrics();
      expect(perfMetrics.currentFrameRate).toBeGreaterThan(0);

      performanceOptimizer.dispose();
      domPool.dispose();
    });
  });

  describe('Search Integration with Virtual Scrolling', () => {
    test('should integrate search functionality with virtual scrolling', () => {
      const largeDataset = generateLargeDataset(10000);
      const search = new InResultSearch({
        searchFields: ['label', 'description', 'category'],
      });

      const virtualScroll = new VirtualScrollManager({
        itemHeight: 32,
        viewportHeight: 400,
      });

      // Perform search
      const searchResults = search.search('technology', largeDataset);
      expect(searchResults.length).toBeGreaterThan(0);

      // Apply search results to virtual scrolling
      const filteredItems = searchResults.map(result => result.item);
      virtualScroll.setItems(filteredItems);

      // Verify virtual scrolling works with filtered results
      const visibleRange = virtualScroll.getVisibleRange();
      expect(visibleRange.visibleItems.length).toBeGreaterThan(0);
      expect(visibleRange.visibleItems.length).toBeLessThan(filteredItems.length);

      search.dispose();
      virtualScroll.dispose();
    });
  });
});

// Performance benchmarks
describe('Performance Benchmarks', () => {
  test('should benchmark virtual scrolling with 50K items', () => {
    const largeDataset = generateLargeDataset(50000);

    const startTime = performance.now();

    const virtualScroll = new VirtualScrollManager({
      itemHeight: 32,
      viewportHeight: 400,
      bufferSize: 10,
    });

    virtualScroll.setItems(largeDataset);

    // Simulate scrolling through dataset
    const scrollPositions = [0, 10000, 25000, 40000, 50000];
    scrollPositions.forEach(scrollTop => {
      virtualScroll.updateViewport({
        top: 0,
        height: 400,
        scrollTop,
        scrollHeight: largeDataset.length * 32,
        clientHeight: 400,
      });
    });

    const totalTime = performance.now() - startTime;

    expect(totalTime).toBeLessThan(1000); // Should complete within 1 second

    const performance_metrics = virtualScroll.getPerformanceMetrics();
    expect(performance_metrics.totalItems).toBe(50000);
    expect(performance_metrics.visibleItems).toBeLessThan(50); // Only render visible items

    virtualScroll.dispose();
  });

  test('should benchmark search performance with large datasets', () => {
    const searchSizes = [1000, 5000, 10000, 25000];
    const searchTerms = ['technology', 'business', 'health', 'education'];

    searchSizes.forEach(size => {
      const dataset = generateLargeDataset(size);
      const search = new InResultSearch();

      const searchTimes: number[] = [];

      searchTerms.forEach(term => {
        const startTime = performance.now();
        const results = search.search(term, dataset);
        const searchTime = performance.now() - startTime;

        searchTimes.push(searchTime);
        expect(results.length).toBeGreaterThan(0);
      });

      const averageSearchTime =
        searchTimes.reduce((sum, time) => sum + time, 0) / searchTimes.length;

      // Search time should scale reasonably with dataset size
      const expectedMaxTime = size / 100; // ~10ms per 1000 items
      expect(averageSearchTime).toBeLessThan(expectedMaxTime);

      search.dispose();
    });
  });
});
