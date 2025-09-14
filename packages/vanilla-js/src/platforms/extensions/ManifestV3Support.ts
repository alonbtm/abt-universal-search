/**
 * ManifestV3Support - Chrome Extension Manifest V3 compatibility layer
 * Provides compatibility for the new Chrome Extension Manifest V3 architecture
 */

export interface ManifestV3Config {
  enableServiceWorker?: boolean;
  enableActionAPI?: boolean;
  enableDeclarativeNetRequest?: boolean;
  enableOffscreenDocument?: boolean;
  permissions?: string[];
  hostPermissions?: string[];
}

export interface ServiceWorkerMessage {
  type: string;
  data: any;
  tabId?: number;
  timestamp: number;
  requestId?: string;
}

export interface ActionBadgeConfig {
  text?: string;
  color?: string;
  backgroundColor?: [number, number, number, number] | string;
  tabId?: number;
}

export class ManifestV3Support {
  private config: Required<ManifestV3Config>;
  private isManifestV3: boolean;
  private serviceWorkerAPI: any = null;
  private actionAPI: any = null;
  private messageHandlers: Map<string, Function[]>;
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: number }>;

  constructor(config: ManifestV3Config = {}) {
    this.config = {
      enableServiceWorker: config.enableServiceWorker ?? true,
      enableActionAPI: config.enableActionAPI ?? true,
      enableDeclarativeNetRequest: config.enableDeclarativeNetRequest ?? false,
      enableOffscreenDocument: config.enableOffscreenDocument ?? false,
      permissions: config.permissions || ['storage', 'activeTab'],
      hostPermissions: config.hostPermissions || ['<all_urls>'],
      ...config
    };

    this.messageHandlers = new Map();
    this.pendingRequests = new Map();
    this.isManifestV3 = this.detectManifestV3();

    if (this.isManifestV3) {
      this.init();
    }
  }

  /**
   * Initialize Manifest V3 support
   */
  private init(): void {
    this.setupServiceWorkerAPI();
    this.setupActionAPI();
    this.setupMessageHandlers();

    console.log('[ManifestV3Support] Initialized for Manifest V3');
  }

  /**
   * Check if running in Manifest V3 context
   */
  isManifestV3Context(): boolean {
    return this.isManifestV3;
  }

  /**
   * Send message through service worker
   */
  async sendMessage(type: string, data: any, tabId?: number): Promise<any> {
    if (!this.isManifestV3 || !this.serviceWorkerAPI) {
      throw new Error('Manifest V3 service worker not available');
    }

    const message: ServiceWorkerMessage = {
      type,
      data,
      tabId,
      timestamp: Date.now(),
      requestId: this.generateRequestId()
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.requestId!);
        reject(new Error(`Service worker message timeout: ${type}`));
      }, 10000);

      this.pendingRequests.set(message.requestId!, { resolve, reject, timeout });

      if (tabId) {
        // Send to specific tab
        this.serviceWorkerAPI.tabs.sendMessage(tabId, message, (response: any) => {
          this.handleMessageResponse(message.requestId!, response);
        });
      } else {
        // Send to background/service worker
        this.serviceWorkerAPI.runtime.sendMessage(message, (response: any) => {
          this.handleMessageResponse(message.requestId!, response);
        });
      }
    });
  }

  /**
   * Register message handler
   */
  onMessage(type: string, handler: (data: any, sender?: any) => Promise<any> | any): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Update extension action (toolbar button)
   */
  async updateAction(config: ActionBadgeConfig): Promise<boolean> {
    if (!this.config.enableActionAPI || !this.actionAPI) {
      return false;
    }

    try {
      if (config.text !== undefined) {
        await this.setBadgeText(config.text, config.tabId);
      }

      if (config.color !== undefined) {
        await this.setBadgeColor(config.color, config.tabId);
      }

      if (config.backgroundColor !== undefined) {
        await this.setBadgeBackgroundColor(config.backgroundColor, config.tabId);
      }

      return true;
    } catch (error) {
      console.error('[ManifestV3Support] Update action failed:', error);
      return false;
    }
  }

  /**
   * Store data using Chrome storage API
   */
  async storeData(key: string, data: any, area: 'local' | 'sync' | 'session' = 'local'): Promise<boolean> {
    if (!this.serviceWorkerAPI?.storage) {
      return false;
    }

    try {
      const storageArea = this.serviceWorkerAPI.storage[area];
      if (!storageArea) {
        return false;
      }

      await new Promise<void>((resolve, reject) => {
        storageArea.set({ [key]: data }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      return true;
    } catch (error) {
      console.error('[ManifestV3Support] Store data failed:', error);
      return false;
    }
  }

  /**
   * Retrieve data using Chrome storage API
   */
  async retrieveData(key: string, area: 'local' | 'sync' | 'session' = 'local'): Promise<any> {
    if (!this.serviceWorkerAPI?.storage) {
      return null;
    }

    try {
      const storageArea = this.serviceWorkerAPI.storage[area];
      if (!storageArea) {
        return null;
      }

      return new Promise((resolve, reject) => {
        storageArea.get([key], (result: any) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result[key] || null);
          }
        });
      });
    } catch (error) {
      console.error('[ManifestV3Support] Retrieve data failed:', error);
      return null;
    }
  }

  /**
   * Create offscreen document for advanced processing
   */
  async createOffscreenDocument(options: {
    url: string;
    reasons: string[];
    justification: string;
  }): Promise<boolean> {
    if (!this.config.enableOffscreenDocument || !this.serviceWorkerAPI?.offscreen) {
      return false;
    }

    try {
      // Check if offscreen document already exists
      const hasDocument = await this.serviceWorkerAPI.offscreen.hasDocument();
      if (hasDocument) {
        return true;
      }

      await this.serviceWorkerAPI.offscreen.createDocument(options);
      return true;
    } catch (error) {
      console.error('[ManifestV3Support] Create offscreen document failed:', error);
      return false;
    }
  }

  /**
   * Close offscreen document
   */
  async closeOffscreenDocument(): Promise<boolean> {
    if (!this.config.enableOffscreenDocument || !this.serviceWorkerAPI?.offscreen) {
      return false;
    }

    try {
      await this.serviceWorkerAPI.offscreen.closeDocument();
      return true;
    } catch (error) {
      console.error('[ManifestV3Support] Close offscreen document failed:', error);
      return false;
    }
  }

  /**
   * Register content script dynamically
   */
  async registerContentScript(scriptConfig: {
    id: string;
    matches: string[];
    js: string[];
    runAt?: 'document_start' | 'document_end' | 'document_idle';
    world?: 'ISOLATED' | 'MAIN';
  }): Promise<boolean> {
    if (!this.serviceWorkerAPI?.scripting) {
      return false;
    }

    try {
      await this.serviceWorkerAPI.scripting.registerContentScripts([{
        id: scriptConfig.id,
        matches: scriptConfig.matches,
        js: scriptConfig.js,
        runAt: scriptConfig.runAt || 'document_idle',
        world: scriptConfig.world || 'ISOLATED'
      }]);

      return true;
    } catch (error) {
      console.error('[ManifestV3Support] Register content script failed:', error);
      return false;
    }
  }

  /**
   * Unregister content script
   */
  async unregisterContentScript(scriptId: string): Promise<boolean> {
    if (!this.serviceWorkerAPI?.scripting) {
      return false;
    }

    try {
      await this.serviceWorkerAPI.scripting.unregisterContentScripts({
        ids: [scriptId]
      });

      return true;
    } catch (error) {
      console.error('[ManifestV3Support] Unregister content script failed:', error);
      return false;
    }
  }

  /**
   * Execute script in tab
   */
  async executeScript(tabId: number, options: {
    function?: Function;
    args?: any[];
    files?: string[];
    world?: 'ISOLATED' | 'MAIN';
  }): Promise<any[]> {
    if (!this.serviceWorkerAPI?.scripting) {
      return [];
    }

    try {
      const results = await this.serviceWorkerAPI.scripting.executeScript({
        target: { tabId },
        func: options.function,
        args: options.args,
        files: options.files,
        world: options.world || 'ISOLATED'
      });

      return results.map((result: any) => result.result);
    } catch (error) {
      console.error('[ManifestV3Support] Execute script failed:', error);
      return [];
    }
  }

  /**
   * Get current extension manifest
   */
  getManifest(): any {
    if (!this.serviceWorkerAPI?.runtime) {
      return null;
    }

    return this.serviceWorkerAPI.runtime.getManifest();
  }

  /**
   * Check permissions
   */
  async hasPermissions(permissions: string[], origins?: string[]): Promise<boolean> {
    if (!this.serviceWorkerAPI?.permissions) {
      return false;
    }

    try {
      return new Promise((resolve) => {
        this.serviceWorkerAPI.permissions.contains({
          permissions,
          origins
        }, (result: boolean) => {
          resolve(result);
        });
      });
    } catch (error) {
      console.error('[ManifestV3Support] Check permissions failed:', error);
      return false;
    }
  }

  /**
   * Request permissions
   */
  async requestPermissions(permissions: string[], origins?: string[]): Promise<boolean> {
    if (!this.serviceWorkerAPI?.permissions) {
      return false;
    }

    try {
      return new Promise((resolve) => {
        this.serviceWorkerAPI.permissions.request({
          permissions,
          origins
        }, (granted: boolean) => {
          resolve(granted);
        });
      });
    } catch (error) {
      console.error('[ManifestV3Support] Request permissions failed:', error);
      return false;
    }
  }

  /**
   * Setup service worker API
   */
  private setupServiceWorkerAPI(): void {
    if (!this.config.enableServiceWorker) {
      return;
    }

    // Chrome Manifest V3 uses chrome namespace
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      this.serviceWorkerAPI = {
        runtime: chrome.runtime,
        tabs: chrome.tabs,
        storage: chrome.storage,
        scripting: chrome.scripting,
        permissions: chrome.permissions,
        offscreen: (chrome as any).offscreen // May not be available in all versions
      };
    }
    // Firefox WebExtensions (when they support MV3)
    else if (typeof browser !== 'undefined' && browser.runtime) {
      this.serviceWorkerAPI = {
        runtime: browser.runtime,
        tabs: browser.tabs,
        storage: browser.storage,
        scripting: browser.scripting,
        permissions: browser.permissions,
        offscreen: (browser as any).offscreen
      };
    }
  }

  /**
   * Setup action API
   */
  private setupActionAPI(): void {
    if (!this.config.enableActionAPI) {
      return;
    }

    // Manifest V3 uses action API instead of browserAction/pageAction
    if (typeof chrome !== 'undefined' && chrome.action) {
      this.actionAPI = chrome.action;
    } else if (typeof browser !== 'undefined' && browser.action) {
      this.actionAPI = browser.action;
    }
    // Fallback to legacy APIs
    else if (typeof chrome !== 'undefined' && chrome.browserAction) {
      this.actionAPI = chrome.browserAction;
    } else if (typeof browser !== 'undefined' && browser.browserAction) {
      this.actionAPI = browser.browserAction;
    }
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    if (!this.serviceWorkerAPI?.runtime) {
      return;
    }

    this.serviceWorkerAPI.runtime.onMessage.addListener(
      (message: ServiceWorkerMessage, sender: any, sendResponse: Function) => {
        this.handleIncomingMessage(message, sender, sendResponse);
        return true; // Keep message channel open for async response
      }
    );
  }

  /**
   * Handle incoming messages
   */
  private async handleIncomingMessage(
    message: ServiceWorkerMessage,
    sender: any,
    sendResponse: Function
  ): Promise<void> {
    try {
      const handlers = this.messageHandlers.get(message.type) || [];

      if (handlers.length === 0) {
        sendResponse({ error: `No handler for message type: ${message.type}` });
        return;
      }

      const results = await Promise.allSettled(
        handlers.map(handler => handler(message.data, sender))
      );

      const response = {
        success: true,
        results: results.map(result =>
          result.status === 'fulfilled' ? result.value : { error: result.reason }
        )
      };

      sendResponse(response);
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle message responses
   */
  private handleMessageResponse(requestId: string, response: any): void {
    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) {
      return;
    }

    clearTimeout(pendingRequest.timeout);
    this.pendingRequests.delete(requestId);

    if (chrome.runtime.lastError) {
      pendingRequest.reject(new Error(chrome.runtime.lastError.message));
    } else {
      pendingRequest.resolve(response);
    }
  }

  /**
   * Set badge text
   */
  private setBadgeText(text: string, tabId?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: any = { text };
      if (tabId) options.tabId = tabId;

      this.actionAPI.setBadgeText(options, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Set badge color
   */
  private setBadgeColor(color: string, tabId?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: any = { color };
      if (tabId) options.tabId = tabId;

      this.actionAPI.setBadgeBackgroundColor(options, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Set badge background color
   */
  private setBadgeBackgroundColor(
    color: [number, number, number, number] | string,
    tabId?: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: any = { color };
      if (tabId) options.tabId = tabId;

      this.actionAPI.setBadgeBackgroundColor(options, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Detect Manifest V3 context
   */
  private detectManifestV3(): boolean {
    try {
      // Check for Manifest V3 specific APIs
      if (typeof chrome !== 'undefined') {
        const manifest = chrome.runtime?.getManifest();
        return manifest?.manifest_version === 3;
      }

      if (typeof browser !== 'undefined') {
        const manifest = browser.runtime?.getManifest();
        return manifest?.manifest_version === 3;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `mv3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    // Clear message handlers
    this.messageHandlers.clear();

    // Clean up APIs
    this.serviceWorkerAPI = null;
    this.actionAPI = null;
  }
}