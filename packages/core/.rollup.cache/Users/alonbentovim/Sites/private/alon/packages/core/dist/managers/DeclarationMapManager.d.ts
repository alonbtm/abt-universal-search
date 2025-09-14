/**
 * @fileoverview DeclarationMapManager - Source mapping and "Go to Definition" support
 * @version 1.0.0
 * @author Alon Search Team
 * @description Manages source map generation for TypeScript definitions, IDE navigation
 * support, build process integration, and declaration file optimization for excellent
 * developer experience and debugging capabilities.
 *
 * @example Basic Usage
 * ```typescript
 * const mapManager = new DeclarationMapManager();
 * const sourceMaps = await mapManager.generateDeclarationMaps('./src', './dist');
 * const validated = mapManager.validateSourceMaps('./dist');
 * ```
 *
 * @since 1.0.0
 */
/**
 * Interface for source mapping configuration
 * @interface SourceMapConfig
 */
export interface SourceMapConfig {
    /** Source root directory */
    sourceRoot: string;
    /** Output directory for declarations */
    outputDir: string;
    /** Whether to inline sources in source map */
    inlineSources: boolean;
    /** Whether to inline source maps */
    inlineSourceMap: boolean;
    /** Source map URL generation */
    sourceMapURL: 'auto' | 'relative' | 'absolute';
    /** Include source content in map */
    includeSourceContent: boolean;
    /** Source map optimization level */
    optimization: 'none' | 'basic' | 'aggressive';
}
/**
 * Interface for declaration file mapping
 * @interface DeclarationMapping
 */
export interface DeclarationMapping {
    /** Source file path */
    sourcePath: string;
    /** Declaration file path */
    declarationPath: string;
    /** Source map file path */
    sourceMapPath: string;
    /** File modification timestamps */
    timestamps: {
        source: Date;
        declaration: Date;
        sourceMap: Date;
    };
    /** Mapping validity status */
    isValid: boolean;
    /** Associated TypeScript symbols */
    symbols: Array<{
        name: string;
        line: number;
        column: number;
        kind: 'interface' | 'type' | 'enum' | 'class' | 'function' | 'variable';
    }>;
}
/**
 * Interface for source map entry
 * @interface SourceMapEntry
 */
export interface SourceMapEntry {
    /** Generated line number (0-based) */
    generatedLine: number;
    /** Generated column number (0-based) */
    generatedColumn: number;
    /** Source file index */
    sourceIndex: number;
    /** Original line number (0-based) */
    originalLine: number;
    /** Original column number (0-based) */
    originalColumn: number;
    /** Symbol name (if applicable) */
    name?: string;
}
/**
 * Interface for navigation target
 * @interface NavigationTarget
 */
export interface NavigationTarget {
    /** Target file path */
    filePath: string;
    /** Line number (1-based) */
    line: number;
    /** Column number (1-based) */
    column: number;
    /** Symbol name */
    symbolName: string;
    /** Symbol kind */
    symbolKind: 'interface' | 'type' | 'enum' | 'class' | 'function' | 'variable' | 'property';
    /** Context around the symbol */
    context: {
        before: string;
        symbol: string;
        after: string;
    };
    /** Whether target is a definition or reference */
    isDefinition: boolean;
}
/**
 * Interface for build integration result
 * @interface BuildIntegrationResult
 */
export interface BuildIntegrationResult {
    /** Whether integration was successful */
    success: boolean;
    /** Generated declaration files */
    declarations: string[];
    /** Generated source map files */
    sourceMaps: string[];
    /** Build warnings */
    warnings: Array<{
        message: string;
        file: string;
        line?: number;
        column?: number;
    }>;
    /** Build errors */
    errors: Array<{
        message: string;
        file: string;
        line?: number;
        column?: number;
    }>;
    /** Performance metrics */
    metrics: {
        totalFiles: number;
        processingTimeMs: number;
        outputSizeBytes: number;
    };
}
/**
 * Interface for source map validation result
 * @interface ValidationResult
 */
