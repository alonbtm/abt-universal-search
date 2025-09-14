/**
 * VoiceControlManager - Voice navigation and landmark support
 * @description Proper landmark identification and voice software compatibility
 */
import type { VoiceControlCommand, LandmarkInfo } from '../types/Accessibility';
/**
 * Voice recognition configuration
 */
export interface VoiceRecognitionConfig {
    /** Language for recognition */
    language: string;
    /** Continuous recognition */
    continuous: boolean;
    /** Interim results */
    interimResults: boolean;
    /** Maximum alternatives */
    maxAlternatives: number;
    /** Confidence threshold */
    confidenceThreshold: number;
}
/**
 * Voice control events
 */
export interface VoiceControlEvents {
    'command-recognized': (command: VoiceControlCommand, confidence: number) => void;
    'command-executed': (command: VoiceControlCommand) => void;
    'speech-started': () => void;
    'speech-ended': () => void;
    'error': (error: string) => void;
    'landmark-navigated': (landmark: LandmarkInfo) => void;
}
/**
 * VoiceControlManager - Voice navigation system
 */
export declare class VoiceControlManager {
    private readonly config;
    private readonly eventListeners;
    private commands;
    private landmarks;
    private isInitialized;
    private isListening;
    private recognition;
    private speechSynthesis;
    constructor(config?: Partial<VoiceRecognitionConfig>);
    /**
     * Initialize voice control manager
     */
    init(): Promise<void>;
    /**
     * Start voice recognition
     */
    startListening(): void;
    /**
     * Stop voice recognition
     */
    stopListening(): void;
    /**
     * Add voice command
     */
    addCommand(command: VoiceControlCommand): void;
    /**
     * Remove voice command
     */
    removeCommand(phrase: string): boolean;
    /**
     * Get all voice commands
     */
    getCommands(): VoiceControlCommand[];
    /**
     * Navigate to landmark by name or type
     */
    navigateToLandmark(identifier: string): boolean;
    /**
     * Get all landmarks on page
     */
    getLandmarks(): LandmarkInfo[];
    /**
     * Refresh landmark scan
     */
    refreshLandmarks(): void;
    /**
     * Speak text using speech synthesis
     */
    speak(text: string, options?: {
        rate?: number;
        pitch?: number;
        volume?: number;
        voice?: SpeechSynthesisVoice;
    }): void;
    /**
     * Get available voices
     */
    getAvailableVoices(): SpeechSynthesisVoice[];
    /**
     * Check if voice control is supported
     */
    isSupported(): boolean;
    /**
     * Check if currently listening
     */
    isActive(): boolean;
    /**
     * Add event listener
     */
    on<K extends keyof VoiceControlEvents>(event: K, handler: VoiceControlEvents[K]): void;
    /**
     * Remove event listener
     */
    off<K extends keyof VoiceControlEvents>(event: K, handler: VoiceControlEvents[K]): void;
    /**
     * Destroy voice control manager
     */
    destroy(): void;
    private initializeEventMaps;
    private isSpeechRecognitionSupported;
    private isSpeechSynthesisSupported;
    private initializeSpeechRecognition;
    private initializeSpeechSynthesis;
    private handleSpeechResult;
    private handleSpeechError;
    private findCommand;
    private executeCommand;
    private setupDefaultCommands;
    private scanLandmarks;
    private addLandmark;
    private getElementRole;
    private getElementName;
    private findLandmark;
    private clickFocusedElement;
    private navigateNext;
    private navigatePrevious;
    private announceAvailableCommands;
    private emit;
}
//# sourceMappingURL=VoiceControlManager.d.ts.map