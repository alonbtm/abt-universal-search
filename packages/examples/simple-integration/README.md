# Development Example

This is a simple example for developing and testing the Universal Search Component with hot reload.

## Development Setup

1. **Start development server with hot reload:**
   ```bash
   npm run dev
   ```
   This will:
   - Start Rollup in watch mode (rebuilds on source changes)
   - Start HTTP server on http://localhost:8080
   - Open the example page automatically

2. **Manual steps:**
   ```bash
   # Build the component
   npm run build

   # Serve the examples
   npm run serve
   ```

## Hot Reload Testing

1. Open http://localhost:8080/simple-integration/
2. Make changes to `packages/core/src/index.ts`
3. The component will automatically rebuild
4. Refresh the browser to see changes

## Example Usage

The example demonstrates:
- Basic component initialization
- Configuration options
- Version display
- Development workflow