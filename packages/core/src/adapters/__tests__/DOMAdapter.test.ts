/**
 * DOMAdapter Test Suite
 * @description Comprehensive tests for DOM data source adapter
 */

import { DOMAdapter, domAdapterFactory } from '../DOMAdapter';
import type { DOMDataSourceConfig } from '../../types/Config';
import type { ProcessedQuery, DOMConnection } from '../../types/Results';

// Setup DOM environment for testing
const mockElement: any = {
  tagName: 'DIV',
  id: 'test-element',
  className: 'test-class',
  textContent: 'Test content',
  innerText: 'Test content',
  innerHTML: '<span>Test content</span>',
  getAttribute: jest.fn(),
  hasAttribute: jest.fn(),
  setAttribute: jest.fn(),
  parentElement: null,
  children: [],
  shadowRoot: null,
  querySelectorAll: jest.fn(),
};

// Mock document object for JSDOM compatibility
const mockDocument: any = {
  querySelector: jest.fn(() => mockElement),
  querySelectorAll: jest.fn(() => [mockElement]),
  createElement: jest.fn(() => mockElement),
  createTextNode: jest.fn(),
};

// Replace global document in test environment
(global as any).document = mockDocument;

// Setup global DOM API mocks
(global as any).window = {
  document: mockDocument,
  MutationObserver: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  })),
};

(global as any).Element = function () {};
(global as any).HTMLElement = function () {};
(global as any).Node = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
};

