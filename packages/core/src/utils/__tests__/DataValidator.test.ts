/**
 * Data Validator Tests
 * @description Test suite for the AdvancedDataValidator and ValidationFunctions
 */

import { 
  AdvancedDataValidator, 
  ValidationFunctions,
  ValidationPatterns
} from '../DataValidator';
import type { ValidationRule, ValidationContext } from '../../types/Results';

describe('ValidationFunctions', () => {
  const mockContext: ValidationContext = {
    fieldName: 'testField',
    objectIndex: 0
  };

  describe('Required Validation', () => {
    it('should pass for non-null, non-empty values', () => {
      expect(ValidationFunctions.required('test', mockContext).valid).toBe(true);
      expect(ValidationFunctions.required(123, mockContext).valid).toBe(true);
      expect(ValidationFunctions.required(false, mockContext).valid).toBe(true);
      expect(ValidationFunctions.required([], mockContext).valid).toBe(true);
    });

    it('should fail for null, undefined, or empty values', () => {
      expect(ValidationFunctions.required(null, mockContext).valid).toBe(false);
      expect(ValidationFunctions.required(undefined, mockContext).valid).toBe(false);
      expect(ValidationFunctions.required('', mockContext).valid).toBe(false);
    });

    it('should provide meaningful error messages', () => {
      const result = ValidationFunctions.required(null, mockContext);
      expect(result.message).toContain('testField');
      expect(result.message).toContain('required');
    });
  });

  describe('String Validation', () => {
    const stringValidator = ValidationFunctions.string(3, 10);

    it('should pass for valid strings within length constraints', () => {
      expect(stringValidator('hello', mockContext).valid).toBe(true);
      expect(stringValidator('abc', mockContext).valid).toBe(true);
      expect(stringValidator('1234567890', mockContext).valid).toBe(true);
    });

    it('should fail for non-strings', () => {
      expect(stringValidator(123, mockContext).valid).toBe(false);
      expect(stringValidator(null, mockContext).valid).toBe(true); // null is allowed
    });

    it('should fail for strings outside length constraints', () => {
      expect(stringValidator('ab', mockContext).valid).toBe(false);
      expect(stringValidator('12345678901', mockContext).valid).toBe(false);
    });

    it('should work without length constraints', () => {
      const anyStringValidator = ValidationFunctions.string();
      expect(anyStringValidator('any string', mockContext).valid).toBe(true);
      expect(anyStringValidator('', mockContext).valid).toBe(true);
    });
  });

  describe('Number Validation', () => {
    const numberValidator = ValidationFunctions.number(0, 100);

    it('should pass for valid numbers within range', () => {
      expect(numberValidator(50, mockContext).valid).toBe(true);
      expect(numberValidator(0, mockContext).valid).toBe(true);
      expect(numberValidator(100, mockContext).valid).toBe(true);
      expect(numberValidator('75', mockContext).valid).toBe(true); // String numbers
    });

    it('should fail for non-numbers', () => {
      expect(numberValidator('not-a-number', mockContext).valid).toBe(false);
      expect(numberValidator(null, mockContext).valid).toBe(true); // null is allowed
    });

    it('should fail for numbers outside range', () => {
      expect(numberValidator(-1, mockContext).valid).toBe(false);
      expect(numberValidator(101, mockContext).valid).toBe(false);
    });

    it('should work without range constraints', () => {
      const anyNumberValidator = ValidationFunctions.number();
      expect(anyNumberValidator(999999, mockContext).valid).toBe(true);
      expect(anyNumberValidator(-999999, mockContext).valid).toBe(true);
    });
  });

  describe('Email Validation', () => {
    it('should pass for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'first+last@company.co.uk',
        'number123@test.io'
      ];

      validEmails.forEach(email => {
        expect(ValidationFunctions.email(email, mockContext).valid).toBe(true);
      });
    });

    it('should fail for invalid email addresses', () => {
      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user space@domain.com',
        123
      ];

      invalidEmails.forEach(email => {
        expect(ValidationFunctions.email(email, mockContext).valid).toBe(false);
      });
    });

    it('should allow null values', () => {
      expect(ValidationFunctions.email(null, mockContext).valid).toBe(true);
      expect(ValidationFunctions.email(undefined, mockContext).valid).toBe(true);
    });
  });

  describe('URL Validation', () => {
    it('should pass for valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://test.org/path',
        'https://domain.com:8080/page?param=value',
        'ftp://files.example.com/file.txt'
      ];

      validUrls.forEach(url => {
        expect(ValidationFunctions.url(url, mockContext).valid).toBe(true);
      });
    });

    it('should fail for invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'example.com', // Missing protocol
        'https://',
        'http://invalid space.com',
        123
      ];

      invalidUrls.forEach(url => {
        expect(ValidationFunctions.url(url, mockContext).valid).toBe(false);
      });
    });
  });

  describe('Array Validation', () => {
    const arrayValidator = ValidationFunctions.array(1, 5);

    it('should pass for valid arrays within constraints', () => {
      expect(arrayValidator([1], mockContext).valid).toBe(true);
      expect(arrayValidator([1, 2, 3], mockContext).valid).toBe(true);
      expect(arrayValidator([1, 2, 3, 4, 5], mockContext).valid).toBe(true);
    });

    it('should fail for non-arrays', () => {
      expect(arrayValidator('not array', mockContext).valid).toBe(false);
      expect(arrayValidator(123, mockContext).valid).toBe(false);
    });

    it('should fail for arrays outside size constraints', () => {
      expect(arrayValidator([], mockContext).valid).toBe(false);
      expect(arrayValidator([1, 2, 3, 4, 5, 6], mockContext).valid).toBe(false);
    });

    it('should allow null values', () => {
      expect(arrayValidator(null, mockContext).valid).toBe(true);
    });
  });

  describe('OneOf Validation', () => {
    const oneOfValidator = ValidationFunctions.oneOf(['red', 'green', 'blue']);

    it('should pass for values in allowed list', () => {
      expect(oneOfValidator('red', mockContext).valid).toBe(true);
      expect(oneOfValidator('green', mockContext).valid).toBe(true);
      expect(oneOfValidator('blue', mockContext).valid).toBe(true);
    });

    it('should fail for values not in allowed list', () => {
      expect(oneOfValidator('yellow', mockContext).valid).toBe(false);
      expect(oneOfValidator('RED', mockContext).valid).toBe(false); // Case sensitive
      expect(oneOfValidator(123, mockContext).valid).toBe(false);
    });

    it('should allow null values', () => {
      expect(oneOfValidator(null, mockContext).valid).toBe(true);
    });
  });

  describe('Pattern Validation', () => {
    const patternValidator = ValidationFunctions.pattern(/^\d{3}-\d{3}-\d{4}$/);

    it('should pass for strings matching pattern', () => {
      expect(patternValidator('123-456-7890', mockContext).valid).toBe(true);
      expect(patternValidator('000-000-0000', mockContext).valid).toBe(true);
    });

    it('should fail for strings not matching pattern', () => {
      expect(patternValidator('123-45-6789', mockContext).valid).toBe(false);
      expect(patternValidator('not-a-phone', mockContext).valid).toBe(false);
    });

    it('should fail for non-strings', () => {
      expect(patternValidator(1234567890, mockContext).valid).toBe(false);
    });

    it('should provide custom error messages', () => {
      const customValidator = ValidationFunctions.pattern(/\d+/, 'Must contain digits');
      const result = customValidator('abc', mockContext);
      expect(result.message).toContain('Must contain digits');
    });
  });
});

