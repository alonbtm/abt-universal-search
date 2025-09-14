/**
 * OutputEscaper - HTML escaping and safe DOM insertion for output security
 * @description Provides comprehensive HTML entity escaping and safe DOM manipulation methods
 */

import { HTMLEscapingConfig, HTMLEscapingResult, SafeDOMInsertionOptions } from '../types/Rendering';

/**
 * HTML entity mapping for escaping dangerous characters
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
  '\u00A0': '&nbsp;', // Non-breaking space
  '\u2028': '&#x2028;', // Line separator
  '\u2029': '&#x2029;', // Paragraph separator
};

/**
 * Dangerous HTML patterns that should be escaped or removed
 */
const DANGEROUS_HTML_PATTERNS = [
  // Script tags
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  // Event handlers
  /\s*on\w+\s*=\s*["'][^"']*["']/gi,
  // JavaScript URLs
  /javascript\s*:/gi,
  // Data URLs with scripts
  /data\s*:\s*text\/html/gi,
  // Style with expressions
  /expression\s*\(/gi,
  // Import statements
  /@import\s+/gi,
  // Vbscript
  /vbscript\s*:/gi,
  // Object/embed tags
  /<(object|embed|applet|iframe)\b[^>]*>/gi,
  // Form tags
  /<form\b[^>]*>/gi,
  // Meta refresh
  /<meta\s+http-equiv\s*=\s*["']?refresh["']?/gi,
];

/**
 * Zero-width and invisible characters that can be used for attacks
 */
const ZERO_WIDTH_CHARS = [
  '\u200B', // Zero width space
  '\u200C', // Zero width non-joiner
  '\u200D', // Zero width joiner
  '\u2060', // Word joiner
  '\uFEFF', // Zero width no-break space
  '\u180E', // Mongolian vowel separator
];

/**
 * Default HTML escaping configuration
 */
export const DEFAULT_HTML_ESCAPING_CONFIG: HTMLEscapingConfig = {
  escapeHTMLEntities: true,
  escapeAttributes: true,
  escapeURLs: true,
  preserveTags: [],
  maxContentLength: 10000,
  strictMode: true,
};

/**
 * OutputEscaper class for HTML escaping and safe DOM operations
 */
export class OutputEscaper {
  private config: HTMLEscapingConfig;

  constructor(config: Partial<HTMLEscapingConfig> = {}) {
    this.config = { ...DEFAULT_HTML_ESCAPING_CONFIG, ...config };
  }

  /**
   * Escape HTML entities in content
   */
  public escapeHTML(content: string, customConfig?: Partial<HTMLEscapingConfig>): HTMLEscapingResult {
    const startTime = performance.now();
    const config = customConfig ? { ...this.config, ...customConfig } : this.config;
    
    if (!content || typeof content !== 'string') {
      return {
        escaped: '',
        modified: false,
        originalLength: 0,
        escapedLength: 0,
        escapedCharacters: [],
        processingTime: performance.now() - startTime,
      };
    }

    // Check content length limit
    if (content.length > config.maxContentLength) {
      throw new Error(`Content length ${content.length} exceeds maximum allowed ${config.maxContentLength}`);
    }

    let escaped = content;
    const escapedCharacters: string[] = [];
    let modified = false;

    // Remove zero-width characters in strict mode
    if (config.strictMode) {
      const originalLength = escaped.length;
      escaped = this.removeZeroWidthCharacters(escaped);
      if (escaped.length !== originalLength) {
        modified = true;
        escapedCharacters.push(...ZERO_WIDTH_CHARS);
      }
    }

    // Remove dangerous HTML patterns
    if (config.strictMode) {
      const originalEscaped = escaped;
      escaped = this.removeDangerousPatterns(escaped);
      if (escaped !== originalEscaped) {
        modified = true;
      }
    }

    // Escape HTML entities
    if (config.escapeHTMLEntities) {
      const originalEscaped = escaped;
      escaped = this.escapeHTMLEntities(escaped);
      if (escaped !== originalEscaped) {
        modified = true;
        // Track which characters were escaped
        for (const char of Object.keys(HTML_ENTITIES)) {
          if (content.includes(char)) {
            escapedCharacters.push(char);
          }
        }
      }
    }

    return {
      escaped,
      modified,
      originalLength: content.length,
      escapedLength: escaped.length,
      escapedCharacters: [...new Set(escapedCharacters)],
      processingTime: performance.now() - startTime,
    };
  }

  /**
   * Safely insert content into DOM element
   */
  public safeInsert(options: SafeDOMInsertionOptions): void {
    const { targetElement, content, method, validate, clearTarget } = options;

    if (!targetElement || !(targetElement instanceof HTMLElement)) {
      throw new Error('Invalid target element for DOM insertion');
    }

    // Validate content before insertion
    if (validate) {
      const validationResult = this.escapeHTML(content);
      if (validationResult.modified && this.config.strictMode) {
        console.warn('Content was modified during validation:', {
          original: content,
          escaped: validationResult.escaped,
          modifications: validationResult.escapedCharacters,
        });
      }
    }

    // Clear target if requested
    if (clearTarget) {
      this.clearElement(targetElement);
    }

    // Insert content using safe method
    switch (method) {
      case 'textContent':
        targetElement.textContent = content;
        break;
      
      case 'createElement':
        const textNode = document.createTextNode(content);
        targetElement.appendChild(textNode);
        break;
      
      case 'documentFragment':
        const fragment = document.createDocumentFragment();
        const textElement = document.createTextNode(content);
        fragment.appendChild(textElement);
        targetElement.appendChild(fragment);
        break;
      
      default:
        throw new Error(`Unsupported insertion method: ${method}`);
    }
  }

  /**
   * Create safe HTML element with escaped content
   */
  public createSafeElement(tagName: string, content: string, attributes?: Record<string, string>): HTMLElement {
    // Validate tag name
    if (!this.isValidTagName(tagName)) {
      throw new Error(`Invalid or dangerous tag name: ${tagName}`);
    }

    const element = document.createElement(tagName);
    
    // Set escaped content
    const escapedResult = this.escapeHTML(content);
    element.textContent = escapedResult.escaped;

    // Set safe attributes
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        if (this.isSafeAttribute(key)) {
          const escapedValue = this.escapeHTML(value);
          element.setAttribute(key, escapedValue.escaped);
        } else {
          console.warn(`Skipping potentially dangerous attribute: ${key}`);
        }
      }
    }

    return element;
  }

  /**
   * Escape HTML entities using entity map
   */
  private escapeHTMLEntities(content: string): string {
    return content.replace(/[&<>"'`=\/\u00A0\u2028\u2029]/g, (char) => {
      return HTML_ENTITIES[char] || char;
    });
  }

  /**
   * Remove zero-width characters
   */
  private removeZeroWidthCharacters(content: string): string {
    let result = content;
    for (const char of ZERO_WIDTH_CHARS) {
      result = result.replace(new RegExp(char, 'g'), '');
    }
    return result;
  }

  /**
   * Remove dangerous HTML patterns
   */
  private removeDangerousPatterns(content: string): string {
    let result = content;
    for (const pattern of DANGEROUS_HTML_PATTERNS) {
      result = result.replace(pattern, '');
    }
    return result;
  }

  /**
   * Clear element safely
   */
  private clearElement(element: HTMLElement): void {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  /**
   * Check if tag name is valid and safe
   */
  private isValidTagName(tagName: string): boolean {
    const safeTags = [
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'b', 'i', 'u', 'small', 'mark',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img', 'br', 'hr'
    ];
    
    return safeTags.includes(tagName.toLowerCase()) && 
           /^[a-zA-Z][a-zA-Z0-9]*$/.test(tagName);
  }

  /**
   * Check if attribute is safe to set
   */
  private isSafeAttribute(attributeName: string): boolean {
    const safeAttributes = [
      'id', 'class', 'title', 'alt', 'src', 'href', 'target',
      'width', 'height', 'style', 'data-*', 'aria-*', 'role'
    ];
    
    const dangerousAttributes = [
      'onclick', 'onload', 'onerror', 'onmouseover', 'onfocus',
      'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect',
      'onkeydown', 'onkeyup', 'onkeypress'
    ];

    const lowerName = attributeName.toLowerCase();
    
    // Block dangerous event handlers
    if (dangerousAttributes.includes(lowerName) || lowerName.startsWith('on')) {
      return false;
    }

    // Allow safe attributes
    return safeAttributes.some(safe => {
      if (safe.endsWith('*')) {
        return lowerName.startsWith(safe.slice(0, -1));
      }
      return safe === lowerName;
    });
  }

  /**
   * Batch escape multiple content items
   */
  public batchEscape(contents: string[], config?: Partial<HTMLEscapingConfig>): HTMLEscapingResult[] {
    return contents.map(content => this.escapeHTML(content, config));
  }

  /**
   * Get escaping statistics
   */
  public getEscapingStats(content: string): {
    dangerousCharCount: number;
    zeroWidthCharCount: number;
    htmlEntityCount: number;
    estimatedRisk: 'low' | 'medium' | 'high';
  } {
    let dangerousCharCount = 0;
    let zeroWidthCharCount = 0;
    let htmlEntityCount = 0;

    // Count dangerous characters
    for (const char of Object.keys(HTML_ENTITIES)) {
      dangerousCharCount += (content.match(new RegExp(char, 'g')) || []).length;
    }

    // Count zero-width characters
    for (const char of ZERO_WIDTH_CHARS) {
      zeroWidthCharCount += (content.match(new RegExp(char, 'g')) || []).length;
    }

    // Count HTML entities
    htmlEntityCount = (content.match(/&[a-zA-Z0-9#]+;/g) || []).length;

    // Estimate risk level
    let estimatedRisk: 'low' | 'medium' | 'high' = 'low';
    if (dangerousCharCount > 10 || zeroWidthCharCount > 5) {
      estimatedRisk = 'high';
    } else if (dangerousCharCount > 3 || zeroWidthCharCount > 1) {
      estimatedRisk = 'medium';
    }

    return {
      dangerousCharCount,
      zeroWidthCharCount,
      htmlEntityCount,
      estimatedRisk,
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<HTMLEscapingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): HTMLEscapingConfig {
    return { ...this.config };
  }
}

/**
 * Default OutputEscaper instance
 */
export const defaultOutputEscaper = new OutputEscaper();

/**
 * Convenience function for quick HTML escaping
 */
export function escapeHTML(content: string, config?: Partial<HTMLEscapingConfig>): string {
  return defaultOutputEscaper.escapeHTML(content, config).escaped;
}

/**
 * Convenience function for safe DOM insertion
 */
export function safeInsert(targetElement: HTMLElement, content: string, method: 'textContent' | 'createElement' | 'documentFragment' = 'textContent'): void {
  defaultOutputEscaper.safeInsert({
    targetElement,
    content,
    method,
    validate: true,
    clearTarget: false,
  });
}
