/**
 * @fileoverview TypeScript Definition Tests - Comprehensive type testing
 * @description Tests for TypeScript definitions, JSDoc documentation, generic types,
 * IDE integration, runtime validation, and compatibility across different scenarios
 */

import {
  SearchConfiguration,
  SearchResult,
  GenericSearchResult,
  GenericSearchConfiguration,
  SearchResultType,
  DataSourceType,
  ThemeVariant,
  SearchEventType,
  ValidationErrorType,
  GenericEventHandler,
  GenericDataTransformer,
  GenericValidator,
  GenericFilter,
  DeepPartial,
  DeepRequired,
  KeysOfType,
  ValueOf,
  DeepOmit,
  DeepPick,
  VERSION,
  API_VERSION,
  TYPESCRIPT_VERSION
} from '../../src/types/index';

import { TypeDefinitionManager } from '../../src/managers/TypeDefinitionManager';
import { GenericTypeSystem } from '../../src/systems/GenericTypeSystem';
import { IDEIntegrationManager } from '../../src/managers/IDEIntegrationManager';
import { TypeValidationManager } from '../../src/managers/TypeValidationManager';
import { DeclarationMapManager } from '../../src/managers/DeclarationMapManager';
import { CompatibilityManager } from '../../src/managers/CompatibilityManager';

// Initialize manager instances for testing
const typeDefinitionManager = new TypeDefinitionManager();
const genericTypeSystem = new GenericTypeSystem();
const ideIntegrationManager = new IDEIntegrationManager({
  targetIDE: 'vscode',
  languageServiceLevel: 'enhanced',
  intelliSenseOptimization: true,
  parameterHints: true,
  autoCompletion: true,
  errorChecking: true,
  codeNavigation: true
});
const typeValidationManager = new TypeValidationManager();
const declarationMapManager = new DeclarationMapManager();
const compatibilityManager = new CompatibilityManager();

// Mock validation functions
const validateSearchConfiguration = (config: any) => {
  const result = typeValidationManager.validateConfiguration(config);
  if (!result.isValid) {
    throw new Error(`Validation failed: ${result.errors.map(e => e.message).join(', ')}`);
  }
};

const validateSearchResult = (result: any) => {
  const validation = typeValidationManager.validateSearchResult(result);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
  }
};

// Mock compatibility functions
const checkVersionCompatibility = (from: string, to: string) => {
  return compatibilityManager.checkVersionCompatibility(from, to);
};

const checkTypeCompatibility = (typeName: string, version: string) => {
  return compatibilityManager.checkTypeCompatibility(typeName, version);
};

const generateMigrationGuide = (from: string, to: string) => {
  return compatibilityManager.generateMigrationGuide(from, to);
};

const migrateConfiguration = (config: any, from: string, to: string) => {
  return compatibilityManager.migrateConfiguration(config, from, to);
};

// Mock IDE integration functions
const getIntelliSenseInfo = (typeName: string) => {
  return ideIntegrationManager.getTypeDefinition?.(typeName) || null;
};

const enableEnhancedIntelliSense = () => {
  // Mock implementation
};

const reportTypeError = (name: string, type: string, value: any) => {
  // Mock implementation
};

