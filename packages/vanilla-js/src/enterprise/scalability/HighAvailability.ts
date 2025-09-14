interface HAConfig {
    regions: RegionConfig[];
    failover: {
        enabled: boolean;
        automaticFailover: boolean;
        failoverThreshold: number; // seconds
        healthCheckInterval: number; // seconds
        recoveryThreshold: number; // consecutive successful checks
    };
    replication: {
        enabled: boolean;
        mode: 'synchronous' | 'asynchronous' | 'semi-synchronous';
        replicas: number;
        consistency: 'strong' | 'eventual' | 'session';
        conflictResolution: 'timestamp' | 'version' | 'manual';
    };
    loadBalancing: {
        crossRegion: boolean;
        algorithm: 'proximity' | 'round-robin' | 'weighted' | 'performance';
        stickiness: boolean;
        healthyThreshold: number; // percentage
    };
    disaster: {
        rpoTarget: number; // Recovery Point Objective in seconds
        rtoTarget: number; // Recovery Time Objective in seconds
        backupIntervals: number; // seconds
        automaticRecovery: boolean;
    };
}

interface RegionConfig {
    id: string;
    name: string;
    primary: boolean;
    endpoints: string[];
    capacity: {
        maxInstances: number;
        currentInstances: number;
        reservedInstances: number;
    };
    status: 'healthy' | 'degraded' | 'failed' | 'maintenance';
    latency: Record<string, number>; // latency to other regions
    lastHealthCheck: Date;
    metadata: {
        provider: string;
        zone: string;
        datacenter: string;
    };
}

interface FailoverEvent {
    id: string;
    timestamp: Date;
    type: 'planned' | 'automatic' | 'manual';
    fromRegion: string;
    toRegion: string;
    reason: string;
    duration: number;
    affectedRequests: number;
    status: 'in-progress' | 'completed' | 'failed' | 'rolled-back';
    steps: FailoverStep[];
}

interface FailoverStep {
    name: string;
    startTime: Date;
    endTime?: Date;
    status: 'pending' | 'running' | 'completed' | 'failed';
    details: string;
    duration?: number;
}

interface ReplicationStatus {
    primary: string;
    replicas: ReplicaInfo[];
    lag: Record<string, number>; // replication lag in milliseconds
    consistency: 'in-sync' | 'lagging' | 'out-of-sync';
    lastSync: Date;
    conflicts: ConflictInfo[];
}

interface ReplicaInfo {
    region: string;
    status: 'active' | 'inactive' | 'syncing' | 'failed';
    lastSync: Date;
    lag: number;
    health: number; // 0-100
}

interface ConflictInfo {
    id: string;
    timestamp: Date;
    type: string;
    regions: string[];
    resolved: boolean;
    resolution: string;
}

interface DisasterRecoveryPlan {
    id: string;
    name: string;
    triggers: string[];
    steps: DRStep[];
    estimatedRTO: number;
    estimatedRPO: number;
    lastTested: Date;
    testResults: TestResult[];
}

interface DRStep {
    order: number;
    name: string;
    type: 'failover' | 'restore' | 'validate' | 'notify';
    automated: boolean;
    timeout: number;
    rollback: boolean;
    dependencies: string[];
}

interface TestResult {
    timestamp: Date;
    success: boolean;
    actualRTO: number;
    actualRPO: number;
    issues: string[];
    recommendations: string[];
}

export class HighAvailability {
    private config: HAConfig;
    private regions = new Map<string, RegionConfig>();
    private currentPrimary: string;
    private failoverHistory: FailoverEvent[] = [];
    private replicationStatus: ReplicationStatus;
    private drPlans: DisasterRecoveryPlan[] = [];
    private healthCheckTimer: number | null = null;
    private backupTimer: number | null = null;
    private activeFailover: FailoverEvent | null = null;

    constructor(config: HAConfig) {
        this.config = config;
        this.initializeHA();
    }

