interface ScalingConfig {
    minReplicas: number;
    maxReplicas: number;
    targetCPUUtilization: number;
    targetMemoryUtilization: number;
    targetRequestsPerSecond: number;
    scaleUpCooldown: number; // seconds
    scaleDownCooldown: number; // seconds
    scaleUpPolicy: {
        type: 'step' | 'target-tracking' | 'predictive';
        stepSize: number;
        threshold: number;
        evaluationPeriods: number;
    };
    scaleDownPolicy: {
        type: 'step' | 'target-tracking' | 'conservative';
        stepSize: number;
        threshold: number;
        evaluationPeriods: number;
    };
    predictiveScaling: {
        enabled: boolean;
        lookAheadTime: number; // minutes
        modelUpdateInterval: number; // minutes
        confidenceThreshold: number; // 0-1
    };
}

interface ServiceInstance {
    id: string;
    address: string;
    port: number;
    status: 'starting' | 'healthy' | 'unhealthy' | 'draining' | 'terminating';
    metrics: InstanceMetrics;
    createdAt: Date;
    lastHealthCheck: Date;
    version: string;
    zone: string;
    weight: number;
}

interface InstanceMetrics {
    cpuUtilization: number;
    memoryUtilization: number;
    requestsPerSecond: number;
    responseTime: number;
    errorRate: number;
    activeConnections: number;
    queueLength: number;
}

interface ScalingEvent {
    timestamp: Date;
    action: 'scale-up' | 'scale-down' | 'replace';
    reason: string;
    fromReplicas: number;
    toReplicas: number;
    trigger: {
        metric: string;
        currentValue: number;
        targetValue: number;
        threshold: number;
    };
    duration: number;
    success: boolean;
}

interface LoadBalancerConfig {
    algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'ip-hash' | 'random';
    healthCheck: {
        interval: number; // seconds
        timeout: number; // seconds
        failureThreshold: number;
        successThreshold: number;
        path: string;
        expectedCodes: number[];
    };
    stickySession: {
        enabled: boolean;
        cookieName?: string;
        duration?: number;
    };
    connectionDraining: {
        enabled: boolean;
        timeout: number; // seconds
    };
}

interface TrafficPrediction {
    timestamp: Date;
    predictedRPS: number;
    confidence: number;
    recommendations: {
        suggestedReplicas: number;
        scaleAction: 'up' | 'down' | 'maintain';
        reason: string;
    };
}

export class HorizontalScaling {
    private config: ScalingConfig;
    private lbConfig: LoadBalancerConfig;
    private instances = new Map<string, ServiceInstance>();
    private scalingHistory: ScalingEvent[] = [];
    private currentReplicas = 0;
    private lastScaleUp = 0;
    private lastScaleDown = 0;
    private metricsHistory: { timestamp: Date; metrics: InstanceMetrics }[] = [];
    private scalingTimer: number | null = null;
    private healthCheckTimer: number | null = null;

    constructor(config: ScalingConfig, lbConfig: LoadBalancerConfig) {
        this.config = config;
        this.lbConfig = lbConfig;
        this.initializeScaling();
    }

    private initializeScaling(): void {
        this.startScalingMonitor();
        this.startHealthChecks();

        // Initialize minimum replicas
        this.scaleToTarget(this.config.minReplicas, 'initialization');
    }

    private startScalingMonitor(): void {
        this.scalingTimer = setInterval(() => {
            this.evaluateScaling();
        }, 30000); // Evaluate every 30 seconds
    }

    private startHealthChecks(): void {
        this.healthCheckTimer = setInterval(() => {
            this.performHealthChecks();
        }, this.lbConfig.healthCheck.interval * 1000);
    }

