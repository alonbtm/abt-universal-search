/**
 * Metadata Enhancer - Pipeline for enhancing result metadata
 * @description Adds optional fields like subtitles, icons, categories, and custom metadata
 */

import type { SearchResult } from '../types/Results';

/**
 * Icon configuration options
 */
export interface IconConfig {
  /** Icon URL or data URI */
  url?: string;
  /** Icon type (font-icon, svg, image) */
  type?: 'font-icon' | 'svg' | 'image' | 'emoji';
  /** Icon class name for font icons */
  className?: string;
  /** Icon size hint */
  size?: 'small' | 'medium' | 'large' | number;
  /** Icon color hint */
  color?: string;
  /** Alt text for accessibility */
  alt?: string;
}

/**
 * Category configuration
 */
export interface CategoryConfig {
  /** Category name */
  name: string;
  /** Category color */
  color?: string;
  /** Category icon */
  icon?: IconConfig;
  /** Category description */
  description?: string;
  /** Category priority for sorting */
  priority?: number;
}

/**
 * Enhancement rule configuration
 */
export interface EnhancementRule {
  /** Rule name */
  name: string;
  /** Rule priority (higher runs first) */
  priority: number;
  /** Field conditions that must be met */
  conditions?: {
    field: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'exists';
    value?: unknown;
    regex?: RegExp;
  }[];
  /** Enhancement function */
  enhance: (result: SearchResult, context: EnhancementContext) => Partial<SearchResult['metadata']>;
}

/**
 * Enhancement context
 */
export interface EnhancementContext {
  /** Original query */
  query?: string;
  /** Result index in batch */
  index: number;
  /** Total results in batch */
  totalResults: number;
  /** Source adapter type */
  sourceType: string;
  /** Additional context data */
  additionalContext?: Record<string, unknown>;
}

/**
 * Enhancement statistics
 */
interface EnhancementStats {
  totalEnhancements: number;
  successfulEnhancements: number;
  ruleExecutions: Record<string, number>;
  averageEnhancementTime: number;
  enhancementsPerSecond: number;
  lastResetTime: number;
}

/**
 * Advanced metadata enhancer with rule-based enhancements
 */
export class AdvancedMetadataEnhancer {
  private enhancementRules: EnhancementRule[] = [];
  private categoryMappings = new Map<string, CategoryConfig>();
  private iconMappings = new Map<string, IconConfig>();
  private customEnhancers = new Map<string, (result: SearchResult) => Record<string, unknown>>();
  private stats: EnhancementStats = this.initializeStats();

  /**
   * Add enhancement rule
   */
  public addRule(rule: EnhancementRule): void {
    this.enhancementRules.push(rule);
    this.sortRulesByPriority();
  }

  /**
   * Add multiple enhancement rules
   */
  public addRules(rules: EnhancementRule[]): void {
    this.enhancementRules.push(...rules);
    this.sortRulesByPriority();
  }

  /**
   * Add category mapping
   */
  public addCategoryMapping(key: string, category: CategoryConfig): void {
    this.categoryMappings.set(key, category);
  }

  /**
   * Add icon mapping
   */
  public addIconMapping(key: string, icon: IconConfig): void {
    this.iconMappings.set(key, icon);
  }

  /**
   * Add custom enhancer function
   */
  public addCustomEnhancer(name: string, enhancer: (result: SearchResult) => Record<string, unknown>): void {
    this.customEnhancers.set(name, enhancer);
  }

  /**
   * Enhance a single search result
   */
  public enhanceResult(result: SearchResult, context: EnhancementContext): SearchResult {
    const startTime = performance.now();
    this.stats.totalEnhancements++;

    const enhanced: SearchResult = {
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

    } catch (error) {
      console.warn('Error during metadata enhancement:', error);
      enhanced.metadata.enhancementError = error instanceof Error ? error.message : String(error);
    }

    this.updateStats(performance.now() - startTime);
    return enhanced;
  }

