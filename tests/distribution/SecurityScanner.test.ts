/**
 * SecurityScanner Tests
 * Tests for automated vulnerability scanning and dependency management
 */

import { SecurityScanner } from '../../tools/security/SecurityScanner';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

jest.mock('fs');
jest.mock('child_process');

describe('SecurityScanner', () => {
  let securityScanner: SecurityScanner;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      projectPath: '/test/project',
      scanTypes: ['dependencies', 'code', 'secrets', 'licenses'],
      severity: 'moderate',
      autoFix: false
    };

    securityScanner = new SecurityScanner(mockConfig);

    // Mock fs functions
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      name: 'test-package',
      version: '1.0.0',
      dependencies: {
        'lodash': '^4.17.21',
        'express': '^4.18.0'
      }
    }));
  });

  describe('Dependency Scanning', () => {
    it('should scan dependencies for vulnerabilities', async () => {
      const mockAuditResult = {
        vulnerabilities: {
          'lodash': {
            id: 'GHSA-1234',
            title: 'Prototype Pollution in lodash',
            severity: 'high',
            range: '>=1.0.0 <4.17.21',
            fixAvailable: { version: '4.17.21' },
            overview: 'Lodash versions prior to 4.17.21 are vulnerable to prototype pollution',
            cwe: ['CWE-1321'],
            cvss: { score: 7.5 },
            references: ['https://github.com/advisories/GHSA-1234']
          }
        }
      };

      (execSync as jest.Mock).mockReturnValue(JSON.stringify(mockAuditResult));

      const vulnerabilities = await securityScanner.scanDependencies();

      expect(vulnerabilities).toHaveLength(1);
      expect(vulnerabilities).toBeDefined();
      expect(vulnerabilities[0]).toBeDefined();
      expect(vulnerabilities[0]?.package).toBe('lodash');
      expect(vulnerabilities[0]?.severity).toBe('high');
      expect(vulnerabilities[0]?.title).toBe('Prototype Pollution in lodash');
      expect(vulnerabilities[0]?.patchedIn).toBe('4.17.21');
    });

    it('should filter vulnerabilities by severity threshold', async () => {
      const lowSeverityScanner = new SecurityScanner({
        ...mockConfig,
        severity: 'high'
      });

      const mockAuditResult = {
        vulnerabilities: {
          'package1': { severity: 'low', title: 'Low severity issue' },
          'package2': { severity: 'moderate', title: 'Moderate severity issue' },
          'package3': { severity: 'high', title: 'High severity issue' }
        }
      };

      (execSync as jest.Mock).mockReturnValue(JSON.stringify(mockAuditResult));

      const vulnerabilities = await lowSeverityScanner.scanDependencies();

      expect(vulnerabilities).toHaveLength(1);
      expect(vulnerabilities[0]?.severity).toBe('high');
    });

    it('should handle npm audit failures gracefully', async () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('npm audit failed');
      });

      const vulnerabilities = await securityScanner.scanDependencies();

      expect(vulnerabilities).toHaveLength(0);
    });
  });

  describe('Secret Scanning', () => {
    it('should detect API keys in files', async () => {
      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('.env')) {
          return 'API_KEY=sk_test_1234567890abcdef1234567890abcdef';
        }
        return '{}';
      });

      const secrets = await securityScanner.scanForSecrets();

      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets[0]?.type).toBe('API Key');
      expect(secrets[0]?.confidence).toBe('medium');
    });

    it('should detect JWT tokens', async () => {
      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('config.js')) {
          return 'const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";';
        }
        return '{}';
      });

      const secrets = await securityScanner.scanForSecrets();

      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets[0]?.type).toBe('JWT Token');
      expect(secrets[0]?.confidence).toBe('high');
    });

    it('should detect private keys', async () => {
      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('src/index.js')) {
          return `
            const privateKey = \`-----BEGIN RSA PRIVATE KEY-----
            MIIEpAIBAAKCAQEA1234567890abcdef...
            -----END RSA PRIVATE KEY-----\`;
          `;
        }
        return '{}';
      });

      const secrets = await securityScanner.scanForSecrets();

      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets[0]?.type).toBe('Private Key');
      expect(secrets[0]?.confidence).toBe('high');
    });

    it('should handle file read errors gracefully', async () => {
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error');
      });

      const secrets = await securityScanner.scanForSecrets();

      expect(secrets).toHaveLength(0);
    });
  });

  describe('License Scanning', () => {
    it('should detect problematic licenses', async () => {
      const mockLsResult = {
        dependencies: {
          'gpl-package': {
            license: 'GPL-3.0',
            dependencies: {}
          },
          'mit-package': {
            license: 'MIT',
            dependencies: {}
          },
          'unknown-package': {
            license: 'UNKNOWN',
            dependencies: {}
          }
        }
      };

      (execSync as jest.Mock).mockReturnValue(JSON.stringify(mockLsResult));

      const issues = await securityScanner.scanLicenses();

      expect(issues.length).toBeGreaterThan(0);
      
      const gplIssue = issues.find(i => i.package === 'gpl-package');
      expect(gplIssue).toBeDefined();
      expect(gplIssue?.severity).toBe('error');
      expect(gplIssue?.reason).toContain('Copyleft license');

      const unknownIssue = issues.find(i => i.package === 'unknown-package');
      expect(unknownIssue).toBeDefined();
      expect(unknownIssue?.severity).toBe('warning');
    });

    it('should handle nested dependencies', async () => {
      const mockLsResult = {
        dependencies: {
          'parent-package': {
            license: 'MIT',
            dependencies: {
              'nested-gpl': {
                license: 'GPL-3.0',
                dependencies: {}
              }
            }
          }
        }
      };

      (execSync as jest.Mock).mockReturnValue(JSON.stringify(mockLsResult));

      const issues = await securityScanner.scanLicenses();

      expect(issues.some(i => i.package === 'nested-gpl')).toBe(true);
    });
  });

  describe('Code Security Scanning', () => {
    it('should detect eval() usage', async () => {
      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('src/')) {
          return 'const result = eval(userInput);';
        }
        return '';
      });

      const vulnerabilities = await securityScanner.scanCode();

      expect(vulnerabilities.length).toBeGreaterThan(0);
      expect(vulnerabilities[0]?.title).toBe('Use of eval() function');
      expect(vulnerabilities[0]?.severity).toBe('high');
    });

    it('should detect innerHTML usage', async () => {
      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('src/')) {
          return 'element.innerHTML = userContent;';
        }
        return '';
      });

      const vulnerabilities = await securityScanner.scanCode();

      expect(vulnerabilities.length).toBeGreaterThan(0);
      expect(vulnerabilities[0]?.title).toBe('Use of innerHTML');
      expect(vulnerabilities[0]?.severity).toBe('moderate');
    });

    it('should detect document.write usage', async () => {
      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('src/')) {
          return 'document.write("<script>" + userScript + "</script>");';
        }
        return '';
      });

      const vulnerabilities = await securityScanner.scanCode();

      expect(vulnerabilities.length).toBeGreaterThan(0);
      expect(vulnerabilities[0]?.title).toBe('Use of document.write');
      expect(vulnerabilities[0]?.severity).toBe('moderate');
    });
  });

  describe('Comprehensive Security Scan', () => {
    it('should run all scan types and generate report', async () => {
      // Mock all scan methods
      const mockAuditResult = {
        vulnerabilities: {
          'vulnerable-package': {
            id: 'GHSA-5678',
            title: 'XSS vulnerability',
            severity: 'critical'
          }
        }
      };

      (execSync as jest.Mock)
        .mockReturnValueOnce(JSON.stringify(mockAuditResult)) // npm audit
        .mockReturnValueOnce(JSON.stringify({ dependencies: {} })); // npm ls

      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('.env')) {
          return 'SECRET_KEY=abc123def456';
        }
        if (path.includes('src/')) {
          return 'eval(userInput);';
        }
        return JSON.stringify({ name: 'test-package', version: '1.0.0' });
      });

      const report = await securityScanner.runSecurityScan();

      expect(report.totalVulnerabilities).toBeGreaterThan(0);
      expect(report.secretsFound.length).toBeGreaterThan(0);
      expect(report.riskScore).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate risk score correctly', async () => {
      // Mock critical vulnerabilities
      const mockAuditResult = {
        vulnerabilities: {
          'critical-vuln': { severity: 'critical', title: 'Critical issue' },
          'high-vuln': { severity: 'high', title: 'High issue' },
          'moderate-vuln': { severity: 'moderate', title: 'Moderate issue' }
        }
      };

      (execSync as jest.Mock).mockReturnValue(JSON.stringify(mockAuditResult));

      const report = await securityScanner.runSecurityScan();

      expect(report.riskScore).toBeGreaterThan(40); // Should be high due to critical vuln
    });

    it('should generate appropriate recommendations', async () => {
      const mockAuditResult = {
        vulnerabilities: {
          'vuln1': { severity: 'high', title: 'High vulnerability' }
        }
      };

      (execSync as jest.Mock).mockReturnValue(JSON.stringify(mockAuditResult));
      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('.env')) {
          return 'API_KEY=secret123';
        }
        return JSON.stringify({ name: 'test-package', version: '1.0.0' });
      });

      const report = await securityScanner.runSecurityScan();

      expect(report.recommendations).toContain('Update vulnerable dependencies to patched versions');
      expect(report.recommendations).toContain('Remove or secure exposed secrets and API keys');
    });
  });

  describe('Auto-fix Functionality', () => {
    it('should auto-fix vulnerabilities when enabled', async () => {
      const autoFixScanner = new SecurityScanner({
        ...mockConfig,
        autoFix: true
      });

      const mockReport = {
        timestamp: new Date(),
        totalVulnerabilities: 2,
        vulnerabilities: [
          { 
            id: 'GHSA-1234',
            patchedIn: '1.2.3', 
            package: 'vulnerable-pkg', 
            severity: 'high', 
            title: 'Test vuln 1',
            version: '1.0.0',
            description: 'Test vulnerability 1',
            references: ['https://github.com/advisories/GHSA-1234']
          },
          { 
            id: 'GHSA-5678',
            patchedIn: '2.0.0', 
            package: 'another-pkg', 
            severity: 'medium', 
            title: 'Test vuln 2',
            version: '1.5.0',
            description: 'Test vulnerability 2',
            references: ['https://github.com/advisories/GHSA-5678']
          }
        ],
        dependencyCount: 10,
        licenseIssues: [],
        secretsFound: [],
        recommendations: [],
        riskScore: 7.5
      };

      (execSync as jest.Mock).mockReturnValue(''); // npm audit fix

      const fixedCount = await autoFixScanner.autoFixIssues(mockReport);

      expect(fixedCount).toBe(2);
      expect(execSync).toHaveBeenCalledWith('npm audit fix', expect.any(Object));
    });

    it('should not auto-fix when disabled', async () => {
      const mockReport = {
        timestamp: new Date(),
        totalVulnerabilities: 1,
        vulnerabilities: [
          { 
            id: 'GHSA-1234',
            patchedIn: '1.2.3', 
            package: 'vulnerable-pkg', 
            severity: 'high', 
            title: 'Test vuln',
            version: '1.0.0',
            description: 'Test vulnerability',
            references: ['https://github.com/advisories/GHSA-1234']
          }
        ],
        dependencyCount: 5,
        licenseIssues: [],
        secretsFound: [],
        recommendations: [],
        riskScore: 5.0
      };

      const fixedCount = await securityScanner.autoFixIssues(mockReport);

      expect(fixedCount).toBe(0);
      expect(execSync).not.toHaveBeenCalledWith('npm audit fix', expect.any(Object));
    });
  });

  describe('Dependency Updates', () => {
    it('should get available dependency updates', async () => {
      const mockOutdatedResult = {
        'lodash': {
          current: '4.17.20',
          latest: '4.17.21'
        },
        'express': {
          current: '4.17.0',
          latest: '4.18.0'
        }
      };

      (execSync as jest.Mock).mockReturnValue(JSON.stringify(mockOutdatedResult));

      const updates = await securityScanner.getAvailableUpdates();

      expect(updates).toHaveLength(2);
      expect(updates[0]?.package).toBe('lodash');
      expect(updates[0]?.currentVersion).toBe('4.17.20');
      expect(updates[0]?.latestVersion).toBe('4.17.21');
    });

    it('should identify breaking changes', async () => {
      const mockOutdatedResult = {
        'major-update': {
          current: '1.5.0',
          latest: '2.0.0'
        }
      };

      (execSync as jest.Mock).mockReturnValue(JSON.stringify(mockOutdatedResult));

      const updates = await securityScanner.getAvailableUpdates();

      expect(updates[0]?.breakingChange).toBe(true);
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate compliance report', () => {
      const mockReport = {
        timestamp: new Date('2023-01-01T00:00:00Z'),
        totalVulnerabilities: 5,
        vulnerabilities: [
          { 
            id: 'GHSA-crit',
            severity: 'critical', 
            package: 'pkg1', 
            title: 'Critical issue',
            version: '1.0.0',
            description: 'Critical security issue',
            references: ['https://github.com/advisories/GHSA-crit']
          },
          { 
            id: 'GHSA-high',
            severity: 'high', 
            package: 'pkg2', 
            title: 'High issue',
            version: '2.0.0',
            description: 'High priority security issue',
            references: ['https://github.com/advisories/GHSA-high']
          },
          { 
            id: 'GHSA-mod',
            severity: 'moderate', 
            package: 'pkg3', 
            title: 'Moderate issue',
            version: '3.0.0',
            description: 'Moderate security issue',
            references: ['https://github.com/advisories/GHSA-mod']
          }
        ],
        dependencyCount: 50,
        licenseIssues: [
          { package: 'gpl-pkg', license: 'GPL-3.0', severity: 'error' }
        ],
        secretsFound: [
          { type: 'API Key', file: '.env', line: 1, confidence: 'high' }
        ],
        recommendations: ['Update dependencies', 'Remove secrets'],
        riskScore: 75
      };

      const report = securityScanner.generateComplianceReport(mockReport);

      expect(report).toContain('Security Compliance Report');
      expect(report).toContain('Risk Score: 75/100');
      expect(report).toContain('Total Vulnerabilities: 5');
      expect(report).toContain('🔴 CRITICAL: 1');
      expect(report).toContain('🟠 HIGH: 1');
      expect(report).toContain('🔐 Potential Secrets Found:');
      expect(report).toContain('📄 License Issues:');
      expect(report).toContain('💡 Recommendations:');
    });

    it('should handle empty report', () => {
      const emptyReport = {
        timestamp: new Date(),
        totalVulnerabilities: 0,
        vulnerabilities: [],
        dependencyCount: 10,
        licenseIssues: [],
        secretsFound: [],
        recommendations: [],
        riskScore: 5
      };

      const report = securityScanner.generateComplianceReport(emptyReport);

      expect(report).toContain('Total Vulnerabilities: 0');
      expect(report).toContain('Risk Score: 5/100');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project path', () => {
      expect(() => new SecurityScanner({
        ...mockConfig,
        projectPath: ''
      })).toThrow();
    });

    it('should handle invalid scan types', () => {
      expect(() => new SecurityScanner({
        ...mockConfig,
        scanTypes: ['invalid' as any]
      })).not.toThrow(); // Should filter out invalid types
    });

    it('should handle command execution failures', async () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Command failed');
      });

      const report = await securityScanner.runSecurityScan();

      expect(report.totalVulnerabilities).toBe(0);
      expect(report.riskScore).toBe(0);
    });
  });

  describe('Configuration Options', () => {
    it('should respect severity threshold', async () => {
      const highSeverityScanner = new SecurityScanner({
        ...mockConfig,
        severity: 'high'
      });

      const mockAuditResult = {
        vulnerabilities: {
          'low-vuln': { severity: 'low', title: 'Low issue' },
          'moderate-vuln': { severity: 'moderate', title: 'Moderate issue' },
          'high-vuln': { severity: 'high', title: 'High issue' }
        }
      };

      (execSync as jest.Mock).mockReturnValue(JSON.stringify(mockAuditResult));

      const vulnerabilities = await highSeverityScanner.scanDependencies();

      expect(vulnerabilities).toHaveLength(1);
      expect(vulnerabilities[0]?.severity).toBe('high');
    });

    it('should respect scan type configuration', async () => {
      const limitedScanner = new SecurityScanner({
        ...mockConfig,
        scanTypes: ['dependencies']
      });

      const report = await limitedScanner.runSecurityScan();

      // Should only have dependency vulnerabilities, no secrets or license issues
      expect(report.secretsFound).toHaveLength(0);
      expect(report.licenseIssues).toHaveLength(0);
    });
  });
});
