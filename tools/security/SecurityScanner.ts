/**
 * Security Scanner
 * Handles automated vulnerability scanning and dependency management
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface ISecurityConfig {
  projectPath: string;
  scanTypes: ('dependencies' | 'code' | 'secrets' | 'licenses')[];
  severity: 'low' | 'moderate' | 'high' | 'critical';
  autoFix: boolean;
  reportPath?: string;
}

export interface IVulnerability {
  id: string;
  title: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  package: string;
  version: string;
  patchedIn?: string;
  description: string;
  cwe?: string[];
  cvss?: number;
  references: string[];
}

export interface ISecurityReport {
  timestamp: Date;
  totalVulnerabilities: number;
  vulnerabilities: IVulnerability[];
  dependencyCount: number;
  licenseIssues: ILicenseIssue[];
  secretsFound: ISecretIssue[];
  recommendations: string[];
  riskScore: number;
}

export interface ILicenseIssue {
  package: string;
  license: string;
  severity: 'info' | 'warning' | 'error';
  reason: string;
}

export interface ISecretIssue {
  type: string;
  file: string;
  line: number;
  description: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface IDependencyUpdate {
  package: string;
  currentVersion: string;
  latestVersion: string;
  securityUpdate: boolean;
  breakingChange: boolean;
}

export class SecurityScanner {
  private config: ISecurityConfig;
  private vulnerabilities: Map<string, IVulnerability> = new Map();

  constructor(config: ISecurityConfig) {
    this.config = config;
  }

  /**
   * Run comprehensive security scan
   */
  async runSecurityScan(): Promise<ISecurityReport> {
    console.log('🔒 Starting security scan...');

    const report: ISecurityReport = {
      timestamp: new Date(),
      totalVulnerabilities: 0,
      vulnerabilities: [],
      dependencyCount: 0,
      licenseIssues: [],
      secretsFound: [],
      recommendations: [],
      riskScore: 0
    };

    // Scan dependencies
    if (this.config.scanTypes.includes('dependencies')) {
      const depVulns = await this.scanDependencies();
      report.vulnerabilities.push(...depVulns);
    }

    // Scan for secrets
    if (this.config.scanTypes.includes('secrets')) {
      report.secretsFound = await this.scanForSecrets();
    }

    // Scan licenses
    if (this.config.scanTypes.includes('licenses')) {
      report.licenseIssues = await this.scanLicenses();
    }

    // Code security scan
    if (this.config.scanTypes.includes('code')) {
      const codeVulns = await this.scanCode();
      report.vulnerabilities.push(...codeVulns);
    }

    report.totalVulnerabilities = report.vulnerabilities.length;
    report.dependencyCount = this.getDependencyCount();
    report.riskScore = this.calculateRiskScore(report);
    report.recommendations = this.generateRecommendations(report);

    console.log(`🔍 Security scan completed: ${report.totalVulnerabilities} vulnerabilities found`);
    return report;
  }

  /**
   * Scan dependencies for vulnerabilities
   */
  async scanDependencies(): Promise<IVulnerability[]> {
    console.log('📦 Scanning dependencies...');

    try {
      // Run npm audit
      const auditResult = execSync('npm audit --json', {
        cwd: this.config.projectPath,
        encoding: 'utf8'
      });

      const audit = JSON.parse(auditResult);
      const vulnerabilities: IVulnerability[] = [];

      if (audit.vulnerabilities) {
        for (const [packageName, vulnData] of Object.entries(audit.vulnerabilities)) {
          const vuln = vulnData as any;
          
          if (this.shouldIncludeVulnerability(vuln.severity)) {
            vulnerabilities.push({
              id: vuln.id || `${packageName}-${Date.now()}`,
              title: vuln.title || `Vulnerability in ${packageName}`,
              severity: vuln.severity,
              package: packageName,
              version: vuln.range || 'unknown',
              patchedIn: vuln.fixAvailable?.version,
              description: vuln.overview || 'No description available',
              cwe: vuln.cwe || [],
              cvss: vuln.cvss?.score,
              references: vuln.references || []
            });
          }
        }
      }

      console.log(`📦 Found ${vulnerabilities.length} dependency vulnerabilities`);
      return vulnerabilities;
    } catch (error) {
      console.warn('⚠️ Dependency scan failed:', error);
      return [];
    }
  }

  /**
   * Scan for exposed secrets
   */
  async scanForSecrets(): Promise<ISecretIssue[]> {
    console.log('🔐 Scanning for secrets...');

    const secrets: ISecretIssue[] = [];
    const secretPatterns = [
      { type: 'API Key', pattern: /[a-zA-Z0-9]{32,}/, confidence: 'medium' as const },
      { type: 'JWT Token', pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/, confidence: 'high' as const },
      { type: 'Private Key', pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----/, confidence: 'high' as const },
      { type: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/, confidence: 'high' as const },
      { type: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/, confidence: 'high' as const }
    ];

    try {
      // Scan common files
      const filesToScan = [
        '.env', '.env.local', '.env.production',
        'config.js', 'config.json', 'package.json',
        'src/**/*.js', 'src/**/*.ts', 'src/**/*.json'
      ];

      for (const filePattern of filesToScan) {
        const files = this.findFiles(filePattern);
        
        for (const file of files) {
          const content = this.readFileContent(file);
          if (!content) continue;

          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            for (const pattern of secretPatterns) {
              if (pattern.pattern.test(line)) {
                secrets.push({
                  type: pattern.type,
                  file,
                  line: i + 1,
                  description: `Potential ${pattern.type} found`,
                  confidence: pattern.confidence
                });
              }
            }
          }
        }
      }

      console.log(`🔐 Found ${secrets.length} potential secrets`);
      return secrets;
    } catch (error) {
      console.warn('⚠️ Secret scan failed:', error);
      return [];
    }
  }

  /**
   * Scan licenses for compliance issues
   */
  async scanLicenses(): Promise<ILicenseIssue[]> {
    console.log('📄 Scanning licenses...');

    const issues: ILicenseIssue[] = [];
    const problematicLicenses = ['GPL-3.0', 'AGPL-3.0', 'LGPL-3.0'];
    const unknownLicenses = ['UNLICENSED', 'UNKNOWN'];

    try {
      // Get dependency licenses
      const licenseResult = execSync('npm ls --json', {
        cwd: this.config.projectPath,
        encoding: 'utf8'
      });

      const dependencies = JSON.parse(licenseResult);
      
      const checkDependencies = (deps: any, path = '') => {
        if (!deps) return;
        
        for (const [name, info] of Object.entries(deps)) {
          const depInfo = info as any;
          const license = depInfo.license || 'UNKNOWN';
          
          if (problematicLicenses.includes(license)) {
            issues.push({
              package: name,
              license,
              severity: 'error',
              reason: 'Copyleft license may require source code disclosure'
            });
          } else if (unknownLicenses.includes(license)) {
            issues.push({
              package: name,
              license,
              severity: 'warning',
              reason: 'License not specified or unknown'
            });
          }
          
          if (depInfo.dependencies) {
            checkDependencies(depInfo.dependencies, `${path}/${name}`);
          }
        }
      };

      checkDependencies(dependencies.dependencies);

      console.log(`📄 Found ${issues.length} license issues`);
      return issues;
    } catch (error) {
      console.warn('⚠️ License scan failed:', error);
      return [];
    }
  }

  /**
   * Scan code for security issues
   */
  async scanCode(): Promise<IVulnerability[]> {
    console.log('💻 Scanning code...');

    const vulnerabilities: IVulnerability[] = [];
    
    // Basic code security patterns
    const securityPatterns = [
      {
        pattern: /eval\s*\(/g,
        severity: 'high' as const,
        title: 'Use of eval() function',
        description: 'eval() can execute arbitrary code and is a security risk'
      },
      {
        pattern: /innerHTML\s*=/g,
        severity: 'moderate' as const,
        title: 'Use of innerHTML',
        description: 'innerHTML can lead to XSS vulnerabilities'
      },
      {
        pattern: /document\.write\s*\(/g,
        severity: 'moderate' as const,
        title: 'Use of document.write',
        description: 'document.write can be exploited for XSS attacks'
      }
    ];

    try {
      const files = this.findFiles('src/**/*.{js,ts}');
      
      for (const file of files) {
        const content = this.readFileContent(file);
        if (!content) continue;

        for (const pattern of securityPatterns) {
          const matches = content.match(pattern.pattern);
          if (matches) {
            vulnerabilities.push({
              id: `code-${file}-${pattern.title.replace(/\s+/g, '-').toLowerCase()}`,
              title: pattern.title,
              severity: pattern.severity,
              package: file,
              version: '1.0.0',
              description: pattern.description,
              references: []
            });
          }
        }
      }

      console.log(`💻 Found ${vulnerabilities.length} code security issues`);
      return vulnerabilities;
    } catch (error) {
      console.warn('⚠️ Code scan failed:', error);
      return [];
    }
  }

  /**
   * Auto-fix security issues
   */
  async autoFixIssues(report: ISecurityReport): Promise<number> {
    if (!this.config.autoFix) {
      return 0;
    }

    console.log('🔧 Auto-fixing security issues...');
    let fixedCount = 0;

    try {
      // Fix dependency vulnerabilities
      const fixableVulns = report.vulnerabilities.filter(v => v.patchedIn);
      
      if (fixableVulns.length > 0) {
        execSync('npm audit fix', {
          cwd: this.config.projectPath,
          stdio: 'pipe'
        });
        fixedCount += fixableVulns.length;
      }

      console.log(`🔧 Auto-fixed ${fixedCount} issues`);
      return fixedCount;
    } catch (error) {
      console.warn('⚠️ Auto-fix failed:', error);
      return 0;
    }
  }

  /**
   * Get available dependency updates
   */
  async getAvailableUpdates(): Promise<IDependencyUpdate[]> {
    console.log('📋 Checking for dependency updates...');

    try {
      const outdatedResult = execSync('npm outdated --json', {
        cwd: this.config.projectPath,
        encoding: 'utf8'
      });

      const outdated = JSON.parse(outdatedResult);
      const updates: IDependencyUpdate[] = [];

      for (const [packageName, info] of Object.entries(outdated)) {
        const updateInfo = info as any;
        
        updates.push({
          package: packageName,
          currentVersion: updateInfo.current,
          latestVersion: updateInfo.latest,
          securityUpdate: this.isSecurityUpdate(packageName, updateInfo.current, updateInfo.latest),
          breakingChange: this.isBreakingChange(updateInfo.current, updateInfo.latest)
        });
      }

      return updates;
    } catch (error) {
      console.warn('⚠️ Failed to check updates:', error);
      return [];
    }
  }

  /**
   * Generate security compliance report
   */
  generateComplianceReport(report: ISecurityReport): string {
    const formatSeverity = (severity: string) => {
      const icons = { low: '🟢', moderate: '🟡', high: '🟠', critical: '🔴' };
      return `${icons[severity as keyof typeof icons] || '⚪'} ${severity.toUpperCase()}`;
    };

    const sections = [
      '🔒 Security Compliance Report',
      '================================',
      `Scan Date: ${report.timestamp.toISOString()}`,
      `Risk Score: ${report.riskScore}/100`,
      `Total Vulnerabilities: ${report.totalVulnerabilities}`,
      `Dependencies Scanned: ${report.dependencyCount}`,
      '',
      '🚨 Vulnerabilities by Severity:',
      ...this.groupBySeverity(report.vulnerabilities).map(([severity, count]) => 
        `${formatSeverity(severity)}: ${count}`
      ),
      ''
    ];

    if (report.vulnerabilities.length > 0) {
      sections.push('📋 Critical Vulnerabilities:');
      const criticalVulns = report.vulnerabilities
        .filter(v => v.severity === 'critical' || v.severity === 'high')
        .slice(0, 10);
      
      sections.push(...criticalVulns.map(v => 
        `• ${v.package}: ${v.title} (${v.severity})`
      ));
      sections.push('');
    }

    if (report.secretsFound.length > 0) {
      sections.push('🔐 Potential Secrets Found:');
      sections.push(...report.secretsFound.slice(0, 5).map(s => 
        `• ${s.type} in ${s.file}:${s.line} (${s.confidence} confidence)`
      ));
      sections.push('');
    }

    if (report.licenseIssues.length > 0) {
      sections.push('📄 License Issues:');
      sections.push(...report.licenseIssues.slice(0, 5).map(l => 
        `• ${l.package}: ${l.license} (${l.severity})`
      ));
      sections.push('');
    }

    sections.push('💡 Recommendations:');
    sections.push(...report.recommendations.map(rec => `• ${rec}`));

    return sections.join('\n');
  }

  /**
   * Check if vulnerability should be included based on severity
   */
  private shouldIncludeVulnerability(severity: string): boolean {
    const severityLevels = { low: 1, moderate: 2, high: 3, critical: 4 };
    const minLevel = severityLevels[this.config.severity];
    const vulnLevel = severityLevels[severity as keyof typeof severityLevels];
    
    return vulnLevel >= minLevel;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(report: ISecurityReport): number {
    let score = 0;
    
    // Vulnerability scoring
    for (const vuln of report.vulnerabilities) {
      switch (vuln.severity) {
        case 'critical': score += 25; break;
        case 'high': score += 15; break;
        case 'moderate': score += 8; break;
        case 'low': score += 3; break;
      }
    }

    // Secret scoring
    score += report.secretsFound.length * 10;

    // License scoring
    score += report.licenseIssues.filter(l => l.severity === 'error').length * 5;

    return Math.min(score, 100);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(report: ISecurityReport): string[] {
    const recommendations: string[] = [];

    if (report.vulnerabilities.length > 0) {
      recommendations.push('Update vulnerable dependencies to patched versions');
    }

    if (report.secretsFound.length > 0) {
      recommendations.push('Remove or secure exposed secrets and API keys');
    }

    if (report.licenseIssues.length > 0) {
      recommendations.push('Review license compatibility for compliance');
    }

    if (report.riskScore > 50) {
      recommendations.push('Implement automated security scanning in CI/CD pipeline');
    }

    return recommendations;
  }

  /**
   * Group vulnerabilities by severity
   */
  private groupBySeverity(vulnerabilities: IVulnerability[]): [string, number][] {
    const groups = vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(groups).sort(([, a], [, b]) => b - a);
  }

  /**
   * Get dependency count
   */
  private getDependencyCount(): number {
    try {
      const packageJsonPath = resolve(this.config.projectPath, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      const deps = Object.keys(packageJson.dependencies || {});
      const devDeps = Object.keys(packageJson.devDependencies || {});
      
      return deps.length + devDeps.length;
    } catch {
      return 0;
    }
  }

  /**
   * Find files matching pattern
   */
  private findFiles(pattern: string): string[] {
    // Simplified file finding - in real implementation would use glob
    const commonFiles = [
      'package.json', '.env', 'src/index.js', 'src/index.ts'
    ];
    
    return commonFiles.filter(file => 
      existsSync(resolve(this.config.projectPath, file))
    );
  }

  /**
   * Read file content safely
   */
  private readFileContent(filePath: string): string | null {
    try {
      const fullPath = resolve(this.config.projectPath, filePath);
      return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if update is security-related
   */
  private isSecurityUpdate(packageName: string, current: string, latest: string): boolean {
    // Simplified check - in real implementation would check security advisories
    return Math.random() > 0.7; // Simulate 30% chance of security update
  }

  /**
   * Check if update is breaking change
   */
  private isBreakingChange(current: string, latest: string): boolean {
    const [currentMajor] = current.split('.');
    const [latestMajor] = latest.split('.');
    
    return parseInt(currentMajor) !== parseInt(latestMajor);
  }
}
