/**
 * Universal Search - 30 Minute Integration
 * Complete example with multiple data sources, custom styling, and advanced features
 */

import { DataSourceManager } from './services/DataSourceManager.js';
import { API_PRESETS } from './services/ApiDataSource.js';
import { SearchApplication } from './components/SearchApplication.js';
import { ThemeManager } from './utils/ThemeManager.js';
import { Logger } from './utils/Logger.js';
import { DataSource, SearchConfig } from './types/index.js';

// Initialize logger
const logger = new Logger('Application');

/**
 * Main application class
 */
class UniversalSearchApp {
  private dataSourceManager: DataSourceManager;
  private searchApp: SearchApplication;
  private themeManager: ThemeManager;
  private initialized = false;

  constructor() {
    this.dataSourceManager = new DataSourceManager();
    this.themeManager = new ThemeManager();
    this.searchApp = new SearchApplication(this.dataSourceManager, this.themeManager);
  }

  /**
   * Initialize the application
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    logger.info('Initializing Universal Search Application');

    try {
      // Initialize theme
      this.themeManager.init();
      
      // Set up data sources
      await this.setupDataSources();
      
      // Initialize search application
      await this.searchApp.init();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Mount to DOM
      this.mount();
      
      this.initialized = true;
      logger.info('Application initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize application:', error);
      this.showError('Failed to initialize application. Please refresh and try again.');
    }
  }

  /**
   * Set up various data sources
   */
  private async setupDataSources(): Promise<void> {
    const dataSources: DataSource[] = [
      // Memory data source with sample data
      {
        id: 'memory-products',
        name: 'Product Catalog',
        type: 'memory',
        status: 'disconnected',
        config: {
          memory: {
            data: this.generateSampleProducts(),
            indexFields: ['title', 'description', 'category', 'tags'],
            fuzzySearch: true,
            caseSensitive: false
          }
        }
      },

      // API data source using JSONPlaceholder
      {
        id: 'api-posts',
        name: 'Blog Posts',
        type: 'api',
        status: 'disconnected',
        config: {
          api: {
            ...API_PRESETS.jsonPlaceholder,
            cache: { enabled: true, ttl: 600000 }, // 10 minutes
            timeout: 8000,
            retries: 2
          }
        }
      },

      // GitHub API example (requires no auth for public repos)
      {
        id: 'api-github',
        name: 'GitHub Repositories',
        type: 'api',
        status: 'disconnected',
        config: {
          api: API_PRESETS.github('microsoft') // Example with Microsoft repos
        }
      },

      // DOM data source to search current page content
      {
        id: 'dom-content',
        name: 'Page Content',
        type: 'dom',
        status: 'disconnected',
        config: {
          dom: {
            selectors: {
              container: 'body',
              item: 'h1, h2, h3, h4, h5, h6, p, article, section',
              title: ':is(h1, h2, h3, h4, h5, h6)',
              description: 'p',
              category: '[data-category]'
            },
            mutationObserver: {
              enabled: true,
              options: {
                childList: true,
                subtree: true,
                characterData: true
              }
            }
          }
        }
      }
    ];

    // Register all data sources
    for (const dataSource of dataSources) {
      try {
        await this.dataSourceManager.registerDataSource(dataSource);
      } catch (error) {
        logger.warn(`Failed to register data source ${dataSource.id}:`, error);
      }
    }
  }

  /**
   * Generate sample product data
   */
  private generateSampleProducts() {
    const categories = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Automotive'];
    const adjectives = ['Premium', 'Deluxe', 'Professional', 'Compact', 'Wireless', 'Smart'];
    const products = ['Smartphone', 'Laptop', 'Headphones', 'Camera', 'Tablet', 'Monitor'];
    
    return Array.from({ length: 50 }, (_, i) => {
      const category = categories[i % categories.length];
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      
      return {
        id: `product-${i + 1}`,
        title: `${adjective} ${product} ${i + 1}`,
        description: `High-quality ${product.toLowerCase()} with advanced features and excellent performance. Perfect for both professional and personal use.`,
        category,
        tags: [adjective.toLowerCase(), product.toLowerCase(), category.toLowerCase()],
        metadata: {
          price: Math.floor(Math.random() * 1000) + 50,
          rating: (Math.random() * 2 + 3).toFixed(1),
          inStock: Math.random() > 0.2,
          brand: ['Apple', 'Samsung', 'Sony', 'LG', 'Microsoft'][Math.floor(Math.random() * 5)]
        }
      };
    });
  }

