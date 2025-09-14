/**
 * Universal Search - 5 Minute Setup Entry Point
 * This is the main TypeScript file that demonstrates the setup
 */

import { UniversalSearch } from './components/SearchComponent';
import { SearchConfig, SearchItem } from './types/search';

// Sample data for demonstration
const sampleData: SearchItem[] = [
  {
    id: 1,
    name: 'Apple iPhone 15',
    category: 'Smartphones',
    description: 'Latest iPhone with advanced camera and A17 Pro chip',
    price: 999,
    tags: ['apple', 'ios', 'smartphone', 'camera']
  },
  {
    id: 2,
    name: 'Samsung Galaxy S24',
    category: 'Smartphones',
    description: 'Android flagship with AI-powered features and excellent display',
    price: 899,
    tags: ['samsung', 'android', 'smartphone', 'ai']
  },
  {
    id: 3,
    name: 'MacBook Pro 16-inch',
    category: 'Laptops',
    description: 'Professional laptop with M3 Max chip for demanding tasks',
    price: 2499,
    tags: ['apple', 'macbook', 'laptop', 'professional']
  },
  {
    id: 4,
    name: 'Dell XPS 13',
    category: 'Laptops',
    description: 'Ultrabook with premium build quality and excellent performance',
    price: 1299,
    tags: ['dell', 'windows', 'laptop', 'ultrabook']
  },
  {
    id: 5,
    name: 'iPad Pro 12.9',
    category: 'Tablets',
    description: 'Professional tablet with M2 chip and Apple Pencil support',
    price: 1099,
    tags: ['apple', 'ipad', 'tablet', 'creative']
  },
  {
    id: 6,
    name: 'Surface Pro 9',
    category: 'Tablets',
    description: '2-in-1 device that works as both tablet and laptop',
    price: 999,
    tags: ['microsoft', 'surface', 'tablet', '2-in-1']
  },
  {
    id: 7,
    name: 'Sony WH-1000XM5',
    category: 'Audio',
    description: 'Premium noise-canceling headphones with exceptional sound',
    price: 399,
    tags: ['sony', 'headphones', 'noise-canceling', 'wireless']
  },
  {
    id: 8,
    name: 'AirPods Pro 2',
    category: 'Audio',
    description: 'Wireless earbuds with adaptive transparency and spatial audio',
    price: 249,
    tags: ['apple', 'airpods', 'earbuds', 'wireless']
  },
  {
    id: 9,
    name: 'Nintendo Switch OLED',
    category: 'Gaming',
    description: 'Gaming console with vibrant OLED screen for portable and docked play',
    price: 349,
    tags: ['nintendo', 'gaming', 'console', 'portable']
  },
  {
    id: 10,
    name: 'Steam Deck',
    category: 'Gaming',
    description: 'Handheld gaming PC that runs your Steam library anywhere',
    price: 649,
    tags: ['valve', 'gaming', 'handheld', 'steam']
  }
];

// Configuration examples for different use cases
const configurations: Record<string, SearchConfig> = {
  basic: {
    data: sampleData.slice(0, 5),
    placeholder: 'Search products...',
    maxResults: 5
  },

  advanced: {
    data: sampleData,
    placeholder: 'Search our catalog...',
    searchKeys: ['name', 'category', 'description', 'tags'],
    maxResults: 8,
    debounceMs: 200,
    fuzzySearch: true,
    highlight: true,
    showCategories: true,
    showDescriptions: true,
    filters: ['category']
  },

  api: {
    apiEndpoint: 'https://api.example.com/search',
    apiKey: 'your-api-key-here',
    placeholder: 'Search via API...',
    maxResults: 10,
    debounceMs: 500,
    onError: (error: Error) => {
      console.error('API Search Error:', error);
      // Fallback to local data
      return sampleData;
    }
  },

  customized: {
    data: sampleData,
    placeholder: 'Find your perfect device...',
    searchKeys: ['name', 'description', 'tags'],
    maxResults: 6,
    debounceMs: 300,
    fuzzySearch: true,
    caseSensitive: false,
    highlight: true,
    showCategories: true,
    showDescriptions: true,
    theme: 'light',
    filters: ['category', 'price'],
    onSearch: (query: string, results: SearchItem[]) => {
      console.log(`Search "${query}" returned ${results.length} results`);
    },
    onSelect: (item: SearchItem) => {
      console.log('Selected item:', item);
      alert(`You selected: ${item.name}`);
    }
  }
};

// Initialize search components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeExamples();
});

/**
 * Initialize all search examples
 */
