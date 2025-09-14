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
export declare class CompatibilityManager {
    private versionHistory;
    private migrationRules;
    private typeVersions;
    private breakingChangeRegistry;
    private deprecationRegistry;
    constructor();
    /**
     * Checks if a version is compatible with the current version
     * @param version - Version to check
     * @param currentVersion - Current version (defaults to package version)
     * @returns Compatibility information
     */
    checkVersion(version: string, currentVersion?: string): VersionCompatibility;
    /**
     * Checks type compatibility between versions
     * @param typeName - Name of the type to check
     * @param version - Version to check compatibility with
     * @returns Type compatibility result
     */
    checkTypeCompatibility(typeName: string, version: string): TypeCompatibilityResult;
    /**
     * Migrates data from one version to another
     * @param data - Data to migrate
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Migrated data
     */
    migrateData(data: any, fromVersion: string, toVersion: string): any;
    /**
     * Generates a migration guide between versions
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Migration guide entries
     */
    generateMigrationGuide(fromVersion: string, toVersion: string): MigrationGuideEntry[];
    /**
     * Gets all breaking changes between versions
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Array of breaking changes
     */
    getBreakingChangesBetween(fromVersion: string, toVersion: string): BreakingChange[];
    /**
     * Gets all deprecations between versions
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Array of deprecations
     */
    getDeprecationsBetween(fromVersion: string, toVersion: string): Deprecation[];
    /**
     * Validates version range
     * @param version - Version to validate
     * @param range - Version range specification
     * @returns Whether version is in range
     */
    isVersionInRange(version: string, range: VersionRange): boolean;
    /**
     * Registers a custom migration rule
     * @param rule - Migration rule to register
     */
    registerMigrationRule(rule: MigrationRule): void;
    /**
     * Registers type version information
     * @param typeName - Name of the type
     * @param version - Version string
     * @param typeDefinition - Type definition
     */
    registerTypeVersion(typeName: string, version: string, typeDefinition: any): void;
    private calculateCompatibility;
    private parseVersion;
    private compareVersions;
    private isVersionBetween;
    private findMigrationPath;
    private getCurrentTypeVersion;
    private getTypeVersion;
    private compareTypes;
    private generateMigrationNotes;
    private generateBeforeExample;
    private generateAfterExample;
    private getChangeComplexity;
    private estimateChangeTime;
    private extractBeforeFromExample;
    private extractAfterFromExample;
    private initializeVersionHistory;
    private initializeMigrationRules;
    private initializeTypeVersions;
}
declare const globalCompatibilityManager: CompatibilityManager;
/**
 * Checks type compatibility between versions (global function)
 * @param typeName - Name of the type
 * @param version - Version to check
 * @returns Type compatibility result
 */
export declare function checkTypeCompatibility(typeName: string, version: string): TypeCompatibilityResult;
/**
 * Migrates configuration data between versions (global function)
 * @param data - Data to migrate
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns Migrated data
 */
export declare function migrateConfiguration(data: any, fromVersion: string, toVersion: string): any;
/**
 * Generates migration guide between versions (global function)
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns Migration guide entries
 */
export declare function generateMigrationGuide(fromVersion: string, toVersion: string): MigrationGuideEntry[];
/**
 * Checks if version is compatible (global function)
 * @param version - Version to check
 * @param currentVersion - Current version
 * @returns Version compatibility information
 */
export declare function checkVersionCompatibility(version: string, currentVersion?: string): VersionCompatibility;
export { globalCompatibilityManager as compatibilityManager };
//# sourceMappingURL=compatibility.d.ts.map