/**
 * Event Types for Universal Search Component
 * @description TypeScript interfaces for component events and action handling
 */

import { SearchResult } from './Results';

/**
 * Base search event interface
 */
export interface SearchEvent {
  type: string;
  timestamp: number;
  target?: HTMLElement;
  metadata?: Record<string, unknown>;
}

/**
 * Search start event
 */
export interface SearchStartEvent extends SearchEvent {
  type: 'search:start';
  query: string;
}

/**
 * Search complete event
 */
export interface SearchCompleteEvent extends SearchEvent {
  type: 'search:complete';
  query: string;
  results: SearchResult[];
  duration: number;
}

/**
 * Search error event
 */
export interface SearchErrorEvent extends SearchEvent {
  type: 'search:error';
  query: string;
  error: Error;
}

/**
 * Result selection event
 */
export interface ResultSelectEvent extends SearchEvent {
  type: 'result:select';
  result: SearchResult;
  index: number;
}

/**
 * Result selected event (post-processing)
 */
export interface ResultSelectedEvent extends SearchEvent {
  type: 'result:selected';
  result: SearchResult;
  context: any;
}

/**
 * Action lifecycle events
 */
export interface ActionStartEvent extends SearchEvent {
  type: 'action:start';
  actionId: string;
  result: SearchResult;
}

export interface ActionCompleteEvent extends SearchEvent {
  type: 'action:complete';
  actionId: string;
  result: SearchResult;
  context: any;
  success: boolean;
}

export interface ActionErrorEvent extends SearchEvent {
  type: 'action:error';
  actionId: string;
  result: SearchResult;
  error: Error;
}

export interface ActionPreventedEvent extends SearchEvent {
  type: 'action:prevented';
  actionId: string;
  result: SearchResult;
  reason: string;
}

/**
 * Callback lifecycle events
 */
export interface ActionBeforeCallbackEvent extends SearchEvent {
  type: 'action:beforeCallback';
  result: SearchResult;
  context: any;
}

export interface ActionCallbackEvent extends SearchEvent {
  type: 'action:callback';
  result: SearchResult;
  context: any;
}

export interface ActionAfterCallbackEvent extends SearchEvent {
  type: 'action:afterCallback';
  result: SearchResult;
  context: any;
}

/**
 * Context events
 */
export interface ContextCreatedEvent extends SearchEvent {
  type: 'context:created';
  contextId: string;
  result: SearchResult;
}

export interface ContextPreservedEvent extends SearchEvent {
  type: 'context:preserved';
  contextId: string;
  encrypted: boolean;
  compressed: boolean;
}

export interface ContextRestoredEvent extends SearchEvent {
  type: 'context:restored';
  contextId: string;
  success: boolean;
}

/**
 * Cleanup events
 */
export interface CleanupStartEvent extends SearchEvent {
  type: 'cleanup:start';
  resourceCount: number;
}

export interface CleanupCompleteEvent extends SearchEvent {
  type: 'cleanup:complete';
  cleaned: number;
  errors: number;
  duration: number;
}

export interface MemoryLeakDetectedEvent extends SearchEvent {
  type: 'memory:leak';
  resourceType: string;
  resourceId: string;
  age: number;
}

/**
 * Union type for all search events
 */
export type UniversalSearchEvent = 
  | SearchStartEvent 
  | SearchCompleteEvent 
  | SearchErrorEvent 
  | ResultSelectEvent
  | ResultSelectedEvent
  | ActionStartEvent
  | ActionCompleteEvent
  | ActionErrorEvent
  | ActionPreventedEvent
  | ActionBeforeCallbackEvent
  | ActionCallbackEvent
  | ActionAfterCallbackEvent
  | ContextCreatedEvent
  | ContextPreservedEvent
  | ContextRestoredEvent
  | CleanupStartEvent
  | CleanupCompleteEvent
  | MemoryLeakDetectedEvent;

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
} as const;

export type SearchEventTypeValues = typeof SearchEventType[keyof typeof SearchEventType];

/**
 * Event handler function type
 */
export type EventHandler<T extends SearchEvent = SearchEvent> = (event: T) => void | Promise<void>;

/**
 * Event listener map
 */
export type EventListenerMap = {
  [K in UniversalSearchEvent['type']]?: EventHandler<Extract<UniversalSearchEvent, { type: K }>>[];
};

/**
 * Event subscription options
 */
export interface EventSubscriptionOptions {
  once?: boolean;
  priority?: number;
  timeout?: number;
  context?: Record<string, unknown>;
}

/**
 * Event emission options
 */
export interface EventEmissionOptions {
  async?: boolean;
  timeout?: number;
  stopOnError?: boolean;
  metadata?: Record<string, unknown>;
}