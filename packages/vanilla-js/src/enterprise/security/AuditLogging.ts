interface AuditEvent {
    id: string;
    timestamp: Date;
    userId?: string;
    sessionId?: string;
    eventType: string;
    category: 'security' | 'access' | 'data' | 'system' | 'user';
    severity: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    resource?: string;
    details: Record<string, any>;
    ip?: string;
    userAgent?: string;
    outcome: 'success' | 'failure' | 'warning';
    risk: number; // 0-100
    checksum: string;
}

interface AuditConfig {
    retention: {
        duration: string; // e.g., '7y', '5y', '1y'
        maxSize: string; // e.g., '1GB', '500MB'
    };
    storage: {
        local: boolean;
        remote: boolean;
        encrypted: boolean;
        immutable: boolean;
    };
    realtime: {
        enabled: boolean;
        criticalThreshold: number;
        alertEndpoints: string[];
    };
    compliance: {
        gdpr: boolean;
        ccpa: boolean;
        soc2: boolean;
        hipaa: boolean;
    };
}

interface AuditQuery {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    eventType?: string;
    category?: string;
    severity?: string;
    outcome?: string;
    minRisk?: number;
    maxRisk?: number;
    limit?: number;
    offset?: number;
}

export class AuditLogging {
    private config: AuditConfig;
    private events: AuditEvent[] = [];
    private eventBuffer: AuditEvent[] = [];
    private bufferFlushInterval: number;
    private sequenceNumber = 0;
    private lastChecksum = '';

    constructor(config: AuditConfig) {
        this.config = config;
        this.initializeAuditing();
    }

    private initializeAuditing(): void {
        this.setupBufferFlush();
        this.setupStorageCleanup();
        this.logSystemEvent('audit_system_initialized', {
            config: this.sanitizeConfig(this.config)
        });
    }

    async logEvent(
        eventType: string,
        category: AuditEvent['category'],
        severity: AuditEvent['severity'],
        action: string,
        details: Record<string, any>,
        userId?: string,
        sessionId?: string,
        resource?: string
    ): Promise<void> {
        const event = await this.createAuditEvent(
            eventType,
            category,
            severity,
            action,
            details,
            userId,
            sessionId,
            resource
        );

        this.eventBuffer.push(event);

        if (severity === 'critical' || this.config.realtime.enabled) {
            await this.flushBuffer();

            if (severity === 'critical' || event.risk >= this.config.realtime.criticalThreshold) {
                await this.sendRealTimeAlert(event);
            }
        }
    }

    private async createAuditEvent(
        eventType: string,
        category: AuditEvent['category'],
        severity: AuditEvent['severity'],
        action: string,
        details: Record<string, any>,
        userId?: string,
        sessionId?: string,
        resource?: string
    ): Promise<AuditEvent> {
        const timestamp = new Date();
        const id = await this.generateEventId();
        const risk = this.calculateRisk(category, severity, action, details);

        const event: AuditEvent = {
            id,
            timestamp,
            userId,
            sessionId,
            eventType,
            category,
            severity,
            action,
            resource,
            details: this.sanitizeDetails(details),
            ip: this.extractClientIP(),
            userAgent: this.extractUserAgent(),
            outcome: this.determineOutcome(details),
            risk,
            checksum: ''
        };

        event.checksum = await this.calculateEventChecksum(event);
        return event;
    }

    private async generateEventId(): Promise<string> {
        const timestamp = Date.now().toString(36);
        const sequence = (++this.sequenceNumber).toString(36);
        const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
            .map(b => b.toString(36))
            .join('');

        return `${timestamp}-${sequence}-${random}`;
    }

