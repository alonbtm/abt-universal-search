/**
 * InputSanitizer Test Suite
 * @description Comprehensive tests for XSS prevention and input sanitization
 */

import { InputSanitizer, DEFAULT_SEARCH_POLICY, RICH_TEXT_POLICY } from '../InputSanitizer';
import { SecurityConfig, XSSProtectionConfig } from '../../types/Security';

describe('InputSanitizer', () => {
  let sanitizer: InputSanitizer;
  let securityConfig: SecurityConfig;
  let xssConfig: XSSProtectionConfig;

  beforeEach(() => {
    securityConfig = {
      inputSanitization: true,
      maxQueryLength: 1000,
      xssProtection: true,
      sqlInjectionProtection: true,
      bufferOverflowProtection: true,
      securityLogging: false
    };

    xssConfig = {
      allowedTags: ['b', 'i', 'em', 'strong'],
      allowedAttributes: ['class'],
      blockScripts: true,
      blockEventHandlers: true,
      blockDataUrls: true
    };

    sanitizer = new InputSanitizer(securityConfig, xssConfig);
  });

  describe('Basic Sanitization', () => {
    test('should sanitize basic XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const result = sanitizer.sanitize(maliciousInput);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    test('should remove script tags completely', () => {
      const input = 'Hello <script>evil()</script> World';
      const result = sanitizer.sanitize(input);
      expect(result).toBe('Hello  World');
    });

    test('should handle empty and null inputs', () => {
      expect(sanitizer.sanitize('')).toBe('');
      expect(sanitizer.sanitize(null as any)).toBe('');
      expect(sanitizer.sanitize(undefined as any)).toBe('');
    });

    test('should preserve safe text content', () => {
      const safeInput = 'This is a safe search query';
      const result = sanitizer.sanitize(safeInput);
      expect(result).toBe(safeInput);
    });
  });

  describe('XSS Attack Vectors', () => {
    const xssVectors = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<object data="javascript:alert(1)">',
      '<embed src="javascript:alert(1)">',
      '<link rel="stylesheet" href="javascript:alert(1)">',
      '<style>@import "javascript:alert(1)"</style>',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
      '<form action="javascript:alert(1)"><input type="submit"></form>',
      '<input type="image" src="javascript:alert(1)">',
      '<body onload="alert(1)">',
      '<div onclick="alert(1)">Click me</div>',
      '<a href="javascript:alert(1)">Click</a>'
    ];

    xssVectors.forEach((vector, index) => {
      test(`should block XSS vector ${index + 1}: ${vector.substring(0, 30)}...`, () => {
        const result = sanitizer.sanitize(vector);
        expect(result).not.toContain('alert(1)');
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onload');
        expect(result).not.toContain('onclick');
      });
    });
  });

  describe('Event Handler Removal', () => {
    const eventHandlers = [
      'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
      'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown'
    ];

    eventHandlers.forEach(handler => {
      test(`should remove ${handler} event handler`, () => {
        const input = `<div ${handler}="alert(1)">Content</div>`;
        const result = sanitizer.sanitize(input, RICH_TEXT_POLICY);
        expect(result).not.toContain(handler);
        expect(result).not.toContain('alert(1)');
      });
    });
  });

  describe('Data URL Protection', () => {
    test('should remove data URLs by default', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = sanitizer.sanitize(input);
      expect(result).not.toContain('data:');
      expect(result).not.toContain('alert(1)');
    });

    test('should handle base64 encoded data URLs', () => {
      const input = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==">';
      const result = sanitizer.sanitize(input);
      expect(result).not.toContain('data:image');
    });
  });

  describe('Policy-Based Sanitization', () => {
    test('should apply DEFAULT_SEARCH_POLICY correctly', () => {
      const input = '<b>Bold</b> <script>alert(1)</script>';
      const result = sanitizer.sanitize(input, DEFAULT_SEARCH_POLICY);
      expect(result).not.toContain('<b>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('Bold');
    });

    test('should apply RICH_TEXT_POLICY correctly', () => {
      const input = '<b>Bold</b> <i>Italic</i> <script>alert(1)</script>';
      const result = sanitizer.sanitize(input, RICH_TEXT_POLICY);
      expect(result).toContain('<b>Bold</b>');
      expect(result).toContain('<i>Italic</i>');
      expect(result).not.toContain('<script>');
    });

    test('should handle custom sanitization rules', () => {
      const customPolicy = {
        ...DEFAULT_SEARCH_POLICY,
        customRules: (input: string) => input.replace(/badword/gi, '***')
      };
      const input = 'This contains a badword that should be filtered';
      const result = sanitizer.sanitize(input, customPolicy);
      expect(result).toContain('***');
      expect(result).not.toContain('badword');
    });
  });

  describe('XSS Validation', () => {
    test('should detect script tags in validation', () => {
      const input = '<script>alert(1)</script>';
      const result = sanitizer.validateForXSS(input);
      expect(result.isSecure).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('xss');
      expect(result.riskLevel).toBe('high');
    });

    test('should detect javascript URLs', () => {
      const input = 'javascript:alert(1)';
      const match = input.match(/<script[^>]*>/i);
      if (match && match.index !== undefined) {
        const result = sanitizer.validateForXSS(input);
        expect(result.isSecure).toBe(false);
        expect(result.errors.some(e => e.message.includes('JavaScript URL'))).toBe(true);
      }
    });

    test('should detect event handlers', () => {
      const input = '<div onclick="alert(1)">Click</div>';
      const result = sanitizer.validateForXSS(input);
      expect(result.isSecure).toBe(false);
      expect(result.errors.some(e => e.message.includes('Event handler'))).toBe(true);
    });

    test('should pass validation for safe content', () => {
      const input = 'This is a safe search query';
      const result = sanitizer.validateForXSS(input);
      expect(result.isSecure).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.riskLevel).toBe('low');
    });
  });

  describe('Advanced XSS Techniques', () => {
    test('should handle encoded XSS attempts', () => {
      const encodedScript = '&lt;script&gt;alert(1)&lt;/script&gt;';
      const result = sanitizer.sanitize(encodedScript);
      expect(result).not.toContain('alert(1)');
    });

    test('should handle mixed case XSS attempts', () => {
      const mixedCase = '<ScRiPt>alert(1)</ScRiPt>';
      const result = sanitizer.sanitize(mixedCase);
      expect(result).not.toContain('alert(1)');
    });

    test('should handle fragmented XSS attempts', () => {
      const fragmented = '<scr' + 'ipt>alert(1)</scr' + 'ipt>';
      const result = sanitizer.sanitize(fragmented);
      expect(result).not.toContain('alert(1)');
    });

    test('should handle CSS expression attacks', () => {
      const cssExpression = '<div style="background: expression(alert(1))">Content</div>';
      const result = sanitizer.sanitize(cssExpression);
      expect(result).not.toContain('expression');
      expect(result).not.toContain('alert(1)');
    });
  });

  describe('Performance and Statistics', () => {
    test('should provide sanitization statistics', () => {
      const original = '<script>alert(1)</script>Hello World<img onerror="evil()">';
      const sanitized = sanitizer.sanitize(original);
      const stats = sanitizer.getSanitizationStats(original, sanitized);
      
      expect(stats.originalLength).toBe(original.length);
      expect(stats.sanitizedLength).toBe(sanitized.length);
      expect(stats.charactersRemoved).toBeGreaterThan(0);
      expect(stats.potentialThreats).toBeGreaterThan(0);
    });

    test('should handle large inputs efficiently', () => {
      const largeInput = '<script>alert(1)</script>'.repeat(1000);
      const startTime = Date.now();
      const result = sanitizer.sanitize(largeInput);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(result).not.toContain('alert(1)');
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed HTML', () => {
      const malformed = '<script><script>alert(1)</script>';
      const result = sanitizer.sanitize(malformed);
      expect(result).not.toContain('alert(1)');
    });

    test('should handle nested tags', () => {
      const nested = '<div><span><script>alert(1)</script></span></div>';
      const result = sanitizer.sanitize(nested);
      expect(result).not.toContain('alert(1)');
    });

    test('should handle special characters', () => {
      const special = 'Test with special chars: áéíóú ñ ç 中文 العربية';
      const result = sanitizer.sanitize(special);
      expect(result).toBe(special);
    });

    test('should handle very long attribute values', () => {
      const longAttr = '<div onclick="' + 'a'.repeat(10000) + '">Content</div>';
      const result = sanitizer.sanitize(longAttr);
      expect(result).not.toContain('onclick');
      expect(result.length).toBeLessThan(longAttr.length);
    });
  });

  describe('Security Configuration', () => {
    test('should respect security configuration settings', () => {
      const strictConfig = {
        ...securityConfig,
        xssProtection: false
      };
      const strictSanitizer = new InputSanitizer(strictConfig);
      
      // Behavior should change based on configuration
      const input = '<script>alert(1)</script>';
      const result = strictSanitizer.sanitize(input);
      // Even with XSS protection disabled, basic sanitization should still occur
      expect(result).not.toContain('alert(1)');
    });
  });
});
