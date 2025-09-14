import { ValidationError } from '../errors/ThemingErrors';

export interface AnimationPreset {
  name: string;
  duration: string;
  timing: string;
  delay?: string;
  properties: string[];
  keyframes?: Record<string, Record<string, string>>;
}

export interface AnimationConfig {
  enabled: boolean;
  respectReducedMotion: boolean;
  defaultDuration: number;
  performanceMode: 'smooth' | 'fast' | 'accessibility';
  globalMultiplier: number;
  presets: Map<string, AnimationPreset>;
}

export interface MotionPreferences {
  reducedMotion: boolean;
  reducedTransparency: boolean;
  reducedData: boolean;
  highContrast: boolean;
}

export interface AnimationMetrics {
  activeAnimations: number;
  completedAnimations: number;
  droppedFrames: number;
  averageFPS: number;
  performanceScore: number;
}

export interface AnimationOptions {
  duration?: string;
  timing?: string;
  delay?: string;
  fill?: 'none' | 'forwards' | 'backwards' | 'both';
  iterations?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  respectPreferences?: boolean;
  fallback?: () => void;
}

export class AnimationControlManager {
  private config: AnimationConfig;
  private motionPreferences: MotionPreferences;
  private activeAnimations = new Map<string, Animation>();
  private animationMetrics: AnimationMetrics;
  private performanceObserver?: PerformanceObserver;
  private eventListeners = new Map<string, Function[]>();
  private prefersReducedMotionQuery?: MediaQueryList;
  private prefersReducedTransparencyQuery?: MediaQueryList;
  private prefersHighContrastQuery?: MediaQueryList;

  constructor(
    config: Partial<AnimationConfig> = {},
    private namespace: string = 'alon'
  ) {
    this.config = {
      enabled: true,
      respectReducedMotion: true,
      defaultDuration: 300,
      performanceMode: 'smooth',
      globalMultiplier: 1,
      presets: new Map([
        ['fade', {
          name: 'fade',
          duration: '300ms',
          timing: 'ease-in-out',
          properties: ['opacity'],
          keyframes: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' }
          }
        }],
        ['slide', {
          name: 'slide',
          duration: '300ms',
          timing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          properties: ['transform'],
          keyframes: {
            '0%': { transform: 'translateY(-10px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' }
          }
        }],
        ['scale', {
          name: 'scale',
          duration: '200ms',
          timing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          properties: ['transform'],
          keyframes: {
            '0%': { transform: 'scale(0.8)', opacity: '0' },
            '100%': { transform: 'scale(1)', opacity: '1' }
          }
        }],
        ['bounce', {
          name: 'bounce',
          duration: '600ms',
          timing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          properties: ['transform'],
          keyframes: {
            '0%': { transform: 'translateY(-30px)' },
            '50%': { transform: 'translateY(5px)' },
            '100%': { transform: 'translateY(0)' }
          }
        }],
        ['spin', {
          name: 'spin',
          duration: '1000ms',
          timing: 'linear',
          properties: ['transform'],
          keyframes: {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' }
          }
        }]
      ])
    };

    this.config = { ...this.config, ...config };

    this.motionPreferences = {
      reducedMotion: false,
      reducedTransparency: false,
      reducedData: false,
      highContrast: false
    };

    this.animationMetrics = {
      activeAnimations: 0,
      completedAnimations: 0,
      droppedFrames: 0,
      averageFPS: 60,
      performanceScore: 100
    };

