/**
 * @fileoverview IDE Integration and IntelliSense Support
 * @description Advanced IDE integration utilities for optimal TypeScript development experience
 * with VS Code extensions, parameter hints, error checking, and debugging support.
 *
 * @example VS Code Integration
 * ```typescript
 * import { IDEIntegrationManager } from '@alon/core';
 *
 * const ideManager = new IDEIntegrationManager();
 * ideManager.enableEnhancedIntelliSense();
 * ideManager.registerCustomSnippets();
 * ```
 *
 * @example Error Reporting
 * ```typescript
 * import { reportTypeError, getIntelliSenseInfo } from '@alon/core';
 *
 * // Report type errors with detailed context
 * reportTypeError('config', 'Expected SearchConfiguration', userConfig);
 *
 * // Get IntelliSense information for IDE
 * const info = getIntelliSenseInfo('SearchResult');
 * ```
 */
/**
 * IntelliSense information for IDE integration
 */
export interface IntelliSenseInfo {
    /** Type name */
    typeName: string;
    /** Type description */
    description: string;
    /** JSDoc documentation */
    documentation: string;
    /** Available properties */
    properties: PropertyInfo[];
    /** Available methods */
    methods: MethodInfo[];
    /** Usage examples */
    examples: string[];
    /** Related types */
    relatedTypes: string[];
    /** Since version */
    since?: string;
    /** Deprecated information */
    deprecated?: DeprecationInfo;
}
/**
 * Property information for IntelliSense
 */
export interface PropertyInfo {
    /** Property name */
    name: string;
    /** Property type */
    type: string;
    /** Whether property is optional */
    optional: boolean;
    /** Property description */
    description: string;
    /** JSDoc documentation */
    documentation: string;
    /** Default value */
    defaultValue?: any;
    /** Valid values (for enums) */
    validValues?: string[];
    /** Examples */
    examples?: string[];
    /** Since version */
    since?: string;
    /** Deprecated information */
    deprecated?: DeprecationInfo;
}
/**
 * Method information for IntelliSense
 */
export interface MethodInfo {
    /** Method name */
    name: string;
    /** Method signature */
    signature: string;
    /** Return type */
    returnType: string;
    /** Parameters */
    parameters: ParameterInfo[];
    /** Method description */
    description: string;
    /** JSDoc documentation */
    documentation: string;
    /** Usage examples */
    examples: string[];
    /** Since version */
    since?: string;
    /** Deprecated information */
    deprecated?: DeprecationInfo;
}
/**
 * Parameter information for IntelliSense
 */
export interface ParameterInfo {
    /** Parameter name */
    name: string;
    /** Parameter type */
    type: string;
    /** Whether parameter is optional */
    optional: boolean;
    /** Parameter description */
    description: string;
    /** Default value */
    defaultValue?: any;
    /** Valid values */
    validValues?: string[];
}
/**
 * Deprecation information
 */
export interface DeprecationInfo {
    /** Version when deprecated */
    since: string;
    /** Removal version */
    removeIn?: string;
    /** Replacement */
    replacement?: string;
    /** Migration notes */
    notes?: string;
}
/**
 * Code snippet for IDE integration
 */
export interface CodeSnippet {
    /** Snippet name */
    name: string;
    /** Snippet prefix for trigger */
    prefix: string;
    /** Snippet body */
    body: string[];
    /** Snippet description */
    description: string;
    /** Applicable file types */
    scope: string[];
    /** Tab stops and placeholders */
    tabStops?: string[];
}
/**
 * Error diagnostic information for IDE
 */
export interface ErrorDiagnostic {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Severity level */
    severity: 'error' | 'warning' | 'info' | 'hint';
    /** Source location */
    location: {
        file: string;
        line: number;
        column: number;
        length?: number;
    };
    /** Related information */
    related?: Array<{
        message: string;
        location: ErrorDiagnostic['location'];
    }>;
    /** Quick fixes */
    fixes?: QuickFix[];
}
/**
 * Quick fix suggestion for IDE
 */
export interface QuickFix {
    /** Fix title */
    title: string;
    /** Fix description */
    description: string;
    /** Text edits to apply */
    edits: Array<{
        file: string;
        start: {
            line: number;
            column: number;
        };
        end: {
            line: number;
            column: number;
        };
        newText: string;
    }>;
    /** Whether fix is preferred */
    preferred?: boolean;
}
/**
 * IDE Integration Manager for enhanced development experience
 */
