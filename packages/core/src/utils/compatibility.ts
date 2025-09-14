/**
 * @fileoverview Backward Compatibility and Version Management System
 * @description Comprehensive version compatibility management with type safety,
 * migration utilities, and breaking change detection for TypeScript developers.
 * 
 * @example Version Checking
 * ```typescript
 * import { CompatibilityManager, checkTypeCompatibility } from '@alon/core';
 * 
 * const manager = new CompatibilityManager();
 * const isCompatible = manager.checkVersion('1.2.0', '1.0.0');
 * 
 * // Check type compatibility
 * const typeCompatible = checkTypeCompatibility('SearchConfiguration', '1.1.0');
 * ```
 * 
 * @example Migration Support
 * ```typescript
 * import { migrateConfiguration, generateMigrationGuide } from '@alon/core';
 * 
 * // Migrate old config to new format
 * const newConfig = migrateConfiguration(oldConfig, '1.0.0', '2.0.0');
 * 
 * // Get migration guide
 * const guide = generateMigrationGuide('1.5.0', '2.0.0');
 * ```
 */

import { VERSION, API_VERSION } from '../types';

/**
 * Semantic version interface
 */
export interface SemanticVersion {
  /** Major version number */
  major: number;
  /** Minor version number */
  minor: number;
  /** Patch version number */
  patch: number;
  /** Pre-release identifier */
  prerelease?: string;
  /** Build metadata */
  build?: string;
}

/**
 * Version compatibility information
 */
export interface VersionCompatibility {
  /** Target version */
  version: string;
  /** Whether version is compatible */
  compatible: boolean;
  /** Compatibility level */
  level: 'full' | 'partial' | 'breaking' | 'incompatible';
  /** Breaking changes */
  breakingChanges: BreakingChange[];
  /** Deprecated features */
  deprecations: Deprecation[];
  /** Migration notes */
  migrationNotes: string[];
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Breaking change information
 */
export interface BreakingChange {
  /** Change type */
  type: 'interface' | 'method' | 'property' | 'enum' | 'behavior' | 'removal';
  /** Component affected */
  component: string;
  /** Change description */
  description: string;
  /** Version introduced */
  introducedIn: string;
  /** Migration instructions */
  migration: string;
  /** Impact level */
  impact: 'low' | 'medium' | 'high' | 'critical';
  /** Automated migration available */
  automatable: boolean;
}

/**
 * Deprecation information
 */
export interface Deprecation {
  /** Deprecated item type */
  type: 'interface' | 'method' | 'property' | 'enum' | 'constant';
  /** Item name */
  name: string;
  /** Deprecation reason */
  reason: string;
  /** Deprecated since version */
  since: string;
  /** Removal version */
  removeIn?: string;
  /** Replacement */
  replacement?: string;
  /** Migration example */
  example?: string;
}

/**
 * Migration rule for automated migration
 */
export interface MigrationRule {
  /** Rule name */
  name: string;
  /** Source version pattern */
  fromVersion: string;
  /** Target version pattern */
  toVersion: string;
  /** Transformation function */
  transform: (data: any) => any;
  /** Validation function */
  validate?: (data: any) => boolean;
  /** Rule description */
  description: string;
  /** Rule category */
  category: 'structural' | 'semantic' | 'cosmetic' | 'behavioral';
}

/**
 * Migration guide entry
 */
export interface MigrationGuideEntry {
  /** Change title */
  title: string;
  /** Change description */
  description: string;
  /** Before example */
  before: string;
  /** After example */
  after: string;
  /** Migration steps */
  steps: string[];
  /** Complexity level */
  complexity: 'simple' | 'moderate' | 'complex';
  /** Estimated time */
  estimatedTime: string;
}

/**
 * Type compatibility result
 */
export interface TypeCompatibilityResult {
  /** Type name */
  typeName: string;
  /** Source version */
  sourceVersion: string;
  /** Target version */
  targetVersion: string;
  /** Compatible flag */
  compatible: boolean;
  /** Compatibility issues */
  issues: TypeCompatibilityIssue[];
  /** Required changes */
  changes: TypeChange[];
}

/**
 * Type compatibility issue
 */
export interface TypeCompatibilityIssue {
  /** Issue type */
  type: 'property-removed' | 'property-changed' | 'method-signature-changed' | 'generic-changed';
  /** Issue description */
  description: string;
  /** Affected property/method */
  member: string;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** Fix suggestion */
  fix?: string;
}

/**
 * Type change information
 */
export interface TypeChange {
  /** Change type */
  type: 'add' | 'remove' | 'modify' | 'rename';
  /** Member name */
  member: string;
  /** Old value */
  oldValue?: string;
  /** New value */
  newValue?: string;
  /** Change reason */
  reason: string;
}

/**
 * Version range specification
 */
export interface VersionRange {
  /** Minimum version (inclusive) */
  min?: string;
  /** Maximum version (exclusive) */
  max?: string;
  /** Exact version */
  exact?: string;
  /** Excluded versions */
  exclude?: string[];
}

/**
 * Compatibility Manager for version management
 */
export class CompatibilityManager {
  private versionHistory: Map<string, VersionCompatibility> = new Map();
  private migrationRules: Map<string, MigrationRule[]> = new Map();
  private typeVersions: Map<string, Map<string, any>> = new Map();
  private breakingChangeRegistry: Map<string, BreakingChange[]> = new Map();
  private deprecationRegistry: Map<string, Deprecation[]> = new Map();

