/**
 * Adaptive Optimizer - ML-based optimization system with pattern recognition
 * @description Analyzes performance patterns and provides intelligent optimization recommendations
 */

import {
  AdaptiveOptimizationConfig,
  OptimizationRecommendation,
  PerformanceMetrics,
  IAdaptiveOptimizer
} from '../types/Performance.js';

/**
 * Default adaptive optimization configuration
 */
const DEFAULT_CONFIG: AdaptiveOptimizationConfig = {
  enabled: true,
  algorithms: ['heuristic', 'reinforcement', 'bayesian'],
  objectives: ['response_time', 'memory_usage', 'cache_hit_rate', 'throughput'],
  weights: {
    response_time: 0.4,
    memory_usage: 0.3,
    cache_hit_rate: 0.2,
    throughput: 0.1
  },
  learning: {
    learningRate: 0.1,
    explorationRate: 0.2,
    convergenceThreshold: 0.01
  },
  intervals: {
    evaluation: 60000, // 1 minute
    adjustment: 300000, // 5 minutes
    reset: 86400000 // 24 hours
  }
};

/**
 * Performance Pattern Recognition
 */
class PatternRecognizer {
  private patterns: Map<string, {
    signature: number[];
    confidence: number;
    outcomes: Array<{ action: string; improvement: number }>;
  }>;

  constructor() {
    this.patterns = new Map();
  }

  analyzePattern(metrics: PerformanceMetrics[]): {
    pattern: string;
    confidence: number;
    recommendation: string;
  } {
    if (metrics.length < 5) {
      return {
        pattern: 'insufficient_data',
        confidence: 0.1,
        recommendation: 'Collect more performance data'
      };
    }

    const signature = this.extractSignature(metrics);
    const patternId = this.findSimilarPattern(signature);
    
    if (patternId) {
      const pattern = this.patterns.get(patternId)!;
      return {
        pattern: patternId,
        confidence: pattern.confidence,
        recommendation: this.generateRecommendationFromPattern(pattern)
      };
    }

    // Create new pattern
    const newPatternId = this.createNewPattern(signature);
    return {
      pattern: newPatternId,
      confidence: 0.5,
      recommendation: this.generateHeuristicRecommendation(metrics)
    };
  }

  learnFromOutcome(patternId: string, action: string, improvement: number): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    pattern.outcomes.push({ action, improvement });
    
    // Update confidence based on outcomes
    const averageImprovement = pattern.outcomes.reduce((sum, outcome) => sum + outcome.improvement, 0) / pattern.outcomes.length;
    pattern.confidence = Math.min(0.95, Math.max(0.1, averageImprovement));

