/**
 * Cross-Platform Universal Search Integration
 * Main entry point for all platform-specific adapters and optimizations
 */

// Core platform detection and complexity management
export {
  ProgressiveComplexity,
  PlatformDetector,
  type PlatformCapabilities,
  type ComplexityLevel,
  COMPLEXITY_LEVELS
} from './ProgressiveComplexity';

// PWA Integration (Story 5.3.1)
export { ServiceWorkerIntegration, type ServiceWorkerConfig } from './pwa/ServiceWorkerIntegration';
export { OfflineStorage, type StorageConfig, type StoredSearchData } from './pwa/OfflineStorage';
export { PWAManifest, type PWAManifestConfig, type PWAIcon } from './pwa/PWAManifest';

// Electron Integration (Story 5.3.2)
export { MainProcessAdapter, type MainProcessConfig, type FileSearchResult } from './electron/MainProcessAdapter';
export { RendererProcessAdapter, type RendererProcessConfig } from './electron/RendererProcessAdapter';
export { IPCCommunication, type IPCConfig, type IPCMessage } from './electron/IPCCommunication';

// Browser Extensions (Story 5.3.3)
export { ContentScriptAdapter, type ContentScriptConfig, type DomSearchResult } from './extensions/ContentScriptAdapter';
export { ExtensionPopupAdapter, type ExtensionPopupConfig } from './extensions/ExtensionPopupAdapter';
export { ManifestV3Support, type ManifestV3Config } from './extensions/ManifestV3Support';

// Mobile Optimizations (Stories 5.3.5 & 5.3.6)
export { TouchInterface, type TouchInterfaceConfig, type TouchEvent } from './mobile/TouchInterface';
export { MobileOptimizations, type MobileOptimizationConfig } from './mobile/MobileOptimizations';
export { WebViewAdapter, type WebViewConfig, type NativeCapabilities } from './mobile/WebViewAdapter';

/**
 * Universal Platform Manager
 * Automatically detects platform and initializes appropriate adapters
 */
export class UniversalPlatformManager {
  private complexity: ProgressiveComplexity;
  private activeAdapters: Map<string, any> = new Map();

  constructor(level?: number) {
    this.complexity = new ProgressiveComplexity(level);
    this.initializePlatformAdapters();
  }

  /**
   * Get current complexity level and platform capabilities
   */
  getStatus() {
    return {
      level: this.complexity.getCurrentLevel(),
      capabilities: this.complexity.getCapabilities(),
      activeAdapters: Array.from(this.activeAdapters.keys())
    };
  }

  /**
   * Get specific platform adapter
   */
  getAdapter<T>(name: string): T | null {
    return this.activeAdapters.get(name) || null;
  }

  /**
   * Initialize platform-specific adapters based on environment
   */
  private initializePlatformAdapters(): void {
    const capabilities = this.complexity.getCapabilities();

    // PWA Integration
    if (capabilities.isPWA || capabilities.hasServiceWorkerSupport) {
      this.activeAdapters.set('serviceWorker', new ServiceWorkerIntegration());
      this.activeAdapters.set('offlineStorage', new OfflineStorage());
      this.activeAdapters.set('pwaManifest', new PWAManifest({
        name: 'Universal Search',
        enableInstallPrompt: true
      }));
    }

    // Electron Integration
    if (capabilities.isElectron) {
      if (PlatformDetector.isElectron() && process?.type === 'browser') {
        // Main process
        this.activeAdapters.set('electronMain', new MainProcessAdapter());
      } else {
        // Renderer process
        this.activeAdapters.set('electronRenderer', new RendererProcessAdapter());
      }
      this.activeAdapters.set('electronIPC', new IPCCommunication());
    }

    // Browser Extension Integration
    if (capabilities.isExtension) {
      this.activeAdapters.set('contentScript', new ContentScriptAdapter());
      this.activeAdapters.set('extensionPopup', new ExtensionPopupAdapter());
      this.activeAdapters.set('manifestV3', new ManifestV3Support());
    }

    // Mobile Optimizations
    if (capabilities.isMobile || capabilities.hasTouchSupport) {
      this.activeAdapters.set('touchInterface', new TouchInterface());
      this.activeAdapters.set('mobileOptimizations', new MobileOptimizations());
    }

    // WebView Integration
    if (capabilities.isWebView) {
      this.activeAdapters.set('webView', new WebViewAdapter());
    }

    console.log('[UniversalPlatformManager] Initialized adapters:', Array.from(this.activeAdapters.keys()));
  }

  /**
   * Clean up all adapters
   */
  destroy(): void {
    this.activeAdapters.forEach((adapter, name) => {
      if (adapter.destroy && typeof adapter.destroy === 'function') {
        try {
          adapter.destroy();
        } catch (error) {
          console.error(`[UniversalPlatformManager] Failed to destroy ${name}:`, error);
        }
      }
    });
    this.activeAdapters.clear();
  }
}

/**
 * Factory function to create platform manager with auto-detection
 */
export function createUniversalPlatform(level?: number): UniversalPlatformManager {
  return new UniversalPlatformManager(level);
}

/**
 * Utility functions for platform detection
 */
export const PlatformUtils = {
  /**
   * Get recommended complexity level for current environment
   */
  getRecommendedLevel(): ComplexityLevel {
    return PlatformDetector.determineOptimalComplexityLevel();
  },

  /**
   * Get performance targets for current platform
   */
  getPerformanceTargets(): Record<string, number> {
    const complexity = new ProgressiveComplexity();
    return complexity.getPerformanceTargets();
  },

  /**
   * Check if specific feature is available
   */
  hasFeature(feature: string): boolean {
    const complexity = new ProgressiveComplexity();
    return complexity.hasFeature(feature);
  },

  /**
   * Get platform-specific configuration
   */
  getPlatformConfig(): any {
    const complexity = new ProgressiveComplexity();
    return complexity.getConfiguration();
  }
};

/**
 * Constants for easy access to platform information
 */
export const PlatformConstants = {
  COMPLEXITY_LEVELS,

  PERFORMANCE_TARGETS: {
    PWA: { searchResponseTime: 100, memoryUsage: 5 },
    ELECTRON: { searchResponseTime: 50, memoryUsage: 10 },
    EXTENSION: { searchResponseTime: 200, memoryUsage: 2 },
    MOBILE: { searchResponseTime: 150, memoryUsage: 3 },
    WEBVIEW: { searchResponseTime: 100, memoryUsage: 3 }
  },

  SUPPORTED_PLATFORMS: [
    'browser',
    'pwa',
    'electron',
    'extension',
    'mobile',
    'webview'
  ] as const
};

// Re-export types for convenience
export type {
  // Core types
  PlatformCapabilities,
  ComplexityLevel,

  // PWA types
  ServiceWorkerConfig,
  StorageConfig,
  StoredSearchData,
  PWAManifestConfig,
  PWAIcon,

  // Electron types
  MainProcessConfig,
  FileSearchResult,
  RendererProcessConfig,
  IPCConfig,
  IPCMessage,

  // Extension types
  ContentScriptConfig,
  DomSearchResult,
  ExtensionPopupConfig,
  ManifestV3Config,

  // Mobile types
  TouchInterfaceConfig,
  TouchEvent,
  MobileOptimizationConfig,
  WebViewConfig,
  NativeCapabilities
};

/**
 * Default export for easy consumption
 */
export default {
  UniversalPlatformManager,
  createUniversalPlatform,
  PlatformDetector,
  PlatformUtils,
  PlatformConstants
};