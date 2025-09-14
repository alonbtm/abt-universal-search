/**
 * Test setup for distribution tests
 */

// Global test configuration
beforeAll(() => {
  // Mock console to avoid noisy output during tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
});

afterAll(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Mock process.env for tests
process.env.NODE_ENV = 'test';

// Dummy test to prevent "must contain at least one test" error
describe('Test Setup', () => {
  it('should configure test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});