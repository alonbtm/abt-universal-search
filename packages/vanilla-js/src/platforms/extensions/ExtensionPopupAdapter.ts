/**
 * ExtensionPopupAdapter - Browser extension popup integration
 * Provides search functionality within extension popup windows
 */

export interface ExtensionPopupConfig {
  enableTabSearch?: boolean;
  enableBookmarkSearch?: boolean;
  enableHistorySearch?: boolean;
  enableCrossTabCommunication?: boolean;
  maxResults?: number;
  searchDelay?: number;
}

export interface TabSearchResult {
  id: number;
  url: string;
  title: string;
  favIconUrl?: string;
  active: boolean;
  windowId: number;
}

export interface BookmarkSearchResult {
  id: string;
  title: string;
  url: string;
  parentId: string;
  dateAdded: number;
}

export interface HistorySearchResult {
  id: string;
  url: string;
  title: string;
  lastVisitTime: number;
  visitCount: number;
  typedCount: number;
}

export class ExtensionPopupAdapter {
  private config: Required<ExtensionPopupConfig>;
  private isExtensionPopup: boolean;
  private extensionAPI: any = null;

  constructor(config: ExtensionPopupConfig = {}) {
    this.config = {
      enableTabSearch: config.enableTabSearch ?? true,
      enableBookmarkSearch: config.enableBookmarkSearch ?? true,
      enableHistorySearch: config.enableHistorySearch ?? true,
      enableCrossTabCommunication: config.enableCrossTabCommunication ?? true,
      maxResults: config.maxResults || 50,
      searchDelay: config.searchDelay || 200,
      ...config
    };

    this.isExtensionPopup = this.detectExtensionPopup();

    if (this.isExtensionPopup) {
      this.init();
    }
  }

  /**
   * Initialize extension popup adapter
   */
  private init(): void {
    this.setupExtensionAPI();
    console.log('[ExtensionPopupAdapter] Initialized successfully');
  }

  /**
   * Check if running in extension popup context
   */
  isPopupContext(): boolean {
    return this.isExtensionPopup;
  }

  /**
   * Search across all open tabs
   */
  async searchTabs(query: string): Promise<TabSearchResult[]> {
    if (!this.config.enableTabSearch || !this.extensionAPI?.tabs) {
      return [];
    }

    try {
      const tabs = await this.queryTabs({});
      const searchTerm = query.toLowerCase();

      return tabs
        .filter((tab: any) =>
          tab.title?.toLowerCase().includes(searchTerm) ||
          tab.url?.toLowerCase().includes(searchTerm)
        )
        .map((tab: any) => ({
          id: tab.id,
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl,
          active: tab.active,
          windowId: tab.windowId
        }))
        .slice(0, this.config.maxResults);
    } catch (error) {
      console.error('[ExtensionPopupAdapter] Tab search failed:', error);
      return [];
    }
  }

  /**
   * Search bookmarks
   */
  async searchBookmarks(query: string): Promise<BookmarkSearchResult[]> {
    if (!this.config.enableBookmarkSearch || !this.extensionAPI?.bookmarks) {
      return [];
    }

    try {
      const bookmarks = await this.searchBookmarkTree(query);
      return bookmarks.slice(0, this.config.maxResults);
    } catch (error) {
      console.error('[ExtensionPopupAdapter] Bookmark search failed:', error);
      return [];
    }
  }

  /**
   * Search browser history
   */
  async searchHistory(query: string): Promise<HistorySearchResult[]> {
    if (!this.config.enableHistorySearch || !this.extensionAPI?.history) {
      return [];
    }

    try {
      const historyItems = await this.queryHistory({
        text: query,
        maxResults: this.config.maxResults
      });

      return historyItems.map((item: any) => ({
        id: item.id,
        url: item.url,
        title: item.title || '',
        lastVisitTime: item.lastVisitTime || 0,
        visitCount: item.visitCount || 0,
        typedCount: item.typedCount || 0
      }));
    } catch (error) {
      console.error('[ExtensionPopupAdapter] History search failed:', error);
      return [];
    }
  }

