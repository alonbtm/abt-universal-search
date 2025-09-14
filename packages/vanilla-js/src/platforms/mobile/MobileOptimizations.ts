/**
 * MobileOptimizations - Performance and UX optimizations for mobile devices
 * Handles battery efficiency, network optimization, and responsive design
 */

export interface MobileOptimizationConfig {
  enableBatteryOptimization?: boolean;
  enableNetworkOptimization?: boolean;
  enablePerformanceOptimization?: boolean;
  enableResponsiveDesign?: boolean;
  targetFPS?: number;
  maxConcurrentRequests?: number;
  cacheStrategy?: 'aggressive' | 'balanced' | 'minimal';
  imageOptimization?: boolean;
}

export interface BatteryInfo {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

export interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface DeviceCapabilities {
  memory: number; // GB
  cores: number;
  maxTouchPoints: number;
  colorDepth: number;
  pixelRatio: number;
  screenResolution: { width: number; height: number };
}

export class MobileOptimizations {
  private config: Required<MobileOptimizationConfig>;
  private isMobile: boolean;
  private batteryInfo: BatteryInfo | null = null;
  private networkInfo: NetworkInfo | null = null;
  private deviceCapabilities: DeviceCapabilities | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor(config: MobileOptimizationConfig = {}) {
    this.config = {
      enableBatteryOptimization: config.enableBatteryOptimization ?? true,
      enableNetworkOptimization: config.enableNetworkOptimization ?? true,
      enablePerformanceOptimization: config.enablePerformanceOptimization ?? true,
      enableResponsiveDesign: config.enableResponsiveDesign ?? true,
      targetFPS: config.targetFPS || 60,
      maxConcurrentRequests: config.maxConcurrentRequests || 3,
      cacheStrategy: config.cacheStrategy || 'balanced',
      imageOptimization: config.imageOptimization ?? true,
      ...config
    };

    this.isMobile = this.detectMobileDevice();

    if (this.isMobile) {
      this.init();
    }
  }

  /**
   * Initialize mobile optimizations
   */
  private async init(): Promise<void> {
    await Promise.all([
      this.initBatteryAPI(),
      this.initNetworkAPI(),
      this.initDeviceCapabilities()
    ]);

    if (this.config.enablePerformanceOptimization) {
      this.setupPerformanceMonitoring();
    }

    if (this.config.enableResponsiveDesign) {
      this.setupResponsiveDesign();
    }

    console.log('[MobileOptimizations] Initialized for mobile device');
  }

  /**
   * Check if device is mobile
   */
  isMobileDevice(): boolean {
    return this.isMobile;
  }

  /**
   * Get current battery information
   */
  getBatteryInfo(): BatteryInfo | null {
    return this.batteryInfo;
  }

  /**
   * Get current network information
   */
  getNetworkInfo(): NetworkInfo | null {
    return this.networkInfo;
  }

  /**
   * Get device capabilities
   */
  getDeviceCapabilities(): DeviceCapabilities | null {
    return this.deviceCapabilities;
  }

