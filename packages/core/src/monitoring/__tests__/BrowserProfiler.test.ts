/**
 * Browser Profiler Tests
 * @description Comprehensive tests for cross-browser and device performance tracking
 */

import { BrowserProfiler } from '../BrowserProfiler';

describe('BrowserProfiler', () => {
  let profiler: BrowserProfiler;

  beforeEach(() => {
    profiler = new BrowserProfiler();

    // Mock navigator and other browser APIs
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        platform: 'Win32',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        connection: {
          effectiveType: '4g',
          downlink: 10
        }
      },
      writable: true
    });

    Object.defineProperty(global, 'screen', {
      value: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1080,
        colorDepth: 24,
        pixelDepth: 24
      },
      writable: true
    });

    Object.defineProperty(global, 'window', {
      value: {
        innerWidth: 1920,
        innerHeight: 1080,
        devicePixelRatio: 1,
        performance: {
          memory: {
            usedJSHeapSize: 10000000,
            totalJSHeapSize: 20000000,
            jsHeapSizeLimit: 100000000
          }
        }
      },
      writable: true
    });
  });

  afterEach(() => {
    profiler.cleanup();
    jest.clearAllMocks();
  });

  describe('browser detection', () => {
    test('should detect Chrome browser correctly', () => {
      const browserInfo = profiler.getBrowserInfo();
      
      expect(browserInfo.name).toBe('Chrome');
      expect(browserInfo.engine).toBe('Blink');
      expect(browserInfo.version).toMatch(/91\./);
      expect(browserInfo.os).toBe('Windows');
    });

    test('should detect Safari browser correctly', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
          platform: 'MacIntel'
        },
        writable: true
      });

      const profiler2 = new BrowserProfiler();
      const browserInfo = profiler2.getBrowserInfo();
      
      expect(browserInfo.name).toBe('Safari');
      expect(browserInfo.engine).toBe('WebKit');
      expect(browserInfo.os).toBe('macOS');
    });

    test('should detect Firefox browser correctly', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
          platform: 'Win32'
        },
        writable: true
      });

      const profiler3 = new BrowserProfiler();
      const browserInfo = profiler3.getBrowserInfo();
      
      expect(browserInfo.name).toBe('Firefox');
      expect(browserInfo.engine).toBe('Gecko');
      expect(browserInfo.version).toMatch(/89\./);
    });
  });

  describe('device capabilities', () => {
    test('should detect device capabilities correctly', () => {
      const capabilities = profiler.getDeviceCapabilities();
      
      expect(capabilities.screen.width).toBe(1920);
      expect(capabilities.screen.height).toBe(1080);
      expect(capabilities.screen.pixelRatio).toBe(1);
      expect(capabilities.hardware.cores).toBe(8);
      expect(capabilities.hardware.memory).toBe(8);
      expect(capabilities.network.effectiveType).toBe('4g');
    });

    test('should handle missing device capabilities gracefully', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Limited Browser/1.0'
        },
        writable: true
      });

      const profilerLimited = new BrowserProfiler();
      const capabilities = profilerLimited.getDeviceCapabilities();
      
      expect(capabilities).toBeDefined();
      expect(capabilities.hardware.cores).toBeGreaterThan(0);
    });

    test('should detect touch devices correctly', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
          platform: 'iPhone',
          maxTouchPoints: 5
        },
        writable: true
      });

      const mobileProfiler = new BrowserProfiler();
      const browserInfo = mobileProfiler.getBrowserInfo();
      
      expect(browserInfo.deviceType).toBe('mobile');
      expect(browserInfo.isTouch).toBe(true);
      expect(browserInfo.isMobile).toBe(true);
    });
  });

  describe('performance correlation', () => {
    test('should correlate performance with device capabilities', async () => {
      const performanceData = {
        responseTime: 150,
        renderTime: 20,
        interactionLatency: 50,
        frameRate: 58
      };

      profiler.recordPerformance(performanceData);
      
      const correlation = await profiler.getPerformanceCorrelation();
      
      expect(correlation).toBeDefined();
      expect(correlation.deviceScore).toBeGreaterThan(0);
      expect(correlation.browserScore).toBeGreaterThan(0);
    });

    test('should track viewport size changes', () => {
      const initialViewport = profiler.getViewportInfo();
      expect(initialViewport.width).toBe(1920);
      expect(initialViewport.height).toBe(1080);

      // Simulate viewport change
      Object.defineProperty(global, 'window', {
        value: {
          ...global.window,
          innerWidth: 1366,
          innerHeight: 768
        },
        writable: true
      });

      profiler.updateViewportInfo();
      const updatedViewport = profiler.getViewportInfo();
      expect(updatedViewport.width).toBe(1366);
      expect(updatedViewport.height).toBe(768);
    });

    test('should track interaction methods', () => {
      profiler.recordInteraction('mouse', 'click', 25);
      profiler.recordInteraction('keyboard', 'keypress', 15);
      profiler.recordInteraction('touch', 'tap', 35);

      const interactionStats = profiler.getInteractionStats();
      
      expect(interactionStats.mouse.averageLatency).toBe(25);
      expect(interactionStats.keyboard.averageLatency).toBe(15);
      expect(interactionStats.touch.averageLatency).toBe(35);
    });
  });

  describe('compatibility scoring', () => {
    test('should generate compatibility score for modern browsers', () => {
      const compatibilityScore = profiler.getBrowserCompatibilityScore();
      
      expect(compatibilityScore.overall).toBeGreaterThan(0.8);
      expect(compatibilityScore.features.es6).toBe(true);
      expect(compatibilityScore.features.webgl).toBe(true);
      expect(compatibilityScore.features.serviceWorker).toBe(true);
    });

    test('should provide optimization recommendations', () => {
      const lowEndDevice = {
        hardware: { cores: 2, memory: 2 },
        network: { effectiveType: '3g' }
      };

      const recommendations = profiler.getOptimizationRecommendations(lowEndDevice);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('reduce'))).toBe(true);
    });

    test('should track performance across different browsers', async () => {
      const browsers = [
        {
          name: 'Chrome',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0',
          performance: { responseTime: 100, renderTime: 16 }
        },
        {
          name: 'Firefox',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
          performance: { responseTime: 120, renderTime: 18 }
        },
        {
          name: 'Safari',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
          performance: { responseTime: 110, renderTime: 17 }
        }
      ];

      browsers.forEach(browser => {
        profiler.recordBrowserPerformance(browser.name, browser.performance);
      });

      const comparison = await profiler.getBrowserPerformanceComparison();
      
      expect(comparison.Chrome.averageResponseTime).toBe(100);
      expect(comparison.Firefox.averageResponseTime).toBe(120);
      expect(comparison.Safari.averageResponseTime).toBe(110);
    });
  });

  describe('memory and performance monitoring', () => {
    test('should monitor memory usage patterns', () => {
      const memoryInfo = profiler.getMemoryInfo();
      
      expect(memoryInfo.used).toBe(10000000);
      expect(memoryInfo.total).toBe(20000000);
      expect(memoryInfo.limit).toBe(100000000);
      expect(memoryInfo.usagePercentage).toBe(50);
    });

    test('should detect performance bottlenecks', async () => {
      const performanceData = {
        responseTime: 2000, // Slow response
        renderTime: 100,    // Slow rendering
        interactionLatency: 500 // Slow interactions
      };

      profiler.recordPerformance(performanceData);
      
      const bottlenecks = await profiler.detectBottlenecks();
      
      expect(bottlenecks.length).toBeGreaterThan(0);
      expect(bottlenecks.some(b => b.type === 'slow_response')).toBe(true);
      expect(bottlenecks.some(b => b.type === 'slow_rendering')).toBe(true);
    });
  });

  describe('real-time monitoring', () => {
    test('should start and stop real-time monitoring', () => {
      const startSpy = jest.spyOn(profiler, 'startRealTimeMonitoring');
      const stopSpy = jest.spyOn(profiler, 'stopRealTimeMonitoring');

      profiler.startRealTimeMonitoring();
      expect(startSpy).toHaveBeenCalled();

      profiler.stopRealTimeMonitoring();
      expect(stopSpy).toHaveBeenCalled();
    });

    test('should emit performance events in real-time', (done) => {
      profiler.on('performance-change', (data) => {
        expect(data).toBeDefined();
        expect(data.timestamp).toBeDefined();
        done();
      });

      profiler.startRealTimeMonitoring();
      
      // Simulate performance change
      profiler.recordPerformance({
        responseTime: 200,
        renderTime: 20,
        interactionLatency: 30
      });
    });
  });
});