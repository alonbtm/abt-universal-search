/**
 * Privacy Manager - Privacy-compliant analytics collection
 * @description GDPR compliance, consent management, data anonymization, and retention policies
 */
/**
 * Default privacy configuration
 */
const DEFAULT_CONFIG = {
    regulations: ['GDPR'],
    requireConsent: true,
    consentExpirationDays: 365,
    dataRetentionDays: 90,
    enableAnonymization: true,
    dataSubjectRights: {
        access: true,
        rectification: true,
        erasure: true,
        portability: true,
        objection: true
    },
    geoDetection: {
        enabled: true,
        anonymizeIP: true,
        defaultRegion: 'EU'
    }
};
/**
 * Default anonymization configuration
 */
const DEFAULT_ANONYMIZATION = {
    anonymizeIPs: true,
    anonymizeUserAgent: true,
    anonymizeQueries: false, // Configurable based on use case
    anonymizeResults: false,
    salt: 'universal-search-privacy-salt',
    piiPatterns: [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
        /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone number
    ],
    replacementStrategies: {
        email: 'hash',
        ssn: 'remove',
        phone: 'pseudonymize',
        ip: 'hash',
        userAgent: 'generalize'
    }
};
/**
 * Privacy Manager Implementation
 */
export class PrivacyManager {
    constructor(config = {}, anonymizationConfig = {}) {
        this.consentRecords = new Map();
        this.processingRecords = [];
        this.dataSubjectRequests = new Map();
        this.complianceCheckers = new Map();
        this.metricsCache = null;
        this.metricsCacheTimestamp = 0;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.anonymizationConfig = { ...DEFAULT_ANONYMIZATION, ...anonymizationConfig };
        this.initialize();
    }
    /**
     * Check if consent is required for user
     */
    requiresConsent(userId, category = 'analytics') {
        if (!this.config.requireConsent)
            return false;
        // Check if in a regulated region
        const userRegion = this.detectUserRegion(userId);
        const requiresConsent = this.isRegulatedRegion(userRegion);
        // Necessary data processing doesn't require consent under most regulations
        if (category === 'necessary')
            return false;
        return requiresConsent;
    }
    /**
     * Record user consent
     */
    recordConsent(userId, categories, method = 'explicit', legalBasis = 'consent', metadata = {}) {
        const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = Date.now();
        const expiresAt = now + (this.config.consentExpirationDays * 24 * 60 * 60 * 1000);
        // Fill in missing categories with default status
        const fullCategories = {
            necessary: 'granted', // Always granted for necessary processing
            analytics: categories.analytics || 'pending',
            performance: categories.performance || 'pending',
            functional: categories.functional || 'pending',
            targeting: categories.targeting || 'pending',
            social: categories.social || 'pending'
        };
        const consentRecord = {
            id: consentId,
            userId,
            categories: fullCategories,
            timestamp: now,
            expiresAt,
            method,
            legalBasis,
            userAgent: metadata.userAgent,
            ipHash: metadata.ipAddress ? this.anonymizeIP(metadata.ipAddress) : undefined,
            location: this.detectLocation(metadata.ipAddress),
            consentString: this.generateConsentString(fullCategories, method, legalBasis)
        };
        this.consentRecords.set(userId, consentRecord);
        // Clean up metrics cache
        this.metricsCache = null;
        return consentRecord;
    }
    /**
     * Check consent status
     */
    checkConsent(userId, category) {
        const consent = this.consentRecords.get(userId);
        if (!consent) {
            return this.requiresConsent(userId, category) ? 'pending' : 'granted';
        }
        // Check if consent has expired
        if (Date.now() > consent.expiresAt) {
            return 'expired';
        }
        return consent.categories[category] || 'pending';
    }
    /**
     * Withdraw consent
     */
    withdrawConsent(userId, categories) {
        const consent = this.consentRecords.get(userId);
        if (!consent)
            return false;
        const categoriesToWithdraw = categories || Object.keys(consent.categories);
        for (const category of categoriesToWithdraw) {
            if (category !== 'necessary') { // Cannot withdraw necessary consent
                consent.categories[category] = 'withdrawn';
            }
        }
        consent.timestamp = Date.now();
        this.metricsCache = null;
        // Record data processing for withdrawal
        this.recordProcessing(userId, 'consent-withdrawal', categoriesToWithdraw, 'Consent withdrawn by user', 'consent', consent.id);
        return true;
    }
    /**
     * Record data processing activity
     */
    recordProcessing(dataSubjectId, activity, dataCategories, purpose, legalBasis, consentId) {
        const recordId = `processing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = Date.now();
        const retainUntil = now + (this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
        const record = {
            id: recordId,
            dataSubjectId,
            activity,
            dataCategories,
            purpose,
            legalBasis,
            timestamp: now,
            retainUntil,
            consentId
        };
        this.processingRecords.push(record);
        // Keep only recent records (within retention period + buffer)
        const cutoff = now - ((this.config.dataRetentionDays + 30) * 24 * 60 * 60 * 1000);
        this.processingRecords = this.processingRecords.filter(r => r.timestamp > cutoff);
        this.metricsCache = null;
        return record;
    }
    /**
     * Anonymize data based on configuration
     */
    anonymizeData(data, dataTypes) {
        if (!this.config.enableAnonymization)
            return data;
        const anonymized = { ...data };
        // IP address anonymization
        if (this.anonymizationConfig.anonymizeIPs && anonymized.ipAddress) {
            anonymized.ipAddress = this.anonymizeIP(anonymized.ipAddress);
        }
        // User agent anonymization
        if (this.anonymizationConfig.anonymizeUserAgent && anonymized.userAgent) {
            anonymized.userAgent = this.anonymizeUserAgent(anonymized.userAgent);
        }
        // Query anonymization
        if (this.anonymizationConfig.anonymizeQueries && anonymized.query) {
            anonymized.query = this.anonymizeText(anonymized.query);
        }
        // Result anonymization
        if (this.anonymizationConfig.anonymizeResults && anonymized.results) {
            anonymized.results = this.anonymizeResults(anonymized.results);
        }
        // Generic PII detection and anonymization
        for (const [key, value] of Object.entries(anonymized)) {
            if (typeof value === 'string') {
                anonymized[key] = this.detectAndAnonymizePII(value);
            }
        }
        return anonymized;
    }
    /**
     * Handle data subject request
     */
    handleDataSubjectRequest(dataSubjectId, type, details, categories) {
        const requestId = `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = Date.now();
        const deadline = now + (30 * 24 * 60 * 60 * 1000); // 30 days as per GDPR
        const request = {
            id: requestId,
            dataSubjectId,
            type,
            status: 'received',
            details,
            categories,
            requestedAt: now,
            deadline
        };
        this.dataSubjectRequests.set(requestId, request);
        this.metricsCache = null;
        // Auto-process certain types of requests
        this.processDataSubjectRequest(requestId);
        return request;
    }
    /**
     * Process data subject request
     */
    async processDataSubjectRequest(requestId) {
        const request = this.dataSubjectRequests.get(requestId);
        if (!request || request.status !== 'received')
            return;
        request.status = 'processing';
        try {
            switch (request.type) {
                case 'access':
                    await this.processAccessRequest(request);
                    break;
                case 'erasure':
                    await this.processErasureRequest(request);
                    break;
                case 'portability':
                    await this.processPortabilityRequest(request);
                    break;
                case 'objection':
                    await this.processObjectionRequest(request);
                    break;
                case 'rectification':
                    await this.processRectificationRequest(request);
                    break;
                case 'restriction':
                    await this.processRestrictionRequest(request);
                    break;
            }
            request.status = 'completed';
            request.completedAt = Date.now();
        }
        catch (error) {
            request.status = 'rejected';
            request.completedAt = Date.now();
            request.response = {
                action: 'rejected',
                notes: `Error processing request: ${error.message || 'Unknown error'}`
            };
        }
    }
    /**
     * Get privacy metrics
     */
    getPrivacyMetrics() {
        // Return cached metrics if still valid
        const now = Date.now();
        if (this.metricsCache && (now - this.metricsCacheTimestamp) < 60000) { // 1 minute cache
            return this.metricsCache;
        }
        const metrics = this.calculatePrivacyMetrics();
        this.metricsCache = metrics;
        this.metricsCacheTimestamp = now;
        return metrics;
    }
    /**
     * Check compliance status
     */
    checkCompliance() {
        const issues = [];
        let totalScore = 100;
        for (const regulation of this.config.regulations) {
            const regulationIssues = this.checkRegulationCompliance(regulation);
            issues.push(...regulationIssues);
        }
        // Calculate compliance score
        const criticalIssues = issues.filter(i => i.severity === 'critical').length;
        const highIssues = issues.filter(i => i.severity === 'high').length;
        const mediumIssues = issues.filter(i => i.severity === 'medium').length;
        const lowIssues = issues.filter(i => i.severity === 'low').length;
        totalScore -= criticalIssues * 25;
        totalScore -= highIssues * 15;
        totalScore -= mediumIssues * 8;
        totalScore -= lowIssues * 3;
        const score = Math.max(0, totalScore);
        const isCompliant = score >= 80 && criticalIssues === 0;
        return {
            isCompliant,
            score,
            issues
        };
    }
    /**
     * Clean up expired data
     */
    cleanupExpiredData() {
        const now = Date.now();
        let removedConsents = 0;
        let removedProcessingRecords = 0;
        let removedRequests = 0;
        // Remove expired consent records
        for (const [userId, consent] of Array.from(this.consentRecords.entries())) {
            if (now > consent.expiresAt) {
                this.consentRecords.delete(userId);
                removedConsents++;
            }
        }
        // Remove expired processing records
        const initialProcessingCount = this.processingRecords.length;
        this.processingRecords = this.processingRecords.filter(record => now < record.retainUntil);
        removedProcessingRecords = initialProcessingCount - this.processingRecords.length;
        // Remove old completed requests (keep for 1 year)
        const requestCutoff = now - (365 * 24 * 60 * 60 * 1000);
        for (const [requestId, request] of Array.from(this.dataSubjectRequests.entries())) {
            if (request.status === 'completed' && request.completedAt && request.completedAt < requestCutoff) {
                this.dataSubjectRequests.delete(requestId);
                removedRequests++;
            }
        }
        this.metricsCache = null;
        return {
            removedConsents,
            removedProcessingRecords,
            removedRequests
        };
    }
    // Private implementation methods
    initialize() {
        // Set up periodic cleanup
        setInterval(() => {
            this.cleanupExpiredData();
        }, 24 * 60 * 60 * 1000); // Run daily
        // Initialize compliance checkers
        this.setupComplianceCheckers();
    }
    detectUserRegion(userId) {
        // Simplified region detection
        // In production, this would use proper IP geolocation
        if (this.config.geoDetection.enabled) {
            // Use cached location from consent record
            const consent = this.consentRecords.get(userId);
            if (consent?.location?.country) {
                return consent.location.country;
            }
        }
        return this.config.geoDetection.defaultRegion;
    }
    isRegulatedRegion(region) {
        const regulatedRegions = {
            GDPR: ['EU', 'EEA', 'GB'],
            CCPA: ['US-CA'],
            LGPD: ['BR'],
            PIPEDA: ['CA'],
            PDPB: ['SG']
        };
        return this.config.regulations.some(regulation => regulatedRegions[regulation]?.includes(region));
    }
    detectLocation(ipAddress) {
        if (!ipAddress || !this.config.geoDetection.enabled)
            return undefined;
        // Simplified location detection
        // In production, use a proper geolocation service
        if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('172.')) {
            return { country: 'local', region: 'local' };
        }
        // Default to EU for privacy-safe defaults
        return { country: 'EU', region: 'EU' };
    }
    anonymizeIP(ipAddress) {
        if (!ipAddress)
            return '';
        // IPv4 anonymization
        if (ipAddress.includes('.')) {
            const parts = ipAddress.split('.');
            if (parts.length === 4) {
                return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
            }
        }
        // IPv6 anonymization
        if (ipAddress.includes(':')) {
            const parts = ipAddress.split(':');
            if (parts.length >= 4) {
                return `${parts.slice(0, 4).join(':')}::`;
            }
        }
        return this.hashString(ipAddress);
    }
    anonymizeUserAgent(userAgent) {
        // Generalize user agent to browser family and major version
        if (userAgent.includes('Chrome')) {
            const version = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown';
            return `Chrome/${version}`;
        }
        else if (userAgent.includes('Firefox')) {
            const version = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'unknown';
            return `Firefox/${version}`;
        }
        else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            return 'Safari';
        }
        else if (userAgent.includes('Edge')) {
            return 'Edge';
        }
        return 'Unknown Browser';
    }
    anonymizeText(text) {
        return this.detectAndAnonymizePII(text);
    }
    anonymizeResults(results) {
        return results.map(result => {
            if (typeof result === 'object') {
                const anonymized = { ...result };
                // Remove or anonymize potentially sensitive fields
                if (anonymized.url) {
                    anonymized.url = this.anonymizeURL(anonymized.url);
                }
                if (anonymized.title) {
                    anonymized.title = this.detectAndAnonymizePII(anonymized.title);
                }
                if (anonymized.description) {
                    anonymized.description = this.detectAndAnonymizePII(anonymized.description);
                }
                return anonymized;
            }
            return result;
        });
    }
    anonymizeURL(url) {
        try {
            const urlObj = new URL(url);
            // Keep domain and path structure but remove query parameters that might contain PII
            return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
        }
        catch {
            return '[ANONYMIZED_URL]';
        }
    }
    detectAndAnonymizePII(text) {
        let anonymized = text;
        for (const pattern of this.anonymizationConfig.piiPatterns) {
            anonymized = anonymized.replace(pattern, '[ANONYMIZED]');
        }
        return anonymized;
    }
    hashString(input) {
        // Simple hash function (in production, use a proper cryptographic hash)
        const salted = input + this.anonymizationConfig.salt;
        let hash = 0;
        for (let i = 0; i < salted.length; i++) {
            const char = salted.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `hash_${Math.abs(hash).toString(36)}`;
    }
    generateConsentString(categories, method, legalBasis) {
        const granted = Object.entries(categories)
            .filter(([, status]) => status === 'granted')
            .map(([category]) => category)
            .join(',');
        return `consent:${granted};method:${method};basis:${legalBasis};ts:${Date.now()}`;
    }
    async processAccessRequest(request) {
        const dataSubjectId = request.dataSubjectId;
        // Collect all data for the subject
        const consent = this.consentRecords.get(dataSubjectId);
        const processingRecords = this.processingRecords.filter(r => r.dataSubjectId === dataSubjectId);
        const requests = Array.from(this.dataSubjectRequests.values())
            .filter(r => r.dataSubjectId === dataSubjectId);
        const accessData = {
            consent: consent ? {
                categories: consent.categories,
                timestamp: consent.timestamp,
                expiresAt: consent.expiresAt,
                method: consent.method,
                legalBasis: consent.legalBasis
            } : null,
            processingActivities: processingRecords.map(r => ({
                activity: r.activity,
                purpose: r.purpose,
                legalBasis: r.legalBasis,
                timestamp: r.timestamp,
                dataCategories: r.dataCategories
            })),
            requests: requests.map(r => ({
                type: r.type,
                status: r.status,
                requestedAt: r.requestedAt,
                completedAt: r.completedAt
            }))
        };
        request.response = {
            data: accessData,
            action: 'data-provided',
            notes: 'Personal data access request fulfilled'
        };
    }
    async processErasureRequest(request) {
        const dataSubjectId = request.dataSubjectId;
        // Remove consent record
        this.consentRecords.delete(dataSubjectId);
        // Remove processing records (keep for legal/audit purposes but mark as erased)
        const erasedRecords = this.processingRecords.filter(r => r.dataSubjectId === dataSubjectId);
        this.processingRecords = this.processingRecords.filter(r => r.dataSubjectId !== dataSubjectId);
        request.response = {
            action: 'data-erased',
            notes: `Erased ${erasedRecords.length} processing records and consent data`
        };
    }
    async processPortabilityRequest(request) {
        // Similar to access request but in a structured, machine-readable format
        await this.processAccessRequest(request);
        if (request.response?.data) {
            request.response.action = 'data-exported';
            request.response.notes = 'Data exported in portable JSON format';
        }
    }
    async processObjectionRequest(request) {
        const dataSubjectId = request.dataSubjectId;
        // Update consent to object to processing
        if (request.categories) {
            this.withdrawConsent(dataSubjectId, request.categories);
        }
        else {
            // Object to all non-necessary processing
            this.withdrawConsent(dataSubjectId, ['analytics', 'performance', 'functional', 'targeting', 'social']);
        }
        request.response = {
            action: 'objection-processed',
            notes: 'Processing objection recorded, consent withdrawn for specified categories'
        };
    }
    async processRectificationRequest(request) {
        // This would require integration with the data storage system
        // For now, just record the request
        request.response = {
            action: 'rectification-recorded',
            notes: 'Rectification request recorded for manual processing'
        };
    }
    async processRestrictionRequest(request) {
        // Record restriction request
        const dataSubjectId = request.dataSubjectId;
        // Mark processing as restricted (would need to be enforced in data processing)
        this.recordProcessing(dataSubjectId, 'processing-restriction', request.categories?.map(String) || ['all'], 'Data processing restriction requested by subject', 'legal-obligation');
        request.response = {
            action: 'restriction-applied',
            notes: 'Processing restriction recorded and applied'
        };
    }
    calculatePrivacyMetrics() {
        const consents = Array.from(this.consentRecords.values());
        const requests = Array.from(this.dataSubjectRequests.values());
        const now = Date.now();
        // Consent metrics
        const totalRequests = consents.length;
        const grantedConsent = consents.filter(c => Object.values(c.categories).some(status => status === 'granted')).length;
        const deniedConsent = consents.filter(c => Object.values(c.categories).every(status => status === 'denied')).length;
        const withdrawnConsent = consents.filter(c => Object.values(c.categories).some(status => status === 'withdrawn')).length;
        const expiredConsent = consents.filter(c => now > c.expiresAt).length;
        const consentByCategory = {
            necessary: 0,
            analytics: 0,
            performance: 0,
            functional: 0,
            targeting: 0,
            social: 0
        };
        for (const consent of consents) {
            for (const [category, status] of Object.entries(consent.categories)) {
                if (status === 'granted') {
                    consentByCategory[category]++;
                }
            }
        }
        // Processing metrics
        const totalProcessingRecords = this.processingRecords.length;
        const recordsByPurpose = {};
        const recordsByLegalBasis = {};
        let totalRetentionDays = 0;
        for (const record of this.processingRecords) {
            recordsByPurpose[record.purpose] = (recordsByPurpose[record.purpose] || 0) + 1;
            recordsByLegalBasis[record.legalBasis] = (recordsByLegalBasis[record.legalBasis] || 0) + 1;
            totalRetentionDays += (record.retainUntil - record.timestamp) / (24 * 60 * 60 * 1000);
        }
        const averageRetentionPeriod = totalProcessingRecords > 0
            ? totalRetentionDays / totalProcessingRecords
            : 0;
        // Request metrics
        const totalDataRequests = requests.length;
        const requestsByType = {};
        let totalResponseTime = 0;
        let completedRequests = 0;
        for (const request of requests) {
            requestsByType[request.type] = (requestsByType[request.type] || 0) + 1;
            if (request.status === 'completed' && request.completedAt) {
                totalResponseTime += request.completedAt - request.requestedAt;
                completedRequests++;
            }
        }
        const averageResponseTime = completedRequests > 0
            ? totalResponseTime / completedRequests
            : 0;
        const completionRate = totalDataRequests > 0
            ? completedRequests / totalDataRequests
            : 0;
        // Compliance check
        const compliance = this.checkCompliance();
        return {
            consent: {
                totalRequests,
                grantedConsent,
                deniedConsent,
                withdrawnConsent,
                expiredConsent,
                consentByCategory,
                consentRateByRegion: {} // Would need geographic data
            },
            processing: {
                totalRecords: totalProcessingRecords,
                recordsByPurpose,
                recordsByLegalBasis,
                averageRetentionPeriod
            },
            requests: {
                totalRequests: totalDataRequests,
                requestsByType,
                averageResponseTime,
                completionRate
            },
            compliance: {
                score: compliance.score,
                issues: compliance.issues.map(issue => ({
                    type: issue.issue,
                    severity: issue.severity,
                    description: issue.issue,
                    count: 1
                }))
            }
        };
    }
    checkRegulationCompliance(regulation) {
        const issues = [];
        switch (regulation) {
            case 'GDPR':
                issues.push(...this.checkGDPRCompliance());
                break;
            case 'CCPA':
                issues.push(...this.checkCCPACompliance());
                break;
            // Add other regulations as needed
        }
        return issues.map(issue => ({ ...issue, regulation }));
    }
    checkGDPRCompliance() {
        const issues = [];
        // Check if consent is properly obtained
        const consentsWithoutLegalBasis = Array.from(this.consentRecords.values())
            .filter(c => !c.legalBasis);
        if (consentsWithoutLegalBasis.length > 0) {
            issues.push({
                issue: 'Missing legal basis for processing',
                severity: 'critical',
                recommendation: 'Ensure all consent records have a valid legal basis'
            });
        }
        // Check data retention periods
        const longRetentionRecords = this.processingRecords.filter(r => (r.retainUntil - r.timestamp) > (365 * 24 * 60 * 60 * 1000) // > 1 year
        );
        if (longRetentionRecords.length > 0) {
            issues.push({
                issue: 'Data retention periods may be excessive',
                severity: 'medium',
                recommendation: 'Review data retention periods to ensure compliance with data minimization principle'
            });
        }
        // Check if data subject rights are enabled
        if (!this.config.dataSubjectRights.erasure) {
            issues.push({
                issue: 'Right to erasure not enabled',
                severity: 'high',
                recommendation: 'Enable right to erasure to comply with GDPR Article 17'
            });
        }
        return issues;
    }
    checkCCPACompliance() {
        const issues = [];
        // CCPA-specific compliance checks
        if (!this.config.dataSubjectRights.objection) {
            issues.push({
                issue: 'Right to opt-out not enabled',
                severity: 'high',
                recommendation: 'Enable right to object/opt-out to comply with CCPA'
            });
        }
        return issues;
    }
    setupComplianceCheckers() {
        // Set up automated compliance checking functions
        this.complianceCheckers.set('GDPR', (data) => this.checkGDPRCompliance().length === 0);
        this.complianceCheckers.set('CCPA', (data) => this.checkCCPACompliance().length === 0);
    }
}
/**
 * Global privacy manager instance
 */
export const privacyManager = new PrivacyManager();
//# sourceMappingURL=PrivacyManager.js.map