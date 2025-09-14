/**
 * Bundle Optimizer
 * Handles tree-shaking, dead code elimination, and bundle optimization
 */

import { Plugin } from 'rollup';
import { minify } from 'terser';
import { readFileSync, writeFileSync } from 'fs';
import { gzipSync, brotliCompressSync } from 'zlib';

export interface IOptimizationConfig {
  minify: boolean;
  treeshake: boolean;
  deadCodeElimination: boolean;
  mangleProps: boolean;
  removeComments: boolean;
  removeConsole: boolean;
  sourcemap: boolean;
}

export interface IBundleAnalysis {
  originalSize: number;
  optimizedSize: number;
  gzippedSize: number;
  brotliSize: number;
  compressionRatio: number;
  treeshakeEffectiveness: number;
  unusedExports: string[];
  recommendations: string[];
}

export interface IModuleDependency {
  name: string;
  size: number;
  imports: string[];
  exports: string[];
  used: boolean;
  treeshakeable: boolean;
}

export class BundleOptimizer {
  private config: IOptimizationConfig;
  private dependencies: Map<string, IModuleDependency> = new Map();

  constructor(config: IOptimizationConfig) {
    this.config = config;
  }

  /**
   * Create Rollup plugin for optimization
   */
  createRollupPlugin(): Plugin {
    return {
      name: 'bundle-optimizer',
      buildStart: () => {
        this.dependencies.clear();
      },
      resolveId: (id, importer) => {
        // Track module dependencies
        if (importer) {
          this.trackDependency(id, importer);
        }
        return null;
      },
      transform: (code, id) => {
        // Analyze and optimize code
        return this.optimizeCode(code, id);
      },
      generateBundle: (options, bundle) => {
        // Final bundle optimization
        this.optimizeBundle(bundle);
      }
    };
  }

  /**
   * Optimize code during transformation
   */
  private optimizeCode(code: string, id: string): { code: string; map?: any } | null {
    let optimizedCode = code;

    // Remove console statements if configured
    if (this.config.removeConsole) {
      optimizedCode = this.removeConsoleStatements(optimizedCode);
    }

    // Remove comments if configured
    if (this.config.removeComments) {
      optimizedCode = this.removeComments(optimizedCode);
    }

    // Dead code elimination
    if (this.config.deadCodeElimination) {
      optimizedCode = this.eliminateDeadCode(optimizedCode);
    }

    return optimizedCode !== code ? { code: optimizedCode } : null;
  }

  /**
   * Optimize entire bundle
   */
  private optimizeBundle(bundle: any): void {
    for (const [fileName, chunk] of Object.entries(bundle)) {
      if ((chunk as any).type === 'chunk') {
        const chunkData = chunk as any;
        
        // Apply tree-shaking optimizations
        if (this.config.treeshake) {
          this.applyTreeShaking(chunkData);
        }
      }
    }
  }

  /**
   * Minify bundle using Terser
   */
  async minifyBundle(code: string): Promise<string> {
    if (!this.config.minify) {
      return code;
    }

    try {
      const result = await minify(code, {
        compress: {
          drop_console: this.config.removeConsole,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
          passes: 2
        },
        mangle: {
          properties: this.config.mangleProps ? {
            regex: /^_/
          } : false
        },
        format: {
          comments: !this.config.removeComments
        },
        sourceMap: this.config.sourcemap
      });

      return result.code || code;
    } catch (error) {
      console.warn('Minification failed:', error);
      return code;
    }
  }