    // Keep only recent outcomes
    if (pattern.outcomes.length > 20) {
      pattern.outcomes.shift();
    }
  }

  private extractSignature(metrics: PerformanceMetrics[]): number[] {
    const signature: number[] = [];
    
    // Normalize metrics to 0-1 range for pattern matching
    const responseTimeMax = Math.max(...metrics.map(m => m.responseTime.average));
    const memoryMax = Math.max(...metrics.map(m => m.memory.heapUsed));
    const throughputMax = Math.max(...metrics.map(m => m.throughput.requestsPerSecond));
    
    for (const metric of metrics.slice(-5)) { // Last 5 measurements
      signature.push(
        responseTimeMax > 0 ? metric.responseTime.average / responseTimeMax : 0,
        memoryMax > 0 ? metric.memory.heapUsed / memoryMax : 0,
        throughputMax > 0 ? metric.throughput.requestsPerSecond / throughputMax : 0,
        metric.cache.hitRate,
        metric.errors.errorRate
      );
    }
    
    return signature;
  }

  private findSimilarPattern(signature: number[]): string | null {
    let bestMatch: string | null = null;
    let bestSimilarity = 0;

    for (const [patternId, pattern] of this.patterns.entries()) {
      const similarity = this.calculateCosineSimilarity(signature, pattern.signature);
      if (similarity > 0.8 && similarity > bestSimilarity) {
        bestMatch = patternId;
        bestSimilarity = similarity;
      }
    }

    return bestMatch;
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const norm = Math.sqrt(normA) * Math.sqrt(normB);
    return norm === 0 ? 0 : dotProduct / norm;
  }

  private createNewPattern(signature: number[]): string {
    const patternId = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.patterns.set(patternId, {
      signature,
      confidence: 0.5,
      outcomes: []
    });

    return patternId;
  }

  private generateRecommendationFromPattern(pattern: { outcomes: Array<{ action: string; improvement: number }> }): string {
    if (pattern.outcomes.length === 0) {
      return 'Monitor performance and collect optimization data';
    }

    // Find the action with the best average improvement
    const actionImprovements = new Map<string, number[]>();
    
    for (const outcome of pattern.outcomes) {
      if (!actionImprovements.has(outcome.action)) {
        actionImprovements.set(outcome.action, []);
      }
      actionImprovements.get(outcome.action)!.push(outcome.improvement);
    }

    let bestAction = '';
    let bestImprovement = 0;

    for (const [action, improvements] of actionImprovements.entries()) {
      const avgImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
      if (avgImprovement > bestImprovement) {
        bestAction = action;
        bestImprovement = avgImprovement;
      }
    }

    return bestAction || 'Continue monitoring performance';
  }

  private generateHeuristicRecommendation(metrics: PerformanceMetrics[]): string {
    const latest = metrics[metrics.length - 1];
    
    if (latest.responseTime.average > 1000) {
      return 'Implement caching to reduce response times';
    }
    
    if (latest.memory.heapUsed > 500 * 1024 * 1024) {
      return 'Optimize memory usage and implement garbage collection';
    }
    
    if (latest.cache.hitRate < 0.7) {
      return 'Improve cache strategy and hit rates';
    }
    
    if (latest.errors.errorRate > 0.05) {
      return 'Implement error handling and resilience patterns';
    }

    return 'Performance appears stable, continue monitoring';
  }
}

/**
 * Reinforcement Learning Optimizer
 */
class ReinforcementLearningOptimizer {
  private qTable: Map<string, Map<string, number>>;
  private learningRate: number;
  private explorationRate: number;
  private discount: number;
  private actions: string[];

  constructor(config: AdaptiveOptimizationConfig['learning']) {
    this.qTable = new Map();
    this.learningRate = config.learningRate;
    this.explorationRate = config.explorationRate;
    this.discount = 0.9;
    
    this.actions = [
      'increase_cache_size',
      'decrease_cache_ttl',
      'increase_cache_ttl',
      'enable_compression',
      'optimize_queries',
      'increase_memory_limit',
      'trigger_garbage_collection',
      'scale_resources',
      'optimize_algorithms',
      'reduce_batch_size'
    ];
  }

  selectAction(state: string): string {
    // ε-greedy action selection
    if (Math.random() < this.explorationRate) {
      // Explore: random action
      return this.actions[Math.floor(Math.random() * this.actions.length)];
    } else {
      // Exploit: best known action
      return this.getBestAction(state);
    }
  }

  updateQValue(state: string, action: string, reward: number, nextState: string): void {
    if (!this.qTable.has(state)) {
      this.qTable.set(state, new Map());
    }
    
    const stateActions = this.qTable.get(state)!;
    const currentQ = stateActions.get(action) || 0;
    const nextStateMaxQ = this.getMaxQValue(nextState);
    
    // Q-learning update rule
    const newQ = currentQ + this.learningRate * (reward + this.discount * nextStateMaxQ - currentQ);
    stateActions.set(action, newQ);
  }

  getActionValues(state: string): Map<string, number> {
    return this.qTable.get(state) || new Map();
  }

