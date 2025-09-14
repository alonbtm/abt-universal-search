/**
 * Accessibility Audit Runner
 * Comprehensive accessibility validation tool for continuous integration
 */

import { AccessibilityManager } from '../AccessibilityManager';
import { ColorContrastValidator } from '../ColorContrastValidator';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';
import { EmptyState } from '../EmptyState';
import { SearchDropdownUI } from '../SearchDropdownUI';
import type { 
  AccessibilityValidationResult,
  AccessibilityViolation,
  WCAGLevel 
} from '../../types/Accessibility';

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

class AccessibilityAuditor {
  private accessibilityManager: AccessibilityManager;
  private colorValidator: ColorContrastValidator;
  private container: HTMLElement;

  constructor() {
    this.accessibilityManager = new AccessibilityManager({
      wcagLevel: 'AA',
      enableKeyboardNavigation: true,
      enableScreenReaderSupport: true,
      enableFocusManagement: true,
      enableAutomatedValidation: true,
      debugMode: false
    });

    this.colorValidator = new ColorContrastValidator({
      enableAutomaticValidation: true,
      suggestAlternatives: true,
      debugMode: false
    });

    this.container = this.createAuditContainer();
  }

  async init(): Promise<void> {
    await this.accessibilityManager.init();
    await this.colorValidator.init();
  }

  async destroy(): Promise<void> {
    this.accessibilityManager?.destroy();
    this.colorValidator?.destroy();
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  private createAuditContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'accessibility-audit-container';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1024px';
    container.style.height = '768px';
    document.body.appendChild(container);
    return container;
  }

  async auditComponent(
    ComponentClass: any, 
    componentName: string, 
    config: any = {}
  ): Promise<ComponentAuditResult> {
    this.container.innerHTML = '';
    
    const accessibilityConfig = {
      wcagLevel: 'AA' as WCAGLevel,
      enableKeyboardNavigation: true,
      enableScreenReaderSupport: true,
      enableFocusManagement: true,
      enableAutomatedValidation: true,
      debugMode: false
    };

    const componentConfig = {
      ...config,
      accessibility: accessibilityConfig
    };

    let component;
    
    try {
      // Create component instance
      if (ComponentClass === SearchDropdownUI) {
        const mockUniversalSearch = {
          search: jest.fn().mockResolvedValue([
            { id: '1', title: 'Test Result 1', type: 'document' },
            { id: '2', title: 'Test Result 2', type: 'document' }
          ]),
          getSuggestions: jest.fn().mockResolvedValue(['test', 'example', 'sample']),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        };
        component = new ComponentClass(this.container, mockUniversalSearch, componentConfig);
      } else {
        component = new ComponentClass(this.container, componentConfig);
      }

      await component.init();

      // Exercise component functionality
      await this.exerciseComponent(component, ComponentClass);

      // Perform accessibility validation
      const validationResult = await this.accessibilityManager.validateWCAG(this.container);
      
      // Color contrast validation
      const colorIssues = this.validateColors();

      // Generate recommendations
      const recommendations = this.generateRecommendations(validationResult, colorIssues);

      // Calculate component score
      const score = this.calculateComponentScore(validationResult, colorIssues);

      const result: ComponentAuditResult = {
        componentName,
        score,
        violations: [...validationResult.violations, ...colorIssues],
        warnings: validationResult.warnings.map(w => w.message),
        recommendations
      };

      component.destroy();
      return result;

    } catch (error) {
      component?.destroy();
      throw new Error(`Failed to audit ${componentName}: ${error}`);
    }
  }