  /**
   * Set up application event listeners
   */
  private setupEventListeners(): void {
    // Data source events
    this.dataSourceManager.on('dataSourceStatus', (event) => {
      logger.info(`Data source ${event.id} status changed to: ${event.status}`);
      this.updateDataSourceStatus(event.id, event.status);
    });

    this.dataSourceManager.on('dataSourceError', (event) => {
      logger.error(`Data source ${event.id} error:`, event.error);
      this.showError(`Data source error: ${event.error.message}`);
    });

    this.dataSourceManager.on('searchCompleted', (result) => {
      logger.info(`Search completed: ${result.items.length} results in ${result.executionTime.toFixed(2)}ms`);
      this.updateSearchStats(result);
    });

    // Theme events
    this.themeManager.on('themeChanged', (theme) => {
      logger.info(`Theme changed to: ${theme}`);
      document.documentElement.setAttribute('data-theme', theme);
    });

    // Window events
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            this.focusSearch();
            break;
          case '/':
            e.preventDefault();
            this.focusSearch();
            break;
          case 'Escape':
            this.clearSearch();
            break;
        }
      }
    });
  }

  /**
   * Mount application to DOM
   */
  private mount(): void {
    const container = document.getElementById('app');
    if (!container) {
      throw new Error('Application container not found');
    }

    // Render main application HTML
    container.innerHTML = this.getApplicationHTML();
    
    // Mount search application
    this.searchApp.mount('#search-app');
    
    // Initialize UI components
    this.initializeUI();
  }

  /**
   * Get main application HTML structure
   */
  private getApplicationHTML(): string {
    return `
      <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <!-- Header -->
        <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
              <div class="flex items-center">
                <h1 class="text-2xl font-bold text-gradient">Universal Search</h1>
                <span class="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">
                  30-Minute Integration
                </span>
              </div>
              <div class="flex items-center space-x-4">
                <button id="theme-toggle" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"></path>
                  </svg>
                </button>
                <button id="settings-toggle" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <!-- Data Sources Status -->
          <div class="mb-8">
            <h2 class="section-title">Data Sources</h2>
            <div id="data-sources-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Data source cards will be inserted here -->
            </div>
          </div>

          <!-- Search Application -->
          <div class="mb-8">
            <h2 class="section-title">Search Interface</h2>
            <div id="search-app" class="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6">
              <!-- Search app will be mounted here -->
            </div>
          </div>

          <!-- Performance Stats -->
          <div class="mb-8">
            <h2 class="section-title">Performance Metrics</h2>
            <div id="performance-stats" class="stats-grid">
              <!-- Performance stats will be inserted here -->
            </div>
          </div>

          <!-- Configuration Panel -->
          <div id="config-panel" class="hidden">
            <h2 class="section-title">Configuration</h2>
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6">
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 class="text-lg font-semibold mb-4">Search Options</h3>
                  <div class="space-y-4">
                    <label class="flex items-center">
                      <input type="checkbox" id="fuzzy-search" class="form-checkbox" checked>
                      <span class="ml-2">Enable fuzzy search</span>
                    </label>
                    <label class="flex items-center">
                      <input type="checkbox" id="case-sensitive" class="form-checkbox">
                      <span class="ml-2">Case sensitive</span>
                    </label>
                    <label class="flex items-center">
                      <input type="checkbox" id="highlight-matches" class="form-checkbox" checked>
                      <span class="ml-2">Highlight matches</span>
                    </label>
                  </div>
                </div>
                <div>
                  <h3 class="text-lg font-semibold mb-4">Performance</h3>
                  <div class="space-y-4">
                    <label class="flex items-center">
                      <input type="checkbox" id="enable-cache" class="form-checkbox" checked>
                      <span class="ml-2">Enable caching</span>
                    </label>
                    <label class="flex items-center">
                      <input type="checkbox" id="virtual-scrolling" class="form-checkbox">
                      <span class="ml-2">Virtual scrolling</span>
                    </label>
                    <div>
                      <label class="block text-sm font-medium mb-2">Max Results</label>
                      <input type="number" id="max-results" class="form-input" value="50" min="1" max="1000">
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <!-- Notifications -->
        <div id="notifications" class="fixed top-4 right-4 z-50 space-y-2">
          <!-- Notification toasts will appear here -->
        </div>

        <!-- Loading Overlay -->
        <div id="loading-overlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
            <div class="flex items-center space-x-3">
              <div class="loading-spinner"></div>
              <span class="text-lg font-medium">Initializing...</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Initialize UI components and event handlers
   */
  private initializeUI(): void {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle?.addEventListener('click', () => {
      this.themeManager.toggleTheme();
    });

    // Settings toggle
    const settingsToggle = document.getElementById('settings-toggle');
    const configPanel = document.getElementById('config-panel');
    settingsToggle?.addEventListener('click', () => {
      configPanel?.classList.toggle('hidden');
    });

    // Configuration options
    this.setupConfigurationListeners();
    
    // Update data sources display
    this.updateDataSourcesDisplay();
    
    // Update performance stats
    this.updatePerformanceStats();
  }

  /**
   * Set up configuration option listeners
   */
  private setupConfigurationListeners(): void {
    const fuzzySearch = document.getElementById('fuzzy-search') as HTMLInputElement;
    const caseSensitive = document.getElementById('case-sensitive') as HTMLInputElement;
    const highlightMatches = document.getElementById('highlight-matches') as HTMLInputElement;
    const enableCache = document.getElementById('enable-cache') as HTMLInputElement;
    const virtualScrolling = document.getElementById('virtual-scrolling') as HTMLInputElement;
    const maxResults = document.getElementById('max-results') as HTMLInputElement;

    [fuzzySearch, caseSensitive, highlightMatches, enableCache, virtualScrolling].forEach(element => {
      element?.addEventListener('change', () => {
        this.updateSearchConfiguration();
      });
    });

    maxResults?.addEventListener('change', () => {
      this.updateSearchConfiguration();
    });
  }

  /**
   * Update search configuration based on UI settings
   */
  private updateSearchConfiguration(): void {
    const config = this.getConfigurationFromUI();
    this.searchApp.updateConfiguration(config);
    logger.info('Search configuration updated:', config);
  }

  /**
   * Get current configuration from UI
   */
  private getConfigurationFromUI() {
    return {
      fuzzySearch: (document.getElementById('fuzzy-search') as HTMLInputElement)?.checked ?? true,
      caseSensitive: (document.getElementById('case-sensitive') as HTMLInputElement)?.checked ?? false,
      highlightMatches: (document.getElementById('highlight-matches') as HTMLInputElement)?.checked ?? true,
      enableCache: (document.getElementById('enable-cache') as HTMLInputElement)?.checked ?? true,
      virtualScrolling: (document.getElementById('virtual-scrolling') as HTMLInputElement)?.checked ?? false,
      maxResults: parseInt((document.getElementById('max-results') as HTMLInputElement)?.value) || 50
    };
  }

  /**
   * Update data sources display
   */
  private updateDataSourcesDisplay(): void {
    const grid = document.getElementById('data-sources-grid');
    if (!grid) return;

    const dataSources = this.dataSourceManager.getDataSources();
    grid.innerHTML = dataSources.map(source => `
      <div class="data-source-card">
        <div class="data-source-header">
          <h3 class="data-source-title">
            ${this.getDataSourceIcon(source.type)}
            ${source.name}
          </h3>
          <span class="data-source-status ${source.status}">
            ${source.status}
          </span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          ${this.getDataSourceDescription(source.type)}
        </p>
        <div class="flex items-center justify-between text-sm text-gray-500">
          <span>${source.itemCount || 0} items</span>
          <span>${source.lastSync ? new Date(source.lastSync).toLocaleDateString() : 'Never'}</span>
        </div>
      </div>
    `).join('');
  }

  /**
   * Get icon for data source type
   */
  private getDataSourceIcon(type: string): string {
    const icons = {
      api: '🌐',
      sql: '🗃️',
      dom: '📄',
      memory: '💾'
    };
    return icons[type as keyof typeof icons] || '📊';
  }

  /**
   * Get description for data source type
   */
  private getDataSourceDescription(type: string): string {
    const descriptions = {
      api: 'External API with caching and retry logic',
      sql: 'Database connection with connection pooling',
      dom: 'Live DOM content with mutation observation',
      memory: 'In-memory data with fuzzy search'
    };
    return descriptions[type as keyof typeof descriptions] || 'Unknown data source';
  }

  /**
   * Update data source status
   */
  private updateDataSourceStatus(id: string, status: string): void {
    this.updateDataSourcesDisplay();
    this.showNotification(`Data source ${id} is ${status}`, status === 'connected' ? 'success' : 'info');
  }

  /**
   * Update performance statistics
   */
  private updatePerformanceStats(): void {
    const container = document.getElementById('performance-stats');
    if (!container) return;

    const stats = {
      dataSources: this.dataSourceManager.getDataSources().length,
      connectedSources: this.dataSourceManager.getDataSources().filter(s => s.status === 'connected').length,
      totalItems: this.dataSourceManager.getDataSources().reduce((sum, s) => sum + (s.itemCount || 0), 0),
      cacheSize: this.dataSourceManager.getCacheStats().size
    };

    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${stats.dataSources}</div>
        <div class="stat-label">Data Sources</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.connectedSources}</div>
        <div class="stat-label">Connected</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalItems.toLocaleString()}</div>
        <div class="stat-label">Total Items</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.cacheSize}</div>
        <div class="stat-label">Cache Entries</div>
      </div>
    `;
  }

  /**
   * Update search statistics
   */
  private updateSearchStats(result: any): void {
    // Update performance display with search results
    const performanceContainer = document.getElementById('performance-stats');
    if (performanceContainer) {
      const lastChild = performanceContainer.lastElementChild;
      if (lastChild) {
        lastChild.innerHTML = `
          <div class="stat-value">${result.executionTime.toFixed(0)}ms</div>
          <div class="stat-label">Last Search</div>
        `;
      }
    }
  }

  /**
   * Focus search input
   */
  private focusSearch(): void {
    this.searchApp.focusSearch();
  }

  /**
   * Clear search
   */
  private clearSearch(): void {
    this.searchApp.clearSearch();
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.showNotification(message, 'error');
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const container = document.getElementById('notifications');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `px-4 py-3 rounded-lg shadow-lg max-w-sm notification-${type} animate-slide-up`;
    
    const colors = {
      info: 'bg-blue-100 text-blue-800 border border-blue-200',
      success: 'bg-green-100 text-green-800 border border-green-200',
      error: 'bg-red-100 text-red-800 border border-red-200'
    };
    
    notification.className += ` ${colors[type]}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    logger.info('Cleaning up application');
    this.dataSourceManager.destroy();
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const app = new UniversalSearchApp();
  
  try {
    await app.init();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    
    // Show fallback error message
    const container = document.getElementById('app');
    if (container) {
      container.innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gray-50">
          <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div class="flex items-center mb-4">
              <svg class="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h2 class="text-lg font-semibold text-gray-900">Initialization Failed</h2>
            </div>
            <p class="text-gray-600 mb-4">
              The application failed to initialize properly. Please check the console for more details and refresh the page to try again.
            </p>
            <button onclick="location.reload()" class="btn btn-primary w-full">
              Reload Page
            </button>
          </div>
        </div>
      `;
    }
  }
});

// Export for module usage
export { UniversalSearchApp };