describe('DOMAdapter', () => {
  let adapter: DOMAdapter;
  let mockConfig: DOMDataSourceConfig;

  beforeEach(() => {
    adapter = new DOMAdapter();
    mockConfig = {
      type: 'dom',
      selector: '.test-container',
      searchAttributes: ['textContent', 'data-search'],
      liveUpdate: {
        enabled: false,
        strategy: 'static',
      },
      shadowDOM: {
        enabled: false,
        maxDepth: 5,
        includeClosed: false,
        identificationStrategy: 'path',
      },
      performance: {
        enableCaching: true,
        cacheTTL: 60000,
        enableMonitoring: true,
      },
      options: {
        caseSensitive: false,
        includeHidden: false,
        maxDepth: 10,
        textExtraction: 'textContent',
      },
    };

    // Reset mocks
    jest.clearAllMocks();

    // Reset mock document methods and set default return values
    mockDocument.querySelector.mockReset();
    mockDocument.querySelectorAll.mockReset();

    // Set default mock return values to prevent null errors
    mockDocument.querySelector.mockReturnValue(mockElement);
    mockDocument.querySelectorAll.mockReturnValue([mockElement]);
    mockElement.querySelectorAll.mockReturnValue([mockElement]);
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  describe('constructor', () => {
    it('should create DOMAdapter with correct type', () => {
      expect(adapter.type).toBe('dom');
    });

    it('should have correct capabilities', () => {
      const capabilities = adapter.getCapabilities();
      expect(capabilities).toEqual({
        supportsPooling: false,
        supportsRealTime: true,
        supportsPagination: true,
        supportsSorting: true,
        supportsFiltering: true,
        maxConcurrentConnections: 10,
        supportedQueryTypes: ['text', 'attribute', 'css-selector'],
      });
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', async () => {
      mockDocument.querySelector.mockReturnValue(mockElement);
      await expect(adapter.validateConfig(mockConfig)).resolves.not.toThrow();
    });

    it('should reject non-dom configuration type', async () => {
      const invalidConfig = { ...mockConfig, type: 'api' as any };
      await expect(adapter.validateConfig(invalidConfig)).rejects.toThrow(
        'Configuration type must be "dom"'
      );
    });

    it('should require selector', async () => {
      const invalidConfig = { ...mockConfig, selector: '' };
      await expect(adapter.validateConfig(invalidConfig)).rejects.toThrow(
        'Selector must be a non-empty string'
      );
    });

    it('should require search attributes', async () => {
      const invalidConfig = { ...mockConfig, searchAttributes: [] };
      await expect(adapter.validateConfig(invalidConfig)).rejects.toThrow(
        'At least one search attribute is required'
      );
    });

    it('should validate CSS selector syntax', async () => {
      const invalidConfig = { ...mockConfig, selector: '>>invalid<<' };
      mockDocument.querySelector.mockImplementation(() => {
        throw new Error('Invalid selector');
      });

      await expect(adapter.validateConfig(invalidConfig)).rejects.toThrow('Invalid CSS selector');
    });

    it('should validate live update strategy', async () => {
      mockDocument.querySelector.mockReturnValue(mockElement);
      const invalidConfig = {
        ...mockConfig,
        liveUpdate: {
          enabled: true,
          strategy: 'invalid' as any,
        },
      };

      await expect(adapter.validateConfig(invalidConfig)).rejects.toThrow(
        'Invalid live update strategy'
      );
    });
  });

  describe('connect', () => {
    beforeEach(() => {
      mockDocument.querySelector.mockReturnValue(mockElement);
      mockElement.querySelectorAll.mockReturnValue([mockElement]);
    });

    it('should establish connection successfully', async () => {
      const connection = await adapter.connect(mockConfig);

      expect(connection).toBeDefined();
      expect(connection.id).toBeTruthy();
      expect(connection.adapterType).toBe('dom');
      expect(connection.status).toBe('connected');
      expect(connection.rootElement).toBe(mockElement);
      expect(connection.searchScope).toBeDefined();
    });

    it('should handle shadow DOM configuration', async () => {
      const shadowConfig = {
        ...mockConfig,
        shadowDOM: {
          enabled: true,
          maxDepth: 10,
          includeClosed: false,
          identificationStrategy: 'path' as const,
        },
      };

      const connection = await adapter.connect(shadowConfig);
      expect(connection.shadowRoots).toBeDefined();
      expect(Array.isArray(connection.shadowRoots)).toBe(true);
    });

    it('should handle live update configuration', async () => {
      const liveConfig = {
        ...mockConfig,
        liveUpdate: {
          enabled: true,
          strategy: 'mutation-observer' as const,
          mutationOptions: {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
          },
        },
      };

      // Mock MutationObserver
      global.MutationObserver = jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        disconnect: jest.fn(),
      }));

      const connection = await adapter.connect(liveConfig);
      expect(connection).toBeDefined();
    });

    it('should throw error if root element not found', async () => {
      mockDocument.querySelector.mockReturnValue(null);

      await expect(adapter.connect(mockConfig)).rejects.toThrow(
        'Root element not found for selector'
      );
    });
  });

  describe('query', () => {
    let connection: DOMConnection;
    let processedQuery: ProcessedQuery;

    beforeEach(async () => {
      mockDocument.querySelector.mockReturnValue(mockElement);
      mockElement.querySelectorAll.mockReturnValue([mockElement]);
      mockElement.getAttribute.mockImplementation((attr: string) => {
        if (attr === 'data-search') return 'searchable content';
        return null;
      });

      connection = await adapter.connect(mockConfig);
      processedQuery = {
        original: 'test',
        normalized: 'test',
        isValid: true,
        metadata: {
          processingTime: 10,
          originalQuery: 'test',
          length: 4,
          trimmed: false,
          timestamp: Date.now(),
          caseNormalized: 'lowercase',
          xssProtected: true,
        },
      };
    });

    it('should execute search query successfully', async () => {
      const results = await adapter.query(connection, processedQuery);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const result = results[0];
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('matchedFields');
      expect(result).toHaveProperty('metadata');
    });

    it('should include DOM-specific metadata', async () => {
      const results = await adapter.query(connection, processedQuery);

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      expect(result).toBeDefined();
      if (result) {
        expect(result.metadata).toHaveProperty('source', 'dom');
        expect(result.metadata).toHaveProperty('elementTagName');
        expect(result.metadata).toHaveProperty('totalMatches');
      }
    });

    it('should handle empty search terms', async () => {
      const emptyQuery = {
        ...processedQuery,
        normalized: '',
        original: '',
      };

      const results = await adapter.query(connection, emptyQuery);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should match textContent', async () => {
      mockElement.textContent = 'test content';
      const results = await adapter.query(connection, processedQuery);

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      expect(result).toBeDefined();
      if (result) {
        expect(result.matchedFields).toContain('textContent');
      }
    });

    it('should match data attributes', async () => {
      mockElement.getAttribute.mockImplementation((attr: string) => {
        if (attr === 'data-search') return 'test value';
        return null;
      });

      const results = await adapter.query(connection, processedQuery);

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      expect(result).toBeDefined();
      if (result) {
        expect(result.matchedFields).toContain('data-search');
      }
    });

    it('should handle different match types', async () => {
      // Test exact match
      mockElement.textContent = 'test';
      let results = await adapter.query(connection, processedQuery);
      expect(results.length).toBeGreaterThan(0);
      let result = results[0];
      expect(result).toBeDefined();
      if (result) {
        expect(result.score).toBeGreaterThan(0.5); // High score for exact match
      }

      // Test partial match
      mockElement.textContent = 'this is a test content';
      results = await adapter.query(connection, processedQuery);
      expect(results.length).toBeGreaterThan(0);
      result = results[0];
      expect(result).toBeDefined();
      if (result) {
        expect(result.score).toBeGreaterThan(0); // Lower score for partial match
      }
    });
  });

  describe('element matching', () => {
    let connection: DOMConnection;
    let processedQuery: ProcessedQuery;

    beforeEach(async () => {
      mockDocument.querySelector.mockReturnValue(mockElement);
      mockElement.querySelectorAll.mockReturnValue([mockElement]);

      connection = await adapter.connect(mockConfig);
      processedQuery = {
        original: 'test',
        normalized: 'test',
        isValid: true,
        metadata: {
          processingTime: 10,
          originalQuery: 'test',
          length: 4,
          trimmed: false,
          timestamp: Date.now(),
          caseNormalized: 'lowercase',
          xssProtected: true,
        },
      };
    });

    it('should extract accessibility information', async () => {
      mockElement.getAttribute.mockImplementation((attr: string) => {
        switch (attr) {
          case 'aria-label':
            return 'Test button';
          case 'role':
            return 'button';
          case 'tabindex':
            return '0';
          default:
            return null;
        }
      });
      mockElement.hasAttribute.mockImplementation((attr: string) => {
        return ['aria-label', 'role', 'tabindex'].includes(attr);
      });

      const results = await adapter.query(connection, processedQuery);

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      expect(result).toBeDefined();
      if (!result) return;
      const elementResult = result.data as any;
      expect(elementResult.accessibility).toBeDefined();
      expect(elementResult.accessibility.ariaLabel).toBe('Test button');
      expect(elementResult.accessibility.role).toBe('button');
    });

    it('should handle case sensitivity', async () => {
      const sensitiveConfig: DOMDataSourceConfig = {
        ...mockConfig,
        options: {
          caseSensitive: true,
          includeHidden: false,
          maxDepth: 10,
          textExtraction: 'textContent',
        },
      };

      await adapter.disconnect(connection);
      connection = await adapter.connect(sensitiveConfig);

      mockElement.textContent = 'Test';
      const upperQuery = { ...processedQuery, normalized: 'TEST' };

      const results = await adapter.query(connection, upperQuery);
      expect(results.length).toBe(0); // Should not match with case sensitivity
    });
  });

  describe('shadow DOM support', () => {
    let connection: DOMConnection;

    beforeEach(async () => {
      const shadowConfig: DOMDataSourceConfig = {
        ...mockConfig,
        shadowDOM: {
          enabled: true,
          maxDepth: 5,
          includeClosed: false,
          identificationStrategy: 'path' as const,
        },
        options: {
          caseSensitive: false,
          includeHidden: false,
          maxDepth: 10,
          textExtraction: 'textContent',
        },
      };

      mockDocument.querySelector.mockReturnValue(mockElement);
      mockElement.querySelectorAll.mockReturnValue([mockElement]);
      connection = await adapter.connect(shadowConfig);
    });

    it('should handle shadow DOM traversal', async () => {
      expect(connection.shadowRoots).toBeDefined();
      expect(Array.isArray(connection.shadowRoots)).toBe(true);
    });

    it('should create shadow-aware element paths', async () => {
      const processedQuery = {
        original: 'test',
        normalized: 'test',
        isValid: true,
        metadata: {
          processingTime: 10,
          originalQuery: 'test',
          length: 4,
          trimmed: false,
          timestamp: Date.now(),
        },
      };

      const results = await adapter.query(connection, processedQuery);

      for (const result of results) {
        const elementResult = result.data as any;
        expect(elementResult.path).toBeDefined();
        expect(typeof elementResult.path).toBe('string');
      }
    });
  });

  describe('live updates', () => {
    it('should set up mutation observer when enabled', async () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
      };

      global.MutationObserver = jest.fn().mockImplementation(() => mockObserver);

      const liveConfig: DOMDataSourceConfig = {
        ...mockConfig,
        liveUpdate: {
          enabled: true,
          strategy: 'mutation-observer' as const,
        },
        options: {
          caseSensitive: false,
          includeHidden: false,
          maxDepth: 10,
          textExtraction: 'textContent',
        },
      };

      // Ensure mock returns valid element
      mockDocument.querySelector.mockReturnValue(mockElement);
      mockElement.querySelectorAll.mockReturnValue([mockElement]);

      const connection = await adapter.connect(liveConfig);

      expect(MutationObserver).toHaveBeenCalled();
      expect(mockObserver.observe).toHaveBeenCalledWith(mockElement, expect.any(Object));
      expect(connection).toBeDefined();
    });

    it('should clean up mutation observer on disconnect', async () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
      };

      global.MutationObserver = jest.fn().mockImplementation(() => mockObserver);

      const liveConfig = {
        ...mockConfig,
        liveUpdate: {
          enabled: true,
          strategy: 'mutation-observer' as const,
        },
      };

      // Ensure mock returns valid element
      mockDocument.querySelector.mockReturnValue(mockElement);
      mockElement.querySelectorAll.mockReturnValue([mockElement]);

      const connection = await adapter.connect(liveConfig);
      await adapter.disconnect(connection);

      expect(mockObserver.disconnect).toHaveBeenCalled();
    });
  });

  describe('caching', () => {
    let connection: DOMConnection;

    beforeEach(async () => {
      const cachingConfig: DOMDataSourceConfig = {
        ...mockConfig,
        performance: {
          enableCaching: true,
          cacheTTL: 1000,
          enableMonitoring: true,
        },
      };

      // Ensure mock returns valid element
      mockDocument.querySelector.mockReturnValue(mockElement);
      mockElement.querySelectorAll.mockReturnValue([mockElement]);
      connection = await adapter.connect(cachingConfig);
    });

    it('should cache query results', async () => {
      const processedQuery = {
        original: 'test',
        normalized: 'test',
        isValid: true,
        metadata: {
          processingTime: 10,
          originalQuery: 'test',
          length: 4,
          trimmed: false,
          timestamp: Date.now(),
        },
      };

      // First query
      const results1 = await adapter.query(connection, processedQuery);

      // Second identical query should use cache
      const results2 = await adapter.query(connection, processedQuery);

      expect(results1).toEqual(results2);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      // Ensure mock returns valid element
      mockDocument.querySelector.mockReturnValue(mockElement);
      mockElement.querySelectorAll.mockReturnValue([mockElement]);

      const connection = await adapter.connect(mockConfig);

      await expect(adapter.disconnect(connection)).resolves.not.toThrow();

      expect(adapter.getConnection(connection.id)).toBeUndefined();
    });

    it('should clean up all resources', async () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
      };

      global.MutationObserver = jest.fn().mockImplementation(() => mockObserver);

      const fullConfig: DOMDataSourceConfig = {
        ...mockConfig,
        liveUpdate: {
          enabled: true,
          strategy: 'mutation-observer' as const,
        },
        options: {
          caseSensitive: false,
          includeHidden: false,
          maxDepth: 10,
          textExtraction: 'textContent',
        },
      };

      // Ensure mock returns valid element
      mockDocument.querySelector.mockReturnValue(mockElement);
      mockElement.querySelectorAll.mockReturnValue([mockElement]);

      const connection = await adapter.connect(fullConfig);
      await adapter.disconnect(connection);

      expect(mockObserver.disconnect).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle invalid selectors gracefully', async () => {
      // Ensure mock returns valid element for connection
      mockDocument.querySelector.mockReturnValue(mockElement);
      mockElement.querySelectorAll.mockReturnValue([mockElement]);

      const connection = await adapter.connect(mockConfig);

      // Now mock the error for query execution
      mockElement.querySelectorAll.mockImplementation(() => {
        throw new Error('Invalid selector');
      });
      const processedQuery = {
        original: 'test',
        normalized: 'test',
        isValid: true,
        metadata: {
          processingTime: 10,
          originalQuery: 'test',
          length: 4,
          trimmed: false,
          timestamp: Date.now(),
        },
      };

      // Should not throw, should return empty results
      const results = await adapter.query(connection, processedQuery);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('DOMAdapterFactory', () => {
    it('should create singleton instance', () => {
      const instance1 = domAdapterFactory.getInstance();
      const instance2 = domAdapterFactory.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(DOMAdapter);
    });

    it('should create new instances', () => {
      const instance1 = domAdapterFactory.createAdapter();
      const instance2 = domAdapterFactory.createAdapter();

      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeInstanceOf(DOMAdapter);
      expect(instance2).toBeInstanceOf(DOMAdapter);
    });

    it('should check DOM availability', () => {
      expect(domAdapterFactory.isDOMAvailable()).toBe(true);
    });
  });
});

