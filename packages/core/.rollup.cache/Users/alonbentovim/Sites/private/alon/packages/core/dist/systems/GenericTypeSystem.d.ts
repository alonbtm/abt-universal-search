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
import { GenericSearchResult, GenericEventHandler, GenericDataTransformer, GenericValidator, GenericFilter } from '../types/index';
/**
 * Generic data structure interface for custom data handling
 * @template TData - Custom data type
 * @interface GenericDataStructure
 */
export interface GenericDataStructure<TData = any> {
    /** Unique identifier */
    id: string;
    /** Data payload */
    data: TData;
    /** Metadata information */
    metadata?: Record<string, any>;
    /** Creation timestamp */
    createdAt?: Date;
    /** Last update timestamp */
    updatedAt?: Date;
    /** Data version for conflict resolution */
    version?: string;
}
/**
 * Generic configuration interface for extensible settings
 * @template TOptions - Custom options type
 * @template TExtensions - Extension configuration type
 * @interface GenericConfiguration
 */
export interface GenericConfiguration<TOptions = any, TExtensions = any> {
    /** Base configuration options */
    options: TOptions;
    /** Extension configurations */
    extensions?: TExtensions;
    /** Schema validation rules */
    schema?: GenericSchemaValidation<TOptions>;
    /** Migration functions for version compatibility */
    migrations?: GenericMigrationMap<TOptions>;
}
/**
 * Generic schema validation interface
 * @template T - Type to validate
 * @interface GenericSchemaValidation
 */
export interface GenericSchemaValidation<T = any> {
    /** Required field definitions */
    required: Array<keyof T>;
    /** Optional field definitions */
    optional?: Array<keyof T>;
    /** Field type validators */
    validators: Partial<Record<keyof T, GenericValidator<any>>>;
    /** Custom validation rules */
    customRules?: Array<{
        name: string;
        rule: GenericValidator<T>;
        message: string;
    }>;
}
/**
 * Generic migration mapping for version compatibility
 * @template T - Configuration type
 * @interface GenericMigrationMap
 */
export interface GenericMigrationMap<T = any> {
    /** Migration functions by version */
    [version: string]: GenericDataTransformer<Partial<T>, T>;
}
/**
 * Generic result formatting interface for flexible display
 * @template TSource - Source data type
 * @template TFormatted - Formatted result type
 * @interface GenericResultFormatter
 */
export interface GenericResultFormatter<TSource = any, TFormatted = any> {
    /** Formatter function */
    format: GenericDataTransformer<TSource, TFormatted>;
    /** Format type identifier */
    type: string;
    /** Formatter metadata */
    metadata?: {
        description: string;
        version: string;
        author?: string;
    };
}
/**
 * Generic event system interface for type-safe event handling
 * @template TEvents - Event type mapping
 * @interface GenericEventSystem
 */
export interface GenericEventSystem<TEvents extends Record<string, any> = any> {
    /** Event listeners by event type */
    listeners: {
        [K in keyof TEvents]: Array<GenericEventHandler<TEvents[K]>>;
    };
    /** Event emission method */
    emit<K extends keyof TEvents>(event: K, data: TEvents[K]): Promise<void>;
    /** Event listener registration */
    on<K extends keyof TEvents>(event: K, handler: GenericEventHandler<TEvents[K]>): void;
    /** Event listener removal */
    off<K extends keyof TEvents>(event: K, handler: GenericEventHandler<TEvents[K]>): void;
}
/**
 * Generic plugin interface for extensible functionality
 * @template TContext - Plugin context type
 * @template TConfig - Plugin configuration type
 * @interface GenericPlugin
 */
export interface GenericPlugin<TContext = any, TConfig = any> {
    /** Plugin unique identifier */
    id: string;
    /** Plugin name */
    name: string;
    /** Plugin version */
    version: string;
    /** Plugin configuration */
    config?: TConfig;
    /** Plugin initialization */
    init(context: TContext): Promise<void> | void;
    /** Plugin cleanup */
    destroy?(): Promise<void> | void;
    /** Plugin activation check */
    isActive(): boolean;
}
/**
 * Generic state management interface for component state
 * @template TState - State type
 * @template TActions - Action type mapping
 * @interface GenericStateManager
 */
