/**
 * @fileoverview GenericTypeSystem - Generic interfaces for extensible component architecture
 * @version 1.0.0
 * @author Alon Search Team
 * @description Provides generic type interfaces, transformation utilities, and extensible
 * configuration types for custom data structures and component customization.
 *
 * @example Basic Usage
 * ```typescript
 * const typeSystem = new GenericTypeSystem();
 * const transformer = typeSystem.createTransformer<APIData, SearchResult>();
 * const validator = typeSystem.createValidator<CustomConfig>();
 * ```
 *
 * @since 1.0.0
 */
/**
 * GenericTypeSystem - Comprehensive generic type management and utilities
 *
 * Provides centralized management of generic types, transformations, validations,
 * and extensible configurations for flexible component architecture.
 *
 * @class GenericTypeSystem
 * @example
 * ```typescript
 * // Create type system for product data
 * interface ProductData {
 *   name: string;
 *   price: number;
 *   category: string;
 * }
 *
 * const typeSystem = new GenericTypeSystem();
 *
 * // Create data transformer
 * const productTransformer = typeSystem.createTransformer<APIProduct, ProductData>(
 *   (apiProduct) => ({
 *     name: apiProduct.title,
 *     price: apiProduct.cost,
 *     category: apiProduct.cat
 *   })
 * );
 *
 * // Create validator
 * const productValidator = typeSystem.createValidator<ProductData>(
 *   (data): data is ProductData => {
 *     return typeof data.name === 'string' &&
 *            typeof data.price === 'number' &&
 *            typeof data.category === 'string';
 *   }
 * );
 * ```
 */
export class GenericTypeSystem {
    constructor() {
        this.transformers = new Map();
        this.validators = new Map();
        this.formatters = new Map();
        this.configurations = new Map();
    }
    /**
     * Create a generic data transformer
     * @template TSource - Source data type
     * @template TTarget - Target data type
     * @param transform - Transformation function
     * @param id - Optional transformer identifier
     * @returns Data transformer function
     */
    createTransformer(transform, id) {
        if (id) {
            this.transformers.set(id, transform);
        }
        return transform;
    }
    /**
     * Create a generic validator
     * @template T - Type to validate
     * @param validator - Validation function
     * @param id - Optional validator identifier
     * @returns Type guard function
     */
    createValidator(validator, id) {
        if (id) {
            this.validators.set(id, validator);
        }
        return validator;
    }
    /**
     * Create a generic result formatter
     * @template TSource - Source data type
     * @template TFormatted - Formatted result type
     * @param formatter - Result formatter configuration
     * @returns Result formatter
     */
    createFormatter(formatter) {
        this.formatters.set(formatter.type, formatter);
        return formatter;
    }
    /**
     * Create generic configuration
     * @template TOptions - Options type
     * @template TExtensions - Extensions type
     * @param config - Configuration object
     * @param id - Configuration identifier
     * @returns Configuration object
     */
    createConfiguration(config, id) {
        this.configurations.set(id, config);
        return config;
    }
    /**
     * Create generic search result with custom data
     * @template TData - Custom data type
     * @param base - Base result properties
     * @param data - Custom data payload
     * @returns Generic search result
     */
    createSearchResult(base, data) {
        return {
            ...base,
            data
        };
    }
    /**
     * Create generic event handler with type safety
     * @template TEventData - Event data type
     * @param handler - Event handler function
     * @returns Type-safe event handler
     */
    createEventHandler(handler) {
        return handler;
    }
    /**
     * Create generic filter function
     * @template T - Type to filter
     * @param filterFn - Filter function
     * @returns Type-safe filter function
     */
    createFilter(filterFn) {
        return filterFn;
    }
    /**
     * Create chained data transformer
     * @template T1 - First transformation input
     * @template T2 - First transformation output / Second input
     * @template T3 - Final output type
     * @param first - First transformation function
     * @param second - Second transformation function
     * @returns Chained transformer
     */
    chainTransformers(first, second) {
        return (input) => {
            const intermediate = first(input);
            return second(intermediate);
        };
    }
    /**
     * Create composed validator
     * @template T - Type to validate
     * @param validators - Array of validators to compose
     * @returns Combined validator
     */
    composeValidators(validators) {
        return (data) => {
            return validators.every(validator => validator(data));
        };
    }
    /**
     * Get stored transformer by ID
     * @param id - Transformer identifier
     * @returns Data transformer or undefined
     */
    getTransformer(id) {
        return this.transformers.get(id);
    }
    /**
     * Get stored validator by ID
     * @param id - Validator identifier
     * @returns Validator function or undefined
     */
    getValidator(id) {
        return this.validators.get(id);
    }
    /**
     * Get stored formatter by type
     * @param type - Formatter type
     * @returns Result formatter or undefined
     */
    getFormatter(type) {
        return this.formatters.get(type);
    }
    /**
     * Get stored configuration by ID
     * @param id - Configuration identifier
     * @returns Configuration object or undefined
     */
    getConfiguration(id) {
        return this.configurations.get(id);
    }
    /**
     * Create generic data structure
     * @template TData - Data payload type
     * @param id - Unique identifier
     * @param data - Data payload
     * @param options - Optional additional properties
     * @returns Generic data structure
     */
    createDataStructure(id, data, options) {
        const now = new Date();
        return {
            id,
            data,
            createdAt: now,
            updatedAt: now,
            metadata: options?.metadata,
            version: options?.version || '1.0.0'
        };
    }
    /**
     * Validate generic configuration
     * @template TOptions - Options type
     * @param config - Configuration to validate
     * @param schema - Validation schema
     * @returns Validation result
     */
    validateConfiguration(config, schema) {
        const errors = [];
        // Check required fields
        for (const field of schema.required) {
            if (!(field in config.options)) {
                errors.push({
                    field: String(field),
                    message: `Required field '${String(field)}' is missing`
                });
            }
        }
        // Run field validators
        for (const [field, validator] of Object.entries(schema.validators)) {
            const value = config.options[field];
            if (value !== undefined && !validator(value)) {
                errors.push({
                    field,
                    message: `Field '${field}' failed validation`
                });
            }
        }
        // Run custom rules
        if (schema.customRules) {
            for (const rule of schema.customRules) {
                if (!rule.rule(config.options)) {
                    errors.push({
                        field: 'configuration',
                        message: rule.message
                    });
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Get system statistics
     * @returns Type system statistics
     */
    getStatistics() {
        return {
            transformers: this.transformers.size,
            validators: this.validators.size,
            formatters: this.formatters.size,
            configurations: this.configurations.size
        };
    }
    /**
     * Clear all stored components
     */
    clear() {
        this.transformers.clear();
        this.validators.clear();
        this.formatters.clear();
        this.configurations.clear();
    }
}
//# sourceMappingURL=GenericTypeSystem.js.map