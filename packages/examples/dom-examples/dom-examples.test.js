/**
 * Comprehensive Test Suite for DOM Examples
 * Tests all DOM search functionality, performance patterns, and accessibility features
 */

// Import testing utilities (adjust path as needed for your environment)
// For browser testing, these would be loaded via script tags
// For Node.js testing, use appropriate test runner setup

class DOMTestSuite {
    constructor() {
        this.testResults = [];
        this.adapter = null;
        this.testContainer = null;
        
        this.init();
    }

    async init() {
        this.setupTestEnvironment();
        await this.runAllTests();
        this.generateReport();
    }

    setupTestEnvironment() {
        // Create test container
        this.testContainer = document.createElement('div');
        this.testContainer.id = 'test-container';
        this.testContainer.style.cssText = `
            position: fixed;
            top: -10000px;
            left: -10000px;
            width: 1000px;
            height: 1000px;
            visibility: hidden;
        `;
        document.body.appendChild(this.testContainer);

        // Initialize DOMAdapter for testing
        if (typeof createDOMAdapter !== 'undefined') {
            this.adapter = createDOMAdapter({
                enableCaching: true,
                enablePerformanceMetrics: true,
                enableAccessibility: true,
                shadowDOMSupport: true
            });
        }

        console.log('Test environment initialized');
    }

    async runAllTests() {
        console.log('Starting DOM Examples Test Suite...');
        
        const testSuites = [
            'Basic Search Tests',
            'CSS Selector Tests', 
            'Text Search Tests',
            'Attribute Search Tests',
            'Shadow DOM Tests',
            'Performance Tests',
            'Accessibility Tests',
            'Virtual Scrolling Tests',
            'Caching Tests',
            'Mutation Observer Tests'
        ];

        for (const suite of testSuites) {
            console.log(`\nRunning ${suite}...`);
            await this.runTestSuite(suite);
        }
    }

    async runTestSuite(suiteName) {
        switch (suiteName) {
            case 'Basic Search Tests':
                await this.testBasicSearch();
                break;
            case 'CSS Selector Tests':
                await this.testCSSSelectors();
                break;
            case 'Text Search Tests':
                await this.testTextSearch();
                break;
            case 'Attribute Search Tests':
                await this.testAttributeSearch();
                break;
            case 'Shadow DOM Tests':
                await this.testShadowDOM();
                break;
            case 'Performance Tests':
                await this.testPerformance();
                break;
            case 'Accessibility Tests':
                await this.testAccessibility();
                break;
            case 'Virtual Scrolling Tests':
                await this.testVirtualScrolling();
                break;
            case 'Caching Tests':
                await this.testCaching();
                break;
            case 'Mutation Observer Tests':
                await this.testMutationObserver();
                break;
        }
    }

    // ==================== BASIC SEARCH TESTS ====================

    async testBasicSearch() {
        // Test 1: Empty query
        await this.test('Empty query returns empty results', async () => {
            const results = await this.adapter.search('', this.testContainer);
            return results.length === 0;
        });

        // Test 2: Non-existent element
        await this.test('Non-existent element returns empty results', async () => {
            const results = await this.adapter.search('nonexistent-element', this.testContainer);
            return results.length === 0;
        });

        // Test 3: Basic element finding
        this.testContainer.innerHTML = '<div class="test-element">Test</div>';
        await this.test('Find basic element by class', async () => {
            const results = await this.adapter.search('.test-element', this.testContainer);
            return results.length === 1 && results[0].className === 'test-element';
        });

        // Test 4: Multiple elements
        this.testContainer.innerHTML = `
            <div class="multi">First</div>
            <div class="multi">Second</div>
            <div class="multi">Third</div>
        `;
        await this.test('Find multiple elements', async () => {
            const results = await this.adapter.search('.multi', this.testContainer);
            return results.length === 3;
        });

        // Test 5: Nested elements
        this.testContainer.innerHTML = `
            <div class="parent">
                <div class="child">Child 1</div>
                <div class="child">Child 2</div>
            </div>
        `;
        await this.test('Find nested elements', async () => {
            const results = await this.adapter.search('.child', this.testContainer);
            return results.length === 2;
        });
    }

    // ==================== CSS SELECTOR TESTS ====================