export declare class IDEIntegrationManager {
    private intelliSenseCache;
    private snippetRegistry;
    private diagnostics;
    private isVSCodeEnvironment;
    private enhancedMode;
    constructor();
    /**
     * Enables enhanced IntelliSense with advanced features
     */
    enableEnhancedIntelliSense(): void;
    /**
     * Registers custom code snippets for IDE
     * @param snippets - Array of code snippets to register
     */
    registerCustomSnippets(snippets: CodeSnippet[]): void;
    /**
     * Gets IntelliSense information for a type
     * @param typeName - Name of the type
     * @returns IntelliSense information or null if not found
     */
    getIntelliSenseInfo(typeName: string): IntelliSenseInfo | null;
    /**
     * Reports a type error with detailed context
     * @param identifier - Variable or property identifier
     * @param expectedType - Expected type description
     * @param actualValue - Actual value received
     * @param location - Source location information
     */
    reportTypeError(identifier: string, expectedType: string, actualValue: any, location?: {
        file: string;
        line: number;
        column: number;
    }): void;
    /**
     * Gets all diagnostics for a file
     * @param file - File path
     * @returns Array of diagnostics
     */
    getDiagnostics(file: string): ErrorDiagnostic[];
    /**
     * Clears diagnostics for a file
     * @param file - File path
     */
    clearDiagnostics(file: string): void;
    /**
     * Generates code completion suggestions
     * @param context - Current editing context
     * @param position - Cursor position
     * @returns Array of completion items
     */
    getCompletionItems(context: string, position: {
        line: number;
        column: number;
    }): CompletionItem[];
    /**
     * Gets parameter hints for function calls
     * @param functionName - Name of the function
     * @param parameterIndex - Current parameter index
     * @returns Parameter hint information
     */
    getParameterHints(functionName: string, parameterIndex: number): ParameterHint | null;
    /**
     * Gets hover information for symbols
     * @param symbol - Symbol name
     * @param context - Context information
     * @returns Hover information
     */
    getHoverInfo(symbol: string, context?: string): HoverInfo | null;
    /**
     * Validates TypeScript configuration
     * @param config - TypeScript configuration object
     * @returns Validation result with suggestions
     */
    validateTypeScriptConfig(config: any): ConfigValidationResult;
    /**
     * Generates VS Code settings for optimal development
     * @returns VS Code settings configuration
     */
    generateVSCodeSettings(): VSCodeSettings;
    /**
     * Detects the IDE environment
     */
    private detectIDEEnvironment;
    /**
     * Sets up advanced IDE features
     */
    private setupAdvancedFeatures;
    /**
     * Enables VS Code specific features
     */
    private enableVSCodeFeatures;
    /**
     * Sets up error reporting
     */
    private setupErrorReporting;
    /**
     * Sets up performance monitoring
     */
    private setupPerformanceMonitoring;
    /**
     * Initializes built-in code snippets
     */
    private initializeBuiltInSnippets;
    /**
     * Initializes type information for IntelliSense
     */
    private initializeTypeInformation;
    private analyzeTypeContext;
    private createPropertyCompletions;
    private createMethodCompletions;
    private getSnippetCompletions;
    private generateQuickFixes;
    private getSymbolRange;
}
export interface CompletionItem {
    label: string;
    kind: string;
    detail?: string;
    documentation?: string;
    insertText?: string;
    sortText?: string;
}
export interface ParameterHint {
    signature: string;
    parameters: ParameterInfo[];
    activeParameter: number;
    documentation: string;
}
export interface HoverInfo {
    contents: string[];
    range?: {
        start: {
            line: number;
            column: number;
        };
        end: {
            line: number;
            column: number;
        };
    };
}
export interface ConfigValidationResult {
    valid: boolean;
    issues: ConfigIssue[];
    suggestions: ConfigSuggestion[];
}
export interface ConfigIssue {
    severity: 'error' | 'warning' | 'info';
    message: string;
    property: string;
    recommendation?: string;
}
export interface ConfigSuggestion {
    property: string;
    value: any;
    reason: string;
}
export interface VSCodeSettings {
    [key: string]: any;
}
declare const globalIDEManager: IDEIntegrationManager;
/**
 * Gets IntelliSense information for a type (global function)
 * @param typeName - Type name to get information for
 * @returns IntelliSense information or null
 */
export declare function getIntelliSenseInfo(typeName: string): IntelliSenseInfo | null;
/**
 * Reports a type error with detailed context (global function)
 * @param identifier - Variable or property identifier
 * @param expectedType - Expected type description
 * @param actualValue - Actual value received
 * @param location - Source location information
 */
export declare function reportTypeError(identifier: string, expectedType: string, actualValue: any, location?: {
    file: string;
    line: number;
    column: number;
}): void;
/**
 * Enables enhanced IntelliSense features (global function)
 */
export declare function enableEnhancedIntelliSense(): void;
export { globalIDEManager as ideIntegrationManager };
//# sourceMappingURL=ideIntegration.d.ts.map