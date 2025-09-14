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
export class CompatibilityManager {
    constructor() {
        this.versions = new Map();
        this.breakingChanges = new Map(); // version -> changes
        this.deprecatedFeatures = new Map(); // version -> features
        this.typeChanges = new Map(); // version -> changes
        this.migrationStrategies = new Map(); // from-to -> guide
        this.initializeVersionHistory();
        this.initializeBreakingChanges();
        this.initializeDeprecatedFeatures();
    }
    /**
     * Initialize version history
     * @private
     */
    initializeVersionHistory() {
        // Register known versions
        this.registerVersion({
            version: '1.0.0',
            major: 1,
            minor: 0,
            patch: 0,
            releaseDate: new Date('2024-01-01'),
            stability: 'stable'
        });
        this.registerVersion({
            version: '0.9.0',
            major: 0,
            minor: 9,
            patch: 0,
            releaseDate: new Date('2023-11-01'),
            stability: 'stable'
        });
        this.registerVersion({
            version: '0.8.0',
            major: 0,
            minor: 8,
            patch: 0,
            releaseDate: new Date('2023-09-01'),
            stability: 'stable'
        });
    }
    /**
     * Initialize breaking changes registry
     * @private
     */
    initializeBreakingChanges() {
        // Breaking changes in version 1.0.0
        const v100Changes = [
            {
                id: 'search-config-restructure',
                description: 'SearchConfiguration interface restructured with new required properties',
                introducedIn: '1.0.0',
                affectedAPIs: ['SearchConfiguration', 'UIConfig', 'QueryConfig'],
                migrationStrategy: {
                    description: 'Update configuration objects to use new structure',
                    codeExample: {
                        before: `const config = {
  apiUrl: 'https://api.example.com',
  theme: 'light',
  debounce: 300
};`,
                        after: `const config: SearchConfiguration = {
  dataSources: [{ type: 'api', url: 'https://api.example.com' }],
  ui: { theme: 'light' },
  search: { debounceDelay: 300 }
};`
                    },
                    automatable: true
                },
                severity: 'high',
                category: 'interface'
            },
            {
                id: 'result-type-enum',
                description: 'SearchResult.type changed from string to SearchResultType enum',
                introducedIn: '1.0.0',
                affectedAPIs: ['SearchResult', 'SearchResultType'],
                migrationStrategy: {
                    description: 'Replace string types with enum values',
                    codeExample: {
                        before: `result.type = 'product';`,
                        after: `result.type = SearchResultType.PRODUCT;`
                    },
                    automatable: true
                },
                severity: 'medium',
                category: 'type'
            }
        ];
        this.breakingChanges.set('1.0.0', v100Changes);
        // Breaking changes in version 0.9.0
        const v090Changes = [
            {
                id: 'event-handler-signature',
                description: 'Event handler signatures changed to be more type-safe',
                introducedIn: '0.9.0',
                affectedAPIs: ['EventHandler', 'SearchEventData'],
                migrationStrategy: {
                    description: 'Update event handler function signatures',
                    codeExample: {
                        before: `onSearch: (query) => { ... }`,
                        after: `onSearch: (data: SearchEventData) => { ... }`
                    },
                    automatable: false
                },
                severity: 'low',
                category: 'function'
            }
        ];
        this.breakingChanges.set('0.9.0', v090Changes);
    }
    /**
     * Initialize deprecated features registry
     * @private
     */
    initializeDeprecatedFeatures() {
        // Deprecated in version 1.0.0
        const v100Deprecated = [
            {
                name: 'LegacySearchConfig',
                deprecatedIn: '1.0.0',
                removedIn: '2.0.0',
                replacement: 'SearchConfiguration',
                notes: 'Use the new SearchConfiguration interface for better type safety and features'
            },
            {
                name: 'SimpleResultFormat',
                deprecatedIn: '1.0.0',
                removedIn: '1.5.0',
                replacement: 'SearchResult',
                notes: 'Migrate to SearchResult interface for consistent result structure'
            }
        ];
        this.deprecatedFeatures.set('1.0.0', v100Deprecated);
        // Deprecated in version 0.9.0
        const v090Deprecated = [
            {
                name: 'BasicEventHandler',
                deprecatedIn: '0.9.0',
                removedIn: '1.0.0',
                replacement: 'GenericEventHandler<T>',
                notes: 'Use generic event handler for better type safety'
            }
        ];
        this.deprecatedFeatures.set('0.9.0', v090Deprecated);
    }
    /**
     * Register a version
     * @param version - Version information
     */
    registerVersion(version) {
        this.versions.set(version.version, version);
    }
    /**
     * Validate compatibility between two versions
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Compatibility report
     */
    async validateCompatibility(fromVersion, toVersion) {
        const fromInfo = this.versions.get(fromVersion);
        const toInfo = this.versions.get(toVersion);
        if (!fromInfo || !toInfo) {
            throw new Error(`Unknown version: ${!fromInfo ? fromVersion : toVersion}`);
        }
        // Collect breaking changes between versions
        const breakingChanges = this.getBreakingChanges(fromVersion, toVersion);
        const deprecatedFeatures = this.getDeprecatedFeatures(fromVersion, toVersion);
        const addedFeatures = this.getAddedFeatures(fromVersion, toVersion);
        // Determine compatibility level
        const compatibilityLevel = this.determineCompatibilityLevel(fromInfo, toInfo, breakingChanges);
        // Calculate migration complexity
        const migrationComplexity = this.calculateMigrationComplexity(breakingChanges);
        const migrationEffort = this.estimateMigrationEffort(breakingChanges, migrationComplexity);
        return {
            fromVersion,
            toVersion,
            compatible: breakingChanges.length === 0,
            compatibilityLevel,
            breakingChanges,
            deprecatedFeatures,
            addedFeatures,
            migrationComplexity,
            migrationEffort
        };
    }
    /**
     * Generate migration guide
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Migration guide
     */
    generateMigrationGuide(fromVersion, toVersion) {
        const guideKey = `${fromVersion}-${toVersion}`;
        const existingGuide = this.migrationStrategies.get(guideKey);
        if (existingGuide) {
            return existingGuide;
        }
        const breakingChanges = this.getBreakingChanges(fromVersion, toVersion);
        const deprecatedFeatures = this.getDeprecatedFeatures(fromVersion, toVersion);
        // Generate migration steps
        const steps = this.generateMigrationSteps(breakingChanges, deprecatedFeatures);
        // Generate common issues
        const commonIssues = this.generateCommonIssues(breakingChanges);
        const guide = {
            versions: { from: fromVersion, to: toVersion },
            overview: {
                summary: `Migration from ${fromVersion} to ${toVersion}`,
                complexity: this.calculateMigrationComplexity(breakingChanges),
                estimatedTime: this.estimateTimeForMigration(breakingChanges),
                prerequisites: [
                    'Backup your current implementation',
                    'Review breaking changes documentation',
                    'Update TypeScript to version 5.3+',
                    'Test migration in development environment'
                ]
            },
            steps,
            commonIssues,
            rollback: {
                possible: true,
                instructions: [
                    'Revert to previous version in package.json',
                    'Run npm install to restore dependencies',
                    'Remove new configuration properties',
                    'Test application functionality'
                ],
                risks: [
                    'Loss of new features and improvements',
                    'Potential security vulnerabilities in older versions'
                ]
            }
        };
        this.migrationStrategies.set(guideKey, guide);
        return guide;
    }
    /**
     * Check if a feature is deprecated
     * @param featureName - Feature name
     * @param version - Version to check
     * @returns Deprecated feature info or null
     */
    isFeatureDeprecated(featureName, version) {
        // Check all versions up to the specified version
        for (const [versionKey, features] of this.deprecatedFeatures.entries()) {
            if (this.isVersionLessOrEqual(versionKey, version)) {
                const feature = features.find(f => f.name === featureName);
                if (feature) {
                    return feature;
                }
            }
        }
        return null;
    }
    /**
     * Get type compatibility information
     * @param version - Version to get info for
     * @returns Type compatibility information
     */
    getTypeCompatibilityInfo(version) {
        const versionInfo = this.versions.get(version);
        if (!versionInfo) {
            throw new Error(`Unknown version: ${version}`);
        }
        const breakingChanges = Array.from(this.breakingChanges.entries())
            .filter(([v]) => this.isVersionLessOrEqual(version, v))
            .flatMap(([, changes]) => changes.map(c => c.description));
        const deprecated = Array.from(this.deprecatedFeatures.entries())
            .filter(([v]) => this.isVersionLessOrEqual(version, v))
            .flatMap(([, features]) => features);
        return {
            version,
            minimumVersion: this.getMinimumSupportedVersion(version),
            breakingChanges,
            deprecated
        };
    }
    /**
     * Detect breaking changes in type definitions
     * @param oldTypes - Previous type definitions
     * @param newTypes - New type definitions
     * @returns Array of detected changes
     */
    detectTypeChanges(oldTypes, newTypes) {
        const changes = [];
        // Check for removed types
        for (const typeName of Object.keys(oldTypes)) {
            if (!(typeName in newTypes)) {
                changes.push({
                    type: 'removed',
                    entity: {
                        name: typeName,
                        kind: 'interface',
                        path: typeName
                    },
                    details: {
                        description: `Type '${typeName}' was removed`,
                        impact: 'breaking'
                    },
                    mitigation: 'Update code to use alternative types or remove dependencies'
                });
            }
        }
        // Check for added types
        for (const typeName of Object.keys(newTypes)) {
            if (!(typeName in oldTypes)) {
                changes.push({
                    type: 'added',
                    entity: {
                        name: typeName,
                        kind: 'interface',
                        path: typeName
                    },
                    details: {
                        description: `Type '${typeName}' was added`,
                        impact: 'none'
                    }
                });
            }
        }
        // Check for modified types (simplified comparison)
        for (const typeName of Object.keys(oldTypes)) {
            if (typeName in newTypes) {
                const oldType = JSON.stringify(oldTypes[typeName]);
                const newType = JSON.stringify(newTypes[typeName]);
                if (oldType !== newType) {
                    changes.push({
                        type: 'modified',
                        entity: {
                            name: typeName,
                            kind: 'interface',
                            path: typeName
                        },
                        details: {
                            description: `Type '${typeName}' was modified`,
                            oldSignature: oldType.slice(0, 100) + '...',
                            newSignature: newType.slice(0, 100) + '...',
                            impact: 'major'
                        },
                        mitigation: 'Review type changes and update usage accordingly'
                    });
                }
            }
        }
        return changes;
    }
    /**
     * Get breaking changes between versions
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Array of breaking changes
     * @private
     */
    getBreakingChanges(fromVersion, toVersion) {
        const changes = [];
        for (const [version, versionChanges] of this.breakingChanges.entries()) {
            if (this.isVersionInRange(version, fromVersion, toVersion)) {
                changes.push(...versionChanges);
            }
        }
        return changes;
    }
    /**
     * Get deprecated features between versions
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Array of deprecated features
     * @private
     */
    getDeprecatedFeatures(fromVersion, toVersion) {
        const features = [];
        for (const [version, versionFeatures] of this.deprecatedFeatures.entries()) {
            if (this.isVersionInRange(version, fromVersion, toVersion)) {
                features.push(...versionFeatures);
            }
        }
        return features;
    }
    /**
     * Get added features between versions
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Array of added features
     * @private
     */
    getAddedFeatures(fromVersion, toVersion) {
        // This would be populated from feature tracking
        // For now, return empty array
        return [];
    }
    /**
     * Determine compatibility level
     * @param fromInfo - Source version info
     * @param toInfo - Target version info
     * @param breakingChanges - Breaking changes
     * @returns Compatibility level
     * @private
     */
    determineCompatibilityLevel(fromInfo, toInfo, breakingChanges) {
        // Major version change is always breaking
        if (fromInfo.major !== toInfo.major) {
            return 'breaking';
        }
        // No breaking changes = full compatibility
        if (breakingChanges.length === 0) {
            return 'full';
        }
        // Evaluate severity of breaking changes
        const hasHighSeverity = breakingChanges.some(c => c.severity === 'critical' || c.severity === 'high');
        if (hasHighSeverity) {
            return 'breaking';
        }
        else {
            return 'partial';
        }
    }
    /**
     * Calculate migration complexity
     * @param breakingChanges - Breaking changes
     * @returns Migration complexity
     * @private
     */
    calculateMigrationComplexity(breakingChanges) {
        if (breakingChanges.length === 0) {
            return 'trivial';
        }
        const automatableCount = breakingChanges.filter(c => c.migrationStrategy.automatable).length;
        const highSeverityCount = breakingChanges.filter(c => c.severity === 'critical' || c.severity === 'high').length;
        if (highSeverityCount > 2 || breakingChanges.length > 10) {
            return 'difficult';
        }
        else if (highSeverityCount > 0 || breakingChanges.length > 5) {
            return 'complex';
        }
        else if (automatableCount < breakingChanges.length / 2) {
            return 'moderate';
        }
        else {
            return 'easy';
        }
    }
    /**
     * Estimate migration effort
     * @param breakingChanges - Breaking changes
     * @param complexity - Migration complexity
     * @returns Migration effort estimate
     * @private
     */
    estimateMigrationEffort(breakingChanges, complexity) {
        const timeEstimates = {
            'trivial': '< 1 hour',
            'easy': '1-4 hours',
            'moderate': '4-8 hours',
            'complex': '1-3 days',
            'difficult': '1+ weeks'
        };
        const riskLevels = {
            'trivial': 'low',
            'easy': 'low',
            'moderate': 'medium',
            'complex': 'medium',
            'difficult': 'high'
        };
        const requiredActions = breakingChanges.map(change => `Update ${change.affectedAPIs.join(', ')} usage`);
        return {
            timeEstimate: timeEstimates[complexity] || 'Unknown',
            riskLevel: riskLevels[complexity] || 'medium',
            requiredActions
        };
    }
    /**
     * Generate migration steps
     * @param breakingChanges - Breaking changes
     * @param deprecatedFeatures - Deprecated features
     * @returns Migration steps
     * @private
     */
    generateMigrationSteps(breakingChanges, deprecatedFeatures) {
        const steps = [];
        // Add steps for breaking changes
        breakingChanges.forEach((change, index) => {
            steps.push({
                id: `breaking-change-${index + 1}`,
                title: `Address: ${change.description}`,
                description: change.migrationStrategy.description,
                codeChanges: change.migrationStrategy.codeExample ? [{
                        description: `Update ${change.affectedAPIs.join(', ')}`,
                        before: change.migrationStrategy.codeExample.before,
                        after: change.migrationStrategy.codeExample.after
                    }] : undefined,
                validation: [
                    'TypeScript compilation succeeds',
                    'Existing tests continue to pass',
                    'New functionality works as expected'
                ],
                optional: false
            });
        });
        // Add steps for deprecated features
        deprecatedFeatures.forEach((feature, index) => {
            if (feature.replacement) {
                steps.push({
                    id: `deprecated-${index + 1}`,
                    title: `Replace deprecated: ${feature.name}`,
                    description: `Replace ${feature.name} with ${feature.replacement}`,
                    codeChanges: [{
                            description: `Update ${feature.name} usage`,
                            before: `// Using ${feature.name}`,
                            after: `// Using ${feature.replacement}`
                        }],
                    validation: [
                        'No deprecation warnings in console',
                        'Functionality remains unchanged'
                    ],
                    optional: true
                });
            }
        });
        return steps;
    }
    /**
     * Generate common migration issues
     * @param breakingChanges - Breaking changes
     * @returns Common issues
     * @private
     */
    generateCommonIssues(breakingChanges) {
        const issues = [];
        // Generic common issues
        issues.push({
            issue: 'TypeScript compilation errors',
            solution: 'Update type annotations and interface implementations',
            prevention: 'Use strict TypeScript configuration and regular updates'
        });
        issues.push({
            issue: 'Runtime errors due to changed APIs',
            solution: 'Test thoroughly in development environment',
            prevention: 'Write comprehensive unit tests for API usage'
        });
        // Issues specific to breaking changes
        if (breakingChanges.some(c => c.category === 'interface')) {
            issues.push({
                issue: 'Configuration objects not matching new interface',
                solution: 'Update configuration objects to match new interface structure',
                prevention: 'Use TypeScript for configuration validation'
            });
        }
        return issues;
    }
    /**
     * Check if version is within range
     * @param version - Version to check
     * @param fromVersion - Range start
     * @param toVersion - Range end
     * @returns Whether version is in range
     * @private
     */
    isVersionInRange(version, fromVersion, toVersion) {
        return this.isVersionGreater(version, fromVersion) &&
            this.isVersionLessOrEqual(version, toVersion);
    }
    /**
     * Check if version is greater than another
     * @param version1 - First version
     * @param version2 - Second version
     * @returns Whether version1 > version2
     * @private
     */
    isVersionGreater(version1, version2) {
        const v1 = this.parseVersion(version1);
        const v2 = this.parseVersion(version2);
        return v1.major > v2.major ||
            (v1.major === v2.major && v1.minor > v2.minor) ||
            (v1.major === v2.major && v1.minor === v2.minor && v1.patch > v2.patch);
    }
    /**
     * Check if version is less than or equal to another
     * @param version1 - First version
     * @param version2 - Second version
     * @returns Whether version1 <= version2
     * @private
     */
    isVersionLessOrEqual(version1, version2) {
        return version1 === version2 || !this.isVersionGreater(version1, version2);
    }
    /**
     * Parse version string
     * @param version - Version string
     * @returns Parsed version components
     * @private
     */
    parseVersion(version) {
        const parts = version.split('.').map(Number);
        return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            patch: parts[2] || 0
        };
    }
    /**
     * Get minimum supported version
     * @param currentVersion - Current version
     * @returns Minimum supported version
     * @private
     */
    getMinimumSupportedVersion(currentVersion) {
        const current = this.parseVersion(currentVersion);
        // Support previous minor version within same major
        return `${current.major}.${Math.max(0, current.minor - 1)}.0`;
    }
    /**
     * Estimate time for migration
     * @param breakingChanges - Breaking changes
     * @returns Time estimate
     * @private
     */
    estimateTimeForMigration(breakingChanges) {
        const automatableCount = breakingChanges.filter(c => c.migrationStrategy.automatable).length;
        const manualCount = breakingChanges.length - automatableCount;
        if (manualCount === 0) {
            return 'Less than 1 hour';
        }
        else if (manualCount <= 2) {
            return '2-4 hours';
        }
        else if (manualCount <= 5) {
            return '1-2 days';
        }
        else {
            return '3+ days';
        }
    }
    /**
     * Get compatibility statistics
     * @returns Manager statistics
     */
    getStatistics() {
        const totalBreakingChanges = Array.from(this.breakingChanges.values())
            .reduce((sum, changes) => sum + changes.length, 0);
        const totalDeprecated = Array.from(this.deprecatedFeatures.values())
            .reduce((sum, features) => sum + features.length, 0);
        return {
            totalVersions: this.versions.size,
            totalBreakingChanges,
            totalDeprecatedFeatures: totalDeprecated,
            migrationGuides: this.migrationStrategies.size
        };
    }
}
//# sourceMappingURL=CompatibilityManager.js.map