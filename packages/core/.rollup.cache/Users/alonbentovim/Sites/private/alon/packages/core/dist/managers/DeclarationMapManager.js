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
    constructor(config) {
        this.mappings = new Map();
        this.symbolIndex = new Map();
        this.buildCache = new Map(); // File hash -> output
        this.config = config;
    }
    /**
     * Generate declaration maps for all TypeScript files
     * @param sourceDir - Optional override for source directory
     * @param outputDir - Optional override for output directory
     * @returns Build integration result
     */
    async generateDeclarationMaps(sourceDir, outputDir) {
        const startTime = Date.now();
        const srcDir = sourceDir || this.config.sourceRoot;
        const outDir = outputDir || this.config.outputDir;
        const result = {
            success: true,
            declarations: [],
            sourceMaps: [],
            warnings: [],
            errors: [],
            metrics: {
                totalFiles: 0,
                processingTimeMs: 0,
                outputSizeBytes: 0
            }
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
                }
                catch (error) {
                    result.errors.push({
                        message: `Failed to process ${tsFile}: ${error}`,
                        file: tsFile
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
                }
                catch {
                    // File might not exist, continue
                }
            }
            result.metrics.processingTimeMs = Date.now() - startTime;
        }
        catch (error) {
            result.success = false;
            result.errors.push({
                message: `Declaration map generation failed: ${error}`,
                file: srcDir
            });
        }
        return result;
    }
    /**
     * Validate existing source maps
     * @param outputDir - Optional override for output directory
     * @returns Validation result
     */
    async validateSourceMaps(outputDir) {
        const outDir = outputDir || this.config.outputDir;
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            summary: {
                totalMappings: 0,
                validMappings: 0,
                invalidMappings: 0,
                coverage: 0
            }
        };
        try {
            // Find all declaration files
            const declarationFiles = await this.findDeclarationFiles(outDir);
            for (const declFile of declarationFiles) {
                const sourceMapFile = declFile.replace(/\.d\.ts$/, '.d.ts.map');
                // Check if source map exists
                try {
                    await fs.access(sourceMapFile);
                }
                catch {
                    result.errors.push({
                        type: 'missing-source',
                        message: `Missing source map file: ${sourceMapFile}`,
                        filePath: declFile,
                        suggestion: 'Enable declarationMap in TypeScript configuration'
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
                }
                catch (error) {
                    result.errors.push({
                        type: 'corrupted-map',
                        message: `Invalid source map content: ${error}`,
                        filePath: sourceMapFile,
                        suggestion: 'Regenerate source maps using TypeScript compiler'
                    });
                    result.isValid = false;
                }
            }
            // Calculate coverage
            if (result.summary.totalMappings > 0) {
                result.summary.coverage = Math.round((result.summary.validMappings / result.summary.totalMappings) * 100);
            }
        }
        catch (error) {
            result.errors.push({
                type: 'invalid-mapping',
                message: `Source map validation failed: ${error}`,
                filePath: outDir
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
    async findDefinition(symbolName, fromFile) {
        const targets = this.symbolIndex.get(symbolName);
        if (!targets || targets.length === 0) {
            return null;
        }
        // If we have a context file, prefer definitions from the same module
        if (fromFile) {
            const sameModuleTarget = targets.find(target => target.isDefinition &&
                this.isSameModule(target.filePath, fromFile));
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
    async findReferences(symbolName) {
        const targets = this.symbolIndex.get(symbolName);
        return targets ? targets.filter(target => !target.isDefinition) : [];
    }
    /**
     * Optimize declaration files and source maps
     * @param outputDir - Optional override for output directory
     * @returns Optimization result
     */
    async optimizeDeclarations(outputDir) {
        const outDir = outputDir || this.config.outputDir;
        const result = {
            optimized: 0,
            sizeSavedBytes: 0,
            errors: []
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
                    }
                    catch {
                        // Source map doesn't exist, continue
                    }
                }
                catch (error) {
                    result.errors.push(`Failed to optimize ${declFile}: ${error}`);
                }
            }
        }
        catch (error) {
            result.errors.push(`Declaration optimization failed: ${error}`);
        }
        return result;
    }
    /**
     * Integrate with build process
     * @param buildConfig - Build configuration
     * @returns Integration result
     */
    async integrateBuildProcess(buildConfig) {
        const result = {
            success: true,
            declarations: [],
            sourceMaps: [],
            warnings: [],
            errors: [],
            metrics: {
                totalFiles: 0,
                processingTimeMs: 0,
                outputSizeBytes: 0
            }
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
                inlineSourceMap: this.config.inlineSourceMap
            };
            // Generate TypeScript configuration
            const tsConfigPath = path.join(process.cwd(), 'tsconfig.declarations.json');
            const tsConfig = {
                extends: './tsconfig.json',
                compilerOptions
            };
            await fs.writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2));
            // If incremental builds are enabled, check for changes
            if (buildConfig.incremental) {
                const changedFiles = await this.detectChangedFiles();
                if (changedFiles.length === 0) {
                    result.warnings.push({
                        message: 'No files changed, skipping incremental build',
                        file: this.config.sourceRoot
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
                errors: [...result.errors, ...buildResult.errors]
            };
        }
        catch (error) {
            result.success = false;
            result.errors.push({
                message: `Build integration failed: ${error}`,
                file: this.config.sourceRoot
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
    async findTypeScriptFiles(dir) {
        const files = [];
        async function walkDir(currentDir) {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    await walkDir(fullPath);
                }
                else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
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
    async findDeclarationFiles(dir) {
        const files = [];
        async function walkDir(currentDir) {
            try {
                const entries = await fs.readdir(currentDir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(currentDir, entry.name);
                    if (entry.isDirectory()) {
                        await walkDir(fullPath);
                    }
                    else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
                        files.push(fullPath);
                    }
                }
            }
            catch {
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
    async processTypeScriptFile(tsFile, srcDir, outDir) {
        try {
            const relativePath = path.relative(srcDir, tsFile);
            const declarationPath = path.join(outDir, relativePath.replace(/\.ts$/, '.d.ts'));
            const sourceMapPath = declarationPath + '.map';
            // Get file timestamps
            const sourceStat = await fs.stat(tsFile);
            let declarationStat = null;
            let sourceMapStat = null;
            try {
                declarationStat = await fs.stat(declarationPath);
                sourceMapStat = await fs.stat(sourceMapPath);
            }
            catch {
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
                    sourceMap: sourceMapStat?.mtime || new Date(0)
                },
                isValid: declarationStat && sourceMapStat &&
                    declarationStat.mtime >= sourceStat.mtime &&
                    sourceMapStat.mtime >= sourceStat.mtime,
                symbols
            };
        }
        catch (error) {
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
    extractSymbols(content) {
        const symbols = [];
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
                    kind: 'interface'
                });
            }
            // Extract type aliases
            const typeMatch = line.match(/export\s+type\s+(\w+)/);
            if (typeMatch) {
                symbols.push({
                    name: typeMatch[1],
                    line: i + 1,
                    column: line.indexOf(typeMatch[1]) + 1,
                    kind: 'type'
                });
            }
            // Extract enums
            const enumMatch = line.match(/export\s+enum\s+(\w+)/);
            if (enumMatch) {
                symbols.push({
                    name: enumMatch[1],
                    line: i + 1,
                    column: line.indexOf(enumMatch[1]) + 1,
                    kind: 'enum'
                });
            }
            // Extract classes
            const classMatch = line.match(/export\s+class\s+(\w+)/);
            if (classMatch) {
                symbols.push({
                    name: classMatch[1],
                    line: i + 1,
                    column: line.indexOf(classMatch[1]) + 1,
                    kind: 'class'
                });
            }
            // Extract functions
            const functionMatch = line.match(/export\s+function\s+(\w+)/);
            if (functionMatch) {
                symbols.push({
                    name: functionMatch[1],
                    line: i + 1,
                    column: line.indexOf(functionMatch[1]) + 1,
                    kind: 'function'
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
    async updateSymbolIndex(mapping) {
        for (const symbol of mapping.symbols) {
            const navigationTarget = {
                filePath: mapping.sourcePath,
                line: symbol.line,
                column: symbol.column,
                symbolName: symbol.name,
                symbolKind: symbol.kind,
                context: {
                    before: '',
                    symbol: symbol.name,
                    after: ''
                },
                isDefinition: true
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
    validateSourceMapContent(sourceMap, declarationFile) {
        const result = {
            mappingCount: 0,
            validCount: 0,
            invalidCount: 0,
            errors: [],
            warnings: []
        };
        // Basic source map structure validation
        if (!sourceMap.version || sourceMap.version !== 3) {
            result.errors.push({
                type: 'invalid-mapping',
                message: 'Invalid source map version',
                filePath: declarationFile,
                suggestion: 'Regenerate source maps with TypeScript compiler'
            });
        }
        if (!sourceMap.sources || !Array.isArray(sourceMap.sources)) {
            result.errors.push({
                type: 'invalid-mapping',
                message: 'Missing or invalid sources array',
                filePath: declarationFile
            });
        }
        if (!sourceMap.mappings || typeof sourceMap.mappings !== 'string') {
            result.errors.push({
                type: 'invalid-mapping',
                message: 'Missing or invalid mappings string',
                filePath: declarationFile
            });
        }
        else {
            // Count mappings (simplified - real implementation would decode VLQ)
            result.mappingCount = sourceMap.mappings.split(';').filter((s) => s).length;
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
    isSameModule(filePath1, filePath2) {
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
    optimizeDeclarationContent(content) {
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
    optimizeSourceMapContent(content) {
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
        }
        catch {
            return content;
        }
    }
    /**
     * Detect changed files for incremental builds
     * @returns Array of changed file paths
     * @private
     */
    async detectChangedFiles() {
        const changed = [];
        for (const [filePath, mapping] of this.mappings) {
            try {
                const currentStat = await fs.stat(filePath);
                if (currentStat.mtime > mapping.timestamps.source) {
                    changed.push(filePath);
                }
            }
            catch {
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
    getStatistics() {
        const validMappings = Array.from(this.mappings.values())
            .filter(mapping => mapping.isValid).length;
        const totalSymbols = Array.from(this.symbolIndex.values())
            .reduce((sum, targets) => sum + targets.length, 0);
        return {
            totalMappings: this.mappings.size,
            symbolsIndexed: totalSymbols,
            validMappings,
            cacheSize: this.buildCache.size,
            averageProcessingTime: 0 // Would need to track actual processing times
        };
    }
    /**
     * Clear all caches and mappings
     */
    clearCaches() {
        this.mappings.clear();
        this.symbolIndex.clear();
        this.buildCache.clear();
    }
}
//# sourceMappingURL=DeclarationMapManager.js.map