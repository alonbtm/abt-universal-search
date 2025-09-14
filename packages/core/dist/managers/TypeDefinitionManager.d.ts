/**
 * @fileoverview TypeDefinitionManager - Comprehensive interface definitions and JSDoc management
 * @version 1.0.0
 * @author Alon Search Team
 * @description Manages comprehensive TypeScript definitions with detailed JSDoc documentation,
 * interface organization, and type export management for optimal IDE integration.
 *
 * @example Basic Usage
 * ```typescript
 * const typeManager = new TypeDefinitionManager();
 * const definitions = typeManager.getAllDefinitions();
 * const interfaces = typeManager.getInterfaceDefinitions();
 * ```
 *
 * @since 1.0.0
 */
/**
 * Interface for type definition metadata
 * @interface TypeDefinitionMetadata
 */
export interface TypeDefinitionMetadata {
    /** Definition name */
    name: string;
    /** Type category */
    category: 'interface' | 'type' | 'enum' | 'class';
    /** Module source file */
    module: string;
    /** JSDoc description */
    description: string;
    /** Usage examples */
    examples: string[];
    /** Related definitions */
    related: string[];
    /** Version introduced */
    since: string;
    /** Deprecation information */
    deprecated?: {
        since: string;
        replacement?: string;
        reason: string;
    };
}
/**
 * Interface for exported type information
 * @interface ExportedType
 */
export interface ExportedType {
    /** Export name */
    name: string;
    /** Export type */
    type: 'interface' | 'type' | 'enum' | 'class' | 'function';
    /** Source module */
    module: string;
    /** Whether it's a default export */
    isDefault: boolean;
    /** Generic type parameters */
    generics?: string[];
    /** JSDoc summary */
    summary: string;
}
/**
 * Interface for JSDoc documentation structure
 * @interface JSDocStructure
 */
export interface JSDocStructure {
    /** Brief description */
    description: string;
    /** Detailed summary */
    summary?: string;
    /** Usage examples */
    examples: Array<{
        title: string;
        code: string;
        description?: string;
    }>;
    /** Parameter documentation */
    params?: Array<{
        name: string;
        type: string;
        description: string;
        optional: boolean;
    }>;
    /** Return type documentation */
    returns?: {
        type: string;
        description: string;
    };
    /** See also references */
    seeAlso: string[];
    /** Version information */
    since: string;
    /** Author information */
    author?: string;
}
/**
 * TypeDefinitionManager - Manages comprehensive type definitions and documentation
 *
 * Provides centralized management of TypeScript definitions, JSDoc documentation,
 * interface organization, and type export coordination for optimal development experience.
 *
 * @class TypeDefinitionManager
 * @example
 * ```typescript
 * const manager = new TypeDefinitionManager();
 *
 * // Get all available type definitions
 * const allDefs = manager.getAllDefinitions();
 *
 * // Get specific interface documentation
 * const searchConfigDocs = manager.getInterfaceDocumentation('SearchConfiguration');
 *
 * // Validate type definition completeness
 * const validation = manager.validateDefinitions();
 * ```
 */
export declare class TypeDefinitionManager {
    private definitions;
    private exports;
    private documentation;
    constructor();
    /**
     * Initialize all type definitions with metadata
     * @private
     */
    private initializeDefinitions;
    /**
     * Add extended type definitions for comprehensive coverage
     * @private
     */
    private addExtendedDefinitions;
    /**
     * Initialize type exports mapping
     * @private
     */
    private initializeExports;
    /**
     * Add extended type exports
     * @private
     */
    private addExtendedExports;
    /**
     * Initialize JSDoc documentation structures
     * @private
     */
    private initializeDocumentation;
    /**
     * Add extended JSDoc documentation
     * @private
     */
    private addExtendedDocumentation;
    /**
     * Get all type definitions
     * @returns Map of all type definitions with metadata
     */
    getAllDefinitions(): Map<string, TypeDefinitionMetadata>;
    /**
     * Get interface definitions only
     * @returns Array of interface definitions
     */
    getInterfaceDefinitions(): TypeDefinitionMetadata[];
    /**
     * Get enum definitions only
     * @returns Array of enum definitions
     */
    getEnumDefinitions(): TypeDefinitionMetadata[];
    /**
     * Get type definitions only
     * @returns Array of type definitions
     */
    getTypeDefinitions(): TypeDefinitionMetadata[];
    /**
     * Get definition by name
     * @param name - Definition name
     * @returns Type definition metadata or undefined
     */
    getDefinition(name: string): TypeDefinitionMetadata | undefined;
    /**
     * Get all exported types
     * @returns Map of all exported types
     */
    getAllExports(): Map<string, ExportedType>;
    /**
     * Get interface documentation
     * @param name - Interface name
     * @returns JSDoc structure or undefined
     */
    getInterfaceDocumentation(name: string): JSDocStructure | undefined;
    /**
     * Get all documentation structures
     * @returns Map of all JSDoc structures
     */
    getAllDocumentation(): Map<string, JSDocStructure>;
    /**
     * Validate type definition completeness
     * @returns Validation results
     */
    validateDefinitions(): {
        isValid: boolean;
        missingDocumentation: string[];
        missingExports: string[];
        suggestions: string[];
    };
    /**
     * Generate type definition summary report
     * @returns Comprehensive summary of all type definitions
     */
    generateSummaryReport(): {
        totalDefinitions: number;
        interfaces: number;
        types: number;
        enums: number;
        classes: number;
        documented: number;
        exported: number;
        coverage: {
            documentation: number;
            exports: number;
        };
    };
}
//# sourceMappingURL=TypeDefinitionManager.d.ts.map