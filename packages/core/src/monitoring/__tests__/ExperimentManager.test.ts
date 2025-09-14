/**
 * Experiment Manager Tests
 * @description Comprehensive tests for A/B testing support and experiment framework
 */

import { ExperimentManager } from '../ExperimentManager';

describe('ExperimentManager', () => {
  let experimentManager: ExperimentManager;

  beforeEach(() => {
    experimentManager = new ExperimentManager();

    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });

    // Mock crypto for random number generation
    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: jest.fn((arr) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        })
      },
      writable: true
    });
  });

  afterEach(() => {
    experimentManager.cleanup();
    jest.clearAllMocks();
  });

  describe('experiment configuration', () => {
    test('should create and configure experiments', () => {
      const experimentConfig = {
        id: 'search_algorithm_test',
        name: 'Search Algorithm Performance Test',
        description: 'Testing different search algorithms for performance improvements',
        variations: [
          {
            id: 'control',
            name: 'Current Algorithm',
            allocation: 0.5,
            config: { algorithm: 'current' }
          },
          {
            id: 'new_algorithm',
            name: 'Optimized Algorithm',
            allocation: 0.5,
            config: { algorithm: 'optimized' }
          }
        ],
        allocation: {
          splits: { control: 0.5, new_algorithm: 0.5 },
          method: 'random' as const
        },
        metrics: [
          {
            name: 'response_time',
            type: 'numeric',
            goal: 'minimize',
            primaryMetric: true
          },
          {
            name: 'user_satisfaction',
            type: 'numeric',
            goal: 'maximize',
            primaryMetric: false
          }
        ],
        duration: {
          startTime: Date.now(),
          endTime: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
          minSampleSize: 1000
        },
        statistics: {
          confidenceLevel: 0.95,
          minimumDetectableEffect: 0.05,
          power: 0.8
        }
      };

      experimentManager.createExperiment(experimentConfig);
      const experiment = experimentManager.getExperiment('search_algorithm_test');

      expect(experiment).toBeDefined();
      expect(experiment?.id).toBe('search_algorithm_test');
      expect(experiment?.variations).toHaveLength(2);
    });

    test('should validate experiment configuration', () => {
      const invalidConfig = {
        id: '',
        name: 'Invalid Test',
        variations: [],
        allocation: { splits: {}, method: 'random' as const },
        metrics: [],
        duration: { startTime: 0, endTime: 0, minSampleSize: 0 },
        statistics: { confidenceLevel: 0, minimumDetectableEffect: 0, power: 0 }
      };

      expect(() => {
        experimentManager.createExperiment(invalidConfig);
      }).toThrow();
    });
  });

  describe('user assignment', () => {
    beforeEach(() => {
      const experimentConfig = {
        id: 'ui_test',
        name: 'UI Color Test',
        description: 'Testing button colors',
        variations: [
          {
            id: 'blue_button',
            name: 'Blue Button',
            allocation: 0.33,
            config: { buttonColor: 'blue' }
          },
          {
            id: 'green_button',
            name: 'Green Button',
            allocation: 0.33,
            config: { buttonColor: 'green' }
          },
          {
            id: 'red_button',
            name: 'Red Button',
            allocation: 0.34,
            config: { buttonColor: 'red' }
          }
        ],
        allocation: {
          splits: { blue_button: 0.33, green_button: 0.33, red_button: 0.34 },
          method: 'random' as const
        },
        metrics: [
          {
            name: 'click_rate',
            type: 'numeric',
            goal: 'maximize',
            primaryMetric: true
          }
        ],
        duration: {
          startTime: Date.now(),
          endTime: Date.now() + (7 * 24 * 60 * 60 * 1000),
          minSampleSize: 500
        },
        statistics: {
          confidenceLevel: 0.95,
          minimumDetectableEffect: 0.1,
          power: 0.8
        }
      };

      experimentManager.createExperiment(experimentConfig);
    });

    test('should assign users to variations consistently', () => {
      const userId = 'user_123';
      
      const assignment1 = experimentManager.assignUserToVariation('ui_test', userId);
      const assignment2 = experimentManager.assignUserToVariation('ui_test', userId);
      
      expect(assignment1).toBe(assignment2);
      expect(['blue_button', 'green_button', 'red_button']).toContain(assignment1?.variationId);
    });

    test('should respect allocation percentages', () => {
      const assignments: Record<string, number> = {};
      const totalUsers = 10000;
      
      for (let i = 0; i < totalUsers; i++) {
        const assignment = experimentManager.assignUserToVariation('ui_test', `user_${i}`);
        if (assignment) {
          assignments[assignment.variationId] = (assignments[assignment.variationId] || 0) + 1;
        }
      }
      
      const bluePercentage = assignments.blue_button / totalUsers;
      const greenPercentage = assignments.green_button / totalUsers;
      const redPercentage = assignments.red_button / totalUsers;
      
      expect(bluePercentage).toBeCloseTo(0.33, 1);
      expect(greenPercentage).toBeCloseTo(0.33, 1);
      expect(redPercentage).toBeCloseTo(0.34, 1);
    });

    test('should handle sticky assignment with localStorage', () => {
      const userId = 'user_456';
      const experimentId = 'ui_test';
      
      // Mock localStorage to return a specific variation
      (global.localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify({ variationId: 'green_button', timestamp: Date.now() })
      );
      
      const assignment = experimentManager.assignUserToVariation(experimentId, userId);
      
      expect(assignment?.variationId).toBe('green_button');
      expect(global.localStorage.getItem).toHaveBeenCalledWith(
        `experiment_${experimentId}_${userId}`
      );
    });
  });

  describe('performance tracking', () => {
    beforeEach(() => {
      const experimentConfig = {
        id: 'performance_test',
        name: 'Performance Optimization Test',
        description: 'Testing performance improvements',
        variations: [
          {
            id: 'control',
            name: 'Control Group',
            allocation: 0.5,
            config: { optimization: false }
          },
          {
            id: 'optimized',
            name: 'Optimized Group',
            allocation: 0.5,
            config: { optimization: true }
          }
        ],
        allocation: {
          splits: { control: 0.5, optimized: 0.5 },
          method: 'random' as const
        },
        metrics: [
          {
            name: 'response_time',
            type: 'numeric',
            goal: 'minimize',
            primaryMetric: true
          }
        ],
        duration: {
          startTime: Date.now(),
          endTime: Date.now() + (7 * 24 * 60 * 60 * 1000),
          minSampleSize: 100
        },
        statistics: {
          confidenceLevel: 0.95,
          minimumDetectableEffect: 0.1,
          power: 0.8
        }
      };

      experimentManager.createExperiment(experimentConfig);
    });

    test('should track performance metrics for variations', () => {
      const userId = 'user_789';
      const assignment = experimentManager.assignUserToVariation('performance_test', userId);
      
      if (assignment) {
        experimentManager.trackMetric('performance_test', assignment.variationId, 'response_time', 150);
        experimentManager.trackMetric('performance_test', assignment.variationId, 'response_time', 200);
        
        const results = experimentManager.getExperimentResults('performance_test');
        const variationResults = results?.variations[assignment.variationId];
        
        expect(variationResults?.metrics.response_time.count).toBe(2);
        expect(variationResults?.metrics.response_time.mean).toBe(175);
      }
    });

    test('should calculate statistical significance', async () => {
      // Add data to both variations
      for (let i = 0; i < 50; i++) {
        experimentManager.trackMetric('performance_test', 'control', 'response_time', 200 + Math.random() * 50);
        experimentManager.trackMetric('performance_test', 'optimized', 'response_time', 150 + Math.random() * 30);
      }
      
      const analysis = await experimentManager.calculateStatisticalSignificance('performance_test');
      
      expect(analysis).toBeDefined();
      expect(analysis.primaryMetric).toBe('response_time');
      expect(typeof analysis.pValue).toBe('number');
      expect(typeof analysis.confidenceInterval).toBe('object');
    });

    test('should provide performance comparison between variations', async () => {
      // Track metrics for both variations
      const controlMetrics = [180, 190, 170, 200, 185];
      const optimizedMetrics = [120, 130, 110, 140, 125];
      
      controlMetrics.forEach(metric => {
        experimentManager.trackMetric('performance_test', 'control', 'response_time', metric);
      });
      
      optimizedMetrics.forEach(metric => {
        experimentManager.trackMetric('performance_test', 'optimized', 'response_time', metric);
      });
      
      const comparison = await experimentManager.compareVariationPerformance('performance_test');
      
      expect(comparison.winner).toBe('optimized');
      expect(comparison.improvement).toBeGreaterThan(0);
      expect(comparison.confidence).toBeGreaterThan(0);
    });
  });

  describe('experiment lifecycle', () => {
    test('should start and stop experiments', () => {
      const experimentConfig = {
        id: 'lifecycle_test',
        name: 'Lifecycle Test',
        description: 'Testing experiment lifecycle',
        variations: [
          { id: 'control', name: 'Control', allocation: 0.5, config: {} },
          { id: 'variant', name: 'Variant', allocation: 0.5, config: {} }
        ],
        allocation: {
          splits: { control: 0.5, variant: 0.5 },
          method: 'random' as const
        },
        metrics: [
          { name: 'conversion', type: 'numeric', goal: 'maximize', primaryMetric: true }
        ],
        duration: {
          startTime: Date.now(),
          endTime: Date.now() + (7 * 24 * 60 * 60 * 1000),
          minSampleSize: 100
        },
        statistics: {
          confidenceLevel: 0.95,
          minimumDetectableEffect: 0.1,
          power: 0.8
        }
      };

      experimentManager.createExperiment(experimentConfig);
      experimentManager.startExperiment('lifecycle_test');
      
      let experiment = experimentManager.getExperiment('lifecycle_test');
      expect(experiment?.status).toBe('running');
      
      experimentManager.stopExperiment('lifecycle_test');
      experiment = experimentManager.getExperiment('lifecycle_test');
      expect(experiment?.status).toBe('stopped');
    });

    test('should handle experiment completion based on sample size', () => {
      const experimentConfig = {
        id: 'completion_test',
        name: 'Completion Test',
        description: 'Testing experiment completion',
        variations: [
          { id: 'control', name: 'Control', allocation: 0.5, config: {} },
          { id: 'variant', name: 'Variant', allocation: 0.5, config: {} }
        ],
        allocation: {
          splits: { control: 0.5, variant: 0.5 },
          method: 'random' as const
        },
        metrics: [
          { name: 'metric', type: 'numeric', goal: 'maximize', primaryMetric: true }
        ],
        duration: {
          startTime: Date.now(),
          endTime: Date.now() + (7 * 24 * 60 * 60 * 1000),
          minSampleSize: 5
        },
        statistics: {
          confidenceLevel: 0.95,
          minimumDetectableEffect: 0.1,
          power: 0.8
        }
      };

      experimentManager.createExperiment(experimentConfig);
      experimentManager.startExperiment('completion_test');
      
      // Add enough data points to meet minimum sample size
      for (let i = 0; i < 6; i++) {
        experimentManager.trackMetric('completion_test', 'control', 'metric', Math.random());
      }
      
      const shouldComplete = experimentManager.shouldCompleteExperiment('completion_test');
      expect(shouldComplete).toBe(true);
    });
  });

  describe('reporting and analysis', () => {
    test('should generate comprehensive experiment reports', async () => {
      const experimentConfig = {
        id: 'report_test',
        name: 'Report Test',
        description: 'Testing experiment reporting',
        variations: [
          { id: 'control', name: 'Control', allocation: 0.5, config: {} },
          { id: 'variant', name: 'Variant', allocation: 0.5, config: {} }
        ],
        allocation: {
          splits: { control: 0.5, variant: 0.5 },
          method: 'random' as const
        },
        metrics: [
          { name: 'conversion_rate', type: 'numeric', goal: 'maximize', primaryMetric: true },
          { name: 'response_time', type: 'numeric', goal: 'minimize', primaryMetric: false }
        ],
        duration: {
          startTime: Date.now(),
          endTime: Date.now() + (7 * 24 * 60 * 60 * 1000),
          minSampleSize: 100
        },
        statistics: {
          confidenceLevel: 0.95,
          minimumDetectableEffect: 0.1,
          power: 0.8
        }
      };

      experimentManager.createExperiment(experimentConfig);
      
      // Add sample data
      for (let i = 0; i < 50; i++) {
        experimentManager.trackMetric('report_test', 'control', 'conversion_rate', 0.15 + Math.random() * 0.1);
        experimentManager.trackMetric('report_test', 'control', 'response_time', 200 + Math.random() * 50);
        
        experimentManager.trackMetric('report_test', 'variant', 'conversion_rate', 0.18 + Math.random() * 0.1);
        experimentManager.trackMetric('report_test', 'variant', 'response_time', 180 + Math.random() * 40);
      }
      
      const report = await experimentManager.generateExperimentReport('report_test');
      
      expect(report.experimentId).toBe('report_test');
      expect(report.summary.totalSamples).toBe(200);
      expect(report.results.primaryMetric).toBe('conversion_rate');
      expect(Object.keys(report.variations)).toHaveLength(2);
    });

    test('should recommend experiment winners', async () => {
      const experimentConfig = {
        id: 'winner_test',
        name: 'Winner Test',
        description: 'Testing winner recommendation',
        variations: [
          { id: 'control', name: 'Control', allocation: 0.5, config: {} },
          { id: 'variant', name: 'Variant', allocation: 0.5, config: {} }
        ],
        allocation: {
          splits: { control: 0.5, variant: 0.5 },
          method: 'random' as const
        },
        metrics: [
          { name: 'success_rate', type: 'numeric', goal: 'maximize', primaryMetric: true }
        ],
        duration: {
          startTime: Date.now(),
          endTime: Date.now() + (7 * 24 * 60 * 60 * 1000),
          minSampleSize: 100
        },
        statistics: {
          confidenceLevel: 0.95,
          minimumDetectableEffect: 0.1,
          power: 0.8
        }
      };

      experimentManager.createExperiment(experimentConfig);
      
      // Add data showing clear winner
      for (let i = 0; i < 100; i++) {
        experimentManager.trackMetric('winner_test', 'control', 'success_rate', 0.2 + Math.random() * 0.1);
        experimentManager.trackMetric('winner_test', 'variant', 'success_rate', 0.4 + Math.random() * 0.1);
      }
      
      const recommendation = await experimentManager.getWinnerRecommendation('winner_test');
      
      expect(recommendation.recommendedVariation).toBe('variant');
      expect(recommendation.confidence).toBeGreaterThan(0.9);
      expect(recommendation.expectedImprovement).toBeGreaterThan(0);
    });
  });
});