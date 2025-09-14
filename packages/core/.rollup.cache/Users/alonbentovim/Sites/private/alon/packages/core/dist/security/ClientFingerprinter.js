/**
 * Client Fingerprinter - Track usage patterns to identify and throttle abusive behavior
 * @description Implements client behavior tracking and abuse detection with privacy compliance
 */
/**
 * Browser fingerprinting utilities
 */
class BrowserFingerprinting {
    /**
     * Generate browser fingerprint with privacy considerations
     */
    static generateBrowserFingerprint(privacyMode) {
        const fingerprint = {
            userAgent: '',
            screenResolution: '',
            timezone: '',
            language: '',
            platform: '',
            cookieEnabled: false,
            doNotTrack: false
        };
        if (typeof window === 'undefined') {
            // Server-side environment - return minimal fingerprint
            return fingerprint;
        }
        try {
            // Basic information (available in all privacy modes)
            fingerprint.userAgent = this.sanitizeUserAgent(navigator.userAgent, privacyMode);
            fingerprint.language = navigator.language || 'unknown';
            fingerprint.cookieEnabled = navigator.cookieEnabled;
            fingerprint.doNotTrack = navigator.doNotTrack === '1';
            if (privacyMode !== 'strict') {
                fingerprint.platform = navigator.platform || 'unknown';
                fingerprint.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
                if (screen) {
                    fingerprint.screenResolution = `${screen.width}x${screen.height}`;
                }
            }
            if (privacyMode === 'minimal') {
                // Additional fingerprinting for minimal privacy mode
                fingerprint.canvasFingerprint = this.generateCanvasFingerprint();
                fingerprint.webglFingerprint = this.generateWebGLFingerprint();
            }
        }
        catch (error) {
            // Silently handle fingerprinting errors
            console.warn('Browser fingerprinting error:', error);
        }
        return fingerprint;
    }
    /**
     * Sanitize user agent based on privacy mode
     */
    static sanitizeUserAgent(userAgent, privacyMode) {
        if (privacyMode === 'strict') {
            // Return only browser family
            if (userAgent.includes('Chrome'))
                return 'Chrome';
            if (userAgent.includes('Firefox'))
                return 'Firefox';
            if (userAgent.includes('Safari'))
                return 'Safari';
            if (userAgent.includes('Edge'))
                return 'Edge';
            return 'Unknown';
        }
        if (privacyMode === 'balanced') {
            // Remove version numbers and detailed system info
            return userAgent.replace(/\d+\.\d+\.\d+/g, 'X.X.X');
        }
        // Minimal privacy mode - return full user agent
        return userAgent;
    }
    /**
     * Generate canvas fingerprint (minimal privacy mode only)
     */
    static generateCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx)
                return '';
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Fingerprint test 🔒', 2, 2);
            return canvas.toDataURL().slice(-50); // Last 50 chars for brevity
        }
        catch {
            return '';
        }
    }
    /**
     * Generate WebGL fingerprint (minimal privacy mode only)
     */
    static generateWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl)
                return '';
            const renderer = gl.getParameter(gl.RENDERER);
            const vendor = gl.getParameter(gl.VENDOR);
            return `${vendor}|${renderer}`.slice(0, 50); // Truncate for privacy
        }
        catch {
            return '';
        }
    }
}
/**
 * Behavior analysis utilities
 */
class BehaviorAnalysis {
    /**
     * Calculate suspicious activity score
     */
    static calculateSuspiciousScore(fingerprint, config) {
        let score = 0;
        const factors = config.scoringFactors;
        // Query frequency scoring
        if (fingerprint.behaviorFingerprint.queryFrequency > 10) {
            score += factors.queryFrequency * 0.3;
        }
        else if (fingerprint.behaviorFingerprint.queryFrequency > 5) {
            score += factors.queryFrequency * 0.1;
        }
        // Pattern variation scoring (low variation = suspicious)
        const patternVariation = fingerprint.behaviorFingerprint.commonPatterns.length;
        if (patternVariation < 3) {
            score += factors.patternVariation * 0.2;
        }
        // Session duration scoring (very long sessions = suspicious)
        if (fingerprint.behaviorFingerprint.sessionDuration > 3600000) { // 1 hour
            score += factors.sessionDuration * 0.2;
        }
        // Error rate scoring (high error rate = suspicious)
        if (fingerprint.behaviorFingerprint.errorRate > 0.5) {
            score += factors.errorRate * 0.3;
        }
        return Math.min(score, 1.0);
    }
    /**
     * Determine throttle level based on score
     */
    static determineThrottleLevel(score) {
        if (score >= 0.8)
            return 'blocked';
        if (score >= 0.6)
            return 'heavy';
        if (score >= 0.4)
            return 'moderate';
        if (score >= 0.2)
            return 'light';
        return 'none';
    }
    /**
     * Update behavior patterns
     */
    static updateBehaviorPatterns(existing, newData) {
        const updated = { ...existing };
        if (newData.avgQueryLength !== undefined) {
            updated.avgQueryLength = (updated.avgQueryLength + newData.avgQueryLength) / 2;
        }
        if (newData.queryFrequency !== undefined) {
            updated.queryFrequency = newData.queryFrequency;
        }
        if (newData.typingSpeed !== undefined) {
            updated.typingSpeed = (updated.typingSpeed + newData.typingSpeed) / 2;
        }
        if (newData.sessionDuration !== undefined) {
            updated.sessionDuration = newData.sessionDuration;
        }
        if (newData.errorRate !== undefined) {
            updated.errorRate = (updated.errorRate + newData.errorRate) / 2;
        }
        if (newData.commonPatterns) {
            // Merge and deduplicate patterns
            const allPatterns = [...updated.commonPatterns, ...newData.commonPatterns];
            updated.commonPatterns = [...new Set(allPatterns)].slice(0, 10); // Keep top 10
        }
        return updated;
    }
}
/**
 * Client fingerprinter with behavior tracking and abuse detection
 */
