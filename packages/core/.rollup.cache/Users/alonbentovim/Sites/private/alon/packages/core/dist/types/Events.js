/**
 * Event Types for Universal Search Component
 * @description TypeScript interfaces for component events and action handling
 */
/**
 * Event type enumeration for better type safety
 */
export const SearchEventType = {
    SEARCH_START: 'search:start',
    SEARCH_COMPLETE: 'search:complete',
    SEARCH_ERROR: 'search:error',
    RESULT_SELECT: 'result:select',
    RESULT_SELECTED: 'result:selected',
    ACTION_START: 'action:start',
    ACTION_COMPLETE: 'action:complete',
    ACTION_ERROR: 'action:error',
    ACTION_PREVENTED: 'action:prevented',
    ACTION_BEFORE_CALLBACK: 'action:beforeCallback',
    ACTION_CALLBACK: 'action:callback',
    ACTION_AFTER_CALLBACK: 'action:afterCallback',
    CONTEXT_CREATED: 'context:created',
    CONTEXT_PRESERVED: 'context:preserved',
    CONTEXT_RESTORED: 'context:restored',
    CLEANUP_START: 'cleanup:start',
    CLEANUP_COMPLETE: 'cleanup:complete',
    MEMORY_LEAK: 'memory:leak'
};
//# sourceMappingURL=Events.js.map