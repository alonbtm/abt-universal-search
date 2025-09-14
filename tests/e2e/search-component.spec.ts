import { test, expect } from '@playwright/test';

test.describe('Universal Search Component', () => {
  test('should load the simple integration example', async ({ page }) => {
    await page.goto('/packages/examples/simple-integration/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Universal Search Example/);
    
    // Check that the search component script is loaded
    const searchScript = page.locator('script[src*="index.esm.js"]');
    await expect(searchScript).toBeAttached();
  });

  test('should initialize search component', async ({ page }) => {
    await page.goto('/packages/examples/simple-integration/');
    
    // Wait for component to initialize
    await page.waitForFunction(() => window.UniversalSearch !== undefined);
    
    // Check that component is available
    const componentExists = await page.evaluate(() => {
      return typeof window.UniversalSearch === 'object';
    });
    
    expect(componentExists).toBe(true);
  });

  test('future: should handle search input interaction', async ({ page }) => {
    // This test will be implemented when UI components are added
    test.skip();
    
    await page.goto('/packages/examples/simple-integration/');
    await page.waitForSelector('[data-universal-search]');
    
    const searchInput = page.locator('[data-universal-search-input]');
    await expect(searchInput).toBeVisible();
    
    await searchInput.fill('test query');
    await expect(searchInput).toHaveValue('test query');
  });
});