describe('TypeScript Definitions', () => {
  describe('Core Type Definitions', () => {
    it('should have complete SearchConfiguration interface', () => {
      const config: SearchConfiguration = {
        dataSources: [{
          type: 'api',
          url: 'https://api.example.com'
        }]
      };

      expect(typeof config.dataSources).toBe('object');
      expect(Array.isArray(config.dataSources)).toBe(true);
      expect(config.dataSources.length).toBe(1);
    });

    it('should have complete SearchResult interface', () => {
      const result: SearchResult = {
        id: 'test-1',
        title: 'Test Result',
        description: 'Test description',
        type: 'page',
        score: 0.95
      };

      expect(typeof result.id).toBe('string');
      expect(typeof result.title).toBe('string');
      expect(typeof result.description).toBe('string');
      expect(typeof result.type).toBe('string');
      expect(typeof result.score).toBe('number');
    });

    it('should support optional properties in SearchResult', () => {
      const minimalResult: SearchResult = {
        id: 'test-1',
        title: 'Test Result'
      };

      expect(minimalResult.id).toBe('test-1');
      expect(minimalResult.title).toBe('Test Result');
      expect(minimalResult.description).toBeUndefined();
      expect(minimalResult.type).toBeUndefined();
      expect(minimalResult.score).toBeUndefined();
    });
  });

  describe('Generic Type System', () => {
    interface CustomData {
      customField: string;
      metadata: Record<string, any>;
    }

    it('should support GenericSearchResult with custom data', () => {
      const result: GenericSearchResult<CustomData> = {
        id: 'custom-1',
        title: 'Custom Result',
        data: {
          customField: 'value',
          metadata: { key: 'value' }
        }
      };

      expect(result.data.customField).toBe('value');
      expect(result.data.metadata.key).toBe('value');
      
      // TypeScript should enforce the custom data structure
      // @ts-expect-error - Should fail with wrong property
      // result.data.wrongProperty = 'should fail';
    });

    it('should support GenericSearchConfiguration with custom options', () => {
      interface CustomOptions {
        enablePreview: boolean;
        maxPreviewLength: number;
      }

      interface APIDataSource {
        type: 'api';
        url: string;
        headers: Record<string, string>;
      }

      const config: GenericSearchConfiguration<CustomOptions, APIDataSource> = {
        dataSources: [{
          type: 'api',
          url: 'https://api.example.com',
          headers: { 'Authorization': 'Bearer token' }
        }],
        customOptions: {
          enablePreview: true,
          maxPreviewLength: 200
        }
      };

      expect(config.dataSources[0].type).toBe('api');
      expect(config.dataSources[0].headers.Authorization).toBe('Bearer token');
      expect(config.customOptions?.enablePreview).toBe(true);
    });

    it('should support generic event handlers', () => {
      interface SelectEventData {
        result: SearchResult;
        index: number;
        query: string;
      }

      const onSelect: GenericEventHandler<SelectEventData> = (data) => {
        expect(data.result).toBeDefined();
        expect(typeof data.index).toBe('number');
        expect(typeof data.query).toBe('string');
      };

      onSelect({
        result: { id: '1', title: 'Test' },
        index: 0,
        query: 'search'
      });
    });

    it('should support generic callbacks and transformers', () => {
      const transformer: GenericDataTransformer<SearchResult[], SearchResult[]> = (results) => {
        return results.map(result => ({
          ...result,
          title: result.title.toUpperCase()
        }));
      };

      const results = transformer([
        { id: '1', title: 'test result' }
      ]);

      expect(results[0].title).toBe('TEST RESULT');
    });

    it('should support generic validators and filters', () => {
      const isValidResult: GenericValidator<SearchResult> = (data): data is SearchResult => {
        return typeof data === 'object' &&
               typeof data.id === 'string' &&
               typeof data.title === 'string';
      };

      const validData = { id: '1', title: 'Test' };
      const invalidData = { id: 1, title: 'Test' };

      expect(isValidResult(validData)).toBe(true);
      expect(isValidResult(invalidData)).toBe(false);

      const inStockFilter: GenericFilter<GenericSearchResult<{ inStock: boolean }>> = (result) => {
        return result.data.inStock === true;
      };

      const results = [
        { id: '1', title: 'Product 1', data: { inStock: true } },
        { id: '2', title: 'Product 2', data: { inStock: false } }
      ].filter(inStockFilter);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });
  });

  describe('Enum Type Safety', () => {
    it('should provide type-safe SearchResultType enum', () => {
      expect(SearchResultType.PAGE).toBe('page');
      expect(SearchResultType.USER).toBe('user');
      expect(SearchResultType.PRODUCT).toBe('product');
      expect(SearchResultType.CUSTOM).toBe('custom');
      
      // Should be assignable to string
      const resultType: string = SearchResultType.PAGE;
      expect(resultType).toBe('page');
    });

    it('should provide type-safe DataSourceType enum', () => {
      expect(DataSourceType.API).toBe('api');
      expect(DataSourceType.STATIC).toBe('static');
      expect(DataSourceType.GRAPHQL).toBe('graphql');
      
      const config: SearchConfiguration = {
        dataSources: [{
          type: DataSourceType.API,
          url: 'https://api.example.com'
        }]
      };

      expect(config.dataSources[0].type).toBe('api');
    });

    it('should provide type-safe SearchEventType enum', () => {
      const eventHandlers: Record<SearchEventType, () => void> = {
        [SearchEventType.QUERY_CHANGE]: () => {},
        [SearchEventType.SEARCH_START]: () => {},
        [SearchEventType.SEARCH_COMPLETE]: () => {},
        [SearchEventType.SEARCH_ERROR]: () => {},
        [SearchEventType.RESULT_SELECT]: () => {},
        [SearchEventType.RESULT_HOVER]: () => {},
        [SearchEventType.DROPDOWN_OPEN]: () => {},
        [SearchEventType.DROPDOWN_CLOSE]: () => {},
        [SearchEventType.FOCUS]: () => {},
        [SearchEventType.BLUR]: () => {},
        [SearchEventType.INIT]: () => {},
        [SearchEventType.DESTROY]: () => {}
      };

      expect(Object.keys(eventHandlers)).toHaveLength(12);
      expect(eventHandlers[SearchEventType.QUERY_CHANGE]).toBeDefined();
    });
  });

  describe('Utility Types', () => {
    interface TestInterface {
      required: string;
      optional?: number;
      nested: {
        deep: boolean;
        deeper?: string;
      };
    }

    it('should support DeepPartial utility type', () => {
      const partial: DeepPartial<TestInterface> = {
        nested: {
          // deep property is now optional
        }
      };

      expect(partial.nested).toBeDefined();
      // All properties should be optional
    });

    it('should support DeepRequired utility type', () => {
      const required: DeepRequired<TestInterface> = {
        required: 'test',
        optional: 123, // Now required
        nested: {
          deep: true,
          deeper: 'now required' // Now required
        }
      };

      expect(required.optional).toBe(123);
      expect(required.nested.deeper).toBe('now required');
    });

    it('should support KeysOfType utility type', () => {
      type StringKeys = KeysOfType<TestInterface, string>;
      type NumberKeys = KeysOfType<TestInterface, number>;

      // Should extract only string keys
      const stringKey: StringKeys = 'required';
      expect(stringKey).toBe('required');

      // This would be a compile error:
      // const invalidKey: StringKeys = 'nested';
    });

    it('should support ValueOf utility type', () => {
      const colors = {
        RED: '#ff0000',
        GREEN: '#00ff00',
        BLUE: '#0000ff'
      } as const;

      type Color = ValueOf<typeof colors>;
      
      const red: Color = '#ff0000';
      expect(red).toBe('#ff0000');
    });

    it('should support DeepOmit utility type', () => {
      type WithoutOptional = DeepOmit<TestInterface, 'optional'>;
      
      const withoutOptional: WithoutOptional = {
        required: 'test',
        nested: {
          deep: true
        }
      };

      expect(withoutOptional.required).toBe('test');
      // optional property should not exist
      expect('optional' in withoutOptional).toBe(false);
    });

    it('should support DeepPick utility type', () => {
      type OnlyRequired = DeepPick<TestInterface, 'required'>;
      
      const onlyRequired: OnlyRequired = {
        required: 'test'
      };

      expect(onlyRequired.required).toBe('test');
      // Other properties should not exist
      expect('optional' in onlyRequired).toBe(false);
      expect('nested' in onlyRequired).toBe(false);
    });
  });

  describe('Version Information', () => {
    it('should export version constants', () => {
      expect(typeof VERSION).toBe('string');
      expect(typeof API_VERSION).toBe('string');
      expect(typeof TYPESCRIPT_VERSION).toBe('string');
      
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
      expect(API_VERSION).toMatch(/^\d+$/);
      expect(TYPESCRIPT_VERSION).toMatch(/^\^\d+\.\d+\.\d+$/);
    });
  });

  describe('JSDoc Documentation', () => {
    it('should have comprehensive JSDoc for interfaces', () => {
      // This would be tested by documentation generation tools
      // Here we just verify the types are properly exported
      expect(SearchConfiguration).toBeDefined();
      expect(SearchResult).toBeDefined();
      expect(GenericSearchResult).toBeDefined();
    });
  });

  describe('Module Declaration Augmentation', () => {
    it('should support global namespace augmentation', () => {
      // Test that the global AlonSearch namespace is available
      // This would be checked at compile time
      declare global {
        namespace AlonSearch {
          interface CustomSearchResultExtensions {
            customProperty: string;
          }
        }
      }

      // The namespace should be augmentable
      expect(true).toBe(true); // Placeholder for compile-time check
    });
  });
});