    async testCSSSelectors() {
        this.testContainer.innerHTML = `
            <div id="test-id" class="test-class" data-value="test">Content</div>
            <p class="paragraph">Paragraph text</p>
            <ul>
                <li class="item">Item 1</li>
                <li class="item active">Item 2</li>
                <li class="item">Item 3</li>
            </ul>
            <form>
                <input type="text" name="username" required />
                <input type="email" name="email" />
            </form>
        `;

        // Test ID selector
        await this.test('ID selector works', async () => {
            const results = await this.adapter.search('#test-id', this.testContainer);
            return results.length === 1 && results[0].id === 'test-id';
        });

        // Test class selector
        await this.test('Class selector works', async () => {
            const results = await this.adapter.search('.test-class', this.testContainer);
            return results.length === 1 && results[0].classList.contains('test-class');
        });

        // Test attribute selector
        await this.test('Attribute selector works', async () => {
            const results = await this.adapter.search('[data-value="test"]', this.testContainer);
            return results.length === 1 && results[0].getAttribute('data-value') === 'test';
        });

        // Test pseudo-class selector
        await this.test('Pseudo-class selector works', async () => {
            const results = await this.adapter.search('input[required]', this.testContainer);
            return results.length === 1 && results[0].hasAttribute('required');
        });

        // Test descendant selector
        await this.test('Descendant selector works', async () => {
            const results = await this.adapter.search('ul li', this.testContainer);
            return results.length === 3;
        });

        // Test multiple class selector
        await this.test('Multiple class selector works', async () => {
            const results = await this.adapter.search('.item.active', this.testContainer);
            return results.length === 1 && results[0].classList.contains('active');
        });

        // Test complex selector
        await this.test('Complex selector works', async () => {
            const results = await this.adapter.search('ul > li.item:not(.active)', this.testContainer);
            return results.length === 2;
        });
    }

    // ==================== TEXT SEARCH TESTS ====================

    async testTextSearch() {
        this.testContainer.innerHTML = `
            <div>Hello World</div>
            <p>This is a test paragraph</p>
            <span>JavaScript is awesome</span>
            <div data-search="hidden content">Visible content</div>
        `;

        // Test simple text search
        await this.test('Simple text search works', async () => {
            const results = await this.adapter.search('Hello World', this.testContainer, { strategy: 'text' });
            return results.length === 1 && results[0].textContent.includes('Hello World');
        });

        // Test partial text search
        await this.test('Partial text search works', async () => {
            const results = await this.adapter.search('test', this.testContainer, { strategy: 'text' });
            return results.length === 1 && results[0].textContent.includes('test paragraph');
        });

        // Test case sensitive search
        await this.test('Case sensitive search works', async () => {
            const results = await this.adapter.search('javascript', this.testContainer, { 
                strategy: 'text',
                caseSensitive: true
            });
            return results.length === 0;
        });

        // Test case insensitive search
        await this.test('Case insensitive search works', async () => {
            const results = await this.adapter.search('javascript', this.testContainer, { 
                strategy: 'text',
                caseSensitive: false
            });
            return results.length === 1;
        });

        // Test attribute text search
        await this.test('Attribute text search works', async () => {
            const results = await this.adapter.search('hidden content', this.testContainer, { 
                strategy: 'text',
                includeAttributes: true
            });
            return results.length === 1;
        });
    }

    // ==================== ATTRIBUTE SEARCH TESTS ====================

    async testAttributeSearch() {
        this.testContainer.innerHTML = `
            <div data-category="product" data-price="100">Product 1</div>
            <div data-category="service" data-price="50">Service 1</div>
            <div data-category="product" data-featured="true">Product 2</div>
            <input type="text" placeholder="Search..." />
            <button disabled>Disabled Button</button>
        `;

        // Test simple attribute existence
        await this.test('Attribute existence search works', async () => {
            const results = await this.adapter.search('data-featured', this.testContainer, { strategy: 'attribute' });
            return results.length === 1;
        });

        // Test attribute value search
        await this.test('Attribute value search works', async () => {
            const results = await this.adapter.search({ 'data-category': 'product' }, this.testContainer, { strategy: 'attribute' });
            return results.length === 2;
        });

        // Test multiple attribute search
        await this.test('Multiple attribute search works', async () => {
            const results = await this.adapter.search({ 
                'data-category': 'product',
                'data-price': '100'
            }, this.testContainer, { strategy: 'attribute' });
            return results.length === 1;
        });

        // Test wildcard attribute search
        await this.test('Wildcard attribute search works', async () => {
            const results = await this.adapter.search({ 'placeholder': 'Search*' }, this.testContainer, { strategy: 'attribute' });
            return results.length === 1;
        });

        // Test boolean attribute search
        await this.test('Boolean attribute search works', async () => {
            const results = await this.adapter.search('disabled', this.testContainer, { strategy: 'attribute' });
            return results.length === 1 && results[0].tagName === 'BUTTON';
        });
    }

    // ==================== SHADOW DOM TESTS ====================

