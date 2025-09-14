# Universal Search Vanilla JS

Zero-dependency universal search component that works with any data source. Add powerful search functionality to your website in 30 seconds with just a CDN link.

## Quick Start (30 seconds)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Universal Search Demo</title>
</head>
<body>
    <!-- 1. Add the script tag -->
    <script src="https://cdn.jsdelivr.net/npm/@universal-search/vanilla@latest/dist/universal-search.min.js"></script>
    
    <!-- 2. Add a container with data -->
    <div id="search" 
         data-universal-search
         data-data='[
             {"title": "JavaScript Guide", "description": "Learn JavaScript programming"},
             {"title": "TypeScript Handbook", "description": "Advanced TypeScript concepts"},
             {"title": "React Tutorial", "description": "Build React applications"}
         ]'>
    </div>

    <!-- That's it! Search is now working -->
</body>
</html>
```

## Installation

### CDN (Recommended for quick start)

```html
<!-- Latest version -->
<script src="https://cdn.jsdelivr.net/npm/@universal-search/vanilla@latest/dist/universal-search.min.js"></script>

<!-- Specific version -->
<script src="https://cdn.jsdelivr.net/npm/@universal-search/vanilla@1.0.0/dist/universal-search.min.js"></script>

<!-- With Subresource Integrity -->
<script src="https://cdn.jsdelivr.net/npm/@universal-search/vanilla@1.0.0/dist/universal-search.min.js" 
        integrity="sha384-..." 
        crossorigin="anonymous"></script>
```

### npm (For build systems)

```bash
npm install @universal-search/vanilla
```

```javascript
import { UniversalSearch } from '@universal-search/vanilla';
```

## Usage Examples

### Level 1: Zero Configuration (30 seconds)

Perfect for getting started quickly:

```html
<div id="search" 
     data-universal-search
     data-data='[{"title": "Item 1"}, {"title": "Item 2"}]'>
</div>
```

### Level 2: Basic Configuration (5 minutes)

More control over appearance and behavior:

```javascript
const search = new UniversalSearch({
    ui: {
        container: '#search',
        theme: 'dark',
        placeholder: 'Search documentation...'
    },
    dataSource: {
        type: 'memory',
        data: [
            { id: 1, title: 'Getting Started', description: 'Quick start guide' },
            { id: 2, title: 'API Reference', description: 'Complete API documentation' }
        ]
    }
});
```

### Level 3: Advanced Features (30 minutes)

Custom templates, event handling, and performance optimization:

```javascript
const search = new UniversalSearch({
    ui: {
        container: '#search',
        templates: {
            result: (result) => `
                <h3>${result.title}</h3>
                <p>${result.description}</p>
                <small>Score: ${result.score}</small>
            `
        }
    },
    dataSource: {
        type: 'memory',
        data: myData,
        options: {
            searchFields: ['title', 'description', 'tags']
        }
    },
    performance: {
        cache: true,
        cacheTTL: 600000 // 10 minutes
    }
});

// Event handling
search.on('search', (event) => {
    console.log('Searching for:', event.query);
});

search.on('select', (event) => {
    console.log('Selected:', event.result);
});
```

## API Reference

### Constructor

```javascript
const search = new UniversalSearch(config);
```

#### Configuration Options

```typescript
interface UniversalSearchConfig {
    dataSource: {
        type: 'memory';  // More types coming soon: 'api' | 'dom' | 'sql'
        data?: any[];
        options?: {
            searchFields?: string[];
        };
    };
    ui: {
        container: string | HTMLElement;
        theme?: 'light' | 'dark' | 'auto';
        placeholder?: string;
        debounceMs?: number;
        showSearchBox?: boolean;
        templates?: {
            result?: string | ((result: SearchResult) => string);
            noResults?: string;
            loading?: string;
            error?: string;
        };
    };
    performance?: {
        cache?: boolean;
        cacheTTL?: number;
        maxCacheSize?: number;
    };
    security?: {
        sanitizeInput?: boolean;
        allowHTML?: boolean;
    };
}
```

### Methods

#### Search Methods
- `search(query: string, options?: SearchOptions): Promise<SearchResult[]>` - Perform search programmatically
- `setQuery(query: string): void` - Set search input value
- `getQuery(): string` - Get current search input value

#### Data Methods
- `setData(data: any[]): void` - Update search data
- `getData(): any[]` - Get current search data
- `clearCache(): void` - Clear search results cache

#### UI Methods
- `showResults(results: SearchResult[]): void` - Display results programmatically
- `hideResults(): void` - Hide results dropdown

#### Instance Methods
- `getId(): string` - Get unique instance ID
- `getConfig(): UniversalSearchConfig` - Get current configuration
- `updateConfig(config: Partial<UniversalSearchConfig>): void` - Update configuration
- `destroy(): void` - Clean up and destroy instance

### Static Methods

#### Factory Methods
```javascript
// Create memory-based search
const search = UniversalSearch.memory(data, container, options);

// Auto-initialize from DOM
const instances = UniversalSearch.auto();
```

### Events

Listen to search events:

```javascript
search.on('search', (event) => {
    // User started searching
    console.log('Query:', event.query);
});

search.on('results', (event) => {
    // Search results received
    console.log('Results:', event.results);
});

search.on('select', (event) => {
    // User selected a result
    console.log('Selected:', event.result);
});

search.on('error', (event) => {
    // Search error occurred
    console.error('Error:', event.error);
});
```

## Data Sources

### Memory Data Source

Search through JavaScript arrays and objects:

```javascript
const data = [
    {
        id: 1,
        title: 'JavaScript Guide',
        description: 'Complete guide to JavaScript',
        tags: ['programming', 'web', 'frontend'],
        category: 'tutorial'
    },
    // ... more items
];

const search = new UniversalSearch({
    dataSource: {
        type: 'memory',
        data: data,
        options: {
            searchFields: ['title', 'description', 'tags']
        }
    },
    ui: { container: '#search' }
});
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Performance

- **Bundle Size**: < 50KB minified + gzipped
- **Search Speed**: < 50ms for 10,000 records
- **Memory Usage**: < 5MB for typical datasets
- **Load Time**: < 200ms on 3G connections

## Security

- Automatic XSS protection
- Input sanitization
- CSP (Content Security Policy) compatible
- No external dependencies

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

## License

MIT - see [LICENSE](../../LICENSE) for details.

## Roadmap

- ✅ Memory data source
- 🔄 API data source (coming soon)
- 🔄 DOM data source (coming soon)  
- 🔄 SQL data source with proxy (coming soon)
- 🔄 Advanced filtering and facets
- 🔄 Fuzzy search improvements
- 🔄 Voice search support