  /**
   * Enhance multiple search results
   */
  public enhanceResults(results: SearchResult[], context: Partial<EnhancementContext> = {}): SearchResult[] {
    return results.map((result, index) => 
      this.enhanceResult(result, {
        ...context,
        index,
        totalResults: results.length,
        sourceType: context.sourceType || 'unknown'
      })
    );
  }

  /**
   * Apply subtitle enhancement
   */
  private applySubtitleEnhancement(result: SearchResult): void {
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
      const subtitleParts: string[] = [];
      
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
  private applyIconEnhancement(result: SearchResult): void {
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
      const iconConfig = this.iconMappings.get(key as string);
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
  private applyCategoryEnhancement(result: SearchResult): void {
    if (result.metadata.categoryConfig) {
      return; // Category config already exists
    }

    const categoryKey = result.metadata.category as string;
    if (categoryKey && this.categoryMappings.has(categoryKey)) {
      const categoryConfig = this.categoryMappings.get(categoryKey)!;
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
  private applyCustomEnhancements(result: SearchResult): void {
    for (const [name, enhancer] of this.customEnhancers) {
      try {
        const customMetadata = enhancer(result);
        Object.assign(result.metadata, customMetadata);
      } catch (error) {
        console.warn(`Custom enhancer '${name}' failed:`, error);
      }
    }
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateRuleConditions(rule: EnhancementRule, result: SearchResult): boolean {
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
  private getFieldValue(result: SearchResult, fieldPath: string): unknown {
    const path = fieldPath.split('.');
    let current: any = result;

    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }

    return current;
  }

  /**
   * Get default icon based on result content
   */
  private getDefaultIcon(result: SearchResult): IconConfig {
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
  private getFileTypeIcon(extension: string): IconConfig {
    const iconMap: Record<string, IconConfig> = {
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
  private extractFileExtension(filename: string): string | null {
    if (!filename) return null;
    
    const match = filename.match(/\.([^.]+)(?:\?|$)/);
    return match ? match[1] : null;
  }

  /**
   * Sort enhancement rules by priority
   */
  private sortRulesByPriority(): void {
    this.enhancementRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Update performance statistics
   */
  private updateStats(enhancementTime: number): void {
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
  private initializeStats(): EnhancementStats {
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
  public getStats(): EnhancementStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Clear all enhancement rules and mappings
   */
  public clear(): void {
    this.enhancementRules = [];
    this.categoryMappings.clear();
    this.iconMappings.clear();
    this.customEnhancers.clear();
  }

  /**
   * Get configured rules count
   */
  public getRulesCount(): number {
    return this.enhancementRules.length;
  }

  /**
   * Get configured mappings count
   */
  public getMappingsCount(): { categories: number; icons: number; customEnhancers: number } {
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
  private rule: Partial<EnhancementRule> = {};

  public name(name: string): EnhancementRuleBuilder {
    this.rule.name = name;
    return this;
  }

  public priority(priority: number): EnhancementRuleBuilder {
    this.rule.priority = priority;
    return this;
  }

  public when(
    field: string, 
    operator: EnhancementRule['conditions'][0]['operator'], 
    value?: unknown
  ): EnhancementRuleBuilder {
    if (!this.rule.conditions) {
      this.rule.conditions = [];
    }
    
    this.rule.conditions.push({ field, operator, value });
    return this;
  }

  public enhance(enhancer: EnhancementRule['enhance']): EnhancementRule {
    this.rule.enhance = enhancer;
    
    if (!this.rule.name) {
      this.rule.name = `rule_${Date.now()}`;
    }
    
    if (this.rule.priority === undefined) {
      this.rule.priority = 0;
    }
    
    return this.rule as EnhancementRule;
  }
}

/**
 * Utility function to create enhancement rule
 */
export function createEnhancementRule(): EnhancementRuleBuilder {
  return new EnhancementRuleBuilder();
}

/**
 * Predefined category configurations
 */
export const PredefinedCategories: Record<string, CategoryConfig> = {
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