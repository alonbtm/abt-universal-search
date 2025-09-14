/**
 * Browser Profiler - Cross-browser and device performance tracking
 * @description Profiles browser capabilities, device characteristics, and performance correlation
 */

/**
 * Browser information
 */
export interface BrowserInfo {
  /** Browser name */
  name: string;
  /** Browser version */
  version: string;
  /** Browser engine */
  engine: string;
  /** Engine version */
  engineVersion: string;
  /** Operating system */
  os: string;
  /** OS version */
  osVersion: string;
  /** Device type */
  deviceType: 'desktop' | 'mobile' | 'tablet';
  /** Device manufacturer */
  manufacturer?: string;
  /** Device model */
  model?: string;
  /** Is mobile device */
  isMobile: boolean;
  /** Is touch device */
  isTouch: boolean;
  /** User agent string */
  userAgent: string;
}

/**
 * Device capabilities
 */
export interface DeviceCapabilities {
  /** Screen resolution */
  screen: {
    width: number;
    height: number;
    pixelRatio: number;
    colorDepth: number;
    orientation: 'portrait' | 'landscape';
  };
  /** Viewport size */
  viewport: {
    width: number;
    height: number;
  };
  /** Memory information (if available) */
  memory?: {
    total?: number;
    used?: number;
    limit?: number;
  };
  /** CPU information (if available) */
  cpu?: {
    cores?: number;
    architecture?: string;
  };
  /** Network connection */
  connection?: {
    effectiveType?: '2g' | '3g' | '4g' | '5g';
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  /** Storage capabilities */
  storage: {
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
    webSQL: boolean;
  };
  /** Feature support */
  features: {
    webGL: boolean;
    webGL2: boolean;
    serviceWorker: boolean;
    webAssembly: boolean;
    performanceObserver: boolean;
    intersectionObserver: boolean;
    mutationObserver: boolean;
    requestIdleCallback: boolean;
    webWorkers: boolean;
    sharedArrayBuffer: boolean;
  };
}

/**
 * Performance characteristics by browser/device
 */
export interface BrowserPerformanceProfile {
  /** Browser/device identifier */
  id: string;
  /** Browser information */
  browser: BrowserInfo;
  /** Device capabilities */
  capabilities: DeviceCapabilities;
  /** Performance metrics */
  performance: {
    /** Average response time */
    averageResponseTime: number;
    /** Average render time */
    averageRenderTime: number;
    /** Average interaction latency */
    averageInteractionLatency: number;
    /** Frame rate performance */
    frameRate: number;
    /** Memory usage efficiency */
    memoryEfficiency: number;
    /** Cache hit rate */
    cacheHitRate: number;
  };
  /** Performance score (0-100) */
  performanceScore: number;
  /** Compatibility score (0-100) */
  compatibilityScore: number;
  /** Sample size */
  sampleSize: number;
  /** Last updated */
  lastUpdated: number;
  /** Performance trends */
  trends: {
    improving: number;
    degrading: number;
    stable: number;
  };
}

/**
 * Browser compatibility matrix
 */
export interface CompatibilityMatrix {
  /** Feature compatibility by browser */
  features: Record<string, Record<string, boolean>>;
  /** Performance benchmarks by browser */
  benchmarks: Record<
    string,
    {
      responseTime: number;
      renderTime: number;
      interactionLatency: number;
      score: number;
    }
  >;
  /** Recommended optimizations by browser */
  optimizations: Record<string, string[]>;
  /** Known issues by browser */
  knownIssues: Record<
    string,
    Array<{
      description: string;
      severity: 'low' | 'medium' | 'high';
      workaround?: string;
    }>
  >;
}

/**
 * Performance recommendation
 */
export interface BrowserRecommendation {
  /** Target browser/device */
  target: string;
  /** Recommendation type */
  type: 'optimization' | 'fallback' | 'feature-toggle' | 'polyfill';
  /** Recommendation title */
  title: string;
  /** Detailed description */
  description: string;
  /** Implementation code/config */
  implementation?: string;
  /** Expected impact */
  impact: {
    performanceGain: number;
    compatibilityImprovement: number;
  };
  /** Priority level */
  priority: 'low' | 'medium' | 'high';
  /** Effort required */
  effort: 'low' | 'medium' | 'high';
}

/**
 * Browser Profiler Implementation
 */
export class BrowserProfiler {
  private profiles: Map<string, BrowserPerformanceProfile> = new Map();
  private currentProfile: BrowserPerformanceProfile | null = null;
  private compatibilityMatrix: CompatibilityMatrix | null = null;
  private measurements: Array<{
    timestamp: number;
    responseTime: number;
    renderTime: number;
    interactionLatency: number;
    memoryUsage: number;
    browserId: string;
  }> = [];
  private performanceBaselines: Map<string, number> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Get current browser profile
   */
  getCurrentProfile(): BrowserPerformanceProfile {
    if (!this.currentProfile) {
      this.currentProfile = this.createBrowserProfile();
    }
    return this.currentProfile;
  }

