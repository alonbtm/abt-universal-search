interface UserEvent {
    id: string;
    timestamp: Date;
    userId?: string;
    sessionId: string;
    eventType: string;
    category: 'search' | 'navigation' | 'interaction' | 'conversion' | 'error';
    action: string;
    properties: Record<string, any>;
    context: {
        url: string;
        referrer?: string;
        userAgent: string;
        device: DeviceInfo;
        geo?: GeoLocation;
    };
}

interface DeviceInfo {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
    viewport: {
        width: number;
        height: number;
    };
    screen: {
        width: number;
        height: number;
    };
}

interface GeoLocation {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
}

interface SearchAnalytics {
    query: string;
    timestamp: Date;
    userId?: string;
    sessionId: string;
    resultsCount: number;
    responseTime: number;
    clicked?: boolean;
    clickPosition?: number;
    abandoned: boolean;
    refinements: string[];
    filters: Record<string, any>;
}

interface ConversionEvent {
    id: string;
    timestamp: Date;
    userId?: string;
    sessionId: string;
    type: string;
    value?: number;
    currency?: string;
    funnel: string[];
    attribution: {
        source: string;
        medium: string;
        campaign?: string;
        content?: string;
    };
}

interface AnalyticsConfig {
    sampling: {
        rate: number; // 0-1
        strategicEvents: string[]; // Always track these events
    };
    privacy: {
        anonymizeIPs: boolean;
        respectDNT: boolean; // Do Not Track
        cookieConsent: boolean;
        dataRetention: number; // days
    };
    tracking: {
        pageViews: boolean;
        clicks: boolean;
        scrolling: boolean;
        formInteractions: boolean;
        searchQueries: boolean;
        errorEvents: boolean;
    };
    goals: {
        name: string;
        conditions: Record<string, any>;
        value?: number;
    }[];
}

export class UserAnalytics {
    private config: AnalyticsConfig;
    private events: UserEvent[] = [];
    private searchEvents: SearchAnalytics[] = [];
    private conversions: ConversionEvent[] = [];
    private currentSession: string;
    private userId?: string;
    private deviceInfo: DeviceInfo;
    private startTime = Date.now();

    constructor(config: AnalyticsConfig, userId?: string) {
        this.config = config;
        this.userId = userId;
        this.currentSession = this.generateSessionId();
        this.deviceInfo = this.detectDevice();

        this.initializeTracking();
    }

    private initializeTracking(): void {
        if (this.shouldRespectPrivacy()) {
            console.log('Analytics tracking disabled due to privacy settings');
            return;
        }

        this.setupEventListeners();
        this.trackPageView();
        this.trackSessionStart();
    }

    private shouldRespectPrivacy(): boolean {
        if (this.config.privacy.respectDNT && typeof navigator !== 'undefined') {
            return navigator.doNotTrack === '1';
        }
        return false;
    }

