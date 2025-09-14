/**
 * Result Filter - Advanced filtering and validation engine for search results
 * @description Filters results based on completeness, quality, and custom validation rules
 */
/**
 * Advanced result filter with quality assessment and deduplication
 */
export class AdvancedResultFilter {
    constructor() {
        this.filterRules = [];
        this.qualityWeights = {
            completeness: 0.4,
            relevance: 0.3,
            dataQuality: 0.3
        };
        this.requiredFields = [];
        this.minQualityScore = 0.0;
    }
    /**
     * Add filter rule
     */
    addRule(rule) {
        this.filterRules.push(rule);
        this.sortRulesByPriority();
    }
    /**
     * Add multiple filter rules
     */
    addRules(rules) {
        this.filterRules.push(...rules);
        this.sortRulesByPriority();
    }
    /**
     * Set required fields for completeness calculation
     */
    setRequiredFields(fields) {
        this.requiredFields = fields;
    }
    /**
     * Set minimum quality score threshold
     */
    setMinQualityScore(score) {
        this.minQualityScore = Math.max(0, Math.min(1, score));
    }
    /**
     * Set quality calculation weights
     */
    setQualityWeights(weights) {
        this.qualityWeights = { ...this.qualityWeights, ...weights };
    }
    /**
     * Configure duplicate detection
     */
    configureDuplicateDetection(config) {
        this.duplicateConfig = config;
    }
    /**
     * Filter a batch of search results
     */
    filterResults(results, context = {}) {
        const startTime = performance.now();
        // Calculate individual filter results
        const individualResults = results.map((result, index) => this.filterSingleResult(result, {
            ...context,
            index,
            totalResults: results.length,
            sourceType: context.sourceType || 'unknown'
        }));
        // Collect passed results
        let filteredResults = individualResults
            .filter(fr => fr.passed)
            .map(fr => fr.result)
            .filter(result => result != null);
        // Apply duplicate detection if configured
        if (this.duplicateConfig) {
            filteredResults = this.removeDuplicates(filteredResults, this.duplicateConfig);
        }
        // Calculate statistics
        const totalFilteringTime = performance.now() - startTime;
        const rulesExecuted = {};
        const rejectionReasons = {};
        individualResults.forEach(fr => {
            fr.rulesApplied.forEach(rule => {
                rulesExecuted[rule] = (rulesExecuted[rule] || 0) + 1;
            });
            fr.rejectedBy?.forEach(rule => {
                rejectionReasons[rule] = (rejectionReasons[rule] || 0) + 1;
            });
        });
        return {
            originalCount: results.length,
            filteredCount: filteredResults.length,
            results: filteredResults,
            individualResults,
            stats: {
                totalFilteringTime,
                averageFilteringTime: totalFilteringTime / results.length,
                rulesExecuted,
                rejectionReasons
            }
        };
    }
    /**
     * Filter a single search result
     */
    filterSingleResult(result, context) {
        const startTime = performance.now();
        // Calculate quality metrics
        const qualityMetrics = this.calculateQualityMetrics(result, context);
        const filterResult = {
            passed: true,
            qualityMetrics,
            rulesApplied: [],
            filteringTime: 0,
            result: { ...result }
        };
        // Apply minimum quality score filter
        if (qualityMetrics.overall < this.minQualityScore) {
            filterResult.passed = false;
            filterResult.rejectedBy = ['minimum_quality_score'];
            filterResult.result = undefined;
        }
        // Apply custom filter rules
        if (filterResult.passed) {
            for (const rule of this.filterRules) {
                if (!rule.enabled)
                    continue;
                filterResult.rulesApplied.push(rule.name);
                if (!rule.filter(result, { ...context, qualityMetrics })) {
                    filterResult.passed = false;
                    filterResult.rejectedBy = filterResult.rejectedBy || [];
                    filterResult.rejectedBy.push(rule.name);
                    filterResult.result = undefined;
                    break;
                }
            }
        }
        // Add quality metrics to result metadata
        if (filterResult.passed && filterResult.result) {
            filterResult.result.metadata.qualityMetrics = qualityMetrics;
        }
        filterResult.filteringTime = performance.now() - startTime;
        return filterResult;
    }
    /**
     * Calculate quality metrics for a result
     */
    calculateQualityMetrics(result, context) {
        const issues = [];
        // Calculate completeness score
        const completeness = this.calculateCompleteness(result, issues);
        // Calculate relevance score
        const relevance = this.calculateRelevance(result, context, issues);
        // Calculate data quality score
        const dataQuality = this.calculateDataQuality(result, issues);
        // Calculate overall quality score
        const overall = (completeness * this.qualityWeights.completeness) +
            (relevance * this.qualityWeights.relevance) +
            (dataQuality * this.qualityWeights.dataQuality);
        return {
            completeness,
            relevance,
            dataQuality,
            overall,
            issues
        };
    }
    /**
     * Calculate completeness score
     */
    calculateCompleteness(result, issues) {
        if (this.requiredFields.length === 0) {
            return 1.0; // No required fields defined
        }
        let presentFields = 0;
        for (const field of this.requiredFields) {
            const value = this.getFieldValue(result, field);
            if (this.isFieldPresent(value)) {
                presentFields++;
            }
            else {
                issues.push(`Missing required field: ${field}`);
            }
        }
        return presentFields / this.requiredFields.length;
    }
    /**
     * Calculate relevance score
     */
    calculateRelevance(result, context, issues) {
        let relevanceScore = 0.5; // Default middle score
        // Use existing relevance metrics if available
        if (typeof result.metadata.score === 'number') {
            relevanceScore = Math.max(0, Math.min(1, result.metadata.score / 10)); // Normalize assuming max score of 10
        }
        // Boost score based on matched fields
        if (result.metadata.matchedFields && Array.isArray(result.metadata.matchedFields)) {
            const matchBoost = Math.min(0.3, result.metadata.matchedFields.length * 0.1);
            relevanceScore += matchBoost;
        }
        // Query-specific relevance checks
        if (context.query && context.query.trim().length > 0) {
            const queryTerms = context.query.toLowerCase().split(/\s+/);
            const titleLower = (result.title || '').toLowerCase();
            const descriptionLower = (result.description || '').toLowerCase();
            let termMatches = 0;
            for (const term of queryTerms) {
                if (titleLower.includes(term) || descriptionLower.includes(term)) {
                    termMatches++;
                }
            }
            const queryRelevance = queryTerms.length > 0 ? termMatches / queryTerms.length : 0;
            relevanceScore = (relevanceScore + queryRelevance) / 2; // Average with query relevance
        }
        return Math.max(0, Math.min(1, relevanceScore));
    }
    /**
     * Calculate data quality score
     */
    calculateDataQuality(result, issues) {
        let qualityScore = 1.0;
        // Check title quality
        if (!result.title || result.title.trim().length === 0) {
            qualityScore -= 0.3;
            issues.push('Empty or missing title');
        }
        else if (result.title.trim().length < 3) {
            qualityScore -= 0.1;
            issues.push('Very short title');
        }
        // Check for placeholder or generic titles
        const genericTitles = ['untitled', 'document', 'file', 'item', 'result'];
        if (result.title && genericTitles.some(generic => result.title.toLowerCase().includes(generic))) {
            qualityScore -= 0.2;
            issues.push('Generic or placeholder title');
        }
        // Check description quality
        if (result.description && result.description.trim().length > 0) {
            qualityScore += 0.1; // Bonus for having description
        }
        // Check for broken or invalid URLs
        if (result.url) {
            try {
                new URL(result.url);
            }
            catch {
                qualityScore -= 0.2;
                issues.push('Invalid URL format');
            }
        }
        // Check metadata completeness
        const metadataFields = Object.keys(result.metadata || {});
        if (metadataFields.length < 3) {
            qualityScore -= 0.1;
            issues.push('Limited metadata available');
        }
        return Math.max(0, Math.min(1, qualityScore));
    }
    /**
     * Remove duplicate results
     */
    removeDuplicates(results, config) {
        if (results.length <= 1) {
            return results;
        }
        const duplicateGroups = [];
        const processed = new Set();
        for (let i = 0; i < results.length; i++) {
            if (processed.has(i))
                continue;
            const group = [results[i]];
            processed.add(i);
            for (let j = i + 1; j < results.length; j++) {
                if (processed.has(j))
                    continue;
                if (this.areDuplicates(results[i], results[j], config)) {
                    group.push(results[j]);
                    processed.add(j);
                }
            }
            duplicateGroups.push(group);
        }
        // Select best result from each group
        return duplicateGroups.map(group => {
            if (group.length === 1) {
                return group[0];
            }
            if (config.keepBest && config.qualityComparator) {
                return group.reduce((best, current) => config.qualityComparator(best, current) > 0 ? best : current);
            }
            // Default: keep first result (highest original relevance)
            return group[0];
        });
    }
    /**
     * Check if two results are duplicates
     */
    areDuplicates(result1, result2, config) {
        switch (config.strategy) {
            case 'exact':
                return this.exactDuplicateCheck(result1, result2, config.compareFields);
            case 'fuzzy':
                return this.fuzzyDuplicateCheck(result1, result2, config);
            case 'custom':
                if (config.customComparator) {
                    const similarity = config.customComparator(result1, result2);
                    return similarity >= (config.threshold || 0.8);
                }
                return false;
            case 'semantic':
                // Simplified semantic comparison - would use embeddings in real implementation
                return this.semanticDuplicateCheck(result1, result2, config);
            default:
                return false;
        }
    }
    /**
     * Exact duplicate check
     */
    exactDuplicateCheck(result1, result2, compareFields) {
        for (const field of compareFields) {
            const value1 = this.getFieldValue(result1, field);
            const value2 = this.getFieldValue(result2, field);
            if (value1 !== value2) {
                return false;
            }
        }
        return true;
    }
    /**
     * Fuzzy duplicate check using string similarity
     */
    fuzzyDuplicateCheck(result1, result2, config) {
        const threshold = config.threshold || 0.8;
        for (const field of config.compareFields) {
            const value1 = String(this.getFieldValue(result1, field) || '');
            const value2 = String(this.getFieldValue(result2, field) || '');
            if (value1.length === 0 && value2.length === 0)
                continue;
            const similarity = this.calculateStringSimilarity(value1, value2);
            if (similarity >= threshold) {
                return true;
            }
        }
        return false;
    }
    /**
     * Semantic duplicate check (simplified)
     */
    semanticDuplicateCheck(result1, result2, config) {
        // Simplified semantic comparison using title and description
        const text1 = `${result1.title || ''} ${result1.description || ''}`.toLowerCase();
        const text2 = `${result2.title || ''} ${result2.description || ''}`.toLowerCase();
        const similarity = this.calculateStringSimilarity(text1, text2);
        return similarity >= (config.threshold || 0.7);
    }
    /**
     * Calculate string similarity using Jaccard index
     */
    calculateStringSimilarity(str1, str2) {
        if (str1 === str2)
            return 1.0;
        const words1 = new Set(str1.toLowerCase().split(/\s+/));
        const words2 = new Set(str2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }
    /**
     * Get field value from result (supports dot notation)
     */
    getFieldValue(result, fieldPath) {
        const path = fieldPath.split('.');
        let current = result;
        for (const key of path) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            }
            else {
                return null;
            }
        }
        return current;
    }
    /**
     * Check if field value is present and meaningful
     */
    isFieldPresent(value) {
        return value != null && value !== '' && !(Array.isArray(value) && value.length === 0);
    }
    /**
     * Sort filter rules by priority
     */
    sortRulesByPriority() {
        this.filterRules.sort((a, b) => b.priority - a.priority);
    }
    /**
     * Clear all filter rules
     */
    clear() {
        this.filterRules = [];
        this.duplicateConfig = undefined;
    }
    /**
     * Get current configuration
     */
    getConfiguration() {
        return {
            rulesCount: this.filterRules.length,
            requiredFields: [...this.requiredFields],
            minQualityScore: this.minQualityScore,
            qualityWeights: { ...this.qualityWeights },
            duplicateDetectionEnabled: !!this.duplicateConfig
        };
    }
}
/**
 * Fluent filter rule builder
 */
