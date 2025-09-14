export type ErrorType = 
  | 'network'
  | 'validation' 
  | 'authentication'
  | 'authorization'
  | 'timeout'
  | 'rate_limit'
  | 'system'
  | 'data'
  | 'configuration'
  | 'user_input'
  | 'security'
  | 'unknown';

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ErrorRecoverability = 'recoverable' | 'transient' | 'permanent' | 'unknown';

export interface SearchError extends Error {
  type: ErrorType;
  code: string;
  severity: ErrorSeverity;
  recoverability: ErrorRecoverability;
  originalError?: Error;
  context?: ErrorContext;
  timestamp: number;
  correlationId: string;
}

export interface ErrorContext {
  adapter?: string;
  query?: string;
  config?: Record<string, unknown>;
  user?: {
    id?: string;
    session?: string;
    permissions?: string[];
  };
  request?: {
    id?: string;
    method?: string;
    url?: string;
    headers?: Record<string, string>;
  };
  system?: {
    version?: string;
    environment?: string;
    timestamp?: number;
    userAgent?: string;
  };
  operation?: {
    name?: string;
    duration?: number;
    retryCount?: number;
    phase?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface ErrorClassification {
  type: ErrorType;
  severity: ErrorSeverity;
  recoverability: ErrorRecoverability;
  category: string;
  subcategory?: string;
  confidence: number;
}

export interface IErrorClassifier {
  classify(error: Error, context?: ErrorContext): ErrorClassification;
  registerRule(rule: ErrorClassificationRule): void;
  removeRule(ruleId: string): void;
  getClassificationRules(): ErrorClassificationRule[];
  updateRuleWeights(performance: ClassificationPerformance): void;
}

export interface ErrorClassificationRule {
  id: string;
  name: string;
  priority: number;
  weight: number;
  matcher: ErrorMatcher;
  classification: Partial<ErrorClassification>;
  conditions?: ErrorCondition[];
  enabled: boolean;
}

export interface ErrorMatcher {
  messagePattern?: RegExp;
  namePattern?: RegExp;
  codePattern?: RegExp;
  statusCode?: number | number[];
  contextMatches?: Record<string, any>;
  customMatcher?: (error: Error, context?: ErrorContext) => boolean;
}

export interface ErrorCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'matches' | 'exists';
  value: any;
  negate?: boolean;
}

export interface ClassificationPerformance {
  ruleId: string;
  accuracy: number;
  precision: number;
  recall: number;
  falsePositives: number;
  falseNegatives: number;
  totalClassifications: number;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterType: 'none' | 'full' | 'equal' | 'decorrelated';
  jitterAmount: number;
  retryCondition?: (error: SearchError, attempt: number) => boolean;
  onRetry?: (error: SearchError, attempt: number) => void;
  timeout?: number;
  abortSignal?: AbortSignal;
}

export interface RetryState {
  attempt: number;
  maxAttempts: number;
  nextRetryDelay: number;
  totalDelay: number;
  errors: SearchError[];
  startTime: number;
  isRetrying: boolean;
  canRetry: boolean;
}

export interface IRetryManager {
  retry<T>(operation: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>;
  canRetry(error: SearchError, attempt: number): boolean;
  calculateDelay(attempt: number, config: RetryConfig): number;
  getRetryState(): RetryState | null;
  abort(): void;
  reset(): void;
}

export interface RetryMetrics {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  averageRetryCount: number;
  averageSuccessDelay: number;
  retrySuccessRate: number;
  errorTypeBreakdown: Record<ErrorType, number>;
}

export interface FallbackConfig {
  enableCachedResults: boolean;
  enableSimplifiedMode: boolean;
  enableOfflineMode: boolean;
  cacheMaxAge: number;
  priorityOrder: FallbackStrategy[];
  fallbackTimeout: number;
}

export interface FallbackStrategy {
  name: string;
  priority: number;
  enabled: boolean;
  condition?: (error: SearchError, context: ErrorContext) => boolean;
  executor: FallbackExecutor;
  timeout?: number;
}

export interface FallbackExecutor {
  execute: (query: string, context: ErrorContext) => Promise<FallbackResult>;
  canExecute: (error: SearchError, context: ErrorContext) => boolean;
  description: string;
}

export interface FallbackResult<T = any> {
  success: boolean;
  data: T[];
  source: string;
  isPartial: boolean;
  isCached: boolean;
  age?: number;
  reliability: number;
  fallbackReason: string;
  suggestions?: string[];
}

export interface IFallbackManager {
  executeStrategy(error: SearchError, query: string, context: ErrorContext): Promise<FallbackResult>;
  registerStrategy(strategy: FallbackStrategy): void;
  removeStrategy(name: string): void;
  getAvailableStrategies(error: SearchError, context: ErrorContext): FallbackStrategy[];
  isOfflineMode(): boolean;
  enableOfflineMode(): void;
  disableOfflineMode(): void;
}

export interface UserMessage {
  title: string;
  message: string;
  details?: string;
  actions?: UserAction[];
  severity: ErrorSeverity;
  dismissible: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
  category: 'error' | 'warning' | 'info' | 'success';
}

export interface UserAction {
  label: string;
  action: string;
  type: 'primary' | 'secondary' | 'link';
  callback?: () => void | Promise<void>;
  disabled?: boolean;
}

export interface MessageTemplate {
  id: string;
  errorType: ErrorType;
  severity: ErrorSeverity;
  template: string;
  placeholders: string[];
  localization: Record<string, string>;
  conditions?: MessageCondition[];
}

export interface MessageCondition {
  field: string;
  operator: 'equals' | 'contains' | 'exists' | 'gt' | 'lt';
  value: any;
}

export interface IErrorMessageGenerator {
  generateMessage(error: SearchError, context?: ErrorContext): UserMessage;
  registerTemplate(template: MessageTemplate): void;
  removeTemplate(templateId: string): void;
  setLocale(locale: string): void;
  getLocale(): string;
  getAvailableLocales(): string[];
}

export interface ErrorLogEntry {
  id: string;
  correlationId: string;
  timestamp: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  error: SanitizedError;
  context: SanitizedContext;
  tags: string[];
  fingerprint: string;
  environment: string;
  version: string;
}

export interface SanitizedError {
  type: ErrorType;
  code: string;
  message: string;
  severity: ErrorSeverity;
  stack?: string[];
  cause?: SanitizedError;
}

export interface SanitizedContext {
  adapter?: string;
  operation?: string;
  duration?: number;
  retryCount?: number;
  system?: {
    version?: string;
    environment?: string;
  };
  request?: {
    method?: string;
    path?: string;
    statusCode?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface ErrorReportingConfig {
  enableReporting: boolean;
  reportingLevel: 'error' | 'warn' | 'info' | 'debug';
  sanitization: {
    enableStackTrace: boolean;
    enableContext: boolean;
    enableUserData: boolean;
    removePatterns: RegExp[];
    replacePatterns: Array<{ pattern: RegExp; replacement: string }>;
  };
  aggregation: {
    enableAggregation: boolean;
    aggregationWindow: number;
    maxDuplicates: number;
  };
  destination: {
    console: boolean;
    storage: boolean;
    remote?: {
      endpoint: string;
      apiKey?: string;
      batchSize: number;
      flushInterval: number;
    };
  };
}

export interface IErrorLogger {
  logError(error: SearchError, context?: ErrorContext): void;
  logWarning(message: string, context?: ErrorContext): void;
  logInfo(message: string, context?: ErrorContext): void;
  flush(): Promise<void>;
  getStats(): ErrorLogStats;
  setConfig(config: Partial<ErrorReportingConfig>): void;
}

export interface ErrorLogStats {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: ErrorLogEntry[];
  topErrors: Array<{ fingerprint: string; count: number; lastSeen: number }>;
}

export interface RecoveryWorkflow {
  id: string;
  name: string;
  description: string;
  triggers: RecoveryTrigger[];
  steps: RecoveryStep[];
  timeout: number;
  maxExecutions: number;
  cooldownPeriod: number;
  enabled: boolean;
}

export interface RecoveryTrigger {
  errorType: ErrorType;
  severity: ErrorSeverity;
  condition?: (error: SearchError, context: ErrorContext) => boolean;
  threshold?: {
    count: number;
    timeWindow: number;
  };
}

export interface RecoveryStep {
  id: string;
  name: string;
  type: 'retry' | 'fallback' | 'reset' | 'notify' | 'custom';
  config: any;
  timeout?: number;
  onSuccess?: (result: any) => void;
  onFailure?: (error: Error) => void;
  skipOnFailure?: boolean;
}

export interface RecoveryExecution {
  workflowId: string;
  executionId: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'success' | 'failure' | 'cancelled';
  currentStep?: string;
  completedSteps: string[];
  errors: SearchError[];
  result?: any;
}

export interface IRecoveryOrchestrator {
  registerWorkflow(workflow: RecoveryWorkflow): void;
  removeWorkflow(workflowId: string): void;
  executeRecovery(error: SearchError, context: ErrorContext): Promise<RecoveryExecution>;
  getActiveRecoveries(): RecoveryExecution[];
  cancelRecovery(executionId: string): void;
  getRecoveryStats(): RecoveryStats;
}

export interface RecoveryStats {
  totalExecutions: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  averageRecoveryTime: number;
  recoverySuccessRate: number;
  workflowPerformance: Record<string, WorkflowPerformance>;
}

export interface WorkflowPerformance {
  executions: number;
  successes: number;
  failures: number;
  averageTime: number;
  lastExecution?: number;
  successRate: number;
}

export interface ErrorHandlerConfig {
  classification: {
    enableAutoClassification: boolean;
    defaultSeverity: ErrorSeverity;
    confidenceThreshold: number;
  };
  retry: RetryConfig;
  fallback: FallbackConfig;
  messaging: {
    enableUserMessages: boolean;
    defaultLocale: string;
    enableProgressive: boolean;
  };
  logging: ErrorReportingConfig;
  recovery: {
    enableAutoRecovery: boolean;
    maxConcurrentRecoveries: number;
    recoveryTimeout: number;
  };
}

export interface ErrorHandlerEvents {
  onError?: (error: SearchError, context?: ErrorContext) => void;
  onRetryStart?: (error: SearchError, attempt: number) => void;
  onRetrySuccess?: (result: any, attempt: number) => void;
  onRetryFailure?: (error: SearchError, attempt: number) => void;
  onFallbackStart?: (strategy: string, error: SearchError) => void;
  onFallbackSuccess?: (result: FallbackResult, strategy: string) => void;
  onFallbackFailure?: (error: SearchError, strategy: string) => void;
  onRecoveryStart?: (workflowId: string, executionId: string) => void;
  onRecoverySuccess?: (execution: RecoveryExecution) => void;
  onRecoveryFailure?: (execution: RecoveryExecution) => void;
  onUserMessageGenerated?: (message: UserMessage, error: SearchError) => void;
}

export interface IErrorHandler {
  handleError(error: Error, context?: ErrorContext): Promise<void>;
  classifyError(error: Error, context?: ErrorContext): ErrorClassification;
  generateUserMessage(error: SearchError, context?: ErrorContext): UserMessage;
  shouldRetry(error: SearchError, attempt?: number): boolean;
  getFallbackResults(query: string, error: SearchError, context?: ErrorContext): Promise<FallbackResult>;
  reportError(error: SearchError, context?: ErrorContext): void;
  initiateRecovery(error: SearchError, context?: ErrorContext): Promise<void>;
  getErrorStats(): ErrorHandlerStats;
  setConfig(config: Partial<ErrorHandlerConfig>): void;
}

export interface ErrorHandlerStats {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  retryStats: RetryMetrics;
  fallbackStats: {
    totalFallbacks: number;
    successfulFallbacks: number;
    fallbacksByStrategy: Record<string, number>;
  };
  recoveryStats: RecoveryStats;
  userMessageStats: {
    totalMessages: number;
    messagesBySeverity: Record<ErrorSeverity, number>;
    averageResponseTime: number;
  };
}

export type ErrorCallback = (error: SearchError, context?: ErrorContext) => void;
export type RetryCallback = (error: SearchError, attempt: number) => void;
export type FallbackCallback = (result: FallbackResult, strategy: string) => void;
export type RecoveryCallback = (execution: RecoveryExecution) => void;