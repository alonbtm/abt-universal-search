/**
 * ContentScriptAdapter - Browser extension content script integration
 * Provides search functionality within web page contexts
 */

export interface ContentScriptConfig {
  enableDomSearch?: boolean;
  enablePageIntegration?: boolean;
  enableCrossOriginSearch?: boolean;
  isolationMode?: 'isolated' | 'main';
  maxDomElements?: number;
  searchDeepth?: number;
}

export interface ContentScriptMessage {
  type: 'search' | 'dom-query' | 'page-data' | 'inject-ui';
  data: any;
  timestamp: number;
  origin: string;
}

export interface DomSearchResult {
  type: 'text' | 'attribute' | 'metadata';
  element: string;
  content: string;
  selector: string;
  position: { x: number; y: number };
  visible: boolean;
}

export class ContentScriptAdapter {
  private config: Required<ContentScriptConfig>;
  private isContentScript: boolean;
  private injectedUI: HTMLElement | null = null;
  private observedElements: WeakSet<Element>;
  private mutationObserver: MutationObserver | null = null;

  constructor(config: ContentScriptConfig = {}) {
    this.config = {
      enableDomSearch: config.enableDomSearch ?? true,
      enablePageIntegration: config.enablePageIntegration ?? true,
      enableCrossOriginSearch: config.enableCrossOriginSearch ?? false,
      isolationMode: config.isolationMode || 'isolated',
      maxDomElements: config.maxDomElements || 1000,
      searchDeepth: config.searchDeepth || 10,
      ...config
    };

    this.observedElements = new WeakSet();
    this.isContentScript = this.detectContentScriptContext();

    if (this.isContentScript) {
      this.init();
    }
  }

