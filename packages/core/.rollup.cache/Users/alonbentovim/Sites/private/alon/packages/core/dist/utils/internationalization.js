/**
 * Core Internationalization Utilities
 * Shared utilities for i18n, RTL, and locale management
 */
/**
 * RTL language codes and their regions
 */
export const RTL_LOCALES = new Set([
    'ar', 'ar-AE', 'ar-BH', 'ar-DZ', 'ar-EG', 'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY',
    'ar-MA', 'ar-OM', 'ar-QA', 'ar-SA', 'ar-SD', 'ar-SY', 'ar-TN', 'ar-YE',
    'he', 'he-IL',
    'fa', 'fa-IR',
    'ur', 'ur-PK',
    'ps', 'ps-AF',
    'sd', 'sd-PK',
    'ku', 'ku-IQ',
    'dv', 'dv-MV'
]);
/**
 * Unicode ranges for different writing systems
 */
export const UNICODE_RANGES = {
    latin: [
        [0x0041, 0x005A], // Basic Latin uppercase
        [0x0061, 0x007A], // Basic Latin lowercase
        [0x00C0, 0x00FF], // Latin-1 Supplement
        [0x0100, 0x017F], // Latin Extended-A
        [0x0180, 0x024F], // Latin Extended-B
        [0x1E00, 0x1EFF] // Latin Extended Additional
    ],
    arabic: [
        [0x0600, 0x06FF], // Arabic
        [0x0750, 0x077F], // Arabic Supplement
        [0x08A0, 0x08FF], // Arabic Extended-A
        [0xFB50, 0xFDFF], // Arabic Presentation Forms-A
        [0xFE70, 0xFEFF] // Arabic Presentation Forms-B
    ],
    hebrew: [
        [0x0590, 0x05FF], // Hebrew
        [0xFB1D, 0xFB4F] // Hebrew Presentation Forms
    ],
    cjk: [
        [0x4E00, 0x9FFF], // CJK Unified Ideographs
        [0x3400, 0x4DBF], // CJK Extension A
        [0x20000, 0x2A6DF], // CJK Extension B
        [0x3040, 0x309F], // Hiragana
        [0x30A0, 0x30FF], // Katakana
        [0xAC00, 0xD7AF] // Hangul Syllables
    ],
    cyrillic: [
        [0x0400, 0x04FF], // Cyrillic
        [0x0500, 0x052F], // Cyrillic Supplement
        [0x2DE0, 0x2DFF], // Cyrillic Extended-A
        [0xA640, 0xA69F] // Cyrillic Extended-B
    ],
    devanagari: [
        [0x0900, 0x097F], // Devanagari
        [0xA8E0, 0xA8FF] // Devanagari Extended
    ],
    thai: [
        [0x0E00, 0x0E7F] // Thai
    ]
};
/**
 * Strong RTL characters (Hebrew, Arabic, etc.)
 */
export const RTL_CHAR_RANGES = [
    [0x0590, 0x05FF], // Hebrew
    [0x0600, 0x06FF], // Arabic
    [0x0700, 0x074F], // Syriac
    [0x0750, 0x077F], // Arabic Supplement
    [0x0780, 0x07BF], // Thaana
    [0x08A0, 0x08FF], // Arabic Extended-A
    [0xFB1D, 0xFB4F], // Hebrew Presentation Forms
    [0xFB50, 0xFDFF], // Arabic Presentation Forms-A
    [0xFE70, 0xFEFF] // Arabic Presentation Forms-B
];
/**
 * Check if a locale uses RTL text direction
 */
export function isRTLLocale(locale) {
    const normalizedLocale = locale.toLowerCase();
    return RTL_LOCALES.has(normalizedLocale) || RTL_LOCALES.has(normalizedLocale.split('-')[0]);
}
/**
 * Detect text direction from content
 */
