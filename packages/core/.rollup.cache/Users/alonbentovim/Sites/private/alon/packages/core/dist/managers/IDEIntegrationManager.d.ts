/**
 * @fileoverview IDEIntegrationManager - IDE integration and IntelliSense optimization
 * @version 1.0.0
 * @author Alon Search Team
 * @description Provides comprehensive IDE integration, IntelliSense optimization,
 * parameter hints generation, and TypeScript Language Service integration for
 * excellent developer experience.
 *
 * @example Basic Usage
 * ```typescript
 * const ideManager = new IDEIntegrationManager();
 * const hints = ideManager.generateParameterHints('SearchConfiguration');
 * const suggestions = ideManager.getAutocompleteSuggestions('search');
 * ```
 *
 * @since 1.0.0
 */
/**
 * Interface for IDE integration configuration
 * @interface IDEIntegrationConfig
 */
export interface IDEIntegrationConfig {
    /** Target IDE (VS Code, WebStorm, etc.) */
    targetIDE: 'vscode' | 'webstorm' | 'sublime' | 'vim' | 'generic';
    /** Language service integration level */
    languageServiceLevel: 'basic' | 'full' | 'enhanced';
    /** Enable IntelliSense optimization */
    intelliSenseOptimization: boolean;
    /** Parameter hint generation */
    parameterHints: boolean;
    /** Auto-completion suggestions */
    autoCompletion: boolean;
    /** Error checking integration */
    errorChecking: boolean;
    /** Code navigation support */
    codeNavigation: boolean;
}
/**
 * Interface for parameter hint information
 * @interface ParameterHint
 */
export interface ParameterHint {
    /** Parameter name */
    name: string;
    /** Parameter type */
    type: string;
    /** Parameter description */
    description: string;
    /** Whether parameter is optional */
    optional: boolean;
    /** Default value if any */
    defaultValue?: any;
    /** Valid values or range */
    validValues?: any[];
    /** Usage examples */
    examples: string[];
}
/**
 * Interface for autocomplete suggestion
 * @interface AutocompleteSuggestion
 */
export interface AutocompleteSuggestion {
    /** Suggestion text */
    text: string;
    /** Suggestion type */
    type: 'property' | 'method' | 'enum' | 'interface' | 'type' | 'value';
    /** Display label */
    label: string;
    /** Detailed description */
    description: string;
    /** Insert text (may differ from display text) */
    insertText: string;
    /** Documentation */
    documentation?: string;
    /** Completion priority */
    priority: number;
    /** Associated type information */
    typeInfo?: string;
}
/**
 * Interface for error checking result
 * @interface TypeCheckResult
 */
export interface TypeCheckResult {
    /** Whether type checking passed */
    isValid: boolean;
    /** List of errors found */
    errors: Array<{
        code: string;
        message: string;
        line?: number;
        column?: number;
        severity: 'error' | 'warning' | 'info';
        category: 'type' | 'syntax' | 'semantic';
    }>;
    /** Suggestions for fixes */
    suggestions: Array<{
        message: string;
        fix?: string;
    }>;
}
/**
 * Interface for namespace organization
 * @interface NamespaceInfo
 */
export interface NamespaceInfo {
    /** Namespace name */
    name: string;
    /** Namespace description */
    description: string;
    /** Exported types */
    exports: string[];
    /** Nested namespaces */
    children: NamespaceInfo[];
    /** Import path */
    importPath: string;
}
/**
 * Interface for code navigation support
 * @interface NavigationTarget
 */
export interface NavigationTarget {
    /** Target file path */
    filePath: string;
    /** Line number */
    line: number;
    /** Column number */
    column: number;
    /** Target type */
    type: 'definition' | 'implementation' | 'reference' | 'type-definition';
    /** Symbol name */
    symbol: string;
    /** Context information */
    context?: string;
}
/**
 * IDEIntegrationManager - Comprehensive IDE integration and developer tooling
 *
 * Provides advanced IDE integration features including IntelliSense optimization,
 * parameter hint generation, autocomplete suggestions, error checking, and
 * code navigation support for excellent TypeScript developer experience.
 *
 * @class IDEIntegrationManager
 * @example
 * ```typescript
 * // Initialize IDE integration
 * const ideManager = new IDEIntegrationManager({
 *   targetIDE: 'vscode',
 *   languageServiceLevel: 'enhanced',
 *   intelliSenseOptimization: true,
 *   parameterHints: true,
 *   autoCompletion: true,
 *   errorChecking: true,
 *   codeNavigation: true
 * });
 *
 * // Generate parameter hints for SearchConfiguration
 * const hints = ideManager.generateParameterHints('SearchConfiguration');
 *
 * // Get autocomplete suggestions
 * const suggestions = ideManager.getAutocompleteSuggestions('search', 'property');
 *
 * // Validate configuration
 * const validation = ideManager.validateConfiguration(config);
 * ```
 */
export declare class IDEIntegrationManager {
    private config;
    private typeDefinitions;
    private parameterHints;
    private autocompleteSuggestions;
    private namespaces;
    constructor(config: IDEIntegrationConfig);
    /**
     * Initialize type definitions for IDE integration
     * @private
     */
    private initializeTypeDefinitions;
    /**
     * Initialize parameter hints for functions and interfaces
     * @private
     */
    private initializeParameterHints;
    /**
     * Initialize autocomplete suggestions
     * @private
     */
    private initializeAutocompleteSuggestions;
    /**
     * Initialize namespace organization
     * @private
     */
    private initializeNamespaces;
    /**
     * Generate parameter hints for a given type
     * @param typeName - Name of the type
     * @returns Array of parameter hints
     */
    generateParameterHints(typeName: string): ParameterHint[];
    /**
     * Get autocomplete suggestions for a given context
     * @param context - Context for suggestions (type name, property path, etc.)
     * @param filterType - Optional filter by suggestion type
     * @returns Array of autocomplete suggestions
     */
    getAutocompleteSuggestions(context: string, filterType?: AutocompleteSuggestion['type']): AutocompleteSuggestion[];
    /**
     * Perform type checking on configuration object
     * @param config - Configuration to validate
     * @param typeName - Expected type name
     * @returns Type check results
     */
    validateConfiguration(config: any, typeName?: string): TypeCheckResult;
    /**
     * Generate default value for a given type
     * @param typeName - Type name
     * @returns Default value string
     * @private
     */
    private generateDefaultValue;
    /**
     * Get navigation targets for "Go to Definition"
     * @param symbol - Symbol name
     * @param position - Current position (optional)
     * @returns Array of navigation targets
     */
    getNavigationTargets(symbol: string, position?: {
        line: number;
        column: number;
    }): NavigationTarget[];
    /**
     * Get namespace information
     * @param namespaceName - Namespace name
     * @returns Namespace information
     */
    getNamespaceInfo(namespaceName: string): NamespaceInfo | undefined;
    /**
     * Get all available namespaces
     * @returns Array of namespace information
     */
    getAllNamespaces(): NamespaceInfo[];
    /**
     * Generate IDE configuration files
     * @param outputPath - Output directory path
     * @returns Generated file information
     */
    generateIDEConfiguration(outputPath: string): {
        files: Array<{
            path: string;
            content: string;
            description: string;
        }>;
    };
    /**
     * Get IDE integration statistics
     * @returns Integration statistics
     */
    getStatistics(): {
        typeDefinitions: number;
        parameterHints: number;
        autocompleteSuggestions: number;
        namespaces: number;
        targetIDE: string;
        features: string[];
    };
}
//# sourceMappingURL=IDEIntegrationManager.d.ts.map