/**
 * Privacy Types - Type definitions for privacy compliance and data protection
 * @description TypeScript interfaces for GDPR compliance, consent management, and data anonymization
 */

/**
 * Privacy regulation types
 */
export type PrivacyRegulation = 'GDPR' | 'CCPA' | 'LGPD' | 'PIPEDA' | 'PDPB' | 'DPA';

/**
 * Consent status
 */
export type ConsentStatus = 'granted' | 'denied' | 'pending' | 'withdrawn' | 'expired' | 'not_required';

/**
 * Data processing purposes
 */
export type ProcessingPurpose = 
  | 'necessary'
  | 'analytics'
  | 'performance'
  | 'functional'
  | 'targeting'
  | 'social'
  | 'security';

/**
 * Data retention policy
 */
export interface DataRetentionPolicy {
  /** Retention period in days */
  retentionDays: number;
  /** Auto-delete after retention period */
  autoDelete: boolean;
  /** Archive before deletion */
  archiveBeforeDelete: boolean;
  /** Minimum retention period */
  minRetentionDays: number;
  /** Maximum retention period */
  maxRetentionDays: number;
  /** Purpose-specific retention */
  purposeSpecific: Record<ProcessingPurpose, number>;
}

/**
 * Privacy configuration
 */
export interface PrivacyConfig {
  /** Applicable regulations */
  regulations: PrivacyRegulation[];
  /** Default consent requirement */
  requireConsent: boolean;
  /** Consent expiration in days */
  consentExpirationDays: number;
  /** Data retention policy */
  retention: DataRetentionPolicy;
  /** Anonymization settings */
  anonymization: {
    /** Enable data anonymization */
    enabled: boolean;
    /** IP address anonymization */
    anonymizeIp: boolean;
    /** User ID hashing */
    hashUserIds: boolean;
    /** Pseudonymization for analytics */
    pseudonymize: boolean;
  };
  /** Data subject rights */
  dataSubjectRights: {
    /** Right to access personal data */
    access: boolean;
    /** Right to rectification */
    rectification: boolean;
    /** Right to erasure (right to be forgotten) */
    erasure: boolean;
    /** Right to data portability */
    portability: boolean;
    /** Right to restrict processing */
    restriction: boolean;
    /** Right to object to processing */
    objection: boolean;
  };
  /** Cross-border data transfer */
  dataTransfer: {
    /** Enable international transfers */
    allowInternational: boolean;
    /** Approved transfer mechanisms */
    mechanisms: Array<'adequacy_decision' | 'standard_clauses' | 'bcr' | 'certification'>;
    /** Transfer destinations */
    approvedDestinations: string[];
  };
}

/**
 * Consent record
 */
export interface ConsentRecord {
  /** Consent identifier */
  id: string;
  /** User identifier */
  userId: string;
  /** Processing purpose */
  purpose: ProcessingPurpose;
  /** Consent status */
  status: ConsentStatus;
  /** Consent timestamp */
  timestamp: number;
  /** Consent expiration */
  expiresAt?: number;
  /** Consent withdrawal timestamp */
  withdrawnAt?: number;
  /** Consent source/method */
  source: 'explicit' | 'implicit' | 'legitimate_interest' | 'contract' | 'vital_interest';
  /** Legal basis for processing */
  legalBasis: string;
  /** Consent details */
  details: {
    /** User agent when consent given */
    userAgent: string;
    /** IP address (anonymized) */
    ipAddress?: string;
    /** Consent mechanism */
    mechanism: 'banner' | 'checkbox' | 'toggle' | 'opt_in' | 'opt_out';
    /** Additional context */
    context?: Record<string, any>;
  };
}

/**
 * Data processing record
 */
export interface DataProcessingRecord {
  /** Processing identifier */
  id: string;
  /** User identifier */
  userId: string;
  /** Data categories processed */
  dataCategories: string[];
  /** Processing purposes */
  purposes: ProcessingPurpose[];
  /** Legal basis */
  legalBasis: string;
  /** Processing timestamp */
  timestamp: number;
  /** Data retention applied */
  retention: {
    policy: string;
    expiresAt: number;
  };
  /** Anonymization applied */
  anonymization: {
    applied: boolean;
    method?: string;
    timestamp?: number;
  };
}

/**
 * Data subject request
 */
export interface DataSubjectRequest {
  /** Request identifier */
  id: string;
  /** User identifier */
  userId: string;
  /** Request type */
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  /** Request status */
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'expired';
  /** Request timestamp */
  timestamp: number;
  /** Request details */
  details: {
    /** Reason for request */
    reason?: string;
    /** Specific data requested */
    dataRequested?: string[];
    /** Verification method */
    verification: string;
    /** Supporting documents */
    documents?: string[];
  };
  /** Processing timeline */
  timeline: {
    /** Request received */
    received: number;
    /** Processing started */
    started?: number;
    /** Response provided */
    responded?: number;
    /** Request deadline */
    deadline: number;
  };
  /** Response data */
  response?: {
    /** Response message */
    message: string;
    /** Data provided */
    data?: any;
    /** Actions taken */
    actions: string[];
  };
}