    private calculateRisk(
        category: AuditEvent['category'],
        severity: AuditEvent['severity'],
        action: string,
        details: Record<string, any>
    ): number {
        let risk = 0;

        // Base risk by category
        const categoryRisk = {
            security: 60,
            access: 40,
            data: 50,
            system: 30,
            user: 20
        };
        risk += categoryRisk[category] || 10;

        // Severity multiplier
        const severityMultiplier = {
            low: 0.5,
            medium: 1.0,
            high: 1.5,
            critical: 2.0
        };
        risk *= severityMultiplier[severity];

        // Action-specific adjustments
        if (action.includes('login') && details.failed) risk += 20;
        if (action.includes('delete') || action.includes('destroy')) risk += 15;
        if (action.includes('admin') || action.includes('escalate')) risk += 25;
        if (action.includes('export') || action.includes('download')) risk += 10;

        // Details-based adjustments
        if (details.multiple_attempts) risk += 15;
        if (details.suspicious_ip) risk += 20;
        if (details.privilege_escalation) risk += 30;
        if (details.data_exfiltration) risk += 40;

        return Math.min(Math.max(Math.round(risk), 0), 100);
    }

    private determineOutcome(details: Record<string, any>): AuditEvent['outcome'] {
        if (details.success === false || details.error || details.failed) {
            return 'failure';
        }
        if (details.warning || details.partial) {
            return 'warning';
        }
        return 'success';
    }

    private sanitizeDetails(details: Record<string, any>): Record<string, any> {
        const sanitized = { ...details };

        // Remove sensitive data
        const sensitiveKeys = [
            'password', 'token', 'secret', 'key', 'credential',
            'ssn', 'credit_card', 'bank_account', 'api_key'
        ];

        const sanitizeValue = (obj: any): any => {
            if (typeof obj === 'string') {
                // Check for patterns that might be sensitive
                if (/^[A-Za-z0-9+/]{20,}={0,2}$/.test(obj)) return '[REDACTED_TOKEN]';
                if (/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(obj)) return '[REDACTED_CARD]';
                if (/^\d{3}-\d{2}-\d{4}$/.test(obj)) return '[REDACTED_SSN]';
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map(sanitizeValue);
            }

            if (typeof obj === 'object' && obj !== null) {
                const result: any = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                        result[key] = '[REDACTED]';
                    } else {
                        result[key] = sanitizeValue(value);
                    }
                }
                return result;
            }

