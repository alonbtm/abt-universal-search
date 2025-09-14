/**
 * Unit Tests - Core Index Module
 * Tests for the main entry point and exports
 */

import { 
  VERSION, 
  createSearchComponent, 
  UniversalSearch,
  ValidationError,
  DEFAULT_CONFIG 
} from '../../src/index';

// Mock DOM element
const mockElement = document.createElement('div');
document.body.appendChild(mockElement);

describe('Core Index Module', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '<div id="test-element"></div>';
  });

  describe('VERSION export', () => {
    it('should export a valid version string', () => {
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe('string');
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should be the expected version', () => {
      expect(VERSION).toBe('1.0.0');
    });
  });

  describe('UniversalSearch export', () => {
    it('should export UniversalSearch class', () => {
      expect(UniversalSearch).toBeDefined();
      expect(typeof UniversalSearch).toBe('function');
      expect(UniversalSearch.name).toBe('UniversalSearch');
    });

    it('should create UniversalSearch instances', () => {
      const search = new UniversalSearch('#test-element');
      expect(search).toBeInstanceOf(UniversalSearch);
    });
  });

  describe('ValidationError export', () => {
    it('should export ValidationError class', () => {
      expect(ValidationError).toBeDefined();
      expect(typeof ValidationError).toBe('function');
      expect(ValidationError.name).toBe('ValidationError');
    });

    it('should create ValidationError instances', () => {
      const error = new ValidationError('Test error');
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('DEFAULT_CONFIG export', () => {
    it('should export default configuration', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(typeof DEFAULT_CONFIG).toBe('object');
      expect(DEFAULT_CONFIG).toHaveProperty('dataSource');
      expect(DEFAULT_CONFIG).toHaveProperty('queryHandling');
      expect(DEFAULT_CONFIG).toHaveProperty('ui');
    });
  });

  describe('createSearchComponent function (legacy)', () => {
    it('should be defined and callable', () => {
      expect(createSearchComponent).toBeDefined();
      expect(typeof createSearchComponent).toBe('function');
    });

    it('should return UniversalSearch instance', () => {
      const result = createSearchComponent('#test-element');
      
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(UniversalSearch);
    });

    it('should return correct version via getConfig', () => {
      const result = createSearchComponent('#test-element');
      const config = result.getConfig();
      
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should handle custom config', () => {
      const customConfig = {
        ui: {
          ...DEFAULT_CONFIG.ui,
          placeholder: 'Custom search'
        }
      };
      
      const result = createSearchComponent('#test-element', customConfig);
      expect(result.getConfig().ui.placeholder).toBe('Custom search');
    });

    it('should handle empty config', () => {
      const result = createSearchComponent('#test-element', {});
      
      expect(result).toBeDefined();
      expect(result.getConfig()).toBeDefined();
    });

    it('should not mutate the input config', () => {
      const customConfig = {
        ui: {
          placeholder: 'Test'
        }
      };
      const originalConfig = JSON.parse(JSON.stringify(customConfig));
      
      createSearchComponent('#test-element', customConfig);
      
      expect(customConfig).toEqual(originalConfig);
    });

    it('should be consistent across multiple calls', () => {
      const result1 = createSearchComponent('#test-element');
      const result2 = createSearchComponent('#test-element');
      
      expect(result1.getConfig()).toEqual(result2.getConfig());
    });

    it('should throw validation error for invalid selector', () => {
      expect(() => createSearchComponent('')).toThrow(ValidationError);
    });
  });
});