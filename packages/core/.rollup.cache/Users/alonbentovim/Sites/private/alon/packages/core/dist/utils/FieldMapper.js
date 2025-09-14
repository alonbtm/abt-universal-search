/**
 * Field Mapper - Advanced field mapping utilities for response transformation
 * @description Provides configurable field mapping with dot notation, templates, and custom transformations
 */
/**
 * Advanced field mapper with multiple mapping strategies
 */
export class AdvancedFieldMapper {
    constructor() {
        this.templateCache = new Map();
        this.transformCache = new Map();
    }
    /**
     * Map a single field from source object
     */
    mapField(source, fieldPath, options = {}, context) {
        const result = {
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
                }
                else if (options.required) {
                    result.error = `Required field '${fieldPath}' not found`;
                    return result;
                }
            }
            // Apply template transformation
            if (options.template && value != null) {
                const templateContext = {
                    item: source,
                    field: fieldPath,
                    index: context?.index || 0,
                    context: context?.additionalContext || {}
                };
                value = this.applyTemplate(options.template, templateContext, value);
            }
            // Apply custom transformation
            if (options.transform && value != null) {
                const transformContext = {
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
        }
        catch (error) {
            result.error = error instanceof Error ? error.message : String(error);
        }
        return result;
    }
    /**
     * Map multiple fields from source object
     */
    mapFields(source, mappings, context) {
        const results = {};
        for (const [targetField, mapping] of Object.entries(mappings)) {
            if (typeof mapping === 'string') {
                // Simple field path mapping
                results[targetField] = this.mapField(source, mapping, {}, context);
            }
            else {
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
    createStandardResult(source, mappings, context) {
        const mappingErrors = [];
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
        let valueResult;
        if (mappings.value) {
            const valueMapping = typeof mappings.value === 'string' ? {} : mappings.value;
            const valuePath = typeof mappings.value === 'string' ? mappings.value : 'value';
            valueResult = this.mapField(source, valuePath, valueMapping, context);
        }
        // Map metadata fields
        const metadata = {};
        if (mappings.metadata) {
            for (const [metaKey, metaMapping] of Object.entries(mappings.metadata)) {
                const metaOptions = typeof metaMapping === 'string' ? {} : metaMapping;
                const metaPath = typeof metaMapping === 'string' ? metaMapping : metaKey;
                const metaResult = this.mapField(source, metaPath, metaOptions, context);
                if (metaResult.success && metaResult.value != null) {
                    metadata[metaKey] = metaResult.value;
                }
                else if (metaOptions.required) {
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
    getNestedValue(obj, path) {
        if (!obj || typeof obj !== 'object') {
            return null;
        }
        // Handle array notation like items[0].name
        const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
        const pathParts = normalizedPath.split('.').filter(part => part.length > 0);
        let current = obj;
        for (const part of pathParts) {
            if (current == null) {
                return null;
            }
            // Handle array access
            if (/^\d+$/.test(part)) {
                const index = parseInt(part, 10);
                if (Array.isArray(current) && index >= 0 && index < current.length) {
                    current = current[index];
                }
                else {
                    return null;
                }
            }
            else {
                // Handle object property access
                if (typeof current === 'object' && part in current) {
                    current = current[part];
                }
                else {
                    return null;
                }
            }
        }
        return current;
    }
    /**
     * Apply template transformation with variable substitution
     */
    applyTemplate(template, context, currentValue) {
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
    compileTemplate(template) {
        return (context) => {
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
    convertType(value, targetType) {
        if (value == null) {
            return value;
        }
        try {
            switch (targetType) {
                case 'string':
                    return String(value);
                case 'number':
                    if (typeof value === 'number')
                        return value;
                    if (typeof value === 'string') {
                        const parsed = Number(value);
                        return isNaN(parsed) ? value : parsed;
                    }
                    return value;
                case 'boolean':
                    if (typeof value === 'boolean')
                        return value;
                    if (typeof value === 'string') {
                        const lower = value.toLowerCase();
                        if (lower === 'true' || lower === '1' || lower === 'yes')
                            return true;
                        if (lower === 'false' || lower === '0' || lower === 'no')
                            return false;
                    }
                    return Boolean(value);
                case 'date':
                    if (value instanceof Date)
                        return value;
                    const dateValue = new Date(String(value));
                    return isNaN(dateValue.getTime()) ? value : dateValue;
                case 'array':
                    if (Array.isArray(value))
                        return value;
                    if (typeof value === 'string') {
                        try {
                            const parsed = JSON.parse(value);
                            return Array.isArray(parsed) ? parsed : [value];
                        }
                        catch {
                            return value.split(',').map(s => s.trim());
                        }
                    }
                    return [value];
                case 'object':
                    if (typeof value === 'object')
                        return value;
                    if (typeof value === 'string') {
                        try {
                            const parsed = JSON.parse(value);
                            return typeof parsed === 'object' ? parsed : value;
                        }
                        catch {
                            return value;
                        }
                    }
                    return value;
                default:
                    return value;
            }
        }
        catch {
            return value;
        }
    }
    /**
     * Clear internal caches
     */
    clearCache() {
        this.templateCache.clear();
        this.transformCache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            templateCacheSize: this.templateCache.size,
            transformCacheSize: this.transformCache.size
        };
    }
}
/**
 * Utility function to create field mapping options
 */
export function createFieldMapping(options = {}) {
    return {
        required: false,
        ...options
    };
}
/**
 * Utility function to create template-based mapping
 */
export function createTemplateMapping(template, options = {}) {
    return {
        template,
        required: false,
        ...options
    };
}
/**
 * Utility function to create transformation mapping
 */
export function createTransformMapping(transform, options = {}) {
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
//# sourceMappingURL=FieldMapper.js.map