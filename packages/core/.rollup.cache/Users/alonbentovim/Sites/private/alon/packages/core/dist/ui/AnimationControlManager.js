import { ValidationError } from '../errors/ThemingErrors';
export class AnimationControlManager {
    constructor(config = {}, namespace = 'alon') {
        this.namespace = namespace;
        this.activeAnimations = new Map();
        this.eventListeners = new Map();
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
    initialize() {
        if (typeof window === 'undefined') {
            return;
        }
        this.setupPreferenceDetection();
        this.setupPerformanceMonitoring();
        this.injectAnimationCSS();
    }
    animate(element, preset, options = {}) {
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
            }
            catch (error) {
                if (options.fallback) {
                    options.fallback();
                }
                reject(error);
            }
        });
    }
    cancelAnimation(element, presetName) {
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
    cancelAllAnimations() {
        this.activeAnimations.forEach(animation => animation.cancel());
        this.activeAnimations.clear();
    }
    addPreset(preset) {
        this.config.presets.set(preset.name, preset);
        this.updateAnimationCSS();
    }
    removePreset(name) {
        const removed = this.config.presets.delete(name);
        if (removed) {
            this.updateAnimationCSS();
        }
        return removed;
    }
    getPreset(name) {
        const preset = this.config.presets.get(name);
        return preset ? { ...preset } : undefined;
    }
    getAllPresets() {
        return Array.from(this.config.presets.values()).map(preset => ({ ...preset }));
    }
    setEnabled(enabled) {
        const wasEnabled = this.config.enabled;
        this.config.enabled = enabled;
        if (!enabled && wasEnabled) {
            this.cancelAllAnimations();
            this.removeAnimationCSS();
        }
        else if (enabled && !wasEnabled) {
            this.injectAnimationCSS();
        }
        this.emit('animation-enabled-changed', enabled);
    }
    isEnabled() {
        return this.config.enabled;
    }
    setGlobalMultiplier(multiplier) {
        if (multiplier <= 0) {
            throw new ValidationError('Global multiplier must be positive');
        }
        this.config.globalMultiplier = multiplier;
        this.updateAnimationCSS();
        this.emit('animation-speed-changed', multiplier);
    }
    getGlobalMultiplier() {
        return this.config.globalMultiplier;
    }
    getMotionPreferences() {
        return { ...this.motionPreferences };
    }
    getAnimationMetrics() {
        return { ...this.animationMetrics };
    }
    setPerformanceMode(mode) {
        this.config.performanceMode = mode;
        this.updateAnimationSettings();
        this.emit('performance-mode-changed', mode);
    }
    getPerformanceMode() {
        return this.config.performanceMode;
    }
    generateAnimationCSS() {
        const css = [];
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
    createTransition(element, properties, options = {}) {
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
    setupPreferenceDetection() {
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
    setupPerformanceMonitoring() {
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
        }
        catch (error) {
            console.warn('Performance monitoring not supported:', error);
        }
    }
    shouldAnimate(respectPreferences = true) {
        if (!this.config.enabled) {
            return false;
        }
        if (respectPreferences && this.config.respectReducedMotion && this.motionPreferences.reducedMotion) {
            return false;
        }
        return true;
    }
    createAnimation(element, preset, options) {
        if (!preset.keyframes) {
            throw new ValidationError(`Animation preset ${preset.name} has no keyframes`);
        }
        const keyframes = Object.entries(preset.keyframes).map(([offset, styles]) => ({
            offset: offset === '0%' ? 0 : offset === '100%' ? 1 : parseFloat(offset) / 100,
            ...styles
        }));
        const animationOptions = {
            duration: this.parseAnimationDuration(options.duration || preset.duration),
            easing: options.timing || preset.timing,
            delay: this.parseAnimationDuration(options.delay || preset.delay || '0ms'),
            fill: options.fill || 'both',
            iterations: options.iterations || 1,
            direction: options.direction || 'normal'
        };
        animationOptions.duration = this.adjustDurationValue(animationOptions.duration);
        return element.animate(keyframes, animationOptions);
    }
    generateAnimationId(element, presetName) {
        const elementId = this.getElementId(element);
        const timestamp = Date.now();
        return `${elementId}-${presetName}-${timestamp}`;
    }
    getElementId(element) {
        if (element.id) {
            return element.id;
        }
        const className = element.className.toString().replace(/\s+/g, '-');
        const tagName = element.tagName.toLowerCase();
        return `${tagName}-${className || 'anonymous'}`;
    }
    parseAnimationDuration(duration) {
        const match = duration.match(/^(\d+(?:\.\d+)?)(ms|s)$/);
        if (!match) {
            return this.config.defaultDuration;
        }
        const value = parseFloat(match[1]);
        const unit = match[2];
        return unit === 's' ? value * 1000 : value;
    }
    adjustDuration(duration) {
        const durationMs = this.parseAnimationDuration(duration);
        const adjustedMs = this.adjustDurationValue(durationMs);
        return `${adjustedMs}ms`;
    }
    adjustDurationValue(duration) {
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
    updateAnimationSettings() {
        this.updateAnimationCSS();
        this.activeAnimations.forEach((animation) => {
            if (this.config.performanceMode === 'fast') {
                animation.playbackRate = 2;
            }
            else if (this.config.performanceMode === 'accessibility') {
                animation.playbackRate = 0.5;
            }
            else {
                animation.playbackRate = 1;
            }
        });
    }
    generatePresetCSS(preset) {
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
    generateUtilityCSS() {
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
    injectAnimationCSS() {
        const existingStyle = document.getElementById(`${this.namespace}-animations`);
        if (existingStyle) {
            existingStyle.remove();
        }
        const style = document.createElement('style');
        style.id = `${this.namespace}-animations`;
        style.textContent = this.generateAnimationCSS();
        document.head.appendChild(style);
    }
    updateAnimationCSS() {
        const existingStyle = document.getElementById(`${this.namespace}-animations`);
        if (existingStyle) {
            existingStyle.textContent = this.generateAnimationCSS();
        }
    }
    removeAnimationCSS() {
        const existingStyle = document.getElementById(`${this.namespace}-animations`);
        if (existingStyle) {
            existingStyle.remove();
        }
    }
    handleReducedMotionChange(event) {
        this.motionPreferences.reducedMotion = event.matches;
        if (event.matches && this.config.respectReducedMotion) {
            this.cancelAllAnimations();
        }
        this.updateAnimationCSS();
        this.emit('reduced-motion-changed', event.matches);
    }
    handleReducedTransparencyChange(event) {
        this.motionPreferences.reducedTransparency = event.matches;
        this.emit('reduced-transparency-changed', event.matches);
    }
    handleHighContrastChange(event) {
        this.motionPreferences.highContrast = event.matches;
        this.emit('high-contrast-changed', event.matches);
    }
    updatePerformanceMetrics(entry) {
        this.animationMetrics.performanceScore = Math.max(0, Math.min(100, 100 - (entry.duration || 0) / 10));
    }
    emit(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(...args);
                }
                catch (error) {
                    console.error(`Error in animation event listener for ${event}:`, error);
                }
            });
        }
    }
}
//# sourceMappingURL=AnimationControlManager.js.map