  constructor() {
    this.initializeVersionHistory();
    this.initializeMigrationRules();
    this.initializeTypeVersions();
  }

  /**
   * Checks if a version is compatible with the current version
   * @param version - Version to check
   * @param currentVersion - Current version (defaults to package version)
   * @returns Compatibility information
   */
  public checkVersion(version: string, currentVersion: string = VERSION): VersionCompatibility {
    const cacheKey = `${version}-${currentVersion}`;
    
    if (this.versionHistory.has(cacheKey)) {
      return this.versionHistory.get(cacheKey)!;
    }

    const compatibility = this.calculateCompatibility(version, currentVersion);
    this.versionHistory.set(cacheKey, compatibility);
    
    return compatibility;
  }

  /**
   * Checks type compatibility between versions
   * @param typeName - Name of the type to check
   * @param version - Version to check compatibility with
   * @returns Type compatibility result
   */
  public checkTypeCompatibility(typeName: string, version: string): TypeCompatibilityResult {
    const currentTypeVersion = this.getCurrentTypeVersion(typeName);
    const targetTypeVersion = this.getTypeVersion(typeName, version);

    const issues: TypeCompatibilityIssue[] = [];
    const changes: TypeChange[] = [];

    if (!targetTypeVersion) {
      return {
        typeName,
        sourceVersion: VERSION,
        targetVersion: version,
        compatible: false,
        issues: [{
          type: 'property-removed',
          description: `Type ${typeName} not found in version ${version}`,
          member: typeName,
          severity: 'error'
        }],
        changes: []
      };
    }

    // Compare type definitions
    this.compareTypes(currentTypeVersion, targetTypeVersion, issues, changes);

    return {
      typeName,
      sourceVersion: VERSION,
      targetVersion: version,
      compatible: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      changes
    };
  }

  /**
   * Migrates data from one version to another
   * @param data - Data to migrate
   * @param fromVersion - Source version
   * @param toVersion - Target version
   * @returns Migrated data
   */
  public migrateData(data: any, fromVersion: string, toVersion: string): any {
    const migrationPath = this.findMigrationPath(fromVersion, toVersion);
    let migratedData = structuredClone(data);

    for (const step of migrationPath) {
      const rules = this.migrationRules.get(step) || [];
      for (const rule of rules) {
        if (rule.validate && !rule.validate(migratedData)) {
          continue;
        }
        migratedData = rule.transform(migratedData);
      }
    }

    return migratedData;
  }

  /**
   * Generates a migration guide between versions
   * @param fromVersion - Source version
   * @param toVersion - Target version
   * @returns Migration guide entries
   */
  public generateMigrationGuide(fromVersion: string, toVersion: string): MigrationGuideEntry[] {
    const entries: MigrationGuideEntry[] = [];
    const breakingChanges = this.getBreakingChangesBetween(fromVersion, toVersion);
    const deprecations = this.getDeprecationsBetween(fromVersion, toVersion);

    // Create entries for breaking changes
    breakingChanges.forEach(change => {
      entries.push({
        title: `${change.component}: ${change.description}`,
        description: change.description,
        before: this.generateBeforeExample(change),
        after: this.generateAfterExample(change),
        steps: change.migration.split('\n').filter(step => step.trim()),
        complexity: this.getChangeComplexity(change),
        estimatedTime: this.estimateChangeTime(change)
      });
    });

    // Create entries for deprecations
    deprecations.forEach(deprecation => {
      if (deprecation.replacement && deprecation.example) {
        entries.push({
          title: `Replace deprecated ${deprecation.name}`,
          description: `${deprecation.name} is deprecated since ${deprecation.since}. ${deprecation.reason}`,
          before: this.extractBeforeFromExample(deprecation.example),
          after: this.extractAfterFromExample(deprecation.example),
          steps: [`Replace ${deprecation.name} with ${deprecation.replacement}`],
          complexity: 'simple',
          estimatedTime: '5 minutes'
        });
      }
    });

    return entries.sort((a, b) => {
      const complexityOrder = { simple: 0, moderate: 1, complex: 2 };
      return complexityOrder[a.complexity] - complexityOrder[b.complexity];
    });
  }