export function detectTextDirection(text, threshold = 0.3) {
    let ltrChars = 0;
    let rtlChars = 0;
    let neutralChars = 0;
    for (const char of text) {
        const codePoint = char.codePointAt(0);
        if (!codePoint)
            continue;
        if (isRTLCharacter(codePoint)) {
            rtlChars++;
        }
        else if (isLTRCharacter(codePoint)) {
            ltrChars++;
        }
        else {
            neutralChars++;
        }
    }
    const totalChars = ltrChars + rtlChars + neutralChars;
    const rtlRatio = totalChars > 0 ? rtlChars / (ltrChars + rtlChars) : 0;
    const direction = rtlRatio >= threshold ? 'rtl' : 'ltr';
    const confidence = totalChars > 0 ? Math.abs(rtlRatio - 0.5) * 2 : 0;
    return {
        direction,
        confidence,
        method: 'content',
        ltrChars,
        rtlChars,
        neutralChars,
        totalChars
    };
}
/**
 * Check if a Unicode character is RTL
 */
export function isRTLCharacter(codePoint) {
    return RTL_CHAR_RANGES.some(([start, end]) => codePoint >= start && codePoint <= end);
}
/**
 * Check if a Unicode character is LTR
 */
export function isLTRCharacter(codePoint) {
    // Basic Latin, Latin Extended, and other LTR scripts
    return ((codePoint >= 0x0041 && codePoint <= 0x005A) || // A-Z
        (codePoint >= 0x0061 && codePoint <= 0x007A) || // a-z
        (codePoint >= 0x00C0 && codePoint <= 0x024F) || // Latin Extended
        (codePoint >= 0x0400 && codePoint <= 0x04FF) || // Cyrillic
        (codePoint >= 0x0370 && codePoint <= 0x03FF) // Greek
    );
}
/**
 * Detect writing system from text
 */
export function detectWritingSystem(text) {
    const systems = new Set();
    for (const char of text) {
        const codePoint = char.codePointAt(0);
        if (!codePoint)
            continue;
        for (const [system, ranges] of Object.entries(UNICODE_RANGES)) {
            if (ranges.some(([start, end]) => codePoint >= start && codePoint <= end)) {
                systems.add(system);
            }
        }
    }
    return systems.size > 1 ? ['mixed'] : Array.from(systems);
}
/**
 * Normalize locale code to standard format
 */
export function normalizeLocale(locale) {
    if (!locale)
        return 'en-US';
    const parts = locale.toLowerCase().split(/[-_]/);
    if (parts.length === 1) {
        // Add default region for common languages
        const defaults = {
            'ar': 'SA',
            'en': 'US',
            'es': 'ES',
            'fr': 'FR',
            'de': 'DE',
            'zh': 'CN',
            'ja': 'JP',
            'ko': 'KR',
            'he': 'IL',
            'ru': 'RU'
        };
        const region = defaults[parts[0]] || 'US';
        return `${parts[0]}-${region}`;
    }
    return `${parts[0]}-${parts[1].toUpperCase()}`;
}
/**
 * Get language code from locale
 */
export function getLanguageFromLocale(locale) {
    return locale.split('-')[0];
}
/**
 * Get region code from locale
 */
export function getRegionFromLocale(locale) {
    const parts = locale.split('-');
    return parts.length > 1 ? parts[1] : '';
}
/**
 * Check if locale is supported by Intl APIs
 */
export function isLocaleSupported(locale) {
    try {
        return Intl.DateTimeFormat.supportedLocalesOf([locale]).length > 0;
    }
    catch {
        return false;
    }
}
/**
 * Get best matching locale from supported list
 */
export function getBestMatchingLocale(requestedLocale, supportedLocales) {
    // Exact match
    if (supportedLocales.includes(requestedLocale)) {
        return requestedLocale;
    }
    // Language match (ignore region)
    const requestedLanguage = getLanguageFromLocale(requestedLocale);
    const languageMatch = supportedLocales.find(locale => getLanguageFromLocale(locale) === requestedLanguage);
    if (languageMatch) {
        return languageMatch;
    }
    // Default fallback
    return supportedLocales.includes('en-US') ? 'en-US' : supportedLocales[0];
}
/**
 * Analyze Unicode text for internationalization
 */
