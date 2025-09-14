# Migration Guide: Level 1 → Level 2
## From CDN (30-Second Start) to npm Setup (5-Minute)

> **Estimated Time:** 10 minutes  
> **Complexity:** Easy  
> **Prerequisites:** Node.js 18+, npm/yarn

## 📋 What Changes

| Aspect | Level 1 (CDN) | Level 2 (npm) |
|--------|---------------|---------------|
| Installation | CDN script tag | npm package |
| Module System | Global variable | ES modules |
| TypeScript | Not supported | Fully supported |
| Build Process | None | Basic compilation |
| Development | Browser-only | Node.js environment |

## 🔄 Step-by-Step Migration

### Step 1: Project Initialization

**Before (Level 1):**
```html
<!-- index.html -->
<script src="https://cdn.jsdelivr.net/npm/universal-search-library@latest/dist/universal-search.min.js"></script>
<script>
  const search = new UniversalSearch({
    // configuration
  });
</script>
```

**After (Level 2):**
```bash
# Create new project
mkdir my-search-project
cd my-search-project

# Initialize package.json
npm init -y

# Install Universal Search
npm install @universal-search/core
```

### Step 2: Convert HTML to Project Structure

**Create project files:**
```bash
# Create directory structure
mkdir src
mkdir dist
touch src/main.ts
touch src/index.html
touch tsconfig.json
```

### Step 3: Configuration Migration

**Before (Level 1 - Global Configuration):**
```javascript
// Inline in HTML
const search = new UniversalSearch({
  containerId: 'search-container',
  data: [
    { id: 1, title: 'Sample Item', description: 'Sample description' }
  ],
  searchFields: ['title', 'description']
});
```

**After (Level 2 - Module-based Configuration):**
```typescript
// src/main.ts
import { UniversalSearch } from '@universal-search/core';

const searchConfig = {
  containerId: 'search-container',
  dataSource: {
    type: 'memory' as const,
    data: [
      { id: 1, title: 'Sample Item', description: 'Sample description' }
    ],
    searchFields: ['title', 'description']
  },
  ui: {
    theme: 'default',
    placeholder: 'Search...'
  }
};

const search = new UniversalSearch(searchConfig);
```

### Step 4: TypeScript Configuration

**Create tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 5: Update HTML Structure

**Before (Level 1):**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Search</title>
    <script src="https://cdn.jsdelivr.net/npm/universal-search-library@latest/dist/universal-search.min.js"></script>
</head>
<body>
    <div id="search-container"></div>
    <script>
        // Inline JavaScript
    </script>
</body>
</html>
```

**After (Level 2):**
```html
<!-- src/index.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Search</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <div id="search-container"></div>
    <script type="module" src="./main.js"></script>
</body>
</html>
```

### Step 6: Update Package.json Scripts

**Add build and development scripts:**
```json
{
  "name": "my-search-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "serve": "npx http-server dist -p 3000",
    "start": "npm run build && npm run serve"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "http-server": "^14.1.1"
  },
  "dependencies": {
    "@universal-search/core": "^1.0.0"
  }
}
```

### Step 7: Build and Test

```bash
# Build the project
npm run build

# Serve and test
npm run serve

# Open http://localhost:3000 in browser
```

## 🔍 Configuration Migration Details

### Data Source Migration

**Level 1 Format:**
```javascript
const search = new UniversalSearch({
  data: [...],
  searchFields: [...]
});
```

**Level 2 Format:**
```typescript
const search = new UniversalSearch({
  dataSource: {
    type: 'memory',
    data: [...],
    searchFields: [...]
  }
});
```

### Event Handling Migration

**Level 1:**
```javascript
search.onResults = (results) => {
  console.log('Results:', results);
};
```

**Level 2:**
```typescript
search.on('results', (results) => {
  console.log('Results:', results);
});
```

## ✅ Migration Validation

### 1. Functionality Check
```typescript
// Test search functionality
const testSearch = async () => {
  const results = await search.search('test query');
  console.assert(results.length >= 0, 'Search should return results array');
};
```

### 2. Type Safety Check
```typescript
// TypeScript should catch type errors
const config: UniversalSearchConfig = {
  // This should have full IntelliSense support
  containerId: 'search-container',
  dataSource: {
    type: 'memory',
    data: [],
    searchFields: ['title']
  }
};
```

### 3. Build Verification
```bash
# Should compile without errors
npm run build

# Should serve without issues
npm run serve
```

## 🐛 Common Issues & Solutions

### Issue 1: Module Not Found
```
Error: Cannot find module '@universal-search/core'
```
**Solution:**
```bash
npm install @universal-search/core
```

### Issue 2: TypeScript Errors
```
TS2307: Cannot find module '@universal-search/core' or its corresponding type declarations
```
**Solution:**
```bash
npm install -D @types/universal-search
# or ensure @universal-search/core includes types
```

### Issue 3: Build Errors
```
TS2304: Cannot find name 'UniversalSearch'
```
**Solution:**
```typescript
// Ensure proper import
import { UniversalSearch } from '@universal-search/core';
```

## 🎯 Next Steps

After completing this migration, you can:

1. **Enhance with TypeScript**: Add proper type definitions
2. **Add Testing**: Set up Jest for unit testing
3. **Integrate Build Tools**: Add Vite or Webpack
4. **Migrate to Level 3**: Follow [Level 2 → Level 3 guide](./level2-to-level3.md)

## 📈 Benefits of Level 2

- ✅ **Type Safety**: Full TypeScript support with IntelliSense
- ✅ **Module System**: Proper ES module imports/exports
- ✅ **Development Tools**: Better debugging and development experience
- ✅ **Extensibility**: Easy to add custom functionality
- ✅ **Version Control**: Lockable dependency versions
- ✅ **Build Process**: Compilation and optimization

## 🔄 Rollback Plan

If you need to rollback to Level 1:

1. Copy the compiled JavaScript from `dist/main.js`
2. Include it in your HTML with a `<script>` tag
3. Remove the module imports and use global variables
4. Test functionality matches original implementation

---

**Migration Complete!** 🎉  
Your Universal Search is now running as an npm-based project with TypeScript support.