  /**
   * Search all available sources
   */
  async searchAll(query: string): Promise<{
    tabs: TabSearchResult[];
    bookmarks: BookmarkSearchResult[];
    history: HistorySearchResult[];
  }> {
    const results = await Promise.allSettled([
      this.searchTabs(query),
      this.searchBookmarks(query),
      this.searchHistory(query)
    ]);

    return {
      tabs: results[0].status === 'fulfilled' ? results[0].value : [],
      bookmarks: results[1].status === 'fulfilled' ? results[1].value : [],
      history: results[2].status === 'fulfilled' ? results[2].value : []
    };
  }

  /**
   * Navigate to tab
   */
  async navigateToTab(tabId: number): Promise<boolean> {
    if (!this.extensionAPI?.tabs) {
      return false;
    }

    try {
      await this.updateTab(tabId, { active: true });

      // Get tab info and switch to its window
      const tab = await this.getTab(tabId);
      if (tab && tab.windowId) {
        await this.focusWindow(tab.windowId);
      }

      // Close popup
      window.close();
      return true;
    } catch (error) {
      console.error('[ExtensionPopupAdapter] Navigate to tab failed:', error);
      return false;
    }
  }

  /**
   * Open URL in new tab
   */
  async openInNewTab(url: string): Promise<boolean> {
    if (!this.extensionAPI?.tabs) {
      return false;
    }

    try {
      await this.createTab({ url, active: true });
      window.close();
      return true;
    } catch (error) {
      console.error('[ExtensionPopupAdapter] Open in new tab failed:', error);
      return false;
    }
  }

  /**
   * Send message to content script in active tab
   */
  async sendMessageToActiveTab(message: any): Promise<any> {
    if (!this.config.enableCrossTabCommunication || !this.extensionAPI?.tabs) {
      return null;
    }

    try {
      const [activeTab] = await this.queryTabs({ active: true, currentWindow: true });
      if (!activeTab) {
        return null;
      }

      return await this.sendMessageToTab(activeTab.id, message);
    } catch (error) {
      console.error('[ExtensionPopupAdapter] Send message to active tab failed:', error);
      return null;
    }
  }

  /**
   * Get current tab information
   */
  async getCurrentTab(): Promise<any> {
    if (!this.extensionAPI?.tabs) {
      return null;
    }

    try {
      const [activeTab] = await this.queryTabs({ active: true, currentWindow: true });
      return activeTab;
    } catch (error) {
      console.error('[ExtensionPopupAdapter] Get current tab failed:', error);
      return null;
    }
  }

  /**
   * Search within current tab's content
   */
  async searchCurrentTabContent(query: string): Promise<any> {
    const response = await this.sendMessageToActiveTab({
      type: 'search-dom',
      query,
      options: {
        includeText: true,
        includeAttributes: true,
        visibleOnly: true
      }
    });

    return response?.data || [];
  }

  /**
   * Extract data from current tab
   */
  async extractCurrentTabData(): Promise<any> {
    const response = await this.sendMessageToActiveTab({
      type: 'extract-page-data'
    });

    return response?.data || null;
  }

  /**
   * Highlight search results in current tab
   */
  async highlightInCurrentTab(results: any[]): Promise<boolean> {
    const response = await this.sendMessageToActiveTab({
      type: 'highlight-results',
      results
    });

    return response?.success || false;
  }

  /**
   * Clear highlights in current tab
   */
  async clearHighlightsInCurrentTab(): Promise<boolean> {
    const response = await this.sendMessageToActiveTab({
      type: 'clear-highlights'
    });

    return response?.success || false;
  }

  /**
   * Get extension permissions
   */
  getPermissions(): {
    tabs: boolean;
    bookmarks: boolean;
    history: boolean;
    activeTab: boolean;
  } {
    return {
      tabs: !!this.extensionAPI?.tabs,
      bookmarks: !!this.extensionAPI?.bookmarks,
      history: !!this.extensionAPI?.history,
      activeTab: true // Always available in popup
    };
  }

  /**
   * Request additional permissions
   */
  async requestPermissions(permissions: string[]): Promise<boolean> {
    if (!this.extensionAPI?.permissions) {
      return false;
    }

    try {
      return await this.requestPermissionsFromAPI({ permissions });
    } catch (error) {
      console.error('[ExtensionPopupAdapter] Request permissions failed:', error);
      return false;
    }
  }

  /**
   * Setup extension API references
   */
  private setupExtensionAPI(): void {
    // Try Chrome extension API
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      this.extensionAPI = {
        tabs: chrome.tabs,
        bookmarks: chrome.bookmarks,
        history: chrome.history,
        windows: chrome.windows,
        permissions: chrome.permissions,
        runtime: chrome.runtime
      };
      return;
    }