    async testShadowDOM() {
        if (!this.adapter.config.shadowDOMSupport) {
            console.log('Shadow DOM support disabled, skipping tests');
            return;
        }

        // Create shadow DOM element
        const shadowHost = document.createElement('div');
        shadowHost.id = 'shadow-host';
        const shadow = shadowHost.attachShadow({ mode: 'open' });
        shadow.innerHTML = `
            <div class="shadow-content">Shadow DOM Content</div>
            <p class="shadow-paragraph">Shadow paragraph</p>
        `;
        this.testContainer.appendChild(shadowHost);

        // Test shadow DOM traversal
        await this.test('Shadow DOM traversal works', async () => {
            const results = await this.adapter.search('.shadow-content', this.testContainer);
            return results.length === 1;
        });

        // Test shadow DOM text search
        await this.test('Shadow DOM text search works', async () => {
            const results = await this.adapter.search('Shadow DOM Content', this.testContainer, { strategy: 'text' });
            return results.length === 1;
        });

        // Test nested shadow DOM
        const nestedShadowHost = document.createElement('div');
        const nestedShadow = nestedShadowHost.attachShadow({ mode: 'open' });
        nestedShadow.innerHTML = '<span class="nested-shadow">Nested content</span>';
        shadow.appendChild(nestedShadowHost);

        await this.test('Nested shadow DOM works', async () => {
            const results = await this.adapter.search('.nested-shadow', this.testContainer);
            return results.length === 1;
        });
    }

    // ==================== PERFORMANCE TESTS ====================

    async testPerformance() {
        // Create large dataset
        const largeHTML = Array.from({ length: 1000 }, (_, i) => 
            `<div class="perf-item" data-id="${i}">Performance Item ${i}</div>`
        ).join('');
        this.testContainer.innerHTML = largeHTML;

        // Test search performance
        await this.test('Large dataset search performance', async () => {
            const startTime = performance.now();
            const results = await this.adapter.search('.perf-item', this.testContainer);
            const duration = performance.now() - startTime;
            
            return results.length === 1000 && duration < 100; // Should complete in under 100ms
        });

        // Test indexed search performance
        await this.test('Indexed search performance', async () => {
            const startTime = performance.now();
            const results = await this.adapter.search('Performance', this.testContainer, { strategy: 'indexed' });
            const duration = performance.now() - startTime;
            
            return results.length === 1000 && duration < 50; // Indexed should be faster
        });

        // Test caching performance
        await this.test('Caching improves performance', async () => {
            // First search (cache miss)
            const startTime1 = performance.now();
            await this.adapter.search('Performance Item 500', this.testContainer);
            const duration1 = performance.now() - startTime1;

            // Second search (cache hit)
            const startTime2 = performance.now();
            await this.adapter.search('Performance Item 500', this.testContainer);
            const duration2 = performance.now() - startTime2;

            return duration2 < duration1; // Second search should be faster
        });

        // Test virtual scrolling performance
        await this.test('Virtual scrolling handles large datasets', async () => {
            const container = document.createElement('div');
            container.style.height = '200px';
            this.testContainer.appendChild(container);

            const items = Array.from({ length: 10000 }, (_, i) => ({ id: i, text: `Item ${i}` }));
            
            const startTime = performance.now();
            const viewport = this.adapter.createVirtualViewport(container, items);
            const duration = performance.now() - startTime;

            return viewport && duration < 100; // Should create viewport quickly
        });
    }

    // ==================== ACCESSIBILITY TESTS ====================

    async testAccessibility() {
        this.testContainer.innerHTML = `
            <div role="button" tabindex="0">Accessible Button</div>
            <input aria-label="Search field" type="text" />
            <div aria-hidden="true">Hidden content</div>
            <ul role="listbox">
                <li role="option" aria-selected="false">Option 1</li>
                <li role="option" aria-selected="true">Option 2</li>
            </ul>
        `;

        // Test ARIA role search
        await this.test('ARIA role search works', async () => {
            const results = await this.adapter.search('[role="button"]', this.testContainer);
            return results.length === 1 && results[0].getAttribute('role') === 'button';
        });

        // Test aria-label search
        await this.test('Aria-label search works', async () => {
            const results = await this.adapter.search('Search field', this.testContainer, { 
                strategy: 'text',
                includeAttributes: true
            });
            return results.length === 1 && results[0].tagName === 'INPUT';
        });

        // Test focusable elements
        await this.test('Focusable elements detection works', async () => {
            const results = await this.adapter.search('[tabindex]', this.testContainer);
            return results.length === 1 && results[0].getAttribute('tabindex') === '0';
        });

        // Test selected options
        await this.test('Selected options detection works', async () => {
            const results = await this.adapter.search('[aria-selected="true"]', this.testContainer);
            return results.length === 1 && results[0].textContent === 'Option 2';
        });

        // Test accessibility enhancement
        await this.test('Accessibility enhancement works', async () => {
            const results = await this.adapter.search('[role="option"]', this.testContainer);
            const enhanced = this.adapter.enhanceAccessibility(results, 'test query');
            
            return enhanced.every(el => 
                el.hasAttribute('aria-label') && 
                el.getAttribute('tabindex') === '0'
            );
        });
    }