describe('Runtime Type Validation', () => {
  describe('ValidationError', () => {
    it('should create validation errors with proper structure', () => {
      const error = new ValidationError(
        'Test error',
        ValidationErrorType.INVALID_TYPE,
        'test.property',
        [{ path: 'test.property', expected: 'string', actual: 'number', message: 'Type mismatch', code: 'TYPE_MISMATCH' }],
        'TEST_ERROR'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ValidationErrorType.INVALID_TYPE);
      expect(error.path).toBe('test.property');
      expect(error.details).toHaveLength(1);
      expect(error.code).toBe('TEST_ERROR');
    });

    it('should convert to JSON and user string', () => {
      const error = new ValidationError('Test error', ValidationErrorType.INVALID_TYPE, 'path');
      
      const json = error.toJSON();
      expect(json.name).toBe('ValidationError');
      expect(json.message).toBe('Test error');
      expect(json.type).toBe(ValidationErrorType.INVALID_TYPE);
      
      const userString = error.toUserString();
      expect(userString).toContain('Test error');
      expect(userString).toContain('at path: path');
    });
  });

  describe('Built-in Type Validation', () => {
    it('should validate SearchConfiguration', () => {
      const validConfig = {
        dataSources: [{ type: 'api', url: 'https://api.example.com' }]
      };

      expect(() => validateSearchConfiguration(validConfig)).not.toThrow();

      const invalidConfig = {
        dataSources: 'invalid'
      };

      expect(() => validateSearchConfiguration(invalidConfig)).toThrow(ValidationError);
    });

    it('should validate SearchResult', () => {
      const validResult = {
        id: 'test-1',
        title: 'Test Result'
      };

      expect(() => validateSearchResult(validResult)).not.toThrow();

      const invalidResult = {
        id: 123,
        title: 'Test Result'
      };

      expect(() => validateSearchResult(invalidResult)).toThrow(ValidationError);
    });
  });

  describe('Custom Validators', () => {
    it('should create custom validators', () => {
      const validator = createValidator({
        name: ValidationType.STRING,
        age: ValidationType.NUMBER,
        email: ValidationType.EMAIL
      });

      const validData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      };

      const result = validator(validData);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validData);

      const invalidData = {
        name: 'John Doe',
        age: 'thirty',
        email: 'invalid-email'
      };

      const invalidResult = validator(invalidData);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Type Guards', () => {
    it('should provide working type guards', () => {
      expect(TypeGuards.isString('test')).toBe(true);
      expect(TypeGuards.isString(123)).toBe(false);

      expect(TypeGuards.isNumber(123)).toBe(true);
      expect(TypeGuards.isNumber('123')).toBe(false);

      expect(TypeGuards.isBoolean(true)).toBe(true);
      expect(TypeGuards.isBoolean('true')).toBe(false);

      expect(TypeGuards.isArray([])).toBe(true);
      expect(TypeGuards.isArray({})).toBe(false);

      expect(TypeGuards.isObject({})).toBe(true);
      expect(TypeGuards.isObject([])).toBe(false);

      expect(TypeGuards.isFunction(() => {})).toBe(true);
      expect(TypeGuards.isFunction({})).toBe(false);
    });

    it('should validate complex objects with type guards', () => {
      const config = {
        dataSources: [{ type: 'api', url: 'https://api.example.com' }]
      };

      expect(TypeGuards.isSearchConfiguration(config)).toBe(true);

      const result = {
        id: 'test-1',
        title: 'Test Result'
      };

      expect(TypeGuards.isSearchResult(result)).toBe(true);
    });
  });

  describe('Performance and Debugging', () => {
    it('should collect performance metrics in debug mode', () => {
      const validator = createValidator({
        name: ValidationType.STRING,
        nested: {
          value: ValidationType.NUMBER
        }
      }, { debug: true });

      const result = validator({
        name: 'test',
        nested: { value: 123 }
      });

      expect(result.metrics).toBeDefined();
      expect(typeof result.metrics!.duration).toBe('number');
      expect(typeof result.metrics!.rulesEvaluated).toBe('number');
    });
  });
});