  private getBestAction(state: string): string {
    const stateActions = this.qTable.get(state);
    if (!stateActions || stateActions.size === 0) {
      return this.actions[0]; // Default action
    }

    let bestAction = '';
    let bestValue = -Infinity;

    for (const [action, value] of stateActions.entries()) {
      if (value > bestValue) {
        bestAction = action;
        bestValue = value;
      }
    }

    return bestAction || this.actions[0];
  }

  private getMaxQValue(state: string): number {
    const stateActions = this.qTable.get(state);
    if (!stateActions || stateActions.size === 0) {
      return 0;
    }

    return Math.max(...stateActions.values());
  }
}

/**
 * Bayesian Optimizer
 */
class BayesianOptimizer {
  private observations: Array<{
    parameters: Record<string, number>;
    objective: number;
    timestamp: number;
  }>;
  private parameterBounds: Map<string, { min: number; max: number }>;

  constructor() {
    this.observations = [];
    this.parameterBounds = new Map();
    
    // Initialize parameter bounds
    this.parameterBounds.set('cache_size', { min: 100, max: 10000 });
    this.parameterBounds.set('cache_ttl', { min: 60, max: 3600 });
    this.parameterBounds.set('compression_level', { min: 1, max: 9 });
    this.parameterBounds.set('memory_threshold', { min: 50, max: 1000 });
    this.parameterBounds.set('gc_interval', { min: 10, max: 300 });
  }

  suggestParameters(): Record<string, number> {
    if (this.observations.length < 5) {
      // Random exploration for initial observations
      return this.randomSample();
    }

    // Use Gaussian Process regression to suggest next parameters
    return this.bayesianOptimization();
  }

  addObservation(parameters: Record<string, number>, objective: number): void {
    this.observations.push({
      parameters: { ...parameters },
      objective,
      timestamp: Date.now()
    });

    // Keep only recent observations
    if (this.observations.length > 100) {
      this.observations.shift();
    }
  }

  getBestParameters(): Record<string, number> | null {
    if (this.observations.length === 0) return null;

    return this.observations.reduce((best, obs) => 
      obs.objective > best.objective ? obs : best
    ).parameters;
  }

  private randomSample(): Record<string, number> {
    const parameters: Record<string, number> = {};
    
    for (const [param, bounds] of this.parameterBounds.entries()) {
      parameters[param] = bounds.min + Math.random() * (bounds.max - bounds.min);
    }

    return parameters;
  }

  private bayesianOptimization(): Record<string, number> {
    // Simplified Bayesian optimization using acquisition function
    // In a real implementation, this would use Gaussian Process regression
    
    const candidates = [];
    const numCandidates = 50;

    // Generate candidate points
    for (let i = 0; i < numCandidates; i++) {
      candidates.push(this.randomSample());
    }

    // Evaluate acquisition function for each candidate
    let bestCandidate = candidates[0];
    let bestScore = this.acquisitionFunction(bestCandidate);

    for (const candidate of candidates) {
      const score = this.acquisitionFunction(candidate);
      if (score > bestScore) {
        bestCandidate = candidate;
        bestScore = score;
      }
    }

    return bestCandidate;
  }

  private acquisitionFunction(parameters: Record<string, number>): number {
    // Upper Confidence Bound (UCB) acquisition function
    const prediction = this.predictObjective(parameters);
    const uncertainty = this.estimateUncertainty(parameters);
    const kappa = 2.0; // Exploration parameter
    
    return prediction.mean + kappa * uncertainty;
  }

  private predictObjective(parameters: Record<string, number>): { mean: number; std: number } {
    if (this.observations.length === 0) {
      return { mean: 0, std: 1 };
    }

    // Simplified prediction using weighted average based on parameter similarity
    let weightedSum = 0;
    let totalWeight = 0;

    for (const obs of this.observations) {
      const similarity = this.calculateParameterSimilarity(parameters, obs.parameters);
      const weight = Math.exp(-similarity * 5); // Exponential decay
      
      weightedSum += obs.objective * weight;
      totalWeight += weight;
    }

    const mean = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const variance = this.calculateVariance(parameters);
    
    return { mean, std: Math.sqrt(variance) };
  }

