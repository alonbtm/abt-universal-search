/**
 * Test Fixtures - Mock Data
 * Reusable test data for consistent testing
 */

export const mockSearchResults = [
  {
    id: '1',
    title: 'Test Result 1',
    description: 'First test search result',
    url: 'https://example.com/1'
  },
  {
    id: '2', 
    title: 'Test Result 2',
    description: 'Second test search result',
    url: 'https://example.com/2'
  }
];

export const mockEmptyResults = [];

export const mockLargeResults = Array.from({ length: 100 }, (_, index) => ({
  id: `${index + 1}`,
  title: `Test Result ${index + 1}`,
  description: `Test description for result ${index + 1}`,
  url: `https://example.com/${index + 1}`
}));

export const mockSearchQuery = {
  term: 'test query',
  filters: {},
  page: 1,
  limit: 10
};

export const mockSearchResponse = {
  results: mockSearchResults,
  total: 2,
  page: 1,
  hasMore: false
};