    // Try Firefox WebExtensions API
    if (typeof browser !== 'undefined' && browser.runtime) {
      this.extensionAPI = {
        tabs: browser.tabs,
        bookmarks: browser.bookmarks,
        history: browser.history,
        windows: browser.windows,
        permissions: browser.permissions,
        runtime: browser.runtime
      };
      return;
    }

    console.warn('[ExtensionPopupAdapter] Extension API not available');
  }

  /**
   * Query tabs wrapper
   */
  private queryTabs(queryInfo: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (this.extensionAPI.tabs.query) {
        this.extensionAPI.tabs.query(queryInfo, (tabs: any[]) => {
          if (chrome?.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tabs);
          }
        });
      } else {
        resolve([]);
      }
    });
  }

  /**
   * Update tab wrapper
   */
  private updateTab(tabId: number, updateProperties: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.extensionAPI.tabs.update) {
        this.extensionAPI.tabs.update(tabId, updateProperties, (tab: any) => {
          if (chrome?.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tab);
          }
        });
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Get tab wrapper
   */
  private getTab(tabId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.extensionAPI.tabs.get) {
        this.extensionAPI.tabs.get(tabId, (tab: any) => {
          if (chrome?.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tab);
          }
        });
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Create tab wrapper
   */
  private createTab(createProperties: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.extensionAPI.tabs.create) {
        this.extensionAPI.tabs.create(createProperties, (tab: any) => {
          if (chrome?.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tab);
          }
        });
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Focus window wrapper
   */
  private focusWindow(windowId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.extensionAPI.windows && this.extensionAPI.windows.update) {
        this.extensionAPI.windows.update(windowId, { focused: true }, (window: any) => {
          if (chrome?.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(window);
          }
        });
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Send message to tab wrapper
   */
  private sendMessageToTab(tabId: number, message: any): Promise<any> {
    return new Promise((resolve) => {
      if (this.extensionAPI.tabs.sendMessage) {
        this.extensionAPI.tabs.sendMessage(tabId, message, (response: any) => {
          if (chrome?.runtime?.lastError) {
            console.warn('Tab message failed:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(response);
          }
        });
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Search bookmarks tree
   */
  private async searchBookmarkTree(query: string): Promise<BookmarkSearchResult[]> {
    return new Promise((resolve, reject) => {
      if (this.extensionAPI.bookmarks && this.extensionAPI.bookmarks.search) {
        this.extensionAPI.bookmarks.search(query, (results: any[]) => {
          if (chrome?.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            const bookmarks = results
              .filter(item => item.url) // Only include actual bookmarks (not folders)
              .map(item => ({
                id: item.id,
                title: item.title,
                url: item.url,
                parentId: item.parentId,
                dateAdded: item.dateAdded
              }));
            resolve(bookmarks);
          }
        });
      } else {
        resolve([]);
      }
    });
  }

  /**
   * Query history wrapper
   */
  private queryHistory(query: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (this.extensionAPI.history && this.extensionAPI.history.search) {
        this.extensionAPI.history.search(query, (results: any[]) => {
          if (chrome?.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(results);
          }
        });
      } else {
        resolve([]);
      }
    });
  }

  /**
   * Request permissions wrapper
   */
  private requestPermissionsFromAPI(permissions: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.extensionAPI.permissions && this.extensionAPI.permissions.request) {
        this.extensionAPI.permissions.request(permissions, (granted: boolean) => {
          if (chrome?.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(granted);
          }
        });
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Detect extension popup context
   */
  private detectExtensionPopup(): boolean {
    try {
      // Check if we're in an extension context
      const hasExtensionAPI = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) ||
                             (typeof browser !== 'undefined' && browser.runtime && browser.runtime.id);

      // Check if we're in a popup window (small dimensions, no toolbar)
      const isPopupWindow = window.outerWidth <= 800 &&
                           window.outerHeight <= 600 &&
                           window.location.protocol.startsWith('moz-extension') ||
                           window.location.protocol.startsWith('chrome-extension');

      return hasExtensionAPI && isPopupWindow;
    } catch {
      return false;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clean up any remaining resources
    this.extensionAPI = null;
  }
}