  /**
   * Optimize multiple bundles
   */
  async optimizeBundles(buildResults: any): Promise<any> {
    console.log('🔧 Optimizing bundles...');
    
    if (buildResults && buildResults.formats) {
      for (const format of buildResults.formats) {
        try {
          if (format.file && this.config.minify) {
            const originalCode = readFileSync(format.file, 'utf8');
            const optimizedCode = await this.minifyBundle(originalCode);
            writeFileSync(format.file, optimizedCode);
            
            // Update size metrics
            format.size = Buffer.byteLength(optimizedCode, 'utf8');
            format.gzippedSize = gzipSync(optimizedCode).length;
            
            console.log(`✅ Optimized ${format.format}: ${format.size} bytes`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to optimize ${format.format}:`, error);
        }
      }
    }
    
    return buildResults;
  }

  /**
   * Analyze bundle for optimization opportunities
   */
  analyzeBundleSize(originalCode: string, optimizedCode: string): IBundleAnalysis {
    const originalSize = Buffer.byteLength(originalCode, 'utf8');
    const optimizedSize = Buffer.byteLength(optimizedCode, 'utf8');
    const gzippedSize = gzipSync(optimizedCode).length;
    const brotliSize = brotliCompressSync(optimizedCode).length;

    const compressionRatio = (originalSize - optimizedSize) / originalSize;
    const treeshakeEffectiveness = this.calculateTreeshakeEffectiveness();
    const unusedExports = this.findUnusedExports();
    const recommendations = this.generateOptimizationRecommendations(originalSize, optimizedSize);

    return {
      originalSize,
      optimizedSize,
      gzippedSize,
      brotliSize,
      compressionRatio,
      treeshakeEffectiveness,
      unusedExports,
      recommendations
    };
  }

  /**
   * Generate dependency graph analysis
   */
  generateDependencyGraph(): Map<string, IModuleDependency> {
    return new Map(this.dependencies);
  }

  /**
   * Track module dependency
   */
  private trackDependency(id: string, importer: string): void {
    if (!this.dependencies.has(id)) {
      this.dependencies.set(id, {
        name: id,
        size: 0,
        imports: [],
        exports: [],
        used: false,
        treeshakeable: true
      });
    }

    const dependency = this.dependencies.get(id)!;
    dependency.used = true;
  }

  /**
   * Remove console statements
   */
  private removeConsoleStatements(code: string): string {
    return code.replace(/console\.(log|info|debug|warn|error)\([^)]*\);?/g, '');
  }

  /**
   * Remove comments
   */
  private removeComments(code: string): string {
    // Remove single-line comments
    code = code.replace(/\/\/.*$/gm, '');
    // Remove multi-line comments
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    return code;
  }

  /**
   * Eliminate dead code
   */
  private eliminateDeadCode(code: string): string {
    // Simple dead code elimination patterns
    const patterns = [
      // Unreachable code after return
      /return[^;]*;[\s\S]*?(?=\n\s*}|\n\s*$)/g,
      // Unused variable declarations
      /(?:var|let|const)\s+\w+\s*=\s*[^;]+;\s*(?=\n)/g,
      // Empty if blocks
      /if\s*\([^)]+\)\s*{\s*}/g
    ];

    let optimizedCode = code;
    for (const pattern of patterns) {
      optimizedCode = optimizedCode.replace(pattern, '');
    }

    return optimizedCode;
  }

  /**
   * Apply tree-shaking optimizations
   */
  private applyTreeShaking(chunk: any): void {
    // Mark unused exports for removal
    const unusedExports = this.findUnusedExports();
    
    for (const exportName of unusedExports) {
      // Remove unused export from chunk
      if (chunk.exports && chunk.exports.includes(exportName)) {
        const index = chunk.exports.indexOf(exportName);
        chunk.exports.splice(index, 1);
      }
    }
  }

  /**
   * Calculate tree-shaking effectiveness
   */
  private calculateTreeshakeEffectiveness(): number {
    const totalModules = this.dependencies.size;
    const usedModules = Array.from(this.dependencies.values()).filter(dep => dep.used).length;
    
    return totalModules > 0 ? usedModules / totalModules : 1;
  }

  /**
   * Find unused exports
   */
  private findUnusedExports(): string[] {
    const unusedExports: string[] = [];
    
    for (const [name, dependency] of this.dependencies) {
      if (!dependency.used && dependency.exports.length > 0) {
        unusedExports.push(...dependency.exports);
      }
    }
    
    return unusedExports;
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(originalSize: number, optimizedSize: number): string[] {
    const recommendations: string[] = [];
    const compressionRatio = (originalSize - optimizedSize) / originalSize;

    if (compressionRatio < 0.1) {
      recommendations.push('Consider enabling more aggressive minification options');
    }

    if (this.dependencies.size > 50) {
      recommendations.push('Large number of dependencies detected - consider code splitting');
    }

    const unusedExports = this.findUnusedExports();
    if (unusedExports.length > 0) {
      recommendations.push(`Remove ${unusedExports.length} unused exports to improve tree-shaking`);
    }

    if (!this.config.treeshake) {
      recommendations.push('Enable tree-shaking to reduce bundle size');
    }

    if (!this.config.minify) {
      recommendations.push('Enable minification for production builds');
    }

    return recommendations;
  }

  /**
   * Generate bundle size report
   */
  generateSizeReport(analysis: IBundleAnalysis): string {
    const formatSize = (bytes: number) => {
      const units = ['B', 'KB', 'MB'];
      let size = bytes;
      let unitIndex = 0;

      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }

      return `${size.toFixed(1)}${units[unitIndex]}`;
    };

    const report = [
      '📊 Bundle Size Analysis',
      '========================',
      `Original Size: ${formatSize(analysis.originalSize)}`,
      `Optimized Size: ${formatSize(analysis.optimizedSize)}`,
      `Gzipped Size: ${formatSize(analysis.gzippedSize)}`,
      `Brotli Size: ${formatSize(analysis.brotliSize)}`,
      `Compression Ratio: ${(analysis.compressionRatio * 100).toFixed(1)}%`,
      `Tree-shake Effectiveness: ${(analysis.treeshakeEffectiveness * 100).toFixed(1)}%`,
      '',
      '🔍 Recommendations:',
      ...analysis.recommendations.map(rec => `• ${rec}`),
      ''
    ];

    if (analysis.unusedExports.length > 0) {
      report.push('🗑️ Unused Exports:');
      report.push(...analysis.unusedExports.slice(0, 10).map(exp => `• ${exp}`));
      if (analysis.unusedExports.length > 10) {
        report.push(`• ... and ${analysis.unusedExports.length - 10} more`);
      }
    }

    return report.join('\n');
  }
}