    private initializeHA(): void {
        // Initialize regions
        this.config.regions.forEach(region => {
            this.regions.set(region.id, region);
            if (region.primary) {
                this.currentPrimary = region.id;
            }
        });

        // Initialize replication status
        this.replicationStatus = {
            primary: this.currentPrimary,
            replicas: this.config.regions
                .filter(r => !r.primary)
                .map(r => ({
                    region: r.id,
                    status: 'active',
                    lastSync: new Date(),
                    lag: 0,
                    health: 100
                })),
            lag: {},
            consistency: 'in-sync',
            lastSync: new Date(),
            conflicts: []
        };

        this.setupHealthChecks();
        this.setupBackups();
        this.createDefaultDRPlans();

        console.log(`High Availability initialized with primary region: ${this.currentPrimary}`);
    }

    private setupHealthChecks(): void {
        this.healthCheckTimer = setInterval(() => {
            this.performHealthChecks();
        }, this.config.failover.healthCheckInterval * 1000);
    }

    private setupBackups(): void {
        this.backupTimer = setInterval(() => {
            this.performBackup();
        }, this.config.disaster.backupIntervals * 1000);
    }

    private async performHealthChecks(): Promise<void> {
        for (const [regionId, region] of this.regions) {
            try {
                const health = await this.checkRegionHealth(regionId);
                const previousStatus = region.status;

                region.status = health.healthy ? 'healthy' :
                                health.degraded ? 'degraded' : 'failed';
                region.lastHealthCheck = new Date();

                // Check for failover conditions
                if (regionId === this.currentPrimary && !health.healthy) {
                    console.warn(`Primary region ${regionId} is unhealthy`);

                    if (this.config.failover.automaticFailover) {
                        await this.initiateFailover(regionId, 'Primary region health failure');
                    }
                } else if (previousStatus !== region.status) {
                    console.log(`Region ${regionId} status changed: ${previousStatus} -> ${region.status}`);
                }

            } catch (error) {
                console.error(`Health check failed for region ${regionId}:`, error);
                if (this.regions.has(regionId)) {
                    this.regions.get(regionId)!.status = 'failed';
                }
            }
        }

        // Update replication status
        await this.updateReplicationStatus();
    }