/**
 * Privacy impact assessment
 */
export interface PrivacyImpactAssessment {
  /** Assessment identifier */
  id: string;
  /** Processing activity */
  activity: string;
  /** Risk assessment */
  risks: Array<{
    /** Risk category */
    category: 'data_breach' | 'unauthorized_access' | 'profiling' | 'discrimination' | 'identity_theft';
    /** Risk level */
    level: 'low' | 'medium' | 'high' | 'very_high';
    /** Risk description */
    description: string;
    /** Mitigation measures */
    mitigation: string[];
  }>;
  /** Necessity assessment */
  necessity: {
    /** Is processing necessary */
    necessary: boolean;
    /** Justification */
    justification: string;
    /** Alternative approaches considered */
    alternatives: string[];
  };
  /** Proportionality assessment */
  proportionality: {
    /** Is processing proportional */
    proportional: boolean;
    /** Data minimization applied */
    dataMinimization: boolean;
    /** Purpose limitation applied */
    purposeLimitation: boolean;
  };
  /** Assessment date */
  assessmentDate: number;
  /** Review date */
  reviewDate: number;
  /** Assessor */
  assessor: string;
}

/**
 * Privacy manager interface
 */
export interface IPrivacyManager {
  /** Initialize privacy manager */
  init(config: PrivacyConfig): Promise<void>;
  
  /** Record consent */
  recordConsent(consent: Omit<ConsentRecord, 'id' | 'timestamp'>): Promise<string>;
  
  /** Check consent status */
  checkConsent(userId: string, purpose: ProcessingPurpose): Promise<ConsentStatus>;
  
  /** Withdraw consent */
  withdrawConsent(userId: string, purpose: ProcessingPurpose): Promise<void>;
  
  /** Anonymize data */
  anonymizeData(data: any, options?: {
    preserveUtility?: boolean;
    method?: 'hashing' | 'pseudonymization' | 'generalization' | 'suppression';
  }): any;
  
  /** Handle data subject request */
  handleDataSubjectRequest(request: Omit<DataSubjectRequest, 'id' | 'timestamp' | 'status' | 'timeline'>): Promise<string>;
  
  /** Get user data for portability */
  getUserData(userId: string): Promise<any>;
  
  /** Delete user data */
  deleteUserData(userId: string, soft?: boolean): Promise<void>;
  
  /** Apply data retention policy */
  applyRetentionPolicy(): Promise<{
    deleted: number;
    archived: number;
    errors: string[];
  }>;
  
  /** Generate privacy report */
  generatePrivacyReport(timeRange?: { start: number; end: number }): Promise<{
    consents: { total: number; granted: number; denied: number; expired: number };
    requests: { total: number; pending: number; completed: number };
    retentionActions: { deleted: number; archived: number };
    complianceScore: number;
  }>;
}

/**
 * Anonymization result
 */
export interface AnonymizationResult {
  /** Original data hash */
  originalHash: string;
  /** Anonymized data */
  anonymizedData: any;
  /** Anonymization method used */
  method: string;
  /** Utility preserved */
  utilityPreserved: boolean;
  /** Privacy risk level */
  privacyRisk: 'low' | 'medium' | 'high';
  /** Reversibility */
  reversible: boolean;
}

/**
 * GDPR compliance status
 */
export interface GDPRComplianceStatus {
  /** Overall compliance score (0-100) */
  score: number;
  /** Compliance by article */
  articles: Record<string, {
    compliant: boolean;
    score: number;
    issues: string[];
    recommendations: string[];
  }>;
  /** Last assessment date */
  lastAssessment: number;
  /** Next assessment due */
  nextAssessment: number;
  /** Critical issues */
  criticalIssues: string[];
  /** Improvement recommendations */
  recommendations: string[];
}

/**
 * Cross-border transfer record
 */
export interface CrossBorderTransferRecord {
  /** Transfer identifier */
  id: string;
  /** User identifier */
  userId: string;
  /** Source country */
  sourceCountry: string;
  /** Destination country */
  destinationCountry: string;
  /** Transfer mechanism */
  mechanism: 'adequacy_decision' | 'standard_clauses' | 'bcr' | 'certification' | 'derogation';
  /** Data categories transferred */
  dataCategories: string[];
  /** Transfer purpose */
  purpose: string;
  /** Transfer timestamp */
  timestamp: number;
  /** Legal basis */
  legalBasis: string;
  /** Safeguards applied */
  safeguards: string[];
}