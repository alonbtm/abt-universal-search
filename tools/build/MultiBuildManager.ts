/**
 * Multi-Format Build Manager
 * Handles UMD, ESM, and IIFE bundle generation with proper entry points
 */

import { rollup, RollupBuild, RollupOptions, OutputOptions } from 'rollup';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { gzipSync } from 'zlib';

export interface IBuildFormat {
  name: 'umd' | 'esm' | 'iife';
  file: string;
  format: 'umd' | 'es' | 'iife';
  globals?: Record<string, string>;
  name?: string;
}

export interface IBuildConfig {
  input: string;
  outputDir: string;
  formats: IBuildFormat[];
  external?: string[];
  plugins?: any[];
  minify?: boolean;
  sourcemap?: boolean;
}

export interface IBuildResult {
  format: string;
  file: string;
  size: number;
  gzippedSize: number;
  sourcemap?: string;
  valid: boolean;
  errors: string[];
}

export interface IBundleMetrics {
  totalSize: number;
  totalGzippedSize: number;
  formats: IBuildResult[];
  treeShakeable: boolean;
  buildTime: number;
}

export class MultiBuildManager {
  private config: IBuildConfig;
  private buildResults: Map<string, IBuildResult> = new Map();

  constructor(config: IBuildConfig) {
    this.config = config;
    this.ensureOutputDirectory();
  }

  /**
   * Build all configured formats
   */
  async buildAll(): Promise<IBundleMetrics> {
    const startTime = Date.now();
    const results: IBuildResult[] = [];

    console.log('🔨 Starting multi-format build...');

    for (const format of this.config.formats) {
      try {
        const result = await this.buildFormat(format);
        results.push(result);
        this.buildResults.set(format.name, result);
        
        console.log(`✅ Built ${format.name}: ${this.formatSize(result.size)} (${this.formatSize(result.gzippedSize)} gzipped)`);
      } catch (error) {
        const errorResult: IBuildResult = {
          format: format.name,
          file: format.file,
          size: 0,
          gzippedSize: 0,
          valid: false,
          errors: [error instanceof Error ? error.message : String(error)]
        };
        results.push(errorResult);
        console.error(`❌ Failed to build ${format.name}:`, error);
      }
    }

    const buildTime = Date.now() - startTime;
    const metrics = this.calculateMetrics(results, buildTime);

    console.log(`🎉 Build completed in ${buildTime}ms`);
    console.log(`📦 Total size: ${this.formatSize(metrics.totalSize)} (${this.formatSize(metrics.totalGzippedSize)} gzipped)`);

    return metrics;
  }

  /**
   * Build a specific format
   */
  async buildFormat(format: IBuildFormat): Promise<IBuildResult> {
    const inputOptions: RollupOptions = {
      input: this.config.input,
      external: this.config.external || [],
      plugins: this.config.plugins || []
    };

    const outputOptions: OutputOptions = {
      file: resolve(this.config.outputDir, format.file),
      format: format.format,
      name: format.name,
      globals: format.globals,
      sourcemap: this.config.sourcemap
    };

    let bundle: RollupBuild | null = null;

    try {
      // Create bundle
      bundle = await rollup(inputOptions);

      // Generate output
      const { output } = await bundle.generate(outputOptions);
      
      // Write to file
      await bundle.write(outputOptions);

      // Calculate metrics
      const code = output[0].code;
      const size = Buffer.byteLength(code, 'utf8');
      const gzippedSize = gzipSync(code).length;

      // Validate bundle
      const validation = this.validateBundle(outputOptions.file!, format);

      return {
        format: format.name,
        file: outputOptions.file!,
        size,
        gzippedSize,
        sourcemap: outputOptions.sourcemap ? `${outputOptions.file}.map` : undefined,
        valid: validation.valid,
        errors: validation.errors
      };
    } finally {
      if (bundle) {
        await bundle.close();
      }
    }
  }

  /**
   * Validate a built bundle
   */
  validateBundle(filePath: string, format: IBuildFormat): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Check if file exists
      if (!existsSync(filePath)) {
        errors.push(`Bundle file not found: ${filePath}`);
        return { valid: false, errors };
      }

      // Read and validate content
      const content = readFileSync(filePath, 'utf8');

      // Basic format validation
      switch (format.format) {
        case 'umd':
          if (!content.includes('(function (global, factory)') && !content.includes('(function(global, factory)')) {
            errors.push('UMD bundle does not contain expected UMD wrapper');
          }
          break;
        case 'es':
          if (!content.includes('export') && !content.includes('import')) {
            errors.push('ESM bundle does not contain expected ES module syntax');
          }
          break;
        case 'iife':
          if (!content.includes('(function()') && !content.includes('(function ()')) {
            errors.push('IIFE bundle does not contain expected IIFE wrapper');
          }
          break;
      }

      // Check for source map if enabled
      if (this.config.sourcemap && !existsSync(`${filePath}.map`)) {
        errors.push(`Source map not found: ${filePath}.map`);
      }

      // Validate bundle size (should not be empty)
      if (content.length < 100) {
        errors.push('Bundle appears to be too small or empty');
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors };
    }
  }

  /**
   * Get build result for a specific format
   */
  getBuildResult(format: string): IBuildResult | undefined {
    return this.buildResults.get(format);
  }

  /**
   * Get all build results
   */
  getAllBuildResults(): Map<string, IBuildResult> {
    return new Map(this.buildResults);
  }

  /**
   * Generate entry point configuration
   */
  generateEntryPoints(): Record<string, string> {
    const entryPoints: Record<string, string> = {};

    for (const format of this.config.formats) {
      const key = format.name === 'esm' ? 'module' : 
                  format.name === 'umd' ? 'main' : 
                  format.name;
      entryPoints[key] = `./dist/${format.file}`;
    }

    return entryPoints;
  }

  /**
   * Update package.json with entry points
   */
  updatePackageJson(packageJsonPath: string): void {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const entryPoints = this.generateEntryPoints();

      // Update entry points
      Object.assign(packageJson, entryPoints);

      // Add exports field for modern Node.js
      packageJson.exports = {
        '.': {
          import: entryPoints.module || entryPoints.esm,
          require: entryPoints.main,
          browser: entryPoints.iife
        }
      };

      // Mark as side-effect free for tree-shaking
      packageJson.sideEffects = false;

      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('📝 Updated package.json with entry points');
    } catch (error) {
      console.error('❌ Failed to update package.json:', error);
    }
  }

  /**
   * Clean build output directory
   */
  clean(): void {
    try {
      const { rmSync } = require('fs');
      if (existsSync(this.config.outputDir)) {
        rmSync(this.config.outputDir, { recursive: true, force: true });
      }
      this.ensureOutputDirectory();
      console.log('🧹 Cleaned build output directory');
    } catch (error) {
      console.error('❌ Failed to clean output directory:', error);
    }
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  /**
   * Calculate build metrics
   */
  private calculateMetrics(results: IBuildResult[], buildTime: number): IBundleMetrics {
    const validResults = results.filter(r => r.valid);
    const totalSize = validResults.reduce((sum, r) => sum + r.size, 0);
    const totalGzippedSize = validResults.reduce((sum, r) => sum + r.gzippedSize, 0);

    return {
      totalSize,
      totalGzippedSize,
      formats: results,
      treeShakeable: this.isTreeShakeable(),
      buildTime
    };
  }

  /**
   * Check if build is tree-shakeable
   */
  private isTreeShakeable(): boolean {
    // Check if ESM format is available and package.json has sideEffects: false
    return this.config.formats.some(f => f.format === 'es');
  }

  /**
   * Format file size for display
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }
}
