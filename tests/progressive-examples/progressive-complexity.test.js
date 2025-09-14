/**
 * Progressive Complexity Examples Test Suite
 * Tests all complexity levels to ensure functionality and progression
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

// Test configuration for each complexity level
const complexityLevels = [
  {
    level: 1,
    name: '30-Second Start',
    path: 'packages/examples/getting-started/30-second-start.html',
    expectedFeatures: ['basic-search', 'memory-data', 'simple-ui'],
    setupTime: '< 30 seconds',
    complexity: 'minimal'
  },
  {
    level: 2,
    name: '5-Minute Setup',
    path: 'packages/examples/getting-started/5-minute-setup/index.html',
    expectedFeatures: ['typescript-support', 'npm-based', 'module-system'],
    setupTime: '< 5 minutes',
    complexity: 'basic'
  },
  {
    level: 3,
    name: '30-Minute Integration',
    path: 'packages/examples/getting-started/30-minute-integration/index.html',
    expectedFeatures: ['multi-data-sources', 'advanced-ui', 'testing-framework'],
    setupTime: '< 30 minutes',
    complexity: 'advanced'
  },
  {
    level: 4,
    name: 'Production Deployment',
    path: 'packages/examples/getting-started/production-deployment/index.html',
    expectedFeatures: ['security-features', 'monitoring', 'enterprise-ready'],
    setupTime: '2-6 hours',
    complexity: 'enterprise'
  }
];

// Base URL for examples
const baseURL = 'file://' + path.resolve(__dirname, '../../');

test.describe('Progressive Complexity Examples', () => {
  
  // Test each complexity level
  complexityLevels.forEach((level) => {
    test.describe(`Level ${level.level}: ${level.name}`, () => {
      
      test(`should load and display search interface`, async ({ page }) => {
        const filePath = `${baseURL}/${level.path}`;
        
        await page.goto(filePath);
        
        // Check page loads successfully
        await expect(page).toHaveTitle(new RegExp('Universal Search', 'i'));
        
        // Check search container exists
        const searchContainer = page.locator('[data-testid="search-container"], #search-container, .search-container').first();
        await expect(searchContainer).toBeVisible({ timeout: 10000 });
        
        // Check search input exists
        const searchInput = page.locator('input[type="text"], input[placeholder*="search" i], [data-testid="search-input"]').first();
        await expect(searchInput).toBeVisible();
      });

      test(`should perform basic search functionality`, async ({ page }) => {
        const filePath = `${baseURL}/${level.path}`;
        
        await page.goto(filePath);
        await page.waitForLoadState('networkidle');
        
        // Find search input
        const searchInput = page.locator('input[type="text"], input[placeholder*="search" i], [data-testid="search-input"]').first();
        await expect(searchInput).toBeVisible();
        
        // Perform search
        await searchInput.fill('test');
        
        // Wait for results (with different timeout for different levels)
        const timeout = level.level === 4 ? 5000 : 2000;
        await page.waitForTimeout(timeout);
        
        // Check results appear (flexible selector for different implementations)
        const results = page.locator('.result, .search-result, [data-testid="search-result"], .result-item');
        const resultsContainer = page.locator('.results, .search-results, [data-testid="results"], .results-container');
        
        // At least one should be visible
        const hasResults = await results.count() > 0;
        const hasResultsContainer = await resultsContainer.isVisible();
        
        expect(hasResults || hasResultsContainer).toBe(true);
      });

      test(`should handle empty search gracefully`, async ({ page }) => {
        const filePath = `${baseURL}/${level.path}`;
        
        await page.goto(filePath);
        
        const searchInput = page.locator('input[type="text"], input[placeholder*="search" i], [data-testid="search-input"]').first();
        await searchInput.fill('');
        await searchInput.press('Enter');
        
        // Should not crash or show errors
        const errorElements = page.locator('.error, [data-testid="error"], .alert-error');
        expect(await errorElements.count()).toBe(0);
      });

      if (level.level >= 2) {
        test(`should show TypeScript/modern JavaScript features`, async ({ page }) => {
          const filePath = `${baseURL}/${level.path}`;
          
          await page.goto(filePath);
          
          // Check for module-based loading or TypeScript indicators
          const scripts = await page.locator('script').evaluateAll(scripts => 
            scripts.some(script => 
              script.type === 'module' || 
              script.src?.includes('.js') ||
              script.textContent?.includes('import ') ||
              script.textContent?.includes('export ')
            )
          );
          
          expect(scripts).toBe(true);
        });
      }

      if (level.level >= 3) {
        test(`should support advanced features`, async ({ page }) => {
          const filePath = `${baseURL}/${level.path}`;
          
          await page.goto(filePath);
          
          // Check for advanced UI elements
          const advancedElements = page.locator(
            '.search-filters, .data-source-selector, .advanced-options, [data-testid="advanced-features"]'
          );
          
          // Should have at least some advanced elements
          const elementCount = await advancedElements.count();
          expect(elementCount).toBeGreaterThan(0);
        });
      }

      if (level.level === 4) {
        test(`should include production features`, async ({ page }) => {
          const filePath = `${baseURL}/${level.path}`;
          
          await page.goto(filePath);
          
          // Check for production features like monitoring, security toggles
          const productionFeatures = page.locator(
            '[data-testid*="security"], [data-testid*="monitoring"], .metrics, .security-toggle, .monitoring-panel'
          );
          
          const featureCount = await productionFeatures.count();
          expect(featureCount).toBeGreaterThan(0);
        });

        test(`should display metrics and monitoring`, async ({ page }) => {
          const filePath = `${baseURL}/${level.path}`;
          
          await page.goto(filePath);
          
          // Check for metrics display
          const metricsElements = page.locator('#responseTime, #cacheHitRate, #totalQueries, .metric-value');
          const visibleMetrics = await metricsElements.count();
          
          expect(visibleMetrics).toBeGreaterThan(0);
        });
      }

    });
  });

  // Cross-level comparison tests
  test.describe('Progressive Enhancement Validation', () => {
    
    test('should show increasing complexity across levels', async ({ browser }) => {
      const results = [];
      
      for (const level of complexityLevels) {
        const page = await browser.newPage();
        const filePath = `${baseURL}/${level.path}`;
        
        await page.goto(filePath);
        
        // Count interactive elements as complexity indicator
        const elementCounts = {
          inputs: await page.locator('input').count(),
          buttons: await page.locator('button').count(),
          selects: await page.locator('select').count(),
          scripts: await page.locator('script').count(),
          divs: await page.locator('div').count()
        };
        
        const totalElements = Object.values(elementCounts).reduce((sum, count) => sum + count, 0);
        
        results.push({
          level: level.level,
          totalElements,
          elementCounts
        });
        
        await page.close();
      }
      
      // Verify complexity generally increases
      for (let i = 1; i < results.length; i++) {
        const current = results[i];
        const previous = results[i - 1];
        
        // Allow some flexibility - not every metric must increase
        const complexityScore = (current.totalElements + current.elementCounts.scripts) / 
                               (previous.totalElements + previous.elementCounts.scripts);
        
        expect(complexityScore).toBeGreaterThan(0.8); // Should be roughly same or increasing
      }
    });

    test('should maintain backward compatibility concepts', async ({ browser }) => {
      const coreFeatures = [];
      
      for (const level of complexityLevels) {
        const page = await browser.newPage();
        const filePath = `${baseURL}/${level.path}`;
        
        await page.goto(filePath);
        
        // Check for core search functionality
        const hasSearchInput = await page.locator('input[type="text"], input[placeholder*="search" i]').count() > 0;
        const hasSearchContainer = await page.locator('#search-container, .search-container, [data-testid="search-container"]').count() > 0;
        
        coreFeatures.push({
          level: level.level,
          hasSearchInput,
          hasSearchContainer
        });
        
        await page.close();
      }
      
      // All levels should maintain core search functionality
      coreFeatures.forEach(features => {
        expect(features.hasSearchInput).toBe(true);
        expect(features.hasSearchContainer).toBe(true);
      });
    });

  });

  // Performance tests across levels
  test.describe('Performance Validation', () => {
    
    test('should have reasonable load times for each level', async ({ page }) => {
      const performanceResults = [];
      
      for (const level of complexityLevels) {
        const filePath = `${baseURL}/${level.path}`;
        
        const startTime = Date.now();
        await page.goto(filePath);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        performanceResults.push({
          level: level.level,
          loadTime
        });
        
        // Basic performance expectations
        if (level.level <= 2) {
          expect(loadTime).toBeLessThan(3000); // Simple levels should load quickly
        } else {
          expect(loadTime).toBeLessThan(10000); // Complex levels get more time
        }
      }
      
      console.log('Performance Results:', performanceResults);
    });

  });

  // Accessibility tests
  test.describe('Accessibility Validation', () => {
    
    test('should maintain accessibility across all levels', async ({ page }) => {
      for (const level of complexityLevels) {
        const filePath = `${baseURL}/${level.path}`;
        
        await page.goto(filePath);
        
        // Check for basic accessibility features
        const searchInput = page.locator('input[type="text"]').first();
        
        if (await searchInput.count() > 0) {
          // Should be keyboard accessible
          await searchInput.focus();
          expect(await searchInput.evaluate(el => document.activeElement === el)).toBe(true);
          
          // Should have proper labeling (aria-label, placeholder, or associated label)
          const hasLabel = await searchInput.evaluate(el => 
            el.hasAttribute('aria-label') || 
            el.hasAttribute('placeholder') ||
            document.querySelector(`label[for="${el.id}"]`) !== null
          );
          
          expect(hasLabel).toBe(true);
        }
      }
    });

  });

  // Migration validation tests
  test.describe('Migration Path Validation', () => {
    
    test('should have migration guides for each transition', async ({ page }) => {
      const migrationFiles = [
        'packages/examples/getting-started/migrations/level1-to-level2.md',
        'packages/examples/getting-started/migrations/level2-to-level3.md',
        'packages/examples/getting-started/migrations/level3-to-level4.md'
      ];
      
      const fs = require('fs');
      const path = require('path');
      
      for (const migrationFile of migrationFiles) {
        const fullPath = path.resolve(__dirname, '../../', migrationFile);
        const exists = fs.existsSync(fullPath);
        expect(exists).toBe(true);
        
        if (exists) {
          const content = fs.readFileSync(fullPath, 'utf8');
          expect(content.length).toBeGreaterThan(1000); // Should have substantial content
          expect(content).toContain('Migration Guide'); // Should be a migration guide
          expect(content).toContain('Step'); // Should have steps
        }
      }
    });

    test('should have comparison matrix', async ({ page }) => {
      const comparisonPath = `${baseURL}/packages/examples/getting-started/comparison-matrix.html`;
      
      await page.goto(comparisonPath);
      
      // Should load successfully
      await expect(page).toHaveTitle(/comparison/i);
      
      // Should have comparison table
      const table = page.locator('table, .comparison-table');
      await expect(table).toBeVisible();
      
      // Should have all levels represented
      for (let i = 1; i <= 4; i++) {
        const levelCell = page.locator(`text=/Level ${i}/i`).first();
        await expect(levelCell).toBeVisible();
      }
    });

  });

});

// Utility functions for advanced testing
async function measureBundleSize(page, filePath) {
  await page.goto(filePath);
  
  const resourceSizes = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    return entries.map(entry => ({
      name: entry.name,
      size: entry.transferSize || 0
    }));
  });
  
  return resourceSizes.reduce((total, resource) => total + resource.size, 0);
}

async function checkSecurityHeaders(page, filePath) {
  const response = await page.goto(filePath);
  const headers = response.headers();
  
  return {
    hasCSP: !!headers['content-security-policy'],
    hasHSTS: !!headers['strict-transport-security'],
    hasXFrame: !!headers['x-frame-options']
  };
}

async function validateSearchFunctionality(page, searchTerm = 'test') {
  const searchInput = page.locator('input[type="text"]').first();
  await searchInput.fill(searchTerm);
  await page.waitForTimeout(1000);
  
  const results = await page.locator('.result, .search-result, [data-testid="search-result"]').count();
  const noResults = await page.locator('.no-results, .empty-state, [data-testid="no-results"]').count();
  
  return {
    hasResults: results > 0,
    hasNoResultsMessage: noResults > 0,
    resultCount: results
  };
}

module.exports = {
  complexityLevels,
  measureBundleSize,
  checkSecurityHeaders,
  validateSearchFunctionality
};