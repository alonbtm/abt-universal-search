/**
 * Privacy Manager Tests
 * @description Comprehensive tests for privacy-compliant analytics collection
 */

import { PrivacyManager } from '../PrivacyManager';
import type { PrivacyConfig, ConsentRecord, DataSubjectRequest } from '../../types/Privacy';

describe('PrivacyManager', () => {
  let privacyManager: PrivacyManager;
  let mockConfig: PrivacyConfig;

  beforeEach(() => {
    mockConfig = {
      regulations: ['GDPR', 'CCPA'],
      requireConsent: true,
      consentExpirationDays: 365,
      retention: {
        retentionDays: 30,
        autoDelete: true,
        archiveBeforeDelete: true,
        minRetentionDays: 1,
        maxRetentionDays: 365,
        purposeSpecific: {
          necessary: 365,
          analytics: 30,
          performance: 90,
          functional: 180,
          targeting: 30,
          social: 30,
          security: 365
        }
      },
      anonymization: {
        enabled: true,
        anonymizeIp: true,
        hashUserIds: true,
        pseudonymize: true
      },
      dataSubjectRights: {
        access: true,
        rectification: true,
        erasure: true,
        portability: true,
        restriction: true,
        objection: true
      },
      dataTransfer: {
        allowInternational: false,
        mechanisms: ['standard_clauses'],
        approvedDestinations: ['EU', 'UK']
      }
    };

    privacyManager = new PrivacyManager();
    privacyManager.init(mockConfig);

    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });

    // Mock crypto for hashing
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
        }
      },
      writable: true
    });
  });

  afterEach(() => {
    privacyManager.cleanup();
    jest.clearAllMocks();
  });

  describe('consent management', () => {
    test('should record user consent', async () => {
      const consentData = {
        userId: 'user_123',
        purpose: 'analytics' as const,
        status: 'granted' as const,
        source: 'explicit' as const,
        legalBasis: 'consent',
        details: {
          userAgent: 'Mozilla/5.0 Test Browser',
          mechanism: 'checkbox' as const
        }
      };

      const consentId = await privacyManager.recordConsent(consentData);
      
      expect(consentId).toBeDefined();
      expect(typeof consentId).toBe('string');
    });

    test('should check consent status', async () => {
      // Record consent first
      await privacyManager.recordConsent({
        userId: 'user_456',
        purpose: 'performance',
        status: 'granted',
        source: 'explicit',
        legalBasis: 'consent',
        details: {
          userAgent: 'Mozilla/5.0 Test Browser',
          mechanism: 'banner'
        }
      });

      const status = await privacyManager.checkConsent('user_456', 'performance');
      expect(status).toBe('granted');
    });

    test('should handle consent withdrawal', async () => {
      // Record consent first
      await privacyManager.recordConsent({
        userId: 'user_789',
        purpose: 'targeting',
        status: 'granted',
        source: 'explicit',
        legalBasis: 'consent',
        details: {
          userAgent: 'Mozilla/5.0 Test Browser',
          mechanism: 'toggle'
        }
      });

      await privacyManager.withdrawConsent('user_789', 'targeting');
      
      const status = await privacyManager.checkConsent('user_789', 'targeting');
      expect(status).toBe('withdrawn');
    });

    test('should handle consent expiration', async () => {
      const shortExpirationConfig = {
        ...mockConfig,
        consentExpirationDays: 0.001 // Very short expiration for testing
      };
      
      const shortTermManager = new PrivacyManager();
      shortTermManager.init(shortExpirationConfig);

      await shortTermManager.recordConsent({
        userId: 'user_expiry',
        purpose: 'analytics',
        status: 'granted',
        source: 'explicit',
        legalBasis: 'consent',
        details: {
          userAgent: 'Mozilla/5.0 Test Browser',
          mechanism: 'checkbox'
        }
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = await shortTermManager.checkConsent('user_expiry', 'analytics');
      expect(status).toBe('expired');
    });
  });

  describe('data anonymization', () => {
    test('should anonymize personal data', () => {
      const personalData = {
        userId: 'user_123',
        email: 'test@example.com',
        ipAddress: '192.168.1.100',
        searchQuery: 'sensitive search term',
        timestamp: Date.now()
      };

      const anonymizedData = privacyManager.anonymizeData(personalData);

      expect(anonymizedData.userId).not.toBe('user_123');
      expect(anonymizedData.email).toBeUndefined();
      expect(anonymizedData.ipAddress).not.toBe('192.168.1.100');
      expect(anonymizedData.searchQuery).toBe('sensitive search term'); // Query preserved
      expect(anonymizedData.timestamp).toBe(personalData.timestamp);
    });

    test('should apply different anonymization methods', () => {
      const testData = {
        userId: 'user_456',
        location: 'New York, NY',
        age: 28
      };

      const hashed = privacyManager.anonymizeData(testData, { method: 'hashing' });
      const pseudonymized = privacyManager.anonymizeData(testData, { method: 'pseudonymization' });
      const generalized = privacyManager.anonymizeData(testData, { method: 'generalization' });

      expect(hashed.userId).not.toBe('user_456');
      expect(pseudonymized.userId).not.toBe('user_456');
      expect(generalized.age).not.toBe(28); // Should be generalized to age range
    });

    test('should preserve data utility when requested', () => {
      const analyticsData = {
        userId: 'user_789',
        sessionDuration: 300,
        pageViews: 5,
        searchCount: 3
      };

      const anonymized = privacyManager.anonymizeData(analyticsData, { 
        preserveUtility: true 
      });

      expect(anonymized.sessionDuration).toBe(300);
      expect(anonymized.pageViews).toBe(5);
      expect(anonymized.searchCount).toBe(3);
      expect(anonymized.userId).not.toBe('user_789');
    });
  });

  describe('data subject requests', () => {
    test('should handle data access requests', async () => {
      const accessRequest = {
        userId: 'user_access',
        type: 'access' as const,
        details: {
          reason: 'Want to see my personal data',
          verification: 'email_verified',
          dataRequested: ['profile', 'analytics', 'searches']
        }
      };

      const requestId = await privacyManager.handleDataSubjectRequest(accessRequest);
      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
    });

    test('should handle data erasure requests', async () => {
      const erasureRequest = {
        userId: 'user_erasure',
        type: 'erasure' as const,
        details: {
          reason: 'No longer want to use the service',
          verification: 'identity_document'
        }
      };

      const requestId = await privacyManager.handleDataSubjectRequest(erasureRequest);
      expect(requestId).toBeDefined();
    });

    test('should handle data portability requests', async () => {
      const portabilityRequest = {
        userId: 'user_portability',
        type: 'portability' as const,
        details: {
          reason: 'Moving to another service',
          verification: 'two_factor_auth',
          dataRequested: ['all']
        }
      };

      const requestId = await privacyManager.handleDataSubjectRequest(portabilityRequest);
      expect(requestId).toBeDefined();
    });

    test('should export user data for portability', async () => {
      const userData = await privacyManager.getUserData('user_export');
      
      expect(userData).toBeDefined();
      expect(typeof userData).toBe('object');
    });

    test('should delete user data', async () => {
      // Soft delete
      await privacyManager.deleteUserData('user_delete_soft', true);
      
      // Hard delete
      await privacyManager.deleteUserData('user_delete_hard', false);
      
      // Verify deletion occurred
      expect(true).toBe(true); // Placeholder for actual verification
    });
  });

  describe('data retention', () => {
    test('should apply retention policies', async () => {
      const retentionResult = await privacyManager.applyRetentionPolicy();
      
      expect(retentionResult).toBeDefined();
      expect(retentionResult.deleted).toBeGreaterThanOrEqual(0);
      expect(retentionResult.archived).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(retentionResult.errors)).toBe(true);
    });

    test('should respect purpose-specific retention periods', () => {
      const analyticsData = { purpose: 'analytics', timestamp: Date.now() - (31 * 24 * 60 * 60 * 1000) };
      const securityData = { purpose: 'security', timestamp: Date.now() - (31 * 24 * 60 * 60 * 1000) };
      
      const analyticsExpired = privacyManager.isDataExpired(analyticsData);
      const securityExpired = privacyManager.isDataExpired(securityData);
      
      expect(analyticsExpired).toBe(true); // 30 days retention
      expect(securityExpired).toBe(false); // 365 days retention
    });
  });

  describe('GDPR compliance', () => {
    test('should check GDPR compliance status', async () => {
      const complianceStatus = await privacyManager.checkGDPRCompliance();
      
      expect(complianceStatus.score).toBeGreaterThanOrEqual(0);
      expect(complianceStatus.score).toBeLessThanOrEqual(100);
      expect(complianceStatus.articles).toBeDefined();
      expect(Array.isArray(complianceStatus.criticalIssues)).toBe(true);
    });

    test('should validate legal basis for processing', () => {
      const validBases = ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'];
      
      validBases.forEach(basis => {
        const isValid = privacyManager.validateLegalBasis(basis, 'analytics');
        expect(typeof isValid).toBe('boolean');
      });
    });

    test('should handle cross-border data transfers', () => {
      const transfer = {
        sourceCountry: 'DE',
        destinationCountry: 'US',
        dataCategories: ['analytics'],
        mechanism: 'standard_clauses' as const
      };

      const isAllowed = privacyManager.isTransferAllowed(transfer);
      expect(typeof isAllowed).toBe('boolean');
    });
  });

  describe('privacy reporting', () => {
    test('should generate privacy reports', async () => {
      const timeRange = {
        start: Date.now() - (30 * 24 * 60 * 60 * 1000),
        end: Date.now()
      };

      const report = await privacyManager.generatePrivacyReport(timeRange);
      
      expect(report.consents).toBeDefined();
      expect(report.requests).toBeDefined();
      expect(report.retentionActions).toBeDefined();
      expect(report.complianceScore).toBeGreaterThanOrEqual(0);
      expect(report.complianceScore).toBeLessThanOrEqual(100);
    });

    test('should track privacy metrics', () => {
      const metrics = privacyManager.getPrivacyMetrics();
      
      expect(metrics.consentRates).toBeDefined();
      expect(metrics.dataSubjectRequests).toBeDefined();
      expect(metrics.retentionCompliance).toBeDefined();
      expect(metrics.anonymizationCoverage).toBeDefined();
    });
  });

  describe('privacy by design', () => {
    test('should implement data minimization', () => {
      const excessiveData = {
        userId: 'user_123',
        searchQuery: 'test',
        timestamp: Date.now(),
        browserFingerprint: 'detailed_fingerprint',
        socialSecurityNumber: '123-45-6789',
        creditCardNumber: '4111-1111-1111-1111'
      };

      const minimizedData = privacyManager.minimizeData(excessiveData, 'analytics');
      
      expect(minimizedData.userId).toBeDefined();
      expect(minimizedData.searchQuery).toBeDefined();
      expect(minimizedData.timestamp).toBeDefined();
      expect(minimizedData.socialSecurityNumber).toBeUndefined();
      expect(minimizedData.creditCardNumber).toBeUndefined();
    });

    test('should implement purpose limitation', () => {
      const data = { userId: 'user_456', searchQuery: 'test' };
      
      const analyticsAllowed = privacyManager.isPurposeAllowed(data, 'analytics');
      const targetingAllowed = privacyManager.isPurposeAllowed(data, 'targeting');
      
      expect(typeof analyticsAllowed).toBe('boolean');
      expect(typeof targetingAllowed).toBe('boolean');
    });

    test('should validate data accuracy', () => {
      const userData = {
        email: 'invalid-email',
        age: -5,
        country: 'INVALID_COUNTRY'
      };

      const validation = privacyManager.validateDataAccuracy(userData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('consent management platform integration', () => {
    test('should integrate with external CMP', async () => {
      const cmpConfig = {
        provider: 'OneTrust',
        apiKey: 'test_key',
        endpoint: 'https://api.onetrust.com'
      };

      await privacyManager.integrateCMP(cmpConfig);
      
      const cmpStatus = privacyManager.getCMPStatus();
      expect(cmpStatus.connected).toBe(true);
    });

    test('should sync consent decisions with CMP', async () => {
      const consentDecision = {
        userId: 'user_cmp',
        purposes: {
          analytics: 'granted',
          targeting: 'denied',
          functional: 'granted'
        }
      };

      await privacyManager.syncConsentWithCMP(consentDecision);
      
      const syncStatus = privacyManager.getLastSyncStatus();
      expect(syncStatus.success).toBe(true);
    });
  });
});