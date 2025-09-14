/**
 * Test suite for Universal Search 5-minute setup
 * Demonstrates how to test the search functionality
 */

import { UniversalSearch } from '../src/components/SearchComponent';
import { SearchConfig, SearchItem } from '../src/types/search';

// Mock DOM environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Sample test data
const testData: SearchItem[] = [
  {
    id: 1,
    name: 'Apple iPhone 15',
    category: 'Smartphones',
    description: 'Latest iPhone with advanced camera',
    price: 999,
    tags: ['apple', 'smartphone']
  },
  {
    id: 2,
    name: 'Samsung Galaxy S24',
    category: 'Smartphones',
    description: 'Android flagship with AI features',
    price: 899,
    tags: ['samsung', 'android']
  },
  {
    id: 3,
    name: 'MacBook Pro',
    category: 'Laptops',
    description: 'Professional laptop for developers',
    price: 1999,
    tags: ['apple', 'laptop']
  }
];

describe('UniversalSearch', () => {
  let container: HTMLDivElement;
  let search: UniversalSearch;

  beforeEach(() => {
    // Create container element
    container = document.createElement('div');
    container.id = 'search-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Cleanup
    if (search) {
      search.destroy();
    }
    document.body.removeChild(container);
  });

  describe('Initialization', () => {
    it('should create search instance with default configuration', () => {
      const config: SearchConfig = {
        data: testData
      };

      search = new UniversalSearch(config);
      expect(search).toBeInstanceOf(UniversalSearch);
    });

    it('should mount to DOM container', () => {
      const config: SearchConfig = {
        data: testData
      };

      search = new UniversalSearch(config);
      search.mount(container);

      const searchInput = container.querySelector('.search-input');
      expect(searchInput).toBeTruthy();
    });

    it('should throw error if container not found', () => {
      const config: SearchConfig = {
        data: testData
      };

      search = new UniversalSearch(config);
      
      expect(() => {
        search.mount('#non-existent-container');
      }).toThrow('Container element not found');
    });
  });

  describe('Configuration', () => {
    it('should apply custom placeholder', () => {
      const config: SearchConfig = {
        data: testData,
        placeholder: 'Custom search placeholder'
      };

      search = new UniversalSearch(config);
      search.mount(container);

      const searchInput = container.querySelector('.search-input') as HTMLInputElement;
      expect(searchInput.placeholder).toBe('Custom search placeholder');
    });

    it('should set custom search keys', () => {
      const config: SearchConfig = {
        data: testData,
        searchKeys: ['name', 'category']
      };

      search = new UniversalSearch(config);
      search.mount(container);

      // Test search functionality
      return new Promise<void>((resolve) => {
        config.onSearch = (query: string, results: SearchItem[]) => {
          expect(results.length).toBeGreaterThan(0);
          resolve();
        };

        search.search('iPhone');
      });
    });

    it('should limit results with maxResults', () => {
      const config: SearchConfig = {
        data: testData,
        maxResults: 1
      };

      search = new UniversalSearch(config);
      search.mount(container);

      return new Promise<void>((resolve) => {
        config.onSearch = (query: string, results: SearchItem[]) => {
          expect(results.length).toBeLessThanOrEqual(1);
          resolve();
        };

        search.search('phone'); // Should match multiple items but return only 1
      });
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      const config: SearchConfig = {
        data: testData,
        searchKeys: ['name', 'category', 'description']
      };

      search = new UniversalSearch(config);
      search.mount(container);
    });

    it('should find exact matches', async () => {
      const results = await new Promise<SearchItem[]>((resolve) => {
        search.updateConfig({
          onSearch: (query: string, results: SearchItem[]) => {
            resolve(results);
          }
        });

        search.search('iPhone');
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toContain('iPhone');
    });

    it('should find partial matches', async () => {
      const results = await new Promise<SearchItem[]>((resolve) => {
        search.updateConfig({
          onSearch: (query: string, results: SearchItem[]) => {
            resolve(results);
          }
        });

        search.search('phone');
      });

      expect(results.length).toBe(2); // iPhone and Samsung
    });

    it('should search in category field', async () => {
      const results = await new Promise<SearchItem[]>((resolve) => {
        search.updateConfig({
          onSearch: (query: string, results: SearchItem[]) => {
            resolve(results);
          }
        });

        search.search('Smartphones');
      });

      expect(results.length).toBe(2);
      expect(results.every(item => item.category === 'Smartphones')).toBe(true);
    });

    it('should search in description field', async () => {
      const results = await new Promise<SearchItem[]>((resolve) => {
        search.updateConfig({
          onSearch: (query: string, results: SearchItem[]) => {
            resolve(results);
          }
        });

        search.search('developers');
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toContain('MacBook');
    });

    it('should handle empty search query', async () => {
      const results = await new Promise<SearchItem[]>((resolve) => {
        search.updateConfig({
          onSearch: (query: string, results: SearchItem[]) => {
            resolve(results);
          }
        });

        search.search('');
      });

      expect(results.length).toBe(0);
    });

    it('should handle no matches', async () => {
      const results = await new Promise<SearchItem[]>((resolve) => {
        search.updateConfig({
          onSearch: (query: string, results: SearchItem[]) => {
            resolve(results);
          }
        });

        search.search('nonexistent');
      });

      expect(results.length).toBe(0);
    });
  });

  describe('Case Sensitivity', () => {
    it('should be case insensitive by default', async () => {
      const config: SearchConfig = {
        data: testData
      };

      search = new UniversalSearch(config);
      search.mount(container);

      const results = await new Promise<SearchItem[]>((resolve) => {
        search.updateConfig({
          onSearch: (query: string, results: SearchItem[]) => {
            resolve(results);
          }
        });

        search.search('iphone');
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toContain('iPhone');
    });

    it('should respect case sensitive setting', async () => {
      const config: SearchConfig = {
        data: testData,
        caseSensitive: true
      };

      search = new UniversalSearch(config);
      search.mount(container);

      const results = await new Promise<SearchItem[]>((resolve) => {
        search.updateConfig({
          onSearch: (query: string, results: SearchItem[]) => {
            resolve(results);
          }
        });

        search.search('iphone'); // lowercase
      });

      expect(results.length).toBe(0); // Should not match 'iPhone' with capital I
    });
  });

  describe('Callbacks', () => {
    it('should call onSearch callback', (done) => {
      const config: SearchConfig = {
        data: testData,
        onSearch: (query: string, results: SearchItem[]) => {
          expect(query).toBe('iPhone');
          expect(results.length).toBe(1);
          done();
        }
      };

      search = new UniversalSearch(config);
      search.mount(container);
      search.search('iPhone');
    });

    it('should call onError callback on API errors', (done) => {
      const config: SearchConfig = {
        apiEndpoint: 'https://invalid-endpoint.example.com',
        onError: (error: Error) => {
          expect(error).toBeInstanceOf(Error);
          done();
        }
      };

      search = new UniversalSearch(config);
      search.mount(container);
      search.search('test');
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      const config: SearchConfig = {
        data: testData
      };

      search = new UniversalSearch(config);
      search.mount(container);
    });

    it('should return current state', () => {
      const state = search.getState();
      
      expect(state).toHaveProperty('loading');
      expect(state).toHaveProperty('error');
      expect(state).toHaveProperty('results');
      expect(state).toHaveProperty('query');
      expect(state).toHaveProperty('totalCount');
      expect(state).toHaveProperty('currentPage');
    });

    it('should clear state when cleared', () => {
      search.clear();
      const state = search.getState();
      
      expect(state.query).toBe('');
      expect(state.results).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.totalCount).toBe(0);
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(() => {
      const config: SearchConfig = {
        data: testData
      };

      search = new UniversalSearch(config);
      search.mount(container);
    });

    it('should provide performance metrics', async () => {
      await search.search('iPhone');
      const metrics = search.getMetrics();
      
      expect(metrics).toHaveProperty('searchTime');
      expect(typeof metrics.searchTime).toBe('number');
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      const config: SearchConfig = {
        data: testData
      };

      search = new UniversalSearch(config);
      search.mount(container);
    });

    it('should update configuration', () => {
      const newData = [...testData, {
        id: 4,
        name: 'iPad Pro',
        category: 'Tablets',
        description: 'Professional tablet',
        price: 1099
      }];

      search.updateConfig({ data: newData });
      
      // Test that search now includes new item
      return new Promise<void>((resolve) => {
        search.updateConfig({
          onSearch: (query: string, results: SearchItem[]) => {
            const foundIpad = results.find(item => item.name.includes('iPad'));
            expect(foundIpad).toBeTruthy();
            resolve();
          }
        });

        search.search('tablet');
      });
    });
  });

  describe('DOM Interaction', () => {
    beforeEach(() => {
      const config: SearchConfig = {
        data: testData
      };

      search = new UniversalSearch(config);
      search.mount(container);
    });

    it('should create search input element', () => {
      const searchInput = container.querySelector('.search-input');
      expect(searchInput).toBeInstanceOf(HTMLInputElement);
    });

    it('should create results container', () => {
      const resultsContainer = container.querySelector('.search-results');
      expect(resultsContainer).toBeInstanceOf(HTMLElement);
    });

    it('should update input value when searching programmatically', () => {
      search.search('iPhone');
      
      const searchInput = container.querySelector('.search-input') as HTMLInputElement;
      expect(searchInput.value).toBe('iPhone');
    });

    it('should clear input when cleared', () => {
      search.search('iPhone');
      search.clear();
      
      const searchInput = container.querySelector('.search-input') as HTMLInputElement;
      expect(searchInput.value).toBe('');
    });
  });
});

describe('Edge Cases', () => {
  let container: HTMLDivElement;
  let search: UniversalSearch;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (search) {
      search.destroy();
    }
    document.body.removeChild(container);
  });

  it('should handle empty data array', () => {
    const config: SearchConfig = {
      data: []
    };

    search = new UniversalSearch(config);
    search.mount(container);

    return new Promise<void>((resolve) => {
      search.updateConfig({
        onSearch: (query: string, results: SearchItem[]) => {
          expect(results.length).toBe(0);
          resolve();
        }
      });

      search.search('anything');
    });
  });

  it('should handle malformed data', () => {
    const malformedData = [
      { name: 'Valid Item', category: 'Category' },
      { invalidField: 'No name field' }, // Missing required 'name' field
      null, // Null item
      undefined, // Undefined item
      { name: '', category: 'Empty name' } // Empty name
    ] as SearchItem[];

    const config: SearchConfig = {
      data: malformedData
    };

    expect(() => {
      search = new UniversalSearch(config);
      search.mount(container);
    }).not.toThrow();
  });

  it('should handle very long search queries', () => {
    const config: SearchConfig = {
      data: testData
    };

    search = new UniversalSearch(config);
    search.mount(container);

    const longQuery = 'a'.repeat(1000);

    return new Promise<void>((resolve) => {
      search.updateConfig({
        onSearch: (query: string, results: SearchItem[]) => {
          expect(query).toBe(longQuery);
          expect(Array.isArray(results)).toBe(true);
          resolve();
        }
      });

      search.search(longQuery);
    });
  });

  it('should handle special characters in search', () => {
    const config: SearchConfig = {
      data: testData
    };

    search = new UniversalSearch(config);
    search.mount(container);

    const specialQuery = '!@#$%^&*()_+-=[]{}|;":,./<>?';

    return new Promise<void>((resolve) => {
      search.updateConfig({
        onSearch: (query: string, results: SearchItem[]) => {
          expect(Array.isArray(results)).toBe(true);
          resolve();
        }
      });

      search.search(specialQuery);
    });
  });
});