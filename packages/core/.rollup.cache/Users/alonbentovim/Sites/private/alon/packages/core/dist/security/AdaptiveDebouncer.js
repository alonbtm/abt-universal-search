/**
 * Adaptive Debouncer - Smart debouncing with pattern recognition
 * @description Implements intelligent debouncing that adapts delay based on query frequency and patterns
 */
/**
 * Adaptive debouncer with pattern recognition and smart delay calculation
 */
export class AdaptiveDebouncer {
    constructor(config) {
        this.timeouts = new Map();
        this.inputHistory = [];
        this.patterns = [];
        this.config = {
            baseDelayMs: config.baseDelayMs,
            maxDelayMs: config.maxDelayMs,
            minDelayMs: config.minDelayMs,
            adaptationFactor: config.adaptationFactor,
            rapidTypingThreshold: config.rapidTypingThreshold,
            bypassConfidenceThreshold: config.bypassConfidenceThreshold,
            enablePatternOptimization: config.enablePatternOptimization
        };
        this.state = {
            lastInputTime: 0,
            inputFrequency: 0,
            patternConfidence: 0,
            currentDelay: this.config.baseDelayMs,
            inputSequence: [],
            typingPattern: 'normal'
        };
        this.initializePatterns();
    }
    /**
     * Debounce a function call with adaptive delay
     */
    debounce(fn, query, context) {
        const key = this.generateKey(query, context);
        return (...args) => {
            return new Promise((resolve, reject) => {
                // Clear existing timeout
                const existingTimeout = this.timeouts.get(key);
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                }
                // Analyze input and update state
                const analysis = this.analyzeInput(query);
                this.updateState(query, analysis);
                // Check if we should bypass debounce
                if (analysis.shouldBypass) {
                    try {
                        const result = fn(...args);
                        resolve(result);
                        return;
                    }
                    catch (error) {
                        reject(error);
                        return;
                    }
                }
                // Calculate adaptive delay
                const delay = this.calculateDelay(analysis);
                // Set new timeout
                const timeout = setTimeout(async () => {
                    try {
                        const result = await fn(...args);
                        resolve(result);
                    }
                    catch (error) {
                        reject(error);
                    }
                    finally {
                        this.timeouts.delete(key);
                    }
                }, delay);
                this.timeouts.set(key, timeout);
            });
        };
    }
    /**
     * Check if query should bypass debounce
     */
    shouldBypass(query) {
        const analysis = this.analyzeInput(query);
        return analysis.shouldBypass;
    }
    /**
     * Update debounce configuration
     */
    updateConfig(config) {
        Object.assign(this.config, config);
    }
    /**
     * Get current debounce state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Clear all pending debounced calls
     */
    clearAll() {
        for (const timeout of this.timeouts.values()) {
            clearTimeout(timeout);
        }
        this.timeouts.clear();
    }
    /**
     * Initialize query patterns for confidence scoring
     */
    initializePatterns() {
        this.patterns = [
            {
                name: 'exact_match',
                pattern: /^[a-zA-Z0-9\s]{2,50}$/,
                confidence: 0.9,
                description: 'Simple alphanumeric query'
            },
            {
                name: 'email',
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                confidence: 0.95,
                description: 'Email address'
            },
            {
                name: 'url',
                pattern: /^https?:\/\/[^\s]+$/,
                confidence: 0.9,
                description: 'URL'
            },
            {
                name: 'phone',
                pattern: /^[\+]?[1-9][\d]{0,15}$/,
                confidence: 0.85,
                description: 'Phone number'
            },
            {
                name: 'code',
                pattern: /^[A-Z0-9]{3,20}$/,
                confidence: 0.8,
                description: 'Code or identifier'
            },
            {
                name: 'sql_like',
                pattern: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)\b/i,
                confidence: 0.7,
                description: 'SQL-like query'
            },
            {
                name: 'json_like',
                pattern: /^\s*[\{\[]/,
                confidence: 0.75,
                description: 'JSON-like structure'
            },
            {
                name: 'quoted_string',
                pattern: /^["'][^"']*["']$/,
                confidence: 0.8,
                description: 'Quoted string'
            },
            {
                name: 'single_word',
                pattern: /^\w+$/,
                confidence: 0.6,
                description: 'Single word'
            },
            {
                name: 'multiple_words',
                pattern: /^\w+(\s+\w+)+$/,
                confidence: 0.7,
                description: 'Multiple words'
            }
        ];
    }
    /**
     * Analyze input for frequency, confidence, and typing patterns
     */
    analyzeInput(query) {
        const now = Date.now();
        const timeSinceLastInput = now - this.state.lastInputTime;
        // Calculate input frequency
        this.inputHistory.push({ timestamp: now, input: query });
        // Keep only recent history (last 10 seconds)
        this.inputHistory = this.inputHistory.filter(entry => now - entry.timestamp < 10000);
        const frequency = this.inputHistory.length / 10; // inputs per second
        // Calculate pattern confidence
        let confidence = 0;
        if (this.config.enablePatternOptimization) {
            confidence = this.calculatePatternConfidence(query);
        }
        // Determine typing pattern
        const typingPattern = this.classifyTypingPattern(frequency, timeSinceLastInput);
        // Determine if should bypass
        const shouldBypass = confidence >= this.config.bypassConfidenceThreshold ||
            (typingPattern === 'slow' && query.length > 10);
        return {
            frequency,
            confidence,
            typingPattern,
            shouldBypass
        };
    }
    /**
     * Calculate pattern confidence score
     */
    calculatePatternConfidence(query) {
        let maxConfidence = 0;
        for (const pattern of this.patterns) {
            if (pattern.pattern.test(query)) {
                maxConfidence = Math.max(maxConfidence, pattern.confidence);
            }
        }
        // Boost confidence for longer, more complete queries
        if (query.length > 20) {
            maxConfidence += 0.1;
        }
        // Reduce confidence for very short queries
        if (query.length < 3) {
            maxConfidence *= 0.5;
        }
        return Math.min(maxConfidence, 1.0);
    }
    /**
     * Classify typing pattern based on frequency and timing
     */
    classifyTypingPattern(frequency, timeSinceLastInput) {
        if (frequency > this.config.rapidTypingThreshold) {
            return 'rapid';
        }
        if (timeSinceLastInput < 100) {
            return 'burst';
        }
        if (timeSinceLastInput > 2000) {
            return 'slow';
        }
        return 'normal';
    }
    /**
     * Update internal state based on analysis
     */
    updateState(query, analysis) {
        const now = Date.now();
        this.state.lastInputTime = now;
        this.state.inputFrequency = analysis.frequency;
        this.state.patternConfidence = analysis.confidence;
        this.state.typingPattern = analysis.typingPattern;
        // Update input sequence (keep last 10)
        this.state.inputSequence.push(query);
        if (this.state.inputSequence.length > 10) {
            this.state.inputSequence.shift();
        }
    }
    /**
     * Calculate adaptive delay based on analysis
     */
    calculateDelay(analysis) {
        let delay = this.config.baseDelayMs;
        // Adjust based on typing pattern
        switch (analysis.typingPattern) {
            case 'rapid':
                delay *= this.config.adaptationFactor;
                break;
            case 'burst':
                delay *= (this.config.adaptationFactor * 0.8);
                break;
            case 'slow':
                delay *= 0.5;
                break;
            case 'normal':
                // Keep base delay
                break;
        }
        // Adjust based on confidence
        if (analysis.confidence > 0.8) {
            delay *= 0.6; // Reduce delay for high-confidence queries
        }
        else if (analysis.confidence < 0.3) {
            delay *= 1.4; // Increase delay for low-confidence queries
        }
        // Adjust based on frequency
        if (analysis.frequency > 2) {
            delay *= 1.5; // Increase delay for high frequency
        }
        // Apply bounds
        delay = Math.max(this.config.minDelayMs, delay);
        delay = Math.min(this.config.maxDelayMs, delay);
        this.state.currentDelay = delay;
        return delay;
    }
    /**
     * Generate unique key for debounce tracking
     */
    generateKey(query, context) {
        const contextStr = context ? JSON.stringify(context) : '';
        return `${query}:${contextStr}`;
    }
    /**
     * Get pattern analysis for debugging
     */
    getPatternAnalysis(query) {
        const matchedPatterns = this.patterns
            .filter(pattern => pattern.pattern.test(query))
            .map(pattern => ({
            name: pattern.name,
            confidence: pattern.confidence,
            description: pattern.description
        }));
        const overallConfidence = this.calculatePatternConfidence(query);
        return {
            matchedPatterns,
            overallConfidence
        };
    }
    /**
     * Get performance metrics
     */
    getMetrics() {
        const recentInputs = this.inputHistory.slice(-20);
        const bypassCount = recentInputs.filter(entry => this.calculatePatternConfidence(entry.input) >= this.config.bypassConfidenceThreshold).length;
        return {
            activeTimeouts: this.timeouts.size,
            inputHistorySize: this.inputHistory.length,
            averageDelay: this.state.currentDelay,
            bypassRate: recentInputs.length > 0 ? bypassCount / recentInputs.length : 0
        };
    }
}
/**
 * Default adaptive debounce configuration
 */
export const defaultAdaptiveDebounceConfig = {
    baseDelayMs: 300,
    maxDelayMs: 1000,
    minDelayMs: 100,
    adaptationFactor: 1.5,
    rapidTypingThreshold: 3,
    bypassConfidenceThreshold: 0.8,
    enablePatternOptimization: true
};
/**
 * Create adaptive debouncer with default configuration
 */
export function createAdaptiveDebouncer(config) {
    return new AdaptiveDebouncer({
        ...defaultAdaptiveDebounceConfig,
        ...config
    });
}
//# sourceMappingURL=AdaptiveDebouncer.js.map