/**
 * CharacterFilter - Unicode normalization and dangerous character detection
 * @description Advanced character filtering with Unicode normalization and security-focused filtering
 */

import { CharacterFilterConfig, SecurityWarning } from '../types/Security';

/**
 * Dangerous character patterns that could be used in attacks
 */
const DANGEROUS_CHARACTERS = {
  // Control characters
  CONTROL_CHARS: /[\x00-\x1F\x7F-\x9F]/g,
  
  // Zero-width characters (potential for hiding malicious content)
  ZERO_WIDTH: /[\u200B-\u200D\uFEFF]/g,
  
  // Bidirectional override characters (potential for spoofing)
  BIDI_OVERRIDE: /[\u202A-\u202E\u2066-\u2069]/g,
  
  // Homograph attack characters (confusable with ASCII)
  HOMOGRAPH_CYRILLIC: /[а-я]/g, // Cyrillic that looks like Latin
  HOMOGRAPH_GREEK: /[α-ω]/g,    // Greek that looks like Latin
  
  // Format characters that could be used for obfuscation
  FORMAT_CHARS: /[\u061C\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g,
  
  // Private use area (could contain malicious content)
  PRIVATE_USE: /[\uE000-\uF8FF\uF0000-\uFFFFD\u100000-\u10FFFD]/g
};

/**
 * Character normalization forms
 */
export type NormalizationForm = 'NFC' | 'NFD' | 'NFKC' | 'NFKD';

/**
 * Character filter with Unicode normalization
 */
export class CharacterFilter {
  private config: CharacterFilterConfig;
  private normalizationForm: NormalizationForm;

  constructor(config?: CharacterFilterConfig, normalizationForm: NormalizationForm = 'NFC') {
    this.config = config || {
      removeCharacters: ['\0', '\r', '\n', '\t'],
      escapeCharacters: ['<', '>', '"', "'", '&'],
      allowUnicode: true,
      allowInternational: true,
      whitelist: /^[a-zA-Z0-9\s\-_.@#$%&*()+=[\]{}|;:'"<>?/\\,!~`^]*$/,
      blacklist: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/
    };
    this.normalizationForm = normalizationForm;
  }

  /**
   * Filter and normalize input string
   */
  public filter(input: string): { filtered: string; warnings: SecurityWarning[] } {
    if (!input || typeof input !== 'string') {
      return { filtered: '', warnings: [] };
    }

    const warnings: SecurityWarning[] = [];
    let filtered = input;

    // Detect dangerous characters before filtering
    const dangerousCharWarnings = this.detectDangerousCharacters(filtered);
    warnings.push(...dangerousCharWarnings);

    // Unicode normalization
    filtered = this.normalizeUnicode(filtered);

    // Remove specified characters
    if (this.config.removeCharacters) {
      filtered = this.removeCharacters(filtered, this.config.removeCharacters);
    }

    // Escape specified characters
    if (this.config.escapeCharacters) {
      filtered = this.escapeCharacters(filtered, this.config.escapeCharacters);
    }

    // Apply whitelist/blacklist filtering
    const filterResult = this.applyCharacterFilters(filtered);
    filtered = filterResult.filtered;
    warnings.push(...filterResult.warnings);

    // International character validation
    if (!this.config.allowInternational) {
      const intlResult = this.filterInternationalCharacters(filtered);
      filtered = intlResult.filtered;
      warnings.push(...intlResult.warnings);
    }

    return { filtered, warnings };
  }

  /**
   * Normalize Unicode string using specified form
   */
  private normalizeUnicode(input: string): string {
    try {
      return input.normalize(this.normalizationForm);
    } catch (error) {
      // Fallback if normalization fails
      return input;
    }
  }

  /**
   * Remove specified characters from input
   */
  private removeCharacters(input: string, charactersToRemove: string[]): string {
    let result = input;
    charactersToRemove.forEach(char => {
      const pattern = new RegExp(this.escapeRegExp(char), 'g');
      result = result.replace(pattern, '');
    });
    return result;
  }

  /**
   * Escape specified characters in input
   */
  private escapeCharacters(input: string, charactersToEscape: string[]): string {
    const escapeMap: { [key: string]: string } = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    };

    let result = input;
    charactersToEscape.forEach(char => {
      if (escapeMap[char]) {
        const pattern = new RegExp(this.escapeRegExp(char), 'g');
        result = result.replace(pattern, escapeMap[char]);
      }
    });

    return result;
  }

  /**
   * Apply whitelist/blacklist character filtering
   */
  private applyCharacterFilters(input: string): { filtered: string; warnings: SecurityWarning[] } {
    const warnings: SecurityWarning[] = [];
    let filtered = input;

    // Apply blacklist first
    if (this.config.blacklist) {
      const blacklistMatches = input.match(this.config.blacklist);
      if (blacklistMatches) {
        warnings.push({
          type: 'character_concern',
          message: `Blacklisted characters detected: ${blacklistMatches.join(', ')}`,
          recommendation: 'Remove or replace blacklisted characters'
        });
        filtered = filtered.replace(this.config.blacklist, '');
      }
    }

    // Apply whitelist
    if (this.config.whitelist && !this.config.allowUnicode) {
      const invalidChars = filtered.split('').filter(char => !this.config.whitelist!.test(char));
      if (invalidChars.length > 0) {
        warnings.push({
          type: 'character_concern',
          message: `Non-whitelisted characters detected: ${[...new Set(invalidChars)].join(', ')}`,
          recommendation: 'Use only allowed characters'
        });
        filtered = filtered.split('').filter(char => this.config.whitelist!.test(char)).join('');
      }
    }

    return { filtered, warnings };
  }

  /**
   * Filter international characters if not allowed
   */
  private filterInternationalCharacters(input: string): { filtered: string; warnings: SecurityWarning[] } {
    const warnings: SecurityWarning[] = [];
    
    // ASCII range: 0-127
    const nonAsciiChars = input.match(/[^\x00-\x7F]/g);
    if (nonAsciiChars) {
      warnings.push({
        type: 'character_concern',
        message: `International characters detected: ${[...new Set(nonAsciiChars)].slice(0, 10).join(', ')}`,
        recommendation: 'Review international character usage'
      });
      
      // Remove non-ASCII characters
      const filtered = input.replace(/[^\x00-\x7F]/g, '');
      return { filtered, warnings };
    }

    return { filtered: input, warnings };
  }

  /**
   * Detect dangerous characters that could be used in attacks
   */
  private detectDangerousCharacters(input: string): SecurityWarning[] {
    const warnings: SecurityWarning[] = [];

    // Check for control characters
    if (DANGEROUS_CHARACTERS.CONTROL_CHARS.test(input)) {
      warnings.push({
        type: 'character_concern',
        message: 'Control characters detected in input',
        recommendation: 'Remove control characters to prevent injection attacks'
      });
    }

    // Check for zero-width characters
    if (DANGEROUS_CHARACTERS.ZERO_WIDTH.test(input)) {
      warnings.push({
        type: 'suspicious_pattern',
        message: 'Zero-width characters detected',
        recommendation: 'Remove zero-width characters that could hide malicious content'
      });
    }

    // Check for bidirectional override characters
    if (DANGEROUS_CHARACTERS.BIDI_OVERRIDE.test(input)) {
      warnings.push({
        type: 'suspicious_pattern',
        message: 'Bidirectional override characters detected',
        recommendation: 'Remove bidi override characters to prevent text spoofing'
      });
    }

    // Check for homograph attack characters
    if (DANGEROUS_CHARACTERS.HOMOGRAPH_CYRILLIC.test(input) || 
        DANGEROUS_CHARACTERS.HOMOGRAPH_GREEK.test(input)) {
      warnings.push({
        type: 'suspicious_pattern',
        message: 'Potential homograph attack characters detected',
        recommendation: 'Review mixed script usage for potential spoofing'
      });
    }

    // Check for format characters
    if (DANGEROUS_CHARACTERS.FORMAT_CHARS.test(input)) {
      warnings.push({
        type: 'character_concern',
        message: 'Format characters detected',
        recommendation: 'Remove format characters that could be used for obfuscation'
      });
    }

    // Check for private use area characters
    if (DANGEROUS_CHARACTERS.PRIVATE_USE.test(input)) {
      warnings.push({
        type: 'suspicious_pattern',
        message: 'Private use area characters detected',
        recommendation: 'Review private use characters for potential malicious content'
      });
    }

    return warnings;
  }

  /**
   * Check if string contains only safe characters
   */
  public isSafe(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return true;
    }

    // Check against all dangerous character patterns
    for (const pattern of Object.values(DANGEROUS_CHARACTERS)) {
      if (pattern.test(input)) {
        return false;
      }
    }

    // Check blacklist
    if (this.config.blacklist && this.config.blacklist.test(input)) {
      return false;
    }

    // Check whitelist (if Unicode not allowed)
    if (this.config.whitelist && !this.config.allowUnicode && !this.config.whitelist.test(input)) {
      return false;
    }

    return true;
  }

  /**
   * Get character statistics for input
   */
  public getCharacterStats(input: string) {
    if (!input || typeof input !== 'string') {
      return {
        totalLength: 0,
        asciiCount: 0,
        unicodeCount: 0,
        controlCharCount: 0,
        dangerousCharCount: 0,
        normalizationChanged: false
      };
    }

    const normalized = this.normalizeUnicode(input);
    const asciiChars = input.match(/[\x00-\x7F]/g) || [];
    const unicodeChars = input.match(/[^\x00-\x7F]/g) || [];
    const controlChars = input.match(DANGEROUS_CHARACTERS.CONTROL_CHARS) || [];
    
    let dangerousCharCount = 0;
    Object.values(DANGEROUS_CHARACTERS).forEach(pattern => {
      const matches = input.match(pattern);
      if (matches) {
        dangerousCharCount += matches.length;
      }
    });

    return {
      totalLength: input.length,
      asciiCount: asciiChars.length,
      unicodeCount: unicodeChars.length,
      controlCharCount: controlChars.length,
      dangerousCharCount,
      normalizationChanged: input !== normalized
    };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Clean input by removing all dangerous characters
   */
  public clean(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let cleaned = input;

    // Remove all dangerous character patterns
    Object.values(DANGEROUS_CHARACTERS).forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Normalize Unicode
    cleaned = this.normalizeUnicode(cleaned);

    // Apply configured filters
    const filterResult = this.filter(cleaned);
    return filterResult.filtered;
  }

  /**
   * Validate character encoding
   */
  public validateEncoding(input: string): { isValid: boolean; warnings: SecurityWarning[] } {
    const warnings: SecurityWarning[] = [];
    let isValid = true;

    try {
      // Test if string can be properly encoded/decoded
      const encoded = encodeURIComponent(input);
      const decoded = decodeURIComponent(encoded);
      
      if (decoded !== input) {
        warnings.push({
          type: 'unusual_encoding',
          message: 'Character encoding inconsistency detected',
          recommendation: 'Verify character encoding integrity'
        });
        isValid = false;
      }
    } catch (error) {
      warnings.push({
        type: 'unusual_encoding',
        message: 'Invalid character encoding detected',
        recommendation: 'Fix character encoding before processing'
      });
      isValid = false;
    }

    // Check for mixed encoding indicators
    const hasBOM = input.charCodeAt(0) === 0xFEFF;
    if (hasBOM) {
      warnings.push({
        type: 'unusual_encoding',
        message: 'Byte Order Mark (BOM) detected',
        recommendation: 'Remove BOM from input string'
      });
    }

    return { isValid, warnings };
  }
}
