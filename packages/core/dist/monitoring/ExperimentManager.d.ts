/**
 * Experiment Manager - A/B testing support and experiment framework
 * @description Provides hooks for performance testing different configurations with statistical analysis
 */
/**
 * Experiment configuration
 */
export interface ExperimentConfig {
    /** Experiment ID */
    id: string;
    /** Experiment name */
    name: string;
    /** Experiment description */
    description: string;
    /** Experiment variations */
    variations: ExperimentVariation[];
    /** Traffic allocation strategy */
    allocation: {
        /** Traffic split by variation */
        splits: Record<string, number>;
        /** Traffic allocation method */
        method: 'random' | 'hash' | 'sticky';
        /** Include/exclude criteria */
        criteria?: {
            include?: string[];
            exclude?: string[];
        };
    };
    /** Success metrics */
    metrics: ExperimentMetric[];
    /** Experiment duration */
    duration: {
        /** Start time */
        startTime: number;
        /** End time */
        endTime: number;
        /** Minimum sample size */
        minSampleSize: number;
    };
    /** Statistical configuration */
    statistics: {
        /** Confidence level (e.g., 0.95 for 95%) */
        confidenceLevel: number;
        /** Minimum detectable effect */
        minimumDetectableEffect: number;
        /** Power of the test */
        power: number;
    };
    /** Experiment status */
    status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
}
/**
 * Experiment variation
 */
export interface ExperimentVariation {
    /** Variation ID */
    id: string;
    /** Variation name */
    name: string;
    /** Variation description */
    description: string;
    /** Configuration overrides */
    config: Record<string, any>;
    /** Traffic percentage */
    traffic: number;
    /** Is control group */
    isControl: boolean;
}
/**
 * Experiment metric
 */
export interface ExperimentMetric {
    /** Metric ID */
    id: string;
    /** Metric name */
    name: string;
    /** Metric type */
    type: 'conversion' | 'numeric' | 'time' | 'count';
    /** Primary or secondary metric */
    priority: 'primary' | 'secondary';
    /** Metric description */
    description: string;
    /** Tracking configuration */
    tracking: {
        /** Events to track */
        events: string[];
        /** Aggregation method */
        aggregation: 'sum' | 'average' | 'count' | 'rate';
        /** Filters to apply */
        filters?: Record<string, any>;
    };
}
/**
 * Experiment participant
 */
export interface ExperimentParticipant {
    /** Participant ID (user/session ID) */
    id: string;
    /** Experiment ID */
    experimentId: string;
    /** Assigned variation */
    variationId: string;
    /** Assignment timestamp */
    assignedAt: number;
    /** Participant metadata */
    metadata: Record<string, any>;
    /** Tracked events */
    events: ExperimentEvent[];
}
/**
 * Experiment event
 */
export interface ExperimentEvent {
    /** Event ID */
    id: string;
    /** Participant ID */
    participantId: string;
    /** Experiment ID */
    experimentId: string;
    /** Variation ID */
    variationId: string;
    /** Metric ID */
    metricId: string;
    /** Event value */
    value: number | boolean;
    /** Event timestamp */
    timestamp: number;
    /** Event metadata */
    metadata: Record<string, any>;
}
/**
 * Experiment results
 */
export interface ExperimentResults {
    /** Experiment ID */
    experimentId: string;
    /** Results by variation */
    variations: Record<string, VariationResults>;
    /** Statistical analysis */
    statistics: StatisticalAnalysis;
    /** Winner determination */
    winner?: {
        variationId: string;
        confidence: number;
        lift: number;
    };
    /** Sample size information */
    sampleSize: {
        total: number;
        byVariation: Record<string, number>;
        isSignificant: boolean;
    };
    /** Analysis timestamp */
    analyzedAt: number;
}
/**
 * Variation results
 */