export function analyzeUnicodeText(text) {
    const normalized = text.normalize('NFC');
    const scripts = detectWritingSystem(text);
    let hasBidi = false;
    let hasCombining = false;
    let hasEmoji = false;
    const characterCounts = {
        latin: 0,
        arabic: 0,
        hebrew: 0,
        cjk: 0,
        cyrillic: 0,
        other: 0
    };
    for (const char of text) {
        const codePoint = char.codePointAt(0);
        if (!codePoint)
            continue;
        // Check for bidirectional text
        if (isRTLCharacter(codePoint) || isLTRCharacter(codePoint)) {
            hasBidi = true;
        }
        // Check for combining characters
        if (codePoint >= 0x0300 && codePoint <= 0x036F) {
            hasCombining = true;
        }
        // Check for emoji
        if (codePoint >= 0x1F600 && codePoint <= 0x1F64F) {
            hasEmoji = true;
        }
        // Count characters by script
        if (UNICODE_RANGES.latin.some(([start, end]) => codePoint >= start && codePoint <= end)) {
            characterCounts.latin++;
        }
        else if (UNICODE_RANGES.arabic.some(([start, end]) => codePoint >= start && codePoint <= end)) {
            characterCounts.arabic++;
        }
        else if (UNICODE_RANGES.hebrew.some(([start, end]) => codePoint >= start && codePoint <= end)) {
            characterCounts.hebrew++;
        }
        else if (UNICODE_RANGES.cjk.some(([start, end]) => codePoint >= start && codePoint <= end)) {
            characterCounts.cjk++;
        }
        else if (UNICODE_RANGES.cyrillic.some(([start, end]) => codePoint >= start && codePoint <= end)) {
            characterCounts.cyrillic++;
        }
        else {
            characterCounts.other++;
        }
    }
    const isValid = text === normalized; // Basic validation
    const validationErrors = [];
    if (!isValid) {
        validationErrors.push('Text contains invalid Unicode sequences');
    }
    return {
        original: text,
        normalized,
        scripts,
        hasBidi,
        hasCombining,
        hasEmoji,
        characterCounts,
        isValid,
        validationErrors
    };
}
/**
 * Perform bidirectional text analysis
 */
export function analyzeBidirectionalText(text) {
    const direction = detectTextDirection(text);
    const baseDirection = direction.direction;
    const segments = [];
    let currentSegment = '';
    let currentDirection = baseDirection;
    let startIndex = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const codePoint = char.codePointAt(0);
        if (!codePoint)
            continue;
        let charDirection;
        if (isRTLCharacter(codePoint)) {
            charDirection = 'rtl';
        }
        else if (isLTRCharacter(codePoint)) {
            charDirection = 'ltr';
        }
        else {
            charDirection = currentDirection; // Neutral characters inherit direction
        }
        if (charDirection !== currentDirection) {
            // Direction change - finalize current segment
            if (currentSegment) {
                segments.push({
                    text: currentSegment,
                    direction: currentDirection,
                    start: startIndex,
                    end: i,
                    level: currentDirection === baseDirection ? 0 : 1
                });
            }
            // Start new segment
            currentSegment = char;
            currentDirection = charDirection;
            startIndex = i;
        }
        else {
            currentSegment += char;
        }
    }
    // Add final segment
    if (currentSegment) {
        segments.push({
            text: currentSegment,
            direction: currentDirection,
            start: startIndex,
            end: text.length,
            level: currentDirection === baseDirection ? 0 : 1
        });
    }
    const requiresBidi = segments.some(segment => segment.direction !== baseDirection);
    const maxLevel = Math.max(...segments.map(segment => segment.level));
    return {
        original: text,
        baseDirection,
        segments,
        requiresBidi,
        maxLevel
    };
}
/**
 * Calculate RTL-aware positioning
 */
