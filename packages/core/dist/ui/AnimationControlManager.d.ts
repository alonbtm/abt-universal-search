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
export declare class AnimationControlManager {
    private namespace;
    private config;
    private motionPreferences;
    private activeAnimations;
    private animationMetrics;
    private performanceObserver?;
    private eventListeners;
    private prefersReducedMotionQuery?;
    private prefersReducedTransparencyQuery?;
    private prefersHighContrastQuery?;
    constructor(config?: Partial<AnimationConfig>, namespace?: string);
    initialize(): void;
    animate(element: Element, preset: string | AnimationPreset, options?: AnimationOptions): Promise<void>;
    cancelAnimation(element: Element, presetName?: string): boolean;
    cancelAllAnimations(): void;
    addPreset(preset: AnimationPreset): void;
    removePreset(name: string): boolean;
    getPreset(name: string): AnimationPreset | undefined;
    getAllPresets(): AnimationPreset[];
    setEnabled(enabled: boolean): void;
    isEnabled(): boolean;
    setGlobalMultiplier(multiplier: number): void;
    getGlobalMultiplier(): number;
    getMotionPreferences(): MotionPreferences;
    getAnimationMetrics(): AnimationMetrics;
    setPerformanceMode(mode: 'smooth' | 'fast' | 'accessibility'): void;
    getPerformanceMode(): string;
    generateAnimationCSS(): string;
    createTransition(element: Element, properties: string[], options?: AnimationOptions): void;
    on(event: string, callback: Function): void;
    off(event: string, callback: Function): void;
    destroy(): void;
    private setupPreferenceDetection;
    private setupPerformanceMonitoring;
    private shouldAnimate;
    private createAnimation;
    private generateAnimationId;
    private getElementId;
    private parseAnimationDuration;
    private adjustDuration;
    private adjustDurationValue;
    private updateAnimationSettings;
    private generatePresetCSS;
    private generateUtilityCSS;
    private injectAnimationCSS;
    private updateAnimationCSS;
    private removeAnimationCSS;
    private handleReducedMotionChange;
    private handleReducedTransparencyChange;
    private handleHighContrastChange;
    private updatePerformanceMetrics;
    private emit;
}
//# sourceMappingURL=AnimationControlManager.d.ts.map