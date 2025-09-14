/**
 * Field Mapper - Advanced field mapping utilities for response transformation
 * @description Provides configurable field mapping with dot notation, templates, and custom transformations
 */

import type { TransformFunction, TransformContext } from '../types/Results';

// Re-export for test files
export type { TransformContext };

/**
 * Field mapping configuration options
 */
export interface FieldMappingOptions {
  /** Default value if field is not found */
  defaultValue?: unknown;
  /** Whether to throw error on missing field */
  required?: boolean;
  /** Custom transformation function */
  transform?: TransformFunction;
  /** Template string with variable substitution */
  template?: string;
  /** Data type conversion */
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  /** Array of fallback field paths to try */
  fallbacks?: string[];
}

/**
 * Field mapping result with metadata
 */
export interface FieldMappingResult {
  /** Mapped value */
  value: unknown;
  /** Whether mapping was successful */
  success: boolean;
  /** Source field that provided the value */
  sourceField?: string;
  /** Error message if mapping failed */
  error?: string;
  /** Whether a fallback field was used */
  usedFallback?: boolean;
  /** Type conversion applied */
  typeConverted?: boolean;
}

/**
 * Template variable context
 */
export interface TemplateContext {
  /** Current item being processed */
  item: Record<string, unknown>;
  /** Current field mapping context */
  field: string;
  /** Index in results array */
  index: number;
  /** Additional context data */
  context: Record<string, unknown>;
}

/**
 * Advanced field mapper with multiple mapping strategies
 */
export class AdvancedFieldMapper {
  private templateCache = new Map<string, (ctx: TemplateContext) => string>();
  private transformCache = new Map<string, TransformFunction>();

  /**
   * Map a single field from source object
   */
  public mapField(
    source: Record<string, unknown>,
    fieldPath: string,
    options: FieldMappingOptions = {},
    context?: TransformContext
  ): FieldMappingResult {
    const result: FieldMappingResult = {
      value: undefined,
      success: false
    };

    try {
      // Try primary field path
      let value = this.getNestedValue(source, fieldPath);
      let sourceField = fieldPath;
      let usedFallback = false;

      // Try fallback fields if primary failed
      if (value == null && options.fallbacks) {
        for (const fallbackPath of options.fallbacks) {
          value = this.getNestedValue(source, fallbackPath);
          if (value != null) {
            sourceField = fallbackPath;
            usedFallback = true;
            break;
          }
        }
      }

      // Apply default value if still null
      if (value == null) {
        if (options.defaultValue !== undefined) {
          value = options.defaultValue;
        } else if (options.required) {
          result.error = `Required field '${fieldPath}' not found`;
          return result;
        }
      }

      // Apply template transformation
      if (options.template && value != null) {
        const templateContext: TemplateContext = {
          item: source,
          field: fieldPath,
          index: context?.index || 0,
          context: context?.additionalContext || {}
        };
        value = this.applyTemplate(options.template, templateContext, value);
      }

      // Apply custom transformation
      if (options.transform && value != null) {
        const transformContext: TransformContext = {
          source,
          fieldPath,
          currentValue: value,
          index: context?.index || 0,
          additionalContext: context?.additionalContext || {}
        };
        value = options.transform(value, transformContext);
      }

      // Apply type conversion
      let typeConverted = false;
      if (options.type && value != null) {
        const convertedValue = this.convertType(value, options.type);
        if (convertedValue !== value) {
          typeConverted = true;
          value = convertedValue;
        }
      }

      result.value = value;
      result.success = true;
      result.sourceField = sourceField;
      result.usedFallback = usedFallback;
      result.typeConverted = typeConverted;

    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }

    return result;
  }

  /**
   * Map multiple fields from source object
   */
  public mapFields(
    source: Record<string, unknown>,
    mappings: Record<string, string | FieldMappingOptions>,
    context?: TransformContext
  ): Record<string, FieldMappingResult> {
    const results: Record<string, FieldMappingResult> = {};

    for (const [targetField, mapping] of Object.entries(mappings)) {
      if (typeof mapping === 'string') {
        // Simple field path mapping
        results[targetField] = this.mapField(source, mapping, {}, context);
      } else {
        // Complex mapping with options
        const fieldPath = mapping.template || targetField;
        results[targetField] = this.mapField(source, fieldPath, mapping, context);
      }
    }

    return results;
  }

