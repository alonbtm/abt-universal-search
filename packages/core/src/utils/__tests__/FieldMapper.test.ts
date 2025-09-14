/**
 * Field Mapper Tests
 * @description Test suite for the AdvancedFieldMapper utility
 */

import { 
  AdvancedFieldMapper, 
  createFieldMapping, 
  createTemplateMapping,
  createTransformMapping 
} from '../FieldMapper';
import type { FieldMappingOptions, TransformContext } from '../FieldMapper';

describe('AdvancedFieldMapper', () => {
  let fieldMapper: AdvancedFieldMapper;
  let testData: Record<string, unknown>;

  beforeEach(() => {
    fieldMapper = new AdvancedFieldMapper();
    testData = {
      id: 1,
      name: 'Test Item',
      description: 'A test item for mapping',
      category: 'test',
      user: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        profile: {
          avatar: 'avatar.png',
          bio: 'Test user'
        }
      },
      tags: ['test', 'sample', 'demo'],
      metadata: {
        created: '2023-01-01',
        updated: '2023-12-01',
        version: '1.0'
      },
      score: '85',
      isActive: 'true',
      nullValue: null,
      emptyValue: ''
    };
  });

  describe('Basic Field Mapping', () => {
    it('should map simple fields', () => {
      const result = fieldMapper.mapField(testData, 'name');
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('Test Item');
      expect(result.sourceField).toBe('name');
      expect(result.usedFallback).toBe(false);
    });

    it('should map nested fields using dot notation', () => {
      const result = fieldMapper.mapField(testData, 'user.firstName');
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('John');
      expect(result.sourceField).toBe('user.firstName');
    });

    it('should map deeply nested fields', () => {
      const result = fieldMapper.mapField(testData, 'user.profile.bio');
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('Test user');
      expect(result.sourceField).toBe('user.profile.bio');
    });

    it('should handle array access with bracket notation', () => {
      const result = fieldMapper.mapField(testData, 'tags[0]');
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('test');
    });

    it('should return null for non-existent fields', () => {
      const result = fieldMapper.mapField(testData, 'nonexistent');
      
      expect(result.success).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should handle null and empty values', () => {
      const nullResult = fieldMapper.mapField(testData, 'nullValue');
      const emptyResult = fieldMapper.mapField(testData, 'emptyValue');
      
      expect(nullResult.success).toBe(true);
      expect(nullResult.value).toBeNull();
      
      expect(emptyResult.success).toBe(true);
      expect(emptyResult.value).toBe('');
    });
  });

  describe('Field Mapping Options', () => {
    it('should apply default values', () => {
      const options: FieldMappingOptions = {
        defaultValue: 'Default Value'
      };
      
      const result = fieldMapper.mapField(testData, 'nonexistent', options);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('Default Value');
    });

    it('should handle required fields', () => {
      const options: FieldMappingOptions = {
        required: true
      };
      
      const result = fieldMapper.mapField(testData, 'nonexistent', options);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("Required field 'nonexistent' not found");
    });

    it('should use fallback fields', () => {
      const options: FieldMappingOptions = {
        fallbacks: ['nonexistent1', 'nonexistent2', 'name']
      };
      
      const result = fieldMapper.mapField(testData, 'missing', options);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('Test Item');
      expect(result.sourceField).toBe('name');
      expect(result.usedFallback).toBe(true);
    });

    it('should apply type conversions', () => {
      const stringOptions: FieldMappingOptions = { type: 'string' };
      const numberOptions: FieldMappingOptions = { type: 'number' };
      const booleanOptions: FieldMappingOptions = { type: 'boolean' };
      
      const stringResult = fieldMapper.mapField(testData, 'score', stringOptions);
      const numberResult = fieldMapper.mapField(testData, 'score', numberOptions);
      const booleanResult = fieldMapper.mapField(testData, 'isActive', booleanOptions);
      
      expect(stringResult.value).toBe('85');
      expect(numberResult.value).toBe(85);
      expect(numberResult.typeConverted).toBe(true);
      
      expect(booleanResult.value).toBe(true);
      expect(booleanResult.typeConverted).toBe(true);
    });

    it('should apply custom transformations', () => {
      const transform = (value: unknown) => `Transformed: ${value}`;
      const options: FieldMappingOptions = { transform };
      
      const result = fieldMapper.mapField(testData, 'name', options);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('Transformed: Test Item');
    });
  });

  describe('Template Processing', () => {
    it('should apply simple templates', () => {
      const options: FieldMappingOptions = {
        template: '{{name}} ({{category}})'
      };
      
      const result = fieldMapper.mapField(testData, 'name', options);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('Test Item (test)');
    });

    it('should handle nested field templates', () => {
      const options: FieldMappingOptions = {
        template: '{{user.firstName}} {{user.lastName}} - {{user.email}}'
      };
      
      const result = fieldMapper.mapField(testData, 'name', options);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('John Doe - john@example.com');
    });

    it('should handle context variables in templates', () => {
      const options: FieldMappingOptions = {
        template: 'Item {{index}}: {{name}}'
      };
      
      const context: TransformContext = {
        source: testData,
        fieldPath: 'name',
        currentValue: 'Test Item',
        index: 5,
        additionalContext: {}
      };
      
      const result = fieldMapper.mapField(testData, 'name', options, context);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('Item 5: Test Item');
    });

    it('should handle missing template variables', () => {
      const options: FieldMappingOptions = {
        template: '{{name}} - {{nonexistent}}'
      };
      
      const result = fieldMapper.mapField(testData, 'name', options);
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('Test Item - ');
    });
  });

  describe('Multiple Field Mapping', () => {
    it('should map multiple fields with simple mappings', () => {
      const mappings = {
        title: 'name',
        subtitle: 'description',
        author: 'user.firstName'
      };
      
      const results = fieldMapper.mapFields(testData, mappings);
      
      expect(results.title.success).toBe(true);
      expect(results.title.value).toBe('Test Item');
      
      expect(results.subtitle.success).toBe(true);
      expect(results.subtitle.value).toBe('A test item for mapping');
      
      expect(results.author.success).toBe(true);
      expect(results.author.value).toBe('John');
    });

    it('should map multiple fields with complex mappings', () => {
      const mappings = {
        title: {
          template: '{{name}} - {{category}}',
          defaultValue: 'Untitled'
        },
        author: {
          template: '{{user.firstName}} {{user.lastName}}',
          fallbacks: ['user.email', 'name']
        },
        score: {
          type: 'number',
          defaultValue: 0
        }
      };
      
      const results = fieldMapper.mapFields(testData, mappings);
      
      expect(results.title.value).toBe('Test Item - test');
      expect(results.author.value).toBe('John Doe');
      expect(results.score.value).toBe(85);
      expect(results.score.typeConverted).toBe(true);
    });
  });

  describe('Standard Result Creation', () => {
    it('should create standard result object', () => {
      const mappings = {
        label: 'name',
        value: 'id',
        metadata: {
          subtitle: 'description',
          category: 'category',
          author: 'user.email'
        }
      };
      
      const result = fieldMapper.createStandardResult(testData, mappings);
      
      expect(result.label).toBe('Test Item');
      expect(result.value).toBe(1);
      expect(result.metadata.subtitle).toBe('A test item for mapping');
      expect(result.metadata.category).toBe('test');
      expect(result.metadata.author).toBe('john@example.com');
      expect(result.mappingErrors).toHaveLength(0);
    });

    it('should handle required label field', () => {
      const mappings = {
        label: { required: true },
        metadata: {}
      };
      
      const result = fieldMapper.createStandardResult({ id: 1 }, mappings);
      
      expect(result.mappingErrors.length).toBeGreaterThan(0);
      expect(result.mappingErrors[0]).toContain('Failed to map label field');
    });

    it('should handle missing metadata fields', () => {
      const mappings = {
        label: 'name',
        metadata: {
          required: { required: true },
          optional: 'nonexistent'
        }
      };
      
      const result = fieldMapper.createStandardResult(testData, mappings);
      
      expect(result.label).toBe('Test Item');
      expect(result.metadata.optional).toBeUndefined();
      expect(result.mappingErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Type Conversions', () => {
    it('should convert to string type', () => {
      const options: FieldMappingOptions = { type: 'string' };
      
      const numberResult = fieldMapper.mapField(testData, 'id', options);
      const arrayResult = fieldMapper.mapField(testData, 'tags', options);
      
      expect(numberResult.value).toBe('1');
      expect(typeof arrayResult.value).toBe('string');
    });

    it('should convert to number type', () => {
      const options: FieldMappingOptions = { type: 'number' };
      
      const result = fieldMapper.mapField(testData, 'score', options);
      
      expect(result.value).toBe(85);
      expect(result.typeConverted).toBe(true);
    });

    it('should convert to boolean type', () => {
      const options: FieldMappingOptions = { type: 'boolean' };
      
      const trueResult = fieldMapper.mapField(testData, 'isActive', options);
      const falseResult = fieldMapper.mapField({ flag: 'false' }, 'flag', options);
      
      expect(trueResult.value).toBe(true);
      expect(falseResult.value).toBe(false);
    });

    it('should convert to array type', () => {
      const options: FieldMappingOptions = { type: 'array' };
      
      const stringResult = fieldMapper.mapField({ csv: 'a,b,c' }, 'csv', options);
      const jsonResult = fieldMapper.mapField({ json: '["x","y","z"]' }, 'json', options);
      
      expect(Array.isArray(stringResult.value)).toBe(true);
      expect(stringResult.value).toEqual(['a', 'b', 'c']);
      
      expect(Array.isArray(jsonResult.value)).toBe(true);
      expect(jsonResult.value).toEqual(['x', 'y', 'z']);
    });

    it('should convert to date type', () => {
      const options: FieldMappingOptions = { type: 'date' };
      
      const result = fieldMapper.mapField(testData, 'metadata.created', options);
      
      expect(result.value).toBeInstanceOf(Date);
    });

    it('should handle invalid type conversions gracefully', () => {
      const options: FieldMappingOptions = { type: 'number' };
      
      const result = fieldMapper.mapField({ text: 'not-a-number' }, 'text', options);
      
      expect(result.value).toBe('not-a-number'); // Should keep original value
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle circular references safely', () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;
      
      const result = fieldMapper.mapField(circularData, 'name');
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('test');
    });

    it('should handle invalid field paths', () => {
      const result = fieldMapper.mapField(testData, '');
      
      expect(result.success).toBe(true);
      expect(result.value).toBe(testData); // Returns root object for empty path
    });

    it('should handle array index out of bounds', () => {
      const result = fieldMapper.mapField(testData, 'tags[10]');
      
      expect(result.success).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should handle transformation errors', () => {
      const options: FieldMappingOptions = {
        transform: () => { throw new Error('Transform error'); }
      };
      
      const result = fieldMapper.mapField(testData, 'name', options);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Transform error');
    });

    it('should handle template compilation errors', () => {
      const options: FieldMappingOptions = {
        template: '{{unclosed'
      };
      
      const result = fieldMapper.mapField(testData, 'name', options);
      
      expect(result.success).toBe(true); // Template errors are handled gracefully
    });
  });

  describe('Cache Management', () => {
    it('should cache templates for performance', () => {
      const options: FieldMappingOptions = {
        template: '{{name}} - {{category}}'
      };
      
      // Use same template multiple times
      fieldMapper.mapField(testData, 'name', options);
      fieldMapper.mapField(testData, 'name', options);
      fieldMapper.mapField(testData, 'name', options);
      
      const stats = fieldMapper.getCacheStats();
      expect(stats.templateCacheSize).toBe(1);
    });

    it('should clear caches', () => {
      const options: FieldMappingOptions = {
        template: '{{name}}'
      };
      
      fieldMapper.mapField(testData, 'name', options);
      expect(fieldMapper.getCacheStats().templateCacheSize).toBe(1);
      
      fieldMapper.clearCache();
      expect(fieldMapper.getCacheStats().templateCacheSize).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    it('should create field mapping options', () => {
      const mapping = createFieldMapping({
        defaultValue: 'test',
        required: true
      });
      
      expect(mapping.defaultValue).toBe('test');
      expect(mapping.required).toBe(true);
    });

    it('should create template mapping', () => {
      const mapping = createTemplateMapping('{{name}} - {{id}}', {
        required: true
      });
      
      expect(mapping.template).toBe('{{name}} - {{id}}');
      expect(mapping.required).toBe(true);
    });

    it('should create transform mapping', () => {
      const transform = (value: unknown) => `PREFIX_${value}`;
      const mapping = createTransformMapping(transform, {
        defaultValue: 'default'
      });
      
      expect(mapping.transform).toBe(transform);
      expect(mapping.defaultValue).toBe('default');
    });
  });
});