export interface VariationResults {
    /** Variation ID */
    variationId: string;
    /** Sample size */
    sampleSize: number;
    /** Metrics results */
    metrics: Record<string, {
        value: number;
        standardError: number;
        confidenceInterval: [number, number];
        sampleCount: number;
    }>;
    /** Conversion rates (for conversion metrics) */
    conversions?: {
        conversions: number;
        conversionRate: number;
        confidenceInterval: [number, number];
    };
}
/**
 * Statistical analysis
 */
export interface StatisticalAnalysis {
    /** Significance tests by metric */
    tests: Record<string, {
        /** Test type */
        testType: 'ttest' | 'ztest' | 'chisquare' | 'mannwhitney';
        /** P-value */
        pValue: number;
        /** Test statistic */
        statistic: number;
        /** Is significant */
        isSignificant: boolean;
        /** Effect size */
        effectSize: number;
        /** Confidence interval for difference */
        confidenceInterval: [number, number];
    }>;
    /** Overall experiment significance */
    overallSignificance: boolean;
    /** Multiple comparisons adjustment */
    multipleComparisons: {
        method: 'bonferroni' | 'holm' | 'benjamini-hochberg';
        adjustedPValues: Record<string, number>;
    };
    /** Power analysis */
    power: {
        observedPower: number;
        requiredSampleSize: number;
        actualSampleSize: number;
    };
}
/**
 * Experiment recommendation
 */
export interface ExperimentRecommendation {
    /** Recommendation type */
    type: 'launch' | 'stop' | 'extend' | 'modify';
    /** Recommendation title */
    title: string;
    /** Detailed explanation */
    explanation: string;
    /** Confidence in recommendation */
    confidence: number;
    /** Action items */
    actions: string[];
    /** Risk assessment */
    risks: Array<{
        description: string;
        probability: number;
        impact: 'low' | 'medium' | 'high';
    }>;
}
/**
 * Experiment Manager Implementation
 */
export declare class ExperimentManager {
    private experiments;
    private participants;
    private events;
    private assignmentCache;
    private results;
    private eventHandlers;
    constructor();
    /**
     * Create new experiment
     */
    createExperiment(config: ExperimentConfig): void;
    /**
     * Assign participant to experiment variation
     */
    assignParticipant(experimentId: string, participantId: string, metadata?: Record<string, any>): string | null;
    /**
     * Track experiment event
     */
    trackEvent(experimentId: string, participantId: string, metricId: string, value: number | boolean, metadata?: Record<string, any>): void;
    /**
     * Get experiment configuration for participant
     */
    getExperimentConfig(experimentId: string, participantId: string): Record<string, any> | null;
    /**
     * Analyze experiment results
     */
    analyzeExperiment(experimentId: string): ExperimentResults | null;
    /**
     * Get experiment recommendations
     */
    getRecommendations(experimentId: string): ExperimentRecommendation[];
    /**
     * Register event handler
     */
    onEvent(handler: (event: ExperimentEvent) => void): void;
    /**
     * Get active experiments
     */
    getActiveExperiments(): ExperimentConfig[];
    /**
     * Update experiment status
     */
    updateExperimentStatus(experimentId: string, status: ExperimentConfig['status']): void;
    /**
     * Clear experiment data
     */
    clearExperiment(experimentId: string): void;
    private validateExperimentConfig;
    private meetsExperimentCriteria;
    private evaluateCriterion;
    private selectVariation;
    private randomVariationAssignment;
    private hashVariationAssignment;
    private stickyVariationAssignment;
    private calculateExperimentResults;
    private performStatisticalTests;
    private performTTest;
    private performZTest;
    private applyMultipleComparisonsCorrection;
    private determineWinner;
    private updatePowerAnalysis;
    private approximateTTestPValue;
    private standardNormalCDF;
    private erf;
    private scheduleResultsUpdate;
    private setupCleanupSchedule;
}
/**
 * Global experiment manager instance
 */
export declare const experimentManager: ExperimentManager;
//# sourceMappingURL=ExperimentManager.d.ts.map