export interface ValidationResult {
    /** Whether validation passed */
    isValid: boolean;
    /** Validation errors found */
    errors: Array<{
        type: 'missing-source' | 'invalid-mapping' | 'corrupted-map' | 'outdated-map';
        message: string;
        filePath: string;
        suggestion?: string;
    }>;
    /** Validation warnings */
    warnings: Array<{
        type: 'performance' | 'compatibility' | 'optimization';
        message: string;
        filePath: string;
        suggestion?: string;
    }>;
    /** Summary statistics */
    summary: {
        totalMappings: number;
        validMappings: number;
        invalidMappings: number;
        coverage: number;
    };
}
/**
 * DeclarationMapManager - Comprehensive source mapping and IDE navigation
 *
 * Provides advanced source map generation, declaration file management, IDE integration
 * for "Go to Definition" functionality, and build process optimization for superior
 * TypeScript development experience.
 *
 * @class DeclarationMapManager
 * @example
 * ```typescript
 * // Initialize declaration map manager
 * const mapManager = new DeclarationMapManager({
 *   sourceRoot: './src',
 *   outputDir: './dist',
 *   inlineSources: false,
 *   inlineSourceMap: false,
 *   sourceMapURL: 'relative',
 *   includeSourceContent: true,
 *   optimization: 'basic'
 * });
 *
 * // Generate declaration maps for the project
 * const result = await mapManager.generateDeclarationMaps();
 * console.log(`Generated ${result.declarations.length} declaration files`);
 *
 * // Validate existing source maps
 * const validation = await mapManager.validateSourceMaps();
 * if (!validation.isValid) {
 *   console.error('Source map validation failed:', validation.errors);
 * }
 *
 * // Find navigation target for symbol
 * const target = await mapManager.findDefinition('SearchConfiguration', './dist/types/Config.d.ts');
 * if (target) {
 *   console.log(`Definition found at ${target.filePath}:${target.line}:${target.column}`);
 * }
 * ```
 */
export declare class DeclarationMapManager {
    private config;
    private mappings;
    private symbolIndex;
    private buildCache;
    constructor(config: SourceMapConfig);
    /**
     * Generate declaration maps for all TypeScript files
     * @param sourceDir - Optional override for source directory
     * @param outputDir - Optional override for output directory
     * @returns Build integration result
     */
    generateDeclarationMaps(sourceDir?: string, outputDir?: string): Promise<BuildIntegrationResult>;
    /**
     * Validate existing source maps
     * @param outputDir - Optional override for output directory
     * @returns Validation result
     */
    validateSourceMaps(outputDir?: string): Promise<ValidationResult>;
    /**
     * Find definition for a symbol
     * @param symbolName - Symbol to find
     * @param fromFile - File context for search
     * @returns Navigation target or null
     */
    findDefinition(symbolName: string, fromFile?: string): Promise<NavigationTarget | null>;
    /**
     * Find all references for a symbol
     * @param symbolName - Symbol to find references for
     * @returns Array of navigation targets
     */
    findReferences(symbolName: string): Promise<NavigationTarget[]>;
    /**
     * Optimize declaration files and source maps
     * @param outputDir - Optional override for output directory
     * @returns Optimization result
     */
    optimizeDeclarations(outputDir?: string): Promise<{
        optimized: number;
        sizeSavedBytes: number;
        errors: string[];
    }>;
    /**
     * Integrate with build process
     * @param buildConfig - Build configuration
     * @returns Integration result
     */
    integrateBuildProcess(buildConfig: {
        watch: boolean;
        incremental: boolean;
        outputPath: string;
    }): Promise<BuildIntegrationResult>;
    /**
     * Find TypeScript files in directory
     * @param dir - Directory to search
     * @returns Array of TypeScript file paths
     * @private
     */
    private findTypeScriptFiles;
    /**
     * Find declaration files in directory
     * @param dir - Directory to search
     * @returns Array of declaration file paths
     * @private
     */
    private findDeclarationFiles;
    /**
     * Process a TypeScript file to generate mapping
     * @param tsFile - TypeScript file path
     * @param srcDir - Source directory
     * @param outDir - Output directory
     * @returns Declaration mapping or null
     * @private
     */
    private processTypeScriptFile;
    /**
     * Extract symbols from TypeScript source
     * @param content - TypeScript source content
     * @returns Array of symbols
     * @private
     */
    private extractSymbols;
    /**
     * Update symbol index with mapping information
     * @param mapping - Declaration mapping
     * @private
     */
    private updateSymbolIndex;
    /**
     * Validate source map content
     * @param sourceMap - Parsed source map
     * @param declarationFile - Declaration file path
     * @returns Validation details
     * @private
     */
    private validateSourceMapContent;
    /**
     * Check if two files are from the same module
     * @param filePath1 - First file path
     * @param filePath2 - Second file path
     * @returns Whether files are from same module
     * @private
     */
    private isSameModule;
    /**
     * Optimize declaration file content
     * @param content - Declaration file content
     * @returns Optimized content
     * @private
     */
    private optimizeDeclarationContent;
    /**
     * Optimize source map content
     * @param content - Source map content
     * @returns Optimized content
     * @private
     */
    private optimizeSourceMapContent;
    /**
     * Detect changed files for incremental builds
     * @returns Array of changed file paths
     * @private
     */
    private detectChangedFiles;
    /**
     * Get source mapping statistics
     * @returns Statistics object
     */
    getStatistics(): {
        totalMappings: number;
        symbolsIndexed: number;
        validMappings: number;
        cacheSize: number;
        averageProcessingTime: number;
    };
    /**
     * Clear all caches and mappings
     */
    clearCaches(): void;
}
//# sourceMappingURL=DeclarationMapManager.d.ts.map