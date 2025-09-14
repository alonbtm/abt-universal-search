/**
 * AttributeSanitizer - Data attribute cleaning and metadata field sanitization
 * @description Provides comprehensive attribute sanitization and whitelist validation
 */
/**
 * Dangerous attribute patterns that should be blocked
 */
const DANGEROUS_ATTRIBUTE_PATTERNS = [
    // Event handlers
    /^on[a-z]+$/i,
    // JavaScript URLs in href/src
    /javascript\s*:/i,
    // Data URLs with scripts
    /data\s*:\s*text\/html/i,
    // VBScript
    /vbscript\s*:/i,
    // Style with expressions
    /expression\s*\(/i,
    // Import statements
    /@import/i,
    // Behavior (IE specific)
    /behavior\s*:/i,
    // Binding (IE specific)
    /binding\s*:/i,
];
/**
 * CSS properties that can be dangerous
 */
const DANGEROUS_CSS_PROPERTIES = [
    'expression',
    'behavior',
    'binding',
    '-moz-binding',
    'javascript',
    'vbscript',
    'data',
    'mocha',
    'livescript',
];
/**
 * Default attribute sanitization configuration
 */
export const DEFAULT_ATTRIBUTE_SANITIZATION_CONFIG = {
    allowedAttributes: [
        'id', 'class', 'title', 'alt', 'src', 'href', 'target', 'rel',
        'width', 'height', 'style', 'role', 'tabindex', 'lang', 'dir'
    ],
    maxAttributeLength: 2000,
    allowDataAttributes: true,
    allowedDataPrefixes: ['data-search', 'data-result', 'data-ui'],
    sanitizeValues: true,
    removeEmptyAttributes: true,
};
/**
 * AttributeSanitizer class for cleaning and validating HTML attributes
 */
export class AttributeSanitizer {
    constructor(config = {}) {
        this.config = { ...DEFAULT_ATTRIBUTE_SANITIZATION_CONFIG, ...config };
    }
    /**
     * Sanitize attributes object
     */
    sanitizeAttributes(attributes, customConfig) {
        const config = customConfig ? { ...this.config, ...customConfig } : this.config;
        const sanitizedAttributes = {};
        const removedAttributes = [];
        const modifiedValues = {};
        const warnings = [];
        let modified = false;
        for (const [key, value] of Object.entries(attributes)) {
            // Convert value to string
            const stringValue = String(value || '');
            // Check if attribute is allowed
            if (!this.isAttributeAllowed(key, config)) {
                removedAttributes.push(key);
                modified = true;
                warnings.push(`Removed dangerous attribute: ${key}`);
                continue;
            }
            // Check attribute length
            if (stringValue.length > config.maxAttributeLength) {
                removedAttributes.push(key);
                modified = true;
                warnings.push(`Removed attribute ${key}: exceeds maximum length ${config.maxAttributeLength}`);
                continue;
            }
            // Remove empty attributes if configured
            if (config.removeEmptyAttributes && !stringValue.trim()) {
                removedAttributes.push(key);
                modified = true;
                continue;
            }
            // Sanitize attribute value
            let sanitizedValue = stringValue;
            if (config.sanitizeValues) {
                sanitizedValue = this.sanitizeAttributeValue(key, stringValue, config);
                if (sanitizedValue !== stringValue) {
                    modified = true;
                    modifiedValues[key] = {
                        original: stringValue,
                        sanitized: sanitizedValue,
                    };
                }
            }
            // Final validation
            if (this.isValueSafe(key, sanitizedValue)) {
                sanitizedAttributes[key] = sanitizedValue;
            }
            else {
                removedAttributes.push(key);
                modified = true;
                warnings.push(`Removed attribute ${key}: unsafe value after sanitization`);
            }
        }
        return {
            sanitizedAttributes,
            modified,
            removedAttributes,
            modifiedValues,
            warnings,
        };
    }
    /**
     * Sanitize metadata fields specifically for search results
     */
    sanitizeMetadata(metadata) {
        const metadataConfig = {
            ...this.config,
            allowedAttributes: [
                'title', 'subtitle', 'description', 'category', 'icon', 'url',
                'timestamp', 'score', 'type', 'source', 'tags'
            ],
            allowDataAttributes: false,
            sanitizeValues: true,
            removeEmptyAttributes: true,
        };
        return this.sanitizeAttributes(metadata, metadataConfig);
    }
    /**
     * Clean CSS style attribute
     */
    sanitizeStyleAttribute(styleValue) {
        if (!styleValue || typeof styleValue !== 'string') {
            return '';
        }
        // Remove dangerous CSS properties
        const cleanStyle = styleValue;
        // Split by semicolon and process each declaration
        const declarations = cleanStyle.split(';').map(decl => decl.trim()).filter(Boolean);
        const safeDeclarations = [];
        for (const declaration of declarations) {
            const colonIndex = declaration.indexOf(':');
            if (colonIndex === -1)
                continue;
            const property = declaration.substring(0, colonIndex).trim().toLowerCase();
            const value = declaration.substring(colonIndex + 1).trim();
            // Check if property is safe
            if (this.isCSSPropertySafe(property, value)) {
                safeDeclarations.push(`${property}: ${value}`);
            }
        }
        return safeDeclarations.join('; ');
    }
    /**
     * Validate data attributes
     */
    validateDataAttribute(attributeName, value) {
        if (!attributeName.startsWith('data-')) {
            return false;
        }
        // Check if data attribute prefix is allowed
        if (this.config.allowedDataPrefixes && this.config.allowedDataPrefixes.length > 0) {
            const isAllowed = this.config.allowedDataPrefixes.some(prefix => attributeName.startsWith(prefix));
            if (!isAllowed) {
                return false;
            }
        }
        // Validate data attribute name format
        const dataName = attributeName.substring(5); // Remove 'data-'
        if (!/^[a-z][a-z0-9\-]*$/.test(dataName)) {
            return false;
        }
        // Validate value
        return this.isValueSafe(attributeName, value);
    }
    /**
     * Check if attribute is allowed
     */
    isAttributeAllowed(attributeName, config) {
        const lowerName = attributeName.toLowerCase();
        // Check for dangerous patterns
        for (const pattern of DANGEROUS_ATTRIBUTE_PATTERNS) {
            if (pattern.test(lowerName)) {
                return false;
            }
        }
        // Check if it's a data attribute
        if (lowerName.startsWith('data-')) {
            return config.allowDataAttributes && this.validateDataAttribute(lowerName, '');
        }
        // Check if it's an ARIA attribute
        if (lowerName.startsWith('aria-')) {
            return /^aria-[a-z][a-z0-9\-]*$/.test(lowerName);
        }
        // Check against allowed attributes list
        return config.allowedAttributes.includes(lowerName);
    }
    /**
     * Sanitize attribute value
     */
    sanitizeAttributeValue(attributeName, value, config) {
        let sanitized = value;
        // Handle different attribute types
        switch (attributeName.toLowerCase()) {
            case 'style':
                sanitized = this.sanitizeStyleAttribute(value);
                break;
            case 'href':
            case 'src':
                sanitized = this.sanitizeURLAttribute(value);
                break;
            case 'class':
                sanitized = this.sanitizeClassAttribute(value);
                break;
            case 'id':
                sanitized = this.sanitizeIdAttribute(value);
                break;
            default:
                sanitized = this.sanitizeGenericAttribute(value);
                break;
        }
        return sanitized;
    }
    /**
     * Sanitize URL attributes (href, src)
     */
    sanitizeURLAttribute(value) {
        // Remove dangerous protocols
        const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:', 'ftp:'];
        let sanitized = value.trim();
        for (const protocol of dangerousProtocols) {
            if (sanitized.toLowerCase().startsWith(protocol)) {
                return '#'; // Replace with safe placeholder
            }
        }
        // Remove control characters
        sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
        return sanitized;
    }
    /**
     * Sanitize class attribute
     */
    sanitizeClassAttribute(value) {
        return value
            .split(/\s+/)
            .filter(className => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(className))
            .join(' ');
    }
    /**
     * Sanitize ID attribute
     */
    sanitizeIdAttribute(value) {
        // ID must start with letter and contain only valid characters
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
            return '';
        }
        return value;
    }
    /**
     * Sanitize generic attribute value
     */
    sanitizeGenericAttribute(value) {
        // Remove control characters and dangerous patterns
        let sanitized = value.replace(/[\x00-\x1F\x7F]/g, '');
        // Remove script-like patterns
        sanitized = sanitized.replace(/javascript\s*:/gi, '');
        sanitized = sanitized.replace(/vbscript\s*:/gi, '');
        sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, '');
        return sanitized;
    }
    /**
     * Check if CSS property is safe
     */
    isCSSPropertySafe(property, value) {
        // Check for dangerous properties
        for (const dangerous of DANGEROUS_CSS_PROPERTIES) {
            if (property.includes(dangerous) || value.toLowerCase().includes(dangerous)) {
                return false;
            }
        }
        // Check for dangerous values
        const dangerousValuePatterns = [
            /javascript\s*:/i,
            /vbscript\s*:/i,
            /expression\s*\(/i,
            /behavior\s*:/i,
            /binding\s*:/i,
            /@import/i,
            /url\s*\(\s*["']?\s*javascript/i,
            /url\s*\(\s*["']?\s*data\s*:\s*text\/html/i,
        ];
        for (const pattern of dangerousValuePatterns) {
            if (pattern.test(value)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Check if attribute value is safe
     */
    isValueSafe(attributeName, value) {
        // Check for script injection patterns
        const scriptPatterns = [
            /<script/i,
            /javascript\s*:/i,
            /vbscript\s*:/i,
            /on\w+\s*=/i,
            /expression\s*\(/i,
        ];
        for (const pattern of scriptPatterns) {
            if (pattern.test(value)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Batch sanitize multiple attribute sets
     */
    batchSanitize(attributeSets, config) {
        return attributeSets.map(attrs => this.sanitizeAttributes(attrs, config));
    }
    /**
     * Get sanitization statistics
     */
    getSanitizationStats(attributes) {
        let dangerousAttributes = 0;
        let dataAttributes = 0;
        for (const [key, value] of Object.entries(attributes)) {
            const lowerKey = key.toLowerCase();
            // Count dangerous attributes
            if (lowerKey.startsWith('on') ||
                String(value).toLowerCase().includes('javascript:') ||
                String(value).toLowerCase().includes('vbscript:')) {
                dangerousAttributes++;
            }
            // Count data attributes
            if (lowerKey.startsWith('data-')) {
                dataAttributes++;
            }
        }
        // Estimate risk level
        let estimatedRisk = 'low';
        if (dangerousAttributes > 0) {
            estimatedRisk = 'high';
        }
        else if (dataAttributes > 10) {
            estimatedRisk = 'medium';
        }
        return {
            totalAttributes: Object.keys(attributes).length,
            dangerousAttributes,
            dataAttributes,
            estimatedRisk,
        };
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
/**
 * Default AttributeSanitizer instance
 */
export const defaultAttributeSanitizer = new AttributeSanitizer();
/**
 * Convenience function for quick attribute sanitization
 */
export function sanitizeAttributes(attributes, config) {
    return defaultAttributeSanitizer.sanitizeAttributes(attributes, config).sanitizedAttributes;
}
/**
 * Convenience function for metadata sanitization
 */
export function sanitizeMetadata(metadata) {
    return defaultAttributeSanitizer.sanitizeMetadata(metadata).sanitizedAttributes;
}
//# sourceMappingURL=AttributeSanitizer.js.map