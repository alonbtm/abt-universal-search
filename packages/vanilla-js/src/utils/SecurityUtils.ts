/**
 * Security utilities for input sanitization and XSS prevention
 */

export class SecurityUtils {
  private static readonly HTML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  /**
   * Escape HTML characters to prevent XSS
   */
  static escapeHTML(text: string): string {
    return text.replace(/[&<>"'/]/g, (char) => this.HTML_ESCAPE_MAP[char] || char);
  }

  /**
   * Sanitize search query input
   */
  static sanitizeQuery(query: string): string {
    if (typeof query !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters and patterns
    return query
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .slice(0, 1000); // Limit length
  }

  /**
   * Sanitize HTML content for display
   */
  static sanitizeHTML(html: string, allowBasicTags: boolean = false): string {
    if (!allowBasicTags) {
      return this.escapeHTML(html);
    }

    // Allow only basic formatting tags
    const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'mark'];
    const tagRegex = /<\/?(\w+)[^>]*>/g;

    return html.replace(tagRegex, (match, tagName) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        return match;
      }
      return this.escapeHTML(match);
    });
  }

  /**
   * Generate a random ID for search instances
   */
  static generateId(): string {
    return `us-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate URL for API endpoints
   */
  static isValidURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Check if running in secure context (HTTPS or localhost)
   */
  static isSecureContext(): boolean {
    if (typeof window === 'undefined') return true;
    return window.location.protocol === 'https:' || 
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
  }
}