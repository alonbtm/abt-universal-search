import {
  IRecoveryOrchestrator,
  RecoveryWorkflow,
  RecoveryTrigger,
  RecoveryStep,
  RecoveryExecution,
  RecoveryStats,
  WorkflowPerformance,
  SearchError,
  ErrorContext,
} from '../types/ErrorHandling';
import {
  IHealthMonitor,
  HealthCheck,
  HealthStatus,
  ICircuitBreaker,
  CircuitBreakerConfig,
} from '../types/Recovery';

export interface RecoveryOrchestratorConfig {
  maxConcurrentExecutions: number;
  defaultTimeout: number;
  enableHealthChecks: boolean;
  enableCircuitBreaker: boolean;
  executionHistorySize: number;
  cooldownPeriod: number;
}

export interface RecoveryOrchestratorEvents {
  onWorkflowRegistered?: (workflow: RecoveryWorkflow) => void;
  onExecutionStart?: (execution: RecoveryExecution) => void;
  onExecutionComplete?: (execution: RecoveryExecution) => void;
  onExecutionFailed?: (execution: RecoveryExecution, error: Error) => void;
  onStepStart?: (executionId: string, step: RecoveryStep) => void;
  onStepComplete?: (executionId: string, step: RecoveryStep, result: any) => void;
  onStepFailed?: (executionId: string, step: RecoveryStep, error: Error) => void;
}

class SimpleHealthMonitor implements IHealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();

  registerHealthCheck(check: HealthCheck): void {
    this.checks.set(check.id, check);
  }

  removeHealthCheck(checkId: string): void {
    this.checks.delete(checkId);
  }

  async runHealthCheck(checkId: string): Promise<any> {
    const check = this.checks.get(checkId);
    if (!check) throw new Error(`Health check ${checkId} not found`);

    return { success: true, status: 'healthy', responseTime: 0, timestamp: Date.now() };
  }

  async runAllHealthChecks(): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    for (const [id] of Array.from(this.checks)) {
      results[id] = await this.runHealthCheck(id);
    }
    return results;
  }

  getServiceHealth(): any {
    return {
      serviceId: 'default',
      status: 'healthy',
      checks: {},
      lastUpdate: Date.now(),
      uptime: 0,
      availability: 1,
    };
  }

  isHealthy(): boolean {
    return true;
  }

  startMonitoring(): void {}
  stopMonitoring(): void {}
  getHealthHistory(): any[] {
    return [];
  }
}

class SimpleCircuitBreaker implements ICircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return operation();
  }

  getState() {
    return this.state;
  }

  getMetrics(): any {
    return {
      state: this.state,
      totalRequests: 0,
      failedRequests: 0,
      successfulRequests: 0,
      consecutiveFailures: 0,
      errorPercentage: 0,
      averageResponseTime: 0,
    };
  }

  forceOpen(): void {
    this.state = 'OPEN';
  }

  forceClosed(): void {
    this.state = 'CLOSED';
  }

  reset(): void {
    this.state = 'CLOSED';
  }

  isCallAllowed(): boolean {
    return this.state !== 'OPEN';
  }
}

export class RecoveryOrchestrator implements IRecoveryOrchestrator {
  private config: Required<RecoveryOrchestratorConfig>;
  private events: RecoveryOrchestratorEvents;
  private workflows: Map<string, RecoveryWorkflow> = new Map();
  private activeExecutions: Map<string, RecoveryExecution> = new Map();
  private executionHistory: RecoveryExecution[] = [];
  private stats: RecoveryStats;
  private healthMonitor: IHealthMonitor;
  private circuitBreaker: ICircuitBreaker;
  private lastExecutionTime: Map<string, number> = new Map();

