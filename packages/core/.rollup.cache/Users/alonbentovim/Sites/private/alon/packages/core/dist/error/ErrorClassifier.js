export class ErrorClassifier {
    constructor() {
        this.rules = new Map();
        this.defaultRules = [];
        this.metrics = {
            totalClassifications: 0,
            accurateClassifications: 0,
            averageConfidence: 0,
            classificationsByType: {},
            classificationsBySeverity: {},
            rulePerformance: {}
        };
        this.initializeDefaultRules();
    }
    initializeDefaultRules() {
        this.defaultRules = [
            // Network errors
            {
                id: 'network-timeout',
                name: 'Network Timeout',
                priority: 10,
                weight: 1.0,
                matcher: {
                    messagePattern: /timeout|timed out|ETIMEDOUT|ENOTFOUND/i,
                    codePattern: /TIMEOUT|ETIMEDOUT|ENOTFOUND/i
                },
                classification: {
                    type: 'timeout',
                    severity: 'medium',
                    recoverability: 'transient',
                    category: 'network',
                    confidence: 0.9
                },
                enabled: true
            },
            {
                id: 'network-connection',
                name: 'Network Connection Error',
                priority: 9,
                weight: 1.0,
                matcher: {
                    messagePattern: /connection|ECONNREFUSED|ECONNRESET|ENETUNREACH/i,
                    codePattern: /ECONNREFUSED|ECONNRESET|ENETUNREACH|ENOTFOUND/i
                },
                classification: {
                    type: 'network',
                    severity: 'high',
                    recoverability: 'transient',
                    category: 'connectivity',
                    confidence: 0.85
                },
                enabled: true
            },
            // Authentication errors
            {
                id: 'auth-unauthorized',
                name: 'Unauthorized Access',
                priority: 8,
                weight: 1.0,
                matcher: {
                    statusCode: [401, 403],
                    messagePattern: /unauthorized|forbidden|invalid.*token|expired.*token/i
                },
                classification: {
                    type: 'authentication',
                    severity: 'high',
                    recoverability: 'recoverable',
                    category: 'security',
                    confidence: 0.95
                },
                enabled: true
            },
            // Validation errors
            {
                id: 'validation-input',
                name: 'Input Validation Error',
                priority: 7,
                weight: 1.0,
                matcher: {
                    statusCode: [400, 422],
                    messagePattern: /validation|invalid.*input|bad.*request|malformed/i
                },
                classification: {
                    type: 'validation',
                    severity: 'medium',
                    recoverability: 'recoverable',
                    category: 'input',
                    confidence: 0.8
                },
                enabled: true
            },
            // Rate limiting
            {
                id: 'rate-limit',
                name: 'Rate Limit Exceeded',
                priority: 6,
                weight: 1.0,
                matcher: {
                    statusCode: [429],
                    messagePattern: /rate.*limit|too.*many.*requests|quota.*exceeded/i
                },
                classification: {
                    type: 'rate_limit',
                    severity: 'medium',
                    recoverability: 'transient',
                    category: 'throttling',
                    confidence: 0.95
                },
                enabled: true
            },
            // Server errors
            {
                id: 'server-error',
                name: 'Server Error',
                priority: 5,
                weight: 1.0,
                matcher: {
                    statusCode: [500, 502, 503, 504],
                    messagePattern: /server.*error|internal.*error|service.*unavailable/i
                },
                classification: {
                    type: 'system',
                    severity: 'high',
                    recoverability: 'transient',
                    category: 'server',
                    confidence: 0.7
                },
                enabled: true
            },
            // Configuration errors
            {
                id: 'config-error',
                name: 'Configuration Error',
                priority: 4,
                weight: 1.0,
                matcher: {
                    messagePattern: /config|configuration|missing.*key|invalid.*setting/i,
                    contextMatches: { adapter: /.*/ }
                },
                classification: {
                    type: 'configuration',
                    severity: 'high',
                    recoverability: 'permanent',
                    category: 'setup',
                    confidence: 0.8
                },
                enabled: true
            },
            // Data errors
            {
                id: 'data-error',
                name: 'Data Error',
                priority: 3,
                weight: 1.0,
                matcher: {
                    messagePattern: /data|parse|json|xml|format|corrupted/i
                },
                classification: {
                    type: 'data',
                    severity: 'medium',
                    recoverability: 'permanent',
                    category: 'format',
                    confidence: 0.6
                },
                enabled: true
            },
            // Security errors
            {
                id: 'security-error',
                name: 'Security Error',
                priority: 9,
                weight: 1.0,
                matcher: {
                    messagePattern: /security|xss|injection|csrf|cors/i,
                    statusCode: [403, 451]
                },
                classification: {
                    type: 'security',
                    severity: 'critical',
                    recoverability: 'permanent',
                    category: 'security',
                    confidence: 0.9
                },
                enabled: true
            }
        ];
        // Register default rules
        this.defaultRules.forEach(rule => this.registerRule(rule));
    }
    classify(error, context) {
        this.metrics.totalClassifications++;
        const topRule = Array.from(this.rules.values())
            .filter(rule => this.evaluateRule(rule, error, context))
            .sort((a, b) => b.priority - a.priority)[0];
        if (!topRule) {
            return this.createDefaultClassification(error, context);
        }
        return this.applyRule(topRule, error, context);
    }
    evaluateRule(rule, error, context) {
        const matcher = rule.matcher;
        // Check message pattern
        if (matcher.messagePattern && !matcher.messagePattern.test(error.message)) {
            return false;
        }
        // Check name pattern
        if (matcher.namePattern && !matcher.namePattern.test(error.name)) {
            return false;
        }
        // Check code pattern
        if (matcher.codePattern && error.code && !matcher.codePattern.test(error.code)) {
            return false;
        }
        // Check status code
        if (matcher.statusCode && error.statusCode !== matcher.statusCode) {
            return false;
        }
        // Check context matches
        if (matcher.contextMatches && context) {
            const contextStr = JSON.stringify(context);
            if (!matcher.contextMatches.test(contextStr)) {
                return false;
            }
        }
        // Check stack trace pattern (if available in matcher)
        if (matcher.stackPattern && error.stack && !matcher.stackPattern.test(error.stack)) {
            return false;
        }
        return true;
    }
    createDefaultClassification(error, context) {
        let type = 'unknown';
        let severity = 'medium';
        let recoverability = 'unknown';
        // Basic heuristics for unknown errors
        if (error.name === 'TypeError') {
            type = 'system';
            severity = 'high';
            recoverability = 'permanent';
        }
        else if (error.name === 'ReferenceError') {
            type = 'system';
            severity = 'critical';
            recoverability = 'permanent';
        }
        else if (error.message.toLowerCase().includes('network')) {
            type = 'network';
            severity = 'medium';
            recoverability = 'transient';
        }
        return {
            type,
            severity,
            recoverability,
            category: 'unknown',
            confidence: 0.3
        };
    }
    applyRule(rule, error, context) {
        const baseClassification = rule.classification;
        // Enhance classification based on error details
        const severity = this.refineSeverity(baseClassification.severity, error, context);
        const recoverability = this.refineRecoverability(baseClassification.recoverability, error, context);
        const confidence = this.calculateConfidence(baseClassification.confidence, rule, error, context);
        return {
            type: baseClassification.type,
            severity,
            recoverability,
            category: baseClassification.category,
            subcategory: baseClassification.subcategory || 'general',
            confidence
        };
    }
    refineSeverity(baseSeverity, error, context) {
        // Adjust severity based on context
        if (context?.system?.environment === 'production') {
            // Elevate severity in production
            if (baseSeverity === 'medium')
                return 'high';
            if (baseSeverity === 'low')
                return 'medium';
        }
        // Check for cascading failures
        if (context?.operation?.retryCount && context.operation.retryCount > 3) {
            if (baseSeverity === 'medium')
                return 'high';
            if (baseSeverity === 'high')
                return 'critical';
        }
        return baseSeverity;
    }
    refineRecoverability(baseRecoverability, error, context) {
        // Configuration errors in production are less likely to be recoverable
        if (baseRecoverability === 'recoverable' &&
            context?.system?.environment === 'production' &&
            error.message.toLowerCase().includes('config')) {
            return 'permanent';
        }
        return baseRecoverability;
    }
    calculateConfidence(baseConfidence, rule, error, context) {
        let confidence = baseConfidence;
        // Increase confidence for exact matches
        if (rule.matcher.messagePattern && rule.matcher.messagePattern.test(error.message)) {
            confidence = Math.min(1.0, confidence + 0.1);
        }
        // Decrease confidence for generic patterns
        if (rule.matcher.messagePattern?.source && rule.matcher.messagePattern.source.length < 10) {
            confidence = Math.max(0.1, confidence - 0.1);
        }
        // Adjust based on context availability
        if (context && Object.keys(context).length > 0) {
            confidence = Math.min(1.0, confidence + 0.05);
        }
        return Math.round(confidence * 100) / 100;
    }
    getDefaultClassification(error) {
        let type = 'unknown';
        let severity = 'medium';
        let recoverability = 'unknown';
        // Basic heuristics for unknown errors
        if (error.name === 'TypeError') {
            type = 'system';
            severity = 'high';
            recoverability = 'permanent';
        }
        else if (error.name === 'ReferenceError') {
            type = 'system';
            severity = 'critical';
            recoverability = 'permanent';
        }
        else if (error.message.toLowerCase().includes('network')) {
            type = 'network';
            severity = 'medium';
            recoverability = 'transient';
        }
        return {
            type,
            severity,
            recoverability,
            category: 'unknown',
            confidence: 0.3
        };
    }
    updateClassificationMetrics(classification, ruleId) {
        // Update type metrics
        if (!this.metrics.classificationsByType[classification.type]) {
            this.metrics.classificationsByType[classification.type] = 0;
        }
        this.metrics.classificationsByType[classification.type]++;
        // Update severity metrics
        if (!this.metrics.classificationsBySeverity[classification.severity]) {
            this.metrics.classificationsBySeverity[classification.severity] = 0;
        }
        this.metrics.classificationsBySeverity[classification.severity]++;
        // Update rule performance
        if (!this.metrics.rulePerformance[ruleId]) {
            this.metrics.rulePerformance[ruleId] = {
                ruleId,
                accuracy: 0,
                precision: 0,
                recall: 0,
                falsePositives: 0,
                falseNegatives: 0,
                totalClassifications: 0
            };
        }
        this.metrics.rulePerformance[ruleId].totalClassifications++;
        // Update average confidence
        const totalClassifications = this.metrics.totalClassifications;
        this.metrics.averageConfidence =
            (this.metrics.averageConfidence * (totalClassifications - 1) + classification.confidence) / totalClassifications;
    }
    registerRule(rule) {
        this.rules.set(rule.id, { ...rule });
    }
    removeRule(ruleId) {
        this.rules.delete(ruleId);
    }
    getClassificationRules() {
        return Array.from(this.rules.values());
    }
    updateRuleWeights(performance) {
        const rule = this.rules.get(performance.ruleId);
        if (!rule)
            return;
        // Update rule weight based on performance
        const accuracy = performance.accuracy;
        if (accuracy > 0.9) {
            rule.weight = Math.min(2.0, rule.weight * 1.1);
        }
        else if (accuracy < 0.5) {
            rule.weight = Math.max(0.1, rule.weight * 0.9);
        }
        // Update rule in the map
        this.rules.set(rule.id, rule);
        // Update metrics
        this.metrics.rulePerformance[performance.ruleId] = performance;
    }
    getMetrics() {
        return { ...this.metrics };
    }
    reset() {
        this.metrics = {
            totalClassifications: 0,
            accurateClassifications: 0,
            averageConfidence: 0,
            classificationsByType: {},
            classificationsBySeverity: {},
            rulePerformance: {}
        };
    }
    exportRules() {
        const rules = Array.from(this.rules.values());
        return JSON.stringify(rules, null, 2);
    }
    importRules(rulesJson) {
        try {
            const rules = JSON.parse(rulesJson);
            rules.forEach(rule => this.registerRule(rule));
        }
        catch (error) {
            throw new Error(`Failed to import rules: ${error}`);
        }
    }
    analyzeError(error, context) {
        const classification = this.classify(error, context);
        const matchingRules = Array.from(this.rules.values())
            .filter(rule => this.evaluateRule(rule, error, context))
            .map((rule) => rule.name);
        const suggestions = this.generateSuggestions(classification, error, context);
        return {
            classification,
            matchingRules,
            confidence: classification.confidence,
            suggestions
        };
    }
    generateSuggestions(classification, error, context) {
        const suggestions = [];
        switch (classification.type) {
            case 'network':
                suggestions.push('Check network connectivity');
                suggestions.push('Verify server endpoint is accessible');
                suggestions.push('Check for firewall or proxy issues');
                break;
            case 'authentication':
                suggestions.push('Verify API credentials');
                suggestions.push('Check token expiration');
                suggestions.push('Confirm user permissions');
                break;
            case 'validation':
                suggestions.push('Review input parameters');
                suggestions.push('Check data format requirements');
                suggestions.push('Validate required fields');
                break;
            case 'configuration':
                suggestions.push('Review configuration settings');
                suggestions.push('Check environment variables');
                suggestions.push('Verify adapter configuration');
                break;
            case 'rate_limit':
                suggestions.push('Implement retry with backoff');
                suggestions.push('Reduce request frequency');
                suggestions.push('Check rate limit quotas');
                break;
        }
        return suggestions;
    }
}
//# sourceMappingURL=ErrorClassifier.js.map