    private setupEventListeners(): void {
        if (typeof window === 'undefined') return;

        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('page_hidden', 'navigation', {
                    timeOnPage: Date.now() - this.startTime
                });
            } else {
                this.trackEvent('page_visible', 'navigation', {});
                this.startTime = Date.now();
            }
        });

        // Clicks
        if (this.config.tracking.clicks) {
            document.addEventListener('click', (event) => {
                this.trackClick(event);
            });
        }

        // Scroll tracking
        if (this.config.tracking.scrolling) {
            let lastScrollTime = 0;
            let maxScroll = 0;

            window.addEventListener('scroll', () => {
                const now = Date.now();
                if (now - lastScrollTime > 1000) { // Throttle to once per second
                    const scrollPercent = Math.round(
                        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
                    );

                    if (scrollPercent > maxScroll) {
                        maxScroll = scrollPercent;
                        this.trackEvent('scroll_depth', 'interaction', {
                            depth: scrollPercent,
                            timestamp: now
                        });
                    }

                    lastScrollTime = now;
                }
            });
        }

        // Form interactions
        if (this.config.tracking.formInteractions) {
            document.addEventListener('focus', (event) => {
                if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                    this.trackEvent('form_field_focus', 'interaction', {
                        fieldName: event.target.name,
                        fieldType: event.target.type,
                        formId: (event.target.form as HTMLFormElement)?.id
                    });
                }
            });

            document.addEventListener('submit', (event) => {
                if (event.target instanceof HTMLFormElement) {
                    this.trackEvent('form_submit', 'interaction', {
                        formId: event.target.id,
                        formAction: event.target.action,
                        method: event.target.method
                    });
                }
            });
        }

        // Unload tracking
        window.addEventListener('beforeunload', () => {
            this.trackEvent('page_unload', 'navigation', {
                timeOnPage: Date.now() - this.startTime
            });
            this.flush();
        });
    }

    private generateSessionId(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private detectDevice(): DeviceInfo {
        if (typeof window === 'undefined') {
            return {
                type: 'desktop',
                os: 'unknown',
                browser: 'unknown',
                viewport: { width: 0, height: 0 },
                screen: { width: 0, height: 0 }
            };
        }

        const userAgent = navigator.userAgent;
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        const screen = {
            width: window.screen.width,
            height: window.screen.height
        };

        // Detect device type
        let type: DeviceInfo['type'] = 'desktop';
        if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
            type = /iPad|Android(?!.*Mobile)/i.test(userAgent) ? 'tablet' : 'mobile';
        }

        // Detect OS
        let os = 'unknown';
        if (userAgent.includes('Windows')) os = 'Windows';
        else if (userAgent.includes('Mac')) os = 'macOS';
        else if (userAgent.includes('Linux')) os = 'Linux';
        else if (userAgent.includes('Android')) os = 'Android';
        else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

        // Detect browser
        let browser = 'unknown';
        if (userAgent.includes('Chrome')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';
        else if (userAgent.includes('Opera')) browser = 'Opera';

        return { type, os, browser, viewport, screen };
    }

    trackEvent(action: string, category: UserEvent['category'], properties: Record<string, any> = {}): void {
        if (!this.shouldTrackEvent(action)) {
            return;
        }

        const event: UserEvent = {
            id: this.generateEventId(),
            timestamp: new Date(),
            userId: this.userId,
            sessionId: this.currentSession,
            eventType: `${category}_${action}`,
            category,
            action,
            properties: this.sanitizeProperties(properties),
            context: this.getEventContext()
        };

        this.events.push(event);
        this.enforceRetention();

        // Check for goal completions
        this.checkGoals(event);
    }

    private shouldTrackEvent(action: string): boolean {
        // Check sampling rate
        if (this.config.sampling.strategicEvents.includes(action)) {
            return true; // Always track strategic events
        }

        return Math.random() < this.config.sampling.rate;
    }

    private generateEventId(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(12)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
        const sanitized = { ...properties };

        // Remove sensitive data
        const sensitiveKeys = ['password', 'token', 'ssn', 'credit_card', 'email', 'phone'];
        sensitiveKeys.forEach(key => {
            if (key in sanitized) {
                delete sanitized[key];
            }
        });

        // Anonymize IP if configured
        if (this.config.privacy.anonymizeIPs && sanitized.ip) {
            sanitized.ip = this.anonymizeIP(sanitized.ip);
        }

        return sanitized;
    }

    private anonymizeIP(ip: string): string {
        // Simple IP anonymization - zero out last octet for IPv4
        const parts = ip.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
        }
        return ip; // Return as-is for IPv6 or malformed IPs
    }

    private getEventContext(): UserEvent['context'] {
        if (typeof window === 'undefined') {
            return {
                url: '',
                userAgent: '',
                device: this.deviceInfo
            };
        }

        return {
            url: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            device: this.deviceInfo,
            geo: this.getGeolocation()
        };
    }

    private getGeolocation(): GeoLocation | undefined {
        // In a real implementation, this would use a geolocation service
        // For now, we'll try to get timezone from the browser
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            return { timezone };
        } catch (e) {
            return undefined;
        }
    }

    trackPageView(url?: string, title?: string): void {
        if (!this.config.tracking.pageViews) return;

        this.trackEvent('page_view', 'navigation', {
            url: url || (typeof window !== 'undefined' ? window.location.href : ''),
            title: title || (typeof document !== 'undefined' ? document.title : ''),
            timestamp: new Date().toISOString()
        });
    }

    trackClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        if (!target) return;

        const properties: Record<string, any> = {
            tagName: target.tagName,
            className: target.className,
            id: target.id,
            text: target.textContent?.slice(0, 100),
            x: event.clientX,
            y: event.clientY
        };

        // Add specific properties for different element types
        if (target.tagName === 'A') {
            properties.href = (target as HTMLAnchorElement).href;
        }

        if (target.tagName === 'BUTTON') {
            properties.buttonType = (target as HTMLButtonElement).type;
        }

        this.trackEvent('click', 'interaction', properties);
    }

    trackSearch(query: string, resultsCount: number, responseTime: number, filters?: Record<string, any>): void {
        if (!this.config.tracking.searchQueries) return;

        const searchEvent: SearchAnalytics = {
            query: this.sanitizeSearchQuery(query),
            timestamp: new Date(),
            userId: this.userId,
            sessionId: this.currentSession,
            resultsCount,
            responseTime,
            abandoned: false,
            refinements: [],
            filters: filters || {}
        };

        this.searchEvents.push(searchEvent);
        this.trackEvent('search', 'search', {
            query: searchEvent.query,
            resultsCount,
            responseTime
        });
    }

    trackSearchClick(query: string, position: number, resultId?: string): void {
        const searchEvent = this.searchEvents
            .filter(s => s.query === query && s.userId === this.userId)
            .pop();

        if (searchEvent) {
            searchEvent.clicked = true;
            searchEvent.clickPosition = position;
        }

        this.trackEvent('search_click', 'search', {
            query: this.sanitizeSearchQuery(query),
            position,
            resultId
        });
    }

    private sanitizeSearchQuery(query: string): string {
        // Remove potentially sensitive information from search queries
        const sanitized = query
            .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN
            .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]') // Credit card
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]'); // Email

        return sanitized.length > 100 ? sanitized.slice(0, 100) + '...' : sanitized;
    }

    trackConversion(type: string, value?: number, currency?: string, attribution?: any): void {
        const conversion: ConversionEvent = {
            id: this.generateEventId(),
            timestamp: new Date(),
            userId: this.userId,
            sessionId: this.currentSession,
            type,
            value,
            currency,
            funnel: this.getConversionFunnel(),
            attribution: attribution || this.getAttribution()
        };

        this.conversions.push(conversion);
        this.trackEvent('conversion', 'conversion', {
            type,
            value,
            currency
        });
    }

    private getConversionFunnel(): string[] {
        // Extract the sequence of events that led to this conversion
        const recentEvents = this.events
            .filter(e => e.sessionId === this.currentSession)
            .slice(-10)
            .map(e => e.action);

        return recentEvents;
    }

    private getAttribution(): ConversionEvent['attribution'] {
        // Basic attribution - in production, this would be more sophisticated
        const referrer = typeof document !== 'undefined' ? document.referrer : '';

        let source = 'direct';
        let medium = 'none';

        if (referrer) {
            if (referrer.includes('google.com')) {
                source = 'google';
                medium = 'organic';
            } else if (referrer.includes('facebook.com')) {
                source = 'facebook';
                medium = 'social';
            } else if (referrer.includes('twitter.com')) {
                source = 'twitter';
                medium = 'social';
            } else {
                source = 'referral';
                medium = 'referral';
            }
        }

        return { source, medium };
    }

    private trackSessionStart(): void {
        this.trackEvent('session_start', 'navigation', {
            sessionId: this.currentSession,
            device: this.deviceInfo
        });
    }

    private checkGoals(event: UserEvent): void {
        for (const goal of this.config.goals) {
            if (this.evaluateGoalConditions(goal.conditions, event)) {
                this.trackConversion(goal.name, goal.value);
            }
        }
    }

    private evaluateGoalConditions(conditions: Record<string, any>, event: UserEvent): boolean {
        for (const [key, value] of Object.entries(conditions)) {
            if (key === 'action' && event.action !== value) {
                return false;
            }
            if (key === 'category' && event.category !== value) {
                return false;
            }
            if (key === 'property') {
                const [propKey, propValue] = Object.entries(value)[0];
                if (event.properties[propKey] !== propValue) {
                    return false;
                }
            }
        }
        return true;
    }

    private enforceRetention(): void {
        const retentionDays = this.config.privacy.dataRetention;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        this.events = this.events.filter(e => e.timestamp > cutoffDate);
        this.searchEvents = this.searchEvents.filter(e => e.timestamp > cutoffDate);
        this.conversions = this.conversions.filter(e => e.timestamp > cutoffDate);
    }

    getAnalytics(startDate?: Date, endDate?: Date): {
        events: UserEvent[];
        searches: SearchAnalytics[];
        conversions: ConversionEvent[];
        summary: {
            totalEvents: number;
            uniqueUsers: number;
            sessions: number;
            pageViews: number;
            bounceRate: number;
            avgSessionDuration: number;
            conversionRate: number;
        };
    } {
        let events = this.events;
        let searches = this.searchEvents;
        let conversions = this.conversions;

        if (startDate) {
            events = events.filter(e => e.timestamp >= startDate);
            searches = searches.filter(s => s.timestamp >= startDate);
            conversions = conversions.filter(c => c.timestamp >= startDate);
        }

        if (endDate) {
            events = events.filter(e => e.timestamp <= endDate);
            searches = searches.filter(s => s.timestamp <= endDate);
            conversions = conversions.filter(c => c.timestamp <= endDate);
        }

        const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean)).size;
        const sessions = new Set(events.map(e => e.sessionId)).size;
        const pageViews = events.filter(e => e.action === 'page_view').length;

        // Calculate bounce rate (sessions with only one page view)
        const sessionPageViews = events
            .filter(e => e.action === 'page_view')
            .reduce((acc, e) => {
                acc[e.sessionId] = (acc[e.sessionId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        const bouncedSessions = Object.values(sessionPageViews).filter(count => count === 1).length;
        const bounceRate = sessions > 0 ? (bouncedSessions / sessions) * 100 : 0;

        // Calculate average session duration
        const sessionDurations = events
            .reduce((acc, e) => {
                if (!acc[e.sessionId]) {
                    acc[e.sessionId] = { start: e.timestamp, end: e.timestamp };
                } else {
                    if (e.timestamp < acc[e.sessionId].start) acc[e.sessionId].start = e.timestamp;
                    if (e.timestamp > acc[e.sessionId].end) acc[e.sessionId].end = e.timestamp;
                }
                return acc;
            }, {} as Record<string, { start: Date; end: Date }>);

        const avgSessionDuration = Object.values(sessionDurations).length > 0
            ? Object.values(sessionDurations)
                .map(s => s.end.getTime() - s.start.getTime())
                .reduce((sum, duration) => sum + duration, 0) / Object.values(sessionDurations).length
            : 0;

        const conversionRate = sessions > 0 ? (conversions.length / sessions) * 100 : 0;

        return {
            events,
            searches,
            conversions,
            summary: {
                totalEvents: events.length,
                uniqueUsers,
                sessions,
                pageViews,
                bounceRate,
                avgSessionDuration: avgSessionDuration / 1000, // Convert to seconds
                conversionRate
            }
        };
    }

    generateInsights(): {
        topSearches: { query: string; count: number; avgResponseTime: number }[];
        deviceBreakdown: Record<string, number>;
        trafficSources: Record<string, number>;
        conversionFunnels: { step: string; users: number; conversionRate: number }[];
        userBehavior: {
            avgTimeOnPage: number;
            avgScrollDepth: number;
            mostClickedElements: { element: string; clicks: number }[];
        };
    } {
        // Top searches
        const searchCounts = this.searchEvents.reduce((acc, s) => {
            const key = s.query;
            if (!acc[key]) {
                acc[key] = { count: 0, totalResponseTime: 0 };
            }
            acc[key].count++;
            acc[key].totalResponseTime += s.responseTime;
            return acc;
        }, {} as Record<string, { count: number; totalResponseTime: number }>);

        const topSearches = Object.entries(searchCounts)
            .map(([query, data]) => ({
                query,
                count: data.count,
                avgResponseTime: data.totalResponseTime / data.count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Device breakdown
        const deviceBreakdown = this.events.reduce((acc, e) => {
            const device = e.context.device.type;
            acc[device] = (acc[device] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Traffic sources
        const trafficSources = this.events
            .filter(e => e.action === 'page_view')
            .reduce((acc, e) => {
                const referrer = e.context.referrer || 'direct';
                acc[referrer] = (acc[referrer] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        // User behavior metrics
        const timeOnPageEvents = this.events.filter(e => e.properties.timeOnPage);
        const avgTimeOnPage = timeOnPageEvents.length > 0
            ? timeOnPageEvents.reduce((sum, e) => sum + e.properties.timeOnPage, 0) / timeOnPageEvents.length
            : 0;

        const scrollEvents = this.events.filter(e => e.action === 'scroll_depth');
        const avgScrollDepth = scrollEvents.length > 0
            ? scrollEvents.reduce((sum, e) => sum + e.properties.depth, 0) / scrollEvents.length
            : 0;

        const clickCounts = this.events
            .filter(e => e.action === 'click')
            .reduce((acc, e) => {
                const element = `${e.properties.tagName}${e.properties.id ? '#' + e.properties.id : ''}${e.properties.className ? '.' + e.properties.className : ''}`;
                acc[element] = (acc[element] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        const mostClickedElements = Object.entries(clickCounts)
            .map(([element, clicks]) => ({ element, clicks }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 5);

        return {
            topSearches,
            deviceBreakdown,
            trafficSources,
            conversionFunnels: [], // Would implement funnel analysis
            userBehavior: {
                avgTimeOnPage,
                avgScrollDepth,
                mostClickedElements
            }
        };
    }

    setUserId(userId: string): void {
        this.userId = userId;
        this.trackEvent('user_identified', 'navigation', { userId });
    }

    flush(): void {
        // In a real implementation, this would send data to analytics service
        if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
            const payload = {
                events: this.events.slice(-50), // Send last 50 events
                timestamp: new Date().toISOString()
            };

            navigator.sendBeacon('/api/analytics', JSON.stringify(payload));
        }
    }

    reset(): void {
        this.events = [];
        this.searchEvents = [];
        this.conversions = [];
        this.currentSession = this.generateSessionId();
        this.trackSessionStart();
    }
}