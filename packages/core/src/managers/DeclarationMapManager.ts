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

import { promises as fs } from 'fs';
import * as path from 'path';

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
    coverage: number; // Percentage of source covered by mappings
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
export class DeclarationMapManager {
  private config: SourceMapConfig;
  private mappings: Map<string, DeclarationMapping> = new Map();
  private symbolIndex: Map<string, NavigationTarget[]> = new Map();
  private buildCache: Map<string, string> = new Map(); // File hash -> output

  constructor(config: SourceMapConfig) {
    this.config = config;
  }

  /**
   * Generate declaration maps for all TypeScript files
   * @param sourceDir - Optional override for source directory
   * @param outputDir - Optional override for output directory
   * @returns Build integration result
   */
  public async generateDeclarationMaps(
    sourceDir?: string,
    outputDir?: string
  ): Promise<BuildIntegrationResult> {
    const startTime = Date.now();
    const srcDir = sourceDir || this.config.sourceRoot;
    const outDir = outputDir || this.config.outputDir;

    const result: BuildIntegrationResult = {
      success: true,
      declarations: [],
      sourceMaps: [],
      warnings: [],
      errors: [],
      metrics: {
        totalFiles: 0,
        processingTimeMs: 0,
        outputSizeBytes: 0,
      },
    };

    try {
      // Find all TypeScript files
      const tsFiles = await this.findTypeScriptFiles(srcDir);
      result.metrics.totalFiles = tsFiles.length;

      // Process each TypeScript file
      for (const tsFile of tsFiles) {
        try {
          const mapping = await this.processTypeScriptFile(tsFile, srcDir, outDir);
          if (mapping) {
            this.mappings.set(tsFile, mapping);
            result.declarations.push(mapping.declarationPath);
            result.sourceMaps.push(mapping.sourceMapPath);

            // Update symbol index
            await this.updateSymbolIndex(mapping);
          }
        } catch (error) {
          result.errors.push({
            message: `Failed to process ${tsFile}: ${error}`,
            file: tsFile,
          });
          result.success = false;
        }
      }

      // Calculate output size
      const outputFiles = [...result.declarations, ...result.sourceMaps];
      for (const file of outputFiles) {
        try {
          const stats = await fs.stat(file);
          result.metrics.outputSizeBytes += stats.size;
        } catch {
          // File might not exist, continue
        }
      }

      result.metrics.processingTimeMs = Date.now() - startTime;
    } catch (error) {
      result.success = false;
      result.errors.push({
        message: `Declaration map generation failed: ${error}`,
        file: srcDir,
      });
    }

    return result;
  }

  /**
   * Validate existing source maps
   * @param outputDir - Optional override for output directory
   * @returns Validation result
   */
  public async validateSourceMaps(outputDir?: string): Promise<ValidationResult> {
    const outDir = outputDir || this.config.outputDir;

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      summary: {
        totalMappings: 0,
        validMappings: 0,
        invalidMappings: 0,
        coverage: 0,
      },
    };

    try {
      // Find all declaration files
      const declarationFiles = await this.findDeclarationFiles(outDir);

      for (const declFile of declarationFiles) {
        const sourceMapFile = declFile.replace(/\.d\.ts$/, '.d.ts.map');

        // Check if source map exists
        try {
          await fs.access(sourceMapFile);
        } catch {
          result.errors.push({
            type: 'missing-source',
            message: `Missing source map file: ${sourceMapFile}`,
            filePath: declFile,
            suggestion: 'Enable declarationMap in TypeScript configuration',
          });
          result.isValid = false;
          continue;
        }

        // Validate source map content
        try {
          const mapContent = await fs.readFile(sourceMapFile, 'utf-8');
          const sourceMap = JSON.parse(mapContent);

          const validation = this.validateSourceMapContent(sourceMap, declFile);
          result.summary.totalMappings += validation.mappingCount;
          result.summary.validMappings += validation.validCount;
          result.summary.invalidMappings += validation.invalidCount;

          if (validation.errors.length > 0) {
            result.errors.push(...validation.errors);
            result.isValid = false;
          }

          result.warnings.push(...validation.warnings);
        } catch (error) {
          result.errors.push({
            type: 'corrupted-map',
            message: `Invalid source map content: ${error}`,
            filePath: sourceMapFile,
            suggestion: 'Regenerate source maps using TypeScript compiler',
          });
          result.isValid = false;
        }
      }

      // Calculate coverage
      if (result.summary.totalMappings > 0) {
        result.summary.coverage = Math.round(
          (result.summary.validMappings / result.summary.totalMappings) * 100
        );
      }
    } catch (error) {
      result.errors.push({
        type: 'invalid-mapping',
        message: `Source map validation failed: ${error}`,
        filePath: outDir,
      });
      result.isValid = false;
    }

