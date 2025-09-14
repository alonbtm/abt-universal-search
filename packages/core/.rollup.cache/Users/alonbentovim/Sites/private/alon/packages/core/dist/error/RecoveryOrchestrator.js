class SimpleHealthMonitor {
    constructor() {
        this.checks = new Map();
    }
    registerHealthCheck(check) {
        this.checks.set(check.id, check);
    }
    removeHealthCheck(checkId) {
        this.checks.delete(checkId);
    }
    async runHealthCheck(checkId) {
        const check = this.checks.get(checkId);
        if (!check)
            throw new Error(`Health check ${checkId} not found`);
        return { success: true, status: 'healthy', responseTime: 0, timestamp: Date.now() };
    }
    async runAllHealthChecks() {
        const results = {};
        for (const [id] of Array.from(this.checks)) {
            results[id] = await this.runHealthCheck(id);
        }
        return results;
    }
    getServiceHealth() {
        return { serviceId: 'default', status: 'healthy', checks: {}, lastUpdate: Date.now(), uptime: 0, availability: 1 };
    }
    isHealthy() {
        return true;
    }
    startMonitoring() { }
    stopMonitoring() { }
    getHealthHistory() {
        return [];
    }
}
class SimpleCircuitBreaker {
    constructor() {
        this.state = 'CLOSED';
    }
    async execute(operation) {
        return operation();
    }
    getState() {
        return this.state;
    }
    getMetrics() {
        return {
            state: this.state,
            totalRequests: 0,
            failedRequests: 0,
            successfulRequests: 0,
            consecutiveFailures: 0,
            errorPercentage: 0,
            averageResponseTime: 0
        };
    }
    forceOpen() {
        this.state = 'OPEN';
    }
    forceClosed() {
        this.state = 'CLOSED';
    }
    reset() {
        this.state = 'CLOSED';
    }
    isCallAllowed() {
        return this.state !== 'OPEN';
    }
}
export class RecoveryOrchestrator {
    constructor(config, events = {}) {
        this.workflows = new Map();
        this.activeExecutions = new Map();
        this.executionHistory = [];
        this.lastExecutionTime = new Map();
        this.config = {
            maxConcurrentExecutions: 5,
            defaultTimeout: 300000, // 5 minutes
            enableHealthChecks: true,
            enableCircuitBreaker: true,
            executionHistorySize: 1000,
            cooldownPeriod: 60000, // 1 minute
            ...config
        };
        this.events = events;
        this.stats = {
            totalExecutions: 0,
            successfulRecoveries: 0,
            failedRecoveries: 0,
            averageRecoveryTime: 0,
            recoverySuccessRate: 0,
            workflowPerformance: {}
        };
        this.healthMonitor = new SimpleHealthMonitor();
        this.circuitBreaker = new SimpleCircuitBreaker();
        this.initializeDefaultWorkflows();
    }
    initializeDefaultWorkflows() {
        // Default retry workflow
        this.registerWorkflow({
            id: 'default-retry',
            name: 'Default Retry Strategy',
            description: 'Automatic retry for transient errors',
            triggers: [
                {
                    errorType: 'network',
                    severity: 'medium',
                    threshold: { count: 1, timeWindow: 60000 }
                },
                {
                    errorType: 'timeout',
                    severity: 'medium',
                    threshold: { count: 1, timeWindow: 60000 }
                }
            ],
            steps: [
                {
                    id: 'wait',
                    name: 'Wait Before Retry',
                    type: 'custom',
                    config: { delay: 2000 },
                    timeout: 5000
                },
                {
                    id: 'retry-operation',
                    name: 'Retry Failed Operation',
                    type: 'retry',
                    config: { maxAttempts: 3 },
                    timeout: 30000
                }
            ],
            timeout: 60000,
            maxExecutions: 3,
            cooldownPeriod: 120000,
            enabled: true
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
                    threshold: { count: 3, timeWindow: 300000 }
                }
            ],
            steps: [
                {
                    id: 'health-check',
                    name: 'Check Service Health',
                    type: 'custom',
                    config: { healthCheckId: 'service-health' }
                },
                {
                    id: 'restart-service',
                    name: 'Restart Service',
                    type: 'reset',
                    config: { component: 'service' },
                    timeout: 60000
                },
                {
                    id: 'verify-restart',
                    name: 'Verify Service Restart',
                    type: 'custom',
                    config: { healthCheckId: 'service-health' },
                    timeout: 30000
                }
            ],
            timeout: 180000,
            maxExecutions: 1,
            cooldownPeriod: 600000, // 10 minutes
            enabled: true
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
                    threshold: { count: 5, timeWindow: 300000 }
                },
                {
                    errorType: 'system',
                    severity: 'high',
                    threshold: { count: 3, timeWindow: 180000 }
                }
            ],
            steps: [
                {
                    id: 'enable-fallback',
                    name: 'Enable Fallback Mode',
                    type: 'fallback',
                    config: { mode: 'offline' }
                },
                {
                    id: 'notify-users',
                    name: 'Notify Users',
                    type: 'notify',
                    config: {
                        message: 'Service temporarily unavailable, using fallback mode',
                        severity: 'warning'
                    }
                }
            ],
            timeout: 30000,
            maxExecutions: 1,
            cooldownPeriod: 300000,
            enabled: true
        });
    }
    registerWorkflow(workflow) {
        // Validate workflow
        this.validateWorkflow(workflow);
        this.workflows.set(workflow.id, workflow);
        this.stats.workflowPerformance[workflow.id] = {
            executions: 0,
            successes: 0,
            failures: 0,
            averageTime: 0,
            successRate: 0
        };
        this.events.onWorkflowRegistered?.(workflow);
    }
    removeWorkflow(workflowId) {
        // Cancel any active executions for this workflow
        for (const execution of Array.from(this.activeExecutions.values())) {
            if (execution.workflowId === workflowId) {
                this.cancelRecovery(execution.executionId);
            }
        }
        this.workflows.delete(workflowId);
        delete this.stats.workflowPerformance[workflowId];
    }
    async executeRecovery(error, context) {
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
        const execution = {
            workflowId: workflow.id,
            executionId: this.generateExecutionId(),
            startTime: Date.now(),
            status: 'running',
            completedSteps: [],
            errors: [error]
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
        }
        catch (executionError) {
            execution.status = 'failure';
            execution.endTime = Date.now();
            execution.errors.push(this.normalizeError(executionError));
            this.updateFailureMetrics(execution);
            this.events.onExecutionFailed?.(execution, executionError);
            throw executionError;
        }
        finally {
            this.activeExecutions.delete(execution.executionId);
            this.addToHistory(execution);
            this.lastExecutionTime.set(workflow.id, Date.now());
        }
    }
    async executeWorkflow(workflow, execution, context) {
        const workflowTimeout = workflow.timeout || this.config.defaultTimeout;
        return Promise.race([
            this.executeSteps(workflow, execution, context),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Workflow ${workflow.id} timed out after ${workflowTimeout}ms`));
                }, workflowTimeout);
            })
        ]);
    }
    async executeSteps(workflow, execution, context) {
        let lastResult = null;
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
            }
            catch (stepError) {
                this.events.onStepFailed?.(execution.executionId, step, stepError);
                // Handle failure callback
                if (step.onFailure) {
                    step.onFailure(stepError);
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
    async executeStep(step, context, previousResult) {
        const stepTimeout = step.timeout || 30000; // 30 second default
        const stepExecution = Promise.resolve(this.executeStepLogic(step, context, previousResult));
        return Promise.race([
            stepExecution,
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Step ${step.id} timed out after ${stepTimeout}ms`));
                }, stepTimeout);
            })
        ]);
    }
    async executeStepLogic(step, context, previousResult) {
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
    async executeRetryStep(step, context) {
        const maxAttempts = step.config.maxAttempts || 3;
        const delay = step.config.delay || 1000;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                // In a real implementation, this would retry the original operation
                await this.sleep(delay * attempt);
                return { success: true, attempts: attempt };
            }
            catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
            }
        }
    }
    async executeFallbackStep(step, context) {
        const mode = step.config.mode || 'default';
        // In a real implementation, this would activate the fallback system
        return { success: true, fallbackMode: mode, activated: true };
    }
    async executeResetStep(step, context) {
        const component = step.config.component || 'default';
        // In a real implementation, this would reset/restart the specified component
        return { success: true, component, resetTime: Date.now() };
    }
    async executeNotifyStep(step, context) {
        const message = step.config.message || 'Recovery action executed';
        const severity = step.config.severity || 'info';
        // In a real implementation, this would send notifications
        console.log(`[${severity.toUpperCase()}] ${message}`);
        return { success: true, message, severity, notifiedAt: Date.now() };
    }
    async executeCustomStep(step, context, previousResult) {
        if (step.config.delay) {
            await this.sleep(step.config.delay);
        }
        if (step.config.healthCheckId && this.config.enableHealthChecks) {
            const healthResult = await this.healthMonitor.runHealthCheck(step.config.healthCheckId);
            return healthResult;
        }
        return { success: true, step: step.id, config: step.config };
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    findMatchingWorkflows(error, context) {
        const matching = [];
        for (const workflow of Array.from(this.workflows.values())) {
            if (!workflow.enabled)
                continue;
            const hasMatchingTrigger = workflow.triggers.some((trigger) => this.evaluateTrigger(trigger, error, context));
            if (hasMatchingTrigger) {
                matching.push(workflow);
            }
        }
        // Sort by priority (workflows with more specific triggers first)
        return matching.sort((a, b) => b.triggers.length - a.triggers.length);
    }
    evaluateTrigger(trigger, error, context) {
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
    validateWorkflow(workflow) {
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
    isInCooldown(workflowId) {
        const lastExecution = this.lastExecutionTime.get(workflowId);
        if (!lastExecution)
            return false;
        const cooldownPeriod = this.workflows.get(workflowId)?.cooldownPeriod || this.config.cooldownPeriod;
        return Date.now() - lastExecution < cooldownPeriod;
    }
    hasExceededExecutionLimit(workflowId, maxExecutions) {
        const recentExecutions = this.executionHistory
            .filter(e => e.workflowId === workflowId)
            .filter(e => Date.now() - e.startTime < 3600000) // Last hour
            .length;
        return recentExecutions >= maxExecutions;
    }
    generateExecutionId() {
        return `recovery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    normalizeError(error) {
        if (error && typeof error === 'object' && 'type' in error) {
            return error;
        }
        return {
            name: error.name || 'RecoveryError',
            message: error.message || String(error),
            type: 'system',
            code: 'RECOVERY_ERROR',
            severity: 'high',
            recoverability: 'unknown',
            timestamp: Date.now(),
            correlationId: this.generateExecutionId()
        };
    }
    updateSuccessMetrics(execution) {
        this.stats.successfulRecoveries++;
        const duration = (execution.endTime - execution.startTime);
        this.updateAverageRecoveryTime(duration);
        this.updateWorkflowPerformance(execution.workflowId, true, duration);
        this.updateSuccessRate();
    }
    updateFailureMetrics(execution) {
        this.stats.failedRecoveries++;
        const duration = (execution.endTime - execution.startTime);
        this.updateWorkflowPerformance(execution.workflowId, false, duration);
        this.updateSuccessRate();
    }
    updateAverageRecoveryTime(duration) {
        const totalSuccessful = this.stats.successfulRecoveries;
        this.stats.averageRecoveryTime =
            (this.stats.averageRecoveryTime * (totalSuccessful - 1) + duration) / totalSuccessful;
    }
    updateWorkflowPerformance(workflowId, success, duration) {
        const performance = this.stats.workflowPerformance[workflowId];
        if (!performance)
            return;
        performance.executions++;
        if (success) {
            performance.successes++;
        }
        else {
            performance.failures++;
        }
        // Update average time
        performance.averageTime =
            (performance.averageTime * (performance.executions - 1) + duration) / performance.executions;
        // Update success rate
        performance.successRate = performance.successes / performance.executions;
        performance.lastUsed = Date.now();
    }
    updateSuccessRate() {
        this.stats.recoverySuccessRate =
            this.stats.totalExecutions > 0 ?
                this.stats.successfulRecoveries / this.stats.totalExecutions : 0;
    }
    addToHistory(execution) {
        this.executionHistory.push(execution);
        // Trim history if it exceeds the limit
        if (this.executionHistory.length > this.config.executionHistorySize) {
            this.executionHistory.shift();
        }
    }
    getActiveRecoveries() {
        return Array.from(this.activeExecutions.values());
    }
    cancelRecovery(executionId) {
        const execution = this.activeExecutions.get(executionId);
        if (execution) {
            execution.status = 'cancelled';
            execution.endTime = Date.now();
            this.activeExecutions.delete(executionId);
            this.addToHistory(execution);
        }
    }
    getRecoveryStats() {
        return { ...this.stats };
    }
    getWorkflows() {
        return Array.from(this.workflows.values());
    }
    getWorkflow(workflowId) {
        return this.workflows.get(workflowId);
    }
    getExecutionHistory() {
        return [...this.executionHistory];
    }
    clearExecutionHistory() {
        this.executionHistory = [];
    }
    setHealthMonitor(healthMonitor) {
        this.healthMonitor = healthMonitor;
    }
    setCircuitBreaker(circuitBreaker) {
        this.circuitBreaker = circuitBreaker;
    }
    getHealthMonitor() {
        return this.healthMonitor;
    }
    getCircuitBreaker() {
        return this.circuitBreaker;
    }
}
//# sourceMappingURL=RecoveryOrchestrator.js.map