import { ValidationError } from '../errors/ThemingErrors';

export interface Breakpoint {
  name: string;
  value: number;
  unit: 'px' | 'em' | 'rem';
  query: string;
}

export interface ContainerBreakpoint {
  name: string;
  value: number;
  unit: 'px' | 'em' | 'rem' | '%';
  query: string;
}

export interface ResponsiveConfig {
  enabled: boolean;
  strategy: 'window' | 'container' | 'both';
  mobileFirst: boolean;
  useContainerQueries: boolean;
  breakpoints: Map<string, Breakpoint>;
  containerBreakpoints: Map<string, ContainerBreakpoint>;
  debounceDelay: number;
  observeOptions: ResizeObserverOptions;
}

export interface ResponsiveThemeOverride {
  breakpoint: string;
  overrides: Record<string, any>;
  containerQuery?: string;
  mediaQuery?: string;
}

export interface ViewportInfo {
  width: number;
  height: number;
  ratio: number;
  orientation: 'portrait' | 'landscape';
  activeBreakpoint: string;
  activeBreakpoints: string[];
}

export interface ContainerInfo {
  element: Element;
  width: number;
  height: number;
  activeBreakpoint: string;
  activeBreakpoints: string[];
}

export class ResponsiveManager {
  private config: ResponsiveConfig;
  private mediaQueries = new Map<string, MediaQueryList>();
  private resizeObserver?: ResizeObserver;
  private observedContainers = new Map<Element, ContainerInfo>();
  private currentViewport: ViewportInfo;
  private themeOverrides = new Map<string, ResponsiveThemeOverride>();
  private eventListeners = new Map<string, Function[]>();
  private debounceTimer?: number;

  constructor(
    config: Partial<ResponsiveConfig> = {},
    private namespace: string = 'alon'
  ) {
    this.config = {
      enabled: true,
      strategy: 'window',
      mobileFirst: true,
      useContainerQueries: true,
      breakpoints: new Map([
        ['xs', { name: 'xs', value: 0, unit: 'px', query: '(min-width: 0px)' }],
        ['sm', { name: 'sm', value: 576, unit: 'px', query: '(min-width: 576px)' }],
        ['md', { name: 'md', value: 768, unit: 'px', query: '(min-width: 768px)' }],
        ['lg', { name: 'lg', value: 992, unit: 'px', query: '(min-width: 992px)' }],
        ['xl', { name: 'xl', value: 1200, unit: 'px', query: '(min-width: 1200px)' }],
        ['2xl', { name: '2xl', value: 1400, unit: 'px', query: '(min-width: 1400px)' }]
      ]),
      containerBreakpoints: new Map([
        ['xs', { name: 'xs', value: 0, unit: 'px', query: '(min-width: 0px)' }],
        ['sm', { name: 'sm', value: 320, unit: 'px', query: '(min-width: 320px)' }],
        ['md', { name: 'md', value: 480, unit: 'px', query: '(min-width: 480px)' }],
        ['lg', { name: 'lg', value: 640, unit: 'px', query: '(min-width: 640px)' }],
        ['xl', { name: 'xl', value: 800, unit: 'px', query: '(min-width: 800px)' }]
      ]),
      debounceDelay: 150,
      observeOptions: {}
    };

    this.config = { ...this.config, ...config };

    this.currentViewport = this.getCurrentViewport();
    
    if (this.config.enabled) {
      this.initialize();
    }
  }

