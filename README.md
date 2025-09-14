# Universal Search Component

A lightweight, universal search component that works with any data source and integrates seamlessly into existing applications.

## Quick Start

### Installation

```bash
npm install @universal-search/core
```

### Hello World Example (Under 5 Lines!)

```javascript
import { UniversalSearch } from '@universal-search/core';

const userData = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Developer' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Designer' },
  // ... more data
];

const search = new UniversalSearch('#search-container', {
  dataSource: { 
    type: 'memory', 
    data: userData, 
    searchFields: ['name', 'email'] 
  }
});
search.init();
```

That's it! Your search component is now ready to use.

## Features

- **🚀 Simple Setup**: Get started in under 5 lines of code
- **💾 In-Memory Search**: Built-in support for searching arrays of objects  
- **⌨️ Keyboard Navigation**: Arrow keys, Enter, and Escape support
- **🎯 Flexible Field Mapping**: Search across multiple object fields with dot notation
- **🔍 Smart Matching**: Case-insensitive partial string matching with scoring
- **⚡ Performance Optimized**: Debounced queries and efficient filtering
- **♿ Accessible**: Full keyboard navigation and screen reader support
- **🎨 Customizable**: Configurable UI text, themes, and result limits

## Basic Configuration

```javascript
const search = new UniversalSearch('#selector', {
  dataSource: {
    type: 'memory',
    data: arrayOfObjects,
    searchFields: ['field1', 'field2.nested'],
    labelField: 'title',
    metadataFields: {
      subtitle: 'description',
      category: 'type'
    }
  },
  ui: {
    placeholder: 'Search...',
    maxResults: 10,
    loadingText: 'Searching...',
    noResultsText: 'No results found'
  },
  queryHandling: {
    minLength: 2,
    debounceMs: 300,
    caseSensitive: false
  }
});
```

## Event Handling

```javascript
// Handle result selection
search.on('result:select', (event) => {
  console.log('Selected:', event.result);
});

// Handle search lifecycle
search.on('search:start', (event) => {
  console.log('Search started:', event.query);
});

search.on('search:complete', (event) => {
  console.log('Found results:', event.results.length);
});
```

## API Reference

### Core Methods

- `init()` - Initialize the component
- `destroy()` - Clean up and remove the component
- `search(query)` - Perform a search programmatically
- `clearResults()` - Clear current search results
- `focus()` - Focus the search input
- `blur()` - Remove focus from search input

### State Methods

- `getQuery()` - Get current search query
- `getResults()` - Get current search results
- `getConfig()` - Get component configuration

### Event Methods

- `on(eventType, handler)` - Add event listener
- `off(eventType, handler)` - Remove event listener

## Browser Compatibility

- Chrome 80+
- Firefox 80+
- Safari 14+
- Edge 80+

## Examples

Check out the [Hello World example](packages/examples/simple-integration/) to see the component in action.

## Development

This component is built with:

- **TypeScript 5.3+** for type safety
- **Vanilla JavaScript** for universal compatibility  
- **Jest** for comprehensive testing
- **Rollup** for efficient bundling

## License

MIT License - see LICENSE file for details.

## Contributing

Please see CONTRIBUTING.md for guidelines on how to contribute to this project.