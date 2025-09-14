/**
 * Test Fixtures - Configuration Objects
 * Reusable test configurations for consistent testing
 */

export const mockSearchConfig = {
  placeholder: 'Test Search...',
  minLength: 3,
};

export const mockSearchConfigEmpty = {
  placeholder: '',
  minLength: 0,
};

export const mockSearchConfigLarge = {
  placeholder: 'A'.repeat(100),
  minLength: 10,
};