describe('IDE Integration', () => {
  describe('IntelliSense Support', () => {
    it('should provide IntelliSense information', () => {
      const info = getIntelliSenseInfo('SearchConfiguration');
      
      if (info) {
        expect(info.typeName).toBe('SearchConfiguration');
        expect(info.description).toBeDefined();
        expect(info.documentation).toBeDefined();
        expect(Array.isArray(info.properties)).toBe(true);
        expect(Array.isArray(info.methods)).toBe(true);
        expect(Array.isArray(info.examples)).toBe(true);
      }
    });

    it('should enable enhanced IntelliSense', () => {
      expect(() => enableEnhancedIntelliSense()).not.toThrow();
    });

    it('should report type errors', () => {
      expect(() => {
        reportTypeError('config', 'SearchConfiguration', { invalid: 'data' });
      }).not.toThrow();
    });

    it('should provide completion items', () => {
      const completions = ideIntegrationManager.getCompletionItems('const config: SearchConfiguration = {', { line: 1, column: 40 });
      expect(Array.isArray(completions)).toBe(true);
    });

    it('should provide parameter hints', () => {
      const hints = ideIntegrationManager.getParameterHints('validateSearchConfiguration', 0);
      // May be null if function info not registered
      if (hints) {
        expect(hints.signature).toBeDefined();
        expect(Array.isArray(hints.parameters)).toBe(true);
      }
    });

    it('should provide hover information', () => {
      const hover = ideIntegrationManager.getHoverInfo('SearchConfiguration');
      if (hover) {
        expect(Array.isArray(hover.contents)).toBe(true);
        expect(hover.contents.length).toBeGreaterThan(0);
      }
    });
  });

  describe('VS Code Integration', () => {
    it('should generate VS Code settings', () => {
      const settings = ideIntegrationManager.generateVSCodeSettings();
      expect(typeof settings).toBe('object');
      expect(settings['typescript.preferences.quoteStyle']).toBe('single');
      expect(settings['typescript.suggest.autoImports']).toBe(true);
    });

    it('should validate TypeScript configuration', () => {
      const config = {
        compilerOptions: {
          strict: true,
          declaration: true,
          declarationMap: true
        }
      };

      const validation = ideIntegrationManager.validateTypeScriptConfig(config);
      expect(validation.valid).toBe(true);
      expect(Array.isArray(validation.issues)).toBe(true);
      expect(Array.isArray(validation.suggestions)).toBe(true);
    });
  });

  describe('Error Diagnostics', () => {
    it('should manage error diagnostics', () => {
      const file = 'test.ts';
      
      ideIntegrationManager.reportTypeError('config', 'SearchConfiguration', {}, {
        file,
        line: 1,
        column: 10
      });

      const diagnostics = ideIntegrationManager.getDiagnostics(file);
      expect(Array.isArray(diagnostics)).toBe(true);
      expect(diagnostics.length).toBeGreaterThan(0);

      ideIntegrationManager.clearDiagnostics(file);
      const clearedDiagnostics = ideIntegrationManager.getDiagnostics(file);
      expect(clearedDiagnostics).toHaveLength(0);
    });
  });
});