  private async exerciseComponent(component: any, ComponentClass: any): Promise<void> {
    if (ComponentClass === LoadingSpinner) {
      await component.start('Loading test data...');
      await new Promise(resolve => setTimeout(resolve, 100));
      component.stop();
    } else if (ComponentClass === ErrorMessage) {
      await component.show(new Error('Test network error'));
      await component.showDetailed(new Error('Detailed error test'), {
        severity: 'warning',
        retryActions: [{
          label: 'Retry Action',
          handler: () => {},
          type: 'primary'
        }]
      });
    } else if (ComponentClass === EmptyState) {
      await component.show('No results found for "test query"', [
        'Try different keywords',
        'Check your spelling',
        'Use fewer words'
      ]);
      component.showContextual('test query', {
        dataSource: 'documents',
        customSuggestions: [{
          text: 'Browse all documents',
          type: 'action',
          icon: '📂',
          handler: () => {}
        }]
      });
    } else if (ComponentClass === SearchDropdownUI) {
      const searchInput = this.container.querySelector('input[type="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.value = 'test query';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Simulate keyboard navigation
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
    }
  }

  private validateColors(): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    const elements = this.container.querySelectorAll('*');

    elements.forEach(element => {
      const style = getComputedStyle(element);
      const color = style.color;
      const backgroundColor = style.backgroundColor;

      if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const result = this.colorValidator.validateColors(color, backgroundColor);
        
        if (!result.passesAA) {
          violations.push({
            type: 'color-contrast',
            severity: 'error',
            message: `Insufficient color contrast ratio: ${result.ratio.toFixed(2)} (minimum: 4.5)`,
            element: element as HTMLElement,
            wcagCriteria: '1.4.3',
            suggestion: `Improve contrast between ${result.foregroundColor} and ${result.backgroundColor}`
          });
        }
      }
    });