  /**
   * Initialize content script adapter
   */
  private init(): void {
    console.log('[ContentScriptAdapter] Initializing in content script context');

    this.setupMessageHandlers();
    this.setupDomObserver();

    if (this.config.enablePageIntegration) {
      this.injectSearchInterface();
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.onDomReady();
      });
    } else {
      this.onDomReady();
    }
  }

  /**
   * Check if running in extension content script context
   */
  isExtensionContext(): boolean {
    return this.isContentScript;
  }

  /**
   * Search DOM elements in the current page
   */
  async searchDom(query: string, options: {
    includeText?: boolean;
    includeAttributes?: boolean;
    includeMetadata?: boolean;
    visibleOnly?: boolean;
  } = {}): Promise<DomSearchResult[]> {
    if (!this.isContentScript) {
      return [];
    }

    const {
      includeText = true,
      includeAttributes = true,
      includeMetadata = false,
      visibleOnly = false
    } = options;

    const results: DomSearchResult[] = [];
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
      return results;
    }

    try {
      // Search text content
      if (includeText) {
        results.push(...this.searchTextContent(searchTerm, visibleOnly));
      }

      // Search attributes
      if (includeAttributes) {
        results.push(...this.searchAttributes(searchTerm, visibleOnly));
      }

      // Search metadata (title, meta tags, etc.)
      if (includeMetadata) {
        results.push(...this.searchMetadata(searchTerm));
      }

      return results.slice(0, this.config.maxDomElements);
    } catch (error) {
      console.error('[ContentScriptAdapter] DOM search failed:', error);
      return [];
    }
  }

  /**
   * Extract page data for search indexing
   */
  extractPageData(): {
    title: string;
    description: string;
    keywords: string[];
    headings: string[];
    links: Array<{url: string; text: string}>;
    images: Array<{src: string; alt: string}>;
  } {
    const data = {
      title: document.title || '',
      description: '',
      keywords: [] as string[],
      headings: [] as string[],
      links: [] as Array<{url: string; text: string}>,
      images: [] as Array<{src: string; alt: string}>
    };

    try {
      // Extract meta description
      const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      data.description = metaDesc?.content || '';

      // Extract meta keywords
      const metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
      if (metaKeywords?.content) {
        data.keywords = metaKeywords.content.split(',').map(k => k.trim());
      }

      // Extract headings
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        const text = heading.textContent?.trim();
        if (text) {
          data.headings.push(text);
        }
      });

      // Extract links
      const links = document.querySelectorAll('a[href]');
      links.forEach(link => {
        const href = (link as HTMLAnchorElement).href;
        const text = link.textContent?.trim() || '';
        if (href && text) {
          data.links.push({ url: href, text });
        }
      });

      // Extract images
      const images = document.querySelectorAll('img[src]');
      images.forEach(img => {
        const src = (img as HTMLImageElement).src;
        const alt = (img as HTMLImageElement).alt || '';
        if (src) {
          data.images.push({ src, alt });
        }
      });

    } catch (error) {
      console.error('[ContentScriptAdapter] Page data extraction failed:', error);
    }

    return data;
  }

  /**
   * Inject search UI into the page
   */
  injectSearchInterface(): void {
    if (this.injectedUI) {
      return;
    }

    const searchContainer = document.createElement('div');
    searchContainer.id = 'universal-search-extension-ui';
    searchContainer.innerHTML = `
      <div class="search-floating-ui">
        <button class="search-toggle" title="Toggle Search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <div class="search-panel" style="display: none;">
          <input type="text" class="search-input" placeholder="Search this page..." />
          <div class="search-results"></div>
        </div>
      </div>
    `;

    // Add styles
    this.injectStyles();

    // Add event handlers
    this.setupUIEventHandlers(searchContainer);

    // Inject into page
    document.body.appendChild(searchContainer);
    this.injectedUI = searchContainer;
  }

  /**
   * Highlight search results in the page
   */
  highlightResults(results: DomSearchResult[]): void {
    // Remove existing highlights
    this.clearHighlights();

    results.forEach((result, index) => {
      try {
        const element = document.querySelector(result.selector);
        if (element && this.isElementVisible(element)) {
          this.highlightElement(element, index);
        }
      } catch (error) {
        console.warn('[ContentScriptAdapter] Failed to highlight result:', error);
      }
    });
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    const highlights = document.querySelectorAll('.universal-search-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });
  }

  /**
   * Send message to extension background or popup
   */
  async sendMessage(type: string, data: any): Promise<any> {
    if (!this.isContentScript) {
      return null;
    }

    try {
      const message: ContentScriptMessage = {
        type: type as any,
        data,
        timestamp: Date.now(),
        origin: window.location.origin
      };

      // Try chrome.runtime first (Chromium-based browsers)
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('[ContentScriptAdapter] Message failed:', chrome.runtime.lastError);
              resolve(null);
            } else {
              resolve(response);
            }
          });
        });
      }

      // Try browser.runtime (Firefox)
      if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendMessage) {
        return await browser.runtime.sendMessage(message);
      }

      console.warn('[ContentScriptAdapter] Extension runtime API not available');
      return null;
    } catch (error) {
      console.error('[ContentScriptAdapter] Send message failed:', error);
      return null;
    }
  }

  /**
   * Search text content in DOM
   */
  private searchTextContent(searchTerm: string, visibleOnly: boolean): DomSearchResult[] {
    const results: DomSearchResult[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!node.nodeValue || node.nodeValue.trim().length === 0) {
            return NodeFilter.FILTER_REJECT;
          }

          const element = node.parentElement;
          if (!element || element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
            return NodeFilter.FILTER_REJECT;
          }

          if (visibleOnly && !this.isElementVisible(element)) {
            return NodeFilter.FILTER_REJECT;
          }

          return node.nodeValue.toLowerCase().includes(searchTerm)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode()) && results.length < this.config.maxDomElements) {
      const element = node.parentElement!;
      const rect = element.getBoundingClientRect();

      results.push({
        type: 'text',
        element: element.tagName.toLowerCase(),
        content: node.nodeValue!.trim(),
        selector: this.generateSelector(element),
        position: { x: rect.left, y: rect.top },
        visible: this.isElementVisible(element)
      });
    }

    return results;
  }

  /**
   * Search attributes in DOM
   */
  private searchAttributes(searchTerm: string, visibleOnly: boolean): DomSearchResult[] {
    const results: DomSearchResult[] = [];
    const elements = document.querySelectorAll('*');

    for (const element of elements) {
      if (results.length >= this.config.maxDomElements) {
        break;
      }

      if (visibleOnly && !this.isElementVisible(element)) {
        continue;
      }

      for (const attr of element.attributes) {
        if (attr.value.toLowerCase().includes(searchTerm)) {
          const rect = element.getBoundingClientRect();

          results.push({
            type: 'attribute',
            element: element.tagName.toLowerCase(),
            content: `${attr.name}="${attr.value}"`,
            selector: this.generateSelector(element),
            position: { x: rect.left, y: rect.top },
            visible: this.isElementVisible(element)
          });
        }
      }
    }

    return results;
  }

  /**
   * Search metadata (title, meta tags)
   */
  private searchMetadata(searchTerm: string): DomSearchResult[] {
    const results: DomSearchResult[] = [];

    // Search title
    if (document.title.toLowerCase().includes(searchTerm)) {
      results.push({
        type: 'metadata',
        element: 'title',
        content: document.title,
        selector: 'title',
        position: { x: 0, y: 0 },
        visible: false
      });
    }

    // Search meta tags
    const metaTags = document.querySelectorAll('meta[name], meta[property]');
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
      const content = meta.getAttribute('content') || '';

      if (name.toLowerCase().includes(searchTerm) || content.toLowerCase().includes(searchTerm)) {
        results.push({
          type: 'metadata',
          element: 'meta',
          content: `${name}: ${content}`,
          selector: this.generateSelector(meta),
          position: { x: 0, y: 0 },
          visible: false
        });
      }
    });

    return results;
  }

  /**
   * Generate CSS selector for element
   */
  private generateSelector(element: Element): string {
    const parts: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body && parts.length < this.config.searchDeepth) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
        parts.unshift(selector);
        break;
      }

      if (current.className) {
        const classes = current.className.trim().split(/\s+/).join('.');
        if (classes) {
          selector += `.${classes}`;
        }
      }

      const siblings = current.parentElement?.children;
      if (siblings && siblings.length > 1) {
        const index = Array.from(siblings).indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }

      parts.unshift(selector);
      current = current.parentElement;
    }

    return parts.join(' > ');
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return rect.width > 0 &&
           rect.height > 0 &&
           style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0';
  }

  /**
   * Highlight element
   */
  private highlightElement(element: Element, index: number): void {
    const highlight = document.createElement('span');
    highlight.className = 'universal-search-highlight';
    highlight.setAttribute('data-index', index.toString());
    highlight.style.cssText = `
      background-color: #ffeb3b !important;
      color: #000 !important;
      padding: 2px 4px !important;
      border-radius: 2px !important;
      box-shadow: 0 0 0 2px rgba(255, 235, 59, 0.3) !important;
    `;

    // Wrap text content
    const range = document.createRange();
    range.selectNodeContents(element);
    range.surroundContents(highlight);
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    const runtime = (typeof chrome !== 'undefined' && chrome.runtime) ||
                   (typeof browser !== 'undefined' && browser.runtime);

    if (runtime && runtime.onMessage) {
      runtime.onMessage.addListener((message: any, sender: any, sendResponse: Function) => {
        this.handleExtensionMessage(message, sender, sendResponse);
        return true; // Keep message channel open for async response
      });
    }
  }

  /**
   * Handle messages from extension
   */
  private async handleExtensionMessage(message: any, sender: any, sendResponse: Function): void {
    try {
      switch (message.type) {
        case 'search-dom':
          const results = await this.searchDom(message.query, message.options);
          sendResponse({ success: true, data: results });
          break;

        case 'extract-page-data':
          const pageData = this.extractPageData();
          sendResponse({ success: true, data: pageData });
          break;

        case 'highlight-results':
          this.highlightResults(message.results);
          sendResponse({ success: true });
          break;

        case 'clear-highlights':
          this.clearHighlights();
          sendResponse({ success: true });
          break;

        case 'inject-ui':
          if (this.config.enablePageIntegration) {
            this.injectSearchInterface();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Page integration disabled' });
          }
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Setup DOM observer for dynamic content
   */
  private setupDomObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.observedElements.add(node as Element);
            }
          });
        }
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Setup UI event handlers
   */
  private setupUIEventHandlers(container: HTMLElement): void {
    const toggleButton = container.querySelector('.search-toggle') as HTMLButtonElement;
    const panel = container.querySelector('.search-panel') as HTMLElement;
    const input = container.querySelector('.search-input') as HTMLInputElement;
    const results = container.querySelector('.search-results') as HTMLElement;

    toggleButton.addEventListener('click', () => {
      const isVisible = panel.style.display !== 'none';
      panel.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        input.focus();
      }
    });

    let debounceTimer: number;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(async () => {
        const query = input.value.trim();
        if (query) {
          const searchResults = await this.searchDom(query);
          this.displayResults(results, searchResults);
          this.highlightResults(searchResults);
        } else {
          this.clearHighlights();
          results.innerHTML = '';
        }
      }, 300);
    });
  }

  /**
   * Display search results in UI
   */
  private displayResults(container: HTMLElement, results: DomSearchResult[]): void {
    if (results.length === 0) {
      container.innerHTML = '<div class="no-results">No results found</div>';
      return;
    }

    const html = results.map((result, index) => `
      <div class="result-item" data-index="${index}">
        <div class="result-type">${result.type}</div>
        <div class="result-element">${result.element}</div>
        <div class="result-content">${this.escapeHtml(result.content.substring(0, 100))}${result.content.length > 100 ? '...' : ''}</div>
      </div>
    `).join('');

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.getAttribute('data-index') || '0');
        const result = results[index];
        if (result) {
          this.scrollToResult(result);
        }
      });
    });
  }

  /**
   * Scroll to search result
   */
  private scrollToResult(result: DomSearchResult): void {
    try {
      const element = document.querySelector(result.selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (error) {
      console.warn('[ContentScriptAdapter] Failed to scroll to result:', error);
    }
  }

  /**
   * Escape HTML for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Inject CSS styles
   */
  private injectStyles(): void {
    if (document.getElementById('universal-search-extension-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'universal-search-extension-styles';
    styles.textContent = `
      #universal-search-extension-ui {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .search-floating-ui .search-toggle {
        width: 50px;
        height: 50px;
        border-radius: 25px;
        border: none;
        background: #2563eb;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        transition: transform 0.2s ease;
      }

      .search-floating-ui .search-toggle:hover {
        transform: scale(1.1);
      }

      .search-panel {
        position: absolute;
        top: 60px;
        right: 0;
        width: 350px;
        max-height: 400px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        overflow: hidden;
      }

      .search-input {
        width: 100%;
        padding: 12px;
        border: none;
        border-bottom: 1px solid #e5e7eb;
        font-size: 14px;
        outline: none;
      }

      .search-results {
        max-height: 300px;
        overflow-y: auto;
      }

      .result-item {
        padding: 8px 12px;
        border-bottom: 1px solid #f3f4f6;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }

      .result-item:hover {
        background-color: #f9fafb;
      }

      .result-type {
        font-size: 10px;
        color: #6b7280;
        text-transform: uppercase;
        font-weight: 600;
      }

      .result-element {
        font-size: 12px;
        color: #374151;
        font-weight: 500;
      }

      .result-content {
        font-size: 12px;
        color: #6b7280;
        margin-top: 2px;
      }

      .no-results {
        padding: 20px;
        text-align: center;
        color: #6b7280;
        font-size: 14px;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * DOM ready handler
   */
  private onDomReady(): void {
    // Send page data to extension
    this.sendMessage('page-loaded', {
      url: window.location.href,
      title: document.title,
      data: this.extractPageData()
    });
  }

  /**
   * Detect content script context
   */
  private detectContentScriptContext(): boolean {
    return (typeof chrome !== 'undefined' && !!chrome.runtime?.id) ||
           (typeof browser !== 'undefined' && !!browser.runtime?.id);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.injectedUI) {
      this.injectedUI.remove();
      this.injectedUI = null;
    }

    this.clearHighlights();

    const styles = document.getElementById('universal-search-extension-styles');
    if (styles) {
      styles.remove();
    }
  }
}