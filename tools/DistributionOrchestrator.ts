/**
 * Distribution Orchestrator
 * Coordinates the entire distribution pipeline including builds, publishing, and monitoring
 */

import { MultiBuildManager, IBuildFormat } from './build/MultiBuildManager';
import { BundleOptimizer } from './build/BundleOptimizer';
import { CDNDistributionManager } from './publishing/CDNDistributionManager';
import { NPMPublishManager } from './publishing/NPMPublishManager';
import { SecurityScanner } from './security/SecurityScanner';
import { PerformanceMonitor } from './monitoring/PerformanceMonitor';

export interface IDistributionConfig {
  projectPath: string;
  version?: string;
  buildConfig: {
    formats: ('umd' | 'esm' | 'iife')[];
    minify: boolean;
    sourceMaps: boolean;
    optimize: boolean;
  };
  publishConfig: {
    npm: {
      enabled: boolean;
      registry?: string;
      access?: 'public' | 'restricted';
      dryRun?: boolean;
    };
    cdn: {
      enabled: boolean;
      provider: 'jsdelivr' | 'unpkg';
      validateDeployment?: boolean;
    };
  };
  securityConfig: {
    enabled: boolean;
    scanTypes: ('dependencies' | 'code' | 'secrets' | 'licenses')[];
    autoFix: boolean;
  };
  performanceConfig: {
    enabled: boolean;
    thresholds: {
      bundleSize: number;
      gzippedSize: number;
      buildTime: number;
      regressionPercent: number;
    };
  };
}

export interface IDistributionResult {
  success: boolean;
  version: string;
  timestamp: Date;
  buildResults: any;
  publishResults: {
    npm?: any;
    cdn?: any;
  };
  securityReport?: any;
  performanceReport?: any;
  errors: string[];
  warnings: string[];
}

export interface IPipelineStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: string;
}

export class DistributionOrchestrator {
  private config: IDistributionConfig;
  private buildManager!: MultiBuildManager;
  private bundleOptimizer!: BundleOptimizer;
  private cdnManager!: CDNDistributionManager;
  private npmManager!: NPMPublishManager;
  private securityScanner!: SecurityScanner;
  private performanceMonitor!: PerformanceMonitor;
  private steps: IPipelineStep[] = [];

  constructor(config: IDistributionConfig) {
    this.config = config;
    this.initializeManagers();
    this.initializePipelineSteps();
  }

  /**
   * Execute the complete distribution pipeline
   */
  async executeDistribution(): Promise<IDistributionResult> {
    console.log('🚀 Starting distribution pipeline...');
    
    const result: IDistributionResult = {
      success: false,
      version: this.config.version || '1.0.0',
      timestamp: new Date(),
      buildResults: null,
      publishResults: {},
      errors: [],
      warnings: []
    };

    try {
      // Step 1: Security Scan (Pre-build)
      if (this.config.securityConfig.enabled) {
        await this.executeStep('security-scan', async () => {
          result.securityReport = await this.securityScanner.runSecurityScan();
          
          // Check for critical vulnerabilities
          const criticalVulns = result.securityReport.vulnerabilities.filter(
            (v: any) => v.severity === 'critical'
          );
          
          if (criticalVulns.length > 0) {
            throw new Error(`Critical security vulnerabilities found: ${criticalVulns.length}`);
          }
          
          return result.securityReport;
        });
      }

      // Step 2: Build
      await this.executeStep('build', async () => {
        result.buildResults = await this.buildManager.buildAll();
        
        if (this.config.buildConfig.optimize) {
          result.buildResults = await this.bundleOptimizer.optimizeBundles(result.buildResults);
        }
        
        return result.buildResults;
      });

      // Step 3: Performance Analysis
      if (this.config.performanceConfig.enabled) {
        await this.executeStep('performance-analysis', async () => {
          await this.performanceMonitor.recordMetrics(result.version, result.buildResults);
          result.performanceReport = await this.performanceMonitor.analyzePerformance(result.version);
          
          // Check for critical regressions
          const criticalRegressions = result.performanceReport.regressions.filter(
            (r: any) => r.severity === 'critical'
          );
          
          if (criticalRegressions.length > 0) {
            result.warnings.push(`Critical performance regressions detected: ${criticalRegressions.length}`);
          }
          
          return result.performanceReport;
        });
      }

      // Step 4: NPM Publishing
      if (this.config.publishConfig.npm.enabled) {
        await this.executeStep('npm-publish', async () => {
          const versionBump = this.npmManager.generateVersionBump('patch');
          result.publishResults.npm = await this.npmManager.publish(versionBump);
          result.version = result.publishResults.npm.version;
          return result.publishResults.npm;
        });
      }

      // Step 5: CDN Distribution
      if (this.config.publishConfig.cdn.enabled) {
        await this.executeStep('cdn-deploy', async () => {
          result.publishResults.cdn = await this.cdnManager.deploy(
            result.version,
            result.buildResults.outputFiles
          );
          return result.publishResults.cdn;
        });
      }

      // Step 6: Post-deployment Validation
      await this.executeStep('validation', async () => {
        const validationResults = await this.validateDeployment(result);
        
        if (!validationResults.success) {
          throw new Error(`Deployment validation failed: ${validationResults.errors.join(', ')}`);
        }
        
        return validationResults;
      });

      result.success = true;
      console.log(`✅ Distribution pipeline completed successfully for version ${result.version}`);
      
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
      console.error('❌ Distribution pipeline failed:', error);
      
      // Attempt rollback if needed
      await this.handleFailure(result);
    }

    return result;
  }