    // ==================== VIRTUAL SCROLLING TESTS ====================

    async testVirtualScrolling() {
        const container = document.createElement('div');
        container.style.cssText = 'height: 300px; overflow: auto; border: 1px solid #ccc;';
        this.testContainer.appendChild(container);

        const items = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            title: `Item ${i}`,
            description: `Description for item ${i}`
        }));

        // Test viewport creation
        await this.test('Virtual viewport creation works', async () => {
            const viewport = this.adapter.createVirtualViewport(container, items, {
                itemHeight: 50,
                renderItem: (item) => {
                    const div = document.createElement('div');
                    div.textContent = item.title;
                    return div;
                }
            });
            
            return viewport && container.children.length > 0;
        });

        // Test initial rendering
        await this.test('Virtual viewport renders initial items', async () => {
            const renderedItems = container.querySelectorAll('div[style*="position: absolute"]');
            return renderedItems.length > 0 && renderedItems.length < items.length;
        });

        // Test scroll handling
        await this.test('Virtual viewport handles scrolling', async () => {
            const initialItemCount = container.querySelectorAll('div[style*="position: absolute"]').length;
            
            // Simulate scroll
            container.scrollTop = 500;
            container.dispatchEvent(new Event('scroll'));
            
            // Wait for update
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const newItemCount = container.querySelectorAll('div[style*="position: absolute"]').length;
            return newItemCount > 0; // Should still render items
        });

        // Test item updates
        await this.test('Virtual viewport handles item updates', async () => {
            const viewport = this.adapter.virtualViewports.get(container);
            const newItems = items.slice(0, 500); // Reduce item count
            
            viewport.updateItems(newItems);
            
            const totalHeight = container.firstChild.style.height;
            return parseInt(totalHeight) === 500 * 50; // 500 items * 50px height
        });
    }

    // ==================== CACHING TESTS ====================

    async testCaching() {
        this.testContainer.innerHTML = `
            <div class="cached-item">Item 1</div>
            <div class="cached-item">Item 2</div>
        `;

        // Test cache hit
        await this.test('Caching stores results', async () => {
            // First search - should cache results
            await this.adapter.search('.cached-item', this.testContainer);
            
            // Check if results are cached
            const cacheSize = this.adapter.cache.size;
            return cacheSize > 0;
        });

        // Test cache retrieval
        await this.test('Caching retrieves stored results', async () => {
            // Clear performance metrics for accurate testing
            if (this.adapter.performanceMetrics) {
                this.adapter.performanceMetrics.set('cacheHits', 0);
            }
            
            // Second search - should hit cache
            await this.adapter.search('.cached-item', this.testContainer);
            
            const cacheHits = this.adapter.performanceMetrics?.get('cacheHits') || 0;
            return cacheHits > 0;
        });

        // Test cache invalidation
        await this.test('Cache invalidates on DOM changes', async () => {
            const initialCacheSize = this.adapter.cache.size;
            
            // Modify DOM
            const newElement = document.createElement('div');
            newElement.className = 'cached-item';
            newElement.textContent = 'Item 3';
            this.testContainer.appendChild(newElement);
            
            // Wait for mutation observer
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const newCacheSize = this.adapter.cache.size;
            return newCacheSize < initialCacheSize;
        });

        // Test cache size limit
        await this.test('Cache respects size limit', async () => {
            // Fill cache beyond limit
            for (let i = 0; i < this.adapter.config.cacheSize + 10; i++) {
                await this.adapter.search(`unique-query-${i}`, this.testContainer);
            }
            
            return this.adapter.cache.size <= this.adapter.config.cacheSize;
        });
    }

    // ==================== MUTATION OBSERVER TESTS ====================

    async testMutationObserver() {
        // Test DOM addition detection
        await this.test('Mutation observer detects DOM additions', async () => {
            const initialCacheSize = this.adapter.cache.size;
            
            // Add new element
            const newElement = document.createElement('div');
            newElement.className = 'mutation-test';
            newElement.textContent = 'Mutation test element';
            this.testContainer.appendChild(newElement);
            
            // Wait for mutation observer
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Cache should be cleared due to DOM change
            return this.adapter.cache.size === 0;
        });

        // Test DOM removal detection
        await this.test('Mutation observer detects DOM removals', async () => {
            // Add element and cache a search
            const element = document.createElement('div');
            element.className = 'removal-test';
            this.testContainer.appendChild(element);
            await this.adapter.search('.removal-test', this.testContainer);
            
            const cacheAfterSearch = this.adapter.cache.size;
            
            // Remove element
            this.testContainer.removeChild(element);
            
            // Wait for mutation observer
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return this.adapter.cache.size === 0;
        });

        // Test attribute change detection
        await this.test('Mutation observer detects attribute changes', async () => {
            // Add element and cache a search
            const element = document.createElement('div');
            element.className = 'attr-test';
            this.testContainer.appendChild(element);
            await this.adapter.search('.attr-test', this.testContainer);
            
            // Change attribute
            element.setAttribute('data-changed', 'true');
            
            // Wait for mutation observer
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return this.adapter.cache.size === 0;
        });
    }

    // ==================== TEST UTILITIES ====================

    async test(description, testFunction) {
        try {
            const startTime = performance.now();
            const result = await testFunction();
            const duration = performance.now() - startTime;
            
            const testResult = {
                description,
                passed: !!result,
                duration: Math.round(duration * 100) / 100,
                error: null
            };
            
            this.testResults.push(testResult);
            
            console.log(`${result ? '✅' : '❌'} ${description} (${testResult.duration}ms)`);
            
            return result;
        } catch (error) {
            const testResult = {
                description,
                passed: false,
                duration: 0,
                error: error.message
            };
            
            this.testResults.push(testResult);
            console.log(`❌ ${description} - Error: ${error.message}`);
            
            return false;
        }
    }

    generateReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(test => test.passed).length;
        const failedTests = totalTests - passedTests;
        const totalDuration = this.testResults.reduce((sum, test) => sum + test.duration, 0);
        const avgDuration = totalDuration / totalTests;

        console.log('\n' + '='.repeat(60));
        console.log('DOM EXAMPLES TEST SUITE REPORT');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
        console.log(`Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);
        console.log(`Total Duration: ${Math.round(totalDuration)}ms`);
        console.log(`Average Duration: ${Math.round(avgDuration * 100) / 100}ms`);
        
        if (failedTests > 0) {
            console.log('\nFailed Tests:');
            this.testResults
                .filter(test => !test.passed)
                .forEach(test => {
                    console.log(`❌ ${test.description}${test.error ? ` - ${test.error}` : ''}`);
                });
        }

        console.log('='.repeat(60));

        // Create visual report if in browser
        if (typeof document !== 'undefined') {
            this.createVisualReport();
        }
    }

    createVisualReport() {
        const reportContainer = document.createElement('div');
        reportContainer.id = 'test-report';
        reportContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            max-height: 80vh;
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: monospace;
            font-size: 12px;
            overflow-y: auto;
            z-index: 10000;
        `;

        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(test => test.passed).length;
        
        reportContainer.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333;">Test Report</h3>
            <div style="margin-bottom: 15px;">
                <div style="color: green;">✅ Passed: ${passedTests}</div>
                <div style="color: red;">❌ Failed: ${totalTests - passedTests}</div>
                <div style="color: #666;">Total: ${totalTests}</div>
            </div>
            <div style="max-height: 300px; overflow-y: auto;">
                ${this.testResults.map(test => `
                    <div style="margin-bottom: 8px; padding: 8px; background: ${test.passed ? '#f0f8f0' : '#f8f0f0'}; border-radius: 4px;">
                        <div style="font-weight: bold; color: ${test.passed ? 'green' : 'red'};">
                            ${test.passed ? '✅' : '❌'} ${test.description}
                        </div>
                        <div style="font-size: 11px; color: #666; margin-top: 4px;">
                            ${test.duration}ms${test.error ? ` | ${test.error}` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <button onclick="document.body.removeChild(this.parentElement)" 
                    style="margin-top: 15px; padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Close Report
            </button>
        `;

        document.body.appendChild(reportContainer);
    }

    cleanup() {
        if (this.testContainer && this.testContainer.parentElement) {
            document.body.removeChild(this.testContainer);
        }
        
        if (this.adapter) {
            this.adapter.destroy();
        }
    }
}

// Auto-run tests when loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other scripts to load
    setTimeout(() => {
        new DOMTestSuite();
    }, 1000);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMTestSuite;
}

// Export for ES modules
export { DOMTestSuite };