    private async checkRegionHealth(regionId: string): Promise<{
        healthy: boolean;
        degraded: boolean;
        details: any;
    }> {
        const region = this.regions.get(regionId);
        if (!region) {
            throw new Error(`Region ${regionId} not found`);
        }

        let healthyEndpoints = 0;
        const endpointResults: any[] = [];

        for (const endpoint of region.endpoints) {
            try {
                const startTime = Date.now();

                // Simulate health check request
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
                    setTimeout(() => {
                        clearTimeout(timeout);
                        if (Math.random() > 0.05) { // 95% success rate
                            resolve(true);
                        } else {
                            reject(new Error('Health check failed'));
                        }
                    }, 100 + Math.random() * 200);
                });

                const responseTime = Date.now() - startTime;
                healthyEndpoints++;

                endpointResults.push({
                    endpoint,
                    healthy: true,
                    responseTime
                });

            } catch (error) {
                endpointResults.push({
                    endpoint,
                    healthy: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        const healthPercentage = (healthyEndpoints / region.endpoints.length) * 100;

        return {
            healthy: healthPercentage >= this.config.loadBalancing.healthyThreshold,
            degraded: healthPercentage >= 50 && healthPercentage < this.config.loadBalancing.healthyThreshold,
            details: {
                healthyEndpoints,
                totalEndpoints: region.endpoints.length,
                healthPercentage,
                endpointResults
            }
        };
    }

    private async updateReplicationStatus(): Promise<void> {
        if (!this.config.replication.enabled) return;

        const primaryRegion = this.regions.get(this.currentPrimary);
        if (!primaryRegion || primaryRegion.status !== 'healthy') {
            this.replicationStatus.consistency = 'out-of-sync';
            return;
        }

        // Update replica status and lag
        for (const replica of this.replicationStatus.replicas) {
            const region = this.regions.get(replica.region);
            if (!region) continue;

            if (region.status === 'healthy') {
                replica.status = 'active';
                replica.lag = Math.random() * 100; // Simulate replication lag
                replica.health = 100;
                replica.lastSync = new Date();
            } else {
                replica.status = 'failed';
                replica.health = 0;
            }

            this.replicationStatus.lag[replica.region] = replica.lag;
        }

        // Determine overall consistency
        const activeReplicas = this.replicationStatus.replicas.filter(r => r.status === 'active');
        const maxLag = Math.max(...activeReplicas.map(r => r.lag), 0);

        if (maxLag > 5000) { // 5 second threshold
            this.replicationStatus.consistency = 'lagging';
        } else if (activeReplicas.length < this.config.replication.replicas) {
            this.replicationStatus.consistency = 'out-of-sync';
        } else {
            this.replicationStatus.consistency = 'in-sync';
        }

        this.replicationStatus.lastSync = new Date();
    }

    async initiateFailover(fromRegion: string, reason: string, manual = false): Promise<FailoverEvent> {
        if (this.activeFailover) {
            throw new Error('Failover already in progress');
        }

        // Select target region
        const targetRegion = this.selectFailoverTarget(fromRegion);
        if (!targetRegion) {
            throw new Error('No healthy region available for failover');
        }

        const failoverEvent: FailoverEvent = {
            id: this.generateEventId(),
            timestamp: new Date(),
            type: manual ? 'manual' : 'automatic',
            fromRegion,
            toRegion: targetRegion,
            reason,
            duration: 0,
            affectedRequests: 0,
            status: 'in-progress',
            steps: []
        };

        this.activeFailover = failoverEvent;
        this.failoverHistory.push(failoverEvent);

        console.log(`Initiating failover from ${fromRegion} to ${targetRegion}: ${reason}`);

        try {
            await this.executeFailover(failoverEvent);
            failoverEvent.status = 'completed';
            failoverEvent.duration = Date.now() - failoverEvent.timestamp.getTime();

            console.log(`Failover completed successfully in ${failoverEvent.duration}ms`);

        } catch (error) {
            console.error('Failover failed:', error);
            failoverEvent.status = 'failed';

            // Attempt rollback if possible
            await this.rollbackFailover(failoverEvent);
        } finally {
            this.activeFailover = null;
        }

        return failoverEvent;
    }

    private selectFailoverTarget(excludeRegion: string): string | null {
        const candidates = Array.from(this.regions.values())
            .filter(region =>
                region.id !== excludeRegion &&
                region.status === 'healthy' &&
                region.capacity.currentInstances < region.capacity.maxInstances
            )
            .sort((a, b) => {
                // Prefer regions with higher capacity and lower latency
                const scoreA = a.capacity.maxInstances - a.capacity.currentInstances;
                const scoreB = b.capacity.maxInstances - b.capacity.currentInstances;
                return scoreB - scoreA;
            });

        return candidates.length > 0 ? candidates[0].id : null;
    }

    private async executeFailover(failoverEvent: FailoverEvent): Promise<void> {
        const steps: FailoverStep[] = [
            { name: 'Validate Target Region', startTime: new Date(), status: 'running', details: 'Checking target region health' },
            { name: 'Stop Traffic to Source', startTime: new Date(), status: 'pending', details: 'Redirecting traffic away from failed region' },
            { name: 'Sync Data', startTime: new Date(), status: 'pending', details: 'Ensuring data consistency' },
            { name: 'Start Services in Target', startTime: new Date(), status: 'pending', details: 'Starting services in target region' },
            { name: 'Route Traffic to Target', startTime: new Date(), status: 'pending', details: 'Redirecting traffic to target region' },
            { name: 'Validate Failover', startTime: new Date(), status: 'pending', details: 'Verifying failover success' }
        ];

        failoverEvent.steps = steps;

        for (const step of steps) {
            step.status = 'running';
            step.startTime = new Date();

            try {
                await this.executeFailoverStep(step, failoverEvent);
                step.status = 'completed';
                step.endTime = new Date();
                step.duration = step.endTime.getTime() - step.startTime.getTime();

            } catch (error) {
                step.status = 'failed';
                step.endTime = new Date();
                step.details += ` - Error: ${error}`;
                throw error;
            }
        }

        // Update primary region
        this.currentPrimary = failoverEvent.toRegion;
        this.replicationStatus.primary = this.currentPrimary;
    }

    private async executeFailoverStep(step: FailoverStep, failoverEvent: FailoverEvent): Promise<void> {
        // Simulate step execution time
        const executionTime = 1000 + Math.random() * 3000; // 1-4 seconds

        await new Promise(resolve => setTimeout(resolve, executionTime));

        switch (step.name) {
            case 'Validate Target Region':
                const targetRegion = this.regions.get(failoverEvent.toRegion);
                if (!targetRegion || targetRegion.status !== 'healthy') {
                    throw new Error(`Target region ${failoverEvent.toRegion} is not healthy`);
                }
                break;

            case 'Stop Traffic to Source':
                // Update source region to maintenance mode
                const sourceRegion = this.regions.get(failoverEvent.fromRegion);
                if (sourceRegion) {
                    sourceRegion.status = 'maintenance';
                }
                break;

            case 'Sync Data':
                if (this.config.replication.enabled) {
                    // Ensure data sync based on consistency model
                    await this.syncDataForFailover(failoverEvent.fromRegion, failoverEvent.toRegion);
                }
                break;

            case 'Start Services in Target':
                // Scale up target region capacity
                const target = this.regions.get(failoverEvent.toRegion);
                if (target) {
                    target.capacity.currentInstances = Math.min(
                        target.capacity.currentInstances + 5,
                        target.capacity.maxInstances
                    );
                }
                break;

            case 'Route Traffic to Target':
                // Update load balancer configuration
                console.log(`Traffic routed from ${failoverEvent.fromRegion} to ${failoverEvent.toRegion}`);
                break;

            case 'Validate Failover':
                // Perform health check on new primary
                const health = await this.checkRegionHealth(failoverEvent.toRegion);
                if (!health.healthy) {
                    throw new Error('Target region failed validation after failover');
                }
                break;
        }
    }

    private async syncDataForFailover(fromRegion: string, toRegion: string): Promise<void> {
        if (this.config.replication.mode === 'synchronous') {
            // In synchronous mode, data should already be in sync
            return;
        }

        // For asynchronous replication, ensure final sync
        console.log(`Syncing data from ${fromRegion} to ${toRegion}`);

        // Simulate data sync time based on data size and network speed
        const syncTime = 2000 + Math.random() * 3000;
        await new Promise(resolve => setTimeout(resolve, syncTime));
    }

    private async rollbackFailover(failoverEvent: FailoverEvent): Promise<void> {
        console.log(`Rolling back failover ${failoverEvent.id}`);

        try {
            // Restore original primary if possible
            if (this.currentPrimary !== failoverEvent.fromRegion) {
                const originalPrimary = this.regions.get(failoverEvent.fromRegion);
                if (originalPrimary && originalPrimary.status === 'healthy') {
                    this.currentPrimary = failoverEvent.fromRegion;
                    this.replicationStatus.primary = this.currentPrimary;
                }
            }

            failoverEvent.status = 'rolled-back';

        } catch (error) {
            console.error('Rollback failed:', error);
        }
    }

    private async performBackup(): Promise<void> {
        if (!this.config.disaster.backupIntervals) return;

        console.log('Performing scheduled backup across all regions');

        const backupTasks = Array.from(this.regions.keys()).map(async (regionId) => {
            const region = this.regions.get(regionId);
            if (!region || region.status !== 'healthy') return;

            try {
                // Simulate backup operation
                const backupTime = 5000 + Math.random() * 10000; // 5-15 seconds
                await new Promise(resolve => setTimeout(resolve, backupTime));

                console.log(`Backup completed for region ${regionId}`);

            } catch (error) {
                console.error(`Backup failed for region ${regionId}:`, error);
            }
        });

        await Promise.allSettled(backupTasks);
    }

    private createDefaultDRPlans(): void {
        const primaryFailurePlan: DisasterRecoveryPlan = {
            id: 'primary-failure',
            name: 'Primary Region Failure',
            triggers: ['region_failure', 'connectivity_loss', 'data_corruption'],
            steps: [
                {
                    order: 1,
                    name: 'Assess Failure Scope',
                    type: 'validate',
                    automated: true,
                    timeout: 60,
                    rollback: false,
                    dependencies: []
                },
                {
                    order: 2,
                    name: 'Initiate Failover',
                    type: 'failover',
                    automated: this.config.failover.automaticFailover,
                    timeout: 300,
                    rollback: true,
                    dependencies: ['Assess Failure Scope']
                },
                {
                    order: 3,
                    name: 'Validate Recovery',
                    type: 'validate',
                    automated: true,
                    timeout: 120,
                    rollback: false,
                    dependencies: ['Initiate Failover']
                },
                {
                    order: 4,
                    name: 'Notify Stakeholders',
                    type: 'notify',
                    automated: false,
                    timeout: 60,
                    rollback: false,
                    dependencies: ['Validate Recovery']
                }
            ],
            estimatedRTO: this.config.disaster.rtoTarget,
            estimatedRPO: this.config.disaster.rpoTarget,
            lastTested: new Date(),
            testResults: []
        };

        this.drPlans.push(primaryFailurePlan);
    }

    async executeDRPlan(planId: string, trigger: string): Promise<TestResult> {
        const plan = this.drPlans.find(p => p.id === planId);
        if (!plan) {
            throw new Error(`DR plan ${planId} not found`);
        }

        console.log(`Executing DR plan: ${plan.name} (trigger: ${trigger})`);

        const startTime = Date.now();
        const issues: string[] = [];
        let success = true;

        try {
            for (const step of plan.steps.sort((a, b) => a.order - b.order)) {
                const stepStartTime = Date.now();

                try {
                    await this.executeDRStep(step);
                    console.log(`DR step completed: ${step.name}`);

                } catch (error) {
                    issues.push(`Step "${step.name}" failed: ${error}`);
                    if (!step.rollback) {
                        success = false;
                        break;
                    }
                }

                const stepDuration = Date.now() - stepStartTime;
                if (stepDuration > step.timeout * 1000) {
                    issues.push(`Step "${step.name}" exceeded timeout (${step.timeout}s)`);
                }
            }

        } catch (error) {
            success = false;
            issues.push(`DR plan execution failed: ${error}`);
        }

        const actualRTO = Date.now() - startTime;
        const actualRPO = this.calculateActualRPO();

        const result: TestResult = {
            timestamp: new Date(),
            success,
            actualRTO,
            actualRPO,
            issues,
            recommendations: this.generateDRRecommendations(actualRTO, actualRPO, issues)
        };

        plan.testResults.push(result);
        plan.lastTested = new Date();

        console.log(`DR plan execution ${success ? 'completed' : 'failed'} in ${actualRTO}ms`);
        return result;
    }

    private async executeDRStep(step: DRStep): Promise<void> {
        // Simulate DR step execution
        const executionTime = 1000 + Math.random() * 2000;
        await new Promise(resolve => setTimeout(resolve, executionTime));

        switch (step.type) {
            case 'validate':
                // Perform validation checks
                break;
            case 'failover':
                // Execute failover if not already in progress
                if (!this.activeFailover) {
                    await this.initiateFailover(this.currentPrimary, 'DR Plan Execution');
                }
                break;
            case 'restore':
                // Restore from backup
                break;
            case 'notify':
                // Send notifications
                console.log(`DR notification sent for step: ${step.name}`);
                break;
        }
    }

    private calculateActualRPO(): number {
        // Calculate data loss based on last successful backup/sync
        const lastSync = this.replicationStatus.lastSync;
        return Date.now() - lastSync.getTime();
    }

    private generateDRRecommendations(rto: number, rpo: number, issues: string[]): string[] {
        const recommendations: string[] = [];

        if (rto > this.config.disaster.rtoTarget * 1000) {
            recommendations.push(`RTO exceeded target by ${((rto / 1000) - this.config.disaster.rtoTarget).toFixed(2)}s`);
            recommendations.push('Consider increasing failover automation');
        }

        if (rpo > this.config.disaster.rpoTarget * 1000) {
            recommendations.push(`RPO exceeded target by ${((rpo / 1000) - this.config.disaster.rpoTarget).toFixed(2)}s`);
            recommendations.push('Consider more frequent backups or synchronous replication');
        }

        if (issues.length > 0) {
            recommendations.push('Address identified issues in next DR plan update');
        }

        return recommendations;
    }

    private generateEventId(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Public methods
    getRegionStatus(): Map<string, RegionConfig> {
        return new Map(this.regions);
    }

    getCurrentPrimary(): string {
        return this.currentPrimary;
    }

    getReplicationStatus(): ReplicationStatus {
        return { ...this.replicationStatus };
    }

    getFailoverHistory(limit = 20): FailoverEvent[] {
        return this.failoverHistory
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }

    getDRPlans(): DisasterRecoveryPlan[] {
        return [...this.drPlans];
    }

    async testFailover(targetRegion?: string): Promise<FailoverEvent> {
        const target = targetRegion || this.selectFailoverTarget(this.currentPrimary);
        if (!target) {
            throw new Error('No suitable target region for failover test');
        }

        return this.initiateFailover(this.currentPrimary, 'Failover test', true);
    }

    getHAMetrics(): {
        uptime: number;
        availability: number;
        mtbf: number; // Mean Time Between Failures
        mttr: number; // Mean Time To Recovery
        rto: number;
        rpo: number;
        failoverCount: number;
        lastFailover?: Date;
    } {
        const now = Date.now();
        const last30Days = now - (30 * 24 * 60 * 60 * 1000);

        const recentFailovers = this.failoverHistory.filter(f =>
            f.timestamp.getTime() > last30Days && f.status === 'completed'
        );

        const totalDowntime = recentFailovers.reduce((sum, f) => sum + f.duration, 0);
        const uptime = ((30 * 24 * 60 * 60 * 1000) - totalDowntime) / (30 * 24 * 60 * 60 * 1000) * 100;

        const mtbf = recentFailovers.length > 1
            ? (30 * 24 * 60 * 60 * 1000) / recentFailovers.length
            : 0;

        const mttr = recentFailovers.length > 0
            ? recentFailovers.reduce((sum, f) => sum + f.duration, 0) / recentFailovers.length
            : 0;

        const lastFailover = this.failoverHistory.length > 0
            ? this.failoverHistory[this.failoverHistory.length - 1].timestamp
            : undefined;

        return {
            uptime,
            availability: uptime,
            mtbf,
            mttr,
            rto: this.config.disaster.rtoTarget,
            rpo: this.config.disaster.rpoTarget,
            failoverCount: recentFailovers.length,
            lastFailover
        };
    }

    async manualFailover(targetRegion: string, reason = 'Manual failover'): Promise<FailoverEvent> {
        return this.initiateFailover(this.currentPrimary, reason, true);
    }

    updateHAConfig(newConfig: Partial<HAConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('HA configuration updated');
    }

    destroy(): void {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }

        if (this.backupTimer) {
            clearInterval(this.backupTimer);
            this.backupTimer = null;
        }

        console.log('High Availability destroyed');
    }
}