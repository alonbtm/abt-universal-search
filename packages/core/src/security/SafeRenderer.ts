/**
 * SafeRenderer - Secure templating system without string interpolation
 * @description Provides safe template rendering with parameterized content insertion and injection prevention
 */

import { SafeTemplateConfig, TemplateRenderingContext, TemplateRenderingResult } from '../types/Rendering';
import { OutputEscaper } from './OutputEscaper';
import { AttributeSanitizer } from './AttributeSanitizer';

/**
 * Template variable pattern for safe substitution
 */
const TEMPLATE_VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/g;

/**
 * Dangerous template patterns that should be blocked
 */
const DANGEROUS_TEMPLATE_PATTERNS = [
  // JavaScript execution
  /\{\{\s*[^}]*\(\s*\)\s*\}\}/g,
  // Property access with brackets
  /\{\{\s*[^}]*\[[^\]]*\]\s*\}\}/g,
  // Function calls
  /\{\{\s*[^}]*\.[a-zA-Z_][a-zA-Z0-9_]*\s*\(\s*[^)]*\)\s*\}\}/g,
  // Constructor access
  /\{\{\s*[^}]*\.constructor\s*\}\}/g,
  // Prototype pollution
  /\{\{\s*[^}]*\.__proto__\s*\}\}/g,
  /\{\{\s*[^}]*\.prototype\s*\}\}/g,
];

/**
 * Built-in safe templates for common use cases
 */
const BUILT_IN_TEMPLATES = {
  searchResult: `
    <div class="search-result" data-result-id="{{id}}">
      <div class="result-title">{{title}}</div>
      <div class="result-description">{{description}}</div>
      {{#if url}}<a href="{{url}}" class="result-link">{{url}}</a>{{/if}}
      {{#if category}}<span class="result-category">{{category}}</span>{{/if}}
    </div>
  `,
  
  errorMessage: `
    <div class="error-message" role="alert">
      <div class="error-title">{{title}}</div>
      <div class="error-description">{{message}}</div>
      {{#if code}}<div class="error-code">Error Code: {{code}}</div>{{/if}}
    </div>
  `,
  
  loadingState: `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-text">{{text}}</div>
    </div>
  `,
  
  noResults: `
    <div class="no-results">
      <div class="no-results-message">{{message}}</div>
      {{#if suggestion}}<div class="no-results-suggestion">{{suggestion}}</div>{{/if}}
    </div>
  `,
};

/**
 * Default safe template configuration
 */
export const DEFAULT_SAFE_TEMPLATE_CONFIG: SafeTemplateConfig = {
  delimiterPattern: TEMPLATE_VARIABLE_PATTERN,
  allowNested: false,
  maxDepth: 3,
  validateVariables: true,
  escapeOutput: true,
  cacheSize: 100,
};

/**
 * SafeRenderer class for secure template rendering
 */
export class SafeRenderer {
  private config: SafeTemplateConfig;
  private escaper: OutputEscaper;
  private sanitizer: AttributeSanitizer;
  private templateCache: Map<string, CompiledTemplate>;

  constructor(config: Partial<SafeTemplateConfig> = {}) {
    this.config = { ...DEFAULT_SAFE_TEMPLATE_CONFIG, ...config };
    this.escaper = new OutputEscaper();
    this.sanitizer = new AttributeSanitizer();
    this.templateCache = new Map();
  }

  /**
   * Render template with context
   */
  public renderTemplate(
    template: string,
    context: TemplateRenderingContext,
    customConfig?: Partial<SafeTemplateConfig>
  ): TemplateRenderingResult {
    const startTime = performance.now();
    const config = customConfig ? { ...this.config, ...customConfig } : this.config;
    const errors: string[] = [];
    const variablesUsed: string[] = [];

    try {
      // Validate template security
      const securityValidation = this.validateTemplateSecurity(template);
      if (!securityValidation.isSecure) {
        return {
          content: '',
          escaped: false,
          variablesUsed: [],
          errors: securityValidation.errors,
          metrics: {
            renderTime: performance.now() - startTime,
            templateSize: template.length,
            outputSize: 0,
          },
        };
      }

      // Compile template (with caching)
      const compiled = this.compileTemplate(template, config);
      
      // Render with context
      let rendered = this.executeTemplate(compiled, context, config);
      variablesUsed.push(...compiled.variables);

      // Escape output if configured
      let escaped = false;
      if (config.escapeOutput && context.securityContext.sanitizationLevel !== 'minimal') {
        const escapeResult = this.escaper.escapeHTML(rendered);
        rendered = escapeResult.escaped;
        escaped = escapeResult.modified;
      }

      return {
        content: rendered,
        escaped,
        variablesUsed: [...new Set(variablesUsed)],
        errors,
        metrics: {
          renderTime: performance.now() - startTime,
          templateSize: template.length,
          outputSize: rendered.length,
        },
      };

    } catch (error) {
      errors.push(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        content: '',
        escaped: false,
        variablesUsed,
        errors,
        metrics: {
          renderTime: performance.now() - startTime,
          templateSize: template.length,
          outputSize: 0,
        },
      };
    }
  }