export function calculateRTLPosition(measurement, direction, containerWidth) {
    const isRTL = direction === 'rtl';
    const effectiveContainerWidth = containerWidth || measurement.scrollWidth;
    return {
        inlineStart: isRTL ? effectiveContainerWidth - measurement.right : measurement.left,
        inlineEnd: isRTL ? effectiveContainerWidth - measurement.left : measurement.right,
        blockStart: measurement.top,
        blockEnd: measurement.bottom,
        direction
    };
}
/**
 * Convert physical positioning to logical positioning
 */
export function toLogicalProperties(styles, direction) {
    const isRTL = direction === 'rtl';
    const logical = {};
    // Convert margin properties
    if (styles.marginLeft) {
        logical[isRTL ? 'margin-inline-end' : 'margin-inline-start'] = styles.marginLeft;
    }
    if (styles.marginRight) {
        logical[isRTL ? 'margin-inline-start' : 'margin-inline-end'] = styles.marginRight;
    }
    if (styles.marginTop) {
        logical['margin-block-start'] = styles.marginTop;
    }
    if (styles.marginBottom) {
        logical['margin-block-end'] = styles.marginBottom;
    }
    // Convert padding properties
    if (styles.paddingLeft) {
        logical[isRTL ? 'padding-inline-end' : 'padding-inline-start'] = styles.paddingLeft;
    }
    if (styles.paddingRight) {
        logical[isRTL ? 'padding-inline-start' : 'padding-inline-end'] = styles.paddingRight;
    }
    if (styles.paddingTop) {
        logical['padding-block-start'] = styles.paddingTop;
    }
    if (styles.paddingBottom) {
        logical['padding-block-end'] = styles.paddingBottom;
    }
    // Convert border properties
    if (styles.borderLeft) {
        logical[isRTL ? 'border-inline-end' : 'border-inline-start'] = styles.borderLeft;
    }
    if (styles.borderRight) {
        logical[isRTL ? 'border-inline-start' : 'border-inline-end'] = styles.borderRight;
    }
    if (styles.borderTop) {
        logical['border-block-start'] = styles.borderTop;
    }
    if (styles.borderBottom) {
        logical['border-block-end'] = styles.borderBottom;
    }
    // Convert positioning properties
    if (styles.left) {
        logical[isRTL ? 'inset-inline-end' : 'inset-inline-start'] = styles.left;
    }
    if (styles.right) {
        logical[isRTL ? 'inset-inline-start' : 'inset-inline-end'] = styles.right;
    }
    if (styles.top) {
        logical['inset-block-start'] = styles.top;
    }
    if (styles.bottom) {
        logical['inset-block-end'] = styles.bottom;
    }
    // Convert text alignment
    if (styles.textAlign) {
        switch (styles.textAlign) {
            case 'left':
                logical['text-align'] = 'start';
                break;
            case 'right':
                logical['text-align'] = 'end';
                break;
            default:
                logical['text-align'] = styles.textAlign;
        }
    }
    return logical;
}
/**
 * Get browser's preferred locales
 */
export function getBrowserLocales() {
    const languages = navigator.languages || [navigator.language];
    return languages.map(normalizeLocale);
}
/**
 * Format placeholder text with interpolation
 */
export function formatMessage(template, variables = {}) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key]?.toString() || match;
    });
}
/**
 * Escape text for safe interpolation
 */
export function escapeInterpolation(text) {
    return text.replace(/\{\{/g, '\\{\\{').replace(/\}\}/g, '\\}\\}');
}
/**
 * Check if CSS logical properties are supported
 */
export function supportsLogicalProperties() {
    if (typeof CSS === 'undefined' || !CSS.supports)
        return false;
    return CSS.supports('margin-inline-start', '0');
}
/**
 * Get text measurement for internationalization
 */
export function measureText(text, font, maxWidth) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        return { width: 0, height: 0 };
    }
    context.font = font;
    const metrics = context.measureText(text);
    return {
        width: maxWidth ? Math.min(metrics.width, maxWidth) : metrics.width,
        height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    };
}
//# sourceMappingURL=internationalization.js.map