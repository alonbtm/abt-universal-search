/**
 * Tests for UniversalSearch core functionality
 */

import { UniversalSearch } from '../core/UniversalSearch';
import { SearchResult } from '../types';

describe('UniversalSearch', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-search';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Constructor', () => {
    it('should create instance with default config', () => {
      const search = new UniversalSearch({
        ui: { container }
      });

      expect(search).toBeInstanceOf(UniversalSearch);
      expect(search.getId()).toBeDefined();
      expect(search.getIsDestroyed()).toBe(false);
    });

    it('should merge user config with defaults', () => {
      const search = new UniversalSearch({
        ui: { 
          container,
          theme: 'dark',
          placeholder: 'Custom placeholder'
        },
        performance: {
          cache: false
        }
      });

      const config = search.getConfig();
      expect(config.ui.theme).toBe('dark');
      expect(config.ui.placeholder).toBe('Custom placeholder');
      expect(config.performance?.cache).toBe(false);
      expect(config.ui.debounceMs).toBe(300); // Should keep default
    });
  });

  describe('Memory Data Source', () => {
    it('should search in memory data', async () => {
      const testData = [
        { id: 1, title: 'JavaScript Guide', description: 'Learn JavaScript programming' },
        { id: 2, title: 'TypeScript Handbook', description: 'Advanced TypeScript concepts' },
        { id: 3, title: 'React Tutorial', description: 'Build React applications' }
      ];

      const search = new UniversalSearch({
        dataSource: { type: 'memory', data: testData },
        ui: { container }
      });

      const results = await search.search('JavaScript');
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('JavaScript Guide');
      expect(results[0].id).toBe(1);
    });

    it('should return results sorted by relevance', async () => {
      const testData = [
        { id: 1, title: 'TypeScript Guide', description: 'Some content' },
        { id: 2, title: 'JavaScript Basics', description: 'JavaScript fundamentals' },
        { id: 3, title: 'Advanced JavaScript', description: 'Advanced concepts' }
      ];

      const search = new UniversalSearch({
        dataSource: { type: 'memory', data: testData },
        ui: { container }
      });

      const results = await search.search('JavaScript');
      
      expect(results).toHaveLength(2);
      // Exact title match should score higher
      expect(results[0].title).toBe('JavaScript Basics');
      expect(results[1].title).toBe('Advanced JavaScript');
    });

    it('should handle empty search query', async () => {
      const search = new UniversalSearch({
        dataSource: { type: 'memory', data: [{ title: 'Test' }] },
        ui: { container }
      });

      const results = await search.search('');
      expect(results).toHaveLength(0);
    });

    it('should handle no results', async () => {
      const search = new UniversalSearch({
        dataSource: { type: 'memory', data: [{ title: 'Test' }] },
        ui: { container }
      });

      const results = await search.search('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('Data Management', () => {
    it('should set and get data', () => {
      const search = new UniversalSearch({
        ui: { container }
      });

      const testData = [{ id: 1, title: 'Test Item' }];
      search.setData(testData);
      
      const retrievedData = search.getData();
      expect(retrievedData).toEqual(testData);
      expect(retrievedData).not.toBe(testData); // Should be a copy
    });

    it('should update data and clear cache', async () => {
      const search = new UniversalSearch({
        ui: { container }
      });

      // Set initial data
      search.setData([{ id: 1, title: 'Original' }]);
      let results = await search.search('Original');
      expect(results).toHaveLength(1);

      // Update data
      search.setData([{ id: 2, title: 'Updated' }]);
      results = await search.search('Updated');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Updated');

      // Old data should not be found
      results = await search.search('Original');
      expect(results).toHaveLength(0);
    });
  });

  describe('Event Handling', () => {
    it('should emit search events', (done) => {
      const search = new UniversalSearch({
        ui: { container }
      });

      search.on('search', (event) => {
        expect(event.type).toBe('search');
        expect(event.query).toBe('test');
        expect(event.timestamp).toBeDefined();
        done();
      });

      search.search('test');
    });

    it('should emit results events', (done) => {
      const testData = [{ id: 1, title: 'Test' }];
      const search = new UniversalSearch({
        dataSource: { type: 'memory', data: testData },
        ui: { container }
      });

      search.on('results', (event) => {
        expect(event.type).toBe('results');
        expect(event.results).toHaveLength(1);
        expect(event.query).toBe('Test');
        done();
      });

      search.search('Test');
    });
  });

  describe('Query Management', () => {
    it('should set and get query', () => {
      const search = new UniversalSearch({
        ui: { container }
      });

      search.setQuery('test query');
      expect(search.getQuery()).toBe('test query');
    });
  });

  describe('Static Factory Methods', () => {
    it('should create memory instance with factory method', () => {
      const testData = [{ id: 1, title: 'Test' }];
      const search = UniversalSearch.memory(testData, container);

      expect(search).toBeInstanceOf(UniversalSearch);
      expect(search.getData()).toEqual(testData);
    });

    it('should auto-initialize from DOM attributes', () => {
      // Create element with data attribute
      const element = document.createElement('div');
      element.setAttribute('data-universal-search', '');
      element.setAttribute('data-data', '[{"id": 1, "title": "Auto Test"}]');
      document.body.appendChild(element);

      const instances = UniversalSearch.auto();
      
      expect(instances).toHaveLength(1);
      expect(instances[0]).toBeInstanceOf(UniversalSearch);
      
      // Clean up
      instances.forEach(instance => instance.destroy());
    });
  });

  describe('Lifecycle', () => {
    it('should destroy instance properly', () => {
      const search = new UniversalSearch({
        ui: { container }
      });

      expect(search.getIsDestroyed()).toBe(false);
      
      search.destroy();
      
      expect(search.getIsDestroyed()).toBe(true);
    });

    it('should throw error when using destroyed instance', async () => {
      const search = new UniversalSearch({
        ui: { container }
      });

      search.destroy();

      await expect(search.search('test')).rejects.toThrow('UniversalSearch instance has been destroyed');
    });

    it('should handle methods gracefully after destruction', () => {
      const search = new UniversalSearch({
        ui: { container }
      });

      search.destroy();

      // These should not throw, just return defaults
      expect(search.getQuery()).toBe('');
      expect(search.getData()).toEqual([]);
      expect(() => search.setQuery('test')).not.toThrow();
      expect(() => search.hideResults()).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      const search = new UniversalSearch({
        ui: { container }
      });

      search.updateConfig({
        performance: { cache: false }
      });

      const config = search.getConfig();
      expect(config.performance?.cache).toBe(false);
    });

    it('should deep merge configuration updates', () => {
      const search = new UniversalSearch({
        ui: { 
          container,
          theme: 'light'
        },
        performance: {
          cache: true,
          cacheTTL: 1000
        }
      });

      search.updateConfig({
        performance: { cache: false }
      });

      const config = search.getConfig();
      expect(config.ui.theme).toBe('light'); // Should be preserved
      expect(config.performance?.cache).toBe(false); // Should be updated
      expect(config.performance?.cacheTTL).toBe(1000); // Should be preserved
    });
  });
});