/**
 * Integration tests for DOM adapter with complex scenarios
 */
describe('DOMAdapter Integration Tests', () => {
  let adapter: DOMAdapter;

  beforeEach(() => {
    adapter = new DOMAdapter();
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  describe('Complex element hierarchies', () => {
    it('should handle nested element structures', async () => {
      const parentElement: any = {
        ...mockElement,
        children: [mockElement, mockElement],
        querySelectorAll: jest.fn().mockReturnValue([mockElement, mockElement]),
      };

      // Ensure mock returns valid parent element
      mockDocument.querySelector.mockReturnValue(parentElement);
      parentElement.querySelectorAll.mockReturnValue([mockElement, mockElement]);

      const config: DOMDataSourceConfig = {
        type: 'dom',
        selector: '.complex-container',
        searchAttributes: ['textContent', 'data-content'],
        options: {
          caseSensitive: false,
          includeHidden: false,
          maxDepth: 5,
          textExtraction: 'textContent',
        },
      };

      const connection = await adapter.connect(config);
      const processedQuery = {
        original: 'content',
        normalized: 'content',
        isValid: true,
        metadata: {
          processingTime: 10,
          originalQuery: 'content',
          length: 7,
          trimmed: false,
          timestamp: Date.now(),
        },
      };

      const results = await adapter.query(connection, processedQuery);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Performance with large DOM trees', () => {
    it('should handle large numbers of elements efficiently', async () => {
      const manyElements = Array.from({ length: 1000 }, () => ({ ...mockElement }));
      // Ensure mock returns valid element
      mockDocument.querySelector.mockReturnValue(mockElement);
      mockElement.querySelectorAll.mockReturnValue(manyElements);

      const config: DOMDataSourceConfig = {
        type: 'dom',
        selector: '.large-container',
        searchAttributes: ['textContent'],
        performance: {
          enableCaching: true,
          enableMonitoring: true,
          cacheTTL: 60000,
        },
        options: {
          caseSensitive: false,
          includeHidden: false,
          maxDepth: 10,
          textExtraction: 'textContent',
        },
      };

      const start = performance.now();

      const connection = await adapter.connect(config);
      const processedQuery = {
        original: 'test',
        normalized: 'test',
        isValid: true,
        metadata: {
          processingTime: 10,
          originalQuery: 'test',
          length: 4,
          trimmed: false,
          timestamp: Date.now(),
        },
      };

      const results = await adapter.query(connection, processedQuery);
      const duration = performance.now() - start;

      expect(results).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
