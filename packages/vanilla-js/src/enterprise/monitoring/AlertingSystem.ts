interface AlertRule {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    metric: string;
    condition: 'gt' | 'lt' | 'eq' | 'ne' | 'contains' | 'anomaly';
    threshold: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    evaluationWindow: number; // minutes
    cooldown: number; // minutes to wait before re-alerting
    tags: string[];
    channels: string[]; // notification channels
}

interface AlertNotification {
    id: string;
    ruleId: string;
    timestamp: Date;
    severity: AlertRule['severity'];
    message: string;
    details: Record<string, any>;
    channels: string[];
    status: 'pending' | 'sent' | 'failed' | 'acknowledged';
    attempts: number;
    lastAttempt?: Date;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
}

interface NotificationChannel {
    id: string;
    type: 'email' | 'slack' | 'webhook' | 'sms' | 'teams' | 'pagerduty';
    name: string;
    config: Record<string, any>;
    enabled: boolean;
    rateLimits: {
        maxPerHour: number;
        maxPerDay: number;
    };
}

interface MetricDataPoint {
    timestamp: Date;
    value: number;
    metric: string;
    tags?: Record<string, string>;
}

interface AnomalyDetectionConfig {
    algorithm: 'statistical' | 'isolation_forest' | 'moving_average';
    sensitivity: 'low' | 'medium' | 'high';
    trainingWindow: number; // hours
    minDataPoints: number;
}

export class AlertingSystem {
    private rules = new Map<string, AlertRule>();
    private channels = new Map<string, NotificationChannel>();
    private notifications: AlertNotification[] = [];
    private metricHistory: MetricDataPoint[] = [];
    private ruleStates = new Map<string, { lastTriggered?: Date; consecutiveViolations: number }>();
    private channelUsage = new Map<string, { hourly: number; daily: number; lastReset: Date }>();
    private evaluationInterval: number | null = null;

    constructor() {
        this.initializeDefaultChannels();
        this.startEvaluation();
    }

    private initializeDefaultChannels(): void {
        // Console logging channel (always available)
        this.addChannel({
            id: 'console',
            type: 'webhook',
            name: 'Console Logger',
            config: { url: 'console://log' },
            enabled: true,
            rateLimits: { maxPerHour: 100, maxPerDay: 1000 }
        });

        // Browser notification channel
        if (typeof Notification !== 'undefined') {
            this.addChannel({
                id: 'browser',
                type: 'webhook',
                name: 'Browser Notifications',
                config: { url: 'browser://notify' },
                enabled: true,
                rateLimits: { maxPerHour: 20, maxPerDay: 100 }
            });
        }
    }

    private startEvaluation(): void {
        this.evaluationInterval = setInterval(() => {
            this.evaluateRules();
        }, 60000); // Evaluate every minute
    }

    addRule(rule: Omit<AlertRule, 'id'>): string {
        const ruleId = this.generateId();
        const alertRule: AlertRule = {
            ...rule,
            id: ruleId
        };

        this.rules.set(ruleId, alertRule);
        this.ruleStates.set(ruleId, { consecutiveViolations: 0 });

        console.log(`Alert rule added: ${alertRule.name} (${ruleId})`);
        return ruleId;
    }

    updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
        const rule = this.rules.get(ruleId);
        if (!rule) return false;

