/**
 * URLValidator - URL validation and sanitization with protocol whitelisting
 * @description Provides comprehensive URL validation, protocol checking, and domain validation
 */

import { URLValidationConfig, URLValidationResult } from '../types/Rendering';

/**
 * Default allowed protocols for URLs
 */
const DEFAULT_ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Dangerous protocols that should be blocked
 */
const DANGEROUS_PROTOCOLS = [
  'javascript:', 'vbscript:', 'data:', 'file:', 'ftp:', 'jar:', 'chrome:',
  'chrome-extension:', 'moz-extension:', 'ms-browser-extension:', 'about:',
  'blob:', 'filesystem:', 'intent:', 'android-app:', 'ios-app:'
];

/**
 * Suspicious URL patterns that may indicate attacks
 */
const SUSPICIOUS_URL_PATTERNS = [
  // Homograph attacks (similar looking characters)
  /[а-я]/i, // Cyrillic characters
  /[αβγδεζηθικλμνξοπρστυφχψω]/i, // Greek characters
  // Double encoding
  /%25[0-9a-f]{2}/i,
  // Null bytes
  /%00/i,
  // CRLF injection
  /%0[ad]/i,
  // Unicode normalization attacks
  /\u200[b-f]/,
  // Punycode attacks
  /xn--/i,
];

/**
 * Default URL validation configuration
 */
export const DEFAULT_URL_VALIDATION_CONFIG: URLValidationConfig = {
  allowedProtocols: DEFAULT_ALLOWED_PROTOCOLS,
  allowRelativeURLs: true,
  allowedDomains: undefined, // Allow all domains by default
  blockSuspiciousPatterns: true,
  maxURLLength: 2048,
  validateDomains: false, // Don't validate domain existence by default
};

/**
 * URLValidator class for validating and sanitizing URLs
 */
export class URLValidator {
  private config: URLValidationConfig;

  constructor(config: Partial<URLValidationConfig> = {}) {
    this.config = { ...DEFAULT_URL_VALIDATION_CONFIG, ...config };
  }

