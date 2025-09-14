/**
 * Metadata Enhancer - Pipeline for enhancing result metadata
 * @description Adds optional fields like subtitles, icons, categories, and custom metadata
 */
/**
 * Advanced metadata enhancer with rule-based enhancements
 */
export class AdvancedMetadataEnhancer {
    constructor() {
        this.enhancementRules = [];
        this.categoryMappings = new Map();
        this.iconMappings = new Map();
        this.customEnhancers = new Map();
        this.stats = this.initializeStats();
    }
    /**
     * Add enhancement rule
     */
    addRule(rule) {
        this.enhancementRules.push(rule);
        this.sortRulesByPriority();
    }
    /**
     * Add multiple enhancement rules
     */
    addRules(rules) {
        this.enhancementRules.push(...rules);
        this.sortRulesByPriority();
    }
    /**
     * Add category mapping
     */
    addCategoryMapping(key, category) {
        this.categoryMappings.set(key, category);
    }
    /**
     * Add icon mapping
     */
    addIconMapping(key, icon) {
        this.iconMappings.set(key, icon);
    }
    /**
     * Add custom enhancer function
     */
    addCustomEnhancer(name, enhancer) {
        this.customEnhancers.set(name, enhancer);
    }
    /**
     * Enhance a single search result
     */
    enhanceResult(result, context) {
        const startTime = performance.now();
        this.stats.totalEnhancements++;
        const enhanced = {
            ...result,
            metadata: {
                ...result.metadata
            }
        };
        try {
            // Apply enhancement rules
            for (const rule of this.enhancementRules) {
                if (this.evaluateRuleConditions(rule, enhanced)) {
                    const enhancements = rule.enhance(enhanced, context);
                    Object.assign(enhanced.metadata, enhancements);
                    this.stats.ruleExecutions[rule.name] = (this.stats.ruleExecutions[rule.name] || 0) + 1;
                }
            }
            // Apply built-in enhancements
            this.applySubtitleEnhancement(enhanced);
            this.applyIconEnhancement(enhanced);
            this.applyCategoryEnhancement(enhanced);
            this.applyCustomEnhancements(enhanced);
            // Add enhancement metadata
            enhanced.metadata.enhanced = true;
            enhanced.metadata.enhancementTime = performance.now() - startTime;
            this.stats.successfulEnhancements++;
        }
        catch (error) {
            console.warn('Error during metadata enhancement:', error);
            enhanced.metadata.enhancementError = error instanceof Error ? error.message : String(error);
        }
        this.updateStats(performance.now() - startTime);
        return enhanced;
    }
    /**
     * Enhance multiple search results
     */
    enhanceResults(results, context = {}) {
        return results.map((result, index) => this.enhanceResult(result, {
            ...context,
            index,
            totalResults: results.length,
            sourceType: context.sourceType || 'unknown'
        }));
    }
    /**
     * Apply subtitle enhancement
     */
    applySubtitleEnhancement(result) {
        if (result.metadata.subtitle) {
            return; // Subtitle already exists
        }
        // Try to generate subtitle from available fields
        const potentialSubtitles = [
            result.description,
            result.metadata.description,
            result.metadata.summary,
            result.metadata.type,
            result.metadata.category
        ];
        for (const subtitle of potentialSubtitles) {
            if (subtitle && typeof subtitle === 'string' && subtitle.trim().length > 0) {
                result.metadata.subtitle = subtitle.trim();
                break;
            }
        }
        // Generate subtitle from multiple fields if none found
        if (!result.metadata.subtitle) {
            const subtitleParts = [];
            if (result.metadata.category && typeof result.metadata.category === 'string') {
                subtitleParts.push(result.metadata.category);
            }
            if (result.metadata.type && typeof result.metadata.type === 'string') {
                subtitleParts.push(result.metadata.type);
            }
            if (subtitleParts.length > 0) {
                result.metadata.subtitle = subtitleParts.join(' • ');
            }
        }
    }
    /**
     * Apply icon enhancement
     */
    applyIconEnhancement(result) {
        if (result.metadata.icon) {
            return; // Icon already exists
        }
        // Try to map icon based on category or type
        const iconKeys = [
            result.metadata.category,
            result.metadata.type,
            result.metadata.kind,
            this.extractFileExtension(result.title || result.url)
        ].filter(key => key && typeof key === 'string');
        for (const key of iconKeys) {
            const iconConfig = this.iconMappings.get(key);
            if (iconConfig) {
                result.metadata.icon = iconConfig;
                break;
            }
        }
        // Default icon based on content type
        if (!result.metadata.icon) {
            result.metadata.icon = this.getDefaultIcon(result);
        }
    }
    /**
     * Apply category enhancement
     */
    applyCategoryEnhancement(result) {
        if (result.metadata.categoryConfig) {
            return; // Category config already exists
        }
        const categoryKey = result.metadata.category;
        if (categoryKey && this.categoryMappings.has(categoryKey)) {
            const categoryConfig = this.categoryMappings.get(categoryKey);
            result.metadata.categoryConfig = categoryConfig;
            // Apply category icon if no icon exists
            if (!result.metadata.icon && categoryConfig.icon) {
                result.metadata.icon = categoryConfig.icon;
            }
        }
    }
    /**
     * Apply custom enhancements
     */
    applyCustomEnhancements(result) {
        for (const [name, enhancer] of this.customEnhancers) {
            try {
                const customMetadata = enhancer(result);
                Object.assign(result.metadata, customMetadata);
            }
            catch (error) {
                console.warn(`Custom enhancer '${name}' failed:`, error);
            }
        }
    }
    /**
     * Evaluate rule conditions
     */
    evaluateRuleConditions(rule, result) {
        if (!rule.conditions || rule.conditions.length === 0) {
            return true; // No conditions means always apply
        }
        return rule.conditions.every(condition => {
            const fieldValue = this.getFieldValue(result, condition.field);
            switch (condition.operator) {
                case 'exists':
                    return fieldValue != null;
                case 'equals':
                    return fieldValue === condition.value;
                case 'contains':
                    return typeof fieldValue === 'string' &&
                        typeof condition.value === 'string' &&
                        fieldValue.toLowerCase().includes(condition.value.toLowerCase());
                case 'startsWith':
                    return typeof fieldValue === 'string' &&
                        typeof condition.value === 'string' &&
                        fieldValue.toLowerCase().startsWith(condition.value.toLowerCase());
                case 'endsWith':
                    return typeof fieldValue === 'string' &&
                        typeof condition.value === 'string' &&
                        fieldValue.toLowerCase().endsWith(condition.value.toLowerCase());
                case 'regex':
                    return typeof fieldValue === 'string' &&
                        condition.regex &&
                        condition.regex.test(fieldValue);
                default:
                    return false;
            }
        });
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
     * Get default icon based on result content
     */
    getDefaultIcon(result) {
        // Try to determine icon from URL or title
        const url = result.url;
        const title = result.title;
        if (url) {
            const extension = this.extractFileExtension(url);
            if (extension) {
                return this.getFileTypeIcon(extension);
            }
            if (url.includes('github.com')) {
                return { type: 'font-icon', className: 'fab fa-github', alt: 'GitHub' };
            }
            if (url.includes('stackoverflow.com')) {
                return { type: 'font-icon', className: 'fab fa-stack-overflow', alt: 'Stack Overflow' };
            }
            return { type: 'font-icon', className: 'fas fa-external-link-alt', alt: 'External Link' };
        }
        // Default generic icon
        return { type: 'font-icon', className: 'fas fa-file', alt: 'Document' };
    }
    /**
     * Get file type icon based on extension
     */
    getFileTypeIcon(extension) {
        const iconMap = {
            pdf: { type: 'font-icon', className: 'fas fa-file-pdf', color: '#e74c3c', alt: 'PDF' },
            doc: { type: 'font-icon', className: 'fas fa-file-word', color: '#2980b9', alt: 'Word Document' },
            docx: { type: 'font-icon', className: 'fas fa-file-word', color: '#2980b9', alt: 'Word Document' },
            xls: { type: 'font-icon', className: 'fas fa-file-excel', color: '#27ae60', alt: 'Excel Spreadsheet' },
            xlsx: { type: 'font-icon', className: 'fas fa-file-excel', color: '#27ae60', alt: 'Excel Spreadsheet' },
            ppt: { type: 'font-icon', className: 'fas fa-file-powerpoint', color: '#e67e22', alt: 'PowerPoint' },
            pptx: { type: 'font-icon', className: 'fas fa-file-powerpoint', color: '#e67e22', alt: 'PowerPoint' },
            jpg: { type: 'font-icon', className: 'fas fa-file-image', color: '#9b59b6', alt: 'Image' },
            jpeg: { type: 'font-icon', className: 'fas fa-file-image', color: '#9b59b6', alt: 'Image' },
            png: { type: 'font-icon', className: 'fas fa-file-image', color: '#9b59b6', alt: 'Image' },
            gif: { type: 'font-icon', className: 'fas fa-file-image', color: '#9b59b6', alt: 'Image' },
            mp4: { type: 'font-icon', className: 'fas fa-file-video', color: '#e74c3c', alt: 'Video' },
            avi: { type: 'font-icon', className: 'fas fa-file-video', color: '#e74c3c', alt: 'Video' },
            mp3: { type: 'font-icon', className: 'fas fa-file-audio', color: '#f39c12', alt: 'Audio' },
            wav: { type: 'font-icon', className: 'fas fa-file-audio', color: '#f39c12', alt: 'Audio' },
            zip: { type: 'font-icon', className: 'fas fa-file-archive', color: '#34495e', alt: 'Archive' },
            rar: { type: 'font-icon', className: 'fas fa-file-archive', color: '#34495e', alt: 'Archive' },
            js: { type: 'font-icon', className: 'fab fa-js-square', color: '#f1c40f', alt: 'JavaScript' },
            ts: { type: 'font-icon', className: 'fas fa-code', color: '#3498db', alt: 'TypeScript' },
            html: { type: 'font-icon', className: 'fab fa-html5', color: '#e74c3c', alt: 'HTML' },
            css: { type: 'font-icon', className: 'fab fa-css3-alt', color: '#3498db', alt: 'CSS' }
        };
        return iconMap[extension.toLowerCase()] || { type: 'font-icon', className: 'fas fa-file', alt: 'File' };
    }
    /**
     * Extract file extension from filename or URL
     */
    extractFileExtension(filename) {
        if (!filename)
            return null;
        const match = filename.match(/\.([^.]+)(?:\?|$)/);
        return match ? match[1] : null;
    }
    /**
     * Sort enhancement rules by priority
     */
    sortRulesByPriority() {
        this.enhancementRules.sort((a, b) => b.priority - a.priority);
    }
    /**
     * Update performance statistics
     */
    updateStats(enhancementTime) {
        const now = performance.now();
        const timeSinceReset = now - this.stats.lastResetTime;
        this.stats.averageEnhancementTime =
            (this.stats.averageEnhancementTime * (this.stats.totalEnhancements - 1) + enhancementTime) /
                this.stats.totalEnhancements;
        this.stats.enhancementsPerSecond = timeSinceReset > 0 ?
            (this.stats.totalEnhancements * 1000) / timeSinceReset : 0;
    }
    /**
     * Initialize statistics
     */
    initializeStats() {
        return {
            totalEnhancements: 0,
            successfulEnhancements: 0,
            ruleExecutions: {},
            averageEnhancementTime: 0,
            enhancementsPerSecond: 0,
            lastResetTime: performance.now()
        };
    }
    /**
     * Get enhancement statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = this.initializeStats();
    }
    /**
     * Clear all enhancement rules and mappings
     */
    clear() {
        this.enhancementRules = [];
        this.categoryMappings.clear();
        this.iconMappings.clear();
        this.customEnhancers.clear();
    }
    /**
     * Get configured rules count
     */
    getRulesCount() {
        return this.enhancementRules.length;
    }
    /**
     * Get configured mappings count
     */
    getMappingsCount() {
        return {
            categories: this.categoryMappings.size,
            icons: this.iconMappings.size,
            customEnhancers: this.customEnhancers.size
        };
    }
}
/**
 * Fluent enhancement rule builder
 */
export class EnhancementRuleBuilder {
    constructor() {
        this.rule = {};
    }
    name(name) {
        this.rule.name = name;
        return this;
    }
    priority(priority) {
        this.rule.priority = priority;
        return this;
    }
    when(field, operator, value) {
        if (!this.rule.conditions) {
            this.rule.conditions = [];
        }
        this.rule.conditions.push({ field, operator, value });
        return this;
    }
    enhance(enhancer) {
        this.rule.enhance = enhancer;
        if (!this.rule.name) {
            this.rule.name = `rule_${Date.now()}`;
        }
        if (this.rule.priority === undefined) {
            this.rule.priority = 0;
        }
        return this.rule;
    }
}
/**
 * Utility function to create enhancement rule
 */
export function createEnhancementRule() {
    return new EnhancementRuleBuilder();
}
/**
 * Predefined category configurations
 */
export const PredefinedCategories = {
    document: {
        name: 'Document',
        color: '#3498db',
        icon: { type: 'font-icon', className: 'fas fa-file-alt', alt: 'Document' },
        description: 'Text documents and files'
    },
    website: {
        name: 'Website',
        color: '#2ecc71',
        icon: { type: 'font-icon', className: 'fas fa-globe', alt: 'Website' },
        description: 'Web pages and online content'
    },
    person: {
        name: 'Person',
        color: '#9b59b6',
        icon: { type: 'font-icon', className: 'fas fa-user', alt: 'Person' },
        description: 'People and contacts'
    },
    code: {
        name: 'Code',
        color: '#34495e',
        icon: { type: 'font-icon', className: 'fas fa-code', alt: 'Code' },
        description: 'Source code and repositories'
    },
    media: {
        name: 'Media',
        color: '#e74c3c',
        icon: { type: 'font-icon', className: 'fas fa-photo-video', alt: 'Media' },
        description: 'Images, videos, and multimedia content'
    }
};
/**
 * Global metadata enhancer instance
 */
export const metadataEnhancer = new AdvancedMetadataEnhancer();
//# sourceMappingURL=MetadataEnhancer.js.map