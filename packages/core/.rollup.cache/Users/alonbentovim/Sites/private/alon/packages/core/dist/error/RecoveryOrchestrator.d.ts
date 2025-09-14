import { IRecoveryOrchestrator, RecoveryWorkflow, RecoveryStep, RecoveryExecution, RecoveryStats, SearchError, ErrorContext } from '../types/ErrorHandling';
import { IHealthMonitor, ICircuitBreaker } from '../types/Recovery';
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
export declare class RecoveryOrchestrator implements IRecoveryOrchestrator {
    private config;
    private events;
    private workflows;
    private activeExecutions;
    private executionHistory;
    private stats;
    private healthMonitor;
    private circuitBreaker;
    private lastExecutionTime;
    constructor(config?: Partial<RecoveryOrchestratorConfig>, events?: RecoveryOrchestratorEvents);
    private initializeDefaultWorkflows;
    registerWorkflow(workflow: RecoveryWorkflow): void;
    removeWorkflow(workflowId: string): void;
    executeRecovery(error: SearchError, context: ErrorContext): Promise<RecoveryExecution>;
    private executeWorkflow;
    private executeSteps;
    private executeStep;
    private executeStepLogic;
    private executeRetryStep;
    private executeFallbackStep;
    private executeResetStep;
    private executeNotifyStep;
    private executeCustomStep;
    private sleep;
    private findMatchingWorkflows;
    private evaluateTrigger;
    private validateWorkflow;
    private isInCooldown;
    private hasExceededExecutionLimit;
    private generateExecutionId;
    private normalizeError;
    private updateSuccessMetrics;
    private updateFailureMetrics;
    private updateAverageRecoveryTime;
    private updateWorkflowPerformance;
    private updateSuccessRate;
    private addToHistory;
    getActiveRecoveries(): RecoveryExecution[];
    cancelRecovery(executionId: string): void;
    getRecoveryStats(): RecoveryStats;
    getWorkflows(): RecoveryWorkflow[];
    getWorkflow(workflowId: string): RecoveryWorkflow | undefined;
    getExecutionHistory(): RecoveryExecution[];
    clearExecutionHistory(): void;
    setHealthMonitor(healthMonitor: IHealthMonitor): void;
    setCircuitBreaker(circuitBreaker: ICircuitBreaker): void;
    getHealthMonitor(): IHealthMonitor;
    getCircuitBreaker(): ICircuitBreaker;
}
//# sourceMappingURL=RecoveryOrchestrator.d.ts.map