  constructor(
    config?: Partial<RecoveryOrchestratorConfig>,
    events: RecoveryOrchestratorEvents = {}
  ) {
    this.config = {
      maxConcurrentExecutions: 5,
      defaultTimeout: 300000, // 5 minutes
      enableHealthChecks: true,
      enableCircuitBreaker: true,
      executionHistorySize: 1000,
      cooldownPeriod: 60000, // 1 minute
      ...config,
    };

    this.events = events;

    this.stats = {
      totalExecutions: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      averageRecoveryTime: 0,
      recoverySuccessRate: 0,
      workflowPerformance: {},
    };

    this.healthMonitor = new SimpleHealthMonitor();
    this.circuitBreaker = new SimpleCircuitBreaker();

    this.initializeDefaultWorkflows();
  }

  private initializeDefaultWorkflows(): void {
    // Default retry workflow
    this.registerWorkflow({
      id: 'default-retry',
      name: 'Default Retry Strategy',
      description: 'Automatic retry for transient errors',
      triggers: [
        {
          errorType: 'network',
          severity: 'medium',
          threshold: { count: 1, timeWindow: 60000 },
        },
        {
          errorType: 'timeout',
          severity: 'medium',
          threshold: { count: 1, timeWindow: 60000 },
        },
      ],
      steps: [
        {
          id: 'wait',
          name: 'Wait Before Retry',
          type: 'custom',
          config: { delay: 2000 },
          timeout: 5000,
        },
        {
          id: 'retry-operation',
          name: 'Retry Failed Operation',
          type: 'retry',
          config: { maxAttempts: 3 },
          timeout: 30000,
        },
      ],
      timeout: 60000,
      maxExecutions: 3,
      cooldownPeriod: 120000,
      enabled: true,
    });

    // Service restart workflow
    this.registerWorkflow({
      id: 'service-restart',
      name: 'Service Restart Recovery',
      description: 'Restart service components on critical failures',
      triggers: [
        {
          errorType: 'system',
          severity: 'critical',
          threshold: { count: 3, timeWindow: 300000 },
        },
      ],
      steps: [
        {
          id: 'health-check',
          name: 'Check Service Health',
          type: 'custom',
          config: { healthCheckId: 'service-health' },
        },
        {
          id: 'restart-service',
          name: 'Restart Service',
          type: 'reset',
          config: { component: 'service' },
          timeout: 60000,
        },
        {
          id: 'verify-restart',
          name: 'Verify Service Restart',
          type: 'custom',
          config: { healthCheckId: 'service-health' },
          timeout: 30000,
        },
      ],
      timeout: 180000,
      maxExecutions: 1,
      cooldownPeriod: 600000, // 10 minutes
      enabled: true,
    });

    // Fallback activation workflow
    this.registerWorkflow({
      id: 'fallback-activation',
      name: 'Activate Fallback Mode',
      description: 'Switch to fallback mode when primary service fails',
      triggers: [
        {
          errorType: 'network',
          severity: 'high',
          threshold: { count: 5, timeWindow: 300000 },
        },
        {
          errorType: 'system',
          severity: 'high',
          threshold: { count: 3, timeWindow: 180000 },
        },
      ],
      steps: [
        {
          id: 'enable-fallback',
          name: 'Enable Fallback Mode',
          type: 'fallback',
          config: { mode: 'offline' },
        },
        {
          id: 'notify-users',
          name: 'Notify Users',
          type: 'notify',
          config: {
            message: 'Service temporarily unavailable, using fallback mode',
            severity: 'warning',
          },
        },
      ],
      timeout: 30000,
      maxExecutions: 1,
      cooldownPeriod: 300000,
      enabled: true,
    });
  }

  public registerWorkflow(workflow: RecoveryWorkflow): void {
    // Validate workflow
    this.validateWorkflow(workflow);

    this.workflows.set(workflow.id, workflow);
    this.stats.workflowPerformance[workflow.id] = {
      executions: 0,
      successes: 0,
      failures: 0,
      averageTime: 0,
      successRate: 0,
    };

    this.events.onWorkflowRegistered?.(workflow);
  }

  public removeWorkflow(workflowId: string): void {
    // Cancel any active executions for this workflow
    for (const execution of Array.from(this.activeExecutions.values())) {
      if (execution.workflowId === workflowId) {
        this.cancelRecovery(execution.executionId);
      }
    }

    this.workflows.delete(workflowId);
    delete this.stats.workflowPerformance[workflowId];
  }

