/**
 * ProgressiveComplexity - Platform detection and configuration manager
 * Handles Level 1-4 complexity escalation and platform adaptation
 */

export interface PlatformCapabilities {
  isPWA: boolean;
  isElectron: boolean;
  isExtension: boolean;
  isMobile: boolean;
  isWebView: boolean;
  hasTouchSupport: boolean;
  hasServiceWorkerSupport: boolean;
  hasIndexedDBSupport: boolean;
  hasWebExtensionAPIs: boolean;
}

export interface ComplexityLevel {
  level: 1 | 2 | 3 | 4;
  name: 'instant' | 'basic' | 'advanced' | 'enterprise';
  description: string;
  setupTime: string;
  features: string[];
}

export const COMPLEXITY_LEVELS: Record<number, ComplexityLevel> = {
  1: {
    level: 1,
    name: 'instant',
    description: 'Zero-configuration instant setup',
    setupTime: '30-second',
    features: ['Single script tag', 'Memory data source', 'Basic UI']
  },
  2: {
    level: 2,
    name: 'basic',
    description: 'Basic configuration with custom data sources',
    setupTime: '5-minute',
    features: ['API integration', 'Custom styling', 'Event handling']
  },
  3: {
    level: 3,
    name: 'advanced',
    description: 'Advanced features with multi-source integration',
    setupTime: '30-minute',
    features: ['Multiple data sources', 'Custom UI components', 'Performance optimization', 'Offline support']
  },
  4: {
    level: 4,
    name: 'enterprise',
    description: 'Enterprise-grade with monitoring and security',
    setupTime: 'Production-ready',
    features: ['Security hardening', 'Analytics & monitoring', 'A/B testing', 'Deployment automation']
  }
};

/**
 * Platform detection utilities
 */
export const PlatformDetector = {
  isPWA(): boolean {
    if (typeof window === 'undefined') return false;
    return window.navigator.standalone === true ||
           window.matchMedia('(display-mode: standalone)').matches;
  },

  isElectron(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).process && (window as any).process.type;
  },

  isExtension(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).chrome?.runtime?.id ||
           !!(window as any).browser?.runtime?.id;
  },

  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  isWebView(): boolean {
    if (typeof window === 'undefined') return false;
    return navigator.userAgent.includes('wv') ||
           !!(window as any).ReactNativeWebView ||
           !!(window as any).webkit?.messageHandlers;
  },

  hasTouchSupport(): boolean {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  hasServiceWorkerSupport(): boolean {
    if (typeof window === 'undefined') return false;
    return 'serviceWorker' in navigator;
  },

  hasIndexedDBSupport(): boolean {
    if (typeof window === 'undefined') return false;
    return 'indexedDB' in window;
  },

  hasWebExtensionAPIs(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).chrome?.runtime || !!(window as any).browser?.runtime;
  },

  /**
   * Get comprehensive platform capabilities
   */
  getPlatformCapabilities(): PlatformCapabilities {
    return {
      isPWA: this.isPWA(),
      isElectron: this.isElectron(),
      isExtension: this.isExtension(),
      isMobile: this.isMobile(),
      isWebView: this.isWebView(),
      hasTouchSupport: this.hasTouchSupport(),
      hasServiceWorkerSupport: this.hasServiceWorkerSupport(),
      hasIndexedDBSupport: this.hasIndexedDBSupport(),
      hasWebExtensionAPIs: this.hasWebExtensionAPIs()
    };
  },

  /**
   * Determine optimal complexity level based on platform and usage
   */
  determineOptimalComplexityLevel(userLevel?: number): ComplexityLevel {
    const capabilities = this.getPlatformCapabilities();

    // If user specified a level, use that
    if (userLevel && COMPLEXITY_LEVELS[userLevel]) {
      return COMPLEXITY_LEVELS[userLevel];
    }

    // Auto-determine based on platform capabilities
    if (capabilities.isElectron || capabilities.isExtension) {
      return COMPLEXITY_LEVELS[3]; // Advanced for rich environments
    }

    if (capabilities.isPWA || capabilities.hasServiceWorkerSupport) {
      return COMPLEXITY_LEVELS[2]; // Basic with PWA features
    }

    if (capabilities.isMobile || capabilities.hasTouchSupport) {
      return COMPLEXITY_LEVELS[2]; // Basic with mobile optimizations
    }

    // Default to instant for simple environments
    return COMPLEXITY_LEVELS[1];
  }
};