  /**
   * Gets all breaking changes between versions
   * @param fromVersion - Source version
   * @param toVersion - Target version
   * @returns Array of breaking changes
   */
  public getBreakingChangesBetween(fromVersion: string, toVersion: string): BreakingChange[] {
    const changes: BreakingChange[] = [];
    const fromSemVer = this.parseVersion(fromVersion);
    const toSemVer = this.parseVersion(toVersion);

    for (const [version, versionChanges] of this.breakingChangeRegistry) {
      const versionSemVer = this.parseVersion(version);
      if (this.isVersionBetween(versionSemVer, fromSemVer, toSemVer)) {
        changes.push(...versionChanges);
      }
    }

    return changes;
  }

  /**
   * Gets all deprecations between versions
   * @param fromVersion - Source version
   * @param toVersion - Target version
   * @returns Array of deprecations
   */
  public getDeprecationsBetween(fromVersion: string, toVersion: string): Deprecation[] {
    const deprecations: Deprecation[] = [];
    const fromSemVer = this.parseVersion(fromVersion);
    const toSemVer = this.parseVersion(toVersion);

    for (const [version, versionDeprecations] of this.deprecationRegistry) {
      const versionSemVer = this.parseVersion(version);
      if (this.isVersionBetween(versionSemVer, fromSemVer, toSemVer)) {
        deprecations.push(...versionDeprecations);
      }
    }

    return deprecations;
  }

  /**
   * Validates version range
   * @param version - Version to validate
   * @param range - Version range specification
   * @returns Whether version is in range
   */
  public isVersionInRange(version: string, range: VersionRange): boolean {
    if (range.exact) {
      return version === range.exact;
    }

    if (range.exclude?.includes(version)) {
      return false;
    }

    const versionSemVer = this.parseVersion(version);

    if (range.min) {
      const minSemVer = this.parseVersion(range.min);
      if (this.compareVersions(versionSemVer, minSemVer) < 0) {
        return false;
      }
    }

    if (range.max) {
      const maxSemVer = this.parseVersion(range.max);
      if (this.compareVersions(versionSemVer, maxSemVer) >= 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Registers a custom migration rule
   * @param rule - Migration rule to register
   */
  public registerMigrationRule(rule: MigrationRule): void {
    const key = `${rule.fromVersion}-${rule.toVersion}`;
    if (!this.migrationRules.has(key)) {
      this.migrationRules.set(key, []);
    }
    this.migrationRules.get(key)!.push(rule);
  }

  /**
   * Registers type version information
   * @param typeName - Name of the type
   * @param version - Version string
   * @param typeDefinition - Type definition
   */
  public registerTypeVersion(typeName: string, version: string, typeDefinition: any): void {
    if (!this.typeVersions.has(typeName)) {
      this.typeVersions.set(typeName, new Map());
    }
    this.typeVersions.get(typeName)!.set(version, typeDefinition);
  }

  // Private helper methods
  private calculateCompatibility(version: string, currentVersion: string): VersionCompatibility {
    const versionSemVer = this.parseVersion(version);
    const currentSemVer = this.parseVersion(currentVersion);

    const comparison = this.compareVersions(versionSemVer, currentSemVer);
    const breakingChanges = this.getBreakingChangesBetween(version, currentVersion);
    const deprecations = this.getDeprecationsBetween(version, currentVersion);

    let level: VersionCompatibility['level'] = 'full';
    let riskLevel: VersionCompatibility['riskLevel'] = 'low';

    if (versionSemVer.major !== currentSemVer.major) {
      level = 'breaking';
      riskLevel = 'high';
    } else if (breakingChanges.length > 0) {
      level = 'breaking';
      riskLevel = breakingChanges.some(c => c.impact === 'critical') ? 'critical' : 'medium';
    } else if (versionSemVer.minor !== currentSemVer.minor) {
      level = deprecations.length > 0 ? 'partial' : 'full';
      riskLevel = 'low';
    }

    return {
      version,
      compatible: level !== 'incompatible',
      level,
      breakingChanges,
      deprecations,
      migrationNotes: this.generateMigrationNotes(breakingChanges, deprecations),
      riskLevel
    };
  }

  private parseVersion(version: string): SemanticVersion {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+(.+))?$/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
      build: match[5]
    };
  }

  private compareVersions(a: SemanticVersion, b: SemanticVersion): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    if (a.patch !== b.patch) return a.patch - b.patch;
    
    // Handle pre-release versions
    if (a.prerelease && !b.prerelease) return -1;
    if (!a.prerelease && b.prerelease) return 1;
    if (a.prerelease && b.prerelease) {
      return a.prerelease.localeCompare(b.prerelease);
    }
    
    return 0;
  }

