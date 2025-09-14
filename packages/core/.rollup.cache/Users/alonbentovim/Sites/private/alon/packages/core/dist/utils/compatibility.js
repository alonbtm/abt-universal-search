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
import { VERSION } from '../types';
/**
 * Compatibility Manager for version management
 */
export class CompatibilityManager {
    constructor() {
        this.versionHistory = new Map();
        this.migrationRules = new Map();
        this.typeVersions = new Map();
        this.breakingChangeRegistry = new Map();
        this.deprecationRegistry = new Map();
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
    checkVersion(version, currentVersion = VERSION) {
        const cacheKey = `${version}-${currentVersion}`;
        if (this.versionHistory.has(cacheKey)) {
            return this.versionHistory.get(cacheKey);
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
    checkTypeCompatibility(typeName, version) {
        const currentTypeVersion = this.getCurrentTypeVersion(typeName);
        const targetTypeVersion = this.getTypeVersion(typeName, version);
        const issues = [];
        const changes = [];
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
    migrateData(data, fromVersion, toVersion) {
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
    generateMigrationGuide(fromVersion, toVersion) {
        const entries = [];
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
    getBreakingChangesBetween(fromVersion, toVersion) {
        const changes = [];
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
    getDeprecationsBetween(fromVersion, toVersion) {
        const deprecations = [];
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
    isVersionInRange(version, range) {
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
    registerMigrationRule(rule) {
        const key = `${rule.fromVersion}-${rule.toVersion}`;
        if (!this.migrationRules.has(key)) {
            this.migrationRules.set(key, []);
        }
        this.migrationRules.get(key).push(rule);
    }
    /**
     * Registers type version information
     * @param typeName - Name of the type
     * @param version - Version string
     * @param typeDefinition - Type definition
     */
    registerTypeVersion(typeName, version, typeDefinition) {
        if (!this.typeVersions.has(typeName)) {
            this.typeVersions.set(typeName, new Map());
        }
        this.typeVersions.get(typeName).set(version, typeDefinition);
    }
    // Private helper methods
    calculateCompatibility(version, currentVersion) {
        const versionSemVer = this.parseVersion(version);
        const currentSemVer = this.parseVersion(currentVersion);
        const comparison = this.compareVersions(versionSemVer, currentSemVer);
        const breakingChanges = this.getBreakingChangesBetween(version, currentVersion);
        const deprecations = this.getDeprecationsBetween(version, currentVersion);
        let level = 'full';
        let riskLevel = 'low';
        if (versionSemVer.major !== currentSemVer.major) {
            level = 'breaking';
            riskLevel = 'high';
        }
        else if (breakingChanges.length > 0) {
            level = 'breaking';
            riskLevel = breakingChanges.some(c => c.impact === 'critical') ? 'critical' : 'medium';
        }
        else if (versionSemVer.minor !== currentSemVer.minor) {
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
    parseVersion(version) {
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
    compareVersions(a, b) {
        if (a.major !== b.major)
            return a.major - b.major;
        if (a.minor !== b.minor)
            return a.minor - b.minor;
        if (a.patch !== b.patch)
            return a.patch - b.patch;
        // Handle pre-release versions
        if (a.prerelease && !b.prerelease)
            return -1;
        if (!a.prerelease && b.prerelease)
            return 1;
        if (a.prerelease && b.prerelease) {
            return a.prerelease.localeCompare(b.prerelease);
        }
        return 0;
    }
    isVersionBetween(version, min, max) {
        return this.compareVersions(version, min) > 0 && this.compareVersions(version, max) <= 0;
    }
    findMigrationPath(fromVersion, toVersion) {
        // Simplified migration path - in reality, this would be more complex
        return [`${fromVersion}-${toVersion}`];
    }
    getCurrentTypeVersion(typeName) {
        return this.getTypeVersion(typeName, VERSION);
    }
    getTypeVersion(typeName, version) {
        return this.typeVersions.get(typeName)?.get(version);
    }
    compareTypes(current, target, issues, changes) {
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
    generateMigrationNotes(breakingChanges, deprecations) {
        const notes = [];
        if (breakingChanges.length > 0) {
            notes.push(`${breakingChanges.length} breaking changes require attention`);
        }
        if (deprecations.length > 0) {
            notes.push(`${deprecations.length} deprecated features should be updated`);
        }
        return notes;
    }
    generateBeforeExample(change) {
        // Generate example based on change type
        return `// Before (deprecated approach)`;
    }
    generateAfterExample(change) {
        // Generate example based on change type
        return `// After (recommended approach)`;
    }
    getChangeComplexity(change) {
        switch (change.impact) {
            case 'low': return 'simple';
            case 'medium': return 'moderate';
            case 'high':
            case 'critical': return 'complex';
        }
    }
    estimateChangeTime(change) {
        switch (change.impact) {
            case 'low': return '5-10 minutes';
            case 'medium': return '15-30 minutes';
            case 'high': return '1-2 hours';
            case 'critical': return '2-4 hours';
        }
    }
    extractBeforeFromExample(example) {
        const parts = example.split('// After:');
        return parts[0].replace('// Before:', '').trim();
    }
    extractAfterFromExample(example) {
        const parts = example.split('// After:');
        return parts[1]?.trim() || '';
    }
    initializeVersionHistory() {
        // Initialize with known version compatibility information
    }
    initializeMigrationRules() {
        // Initialize with migration rules for known version transitions
    }
    initializeTypeVersions() {
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
export function checkTypeCompatibility(typeName, version) {
    return globalCompatibilityManager.checkTypeCompatibility(typeName, version);
}
/**
 * Migrates configuration data between versions (global function)
 * @param data - Data to migrate
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns Migrated data
 */
export function migrateConfiguration(data, fromVersion, toVersion) {
    return globalCompatibilityManager.migrateData(data, fromVersion, toVersion);
}
/**
 * Generates migration guide between versions (global function)
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns Migration guide entries
 */
export function generateMigrationGuide(fromVersion, toVersion) {
    return globalCompatibilityManager.generateMigrationGuide(fromVersion, toVersion);
}
/**
 * Checks if version is compatible (global function)
 * @param version - Version to check
 * @param currentVersion - Current version
 * @returns Version compatibility information
 */
export function checkVersionCompatibility(version, currentVersion) {
    return globalCompatibilityManager.checkVersion(version, currentVersion);
}
// Export the global manager
export { globalCompatibilityManager as compatibilityManager };
//# sourceMappingURL=compatibility.js.map