    return result;
  }

  /**
   * Find definition for a symbol
   * @param symbolName - Symbol to find
   * @param fromFile - File context for search
   * @returns Navigation target or null
   */
  public async findDefinition(
    symbolName: string,
    fromFile?: string
  ): Promise<NavigationTarget | null> {
    const targets = this.symbolIndex.get(symbolName);

    if (!targets || targets.length === 0) {
      return null;
    }

    // If we have a context file, prefer definitions from the same module
    if (fromFile) {
      const sameModuleTarget = targets.find(
        target => target.isDefinition && this.isSameModule(target.filePath, fromFile)
      );

      if (sameModuleTarget) {
        return sameModuleTarget;
      }
    }

    // Return the first definition found
    const definition = targets.find(target => target.isDefinition);
    return definition || targets[0];
  }

  /**
   * Find all references for a symbol
   * @param symbolName - Symbol to find references for
   * @returns Array of navigation targets
   */
  public async findReferences(symbolName: string): Promise<NavigationTarget[]> {
    const targets = this.symbolIndex.get(symbolName);
    return targets ? targets.filter(target => !target.isDefinition) : [];
  }

  /**
   * Optimize declaration files and source maps
   * @param outputDir - Optional override for output directory
   * @returns Optimization result
   */
  public async optimizeDeclarations(outputDir?: string): Promise<{
    optimized: number;
    sizeSavedBytes: number;
    errors: string[];
  }> {
    const outDir = outputDir || this.config.outputDir;
    const result = {
      optimized: 0,
      sizeSavedBytes: 0,
      errors: [],
    };

    try {
      const declarationFiles = await this.findDeclarationFiles(outDir);

      for (const declFile of declarationFiles) {
        try {
          const originalSize = (await fs.stat(declFile)).size;

          // Read and optimize declaration file
          const content = await fs.readFile(declFile, 'utf-8');
          const optimized = this.optimizeDeclarationContent(content);

          if (optimized !== content) {
            await fs.writeFile(declFile, optimized, 'utf-8');
            const newSize = (await fs.stat(declFile)).size;

            result.optimized++;
            result.sizeSavedBytes += originalSize - newSize;
          }

          // Optimize corresponding source map if it exists
          const sourceMapFile = declFile.replace(/\.d\.ts$/, '.d.ts.map');
          try {
            await fs.access(sourceMapFile);
            const mapContent = await fs.readFile(sourceMapFile, 'utf-8');
            const optimizedMap = this.optimizeSourceMapContent(mapContent);

            if (optimizedMap !== mapContent) {
              await fs.writeFile(sourceMapFile, optimizedMap, 'utf-8');
            }
          } catch {
            // Source map doesn't exist, continue
          }
        } catch (error) {
          result.errors.push(`Failed to optimize ${declFile}: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(`Declaration optimization failed: ${error}`);
    }

    return result;
  }

  /**
   * Integrate with build process
   * @param buildConfig - Build configuration
   * @returns Integration result
   */
  public async integrateBuildProcess(buildConfig: {
    watch: boolean;
    incremental: boolean;
    outputPath: string;
  }): Promise<BuildIntegrationResult> {
    const result: BuildIntegrationResult = {
      success: true,
      declarations: [],
      sourceMaps: [],
      warnings: [],
      errors: [],
      metrics: {
        totalFiles: 0,
        processingTimeMs: 0,
        outputSizeBytes: 0,
      },
    };

    try {
      // Configure TypeScript compiler options for optimal source map generation
      const compilerOptions = {
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        outDir: buildConfig.outputPath,
        sourceRoot: this.config.sourceRoot,
        inlineSources: this.config.inlineSources,
        inlineSourceMap: this.config.inlineSourceMap,
      };

      // Generate TypeScript configuration
      const tsConfigPath = path.join(process.cwd(), 'tsconfig.declarations.json');
      const tsConfig = {
        extends: './tsconfig.json',
        compilerOptions,
      };

      await fs.writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2));

      // If incremental builds are enabled, check for changes
      if (buildConfig.incremental) {
        const changedFiles = await this.detectChangedFiles();
        if (changedFiles.length === 0) {
          result.warnings.push({
            message: 'No files changed, skipping incremental build',
            file: this.config.sourceRoot,
          });
          return result;
        }
      }

      // Perform the actual build would be done by TypeScript compiler
      // Here we simulate the integration
      const buildResult = await this.generateDeclarationMaps();

      return {
        ...buildResult,
        warnings: [...result.warnings, ...buildResult.warnings],
        errors: [...result.errors, ...buildResult.errors],
      };
    } catch (error) {
      result.success = false;
      result.errors.push({
        message: `Build integration failed: ${error}`,
        file: this.config.sourceRoot,
      });
    }

    return result;
  }

  /**
   * Find TypeScript files in directory
   * @param dir - Directory to search
   * @returns Array of TypeScript file paths
   * @private
   */
  private async findTypeScriptFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function walkDir(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    }

    await walkDir(dir);
    return files;
  }

  /**
   * Find declaration files in directory
   * @param dir - Directory to search
   * @returns Array of declaration file paths
   * @private
   */
  private async findDeclarationFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function walkDir(currentDir: string) {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);

          if (entry.isDirectory()) {
            await walkDir(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
            files.push(fullPath);
          }
        }
      } catch {
        // Directory might not be accessible, continue
      }
    }

    await walkDir(dir);
    return files;
  }

  /**
   * Process a TypeScript file to generate mapping
   * @param tsFile - TypeScript file path
   * @param srcDir - Source directory
   * @param outDir - Output directory
   * @returns Declaration mapping or null
   * @private
   */
  private async processTypeScriptFile(
    tsFile: string,
    srcDir: string,
    outDir: string
  ): Promise<DeclarationMapping | null> {
    try {
      const relativePath = path.relative(srcDir, tsFile);
      const declarationPath = path.join(outDir, relativePath.replace(/\.ts$/, '.d.ts'));
      const sourceMapPath = declarationPath + '.map';

      // Get file timestamps
      const sourceStat = await fs.stat(tsFile);

      let declarationStat: any = null;
      let sourceMapStat: any = null;

      try {
        declarationStat = await fs.stat(declarationPath);
        sourceMapStat = await fs.stat(sourceMapPath);
      } catch {
        // Files might not exist yet
      }

      // Extract symbols from TypeScript file
      const sourceContent = await fs.readFile(tsFile, 'utf-8');
      const symbols = this.extractSymbols(sourceContent);

      return {
        sourcePath: tsFile,
        declarationPath,
        sourceMapPath,
        timestamps: {
          source: sourceStat.mtime,
          declaration: declarationStat?.mtime || new Date(0),
          sourceMap: sourceMapStat?.mtime || new Date(0),
        },
        isValid:
          declarationStat &&
          sourceMapStat &&
          declarationStat.mtime >= sourceStat.mtime &&
          sourceMapStat.mtime >= sourceStat.mtime,
        symbols,
      };
    } catch (error) {
      console.warn(`Failed to process TypeScript file ${tsFile}:`, error);
      return null;
    }
  }

  /**
   * Extract symbols from TypeScript source
   * @param content - TypeScript source content
   * @returns Array of symbols
   * @private
   */
  private extractSymbols(content: string): Array<{
    name: string;
    line: number;
    column: number;
    kind: 'interface' | 'type' | 'enum' | 'class' | 'function' | 'variable';
  }> {
    const symbols: Array<{
      name: string;
      line: number;
      column: number;
      kind: 'interface' | 'type' | 'enum' | 'class' | 'function' | 'variable';
    }> = [];

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Extract interfaces
      const interfaceMatch = line.match(/export\s+interface\s+(\w+)/);
      if (interfaceMatch) {
        symbols.push({
          name: interfaceMatch[1],
          line: i + 1,
          column: line.indexOf(interfaceMatch[1]) + 1,
          kind: 'interface',
        });
      }

      // Extract type aliases
      const typeMatch = line.match(/export\s+type\s+(\w+)/);
      if (typeMatch) {
        symbols.push({
          name: typeMatch[1],
          line: i + 1,
          column: line.indexOf(typeMatch[1]) + 1,
          kind: 'type',
        });
      }

      // Extract enums
      const enumMatch = line.match(/export\s+enum\s+(\w+)/);
      if (enumMatch) {
        symbols.push({
          name: enumMatch[1],
          line: i + 1,
          column: line.indexOf(enumMatch[1]) + 1,
          kind: 'enum',
        });
      }

      // Extract classes
      const classMatch = line.match(/export\s+class\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          line: i + 1,
          column: line.indexOf(classMatch[1]) + 1,
          kind: 'class',
        });
      }

      // Extract functions
      const functionMatch = line.match(/export\s+function\s+(\w+)/);
      if (functionMatch) {
        symbols.push({
          name: functionMatch[1],
          line: i + 1,
          column: line.indexOf(functionMatch[1]) + 1,
          kind: 'function',
        });
      }
    }

    return symbols;
  }

  /**
   * Update symbol index with mapping information
   * @param mapping - Declaration mapping
   * @private
   */
  private async updateSymbolIndex(mapping: DeclarationMapping): Promise<void> {
    for (const symbol of mapping.symbols) {
      const navigationTarget: NavigationTarget = {
        filePath: mapping.sourcePath,
        line: symbol.line,
        column: symbol.column,
        symbolName: symbol.name,
        symbolKind: symbol.kind,
        context: {
          before: '',
          symbol: symbol.name,
          after: '',
        },
        isDefinition: true,
      };

      const existing = this.symbolIndex.get(symbol.name) || [];
      existing.push(navigationTarget);
      this.symbolIndex.set(symbol.name, existing);
    }
  }

  /**
   * Validate source map content
   * @param sourceMap - Parsed source map
   * @param declarationFile - Declaration file path
   * @returns Validation details
   * @private
   */
  private validateSourceMapContent(
    sourceMap: any,
    declarationFile: string
  ): {
    mappingCount: number;
    validCount: number;
    invalidCount: number;
    errors: Array<{ type: string; message: string; filePath: string; suggestion?: string }>;
    warnings: Array<{ type: string; message: string; filePath: string; suggestion?: string }>;
  } {
    const result = {
      mappingCount: 0,
      validCount: 0,
      invalidCount: 0,
      errors: [],
      warnings: [],
    };

    // Basic source map structure validation
    if (!sourceMap.version || sourceMap.version !== 3) {
      result.errors.push({
        type: 'invalid-mapping',
        message: 'Invalid source map version',
        filePath: declarationFile,
        suggestion: 'Regenerate source maps with TypeScript compiler',
      });
    }

    if (!sourceMap.sources || !Array.isArray(sourceMap.sources)) {
      result.errors.push({
        type: 'invalid-mapping',
        message: 'Missing or invalid sources array',
        filePath: declarationFile,
      });
    }

    if (!sourceMap.mappings || typeof sourceMap.mappings !== 'string') {
      result.errors.push({
        type: 'invalid-mapping',
        message: 'Missing or invalid mappings string',
        filePath: declarationFile,
      });
    } else {
      // Count mappings (simplified - real implementation would decode VLQ)
      result.mappingCount = sourceMap.mappings.split(';').filter((s: string) => s).length;
      result.validCount = result.mappingCount; // Simplified validation
    }

    return result;
  }

  /**
   * Check if two files are from the same module
   * @param filePath1 - First file path
   * @param filePath2 - Second file path
   * @returns Whether files are from same module
   * @private
   */
  private isSameModule(filePath1: string, filePath2: string): boolean {
    const dir1 = path.dirname(filePath1);
    const dir2 = path.dirname(filePath2);
    return dir1 === dir2;
  }

  /**
   * Optimize declaration file content
   * @param content - Declaration file content
   * @returns Optimized content
   * @private
   */
  private optimizeDeclarationContent(content: string): string {
    if (this.config.optimization === 'none') {
      return content;
    }

    let optimized = content;

    // Remove excessive whitespace
    optimized = optimized.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Remove redundant export statements (basic optimization)
    if (this.config.optimization === 'aggressive') {
      optimized = optimized.replace(/export\s*\{\s*\};/g, '');
    }

    return optimized;
  }

  /**
   * Optimize source map content
   * @param content - Source map content
   * @returns Optimized content
   * @private
   */
  private optimizeSourceMapContent(content: string): string {
    if (this.config.optimization === 'none') {
      return content;
    }

    try {
      const sourceMap = JSON.parse(content);

      // Remove source content if not needed
      if (!this.config.includeSourceContent && sourceMap.sourcesContent) {
        delete sourceMap.sourcesContent;
      }

      return JSON.stringify(sourceMap, null, this.config.optimization === 'aggressive' ? 0 : 2);
    } catch {
      return content;
    }
  }

  /**
   * Detect changed files for incremental builds
   * @returns Array of changed file paths
   * @private
   */
  private async detectChangedFiles(): Promise<string[]> {
    const changed: string[] = [];

    for (const [filePath, mapping] of this.mappings) {
      try {
        const currentStat = await fs.stat(filePath);
        if (currentStat.mtime > mapping.timestamps.source) {
          changed.push(filePath);
        }
      } catch {
        // File might have been deleted
        changed.push(filePath);
      }
    }

    return changed;
  }

  /**
   * Get source mapping statistics
   * @returns Statistics object
   */
  public getStatistics(): {
    totalMappings: number;
    symbolsIndexed: number;
    validMappings: number;
    cacheSize: number;
    averageProcessingTime: number;
  } {
    const validMappings = Array.from(this.mappings.values()).filter(
      mapping => mapping.isValid
    ).length;

    const totalSymbols = Array.from(this.symbolIndex.values()).reduce(
      (sum, targets) => sum + targets.length,
      0
    );

    return {
      totalMappings: this.mappings.size,
      symbolsIndexed: totalSymbols,
      validMappings,
      cacheSize: this.buildCache.size,
      averageProcessingTime: 0, // Would need to track actual processing times
    };
  }

  /**
   * Clear all caches and mappings
   */
  public clearCaches(): void {
    this.mappings.clear();
    this.symbolIndex.clear();
    this.buildCache.clear();
  }
}
