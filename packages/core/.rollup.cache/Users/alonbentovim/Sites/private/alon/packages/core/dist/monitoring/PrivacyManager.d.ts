/**
 * Privacy Manager - Privacy-compliant analytics collection
 * @description GDPR compliance, consent management, data anonymization, and retention policies
 */
/**
 * Privacy regulation types
 */
export type PrivacyRegulation = 'GDPR' | 'CCPA' | 'LGPD' | 'PIPEDA' | 'PDPB';
/**
 * Consent status
 */
export type ConsentStatus = 'granted' | 'denied' | 'pending' | 'withdrawn' | 'expired';
/**
 * Data categories for consent
 */
export type DataCategory = 'necessary' | 'analytics' | 'performance' | 'functional' | 'targeting' | 'social';
/**
 * Privacy configuration
 */
export interface PrivacyConfig {
    /** Applicable regulations */
    regulations: PrivacyRegulation[];
    /** Default consent required */
    requireConsent: boolean;
    /** Consent expiration time in days */
    consentExpirationDays: number;
    /** Data retention period in days */
    dataRetentionDays: number;
    /** Enable data anonymization */
    enableAnonymization: boolean;
    /** Data subject rights */
    dataSubjectRights: {
        /** Enable right to access */
        access: boolean;
        /** Enable right to rectification */
        rectification: boolean;
        /** Enable right to erasure */
        erasure: boolean;
        /** Enable right to portability */
        portability: boolean;
        /** Enable right to object */
        objection: boolean;
    };
    /** Geographic detection */
    geoDetection: {
        enabled: boolean;
        /** IP anonymization for geo detection */
        anonymizeIP: boolean;
        /** Default region if detection fails */
        defaultRegion: string;
    };
}
/**
 * Consent record
 */
export interface ConsentRecord {
    /** Consent ID */
    id: string;
    /** User/session identifier */
    userId: string;
    /** Data categories consented to */
    categories: Record<DataCategory, ConsentStatus>;
    /** Consent timestamp */
    timestamp: number;
    /** Consent expiration */
    expiresAt: number;
    /** Consent method */
    method: 'explicit' | 'implied' | 'legitimate-interest';
    /** User agent */
    userAgent?: string;
    /** IP address (anonymized) */
    ipHash?: string;
    /** Geographic location */
    location?: {
        country?: string;
        region?: string;
    };
    /** Consent string/proof */
    consentString?: string;
    /** Legal basis */
    legalBasis: 'consent' | 'legitimate-interest' | 'contract' | 'legal-obligation' | 'vital-interests' | 'public-task';
}
/**
 * Data processing record
 */
export interface DataProcessingRecord {
    /** Record ID */
    id: string;
    /** Data subject ID */
    dataSubjectId: string;
    /** Processing activity */
    activity: string;
    /** Data categories processed */
    dataCategories: string[];
    /** Processing purpose */
    purpose: string;
    /** Legal basis */
    legalBasis: ConsentRecord['legalBasis'];
    /** Timestamp */
    timestamp: number;
    /** Data retention until */
    retainUntil: number;
    /** Consent reference */
    consentId?: string;
}
/**
 * Data subject request
 */
export interface DataSubjectRequest {
    /** Request ID */
    id: string;
    /** Data subject ID */
    dataSubjectId: string;
    /** Request type */
    type: 'access' | 'rectification' | 'erasure' | 'portability' | 'objection' | 'restriction';
    /** Request status */
    status: 'received' | 'processing' | 'completed' | 'rejected';
    /** Request details */
    details: string;
    /** Requested data categories */
    categories?: DataCategory[];
    /** Request timestamp */
    requestedAt: number;
    /** Response deadline */
    deadline: number;
    /** Completion timestamp */
    completedAt?: number;
    /** Response data */
    response?: {
        data?: any;
        action: string;
        notes?: string;
    };
}
/**
 * Anonymization configuration
 */
export interface AnonymizationConfig {
    /** Enable IP anonymization */
    anonymizeIPs: boolean;
    /** Enable user agent anonymization */
    anonymizeUserAgent: boolean;
    /** Enable query anonymization */
    anonymizeQueries: boolean;
    /** Enable result anonymization */
    anonymizeResults: boolean;
    /** Hash salt for anonymization */
    salt: string;
    /** PII detection patterns */
    piiPatterns: RegExp[];
    /** Replacement strategies */
    replacementStrategies: Record<string, 'hash' | 'remove' | 'pseudonymize' | 'generalize'>;
}
/**
 * Privacy metrics
 */