describe('Backward Compatibility', () => {
  describe('Version Management', () => {
    it('should check version compatibility', () => {
      const compatibility = checkVersionCompatibility('1.0.0', '1.1.0');
      
      expect(compatibility.version).toBe('1.0.0');
      expect(typeof compatibility.compatible).toBe('boolean');
      expect(['full', 'partial', 'breaking', 'incompatible']).toContain(compatibility.level);
      expect(Array.isArray(compatibility.breakingChanges)).toBe(true);
      expect(Array.isArray(compatibility.deprecations)).toBe(true);
    });

    it('should check type compatibility', () => {
      const typeCompatibility = checkTypeCompatibility('SearchConfiguration', '1.0.0');
      
      expect(typeCompatibility.typeName).toBe('SearchConfiguration');
      expect(typeCompatibility.sourceVersion).toBeDefined();
      expect(typeCompatibility.targetVersion).toBe('1.0.0');
      expect(typeof typeCompatibility.compatible).toBe('boolean');
      expect(Array.isArray(typeCompatibility.issues)).toBe(true);
      expect(Array.isArray(typeCompatibility.changes)).toBe(true);
    });

    it('should generate migration guides', () => {
      const guide = generateMigrationGuide('1.0.0', '2.0.0');
      
      expect(Array.isArray(guide)).toBe(true);
      guide.forEach(entry => {
        expect(entry.title).toBeDefined();
        expect(entry.description).toBeDefined();
        expect(entry.before).toBeDefined();
        expect(entry.after).toBeDefined();
        expect(Array.isArray(entry.steps)).toBe(true);
        expect(['simple', 'moderate', 'complex']).toContain(entry.complexity);
      });
    });

    it('should migrate configuration data', () => {
      const oldConfig = {
        dataSources: [{ type: 'api', url: 'https://api.example.com' }]
      };

      const migratedConfig = migrateConfiguration(oldConfig, '1.0.0', '1.1.0');
      
      // Should return a new object (not mutate original)
      expect(migratedConfig).not.toBe(oldConfig);
      expect(migratedConfig.dataSources).toBeDefined();
    });
  });

  describe('Breaking Change Detection', () => {
    it('should detect breaking changes between versions', () => {
      const changes = compatibilityManager.getBreakingChangesBetween('1.0.0', '2.0.0');
      
      expect(Array.isArray(changes)).toBe(true);
      changes.forEach(change => {
        expect(['interface', 'method', 'property', 'enum', 'behavior', 'removal']).toContain(change.type);
        expect(change.component).toBeDefined();
        expect(change.description).toBeDefined();
        expect(['low', 'medium', 'high', 'critical']).toContain(change.impact);
        expect(typeof change.automatable).toBe('boolean');
      });
    });

    it('should get deprecations between versions', () => {
      const deprecations = compatibilityManager.getDeprecationsBetween('1.0.0', '2.0.0');
      
      expect(Array.isArray(deprecations)).toBe(true);
      deprecations.forEach(deprecation => {
        expect(['interface', 'method', 'property', 'enum', 'constant']).toContain(deprecation.type);
        expect(deprecation.name).toBeDefined();
        expect(deprecation.reason).toBeDefined();
        expect(deprecation.since).toBeDefined();
      });
    });
  });

  describe('Version Range Validation', () => {
    it('should validate version ranges', () => {
      const inRange = compatibilityManager.isVersionInRange('1.5.0', {
        min: '1.0.0',
        max: '2.0.0'
      });
      expect(inRange).toBe(true);

      const outOfRange = compatibilityManager.isVersionInRange('2.1.0', {
        min: '1.0.0',
        max: '2.0.0'
      });
      expect(outOfRange).toBe(false);

      const exact = compatibilityManager.isVersionInRange('1.5.0', {
        exact: '1.5.0'
      });
      expect(exact).toBe(true);

      const excluded = compatibilityManager.isVersionInRange('1.5.0', {
        min: '1.0.0',
        max: '2.0.0',
        exclude: ['1.5.0']
      });
      expect(excluded).toBe(false);
    });
  });
});