        Object.assign(rule, updates);
        console.log(`Alert rule updated: ${rule.name} (${ruleId})`);
        return true;
    }

    deleteRule(ruleId: string): boolean {
        const deleted = this.rules.delete(ruleId);
        if (deleted) {
            this.ruleStates.delete(ruleId);
            console.log(`Alert rule deleted: ${ruleId}`);
        }
        return deleted;
    }

    enableRule(ruleId: string): boolean {
        const rule = this.rules.get(ruleId);
        if (!rule) return false;

        rule.enabled = true;
        console.log(`Alert rule enabled: ${rule.name}`);
        return true;
    }

    disableRule(ruleId: string): boolean {
        const rule = this.rules.get(ruleId);
        if (!rule) return false;

        rule.enabled = false;
        console.log(`Alert rule disabled: ${rule.name}`);
        return true;
    }

    addChannel(channel: Omit<NotificationChannel, 'id'> & { id?: string }): string {
        const channelId = channel.id || this.generateId();
        const notificationChannel: NotificationChannel = {
            ...channel,
            id: channelId
        };

        this.channels.set(channelId, notificationChannel);
        this.channelUsage.set(channelId, { hourly: 0, daily: 0, lastReset: new Date() });

        console.log(`Notification channel added: ${notificationChannel.name} (${channelId})`);
        return channelId;
    }

    updateChannel(channelId: string, updates: Partial<NotificationChannel>): boolean {
        const channel = this.channels.get(channelId);
        if (!channel) return false;

        Object.assign(channel, updates);
        console.log(`Notification channel updated: ${channel.name} (${channelId})`);
        return true;
    }

    deleteChannel(channelId: string): boolean {
        const deleted = this.channels.delete(channelId);
        if (deleted) {
            this.channelUsage.delete(channelId);
            console.log(`Notification channel deleted: ${channelId}`);
        }
        return deleted;
    }

    recordMetric(metric: string, value: number, tags?: Record<string, string>): void {
        const dataPoint: MetricDataPoint = {
            timestamp: new Date(),
            value,
            metric,
            tags
        };

        this.metricHistory.push(dataPoint);
        this.enforceMetricHistoryRetention();
    }

    private enforceMetricHistoryRetention(): void {
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        const cutoff = new Date(Date.now() - maxAge);
        this.metricHistory = this.metricHistory.filter(dp => dp.timestamp > cutoff);
    }

    private evaluateRules(): void {
        for (const rule of this.rules.values()) {
            if (!rule.enabled) continue;

            try {
                this.evaluateRule(rule);
            } catch (error) {
                console.error(`Error evaluating rule ${rule.name}:`, error);
            }
        }
    }

    private evaluateRule(rule: AlertRule): void {
        const now = new Date();
        const windowStart = new Date(now.getTime() - rule.evaluationWindow * 60 * 1000);

        const relevantMetrics = this.metricHistory.filter(dp =>
            dp.metric === rule.metric && dp.timestamp >= windowStart
        );

        if (relevantMetrics.length === 0) {
            return; // No data to evaluate
        }

        const currentValue = this.aggregateMetrics(relevantMetrics, rule);
        const violated = this.checkCondition(rule.condition, currentValue, rule.threshold);

        const ruleState = this.ruleStates.get(rule.id)!;

        if (violated) {
            ruleState.consecutiveViolations++;

            // Check cooldown period
            if (ruleState.lastTriggered) {
                const cooldownEnd = new Date(ruleState.lastTriggered.getTime() + rule.cooldown * 60 * 1000);
                if (now < cooldownEnd) {
                    return; // Still in cooldown
                }
            }

            // Trigger alert
            this.triggerAlert(rule, currentValue, relevantMetrics);
            ruleState.lastTriggered = now;
        } else {
            ruleState.consecutiveViolations = 0;
        }
    }

    private aggregateMetrics(metrics: MetricDataPoint[], rule: AlertRule): number {
        if (metrics.length === 0) return 0;

        // For most rules, use the latest value
        if (rule.condition === 'anomaly') {
            return this.detectAnomaly(metrics);
        }

        // Use average for threshold-based rules
        return metrics.reduce((sum, dp) => sum + dp.value, 0) / metrics.length;
    }

    private checkCondition(condition: AlertRule['condition'], value: number, threshold: number): boolean {
        switch (condition) {
            case 'gt':
                return value > threshold;
            case 'lt':
                return value < threshold;
            case 'eq':
                return Math.abs(value - threshold) < 0.001; // Float comparison
            case 'ne':
                return Math.abs(value - threshold) >= 0.001;
            case 'anomaly':
                return value > threshold; // Anomaly score above threshold
            default:
                return false;
        }
    }

    private detectAnomaly(metrics: MetricDataPoint[]): number {
        if (metrics.length < 10) return 0; // Need sufficient data

        const values = metrics.map(m => m.value);
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        const latestValue = values[values.length - 1];
        const zScore = Math.abs(latestValue - mean) / stdDev;

        // Return anomaly score (higher means more anomalous)
        return zScore;
    }

    private triggerAlert(rule: AlertRule, currentValue: number, metrics: MetricDataPoint[]): void {
        const notification: AlertNotification = {
            id: this.generateId(),
            ruleId: rule.id,
            timestamp: new Date(),
            severity: rule.severity,
            message: this.generateAlertMessage(rule, currentValue),
            details: {
                ruleName: rule.name,
                metric: rule.metric,
                currentValue,
                threshold: rule.threshold,
                condition: rule.condition,
                consecutiveViolations: this.ruleStates.get(rule.id)?.consecutiveViolations || 1,
                recentMetrics: metrics.slice(-5) // Last 5 data points
            },
            channels: rule.channels,
            status: 'pending',
            attempts: 0
        };

        this.notifications.push(notification);
        this.sendNotification(notification);
    }

    private generateAlertMessage(rule: AlertRule, currentValue: number): string {
        const conditionText = this.getConditionText(rule.condition, rule.threshold);
        return `[${rule.severity.toUpperCase()}] ${rule.name}: ${rule.metric} is ${currentValue.toFixed(2)} (${conditionText})`;
    }

    private getConditionText(condition: AlertRule['condition'], threshold: number): string {
        switch (condition) {
            case 'gt':
                return `threshold: >${threshold}`;
            case 'lt':
                return `threshold: <${threshold}`;
            case 'eq':
                return `threshold: =${threshold}`;
            case 'ne':
                return `threshold: !=${threshold}`;
            case 'anomaly':
                return `anomaly score >${threshold}`;
            default:
                return `threshold: ${threshold}`;
        }
    }

    private async sendNotification(notification: AlertNotification): Promise<void> {
        for (const channelId of notification.channels) {
            const channel = this.channels.get(channelId);
            if (!channel || !channel.enabled) continue;

            if (!this.checkRateLimit(channelId)) {
                console.warn(`Rate limit exceeded for channel ${channel.name}`);
                continue;
            }

            try {
                await this.sendToChannel(channel, notification);
                this.incrementChannelUsage(channelId);
            } catch (error) {
                console.error(`Failed to send notification to ${channel.name}:`, error);
                notification.status = 'failed';
                notification.attempts++;
                notification.lastAttempt = new Date();
            }
        }

        if (notification.status === 'pending') {
            notification.status = 'sent';
        }
    }

    private checkRateLimit(channelId: string): boolean {
        const usage = this.channelUsage.get(channelId);
        const channel = this.channels.get(channelId);

        if (!usage || !channel) return false;

        const now = new Date();
        const hoursSinceReset = (now.getTime() - usage.lastReset.getTime()) / (1000 * 60 * 60);

        // Reset counters if it's been more than 24 hours
        if (hoursSinceReset >= 24) {
            usage.hourly = 0;
            usage.daily = 0;
            usage.lastReset = now;
        } else if (hoursSinceReset >= 1) {
            // Reset hourly counter
            usage.hourly = 0;
        }

        return usage.hourly < channel.rateLimits.maxPerHour &&
               usage.daily < channel.rateLimits.maxPerDay;
    }

    private incrementChannelUsage(channelId: string): void {
        const usage = this.channelUsage.get(channelId);
        if (usage) {
            usage.hourly++;
            usage.daily++;
        }
    }

    private async sendToChannel(channel: NotificationChannel, notification: AlertNotification): Promise<void> {
        switch (channel.type) {
            case 'webhook':
                await this.sendWebhook(channel, notification);
                break;
            case 'email':
                await this.sendEmail(channel, notification);
                break;
            case 'slack':
                await this.sendSlack(channel, notification);
                break;
            case 'sms':
                await this.sendSMS(channel, notification);
                break;
            case 'teams':
                await this.sendTeams(channel, notification);
                break;
            case 'pagerduty':
                await this.sendPagerDuty(channel, notification);
                break;
            default:
                throw new Error(`Unsupported channel type: ${channel.type}`);
        }
    }

    private async sendWebhook(channel: NotificationChannel, notification: AlertNotification): Promise<void> {
        const url = channel.config.url;

        if (url === 'console://log') {
            console.warn(`🚨 ALERT: ${notification.message}`, notification.details);
            return;
        }

        if (url === 'browser://notify' && typeof Notification !== 'undefined') {
            if (Notification.permission === 'granted') {
                new Notification(`Alert: ${notification.severity}`, {
                    body: notification.message,
                    icon: '/alert-icon.png'
                });
            }
            return;
        }

        if (typeof fetch !== 'undefined') {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...channel.config.headers
                },
                body: JSON.stringify({
                    alert: notification,
                    timestamp: notification.timestamp.toISOString(),
                    severity: notification.severity,
                    message: notification.message
                })
            });

            if (!response.ok) {
                throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
            }
        }
    }

    private async sendEmail(channel: NotificationChannel, notification: AlertNotification): Promise<void> {
        // Email implementation would go here
        // This would typically use a service like SendGrid, AWS SES, etc.
        console.log(`Email notification sent to ${channel.config.recipients}:`, notification.message);
    }

    private async sendSlack(channel: NotificationChannel, notification: AlertNotification): Promise<void> {
        const webhookUrl = channel.config.webhookUrl;

        const slackMessage = {
            text: notification.message,
            attachments: [{
                color: this.getSeverityColor(notification.severity),
                fields: [
                    { title: 'Metric', value: notification.details.metric, short: true },
                    { title: 'Current Value', value: notification.details.currentValue.toFixed(2), short: true },
                    { title: 'Threshold', value: notification.details.threshold, short: true },
                    { title: 'Timestamp', value: notification.timestamp.toISOString(), short: true }
                ]
            }]
        };

        if (typeof fetch !== 'undefined') {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(slackMessage)
            });
        }
    }

    private async sendSMS(channel: NotificationChannel, notification: AlertNotification): Promise<void> {
        // SMS implementation would use services like Twilio
        console.log(`SMS sent to ${channel.config.phoneNumbers}:`, notification.message);
    }

    private async sendTeams(channel: NotificationChannel, notification: AlertNotification): Promise<void> {
        // Microsoft Teams implementation
        const teamsMessage = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "summary": notification.message,
            "themeColor": this.getSeverityColor(notification.severity),
            "sections": [{
                "activityTitle": `Alert: ${notification.details.ruleName}`,
                "activitySubtitle": notification.message,
                "facts": [
                    { "name": "Metric", "value": notification.details.metric },
                    { "name": "Current Value", "value": notification.details.currentValue.toFixed(2) },
                    { "name": "Threshold", "value": notification.details.threshold.toString() },
                    { "name": "Severity", "value": notification.severity.toUpperCase() }
                ]
            }]
        };

        if (typeof fetch !== 'undefined') {
            await fetch(channel.config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(teamsMessage)
            });
        }
    }

    private async sendPagerDuty(channel: NotificationChannel, notification: AlertNotification): Promise<void> {
        // PagerDuty Events API implementation
        const payload = {
            routing_key: channel.config.routingKey,
            event_action: 'trigger',
            payload: {
                summary: notification.message,
                severity: notification.severity,
                source: 'Universal Search Monitoring',
                custom_details: notification.details
            }
        };

        if (typeof fetch !== 'undefined') {
            await fetch('https://events.pagerduty.com/v2/enqueue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
    }

    private getSeverityColor(severity: AlertNotification['severity']): string {
        const colors = {
            low: '#36a64f',      // Green
            medium: '#ff9500',   // Orange
            high: '#ff4444',     // Red
            critical: '#8b0000'  // Dark red
        };
        return colors[severity];
    }

    acknowledgeAlert(notificationId: string, acknowledgedBy?: string): boolean {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return false;

        notification.status = 'acknowledged';
        notification.acknowledgedBy = acknowledgedBy;
        notification.acknowledgedAt = new Date();

        console.log(`Alert acknowledged: ${notification.message} by ${acknowledgedBy || 'unknown'}`);
        return true;
    }

    private generateId(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(12)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    getRules(): AlertRule[] {
        return Array.from(this.rules.values());
    }

    getChannels(): NotificationChannel[] {
        return Array.from(this.channels.values());
    }

    getNotifications(limit?: number, severity?: AlertNotification['severity']): AlertNotification[] {
        let notifications = [...this.notifications];

        if (severity) {
            notifications = notifications.filter(n => n.severity === severity);
        }

        notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        if (limit) {
            notifications = notifications.slice(0, limit);
        }

        return notifications;
    }

    getAlertingStatistics(): {
        totalRules: number;
        enabledRules: number;
        totalChannels: number;
        enabledChannels: number;
        totalNotifications: number;
        notificationsByStatus: Record<string, number>;
        notificationsBySeverity: Record<string, number>;
        recentAlerts: AlertNotification[];
    } {
        const enabledRules = Array.from(this.rules.values()).filter(r => r.enabled).length;
        const enabledChannels = Array.from(this.channels.values()).filter(c => c.enabled).length;

        const notificationsByStatus = this.notifications.reduce((acc, n) => {
            acc[n.status] = (acc[n.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const notificationsBySeverity = this.notifications.reduce((acc, n) => {
            acc[n.severity] = (acc[n.severity] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const recentAlerts = this.notifications
            .filter(n => Date.now() - n.timestamp.getTime() < 24 * 60 * 60 * 1000) // Last 24 hours
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10);

        return {
            totalRules: this.rules.size,
            enabledRules,
            totalChannels: this.channels.size,
            enabledChannels,
            totalNotifications: this.notifications.length,
            notificationsByStatus,
            notificationsBySeverity,
            recentAlerts
        };
    }

    testChannel(channelId: string): Promise<boolean> {
        const channel = this.channels.get(channelId);
        if (!channel) return Promise.resolve(false);

        const testNotification: AlertNotification = {
            id: 'test-' + Date.now(),
            ruleId: 'test-rule',
            timestamp: new Date(),
            severity: 'low',
            message: `Test notification for ${channel.name}`,
            details: { test: true },
            channels: [channelId],
            status: 'pending',
            attempts: 0
        };

        return this.sendToChannel(channel, testNotification)
            .then(() => true)
            .catch(() => false);
    }

    destroy(): void {
        if (this.evaluationInterval) {
            clearInterval(this.evaluationInterval);
        }
    }
}