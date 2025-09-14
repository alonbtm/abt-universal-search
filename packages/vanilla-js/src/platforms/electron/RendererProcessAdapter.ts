/**
 * RendererProcessAdapter - Electron renderer process integration for Universal Search
 * Provides secure communication with main process and UI integration
 */

export interface RendererProcessConfig {
  enableContextIsolation?: boolean;
  enableNodeIntegration?: boolean;
  enableFileSearch?: boolean;
  enableDomSearch?: boolean;
  ipcTimeoutMs?: number;
}

export interface ElectronSearchOptions {
  searchType: 'files' | 'dom' | 'mixed';
  includeContent?: boolean;
  fileTypes?: string[];
  maxResults?: number;
}

export interface ElectronBridge {
  ipcRenderer?: any;
  contextBridge?: any;
  electronAPI?: any;
}

export class RendererProcessAdapter {
  private config: Required<RendererProcessConfig>;
  private bridge: ElectronBridge;
  private isElectronRenderer: boolean;
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: number }>;

  constructor(config: RendererProcessConfig = {}) {
    this.config = {
      enableContextIsolation: config.enableContextIsolation ?? true,
      enableNodeIntegration: config.enableNodeIntegration ?? false,
      enableFileSearch: config.enableFileSearch ?? true,
      enableDomSearch: config.enableDomSearch ?? true,
      ipcTimeoutMs: config.ipcTimeoutMs || 30000, // 30 seconds
      ...config
    };

    this.bridge = {};
    this.pendingRequests = new Map();
    this.isElectronRenderer = this.detectElectronRenderer();
    this.init();
  }

  /**
   * Initialize renderer process adapter
   */
  private init(): void {
    if (!this.isElectronRenderer) {
      console.warn('[RendererProcessAdapter] Not running in Electron renderer process');
      return;
    }

    this.setupElectronBridge();
    this.setupIpcListeners();

    console.log('[RendererProcessAdapter] Initialized successfully');
  }

  /**
   * Check if running in Electron renderer process
   */
  isElectronContext(): boolean {
    return this.isElectronRenderer;
  }

  /**
   * Search files through main process
   */
  async searchFiles(query: string, options: {
    searchContent?: boolean;
    limit?: number;
    sortBy?: 'name' | 'modified' | 'size';
  } = {}): Promise<any[]> {
    if (!this.config.enableFileSearch || !this.isElectronRenderer) {
      return [];
    }

    try {
      const results = await this.invokeMainProcess('universal-search:file-search', query, options);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('[RendererProcessAdapter] File search failed:', error);
      return [];
    }
  }

  /**
   * Get file content through main process
   */
  async getFileContent(filePath: string): Promise<string | null> {
    if (!this.isElectronRenderer) {
      return null;
    }

    try {
      const content = await this.invokeMainProcess('universal-search:file-content', filePath);
      return typeof content === 'string' ? content : null;
    } catch (error) {
      console.error('[RendererProcessAdapter] Get file content failed:', error);
      return null;
    }
  }

  /**
   * Index files with progress callback
   */
  async indexFiles(progressCallback?: (progress: number, current: string) => void): Promise<any[]> {
    if (!this.isElectronRenderer) {
      return [];
    }

    try {
      const progressId = this.generateRequestId();

      // Setup progress listener
      if (progressCallback) {
        this.setupProgressListener(progressId, progressCallback);
      }

      const results = await this.invokeMainProcess('universal-search:index-files', progressId);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('[RendererProcessAdapter] File indexing failed:', error);
      return [];
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string): Promise<any | null> {
    if (!this.isElectronRenderer) {
      return null;
    }

    try {
      const metadata = await this.invokeMainProcess('universal-search:file-metadata', filePath);
      return metadata;
    } catch (error) {
      console.error('[RendererProcessAdapter] Get file metadata failed:', error);
      return null;
    }
  }

  /**
   * Open file in default application
   */
  async openFile(filePath: string): Promise<boolean> {
    if (!this.isElectronRenderer) {
      return false;
    }

    try {
      await this.invokeMainProcess('universal-search:open-file', filePath);
      return true;
    } catch (error) {
      console.error('[RendererProcessAdapter] Open file failed:', error);
      return false;
    }
  }

  /**
   * Show file in file explorer
   */
  async showInFolder(filePath: string): Promise<boolean> {
    if (!this.isElectronRenderer) {
      return false;
    }

    try {
      await this.invokeMainProcess('universal-search:show-in-folder', filePath);
      return true;
    } catch (error) {
      console.error('[RendererProcessAdapter] Show in folder failed:', error);
      return false;
    }
  }

  /**
   * Search both files and DOM elements
   */
  async searchMixed(query: string, options: ElectronSearchOptions = { searchType: 'mixed' }): Promise<{
    files: any[];
    domElements: any[];
  }> {
    const results = {
      files: [] as any[],
      domElements: [] as any[]
    };

    if (options.searchType === 'files' || options.searchType === 'mixed') {
      if (this.config.enableFileSearch) {
        results.files = await this.searchFiles(query, {
          searchContent: options.includeContent,
          limit: options.maxResults
        });
      }
    }

    if (options.searchType === 'dom' || options.searchType === 'mixed') {
      if (this.config.enableDomSearch) {
        results.domElements = this.searchDomElements(query);
      }
    }

    return results;
  }

  /**
   * Search DOM elements (client-side)
   */
  private searchDomElements(query: string): any[] {
    const results: any[] = [];
    const searchTerm = query.toLowerCase();

    // Search in text content
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          return node.nodeValue && node.nodeValue.toLowerCase().includes(searchTerm)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      const element = node.parentElement;
      if (element && element.tagName !== 'SCRIPT' && element.tagName !== 'STYLE') {
        results.push({
          type: 'dom',
          element: element.tagName.toLowerCase(),
          text: node.nodeValue.trim(),
          selector: this.generateSelector(element)
        });
      }
    }

    // Search in attributes
    const elements = document.querySelectorAll('*');
    elements.forEach((element) => {
      Array.from(element.attributes).forEach((attr) => {
        if (attr.value.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'dom',
            element: element.tagName.toLowerCase(),
            attribute: attr.name,
            value: attr.value,
            selector: this.generateSelector(element)
          });
        }
      });
    });

    return results.slice(0, 50); // Limit DOM results
  }

  /**
   * Generate CSS selector for element
   */
  private generateSelector(element: Element): string {
    const parts: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
        parts.unshift(selector);
        break;
      }

      if (current.className) {
        const classes = current.className.trim().split(/\s+/).join('.');
        selector += `.${classes}`;
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
   * Setup Electron bridge for secure communication
   */
  private setupElectronBridge(): void {
    try {
      // Try to access Electron APIs based on configuration
      if (this.config.enableContextIsolation) {
        // Context isolation enabled - use contextBridge
        this.bridge.electronAPI = (window as any).electronAPI;
      }

      if (this.config.enableNodeIntegration && typeof require !== 'undefined') {
        // Node integration enabled - direct access
        this.bridge.ipcRenderer = require('electron').ipcRenderer;
      }

      // Fallback: try global electron object
      if (!this.bridge.electronAPI && !this.bridge.ipcRenderer) {
        this.bridge.ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;
      }
    } catch (error) {
      console.warn('[RendererProcessAdapter] Electron bridge setup failed:', error);
    }
  }

  /**
   * Setup IPC event listeners
   */
  private setupIpcListeners(): void {
    const ipc = this.bridge.ipcRenderer || this.bridge.electronAPI;
    if (!ipc) return;

    // Listen for progress updates
    if (ipc.on) {
      ipc.on('universal-search:index-progress', (event: any, data: any) => {
        this.handleProgressUpdate(data);
      });
    }
  }

  /**
   * Setup progress listener for specific request
   */
  private setupProgressListener(progressId: string, callback: (progress: number, current: string) => void): void {
    const progressHandler = (data: any) => {
      if (data.progressId === progressId) {
        callback(data.progress, data.current);
      }
    };

    // Store handler for cleanup
    (this as any)[`progressHandler_${progressId}`] = progressHandler;
  }

  /**
   * Handle progress updates
   */
  private handleProgressUpdate(data: any): void {
    const handler = (this as any)[`progressHandler_${data.progressId}`];
    if (handler) {
      handler(data);
    }
  }

  /**
   * Invoke main process method with timeout
   */
  private async invokeMainProcess(channel: string, ...args: any[]): Promise<any> {
    const ipc = this.bridge.ipcRenderer || this.bridge.electronAPI;
    if (!ipc) {
      throw new Error('IPC not available');
    }

    const requestId = this.generateRequestId();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`IPC request timeout: ${channel}`));
      }, this.config.ipcTimeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      if (ipc.invoke) {
        // Modern electron with invoke/handle
        ipc.invoke(channel, ...args)
          .then((result: any) => {
            const request = this.pendingRequests.get(requestId);
            if (request) {
              clearTimeout(request.timeout);
              this.pendingRequests.delete(requestId);
              resolve(result);
            }
          })
          .catch((error: any) => {
            const request = this.pendingRequests.get(requestId);
            if (request) {
              clearTimeout(request.timeout);
              this.pendingRequests.delete(requestId);
              reject(error);
            }
          });
      } else if (ipc.send && ipc.once) {
        // Legacy electron with send/once
        const responseChannel = `${channel}-response-${requestId}`;

        ipc.once(responseChannel, (event: any, result: any) => {
          const request = this.pendingRequests.get(requestId);
          if (request) {
            clearTimeout(request.timeout);
            this.pendingRequests.delete(requestId);
            resolve(result);
          }
        });

        ipc.send(channel, requestId, ...args);
      } else {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(new Error('IPC methods not available'));
      }
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Detect if running in Electron renderer process
   */
  private detectElectronRenderer(): boolean {
    try {
      return typeof window !== 'undefined' && (
        !!(window as any).electronAPI ||
        (!!(window as any).require && !!(window as any).require('electron')) ||
        typeof process !== 'undefined' && process.type === 'renderer'
      );
    } catch {
      return false;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear pending requests
    this.pendingRequests.forEach(({ timeout }) => {
      clearTimeout(timeout);
    });
    this.pendingRequests.clear();

    // Clean up progress handlers
    Object.keys(this).forEach(key => {
      if (key.startsWith('progressHandler_')) {
        delete (this as any)[key];
      }
    });
  }
}