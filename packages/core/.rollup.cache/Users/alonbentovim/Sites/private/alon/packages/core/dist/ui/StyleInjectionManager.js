import { ValidationError } from '../errors/ThemingErrors';
export class StyleInjectionManager {
    constructor(options = {
        enableScoping: true,
        namespace: 'alon',
        allowOverrides: false,
        validateCSS: true,
        minifyCSS: true,
        conflictResolution: 'warn',
        generateSourceMap: false
    }) {
        this.options = options;
        this.injectedStyles = new Map();
        this.styleElements = new Map();
        this.conflictRules = new Map();
        this.initializeObserver();
    }
    injectStyle(scope) {
        const id = this.generateStyleId(scope);
        const processedScope = {
            ...scope,
            id,
            css: this.processCSS(scope.css, scope)
        };
        if (this.options.validateCSS) {
            const validation = this.validateCSS(processedScope.css);
            if (!validation.valid) {
                throw new ValidationError(`Invalid CSS: ${validation.errors.join(', ')}`);
            }
        }
        this.detectAndResolveConflicts(processedScope);
        this.applyStyleScope(processedScope);
        this.injectToDOM(processedScope);
        this.injectedStyles.set(id, processedScope);
        return id;
    }
    removeStyle(id) {
        const scope = this.injectedStyles.get(id);
        if (!scope) {
            return false;
        }
        const element = this.styleElements.get(id);
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
        this.injectedStyles.delete(id);
        this.styleElements.delete(id);
        this.conflictRules.delete(id);
        return true;
    }
    updateStyle(id, css) {
        const scope = this.injectedStyles.get(id);
        if (!scope) {
            return false;
        }
        const updatedScope = {
            ...scope,
            css: this.processCSS(css, scope)
        };
        if (this.options.validateCSS) {
            const validation = this.validateCSS(updatedScope.css);
            if (!validation.valid) {
                throw new ValidationError(`Invalid CSS: ${validation.errors.join(', ')}`);
            }
        }
        this.detectAndResolveConflicts(updatedScope);
        this.applyStyleScope(updatedScope);
        this.updateDOMElement(updatedScope);
        this.injectedStyles.set(id, updatedScope);
        return true;
    }
    getStyle(id) {
        return this.injectedStyles.get(id);
    }
    getAllStyles() {
        return Array.from(this.injectedStyles.values())
            .sort((a, b) => a.priority - b.priority);
    }
    hasConflicts() {
        return this.conflictRules.size > 0;
    }
    getConflicts() {
        return Array.from(this.conflictRules.values());
    }
    resolveConflict(id, resolution) {
        const conflict = this.conflictRules.get(id);
        if (!conflict) {
            return false;
        }
        conflict.resolution = resolution;
        switch (resolution) {
            case 'override':
                this.applyConflictOverride(conflict);
                break;
            case 'merge':
                this.applyConflictMerge(conflict);
                break;
            case 'ignore':
                this.removeConflictStyle(conflict);
                break;
        }
        return true;
    }
    clearAllStyles() {
        const ids = Array.from(this.injectedStyles.keys());
        ids.forEach(id => this.removeStyle(id));
    }
    exportStyles(format = 'css') {
        const styles = this.getAllStyles();
        if (format === 'json') {
            return JSON.stringify({
                styles: styles.map(style => ({
                    id: style.id,
                    css: style.css,
                    scope: style.scope,
                    priority: style.priority,
                    namespace: style.namespace,
                    media: style.media,
                    container: style.container
                })),
                conflicts: this.getConflicts(),
                options: this.options
            }, null, 2);
        }
        return styles
            .map(style => {
            let css = style.css;
            if (style.media) {
                css = `@media ${style.media} {\n${css}\n}`;
            }
            if (style.container) {
                css = `@container ${style.container} {\n${css}\n}`;
            }
            return `/* Style: ${style.id} | Scope: ${style.scope} | Priority: ${style.priority} */\n${css}`;
        })
            .join('\n\n');
    }
    setOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }
    destroy() {
        this.clearAllStyles();
        if (this.observer) {
            this.observer.disconnect();
            this.observer = undefined;
        }
    }
    generateStyleId(scope) {
        const hash = this.hashCSS(scope.css);
        return `${this.options.namespace}-${scope.scope}-${hash}`;
    }
    hashCSS(css) {
        let hash = 0;
        for (let i = 0; i < css.length; i++) {
            const char = css.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    processCSS(css, scope) {
        let processedCSS = css;
        if (this.options.minifyCSS) {
            processedCSS = this.minifyCSS(processedCSS);
        }
        if (this.options.enableScoping && scope.scope !== 'global') {
            processedCSS = this.applyScopingRules(processedCSS, scope);
        }
        return processedCSS;
    }
    minifyCSS(css) {
        return css
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\s+/g, ' ')
            .replace(/;\s*}/g, '}')
            .replace(/\s*{\s*/g, '{')
            .replace(/;\s*/g, ';')
            .replace(/,\s*/g, ',')
            .replace(/:\s*/g, ':')
            .trim();
    }
    applyScopingRules(css, scope) {
        const namespace = scope.namespace || this.options.namespace;
        const prefix = `.${namespace}`;
        return css.replace(/([^{}]+){/g, (match, selector) => {
            const cleanSelector = selector.trim();
            if (cleanSelector.startsWith('@')) {
                return match;
            }
            if (cleanSelector.includes(prefix)) {
                return match;
            }
            const scopedSelectors = cleanSelector
                .split(',')
                .map(sel => {
                const trimmedSel = sel.trim();
                if (trimmedSel.startsWith(':root') || trimmedSel.startsWith('*')) {
                    return trimmedSel;
                }
                return `${prefix} ${trimmedSel}`;
            })
                .join(', ');
            return `${scopedSelectors} {`;
        });
    }
    validateCSS(css) {
        const errors = [];
        const warnings = [];
        const parsedRules = [];
        try {
            const tempStyle = document.createElement('style');
            tempStyle.textContent = css;
            document.head.appendChild(tempStyle);
            const sheet = tempStyle.sheet;
            if (sheet) {
                for (let i = 0; i < sheet.cssRules.length; i++) {
                    parsedRules.push(sheet.cssRules[i]);
                }
            }
            document.head.removeChild(tempStyle);
            if (css.includes('expression(')) {
                errors.push('CSS expressions are not allowed for security');
            }
            if (css.includes('javascript:')) {
                errors.push('JavaScript URLs are not allowed in CSS');
            }
            const invalidProperties = css.match(/-webkit-[a-z-]+(?=\s*:)/g);
            if (invalidProperties) {
                warnings.push(`Vendor prefixes detected: ${invalidProperties.join(', ')}`);
            }
        }
        catch (error) {
            errors.push(`CSS parsing error: ${error.message}`);
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            parsedRules
        };
    }
    detectAndResolveConflicts(scope) {
        const existingStyles = Array.from(this.injectedStyles.values());
        const conflicts = [];
        existingStyles.forEach(existing => {
            const conflict = this.findStyleConflicts(existing, scope);
            if (conflict) {
                conflicts.push(conflict);
            }
        });
        conflicts.forEach(conflict => {
            const conflictId = `${scope.id}-${conflict.property}-${conflict.selector}`;
            this.conflictRules.set(conflictId, conflict);
            switch (this.options.conflictResolution) {
                case 'override':
                    this.applyConflictOverride(conflict);
                    break;
                case 'merge':
                    this.applyConflictMerge(conflict);
                    break;
                case 'ignore':
                    this.removeConflictStyle(conflict);
                    break;
                case 'warn':
                    console.warn('Style conflict detected:', conflict);
                    break;
            }
        });
    }
    findStyleConflicts(existing, newScope) {
        const existingSelectors = this.extractSelectors(existing.css);
        const newSelectors = this.extractSelectors(newScope.css);
        for (const newSel of newSelectors) {
            for (const existingSel of existingSelectors) {
                if (this.selectorsConflict(existingSel.selector, newSel.selector)) {
                    const commonProps = this.findCommonProperties(existingSel.properties, newSel.properties);
                    if (commonProps.length > 0) {
                        return {
                            property: commonProps[0],
                            selector: newSel.selector,
                            existingValue: existingSel.properties[commonProps[0]],
                            newValue: newSel.properties[commonProps[0]],
                            source: newScope.id,
                            resolution: 'warn'
                        };
                    }
                }
            }
        }
        return null;
    }
    extractSelectors(css) {
        const selectors = [];
        const regex = /([^{}]+)\s*\{([^}]*)\}/g;
        let match;
        while ((match = regex.exec(css)) !== null) {
            const selector = match[1].trim();
            const properties = {};
            const propRegex = /([^:;]+):\s*([^;]+)/g;
            let propMatch;
            while ((propMatch = propRegex.exec(match[2])) !== null) {
                properties[propMatch[1].trim()] = propMatch[2].trim();
            }
            selectors.push({ selector, properties });
        }
        return selectors;
    }
    selectorsConflict(sel1, sel2) {
        const normalize = (sel) => sel.replace(/\s+/g, ' ').trim();
        return normalize(sel1) === normalize(sel2);
    }
    findCommonProperties(props1, props2) {
        const common = [];
        for (const prop in props1) {
            if (prop in props2 && props1[prop] !== props2[prop]) {
                common.push(prop);
            }
        }
        return common;
    }
    applyConflictOverride(conflict) {
    }
    applyConflictMerge(conflict) {
    }
    removeConflictStyle(conflict) {
    }
    applyStyleScope(scope) {
        if (scope.dependencies && scope.dependencies.length > 0) {
            const missingDeps = scope.dependencies.filter(dep => !this.injectedStyles.has(dep));
            if (missingDeps.length > 0) {
                throw new ValidationError(`Missing style dependencies: ${missingDeps.join(', ')}`);
            }
        }
    }
    injectToDOM(scope) {
        const element = document.createElement('style');
        element.setAttribute('data-style-id', scope.id);
        element.setAttribute('data-style-scope', scope.scope);
        element.setAttribute('data-style-priority', scope.priority.toString());
        if (scope.namespace) {
            element.setAttribute('data-style-namespace', scope.namespace);
        }
        element.textContent = scope.css;
        if (scope.media) {
            element.setAttribute('media', scope.media);
        }
        this.insertStyleElement(element, scope.priority);
        this.styleElements.set(scope.id, element);
    }
    insertStyleElement(element, priority) {
        const head = document.head;
        const existingStyles = Array.from(head.querySelectorAll('style[data-style-priority]'));
        let insertBefore = null;
        for (const existing of existingStyles) {
            const existingPriority = parseInt(existing.getAttribute('data-style-priority') || '0', 10);
            if (existingPriority > priority) {
                insertBefore = existing;
                break;
            }
        }
        if (insertBefore) {
            head.insertBefore(element, insertBefore);
        }
        else {
            head.appendChild(element);
        }
    }
    updateDOMElement(scope) {
        const element = this.styleElements.get(scope.id);
        if (element) {
            element.textContent = scope.css;
        }
    }
    initializeObserver() {
        if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') {
            return;
        }
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.removedNodes.forEach((node) => {
                        if (node instanceof HTMLStyleElement) {
                            const styleId = node.getAttribute('data-style-id');
                            if (styleId && this.styleElements.has(styleId)) {
                                this.injectedStyles.delete(styleId);
                                this.styleElements.delete(styleId);
                            }
                        }
                    });
                }
            });
        });
        this.observer.observe(document.head, {
            childList: true,
            subtree: true
        });
    }
}
//# sourceMappingURL=StyleInjectionManager.js.map