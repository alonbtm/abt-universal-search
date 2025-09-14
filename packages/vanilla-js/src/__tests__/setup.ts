/**
 * Jest test setup file
 */

// Mock DOM methods that might not be available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock console methods to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test utilities
declare global {
  function createMockElement(tag?: string, attributes?: Record<string, string>): HTMLElement;
  function appendToBody(element: HTMLElement): void;
  function removeFromBody(element: HTMLElement): void;
}

(global as any).createMockElement = (tag: string = 'div', attributes: Record<string, string> = {}): HTMLElement => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

(global as any).appendToBody = (element: HTMLElement): void => {
  document.body.appendChild(element);
};

(global as any).removeFromBody = (element: HTMLElement): void => {
  if (element.parentNode) {
    element.parentNode.removeChild(element);
  }
};

// Cleanup after each test
afterEach(() => {
  // Clear document body
  document.body.innerHTML = '';
  
  // Clear all timers
  jest.clearAllTimers();
});