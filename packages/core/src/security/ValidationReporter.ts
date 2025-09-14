/**
 * ValidationReporter - Security-safe error reporting and validation feedback
 * @description Provides secure error messages and validation feedback without exposing sensitive information
 */

import { SecurityValidationResult, SecurityError, SecurityWarning, SecurityEvent, SecurityAuditEntry } from '../types/Security';

/**
 * Error reporting configuration
 */
export interface ReportingConfig {
  /** Include detailed error information */
  includeDetails: boolean;
  /** Include position information in errors */
  includePositions: boolean;
  /** Maximum error message length */
  maxMessageLength: number;
  /** Sanitize error messages */
  sanitizeMessages: boolean;
  /** Log security events */
  logSecurityEvents: boolean;
  /** Include stack traces (development only) */
  includeStackTraces: boolean;
}

/**
 * Validation feedback levels
 */
export type FeedbackLevel = 'silent' | 'minimal' | 'detailed' | 'verbose';

/**
 * User-friendly error messages
 */
const USER_FRIENDLY_MESSAGES: { [key: string]: string } = {
  'xss': 'Invalid characters detected in input',
  'sql_injection': 'Input contains restricted patterns',
  'buffer_overflow': 'Input length exceeds allowed limits',
  'malicious_pattern': 'Input contains invalid patterns',
  'encoding_issue': 'Input encoding is not supported',
  'suspicious_pattern': 'Input requires review',
  'unusual_encoding': 'Input encoding needs verification',
  'length_concern': 'Input length may cause performance issues',
  'character_concern': 'Input contains problematic characters'
};

/**
 * Security-safe validation reporter
 */
export class ValidationReporter {
  private config: ReportingConfig;
  private auditLog: SecurityAuditEntry[] = [];
  private eventLog: SecurityEvent[] = [];

  constructor(config?: Partial<ReportingConfig>) {
    this.config = {
      includeDetails: false,
      includePositions: false,
      maxMessageLength: 100,
      sanitizeMessages: true,
      logSecurityEvents: true,
      includeStackTraces: false,
      ...config
    };
  }

  /**
   * Generate user-friendly validation report
   */
  public generateReport(
    result: SecurityValidationResult, 
    feedbackLevel: FeedbackLevel = 'minimal'
  ): {
    isValid: boolean;
    message: string;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const report = {
      isValid: result.isSecure,
      message: this.generateSummaryMessage(result),
      errors: this.formatErrors(result.errors, feedbackLevel),
      warnings: this.formatWarnings(result.warnings, feedbackLevel),
      recommendations: this.formatRecommendations(result.recommendations, feedbackLevel)
    };

    // Log security event if configured
    if (this.config.logSecurityEvents && !result.isSecure) {
      this.logSecurityEvent(result);
    }

    return report;
  }

  /**
   * Generate summary message for validation result
   */
  private generateSummaryMessage(result: SecurityValidationResult): string {
    if (result.isSecure) {
      return 'Input validation passed';
    }

    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;

    if (errorCount > 0 && warningCount > 0) {
      return `Input validation failed with ${errorCount} error(s) and ${warningCount} warning(s)`;
    } else if (errorCount > 0) {
      return `Input validation failed with ${errorCount} error(s)`;
    } else {
      return `Input validation completed with ${warningCount} warning(s)`;
    }
  }

  /**
   * Format errors for user display
   */
  private formatErrors(errors: SecurityError[], feedbackLevel: FeedbackLevel): string[] {
    if (feedbackLevel === 'silent') {
      return [];
    }

    return errors.map(error => {
      let message = this.getSafeErrorMessage(error);

      if (feedbackLevel === 'detailed' || feedbackLevel === 'verbose') {
        if (this.config.includePositions && error.position !== undefined) {
          message += ` (position: ${error.position})`;
        }
        
        if (feedbackLevel === 'verbose' && error.suggestion) {
          message += ` - ${error.suggestion}`;
        }
      }

      return this.sanitizeMessage(message);
    });
  }

