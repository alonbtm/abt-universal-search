/**
 * SecurityGuard Test Suite
 * @description Comprehensive tests for SQL injection protection and security constraint enforcement
 */

import { SecurityGuard } from '../SecurityGuard';
import { SecurityConfig, SQLInjectionConfig } from '../../types/Security';

describe('SecurityGuard', () => {
  let securityGuard: SecurityGuard;
  let securityConfig: SecurityConfig;
  let sqlConfig: SQLInjectionConfig;

  beforeEach(() => {
    securityConfig = {
      inputSanitization: true,
      maxQueryLength: 1000,
      xssProtection: true,
      sqlInjectionProtection: true,
      bufferOverflowProtection: true,
      securityLogging: false
    };

    sqlConfig = {
      enforceParameterized: true,
      blockedKeywords: ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'UNION', 'SELECT'],
      injectionPatterns: [
        /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
        /(\band\b|\bor\b)\s+\d+\s*[=<>]\s*\d+/i,
        /;\s*(drop|delete|insert|update|create|alter)\b/i
      ],
      escapeSpecialChars: true,
      allowStoredProcedures: false
    };

    securityGuard = new SecurityGuard(securityConfig, sqlConfig);
  });

  describe('SQL Injection Detection', () => {
    const sqlInjectionVectors = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users --",
      "1; DELETE FROM users",
      "' OR 1=1 --",
      "admin' OR 'a'='a",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --",
      "' OR SLEEP(5) --",
      "1' UNION ALL SELECT NULL,NULL,NULL --",
      "admin'; EXEC xp_cmdshell('dir'); --"
    ];

    sqlInjectionVectors.forEach((vector, index) => {
      test(`should detect SQL injection vector ${index + 1}: ${vector}`, () => {
        const result = securityGuard.validateInput(vector);
        expect(result.isSecure).toBe(false);
        expect(result.errors.some(e => e.type === 'sql_injection')).toBe(true);
        expect(result.riskLevel).toMatch(/high|critical/);
      });
    });
  });

  describe('SQL Keyword Detection', () => {
    const dangerousKeywords = [
      'DROP TABLE users',
      'DELETE FROM accounts',
      'INSERT INTO admin',
      'UPDATE users SET',
      'UNION SELECT password',
      'SELECT * FROM'
    ];

    dangerousKeywords.forEach(keyword => {
      test(`should detect dangerous SQL keyword: ${keyword}`, () => {
        const result = securityGuard.validateInput(keyword);
        expect(result.isSecure).toBe(false);
        expect(result.errors.some(e => e.message.includes('SQL keyword'))).toBe(true);
      });
    });
  });

  describe('Security Constraint Validation', () => {
    test('should detect script injection attempts', () => {
      const scriptInjection = '<script>alert("xss")</script>';
      const result = securityGuard.validateInput(scriptInjection);
      expect(result.isSecure).toBe(false);
      expect(result.errors.some(e => e.message.includes('Script injection'))).toBe(true);
    });

    test('should detect path traversal attempts', () => {
      const pathTraversal = '../../../etc/passwd';
      const result = securityGuard.validateInput(pathTraversal);
      expect(result.isSecure).toBe(false);
      expect(result.errors.some(e => e.message.includes('Path traversal'))).toBe(true);
    });

    test('should detect command injection characters', () => {
      const commandInjection = 'test; rm -rf /';
      const result = securityGuard.validateInput(commandInjection);
      expect(result.isSecure).toBe(false);
      expect(result.errors.some(e => e.message.includes('Command injection'))).toBe(true);
    });
  });

  describe('Suspicious Pattern Detection', () => {
    test('should warn about high concentration of special characters', () => {
      const specialChars = '!@#$%^&*()_+{}|:"<>?[]\\;\',./' + '!@#$%^&*()';
      const result = securityGuard.validateInput(specialChars);
      expect(result.warnings.some(w => w.message.includes('special characters'))).toBe(true);
    });

    test('should detect repeated patterns', () => {
      const repeatedPattern = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const result = securityGuard.validateInput(repeatedPattern);
      expect(result.warnings.some(w => w.message.includes('Repeated patterns'))).toBe(true);
    });

    test('should detect URL encoding', () => {
      const urlEncoded = '%3Cscript%3Ealert%281%29%3C%2Fscript%3E';
      const result = securityGuard.validateInput(urlEncoded);
      expect(result.warnings.some(w => w.message.includes('URL encoding'))).toBe(true);
    });

    test('should detect null bytes', () => {
      const nullByte = 'test\0malicious';
      const result = securityGuard.validateInput(nullByte);
      expect(result.warnings.some(w => w.message.includes('Null byte'))).toBe(true);
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize SQL injection attempts', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const sanitized = securityGuard.sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('DROP');
      expect(sanitized).not.toContain('TABLE');
      expect(sanitized).not.toContain(';');
    });

    test('should escape special characters when configured', () => {
      const input = "test'quote\"double\\backslash";
      const sanitized = securityGuard.sanitizeInput(input);
      expect(sanitized).toContain("''"); // Escaped single quote
      expect(sanitized).toContain('""'); // Escaped double quote
    });

    test('should remove blocked patterns', () => {
      const input = '<script>alert(1)</script>normal text';
      const sanitized = securityGuard.sanitizeInput(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('normal text');
    });
  });

  describe('Database Safety Checks', () => {
    test('should identify safe database inputs', () => {
      const safeInputs = [
        'john.doe@example.com',
        'Product Name 123',
        'Search query with spaces',
        '2023-12-25'
      ];

      safeInputs.forEach(input => {
        expect(securityGuard.isSafeForDatabase(input)).toBe(true);
      });
    });

    test('should identify unsafe database inputs', () => {
      const unsafeInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "UNION SELECT password FROM users"
      ];

      unsafeInputs.forEach(input => {
        expect(securityGuard.isSafeForDatabase(input)).toBe(false);
      });
    });
  });

  describe('Risk Level Calculation', () => {
    test('should return critical risk for severe SQL injection', () => {
      const criticalInput = "'; DROP DATABASE production; --";
      const result = securityGuard.validateInput(criticalInput);
      expect(result.riskLevel).toBe('critical');
    });

    test('should return high risk for union-based injection', () => {
      const highRiskInput = "' UNION SELECT password FROM users --";
      const result = securityGuard.validateInput(highRiskInput);
      expect(result.riskLevel).toBe('high');
    });

    test('should return low risk for safe input', () => {
      const safeInput = 'normal search query';
      const result = securityGuard.validateInput(safeInput);
      expect(result.riskLevel).toBe('low');
    });
  });

  describe('Security Recommendations', () => {
    test('should provide SQL injection recommendations', () => {
      const sqlInput = "'; DROP TABLE users; --";
      const result = securityGuard.validateInput(sqlInput);
      expect(result.recommendations.some(r => r.includes('parameterized queries'))).toBe(true);
    });

    test('should provide XSS recommendations', () => {
      const xssInput = '<script>alert("xss")</script>';
      const result = securityGuard.validateInput(xssInput);
      expect(result.recommendations.some(r => r.includes('sanitize') || r.includes('CSP'))).toBe(true);
    });

    test('should provide encoding recommendations', () => {
      const encodedInput = '%3Cscript%3E';
      const result = securityGuard.validateInput(encodedInput);
      expect(result.recommendations.some(r => r.includes('encoded'))).toBe(true);
    });
  });

  describe('Performance and Metrics', () => {
    test('should provide security metrics', () => {
      const input = "'; DROP TABLE users; --";
      const metrics = securityGuard.getSecurityMetrics(input);
      
      expect(metrics.inputLength).toBe(input.length);
      expect(metrics.threatsDetected).toBeGreaterThan(0);
      expect(metrics.riskLevel).toMatch(/high|critical/);
      expect(metrics.isSecure).toBe(false);
    });

    test('should handle large inputs efficiently', () => {
      const largeInput = "'; DROP TABLE users; --".repeat(100);
      const startTime = Date.now();
      const result = securityGuard.validateInput(largeInput);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(result.isSecure).toBe(false);
    });
  });

  describe('Custom Security Constraints', () => {
    test('should apply custom constraints', () => {
      const customConstraints = [{
        name: 'custom_pattern',
        pattern: /forbidden_word/i,
        severity: 'high' as const,
        message: 'Forbidden word detected',
        action: 'block' as const
      }];

      const customGuard = new SecurityGuard(securityConfig, sqlConfig, customConstraints);
      const result = customGuard.validateInput('This contains forbidden_word');
      
      expect(result.isSecure).toBe(false);
      expect(result.errors.some(e => e.message.includes('Forbidden word'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty and null inputs', () => {
      expect(securityGuard.validateInput('').isSecure).toBe(true);
      expect(securityGuard.validateInput(null as any).isSecure).toBe(true);
      expect(securityGuard.validateInput(undefined as any).isSecure).toBe(true);
    });

    test('should handle very long inputs', () => {
      const longInput = 'a'.repeat(10000);
      const result = securityGuard.validateInput(longInput);
      expect(result).toBeDefined();
      expect(typeof result.isSecure).toBe('boolean');
    });

    test('should handle special Unicode characters', () => {
      const unicodeInput = '测试 العربية русский 🚀';
      const result = securityGuard.validateInput(unicodeInput);
      expect(result.isSecure).toBe(true);
    });

    test('should handle mixed attack vectors', () => {
      const mixedAttack = "'; DROP TABLE users; --<script>alert(1)</script>../../../etc/passwd";
      const result = securityGuard.validateInput(mixedAttack);
      expect(result.isSecure).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.riskLevel).toBe('critical');
    });
  });

  describe('Configuration Flexibility', () => {
    test('should work with minimal configuration', () => {
      const minimalGuard = new SecurityGuard(securityConfig);
      const result = minimalGuard.validateInput("'; DROP TABLE users; --");
      expect(result.isSecure).toBe(false);
    });

    test('should respect SQL configuration settings', () => {
      const permissiveConfig = {
        ...sqlConfig,
        blockedKeywords: [], // No blocked keywords
        injectionPatterns: [] // No injection patterns
      };
      
      const permissiveGuard = new SecurityGuard(securityConfig, permissiveConfig);
      const result = permissiveGuard.validateInput('SELECT * FROM users');
      // Should be more permissive but still catch other security issues
      expect(result).toBeDefined();
    });
  });
});
