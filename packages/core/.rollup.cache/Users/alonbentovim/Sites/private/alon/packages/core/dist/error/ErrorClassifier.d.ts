import { IErrorClassifier, ErrorClassification, ErrorClassificationRule, ClassificationPerformance, ErrorType, ErrorSeverity, ErrorContext } from '../types/ErrorHandling';
export interface ClassifierMetrics {
    totalClassifications: number;
    accurateClassifications: number;
    averageConfidence: number;
    classificationsByType: Record<ErrorType, number>;
    classificationsBySeverity: Record<ErrorSeverity, number>;
    rulePerformance: Record<string, ClassificationPerformance>;
}
export declare class ErrorClassifier implements IErrorClassifier {
    private rules;
    private metrics;
    private defaultRules;
    constructor();
    private initializeDefaultRules;
    classify(error: Error, context?: ErrorContext): ErrorClassification;
    private evaluateRule;
    private createDefaultClassification;
    private applyRule;
    private refineSeverity;
    private refineRecoverability;
    private calculateConfidence;
    private getDefaultClassification;
    private updateClassificationMetrics;
    registerRule(rule: ErrorClassificationRule): void;
    removeRule(ruleId: string): void;
    getClassificationRules(): ErrorClassificationRule[];
    updateRuleWeights(performance: ClassificationPerformance): void;
    getMetrics(): ClassifierMetrics;
    reset(): void;
    exportRules(): string;
    importRules(rulesJson: string): void;
    analyzeError(error: Error, context?: ErrorContext): {
        classification: ErrorClassification;
        matchingRules: string[];
        confidence: number;
        suggestions: string[];
    };
    private generateSuggestions;
}
//# sourceMappingURL=ErrorClassifier.d.ts.map