    private async evaluateScaling(): Promise<void> {
        try {
            const metrics = this.getAggregatedMetrics();
            const currentTime = Date.now();

            // Check cooldown periods
            const scaleUpCooldown = (currentTime - this.lastScaleUp) / 1000;
            const scaleDownCooldown = (currentTime - this.lastScaleDown) / 1000;

            let shouldScaleUp = false;
            let shouldScaleDown = false;
            let scalingReason = '';

            // CPU-based scaling
            if (metrics.cpuUtilization > this.config.targetCPUUtilization * 1.2) {
                shouldScaleUp = true;
                scalingReason = `CPU utilization high: ${metrics.cpuUtilization.toFixed(2)}%`;
            } else if (metrics.cpuUtilization < this.config.targetCPUUtilization * 0.5) {
                shouldScaleDown = true;
                scalingReason = `CPU utilization low: ${metrics.cpuUtilization.toFixed(2)}%`;
            }

            // Memory-based scaling
            if (metrics.memoryUtilization > this.config.targetMemoryUtilization * 1.2) {
                shouldScaleUp = true;
                scalingReason = `Memory utilization high: ${metrics.memoryUtilization.toFixed(2)}%`;
            } else if (metrics.memoryUtilization < this.config.targetMemoryUtilization * 0.5) {
                shouldScaleDown = true;
                scalingReason = `Memory utilization low: ${metrics.memoryUtilization.toFixed(2)}%`;
            }

            // Request rate-based scaling
            if (metrics.requestsPerSecond > this.config.targetRequestsPerSecond * 1.1) {
                shouldScaleUp = true;
                scalingReason = `Request rate high: ${metrics.requestsPerSecond.toFixed(2)} RPS`;
            } else if (metrics.requestsPerSecond < this.config.targetRequestsPerSecond * 0.3) {
                shouldScaleDown = true;
                scalingReason = `Request rate low: ${metrics.requestsPerSecond.toFixed(2)} RPS`;
            }

            // Response time-based scaling
            if (metrics.responseTime > 1000) { // 1 second threshold
                shouldScaleUp = true;
                scalingReason = `Response time high: ${metrics.responseTime.toFixed(2)}ms`;
            }

            // Execute scaling decisions
            if (shouldScaleUp && scaleUpCooldown >= this.config.scaleUpCooldown && this.currentReplicas < this.config.maxReplicas) {
                const targetReplicas = this.calculateScaleUpTarget(metrics);
                await this.scaleUp(targetReplicas, scalingReason);
            } else if (shouldScaleDown && scaleDownCooldown >= this.config.scaleDownCooldown && this.currentReplicas > this.config.minReplicas) {
                const targetReplicas = this.calculateScaleDownTarget(metrics);
                await this.scaleDown(targetReplicas, scalingReason);
            }

            // Predictive scaling
            if (this.config.predictiveScaling.enabled) {
                await this.evaluatePredictiveScaling();
            }

        } catch (error) {
            console.error('Scaling evaluation failed:', error);
        }
    }

    private getAggregatedMetrics(): InstanceMetrics {
        const healthyInstances = Array.from(this.instances.values())
            .filter(instance => instance.status === 'healthy');

        if (healthyInstances.length === 0) {
            return {
                cpuUtilization: 0,
                memoryUtilization: 0,
                requestsPerSecond: 0,
                responseTime: 0,
                errorRate: 0,
                activeConnections: 0,
                queueLength: 0
            };
        }

        const totalMetrics = healthyInstances.reduce((acc, instance) => {
            acc.cpuUtilization += instance.metrics.cpuUtilization;
            acc.memoryUtilization += instance.metrics.memoryUtilization;
            acc.requestsPerSecond += instance.metrics.requestsPerSecond;
            acc.responseTime += instance.metrics.responseTime;
            acc.errorRate += instance.metrics.errorRate;
            acc.activeConnections += instance.metrics.activeConnections;
            acc.queueLength += instance.metrics.queueLength;
            return acc;
        }, {
            cpuUtilization: 0,
            memoryUtilization: 0,
            requestsPerSecond: 0,
            responseTime: 0,
            errorRate: 0,
            activeConnections: 0,
            queueLength: 0
        });

        const count = healthyInstances.length;
        return {
            cpuUtilization: totalMetrics.cpuUtilization / count,
            memoryUtilization: totalMetrics.memoryUtilization / count,
            requestsPerSecond: totalMetrics.requestsPerSecond, // Sum, not average
            responseTime: totalMetrics.responseTime / count,
            errorRate: totalMetrics.errorRate / count,
            activeConnections: totalMetrics.activeConnections,
            queueLength: totalMetrics.queueLength
        };
    }