  public initialize(): void {
    if (!this.config.enabled || typeof window === 'undefined') {
      return;
    }

    this.setupMediaQueries();
    
    if (this.config.useContainerQueries) {
      this.setupResizeObserver();
    }

    window.addEventListener('resize', this.handleWindowResize.bind(this));
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));

    this.updateCurrentBreakpoint();
  }

  public addBreakpoint(name: string, value: number, unit: 'px' | 'em' | 'rem' = 'px'): void {
    const breakpoint: Breakpoint = {
      name,
      value,
      unit,
      query: this.config.mobileFirst 
        ? `(min-width: ${value}${unit})` 
        : `(max-width: ${value - 0.02}${unit})`
    };

    this.config.breakpoints.set(name, breakpoint);
    this.setupMediaQuery(breakpoint);
  }

  public addContainerBreakpoint(name: string, value: number, unit: 'px' | 'em' | 'rem' | '%' = 'px'): void {
    const breakpoint: ContainerBreakpoint = {
      name,
      value,
      unit,
      query: `(min-width: ${value}${unit})`
    };

    this.config.containerBreakpoints.set(name, breakpoint);
  }

  public removeBreakpoint(name: string): boolean {
    const breakpoint = this.config.breakpoints.get(name);
    if (!breakpoint) {
      return false;
    }

    const mediaQuery = this.mediaQueries.get(name);
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', this.handleMediaQueryChange.bind(this));
      this.mediaQueries.delete(name);
    }

    return this.config.breakpoints.delete(name);
  }

  public observeContainer(element: Element): void {
    if (!this.config.useContainerQueries || !this.resizeObserver) {
      return;
    }

    const containerInfo: ContainerInfo = {
      element,
      width: element.clientWidth,
      height: element.clientHeight,
      activeBreakpoint: this.getActiveContainerBreakpoint(element.clientWidth),
      activeBreakpoints: this.getActiveContainerBreakpoints(element.clientWidth)
    };

    this.observedContainers.set(element, containerInfo);
    this.resizeObserver.observe(element);
    this.applyContainerStyles(element, containerInfo);
  }

  public unobserveContainer(element: Element): boolean {
    if (!this.resizeObserver) {
      return false;
    }

    this.resizeObserver.unobserve(element);
    return this.observedContainers.delete(element);
  }

  public getActiveBreakpoint(): string {
    return this.currentViewport.activeBreakpoint;
  }

  public getActiveBreakpoints(): string[] {
    return this.currentViewport.activeBreakpoints;
  }

  public isBreakpointActive(name: string): boolean {
    return this.currentViewport.activeBreakpoints.includes(name);
  }

  public getViewportInfo(): ViewportInfo {
    return { ...this.currentViewport };
  }

  public getContainerInfo(element: Element): ContainerInfo | undefined {
    const info = this.observedContainers.get(element);
    return info ? { ...info } : undefined;
  }

  public addThemeOverride(breakpoint: string, overrides: Record<string, any>, options?: {
    containerQuery?: string;
    mediaQuery?: string;
  }): void {
    const themeOverride: ResponsiveThemeOverride = {
      breakpoint,
      overrides,
      containerQuery: options?.containerQuery,
      mediaQuery: options?.mediaQuery || this.getBreakpointQuery(breakpoint)
    };

    this.themeOverrides.set(breakpoint, themeOverride);
    this.applyThemeOverrides();
  }

  public removeThemeOverride(breakpoint: string): boolean {
    const removed = this.themeOverrides.delete(breakpoint);
    if (removed) {
      this.applyThemeOverrides();
    }
    return removed;
  }

  public getThemeOverrides(): ResponsiveThemeOverride[] {
    return Array.from(this.themeOverrides.values());
  }

  public generateResponsiveCSS(): string {
    const css: string[] = [];

    this.config.breakpoints.forEach((breakpoint) => {
      if (breakpoint.value > 0) {
        css.push(this.generateBreakpointCSS(breakpoint));
      }
    });

    if (this.config.useContainerQueries) {
      this.config.containerBreakpoints.forEach((breakpoint) => {
        if (breakpoint.value > 0) {
          css.push(this.generateContainerQueryCSS(breakpoint));
        }
      });
    }

    return css.join('\n\n');
  }

  public setConfig(newConfig: Partial<ResponsiveConfig>): void {
    const oldEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };

    if (!oldEnabled && this.config.enabled) {
      this.initialize();
    } else if (oldEnabled && !this.config.enabled) {
      this.destroy();
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
    this.mediaQueries.forEach((mediaQuery, name) => {
      mediaQuery.removeEventListener('change', this.handleMediaQueryChange.bind(this));
    });
    this.mediaQueries.clear();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }

    this.observedContainers.clear();
    this.themeOverrides.clear();
    this.eventListeners.clear();

    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleWindowResize.bind(this));
      window.removeEventListener('orientationchange', this.handleOrientationChange.bind(this));
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  private setupMediaQueries(): void {
    this.config.breakpoints.forEach((breakpoint) => {
      this.setupMediaQuery(breakpoint);
    });
  }

  private setupMediaQuery(breakpoint: Breakpoint): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia(breakpoint.query);
    mediaQuery.addEventListener('change', this.handleMediaQueryChange.bind(this));
    this.mediaQueries.set(breakpoint.name, mediaQuery);
  }

  private setupResizeObserver(): void {
    if (typeof window === 'undefined' || !window.ResizeObserver) {
      return;
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      this.handleContainerResize(entries);
    });
  }

  private handleWindowResize(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      const oldViewport = { ...this.currentViewport };
      this.currentViewport = this.getCurrentViewport();
      
      if (oldViewport.activeBreakpoint !== this.currentViewport.activeBreakpoint) {
        this.emit('breakpoint-changed', this.currentViewport.activeBreakpoint, oldViewport.activeBreakpoint);
      }

      this.emit('viewport-changed', this.currentViewport, oldViewport);
      this.applyThemeOverrides();
    }, this.config.debounceDelay);
  }

  private handleOrientationChange(): void {
    setTimeout(() => {
      this.handleWindowResize();
    }, 100);
  }

  private handleMediaQueryChange(event: MediaQueryListEvent): void {
    this.updateCurrentBreakpoint();
    this.applyThemeOverrides();
  }

  private handleContainerResize(entries: ResizeObserverEntry[]): void {
    entries.forEach((entry) => {
      const containerInfo = this.observedContainers.get(entry.target);
      if (!containerInfo) {
        return;
      }

      const newWidth = entry.contentRect.width;
      const newHeight = entry.contentRect.height;
      const oldBreakpoint = containerInfo.activeBreakpoint;

      containerInfo.width = newWidth;
      containerInfo.height = newHeight;
      containerInfo.activeBreakpoint = this.getActiveContainerBreakpoint(newWidth);
      containerInfo.activeBreakpoints = this.getActiveContainerBreakpoints(newWidth);

      this.applyContainerStyles(entry.target, containerInfo);

      if (oldBreakpoint !== containerInfo.activeBreakpoint) {
        this.emit('container-breakpoint-changed', {
          element: entry.target,
          breakpoint: containerInfo.activeBreakpoint,
          previousBreakpoint: oldBreakpoint,
          width: newWidth,
          height: newHeight
        });
      }
    });
  }

  private getCurrentViewport(): ViewportInfo {
    const width = window.innerWidth || 0;
    const height = window.innerHeight || 0;
    
    return {
      width,
      height,
      ratio: width / height,
      orientation: width > height ? 'landscape' : 'portrait',
      activeBreakpoint: this.getActiveBreakpoint(width),
      activeBreakpoints: this.getActiveBreakpoints(width)
    };
  }

  private getActiveBreakpoint(width: number): string {
    const sortedBreakpoints = Array.from(this.config.breakpoints.values())
      .filter(bp => bp.value <= width)
      .sort((a, b) => b.value - a.value);

    return sortedBreakpoints[0]?.name || 'xs';
  }

  private getActiveBreakpoints(width: number): string[] {
    if (this.config.mobileFirst) {
      return Array.from(this.config.breakpoints.values())
        .filter(bp => bp.value <= width)
        .map(bp => bp.name);
    } else {
      return Array.from(this.config.breakpoints.values())
        .filter(bp => bp.value >= width)
        .map(bp => bp.name);
    }
  }

  private getActiveContainerBreakpoint(width: number): string {
    const sortedBreakpoints = Array.from(this.config.containerBreakpoints.values())
      .filter(bp => bp.value <= width)
      .sort((a, b) => b.value - a.value);

    return sortedBreakpoints[0]?.name || 'xs';
  }

  private getActiveContainerBreakpoints(width: number): string[] {
    return Array.from(this.config.containerBreakpoints.values())
      .filter(bp => bp.value <= width)
      .map(bp => bp.name);
  }

  private updateCurrentBreakpoint(): void {
    this.currentViewport = this.getCurrentViewport();
  }

  private getBreakpointQuery(breakpointName: string): string | undefined {
    return this.config.breakpoints.get(breakpointName)?.query;
  }

  private applyContainerStyles(element: Element, containerInfo: ContainerInfo): void {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    element.setAttribute(`data-${this.namespace}-container-breakpoint`, containerInfo.activeBreakpoint);
    element.setAttribute(`data-${this.namespace}-container-width`, containerInfo.width.toString());
    element.setAttribute(`data-${this.namespace}-container-height`, containerInfo.height.toString());

    containerInfo.activeBreakpoints.forEach(bp => {
      element.classList.add(`${this.namespace}-container-${bp}`);
    });

    this.config.containerBreakpoints.forEach((_, name) => {
      if (!containerInfo.activeBreakpoints.includes(name)) {
        element.classList.remove(`${this.namespace}-container-${name}`);
      }
    });
  }

  private applyThemeOverrides(): void {
    const activeOverrides = Array.from(this.themeOverrides.values())
      .filter(override => {
        if (override.containerQuery) {
          return true;
        }
        return this.isBreakpointActive(override.breakpoint);
      });

    this.emit('theme-overrides-applied', activeOverrides);
  }

  private generateBreakpointCSS(breakpoint: Breakpoint): string {
    const className = `${this.namespace}-${breakpoint.name}`;
    
    return `@media ${breakpoint.query} {
  .${className} {
    display: block;
  }
  
  .${this.namespace}-breakpoint-indicator::before {
    content: '${breakpoint.name}';
  }
}`;
  }

  private generateContainerQueryCSS(breakpoint: ContainerBreakpoint): string {
    const className = `${this.namespace}-container-${breakpoint.name}`;
    
    return `@container ${breakpoint.query} {
  .${className} {
    display: block;
  }
}`;
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in responsive event listener for ${event}:`, error);
        }
      });
    }
  }
}