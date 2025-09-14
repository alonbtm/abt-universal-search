/**
 * Results Dropdown - Search Results Display Component
 * @description Handles rendering and interaction with search results list
 */
import { ValidationError } from '../utils/validation';
/**
 * Results dropdown component for displaying search results
 */
export class ResultsDropdown {
    constructor(container, config) {
        this.dropdownElement = null;
        this.listElement = null;
        this.results = [];
        this.selectedIndex = -1;
        this.eventListeners = new Map();
        this.isInitialized = false;
        this.isVisible = false;
        if (!container || !(container instanceof HTMLElement)) {
            throw new ValidationError('Container must be a valid HTMLElement');
        }
        this.container = container;
        this.config = { ...config };
        this.validateConfig();
    }
    /**
     * Initialize the results dropdown component
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
        this.dropdownElement = null;
        this.listElement = null;
        this.results = [];
        this.selectedIndex = -1;
        this.eventListeners.clear();
        this.isInitialized = false;
        this.isVisible = false;
    }
    /**
     * Show results in the dropdown
     */
    showResults(results) {
        if (!Array.isArray(results)) {
            throw new ValidationError('Results must be an array');
        }
        this.results = [...results];
        this.selectedIndex = -1;
        this.renderResults();
        this.show();
    }
    /**
     * Clear and hide results
     */
    clearResults() {
        this.results = [];
        this.selectedIndex = -1;
        this.renderResults();
        this.hide();
    }
    /**
     * Show loading state
     */
    showLoading() {
        if (!this.listElement)
            return;
        this.listElement.innerHTML = '';
        const loadingItem = this.createLoadingItem();
        this.listElement.appendChild(loadingItem);
        this.show();
    }
    /**
     * Show error state
     */
    showError(message) {
        if (!this.listElement)
            return;
        this.listElement.innerHTML = '';
        const errorItem = this.createErrorItem(message);
        this.listElement.appendChild(errorItem);
        this.show();
    }
    /**
     * Show no results state
     */
    showNoResults() {
        if (!this.listElement)
            return;
        this.listElement.innerHTML = '';
        const noResultsItem = this.createNoResultsItem();
        this.listElement.appendChild(noResultsItem);
        this.show();
    }
    /**
     * Hide the dropdown
     */
    hide() {
        if (this.dropdownElement) {
            this.dropdownElement.style.display = 'none';
            this.dropdownElement.setAttribute('aria-hidden', 'true');
            this.isVisible = false;
        }
    }
    /**
     * Show the dropdown
     */
    show() {
        if (this.dropdownElement) {
            this.dropdownElement.style.display = 'block';
            this.dropdownElement.setAttribute('aria-hidden', 'false');
            this.isVisible = true;
        }
    }
    /**
     * Navigate through results
     */
    navigate(direction) {
        if (this.results.length === 0)
            return;
        let newIndex = this.selectedIndex;
        switch (direction) {
            case 'up':
                newIndex = newIndex <= 0 ? this.results.length - 1 : newIndex - 1;
                break;
            case 'down':
                newIndex = newIndex >= this.results.length - 1 ? 0 : newIndex + 1;
                break;
            case 'first':
                newIndex = 0;
                break;
            case 'last':
                newIndex = this.results.length - 1;
                break;
        }
        this.setSelectedIndex(newIndex);
        this.emit('navigate', direction);
    }
    /**
     * Select result at current index
     */
    selectCurrent() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
            const result = this.results[this.selectedIndex];
            if (result) {
                this.emit('select', result, this.selectedIndex);
            }
        }
    }
    /**
     * Get selected result
     */
    getSelectedResult() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
            return this.results[this.selectedIndex] || null;
        }
        return null;
    }
    /**
     * Set selected index
     */
    setSelectedIndex(index) {
        const oldIndex = this.selectedIndex;
        this.selectedIndex = Math.max(-1, Math.min(index, this.results.length - 1));
        if (oldIndex !== this.selectedIndex) {
            this.updateSelection();
        }
    }
    /**
     * Check if dropdown is visible
     */
    isOpen() {
        return this.isVisible;
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
     * Render the dropdown component
     */
    render() {
        this.dropdownElement = document.createElement('div');
        this.dropdownElement.className = 'search-dropdown';
        this.dropdownElement.style.display = 'none';
        this.dropdownElement.setAttribute('aria-hidden', 'true');
        this.listElement = document.createElement('ul');
        this.listElement.className = 'search-results';
        this.listElement.setAttribute('role', 'listbox');
        this.listElement.setAttribute('aria-label', 'Search results');
        // RTL support
        if (this.config.rtl) {
            this.dropdownElement.dir = 'rtl';
        }
        this.dropdownElement.appendChild(this.listElement);
        this.container.appendChild(this.dropdownElement);
    }
    /**
     * Render search results
     */
    renderResults() {
        if (!this.listElement)
            return;
        this.listElement.innerHTML = '';
        if (this.results.length === 0) {
            return;
        }
        const maxResults = Math.min(this.results.length, this.config.maxResults);
        for (let i = 0; i < maxResults; i++) {
            const result = this.results[i];
            if (result) {
                const resultItem = this.createResultItem(result, i);
                this.listElement.appendChild(resultItem);
            }
        }
        this.updateSelection();
    }
    /**
     * Create a result item element
     */
    createResultItem(result, index) {
        const listItem = document.createElement('li');
        listItem.className = 'search-result';
        listItem.setAttribute('role', 'option');
        listItem.setAttribute('data-index', String(index));
        const title = document.createElement('div');
        title.className = 'result-title';
        title.textContent = result.title;
        listItem.appendChild(title);
        if (result.description) {
            const description = document.createElement('div');
            description.className = 'result-description';
            description.textContent = result.description;
            listItem.appendChild(description);
        }
        // Add metadata if available
        if (result.metadata?.category) {
            const category = document.createElement('div');
            category.className = 'result-category';
            category.textContent = String(result.metadata.category);
            listItem.appendChild(category);
        }
        return listItem;
    }
    /**
     * Create loading item
     */
    createLoadingItem() {
        const listItem = document.createElement('li');
        listItem.className = 'search-loading';
        listItem.setAttribute('role', 'status');
        listItem.setAttribute('aria-live', 'polite');
        listItem.textContent = this.config.loadingText || 'Loading...';
        return listItem;
    }
    /**
     * Create error item
     */
    createErrorItem(message) {
        const listItem = document.createElement('li');
        listItem.className = 'search-error';
        listItem.setAttribute('role', 'alert');
        listItem.textContent = message;
        return listItem;
    }
    /**
     * Create no results item
     */
    createNoResultsItem() {
        const listItem = document.createElement('li');
        listItem.className = 'search-no-results';
        listItem.setAttribute('role', 'status');
        listItem.textContent = this.config.noResultsText || 'No results found';
        return listItem;
    }
    /**
     * Update selection visual state
     */
    updateSelection() {
        if (!this.listElement)
            return;
        const items = this.listElement.querySelectorAll('.search-result');
        items.forEach((item, index) => {
            const isSelected = index === this.selectedIndex;
            if (isSelected) {
                item.classList.add('selected');
                item.setAttribute('aria-selected', 'true');
                item.scrollIntoView({ block: 'nearest' });
            }
            else {
                item.classList.remove('selected');
                item.setAttribute('aria-selected', 'false');
            }
        });
    }
    /**
     * Bind event listeners
     */
    bindEvents() {
        if (!this.listElement)
            return;
        this.listElement.addEventListener('click', this.handleClick.bind(this));
        this.listElement.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
    }
    /**
     * Unbind event listeners
     */
    unbindEvents() {
        if (!this.listElement)
            return;
        this.listElement.removeEventListener('click', this.handleClick.bind(this));
        this.listElement.removeEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
    }
    /**
     * Handle click events
     */
    handleClick(event) {
        const target = event.target;
        const resultItem = target.closest('.search-result');
        if (resultItem) {
            const index = parseInt(resultItem.getAttribute('data-index') || '-1');
            if (index >= 0 && index < this.results.length) {
                this.setSelectedIndex(index);
                this.selectCurrent();
            }
        }
    }
    /**
     * Handle mouse enter events
     */
    handleMouseEnter(event) {
        const target = event.target;
        const resultItem = target.closest('.search-result');
        if (resultItem) {
            const index = parseInt(resultItem.getAttribute('data-index') || '-1');
            if (index >= 0 && index < this.results.length) {
                this.setSelectedIndex(index);
            }
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
                console.error(`[ResultsDropdown] Error in ${event} handler:`, error);
            }
        }
    }
    /**
     * Validate configuration
     */
    validateConfig() {
        if (typeof this.config.maxResults !== 'number' || this.config.maxResults <= 0) {
            throw new ValidationError('maxResults must be a positive number', 'maxResults');
        }
        if (typeof this.config.loadingText !== 'string') {
            throw new ValidationError('loadingText must be a string', 'loadingText');
        }
        if (typeof this.config.noResultsText !== 'string') {
            throw new ValidationError('noResultsText must be a string', 'noResultsText');
        }
        if (typeof this.config.rtl !== 'boolean') {
            throw new ValidationError('rtl must be a boolean', 'rtl');
        }
    }
}
//# sourceMappingURL=ResultsDropdown.js.map