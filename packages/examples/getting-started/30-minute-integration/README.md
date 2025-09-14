# Universal Search - 30 Minute Integration

This example demonstrates a complete, production-ready Universal Search implementation with multiple data sources, advanced features, and comprehensive error handling.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser

### Installation & Setup

```bash
# 1. Install dependencies
npm install

# 2. Build the project
npm run build

# 3. Start the development server
npm run dev

# 4. Open your browser
# The server will automatically open http://localhost:3001
```

## 📋 What's Included

### 🔌 Multiple Data Sources
- **API Integration**: REST APIs with caching, retries, and error handling
- **SQL Database**: Connection pooling and parameterized queries
- **DOM Content**: Live page content with mutation observation
- **In-Memory Data**: Optimized search with fuzzy matching

### ⚡ Performance Features
- Intelligent caching with TTL
- Request debouncing and batching
- Virtual scrolling for large datasets
- Background data synchronization
- Performance monitoring and metrics

### 🎨 Advanced UI
- Custom Tailwind CSS styling
- Dark/light theme support
- Responsive design
- Real-time search suggestions
- Advanced filtering system
- Keyboard shortcuts and accessibility

### 🛠️ Developer Experience
- Full TypeScript support
- Comprehensive error handling
- Performance profiling
- Configuration management
- Hot reload during development
- Extensive testing suite

## 🏗️ Architecture Overview

```
src/
├── components/          # UI components
│   ├── SearchApplication.ts
│   ├── DataSourceCard.ts
│   └── ResultsDisplay.ts
├── services/           # Data layer
│   ├── DataSourceManager.ts
│   ├── ApiDataSource.ts
│   ├── SqlDataSource.ts
│   ├── DomDataSource.ts
│   └── MemoryDataSource.ts
├── utils/              # Utilities
│   ├── EventEmitter.ts
│   ├── Logger.ts
│   ├── ThemeManager.ts
│   └── ValidationUtils.ts
├── types/              # TypeScript definitions
│   └── index.ts
├── styles/             # Styling
│   └── input.css
└── index.ts           # Application entry point
```

## ⚙️ Configuration

### Data Source Configuration

```typescript
// API Data Source
{
  id: 'my-api',
  name: 'External API',
  type: 'api',
  config: {
    api: {
      endpoint: 'https://api.example.com/search',
      method: 'GET',
      headers: { 'Authorization': 'Bearer YOUR_TOKEN' },
      timeout: 5000,
      retries: 3,
      cache: { enabled: true, ttl: 300000 },
      transform: (data) => data.results
    }
  }
}

// SQL Data Source
{
  id: 'my-db',
  name: 'Database',
  type: 'sql',
  config: {
    sql: {
      host: 'localhost',
      port: 5432,
      database: 'myapp',
      username: 'user',
      password: 'pass',
      query: 'SELECT * FROM items WHERE title ILIKE $1',
      pool: { min: 2, max: 10 }
    }
  }
}

// DOM Data Source
{
  id: 'page-content',
  name: 'Page Content',
  type: 'dom',
  config: {
    dom: {
      selectors: {
        container: 'main',
        item: 'article, .post',
        title: 'h1, h2, h3',
        description: 'p, .excerpt'
      },
      mutationObserver: { enabled: true }
    }
  }
}

// Memory Data Source
{
  id: 'local-data',
  name: 'Local Data',
  type: 'memory',
  config: {
    memory: {
      data: [...], // Your data array
      indexFields: ['title', 'description', 'tags'],
      fuzzySearch: true
    }
  }
}
```

### Search Configuration

```typescript
const searchConfig = {
  // Search behavior
  fuzzySearch: true,
  caseSensitive: false,
  maxResults: 50,
  debounceMs: 300,
  
  // UI options
  highlightMatches: true,
  showCategories: true,
  showDescriptions: true,
  theme: 'auto', // 'light', 'dark', 'auto'
  
  // Performance
  enableCache: true,
  virtualScrolling: false,
  
  // Security
  sanitizeInput: true,
  validateQueries: true,
  rateLimitRequests: true
};
```

## 📊 Performance Monitoring

The application includes built-in performance monitoring:

```typescript
// Get performance metrics
const metrics = dataSourceManager.getPerformanceMetrics();
console.log('Average search time:', metrics.searchTime);
console.log('Cache hit rate:', metrics.cacheHitRate);
console.log('Memory usage:', metrics.memoryUsage);

// Monitor specific searches
dataSourceManager.on('searchCompleted', (result) => {
  console.log(`Search: ${result.query}`);
  console.log(`Results: ${result.items.length}`);
  console.log(`Time: ${result.executionTime}ms`);
});
```

## 🎯 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:watch` - Build with file watching
- `npm run test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🔧 Customization

### Adding New Data Sources

1. Create a new data source class extending `BaseDataSource`
2. Implement required methods: `connect()`, `search()`, `test()`
3. Register with the `DataSourceManager`

```typescript
class CustomDataSource extends BaseDataSource {
  async connect() { /* connection logic */ }
  async search(query: string) { /* search logic */ }
  async test() { /* health check */ }
  // ... other required methods
}

// Register the new source
await dataSourceManager.registerDataSource({
  id: 'custom-source',
  name: 'My Custom Source',
  type: 'custom' as any, // Extend type definition
  config: { /* your config */ }
});
```

### Custom Styling

The project uses Tailwind CSS for styling. Modify `src/styles/input.css` to customize:

```css
@layer components {
  .search-input {
    @apply w-full px-4 py-3 rounded-xl border-2 border-gray-300 
           focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
  }
  
  .search-result-item {
    @apply p-4 hover:bg-gray-50 border-b border-gray-100 
           cursor-pointer transition-colors;
  }
}
```

### Environment Variables

Create a `.env` file for configuration:

```bash
# API Configuration
API_ENDPOINT=https://your-api.com
API_KEY=your_api_key_here

# Database Configuration  
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=username
DB_PASS=password

# Application Settings
ENABLE_DEBUG=true
CACHE_TTL=300000
MAX_RESULTS=100
```

## 🧪 Testing

The project includes comprehensive tests:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- DataSourceManager.test.ts

# Run tests in watch mode
npm run test:watch
```

### Test Structure

```
__tests__/
├── unit/
│   ├── DataSourceManager.test.ts
│   ├── ApiDataSource.test.ts
│   └── SearchEngine.test.ts
├── integration/
│   ├── search-flow.test.ts
│   └── data-source-integration.test.ts
└── e2e/
    └── user-workflows.test.ts
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Docker Deployment

```bash
# Build Docker image
npm run docker:build

# Run container
npm run docker:run
```

### Static Hosting

The built application can be deployed to any static hosting service:

```bash
# Build and deploy to dist/
npm run build

# Upload dist/ folder to:
# - Netlify
# - Vercel  
# - GitHub Pages
# - AWS S3 + CloudFront
# - Any static hosting service
```

## 🐛 Troubleshooting

### Common Issues

**Build Fails**
```bash
# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**TypeScript Errors**
```bash
# Check TypeScript configuration
npx tsc --noEmit
```

**Styles Not Loading**
```bash
# Rebuild CSS
npm run build:css
```

**Data Source Connection Issues**
- Check network connectivity
- Verify API keys and credentials
- Review CORS settings for API endpoints
- Check browser console for detailed errors

### Debug Mode

Enable debug logging:

```typescript
// In browser console
localStorage.setItem('debug', 'universal-search:*');
// Reload page to see debug logs
```

## 📈 Performance Tips

1. **Enable Caching**: Use appropriate TTL values for your data
2. **Optimize Queries**: Use specific search terms and filters
3. **Virtual Scrolling**: Enable for large result sets
4. **Debouncing**: Adjust debounce timing based on your use case
5. **Connection Pooling**: Configure appropriate pool sizes for SQL sources

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📜 License

MIT License - see LICENSE file for details.

## 🔗 Related Examples

- [30-Second Start](../30-second-start.html) - Minimal CDN setup
- [5-Minute Setup](../5-minute-setup/) - Basic TypeScript integration  
- [Production Deployment](../production-deployment/) - Enterprise features
- [Migration Guide](../migrations/) - Upgrade between complexity levels

## 📚 Additional Resources

- [API Documentation](../../docs/api-reference.md)
- [Configuration Guide](../../docs/configuration.md)
- [Performance Best Practices](../../docs/performance.md)
- [Security Guidelines](../../docs/security.md)