describe('AdvancedDataValidator', () => {
  let validator: AdvancedDataValidator;

  beforeEach(() => {
    validator = new AdvancedDataValidator();
  });

  describe('Rule Management', () => {
    it('should add validation rules', () => {
      const rule: ValidationRule = {
        validate: ValidationFunctions.required,
        severity: 'error'
      };

      validator.addRule('name', rule);
      
      const result = validator.validateField('name', null);
      expect(result.valid).toBe(false);
    });

    it('should add multiple rules to same field', () => {
      validator.addRules('email', [
        { validate: ValidationFunctions.required, severity: 'error' },
        { validate: ValidationFunctions.email, severity: 'error' }
      ]);

      const result = validator.validateField('email', 'invalid-email');
      expect(result.valid).toBe(false);
    });

    it('should set fallback values', () => {
      validator.setFallback('name', 'Default Name');
      
      const result = validator.validateField('name', null);
      expect(result.finalValue).toBe('Default Name');
      expect(result.usedFallback).toBe(true);
    });
  });

  describe('Field Validation', () => {
    beforeEach(() => {
      validator.addRule('name', {
        validate: ValidationFunctions.required,
        severity: 'error'
      });
      validator.addRule('email', {
        validate: ValidationFunctions.email,
        severity: 'warning'
      });
      validator.setFallback('description', 'No description');
    });

    it('should validate single fields successfully', () => {
      const result = validator.validateField('name', 'John Doe');
      
      expect(result.valid).toBe(true);
      expect(result.field).toBe('name');
      expect(result.finalValue).toBe('John Doe');
      expect(result.usedFallback).toBe(false);
    });

    it('should handle validation failures', () => {
      const result = validator.validateField('name', null);
      
      expect(result.valid).toBe(false);
      expect(result.severity).toBe('error');
      expect(result.message).toContain('required');
    });

    it('should apply fallback values on validation failure', () => {
      validator.addRule('description', {
        validate: ValidationFunctions.required,
        severity: 'error'
      });

      const result = validator.validateField('description', null);
      
      expect(result.valid).toBe(true); // Valid after fallback
      expect(result.finalValue).toBe('No description');
      expect(result.usedFallback).toBe(true);
      expect(result.severity).toBe('warning'); // Downgraded severity
    });
  });

  describe('Object Validation', () => {
    beforeEach(() => {
      validator.addRules('name', [
        { validate: ValidationFunctions.required, severity: 'error' },
        { validate: ValidationFunctions.string(2, 50), severity: 'error' }
      ]);
      validator.addRule('email', {
        validate: ValidationFunctions.email,
        severity: 'warning'
      });
      validator.addRule('age', {
        validate: ValidationFunctions.number(0, 120),
        severity: 'error'
      });
      
      validator.setFallback('name', 'Unknown');
      validator.setFallback('age', 0);
    });

    it('should validate complete objects', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      const result = validator.validateObject(obj);
      
      expect(result.valid).toBe(true);
      expect(result.fieldResults.length).toBe(3);
      expect(result.errorCount.error).toBe(0);
      expect(result.validationTime).toBeGreaterThan(0);
    });

    it('should handle validation errors', () => {
      const obj = {
        name: '', // Invalid: too short
        email: 'invalid-email',
        age: 150 // Invalid: too old
      };

      const result = validator.validateObject(obj);
      
      expect(result.valid).toBe(false);
      expect(result.errorCount.error).toBeGreaterThan(0);
      expect(result.fieldResults.some(f => !f.valid)).toBe(true);
    });

    it('should apply fallback values', () => {
      const obj = {
        email: 'john@example.com'
        // name and age are missing
      };

      const result = validator.validateObject(obj);
      
      expect(result.validatedObject.name).toBe('Unknown');
      expect(result.validatedObject.age).toBe(0);
      
      const nameResult = result.fieldResults.find(f => f.field === 'name');
      expect(nameResult?.usedFallback).toBe(true);
    });

    it('should validate arrays of objects', () => {
      const objects = [
        { name: 'John', email: 'john@example.com', age: 30 },
        { name: 'Jane', email: 'jane@example.com', age: 25 },
        { name: '', email: 'invalid', age: 200 } // Invalid object
      ];

      const results = validator.validateObjects(objects);
      
      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
      expect(results[2].valid).toBe(false);
    });
  });

  describe('Fluent Schema Builder', () => {
    it('should build validation schema fluently', () => {
      const validator = new AdvancedDataValidator()
        .schema()
        .field('name')
          .required()
          .string(2, 50)
          .fallback('Unknown')
        .field('email')
          .email()
        .field('age')
          .number(0, 120)
          .fallback(18)
        .field('website')
          .url()
        .build();

      const result = validator.validateObject({
        name: 'John',
        email: 'john@example.com',
        age: 30,
        website: 'https://john.com'
      });

      expect(result.valid).toBe(true);
    });

    it('should handle custom validation functions', () => {
      const isEvenNumber = (value: unknown, context: ValidationContext) => ({
        valid: typeof value === 'number' && value % 2 === 0,
        message: `${context.fieldName} must be an even number`
      });

      const validator = new AdvancedDataValidator()
        .schema()
        .field('evenNumber')
          .custom(isEvenNumber)
        .build();

      expect(validator.validateField('evenNumber', 4).valid).toBe(true);
      expect(validator.validateField('evenNumber', 3).valid).toBe(false);
    });

    it('should support enum validation', () => {
      const validator = new AdvancedDataValidator()
        .schema()
        .field('status')
          .oneOf(['active', 'inactive', 'pending'])
        .build();

      expect(validator.validateField('status', 'active').valid).toBe(true);
      expect(validator.validateField('status', 'invalid').valid).toBe(false);
    });

    it('should support pattern validation', () => {
      const validator = new AdvancedDataValidator()
        .schema()
        .field('phoneNumber')
          .pattern(ValidationPatterns.PHONE, 'Invalid phone number format')
        .build();

      expect(validator.validateField('phoneNumber', '+1234567890').valid).toBe(true);
      expect(validator.validateField('phoneNumber', 'not-a-phone').valid).toBe(false);
    });
  });

  describe('Statistics and Performance', () => {
    beforeEach(() => {
      validator.addRule('name', {
        validate: ValidationFunctions.required,
        severity: 'error'
      });
      validator.setFallback('name', 'Default');
    });

    it('should track validation statistics', () => {
      validator.validateField('name', 'John');
      validator.validateField('name', null); // Uses fallback
      validator.validateField('nonexistent', 'value');

      const stats = validator.getStats();
      
      expect(stats.totalValidations).toBe(3);
      expect(stats.successfulValidations).toBeGreaterThan(0);
      expect(stats.fallbacksUsed).toBe(1);
      expect(stats.averageValidationTime).toBeGreaterThan(0);
    });

    it('should calculate success rate', () => {
      validator.validateField('name', 'John');
      validator.validateField('name', 'Jane');
      validator.validateField('name', null); // Uses fallback, still "successful"

      const stats = validator.getStats();
      expect(stats.successRate).toBe(1.0); // All validations succeeded (with fallbacks)
    });

    it('should reset statistics', () => {
      validator.validateField('name', 'John');
      expect(validator.getStats().totalValidations).toBe(1);
      
      validator.resetStats();
      expect(validator.getStats().totalValidations).toBe(0);
    });
  });

  describe('Validation Patterns', () => {
    it('should provide common validation patterns', () => {
      expect(ValidationPatterns.PHONE).toBeInstanceOf(RegExp);
      expect(ValidationPatterns.UUID).toBeInstanceOf(RegExp);
      expect(ValidationPatterns.CREDIT_CARD).toBeInstanceOf(RegExp);
      expect(ValidationPatterns.POSTAL_CODE_US).toBeInstanceOf(RegExp);
    });

    it('should validate phone numbers', () => {
      const validator = ValidationFunctions.pattern(ValidationPatterns.PHONE);
      
      expect(validator('+1234567890', mockContext).valid).toBe(true);
      expect(validator('1234567890', mockContext).valid).toBe(true);
      expect(validator('123', mockContext).valid).toBe(false);
    });

    it('should validate UUIDs', () => {
      const validator = ValidationFunctions.pattern(ValidationPatterns.UUID);
      
      expect(validator('123e4567-e89b-12d3-a456-426614174000', mockContext).valid).toBe(true);
      expect(validator('not-a-uuid', mockContext).valid).toBe(false);
    });

    it('should validate postal codes', () => {
      const usValidator = ValidationFunctions.pattern(ValidationPatterns.POSTAL_CODE_US);
      const ukValidator = ValidationFunctions.pattern(ValidationPatterns.POSTAL_CODE_UK);
      
      expect(usValidator('12345', mockContext).valid).toBe(true);
      expect(usValidator('12345-6789', mockContext).valid).toBe(true);
      expect(usValidator('invalid', mockContext).valid).toBe(false);
      
      expect(ukValidator('SW1A 1AA', mockContext).valid).toBe(true);
      expect(ukValidator('M1 1AA', mockContext).valid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle exceptions in validation functions', () => {
      const throwingValidator = () => {
        throw new Error('Validation error');
      };

      validator.addRule('test', {
        validate: throwingValidator,
        severity: 'error'
      });

      const result = validator.validateField('test', 'value');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should clear all rules and fallbacks', () => {
      validator.addRule('name', { validate: ValidationFunctions.required, severity: 'error' });
      validator.setFallback('name', 'Default');
      
      validator.clear();
      
      const result = validator.validateField('name', null);
      expect(result.valid).toBe(true); // No rules to fail
      expect(result.finalValue).toBeNull(); // No fallback applied
    });
  });
});