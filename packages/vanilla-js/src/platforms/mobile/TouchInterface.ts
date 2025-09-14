/**
 * TouchInterface - Mobile touch interface optimization for Universal Search
 * Provides touch-friendly interactions and gesture support
 */

export interface TouchInterfaceConfig {
  enableGestures?: boolean;
  enableHapticFeedback?: boolean;
  touchTargetSize?: number; // minimum touch target size in pixels
  scrollBehavior?: 'smooth' | 'auto';
  preventZoom?: boolean;
  enableSwipeNavigation?: boolean;
  gestureThreshold?: number; // pixels
}

export interface TouchEvent {
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pinch' | 'scroll';
  target: Element;
  position: { x: number; y: number };
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  duration?: number;
  scale?: number;
}

export interface GestureState {
  startTime: number;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  initialDistance?: number;
  touchCount: number;
  isDragging: boolean;
  isLongPress: boolean;
}

export class TouchInterface {
  private config: Required<TouchInterfaceConfig>;
  private isTouchDevice: boolean;
  private gestureState: GestureState | null = null;
  private touchTimers: Map<string, number> = new Map();
  private gestureListeners: Map<string, Function[]> = new Map();
  private preventDefaultEvents: string[] = ['touchmove', 'touchstart'];

  constructor(config: TouchInterfaceConfig = {}) {
    this.config = {
      enableGestures: config.enableGestures ?? true,
      enableHapticFeedback: config.enableHapticFeedback ?? true,
      touchTargetSize: config.touchTargetSize || 44, // 44px minimum touch target
      scrollBehavior: config.scrollBehavior || 'smooth',
      preventZoom: config.preventZoom ?? false,
      enableSwipeNavigation: config.enableSwipeNavigation ?? true,
      gestureThreshold: config.gestureThreshold || 10,
      ...config
    };

    this.isTouchDevice = this.detectTouchSupport();

    if (this.isTouchDevice) {
      this.init();
    }
  }

  /**
   * Initialize touch interface
   */
  private init(): void {
    this.setupTouchEventHandlers();
    this.applyTouchOptimizations();
    this.setupViewportOptimization();

    console.log('[TouchInterface] Initialized for touch device');
  }

  /**
   * Check if device supports touch
   */
  isTouchSupported(): boolean {
    return this.isTouchDevice;
  }

  /**
   * Register gesture listener
   */
  onGesture(type: TouchEvent['type'], handler: (event: TouchEvent) => void): void {
    if (!this.gestureListeners.has(type)) {
      this.gestureListeners.set(type, []);
    }
    this.gestureListeners.get(type)!.push(handler);
  }

