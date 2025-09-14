# Universal Search - 5 Minute Setup

This example shows how to set up Universal Search with npm and TypeScript in just 5 minutes.

## Quick Start

### Step 1: Install Dependencies (1 minute)

```bash
npm install
```

This installs:
- `universal-search-library` - The core search functionality
- TypeScript and build tools
- Development utilities (linting, formatting, testing)

### Step 2: Run the Development Server (30 seconds)

```bash
npm run dev
```

This will:
1. Compile TypeScript to JavaScript
2. Start a local web server at http://localhost:3000
3. Open your browser automatically
4. Watch for changes and rebuild automatically

### Step 3: Customize Your Search (3.5 minutes)

Edit `src/index.ts` to customize your search functionality:

```typescript
import { UniversalSearch, SearchConfig } from 'universal-search-library';

const config: SearchConfig = {
  data: [
    { name: 'Your Product', category: 'Category', price: 100 }
  ],
  apiEndpoint: 'https://your-api.com/search',
  searchKeys: ['name', 'category', 'description'],
  debounceMs: 300,
  maxResults: 10
};

const search = new UniversalSearch(config);
search.mount('#search-container');
```

## Project Structure

```
5-minute-setup/
├── src/
│   ├── index.ts          # Main application entry point
│   ├── components/       # Reusable search components
│   ├── utils/           # Helper functions
│   ├── types/           # TypeScript type definitions
│   └── styles/          # CSS and styling
├── dist/                # Compiled JavaScript output
├── __tests__/           # Test files
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Check code quality
- `npm run format` - Format code with Prettier

## Features Included

✅ **TypeScript Support** - Full type safety and IntelliSense  
✅ **Hot Reload** - Automatic rebuilds during development  
✅ **API Integration** - Ready-to-use API connection examples  
✅ **Error Handling** - Comprehensive error boundaries  
✅ **Testing Setup** - Jest configuration with examples  
✅ **Code Quality** - ESLint and Prettier configuration  
✅ **Production Build** - Optimized build process  

## Next Steps

Ready to level up? Check out these progression paths:

1. **30-Minute Integration** - Add custom styling, multiple data sources, and advanced features
2. **Production Deployment** - Enterprise security, monitoring, and performance optimization
3. **Migration Guide** - Step-by-step upgrade instructions

## Configuration Options

### Basic Configuration

```typescript
const config: SearchConfig = {
  data: YourDataArray,
  placeholder: 'Search...',
  maxResults: 10
};
```

### API Integration

```typescript
const config: SearchConfig = {
  apiEndpoint: 'https://api.example.com/search',
  apiKey: process.env.API_KEY,
  headers: {
    'Content-Type': 'application/json'
  }
};
```

### Advanced Options

```typescript
const config: SearchConfig = {
  debounceMs: 300,
  fuzzySearch: true,
  highlight: true,
  pagination: {
    enabled: true,
    pageSize: 20
  },
  filters: ['category', 'price', 'rating']
};
```

## Troubleshooting

### Common Issues

**Q: TypeScript compilation errors?**  
A: Run `npm run lint` to check for code issues, then `npm run format` to fix formatting.

**Q: Server not starting?**  
A: Make sure port 3000 is available, or modify the port in package.json scripts.

**Q: Hot reload not working?**  
A: Restart the dev server with `npm run dev` and check browser console for errors.

### Getting Help

- [Documentation](../../../docs/)
- [API Reference](../../../docs/api-reference.md)
- [Examples](../../)
- [GitHub Issues](https://github.com/universal-search/issues)

## What's Different from 30-Second Start?

| Feature | 30-Second Start | 5-Minute Setup |
|---------|----------------|----------------|
| Setup Method | CDN Script Tag | npm Installation |
| Language | Vanilla JavaScript | TypeScript |
| Build Process | None | Webpack/Rollup |
| Development | Browser Only | Full Dev Environment |
| Testing | Manual | Automated Testing |
| Code Quality | Basic | Linting + Formatting |
| API Integration | Static Data Only | Full API Support |
| Error Handling | Basic | Comprehensive |

This setup provides a solid foundation for development while maintaining simplicity and fast setup time.