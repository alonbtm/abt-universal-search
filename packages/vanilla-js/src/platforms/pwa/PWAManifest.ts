/**
 * PWAManifest - PWA manifest integration and installation support
 * Handles PWA installation prompts and manifest configuration
 */

export interface PWAManifestConfig {
  name: string;
  shortName?: string;
  description?: string;
  themeColor?: string;
  backgroundColor?: string;
  icons?: PWAIcon[];
  enableInstallPrompt?: boolean;
  customInstallPrompt?: boolean;
  installPromptDelay?: number; // ms
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type?: string;
  purpose?: 'any' | 'maskable' | 'monochrome';
}

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{outcome: 'accepted' | 'dismissed'}>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}

export class PWAManifest {
  private config: Required<PWAManifestConfig>;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled: boolean = false;
  private installPromptShown: boolean = false;

  constructor(config: PWAManifestConfig) {
    this.config = {
      name: 'Universal Search',
      shortName: config.shortName || 'Search',
      description: config.description || 'Universal Search Component',
      themeColor: config.themeColor || '#2563eb',
      backgroundColor: config.backgroundColor || '#ffffff',
      icons: config.icons || this.getDefaultIcons(),
      enableInstallPrompt: config.enableInstallPrompt ?? true,
      customInstallPrompt: config.customInstallPrompt ?? true,
      installPromptDelay: config.installPromptDelay || 30000, // 30 seconds
      ...config
    };

    this.init();
  }

  /**
   * Initialize PWA manifest integration
   */
  private init(): void {
    this.detectInstallState();
    this.setupEventListeners();
    this.injectManifestLink();

    if (this.config.enableInstallPrompt) {
      this.setupInstallPrompt();
    }
  }

  /**
   * Check if app is installed as PWA
   */
  isAppInstalled(): boolean {
    return this.isInstalled;
  }

  /**
   * Check if running in standalone mode (PWA)
   */
  isStandalone(): boolean {
    return window.navigator.standalone === true ||
           window.matchMedia('(display-mode: standalone)').matches;
  }

  /**
   * Check if app can be installed
   */
  canInstall(): boolean {
    return !!this.deferredPrompt && !this.isInstalled;
  }

  /**
   * Show install prompt
   */
  async showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'not-available'> {
    if (!this.deferredPrompt) {
      return 'not-available';
    }

    try {
      const result = await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;

      this.deferredPrompt = null;
      this.installPromptShown = true;

      console.log(`[PWAManifest] Install prompt ${choice.outcome}`);
      return choice.outcome;
    } catch (error) {
      console.error('[PWAManifest] Error showing install prompt:', error);
      return 'not-available';
    }
  }

  /**
   * Create custom install prompt UI
   */
  createCustomInstallPrompt(): HTMLElement | null {
    if (!this.config.customInstallPrompt || !this.canInstall()) {
      return null;
    }

    const promptContainer = document.createElement('div');
    promptContainer.className = 'universal-search-install-prompt';
    promptContainer.innerHTML = `
      <div class="install-prompt-content">
        <div class="install-prompt-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8V16" stroke="currentColor" stroke-width="2"/>
            <path d="M8 12L12 16L16 12" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="install-prompt-text">
          <h3>Install ${this.config.name}</h3>
          <p>Add to your home screen for quick access and offline search.</p>
        </div>
        <div class="install-prompt-actions">
          <button class="install-prompt-dismiss">Maybe Later</button>
          <button class="install-prompt-install">Install</button>
        </div>
      </div>
    `;

    // Add styles
    this.injectInstallPromptStyles();

    // Add event listeners
    const installButton = promptContainer.querySelector('.install-prompt-install') as HTMLButtonElement;
    const dismissButton = promptContainer.querySelector('.install-prompt-dismiss') as HTMLButtonElement;

    installButton?.addEventListener('click', async () => {
      const result = await this.showInstallPrompt();
      if (result !== 'not-available') {
        promptContainer.remove();
      }
    });

    dismissButton?.addEventListener('click', () => {
      promptContainer.remove();
      this.installPromptShown = true;
    });

    return promptContainer;
  }

  /**
   * Generate PWA manifest JSON
   */
  generateManifest(): any {
    return {
      name: this.config.name,
      short_name: this.config.shortName,
      description: this.config.description,
      start_url: '/',
      display: 'standalone',
      orientation: 'any',
      theme_color: this.config.themeColor,
      background_color: this.config.backgroundColor,
      scope: '/',
      icons: this.config.icons.map(icon => ({
        src: icon.src,
        sizes: icon.sizes,
        type: icon.type || 'image/png',
        purpose: icon.purpose || 'any'
      })),
      categories: ['productivity', 'utilities'],
      shortcuts: [
        {
          name: 'Quick Search',
          short_name: 'Search',
          description: 'Start a new search',
          url: '/?action=search',
          icons: this.config.icons.slice(0, 1)
        }
      ],
      features: [
        'Cross-platform',
        'Offline capable',
        'Fast search',
        'Progressive enhancement'
      ]
    };
  }

