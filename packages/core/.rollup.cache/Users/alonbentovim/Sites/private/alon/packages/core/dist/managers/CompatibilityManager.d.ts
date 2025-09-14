/**
 * @fileoverview CompatibilityManager - Backward compatibility and version management
 * @version 1.0.0
 * @author Alon Search Team
 * @description Manages type compatibility across versions, breaking change detection,
 * compatibility reporting, and migration guide generation for seamless version upgrades
 * and backward compatibility maintenance.
 *
 * @example Basic Usage
 * ```typescript
 * const compatibility = new CompatibilityManager();
 * const report = await compatibility.validateCompatibility('1.0.0', '1.1.0');
 * const migration = compatibility.generateMigrationGuide('0.9.0', '1.0.0');
 * ```
 *
 * @since 1.0.0
 */
import { DeprecatedFeature, TypeCompatibilityInfo } from '../types/index';
/**
 * Interface for version information
 * @interface VersionInfo
 */
export interface VersionInfo {
    /** Version string (semantic versioning) */
    version: string;
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
    /** Release date */
    releaseDate: Date;
    /** Version stability */
    stability: 'alpha' | 'beta' | 'rc' | 'stable';
}
/**
 * Interface for breaking change information
 * @interface BreakingChange
 */
export interface BreakingChange {
    /** Change identifier */
    id: string;
    /** Change description */
    description: string;
    /** Version where change was introduced */
    introducedIn: string;
    /** Affected components or APIs */
    affectedAPIs: string[];
    /** Migration strategy */
    migrationStrategy: {
        description: string;
        codeExample?: {
            before: string;
            after: string;
        };
        automatable: boolean;
    };
    /** Impact severity */
    severity: 'low' | 'medium' | 'high' | 'critical';
    /** Category of change */
    category: 'interface' | 'type' | 'enum' | 'function' | 'property' | 'behavior';
}
/**
 * Interface for compatibility report
 * @interface CompatibilityReport
 */
export interface CompatibilityReport {
    /** Source version */
    fromVersion: string;
    /** Target version */
    toVersion: string;
    /** Overall compatibility status */
    compatible: boolean;
    /** Compatibility level */
    compatibilityLevel: 'full' | 'partial' | 'breaking' | 'incompatible';
    /** Breaking changes found */
    breakingChanges: BreakingChange[];
    /** Deprecated features */
    deprecatedFeatures: DeprecatedFeature[];
    /** Added features */
    addedFeatures: Array<{
        name: string;
        description: string;
        category: string;
        examples?: string[];
    }>;
    /** Migration complexity */
    migrationComplexity: 'trivial' | 'easy' | 'moderate' | 'complex' | 'difficult';
    /** Estimated migration effort */
    migrationEffort: {
        timeEstimate: string;
        riskLevel: 'low' | 'medium' | 'high';
        requiredActions: string[];
    };
}
/**
 * Interface for migration guide
 * @interface MigrationGuide
 */
export interface MigrationGuide {
    /** Source and target versions */
    versions: {
        from: string;
        to: string;
    };
    /** Migration overview */
    overview: {
        summary: string;
        complexity: string;
        estimatedTime: string;
        prerequisites: string[];
    };
    /** Step-by-step migration steps */
    steps: Array<{
        id: string;
        title: string;
        description: string;
        codeChanges?: Array<{
            description: string;
            before: string;
            after: string;
        }>;
        validation?: string[];
        optional: boolean;
    }>;
    /** Common migration issues */
    commonIssues: Array<{
        issue: string;
        solution: string;
        prevention?: string;
    }>;
    /** Rollback strategy */
    rollback: {
        possible: boolean;
        instructions?: string[];
        risks?: string[];
    };
}
/**
 * Interface for type change detection
 * @interface TypeChange
 */
export interface TypeChange {
    /** Change type */
    type: 'added' | 'removed' | 'modified' | 'deprecated';
    /** Entity that changed */
    entity: {
        name: string;
        kind: 'interface' | 'type' | 'enum' | 'property' | 'method';
        path: string;
    };
    /** Change details */
    details: {
        description: string;
        oldSignature?: string;
        newSignature?: string;
        impact: 'none' | 'minor' | 'major' | 'breaking';
    };
    /** Mitigation strategy */
    mitigation?: string;
}
/**
 * CompatibilityManager - Comprehensive version compatibility management
 *
 * Provides advanced type compatibility validation, breaking change detection,
 * migration guide generation, and compatibility reporting for seamless version
 * management and upgrade paths.
 *
 * @class CompatibilityManager
 * @example
 * ```typescript
 * // Initialize compatibility manager
 * const compatibility = new CompatibilityManager();
 *
 * // Register version information
 * compatibility.registerVersion({
 *   version: '1.0.0',
 *   major: 1,
 *   minor: 0,
 *   patch: 0,
 *   releaseDate: new Date('2024-01-01'),
 *   stability: 'stable'
 * });
 *
 * // Check compatibility between versions
 * const report = await compatibility.validateCompatibility('0.9.0', '1.0.0');
 * if (report.breakingChanges.length > 0) {
 *   console.log('Breaking changes detected:', report.breakingChanges);
 * }
 *
 * // Generate migration guide
 * const guide = compatibility.generateMigrationGuide('0.9.0', '1.0.0');
 * console.log('Migration steps:', guide.steps);
 *
 * // Check if a feature is deprecated
 * const deprecated = compatibility.isFeatureDeprecated('OldSearchInterface', '1.1.0');
 * ```
 */