export class FilterRuleBuilder {
    constructor() {
        this.rule = { enabled: true, priority: 0 };
    }
    name(name) {
        this.rule.name = name;
        return this;
    }
    description(description) {
        this.rule.description = description;
        return this;
    }
    priority(priority) {
        this.rule.priority = priority;
        return this;
    }
    enabled(enabled = true) {
        this.rule.enabled = enabled;
        return this;
    }
    reason(reason) {
        this.rule.reason = reason;
        return this;
    }
    filter(filterFn) {
        this.rule.filter = filterFn;
        if (!this.rule.name) {
            this.rule.name = `filter_rule_${Date.now()}`;
        }
        return this.rule;
    }
}
/**
 * Utility function to create filter rule
 */
export function createFilterRule() {
    return new FilterRuleBuilder();
}
/**
 * Predefined common filter rules
 */
export const CommonFilterRules = {
    /**
     * Filter out results with empty or very short titles
     */
    minimumTitleLength: (minLength = 3) => ({
        name: 'minimum_title_length',
        description: `Filter results with titles shorter than ${minLength} characters`,
        priority: 100,
        enabled: true,
        reason: 'Title too short',
        filter: (result) => (result.title?.trim().length || 0) >= minLength
    }),
    /**
     * Filter out results without required fields
     */
    requiredFields: (fields) => ({
        name: 'required_fields',
        description: `Filter results missing required fields: ${fields.join(', ')}`,
        priority: 200,
        enabled: true,
        reason: 'Missing required fields',
        filter: (result) => {
            const getValue = (obj, path) => {
                return path.split('.').reduce((current, key) => current && typeof current === 'object' ? current[key] : null, obj);
            };
            return fields.every(field => {
                const value = getValue(result, field);
                return value != null && value !== '';
            });
        }
    }),
    /**
     * Filter based on minimum quality score
     */
    minimumQuality: (threshold = 0.5) => ({
        name: 'minimum_quality',
        description: `Filter results below quality threshold ${threshold}`,
        priority: 50,
        enabled: true,
        reason: 'Quality score too low',
        filter: (result, context) => {
            return (context.qualityMetrics?.overall || 0) >= threshold;
        }
    }),
    /**
     * Filter out results with invalid URLs
     */
    validUrls: () => ({
        name: 'valid_urls',
        description: 'Filter results with invalid URLs',
        priority: 75,
        enabled: true,
        reason: 'Invalid URL',
        filter: (result) => {
            if (!result.url)
                return true; // No URL is okay
            try {
                new URL(result.url);
                return true;
            }
            catch {
                return false;
            }
        }
    })
};
/**
 * Global result filter instance
 */
export const resultFilter = new AdvancedResultFilter();
//# sourceMappingURL=ResultFilter.js.map