  /**
   * Create standardized result object with mapped fields
   */
  public createStandardResult(
    source: Record<string, unknown>,
    mappings: {
      label: string | FieldMappingOptions;
      value?: string | FieldMappingOptions;
      metadata?: Record<string, string | FieldMappingOptions>;
    },
    context?: TransformContext
  ): { label: unknown; value?: unknown; metadata: Record<string, unknown>; mappingErrors: string[] } {
    const mappingErrors: string[] = [];

    // Map label field
    const labelMapping = typeof mappings.label === 'string' 
      ? { required: true } 
      : { ...mappings.label, required: true };
    const labelPath = typeof mappings.label === 'string' ? mappings.label : 'label';
    const labelResult = this.mapField(source, labelPath, labelMapping, context);
    
    if (!labelResult.success) {
      mappingErrors.push(labelResult.error || 'Failed to map label field');
    }

    // Map value field (optional)
    let valueResult: FieldMappingResult | undefined;
    if (mappings.value) {
      const valueMapping = typeof mappings.value === 'string' ? {} : mappings.value;
      const valuePath = typeof mappings.value === 'string' ? mappings.value : 'value';
      valueResult = this.mapField(source, valuePath, valueMapping, context);
    }

    // Map metadata fields
    const metadata: Record<string, unknown> = {};
    if (mappings.metadata) {
      for (const [metaKey, metaMapping] of Object.entries(mappings.metadata)) {
        const metaOptions = typeof metaMapping === 'string' ? {} : metaMapping;
        const metaPath = typeof metaMapping === 'string' ? metaMapping : metaKey;
        const metaResult = this.mapField(source, metaPath, metaOptions, context);
        
        if (metaResult.success && metaResult.value != null) {
          metadata[metaKey] = metaResult.value;
        } else if (metaOptions.required) {
          mappingErrors.push(`Required metadata field '${metaKey}' could not be mapped`);
        }
      }
    }

    return {
      label: labelResult.value,
      value: valueResult?.value,
      metadata,
      mappingErrors
    };
  }

  /**
   * Extract nested value using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    // Handle array notation like items[0].name
    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
    const pathParts = normalizedPath.split('.').filter(part => part.length > 0);

    let current: any = obj;
    for (const part of pathParts) {
      if (current == null) {
        return null;
      }

      // Handle array access
      if (/^\d+$/.test(part)) {
        const index = parseInt(part, 10);
        if (Array.isArray(current) && index >= 0 && index < current.length) {
          current = current[index];
        } else {
          return null;
        }
      } else {
        // Handle object property access
        if (typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          return null;
        }
      }
    }

    return current;
  }

  /**
   * Apply template transformation with variable substitution
   */
  private applyTemplate(template: string, context: TemplateContext, currentValue: unknown): string {
    let compiledTemplate = this.templateCache.get(template);
    
    if (!compiledTemplate) {
      compiledTemplate = this.compileTemplate(template);
      this.templateCache.set(template, compiledTemplate);
    }

    return compiledTemplate(context);
  }

  /**
   * Compile template string into function
   */
  private compileTemplate(template: string): (ctx: TemplateContext) => string {
    return (context: TemplateContext) => {
      return template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
        const trimmedVar = variable.trim();
        
        // Handle special variables
        if (trimmedVar === 'index') {
          return String(context.index);
        }
        if (trimmedVar === 'field') {
          return context.field;
        }
        
        // Handle context variables
        if (trimmedVar.startsWith('context.')) {
          const contextKey = trimmedVar.substring(8);
          const contextValue = context.context[contextKey];
          return contextValue != null ? String(contextValue) : '';
        }
        
        // Handle item variables (dot notation)
        const value = this.getNestedValue(context.item, trimmedVar);
        return value != null ? String(value) : '';
      });
    };
  }

  /**
   * Convert value to specified type
   */
  private convertType(value: unknown, targetType: string): unknown {
    if (value == null) {
      return value;
    }

    try {
      switch (targetType) {
        case 'string':
          return String(value);
        
        case 'number':
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            const parsed = Number(value);
            return isNaN(parsed) ? value : parsed;
          }
          return value;
        
        case 'boolean':
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            const lower = value.toLowerCase();
            if (lower === 'true' || lower === '1' || lower === 'yes') return true;
            if (lower === 'false' || lower === '0' || lower === 'no') return false;
          }
          return Boolean(value);
        
        case 'date':
          if (value instanceof Date) return value;
          const dateValue = new Date(String(value));
          return isNaN(dateValue.getTime()) ? value : dateValue;
        
        case 'array':
          if (Array.isArray(value)) return value;
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              return Array.isArray(parsed) ? parsed : [value];
            } catch {
              return value.split(',').map(s => s.trim());
            }
          }
          return [value];
        
        case 'object':
          if (typeof value === 'object') return value;
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              return typeof parsed === 'object' ? parsed : value;
            } catch {
              return value;
            }
          }
          return value;
        
        default:
          return value;
      }
    } catch {
      return value;
    }
  }

  /**
   * Clear internal caches
   */
  public clearCache(): void {
    this.templateCache.clear();
    this.transformCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    templateCacheSize: number;
    transformCacheSize: number;
  } {
    return {
      templateCacheSize: this.templateCache.size,
      transformCacheSize: this.transformCache.size
    };
  }
}

/**
 * Utility function to create field mapping options
 */
export function createFieldMapping(
  options: Partial<FieldMappingOptions> = {}
): FieldMappingOptions {
  return {
    required: false,
    ...options
  };
}

/**
 * Utility function to create template-based mapping
 */
export function createTemplateMapping(
  template: string,
  options: Partial<FieldMappingOptions> = {}
): FieldMappingOptions {
  return {
    template,
    required: false,
    ...options
  };
}

/**
 * Utility function to create transformation mapping
 */
export function createTransformMapping(
  transform: TransformFunction,
  options: Partial<FieldMappingOptions> = {}
): FieldMappingOptions {
  return {
    transform,
    required: false,
    ...options
  };
}

/**
 * Global field mapper instance
 */
export const fieldMapper = new AdvancedFieldMapper();