  /**
   * Validate and sanitize a URL
   */
  public validateURL(url: string, customConfig?: Partial<URLValidationConfig>): URLValidationResult {
    const config = customConfig ? { ...this.config, ...customConfig } : this.config;
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedURL = url;
    let isValid = true;

    // Basic validation
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        sanitizedURL: '',
        errors: ['URL is required and must be a string'],
        components: this.getEmptyComponents(),
        warnings: [],
      };
    }

    // Check URL length
    if (url.length > config.maxURLLength) {
      errors.push(`URL length ${url.length} exceeds maximum allowed ${config.maxURLLength}`);
      isValid = false;
    }

    // Trim and normalize URL
    sanitizedURL = url.trim();

    // Check for suspicious patterns
    if (config.blockSuspiciousPatterns) {
      const suspiciousFindings = this.checkSuspiciousPatterns(sanitizedURL);
      if (suspiciousFindings.length > 0) {
        warnings.push(...suspiciousFindings);
        // In strict mode, treat suspicious patterns as errors
        if (suspiciousFindings.some(finding => finding.includes('dangerous'))) {
          errors.push('URL contains dangerous patterns');
          isValid = false;
        }
      }
    }

    // Parse URL components
    let components;
    try {
      components = this.parseURLComponents(sanitizedURL);
    } catch (error) {
      errors.push(`Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        sanitizedURL,
        errors,
        components: this.getEmptyComponents(),
        warnings,
      };
    }

    // Validate protocol
    if (components.protocol) {
      if (!this.isProtocolAllowed(components.protocol, config)) {
        errors.push(`Protocol '${components.protocol}' is not allowed`);
        isValid = false;
      }
    } else if (!config.allowRelativeURLs) {
      errors.push('Relative URLs are not allowed');
      isValid = false;
    }

    // Validate domain
    if (components.hostname) {
      const domainValidation = this.validateDomain(components.hostname, config);
      if (!domainValidation.isValid) {
        errors.push(...domainValidation.errors);
        isValid = false;
      }
      warnings.push(...domainValidation.warnings);
    }

    // Sanitize URL components
    if (isValid) {
      sanitizedURL = this.sanitizeURL(components);
    }

    return {
      isValid,
      sanitizedURL,
      errors,
      components,
      warnings,
    };
  }

  /**
   * Batch validate multiple URLs
   */
  public batchValidate(urls: string[], config?: Partial<URLValidationConfig>): URLValidationResult[] {
    return urls.map(url => this.validateURL(url, config));
  }

  /**
   * Check if a protocol is allowed
   */
  public isProtocolAllowed(protocol: string, config?: Partial<URLValidationConfig>): boolean {
    const validationConfig = config ? { ...this.config, ...config } : this.config;
    const normalizedProtocol = protocol.toLowerCase();

    // Check against dangerous protocols first
    if (DANGEROUS_PROTOCOLS.includes(normalizedProtocol)) {
      return false;
    }

    // Check against allowed protocols
    return validationConfig.allowedProtocols.some(allowed => 
      allowed.toLowerCase() === normalizedProtocol
    );
  }

  /**
   * Parse URL into components
   */
  private parseURLComponents(url: string): URLValidationResult['components'] {
    // Handle relative URLs
    if (!url.includes('://') && !url.startsWith('//')) {
      return {
        protocol: '',
        hostname: '',
        pathname: url,
        search: '',
        hash: '',
      };
    }

    try {
      const urlObj = new URL(url);
      return {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        pathname: urlObj.pathname,
        search: urlObj.search,
        hash: urlObj.hash,
      };
    } catch (error) {
      // Try to parse manually for edge cases
      const match = url.match(/^([^:]+:)\/\/([^\/\?#]+)([^\?#]*)(\?[^#]*)?(#.*)?$/);
      if (match) {
        return {
          protocol: match[1] || '',
          hostname: match[2] || '',
          pathname: match[3] || '',
          search: match[4] || '',
          hash: match[5] || '',
        };
      }
      throw new Error('Unable to parse URL');
    }
  }

  /**
   * Validate domain name
   */
  private validateDomain(hostname: string, config: URLValidationConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isValid = true;

    // Check if domain is in allowed list
    if (config.allowedDomains && config.allowedDomains.length > 0) {
      const isAllowed = config.allowedDomains.some(allowed => {
        // Support wildcard subdomains
        if (allowed.startsWith('*.')) {
          const baseDomain = allowed.substring(2);
          return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
        }
        return hostname === allowed;
      });

      if (!isAllowed) {
        errors.push(`Domain '${hostname}' is not in the allowed domains list`);
        isValid = false;
      }
    }

    // Basic domain format validation
    if (hostname) {
      // Check for valid domain format
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!domainRegex.test(hostname)) {
        errors.push(`Invalid domain format: ${hostname}`);
        isValid = false;
      }

      // Check for IP addresses (basic validation)
      const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
      if (ipRegex.test(hostname)) {
        warnings.push(`IP address detected: ${hostname}`);
        // Validate IP ranges
        const parts = hostname.split('.').map(Number);
        if (parts.some(part => part > 255)) {
          errors.push(`Invalid IP address: ${hostname}`);
          isValid = false;
        }
        // Check for private/local IP ranges
        if (this.isPrivateIP(parts)) {
          warnings.push(`Private IP address detected: ${hostname}`);
        }
      }

      // Check for internationalized domain names
      if (hostname.includes('xn--')) {
        warnings.push(`Punycode domain detected: ${hostname}`);
      }
    }

    return { isValid, errors, warnings };
  }

  /**
   * Check for suspicious URL patterns
   */
  private checkSuspiciousPatterns(url: string): string[] {
    const findings: string[] = [];

    for (const pattern of SUSPICIOUS_URL_PATTERNS) {
      if (pattern.test(url)) {
        if (pattern.source.includes('а-я')) {
          findings.push('Cyrillic characters detected (possible homograph attack)');
        } else if (pattern.source.includes('αβγ')) {
          findings.push('Greek characters detected (possible homograph attack)');
        } else if (pattern.source.includes('%25')) {
          findings.push('Double URL encoding detected');
        } else if (pattern.source.includes('%00')) {
          findings.push('Null byte detected (dangerous pattern)');
        } else if (pattern.source.includes('%0')) {
          findings.push('CRLF injection pattern detected (dangerous pattern)');
        } else if (pattern.source.includes('\\u200')) {
          findings.push('Unicode zero-width characters detected');
        } else if (pattern.source.includes('xn--')) {
          findings.push('Punycode detected (possible homograph attack)');
        }
      }
    }

    return findings;
  }

  /**
   * Check if IP is in private range
   */
  private isPrivateIP(parts: number[]): boolean {
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 127.0.0.0/8 (localhost)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;

    return false;
  }

  /**
   * Sanitize URL by reconstructing from validated components
   */
  private sanitizeURL(components: URLValidationResult['components']): string {
    let sanitized = '';

    if (components.protocol) {
      sanitized += components.protocol + '//';
    }

    if (components.hostname) {
      sanitized += components.hostname;
    }

    sanitized += components.pathname || '/';

    if (components.search) {
      sanitized += components.search;
    }

    if (components.hash) {
      sanitized += components.hash;
    }

    return sanitized;
  }

  /**
   * Get empty URL components
   */
  private getEmptyComponents(): URLValidationResult['components'] {
    return {
      protocol: '',
      hostname: '',
      pathname: '',
      search: '',
      hash: '',
    };
  }

  /**
   * Extract domain from URL
   */
  public extractDomain(url: string): string {
    try {
      const components = this.parseURLComponents(url);
      return components.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Check if URL is relative
   */
  public isRelativeURL(url: string): boolean {
    return !url.includes('://') && !url.startsWith('//');
  }

  /**
   * Convert relative URL to absolute
   */
  public makeAbsolute(relativeURL: string, baseURL: string): string {
    try {
      return new URL(relativeURL, baseURL).href;
    } catch {
      return relativeURL;
    }
  }

  /**
   * Get URL validation statistics
   */
  public getValidationStats(urls: string[]): {
    totalURLs: number;
    validURLs: number;
    invalidURLs: number;
    relativeURLs: number;
    suspiciousURLs: number;
    protocolDistribution: Record<string, number>;
  } {
    const stats = {
      totalURLs: urls.length,
      validURLs: 0,
      invalidURLs: 0,
      relativeURLs: 0,
      suspiciousURLs: 0,
      protocolDistribution: {} as Record<string, number>,
    };

    for (const url of urls) {
      const result = this.validateURL(url);
      
      if (result.isValid) {
        stats.validURLs++;
      } else {
        stats.invalidURLs++;
      }

      if (this.isRelativeURL(url)) {
        stats.relativeURLs++;
      }

      if (result.warnings.length > 0) {
        stats.suspiciousURLs++;
      }

      if (result.components.protocol) {
        const protocol = result.components.protocol;
        stats.protocolDistribution[protocol] = (stats.protocolDistribution[protocol] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<URLValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): URLValidationConfig {
    return { ...this.config };
  }
}

/**
 * Default URLValidator instance
 */
export const defaultURLValidator = new URLValidator();

/**
 * Convenience function for quick URL validation
 */
export function validateURL(url: string, config?: Partial<URLValidationConfig>): boolean {
  return defaultURLValidator.validateURL(url, config).isValid;
}

/**
 * Convenience function for URL sanitization
 */
export function sanitizeURL(url: string, config?: Partial<URLValidationConfig>): string {
  const result = defaultURLValidator.validateURL(url, config);
  return result.isValid ? result.sanitizedURL : '';
}
