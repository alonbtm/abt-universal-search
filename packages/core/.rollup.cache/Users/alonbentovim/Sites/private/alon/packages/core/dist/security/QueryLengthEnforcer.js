/**
 * QueryLengthEnforcer - Buffer overflow protection and length validation
 * @description Configurable length limits with memory monitoring and buffer overflow protection
 */
/**
 * Query length enforcer with buffer overflow protection
 */
export class QueryLengthEnforcer {
    constructor(config, memoryThreshold = 100 * 1024 * 1024, // 100MB default
    processingTimeLimit = 10000 // 10 seconds default
    ) {
        this.config = config || {
            minLength: 1,
            maxLength: 1000,
            bufferLimit: 10000,
            onExceeded: 'reject'
        };
        this.memoryThreshold = memoryThreshold;
        this.processingTimeLimit = processingTimeLimit;
    }
    /**
     * Enforce length limits and validate buffer safety
     */
    enforceLength(input) {
        const startTime = Date.now();
        const errors = [];
        const warnings = [];
        if (!input || typeof input !== 'string') {
            return {
                isSecure: true,
                errors: [],
                warnings: [],
                riskLevel: 'low',
                recommendations: []
            };
        }
        // Check basic length constraints
        const lengthErrors = this.validateBasicLength(input);
        errors.push(...lengthErrors);
        // Check buffer overflow risks
        const bufferErrors = this.validateBufferSafety(input);
        errors.push(...bufferErrors);
        // Monitor memory usage
        const memoryWarnings = this.checkMemoryUsage(input);
        warnings.push(...memoryWarnings);
        // Check processing time
        const processingTime = Date.now() - startTime;
        if (processingTime > this.processingTimeLimit) {
            warnings.push({
                type: 'length_concern',
                message: `Processing time exceeded limit: ${processingTime}ms > ${this.processingTimeLimit}ms`,
                recommendation: 'Reduce input size or optimize processing'
            });
        }
        const riskLevel = this.calculateRiskLevel(errors, input.length);
        const recommendations = this.generateRecommendations(errors, warnings);
        return {
            isSecure: errors.length === 0,
            errors,
            warnings,
            riskLevel,
            recommendations
        };
    }
    /**
     * Validate basic length constraints
     */
    validateBasicLength(input) {
        const errors = [];
        if (input.length < this.config.minLength) {
            errors.push({
                type: 'buffer_overflow',
                message: `Input too short: ${input.length} < ${this.config.minLength}`,
                severity: 'medium',
                suggestion: `Provide at least ${this.config.minLength} characters`
            });
        }
        if (input.length > this.config.maxLength) {
            const severity = this.config.onExceeded === 'reject' ? 'high' : 'medium';
            errors.push({
                type: 'buffer_overflow',
                message: `Input exceeds maximum length: ${input.length} > ${this.config.maxLength}`,
                severity,
                suggestion: `Limit input to ${this.config.maxLength} characters`
            });
        }
        return errors;
    }
    /**
     * Validate buffer safety and overflow protection
     */
    validateBufferSafety(input) {
        const errors = [];
        // Check against absolute buffer limit
        if (input.length > this.config.bufferLimit) {
            errors.push({
                type: 'buffer_overflow',
                message: `Input exceeds buffer limit: ${input.length} > ${this.config.bufferLimit}`,
                severity: 'critical',
                suggestion: 'Input size poses critical security risk'
            });
        }
        // Check for potential exponential growth patterns
        const repeatedPatterns = this.detectRepeatedPatterns(input);
        if (repeatedPatterns.length > 0) {
            errors.push({
                type: 'buffer_overflow',
                message: `Repeated patterns detected that could cause buffer overflow: ${repeatedPatterns.length} patterns`,
                severity: 'high',
                suggestion: 'Remove repeated patterns to prevent buffer overflow attacks'
            });
        }
        // Check for nested structures that could cause stack overflow
        const nestingDepth = this.calculateNestingDepth(input);
        if (nestingDepth > 100) {
            errors.push({
                type: 'buffer_overflow',
                message: `Excessive nesting depth detected: ${nestingDepth} levels`,
                severity: 'high',
                suggestion: 'Reduce nesting depth to prevent stack overflow'
            });
        }
        // Check for potential zip bomb patterns
        const compressionRatio = this.estimateCompressionRatio(input);
        if (compressionRatio > 1000) {
            errors.push({
                type: 'buffer_overflow',
                message: `High compression ratio detected: ${compressionRatio}:1 (potential zip bomb)`,
                severity: 'critical',
                suggestion: 'Input may contain compressed malicious content'
            });
        }
        return errors;
    }
    /**
     * Check memory usage during processing
     */
    checkMemoryUsage(input) {
        const warnings = [];
        try {
            // Get memory usage (Node.js specific)
            const memUsage = process.memoryUsage();
            if (memUsage.heapUsed > this.memoryThreshold) {
                warnings.push({
                    type: 'length_concern',
                    message: `High memory usage detected: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
                    recommendation: 'Monitor memory usage and consider input size limits'
                });
            }
            // Estimate memory required for processing
            const estimatedMemory = input.length * 4; // Rough estimate for string processing
            if (estimatedMemory > this.memoryThreshold * 0.1) {
                warnings.push({
                    type: 'length_concern',
                    message: `Input may require significant memory: ~${Math.round(estimatedMemory / 1024 / 1024)}MB`,
                    recommendation: 'Consider processing input in chunks'
                });
            }
        }
        catch (error) {
            // Memory usage check failed (might be in browser environment)
            if (input.length > 50000) {
                warnings.push({
                    type: 'length_concern',
                    message: 'Large input detected, memory usage monitoring unavailable',
                    recommendation: 'Monitor performance with large inputs'
                });
            }
        }
        return warnings;
    }
    /**
     * Detect repeated patterns that could indicate attack attempts
     */
    detectRepeatedPatterns(input) {
        const patterns = [];
        const minPatternLength = 3;
        const maxPatternLength = 50;
        for (let len = minPatternLength; len <= Math.min(maxPatternLength, input.length / 4); len++) {
            for (let i = 0; i <= input.length - len * 3; i++) {
                const pattern = input.substring(i, i + len);
                const nextOccurrence = input.indexOf(pattern, i + len);
                if (nextOccurrence === i + len) {
                    // Found immediate repetition
                    let count = 2;
                    let pos = nextOccurrence + len;
                    while (pos + len <= input.length && input.substring(pos, pos + len) === pattern) {
                        count++;
                        pos += len;
                    }
                    if (count >= 10) { // Threshold for suspicious repetition
                        patterns.push(`${pattern} (${count} times)`);
                    }
                }
            }
        }
        return [...new Set(patterns)]; // Remove duplicates
    }
    /**
     * Calculate nesting depth for structures like brackets, quotes, etc.
     */
    calculateNestingDepth(input) {
        const openChars = ['(', '[', '{', '<', '"', "'"];
        const closeChars = [')', ']', '}', '>', '"', "'"];
        const stack = [];
        let maxDepth = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input[i];
            const openIndex = openChars.indexOf(char);
            if (openIndex !== -1) {
                stack.push(char);
                maxDepth = Math.max(maxDepth, stack.length);
            }
            else if (closeChars.includes(char)) {
                if (stack.length > 0) {
                    stack.pop();
                }
            }
        }
        return maxDepth;
    }
    /**
     * Estimate compression ratio to detect potential zip bombs
     */
    estimateCompressionRatio(input) {
        // Simple estimation based on character repetition
        const uniqueChars = new Set(input).size;
        const totalChars = input.length;
        if (uniqueChars === 0)
            return 1;
        // Higher ratio indicates more repetitive content
        const ratio = totalChars / uniqueChars;
        return Math.round(ratio);
    }
    /**
     * Calculate risk level based on errors and input size
     */
    calculateRiskLevel(errors, inputLength) {
        if (errors.some(e => e.severity === 'critical'))
            return 'critical';
        if (errors.some(e => e.severity === 'high'))
            return 'high';
        if (errors.some(e => e.severity === 'medium'))
            return 'medium';
        // Risk increases with input size even without explicit errors
        if (inputLength > this.config.bufferLimit * 0.8)
            return 'high';
        if (inputLength > this.config.maxLength * 0.8)
            return 'medium';
        return 'low';
    }
    /**
     * Generate recommendations based on validation results
     */
    generateRecommendations(errors, warnings) {
        const recommendations = [];
        if (errors.some(e => e.type === 'buffer_overflow')) {
            recommendations.push('Implement strict input length limits');
            recommendations.push('Use streaming or chunked processing for large inputs');
        }
        if (warnings.some(w => w.type === 'length_concern')) {
            recommendations.push('Monitor memory usage during input processing');
            recommendations.push('Consider implementing input size quotas');
        }
        if (errors.length > 0) {
            recommendations.push('Validate and sanitize all user input before processing');
        }
        return [...new Set(recommendations)];
    }
    /**
     * Truncate input to safe length
     */
    truncateToSafeLength(input) {
        if (!input || typeof input !== 'string') {
            return '';
        }
        if (input.length <= this.config.maxLength) {
            return input;
        }
        switch (this.config.onExceeded) {
            case 'truncate':
                return input.substring(0, this.config.maxLength);
            case 'reject':
                throw new Error(`Input length ${input.length} exceeds maximum ${this.config.maxLength}`);
            case 'warn':
                console.warn(`Input length ${input.length} exceeds maximum ${this.config.maxLength}`);
                return input;
            default:
                return input.substring(0, this.config.maxLength);
        }
    }
    /**
     * Check if input length is within safe limits
     */
    isSafeLength(input) {
        if (!input || typeof input !== 'string') {
            return true;
        }
        return input.length >= this.config.minLength &&
            input.length <= this.config.maxLength &&
            input.length <= this.config.bufferLimit;
    }
    /**
     * Get length statistics for monitoring
     */
    getLengthStats(input) {
        const startTime = Date.now();
        const originalLength = input ? input.length : 0;
        let memoryUsage;
        try {
            const mem = process.memoryUsage();
            memoryUsage = {
                heapUsed: mem.heapUsed,
                heapTotal: mem.heapTotal,
                external: mem.external,
                arrayBuffers: mem.arrayBuffers
            };
        }
        catch {
            memoryUsage = {
                heapUsed: 0,
                heapTotal: 0,
                external: 0,
                arrayBuffers: 0
            };
        }
        const processingTime = Date.now() - startTime;
        const bufferUtilization = originalLength / this.config.bufferLimit;
        return {
            originalLength,
            processedLength: originalLength,
            memoryUsage,
            processingTime,
            bufferUtilization
        };
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
//# sourceMappingURL=QueryLengthEnforcer.js.map