  private isVersionBetween(version: SemanticVersion, min: SemanticVersion, max: SemanticVersion): boolean {
    return this.compareVersions(version, min) > 0 && this.compareVersions(version, max) <= 0;
  }

  private findMigrationPath(fromVersion: string, toVersion: string): string[] {
    // Simplified migration path - in reality, this would be more complex
    return [`${fromVersion}-${toVersion}`];
  }

  private getCurrentTypeVersion(typeName: string): any {
    return this.getTypeVersion(typeName, VERSION);
  }

  private getTypeVersion(typeName: string, version: string): any {
    return this.typeVersions.get(typeName)?.get(version);
  }

  private compareTypes(current: any, target: any, issues: TypeCompatibilityIssue[], changes: TypeChange[]): void {
    // Simplified type comparison - would be more comprehensive in reality
    if (typeof current !== typeof target) {
      issues.push({
        type: 'property-changed',
        description: 'Type structure changed',
        member: 'type',
        severity: 'error'
      });
    }
  }

  private generateMigrationNotes(breakingChanges: BreakingChange[], deprecations: Deprecation[]): string[] {
    const notes: string[] = [];

    if (breakingChanges.length > 0) {
      notes.push(`${breakingChanges.length} breaking changes require attention`);
    }

    if (deprecations.length > 0) {
      notes.push(`${deprecations.length} deprecated features should be updated`);
    }

    return notes;
  }

  private generateBeforeExample(change: BreakingChange): string {
    // Generate example based on change type
    return `// Before (deprecated approach)`;
  }

  private generateAfterExample(change: BreakingChange): string {
    // Generate example based on change type
    return `// After (recommended approach)`;
  }

  private getChangeComplexity(change: BreakingChange): 'simple' | 'moderate' | 'complex' {
    switch (change.impact) {
      case 'low': return 'simple';
      case 'medium': return 'moderate';
      case 'high':
      case 'critical': return 'complex';
    }
  }

  private estimateChangeTime(change: BreakingChange): string {
    switch (change.impact) {
      case 'low': return '5-10 minutes';
      case 'medium': return '15-30 minutes';
      case 'high': return '1-2 hours';
      case 'critical': return '2-4 hours';
    }
  }

  private extractBeforeFromExample(example: string): string {
    const parts = example.split('// After:');
    return parts[0].replace('// Before:', '').trim();
  }

  private extractAfterFromExample(example: string): string {
    const parts = example.split('// After:');
    return parts[1]?.trim() || '';
  }

  private initializeVersionHistory(): void {
    // Initialize with known version compatibility information
  }

  private initializeMigrationRules(): void {
    // Initialize with migration rules for known version transitions
  }

  private initializeTypeVersions(): void {
    // Initialize with type version history
  }
}

// Global compatibility manager instance
const globalCompatibilityManager = new CompatibilityManager();

/**
 * Checks type compatibility between versions (global function)
 * @param typeName - Name of the type
 * @param version - Version to check
 * @returns Type compatibility result
 */
export function checkTypeCompatibility(typeName: string, version: string): TypeCompatibilityResult {
  return globalCompatibilityManager.checkTypeCompatibility(typeName, version);
}

/**
 * Migrates configuration data between versions (global function)
 * @param data - Data to migrate
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns Migrated data
 */
export function migrateConfiguration(data: any, fromVersion: string, toVersion: string): any {
  return globalCompatibilityManager.migrateData(data, fromVersion, toVersion);
}

/**
 * Generates migration guide between versions (global function)
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns Migration guide entries
 */
export function generateMigrationGuide(fromVersion: string, toVersion: string): MigrationGuideEntry[] {
  return globalCompatibilityManager.generateMigrationGuide(fromVersion, toVersion);
}

/**
 * Checks if version is compatible (global function)
 * @param version - Version to check
 * @param currentVersion - Current version
 * @returns Version compatibility information
 */
export function checkVersionCompatibility(version: string, currentVersion?: string): VersionCompatibility {
  return globalCompatibilityManager.checkVersion(version, currentVersion);
}

// Export the global manager
export { globalCompatibilityManager as compatibilityManager };