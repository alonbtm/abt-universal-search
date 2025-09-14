/**
 * MemoryAdapter Unit Tests
 * Tests for the memory data adapter functionality
 */

import { MemoryAdapter, type MemoryAdapterConfig } from '../../src/adapters/MemoryAdapter';
import { ValidationError } from '../../src/utils/validation';

describe('MemoryAdapter', () => {
  const sampleData = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Developer' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Designer' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'Manager' }
  ];

  describe('Constructor', () => {
    it('should create adapter with valid configuration', () => {
      const config: MemoryAdapterConfig = {
        data: sampleData,
        searchFields: ['name', 'email']
      };

      const adapter = new MemoryAdapter(config);
      expect(adapter).toBeInstanceOf(MemoryAdapter);
      expect(adapter.getConfig().data).toEqual(sampleData);
      expect(adapter.getConfig().searchFields).toEqual(['name', 'email']);
    });

    it('should apply default configuration values', () => {
      const config: MemoryAdapterConfig = {
        data: sampleData,
        searchFields: ['name']
      };

      const adapter = new MemoryAdapter(config);
      const adapterConfig = adapter.getConfig();
      
      expect(adapterConfig.caseSensitive).toBe(false);
      expect(adapterConfig.updateStrategy).toBe('static');
    });

    it('should throw ValidationError for invalid data', () => {
      expect(() => {
        new MemoryAdapter({
          data: 'invalid' as any,
          searchFields: ['name']
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty searchFields', () => {
      expect(() => {
        new MemoryAdapter({
          data: sampleData,
          searchFields: []
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid searchFields', () => {
      expect(() => {
        new MemoryAdapter({
          data: sampleData,
          searchFields: ['', 'valid']
        });
      }).toThrow(ValidationError);
    });

    it('should validate data item structure', () => {
      expect(() => {
        new MemoryAdapter({
          data: [null, { name: 'test' }],
          searchFields: ['name']
        });
      }).toThrow(ValidationError);
    });
  });

  describe('Search', () => {
    let adapter: MemoryAdapter;

    beforeEach(() => {
      adapter = new MemoryAdapter({
        data: sampleData,
        searchFields: ['name', 'email', 'role']
      });
    });

    it('should return empty array for empty query', () => {
      const results = adapter.search('');
      expect(results).toEqual([]);
    });

    it('should return empty array for non-string query', () => {
      const results = adapter.search(null as any);
      expect(results).toEqual([]);
    });

    it('should find exact matches', () => {
      const results = adapter.search('Alice');
      expect(results).toHaveLength(1);
      expect(results[0].item).toEqual(sampleData[0]);
      expect(results[0].score).toBeGreaterThan(1);
    });

    it('should find partial matches', () => {
      const results = adapter.search('john');
      expect(results).toHaveLength(1);
      expect(results[0].item).toEqual(sampleData[0]);
    });

    it('should search across multiple fields', () => {
      const results = adapter.search('developer');
      expect(results).toHaveLength(1);
      expect(results[0].item).toEqual(sampleData[0]);
      expect(results[0].matchedFields).toContain('role');
    });

    it('should handle case insensitive search by default', () => {
      const results = adapter.search('ALICE');
      expect(results).toHaveLength(1);
      expect(results[0].item).toEqual(sampleData[0]);
    });

    it('should handle case sensitive search when configured', () => {
      const sensitiveAdapter = new MemoryAdapter({
        data: sampleData,
        searchFields: ['name'],
        caseSensitive: true
      });

      const results = sensitiveAdapter.search('ALICE');
      expect(results).toHaveLength(0);
    });

    it('should return results sorted by score', () => {
      const results = adapter.search('a'); // Should match Alice and Manager
      expect(results.length).toBeGreaterThan(0);
      
      // Scores should be in descending order
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should handle dot notation field access', () => {
      const nestedData = [
        { id: 1, profile: { name: 'Alice Johnson' }, contact: { email: 'alice@example.com' } }
      ];

      const nestedAdapter = new MemoryAdapter({
        data: nestedData,
        searchFields: ['profile.name', 'contact.email']
      });

      const results = nestedAdapter.search('Alice');
      expect(results).toHaveLength(1);
      expect(results[0].matchedFields).toContain('profile.name');
    });

    it('should handle missing fields gracefully', () => {
      const partialData = [
        { id: 1, name: 'Alice' }, // missing email
        { id: 2, email: 'bob@example.com' } // missing name
      ];

      const partialAdapter = new MemoryAdapter({
        data: partialData,
        searchFields: ['name', 'email']
      });

      const results = partialAdapter.search('Alice');
      expect(results).toHaveLength(1);
    });
  });

  describe('Data Management', () => {
    let adapter: MemoryAdapter;

    beforeEach(() => {
      adapter = new MemoryAdapter({
        data: sampleData,
        searchFields: ['name']
      });
    });

    it('should update data successfully', () => {
      const newData = [{ id: 4, name: 'David Wilson' }];
      
      adapter.updateData(newData);
      expect(adapter.getData()).toEqual(newData);
    });

    it('should throw error for invalid data update', () => {
      expect(() => {
        adapter.updateData('invalid' as any);
      }).toThrow(ValidationError);
    });

    it('should maintain data immutability', () => {
      const originalData = adapter.getData();
      originalData.push({ id: 99, name: 'Hacker' });
      
      // Original data should be unchanged
      expect(adapter.getData()).not.toContain({ id: 99, name: 'Hacker' });
    });

    it('should return immutable config', () => {
      const config = adapter.getConfig();
      config.caseSensitive = true;
      
      // Original config should be unchanged
      expect(adapter.getConfig().caseSensitive).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data array', () => {
      const adapter = new MemoryAdapter({
        data: [],
        searchFields: ['name']
      });

      const results = adapter.search('anything');
      expect(results).toEqual([]);
    });

    it('should handle whitespace-only queries', () => {
      const adapter = new MemoryAdapter({
        data: sampleData,
        searchFields: ['name']
      });

      const results = adapter.search('   ');
      expect(results).toEqual([]);
    });

    it('should handle special characters in search', () => {
      const specialData = [
        { id: 1, name: 'user@domain.com', tag: '#special' }
      ];

      const adapter = new MemoryAdapter({
        data: specialData,
        searchFields: ['name', 'tag']
      });

      const results = adapter.search('@domain');
      expect(results).toHaveLength(1);
    });

    it('should handle numeric fields', () => {
      const numericData = [
        { id: 1, name: 'Alice', score: 95 },
        { id: 2, name: 'Bob', score: 87 }
      ];

      const adapter = new MemoryAdapter({
        data: numericData,
        searchFields: ['name', 'score']
      });

      const results = adapter.search('95');
      expect(results).toHaveLength(1);
      expect(results[0].item).toEqual(numericData[0]);
    });
  });
});