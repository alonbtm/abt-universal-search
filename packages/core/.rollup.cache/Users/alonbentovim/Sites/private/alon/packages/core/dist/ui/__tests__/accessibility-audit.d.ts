/**
 * Accessibility Audit Runner
 * Comprehensive accessibility validation tool for continuous integration
 */
import type { AccessibilityViolation, WCAGLevel } from '../../types/Accessibility';
interface AuditReport {
    timestamp: Date;
    overallScore: number;
    wcagLevel: WCAGLevel;
    componentsAudited: string[];
    totalViolations: number;
    criticalViolations: number;
    warningCount: number;
    violations: AccessibilityViolation[];
    recommendations: string[];
    passedCriteria: string[];
    failedCriteria: string[];
}
interface ComponentAuditResult {
    componentName: string;
    score: number;
    violations: AccessibilityViolation[];
    warnings: string[];
    recommendations: string[];
}
declare class AccessibilityAuditor {
    private accessibilityManager;
    private colorValidator;
    private container;
    constructor();
    init(): Promise<void>;
    destroy(): Promise<void>;
    private createAuditContainer;
    auditComponent(ComponentClass: any, componentName: string, config?: any): Promise<ComponentAuditResult>;
    private exerciseComponent;
    private validateColors;
    private generateRecommendations;
    private calculateComponentScore;
    runFullAudit(): Promise<AuditReport>;
    private extractPassedCriteria;
    generateReport(report: AuditReport): string;
}
export { AccessibilityAuditor, type AuditReport, type ComponentAuditResult };
//# sourceMappingURL=accessibility-audit.d.ts.map