  /**
   * Optimize search request based on current conditions
   */
  async optimizeSearchRequest(
    requestFn: () => Promise<any>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<any> {
    // Battery optimization
    if (this.config.enableBatteryOptimization && this.batteryInfo) {
      if (!this.batteryInfo.charging && this.batteryInfo.level < 0.2) {
        console.warn('[MobileOptimizations] Low battery, deferring non-critical requests');
        if (priority === 'low') {
          return null; // Skip low priority requests when battery is low
        }
      }
    }

    // Network optimization
    if (this.config.enableNetworkOptimization && this.networkInfo) {
      if (this.networkInfo.saveData || this.networkInfo.effectiveType === 'slow-2g') {
        return this.optimizeForSlowNetwork(requestFn);
      }
    }

    // Queue management for performance
    if (this.requestQueue.length >= this.config.maxConcurrentRequests) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push(async () => {
          try {
            const result = await requestFn();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
        this.processRequestQueue();
      });
    }

    return requestFn();
  }

  /**
   * Optimize images for mobile display
   */
  optimizeImage(imgElement: HTMLImageElement): void {
    if (!this.config.imageOptimization) {
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    const containerWidth = imgElement.clientWidth;

    // Calculate optimal image size
    const optimalWidth = Math.ceil(containerWidth * devicePixelRatio);

    // Lazy loading
    if ('loading' in HTMLImageElement.prototype) {
      imgElement.loading = 'lazy';
    } else {
      this.setupLazyLoading(imgElement);
    }

    // Responsive images
    if (imgElement.srcset) {
      // Already has srcset, optimize it
      this.optimizeSrcset(imgElement, optimalWidth);
    }

    // WebP support
    if (this.supportsWebP()) {
      const originalSrc = imgElement.src;
      if (!originalSrc.includes('.webp')) {
        imgElement.src = originalSrc.replace(/\.(jpe?g|png)$/i, '.webp');
        imgElement.onerror = () => {
          imgElement.src = originalSrc; // Fallback to original
        };
      }
    }
  }

  /**
   * Optimize DOM operations for mobile performance
   */
  batchDOMOperations(operations: Array<() => void>): void {
    if (operations.length === 0) return;

    // Use requestAnimationFrame to batch DOM operations
    requestAnimationFrame(() => {
      const startTime = performance.now();
      let operationIndex = 0;

      const processBatch = () => {
        const batchStartTime = performance.now();
        const frameTime = 1000 / this.config.targetFPS;

        while (
          operationIndex < operations.length &&
          (performance.now() - batchStartTime) < frameTime * 0.8
        ) {
          try {
            operations[operationIndex]();
          } catch (error) {
            console.error('[MobileOptimizations] DOM operation failed:', error);
          }
          operationIndex++;
        }

        if (operationIndex < operations.length) {
          requestAnimationFrame(processBatch);
        } else {
          const totalTime = performance.now() - startTime;
          console.log(`[MobileOptimizations] Batched ${operations.length} DOM operations in ${totalTime.toFixed(2)}ms`);
        }
      };

      processBatch();
    });
  }

  /**
   * Create responsive search results layout
   */
  createResponsiveResultsLayout(results: any[]): HTMLElement {
    const container = document.createElement('div');
    container.className = 'mobile-search-results';

    // Determine layout based on screen size and device capabilities
    const screenWidth = window.innerWidth;
    const isSmallScreen = screenWidth < 480;
    const isMediumScreen = screenWidth >= 480 && screenWidth < 768;

    let columnsClass = 'results-single-column';
    if (!isSmallScreen && this.deviceCapabilities?.memory && this.deviceCapabilities.memory > 2) {
      columnsClass = isMediumScreen ? 'results-two-columns' : 'results-three-columns';
    }

    container.classList.add(columnsClass);

    // Create result items with progressive loading
    const itemsPerBatch = isSmallScreen ? 5 : 10;
    let currentBatch = 0;

    const loadBatch = () => {
      const startIndex = currentBatch * itemsPerBatch;
      const endIndex = Math.min(startIndex + itemsPerBatch, results.length);
      const batchOperations: Array<() => void> = [];

      for (let i = startIndex; i < endIndex; i++) {
        const result = results[i];
        batchOperations.push(() => {
          const item = this.createResultItem(result, i);
          container.appendChild(item);
        });
      }

      this.batchDOMOperations(batchOperations);

      currentBatch++;
      if (endIndex < results.length) {
        // Load next batch after a small delay
        setTimeout(loadBatch, 16);
      }
    };

    loadBatch();

    return container;
  }

  /**
   * Optimize search input for mobile keyboards
   */
  optimizeSearchInput(input: HTMLInputElement): void {
    // Prevent zoom on focus (iOS)
    input.style.fontSize = '16px';

    // Optimize input type and attributes
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');

    // Add mobile-specific enhancements
    input.setAttribute('enterkeyhint', 'search');
    input.setAttribute('inputmode', 'search');

    // Handle virtual keyboard
    let initialViewportHeight = window.visualViewport?.height || window.innerHeight;

    const handleViewportChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDiff = initialViewportHeight - currentHeight;

      if (heightDiff > 150) { // Virtual keyboard is likely shown
        document.body.style.setProperty('--keyboard-height', `${heightDiff}px`);
        document.body.classList.add('keyboard-visible');
      } else {
        document.body.style.removeProperty('--keyboard-height');
        document.body.classList.remove('keyboard-visible');
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    } else {
      window.addEventListener('resize', handleViewportChange);
    }

    // Scroll input into view when focused
    input.addEventListener('focus', () => {
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
  }

  /**
   * Get optimal cache strategy based on device conditions
   */
  getCacheStrategy(): 'aggressive' | 'balanced' | 'minimal' {
    if (!this.batteryInfo || !this.networkInfo || !this.deviceCapabilities) {
      return this.config.cacheStrategy;
    }

    // Low battery or limited memory - use minimal caching
    if ((!this.batteryInfo.charging && this.batteryInfo.level < 0.3) ||
        this.deviceCapabilities.memory < 2) {
      return 'minimal';
    }

    // Slow network - use aggressive caching
    if (this.networkInfo.saveData ||
        this.networkInfo.effectiveType === 'slow-2g' ||
        this.networkInfo.effectiveType === '2g') {
      return 'aggressive';
    }

    return 'balanced';
  }

  /**
   * Initialize battery API
   */
  private async initBatteryAPI(): Promise<void> {
    if (!this.config.enableBatteryOptimization) {
      return;
    }

    try {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        this.batteryInfo = {
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          level: battery.level
        };

        // Listen for battery changes
        battery.addEventListener('chargingchange', this.updateBatteryInfo.bind(this, battery));
        battery.addEventListener('levelchange', this.updateBatteryInfo.bind(this, battery));
      }
    } catch (error) {
      console.warn('[MobileOptimizations] Battery API not available:', error);
    }
  }

  /**
   * Initialize network API
   */
  private initNetworkAPI(): void {
    if (!this.config.enableNetworkOptimization) {
      return;
    }

    try {
      const connection = (navigator as any).connection ||
                        (navigator as any).mozConnection ||
                        (navigator as any).webkitConnection;

      if (connection) {
        this.networkInfo = {
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 50,
          saveData: connection.saveData || false
        };

        // Listen for network changes
        connection.addEventListener('change', () => {
          this.updateNetworkInfo(connection);
        });
      }
    } catch (error) {
      console.warn('[MobileOptimizations] Network API not available:', error);
    }
  }

  /**
   * Initialize device capabilities detection
   */
  private initDeviceCapabilities(): void {
    try {
      this.deviceCapabilities = {
        memory: (navigator as any).deviceMemory || 4, // Default to 4GB
        cores: navigator.hardwareConcurrency || 4,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        colorDepth: screen.colorDepth || 24,
        pixelRatio: window.devicePixelRatio || 1,
        screenResolution: {
          width: screen.width,
          height: screen.height
        }
      };
    } catch (error) {
      console.warn('[MobileOptimizations] Device capabilities detection failed:', error);
    }
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if (!window.PerformanceObserver) {
      return;
    }

    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      entries.forEach(entry => {
        if (entry.entryType === 'measure' && entry.name.includes('universal-search')) {
          // Log performance metrics for search operations
          console.log(`[MobileOptimizations] ${entry.name}: ${entry.duration.toFixed(2)}ms`);

          // Adjust behavior based on performance
          if (entry.duration > 100) {
            console.warn('[MobileOptimizations] Slow operation detected, optimizing...');
            this.adjustPerformanceSettings();
          }
        }
      });
    });

    this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
  }

  /**
   * Setup responsive design optimizations
   */
  private setupResponsiveDesign(): void {
    if (!this.config.enableResponsiveDesign) {
      return;
    }

    // Inject responsive CSS
    this.injectResponsiveStyles();

    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100);
    });