  /**
   * Record performance measurement
   */
  recordPerformanceMeasurement(
    responseTime: number,
    renderTime?: number,
    interactionLatency?: number,
    memoryUsage?: number
  ): void {
    const profile = this.getCurrentProfile();

    this.measurements.push({
      timestamp: Date.now(),
      responseTime,
      renderTime: renderTime || 0,
      interactionLatency: interactionLatency || 0,
      memoryUsage: memoryUsage || 0,
      browserId: profile.id,
    });

    // Update profile performance metrics
    this.updateProfilePerformance(profile);

    // Keep only recent measurements (last 1000)
    if (this.measurements.length > 1000) {
      this.measurements = this.measurements.slice(-1000);
    }
  }

  /**
   * Get performance comparison across browsers
   */
  getPerformanceComparison(): Record<
    string,
    {
      browser: string;
      version: string;
      performance: BrowserPerformanceProfile['performance'];
      relativePerformance: number;
    }
  > {
    const comparison: Record<string, any> = {};

    // Calculate average performance across all browsers
    const allProfiles = Array.from(this.profiles.values());
    const avgPerformance = this.calculateAveragePerformance(allProfiles);

    for (const profile of allProfiles) {
      const relativePerformance = this.calculateRelativePerformance(
        profile.performance,
        avgPerformance
      );

      comparison[profile.id] = {
        browser: `${profile.browser.name} ${profile.browser.version}`,
        version: profile.browser.version,
        performance: profile.performance,
        relativePerformance,
      };
    }

    return comparison;
  }