  /**
   * Update manifest dynamically
   */
  updateManifest(updates: Partial<PWAManifestConfig>): void {
    Object.assign(this.config, updates);
    this.injectManifestLink();
  }

  /**
   * Track installation analytics
   */
  trackInstallEvent(event: 'prompt-shown' | 'install-accepted' | 'install-dismissed'): void {
    // This would integrate with your analytics system
    console.log(`[PWAManifest] Install event: ${event}`);

    // Custom event for analytics integration
    window.dispatchEvent(new CustomEvent('pwa-install-event', {
      detail: { event, timestamp: Date.now() }
    }));
  }

  /**
   * Get default icons if none provided
   */
  private getDefaultIcons(): PWAIcon[] {
    return [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png'
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png'
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png'
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png'
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png'
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ];
  }

  /**
   * Detect current installation state
   */
  private detectInstallState(): void {
    this.isInstalled = this.isStandalone();

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      console.log('[PWAManifest] App installed successfully');
      this.trackInstallEvent('install-accepted');
    });
  }

  /**
   * Setup event listeners for PWA events
   */
  private setupEventListeners(): void {
    // Before install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      console.log('[PWAManifest] Install prompt available');

      if (this.config.enableInstallPrompt && !this.installPromptShown) {
        this.scheduleInstallPrompt();
      }
    });

    // App installed event
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isInstalled = true;
    });
  }

  /**
   * Schedule install prompt to show after delay
   */
  private scheduleInstallPrompt(): void {
    setTimeout(() => {
      if (!this.installPromptShown && this.canInstall()) {
        if (this.config.customInstallPrompt) {
          this.showCustomInstallPrompt();
        } else {
          this.showInstallPrompt();
        }
      }
    }, this.config.installPromptDelay);
  }

  /**
   * Show custom install prompt
   */
  private showCustomInstallPrompt(): void {
    const prompt = this.createCustomInstallPrompt();
    if (prompt) {
      document.body.appendChild(prompt);
      this.trackInstallEvent('prompt-shown');
    }
  }

  /**
   * Inject manifest link into document head
   */
  private injectManifestLink(): void {
    // Remove existing manifest link
    const existingLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (existingLink) {
      existingLink.remove();
    }

    // Create manifest blob URL
    const manifestBlob = new Blob([JSON.stringify(this.generateManifest(), null, 2)], {
      type: 'application/json'
    });
    const manifestUrl = URL.createObjectURL(manifestBlob);

    // Create and inject new manifest link
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestUrl;
    document.head.appendChild(link);

    // Also inject theme color meta tag
    let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = this.config.themeColor;
  }

  /**
   * Inject CSS styles for install prompt
   */
  private injectInstallPromptStyles(): void {
    if (document.getElementById('universal-search-install-prompt-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'universal-search-install-prompt-styles';
    styles.textContent = `
      .universal-search-install-prompt {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        padding: 0;
        z-index: 10000;
        max-width: 400px;
        width: calc(100% - 40px);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideUp 0.3s ease-out;
      }

      .install-prompt-content {
        display: flex;
        align-items: center;
        padding: 16px;
        gap: 12px;
      }

      .install-prompt-icon {
        color: ${this.config.themeColor};
        flex-shrink: 0;
      }

      .install-prompt-text {
        flex: 1;
        min-width: 0;
      }

      .install-prompt-text h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
      }

      .install-prompt-text p {
        margin: 0;
        font-size: 14px;
        color: #6b7280;
      }

      .install-prompt-actions {
        display: flex;
        gap: 8px;
      }

      .install-prompt-actions button {
        padding: 8px 16px;
        border-radius: 6px;
        border: none;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .install-prompt-dismiss {
        background: #f3f4f6;
        color: #374151;
      }

      .install-prompt-dismiss:hover {
        background: #e5e7eb;
      }

      .install-prompt-install {
        background: ${this.config.themeColor};
        color: white;
      }

      .install-prompt-install:hover {
        opacity: 0.9;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      @media (max-width: 480px) {
        .universal-search-install-prompt {
          bottom: 10px;
          width: calc(100% - 20px);
        }

        .install-prompt-content {
          flex-direction: column;
          align-items: stretch;
          text-align: center;
        }

        .install-prompt-actions {
          justify-content: center;
          margin-top: 8px;
        }
      }
    `;

    document.head.appendChild(styles);
  }
}