export class ClientFingerprinter {
    constructor(config) {
        this.fingerprints = new Map();
        this.sessionStartTimes = new Map();
        this.config = {
            enableBrowserFingerprinting: config.enableBrowserFingerprinting,
            enableBehaviorTracking: config.enableBehaviorTracking,
            fingerprintTTL: config.fingerprintTTL,
            abuseThreshold: config.abuseThreshold,
            scoringFactors: config.scoringFactors,
            privacyMode: config.privacyMode
        };
        // Start cleanup interval
        this.startCleanupInterval();
    }
    /**
     * Generate client fingerprint
     */
    async generateFingerprint() {
        const clientId = this.generateClientId();
        const now = Date.now();
        let browserFingerprint = {
            userAgent: 'unknown',
            screenResolution: 'unknown',
            timezone: 'unknown',
            language: 'unknown',
            platform: 'unknown',
            cookieEnabled: false,
            doNotTrack: false
        };
        if (this.config.enableBrowserFingerprinting) {
            browserFingerprint = BrowserFingerprinting.generateBrowserFingerprint(this.config.privacyMode);
        }
        const behaviorFingerprint = {
            avgQueryLength: 0,
            queryFrequency: 0,
            typingSpeed: 0,
            sessionDuration: 0,
            errorRate: 0,
            commonPatterns: []
        };
        const fingerprint = {
            clientId,
            browserFingerprint,
            behaviorFingerprint,
            createdAt: now,
            updatedAt: now,
            suspiciousScore: 0,
            throttleLevel: 'none'
        };
        this.fingerprints.set(clientId, fingerprint);
        this.sessionStartTimes.set(clientId, now);
        return fingerprint;
    }
    /**
     * Update behavior data
     */
    updateBehavior(clientId, behaviorData) {
        if (!this.config.enableBehaviorTracking) {
            return;
        }
        const fingerprint = this.fingerprints.get(clientId);
        if (!fingerprint) {
            return;
        }
        // Update session duration
        const sessionStart = this.sessionStartTimes.get(clientId) || fingerprint.createdAt;
        const sessionDuration = Date.now() - sessionStart;
        const updatedBehaviorData = {
            ...behaviorData,
            sessionDuration
        };
        // Update behavior fingerprint
        fingerprint.behaviorFingerprint = BehaviorAnalysis.updateBehaviorPatterns(fingerprint.behaviorFingerprint, updatedBehaviorData);
        // Recalculate suspicious score
        fingerprint.suspiciousScore = BehaviorAnalysis.calculateSuspiciousScore(fingerprint, this.config);
        // Update throttle level
        fingerprint.throttleLevel = BehaviorAnalysis.determineThrottleLevel(fingerprint.suspiciousScore);
        fingerprint.updatedAt = Date.now();
    }
    /**
     * Check if client should be throttled
     */
    shouldThrottle(clientId) {
        const fingerprint = this.fingerprints.get(clientId);
        if (!fingerprint) {
            return {
                shouldThrottle: false,
                throttleLevel: 'none',
                reason: 'Client not found'
            };
        }
        const shouldThrottle = fingerprint.suspiciousScore >= this.config.abuseThreshold;
        let reason = 'Normal behavior';
        if (shouldThrottle) {
            const reasons = [];
            if (fingerprint.behaviorFingerprint.queryFrequency > 10) {
                reasons.push('high query frequency');
            }
            if (fingerprint.behaviorFingerprint.errorRate > 0.5) {
                reasons.push('high error rate');
            }
            if (fingerprint.behaviorFingerprint.commonPatterns.length < 3) {
                reasons.push('low pattern variation');
            }
            if (fingerprint.behaviorFingerprint.sessionDuration > 3600000) {
                reasons.push('excessive session duration');
            }
            reason = reasons.length > 0 ? reasons.join(', ') : 'suspicious activity detected';
        }
        return {
            shouldThrottle,
            throttleLevel: fingerprint.throttleLevel,
            reason
        };
    }
    /**
     * Get client fingerprint
     */
    getFingerprint(clientId) {
        return this.fingerprints.get(clientId) || null;
    }
    /**
     * Clean up expired fingerprints
     */
    cleanup() {
        const now = Date.now();
        const expiredClients = [];
        for (const [clientId, fingerprint] of this.fingerprints.entries()) {
            if (now - fingerprint.updatedAt > this.config.fingerprintTTL) {
                expiredClients.push(clientId);
            }
        }
        for (const clientId of expiredClients) {
            this.fingerprints.delete(clientId);
            this.sessionStartTimes.delete(clientId);
        }
    }
    /**
     * Generate unique client ID
     */
    generateClientId() {
        return `client-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
    /**
     * Start cleanup interval
     */
    startCleanupInterval() {
        setInterval(() => {
            this.cleanup();
        }, Math.max(this.config.fingerprintTTL / 4, 60000)); // Clean up every quarter TTL or 1 minute
    }
    /**
     * Get all client fingerprints (for debugging)
     */
    getAllFingerprints() {
        return Array.from(this.fingerprints.values());
    }
    /**
     * Get suspicious clients
     */
    getSuspiciousClients() {
        return Array.from(this.fingerprints.values())
            .filter(fp => fp.suspiciousScore >= this.config.abuseThreshold);
    }
    /**
     * Get throttled clients
     */
    getThrottledClients() {
        return Array.from(this.fingerprints.values())
            .filter(fp => fp.throttleLevel !== 'none');
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        Object.assign(this.config, config);
        // Recalculate scores for all fingerprints if scoring factors changed
        if (config.scoringFactors || config.abuseThreshold) {
            for (const fingerprint of this.fingerprints.values()) {
                fingerprint.suspiciousScore = BehaviorAnalysis.calculateSuspiciousScore(fingerprint, this.config);
                fingerprint.throttleLevel = BehaviorAnalysis.determineThrottleLevel(fingerprint.suspiciousScore);
            }
        }
    }
    /**
     * Reset client fingerprint
     */
    resetClient(clientId) {
        const fingerprint = this.fingerprints.get(clientId);
        if (fingerprint) {
            fingerprint.suspiciousScore = 0;
            fingerprint.throttleLevel = 'none';
            fingerprint.behaviorFingerprint = {
                avgQueryLength: 0,
                queryFrequency: 0,
                typingSpeed: 0,
                sessionDuration: 0,
                errorRate: 0,
                commonPatterns: []
            };
            fingerprint.updatedAt = Date.now();
            this.sessionStartTimes.set(clientId, Date.now());
        }
    }
    /**
     * Get fingerprinting statistics
     */
    getStatistics() {
        const fingerprints = Array.from(this.fingerprints.values());
        const suspiciousClients = fingerprints.filter(fp => fp.suspiciousScore >= this.config.abuseThreshold);
        const throttledClients = fingerprints.filter(fp => fp.throttleLevel !== 'none');
        const totalScore = fingerprints.reduce((sum, fp) => sum + fp.suspiciousScore, 0);
        const averageSuspiciousScore = fingerprints.length > 0 ? totalScore / fingerprints.length : 0;
        const throttleLevelDistribution = {
            none: 0,
            light: 0,
            moderate: 0,
            heavy: 0,
            blocked: 0
        };
        for (const fingerprint of fingerprints) {
            throttleLevelDistribution[fingerprint.throttleLevel]++;
        }
        return {
            totalClients: fingerprints.length,
            suspiciousClients: suspiciousClients.length,
            throttledClients: throttledClients.length,
            averageSuspiciousScore,
            throttleLevelDistribution
        };
    }
}
/**
 * Default client fingerprint configuration
 */
export const defaultClientFingerprintConfig = {
    enableBrowserFingerprinting: true,
    enableBehaviorTracking: true,
    fingerprintTTL: 3600000, // 1 hour
    abuseThreshold: 0.6,
    scoringFactors: {
        queryFrequency: 0.3,
        patternVariation: 0.2,
        sessionDuration: 0.2,
        errorRate: 0.3
    },
    privacyMode: 'balanced'
};
/**
 * Create client fingerprinter with default configuration
 */
export function createClientFingerprinter(config) {
    return new ClientFingerprinter({
        ...defaultClientFingerprintConfig,
        ...config
    });
}
//# sourceMappingURL=ClientFingerprinter.js.map