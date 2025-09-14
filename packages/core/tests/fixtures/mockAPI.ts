/**
 * Test Fixtures - Mock API Responses
 * Reusable API mocks for consistent testing
 */

import { mockSearchResults, mockEmptyResults, mockSearchResponse } from './mockData';

export const mockAPIResponse = {
  success: {
    status: 200,
    data: mockSearchResponse,
    headers: { 'content-type': 'application/json' }
  },
  error: {
    status: 500,
    error: 'Internal Server Error',
    message: 'Test error response'
  },
  notFound: {
    status: 404,
    error: 'Not Found',
    message: 'Resource not found'
  },
  empty: {
    status: 200,
    data: {
      results: mockEmptyResults,
      total: 0,
      page: 1,
      hasMore: false
    },
    headers: { 'content-type': 'application/json' }
  }
};

export const createMockFetch = (response: any) => {
  return jest.fn().mockResolvedValue({
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    json: jest.fn().mockResolvedValue(response.data || response),
    headers: new Map(Object.entries(response.headers || {}))
  });
};

export const createMockAPIAdapter = () => ({
  search: jest.fn().mockResolvedValue(mockSearchResults),
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true)
});