  /**
   * Execute a dry run of the distribution pipeline
   */
  async executeDryRun(): Promise<IDistributionResult> {
    console.log('🧪 Starting distribution dry run...');
    
    // Create a copy of config with dry run settings
    const dryRunConfig = {
      ...this.config,
      publishConfig: {
        ...this.config.publishConfig,
        npm: { ...this.config.publishConfig.npm, dryRun: true },
        cdn: { ...this.config.publishConfig.cdn, validateDeployment: false }
      }
    };

    const originalConfig = this.config;
    this.config = dryRunConfig;
    
    try {
      const result = await this.executeDistribution();
      result.warnings.push('This was a dry run - no actual publishing occurred');
      return result;
    } finally {
      this.config = originalConfig;
    }
  }

  /**
   * Get pipeline status
   */
  getPipelineStatus(): IPipelineStep[] {
    return [...this.steps];
  }

  /**
   * Generate distribution report
   */
  generateDistributionReport(result: IDistributionResult): string {
    const sections = [
      '📦 Distribution Pipeline Report',
      '================================',
      `Version: ${result.version}`,
      `Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`,
      `Timestamp: ${result.timestamp.toISOString()}`,
      '',
      '📋 Pipeline Steps:',
      ...this.steps.map(step => {
        const status = step.status === 'completed' ? '✅' : 
                     step.status === 'failed' ? '❌' : 
                     step.status === 'running' ? '🔄' : '⏳';
        const duration = step.startTime && step.endTime ? 
          ` (${step.endTime.getTime() - step.startTime.getTime()}ms)` : '';
        return `${status} ${step.name}${duration}`;
      }),
      ''
    ];

    if (result.buildResults) {
      sections.push('🔨 Build Results:');
      sections.push(`• Formats: ${result.buildResults.formats?.map((f: any) => f.format).join(', ') || 'N/A'}`);
      sections.push(`• Total Size: ${this.formatSize(result.buildResults.totalSize || 0)}`);
      sections.push(`• Gzipped Size: ${this.formatSize(result.buildResults.totalGzippedSize || 0)}`);
      sections.push('');
    }

    if (result.publishResults.npm) {
      sections.push('📦 NPM Publishing:');
      sections.push(`• Package URL: ${result.publishResults.npm.packageUrl}`);
      sections.push(`• Published: ${result.publishResults.npm.success ? 'Yes' : 'No'}`);
      sections.push('');
    }

    if (result.publishResults.cdn) {
      sections.push('🌐 CDN Distribution:');
      sections.push(`• CDN URLs: ${result.publishResults.cdn.cdnUrls?.length || 0} files`);
      sections.push(`• Deployed: ${result.publishResults.cdn.success ? 'Yes' : 'No'}`);
      sections.push('');
    }

    if (result.securityReport) {
      sections.push('🔒 Security Scan:');
      sections.push(`• Vulnerabilities: ${result.securityReport.totalVulnerabilities}`);
      sections.push(`• Risk Score: ${result.securityReport.riskScore}/100`);
      sections.push('');
    }

    if (result.performanceReport) {
      sections.push('📊 Performance Analysis:');
      sections.push(`• Overall Score: ${result.performanceReport.overallScore}/100`);
      sections.push(`• Regressions: ${result.performanceReport.regressions.length}`);
      sections.push(`• Improvements: ${result.performanceReport.improvements.length}`);
      sections.push('');
    }

    if (result.errors.length > 0) {
      sections.push('❌ Errors:');
      sections.push(...result.errors.map(error => `• ${error}`));
      sections.push('');
    }

    if (result.warnings.length > 0) {
      sections.push('⚠️ Warnings:');
      sections.push(...result.warnings.map(warning => `• ${warning}`));
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Initialize all managers
   */
  private initializeManagers(): void {
    // Transform format strings to IBuildFormat objects
    const formats: IBuildFormat[] = this.config.buildConfig.formats.map(formatType => {
      const buildFormat: IBuildFormat = {
        name: formatType,
        file: `bundle.${formatType}.js`,
        format: formatType === 'esm' ? 'es' : formatType
      };
      
      // Add global name for UMD and IIFE formats (the optional name property)
      if (formatType !== 'esm') {
        (buildFormat as any).globalName = 'UniversalSearch';
      }
      
      return buildFormat;
    });

    this.buildManager = new MultiBuildManager({
      input: 'src/index.ts',
      outputDir: 'dist',
      formats: formats,
      minify: this.config.buildConfig.minify,
      sourcemap: this.config.buildConfig.sourceMaps
    });

    this.bundleOptimizer = new BundleOptimizer({
      minify: this.config.buildConfig.minify,
      treeshake: true,
      deadCodeElimination: true,
      mangleProps: false,
      removeComments: true,
      removeConsole: false,
      sourcemap: this.config.buildConfig.sourceMaps
    });

    this.cdnManager = new CDNDistributionManager({
      packageName: 'universal-search-component',
      version: this.config.version || '1.0.0',
      files: ['dist/**/*'],
      baseUrl: 'https://cdn.jsdelivr.net/npm',
      timeout: 30000,
      retryAttempts: 3
    });

    this.npmManager = new NPMPublishManager({
      packagePath: this.config.projectPath,
      registry: this.config.publishConfig.npm.registry || 'https://registry.npmjs.org/',
      access: this.config.publishConfig.npm.access || 'public',
      dryRun: this.config.publishConfig.npm.dryRun || false
    });

    this.securityScanner = new SecurityScanner({
      projectPath: this.config.projectPath,
      scanTypes: this.config.securityConfig.scanTypes,
      severity: 'moderate',
      autoFix: this.config.securityConfig.autoFix
    });

    this.performanceMonitor = new PerformanceMonitor({
      projectPath: this.config.projectPath,
      thresholds: this.config.performanceConfig.thresholds
    });
  }

  /**
   * Initialize pipeline steps
   */
  private initializePipelineSteps(): void {
    this.steps = [
      { name: 'security-scan', status: 'pending' },
      { name: 'build', status: 'pending' },
      { name: 'performance-analysis', status: 'pending' },
      { name: 'npm-publish', status: 'pending' },
      { name: 'cdn-deploy', status: 'pending' },
      { name: 'validation', status: 'pending' }
    ];
  }

  /**
   * Execute a pipeline step
   */
  private async executeStep(stepName: string, executor: () => Promise<any>): Promise<any> {
    const step = this.steps.find(s => s.name === stepName);
    if (!step) {
      throw new Error(`Step not found: ${stepName}`);
    }

    console.log(`🔄 Executing step: ${stepName}`);
    step.status = 'running';
    step.startTime = new Date();

    try {
      const result = await executor();
      step.status = 'completed';
      step.endTime = new Date();
      step.result = result;
      console.log(`✅ Step completed: ${stepName}`);
      return result;
    } catch (error) {
      step.status = 'failed';
      step.endTime = new Date();
      step.error = error instanceof Error ? error.message : String(error);
      console.error(`❌ Step failed: ${stepName}`, error);
      throw error;
    }
  }

  /**
   * Validate deployment
   */
  private async validateDeployment(result: IDistributionResult): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate NPM publishing
    if (result.publishResults.npm && !result.publishResults.npm.success) {
      errors.push('NPM publishing failed');
    }

    // Validate CDN deployment
    if (result.publishResults.cdn && !result.publishResults.cdn.success) {
      errors.push('CDN deployment failed');
    }

    // Validate build outputs
    if (!result.buildResults || !result.buildResults.formats || result.buildResults.formats.length === 0) {
      errors.push('No build outputs generated');
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Handle pipeline failure
   */
  private async handleFailure(result: IDistributionResult): Promise<void> {
    console.log('🔄 Handling pipeline failure...');

    try {
      // Rollback CDN deployment if it was successful but later steps failed
      if (result.publishResults.cdn?.success && result.errors.length > 0) {
        console.log('🔄 Rolling back CDN deployment...');
        await this.cdnManager.rollback(result.version, 'previous');
      }

      // Log failure for monitoring
      console.error('Pipeline failure details:', {
        version: result.version,
        errors: result.errors,
        timestamp: result.timestamp
      });
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
      result.errors.push(`Rollback failed: ${rollbackError}`);
    }
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