export interface GenericStateManager<TState = any, TActions extends Record<string, any> = any> {
    /** Current state */
    state: TState;
    /** State update method */
    setState(updates: Partial<TState>): void;
    /** Action dispatcher */
    dispatch<K extends keyof TActions>(action: K, payload: TActions[K]): void;
    /** State subscription */
    subscribe(listener: (state: TState) => void): () => void;
    /** State validation */
    validate?(state: TState): boolean;
}
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
export declare class GenericTypeSystem {
    private transformers;
    private validators;
    private formatters;
    private configurations;
    /**
     * Create a generic data transformer
     * @template TSource - Source data type
     * @template TTarget - Target data type
     * @param transform - Transformation function
     * @param id - Optional transformer identifier
     * @returns Data transformer function
     */
    createTransformer<TSource, TTarget>(transform: GenericDataTransformer<TSource, TTarget>, id?: string): GenericDataTransformer<TSource, TTarget>;
    /**
     * Create a generic validator
     * @template T - Type to validate
     * @param validator - Validation function
     * @param id - Optional validator identifier
     * @returns Type guard function
     */
    createValidator<T>(validator: GenericValidator<T>, id?: string): GenericValidator<T>;
    /**
     * Create a generic result formatter
     * @template TSource - Source data type
     * @template TFormatted - Formatted result type
     * @param formatter - Result formatter configuration
     * @returns Result formatter
     */
    createFormatter<TSource, TFormatted>(formatter: GenericResultFormatter<TSource, TFormatted>): GenericResultFormatter<TSource, TFormatted>;
    /**
     * Create generic configuration
     * @template TOptions - Options type
     * @template TExtensions - Extensions type
     * @param config - Configuration object
     * @param id - Configuration identifier
     * @returns Configuration object
     */
    createConfiguration<TOptions, TExtensions>(config: GenericConfiguration<TOptions, TExtensions>, id: string): GenericConfiguration<TOptions, TExtensions>;
    /**
     * Create generic search result with custom data
     * @template TData - Custom data type
     * @param base - Base result properties
     * @param data - Custom data payload
     * @returns Generic search result
     */
    createSearchResult<TData>(base: Omit<GenericSearchResult<TData>, 'data'>, data: TData): GenericSearchResult<TData>;
    /**
     * Create generic event handler with type safety
     * @template TEventData - Event data type
     * @param handler - Event handler function
     * @returns Type-safe event handler
     */
    createEventHandler<TEventData>(handler: GenericEventHandler<TEventData>): GenericEventHandler<TEventData>;
    /**
     * Create generic filter function
     * @template T - Type to filter
     * @param filterFn - Filter function
     * @returns Type-safe filter function
     */
    createFilter<T>(filterFn: GenericFilter<T>): GenericFilter<T>;
    /**
     * Create chained data transformer
     * @template T1 - First transformation input
     * @template T2 - First transformation output / Second input
     * @template T3 - Final output type
     * @param first - First transformation function
     * @param second - Second transformation function
     * @returns Chained transformer
     */
    chainTransformers<T1, T2, T3>(first: GenericDataTransformer<T1, T2>, second: GenericDataTransformer<T2, T3>): GenericDataTransformer<T1, T3>;
    /**
     * Create composed validator
     * @template T - Type to validate
     * @param validators - Array of validators to compose
     * @returns Combined validator
     */
    composeValidators<T>(validators: GenericValidator<T>[]): GenericValidator<T>;
    /**
     * Get stored transformer by ID
     * @param id - Transformer identifier
     * @returns Data transformer or undefined
     */
    getTransformer(id: string): GenericDataTransformer | undefined;
    /**
     * Get stored validator by ID
     * @param id - Validator identifier
     * @returns Validator function or undefined
     */
    getValidator(id: string): GenericValidator<any> | undefined;
    /**
     * Get stored formatter by type
     * @param type - Formatter type
     * @returns Result formatter or undefined
     */
    getFormatter(type: string): GenericResultFormatter | undefined;
    /**
     * Get stored configuration by ID
     * @param id - Configuration identifier
     * @returns Configuration object or undefined
     */
    getConfiguration(id: string): GenericConfiguration | undefined;
    /**
     * Create generic data structure
     * @template TData - Data payload type
     * @param id - Unique identifier
     * @param data - Data payload
     * @param options - Optional additional properties
     * @returns Generic data structure
     */
    createDataStructure<TData>(id: string, data: TData, options?: {
        metadata?: Record<string, any>;
        version?: string;
    }): GenericDataStructure<TData>;
    /**
     * Validate generic configuration
     * @template TOptions - Options type
     * @param config - Configuration to validate
     * @param schema - Validation schema
     * @returns Validation result
     */
    validateConfiguration<TOptions>(config: GenericConfiguration<TOptions>, schema: GenericSchemaValidation<TOptions>): {
        isValid: boolean;
        errors: Array<{
            field: string;
            message: string;
        }>;
    };
    /**
     * Get system statistics
     * @returns Type system statistics
     */
    getStatistics(): {
        transformers: number;
        validators: number;
        formatters: number;
        configurations: number;
    };
    /**
     * Clear all stored components
     */
    clear(): void;
}
//# sourceMappingURL=GenericTypeSystem.d.ts.map