export class ResponsiveManager {
    constructor(config = {}, namespace = 'alon') {
        this.namespace = namespace;
        this.mediaQueries = new Map();
        this.observedContainers = new Map();
        this.themeOverrides = new Map();
        this.eventListeners = new Map();
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
    initialize() {
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
    addBreakpoint(name, value, unit = 'px') {
        const breakpoint = {
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
    addContainerBreakpoint(name, value, unit = 'px') {
        const breakpoint = {
            name,
            value,
            unit,
            query: `(min-width: ${value}${unit})`
        };
        this.config.containerBreakpoints.set(name, breakpoint);
    }
    removeBreakpoint(name) {
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
    observeContainer(element) {
        if (!this.config.useContainerQueries || !this.resizeObserver) {
            return;
        }
        const containerInfo = {
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
    unobserveContainer(element) {
        if (!this.resizeObserver) {
            return false;
        }
        this.resizeObserver.unobserve(element);
        return this.observedContainers.delete(element);
    }
    getActiveBreakpoint() {
        return this.currentViewport.activeBreakpoint;
    }
    getActiveBreakpoints() {
        return this.currentViewport.activeBreakpoints;
    }
    isBreakpointActive(name) {
        return this.currentViewport.activeBreakpoints.includes(name);
    }
    getViewportInfo() {
        return { ...this.currentViewport };
    }
    getContainerInfo(element) {
        const info = this.observedContainers.get(element);
        return info ? { ...info } : undefined;
    }
    addThemeOverride(breakpoint, overrides, options) {
        const themeOverride = {
            breakpoint,
            overrides,
            containerQuery: options?.containerQuery,
            mediaQuery: options?.mediaQuery || this.getBreakpointQuery(breakpoint)
        };
        this.themeOverrides.set(breakpoint, themeOverride);
        this.applyThemeOverrides();
    }
    removeThemeOverride(breakpoint) {
        const removed = this.themeOverrides.delete(breakpoint);
        if (removed) {
            this.applyThemeOverrides();
        }
        return removed;
    }
    getThemeOverrides() {
        return Array.from(this.themeOverrides.values());
    }
    generateResponsiveCSS() {
        const css = [];
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
    setConfig(newConfig) {
        const oldEnabled = this.config.enabled;
        this.config = { ...this.config, ...newConfig };
        if (!oldEnabled && this.config.enabled) {
            this.initialize();
        }
        else if (oldEnabled && !this.config.enabled) {
            this.destroy();
        }
    }
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    destroy() {
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
    setupMediaQueries() {
        this.config.breakpoints.forEach((breakpoint) => {
            this.setupMediaQuery(breakpoint);
        });
    }
    setupMediaQuery(breakpoint) {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return;
        }
        const mediaQuery = window.matchMedia(breakpoint.query);
        mediaQuery.addEventListener('change', this.handleMediaQueryChange.bind(this));
        this.mediaQueries.set(breakpoint.name, mediaQuery);
    }
    setupResizeObserver() {
        if (typeof window === 'undefined' || !window.ResizeObserver) {
            return;
        }
        this.resizeObserver = new ResizeObserver((entries) => {
            this.handleContainerResize(entries);
        });
    }
    handleWindowResize() {
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
    handleOrientationChange() {
        setTimeout(() => {
            this.handleWindowResize();
        }, 100);
    }
    handleMediaQueryChange(event) {
        this.updateCurrentBreakpoint();
        this.applyThemeOverrides();
    }
    handleContainerResize(entries) {
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
    getCurrentViewport() {
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
    getActiveBreakpoint(width) {
        const sortedBreakpoints = Array.from(this.config.breakpoints.values())
            .filter(bp => bp.value <= width)
            .sort((a, b) => b.value - a.value);
        return sortedBreakpoints[0]?.name || 'xs';
    }
    getActiveBreakpoints(width) {
        if (this.config.mobileFirst) {
            return Array.from(this.config.breakpoints.values())
                .filter(bp => bp.value <= width)
                .map(bp => bp.name);
        }
        else {
            return Array.from(this.config.breakpoints.values())
                .filter(bp => bp.value >= width)
                .map(bp => bp.name);
        }
    }
    getActiveContainerBreakpoint(width) {
        const sortedBreakpoints = Array.from(this.config.containerBreakpoints.values())
            .filter(bp => bp.value <= width)
            .sort((a, b) => b.value - a.value);
        return sortedBreakpoints[0]?.name || 'xs';
    }
    getActiveContainerBreakpoints(width) {
        return Array.from(this.config.containerBreakpoints.values())
            .filter(bp => bp.value <= width)
            .map(bp => bp.name);
    }
    updateCurrentBreakpoint() {
        this.currentViewport = this.getCurrentViewport();
    }
    getBreakpointQuery(breakpointName) {
        return this.config.breakpoints.get(breakpointName)?.query;
    }
    applyContainerStyles(element, containerInfo) {
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
    applyThemeOverrides() {
        const activeOverrides = Array.from(this.themeOverrides.values())
            .filter(override => {
            if (override.containerQuery) {
                return true;
            }
            return this.isBreakpointActive(override.breakpoint);
        });
        this.emit('theme-overrides-applied', activeOverrides);
    }
    generateBreakpointCSS(breakpoint) {
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
    generateContainerQueryCSS(breakpoint) {
        const className = `${this.namespace}-container-${breakpoint.name}`;
        return `@container ${breakpoint.query} {
  .${className} {
    display: block;
  }
}`;
    }
    emit(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(...args);
                }
                catch (error) {
                    console.error(`Error in responsive event listener for ${event}:`, error);
                }
            });
        }
    }
}
//# sourceMappingURL=ResponsiveManager.js.map