  public async executeRecovery(
    error: SearchError,
    context: ErrorContext
  ): Promise<RecoveryExecution> {
    // Check if we can start a new execution
    if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
      throw new Error('Maximum concurrent recoveries reached');
    }

    // Find matching workflows
    const matchingWorkflows = this.findMatchingWorkflows(error, context);
    if (matchingWorkflows.length === 0) {
      throw new Error('No matching recovery workflows found');
    }

    // Select the best workflow (first match for now)
    const workflow = matchingWorkflows[0];

    // Check cooldown period
    if (this.isInCooldown(workflow.id)) {
      throw new Error(`Workflow ${workflow.id} is in cooldown period`);
    }

    // Check execution limits
    if (this.hasExceededExecutionLimit(workflow.id, workflow.maxExecutions)) {
      throw new Error(`Workflow ${workflow.id} has exceeded execution limit`);
    }

    // Create execution
    const execution: RecoveryExecution = {
      workflowId: workflow.id,
      executionId: this.generateExecutionId(),
      startTime: Date.now(),
      status: 'running',
      completedSteps: [],
      errors: [error],
    };

    this.activeExecutions.set(execution.executionId, execution);
    this.stats.totalExecutions++;
    this.events.onExecutionStart?.(execution);

    try {
      const result = await this.executeWorkflow(workflow, execution, context);
      execution.result = result;
      execution.status = 'success';
      execution.endTime = Date.now();

      this.updateSuccessMetrics(execution);
      this.events.onExecutionComplete?.(execution);

      return execution;
    } catch (executionError) {
      execution.status = 'failure';
      execution.endTime = Date.now();
      execution.errors.push(this.normalizeError(executionError));

      this.updateFailureMetrics(execution);
      this.events.onExecutionFailed?.(execution, executionError as Error);

      throw executionError;
    } finally {
      this.activeExecutions.delete(execution.executionId);
      this.addToHistory(execution);
      this.lastExecutionTime.set(workflow.id, Date.now());
    }
  }

  private async executeWorkflow(
    workflow: RecoveryWorkflow,
    execution: RecoveryExecution,
    context: ErrorContext
  ): Promise<any> {
    const workflowTimeout = workflow.timeout || this.config.defaultTimeout;

    return Promise.race([
      this.executeSteps(workflow, execution, context),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Workflow ${workflow.id} timed out after ${workflowTimeout}ms`));
        }, workflowTimeout);
      }),
    ]);
  }

  private async executeSteps(
    workflow: RecoveryWorkflow,
    execution: RecoveryExecution,
    context: ErrorContext
  ): Promise<any> {
    let lastResult: any = null;

    for (const step of workflow.steps) {
      execution.currentStep = step.id;
      this.events.onStepStart?.(execution.executionId, step);

      try {
        const stepResult = await this.executeStep(step, context, lastResult);
        execution.completedSteps.push(step.id);
        lastResult = stepResult;

        this.events.onStepComplete?.(execution.executionId, step, stepResult);

        // Handle success callback
        if (step.onSuccess) {
          step.onSuccess(stepResult);
        }
      } catch (stepError) {
        this.events.onStepFailed?.(execution.executionId, step, stepError as Error);

        // Handle failure callback
        if (step.onFailure) {
          step.onFailure(stepError as Error);
        }

        // Check if we should skip on failure
        if (step.skipOnFailure) {
          continue;
        }

        throw stepError;
      }
    }

    return lastResult;
  }

  private async executeStep(
    step: RecoveryStep,
    context: ErrorContext,
    previousResult: any
  ): Promise<any> {
    const stepTimeout = step.timeout || 30000; // 30 second default

    const stepExecution = Promise.resolve(this.executeStepLogic(step, context, previousResult));

    return Promise.race([
      stepExecution,
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Step ${step.id} timed out after ${stepTimeout}ms`));
        }, stepTimeout);
      }),
    ]);
  }

  private async executeStepLogic(
    step: RecoveryStep,
    context: ErrorContext,
    previousResult: any
  ): Promise<any> {
    switch (step.type) {
      case 'retry':
        return this.executeRetryStep(step, context);

      case 'fallback':
        return this.executeFallbackStep(step, context);

      case 'reset':
        return this.executeResetStep(step, context);

      case 'notify':
        return this.executeNotifyStep(step, context);

      case 'custom':
        return this.executeCustomStep(step, context, previousResult);

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeRetryStep(step: RecoveryStep, context: ErrorContext): Promise<any> {
    const maxAttempts = step.config.maxAttempts || 3;
    const delay = step.config.delay || 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // In a real implementation, this would retry the original operation
        await this.sleep(delay * attempt);
        return { success: true, attempts: attempt };
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }
  }

  private async executeFallbackStep(step: RecoveryStep, context: ErrorContext): Promise<any> {
    const mode = step.config.mode || 'default';

    // In a real implementation, this would activate the fallback system
    return { success: true, fallbackMode: mode, activated: true };
  }

  private async executeResetStep(step: RecoveryStep, context: ErrorContext): Promise<any> {
    const component = step.config.component || 'default';

    // In a real implementation, this would reset/restart the specified component
    return { success: true, component, resetTime: Date.now() };
  }

  private async executeNotifyStep(step: RecoveryStep, context: ErrorContext): Promise<any> {
    const message = step.config.message || 'Recovery action executed';
    const severity = step.config.severity || 'info';

    // In a real implementation, this would send notifications
    console.log(`[${severity.toUpperCase()}] ${message}`);

    return { success: true, message, severity, notifiedAt: Date.now() };
  }

  private async executeCustomStep(
    step: RecoveryStep,
    context: ErrorContext,
    previousResult: any
  ): Promise<any> {
    if (step.config.delay) {
      await this.sleep(step.config.delay);
    }

    if (step.config.healthCheckId && this.config.enableHealthChecks) {
      const healthResult = await this.healthMonitor.runHealthCheck(step.config.healthCheckId);
      return healthResult;
    }

    return { success: true, step: step.id, config: step.config };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private findMatchingWorkflows(error: SearchError, context: ErrorContext): RecoveryWorkflow[] {
    const matching: RecoveryWorkflow[] = [];

    for (const workflow of Array.from(this.workflows.values())) {
      if (!workflow.enabled) continue;

      const hasMatchingTrigger = workflow.triggers.some((trigger: any) =>
        this.evaluateTrigger(trigger, error, context)
      );

      if (hasMatchingTrigger) {
        matching.push(workflow);
      }
    }

    // Sort by priority (workflows with more specific triggers first)
    return matching.sort((a, b) => b.triggers.length - a.triggers.length);
  }

  private evaluateTrigger(
    trigger: RecoveryTrigger,
    error: SearchError,
    context: ErrorContext
  ): boolean {
    // Check error type match
    if (trigger.errorType !== error.type) {
      return false;
    }

    // Check severity match
    if (trigger.severity !== error.severity) {
      return false;
    }

    // Check custom condition
    if (trigger.condition && !trigger.condition(error, context)) {
      return false;
    }

    // Check threshold (simplified - in real implementation would check recent error history)
    if (trigger.threshold) {
      // For now, always pass threshold check
      return true;
    }

    return true;
  }

  private validateWorkflow(workflow: RecoveryWorkflow): void {
    if (!workflow.id) {
      throw new Error('Workflow must have an ID');
    }

    if (!workflow.name) {
      throw new Error('Workflow must have a name');
    }

    if (!workflow.triggers || workflow.triggers.length === 0) {
      throw new Error('Workflow must have at least one trigger');
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    // Validate steps have unique IDs
    const stepIds = new Set();
    for (const step of workflow.steps) {
      if (stepIds.has(step.id)) {
        throw new Error(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);
    }
  }

  private isInCooldown(workflowId: string): boolean {
    const lastExecution = this.lastExecutionTime.get(workflowId);
    if (!lastExecution) return false;

    const cooldownPeriod =
      this.workflows.get(workflowId)?.cooldownPeriod || this.config.cooldownPeriod;
    return Date.now() - lastExecution < cooldownPeriod;
  }

  private hasExceededExecutionLimit(workflowId: string, maxExecutions: number): boolean {
    const recentExecutions = this.executionHistory
      .filter(e => e.workflowId === workflowId)
      .filter(e => Date.now() - e.startTime < 3600000).length; // Last hour

    return recentExecutions >= maxExecutions;
  }

  private generateExecutionId(): string {
    return `recovery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private normalizeError(error: any): SearchError {
    if (error && typeof error === 'object' && 'type' in error) {
      return error as SearchError;
    }

    return {
      name: error.name || 'RecoveryError',
      message: error.message || String(error),
      type: 'system',
      code: 'RECOVERY_ERROR',
      severity: 'high',
      recoverability: 'unknown',
      timestamp: Date.now(),
      correlationId: this.generateExecutionId(),
    };
  }

  private updateSuccessMetrics(execution: RecoveryExecution): void {
    this.stats.successfulRecoveries++;

    const duration = execution.endTime! - execution.startTime;
    this.updateAverageRecoveryTime(duration);
    this.updateWorkflowPerformance(execution.workflowId, true, duration);
    this.updateSuccessRate();
  }

  private updateFailureMetrics(execution: RecoveryExecution): void {
    this.stats.failedRecoveries++;

    const duration = execution.endTime! - execution.startTime;
    this.updateWorkflowPerformance(execution.workflowId, false, duration);
    this.updateSuccessRate();
  }

  private updateAverageRecoveryTime(duration: number): void {
    const totalSuccessful = this.stats.successfulRecoveries;
    this.stats.averageRecoveryTime =
      (this.stats.averageRecoveryTime * (totalSuccessful - 1) + duration) / totalSuccessful;
  }

  private updateWorkflowPerformance(workflowId: string, success: boolean, duration: number): void {
    const performance = this.stats.workflowPerformance[workflowId];
    if (!performance) return;

    performance.executions++;
    if (success) {
      performance.successes++;
    } else {
      performance.failures++;
    }

    // Update average time
    performance.averageTime =
      (performance.averageTime * (performance.executions - 1) + duration) / performance.executions;

    // Update success rate
    performance.successRate = performance.successes / performance.executions;
    (performance as any).lastUsed = Date.now();
  }

  private updateSuccessRate(): void {
    this.stats.recoverySuccessRate =
      this.stats.totalExecutions > 0
        ? this.stats.successfulRecoveries / this.stats.totalExecutions
        : 0;
  }

  private addToHistory(execution: RecoveryExecution): void {
    this.executionHistory.push(execution);

    // Trim history if it exceeds the limit
    if (this.executionHistory.length > this.config.executionHistorySize) {
      this.executionHistory.shift();
    }
  }

  public getActiveRecoveries(): RecoveryExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  public cancelRecovery(executionId: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = 'cancelled';
      execution.endTime = Date.now();
      this.activeExecutions.delete(executionId);
      this.addToHistory(execution);
    }
  }

  public getRecoveryStats(): RecoveryStats {
    return { ...this.stats };
  }

  public getWorkflows(): RecoveryWorkflow[] {
    return Array.from(this.workflows.values());
  }

  public getWorkflow(workflowId: string): RecoveryWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  public getExecutionHistory(): RecoveryExecution[] {
    return [...this.executionHistory];
  }

  public clearExecutionHistory(): void {
    this.executionHistory = [];
  }

  public setHealthMonitor(healthMonitor: IHealthMonitor): void {
    this.healthMonitor = healthMonitor;
  }

  public setCircuitBreaker(circuitBreaker: ICircuitBreaker): void {
    this.circuitBreaker = circuitBreaker;
  }

  public getHealthMonitor(): IHealthMonitor {
    return this.healthMonitor;
  }

  public getCircuitBreaker(): ICircuitBreaker {
    return this.circuitBreaker;
  }
}
