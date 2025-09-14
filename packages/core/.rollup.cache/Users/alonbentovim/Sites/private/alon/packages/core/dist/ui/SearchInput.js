/**
 * Search Input - Basic Search Input UI Component
 * @description Handles search input rendering and user interaction
 */
import { ValidationError } from '../utils/validation';
/**
 * Search input component for handling user input
 */
export class SearchInput {
    constructor(container, config) {
        this.inputElement = null;
        this.clearButton = null;
        this.eventListeners = new Map();
        this.isInitialized = false;
        if (!container || !(container instanceof HTMLElement)) {
            throw new ValidationError('Container must be a valid HTMLElement');
        }
        this.container = container;
        this.config = { ...config };
        this.validateConfig();
    }
    /**
     * Initialize the search input component
     */
    init() {
        if (this.isInitialized) {
            return;
        }
        this.render();
        this.bindEvents();
        this.isInitialized = true;
    }
    /**
     * Destroy the component and clean up
     */
    destroy() {
        if (!this.isInitialized) {
            return;
        }
        this.unbindEvents();
        this.container.innerHTML = '';
        this.inputElement = null;
        this.clearButton = null;
        this.eventListeners.clear();
        this.isInitialized = false;
    }
    /**
     * Get current input value
     */
    getValue() {
        return this.inputElement?.value || '';
    }
    /**
     * Set input value
     */
    setValue(value) {
        if (this.inputElement) {
            this.inputElement.value = value || '';
            this.updateClearButton();
        }
    }
    /**
     * Focus the input element
     */
    focus() {
        if (this.inputElement) {
            this.inputElement.focus();
        }
    }
    /**
     * Blur the input element
     */
    blur() {
        if (this.inputElement) {
            this.inputElement.blur();
        }
    }
    /**
     * Clear the input value
     */
    clear() {
        this.setValue('');
        this.emit('clear');
        this.emit('input', '');
    }
    /**
     * Set loading state
     */
    setLoading(loading) {
        if (this.inputElement) {
            if (loading) {
                this.inputElement.classList.add('loading');
                this.inputElement.setAttribute('aria-busy', 'true');
            }
            else {
                this.inputElement.classList.remove('loading');
                this.inputElement.removeAttribute('aria-busy');
            }
        }
    }
    /**
     * Set error state
     */
    setError(error) {
        if (this.inputElement) {
            if (error) {
                this.inputElement.classList.add('error');
                this.inputElement.setAttribute('aria-invalid', 'true');
                this.inputElement.setAttribute('aria-describedby', 'search-error');
                // Add or update error message
                let errorElement = this.container.querySelector('.search-error');
                if (!errorElement) {
                    errorElement = document.createElement('div');
                    errorElement.className = 'search-error';
                    errorElement.id = 'search-error';
                    errorElement.setAttribute('role', 'alert');
                    this.container.appendChild(errorElement);
                }
                errorElement.textContent = error;
            }
            else {
                this.inputElement.classList.remove('error');
                this.inputElement.removeAttribute('aria-invalid');
                this.inputElement.removeAttribute('aria-describedby');
                const errorElement = this.container.querySelector('.search-error');
                if (errorElement) {
                    errorElement.remove();
                }
            }
        }
    }
    /**
     * Add event listener
     */
    on(event, handler) {
        this.eventListeners.set(event, handler);
    }
    /**
     * Remove event listener
     */
    off(event) {
        this.eventListeners.delete(event);
    }
    /**
     * Render the input component
     */
    render() {
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'search-input-wrapper';
        // Create input element
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.className = 'search-input';
        this.inputElement.placeholder = this.config.placeholder || 'Search...';
        this.inputElement.autocomplete = 'off';
        this.inputElement.spellcheck = false;
        // Accessibility attributes
        this.inputElement.setAttribute('role', 'searchbox');
        this.inputElement.setAttribute('aria-label', 'Search');
        this.inputElement.setAttribute('aria-autocomplete', 'list');
        // RTL support
        if (this.config.rtl) {
            this.inputElement.dir = 'rtl';
        }
        // Create clear button
        this.clearButton = document.createElement('button');
        this.clearButton.type = 'button';
        this.clearButton.className = 'search-clear';
        this.clearButton.innerHTML = '×';
        this.clearButton.setAttribute('aria-label', 'Clear search');
        this.clearButton.style.display = 'none';
        inputWrapper.appendChild(this.inputElement);
        inputWrapper.appendChild(this.clearButton);
        this.container.appendChild(inputWrapper);
        this.updateClearButton();
    }
    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.inputElement || !this.clearButton) {
            return;
        }
        // Input events
        this.inputElement.addEventListener('input', this.handleInput.bind(this));
        this.inputElement.addEventListener('focus', this.handleFocus.bind(this));
        this.inputElement.addEventListener('blur', this.handleBlur.bind(this));
        this.inputElement.addEventListener('keydown', this.handleKeydown.bind(this));
        // Clear button
        this.clearButton.addEventListener('click', this.handleClear.bind(this));
    }
    /**
     * Unbind event listeners
     */
    unbindEvents() {
        if (!this.inputElement || !this.clearButton) {
            return;
        }
        this.inputElement.removeEventListener('input', this.handleInput.bind(this));
        this.inputElement.removeEventListener('focus', this.handleFocus.bind(this));
        this.inputElement.removeEventListener('blur', this.handleBlur.bind(this));
        this.inputElement.removeEventListener('keydown', this.handleKeydown.bind(this));
        this.clearButton.removeEventListener('click', this.handleClear.bind(this));
    }
    /**
     * Handle input events
     */
    handleInput(event) {
        const value = event.target.value;
        this.updateClearButton();
        this.emit('input', value);
    }
    /**
     * Handle focus events
     */
    handleFocus(event) {
        this.emit('focus', event);
    }
    /**
     * Handle blur events
     */
    handleBlur(event) {
        this.emit('blur', event);
    }
    /**
     * Handle keydown events
     */
    handleKeydown(event) {
        this.emit('keydown', event);
    }
    /**
     * Handle clear button click
     */
    handleClear() {
        this.clear();
        this.focus();
    }
    /**
     * Update clear button visibility
     */
    updateClearButton() {
        if (this.clearButton) {
            const hasValue = this.getValue().length > 0;
            this.clearButton.style.display = hasValue ? 'block' : 'none';
        }
    }
    /**
     * Emit event to listeners
     */
    emit(event, ...args) {
        const handler = this.eventListeners.get(event);
        if (handler) {
            try {
                handler(...args);
            }
            catch (error) {
                console.error(`[SearchInput] Error in ${event} handler:`, error);
            }
        }
    }
    /**
     * Validate configuration
     */
    validateConfig() {
        if (typeof this.config.placeholder !== 'string') {
            throw new ValidationError('placeholder must be a string', 'placeholder');
        }
        if (typeof this.config.rtl !== 'boolean') {
            throw new ValidationError('rtl must be a boolean', 'rtl');
        }
    }
}
//# sourceMappingURL=SearchInput.js.map