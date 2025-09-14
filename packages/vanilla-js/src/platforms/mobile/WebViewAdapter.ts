/**
 * WebViewAdapter - WebView integration support for iOS/Android native apps
 * Provides bridge communication with native app features
 */

export interface WebViewConfig {
  platform?: 'ios' | 'android' | 'auto';
  enableNativeBridge?: boolean;
  enableFileAccess?: boolean;
  enableNativeUI?: boolean;
  bridgeTimeout?: number;
  enableDeepLinking?: boolean;
}

export interface NativeBridgeMessage {
  type: string;
  data: any;
  callback?: string;
  timestamp: number;
}

export interface NativeCapabilities {
  fileSystem: boolean;
  camera: boolean;
  notifications: boolean;
  location: boolean;
  contacts: boolean;
  storage: boolean;
  sharing: boolean;
  deepLinking: boolean;
}

export class WebViewAdapter {
  private config: Required<WebViewConfig>;
  private platform: 'ios' | 'android' | 'unknown';
  private isWebView: boolean;
  private bridgeCallbacks: Map<string, Function> = new Map();
  private nativeCapabilities: NativeCapabilities | null = null;
  private messageQueue: NativeBridgeMessage[] = [];
  private bridgeReady = false;

  constructor(config: WebViewConfig = {}) {
    this.config = {
      platform: config.platform || 'auto',
      enableNativeBridge: config.enableNativeBridge ?? true,
      enableFileAccess: config.enableFileAccess ?? true,
      enableNativeUI: config.enableNativeUI ?? true,
      bridgeTimeout: config.bridgeTimeout || 5000,
      enableDeepLinking: config.enableDeepLinking ?? true,
      ...config
    };

    this.platform = this.detectPlatform();
    this.isWebView = this.detectWebView();

    if (this.isWebView) {
      this.init();
    }
  }

  /**
   * Initialize WebView adapter
   */
  private init(): void {
    this.setupNativeBridge();
    this.detectNativeCapabilities();
    this.setupMessageHandlers();

    console.log(`[WebViewAdapter] Initialized for ${this.platform} WebView`);
  }

  /**
   * Check if running in WebView context
   */
  isWebViewContext(): boolean {
    return this.isWebView;
  }

  /**
   * Get detected platform
   */
  getPlatform(): 'ios' | 'android' | 'unknown' {
    return this.platform;
  }

  /**
   * Get native capabilities
   */
  getNativeCapabilities(): NativeCapabilities | null {
    return this.nativeCapabilities;
  }

  /**
   * Send message to native app
   */
  async sendToNative(type: string, data: any = {}): Promise<any> {
    if (!this.config.enableNativeBridge || !this.isWebView) {
      throw new Error('Native bridge not available');
    }

    const callbackId = this.generateCallbackId();
    const message: NativeBridgeMessage = {
      type,
      data,
      callback: callbackId,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.bridgeCallbacks.delete(callbackId);
        reject(new Error(`Native bridge timeout: ${type}`));
      }, this.config.bridgeTimeout);