export declare class CompatibilityManager {
    private versions;
    private breakingChanges;
    private deprecatedFeatures;
    private typeChanges;
    private migrationStrategies;
    constructor();
    /**
     * Initialize version history
     * @private
     */
    private initializeVersionHistory;
    /**
     * Initialize breaking changes registry
     * @private
     */
    private initializeBreakingChanges;
    /**
     * Initialize deprecated features registry
     * @private
     */
    private initializeDeprecatedFeatures;
    /**
     * Register a version
     * @param version - Version information
     */
    registerVersion(version: VersionInfo): void;
    /**
     * Validate compatibility between two versions
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Compatibility report
     */
    validateCompatibility(fromVersion: string, toVersion: string): Promise<CompatibilityReport>;
    /**
     * Generate migration guide
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Migration guide
     */
    generateMigrationGuide(fromVersion: string, toVersion: string): MigrationGuide;
    /**
     * Check if a feature is deprecated
     * @param featureName - Feature name
     * @param version - Version to check
     * @returns Deprecated feature info or null
     */
    isFeatureDeprecated(featureName: string, version: string): DeprecatedFeature | null;
    /**
     * Get type compatibility information
     * @param version - Version to get info for
     * @returns Type compatibility information
     */
    getTypeCompatibilityInfo(version: string): TypeCompatibilityInfo;
    /**
     * Detect breaking changes in type definitions
     * @param oldTypes - Previous type definitions
     * @param newTypes - New type definitions
     * @returns Array of detected changes
     */
    detectTypeChanges(oldTypes: Record<string, any>, newTypes: Record<string, any>): TypeChange[];
    /**
     * Get breaking changes between versions
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Array of breaking changes
     * @private
     */
    private getBreakingChanges;
    /**
     * Get deprecated features between versions
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Array of deprecated features
     * @private
     */
    private getDeprecatedFeatures;
    /**
     * Get added features between versions
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Array of added features
     * @private
     */
    private getAddedFeatures;
    /**
     * Determine compatibility level
     * @param fromInfo - Source version info
     * @param toInfo - Target version info
     * @param breakingChanges - Breaking changes
     * @returns Compatibility level
     * @private
     */
    private determineCompatibilityLevel;
    /**
     * Calculate migration complexity
     * @param breakingChanges - Breaking changes
     * @returns Migration complexity
     * @private
     */
    private calculateMigrationComplexity;
    /**
     * Estimate migration effort
     * @param breakingChanges - Breaking changes
     * @param complexity - Migration complexity
     * @returns Migration effort estimate
     * @private
     */
    private estimateMigrationEffort;
    /**
     * Generate migration steps
     * @param breakingChanges - Breaking changes
     * @param deprecatedFeatures - Deprecated features
     * @returns Migration steps
     * @private
     */
    private generateMigrationSteps;
    /**
     * Generate common migration issues
     * @param breakingChanges - Breaking changes
     * @returns Common issues
     * @private
     */
    private generateCommonIssues;
    /**
     * Check if version is within range
     * @param version - Version to check
     * @param fromVersion - Range start
     * @param toVersion - Range end
     * @returns Whether version is in range
     * @private
     */
    private isVersionInRange;
    /**
     * Check if version is greater than another
     * @param version1 - First version
     * @param version2 - Second version
     * @returns Whether version1 > version2
     * @private
     */
    private isVersionGreater;
    /**
     * Check if version is less than or equal to another
     * @param version1 - First version
     * @param version2 - Second version
     * @returns Whether version1 <= version2
     * @private
     */
    private isVersionLessOrEqual;
    /**
     * Parse version string
     * @param version - Version string
     * @returns Parsed version components
     * @private
     */
    private parseVersion;
    /**
     * Get minimum supported version
     * @param currentVersion - Current version
     * @returns Minimum supported version
     * @private
     */
    private getMinimumSupportedVersion;
    /**
     * Estimate time for migration
     * @param breakingChanges - Breaking changes
     * @returns Time estimate
     * @private
     */
    private estimateTimeForMigration;
    /**
     * Get compatibility statistics
     * @returns Manager statistics
     */
    getStatistics(): {
        totalVersions: number;
        totalBreakingChanges: number;
        totalDeprecatedFeatures: number;
        migrationGuides: number;
    };
}
//# sourceMappingURL=CompatibilityManager.d.ts.map