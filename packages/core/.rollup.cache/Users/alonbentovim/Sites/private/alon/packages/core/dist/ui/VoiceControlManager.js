/**
 * VoiceControlManager - Voice navigation and landmark support
 * @description Proper landmark identification and voice software compatibility
 */
import { ValidationError } from '../utils/validation';
/**
 * VoiceControlManager - Voice navigation system
 */
export class VoiceControlManager {
    constructor(config = {}) {
        this.commands = new Map();
        this.landmarks = [];
        this.isInitialized = false;
        this.isListening = false;
        this.recognition = null; // SpeechRecognition
        this.speechSynthesis = null;
        this.config = {
            language: 'en-US',
            continuous: true,
            interimResults: false,
            maxAlternatives: 1,
            confidenceThreshold: 0.7,
            ...config
        };
        this.eventListeners = new Map();
        this.initializeEventMaps();
    }
    /**
     * Initialize voice control manager
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Check for speech recognition support
            if (!this.isSpeechRecognitionSupported()) {
                console.warn('Speech recognition not supported in this browser');
                return;
            }
            // Initialize speech recognition
            this.initializeSpeechRecognition();
            // Initialize speech synthesis
            this.initializeSpeechSynthesis();
            // Set up default commands
            this.setupDefaultCommands();
            // Scan for landmarks
            this.scanLandmarks();
            this.isInitialized = true;
        }
        catch (error) {
            throw new ValidationError(`Failed to initialize VoiceControlManager: ${error}`);
        }
    }
    /**
     * Start voice recognition
     */
    startListening() {
        if (!this.isInitialized || !this.recognition || this.isListening) {
            return;
        }
        try {
            this.recognition.start();
            this.isListening = true;
            this.emit('speech-started');
        }
        catch (error) {
            console.error('Failed to start voice recognition:', error);
            this.emit('error', `Failed to start listening: ${error}`);
        }
    }
    /**
     * Stop voice recognition
     */
    stopListening() {
        if (!this.recognition || !this.isListening) {
            return;
        }
        try {
            this.recognition.stop();
            this.isListening = false;
            this.emit('speech-ended');
        }
        catch (error) {
            console.error('Failed to stop voice recognition:', error);
        }
    }
    /**
     * Add voice command
     */
    addCommand(command) {
        this.commands.set(command.phrase.toLowerCase(), command);
        // Add alternatives
        if (command.alternatives) {
            command.alternatives.forEach(alt => {
                this.commands.set(alt.toLowerCase(), command);
            });
        }
    }
    /**
     * Remove voice command
     */
    removeCommand(phrase) {
        const command = this.commands.get(phrase.toLowerCase());
        if (command) {
            this.commands.delete(phrase.toLowerCase());
            // Remove alternatives
            if (command.alternatives) {
                command.alternatives.forEach(alt => {
                    this.commands.delete(alt.toLowerCase());
                });
            }
            return true;
        }
        return false;
    }
    /**
     * Get all voice commands
     */
    getCommands() {
        const uniqueCommands = new Map();
        this.commands.forEach(command => {
            uniqueCommands.set(command.phrase, command);
        });
        return Array.from(uniqueCommands.values());
    }
    /**
     * Navigate to landmark by name or type
     */
    navigateToLandmark(identifier) {
        try {
            const landmark = this.findLandmark(identifier);
            if (landmark) {
                // Focus the landmark element
                if (landmark.element.tabIndex < 0) {
                    landmark.element.tabIndex = -1;
                }
                landmark.element.focus();
                // Announce navigation
                if (this.speechSynthesis) {
                    this.speak(`Navigated to ${landmark.name}`);
                }
                this.emit('landmark-navigated', landmark);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Failed to navigate to landmark:', error);
            return false;
        }
    }
    /**
     * Get all landmarks on page
     */
    getLandmarks() {
        return [...this.landmarks];
    }
    /**
     * Refresh landmark scan
     */
    refreshLandmarks() {
        this.scanLandmarks();
    }
    /**
     * Speak text using speech synthesis
     */
    speak(text, options = {}) {
        if (!this.speechSynthesis) {
            return;
        }
        try {
            // Cancel any ongoing speech
            this.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = options.rate || 1;
            utterance.pitch = options.pitch || 1;
            utterance.volume = options.volume || 1;
            if (options.voice) {
                utterance.voice = options.voice;
            }
            this.speechSynthesis.speak(utterance);
        }
        catch (error) {
            console.error('Failed to speak text:', error);
        }
    }
    /**
     * Get available voices
     */
    getAvailableVoices() {
        return this.speechSynthesis ? this.speechSynthesis.getVoices() : [];
    }
    /**
     * Check if voice control is supported
     */
    isSupported() {
        return this.isSpeechRecognitionSupported() && this.isSpeechSynthesisSupported();
    }
    /**
     * Check if currently listening
     */
    isActive() {
        return this.isListening;
    }
    /**
     * Add event listener
     */
    on(event, handler) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(handler);
    }
    /**
     * Remove event listener
     */
    off(event, handler) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(handler);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }
    }
    /**
     * Destroy voice control manager
     */
    destroy() {
        try {
            // Stop listening
            this.stopListening();
            // Clean up speech synthesis
            if (this.speechSynthesis) {
                this.speechSynthesis.cancel();
            }
            // Clear commands and landmarks
            this.commands.clear();
            this.landmarks = [];
            // Clear event listeners
            this.eventListeners.clear();
            this.isInitialized = false;
        }
        catch (error) {
            console.error('Failed to destroy VoiceControlManager:', error);
        }
    }
    // Private implementation methods
    initializeEventMaps() {
        const events = [
            'command-recognized', 'command-executed', 'speech-started',
            'speech-ended', 'error', 'landmark-navigated'
        ];
        events.forEach(event => {
            this.eventListeners.set(event, []);
        });
    }
    isSpeechRecognitionSupported() {
        return !!(('webkitSpeechRecognition' in window) ||
            ('SpeechRecognition' in window));
    }
    isSpeechSynthesisSupported() {
        return 'speechSynthesis' in window;
    }
    initializeSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition ||
            window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            throw new ValidationError('Speech recognition not supported');
        }
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = this.config.continuous;
        this.recognition.interimResults = this.config.interimResults;
        this.recognition.lang = this.config.language;
        this.recognition.maxAlternatives = this.config.maxAlternatives;
        // Set up event handlers
        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };
        this.recognition.onerror = (event) => {
            this.handleSpeechError(event);
        };
        this.recognition.onend = () => {
            this.isListening = false;
            this.emit('speech-ended');
        };
    }
    initializeSpeechSynthesis() {
        if (this.isSpeechSynthesisSupported()) {
            this.speechSynthesis = window.speechSynthesis;
        }
    }
    handleSpeechResult(event) {
        try {
            const results = Array.from(event.results);
            const lastResult = results[results.length - 1];
            if (lastResult && lastResult.isFinal) {
                const transcript = lastResult[0].transcript.trim().toLowerCase();
                const confidence = lastResult[0].confidence;
                // Check confidence threshold
                if (confidence >= this.config.confidenceThreshold) {
                    const command = this.findCommand(transcript);
                    if (command) {
                        this.executeCommand(command, confidence);
                    }
                }
            }
        }
        catch (error) {
            console.error('Failed to handle speech result:', error);
            this.emit('error', `Speech processing error: ${error}`);
        }
    }
    handleSpeechError(event) {
        let errorMessage = 'Speech recognition error';
        switch (event.error) {
            case 'no-speech':
                errorMessage = 'No speech was detected';
                break;
            case 'audio-capture':
                errorMessage = 'Audio capture failed';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone permission denied';
                break;
            case 'network':
                errorMessage = 'Network error during recognition';
                break;
            default:
                errorMessage = `Speech recognition error: ${event.error}`;
        }
        this.emit('error', errorMessage);
    }
    findCommand(transcript) {
        // Direct match
        const command = this.commands.get(transcript);
        if (command && command.enabled) {
            return command;
        }
        // Partial match (contains the phrase)
        for (const [phrase, cmd] of this.commands.entries()) {
            if (cmd.enabled && transcript.includes(phrase)) {
                return cmd;
            }
        }
        return null;
    }
    executeCommand(command, confidence) {
        try {
            this.emit('command-recognized', command, confidence);
            if (command.enabled) {
                command.action();
                this.emit('command-executed', command);
            }
        }
        catch (error) {
            console.error('Failed to execute command:', error);
            this.emit('error', `Command execution error: ${error}`);
        }
    }
    setupDefaultCommands() {
        // Navigation commands
        this.addCommand({
            phrase: 'go to main',
            alternatives: ['main content', 'navigate to main'],
            action: () => this.navigateToLandmark('main'),
            description: 'Navigate to main content',
            enabled: true
        });
        this.addCommand({
            phrase: 'go to navigation',
            alternatives: ['nav', 'navigate to nav'],
            action: () => this.navigateToLandmark('navigation'),
            description: 'Navigate to navigation menu',
            enabled: true
        });
        this.addCommand({
            phrase: 'go to search',
            alternatives: ['search box', 'find search'],
            action: () => this.navigateToLandmark('search'),
            description: 'Navigate to search box',
            enabled: true
        });
        // Interaction commands
        this.addCommand({
            phrase: 'click',
            alternatives: ['activate', 'select'],
            action: () => this.clickFocusedElement(),
            description: 'Activate focused element',
            enabled: true
        });
        this.addCommand({
            phrase: 'next',
            alternatives: ['next item', 'move next'],
            action: () => this.navigateNext(),
            description: 'Move to next focusable element',
            enabled: true
        });
        this.addCommand({
            phrase: 'previous',
            alternatives: ['prev', 'back', 'move back'],
            action: () => this.navigatePrevious(),
            description: 'Move to previous focusable element',
            enabled: true
        });
        // Help command
        this.addCommand({
            phrase: 'help',
            alternatives: ['what can i say', 'voice commands'],
            action: () => this.announceAvailableCommands(),
            description: 'List available voice commands',
            enabled: true
        });
    }
    scanLandmarks() {
        this.landmarks = [];
        // Scan for ARIA landmarks
        const landmarkSelectors = [
            '[role="main"]', 'main',
            '[role="navigation"]', 'nav',
            '[role="banner"]', 'header',
            '[role="contentinfo"]', 'footer',
            '[role="complementary"]', 'aside',
            '[role="search"]',
            '[role="form"]', 'form',
            '[role="region"]'
        ];
        landmarkSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const htmlElement = element;
                this.addLandmark(htmlElement);
            });
        });
        // Scan for headings
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
            const htmlHeading = heading;
            const level = parseInt(htmlHeading.tagName.substring(1));
            const text = htmlHeading.textContent?.trim();
            if (text) {
                this.landmarks.push({
                    element: htmlHeading,
                    type: 'heading',
                    name: text,
                    level
                });
            }
        });
    }
    addLandmark(element) {
        const role = this.getElementRole(element);
        const name = this.getElementName(element);
        if (role && name) {
            this.landmarks.push({
                element,
                type: role,
                name,
                description: element.getAttribute('aria-describedby') || undefined
            });
        }
    }
    getElementRole(element) {
        // Check explicit role
        const explicitRole = element.getAttribute('role');
        if (explicitRole) {
            return explicitRole;
        }
        // Implicit roles based on tag
        const tagRoles = {
            'main': 'main',
            'nav': 'navigation',
            'header': 'banner',
            'footer': 'contentinfo',
            'aside': 'complementary',
            'form': 'form',
            'section': 'region'
        };
        return tagRoles[element.tagName.toLowerCase()] || null;
    }
    getElementName(element) {
        // Check aria-label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) {
            return ariaLabel;
        }
        // Check aria-labelledby
        const labelledBy = element.getAttribute('aria-labelledby');
        if (labelledBy) {
            const labelElement = document.getElementById(labelledBy);
            if (labelElement) {
                return labelElement.textContent?.trim() || '';
            }
        }
        // Fall back to text content for some elements
        if (['nav', 'main', 'aside'].includes(element.tagName.toLowerCase())) {
            const textContent = element.textContent?.trim();
            if (textContent && textContent.length < 50) {
                return textContent;
            }
        }
        // Default names based on role/tag
        const defaultNames = {
            'main': 'Main content',
            'navigation': 'Navigation',
            'banner': 'Header',
            'contentinfo': 'Footer',
            'complementary': 'Sidebar',
            'search': 'Search',
            'form': 'Form'
        };
        const role = this.getElementRole(element);
        return defaultNames[role || element.tagName.toLowerCase()] || element.tagName;
    }
    findLandmark(identifier) {
        const lowerIdentifier = identifier.toLowerCase();
        // Find by exact name match
        let landmark = this.landmarks.find(l => l.name.toLowerCase() === lowerIdentifier);
        if (landmark)
            return landmark;
        // Find by role/type
        landmark = this.landmarks.find(l => l.type.toLowerCase() === lowerIdentifier);
        if (landmark)
            return landmark;
        // Find by partial name match
        landmark = this.landmarks.find(l => l.name.toLowerCase().includes(lowerIdentifier));
        return landmark || null;
    }
    clickFocusedElement() {
        const focusedElement = document.activeElement;
        if (focusedElement) {
            focusedElement.click();
        }
    }
    navigateNext() {
        // Simple tab navigation - could be enhanced with more sophisticated logic
        const event = new KeyboardEvent('keydown', {
            key: 'Tab',
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }
    navigatePrevious() {
        const event = new KeyboardEvent('keydown', {
            key: 'Tab',
            shiftKey: true,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }
    announceAvailableCommands() {
        const commandList = this.getCommands()
            .filter(cmd => cmd.enabled)
            .map(cmd => cmd.phrase)
            .join(', ');
        const message = `Available voice commands: ${commandList}`;
        this.speak(message);
    }
    emit(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(...args);
                }
                catch (error) {
                    console.error(`Error in VoiceControlManager ${event} listener:`, error);
                }
            });
        }
    }
}
//# sourceMappingURL=VoiceControlManager.js.map