    private calculateScaleUpTarget(metrics: InstanceMetrics): number {
        let multiplier = 1;

        switch (this.config.scaleUpPolicy.type) {
            case 'step':
                multiplier = Math.ceil(this.config.scaleUpPolicy.stepSize);
                break;
            case 'target-tracking':
                const cpuRatio = metrics.cpuUtilization / this.config.targetCPUUtilization;
                const memoryRatio = metrics.memoryUtilization / this.config.targetMemoryUtilization;
                const requestRatio = metrics.requestsPerSecond / this.config.targetRequestsPerSecond;

                multiplier = Math.max(cpuRatio, memoryRatio, requestRatio);
                break;
            case 'predictive':
                multiplier = this.getPredictiveMultiplier();
                break;
        }

        const targetReplicas = Math.min(
            Math.ceil(this.currentReplicas * multiplier),
            this.config.maxReplicas
        );

        return Math.max(targetReplicas, this.currentReplicas + 1);
    }

    private calculateScaleDownTarget(metrics: InstanceMetrics): number {
        let reductionFactor = 1;

        switch (this.config.scaleDownPolicy.type) {
            case 'step':
                reductionFactor = this.config.scaleDownPolicy.stepSize;
                break;
            case 'target-tracking':
                const cpuRatio = this.config.targetCPUUtilization / metrics.cpuUtilization;
                const memoryRatio = this.config.targetMemoryUtilization / metrics.memoryUtilization;
                const requestRatio = this.config.targetRequestsPerSecond / metrics.requestsPerSecond;

                reductionFactor = Math.min(cpuRatio, memoryRatio, requestRatio);
                break;
            case 'conservative':
                reductionFactor = 0.8; // Conservative 20% reduction
                break;
        }

        const targetReplicas = Math.max(
            Math.floor(this.currentReplicas / reductionFactor),
            this.config.minReplicas
        );

        return Math.min(targetReplicas, this.currentReplicas - 1);
    }

    private getPredictiveMultiplier(): number {
        // Simple predictive scaling based on historical trends
        const recentMetrics = this.metricsHistory.slice(-10);
        if (recentMetrics.length < 2) return 1.2;

        const trend = this.calculateTrend(recentMetrics.map(m => m.metrics.requestsPerSecond));
        return trend > 0 ? 1.3 : 1.1;
    }

    private calculateTrend(values: number[]): number {
        if (values.length < 2) return 0;

        let trend = 0;
        for (let i = 1; i < values.length; i++) {
            trend += values[i] - values[i - 1];
        }

        return trend / (values.length - 1);
    }

    private async scaleUp(targetReplicas: number, reason: string): Promise<void> {
        const startTime = Date.now();
        const originalReplicas = this.currentReplicas;

        try {
            console.log(`Scaling up from ${originalReplicas} to ${targetReplicas} replicas. Reason: ${reason}`);

            const instancesToAdd = targetReplicas - originalReplicas;
            const newInstances: ServiceInstance[] = [];

            for (let i = 0; i < instancesToAdd; i++) {
                const instance = await this.createInstance();
                newInstances.push(instance);
                this.instances.set(instance.id, instance);
            }

            // Wait for instances to become healthy
            await this.waitForInstancesHealthy(newInstances.map(i => i.id));

            this.currentReplicas = targetReplicas;
            this.lastScaleUp = Date.now();

            this.recordScalingEvent({
                timestamp: new Date(),
                action: 'scale-up',
                reason,
                fromReplicas: originalReplicas,
                toReplicas: targetReplicas,
                trigger: {
                    metric: 'aggregate',
                    currentValue: 0,
                    targetValue: 0,
                    threshold: 0
                },
                duration: Date.now() - startTime,
                success: true
            });

        } catch (error) {
            console.error('Scale up failed:', error);
            this.recordScalingEvent({
                timestamp: new Date(),
                action: 'scale-up',
                reason: `${reason} - FAILED: ${error}`,
                fromReplicas: originalReplicas,
                toReplicas: originalReplicas,
                trigger: {
                    metric: 'aggregate',
                    currentValue: 0,
                    targetValue: 0,
                    threshold: 0
                },
                duration: Date.now() - startTime,
                success: false
            });
        }
    }