  /**
   * Format warnings for user display
   */
  private formatWarnings(warnings: SecurityWarning[], feedbackLevel: FeedbackLevel): string[] {
    if (feedbackLevel === 'silent' || feedbackLevel === 'minimal') {
      return [];
    }

    return warnings.map(warning => {
      let message = this.getSafeWarningMessage(warning);

      if (feedbackLevel === 'verbose' && warning.recommendation) {
        message += ` - ${warning.recommendation}`;
      }

      return this.sanitizeMessage(message);
    });
  }

  /**
   * Format recommendations for user display
   */
  private formatRecommendations(recommendations: string[], feedbackLevel: FeedbackLevel): string[] {
    if (feedbackLevel === 'silent' || feedbackLevel === 'minimal') {
      return [];
    }

    return recommendations.map(rec => this.sanitizeMessage(rec));
  }

  /**
   * Get safe error message without exposing sensitive information
   */
  private getSafeErrorMessage(error: SecurityError): string {
    const userFriendlyMessage = USER_FRIENDLY_MESSAGES[error.type];
    
    if (userFriendlyMessage && this.config.sanitizeMessages) {
      return userFriendlyMessage;
    }

    // Sanitize the original message
    let message = error.message;
    
    // Remove potentially sensitive information
    message = message.replace(/['"][^'"]*['"]/g, '[REDACTED]'); // Remove quoted strings
    message = message.replace(/\b\d{3,}\b/g, '[NUMBER]'); // Replace long numbers
    message = message.replace(/[<>]/g, ''); // Remove angle brackets
    
    return message;
  }

  /**
   * Get safe warning message
   */
  private getSafeWarningMessage(warning: SecurityWarning): string {
    const userFriendlyMessage = USER_FRIENDLY_MESSAGES[warning.type];
    
    if (userFriendlyMessage && this.config.sanitizeMessages) {
      return userFriendlyMessage;
    }

    return this.sanitizeMessage(warning.message);
  }

  /**
   * Sanitize message content
   */
  private sanitizeMessage(message: string): string {
    if (!this.config.sanitizeMessages) {
      return message;
    }

    let sanitized = message;

    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Remove script content
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    // Limit message length
    if (sanitized.length > this.config.maxMessageLength) {
      sanitized = sanitized.substring(0, this.config.maxMessageLength - 3) + '...';
    }

    return sanitized;
  }

  /**
   * Log security event for monitoring
   */
  private logSecurityEvent(result: SecurityValidationResult): void {
    const event: SecurityEvent = {
      type: 'validation_failed',
      timestamp: Date.now(),
      severity: result.riskLevel,
      description: `Validation failed with ${result.errors.length} errors`,
      details: {
        action: 'input_validation',
        pattern: result.errors.map(e => e.type).join(', ')
      }
    };

    this.eventLog.push(event);

    // Keep only recent events (last 1000)
    if (this.eventLog.length > 1000) {
      this.eventLog = this.eventLog.slice(-1000);
    }
  }

  /**
   * Create audit log entry
   */
  public createAuditEntry(
    eventType: string,
    success: boolean,
    processingTime: number,
    error?: string,
    context?: Record<string, unknown>
  ): SecurityAuditEntry {
    const entry: SecurityAuditEntry = {
      id: this.generateAuditId(),
      timestamp: Date.now(),
      eventType,
      severity: success ? 'low' : 'high',
      action: eventType,
      success,
      processingTime,
      error: error ? this.sanitizeMessage(error) : undefined,
      context: context || {}
    };

    this.auditLog.push(entry);

    // Keep only recent entries (last 10000)
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }

    return entry;
  }

  /**
   * Generate unique audit ID
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get validation metrics for monitoring
   */
  public getValidationMetrics(): {
    totalValidations: number;
    failedValidations: number;
    recentEvents: SecurityEvent[];
    errorsByType: Record<string, number>;
  } {
    const totalValidations = this.auditLog.length;
    const failedValidations = this.auditLog.filter(entry => !entry.success).length;
    const recentEvents = this.eventLog.slice(-10);

    // Count errors by type from recent events
    const errorsByType: Record<string, number> = {};
    this.eventLog.forEach(event => {
      if (event.details.pattern) {
        const patterns = event.details.pattern.split(', ');
        patterns.forEach(pattern => {
          errorsByType[pattern] = (errorsByType[pattern] || 0) + 1;
        });
      }
    });

    return {
      totalValidations,
      failedValidations,
      recentEvents,
      errorsByType
    };
  }

  /**
   * Generate security report for administrators
   */
  public generateSecurityReport(): {
    summary: {
      totalEvents: number;
      criticalEvents: number;
      highRiskEvents: number;
      recentTrends: string[];
    };
    topThreats: Array<{ type: string; count: number; severity: string }>;
    recommendations: string[];
  } {
    const criticalEvents = this.eventLog.filter(e => e.severity === 'critical').length;
    const highRiskEvents = this.eventLog.filter(e => e.severity === 'high').length;

    // Analyze threat patterns
    const threatCounts: Record<string, { count: number; severity: string }> = {};
    this.eventLog.forEach(event => {
      if (event.details.pattern) {
        const patterns = event.details.pattern.split(', ');
        patterns.forEach(pattern => {
          if (!threatCounts[pattern]) {
            threatCounts[pattern] = { count: 0, severity: event.severity };
          }
          threatCounts[pattern].count++;
        });
      }
    });

    const topThreats = Object.entries(threatCounts)
      .map(([type, data]) => ({ type, count: data.count, severity: data.severity }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recommendations = this.generateSecurityRecommendations(topThreats);

    return {
      summary: {
        totalEvents: this.eventLog.length,
        criticalEvents,
        highRiskEvents,
        recentTrends: this.analyzeRecentTrends()
      },
      topThreats,
      recommendations
    };
  }

  /**
   * Analyze recent security trends
   */
  private analyzeRecentTrends(): string[] {
    const trends: string[] = [];
    const recentEvents = this.eventLog.slice(-100);

    if (recentEvents.length === 0) {
      return ['No recent security events'];
    }

    const criticalCount = recentEvents.filter(e => e.severity === 'critical').length;
    const highCount = recentEvents.filter(e => e.severity === 'high').length;

    if (criticalCount > recentEvents.length * 0.1) {
      trends.push('High rate of critical security events detected');
    }

    if (highCount > recentEvents.length * 0.2) {
      trends.push('Elevated security threat level');
    }

    if (trends.length === 0) {
      trends.push('Security threat level is normal');
    }

    return trends;
  }

  /**
   * Generate security recommendations based on threat analysis
   */
  private generateSecurityRecommendations(topThreats: Array<{ type: string; count: number; severity: string }>): string[] {
    const recommendations: string[] = [];

    topThreats.forEach(threat => {
      switch (threat.type) {
        case 'xss':
          recommendations.push('Implement stricter XSS protection and input sanitization');
          break;
        case 'sql_injection':
          recommendations.push('Enforce parameterized queries and SQL injection protection');
          break;
        case 'buffer_overflow':
          recommendations.push('Implement stricter input length limits and buffer protection');
          break;
        default:
          recommendations.push(`Review and strengthen protection against ${threat.type} attacks`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring security events and maintain current protection levels');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Clear audit logs (for testing or privacy compliance)
   */
  public clearAuditLogs(): void {
    this.auditLog = [];
    this.eventLog = [];
  }

  /**
   * Update reporting configuration
   */
  public updateConfig(newConfig: Partial<ReportingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ReportingConfig {
    return { ...this.config };
  }
}