export interface PrivacyMetrics {
    /** Consent metrics */
    consent: {
        totalRequests: number;
        grantedConsent: number;
        deniedConsent: number;
        withdrawnConsent: number;
        expiredConsent: number;
        consentByCategory: Record<DataCategory, number>;
        consentRateByRegion: Record<string, number>;
    };
    /** Data processing metrics */
    processing: {
        totalRecords: number;
        recordsByPurpose: Record<string, number>;
        recordsByLegalBasis: Record<string, number>;
        averageRetentionPeriod: number;
    };
    /** Data subject requests */
    requests: {
        totalRequests: number;
        requestsByType: Record<string, number>;
        averageResponseTime: number;
        completionRate: number;
    };
    /** Compliance status */
    compliance: {
        score: number;
        issues: Array<{
            type: string;
            severity: 'low' | 'medium' | 'high' | 'critical';
            description: string;
            count: number;
        }>;
    };
}
/**
 * Privacy Manager Implementation
 */
export declare class PrivacyManager {
    private config;
    private anonymizationConfig;
    private consentRecords;
    private processingRecords;
    private dataSubjectRequests;
    private complianceCheckers;
    private metricsCache;
    private metricsCacheTimestamp;
    constructor(config?: Partial<PrivacyConfig>, anonymizationConfig?: Partial<AnonymizationConfig>);
    /**
     * Check if consent is required for user
     */
    requiresConsent(userId: string, category?: DataCategory): boolean;
    /**
     * Record user consent
     */
    recordConsent(userId: string, categories: Partial<Record<DataCategory, ConsentStatus>>, method?: ConsentRecord['method'], legalBasis?: ConsentRecord['legalBasis'], metadata?: Record<string, any>): ConsentRecord;
    /**
     * Check consent status
     */
    checkConsent(userId: string, category: DataCategory): ConsentStatus;
    /**
     * Withdraw consent
     */
    withdrawConsent(userId: string, categories?: DataCategory[]): boolean;
    /**
     * Record data processing activity
     */
    recordProcessing(dataSubjectId: string, activity: string, dataCategories: string[], purpose: string, legalBasis: ConsentRecord['legalBasis'], consentId?: string): DataProcessingRecord;
    /**
     * Anonymize data based on configuration
     */
    anonymizeData(data: Record<string, any>, dataTypes?: string[]): Record<string, any>;
    /**
     * Handle data subject request
     */
    handleDataSubjectRequest(dataSubjectId: string, type: DataSubjectRequest['type'], details: string, categories?: DataCategory[]): DataSubjectRequest;
    /**
     * Process data subject request
     */
    processDataSubjectRequest(requestId: string): Promise<void>;
    /**
     * Get privacy metrics
     */
    getPrivacyMetrics(): PrivacyMetrics;
    /**
     * Check compliance status
     */
    checkCompliance(): {
        isCompliant: boolean;
        score: number;
        issues: Array<{
            regulation: PrivacyRegulation;
            issue: string;
            severity: 'low' | 'medium' | 'high' | 'critical';
            recommendation: string;
        }>;
    };
    /**
     * Clean up expired data
     */
    cleanupExpiredData(): {
        removedConsents: number;
        removedProcessingRecords: number;
        removedRequests: number;
    };
    private initialize;
    private detectUserRegion;
    private isRegulatedRegion;
    private detectLocation;
    private anonymizeIP;
    private anonymizeUserAgent;
    private anonymizeText;
    private anonymizeResults;
    private anonymizeURL;
    private detectAndAnonymizePII;
    private hashString;
    private generateConsentString;
    private processAccessRequest;
    private processErasureRequest;
    private processPortabilityRequest;
    private processObjectionRequest;
    private processRectificationRequest;
    private processRestrictionRequest;
    private calculatePrivacyMetrics;
    private checkRegulationCompliance;
    private checkGDPRCompliance;
    private checkCCPACompliance;
    private setupComplianceCheckers;
}
/**
 * Global privacy manager instance
 */
export declare const privacyManager: PrivacyManager;
//# sourceMappingURL=PrivacyManager.d.ts.map