/**
 * Validation utilities for Universal Search Component
 * @description Input validation and configuration validation functions
 */
/**
 * Custom validation error class
 */
export class ValidationError extends Error {
    // eslint-disable-next-line no-unused-vars
    constructor(message, field) {
        super(message);
        this.field = field;
        this.name = 'ValidationError';
    }
}
/**
 * Validates a DOM selector string
 */
export function validateSelector(selector) {
    if (!selector || typeof selector !== 'string') {
        throw new ValidationError('Selector must be a non-empty string');
    }
    if (selector.trim().length === 0) {
        throw new ValidationError('Selector cannot be empty or whitespace only');
    }
    // Basic CSS selector validation
    try {
        document.querySelector(selector);
    }
    catch (error) {
        throw new ValidationError(`Invalid CSS selector: ${selector}`);
    }
}
/**
 * Validates that a DOM element exists and is suitable for mounting
 */
export function validateTargetElement(element, selector) {
    if (!element) {
        throw new ValidationError(`Element not found for selector: ${selector}`);
    }
    // In browser environment, check for HTMLElement
    // In test environment (jsdom), check for Element with HTML methods but exclude SVG
    const isHTMLElement = (typeof HTMLElement !== 'undefined' && element instanceof HTMLElement) ||
        (element && typeof element.setAttribute === 'function' && typeof element.classList !== 'undefined' &&
            element.namespaceURI === 'http://www.w3.org/1999/xhtml');
    if (!isHTMLElement) {
        throw new ValidationError(`Target element must be an HTMLElement, got: ${element.constructor.name}`);
    }
    // Check if element is connected to the DOM (if isConnected property exists)
    if ('isConnected' in element && !element.isConnected) {
        throw new ValidationError('Target element is not connected to the DOM');
    }
}
/**
 * Validates search configuration object
 */
export function validateConfiguration(config) {
    if (!config || typeof config !== 'object') {
        throw new ValidationError('Configuration must be an object');
    }
    // Validate queryHandling if provided
    if (config.queryHandling) {
        const { queryHandling } = config;
        if (typeof queryHandling.minLength === 'number' && queryHandling.minLength < 0) {
            throw new ValidationError('minLength must be a non-negative number', 'queryHandling.minLength');
        }
        if (typeof queryHandling.debounceMs === 'number' && queryHandling.debounceMs < 0) {
            throw new ValidationError('debounceMs must be a non-negative number', 'queryHandling.debounceMs');
        }
        if (queryHandling.triggerOn && !['change', 'enter', 'both'].includes(queryHandling.triggerOn)) {
            throw new ValidationError('triggerOn must be one of: change, enter, both', 'queryHandling.triggerOn');
        }
        if (queryHandling.matchMode && !['exact', 'partial', 'fuzzy'].includes(queryHandling.matchMode)) {
            throw new ValidationError('matchMode must be one of: exact, partial, fuzzy', 'queryHandling.matchMode');
        }
    }
    // Validate ui config if provided
    if (config.ui) {
        const { ui } = config;
        if (typeof ui.maxResults === 'number' && (ui.maxResults < 1 || ui.maxResults > 1000)) {
            throw new ValidationError('maxResults must be between 1 and 1000', 'ui.maxResults');
        }
        if (typeof ui.placeholder === 'string' && ui.placeholder.length > 200) {
            throw new ValidationError('placeholder must be 200 characters or less', 'ui.placeholder');
        }
    }
    // Validate dataSource if provided
    if (config.dataSource) {
        const { dataSource } = config;
        if (!['api', 'sql', 'memory', 'dom'].includes(dataSource.type)) {
            throw new ValidationError('dataSource.type must be one of: api, sql, memory, dom', 'dataSource.type');
        }
        if (dataSource.type === 'api' && dataSource.url && typeof dataSource.url !== 'string') {
            throw new ValidationError('dataSource.url must be a string', 'dataSource.url');
        }
    }
}
/**
 * Sanitizes and normalizes a query string
 */
export function sanitizeQuery(query) {
    if (typeof query !== 'string') {
        return '';
    }
    return query.trim();
}
/**
 * Checks if a query meets minimum requirements
 */
export function isValidQuery(query, minLength) {
    const sanitized = sanitizeQuery(query);
    return sanitized.length >= minLength;
}
//# sourceMappingURL=validation.js.map