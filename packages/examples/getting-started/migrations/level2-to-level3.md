# Migration Guide: Level 2 → Level 3
## From npm Setup (5-Minute) to Full Integration (30-Minute)

> **Estimated Time:** 30 minutes  
> **Complexity:** Medium  
> **Prerequisites:** Completed Level 2, Node.js 18+

## 📋 What Changes

| Aspect | Level 2 (Basic) | Level 3 (Full Integration) |
|--------|-----------------|----------------------------|
| Data Sources | Memory only | All 4 types (API, SQL, DOM, Memory) |
| Testing | None | Jest + Playwright |
| Build Tools | Basic TypeScript | Advanced bundling (Vite) |
| Error Handling | Basic | Comprehensive |
| Styling | Inline CSS | Tailwind CSS |
| Development | Simple compilation | Full dev environment |

## 🔄 Step-by-Step Migration

### Step 1: Upgrade Dependencies

**Add new dependencies:**
```bash
# Development dependencies
npm install -D \
  jest @types/jest ts-jest \
  @playwright/test \
  vite @vitejs/plugin-typescript \
  tailwindcss postcss autoprefixer \
  eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Production dependencies
npm install \
  axios \
  dompurify
```

### Step 2: Project Structure Reorganization

**Before (Level 2):**
```
project/
├── src/
│   ├── main.ts
│   └── index.html
├── dist/
├── package.json
└── tsconfig.json
```

**After (Level 3):**
```
project/
├── src/
│   ├── components/
│   ├── config/
│   ├── styles/
│   ├── utils/
│   └── main.ts
├── tests/
├── public/
├── dist/
├── config/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── jest.config.js
└── playwright.config.ts
```

**Create new directory structure:**
```bash
mkdir -p src/{components,config,styles,utils}
mkdir -p tests/{unit,integration,e2e}
mkdir -p public config
```

### Step 3: Configuration System Migration

**Before (Level 2 - Simple Config):**
```typescript
// src/main.ts
const searchConfig = {
  containerId: 'search-container',
  dataSource: {
    type: 'memory',
    data: [...],
    searchFields: [...]
  }
};
```

**After (Level 3 - Advanced Config System):**
```typescript
// src/config/search.config.ts
export interface SearchConfiguration {
  containerId: string;
  dataSources: DataSourceConfig[];
  ui: UIConfiguration;
  performance: PerformanceConfig;
  security: SecurityConfig;
}

export const defaultConfig: SearchConfiguration = {
  containerId: 'search-container',
  dataSources: [
    {
      id: 'primary',
      type: 'memory',
      data: [],
      searchFields: ['title', 'description'],
      weight: 1.0
    }
  ],
  ui: {
    theme: 'modern',
    placeholder: 'Search...',
    maxResults: 10,
    enableHighlight: true,
    loadingMessage: 'Searching...'
  },
  performance: {
    debounceMs: 300,
    enableCaching: true,
    cacheTTL: 300000
  },
  security: {
    sanitizeInput: true,
    maxQueryLength: 100
  }
};
```

### Step 4: Multi-Data Source Support

**Create data source configurations:**
```typescript
// src/config/datasources.ts
export const dataSourceConfigs = {
  // API Data Source
  api: {
    type: 'api' as const,
    endpoint: 'https://api.example.com/search',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {{token}}'
    },
    queryParam: 'q',
    transformResponse: (data: any) => data.results,
    pagination: {
      enabled: true,
      pageParam: 'page',
      sizeParam: 'size',
      defaultSize: 20
    }
  },

  // SQL Data Source (via proxy)
  sql: {
    type: 'sql' as const,
    proxyEndpoint: 'http://localhost:3001/sql-proxy',
    query: `
      SELECT id, title, description, created_at 
      FROM content 
      WHERE title ILIKE $1 OR description ILIKE $1 
      LIMIT $2
    `,
    parameters: ['%{{query}}%', 50],
    security: {
      validateInput: true,
      sanitizeQueries: true
    }
  },

  // DOM Data Source
  dom: {
    type: 'dom' as const,
    selector: '.searchable-content',
    searchAttributes: ['textContent', 'data-search-text'],
    liveUpdate: {
      enabled: true,
      strategy: 'mutation-observer' as const
    }
  },

  // Enhanced Memory Data Source
  memory: {
    type: 'memory' as const,
    data: [
      { id: 1, title: 'Getting Started Guide', description: 'Learn the basics' },
      { id: 2, title: 'Advanced Features', description: 'Explore advanced functionality' },
      { id: 3, title: 'API Reference', description: 'Complete API documentation' }
    ],
    searchFields: ['title', 'description'],
    fuzzySearch: {
      enabled: true,
      threshold: 0.6
    }
  }
};
```

### Step 5: Advanced Component Architecture