    private async scaleDown(targetReplicas: number, reason: string): Promise<void> {
        const startTime = Date.now();
        const originalReplicas = this.currentReplicas;

        try {
            console.log(`Scaling down from ${originalReplicas} to ${targetReplicas} replicas. Reason: ${reason}`);

            const instancesToRemove = originalReplicas - targetReplicas;
            const instancesToTerminate = this.selectInstancesForTermination(instancesToRemove);

            // Drain connections if enabled
            if (this.lbConfig.connectionDraining.enabled) {
                await this.drainInstances(instancesToTerminate);
            }

            // Terminate instances
            for (const instanceId of instancesToTerminate) {
                await this.terminateInstance(instanceId);
                this.instances.delete(instanceId);
            }

            this.currentReplicas = targetReplicas;
            this.lastScaleDown = Date.now();

            this.recordScalingEvent({
                timestamp: new Date(),
                action: 'scale-down',
                reason,
                fromReplicas: originalReplicas,
                toReplicas: targetReplicas,
                trigger: {
                    metric: 'aggregate',
                    currentValue: 0,
                    targetValue: 0,
                    threshold: 0
                },
                duration: Date.now() - startTime,
                success: true
            });

        } catch (error) {
            console.error('Scale down failed:', error);
            this.recordScalingEvent({
                timestamp: new Date(),
                action: 'scale-down',
                reason: `${reason} - FAILED: ${error}`,
                fromReplicas: originalReplicas,
                toReplicas: originalReplicas,
                trigger: {
                    metric: 'aggregate',
                    currentValue: 0,
                    targetValue: 0,
                    threshold: 0
                },
                duration: Date.now() - startTime,
                success: false
            });
        }
    }

    private async scaleToTarget(targetReplicas: number, reason: string): Promise<void> {
        if (targetReplicas > this.currentReplicas) {
            await this.scaleUp(targetReplicas, reason);
        } else if (targetReplicas < this.currentReplicas) {
            await this.scaleDown(targetReplicas, reason);
        }
    }

    private async createInstance(): Promise<ServiceInstance> {
        const instanceId = this.generateInstanceId();
        const port = 3000 + Math.floor(Math.random() * 1000);
        const zone = this.selectAvailabilityZone();

        const instance: ServiceInstance = {
            id: instanceId,
            address: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            port,
            status: 'starting',
            metrics: {
                cpuUtilization: 0,
                memoryUtilization: 0,
                requestsPerSecond: 0,
                responseTime: 0,
                errorRate: 0,
                activeConnections: 0,
                queueLength: 0
            },
            createdAt: new Date(),
            lastHealthCheck: new Date(),
            version: '1.0.0',
            zone,
            weight: 1
        };

        // Simulate instance startup time
        setTimeout(() => {
            if (this.instances.has(instanceId)) {
                instance.status = 'healthy';
                this.updateInstanceMetrics(instanceId);
            }
        }, 30000); // 30 second startup time

        return instance;
    }

    private async terminateInstance(instanceId: string): Promise<void> {
        const instance = this.instances.get(instanceId);
        if (!instance) return;

        instance.status = 'terminating';

        // Simulate termination time
        setTimeout(() => {
            console.log(`Instance ${instanceId} terminated`);
        }, 5000);
    }

    private selectInstancesForTermination(count: number): string[] {
        const healthyInstances = Array.from(this.instances.values())
            .filter(i => i.status === 'healthy')
            .sort((a, b) => {
                // Prefer terminating newer instances with lower utilization
                const scoreA = a.createdAt.getTime() + (a.metrics.cpuUtilization * 1000);
                const scoreB = b.createdAt.getTime() + (b.metrics.cpuUtilization * 1000);
                return scoreB - scoreA;
            });

        return healthyInstances.slice(0, count).map(i => i.id);
    }