    if (this.config.enabled) {
      this.initialize();
    }
  }

  public initialize(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.setupPreferenceDetection();
    this.setupPerformanceMonitoring();
    this.injectAnimationCSS();
  }

  public animate(
    element: Element,
    preset: string | AnimationPreset,
    options: AnimationOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.shouldAnimate(options.respectPreferences !== false)) {
        if (options.fallback) {
          options.fallback();
        }
        resolve();
        return;
      }

      try {
        const animationPreset = typeof preset === 'string' 
          ? this.config.presets.get(preset) 
          : preset;

        if (!animationPreset) {
          throw new ValidationError(`Animation preset not found: ${preset}`);
        }

        const animation = this.createAnimation(element, animationPreset, options);
        const animationId = this.generateAnimationId(element, animationPreset.name);

        this.activeAnimations.set(animationId, animation);
        this.animationMetrics.activeAnimations++;

        animation.addEventListener('finish', () => {
          this.activeAnimations.delete(animationId);
          this.animationMetrics.activeAnimations--;
          this.animationMetrics.completedAnimations++;
          this.emit('animation-complete', { element, preset: animationPreset, animationId });
          resolve();
        });

        animation.addEventListener('cancel', () => {
          this.activeAnimations.delete(animationId);
          this.animationMetrics.activeAnimations--;
          this.emit('animation-cancelled', { element, preset: animationPreset, animationId });
          resolve();
        });

        animation.addEventListener('error', (error) => {
          this.activeAnimations.delete(animationId);
          this.animationMetrics.activeAnimations--;
          reject(error);
        });

        animation.play();
        this.emit('animation-start', { element, preset: animationPreset, animationId });

      } catch (error) {
        if (options.fallback) {
          options.fallback();
        }
        reject(error);
      }
    });
  }

  public cancelAnimation(element: Element, presetName?: string): boolean {
    let cancelled = false;

    this.activeAnimations.forEach((animation, id) => {
      if (id.includes(this.getElementId(element))) {
        if (!presetName || id.includes(presetName)) {
          animation.cancel();
          cancelled = true;
        }
      }
    });

    return cancelled;
  }

  public cancelAllAnimations(): void {
    this.activeAnimations.forEach(animation => animation.cancel());
    this.activeAnimations.clear();
  }

  public addPreset(preset: AnimationPreset): void {
    this.config.presets.set(preset.name, preset);
    this.updateAnimationCSS();
  }

  public removePreset(name: string): boolean {
    const removed = this.config.presets.delete(name);
    if (removed) {
      this.updateAnimationCSS();
    }
    return removed;
  }

  public getPreset(name: string): AnimationPreset | undefined {
    const preset = this.config.presets.get(name);
    return preset ? { ...preset } : undefined;
  }

  public getAllPresets(): AnimationPreset[] {
    return Array.from(this.config.presets.values()).map(preset => ({ ...preset }));
  }

  public setEnabled(enabled: boolean): void {
    const wasEnabled = this.config.enabled;
    this.config.enabled = enabled;

    if (!enabled && wasEnabled) {
      this.cancelAllAnimations();
      this.removeAnimationCSS();
    } else if (enabled && !wasEnabled) {
      this.injectAnimationCSS();
    }

    this.emit('animation-enabled-changed', enabled);
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public setGlobalMultiplier(multiplier: number): void {
    if (multiplier <= 0) {
      throw new ValidationError('Global multiplier must be positive');
    }

    this.config.globalMultiplier = multiplier;
    this.updateAnimationCSS();
    this.emit('animation-speed-changed', multiplier);
  }

  public getGlobalMultiplier(): number {
    return this.config.globalMultiplier;
  }

  public getMotionPreferences(): MotionPreferences {
    return { ...this.motionPreferences };
  }

  public getAnimationMetrics(): AnimationMetrics {
    return { ...this.animationMetrics };
  }

  public setPerformanceMode(mode: 'smooth' | 'fast' | 'accessibility'): void {
    this.config.performanceMode = mode;
    this.updateAnimationSettings();
    this.emit('performance-mode-changed', mode);
  }

  public getPerformanceMode(): string {
    return this.config.performanceMode;
  }

  public generateAnimationCSS(): string {
    const css: string[] = [];

    if (!this.config.enabled || this.motionPreferences.reducedMotion) {
      css.push(`
        .${this.namespace}-animated * {
          animation-duration: 0.01ms !important;
          animation-delay: 0.01ms !important;
          transition-duration: 0.01ms !important;
          transition-delay: 0.01ms !important;
        }
      `);
    }

    this.config.presets.forEach(preset => {
      css.push(this.generatePresetCSS(preset));
    });

    css.push(this.generateUtilityCSS());

    return css.join('\n\n');
  }

  public createTransition(
    element: Element,
    properties: string[],
    options: AnimationOptions = {}
  ): void {
    if (!this.shouldAnimate(options.respectPreferences !== false)) {
      return;
    }

    const duration = options.duration || `${this.config.defaultDuration}ms`;
    const timing = options.timing || 'ease-in-out';
    const delay = options.delay || '0ms';

    const adjustedDuration = this.adjustDuration(duration);
    const transition = `${properties.join(', ')} ${adjustedDuration} ${timing} ${delay}`;

    if (element instanceof HTMLElement) {
      element.style.transition = transition;
    }
  }

  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public destroy(): void {
    this.cancelAllAnimations();
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    if (this.prefersReducedMotionQuery) {
      this.prefersReducedMotionQuery.removeEventListener('change', this.handleReducedMotionChange.bind(this));
    }

    if (this.prefersReducedTransparencyQuery) {
      this.prefersReducedTransparencyQuery.removeEventListener('change', this.handleReducedTransparencyChange.bind(this));
    }

    if (this.prefersHighContrastQuery) {
      this.prefersHighContrastQuery.removeEventListener('change', this.handleHighContrastChange.bind(this));
    }

    this.removeAnimationCSS();
    this.eventListeners.clear();
  }

  private setupPreferenceDetection(): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    this.prefersReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.prefersReducedMotionQuery.addEventListener('change', this.handleReducedMotionChange.bind(this));
    this.motionPreferences.reducedMotion = this.prefersReducedMotionQuery.matches;

    this.prefersReducedTransparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)');
    this.prefersReducedTransparencyQuery.addEventListener('change', this.handleReducedTransparencyChange.bind(this));
    this.motionPreferences.reducedTransparency = this.prefersReducedTransparencyQuery.matches;

    this.prefersHighContrastQuery = window.matchMedia('(prefers-contrast: high)');
    this.prefersHighContrastQuery.addEventListener('change', this.handleHighContrastChange.bind(this));
    this.motionPreferences.highContrast = this.prefersHighContrastQuery.matches;
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            this.updatePerformanceMetrics(entry);
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'paint', 'navigation'] });
    } catch (error) {
      console.warn('Performance monitoring not supported:', error);
    }
  }

  private shouldAnimate(respectPreferences: boolean = true): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (respectPreferences && this.config.respectReducedMotion && this.motionPreferences.reducedMotion) {
      return false;
    }

    return true;
  }

  private createAnimation(
    element: Element,
    preset: AnimationPreset,
    options: AnimationOptions
  ): Animation {
    if (!preset.keyframes) {
      throw new ValidationError(`Animation preset ${preset.name} has no keyframes`);
    }

    const keyframes = Object.entries(preset.keyframes).map(([offset, styles]) => ({
      offset: offset === '0%' ? 0 : offset === '100%' ? 1 : parseFloat(offset) / 100,
      ...styles
    }));

    const animationOptions: KeyframeAnimationOptions = {
      duration: this.parseAnimationDuration(options.duration || preset.duration),
      easing: options.timing || preset.timing,
      delay: this.parseAnimationDuration(options.delay || preset.delay || '0ms'),
      fill: options.fill || 'both',
      iterations: options.iterations || 1,
      direction: options.direction || 'normal'
    };

    animationOptions.duration = this.adjustDurationValue(animationOptions.duration as number);

    return element.animate(keyframes, animationOptions);
  }

  private generateAnimationId(element: Element, presetName: string): string {
    const elementId = this.getElementId(element);
    const timestamp = Date.now();
    return `${elementId}-${presetName}-${timestamp}`;
  }

  private getElementId(element: Element): string {
    if (element.id) {
      return element.id;
    }

    const className = element.className.toString().replace(/\s+/g, '-');
    const tagName = element.tagName.toLowerCase();
    return `${tagName}-${className || 'anonymous'}`;
  }

  private parseAnimationDuration(duration: string): number {
    const match = duration.match(/^(\d+(?:\.\d+)?)(ms|s)$/);
    if (!match) {
      return this.config.defaultDuration;
    }

    const value = parseFloat(match[1]);
    const unit = match[2];

    return unit === 's' ? value * 1000 : value;
  }

  private adjustDuration(duration: string): string {
    const durationMs = this.parseAnimationDuration(duration);
    const adjustedMs = this.adjustDurationValue(durationMs);
    return `${adjustedMs}ms`;
  }

  private adjustDurationValue(duration: number): number {
    let adjusted = duration / this.config.globalMultiplier;

    switch (this.config.performanceMode) {
      case 'fast':
        adjusted *= 0.5;
        break;
      case 'accessibility':
        adjusted *= 1.5;
        break;
      default:
        break;
    }

    return Math.max(1, Math.round(adjusted));
  }

  private updateAnimationSettings(): void {
    this.updateAnimationCSS();
    
    this.activeAnimations.forEach((animation) => {
      if (this.config.performanceMode === 'fast') {
        animation.playbackRate = 2;
      } else if (this.config.performanceMode === 'accessibility') {
        animation.playbackRate = 0.5;
      } else {
        animation.playbackRate = 1;
      }
    });
  }

  private generatePresetCSS(preset: AnimationPreset): string {
    const keyframesName = `${this.namespace}-${preset.name}`;
    const className = `${this.namespace}-${preset.name}`;

    let keyframesCSS = '';
    if (preset.keyframes) {
      keyframesCSS = `@keyframes ${keyframesName} {\n`;
      Object.entries(preset.keyframes).forEach(([offset, styles]) => {
        keyframesCSS += `  ${offset} {\n`;
        Object.entries(styles).forEach(([property, value]) => {
          keyframesCSS += `    ${property}: ${value};\n`;
        });
        keyframesCSS += `  }\n`;
      });
      keyframesCSS += `}\n\n`;
    }

    const animationCSS = `.${className} {
  animation-name: ${keyframesName};
  animation-duration: ${this.adjustDuration(preset.duration)};
  animation-timing-function: ${preset.timing};
  animation-delay: ${preset.delay || '0ms'};
  animation-fill-mode: both;
}`;

    return keyframesCSS + animationCSS;
  }

  private generateUtilityCSS(): string {
    return `
.${this.namespace}-animated {
  animation-play-state: running;
}

.${this.namespace}-paused {
  animation-play-state: paused;
}

.${this.namespace}-no-animation {
  animation: none !important;
  transition: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .${this.namespace}-respect-motion * {
    animation-duration: 0.01ms !important;
    animation-delay: 0.01ms !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0.01ms !important;
  }
}`;
  }

  private injectAnimationCSS(): void {
    const existingStyle = document.getElementById(`${this.namespace}-animations`);
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = `${this.namespace}-animations`;
    style.textContent = this.generateAnimationCSS();
    document.head.appendChild(style);
  }

  private updateAnimationCSS(): void {
    const existingStyle = document.getElementById(`${this.namespace}-animations`);
    if (existingStyle) {
      existingStyle.textContent = this.generateAnimationCSS();
    }
  }

  private removeAnimationCSS(): void {
    const existingStyle = document.getElementById(`${this.namespace}-animations`);
    if (existingStyle) {
      existingStyle.remove();
    }
  }

  private handleReducedMotionChange(event: MediaQueryListEvent): void {
    this.motionPreferences.reducedMotion = event.matches;
    
    if (event.matches && this.config.respectReducedMotion) {
      this.cancelAllAnimations();
    }

    this.updateAnimationCSS();
    this.emit('reduced-motion-changed', event.matches);
  }

  private handleReducedTransparencyChange(event: MediaQueryListEvent): void {
    this.motionPreferences.reducedTransparency = event.matches;
    this.emit('reduced-transparency-changed', event.matches);
  }

  private handleHighContrastChange(event: MediaQueryListEvent): void {
    this.motionPreferences.highContrast = event.matches;
    this.emit('high-contrast-changed', event.matches);
  }

  private updatePerformanceMetrics(entry: PerformanceEntry): void {
    this.animationMetrics.performanceScore = Math.max(0, Math.min(100, 
      100 - (entry.duration || 0) / 10
    ));
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in animation event listener for ${event}:`, error);
        }
      });
    }
  }
}