    // Handle resize events
    let resizeTimeout: number;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        this.handleResize();
      }, 250);
    });
  }

  /**
   * Update battery information
   */
  private updateBatteryInfo(battery: any): void {
    if (this.batteryInfo) {
      this.batteryInfo.charging = battery.charging;
      this.batteryInfo.chargingTime = battery.chargingTime;
      this.batteryInfo.dischargingTime = battery.dischargingTime;
      this.batteryInfo.level = battery.level;
    }
  }

  /**
   * Update network information
   */
  private updateNetworkInfo(connection: any): void {
    if (this.networkInfo) {
      this.networkInfo.effectiveType = connection.effectiveType;
      this.networkInfo.downlink = connection.downlink;
      this.networkInfo.rtt = connection.rtt;
      this.networkInfo.saveData = connection.saveData;
    }
  }

  /**
   * Optimize for slow network conditions
   */
  private async optimizeForSlowNetwork(requestFn: () => Promise<any>): Promise<any> {
    console.log('[MobileOptimizations] Optimizing for slow network');

    // Add longer timeout for slow networks
    const timeoutMs = this.networkInfo?.effectiveType === 'slow-2g' ? 10000 : 5000;

    return Promise.race([
      requestFn(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
      })
    ]);
  }

  /**
   * Process request queue
   */
  private async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('[MobileOptimizations] Queued request failed:', error);
        }
      }

      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessingQueue = false;
  }

  /**
   * Setup lazy loading for images
   */
  private setupLazyLoading(img: HTMLImageElement): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const imgElement = entry.target as HTMLImageElement;
          if (imgElement.dataset.src) {
            imgElement.src = imgElement.dataset.src;
            imgElement.removeAttribute('data-src');
          }
          observer.unobserve(imgElement);
        }
      });
    }, { rootMargin: '50px' });

    // Move src to data-src for lazy loading
    if (img.src) {
      img.dataset.src = img.src;
      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+';
    }

    observer.observe(img);
  }

  /**
   * Optimize srcset for device
   */
  private optimizeSrcset(img: HTMLImageElement, optimalWidth: number): void {
    // This is a simplified version - in production, you'd want more sophisticated logic
    const srcset = img.srcset;
    const sources = srcset.split(',').map(s => s.trim());

    // Find the best match for optimal width
    let bestSource = sources[0];
    let bestDiff = Infinity;

    sources.forEach(source => {
      const match = source.match(/(\d+)w$/);
      if (match) {
        const width = parseInt(match[1]);
        const diff = Math.abs(width - optimalWidth);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestSource = source;
        }
      }
    });

    // Use the best matching source
    if (bestSource) {
      img.src = bestSource.split(' ')[0];
    }
  }

  /**
   * Check WebP support
   */
  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('webp') !== -1;
  }

  /**
   * Create a result item element
   */
  private createResultItem(result: any, index: number): HTMLElement {
    const item = document.createElement('div');
    item.className = 'mobile-result-item';
    item.setAttribute('data-index', index.toString());

    item.innerHTML = `
      <div class="result-content">
        <h3 class="result-title">${this.escapeHtml(result.title || 'Untitled')}</h3>
        <p class="result-description">${this.escapeHtml(result.description || '')}</p>
        ${result.url ? `<span class="result-url">${this.escapeHtml(result.url)}</span>` : ''}
      </div>
    `;

    return item;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Adjust performance settings based on metrics
   */
  private adjustPerformanceSettings(): void {
    // Reduce animation frame rate
    this.config.targetFPS = Math.max(30, this.config.targetFPS - 10);

    // Reduce concurrent requests
    this.config.maxConcurrentRequests = Math.max(1, this.config.maxConcurrentRequests - 1);

    console.log(`[MobileOptimizations] Adjusted settings: ${this.config.targetFPS}fps, ${this.config.maxConcurrentRequests} concurrent requests`);
  }

  /**
   * Handle orientation changes
   */
  private handleOrientationChange(): void {
    // Update viewport height for mobile browsers
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    // Refresh responsive elements
    this.refreshResponsiveElements();
  }

  /**
   * Handle resize events
   */
  private handleResize(): void {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  /**
   * Refresh responsive elements
   */
  private refreshResponsiveElements(): void {
    const responsiveElements = document.querySelectorAll('.mobile-search-results');
    responsiveElements.forEach(element => {
      const screenWidth = window.innerWidth;
      const isSmallScreen = screenWidth < 480;
      const isMediumScreen = screenWidth >= 480 && screenWidth < 768;

      element.classList.remove('results-single-column', 'results-two-columns', 'results-three-columns');

      if (isSmallScreen || !this.deviceCapabilities?.memory || this.deviceCapabilities.memory <= 2) {
        element.classList.add('results-single-column');
      } else if (isMediumScreen) {
        element.classList.add('results-two-columns');
      } else {
        element.classList.add('results-three-columns');
      }
    });
  }

  /**
   * Inject responsive CSS styles
   */
  private injectResponsiveStyles(): void {
    if (document.getElementById('mobile-optimization-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'mobile-optimization-styles';
    styles.textContent = `
      :root {
        --vh: 1vh;
      }

      .mobile-search-results {
        display: grid;
        gap: 12px;
        padding: 16px;
      }

      .results-single-column {
        grid-template-columns: 1fr;
      }

      .results-two-columns {
        grid-template-columns: repeat(2, 1fr);
      }

      .results-three-columns {
        grid-template-columns: repeat(3, 1fr);
      }

      .mobile-result-item {
        background: white;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .mobile-result-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      }

      .mobile-result-item:active {
        transform: translateY(0);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
      }

      .result-title {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        line-height: 1.4;
      }

      .result-description {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #6b7280;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .result-url {
        font-size: 12px;
        color: #2563eb;
        text-decoration: none;
        word-break: break-all;
      }

      .keyboard-visible {
        padding-bottom: var(--keyboard-height, 0px);
      }

      @media (max-width: 480px) {
        .mobile-search-results {
          padding: 8px;
          gap: 8px;
        }

        .mobile-result-item {
          padding: 12px;
        }

        .result-title {
          font-size: 15px;
        }

        .result-description {
          font-size: 13px;
          -webkit-line-clamp: 2;
        }

        .results-two-columns,
        .results-three-columns {
          grid-template-columns: 1fr;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .mobile-result-item {
          transition: none;
        }

        .mobile-result-item:hover {
          transform: none;
        }
      }

      @media (max-height: 600px) {
        .mobile-search-results {
          padding: 4px;
          gap: 4px;
        }

        .mobile-result-item {
          padding: 8px;
        }

        .result-description {
          -webkit-line-clamp: 1;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Detect mobile device
   */
  private detectMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && 'ontouchstart' in window);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    this.requestQueue = [];
    this.batteryInfo = null;
    this.networkInfo = null;
    this.deviceCapabilities = null;

    // Remove injected styles
    const styles = document.getElementById('mobile-optimization-styles');
    if (styles) {
      styles.remove();
    }
  }
}