  /**
   * Remove gesture listener
   */
  offGesture(type: TouchEvent['type'], handler?: Function): void {
    if (!handler) {
      this.gestureListeners.delete(type);
      return;
    }

    const listeners = this.gestureListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(handler);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Optimize element for touch interaction
   */
  optimizeElementForTouch(element: Element): void {
    const htmlElement = element as HTMLElement;

    // Ensure minimum touch target size
    const rect = element.getBoundingClientRect();
    if (rect.width < this.config.touchTargetSize || rect.height < this.config.touchTargetSize) {
      htmlElement.style.minWidth = `${this.config.touchTargetSize}px`;
      htmlElement.style.minHeight = `${this.config.touchTargetSize}px`;
      htmlElement.style.padding = `${Math.max(0, (this.config.touchTargetSize - Math.min(rect.width, rect.height)) / 2)}px`;
    }

    // Add touch-friendly styling
    htmlElement.style.cursor = 'pointer';
    htmlElement.style.userSelect = 'none';
    htmlElement.style.webkitUserSelect = 'none';
    htmlElement.style.webkitTouchCallout = 'none';
    htmlElement.style.webkitTapHighlightColor = 'rgba(0, 0, 0, 0.1)';

    // Add touch feedback
    this.addTouchFeedback(htmlElement);
  }

  /**
   * Add haptic feedback (if supported)
   */
  triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' = 'light'): boolean {
    if (!this.config.enableHapticFeedback) {
      return false;
    }

    try {
      // iOS Safari haptic feedback
      if ((navigator as any).vibrate) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30],
          selection: [5],
          impact: [15]
        };
        (navigator as any).vibrate(patterns[type]);
        return true;
      }

      // Web Vibration API
      if (navigator.vibrate) {
        const durations = {
          light: 10,
          medium: 20,
          heavy: 30,
          selection: 5,
          impact: 15
        };
        navigator.vibrate(durations[type]);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('[TouchInterface] Haptic feedback failed:', error);
      return false;
    }
  }

  /**
   * Handle virtual keyboard behavior
   */
  handleVirtualKeyboard(inputElement: HTMLElement): void {
    const input = inputElement as HTMLInputElement;

    // Prevent zoom on input focus
    if (this.config.preventZoom) {
      input.style.fontSize = '16px'; // Prevents zoom on iOS
    }

    // Handle keyboard appearance/disappearance
    let initialViewportHeight = window.innerHeight;

    const handleFocus = () => {
      // Scroll input into view
      setTimeout(() => {
        input.scrollIntoView({
          behavior: this.config.scrollBehavior,
          block: 'center'
        });
      }, 300); // Wait for keyboard animation

      this.triggerHapticFeedback('selection');
    };

    const handleBlur = () => {
      // Restore scroll position if needed
      if (window.innerHeight < initialViewportHeight * 0.75) {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: this.config.scrollBehavior });
        }, 300);
      }
    };

    const handleResize = () => {
      // Handle keyboard show/hide
      const heightDiff = initialViewportHeight - window.innerHeight;
      if (heightDiff > 150) { // Keyboard likely shown
        document.body.style.paddingBottom = `${heightDiff}px`;
      } else {
        document.body.style.paddingBottom = '';
      }
    };

    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleResize);
      document.body.style.paddingBottom = '';
    };
  }

  /**
   * Create touch-friendly search interface
   */
  createTouchSearchInterface(container: Element): HTMLElement {
    const searchInterface = document.createElement('div');
    searchInterface.className = 'universal-search-touch-interface';

    searchInterface.innerHTML = `
      <div class="touch-search-container">
        <div class="search-input-container">
          <input type="text" class="touch-search-input" placeholder="Search..." />
          <button class="search-clear-btn" aria-label="Clear search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
        <div class="touch-search-results">
          <div class="results-container"></div>
          <div class="loading-indicator" style="display: none;">
            <div class="spinner"></div>
            <span>Searching...</span>
          </div>
        </div>
      </div>
    `;

    // Apply touch optimizations to all interactive elements
    const touchElements = searchInterface.querySelectorAll('input, button, [role="button"]');
    touchElements.forEach(el => this.optimizeElementForTouch(el));

    // Setup touch event handlers
    this.setupSearchInterfaceHandlers(searchInterface);

    // Handle virtual keyboard
    const input = searchInterface.querySelector('.touch-search-input') as HTMLInputElement;
    this.handleVirtualKeyboard(input);

    return searchInterface;
  }

  /**
   * Handle swipe gestures for navigation
   */
  enableSwipeNavigation(element: Element, callbacks: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
  }): void {
    if (!this.config.enableSwipeNavigation) {
      return;
    }

    this.onGesture('swipe', (event: TouchEvent) => {
      if (event.target === element || element.contains(event.target)) {
        switch (event.direction) {
          case 'left':
            callbacks.onSwipeLeft?.();
            break;
          case 'right':
            callbacks.onSwipeRight?.();
            break;
          case 'up':
            callbacks.onSwipeUp?.();
            break;
          case 'down':
            callbacks.onSwipeDown?.();
            break;
        }
      }
    });
  }

  /**
   * Setup touch event handlers
   */
  private setupTouchEventHandlers(): void {
    if (!this.config.enableGestures) {
      return;
    }

    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this));
  }

  /**
   * Handle touch start events
   */
  private handleTouchStart(event: Event): void {
    const touchEvent = event as globalThis.TouchEvent;
    const touch = touchEvent.touches[0];

    this.gestureState = {
      startTime: Date.now(),
      startPosition: { x: touch.clientX, y: touch.clientY },
      currentPosition: { x: touch.clientX, y: touch.clientY },
      touchCount: touchEvent.touches.length,
      isDragging: false,
      isLongPress: false
    };

    // Handle multi-touch
    if (touchEvent.touches.length === 2) {
      const touch1 = touchEvent.touches[0];
      const touch2 = touchEvent.touches[1];
      this.gestureState.initialDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
    }

    // Setup long press timer
    const longPressTimer = setTimeout(() => {
      if (this.gestureState && !this.gestureState.isDragging) {
        this.gestureState.isLongPress = true;
        this.emitTouchEvent({
          type: 'long-press',
          target: event.target as Element,
          position: this.gestureState.startPosition,
          duration: Date.now() - this.gestureState.startTime
        });
        this.triggerHapticFeedback('medium');
      }
    }, 500);

    this.touchTimers.set('longPress', longPressTimer);
  }

  /**
   * Handle touch move events
   */
  private handleTouchMove(event: Event): void {
    if (!this.gestureState) return;

    const touchEvent = event as globalThis.TouchEvent;
    const touch = touchEvent.touches[0];

    this.gestureState.currentPosition = { x: touch.clientX, y: touch.clientY };

    const distance = Math.sqrt(
      Math.pow(touch.clientX - this.gestureState.startPosition.x, 2) +
      Math.pow(touch.clientY - this.gestureState.startPosition.y, 2)
    );

    if (distance > this.config.gestureThreshold) {
      this.gestureState.isDragging = true;
      this.clearTimer('longPress');
    }

    // Handle pinch gesture
    if (touchEvent.touches.length === 2 && this.gestureState.initialDistance) {
      const touch1 = touchEvent.touches[0];
      const touch2 = touchEvent.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      const scale = currentDistance / this.gestureState.initialDistance;

      this.emitTouchEvent({
        type: 'pinch',
        target: event.target as Element,
        position: {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2
        },
        scale
      });
    }

    // Prevent default for certain events to avoid unwanted behavior
    if (this.preventDefaultEvents.includes(event.type)) {
      event.preventDefault();
    }
  }

  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: Event): void {
    if (!this.gestureState) return;

    const touchEvent = event as globalThis.TouchEvent;
    const duration = Date.now() - this.gestureState.startTime;
    const distance = Math.sqrt(
      Math.pow(this.gestureState.currentPosition.x - this.gestureState.startPosition.x, 2) +
      Math.pow(this.gestureState.currentPosition.y - this.gestureState.startPosition.y, 2)
    );

    this.clearAllTimers();

    // Determine gesture type
    if (!this.gestureState.isDragging && !this.gestureState.isLongPress) {
      if (duration < 300) {
        // Check for double tap
        const lastTap = this.touchTimers.get('lastTap') as number;
        if (lastTap && Date.now() - lastTap < 300) {
          this.emitTouchEvent({
            type: 'double-tap',
            target: event.target as Element,
            position: this.gestureState.startPosition,
            duration
          });
          this.touchTimers.delete('lastTap');
          this.triggerHapticFeedback('light');
        } else {
          // Single tap
          this.touchTimers.set('lastTap', Date.now());
          setTimeout(() => {
            if (this.touchTimers.has('lastTap')) {
              this.emitTouchEvent({
                type: 'tap',
                target: event.target as Element,
                position: this.gestureState!.startPosition,
                duration
              });
              this.touchTimers.delete('lastTap');
              this.triggerHapticFeedback('selection');
            }
          }, 300);
        }
      }
    } else if (this.gestureState.isDragging && distance > this.config.gestureThreshold * 2) {
      // Swipe gesture
      const deltaX = this.gestureState.currentPosition.x - this.gestureState.startPosition.x;
      const deltaY = this.gestureState.currentPosition.y - this.gestureState.startPosition.y;

      let direction: TouchEvent['direction'];
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      this.emitTouchEvent({
        type: 'swipe',
        target: event.target as Element,
        position: this.gestureState.startPosition,
        direction,
        distance,
        duration
      });

      this.triggerHapticFeedback('light');
    }

    this.gestureState = null;
  }

  /**
   * Handle touch cancel events
   */
  private handleTouchCancel(): void {
    this.clearAllTimers();
    this.gestureState = null;
  }

  /**
   * Emit touch event to listeners
   */
  private emitTouchEvent(event: TouchEvent): void {
    const listeners = this.gestureListeners.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[TouchInterface] Event listener error:', error);
      }
    });
  }

  /**
   * Clear specific timer
   */
  private clearTimer(name: string): void {
    const timer = this.touchTimers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.touchTimers.delete(name);
    }
  }

  /**
   * Clear all timers
   */
  private clearAllTimers(): void {
    this.touchTimers.forEach(timer => clearTimeout(timer));
    this.touchTimers.clear();
  }

  /**
   * Add visual touch feedback to element
   */
  private addTouchFeedback(element: HTMLElement): void {
    const addFeedbackClass = () => {
      element.classList.add('touch-active');
      this.triggerHapticFeedback('selection');
    };

    const removeFeedbackClass = () => {
      element.classList.remove('touch-active');
    };

    element.addEventListener('touchstart', addFeedbackClass);
    element.addEventListener('touchend', removeFeedbackClass);
    element.addEventListener('touchcancel', removeFeedbackClass);
  }

  /**
   * Apply general touch optimizations
   */
  private applyTouchOptimizations(): void {
    // Add touch-optimized CSS
    this.injectTouchStyles();

    // Prevent double-tap zoom where needed
    if (this.config.preventZoom) {
      document.addEventListener('touchstart', (event) => {
        if (event.touches.length > 1) {
          event.preventDefault();
        }
      }, { passive: false });
    }

    // Optimize scroll performance
    document.addEventListener('touchmove', (event) => {
      // Allow scrolling but prevent overscroll
      const target = event.target as Element;
      if (!target.closest('.scrollable')) {
        event.preventDefault();
      }
    }, { passive: false });
  }

  /**
   * Setup viewport optimization for mobile
   */
  private setupViewportOptimization(): void {
    // Add or update viewport meta tag
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;

    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }

    const zoomControl = this.config.preventZoom ? ', user-scalable=no' : ', user-scalable=yes';
    viewportMeta.content = `width=device-width, initial-scale=1, maximum-scale=5${zoomControl}`;

    // Add touch-action CSS property
    document.body.style.touchAction = 'pan-y';
  }

  /**
   * Setup search interface touch handlers
   */
  private setupSearchInterfaceHandlers(interface: HTMLElement): void {
    const input = interface.querySelector('.touch-search-input') as HTMLInputElement;
    const clearBtn = interface.querySelector('.search-clear-btn') as HTMLButtonElement;

    // Clear button handler
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
      this.triggerHapticFeedback('selection');
    });

    // Input handlers
    input.addEventListener('focus', () => {
      interface.classList.add('input-focused');
    });

    input.addEventListener('blur', () => {
      interface.classList.remove('input-focused');
    });
  }

  /**
   * Inject touch-optimized styles
   */
  private injectTouchStyles(): void {
    if (document.getElementById('universal-search-touch-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'universal-search-touch-styles';
    styles.textContent = `
      .universal-search-touch-interface {
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }

      .touch-search-container {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .search-input-container {
        display: flex;
        align-items: center;
        padding: 8px;
        border-bottom: 1px solid #e5e7eb;
      }

      .touch-search-input {
        flex: 1;
        padding: 12px 16px;
        border: none;
        font-size: 16px;
        background: #f9fafb;
        border-radius: 8px;
        outline: none;
        min-height: 44px;
      }

      .touch-search-input:focus {
        background: white;
        box-shadow: 0 0 0 2px #2563eb;
      }

      .search-clear-btn {
        min-width: 44px;
        min-height: 44px;
        margin-left: 8px;
        padding: 8px;
        border: none;
        background: #f3f4f6;
        border-radius: 8px;
        color: #6b7280;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .search-clear-btn:active, .search-clear-btn.touch-active {
        background: #e5e7eb;
        transform: scale(0.95);
      }

      .touch-search-results {
        max-height: 400px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .results-container {
        padding: 8px;
      }

      .loading-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        color: #6b7280;
      }

      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #e5e7eb;
        border-top-color: #2563eb;
        border-radius: 50%;
        margin-right: 8px;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .touch-active {
        background-color: rgba(0, 0, 0, 0.05) !important;
        transform: scale(0.98);
      }

      .input-focused .search-input-container {
        background: #f8fafc;
      }

      @media (max-width: 480px) {
        .universal-search-touch-interface {
          margin: 0 -16px;
          border-radius: 0;
        }

        .touch-search-container {
          border-radius: 0;
        }

        .touch-search-input {
          font-size: 16px; /* Prevents zoom on iOS */
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Detect touch support
   */
  private detectTouchSupport(): boolean {
    return 'ontouchstart' in window ||
           navigator.maxTouchPoints > 0 ||
           (navigator as any).msMaxTouchPoints > 0;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearAllTimers();
    this.gestureListeners.clear();

    // Remove event listeners
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    document.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));

    // Remove injected styles
    const styles = document.getElementById('universal-search-touch-styles');
    if (styles) {
      styles.remove();
    }
  }
}