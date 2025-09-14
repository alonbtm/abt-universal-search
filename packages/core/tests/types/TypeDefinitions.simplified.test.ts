/**
 * @fileoverview Simplified TypeScript Definition Tests - Core functionality testing
 * @description Focused tests for TypeScript definitions, manager classes, and type safety
 */

import {
  SearchConfiguration,
  SearchResult,
  GenericSearchResult,
  SearchResultType,
  DataSourceType,
  ThemeVariant,
  SearchEventType,
  ValidationErrorType,
  GenericEventHandler,
  GenericDataTransformer,
  GenericValidator,
  VERSION,
  API_VERSION,
  TYPESCRIPT_VERSION
} from '../../src/types/index';

import { TypeDefinitionManager } from '../../src/managers/TypeDefinitionManager';
import { GenericTypeSystem } from '../../src/systems/GenericTypeSystem';
import { IDEIntegrationManager } from '../../src/managers/IDEIntegrationManager';
import { TypeValidationManager } from '../../src/managers/TypeValidationManager';

describe('TypeScript Definitions - Core Tests', () => {
  describe('Type Definition Manager', () => {
    let typeManager: TypeDefinitionManager;

    beforeEach(() => {
      typeManager = new TypeDefinitionManager();
    });

    it('should initialize with type definitions', () => {
      const definitions = typeManager.getAllDefinitions();
      expect(definitions.size).toBeGreaterThan(0);
      expect(definitions.has('SearchConfiguration')).toBe(true);
      expect(definitions.has('SearchResult')).toBe(true);
    });

    it('should provide interface definitions', () => {
      const interfaces = typeManager.getInterfaceDefinitions();
      expect(Array.isArray(interfaces)).toBe(true);
      expect(interfaces.length).toBeGreaterThan(0);
      
      const searchConfig = interfaces.find(def => def.name === 'SearchConfiguration');
      expect(searchConfig).toBeDefined();
      expect(searchConfig?.category).toBe('interface');
    });

    it('should provide enum definitions', () => {
      const enums = typeManager.getEnumDefinitions();
      expect(Array.isArray(enums)).toBe(true);
      expect(enums.length).toBeGreaterThan(0);
      
      const resultType = enums.find(def => def.name === 'SearchResultType');
      expect(resultType).toBeDefined();
      expect(resultType?.category).toBe('enum');
    });

    it('should validate definitions completeness', () => {
      const validation = typeManager.validateDefinitions();
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('missingDocumentation');
      expect(validation).toHaveProperty('missingExports');
      expect(validation).toHaveProperty('suggestions');
    });

    it('should generate summary report', () => {
      const report = typeManager.generateSummaryReport();
      expect(report.totalDefinitions).toBeGreaterThan(0);
      expect(report.interfaces).toBeGreaterThan(0);
      expect(report.enums).toBeGreaterThan(0);
      expect(report.coverage.documentation).toBeGreaterThanOrEqual(0);
      expect(report.coverage.exports).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Generic Type System', () => {
    let typeSystem: GenericTypeSystem;

    beforeEach(() => {
      typeSystem = new GenericTypeSystem();
    });

    it('should create data transformers', () => {
      const transformer = typeSystem.createTransformer<string, number>(
        (str: string) => str.length,
        'string-to-length'
      );

      expect(typeof transformer).toBe('function');
      expect(transformer('hello')).toBe(5);
    });

    it('should create validators', () => {
      const validator = typeSystem.createValidator<string>(
        (value: any): value is string => typeof value === 'string',
        'string-validator'
      );

      expect(typeof validator).toBe('function');
      expect(validator('test')).toBe(true);
      expect(validator(123)).toBe(false);
    });

    it('should create generic search results', () => {
      interface CustomData {
        price: number;
        category: string;
      }

      const result = typeSystem.createSearchResult<CustomData>(
        { id: 'test-1', title: 'Test Product' },
        { price: 99.99, category: 'Electronics' }
      );

      expect(result.id).toBe('test-1');
      expect(result.title).toBe('Test Product');
      expect(result.data.price).toBe(99.99);
      expect(result.data.category).toBe('Electronics');
    });

    it('should chain transformers', () => {
      const first = (str: string) => str.length;
      const second = (num: number) => num * 2;
      
      const chained = typeSystem.chainTransformers(first, second);
      expect(chained('hello')).toBe(10); // 5 * 2
    });

    it('should compose validators', () => {
      const isString: GenericValidator<any> = (value): value is string => typeof value === 'string';
      const isNotEmpty: GenericValidator<any> = (value): value is string => value.length > 0;
      
      const composed = typeSystem.composeValidators([isString, isNotEmpty]);
      
      expect(composed('test')).toBe(true);
      expect(composed('')).toBe(false);
      expect(composed(123)).toBe(false);
    });

    it('should provide system statistics', () => {
      typeSystem.createTransformer((x: any) => x, 'test-transformer');
      typeSystem.createValidator((_x: any): _x is any => true, 'test-validator');
      
      const stats = typeSystem.getStatistics();
      expect(stats.transformers).toBeGreaterThanOrEqual(1);
      expect(stats.validators).toBeGreaterThanOrEqual(1);
    });
  });

  describe('IDE Integration Manager', () => {
    let ideManager: IDEIntegrationManager;

    beforeEach(() => {
      ideManager = new IDEIntegrationManager({
        targetIDE: 'vscode',
        languageServiceLevel: 'enhanced',
        intelliSenseOptimization: true,
        parameterHints: true,
        autoCompletion: true,
        errorChecking: true,
        codeNavigation: true
      });
    });

    it('should generate parameter hints', () => {
      const hints = ideManager.generateParameterHints('SearchConfiguration');
      expect(Array.isArray(hints)).toBe(true);
      
      if (hints.length > 0) {
        const hint = hints[0];
        expect(hint).toHaveProperty('name');
        expect(hint).toHaveProperty('type');
        expect(hint).toHaveProperty('description');
        expect(hint).toHaveProperty('optional');
      }
    });

    it('should provide autocomplete suggestions', () => {
      const suggestions = ideManager.getAutocompleteSuggestions('SearchConfiguration');
      expect(Array.isArray(suggestions)).toBe(true);
      
      if (suggestions.length > 0) {
        const suggestion = suggestions[0];
        expect(suggestion).toHaveProperty('text');
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('label');
        expect(suggestion).toHaveProperty('description');
      }
    });

    it('should validate configuration objects', () => {
      const validConfig = {
        dataSource: { type: 'api', url: 'https://api.example.com' }
      };
      
      const result = ideManager.validateConfiguration(validConfig);
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('suggestions');
    });

    it('should provide navigation targets', () => {
      const targets = ideManager.getNavigationTargets('SearchConfiguration');
      expect(Array.isArray(targets)).toBe(true);
      
      if (targets.length > 0) {
        const target = targets[0];
        expect(target).toHaveProperty('filePath');
        expect(target).toHaveProperty('line');
        expect(target).toHaveProperty('column');
        expect(target).toHaveProperty('symbol');
      }
    });

    it('should generate IDE configuration', () => {
      const config = ideManager.generateIDEConfiguration('/test/output');
      expect(config).toHaveProperty('files');
      expect(Array.isArray(config.files)).toBe(true);
    });

    it('should provide integration statistics', () => {
      const stats = ideManager.getStatistics();
      expect(stats).toHaveProperty('typeDefinitions');
      expect(stats).toHaveProperty('parameterHints');
      expect(stats).toHaveProperty('autocompleteSuggestions');
      expect(stats).toHaveProperty('namespaces');
      expect(stats).toHaveProperty('targetIDE');
      expect(stats).toHaveProperty('features');
    });
  });

  describe('Type Validation Manager', () => {
    let validationManager: TypeValidationManager;

    beforeEach(() => {
      validationManager = new TypeValidationManager({
        deep: true,
        strict: false,
        performance: {
          enableCaching: true,
          maxCacheSize: 100,
          cacheTimeoutMs: 30000
        }
      });
    });

    it('should validate search configuration', () => {
      const validConfig = {
        dataSource: { type: 'api', url: 'https://api.example.com' }
      };
      
      const result = validationManager.validateConfiguration(validConfig);
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('performance');
    });

    it('should validate search results', () => {
      const validResult = {
        id: 'test-1',
        title: 'Test Result'
      };
      
      const result = validationManager.validateSearchResult(validResult);
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result.summary.totalChecks).toBeGreaterThan(0);
    });

    it('should validate array of search results', () => {
      const results = [
        { id: 'test-1', title: 'Result 1' },
        { id: 'test-2', title: 'Result 2' }
      ];
      
      const validation = validationManager.validateSearchResults(results);
      expect(validation).toHaveProperty('isValid');
      expect(validation.summary.totalChecks).toBeGreaterThan(0);
    });

    it('should create type guards', () => {
      const isString = validationManager.createTypeGuard<string>(
        (value: any): value is string => typeof value === 'string'
      );
      
      expect(isString('test')).toBe(true);
      expect(isString(123)).toBe(false);
    });

    it('should provide validation statistics', () => {
      const stats = validationManager.getStatistics();
      expect(stats).toHaveProperty('rules');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('averageValidationTime');
      expect(stats).toHaveProperty('totalValidations');
    });

    it('should manage validation rules', () => {
      const customRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test validation rule',
        validator: (value: any) => typeof value === 'string',
        errorMessage: 'Expected string',
        severity: 'error' as const,
        required: true
      };
      
      validationManager.addValidationRule(customRule);
      const rules = validationManager.getAllValidationRules();
      
      expect(rules.some(rule => rule.id === 'test-rule')).toBe(true);
      
      validationManager.removeValidationRule('test-rule');
      const updatedRules = validationManager.getAllValidationRules();
      
      expect(updatedRules.some(rule => rule.id === 'test-rule')).toBe(false);
    });
  });

  describe('Core Type Safety', () => {
    it('should enforce SearchConfiguration structure', () => {
      // This test validates TypeScript compilation
      const config: SearchConfiguration = {
        dataSource: {
          type: 'api',
          url: 'https://api.example.com'
        },
        queryHandling: {
          minLength: 2,
          debounceMs: 300,
          triggerOn: 'change',
          caseSensitive: false,
          matchMode: 'partial',
          debounceStrategy: 'trailing',
          caseNormalization: 'lowercase',
          xssProtection: true,
          sqlInjectionProtection: true,
          performanceMonitoring: true
        },
        ui: {
          maxResults: 10,
          placeholder: 'Search...',
          loadingText: 'Loading...',
          noResultsText: 'No results found',
          theme: 'light',
          rtl: false
        }
      };
      
      expect(config.dataSource.type).toBe('api');
      expect((config.dataSource as any).url).toBe('https://api.example.com');
    });

    it('should enforce SearchResult structure', () => {
      const result: SearchResult = {
        id: 'test-1',
        title: 'Test Result'
      };
      
      expect(result.id).toBe('test-1');
      expect(result.title).toBe('Test Result');
    });

    it('should support generic search results', () => {
      interface ProductData {
        price: number;
        category: string;
      }
      
      const result: GenericSearchResult<ProductData> = {
        id: 'product-1',
        title: 'Test Product',
        data: {
          price: 99.99,
          category: 'Electronics'
        }
      };
      
      expect(result.data.price).toBe(99.99);
      expect(result.data.category).toBe('Electronics');
    });

    it('should provide type-safe enums', () => {
      expect(SearchResultType.PAGE).toBe('page');
      expect(DataSourceType.API).toBe('api');
      expect(ThemeVariant.LIGHT).toBe('light');
      expect(SearchEventType.QUERY_CHANGE).toBe('query_change');
      expect(ValidationErrorType.INVALID_TYPE).toBe('invalid_type');
    });

    it('should support generic event handlers', () => {
      interface TestEventData {
        message: string;
        timestamp: number;
      }
      
      const handler: GenericEventHandler<TestEventData> = (data) => {
        expect(data.message).toBeDefined();
        expect(typeof data.timestamp).toBe('number');
      };
      
      handler({ message: 'test', timestamp: Date.now() });
    });

    it('should support generic transformers', () => {
      const transformer: GenericDataTransformer<string, number> = (input) => input.length;
      
      expect(transformer('hello')).toBe(5);
      expect(transformer('test')).toBe(4);
    });

    it('should support generic validators', () => {
      const validator: GenericValidator<string> = (value): value is string => {
        return typeof value === 'string' && value.length > 0;
      };
      
      expect(validator('test')).toBe(true);
      expect(validator('')).toBe(false);
      expect(validator(123)).toBe(false);
    });
  });

  describe('Version Information', () => {
    it('should export version constants', () => {
      expect(typeof VERSION).toBe('string');
      expect(typeof API_VERSION).toBe('string');
      expect(typeof TYPESCRIPT_VERSION).toBe('string');
      
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
      expect(API_VERSION).toMatch(/^\d+/);
      expect(TYPESCRIPT_VERSION).toMatch(/\d+\.\d+/);
    });
  });

  describe('Manager Integration', () => {
    it('should integrate all managers successfully', () => {
      const typeManager = new TypeDefinitionManager();
      const typeSystem = new GenericTypeSystem();
      const ideManager = new IDEIntegrationManager({
        targetIDE: 'vscode',
        languageServiceLevel: 'enhanced',
        intelliSenseOptimization: true,
        parameterHints: true,
        autoCompletion: true,
        errorChecking: true,
        codeNavigation: true
      });
      const validationManager = new TypeValidationManager();
      
      // Verify all managers are properly instantiated
      expect(typeManager).toBeInstanceOf(TypeDefinitionManager);
      expect(typeSystem).toBeInstanceOf(GenericTypeSystem);
      expect(ideManager).toBeInstanceOf(IDEIntegrationManager);
      expect(validationManager).toBeInstanceOf(TypeValidationManager);
      
      // Verify basic functionality
      expect(typeManager.getAllDefinitions().size).toBeGreaterThan(0);
      expect(typeSystem.getStatistics().transformers).toBeGreaterThanOrEqual(0);
      expect(ideManager.getStatistics().targetIDE).toBe('vscode');
      expect(validationManager.getStatistics().rules).toBeGreaterThan(0);
    });
  });
});