    private async drainInstances(instanceIds: string[]): Promise<void> {
        console.log(`Draining ${instanceIds.length} instances`);

        for (const instanceId of instanceIds) {
            const instance = this.instances.get(instanceId);
            if (instance) {
                instance.status = 'draining';
            }
        }

        // Wait for connection draining timeout
        await new Promise(resolve =>
            setTimeout(resolve, this.lbConfig.connectionDraining.timeout * 1000)
        );
    }

    private selectAvailabilityZone(): string {
        const zones = ['us-east-1a', 'us-east-1b', 'us-east-1c'];
        return zones[Math.floor(Math.random() * zones.length)];
    }

    private async waitForInstancesHealthy(instanceIds: string[], timeoutMs = 120000): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const allHealthy = instanceIds.every(id => {
                const instance = this.instances.get(id);
                return instance?.status === 'healthy';
            });

            if (allHealthy) return;

            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        throw new Error('Timeout waiting for instances to become healthy');
    }

    private async performHealthChecks(): Promise<void> {
        for (const instance of this.instances.values()) {
            if (instance.status === 'terminating') continue;

            try {
                const healthy = await this.checkInstanceHealth(instance);
                const previousStatus = instance.status;

                if (healthy && instance.status !== 'healthy') {
                    instance.status = 'healthy';
                    console.log(`Instance ${instance.id} became healthy`);
                } else if (!healthy && instance.status === 'healthy') {
                    instance.status = 'unhealthy';
                    console.log(`Instance ${instance.id} became unhealthy`);
                }

                instance.lastHealthCheck = new Date();

                // Update metrics for healthy instances
                if (instance.status === 'healthy') {
                    this.updateInstanceMetrics(instance.id);
                }

            } catch (error) {
                console.error(`Health check failed for instance ${instance.id}:`, error);
                instance.status = 'unhealthy';
            }
        }
    }

    private async checkInstanceHealth(instance: ServiceInstance): Promise<boolean> {
        // Simulate health check
        try {
            const url = `http://${instance.address}:${instance.port}${this.lbConfig.healthCheck.path}`;

            // Simulate HTTP request with timeout
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), this.lbConfig.healthCheck.timeout * 1000);

                // Simulate random health check results
                setTimeout(() => {
                    clearTimeout(timeout);
                    if (Math.random() > 0.1) { // 90% success rate
                        resolve(true);
                    } else {
                        reject(new Error('Health check failed'));
                    }
                }, 100);
            });

            return true;
        } catch {
            return false;
        }
    }

    private updateInstanceMetrics(instanceId: string): void {
        const instance = this.instances.get(instanceId);
        if (!instance) return;

        // Simulate realistic metrics
        instance.metrics = {
            cpuUtilization: Math.random() * 100,
            memoryUtilization: Math.random() * 90,
            requestsPerSecond: Math.random() * 100,
            responseTime: 50 + Math.random() * 200,
            errorRate: Math.random() * 5,
            activeConnections: Math.floor(Math.random() * 50),
            queueLength: Math.floor(Math.random() * 10)
        };
    }

    private async evaluatePredictiveScaling(): Promise<void> {
        const prediction = this.generateTrafficPrediction();

        if (prediction.confidence >= this.config.predictiveScaling.confidenceThreshold) {
            const currentRPS = this.getAggregatedMetrics().requestsPerSecond;
            const predictedIncrease = (prediction.predictedRPS - currentRPS) / currentRPS;

            if (predictedIncrease > 0.5) { // 50% increase predicted
                const suggestedReplicas = Math.min(
                    Math.ceil(this.currentReplicas * (1 + predictedIncrease)),
                    this.config.maxReplicas
                );

                if (suggestedReplicas > this.currentReplicas) {
                    await this.scaleToTarget(suggestedReplicas,
                        `Predictive scaling: ${prediction.predictedRPS} RPS predicted (confidence: ${prediction.confidence})`
                    );
                }
            }
        }
    }

    private generateTrafficPrediction(): TrafficPrediction {
        const currentMetrics = this.getAggregatedMetrics();
        const historicalData = this.metricsHistory.slice(-20);

        let predictedRPS = currentMetrics.requestsPerSecond;
        let confidence = 0.5;

        if (historicalData.length >= 5) {
            const trend = this.calculateTrend(historicalData.map(h => h.metrics.requestsPerSecond));
            predictedRPS = currentMetrics.requestsPerSecond + (trend * 5); // Predict 5 periods ahead
            confidence = Math.min(0.9, 0.5 + (historicalData.length / 40));
        }

        return {
            timestamp: new Date(),
            predictedRPS,
            confidence,
            recommendations: {
                suggestedReplicas: Math.ceil(predictedRPS / this.config.targetRequestsPerSecond),
                scaleAction: predictedRPS > currentMetrics.requestsPerSecond * 1.2 ? 'up' :
                            predictedRPS < currentMetrics.requestsPerSecond * 0.8 ? 'down' : 'maintain',
                reason: `Traffic prediction: ${predictedRPS.toFixed(2)} RPS (confidence: ${confidence.toFixed(2)})`
            }
        };
    }

    private recordScalingEvent(event: ScalingEvent): void {
        this.scalingHistory.push(event);

        // Keep only last 100 events
        if (this.scalingHistory.length > 100) {
            this.scalingHistory = this.scalingHistory.slice(-100);
        }

        // Store metrics snapshot
        const metrics = this.getAggregatedMetrics();
        this.metricsHistory.push({
            timestamp: new Date(),
            metrics
        });

        // Keep only last 50 metrics snapshots
        if (this.metricsHistory.length > 50) {
            this.metricsHistory = this.metricsHistory.slice(-50);
        }
    }

    private generateInstanceId(): string {
        return `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Public methods
    getCurrentReplicas(): number {
        return this.currentReplicas;
    }

    getHealthyInstances(): ServiceInstance[] {
        return Array.from(this.instances.values())
            .filter(instance => instance.status === 'healthy');
    }

    getAllInstances(): ServiceInstance[] {
        return Array.from(this.instances.values());
    }

    getScalingHistory(limit = 20): ScalingEvent[] {
        return this.scalingHistory
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }

    getScalingMetrics(): {
        currentReplicas: number;
        minReplicas: number;
        maxReplicas: number;
        healthyInstances: number;
        unhealthyInstances: number;
        averageMetrics: InstanceMetrics;
        lastScaleUp: Date | null;
        lastScaleDown: Date | null;
        scalingEvents24h: number;
    } {
        const healthyCount = this.getHealthyInstances().length;
        const unhealthyCount = this.currentReplicas - healthyCount;
        const averageMetrics = this.getAggregatedMetrics();

        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentEvents = this.scalingHistory.filter(e => e.timestamp > last24h);

        return {
            currentReplicas: this.currentReplicas,
            minReplicas: this.config.minReplicas,
            maxReplicas: this.config.maxReplicas,
            healthyInstances: healthyCount,
            unhealthyInstances: unhealthyCount,
            averageMetrics,
            lastScaleUp: this.lastScaleUp > 0 ? new Date(this.lastScaleUp) : null,
            lastScaleDown: this.lastScaleDown > 0 ? new Date(this.lastScaleDown) : null,
            scalingEvents24h: recentEvents.length
        };
    }

    async manualScale(targetReplicas: number, reason = 'Manual scaling'): Promise<void> {
        if (targetReplicas < this.config.minReplicas || targetReplicas > this.config.maxReplicas) {
            throw new Error(`Target replicas must be between ${this.config.minReplicas} and ${this.config.maxReplicas}`);
        }

        await this.scaleToTarget(targetReplicas, reason);
    }

    updateScalingConfig(newConfig: Partial<ScalingConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('Scaling configuration updated');
    }

    destroy(): void {
        if (this.scalingTimer) {
            clearInterval(this.scalingTimer);
            this.scalingTimer = null;
        }

        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }

        console.log('Horizontal scaling destroyed');
    }
}