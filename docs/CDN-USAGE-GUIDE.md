# CDN Usage Guide - abt-universal-search

This guide shows you how to use `abt-universal-search` directly from CDN services without npm installation.

## Quick Start

### Basic HTML Integration

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Universal Search Demo</title>

    <!-- Universal Search Styles -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/styles/main.css">

    <!-- Optional: Theme -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/styles/themes/light.css">
</head>
<body>
    <div id="search-container">
        <input type="text" id="search-input" placeholder="Search...">
        <div id="search-results"></div>
    </div>

    <!-- Universal Search Script -->
    <script src="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/dist/index.umd.js"></script>

    <script>
        // Initialize Universal Search
        const search = new UniversalSearch({
            dataSource: {
                type: 'memory',
                data: [
                    { id: 1, title: 'Apple', category: 'Fruit' },
                    { id: 2, title: 'Banana', category: 'Fruit' },
                    { id: 3, title: 'Carrot', category: 'Vegetable' }
                ],
                searchFields: ['title', 'category']
            },
            ui: {
                container: '#search-container',
                input: '#search-input',
                results: '#search-results'
            }
        });

        search.initialize();
    </script>
</body>
</html>
```

## CDN Services

### 1. jsDelivr (Recommended)

**Main Package Files:**
```html
<!-- UMD Bundle (Universal) -->
<script src="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/dist/index.umd.js"></script>

<!-- ES Module -->
<script type="module">
  import UniversalSearch from 'https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/dist/index.esm.js';
</script>

<!-- IIFE (Immediately Invoked Function Expression) -->
<script src="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/dist/index.iife.js"></script>
```

**Styles:**
```html
<!-- Main stylesheet -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/styles/main.css">

<!-- Themes -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/styles/themes/light.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/styles/themes/dark.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/styles/themes/high-contrast.css">
```

**Version Pinning:**
```html
<!-- Latest version (updates automatically) -->
<script src="https://cdn.jsdelivr.net/npm/abt-universal-search@latest/dist/index.umd.js"></script>

<!-- Major version (1.x.x) -->
<script src="https://cdn.jsdelivr.net/npm/abt-universal-search@1/dist/index.umd.js"></script>

<!-- Exact version (recommended for production) -->
<script src="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/dist/index.umd.js"></script>
```

### 2. UNPKG

```html
<!-- Main bundle -->
<script src="https://unpkg.com/abt-universal-search@1.0.0/dist/index.umd.js"></script>

<!-- Styles -->
<link rel="stylesheet" href="https://unpkg.com/abt-universal-search@1.0.0/styles/main.css">
```

### 3. ESM.sh (for ES Modules)

```html
<script type="module">
  import UniversalSearch from 'https://esm.sh/abt-universal-search@1.0.0';

  const search = new UniversalSearch({
    // configuration
  });
</script>
```

## Usage Examples

### 1. Memory Data Source

```html
<script>
const search = new UniversalSearch({
  dataSource: {
    type: 'memory',
    data: [
      { id: 1, title: 'Product A', description: 'Great product', price: 99 },
      { id: 2, title: 'Product B', description: 'Better product', price: 149 },
      { id: 3, title: 'Product C', description: 'Best product', price: 199 }
    ],
    searchFields: ['title', 'description']
  },
  ui: {
    container: '#search-container',
    maxResults: 5,
    placeholder: 'Search products...',
    theme: 'light'
  }
});

search.initialize();
</script>
```

### 2. API Data Source

```html
<script>
const search = new UniversalSearch({
  dataSource: {
    type: 'api',
    endpoint: 'https://api.example.com/search',
    method: 'GET',
    searchParam: 'q',
    headers: {
      'Authorization': 'Bearer your-token'
    }
  },
  ui: {
    container: '#search-container',
    loadingText: 'Searching...',
    noResultsText: 'No items found'
  }
});

search.initialize();
</script>
```

### 3. Enterprise Configuration

```html
<script>
const search = new UniversalSearch({
  dataSource: {
    type: 'api',
    endpoint: 'https://api.company.com/search'
  },
  queryHandling: {
    minLength: 2,
    debounceMs: 150,
    caseSensitive: false,
    xssProtection: true,
    sqlInjectionProtection: true
  },
  ui: {
    container: '#search-container',
    maxResults: 20,
    theme: 'corporate'
  },
  performance: {
    caching: true,
    prefetch: true,
    virtualScrolling: true
  },
  security: {
    rateLimiting: true,
    inputSanitization: true
  }
});

search.initialize();
</script>
```

## Advanced Integration

### Using with Framework CDNs

**With React (via CDN):**
```html
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/dist/index.umd.js"></script>