  private estimateUncertainty(parameters: Record<string, number>): number {
    // Estimate uncertainty based on distance to observed points
    if (this.observations.length === 0) return 1;

    let minDistance = Infinity;
    
    for (const obs of this.observations) {
      const distance = this.calculateParameterSimilarity(parameters, obs.parameters);
      minDistance = Math.min(minDistance, distance);
    }

    // Higher distance = higher uncertainty
    return Math.min(1, minDistance / 2);
  }

  private calculateParameterSimilarity(params1: Record<string, number>, params2: Record<string, number>): number {
    let sumSquaredDiff = 0;
    let count = 0;

    for (const param in params1) {
      if (param in params2) {
        const bounds = this.parameterBounds.get(param);
        if (bounds) {
          // Normalize by parameter range
          const range = bounds.max - bounds.min;
          const normalizedDiff = (params1[param] - params2[param]) / range;
          sumSquaredDiff += normalizedDiff * normalizedDiff;
          count++;
        }
      }
    }

    return count > 0 ? Math.sqrt(sumSquaredDiff / count) : 0;
  }

  private calculateVariance(parameters: Record<string, number>): number {
    // Simplified variance calculation
    const similarities = this.observations.map(obs => 
      this.calculateParameterSimilarity(parameters, obs.parameters)
    );
    
    const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
    return Math.max(0.01, 1 - avgSimilarity); // Higher similarity = lower variance
  }
}

/**
 * Adaptive Optimizer Implementation
 */
export class AdaptiveOptimizer implements IAdaptiveOptimizer {
  private config: AdaptiveOptimizationConfig;
  private patternRecognizer: PatternRecognizer;
  private rlOptimizer: ReinforcementLearningOptimizer;
  private bayesianOptimizer: BayesianOptimizer;
  private performanceHistory: PerformanceMetrics[];
  private optimizationHistory: Array<{
    recommendation: OptimizationRecommendation;
    beforeMetrics: PerformanceMetrics;
    afterMetrics?: PerformanceMetrics;
    improvement?: number;
    timestamp: number;
  }>;
  private state: {
    learningProgress: number;
    optimizationsApplied: number;
    successRate: number;
    confidence: number;
  };

  constructor(config: Partial<AdaptiveOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.patternRecognizer = new PatternRecognizer();
    this.rlOptimizer = new ReinforcementLearningOptimizer(this.config.learning);
    this.bayesianOptimizer = new BayesianOptimizer();
    this.performanceHistory = [];
    this.optimizationHistory = [];
    
    this.state = {
      learningProgress: 0,
      optimizationsApplied: 0,
      successRate: 0,
      confidence: 0.1
    };

    this.startLearningLoop();
  }

  /**
   * Analyze performance patterns
   */
  analyzePatterns(metrics: PerformanceMetrics[]): Array<{
    pattern: string;
    confidence: number;
    recommendation: string;
  }> {
    this.performanceHistory.push(...metrics);
    
    // Keep only recent history
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }

    const patterns = [];
    
    // Pattern recognition analysis
    const patternResult = this.patternRecognizer.analyzePattern(this.performanceHistory);
    patterns.push(patternResult);

    // Trend analysis
    const trendPattern = this.analyzeTrends(metrics);
    patterns.push(trendPattern);

    // Anomaly detection
    const anomalyPattern = this.detectAnomalies(metrics);
    patterns.push(anomalyPattern);

