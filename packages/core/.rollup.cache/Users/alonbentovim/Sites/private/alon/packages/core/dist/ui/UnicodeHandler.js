/**
 * Unicode Handler
 * Comprehensive Unicode and international character processing
 */
import { ValidationError } from '../utils/validation';
import { analyzeUnicodeText, analyzeBidirectionalText, detectWritingSystem } from '../utils/internationalization';
/**
 * Unicode normalization form mapping
 */
const NORMALIZATION_FORMS = {
    NFC: 'NFC',
    NFD: 'NFD',
    NFKC: 'NFKC',
    NFKD: 'NFKD'
};
/**
 * Comprehensive Unicode processing with normalization and validation
 */
export class UnicodeHandler {
    constructor(config = {}) {
        this.isInitialized = false;
        this.eventListeners = new Map();
        // Character category mappings
        this.characterCategories = [
            { category: 'Latin', description: 'Latin script', range: [0x0000, 0x024F] },
            { category: 'Arabic', description: 'Arabic script', range: [0x0600, 0x06FF] },
            { category: 'Hebrew', description: 'Hebrew script', range: [0x0590, 0x05FF] },
            { category: 'CJK', description: 'Chinese, Japanese, Korean', range: [0x4E00, 0x9FFF] },
            { category: 'Cyrillic', description: 'Cyrillic script', range: [0x0400, 0x04FF] },
            { category: 'Devanagari', description: 'Devanagari script', range: [0x0900, 0x097F] },
            { category: 'Thai', description: 'Thai script', range: [0x0E00, 0x0E7F] },
            { category: 'Emoji', description: 'Emoji and symbols', range: [0x1F600, 0x1F64F] },
            { category: 'Combining', description: 'Combining diacritical marks', range: [0x0300, 0x036F] }
        ];
        // Cache for expensive operations
        this.analysisCache = new Map();
        this.bidiCache = new Map();
        this.normalizationCache = new Map();
        this.config = {
            normalizationForm: 'NFC',
            enableBidi: true,
            enableCombining: true,
            handleEmoji: true,
            validateInput: true,
            debugMode: false,
            ...config
        };
        this.initializeEventMaps();
    }
    /**
     * Initialize Unicode handler
     */
    async init() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Validate Unicode support
            this.validateUnicodeSupport();
            this.isInitialized = true;
            if (this.config.debugMode) {
                console.log('UnicodeHandler initialized', {
                    normalizationForm: this.config.normalizationForm,
                    bidiEnabled: this.config.enableBidi,
                    emojiEnabled: this.config.handleEmoji
                });
            }
        }
        catch (error) {
            throw new ValidationError(`Failed to initialize UnicodeHandler: ${error}`);
        }
    }
    /**
     * Destroy Unicode handler and cleanup resources
     */
    destroy() {
        this.analysisCache.clear();
        this.bidiCache.clear();
        this.normalizationCache.clear();
        this.eventListeners.clear();
        this.isInitialized = false;
    }
    /**
     * Normalize Unicode text
     */
    normalizeText(text, form) {
        if (!text)
            return text;
        const normalizationForm = form || this.config.normalizationForm;
        const cacheKey = `${normalizationForm}:${text}`;
        // Check cache
        if (this.normalizationCache.has(cacheKey)) {
            return this.normalizationCache.get(cacheKey);
        }
        try {
            const normalized = text.normalize(normalizationForm);
            // Cache result
            this.normalizationCache.set(cacheKey, normalized);
            if (this.config.debugMode && normalized !== text) {
                console.log('Text normalized', {
                    original: text,
                    normalized,
                    form: normalizationForm
                });
            }
            return normalized;
        }
        catch (error) {
            console.error('Unicode normalization failed:', error);
            return text;
        }
    }
    /**
     * Validate Unicode text
     */
    validateUnicode(text) {
        if (!this.config.validateInput) {
            return true;
        }
        try {
            // Check for invalid Unicode sequences
            const normalized = this.normalizeText(text);
            // Check for replacement characters (indicates invalid Unicode)
            if (normalized.includes('\uFFFD')) {
                return false;
            }
            // Check for control characters (except common ones)
            for (let i = 0; i < normalized.length; i++) {
                const codePoint = normalized.codePointAt(i);
                if (!codePoint)
                    continue;
                // Reject most control characters except tab, newline, carriage return
                if (codePoint < 0x20 && ![0x09, 0x0A, 0x0D].includes(codePoint)) {
                    return false;
                }
                // Skip high surrogates
                if (codePoint > 0xFFFF) {
                    i++; // Skip the next character as it's part of the surrogate pair
                }
            }
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Sanitize Unicode text
     */
    sanitizeText(text) {
        if (!text)
            return text;
        let sanitized = this.normalizeText(text);
        // Remove or replace problematic characters
        sanitized = sanitized.replace(/\uFFFD/g, ''); // Remove replacement characters
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters
        // Handle combining characters if disabled
        if (!this.config.enableCombining) {
            sanitized = sanitized.replace(/[\u0300-\u036F]/g, '');
        }
        // Handle emoji if disabled
        if (!this.config.handleEmoji) {
            sanitized = sanitized.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
        }
        return sanitized;
    }
    /**
     * Analyze Unicode text comprehensively
     */
    analyzeText(text) {
        if (!text) {
            return {
                original: text,
                normalized: text,
                scripts: [],
                hasBidi: false,
                hasCombining: false,
                hasEmoji: false,
                characterCounts: {
                    latin: 0,
                    arabic: 0,
                    hebrew: 0,
                    cjk: 0,
                    cyrillic: 0,
                    other: 0
                },
                isValid: true,
                validationErrors: []
            };
        }
        // Check cache
        if (this.analysisCache.has(text)) {
            return this.analysisCache.get(text);
        }
        const result = analyzeUnicodeText(text);
        // Cache result
        this.analysisCache.set(text, result);
        // Emit processing event
        this.emit('unicode-processed', result);
        if (this.config.debugMode) {
            console.log('Unicode analysis completed', {
                textLength: text.length,
                scripts: result.scripts,
                hasBidi: result.hasBidi,
                isValid: result.isValid
            });
        }
        return result;
    }
    /**
     * Analyze bidirectional text
     */
    analyzeBidirectionalText(text) {
        if (!text || !this.config.enableBidi) {
            return {
                original: text,
                baseDirection: 'ltr',
                segments: [],
                requiresBidi: false,
                maxLevel: 0
            };
        }
        // Check cache
        if (this.bidiCache.has(text)) {
            return this.bidiCache.get(text);
        }
        const result = analyzeBidirectionalText(text);
        // Cache result
        this.bidiCache.set(text, result);
        if (this.config.debugMode && result.requiresBidi) {
            console.log('Bidirectional text detected', {
                baseDirection: result.baseDirection,
                segments: result.segments.length,
                maxLevel: result.maxLevel
            });
        }
        return result;
    }
    /**
     * Process search query with Unicode normalization
     */
    processSearchQuery(query) {
        if (!query)
            return query;
        // Normalize
        let processed = this.normalizeText(query);
        // Sanitize
        processed = this.sanitizeText(processed);
        // Trim whitespace
        processed = processed.trim();
        // Normalize whitespace
        processed = processed.replace(/\s+/g, ' ');
        return processed;
    }
    /**
     * Compare Unicode strings with normalization
     */
    compareStrings(a, b, caseSensitive = false) {
        const normalizedA = this.normalizeText(a);
        const normalizedB = this.normalizeText(b);
        if (!caseSensitive) {
            return normalizedA.toLowerCase().localeCompare(normalizedB.toLowerCase());
        }
        return normalizedA.localeCompare(normalizedB);
    }
    /**
     * Check if text contains specific script
     */
    containsScript(text, script) {
        const analysis = this.analyzeText(text);
        return analysis.scripts.includes(script);
    }
    /**
     * Extract text by script
     */
    extractByScript(text, script) {
        const result = [];
        for (const char of text) {
            const codePoint = char.codePointAt(0);
            if (!codePoint)
                continue;
            const charScripts = detectWritingSystem(char);
            if (charScripts.includes(script)) {
                result.push(char);
            }
        }
        return result.join('');
    }
    /**
     * Convert text to safe identifier
     */
    toSafeIdentifier(text) {
        // Normalize and sanitize
        let identifier = this.processSearchQuery(text);
        // Replace non-ASCII letters/digits with underscores
        identifier = identifier.replace(/[^\w\s-]/g, '_');
        // Replace whitespace with hyphens
        identifier = identifier.replace(/\s+/g, '-');
        // Remove consecutive hyphens/underscores
        identifier = identifier.replace(/[-_]+/g, '-');
        // Trim hyphens from ends
        identifier = identifier.replace(/^-+|-+$/g, '');
        return identifier.toLowerCase();
    }
    /**
     * Get character information
     */
    getCharacterInfo(char) {
        if (!char || char.length === 0)
            return null;
        const codePoint = char.codePointAt(0);
        if (!codePoint)
            return null;
        const scripts = detectWritingSystem(char);
        const category = this.getCharacterCategory(codePoint);
        return {
            codePoint,
            category,
            script: scripts,
            name: this.getCharacterName(codePoint),
            isBidi: this.isBidirectionalCharacter(codePoint),
            isCombining: this.isCombiningCharacter(codePoint),
            isEmoji: this.isEmojiCharacter(codePoint)
        };
    }
    /**
     * Escape Unicode for safe HTML/JSON
     */
    escapeUnicode(text) {
        return text.replace(/[\u0080-\uFFFF]/g, (match) => {
            const codePoint = match.codePointAt(0);
            return codePoint ? `\\u${codePoint.toString(16).padStart(4, '0')}` : match;
        });
    }
    /**
     * Unescape Unicode sequences
     */
    unescapeUnicode(text) {
        return text.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
            return String.fromCodePoint(parseInt(hex, 16));
        });
    }
    /**
     * Get text statistics
     */
    getTextStatistics(text) {
        const analysis = this.analyzeText(text);
        // Count graphemes (user-perceived characters)
        const segmenter = Intl.Segmenter ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;
        const graphemeCount = segmenter ? Array.from(segmenter.segment(text)).length : text.length;
        // Count code points
        const codePointCount = Array.from(text).length;
        // Count words
        const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        // Count lines
        const lineCount = text.split(/\r?\n/).length;
        return {
            totalLength: text.length,
            codePointCount,
            graphemeCount,
            wordCount,
            lineCount,
            scripts: analysis.scripts,
            characterCounts: analysis.characterCounts
        };
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
    // Private implementation methods
    validateUnicodeSupport() {
        // Check for Unicode normalization support
        if (!String.prototype.normalize) {
            throw new Error('Unicode normalization not supported');
        }
        // Test normalization
        try {
            'test'.normalize('NFC');
        }
        catch {
            throw new Error('Unicode normalization failed');
        }
        // Check for Intl support
        if (!Intl || !Intl.Collator) {
            console.warn('Intl API not fully supported, some features may not work');
        }
    }
    getCharacterCategory(codePoint) {
        for (const category of this.characterCategories) {
            if (codePoint >= category.range[0] && codePoint <= category.range[1]) {
                return category.category;
            }
        }
        return 'Other';
    }
    getCharacterName(codePoint) {
        // Simplified character name generation
        if (codePoint >= 0x0041 && codePoint <= 0x005A) {
            return `LATIN CAPITAL LETTER ${String.fromCodePoint(codePoint)}`;
        }
        if (codePoint >= 0x0061 && codePoint <= 0x007A) {
            return `LATIN SMALL LETTER ${String.fromCodePoint(codePoint).toUpperCase()}`;
        }
        if (codePoint >= 0x0030 && codePoint <= 0x0039) {
            return `DIGIT ${String.fromCodePoint(codePoint)}`;
        }
        return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
    }
    isBidirectionalCharacter(codePoint) {
        // RTL characters
        if ((codePoint >= 0x0590 && codePoint <= 0x05FF) || // Hebrew
            (codePoint >= 0x0600 && codePoint <= 0x06FF) || // Arabic
            (codePoint >= 0x0700 && codePoint <= 0x074F)) { // Syriac
            return true;
        }
        // LTR characters
        if ((codePoint >= 0x0041 && codePoint <= 0x005A) || // A-Z
            (codePoint >= 0x0061 && codePoint <= 0x007A)) { // a-z
            return true;
        }
        return false;
    }
    isCombiningCharacter(codePoint) {
        return codePoint >= 0x0300 && codePoint <= 0x036F;
    }
    isEmojiCharacter(codePoint) {
        return (codePoint >= 0x1F600 && codePoint <= 0x1F64F) || // Emoticons
            (codePoint >= 0x1F300 && codePoint <= 0x1F5FF) || // Misc Symbols
            (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) || // Transport
            (codePoint >= 0x1F1E0 && codePoint <= 0x1F1FF); // Flags
    }
    emit(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(...args);
                }
                catch (error) {
                    console.error(`Error in UnicodeHandler ${event} listener:`, error);
                }
            });
        }
    }
    initializeEventMaps() {
        const events = [
            'unicode-processed'
        ];
        events.forEach(event => {
            this.eventListeners.set(event, []);
        });
    }
}
//# sourceMappingURL=UnicodeHandler.js.map