/**
 * Progressive complexity configuration manager
 */
export class ProgressiveComplexity {
  private currentLevel: ComplexityLevel;
  private capabilities: PlatformCapabilities;

  constructor(level?: number) {
    this.capabilities = PlatformDetector.getPlatformCapabilities();
    this.currentLevel = PlatformDetector.determineOptimalComplexityLevel(level);
  }

  /**
   * Get current complexity level
   */
  getCurrentLevel(): ComplexityLevel {
    return this.currentLevel;
  }

  /**
   * Get platform capabilities
   */
  getCapabilities(): PlatformCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Check if a feature is available at current complexity level
   */
  hasFeature(feature: string): boolean {
    return this.currentLevel.features.some(f =>
      f.toLowerCase().includes(feature.toLowerCase())
    );
  }

  /**
   * Upgrade to a higher complexity level
   */
  upgradeTo(level: number): boolean {
    if (!COMPLEXITY_LEVELS[level] || level <= this.currentLevel.level) {
      return false;
    }

    this.currentLevel = COMPLEXITY_LEVELS[level];
    return true;
  }

  /**
   * Get configuration object for current level
   */
  getConfiguration(): any {
    const config: any = {
      level: this.currentLevel.level,
      platform: this.capabilities,
      features: {}
    };

    // Level 1: Basic configuration
    if (this.currentLevel.level >= 1) {
      config.features.basicUI = true;
      config.features.memoryDataSource = true;
    }

    // Level 2: Enhanced configuration
    if (this.currentLevel.level >= 2) {
      config.features.apiDataSource = true;
      config.features.customStyling = true;
      config.features.eventHandling = true;

      if (this.capabilities.isMobile) {
        config.features.touchOptimizations = true;
      }

      if (this.capabilities.isPWA) {
        config.features.pwaIntegration = true;
      }
    }

    // Level 3: Advanced features
    if (this.currentLevel.level >= 3) {
      config.features.multipleDataSources = true;
      config.features.customUIComponents = true;
      config.features.performanceOptimization = true;

      if (this.capabilities.hasServiceWorkerSupport) {
        config.features.offlineSupport = true;
      }

      if (this.capabilities.hasIndexedDBSupport) {
        config.features.localStorage = true;
      }

      if (this.capabilities.isElectron) {
        config.features.electronIntegration = true;
      }

      if (this.capabilities.isExtension) {
        config.features.extensionIntegration = true;
      }
    }

    // Level 4: Enterprise features
    if (this.currentLevel.level >= 4) {
      config.features.securityHardening = true;
      config.features.analytics = true;
      config.features.monitoring = true;
      config.features.abTesting = true;
      config.features.deploymentAutomation = true;
    }

    return config;
  }

  /**
   * Get performance targets based on platform
   */
  getPerformanceTargets(): Record<string, number> {
    const targets: Record<string, number> = {};

    if (this.capabilities.isPWA) {
      targets.searchResponseTime = 100; // ms
      targets.memoryUsage = 5; // MB
    } else if (this.capabilities.isElectron) {
      targets.searchResponseTime = 50; // ms
      targets.memoryUsage = 10; // MB (more lenient for desktop)
    } else if (this.capabilities.isExtension) {
      targets.searchResponseTime = 200; // ms
      targets.memoryUsage = 2; // MB (strict for extensions)
    } else if (this.capabilities.isMobile) {
      targets.searchResponseTime = 150; // ms
      targets.memoryUsage = 3; // MB
    } else if (this.capabilities.isWebView) {
      targets.searchResponseTime = 100; // ms
      targets.memoryUsage = 3; // MB
    } else {
      // Standard web browser
      targets.searchResponseTime = 100; // ms
      targets.memoryUsage = 4; // MB
    }

    return targets;
  }
}