<script>
function SearchComponent() {
  React.useEffect(() => {
    const search = new UniversalSearch({
      // configuration
    });
    search.initialize();
  }, []);

  return React.createElement('div', {id: 'search-container'});
}
</script>
```

**With Vue.js (via CDN):**
```html
<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
<script src="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/dist/index.umd.js"></script>

<script>
const { createApp } = Vue;

createApp({
  mounted() {
    const search = new UniversalSearch({
      // configuration
    });
    search.initialize();
  }
}).mount('#app');
</script>
```

## Theme Customization via CDN

### Available Themes

1. **Light Theme** (Default)
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/styles/themes/light.css">
```

2. **Dark Theme**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/styles/themes/dark.css">
```

3. **High Contrast Theme** (Accessibility)
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/styles/themes/high-contrast.css">
```

### Custom CSS Override

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/styles/main.css">
<style>
.universal-search {
  --search-primary-color: #your-brand-color;
  --search-background: #your-bg-color;
  --search-border-radius: 8px;
  --search-font-family: 'Your Font', sans-serif;
}

.universal-search__input {
  border: 2px solid var(--search-primary-color);
}

.universal-search__results {
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}
</style>
```

## Performance Optimization

### 1. Preload Resources

```html
<!-- Preload critical resources -->
<link rel="preload" href="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/dist/index.umd.js" as="script">
<link rel="preload" href="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/styles/main.css" as="style">
```

### 2. Use Integrity Hashes (SRI)

```html
<!-- Get the integrity hash from https://www.srihash.org/ -->
<script src="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/dist/index.umd.js"
        integrity="sha384-[HASH]"
        crossorigin="anonymous"></script>
```

### 3. Lazy Loading

```html
<script>
// Load Universal Search only when needed
function loadUniversalSearch() {
  return new Promise((resolve) => {
    if (window.UniversalSearch) {
      resolve(window.UniversalSearch);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/dist/index.umd.js';
    script.onload = () => resolve(window.UniversalSearch);
    document.head.appendChild(script);
  });
}

// Use when search input is focused
document.getElementById('search-input').addEventListener('focus', async () => {
  const UniversalSearch = await loadUniversalSearch();
  const search = new UniversalSearch({
    // configuration
  });
  search.initialize();
}, { once: true });
</script>
```

## Browser Compatibility

### Modern Browsers (Recommended)
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Legacy Browser Support

For older browsers, include polyfills:

```html
<!-- Polyfills for older browsers -->
<script src="https://polyfill.io/v3/polyfill.min.js?features=es6,fetch,Promise,IntersectionObserver"></script>

<!-- Then load Universal Search -->
<script src="https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/dist/index.umd.js"></script>
```

## Troubleshooting

### Common Issues

1. **Script not loading**
   - Check network connectivity
   - Verify CDN URL is correct
   - Check browser console for errors

2. **Styles not applying**
   - Ensure CSS is loaded before JS
   - Check for CSS conflicts
   - Verify theme CSS is loaded

3. **CSP (Content Security Policy) Issues**
```html
<meta http-equiv="Content-Security-Policy"
      content="script-src 'self' https://cdn.jsdelivr.net https://unpkg.com;
               style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline';">
```

### Debug Mode

```html
<script>
const search = new UniversalSearch({
  debug: true, // Enable debug logging
  // other configuration
});
</script>
```

## Production Recommendations

1. **Pin to specific versions** - Don't use `@latest` in production
2. **Use SRI hashes** - Ensure integrity of CDN resources
3. **Add fallbacks** - Host backup copies of critical resources
4. **Monitor performance** - Use tools like Google PageSpeed Insights
5. **Test thoroughly** - Verify functionality across target browsers

## CDN URLs Reference

### jsDelivr URLs
- Package: `https://cdn.jsdelivr.net/npm/abt-universal-search@1.0.0/`
- JS Bundle: `dist/index.umd.js`
- ES Module: `dist/index.esm.js`
- Styles: `styles/main.css`
- Themes: `styles/themes/{theme}.css`

### UNPKG URLs
- Package: `https://unpkg.com/abt-universal-search@1.0.0/`
- Browse files: `https://unpkg.com/abt-universal-search@1.0.0/`

## Support

- **Package Issues**: [GitHub Issues](https://github.com/alonbtm/abt-universal-search/issues)
- **CDN Issues**: Contact respective CDN support (jsDelivr, UNPKG)
- **Integration Help**: See examples in the repository

---

*For npm installation and advanced configurations, see the main README.md*