    return violations;
  }

  private generateRecommendations(
    validationResult: AccessibilityValidationResult, 
    colorIssues: AccessibilityViolation[]
  ): string[] {
    const recommendations: string[] = [];

    // ARIA recommendations
    if (validationResult.violations.some(v => v.type === 'aria')) {
      recommendations.push('Review and improve ARIA attributes for better screen reader support');
    }

    // Keyboard navigation recommendations
    if (validationResult.violations.some(v => v.type === 'keyboard')) {
      recommendations.push('Ensure all interactive elements are keyboard accessible');
    }

    // Focus management recommendations
    if (validationResult.violations.some(v => v.type === 'focus')) {
      recommendations.push('Implement proper focus management and visible focus indicators');
    }

    // Color contrast recommendations
    if (colorIssues.length > 0) {
      recommendations.push('Improve color contrast ratios to meet WCAG AA standards (4.5:1 minimum)');
    }

    // Semantic HTML recommendations
    if (validationResult.violations.some(v => v.type === 'semantic')) {
      recommendations.push('Use semantic HTML elements for better structure and meaning');
    }

    // Text alternatives recommendations
    if (validationResult.violations.some(v => v.type === 'text-alternative')) {
      recommendations.push('Provide appropriate text alternatives for non-text content');
    }

    return recommendations;
  }

  private calculateComponentScore(
    validationResult: AccessibilityValidationResult,
    colorIssues: AccessibilityViolation[]
  ): number {
    const totalIssues = validationResult.violations.length + colorIssues.length;
    const criticalIssues = [...validationResult.violations, ...colorIssues].filter(
      v => v.severity === 'error'
    ).length;

    // Base score starts at 100
    let score = 100;

    // Deduct points for violations
    score -= criticalIssues * 10; // 10 points per critical issue
    score -= (totalIssues - criticalIssues) * 5; // 5 points per non-critical issue

    // Additional deductions for specific violation types
    const violationTypes = [...validationResult.violations, ...colorIssues].map(v => v.type);
    
    if (violationTypes.includes('color-contrast')) score -= 5;
    if (violationTypes.includes('keyboard')) score -= 10;
    if (violationTypes.includes('aria')) score -= 8;
    if (violationTypes.includes('focus')) score -= 8;

    return Math.max(0, score);
  }

  async runFullAudit(): Promise<AuditReport> {
    const timestamp = new Date();
    const componentResults: ComponentAuditResult[] = [];

    try {
      // Audit each component
      const components = [
        { class: LoadingSpinner, name: 'LoadingSpinner', config: { size: 32, showProgress: true } },
        { class: ErrorMessage, name: 'ErrorMessage', config: { dismissible: true } },
        { class: EmptyState, name: 'EmptyState', config: { interactiveSuggestions: true } },
        { class: SearchDropdownUI, name: 'SearchDropdownUI', config: { placeholder: 'Search...' } }
      ];

      for (const component of components) {
        const result = await this.auditComponent(component.class, component.name, component.config);
        componentResults.push(result);
      }

      // Calculate overall metrics
      const allViolations = componentResults.flatMap(r => r.violations);
      const criticalViolations = allViolations.filter(v => v.severity === 'error');
      const allWarnings = componentResults.flatMap(r => r.warnings);
      const allRecommendations = [...new Set(componentResults.flatMap(r => r.recommendations))];

      // Calculate overall score (weighted average)
      const overallScore = componentResults.reduce((sum, result) => sum + result.score, 0) / componentResults.length;

      // Determine WCAG level compliance
      const wcagLevel: WCAGLevel = overallScore >= 95 ? 'AAA' : overallScore >= 85 ? 'AA' : 'A';

      // Extract passed and failed criteria
      const passedCriteria = this.extractPassedCriteria(componentResults);
      const failedCriteria = allViolations.map(v => v.wcagCriteria).filter(Boolean) as string[];

      const report: AuditReport = {
        timestamp,
        overallScore: Math.round(overallScore),
        wcagLevel,
        componentsAudited: componentResults.map(r => r.componentName),
        totalViolations: allViolations.length,
        criticalViolations: criticalViolations.length,
        warningCount: allWarnings.length,
        violations: allViolations,
        recommendations: allRecommendations,
        passedCriteria,
        failedCriteria: [...new Set(failedCriteria)]
      };

      return report;

    } catch (error) {
      throw new Error(`Audit failed: ${error}`);
    }
  }

  private extractPassedCriteria(results: ComponentAuditResult[]): string[] {
    // List of WCAG 2.1 AA criteria we test for
    const allCriteria = [
      '1.1.1', '1.3.1', '1.3.2', '1.3.3', '1.4.1', '1.4.3', '1.4.4', '1.4.10', '1.4.11', '1.4.12', '1.4.13',
      '2.1.1', '2.1.2', '2.1.4', '2.2.1', '2.2.2', '2.3.1', '2.4.1', '2.4.3', '2.4.6', '2.4.7',
      '2.5.1', '2.5.2', '2.5.3', '2.5.4',
      '3.1.1', '3.2.1', '3.2.2', '3.2.3', '3.2.4', '3.3.1', '3.3.2', '3.3.3', '3.3.4',
      '4.1.1', '4.1.2', '4.1.3'
    ];

    const failedCriteria = new Set(
      results.flatMap(r => r.violations.map(v => v.wcagCriteria).filter(Boolean))
    );

    return allCriteria.filter(criteria => !failedCriteria.has(criteria));
  }

  generateReport(report: AuditReport): string {
    const { timestamp, overallScore, wcagLevel, componentsAudited, totalViolations, criticalViolations, warningCount, recommendations, passedCriteria, failedCriteria } = report;

    const output = `
# Accessibility Audit Report
Generated: ${timestamp.toISOString()}

## Summary
- **Overall Score**: ${overallScore}/100
- **WCAG Level**: ${wcagLevel}
- **Components Audited**: ${componentsAudited.join(', ')}
- **Total Violations**: ${totalViolations}
- **Critical Violations**: ${criticalViolations}
- **Warnings**: ${warningCount}

## Compliance Status
${overallScore >= 85 ? '✅ PASSES WCAG 2.1 AA' : '❌ FAILS WCAG 2.1 AA'}

## WCAG Criteria
### Passed (${passedCriteria.length})
${passedCriteria.map(c => `✅ ${c}`).join('\n')}

### Failed (${failedCriteria.length})
${failedCriteria.map(c => `❌ ${c}`).join('\n')}

## Recommendations
${recommendations.map(r => `- ${r}`).join('\n')}

## Detailed Violations
${report.violations.map(v => `
**${v.type}** (${v.severity})
- Criteria: ${v.wcagCriteria}
- Message: ${v.message}
- Element: ${v.element?.tagName?.toLowerCase() || 'unknown'}
- Suggestion: ${v.suggestion || 'None provided'}
`).join('\n')}
`;

    return output;
  }
}

// Export for use in test files and CI/CD
export { AccessibilityAuditor, type AuditReport, type ComponentAuditResult };

// CLI usage
if (require.main === module) {
  (async () => {
    console.log('🔍 Starting Accessibility Audit...\n');
    
    const auditor = new AccessibilityAuditor();
    
    try {
      await auditor.init();
      const report = await auditor.runFullAudit();
      
      console.log(auditor.generateReport(report));
      
      // Exit with error code if compliance fails
      process.exit(report.overallScore >= 85 ? 0 : 1);
      
    } catch (error) {
      console.error('❌ Audit failed:', error);
      process.exit(1);
    } finally {
      await auditor.destroy();
    }
  })();
}