    return patterns;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(
    currentMetrics: PerformanceMetrics,
    historicalMetrics: PerformanceMetrics[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Get pattern-based recommendations
    const patterns = this.analyzePatterns([...historicalMetrics, currentMetrics]);
    
    // Generate recommendations based on different algorithms
    if (this.config.algorithms.includes('heuristic')) {
      recommendations.push(...this.generateHeuristicRecommendations(currentMetrics, historicalMetrics));
    }

    if (this.config.algorithms.includes('reinforcement')) {
      recommendations.push(...this.generateReinforcementRecommendations(currentMetrics));
    }

    if (this.config.algorithms.includes('bayesian')) {
      recommendations.push(...this.generateBayesianRecommendations(currentMetrics));
    }

    // Score and rank recommendations
    return this.rankRecommendations(recommendations, currentMetrics);
  }

  /**
   * Apply optimization
   */
  async applyOptimization(recommendation: OptimizationRecommendation): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    try {
      // Record the optimization attempt
      const historyEntry = {
        recommendation,
        beforeMetrics: this.performanceHistory[this.performanceHistory.length - 1],
        timestamp: Date.now()
      };
      
      this.optimizationHistory.push(historyEntry);
      this.state.optimizationsApplied++;

      // Simulate optimization application
      const result = await this.executeOptimization(recommendation);
      
      // Update state
      this.updateLearningProgress();
      
      return {
        success: true,
        result
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Learn from optimization results
   */
  learnFromResults(
    recommendation: OptimizationRecommendation,
    beforeMetrics: PerformanceMetrics,
    afterMetrics: PerformanceMetrics
  ): void {
    const improvement = this.calculateImprovement(beforeMetrics, afterMetrics);
    
    // Update optimization history
    const historyEntry = this.optimizationHistory.find(h => h.recommendation.id === recommendation.id);
    if (historyEntry) {
      historyEntry.afterMetrics = afterMetrics;
      historyEntry.improvement = improvement;
    }

    // Update reinforcement learning
    if (this.config.algorithms.includes('reinforcement')) {
      const state = this.encodeState(beforeMetrics);
      const nextState = this.encodeState(afterMetrics);
      const reward = improvement;
      
      this.rlOptimizer.updateQValue(state, recommendation.type, reward, nextState);
    }

    // Update Bayesian optimizer
    if (this.config.algorithms.includes('bayesian')) {
      const parameters = this.extractParameters(recommendation);
      this.bayesianOptimizer.addObservation(parameters, improvement);
    }

    // Update pattern recognizer
    const patternResult = this.patternRecognizer.analyzePattern(this.performanceHistory);
    this.patternRecognizer.learnFromOutcome(patternResult.pattern, recommendation.type, improvement);

    // Update state
    this.updateSuccessRate();
    this.updateConfidence();
  }

  /**
   * Get optimizer state
   */
  getState(): {
    learningProgress: number;
    optimizationsApplied: number;
    successRate: number;
    confidence: number;
  } {
    return { ...this.state };
  }

  // Private implementation methods

  private analyzeTrends(metrics: PerformanceMetrics[]): {
    pattern: string;
    confidence: number;
    recommendation: string;
  } {
    if (metrics.length < 3) {
      return {
        pattern: 'insufficient_trend_data',
        confidence: 0.1,
        recommendation: 'Collect more data for trend analysis'
      };
    }

    const responseTimes = metrics.map(m => m.responseTime.average);
    const memoryUsages = metrics.map(m => m.memory.heapUsed);
    const errorRates = metrics.map(m => m.errors.errorRate);

    const responseTimeTrend = this.calculateTrend(responseTimes);
    const memoryTrend = this.calculateTrend(memoryUsages);
    const errorTrend = this.calculateTrend(errorRates);

    if (responseTimeTrend > 0.1) {
      return {
        pattern: 'increasing_response_time',
        confidence: 0.8,
        recommendation: 'Response times are trending upward - implement caching or optimization'
      };
    }

    if (memoryTrend > 0.1) {
      return {
        pattern: 'increasing_memory_usage',
        confidence: 0.8,
        recommendation: 'Memory usage is trending upward - check for memory leaks'
      };
    }

    if (errorTrend > 0.05) {
      return {
        pattern: 'increasing_error_rate',
        confidence: 0.9,
        recommendation: 'Error rates are increasing - review error handling'
      };
    }

    return {
      pattern: 'stable_trends',
      confidence: 0.6,
      recommendation: 'Performance trends are stable'
    };
  }

  private detectAnomalies(metrics: PerformanceMetrics[]): {
    pattern: string;
    confidence: number;
    recommendation: string;
  } {
    if (metrics.length < 5) {
      return {
        pattern: 'insufficient_anomaly_data',
        confidence: 0.1,
        recommendation: 'Collect more data for anomaly detection'
      };
    }

    const latest = metrics[metrics.length - 1];
    const historical = metrics.slice(0, -1);

    // Calculate z-scores for key metrics
    const responseTimeZScore = this.calculateZScore(
      latest.responseTime.average,
      historical.map(m => m.responseTime.average)
    );

    const memoryZScore = this.calculateZScore(
      latest.memory.heapUsed,
      historical.map(m => m.memory.heapUsed)
    );

    const errorZScore = this.calculateZScore(
      latest.errors.errorRate,
      historical.map(m => m.errors.errorRate)
    );

    if (Math.abs(responseTimeZScore) > 2) {
      return {
        pattern: 'response_time_anomaly',
        confidence: 0.8,
        recommendation: 'Unusual response time detected - investigate recent changes'
      };
    }

    if (Math.abs(memoryZScore) > 2) {
      return {
        pattern: 'memory_anomaly',
        confidence: 0.8,
        recommendation: 'Unusual memory usage detected - check for memory issues'
      };
    }

    if (Math.abs(errorZScore) > 2) {
      return {
        pattern: 'error_anomaly',
        confidence: 0.9,
        recommendation: 'Unusual error rate detected - immediate investigation needed'
      };
    }

    return {
      pattern: 'no_anomalies',
      confidence: 0.7,
      recommendation: 'No significant anomalies detected'
    };
  }

  private generateHeuristicRecommendations(
    currentMetrics: PerformanceMetrics,
    historicalMetrics: PerformanceMetrics[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Response time optimization
    if (currentMetrics.responseTime.average > 500) {
      recommendations.push({
        id: 'heuristic_cache_optimization',
        type: 'cache',
        title: 'Implement Response Caching',
        description: 'High response times detected. Implement intelligent caching to reduce latency.',
        impact: {
          responseTime: 0.4,
          throughput: 0.3
        },
        effort: 'medium',
        priority: 8,
        confidence: 0.8,
        steps: [
          'Analyze request patterns',
          'Implement LRU cache',
          'Configure appropriate TTL values'
        ],
        resources: ['Cache implementation', 'Performance monitoring'],
        timeline: '1-2 weeks'
      });
    }

    // Memory optimization
    if (currentMetrics.memory.heapUsed > 200 * 1024 * 1024) {
      recommendations.push({
        id: 'heuristic_memory_optimization',
        type: 'memory',
        title: 'Optimize Memory Usage',
        description: 'High memory usage detected. Implement memory management strategies.',
        impact: {
          memoryUsage: 0.3,
          responseTime: 0.2
        },
        effort: 'high',
        priority: 7,
        confidence: 0.7,
        steps: [
          'Implement object pooling',
          'Optimize garbage collection',
          'Review data structures'
        ],
        resources: ['Memory profiler', 'GC tuning'],
        timeline: '2-3 weeks'
      });
    }

    return recommendations;
  }

  private generateReinforcementRecommendations(currentMetrics: PerformanceMetrics): OptimizationRecommendation[] {
    const state = this.encodeState(currentMetrics);
    const action = this.rlOptimizer.selectAction(state);
    const actionValues = this.rlOptimizer.getActionValues(state);
    const confidence = actionValues.get(action) || 0.5;

    return [{
      id: 'rl_optimization',
      type: 'optimization' as any,
      title: `Reinforcement Learning Recommendation: ${action}`,
      description: `Based on learned patterns, applying ${action} should improve performance.`,
      impact: {
        responseTime: 0.2,
        throughput: 0.1
      },
      effort: 'medium',
      priority: Math.round(confidence * 10),
      confidence: Math.abs(confidence),
      steps: [`Execute ${action}`],
      resources: ['Automated optimization'],
      timeline: 'Immediate'
    }];
  }

  private generateBayesianRecommendations(currentMetrics: PerformanceMetrics): OptimizationRecommendation[] {
    const suggestedParams = this.bayesianOptimizer.suggestParameters();
    const bestParams = this.bayesianOptimizer.getBestParameters();

    if (!bestParams) {
      return [];
    }

    return [{
      id: 'bayesian_optimization',
      type: 'optimization' as any,
      title: 'Bayesian Parameter Optimization',
      description: 'Optimize system parameters based on Bayesian optimization.',
      impact: {
        responseTime: 0.2,
        memoryUsage: 0.1,
        throughput: 0.15
      },
      effort: 'low',
      priority: 6,
      confidence: 0.7,
      steps: [
        `Set cache_size to ${Math.round(suggestedParams.cache_size || 1000)}`,
        `Set cache_ttl to ${Math.round(suggestedParams.cache_ttl || 300)}s`,
        `Set compression_level to ${Math.round(suggestedParams.compression_level || 6)}`
      ],
      resources: ['Parameter tuning'],
      timeline: 'Immediate'
    }];
  }

  private rankRecommendations(
    recommendations: OptimizationRecommendation[],
    currentMetrics: PerformanceMetrics
  ): OptimizationRecommendation[] {
    return recommendations
      .map(rec => ({
        ...rec,
        score: this.calculateRecommendationScore(rec, currentMetrics)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10 recommendations
  }

  private calculateRecommendationScore(
    recommendation: OptimizationRecommendation,
    currentMetrics: PerformanceMetrics
  ): number {
    let score = recommendation.priority * recommendation.confidence;
    
    // Weight by configured objectives
    for (const [objective, weight] of Object.entries(this.config.weights)) {
      const impact = recommendation.impact[objective as keyof typeof recommendation.impact] || 0;
      score += impact * weight * 10;
    }
    
    // Adjust for effort
    const effortMultiplier = { low: 1.2, medium: 1.0, high: 0.8 }[recommendation.effort];
    score *= effortMultiplier;
    
    return score;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear regression slope
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + val * i, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope / (sumY / n); // Normalized by mean
  }

  private calculateZScore(value: number, historical: number[]): number {
    if (historical.length === 0) return 0;
    
    const mean = historical.reduce((sum, val) => sum + val, 0) / historical.length;
    const variance = historical.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historical.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : (value - mean) / stdDev;
  }

  private encodeState(metrics: PerformanceMetrics): string {
    // Encode performance metrics into a state string for RL
    const responseTimeBucket = Math.floor(metrics.responseTime.average / 100);
    const memoryBucket = Math.floor(metrics.memory.heapUsed / (50 * 1024 * 1024));
    const errorBucket = Math.floor(metrics.errors.errorRate * 100);
    const cacheBucket = Math.floor(metrics.cache.hitRate * 10);
    
    return `rt:${responseTimeBucket}_mem:${memoryBucket}_err:${errorBucket}_cache:${cacheBucket}`;
  }

  private extractParameters(recommendation: OptimizationRecommendation): Record<string, number> {
    // Extract numerical parameters from recommendation
    const params: Record<string, number> = {};
    
    if (recommendation.type === 'cache') {
      params.cache_size = 1000; // Default values
      params.cache_ttl = 300;
    } else if (recommendation.type === 'memory') {
      params.memory_threshold = 100;
      params.gc_interval = 30;
    } else if (recommendation.type === 'compression') {
      params.compression_level = 6;
    }
    
    return params;
  }

  private calculateImprovement(before: PerformanceMetrics, after: PerformanceMetrics): number {
    let improvement = 0;
    
    // Response time improvement
    const responseTimeImprovement = (before.responseTime.average - after.responseTime.average) / before.responseTime.average;
    improvement += responseTimeImprovement * this.config.weights.response_time;
    
    // Memory improvement
    const memoryImprovement = (before.memory.heapUsed - after.memory.heapUsed) / before.memory.heapUsed;
    improvement += memoryImprovement * this.config.weights.memory_usage;
    
    // Cache hit rate improvement
    const cacheImprovement = after.cache.hitRate - before.cache.hitRate;
    improvement += cacheImprovement * this.config.weights.cache_hit_rate;
    
    // Throughput improvement
    const throughputImprovement = (after.throughput.requestsPerSecond - before.throughput.requestsPerSecond) / before.throughput.requestsPerSecond;
    improvement += throughputImprovement * this.config.weights.throughput;
    
    return Math.max(-1, Math.min(1, improvement)); // Clamp to [-1, 1]
  }

  private async executeOptimization(recommendation: OptimizationRecommendation): Promise<any> {
    // Simulate optimization execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      applied: recommendation.type,
      parameters: this.extractParameters(recommendation),
      timestamp: Date.now()
    };
  }

  private updateLearningProgress(): void {
    this.state.learningProgress = Math.min(1, this.state.optimizationsApplied / 100);
  }

  private updateSuccessRate(): void {
    const successfulOptimizations = this.optimizationHistory.filter(h => 
      h.improvement !== undefined && h.improvement > 0
    ).length;
    
    this.state.successRate = this.optimizationHistory.length > 0 
      ? successfulOptimizations / this.optimizationHistory.length 
      : 0;
  }

  private updateConfidence(): void {
    this.state.confidence = Math.min(0.95, 
      0.1 + (this.state.successRate * 0.5) + (this.state.learningProgress * 0.4)
    );
  }

  private startLearningLoop(): void {
    if (!this.config.enabled) return;

    setInterval(() => {
      // Decay exploration rate over time
      if (this.rlOptimizer) {
        this.rlOptimizer['explorationRate'] *= 0.995;
        this.rlOptimizer['explorationRate'] = Math.max(0.01, this.rlOptimizer['explorationRate']);
      }
      
      // Update learning progress
      this.updateLearningProgress();
      
    }, this.config.intervals.evaluation);
  }
}

/**
 * Factory function for creating adaptive optimizer instances
 */
export function createAdaptiveOptimizer(config?: Partial<AdaptiveOptimizationConfig>): IAdaptiveOptimizer {
  return new AdaptiveOptimizer(config);
}

/**
 * Utility functions for optimization
 */
export function calculatePerformanceScore(metrics: PerformanceMetrics): number {
  // Normalize metrics to a 0-100 score
  let score = 100;
  
  // Response time penalty (max 30 points)
  if (metrics.responseTime.average > 100) {
    score -= Math.min(30, (metrics.responseTime.average - 100) / 10);
  }
  
  // Memory usage penalty (max 25 points)
  const memoryMB = metrics.memory.heapUsed / (1024 * 1024);
  if (memoryMB > 100) {
    score -= Math.min(25, (memoryMB - 100) / 20);
  }
  
  // Error rate penalty (max 25 points)
  score -= metrics.errors.errorRate * 250;
  
  // Cache hit rate bonus/penalty (max 20 points)
  score += (metrics.cache.hitRate - 0.8) * 100;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function identifyBottlenecks(metrics: PerformanceMetrics): string[] {
  const bottlenecks: string[] = [];
  
  if (metrics.responseTime.average > 1000) {
    bottlenecks.push('High response times');
  }
  
  if (metrics.memory.heapUsed > 500 * 1024 * 1024) {
    bottlenecks.push('High memory usage');
  }
  
  if (metrics.errors.errorRate > 0.05) {
    bottlenecks.push('High error rate');
  }
  
  if (metrics.cache.hitRate < 0.7) {
    bottlenecks.push('Low cache hit rate');
  }
  
  if (metrics.throughput.requestsPerSecond < 10) {
    bottlenecks.push('Low throughput');
  }
  
  return bottlenecks;
}