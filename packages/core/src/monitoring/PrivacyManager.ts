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
export type DataCategory = 
  | 'necessary'
  | 'analytics'
  | 'performance'
  | 'functional'
  | 'targeting'
  | 'social';

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
 * Default privacy configuration
 */
const DEFAULT_CONFIG: PrivacyConfig = {
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
const DEFAULT_ANONYMIZATION: AnonymizationConfig = {
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
  private config: PrivacyConfig;
  private anonymizationConfig: AnonymizationConfig;
  private consentRecords: Map<string, ConsentRecord> = new Map();
  private processingRecords: DataProcessingRecord[] = [];
  private dataSubjectRequests: Map<string, DataSubjectRequest> = new Map();
  private complianceCheckers: Map<PrivacyRegulation, (data: any) => boolean> = new Map();
  private metricsCache: PrivacyMetrics | null = null;
  private metricsCacheTimestamp: number = 0;

  constructor(
    config: Partial<PrivacyConfig> = {},
    anonymizationConfig: Partial<AnonymizationConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.anonymizationConfig = { ...DEFAULT_ANONYMIZATION, ...anonymizationConfig };
    this.initialize();
  }

  /**
   * Check if consent is required for user
   */
  requiresConsent(userId: string, category: DataCategory = 'analytics'): boolean {
    if (!this.config.requireConsent) return false;

    // Check if in a regulated region
    const userRegion = this.detectUserRegion(userId);
    const requiresConsent = this.isRegulatedRegion(userRegion);

    // Necessary data processing doesn't require consent under most regulations
    if (category === 'necessary') return false;

    return requiresConsent;
  }

  /**
   * Record user consent
   */
  recordConsent(
    userId: string,
    categories: Partial<Record<DataCategory, ConsentStatus>>,
    method: ConsentRecord['method'] = 'explicit',
    legalBasis: ConsentRecord['legalBasis'] = 'consent',
    metadata: Record<string, any> = {}
  ): ConsentRecord {
    const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const expiresAt = now + (this.config.consentExpirationDays * 24 * 60 * 60 * 1000);

    // Fill in missing categories with default status
    const fullCategories: Record<DataCategory, ConsentStatus> = {
      necessary: 'granted', // Always granted for necessary processing
      analytics: categories.analytics || 'pending',
      performance: categories.performance || 'pending',
      functional: categories.functional || 'pending',
      targeting: categories.targeting || 'pending',
      social: categories.social || 'pending'
    };

    const consentRecord: ConsentRecord = {
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
  checkConsent(userId: string, category: DataCategory): ConsentStatus {
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
  withdrawConsent(userId: string, categories?: DataCategory[]): boolean {
    const consent = this.consentRecords.get(userId);
    if (!consent) return false;

    const categoriesToWithdraw = categories || Object.keys(consent.categories) as DataCategory[];
    
    for (const category of categoriesToWithdraw) {
      if (category !== 'necessary') { // Cannot withdraw necessary consent
        consent.categories[category] = 'withdrawn';
      }
    }

    consent.timestamp = Date.now();
    this.metricsCache = null;

    // Record data processing for withdrawal
    this.recordProcessing(
      userId,
      'consent-withdrawal',
      categoriesToWithdraw,
      'Consent withdrawn by user',
      'consent',
      consent.id
    );

    return true;
  }

  /**
   * Record data processing activity
   */
  recordProcessing(
    dataSubjectId: string,
    activity: string,
    dataCategories: string[],
    purpose: string,
    legalBasis: ConsentRecord['legalBasis'],
    consentId?: string
  ): DataProcessingRecord {
    const recordId = `processing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const retainUntil = now + (this.config.dataRetentionDays * 24 * 60 * 60 * 1000);

    const record: DataProcessingRecord = {
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
  anonymizeData(data: Record<string, any>, dataTypes?: string[]): Record<string, any> {
    if (!this.config.enableAnonymization) return data;

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
  handleDataSubjectRequest(
    dataSubjectId: string,
    type: DataSubjectRequest['type'],
    details: string,
    categories?: DataCategory[]
  ): DataSubjectRequest {
    const requestId = `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const deadline = now + (30 * 24 * 60 * 60 * 1000); // 30 days as per GDPR

    const request: DataSubjectRequest = {
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
  async processDataSubjectRequest(requestId: string): Promise<void> {
    const request = this.dataSubjectRequests.get(requestId);
    if (!request || request.status !== 'received') return;

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
    } catch (error) {
      request.status = 'rejected';
      request.completedAt = Date.now();
      request.response = {
        action: 'rejected',
        notes: `Error processing request: ${(error as Error).message || 'Unknown error'}`
      };
    }
  }

  /**
   * Get privacy metrics
   */
  getPrivacyMetrics(): PrivacyMetrics {
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
  checkCompliance(): {
    isCompliant: boolean;
    score: number;
    issues: Array<{
      regulation: PrivacyRegulation;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      recommendation: string;
    }>;
  } {
    const issues: any[] = [];
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
  cleanupExpiredData(): {
    removedConsents: number;
    removedProcessingRecords: number;
    removedRequests: number;
  } {
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

  private initialize(): void {
    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupExpiredData();
    }, 24 * 60 * 60 * 1000); // Run daily

    // Initialize compliance checkers
    this.setupComplianceCheckers();
  }

  private detectUserRegion(userId: string): string {
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

  private isRegulatedRegion(region: string): boolean {
    const regulatedRegions: Record<PrivacyRegulation, string[]> = {
      GDPR: ['EU', 'EEA', 'GB'],
      CCPA: ['US-CA'],
      LGPD: ['BR'],
      PIPEDA: ['CA'],
      PDPB: ['SG']
    };

    return this.config.regulations.some(regulation =>
      regulatedRegions[regulation]?.includes(region)
    );
  }

  private detectLocation(ipAddress?: string): { country?: string; region?: string } | undefined {
    if (!ipAddress || !this.config.geoDetection.enabled) return undefined;

    // Simplified location detection
    // In production, use a proper geolocation service
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('172.')) {
      return { country: 'local', region: 'local' };
    }

    // Default to EU for privacy-safe defaults
    return { country: 'EU', region: 'EU' };
  }

  private anonymizeIP(ipAddress: string): string {
    if (!ipAddress) return '';

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

  private anonymizeUserAgent(userAgent: string): string {
    // Generalize user agent to browser family and major version
    if (userAgent.includes('Chrome')) {
      const version = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown';
      return `Chrome/${version}`;
    } else if (userAgent.includes('Firefox')) {
      const version = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'unknown';
      return `Firefox/${version}`;
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return 'Safari';
    } else if (userAgent.includes('Edge')) {
      return 'Edge';
    }
    
    return 'Unknown Browser';
  }

  private anonymizeText(text: string): string {
    return this.detectAndAnonymizePII(text);
  }

  private anonymizeResults(results: any[]): any[] {
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

  private anonymizeURL(url: string): string {
    try {
      const urlObj = new URL(url);
      // Keep domain and path structure but remove query parameters that might contain PII
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return '[ANONYMIZED_URL]';
    }
  }

  private detectAndAnonymizePII(text: string): string {
    let anonymized = text;

    for (const pattern of this.anonymizationConfig.piiPatterns) {
      anonymized = anonymized.replace(pattern, '[ANONYMIZED]');
    }

    return anonymized;
  }

  private hashString(input: string): string {
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

  private generateConsentString(
    categories: Record<DataCategory, ConsentStatus>,
    method: ConsentRecord['method'],
    legalBasis: ConsentRecord['legalBasis']
  ): string {
    const granted = Object.entries(categories)
      .filter(([, status]) => status === 'granted')
      .map(([category]) => category)
      .join(',');

    return `consent:${granted};method:${method};basis:${legalBasis};ts:${Date.now()}`;
  }

  private async processAccessRequest(request: DataSubjectRequest): Promise<void> {
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

  private async processErasureRequest(request: DataSubjectRequest): Promise<void> {
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

  private async processPortabilityRequest(request: DataSubjectRequest): Promise<void> {
    // Similar to access request but in a structured, machine-readable format
    await this.processAccessRequest(request);
    
    if (request.response?.data) {
      request.response.action = 'data-exported';
      request.response.notes = 'Data exported in portable JSON format';
    }
  }

  private async processObjectionRequest(request: DataSubjectRequest): Promise<void> {
    const dataSubjectId = request.dataSubjectId;
    
    // Update consent to object to processing
    if (request.categories) {
      this.withdrawConsent(dataSubjectId, request.categories);
    } else {
      // Object to all non-necessary processing
      this.withdrawConsent(dataSubjectId, ['analytics', 'performance', 'functional', 'targeting', 'social']);
    }
    
    request.response = {
      action: 'objection-processed',
      notes: 'Processing objection recorded, consent withdrawn for specified categories'
    };
  }

  private async processRectificationRequest(request: DataSubjectRequest): Promise<void> {
    // This would require integration with the data storage system
    // For now, just record the request
    request.response = {
      action: 'rectification-recorded',
      notes: 'Rectification request recorded for manual processing'
    };
  }

  private async processRestrictionRequest(request: DataSubjectRequest): Promise<void> {
    // Record restriction request
    const dataSubjectId = request.dataSubjectId;
    
    // Mark processing as restricted (would need to be enforced in data processing)
    this.recordProcessing(
      dataSubjectId,
      'processing-restriction',
      request.categories?.map(String) || ['all'],
      'Data processing restriction requested by subject',
      'legal-obligation'
    );
    
    request.response = {
      action: 'restriction-applied',
      notes: 'Processing restriction recorded and applied'
    };
  }

  private calculatePrivacyMetrics(): PrivacyMetrics {
    const consents = Array.from(this.consentRecords.values());
    const requests = Array.from(this.dataSubjectRequests.values());
    const now = Date.now();

    // Consent metrics
    const totalRequests = consents.length;
    const grantedConsent = consents.filter(c => 
      Object.values(c.categories).some(status => status === 'granted')
    ).length;
    const deniedConsent = consents.filter(c => 
      Object.values(c.categories).every(status => status === 'denied')
    ).length;
    const withdrawnConsent = consents.filter(c => 
      Object.values(c.categories).some(status => status === 'withdrawn')
    ).length;
    const expiredConsent = consents.filter(c => now > c.expiresAt).length;

    const consentByCategory: Record<DataCategory, number> = {
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
          consentByCategory[category as DataCategory]++;
        }
      }
    }

    // Processing metrics
    const totalProcessingRecords = this.processingRecords.length;
    const recordsByPurpose: Record<string, number> = {};
    const recordsByLegalBasis: Record<string, number> = {};
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
    const requestsByType: Record<string, number> = {};
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

  private checkRegulationCompliance(regulation: PrivacyRegulation): Array<{
    regulation: PrivacyRegulation;
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  }> {
    const issues: any[] = [];

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

  private checkGDPRCompliance(): Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  }> {
    const issues: any[] = [];

    // Check if consent is properly obtained
    const consentsWithoutLegalBasis = Array.from(this.consentRecords.values())
      .filter(c => !c.legalBasis);
    
    if (consentsWithoutLegalBasis.length > 0) {
      issues.push({
        issue: 'Missing legal basis for processing',
        severity: 'critical' as const,
        recommendation: 'Ensure all consent records have a valid legal basis'
      });
    }

    // Check data retention periods
    const longRetentionRecords = this.processingRecords.filter(r => 
      (r.retainUntil - r.timestamp) > (365 * 24 * 60 * 60 * 1000) // > 1 year
    );

    if (longRetentionRecords.length > 0) {
      issues.push({
        issue: 'Data retention periods may be excessive',
        severity: 'medium' as const,
        recommendation: 'Review data retention periods to ensure compliance with data minimization principle'
      });
    }

    // Check if data subject rights are enabled
    if (!this.config.dataSubjectRights.erasure) {
      issues.push({
        issue: 'Right to erasure not enabled',
        severity: 'high' as const,
        recommendation: 'Enable right to erasure to comply with GDPR Article 17'
      });
    }

    return issues;
  }

  private checkCCPACompliance(): Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  }> {
    const issues: any[] = [];

    // CCPA-specific compliance checks
    if (!this.config.dataSubjectRights.objection) {
      issues.push({
        issue: 'Right to opt-out not enabled',
        severity: 'high' as const,
        recommendation: 'Enable right to object/opt-out to comply with CCPA'
      });
    }

    return issues;
  }

  private setupComplianceCheckers(): void {
    // Set up automated compliance checking functions
    this.complianceCheckers.set('GDPR', (data) => this.checkGDPRCompliance().length === 0);
    this.complianceCheckers.set('CCPA', (data) => this.checkCCPACompliance().length === 0);
  }
}

/**
 * Global privacy manager instance
 */
export const privacyManager = new PrivacyManager();