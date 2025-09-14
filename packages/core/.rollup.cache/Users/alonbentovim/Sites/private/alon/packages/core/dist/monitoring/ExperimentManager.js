/**
 * Experiment Manager - A/B testing support and experiment framework
 * @description Provides hooks for performance testing different configurations with statistical analysis
 */
/**
 * Experiment Manager Implementation
 */
export class ExperimentManager {
    constructor() {
        this.experiments = new Map();
        this.participants = new Map();
        this.events = [];
        this.assignmentCache = new Map(); // participantId -> variationId
        this.results = new Map();
        this.eventHandlers = [];
        this.setupCleanupSchedule();
    }
    /**
     * Create new experiment
     */
    createExperiment(config) {
        // Validate experiment configuration
        this.validateExperimentConfig(config);
        // Store experiment
        this.experiments.set(config.id, config);
        // Initialize results structure
        const initialResults = {
            experimentId: config.id,
            variations: {},
            statistics: {
                tests: {},
                overallSignificance: false,
                multipleComparisons: {
                    method: 'benjamini-hochberg',
                    adjustedPValues: {}
                },
                power: {
                    observedPower: 0,
                    requiredSampleSize: config.duration.minSampleSize,
                    actualSampleSize: 0
                }
            },
            sampleSize: {
                total: 0,
                byVariation: {},
                isSignificant: false
            },
            analyzedAt: Date.now()
        };
        // Initialize variation results
        for (const variation of config.variations) {
            initialResults.variations[variation.id] = {
                variationId: variation.id,
                sampleSize: 0,
                metrics: {}
            };
            initialResults.sampleSize.byVariation[variation.id] = 0;
        }
        this.results.set(config.id, initialResults);
    }
    /**
     * Assign participant to experiment variation
     */
    assignParticipant(experimentId, participantId, metadata = {}) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment || experiment.status !== 'active') {
            return null;
        }
        // Check if already assigned
        const cacheKey = `${participantId}_${experimentId}`;
        const cachedAssignment = this.assignmentCache.get(cacheKey);
        if (cachedAssignment) {
            return cachedAssignment;
        }
        // Check inclusion/exclusion criteria
        if (!this.meetsExperimentCriteria(experiment, metadata)) {
            return null;
        }
        // Assign variation based on allocation strategy
        const variationId = this.selectVariation(experiment, participantId);
        if (!variationId)
            return null;
        // Create participant record
        const participant = {
            id: participantId,
            experimentId,
            variationId,
            assignedAt: Date.now(),
            metadata,
            events: []
        };
        this.participants.set(`${participantId}_${experimentId}`, participant);
        this.assignmentCache.set(cacheKey, variationId);
        // Update sample size
        const results = this.results.get(experimentId);
        results.sampleSize.total++;
        results.sampleSize.byVariation[variationId]++;
        results.variations[variationId].sampleSize++;
        return variationId;
    }
    /**
     * Track experiment event
     */
    trackEvent(experimentId, participantId, metricId, value, metadata = {}) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment || experiment.status !== 'active') {
            return;
        }
        const participantKey = `${participantId}_${experimentId}`;
        const participant = this.participants.get(participantKey);
        if (!participant) {
            return;
        }
        // Create event
        const event = {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            participantId,
            experimentId,
            variationId: participant.variationId,
            metricId,
            value,
            timestamp: Date.now(),
            metadata
        };
        // Store event
        this.events.push(event);
        participant.events.push(event);
        // Keep only recent events (last 10000)
        if (this.events.length > 10000) {
            this.events = this.events.slice(-10000);
        }
        // Notify handlers
        for (const handler of this.eventHandlers) {
            try {
                handler(event);
            }
            catch (error) {
                console.error('Experiment event handler error:', error);
            }
        }
        // Update results if enough time has passed since last analysis
        this.scheduleResultsUpdate(experimentId);
    }
    /**
     * Get experiment configuration for participant
     */
    getExperimentConfig(experimentId, participantId) {
        const participantKey = `${participantId}_${experimentId}`;
        const participant = this.participants.get(participantKey);
        if (!participant)
            return null;
        const experiment = this.experiments.get(experimentId);
        if (!experiment)
            return null;
        const variation = experiment.variations.find(v => v.id === participant.variationId);
        return variation?.config || null;
    }
    /**
     * Analyze experiment results
     */
    analyzeExperiment(experimentId) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment)
            return null;
        const results = this.calculateExperimentResults(experiment);
        this.results.set(experimentId, results);
        return results;
    }
    /**
     * Get experiment recommendations
     */
    getRecommendations(experimentId) {
        const experiment = this.experiments.get(experimentId);
        const results = this.results.get(experimentId);
        if (!experiment || !results)
            return [];
        const recommendations = [];
        const now = Date.now();
        // Check if experiment should be stopped early due to significance
        if (results.statistics.overallSignificance && results.winner) {
            recommendations.push({
                type: 'stop',
                title: 'Stop Experiment Early - Significant Results',
                explanation: `Experiment has reached statistical significance with ${(results.winner.confidence * 100).toFixed(1)}% confidence. The winning variation (${results.winner.variationId}) shows a ${(results.winner.lift * 100).toFixed(1)}% improvement.`,
                confidence: results.winner.confidence,
                actions: [
                    `Deploy winning variation: ${results.winner.variationId}`,
                    'Document experiment results',
                    'Plan rollout strategy'
                ],
                risks: [{
                        description: 'Early stopping may miss long-term effects',
                        probability: 0.2,
                        impact: 'medium'
                    }]
            });
        }
        // Check if sample size is too small
        if (results.sampleSize.total < experiment.duration.minSampleSize) {
            const remainingTime = experiment.duration.endTime - now;
            const samplingRate = results.sampleSize.total / ((now - experiment.duration.startTime) / (24 * 60 * 60 * 1000));
            const estimatedTimeToTarget = (experiment.duration.minSampleSize - results.sampleSize.total) / samplingRate;
            if (estimatedTimeToTarget > remainingTime / (24 * 60 * 60 * 1000)) {
                recommendations.push({
                    type: 'extend',
                    title: 'Extend Experiment Duration',
                    explanation: `Current sample size (${results.sampleSize.total}) is below minimum required (${experiment.duration.minSampleSize}). Estimated ${estimatedTimeToTarget.toFixed(1)} more days needed.`,
                    confidence: 0.8,
                    actions: [
                        'Extend experiment end date',
                        'Consider increasing traffic allocation',
                        'Review targeting criteria to increase participant pool'
                    ],
                    risks: [{
                            description: 'Longer experiments may be affected by external factors',
                            probability: 0.3,
                            impact: 'medium'
                        }]
                });
            }
        }
        // Check if experiment is underperforming
        if (results.statistics.power.observedPower < experiment.statistics.power) {
            recommendations.push({
                type: 'modify',
                title: 'Insufficient Statistical Power',
                explanation: `Observed power (${(results.statistics.power.observedPower * 100).toFixed(1)}%) is below target (${(experiment.statistics.power * 100).toFixed(1)}%). Consider modifications to increase effect detection.`,
                confidence: 0.9,
                actions: [
                    'Increase sample size allocation',
                    'Review minimum detectable effect size',
                    'Consider more sensitive metrics'
                ],
                risks: [{
                        description: 'Changes during experiment may introduce bias',
                        probability: 0.4,
                        impact: 'high'
                    }]
            });
        }
        // Check if experiment duration has ended
        if (now > experiment.duration.endTime && experiment.status === 'active') {
            if (results.statistics.overallSignificance) {
                recommendations.push({
                    type: 'stop',
                    title: 'Experiment Complete - Deploy Winner',
                    explanation: 'Experiment has reached its scheduled end with significant results.',
                    confidence: results.winner?.confidence || 0.5,
                    actions: [
                        'Stop experiment',
                        'Deploy winning variation',
                        'Analyze learnings'
                    ],
                    risks: []
                });
            }
            else {
                recommendations.push({
                    type: 'stop',
                    title: 'Experiment Complete - No Clear Winner',
                    explanation: 'Experiment has ended without statistically significant results. Consider maintaining control or running follow-up experiments.',
                    confidence: 0.7,
                    actions: [
                        'Stop experiment',
                        'Maintain control variation',
                        'Plan follow-up experiments with larger effect sizes'
                    ],
                    risks: [{
                            description: 'May miss small but meaningful improvements',
                            probability: 0.3,
                            impact: 'low'
                        }]
                });
            }
        }
        return recommendations.sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Register event handler
     */
    onEvent(handler) {
        this.eventHandlers.push(handler);
    }
    /**
     * Get active experiments
     */
    getActiveExperiments() {
        return Array.from(this.experiments.values()).filter(exp => exp.status === 'active');
    }
    /**
     * Update experiment status
     */
    updateExperimentStatus(experimentId, status) {
        const experiment = this.experiments.get(experimentId);
        if (experiment) {
            experiment.status = status;
        }
    }
    /**
     * Clear experiment data
     */
    clearExperiment(experimentId) {
        this.experiments.delete(experimentId);
        this.results.delete(experimentId);
        // Clear related participants and events
        for (const [key, participant] of Array.from(this.participants.entries())) {
            if (participant.experimentId === experimentId) {
                this.participants.delete(key);
            }
        }
        this.events = this.events.filter(event => event.experimentId !== experimentId);
    }
    // Private implementation methods
    validateExperimentConfig(config) {
        if (!config.id || !config.name || !config.variations) {
            throw new Error('Invalid experiment configuration: missing required fields');
        }
        if (config.variations.length < 2) {
            throw new Error('Experiment must have at least 2 variations');
        }
        const totalTraffic = config.variations.reduce((sum, v) => sum + v.traffic, 0);
        if (Math.abs(totalTraffic - 100) > 0.01) {
            throw new Error('Variation traffic percentages must sum to 100%');
        }
        const controlCount = config.variations.filter(v => v.isControl).length;
        if (controlCount !== 1) {
            throw new Error('Experiment must have exactly one control variation');
        }
    }
    meetsExperimentCriteria(experiment, metadata) {
        const criteria = experiment.allocation.criteria;
        if (!criteria)
            return true;
        // Check inclusion criteria
        if (criteria.include) {
            const hasInclusionMatch = criteria.include.some(criterion => this.evaluateCriterion(criterion, metadata));
            if (!hasInclusionMatch)
                return false;
        }
        // Check exclusion criteria
        if (criteria.exclude) {
            const hasExclusionMatch = criteria.exclude.some(criterion => this.evaluateCriterion(criterion, metadata));
            if (hasExclusionMatch)
                return false;
        }
        return true;
    }
    evaluateCriterion(criterion, metadata) {
        // Simple criterion evaluation (e.g., "browser=chrome", "deviceType=mobile")
        if (criterion.includes('=')) {
            const [key, value] = criterion.split('=');
            return metadata[key]?.toString().toLowerCase() === value.toLowerCase();
        }
        // Check if property exists
        return metadata[criterion] !== undefined;
    }
    selectVariation(experiment, participantId) {
        const { allocation } = experiment;
        switch (allocation.method) {
            case 'random':
                return this.randomVariationAssignment(experiment.variations);
            case 'hash':
                return this.hashVariationAssignment(experiment.variations, participantId);
            case 'sticky':
                return this.stickyVariationAssignment(experiment.variations, participantId);
            default:
                return this.randomVariationAssignment(experiment.variations);
        }
    }
    randomVariationAssignment(variations) {
        const random = Math.random() * 100;
        let cumulativeTraffic = 0;
        for (const variation of variations) {
            cumulativeTraffic += variation.traffic;
            if (random <= cumulativeTraffic) {
                return variation.id;
            }
        }
        return variations[0]?.id || null;
    }
    hashVariationAssignment(variations, participantId) {
        // Simple hash-based assignment for consistent assignments
        let hash = 0;
        for (let i = 0; i < participantId.length; i++) {
            const char = participantId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        const bucket = Math.abs(hash) % 100;
        let cumulativeTraffic = 0;
        for (const variation of variations) {
            cumulativeTraffic += variation.traffic;
            if (bucket < cumulativeTraffic) {
                return variation.id;
            }
        }
        return variations[0]?.id || null;
    }
    stickyVariationAssignment(variations, participantId) {
        // Use hash-based assignment but store in assignment cache for consistency
        const cacheKey = `sticky_${participantId}`;
        const cached = this.assignmentCache.get(cacheKey);
        if (cached && variations.some(v => v.id === cached)) {
            return cached;
        }
        const assigned = this.hashVariationAssignment(variations, participantId);
        if (assigned) {
            this.assignmentCache.set(cacheKey, assigned);
        }
        return assigned;
    }
    calculateExperimentResults(experiment) {
        const experimentEvents = this.events.filter(e => e.experimentId === experiment.id);
        const results = this.results.get(experiment.id);
        // Update variation results
        for (const variation of experiment.variations) {
            const variationEvents = experimentEvents.filter(e => e.variationId === variation.id);
            const variationResults = results.variations[variation.id];
            // Calculate metrics for this variation
            for (const metric of experiment.metrics) {
                const metricEvents = variationEvents.filter(e => e.metricId === metric.id);
                if (metricEvents.length > 0) {
                    const values = metricEvents.map(e => typeof e.value === 'number' ? e.value : (e.value ? 1 : 0));
                    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
                    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
                    const standardError = Math.sqrt(variance / values.length);
                    // Calculate confidence interval (95% by default)
                    const tValue = 1.96; // Approximate for large samples
                    const marginOfError = tValue * standardError;
                    variationResults.metrics[metric.id] = {
                        value: mean,
                        standardError,
                        confidenceInterval: [mean - marginOfError, mean + marginOfError],
                        sampleCount: values.length
                    };
                    // For conversion metrics
                    if (metric.type === 'conversion') {
                        const conversions = values.filter(v => v > 0).length;
                        const conversionRate = conversions / variationResults.sampleSize;
                        const seRate = Math.sqrt((conversionRate * (1 - conversionRate)) / variationResults.sampleSize);
                        const marginOfErrorRate = tValue * seRate;
                        variationResults.conversions = {
                            conversions,
                            conversionRate,
                            confidenceInterval: [
                                Math.max(0, conversionRate - marginOfErrorRate),
                                Math.min(1, conversionRate + marginOfErrorRate)
                            ]
                        };
                    }
                }
            }
        }
        // Perform statistical tests
        this.performStatisticalTests(experiment, results);
        // Determine winner
        this.determineWinner(experiment, results);
        // Update power analysis
        this.updatePowerAnalysis(experiment, results);
        results.analyzedAt = Date.now();
        return results;
    }
    performStatisticalTests(experiment, results) {
        const controlVariation = experiment.variations.find(v => v.isControl);
        if (!controlVariation)
            return;
        const controlResults = results.variations[controlVariation.id];
        for (const variation of experiment.variations) {
            if (variation.isControl)
                continue;
            const variationResults = results.variations[variation.id];
            for (const metric of experiment.metrics) {
                const controlMetric = controlResults.metrics[metric.id];
                const variationMetric = variationResults.metrics[metric.id];
                if (controlMetric && variationMetric) {
                    const testKey = `${variation.id}_${metric.id}`;
                    if (metric.type === 'conversion') {
                        // Use Z-test for conversion rates
                        results.statistics.tests[testKey] = this.performZTest(controlResults.conversions, variationResults.conversions, controlResults.sampleSize, variationResults.sampleSize);
                    }
                    else {
                        // Use T-test for numeric metrics
                        results.statistics.tests[testKey] = this.performTTest(controlMetric, variationMetric);
                    }
                }
            }
        }
        // Apply multiple comparisons correction
        this.applyMultipleComparisonsCorrection(results.statistics);
        // Determine overall significance
        results.statistics.overallSignificance = Object.values(results.statistics.tests)
            .some(test => test.isSignificant);
    }
    performTTest(control, treatment) {
        const meanDiff = treatment.value - control.value;
        const pooledSE = Math.sqrt(Math.pow(control.standardError, 2) + Math.pow(treatment.standardError, 2));
        const tStatistic = pooledSE > 0 ? meanDiff / pooledSE : 0;
        const degreesOfFreedom = (control.sampleCount + treatment.sampleCount) - 2;
        // Approximate p-value calculation (simplified)
        const pValue = this.approximateTTestPValue(Math.abs(tStatistic), degreesOfFreedom);
        // Effect size (Cohen's d)
        const pooledStd = Math.sqrt(((control.sampleCount - 1) * Math.pow(control.standardError * Math.sqrt(control.sampleCount), 2) +
            (treatment.sampleCount - 1) * Math.pow(treatment.standardError * Math.sqrt(treatment.sampleCount), 2)) /
            degreesOfFreedom);
        const effectSize = pooledStd > 0 ? meanDiff / pooledStd : 0;
        return {
            testType: 'ttest',
            pValue,
            statistic: tStatistic,
            isSignificant: pValue < 0.05,
            effectSize,
            confidenceInterval: [
                meanDiff - 1.96 * pooledSE,
                meanDiff + 1.96 * pooledSE
            ]
        };
    }
    performZTest(control, treatment, controlSampleSize, treatmentSampleSize) {
        if (!control || !treatment) {
            return {
                testType: 'ztest',
                pValue: 1,
                statistic: 0,
                isSignificant: false,
                effectSize: 0,
                confidenceInterval: [0, 0]
            };
        }
        const p1 = control.conversionRate;
        const p2 = treatment.conversionRate;
        const n1 = controlSampleSize;
        const n2 = treatmentSampleSize;
        // Pooled proportion
        const pPool = (control.conversions + treatment.conversions) / (n1 + n2);
        // Standard error
        const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
        // Z statistic
        const zStatistic = se > 0 ? (p2 - p1) / se : 0;
        // P-value (two-tailed)
        const pValue = 2 * (1 - this.standardNormalCDF(Math.abs(zStatistic)));
        // Effect size (relative lift)
        const effectSize = p1 > 0 ? (p2 - p1) / p1 : 0;
        return {
            testType: 'ztest',
            pValue,
            statistic: zStatistic,
            isSignificant: pValue < 0.05,
            effectSize,
            confidenceInterval: [
                (p2 - p1) - 1.96 * se,
                (p2 - p1) + 1.96 * se
            ]
        };
    }
    applyMultipleComparisonsCorrection(statistics) {
        const pValues = Object.values(statistics.tests).map(test => test.pValue);
        // Benjamini-Hochberg procedure
        const sortedPValues = pValues
            .map((p, index) => ({ p, index }))
            .sort((a, b) => a.p - b.p);
        const adjustedPValues = {};
        const testKeys = Object.keys(statistics.tests);
        for (let i = sortedPValues.length - 1; i >= 0; i--) {
            const { p, index } = sortedPValues[i];
            const adjustedP = Math.min(1, p * pValues.length / (i + 1));
            // Ensure monotonicity
            const previousAdjustedP = i < sortedPValues.length - 1
                ? adjustedPValues[testKeys[sortedPValues[i + 1].index]]
                : 1;
            adjustedPValues[testKeys[index]] = Math.min(adjustedP, previousAdjustedP);
        }
        statistics.multipleComparisons.adjustedPValues = adjustedPValues;
        // Update significance based on adjusted p-values
        for (const [testKey, test] of Object.entries(statistics.tests)) {
            const adjustedP = adjustedPValues[testKey];
            if (adjustedP !== undefined) {
                test.isSignificant = adjustedP < 0.05;
            }
        }
    }
    determineWinner(experiment, results) {
        const significantTests = Object.entries(results.statistics.tests)
            .filter(([, test]) => test.isSignificant);
        if (significantTests.length === 0) {
            delete results.winner;
            return;
        }
        // Find the variation with the best performance on primary metrics
        let bestVariation = null;
        let bestLift = -Infinity;
        let bestConfidence = 0;
        for (const variation of experiment.variations) {
            if (variation.isControl)
                continue;
            const primaryMetricTests = significantTests.filter(([testKey]) => {
                const [variationId, metricId] = testKey.split('_');
                const metric = experiment.metrics.find(m => m.id === metricId);
                return variationId === variation.id && metric?.priority === 'primary';
            });
            if (primaryMetricTests.length > 0) {
                const avgLift = primaryMetricTests.reduce((sum, [, test]) => sum + test.effectSize, 0) / primaryMetricTests.length;
                const avgConfidence = 1 - (primaryMetricTests.reduce((sum, [, test]) => sum + test.pValue, 0) / primaryMetricTests.length);
                if (avgLift > bestLift) {
                    bestVariation = variation.id;
                    bestLift = avgLift;
                    bestConfidence = avgConfidence;
                }
            }
        }
        if (bestVariation) {
            results.winner = {
                variationId: bestVariation,
                confidence: Math.min(0.99, bestConfidence),
                lift: bestLift
            };
        }
    }
    updatePowerAnalysis(experiment, results) {
        const totalSampleSize = results.sampleSize.total;
        const requiredSampleSize = experiment.duration.minSampleSize;
        // Simplified power calculation
        const observedPower = Math.min(1, totalSampleSize / requiredSampleSize);
        results.statistics.power = {
            observedPower,
            requiredSampleSize,
            actualSampleSize: totalSampleSize
        };
    }
    approximateTTestPValue(tStatistic, degreesOfFreedom) {
        // Simplified p-value approximation for t-test
        // This is a rough approximation - in production, use a proper statistical library
        if (degreesOfFreedom > 30) {
            // Use normal approximation for large df
            return 2 * (1 - this.standardNormalCDF(tStatistic));
        }
        else {
            // Very rough approximation for small df
            return Math.min(1, 2 * Math.exp(-0.5 * tStatistic * tStatistic));
        }
    }
    standardNormalCDF(x) {
        // Approximation of standard normal CDF
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }
    erf(x) {
        // Approximation of error function
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return sign * y;
    }
    scheduleResultsUpdate(experimentId) {
        // Debounced results update to avoid excessive computation
        const updateKey = `update_${experimentId}`;
        if (this[updateKey]) {
            clearTimeout(this[updateKey]);
        }
        this[updateKey] = setTimeout(() => {
            this.analyzeExperiment(experimentId);
            delete this[updateKey];
        }, 10000); // Update every 10 seconds at most
    }
    setupCleanupSchedule() {
        // Clean up old events and participants periodically
        setInterval(() => {
            const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
            // Remove old events
            this.events = this.events.filter(event => event.timestamp > cutoff);
            // Remove participants from completed/cancelled experiments
            for (const [key, participant] of Array.from(this.participants.entries())) {
                const experiment = this.experiments.get(participant.experimentId);
                if (!experiment ||
                    experiment.status === 'completed' ||
                    experiment.status === 'cancelled' ||
                    participant.assignedAt < cutoff) {
                    this.participants.delete(key);
                }
            }
        }, 24 * 60 * 60 * 1000); // Run daily
    }
}
/**
 * Global experiment manager instance
 */
export const experimentManager = new ExperimentManager();
//# sourceMappingURL=ExperimentManager.js.map