      this.bridgeCallbacks.set(callbackId, (response: any) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data);
        }
      });

      if (this.bridgeReady) {
        this.dispatchToNative(message);
      } else {
        this.messageQueue.push(message);
      }
    });
  }

  /**
   * Access native file system
   */
  async accessNativeFiles(options: {
    type: 'read' | 'write' | 'list';
    path?: string;
    content?: string;
    mimeType?: string;
  }): Promise<any> {
    if (!this.config.enableFileAccess || !this.nativeCapabilities?.fileSystem) {
      throw new Error('Native file access not available');
    }

    return this.sendToNative('file_access', options);
  }

  /**
   * Show native UI components
   */
  async showNativeUI(type: 'alert' | 'confirm' | 'picker' | 'share', options: any = {}): Promise<any> {
    if (!this.config.enableNativeUI || !this.nativeCapabilities?.sharing) {
      throw new Error('Native UI not available');
    }

    return this.sendToNative('show_ui', { type, options });
  }

  /**
   * Request native permissions
   */
  async requestPermission(permission: 'camera' | 'location' | 'notifications' | 'storage'): Promise<boolean> {
    try {
      const result = await this.sendToNative('request_permission', { permission });
      return result.granted === true;
    } catch (error) {
      console.error('[WebViewAdapter] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Share content using native sharing
   */
  async shareContent(content: {
    title?: string;
    text?: string;
    url?: string;
    image?: string;
  }): Promise<boolean> {
    if (!this.nativeCapabilities?.sharing) {
      // Fallback to Web Share API
      if (navigator.share) {
        try {
          await navigator.share(content);
          return true;
        } catch (error) {
          console.error('[WebViewAdapter] Web share failed:', error);
          return false;
        }
      }
      return false;
    }

    try {
      await this.sendToNative('share', content);
      return true;
    } catch (error) {
      console.error('[WebViewAdapter] Native share failed:', error);
      return false;
    }
  }

  /**
   * Open deep link in native app
   */
  async openDeepLink(url: string): Promise<boolean> {
    if (!this.config.enableDeepLinking || !this.nativeCapabilities?.deepLinking) {
      return false;
    }

    try {
      await this.sendToNative('deep_link', { url });
      return true;
    } catch (error) {
      console.error('[WebViewAdapter] Deep link failed:', error);
      return false;
    }
  }

  /**
   * Get device information from native
   */
  async getDeviceInfo(): Promise<{
    model: string;
    os: string;
    version: string;
    appVersion: string;
  } | null> {
    try {
      return await this.sendToNative('device_info');
    } catch (error) {
      console.error('[WebViewAdapter] Get device info failed:', error);
      return null;
    }
  }

  /**
   * Store data in native secure storage
   */
  async storeSecurely(key: string, value: string): Promise<boolean> {
    if (!this.nativeCapabilities?.storage) {
      // Fallback to localStorage
      try {
        localStorage.setItem(`secure_${key}`, value);
        return true;
      } catch {
        return false;
      }
    }

    try {
      await this.sendToNative('secure_store', { key, value });
      return true;
    } catch (error) {
      console.error('[WebViewAdapter] Secure store failed:', error);
      return false;
    }
  }

  /**
   * Retrieve data from native secure storage
   */
  async retrieveSecurely(key: string): Promise<string | null> {
    if (!this.nativeCapabilities?.storage) {
      // Fallback to localStorage
      return localStorage.getItem(`secure_${key}`);
    }

    try {
      const result = await this.sendToNative('secure_retrieve', { key });
      return result.value || null;
    } catch (error) {
      console.error('[WebViewAdapter] Secure retrieve failed:', error);
      return null;
    }
  }

  /**
   * Setup native bridge communication
   */
  private setupNativeBridge(): void {
    if (!this.config.enableNativeBridge) {
      return;
    }

    // iOS WebView bridge
    if (this.platform === 'ios') {
      this.setupiOSBridge();
    }
    // Android WebView bridge
    else if (this.platform === 'android') {
      this.setupAndroidBridge();
    }

    // Generic bridge for other platforms
    this.setupGenericBridge();
  }

  /**
   * Setup iOS WebView bridge
   */
  private setupiOSBridge(): void {
    // Check for iOS-specific bridge objects
    if ((window as any).webkit && (window as any).webkit.messageHandlers) {
      const messageHandler = (window as any).webkit.messageHandlers.universalSearch;
      if (messageHandler) {
        (window as any).universalSearchNativeBridge = {
          send: (message: NativeBridgeMessage) => {
            messageHandler.postMessage(message);
          }
        };
        this.bridgeReady = true;
        this.processMessageQueue();
      }
    }

    // Setup message listener for responses
    window.addEventListener('message', (event) => {
      if (event.origin === 'null' || event.source === window) {
        this.handleNativeResponse(event.data);
      }
    });
  }

  /**
   * Setup Android WebView bridge
   */
  private setupAndroidBridge(): void {
    // Check for Android-specific bridge objects
    if ((window as any).AndroidBridge || (window as any).universalSearchBridge) {
      const bridge = (window as any).AndroidBridge || (window as any).universalSearchBridge;
      (window as any).universalSearchNativeBridge = {
        send: (message: NativeBridgeMessage) => {
          const jsonMessage = JSON.stringify(message);
          if (bridge.postMessage) {
            bridge.postMessage(jsonMessage);
          } else if (bridge.processMessage) {
            bridge.processMessage(jsonMessage);
          }
        }
      };
      this.bridgeReady = true;
      this.processMessageQueue();
    }

    // Setup global callback for Android responses
    (window as any).universalSearchCallback = (response: string) => {
      try {
        const parsedResponse = JSON.parse(response);
        this.handleNativeResponse(parsedResponse);
      } catch (error) {
        console.error('[WebViewAdapter] Failed to parse Android response:', error);
      }
    };
  }

  /**
   * Setup generic bridge for other platforms
   */
  private setupGenericBridge(): void {
    // Check for custom bridge implementations
    if ((window as any).nativeBridge || (window as any).ReactNativeWebView) {
      const bridge = (window as any).nativeBridge || (window as any).ReactNativeWebView;

      (window as any).universalSearchNativeBridge = {
        send: (message: NativeBridgeMessage) => {
          if (bridge.postMessage) {
            bridge.postMessage(JSON.stringify(message));
          }
        }
      };

      // React Native WebView specific setup
      if ((window as any).ReactNativeWebView) {
        document.addEventListener('message', (event: any) => {
          this.handleNativeResponse(JSON.parse(event.data));
        });
      }

      this.bridgeReady = true;
      this.processMessageQueue();
    }
  }

  /**
   * Setup message handlers for various events
   */
  private setupMessageHandlers(): void {
    // Handle app lifecycle events
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.sendToNative('app_resumed').catch(() => {
          // Ignore errors for lifecycle events
        });
      } else {
        this.sendToNative('app_paused').catch(() => {
          // Ignore errors for lifecycle events
        });
      }
    });

    // Handle network changes
    window.addEventListener('online', () => {
      this.sendToNative('network_online').catch(() => {});
    });

    window.addEventListener('offline', () => {
      this.sendToNative('network_offline').catch(() => {});
    });
  }

  /**
   * Detect native capabilities
   */
  private async detectNativeCapabilities(): Promise<void> {
    if (!this.config.enableNativeBridge) {
      this.nativeCapabilities = {
        fileSystem: false,
        camera: false,
        notifications: false,
        location: false,
        contacts: false,
        storage: false,
        sharing: false,
        deepLinking: false
      };
      return;
    }

    try {
      const capabilities = await this.sendToNative('get_capabilities');
      this.nativeCapabilities = {
        fileSystem: capabilities.fileSystem || false,
        camera: capabilities.camera || false,
        notifications: capabilities.notifications || false,
        location: capabilities.location || false,
        contacts: capabilities.contacts || false,
        storage: capabilities.storage || false,
        sharing: capabilities.sharing || false,
        deepLinking: capabilities.deepLinking || false
      };
    } catch (error) {
      console.warn('[WebViewAdapter] Could not detect native capabilities:', error);
      this.nativeCapabilities = {
        fileSystem: false,
        camera: false,
        notifications: false,
        location: false,
        contacts: false,
        storage: !!localStorage,
        sharing: !!navigator.share,
        deepLinking: false
      };
    }
  }

  /**
   * Dispatch message to native bridge
   */
  private dispatchToNative(message: NativeBridgeMessage): void {
    const bridge = (window as any).universalSearchNativeBridge;
    if (bridge && bridge.send) {
      bridge.send(message);
    } else {
      console.error('[WebViewAdapter] Native bridge not available');
    }
  }

  /**
   * Handle response from native
   */
  private handleNativeResponse(response: any): void {
    if (response.callback) {
      const callback = this.bridgeCallbacks.get(response.callback);
      if (callback) {
        callback(response);
        this.bridgeCallbacks.delete(response.callback);
      }
    }

    // Handle native-initiated messages
    if (response.type) {
      this.handleNativeMessage(response);
    }
  }

  /**
   * Handle messages initiated by native app
   */
  private handleNativeMessage(message: any): void {
    switch (message.type) {
      case 'search_query':
        // Native app wants to perform a search
        this.dispatchEvent('native-search', message.data);
        break;

      case 'theme_changed':
        // Native app changed theme
        this.dispatchEvent('theme-change', message.data);
        break;

      case 'deep_link_received':
        // App was opened via deep link
        this.dispatchEvent('deep-link', message.data);
        break;

      case 'permission_changed':
        // Permission status changed
        this.dispatchEvent('permission-change', message.data);
        break;

      default:
        console.log('[WebViewAdapter] Unhandled native message:', message);
    }
  }

  /**
   * Dispatch custom event
   */
  private dispatchEvent(type: string, data: any): void {
    const event = new CustomEvent(`webview-${type}`, {
      detail: data
    });
    document.dispatchEvent(event);
  }

  /**
   * Process queued messages when bridge becomes ready
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.dispatchToNative(message);
      }
    }
  }

  /**
   * Generate unique callback ID
   */
  private generateCallbackId(): string {
    return `webview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Detect platform (iOS/Android)
   */
  private detectPlatform(): 'ios' | 'android' | 'unknown' {
    if (this.config.platform !== 'auto') {
      return this.config.platform as 'ios' | 'android';
    }

    const userAgent = navigator.userAgent;

    if (/iPad|iPhone|iPod/.test(userAgent)) {
      return 'ios';
    }

    if (/Android/.test(userAgent)) {
      return 'android';
    }

    return 'unknown';
  }

  /**
   * Detect WebView context
   */
  private detectWebView(): boolean {
    const userAgent = navigator.userAgent;

    // iOS WebView detection
    if (this.platform === 'ios') {
      return !(window as any).safari ||
             userAgent.includes('wv') ||
             !!(window as any).webkit?.messageHandlers;
    }

    // Android WebView detection
    if (this.platform === 'android') {
      return userAgent.includes('wv') ||
             userAgent.includes('Version') && userAgent.includes('Chrome') ||
             !!(window as any).AndroidBridge ||
             !!(window as any).universalSearchBridge;
    }

    // React Native WebView
    if ((window as any).ReactNativeWebView) {
      return true;
    }

    // Generic WebView detection
    return userAgent.includes('WebView') ||
           userAgent.includes('wv') ||
           !!(window as any).nativeBridge;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear callbacks
    this.bridgeCallbacks.clear();
    this.messageQueue = [];

    // Remove global functions
    if ((window as any).universalSearchCallback) {
      delete (window as any).universalSearchCallback;
    }

    if ((window as any).universalSearchNativeBridge) {
      delete (window as any).universalSearchNativeBridge;
    }

    this.nativeCapabilities = null;
    this.bridgeReady = false;
  }
}