  /**
   * Render built-in template
   */
  public renderBuiltIn(
    templateName: keyof typeof BUILT_IN_TEMPLATES,
    context: TemplateRenderingContext,
    config?: Partial<SafeTemplateConfig>
  ): TemplateRenderingResult {
    const template = BUILT_IN_TEMPLATES[templateName];
    if (!template) {
      return {
        content: '',
        escaped: false,
        variablesUsed: [],
        errors: [`Built-in template '${templateName}' not found`],
        metrics: { renderTime: 0, templateSize: 0, outputSize: 0 },
      };
    }

    return this.renderTemplate(template.trim(), context, config);
  }

  /**
   * Validate template security
   */
  private validateTemplateSecurity(template: string): {
    isSecure: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_TEMPLATE_PATTERNS) {
      const matches = template.match(pattern);
      if (matches) {
        errors.push(`Dangerous template pattern detected: ${matches[0]}`);
      }
    }

    // Check for script tags
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(template)) {
      errors.push('Script tags are not allowed in templates');
    }

    // Check for event handlers
    if (/\s*on\w+\s*=\s*["'][^"']*["']/gi.test(template)) {
      errors.push('Event handlers are not allowed in templates');
    }

    // Check for JavaScript URLs
    if (/javascript\s*:/gi.test(template)) {
      errors.push('JavaScript URLs are not allowed in templates');
    }

    // Check template depth
    const depth = this.calculateTemplateDepth(template);
    if (depth > this.config.maxDepth) {
      errors.push(`Template depth ${depth} exceeds maximum allowed ${this.config.maxDepth}`);
    }

    return {
      isSecure: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Compile template for efficient rendering
   */
  private compileTemplate(template: string, config: SafeTemplateConfig): CompiledTemplate {
    const cacheKey = this.generateCacheKey(template, config);
    
    // Check cache first
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    const variables: string[] = [];
    const parts: TemplatePart[] = [];
    let lastIndex = 0;

    // Find all template variables
    const matches = Array.from(template.matchAll(config.delimiterPattern));
    
    for (const match of matches) {
      const [fullMatch, variablePath] = match;
      const matchIndex = match.index!;

      // Add text before variable
      if (matchIndex > lastIndex) {
        parts.push({
          type: 'text',
          content: template.substring(lastIndex, matchIndex),
        });
      }

      // Validate variable path
      if (config.validateVariables && !this.isValidVariablePath(variablePath)) {
        throw new Error(`Invalid variable path: ${variablePath}`);
      }

      // Add variable part
      parts.push({
        type: 'variable',
        content: variablePath,
      });

      variables.push(variablePath);
      lastIndex = matchIndex + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < template.length) {
      parts.push({
        type: 'text',
        content: template.substring(lastIndex),
      });
    }

    const compiled: CompiledTemplate = {
      parts,
      variables: [...new Set(variables)],
      cacheKey,
    };

    // Cache compiled template
    if (this.templateCache.size >= config.cacheSize) {
      // Remove oldest entry
      const firstKey = this.templateCache.keys().next().value;
      this.templateCache.delete(firstKey);
    }
    this.templateCache.set(cacheKey, compiled);

    return compiled;
  }

  /**
   * Execute compiled template with context
   */
  private executeTemplate(
    compiled: CompiledTemplate,
    context: TemplateRenderingContext,
    config: SafeTemplateConfig
  ): string {
    let result = '';

    for (const part of compiled.parts) {
      if (part.type === 'text') {
        result += part.content;
      } else if (part.type === 'variable') {
        const value = this.resolveVariable(part.content, context);
        const stringValue = this.valueToString(value, context.securityContext.sanitizationLevel);
        result += stringValue;
      }
    }

    return result;
  }

  /**
   * Resolve variable from context
   */
  private resolveVariable(variablePath: string, context: TemplateRenderingContext): any {
    const parts = variablePath.split('.');
    let current = context.variables;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Convert value to safe string
   */
  private valueToString(value: any, sanitizationLevel: 'strict' | 'moderate' | 'minimal'): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // Apply sanitization based on level
    switch (sanitizationLevel) {
      case 'strict':
        // Full HTML escaping
        const escapeResult = this.escaper.escapeHTML(stringValue);
        return escapeResult.escaped;
      
      case 'moderate':
        // Basic HTML escaping for dangerous characters
        return stringValue
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      
      case 'minimal':
        // Only escape the most dangerous characters
        return stringValue
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      
      default:
        return stringValue;
    }
  }

  /**
   * Validate variable path
   */
  private isValidVariablePath(path: string): boolean {
    // Only allow alphanumeric characters, underscores, and dots
    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(path)) {
      return false;
    }

    // Check for dangerous property access
    const dangerousProps = ['constructor', '__proto__', 'prototype', 'eval', 'Function'];
    const parts = path.split('.');
    
    for (const part of parts) {
      if (dangerousProps.includes(part)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate template nesting depth
   */
  private calculateTemplateDepth(template: string): number {
    let depth = 0;
    let maxDepth = 0;
    let inVariable = false;

    for (let i = 0; i < template.length - 1; i++) {
      if (template[i] === '{' && template[i + 1] === '{') {
        if (!inVariable) {
          depth++;
          maxDepth = Math.max(maxDepth, depth);
          inVariable = true;
        }
        i++; // Skip next character
      } else if (template[i] === '}' && template[i + 1] === '}') {
        if (inVariable) {
          depth--;
          inVariable = false;
        }
        i++; // Skip next character
      }
    }

    return maxDepth;
  }

  /**
   * Generate cache key for template
   */
  private generateCacheKey(template: string, config: SafeTemplateConfig): string {
    const configHash = JSON.stringify({
      allowNested: config.allowNested,
      maxDepth: config.maxDepth,
      validateVariables: config.validateVariables,
      escapeOutput: config.escapeOutput,
    });
    
    // Simple hash function for template + config
    let hash = 0;
    const input = template + configHash;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `template_${Math.abs(hash)}`;
  }

  /**
   * Clear template cache
   */
  public clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.templateCache.size,
      maxSize: this.config.cacheSize,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<SafeTemplateConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Clear cache when config changes
    this.clearCache();
  }

  /**
   * Get current configuration
   */
  public getConfig(): SafeTemplateConfig {
    return { ...this.config };
  }
}

/**
 * Template compilation interfaces
 */
interface CompiledTemplate {
  parts: TemplatePart[];
  variables: string[];
  cacheKey: string;
}

interface TemplatePart {
  type: 'text' | 'variable';
  content: string;
}

/**
 * Default SafeRenderer instance
 */
export const defaultSafeRenderer = new SafeRenderer();

/**
 * Convenience function for quick template rendering
 */
export function renderTemplate(
  template: string,
  variables: Record<string, any>,
  config?: Partial<SafeTemplateConfig>
): string {
  const context: TemplateRenderingContext = {
    variables,
    timestamp: Date.now(),
    securityContext: {
      trustedContent: false,
      sanitizationLevel: 'strict',
    },
  };

  const result = defaultSafeRenderer.renderTemplate(template, context, config);
  return result.content;
}

/**
 * Convenience function for rendering built-in templates
 */
export function renderBuiltIn(
  templateName: keyof typeof BUILT_IN_TEMPLATES,
  variables: Record<string, any>
): string {
  const context: TemplateRenderingContext = {
    variables,
    timestamp: Date.now(),
    securityContext: {
      trustedContent: false,
      sanitizationLevel: 'strict',
    },
  };

  const result = defaultSafeRenderer.renderBuiltIn(templateName, context);
  return result.content;
}
