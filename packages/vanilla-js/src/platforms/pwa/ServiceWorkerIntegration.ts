/**
 * ServiceWorkerIntegration - PWA service worker integration for Universal Search
 * Provides offline search capabilities and background sync
 */

export interface ServiceWorkerConfig {
  cacheName?: string;
  cacheStrategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  maxCacheAge?: number; // in milliseconds
  enableBackgroundSync?: boolean;
  enablePushNotifications?: boolean;
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl?: number;
}

export class ServiceWorkerIntegration {
  private config: Required<ServiceWorkerConfig>;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean;

  constructor(config: ServiceWorkerConfig = {}) {
    this.config = {
      cacheName: 'universal-search-cache-v1',
      cacheStrategy: 'stale-while-revalidate',
      maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
      enableBackgroundSync: false,
      enablePushNotifications: false,
      ...config
    };

    this.isSupported = 'serviceWorker' in navigator;
  }

  /**
   * Register the service worker
   */
  async register(serviceWorkerPath: string = '/sw.js'): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported) {
      console.warn('[ServiceWorkerIntegration] Service Worker not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register(serviceWorkerPath);

      // Set up message channel for communication
      this.setupMessageChannel();

      console.log('[ServiceWorkerIntegration] Service Worker registered successfully');
      return this.registration;
    } catch (error) {
      console.error('[ServiceWorkerIntegration] Service Worker registration failed:', error);
      return null;
    }
  }

  /**
   * Check if service worker is available and active
   */
  isAvailable(): boolean {
    return this.isSupported && !!this.registration && !!this.registration.active;
  }

  /**
   * Cache search results for offline access
   */
  async cacheSearchResults(query: string, results: any[]): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateCacheKey(query);
      const cacheEntry: CacheEntry = {
        key: cacheKey,
        data: results,
        timestamp: Date.now(),
        ttl: this.config.maxCacheAge
      };

      await this.sendMessage('cache-results', { cacheEntry });
      return true;
    } catch (error) {
      console.error('[ServiceWorkerIntegration] Failed to cache results:', error);
      return false;
    }
  }

  /**
   * Retrieve cached search results
   */
  async getCachedResults(query: string): Promise<any[] | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey(query);
      const response = await this.sendMessage('get-cached-results', { cacheKey });

      if (response && response.data) {
        const entry: CacheEntry = response.data;

        // Check if cache entry is still valid
        if (this.isCacheEntryValid(entry)) {
          return entry.data;
        } else {
          // Remove expired entry
          await this.sendMessage('remove-cache-entry', { cacheKey });
        }
      }

      return null;
    } catch (error) {
      console.error('[ServiceWorkerIntegration] Failed to get cached results:', error);
      return null;
    }
  }

  /**
   * Clear all cached search results
   */
  async clearCache(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.sendMessage('clear-cache', {});
      return true;
    } catch (error) {
      console.error('[ServiceWorkerIntegration] Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Check if the app is currently offline
   */
  isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Request background sync for search operations
   */
  async requestBackgroundSync(tag: string = 'search-sync'): Promise<boolean> {
    if (!this.config.enableBackgroundSync || !this.isAvailable()) {
      return false;
    }

    try {
      await this.registration!.sync.register(tag);
      return true;
    } catch (error) {
      console.error('[ServiceWorkerIntegration] Background sync request failed:', error);
      return false;
    }
  }

  /**
   * Request permission for push notifications
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!this.config.enablePushNotifications || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('[ServiceWorkerIntegration] Notification permission request failed:', error);
      return false;
    }
  }

  /**
   * Show push notification for search results
   */
  async showSearchNotification(title: string, options: NotificationOptions = {}): Promise<boolean> {
    if (!this.config.enablePushNotifications || !this.isAvailable()) {
      return false;
    }

    try {
      const hasPermission = await this.requestNotificationPermission();
      if (!hasPermission) {
        return false;
      }

      await this.registration!.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...options
      });

      return true;
    } catch (error) {
      console.error('[ServiceWorkerIntegration] Failed to show notification:', error);
      return false;
    }
  }

  /**
   * Set up message channel for communication with service worker
   */
  private setupMessageChannel(): void {
    if (!this.isSupported) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data);
    });
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(message: any): void {
    switch (message.type) {
      case 'cache-updated':
        console.log('[ServiceWorkerIntegration] Cache updated:', message.data);
        break;
      case 'sync-completed':
        console.log('[ServiceWorkerIntegration] Background sync completed:', message.data);
        break;
      case 'error':
        console.error('[ServiceWorkerIntegration] Service Worker error:', message.error);
        break;
    }
  }

  /**
   * Send message to service worker
   */
  private async sendMessage(type: string, data: any): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Service Worker not available');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      this.registration!.active!.postMessage(
        { type, data },
        [messageChannel.port2]
      );
    });
  }

  /**
   * Generate cache key for search query
   */
  private generateCacheKey(query: string): string {
    return `search-${btoa(query.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheEntryValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;

    if (entry.ttl && age > entry.ttl) {
      return false;
    }

    return age < this.config.maxCacheAge;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clean up any remaining resources
    this.registration = null;
  }
}