  /**
   * Generate browser-specific recommendations
   */
  generateRecommendations(browserId?: string): BrowserRecommendation[] {
    const targetProfile = browserId ? this.profiles.get(browserId) : this.getCurrentProfile();

    if (!targetProfile) return [];

    const recommendations: BrowserRecommendation[] = [];
    const browser = targetProfile.browser;
    const capabilities = targetProfile.capabilities;
    const performance = targetProfile.performance;

    // Response time optimizations
    if (performance.averageResponseTime > 200) {
      if (browser.name.toLowerCase().includes('chrome')) {
        recommendations.push({
          target: targetProfile.id,
          type: 'optimization',
          title: 'Enable HTTP/2 Push for Chrome',
          description: 'Chrome supports HTTP/2 server push for faster resource loading',
          implementation: 'Configure server with HTTP/2 push headers for critical resources',
          impact: {
            performanceGain: 0.3,
            compatibilityImprovement: 0,
          },
          priority: 'high',
          effort: 'medium',
        });
      } else if (browser.name.toLowerCase().includes('firefox')) {
        recommendations.push({
          target: targetProfile.id,
          type: 'optimization',
          title: 'Optimize for Firefox Network Stack',
          description: 'Firefox benefits from connection pooling optimizations',
          implementation: 'Use connection: keep-alive and optimize request batching',
          impact: {
            performanceGain: 0.2,
            compatibilityImprovement: 0,
          },
          priority: 'medium',
          effort: 'low',
        });
      }
    }

    // Render time optimizations
    if (performance.averageRenderTime > 16.67) {
      // Below 60fps
      if (!capabilities.features.webGL && capabilities.features.webGL2) {
        recommendations.push({
          target: targetProfile.id,
          type: 'feature-toggle',
          title: 'Use WebGL2 for Better Rendering',
          description: 'Browser supports WebGL2 which can improve rendering performance',
          implementation: 'Enable WebGL2 rendering path when available',
          impact: {
            performanceGain: 0.4,
            compatibilityImprovement: 0.1,
          },
          priority: 'high',
          effort: 'medium',
        });
      }

      if (browser.deviceType === 'mobile') {
        recommendations.push({
          target: targetProfile.id,
          type: 'optimization',
          title: 'Optimize for Mobile Rendering',
          description: 'Mobile devices benefit from reduced DOM manipulation',
          implementation: 'Use requestAnimationFrame and batch DOM updates',
          impact: {
            performanceGain: 0.3,
            compatibilityImprovement: 0,
          },
          priority: 'high',
          effort: 'low',
        });
      }
    }

    // Memory optimizations
    if (capabilities.memory && capabilities.memory.total && capabilities.memory.total < 2000) {
      recommendations.push({
        target: targetProfile.id,
        type: 'optimization',
        title: 'Low Memory Device Optimization',
        description: 'Device has limited memory, implement aggressive cleanup',
        implementation: 'Enable frequent garbage collection and limit cache size',
        impact: {
          performanceGain: 0.2,
          compatibilityImprovement: 0.3,
        },
        priority: 'high',
        effort: 'medium',
      });
    }

    // Feature fallbacks
    if (!capabilities.features.intersectionObserver) {
      recommendations.push({
        target: targetProfile.id,
        type: 'polyfill',
        title: 'Add Intersection Observer Polyfill',
        description: 'Browser lacks Intersection Observer support for efficient scrolling',
        implementation: 'Include intersection-observer polyfill for scroll performance',
        impact: {
          performanceGain: 0.1,
          compatibilityImprovement: 0.8,
        },
        priority: 'medium',
        effort: 'low',
      });
    }

    // Network optimizations
    if (
      capabilities.connection?.effectiveType === '2g' ||
      capabilities.connection?.effectiveType === '3g'
    ) {
      recommendations.push({
        target: targetProfile.id,
        type: 'optimization',
        title: 'Slow Network Optimization',
        description: 'Device is on slow network, implement aggressive caching',
        implementation: 'Enable service worker caching and reduce payload sizes',
        impact: {
          performanceGain: 0.5,
          compatibilityImprovement: 0,
        },
        priority: 'high',
        effort: 'high',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get compatibility matrix
   */
  getCompatibilityMatrix(): CompatibilityMatrix {
    if (!this.compatibilityMatrix) {
      this.compatibilityMatrix = this.buildCompatibilityMatrix();
    }
    return this.compatibilityMatrix;
  }

  /**
   * Check browser compatibility score
   */
  getBrowserCompatibilityScore(browserId?: string): {
    score: number;
    supportedFeatures: string[];
    unsupportedFeatures: string[];
    recommendations: string[];
  } {
    const profile = browserId ? this.profiles.get(browserId) : this.getCurrentProfile();

    if (!profile) {
      return {
        score: 0,
        supportedFeatures: [],
        unsupportedFeatures: [],
        recommendations: ['Browser profile not available'],
      };
    }

    const capabilities = profile.capabilities;
    const requiredFeatures = [
      'localStorage',
      'performanceObserver',
      'webWorkers',
      'intersectionObserver',
    ];

    const desiredFeatures = [
      'serviceWorker',
      'webAssembly',
      'webGL',
      'requestIdleCallback',
      'mutationObserver',
    ];

    const supportedFeatures: string[] = [];
    const unsupportedFeatures: string[] = [];

    // Check required features
    for (const feature of requiredFeatures) {
      const isSupported = this.isFeatureSupported(capabilities, feature);
      if (isSupported) {
        supportedFeatures.push(feature);
      } else {
        unsupportedFeatures.push(feature);
      }
    }

    // Check desired features
    for (const feature of desiredFeatures) {
      const isSupported = this.isFeatureSupported(capabilities, feature);
      if (isSupported) {
        supportedFeatures.push(feature);
      } else {
        unsupportedFeatures.push(feature);
      }
    }

    // Calculate compatibility score
    const totalFeatures = requiredFeatures.length + desiredFeatures.length;
    const requiredScore =
      (supportedFeatures.filter(f => requiredFeatures.includes(f)).length /
        requiredFeatures.length) *
      70;
    const desiredScore =
      (supportedFeatures.filter(f => desiredFeatures.includes(f)).length / desiredFeatures.length) *
      30;
    const score = Math.round(requiredScore + desiredScore);

    // Generate recommendations
    const recommendations = this.generateCompatibilityRecommendations(unsupportedFeatures, profile);

    return {
      score,
      supportedFeatures,
      unsupportedFeatures,
      recommendations,
    };
  }

  /**
   * Track viewport change
   */
  trackViewportChange(width: number, height: number): void {
    const profile = this.getCurrentProfile();
    profile.capabilities.viewport = { width, height };
    profile.capabilities.screen.orientation = width > height ? 'landscape' : 'portrait';
    profile.lastUpdated = Date.now();
  }

  /**
   * Clear all profiles
   */
  clearProfiles(): void {
    this.profiles.clear();
    this.currentProfile = null;
    this.measurements = [];
    this.compatibilityMatrix = null;
  }

  // Private implementation methods

  private initialize(): void {
    // Create initial browser profile
    this.currentProfile = this.createBrowserProfile();
    this.profiles.set(this.currentProfile.id, this.currentProfile);

    // Set up viewport change tracking
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.trackViewportChange(window.innerWidth, window.innerHeight);
      });

      // Track orientation changes
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          this.trackViewportChange(window.innerWidth, window.innerHeight);
        }, 100);
      });
    }

    // Establish performance baselines
    this.establishBaselines();
  }

  private createBrowserProfile(): BrowserPerformanceProfile {
    const browser = this.detectBrowser();
    const capabilities = this.detectCapabilities();
    const id = this.generateBrowserId(browser, capabilities);

    return {
      id,
      browser,
      capabilities,
      performance: {
        averageResponseTime: 0,
        averageRenderTime: 16.67,
        averageInteractionLatency: 0,
        frameRate: 60,
        memoryEfficiency: 1,
        cacheHitRate: 0,
      },
      performanceScore: 50,
      compatibilityScore: this.calculateCompatibilityScore(capabilities),
      sampleSize: 0,
      lastUpdated: Date.now(),
      trends: {
        improving: 0,
        degrading: 0,
        stable: 1,
      },
    };
  }

  private detectBrowser(): BrowserInfo {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const platform = typeof navigator !== 'undefined' ? navigator.platform : '';

    // Browser detection logic
    let name = 'Unknown';
    let version = '0';
    let engine = 'Unknown';
    const engineVersion = '0';

    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      name = 'Chrome';
      const chromeMatch = userAgent.match(/Chrome\/([^\s]+)/);
      version = chromeMatch ? chromeMatch[1] : '0';
      engine = 'Blink';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const firefoxMatch = userAgent.match(/Firefox\/([^\s]+)/);
      version = firefoxMatch ? firefoxMatch[1] : '0';
      engine = 'Gecko';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'Safari';
      const safariMatch = userAgent.match(/Version\/([^\s]+)/);
      version = safariMatch ? safariMatch[1] : '0';
      engine = 'WebKit';
    } else if (userAgent.includes('Edg')) {
      name = 'Edge';
      const edgeMatch = userAgent.match(/Edg\/([^\s]+)/);
      version = edgeMatch ? edgeMatch[1] : '0';
      engine = 'Blink';
    }

    // OS detection
    let os = 'Unknown';
    const osVersion = '0';

    if (platform.includes('Win')) {
      os = 'Windows';
    } else if (platform.includes('Mac')) {
      os = 'macOS';
    } else if (platform.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    }

    // Device type detection
    const isMobile = /Mobi|Android/i.test(userAgent);
    const isTablet = /iPad|Tablet/i.test(userAgent);
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';

    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';

    const isTouch =
      typeof navigator !== 'undefined' &&
      'maxTouchPoints' in navigator &&
      navigator.maxTouchPoints > 0;

    return {
      name,
      version,
      engine,
      engineVersion,
      os,
      osVersion,
      deviceType,
      isMobile,
      isTouch,
      userAgent,
    };
  }

  private detectCapabilities(): DeviceCapabilities {
    const capabilities: DeviceCapabilities = {
      screen: {
        width: typeof screen !== 'undefined' ? screen.width : 1920,
        height: typeof screen !== 'undefined' ? screen.height : 1080,
        pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
        colorDepth: typeof screen !== 'undefined' ? screen.colorDepth : 24,
        orientation:
          typeof window !== 'undefined' && window.innerWidth > window.innerHeight
            ? 'landscape'
            : 'portrait',
      },
      viewport: {
        width: typeof window !== 'undefined' ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' ? window.innerHeight : 1080,
      },
      storage: {
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        indexedDB: typeof indexedDB !== 'undefined',
        webSQL: typeof (window as any).openDatabase !== 'undefined',
      },
      features: {
        webGL: this.detectWebGL(),
        webGL2: this.detectWebGL2(),
        serviceWorker: 'serviceWorker' in navigator,
        webAssembly: typeof WebAssembly !== 'undefined',
        performanceObserver: typeof PerformanceObserver !== 'undefined',
        intersectionObserver: typeof IntersectionObserver !== 'undefined',
        mutationObserver: typeof MutationObserver !== 'undefined',
        requestIdleCallback: typeof requestIdleCallback !== 'undefined',
        webWorkers: typeof Worker !== 'undefined',
        sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      },
    };

    // Memory information (Chrome-specific)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      capabilities.memory = {
        total: memory.totalJSHeapSize,
        used: memory.usedJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }

    // Network connection information
    if (typeof navigator !== 'undefined' && (navigator as any).connection) {
      const connection = (navigator as any).connection;
      capabilities.connection = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }

    // CPU information (limited availability)
    if (typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator) {
      capabilities.cpu = {
        cores: navigator.hardwareConcurrency,
      };
    }

    return capabilities;
  }

  private detectWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  private detectWebGL2(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch (e) {
      return false;
    }
  }

  private generateBrowserId(browser: BrowserInfo, capabilities: DeviceCapabilities): string {
    const components = [
      browser.name.toLowerCase(),
      browser.version.split('.')[0], // Major version only
      browser.deviceType,
      browser.os.toLowerCase(),
      capabilities.screen.width + 'x' + capabilities.screen.height,
    ];

    return components.join('_');
  }

  private updateProfilePerformance(profile: BrowserPerformanceProfile): void {
    const recentMeasurements = this.measurements
      .filter(m => m.browserId === profile.id)
      .slice(-100); // Last 100 measurements

    if (recentMeasurements.length === 0) return;

    // Calculate averages
    const avgResponseTime =
      recentMeasurements.reduce((sum, m) => sum + m.responseTime, 0) / recentMeasurements.length;
    const avgRenderTime =
      recentMeasurements.reduce((sum, m) => sum + m.renderTime, 0) / recentMeasurements.length;
    const avgInteractionLatency =
      recentMeasurements.reduce((sum, m) => sum + m.interactionLatency, 0) /
      recentMeasurements.length;

    // Update profile
    profile.performance.averageResponseTime = avgResponseTime;
    profile.performance.averageRenderTime = avgRenderTime;
    profile.performance.averageInteractionLatency = avgInteractionLatency;
    profile.performance.frameRate = avgRenderTime > 0 ? 1000 / avgRenderTime : 60;
    profile.sampleSize = recentMeasurements.length;
    profile.lastUpdated = Date.now();

    // Calculate performance score (0-100)
    profile.performanceScore = this.calculatePerformanceScore(profile.performance);
  }

  private calculatePerformanceScore(performance: BrowserPerformanceProfile['performance']): number {
    let score = 100;

    // Response time impact (max 30 points)
    if (performance.averageResponseTime > 100) {
      score -= Math.min(30, (performance.averageResponseTime - 100) / 10);
    }

    // Render time impact (max 25 points)
    if (performance.averageRenderTime > 16.67) {
      score -= Math.min(25, (performance.averageRenderTime - 16.67) * 2);
    }

    // Interaction latency impact (max 25 points)
    if (performance.averageInteractionLatency > 50) {
      score -= Math.min(25, (performance.averageInteractionLatency - 50) / 4);
    }

    // Frame rate impact (max 20 points)
    if (performance.frameRate < 60) {
      score -= Math.min(20, (60 - performance.frameRate) / 3);
    }

    return Math.max(0, Math.round(score));
  }

  private calculateCompatibilityScore(capabilities: DeviceCapabilities): number {
    const requiredFeatures = ['localStorage', 'performanceObserver'];
    const desiredFeatures = ['serviceWorker', 'webAssembly', 'webGL', 'intersectionObserver'];

    let score = 0;
    let totalWeight = 0;

    // Required features (70% weight)
    for (const feature of requiredFeatures) {
      const weight = 35; // 70% / 2 features
      if (this.isFeatureSupported(capabilities, feature)) {
        score += weight;
      }
      totalWeight += weight;
    }

    // Desired features (30% weight)
    for (const feature of desiredFeatures) {
      const weight = 7.5; // 30% / 4 features
      if (this.isFeatureSupported(capabilities, feature)) {
        score += weight;
      }
      totalWeight += weight;
    }

    return Math.round(score);
  }

  private isFeatureSupported(capabilities: DeviceCapabilities, feature: string): boolean {
    switch (feature) {
      case 'localStorage':
        return capabilities.storage.localStorage;
      case 'serviceWorker':
        return capabilities.features.serviceWorker;
      case 'webAssembly':
        return capabilities.features.webAssembly;
      case 'webGL':
        return capabilities.features.webGL;
      case 'performanceObserver':
        return capabilities.features.performanceObserver;
      case 'intersectionObserver':
        return capabilities.features.intersectionObserver;
      case 'requestIdleCallback':
        return capabilities.features.requestIdleCallback;
      case 'webWorkers':
        return capabilities.features.webWorkers;
      default:
        return false;
    }
  }

  private calculateAveragePerformance(
    profiles: BrowserPerformanceProfile[]
  ): BrowserPerformanceProfile['performance'] {
    if (profiles.length === 0) {
      return {
        averageResponseTime: 0,
        averageRenderTime: 16.67,
        averageInteractionLatency: 0,
        frameRate: 60,
        memoryEfficiency: 1,
        cacheHitRate: 0,
      };
    }

    const totals = profiles.reduce(
      (acc, profile) => ({
        averageResponseTime: acc.averageResponseTime + profile.performance.averageResponseTime,
        averageRenderTime: acc.averageRenderTime + profile.performance.averageRenderTime,
        averageInteractionLatency:
          acc.averageInteractionLatency + profile.performance.averageInteractionLatency,
        frameRate: acc.frameRate + profile.performance.frameRate,
        memoryEfficiency: acc.memoryEfficiency + profile.performance.memoryEfficiency,
        cacheHitRate: acc.cacheHitRate + profile.performance.cacheHitRate,
      }),
      {
        averageResponseTime: 0,
        averageRenderTime: 0,
        averageInteractionLatency: 0,
        frameRate: 0,
        memoryEfficiency: 0,
        cacheHitRate: 0,
      }
    );

    const count = profiles.length;
    return {
      averageResponseTime: totals.averageResponseTime / count,
      averageRenderTime: totals.averageRenderTime / count,
      averageInteractionLatency: totals.averageInteractionLatency / count,
      frameRate: totals.frameRate / count,
      memoryEfficiency: totals.memoryEfficiency / count,
      cacheHitRate: totals.cacheHitRate / count,
    };
  }

  private calculateRelativePerformance(
    performance: BrowserPerformanceProfile['performance'],
    average: BrowserPerformanceProfile['performance']
  ): number {
    // Calculate relative performance (1.0 = average, >1.0 = better than average)
    const responseTimeRatio =
      average.averageResponseTime > 0
        ? average.averageResponseTime / performance.averageResponseTime
        : 1;

    const renderTimeRatio =
      average.averageRenderTime > 0 ? average.averageRenderTime / performance.averageRenderTime : 1;

    const interactionLatencyRatio =
      average.averageInteractionLatency > 0
        ? average.averageInteractionLatency / performance.averageInteractionLatency
        : 1;

    const frameRateRatio = average.frameRate > 0 ? performance.frameRate / average.frameRate : 1;

    // Weighted average of ratios
    return (
      responseTimeRatio * 0.3 +
      renderTimeRatio * 0.25 +
      interactionLatencyRatio * 0.25 +
      frameRateRatio * 0.2
    );
  }

  private buildCompatibilityMatrix(): CompatibilityMatrix {
    const features: Record<string, Record<string, boolean>> = {};
    const benchmarks: Record<string, any> = {};
    const optimizations: Record<string, string[]> = {};
    const knownIssues: Record<string, any[]> = {};

    for (const profile of Array.from(this.profiles.values())) {
      const browserId = `${profile.browser.name}_${profile.browser.version.split('.')[0]}`;

      // Feature compatibility
      features[browserId] = {
        webGL: profile.capabilities.features.webGL,
        webGL2: profile.capabilities.features.webGL2,
        serviceWorker: profile.capabilities.features.serviceWorker,
        webAssembly: profile.capabilities.features.webAssembly,
        performanceObserver: profile.capabilities.features.performanceObserver,
        intersectionObserver: profile.capabilities.features.intersectionObserver,
        requestIdleCallback: profile.capabilities.features.requestIdleCallback,
      };

      // Performance benchmarks
      benchmarks[browserId] = {
        responseTime: profile.performance.averageResponseTime,
        renderTime: profile.performance.averageRenderTime,
        interactionLatency: profile.performance.averageInteractionLatency,
        score: profile.performanceScore,
      };

      // Generate recommendations
      optimizations[browserId] = this.generateOptimizationList(profile);
    }

    return {
      features,
      benchmarks,
      optimizations,
      knownIssues,
    };
  }

  private generateOptimizationList(profile: BrowserPerformanceProfile): string[] {
    const optimizations: string[] = [];
    const browser = profile.browser.name.toLowerCase();

    if (browser.includes('chrome')) {
      optimizations.push('Use requestAnimationFrame for smooth animations');
      optimizations.push('Enable HTTP/2 server push');
      optimizations.push('Use intersection observer for lazy loading');
    } else if (browser.includes('firefox')) {
      optimizations.push('Optimize for Firefox connection pooling');
      optimizations.push('Use will-change CSS property sparingly');
    } else if (browser.includes('safari')) {
      optimizations.push('Avoid transform3d for better compatibility');
      optimizations.push('Use -webkit- prefixes for newer features');
    }

    if (profile.browser.deviceType === 'mobile') {
      optimizations.push('Implement touch gesture optimization');
      optimizations.push('Use passive event listeners');
      optimizations.push('Minimize DOM manipulation frequency');
    }

    return optimizations;
  }

  private generateCompatibilityRecommendations(
    unsupportedFeatures: string[],
    profile: BrowserPerformanceProfile
  ): string[] {
    const recommendations: string[] = [];

    for (const feature of unsupportedFeatures) {
      switch (feature) {
        case 'serviceWorker':
          recommendations.push('Consider using AppCache as fallback for offline support');
          break;
        case 'intersectionObserver':
          recommendations.push('Use intersection-observer polyfill for scroll performance');
          break;
        case 'requestIdleCallback':
          recommendations.push('Use setTimeout as fallback for idle scheduling');
          break;
        case 'webGL':
          recommendations.push('Provide canvas 2D fallback for graphics rendering');
          break;
        case 'performanceObserver':
          recommendations.push('Use performance.now() for basic timing measurements');
          break;
      }
    }

    return recommendations;
  }

  private establishBaselines(): void {
    // Establish performance baselines for different browser categories
    this.performanceBaselines.set('desktop_chrome', 150);
    this.performanceBaselines.set('desktop_firefox', 180);
    this.performanceBaselines.set('desktop_safari', 200);
    this.performanceBaselines.set('mobile_chrome', 250);
    this.performanceBaselines.set('mobile_safari', 300);
    this.performanceBaselines.set('mobile_firefox', 280);
  }
}

/**
 * Global browser profiler instance
 */
export const browserProfiler = new BrowserProfiler();