**Create component system:**
```typescript
// src/components/SearchManager.ts
import { UniversalSearch } from '@universal-search/core';
import type { SearchConfiguration } from '../config/search.config';
import { LoadingManager } from './LoadingManager';
import { ErrorManager } from './ErrorManager';

export class SearchManager {
  private search: UniversalSearch;
  private loadingManager: LoadingManager;
  private errorManager: ErrorManager;

  constructor(private config: SearchConfiguration) {
    this.loadingManager = new LoadingManager(config.containerId);
    this.errorManager = new ErrorManager(config.containerId);
    this.initializeSearch();
  }

  private async initializeSearch(): Promise<void> {
    try {
      this.loadingManager.show('Initializing search...');
      
      this.search = new UniversalSearch(this.config);
      
      // Setup event handlers
      this.search.on('loading', () => this.loadingManager.show());
      this.search.on('results', (results) => {
        this.loadingManager.hide();
        this.handleResults(results);
      });
      this.search.on('error', (error) => {
        this.loadingManager.hide();
        this.errorManager.show(error);
      });

      this.loadingManager.hide();
    } catch (error) {
      this.errorManager.show('Failed to initialize search system');
    }
  }

  private handleResults(results: any[]): void {
    // Advanced result processing
    const processedResults = results.map(result => ({
      ...result,
      highlighted: this.highlightMatches(result),
      relevanceScore: this.calculateRelevance(result)
    }));

    this.displayResults(processedResults);
  }

  private highlightMatches(result: any): any {
    // Implementation for highlighting search terms
    return result;
  }

  private calculateRelevance(result: any): number {
    // Implementation for relevance scoring
    return result.score || 0;
  }

  private displayResults(results: any[]): void {
    // Implementation for displaying results
  }
}
```

### Step 6: Add Build System (Vite)

**Create vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html')
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});
```

### Step 7: Add Styling System (Tailwind)

**Create tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
```

**Create main CSS file:**
```css
/* src/styles/main.css */
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* Custom search component styles */
@layer components {
  .search-container {
    @apply max-w-2xl mx-auto p-6;
  }

  .search-input {
    @apply w-full px-4 py-3 border border-gray-300 rounded-lg 
           focus:outline-none focus:ring-2 focus:ring-primary-500 
           focus:border-primary-500 transition-all duration-200;
  }

  .search-results {
    @apply mt-4 bg-white border border-gray-200 rounded-lg shadow-sm;
  }

  .result-item {
    @apply p-4 border-b border-gray-100 hover:bg-gray-50 
           cursor-pointer transition-colors duration-150;
  }

  .result-item:last-child {
    @apply border-b-0;
  }

  .result-title {
    @apply font-semibold text-gray-900 mb-1;
  }

  .result-description {
    @apply text-gray-600 text-sm;
  }
}
```

### Step 8: Add Testing Framework

**Create jest.config.js:**
```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/main.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

**Create test setup:**
```typescript
// tests/setup.ts
import '@testing-library/jest-dom';

// Mock DOM APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

**Create sample test:**
```typescript
// tests/unit/SearchManager.test.ts
import { SearchManager } from '../../src/components/SearchManager';
import { defaultConfig } from '../../src/config/search.config';

describe('SearchManager', () => {
  let searchManager: SearchManager;

  beforeEach(() => {
    document.body.innerHTML = '<div id="search-container"></div>';
    searchManager = new SearchManager(defaultConfig);
  });

  it('should initialize without errors', () => {
    expect(searchManager).toBeDefined();
  });

  it('should handle search queries', async () => {
    const results = await searchManager.search('test');
    expect(Array.isArray(results)).toBe(true);
  });
});
```

### Step 9: Update Package.json Scripts

**Update scripts section:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext .ts,.js",
    "lint:fix": "eslint src --ext .ts,.js --fix",
    "type-check": "tsc --noEmit",
    "css:build": "tailwindcss -i ./src/styles/main.css -o ./dist/style.css --watch"
  }
}
```

### Step 10: Update Main Application

**Update src/main.ts:**
```typescript
import { SearchManager } from './components/SearchManager';
import { defaultConfig } from './config/search.config';
import { dataSourceConfigs } from './config/datasources';
import './styles/main.css';

class Application {
  private searchManager: SearchManager;

  constructor() {
    this.initializeApplication();
  }

  private async initializeApplication(): Promise<void> {
    try {
      // Enhanced configuration with multiple data sources
      const enhancedConfig = {
        ...defaultConfig,
        dataSources: [
          dataSourceConfigs.memory,
          dataSourceConfigs.dom,
          // Add API source if endpoint is available
          // dataSourceConfigs.api,
        ]
      };

      this.searchManager = new SearchManager(enhancedConfig);
      
      console.log('✅ Universal Search Level 3 initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
    }
  }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new Application());
} else {
  new Application();
}
```

## ✅ Migration Validation

### 1. Build and Development
```bash
# Should start development server
npm run dev

# Should build without errors
npm run build

# Should pass all tests
npm test
```

### 2. Feature Validation
```typescript
// Test multiple data sources
const testDataSources = async () => {
  const memoryResults = await search.searchDataSource('memory', 'test');
  const domResults = await search.searchDataSource('dom', 'test');
  
  console.assert(Array.isArray(memoryResults), 'Memory search should work');
  console.assert(Array.isArray(domResults), 'DOM search should work');
};
```

### 3. Performance Check
```bash
# Check bundle size
npm run build
ls -lh dist/

# Run performance tests
npm run test:performance
```

## 🎯 Benefits of Level 3

- ✅ **Multi-Data Sources**: Support for all 4 data source types
- ✅ **Advanced Styling**: Tailwind CSS integration
- ✅ **Comprehensive Testing**: Jest + Playwright testing suite
- ✅ **Modern Build Tools**: Vite for fast development and optimized builds
- ✅ **Error Handling**: Robust error management system
- ✅ **Performance**: Advanced caching and optimization
- ✅ **Development Experience**: Hot reload, TypeScript, linting

## 🔄 Next Steps

Ready for production? Continue to [Level 3 → Level 4 migration](./level3-to-level4.md)

---

**Migration Complete!** 🎉  
Your Universal Search now has full integration capabilities with comprehensive development tooling.