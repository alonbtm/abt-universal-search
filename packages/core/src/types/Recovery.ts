import { ErrorType, ErrorSeverity, SearchError, ErrorContext } from './ErrorHandling';

export interface HealthCheck {
  id: string;
  name: string;
  description: string;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'HEAD';
  timeout: number;
  interval: number;
  enabled: boolean;
  critical: boolean;
  expectedStatus?: number;
  expectedResponse?: any;
  customCheck?: () => Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
  success: boolean;
  status: HealthStatus;
  responseTime: number;
  timestamp: number;
  details?: {
    statusCode?: number;
    response?: any;
    error?: string;
    metadata?: Record<string, any>;
  };
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ServiceHealth {
  serviceId: string;
  status: HealthStatus;
  checks: Record<string, HealthCheckResult>;
  lastUpdate: number;
  uptime: number;
  availability: number;
}

export interface IHealthMonitor {
  registerHealthCheck(check: HealthCheck): void;
  removeHealthCheck(checkId: string): void;
  runHealthCheck(checkId: string): Promise<HealthCheckResult>;
  runAllHealthChecks(): Promise<Record<string, HealthCheckResult>>;
  getServiceHealth(serviceId?: string): ServiceHealth | Record<string, ServiceHealth>;
  isHealthy(serviceId?: string): boolean;
  startMonitoring(): void;
  stopMonitoring(): void;
  getHealthHistory(serviceId: string, timeRange?: TimeRange): HealthCheckResult[];
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
  minThroughput: number;
  errorPercentageThreshold: number;
  forceOpen?: boolean;
  forceClosed?: boolean;
  onStateChange?: (state: CircuitBreakerState, metrics: CircuitBreakerMetrics) => void;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  totalRequests: number;
  failedRequests: number;
  successfulRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  consecutiveFailures: number;
  errorPercentage: number;
  averageResponseTime: number;
}

export interface ICircuitBreaker {
  execute<T>(operation: () => Promise<T>): Promise<T>;
  getState(): CircuitBreakerState;
  getMetrics(): CircuitBreakerMetrics;
  forceOpen(): void;
  forceClosed(): void;
  reset(): void;
  isCallAllowed(): boolean;
}

export interface AutoRecoveryConfig {
  enabled: boolean;
  maxConcurrentRecoveries: number;
  recoveryTimeout: number;
  cooldownPeriod: number;
  maxRecoveryAttempts: number;
  recoveryStrategies: RecoveryStrategyConfig[];
  healthCheckInterval: number;
  failureAnalysis: {
    enabled: boolean;
    patternDetection: boolean;
    minimumSamples: number;
    analysisWindow: number;
  };
}

export interface RecoveryStrategyConfig {
  name: string;
  priority: number;
  enabled: boolean;
  conditions: RecoveryCondition[];
  actions: RecoveryAction[];
  timeout: number;
  retryCount: number;
}

export interface RecoveryCondition {
  type: 'error_type' | 'error_count' | 'error_rate' | 'service_health' | 'custom';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'matches';
  value: any;
  timeWindow?: number;
  customCondition?: (context: RecoveryContext) => boolean;
}

export interface RecoveryAction {
  type: 'restart_service' | 'clear_cache' | 'fallback_mode' | 'notify_admin' | 'scale_resources' | 'custom';
  config: any;
  timeout?: number;
  customAction?: (context: RecoveryContext) => Promise<RecoveryActionResult>;
}

export interface RecoveryContext {
  error: SearchError;
  errorContext: ErrorContext;
  serviceHealth: ServiceHealth;
  metrics: RecoveryMetrics;
  previousAttempts: RecoveryAttempt[];
}

export interface RecoveryActionResult {
  success: boolean;
  message: string;
  details?: any;
  nextAction?: string;
}

export interface RecoveryAttempt {
  id: string;
  strategyName: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'success' | 'failure' | 'cancelled';
  actions: RecoveryActionExecution[];
  result?: RecoveryActionResult;
  error?: SearchError;
}

export interface RecoveryActionExecution {
  actionType: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'success' | 'failure' | 'skipped';
  result?: RecoveryActionResult;
  error?: SearchError;
}

export interface RecoveryMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  averageRecoveryTime: number;
  successRate: number;
  lastAttemptTime?: number;
  strategyEffectiveness: Record<string, StrategyMetrics>;
  errorPatterns: ErrorPattern[];
}

export interface StrategyMetrics {
  attempts: number;
  successes: number;
  failures: number;
  averageTime: number;
  successRate: number;
  lastUsed?: number;
}

export interface ErrorPattern {
  pattern: string;
  frequency: number;
  lastOccurrence: number;
  associatedStrategies: string[];
  recoverySuccess: boolean;
}

export interface IAutoRecovery {
  startAutoRecovery(): void;
  stopAutoRecovery(): void;
  registerStrategy(strategy: RecoveryStrategyConfig): void;
  removeStrategy(name: string): void;
  triggerRecovery(error: SearchError, context: ErrorContext): Promise<RecoveryAttempt>;
  getRecoveryMetrics(): RecoveryMetrics;
  isRecoveryActive(): boolean;
  getActiveRecoveries(): RecoveryAttempt[];
  cancelRecovery(attemptId: string): void;
}

