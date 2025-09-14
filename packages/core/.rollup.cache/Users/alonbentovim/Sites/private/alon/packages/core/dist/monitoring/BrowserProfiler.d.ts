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
    benchmarks: Record<string, {
        responseTime: number;
        renderTime: number;
        interactionLatency: number;
        score: number;
    }>;
    /** Recommended optimizations by browser */
    optimizations: Record<string, string[]>;
    /** Known issues by browser */
    knownIssues: Record<string, Array<{
        description: string;
        severity: 'low' | 'medium' | 'high';
        workaround?: string;
    }>>;
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
export declare class BrowserProfiler {
    private profiles;
    private currentProfile;
    private compatibilityMatrix;
    private measurements;
    private performanceBaselines;
    constructor();
    /**
     * Get current browser profile
     */
    getCurrentProfile(): BrowserPerformanceProfile;
    /**
     * Record performance measurement
     */
    recordPerformanceMeasurement(responseTime: number, renderTime?: number, interactionLatency?: number, memoryUsage?: number): void;
    /**
     * Get performance comparison across browsers
     */
    getPerformanceComparison(): Record<string, {
        browser: string;
        version: string;
        performance: BrowserPerformanceProfile['performance'];
        relativePerformance: number;
    }>;
    /**
     * Generate browser-specific recommendations
     */
    generateRecommendations(browserId?: string): BrowserRecommendation[];
    /**
     * Get compatibility matrix
     */
    getCompatibilityMatrix(): CompatibilityMatrix;
    /**
     * Check browser compatibility score
     */
    getBrowserCompatibilityScore(browserId?: string): {
        score: number;
        supportedFeatures: string[];
        unsupportedFeatures: string[];
        recommendations: string[];
    };
    /**
     * Track viewport change
     */
    trackViewportChange(width: number, height: number): void;
    /**
     * Clear all profiles
     */
    clearProfiles(): void;
    private initialize;
    private createBrowserProfile;
    private detectBrowser;
    private detectCapabilities;
    private detectWebGL;
    private detectWebGL2;
    private generateBrowserId;
    private updateProfilePerformance;
    private calculatePerformanceScore;
    private calculateCompatibilityScore;
    private isFeatureSupported;
    private calculateAveragePerformance;
    private calculateRelativePerformance;
    private buildCompatibilityMatrix;
    private generateOptimizationList;
    private generateCompatibilityRecommendations;
    private establishBaselines;
}
/**
 * Global browser profiler instance
 */
export declare const browserProfiler: BrowserProfiler;
//# sourceMappingURL=BrowserProfiler.d.ts.map