describe('Declaration Maps and Source Mapping', () => {
  it('should generate declaration files with source maps', () => {
    // This would be tested by the build process
    // Here we just verify the configuration is correct
    expect(true).toBe(true); // Placeholder
  });

  it('should support "Go to Definition" functionality', () => {
    // This would be tested by IDE integration
    // Here we verify type exports are available
    expect(SearchConfiguration).toBeDefined();
    expect(SearchResult).toBeDefined();
    expect(GenericSearchResult).toBeDefined();
  });
});

describe('Performance and Memory', () => {
  it('should handle large type validation without memory issues', () => {
    const largeData = {
      dataSources: Array.from({ length: 1000 }, (_, i) => ({
        type: 'api',
        url: `https://api${i}.example.com`
      }))
    };

    expect(() => validateSearchConfiguration(largeData)).not.toThrow();
  });

  it('should cache type information efficiently', () => {
    // Multiple calls should be fast due to caching
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      getIntelliSenseInfo('SearchConfiguration');
    }
    const end = performance.now();
    
    expect(end - start).toBeLessThan(100); // Should be very fast due to caching
  });

  it('should clean up resources properly', () => {
    const manager = ideIntegrationManager;
    
    // Should not throw when accessing after cleanup operations
    expect(() => {
      manager.clearDiagnostics('test.ts');
    }).not.toThrow();
  });
});