export interface FailurePattern {
  id: string;
  description: string;
  errorTypes: ErrorType[];
  conditions: PatternCondition[];
  confidence: number;
  frequency: number;
  lastDetected: number;
  associatedRecoveries: string[];
}

export interface PatternCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'range' | 'sequence';
  value: any;
  timeWindow?: number;
  weight: number;
}

export interface PatternDetectionConfig {
  enabled: boolean;
  minimumSamples: number;
  confidenceThreshold: number;
  timeWindow: number;
  maxPatterns: number;
  updateInterval: number;
}

export interface IPatternDetector {
  analyzeFailures(errors: SearchError[], context: ErrorContext[]): FailurePattern[];
  detectPattern(errors: SearchError[]): FailurePattern | null;
  registerKnownPattern(pattern: FailurePattern): void;
  removePattern(patternId: string): void;
  getDetectedPatterns(): FailurePattern[];
  predictRecoveryStrategy(error: SearchError): string[];
}

export interface RecoveryLearning {
  enabled: boolean;
  learningRate: number;
  memoryWindow: number;
  minimumSamples: number;
  adaptationThreshold: number;
}

export interface LearningMetrics {
  strategiesLearned: number;
  patternsDetected: number;
  adaptationsMade: number;
  predictionAccuracy: number;
  lastLearningUpdate: number;
}

export interface IRecoveryLearning {
  learnFromAttempt(attempt: RecoveryAttempt): void;
  predictBestStrategy(error: SearchError, context: ErrorContext): string;
  adaptStrategyPriorities(metrics: RecoveryMetrics): void;
  getLearnedPatterns(): FailurePattern[];
  getLearningMetrics(): LearningMetrics;
  resetLearning(): void;
}

export interface GracefulDegradationConfig {
  enabled: boolean;
  degradationLevels: DegradationLevel[];
  autoDegrade: boolean;
  recoveryThreshold: number;
  monitoringInterval: number;
}

export interface DegradationLevel {
  level: number;
  name: string;
  description: string;
  triggers: DegradationTrigger[];
  actions: DegradationAction[];
  recovery: DegradationRecovery;
}

export interface DegradationTrigger {
  type: 'error_rate' | 'response_time' | 'resource_usage' | 'custom';
  threshold: number;
  timeWindow: number;
  condition?: (metrics: SystemMetrics) => boolean;
}

export interface DegradationAction {
  type: 'disable_feature' | 'reduce_quality' | 'limit_requests' | 'use_cache_only' | 'custom';
  config: any;
  reversible: boolean;
  customAction?: (context: DegradationContext) => Promise<void>;
}

export interface DegradationRecovery {
  autoRecover: boolean;
  recoveryDelay: number;
  healthCheck: string;
  recoveryThreshold: number;
}

export interface DegradationContext {
  currentLevel: number;
  systemMetrics: SystemMetrics;
  errorHistory: SearchError[];
  userImpact: UserImpactMetrics;
}

export interface SystemMetrics {
  errorRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueDepth: number;
  timestamp: number;
}

export interface UserImpactMetrics {
  activeUsers: number;
  failedRequests: number;
  satisfactionScore?: number;
  completionRate: number;
  averageTaskTime: number;
}

export interface IGracefulDegradation {
  checkDegradationNeeded(metrics: SystemMetrics): boolean;
  degradeToLevel(level: number): Promise<void>;
  recoverToLevel(level: number): Promise<void>;
  getCurrentLevel(): number;
  isInDegradedMode(): boolean;
  getAvailableFeatures(): string[];
  getDegradationStatus(): DegradationStatus;
}

export interface DegradationStatus {
  active: boolean;
  currentLevel: number;
  maxLevel: number;
  degradedFeatures: string[];
  estimatedRecoveryTime?: number;
  impact: string;
}

export interface ResilienceConfig {
  circuitBreaker: CircuitBreakerConfig;
  autoRecovery: AutoRecoveryConfig;
  patternDetection: PatternDetectionConfig;
  gracefulDegradation: GracefulDegradationConfig;
  learning: RecoveryLearning;
  healthMonitoring: {
    enabled: boolean;
    interval: number;
    checks: HealthCheck[];
  };
}

export interface ResilienceMetrics {
  uptime: number;
  availability: number;
  mttr: number; // Mean Time To Recovery
  mtbf: number; // Mean Time Between Failures
  errorRate: number;
  recoverySuccessRate: number;
  circuitBreakerTrips: number;
  degradationEvents: number;
  totalRecoveries: number;
}

export interface IResilienceManager {
  initialize(config: ResilienceConfig): void;
  getHealthMonitor(): IHealthMonitor;
  getCircuitBreaker(): ICircuitBreaker;
  getAutoRecovery(): IAutoRecovery;
  getPatternDetector(): IPatternDetector;
  getGracefulDegradation(): IGracefulDegradation;
  getRecoveryLearning(): IRecoveryLearning;
  getResilienceMetrics(): ResilienceMetrics;
  shutdown(): Promise<void>;
}

export type RecoveryCallback = (attempt: RecoveryAttempt) => void;
export type HealthCallback = (result: HealthCheckResult) => void;
export type DegradationCallback = (status: DegradationStatus) => void;
export type PatternCallback = (pattern: FailurePattern) => void;