            return obj;
        };

        return sanitizeValue(sanitized);
    }

    private sanitizeConfig(config: AuditConfig): Partial<AuditConfig> {
        return {
            retention: config.retention,
            storage: {
                ...config.storage,
                // Don't log actual endpoints for security
                alertEndpoints: config.realtime.alertEndpoints?.length > 0
            },
            compliance: config.compliance
        };
    }

    private extractClientIP(): string | undefined {
        if (typeof window === 'undefined') return undefined;

        // In a real implementation, this would be provided by the server
        // For client-side, we can't reliably get the real IP
        return 'client-side';
    }

    private extractUserAgent(): string | undefined {
        if (typeof navigator !== 'undefined') {
            return navigator.userAgent;
        }
        return undefined;
    }

    private async calculateEventChecksum(event: AuditEvent): Promise<string> {
        const eventWithoutChecksum = { ...event };
        delete eventWithoutChecksum.checksum;

        const eventString = JSON.stringify(eventWithoutChecksum, Object.keys(eventWithoutChecksum).sort());
        const chainedString = this.lastChecksum + eventString;

        const encoder = new TextEncoder();
        const data = encoder.encode(chainedString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        this.lastChecksum = checksum;
        return checksum;
    }

    private async flushBuffer(): Promise<void> {
        if (this.eventBuffer.length === 0) return;

        const events = [...this.eventBuffer];
        this.eventBuffer = [];

        try {
            await this.persistEvents(events);
            this.events.push(...events);
        } catch (error) {
            console.error('Failed to persist audit events:', error);
            // Put events back in buffer for retry
            this.eventBuffer.unshift(...events);
            throw error;
        }
    }

    private async persistEvents(events: AuditEvent[]): Promise<void> {
        if (this.config.storage.local) {
            await this.persistToLocal(events);
        }

        if (this.config.storage.remote) {
            await this.persistToRemote(events);
        }
    }

    private async persistToLocal(events: AuditEvent[]): Promise<void> {
        try {
            const existingEvents = JSON.parse(localStorage.getItem('audit_events') || '[]');
            const allEvents = [...existingEvents, ...events];

            // Apply retention policy
            const retentionDate = this.getRetentionDate();
            const filteredEvents = allEvents.filter(e => new Date(e.timestamp) > retentionDate);

            localStorage.setItem('audit_events', JSON.stringify(filteredEvents));
        } catch (error) {
            console.error('Failed to persist events to local storage:', error);
            throw error;
        }
    }

    private async persistToRemote(events: AuditEvent[]): Promise<void> {
        try {
            if (typeof fetch !== 'undefined') {
                await fetch('/api/audit/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ events })
                });
            }
        } catch (error) {
            console.error('Failed to persist events to remote storage:', error);
            // Don't throw - local storage should still work
        }
    }

    private async sendRealTimeAlert(event: AuditEvent): Promise<void> {
        if (!this.config.realtime.enabled || this.config.realtime.alertEndpoints.length === 0) {
            return;
        }

        const alert = {
            type: 'audit_alert',
            severity: event.severity,
            risk: event.risk,
            event: event,
            timestamp: new Date().toISOString()
        };

        for (const endpoint of this.config.realtime.alertEndpoints) {
            try {
                if (typeof fetch !== 'undefined') {
                    await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(alert)
                    });
                }
            } catch (error) {
                console.error(`Failed to send alert to ${endpoint}:`, error);
            }
        }
    }

    private getRetentionDate(): Date {
        const now = new Date();
        const retentionPeriod = this.config.retention.duration;

        if (retentionPeriod.endsWith('y')) {
            const years = parseInt(retentionPeriod);
            return new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
        } else if (retentionPeriod.endsWith('d')) {
            const days = parseInt(retentionPeriod);
            return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        }

        // Default to 7 years for compliance
        return new Date(now.getFullYear() - 7, now.getMonth(), now.getDate());
    }

    private setupBufferFlush(): void {
        this.bufferFlushInterval = setInterval(async () => {
            if (this.eventBuffer.length > 0) {
                try {
                    await this.flushBuffer();
                } catch (error) {
                    console.error('Scheduled buffer flush failed:', error);
                }
            }
        }, 10000); // Flush every 10 seconds
    }

    private setupStorageCleanup(): void {
        setInterval(async () => {
            await this.cleanupExpiredEvents();
        }, 24 * 60 * 60 * 1000); // Daily cleanup
    }

    private async cleanupExpiredEvents(): Promise<void> {
        const retentionDate = this.getRetentionDate();

        // Clean in-memory events
        this.events = this.events.filter(e => e.timestamp > retentionDate);

        // Clean local storage
        if (this.config.storage.local) {
            try {
                const existingEvents = JSON.parse(localStorage.getItem('audit_events') || '[]');
                const filteredEvents = existingEvents.filter((e: AuditEvent) => new Date(e.timestamp) > retentionDate);
                localStorage.setItem('audit_events', JSON.stringify(filteredEvents));
            } catch (error) {
                console.error('Failed to cleanup local storage:', error);
            }
        }
    }

    async queryEvents(query: AuditQuery): Promise<AuditEvent[]> {
        let events = [...this.events];

        // Load from local storage if needed
        if (this.config.storage.local) {
            try {
                const localEvents = JSON.parse(localStorage.getItem('audit_events') || '[]');
                events = [...events, ...localEvents];
                // Remove duplicates
                events = events.filter((event, index, self) =>
                    index === self.findIndex(e => e.id === event.id)
                );
            } catch (error) {
                console.error('Failed to load events from local storage:', error);
            }
        }

        // Apply filters
        if (query.startDate) {
            events = events.filter(e => e.timestamp >= query.startDate!);
        }
        if (query.endDate) {
            events = events.filter(e => e.timestamp <= query.endDate!);
        }
        if (query.userId) {
            events = events.filter(e => e.userId === query.userId);
        }
        if (query.eventType) {
            events = events.filter(e => e.eventType === query.eventType);
        }
        if (query.category) {
            events = events.filter(e => e.category === query.category);
        }
        if (query.severity) {
            events = events.filter(e => e.severity === query.severity);
        }
        if (query.outcome) {
            events = events.filter(e => e.outcome === query.outcome);
        }
        if (query.minRisk !== undefined) {
            events = events.filter(e => e.risk >= query.minRisk!);
        }
        if (query.maxRisk !== undefined) {
            events = events.filter(e => e.risk <= query.maxRisk!);
        }

        // Sort by timestamp (newest first)
        events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Apply pagination
        if (query.offset) {
            events = events.slice(query.offset);
        }
        if (query.limit) {
            events = events.slice(0, query.limit);
        }

        return events;
    }

    async verifyEventIntegrity(eventId: string): Promise<boolean> {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return false;

        const originalChecksum = event.checksum;
        const eventWithoutChecksum = { ...event };
        delete eventWithoutChecksum.checksum;

        try {
            const recalculatedChecksum = await this.calculateEventChecksum(eventWithoutChecksum);
            return originalChecksum === recalculatedChecksum;
        } catch (error) {
            console.error('Failed to verify event integrity:', error);
            return false;
        }
    }

    generateComplianceReport(startDate: Date, endDate: Date): {
        summary: {
            totalEvents: number;
            eventsByCategory: Record<string, number>;
            eventsBySeverity: Record<string, number>;
            highRiskEvents: number;
        };
        gdpr: {
            dataAccessEvents: number;
            dataDeletionEvents: number;
            consentEvents: number;
        };
        soc2: {
            accessControlEvents: number;
            dataIntegrityEvents: number;
            systemMonitoringEvents: number;
        };
    } {
        const events = this.events.filter(e => e.timestamp >= startDate && e.timestamp <= endDate);

        const eventsByCategory: Record<string, number> = {};
        const eventsBySeverity: Record<string, number> = {};
        let highRiskEvents = 0;

        events.forEach(event => {
            eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
            eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
            if (event.risk >= 70) highRiskEvents++;
        });

        return {
            summary: {
                totalEvents: events.length,
                eventsByCategory,
                eventsBySeverity,
                highRiskEvents
            },
            gdpr: {
                dataAccessEvents: events.filter(e => e.eventType.includes('data_access')).length,
                dataDeletionEvents: events.filter(e => e.eventType.includes('data_deletion')).length,
                consentEvents: events.filter(e => e.eventType.includes('consent')).length
            },
            soc2: {
                accessControlEvents: events.filter(e => e.category === 'access').length,
                dataIntegrityEvents: events.filter(e => e.eventType.includes('integrity')).length,
                systemMonitoringEvents: events.filter(e => e.category === 'system').length
            }
        };
    }

    // Convenience methods for common audit events
    async logSecurityEvent(action: string, details: Record<string, any>, severity: AuditEvent['severity'] = 'medium'): Promise<void> {
        await this.logEvent('security_event', 'security', severity, action, details);
    }

    async logDataAccess(resource: string, userId?: string, details: Record<string, any> = {}): Promise<void> {
        await this.logEvent('data_access', 'data', 'medium', 'access', details, userId, undefined, resource);
    }

    async logLoginAttempt(userId: string, success: boolean, details: Record<string, any> = {}): Promise<void> {
        await this.logEvent(
            'login_attempt',
            'access',
            success ? 'low' : 'high',
            success ? 'login_success' : 'login_failure',
            { ...details, success },
            userId
        );
    }

    async logSystemEvent(action: string, details: Record<string, any> = {}): Promise<void> {
        await this.logEvent('system_event', 'system', 'low', action, details);
    }

    destroy(): void {
        if (this.bufferFlushInterval) {
            clearInterval(this.bufferFlushInterval);
        }
    }
}