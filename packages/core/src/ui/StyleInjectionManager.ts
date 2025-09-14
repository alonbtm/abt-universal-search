import { ValidationError } from '../errors/ThemingErrors';

export interface StyleScope {
  id: string;
  css: string;
  priority: number;
  scope: 'global' | 'component' | 'element';
  namespace?: string;
  dependencies?: string[];
  media?: string;
  container?: string;
}

export interface StyleConflictRule {
  property: string;
  selector: string;
  existingValue: string;
  newValue: string;
  source: string;
  resolution: 'override' | 'merge' | 'ignore' | 'warn';
}

export interface StyleInjectionOptions {
  enableScoping: boolean;
  namespace: string;
  allowOverrides: boolean;
  validateCSS: boolean;
  minifyCSS: boolean;
  conflictResolution: 'override' | 'merge' | 'ignore' | 'warn';
  generateSourceMap: boolean;
}

export interface StyleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  parsedRules: CSSRule[];
}

export class StyleInjectionManager {
  private injectedStyles = new Map<string, StyleScope>();
  private styleElements = new Map<string, HTMLStyleElement>();
  private conflictRules = new Map<string, StyleConflictRule>();
  private observer?: MutationObserver;

  constructor(
    private options: StyleInjectionOptions = {
      enableScoping: true,
      namespace: 'alon',
      allowOverrides: false,
      validateCSS: true,
      minifyCSS: true,
      conflictResolution: 'warn',
      generateSourceMap: false
    }
  ) {
    this.initializeObserver();
  }

  public injectStyle(scope: Omit<StyleScope, 'id'>): string {
    const id = this.generateStyleId(scope);
    const processedScope: StyleScope = {
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

  public removeStyle(id: string): boolean {
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

  public updateStyle(id: string, css: string): boolean {
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

  public getStyle(id: string): StyleScope | undefined {
    return this.injectedStyles.get(id);
  }

  public getAllStyles(): StyleScope[] {
    return Array.from(this.injectedStyles.values())
      .sort((a, b) => a.priority - b.priority);
  }

  public hasConflicts(): boolean {
    return this.conflictRules.size > 0;
  }

  public getConflicts(): StyleConflictRule[] {
    return Array.from(this.conflictRules.values());
  }

  public resolveConflict(id: string, resolution: 'override' | 'merge' | 'ignore'): boolean {
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

  public clearAllStyles(): void {
    const ids = Array.from(this.injectedStyles.keys());
    ids.forEach(id => this.removeStyle(id));
  }

  public exportStyles(format: 'css' | 'json' = 'css'): string {
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

  public setOptions(newOptions: Partial<StyleInjectionOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  public destroy(): void {
    this.clearAllStyles();
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
  }

  private generateStyleId(scope: Omit<StyleScope, 'id'>): string {
    const hash = this.hashCSS(scope.css);
    return `${this.options.namespace}-${scope.scope}-${hash}`;
  }

  private hashCSS(css: string): string {
    let hash = 0;
    for (let i = 0; i < css.length; i++) {
      const char = css.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private processCSS(css: string, scope: Omit<StyleScope, 'id'>): string {
    let processedCSS = css;

    if (this.options.minifyCSS) {
      processedCSS = this.minifyCSS(processedCSS);
    }

    if (this.options.enableScoping && scope.scope !== 'global') {
      processedCSS = this.applyScopingRules(processedCSS, scope);
    }

    return processedCSS;
  }

  private minifyCSS(css: string): string {
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

  private applyScopingRules(css: string, scope: Omit<StyleScope, 'id'>): string {
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

  private validateCSS(css: string): StyleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const parsedRules: CSSRule[] = [];

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

    } catch (error) {
      errors.push(`CSS parsing error: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      parsedRules
    };
  }

  private detectAndResolveConflicts(scope: StyleScope): void {
    const existingStyles = Array.from(this.injectedStyles.values());
    const conflicts: StyleConflictRule[] = [];

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

  private findStyleConflicts(existing: StyleScope, newScope: StyleScope): StyleConflictRule | null {
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

  private extractSelectors(css: string): Array<{ selector: string; properties: Record<string, string> }> {
    const selectors: Array<{ selector: string; properties: Record<string, string> }> = [];
    const regex = /([^{}]+)\s*\{([^}]*)\}/g;
    let match;

    while ((match = regex.exec(css)) !== null) {
      const selector = match[1].trim();
      const properties: Record<string, string> = {};
      
      const propRegex = /([^:;]+):\s*([^;]+)/g;
      let propMatch;
      
      while ((propMatch = propRegex.exec(match[2])) !== null) {
        properties[propMatch[1].trim()] = propMatch[2].trim();
      }

      selectors.push({ selector, properties });
    }

    return selectors;
  }

  private selectorsConflict(sel1: string, sel2: string): boolean {
    const normalize = (sel: string) => sel.replace(/\s+/g, ' ').trim();
    return normalize(sel1) === normalize(sel2);
  }

  private findCommonProperties(props1: Record<string, string>, props2: Record<string, string>): string[] {
    const common: string[] = [];
    for (const prop in props1) {
      if (prop in props2 && props1[prop] !== props2[prop]) {
        common.push(prop);
      }
    }
    return common;
  }

  private applyConflictOverride(conflict: StyleConflictRule): void {
  }

  private applyConflictMerge(conflict: StyleConflictRule): void {
  }

  private removeConflictStyle(conflict: StyleConflictRule): void {
  }

  private applyStyleScope(scope: StyleScope): void {
    if (scope.dependencies && scope.dependencies.length > 0) {
      const missingDeps = scope.dependencies.filter(dep => !this.injectedStyles.has(dep));
      if (missingDeps.length > 0) {
        throw new ValidationError(`Missing style dependencies: ${missingDeps.join(', ')}`);
      }
    }
  }

  private injectToDOM(scope: StyleScope): void {
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

  private insertStyleElement(element: HTMLStyleElement, priority: number): void {
    const head = document.head;
    const existingStyles = Array.from(head.querySelectorAll('style[data-style-priority]'));
    
    let insertBefore: HTMLStyleElement | null = null;
    
    for (const existing of existingStyles) {
      const existingPriority = parseInt(existing.getAttribute('data-style-priority') || '0', 10);
      if (existingPriority > priority) {
        insertBefore = existing as HTMLStyleElement;
        break;
      }
    }

    if (insertBefore) {
      head.insertBefore(element, insertBefore);
    } else {
      head.appendChild(element);
    }
  }

  private updateDOMElement(scope: StyleScope): void {
    const element = this.styleElements.get(scope.id);
    if (element) {
      element.textContent = scope.css;
    }
  }

  private initializeObserver(): void {
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