function initializeExamples(): void {
  // Basic Example
  const basicSearch = new UniversalSearch(configurations.basic);
  basicSearch.mount('#basic-search');

  // Advanced Example
  const advancedSearch = new UniversalSearch(configurations.advanced);
  advancedSearch.mount('#advanced-search');

  // API Example (will fallback to mock data)
  const apiSearch = new UniversalSearch({
    ...configurations.api,
    // Override with mock data since we don't have a real API
    data: sampleData.filter(item => item.category === 'Smartphones'),
    apiEndpoint: undefined
  });
  apiSearch.mount('#api-search');

  // Customized Example
  const customSearch = new UniversalSearch(configurations.customized);
  customSearch.mount('#custom-search');

  // Performance Monitoring Example
  const performanceSearch = new UniversalSearch({
    data: generateLargeDataset(1000),
    placeholder: 'Performance test with 1000 items...',
    maxResults: 20,
    onSearch: (query: string, results: SearchItem[]) => {
      const metrics = performanceSearch.getMetrics();
      console.log('Performance metrics:', metrics);
      updatePerformanceDisplay(metrics);
    }
  });
  performanceSearch.mount('#performance-search');

  // Add demo controls
  setupDemoControls();
}

/**
 * Generate a large dataset for performance testing
 */
function generateLargeDataset(size: number): SearchItem[] {
  const categories = ['Electronics', 'Books', 'Clothing', 'Home & Garden', 'Sports', 'Toys'];
  const adjectives = ['Premium', 'Professional', 'Compact', 'Wireless', 'Smart', 'Ultra'];
  const nouns = ['Device', 'Gadget', 'Tool', 'Accessory', 'System', 'Solution'];
  
  return Array.from({ length: size }, (_, index) => ({
    id: index + 1,
    name: `${adjectives[index % adjectives.length]} ${nouns[index % nouns.length]} ${index + 1}`,
    category: categories[index % categories.length],
    description: `High-quality ${nouns[index % nouns.length].toLowerCase()} for professional use`,
    price: Math.floor(Math.random() * 1000) + 50,
    tags: ['tag1', 'tag2', 'tag3']
  }));
}

/**
 * Update performance display
 */
function updatePerformanceDisplay(metrics: any): void {
  const display = document.getElementById('performance-metrics');
  if (display) {
    display.innerHTML = `
      <div class="metric">
        <span class="metric-label">Search Time:</span>
        <span class="metric-value">${metrics.searchTime?.toFixed(2) || 0}ms</span>
      </div>
      <div class="metric">
        <span class="metric-label">Results:</span>
        <span class="metric-value">${metrics.resultCount || 0}</span>
      </div>
    `;
  }
}

/**
 * Setup interactive demo controls
 */
function setupDemoControls(): void {
  // Theme switcher
  const themeSwitcher = document.getElementById('theme-switcher') as HTMLSelectElement;
  if (themeSwitcher) {
    themeSwitcher.addEventListener('change', (e) => {
      const theme = (e.target as HTMLSelectElement).value;
      document.body.setAttribute('data-theme', theme);
    });
  }

  // Configuration viewer
  const configViewer = document.getElementById('config-viewer') as HTMLTextAreaElement;
  const configSelect = document.getElementById('config-select') as HTMLSelectElement;
  
  if (configViewer && configSelect) {
    configSelect.addEventListener('change', (e) => {
      const configName = (e.target as HTMLSelectElement).value;
      const config = configurations[configName as keyof typeof configurations];
      configViewer.value = JSON.stringify(config, null, 2);
    });

    // Show initial config
    configSelect.dispatchEvent(new Event('change'));
  }

  // Copy configuration button
  const copyButton = document.getElementById('copy-config');
  if (copyButton && configViewer) {
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(configViewer.value).then(() => {
        copyButton.textContent = '✅ Copied!';
        setTimeout(() => {
          copyButton.textContent = '📋 Copy Config';
        }, 2000);
      });
    });
  }
}

// Export for global usage (if needed)
declare global {
  interface Window {
    UniversalSearch: typeof UniversalSearch;
    searchConfigurations: typeof configurations;
    initializeExamples: typeof initializeExamples;
  }
}

if (typeof window !== 'undefined') {
  window.UniversalSearch = UniversalSearch;
  window.searchConfigurations = configurations;
  window.initializeExamples = initializeExamples;
}

// Export for module usage
export {
  UniversalSearch,
  configurations as searchConfigurations,
  initializeExamples
};

export * from './types/search';
export * from './components/SearchComponent';
export * from './utils/api';
export * from './utils/search';