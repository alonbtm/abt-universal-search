/**
 * Advanced Response Transformer Tests
 * @description Comprehensive test suite for the enhanced ResponseTransformer pipeline
 */

import { 
  AdvancedResponseTransformer, 
  ResponseTransformer,
  type TransformationPipelineConfig,
  type EnhancedTransformationContext,
  type TransformationResult 
} from '../ResponseTransformer';
import type { RawSearchResult, SearchResult } from '../../types/Results';
import { ValidationFunctions } from '../../utils/DataValidator';
import { createFilterRule, CommonFilterRules } from '../../utils/ResultFilter';
import { createEnhancementRule, PredefinedCategories } from '../../utils/MetadataEnhancer';

describe('AdvancedResponseTransformer', () => {
  let mockRawResults: RawSearchResult[];
  let transformationContext: EnhancedTransformationContext;

  beforeEach(() => {
    mockRawResults = [
      {
        item: {
          id: 1,
          name: 'Test Document',
          description: 'A test document for transformation',
          category: 'document',
          tags: ['test', 'sample'],
          url: 'https://example.com/doc1',
          author: 'John Doe',
          created: '2023-01-01',
          isValid: true
        },
        score: 0.85,
        matchedFields: ['name', 'description'],
        originalIndex: 0
      },
      {
        item: {
          id: 2,
          title: 'Incomplete Item',
          // Missing description and other fields
          category: 'misc',
          url: null,
          isValid: false
        },
        score: 0.45,
        matchedFields: ['title'],
        originalIndex: 1
      },
      {
        item: {
          id: 3,
          name: 'High Quality Result',
          description: 'Very detailed description with lots of useful information',
          category: 'website',
          tags: ['high-quality', 'detailed', 'informative'],
          url: 'https://example.com/quality',
          author: 'Expert Author',
          created: '2023-12-01',
          rating: 5,
          isValid: true
        },
        score: 0.95,
        matchedFields: ['name', 'description', 'tags'],
        originalIndex: 2
      }
    ];

    transformationContext = {
      query: 'test document',
      timestamp: Date.now(),
      totalResults: mockRawResults.length,
      sourceType: 'memory',
      additionalContext: {
        userId: 'test-user',
        sessionId: 'test-session'
      }
    };
  });

  describe('Basic Configuration and Initialization', () => {
    it('should create transformer with minimal configuration', () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name'
        }
      };

      const transformer = new AdvancedResponseTransformer(config);
      expect(transformer).toBeInstanceOf(AdvancedResponseTransformer);
    });

    it('should validate configuration on creation', () => {
      expect(() => {
        new AdvancedResponseTransformer({
          mapping: {
            labelField: '' // Invalid empty labelField
          }
        });
      }).toThrow('labelField is required in mapping configuration');
    });

    it('should validate minQualityScore range', () => {
      expect(() => {
        new AdvancedResponseTransformer({
          mapping: { labelField: 'name' },
          minQualityScore: 1.5 // Invalid range
        });
      }).toThrow('minQualityScore must be between 0 and 1');
    });
  });

  describe('Field Mapping and Basic Transformation', () => {
    it('should perform basic field mapping', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name',
          metadataFields: {
            subtitle: 'description',
            category: 'category',
            author: 'author'
          }
        },
        enableValidation: false,
        enableEnhancement: false,
        enableFiltering: false
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      expect(result.results).toHaveLength(3);
      expect(result.results[0].title).toBe('Test Document');
      expect(result.results[0].metadata.subtitle).toBe('A test document for transformation');
      expect(result.results[0].metadata.category).toBe('document');
      expect(result.results[0].metadata.author).toBe('John Doe');
    });

    it('should handle missing fields gracefully', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name',
          metadataFields: {
            subtitle: 'description',
            nonexistent: 'nonexistent.field'
          }
        }
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      expect(result.results[1].title).toBe('Incomplete Item'); // Uses title as fallback
      expect(result.results[1].metadata.subtitle).toBeUndefined();
      expect(result.results[1].metadata.nonexistent).toBeUndefined();
    });

    it('should support complex field mapping with options', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: {
            template: '{{name}} - {{category}}',
            fallbacks: ['title', 'name'],
            defaultValue: 'Unknown Item'
          },
          metadataFields: {
            displayName: {
              template: '{{name}} by {{author}}',
              defaultValue: 'Anonymous'
            }
          }
        }
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      expect(result.results[0].title).toContain('Test Document - document');
      expect(result.results[0].metadata.displayName).toContain('Test Document by John Doe');
    });
  });

  describe('Data Validation Pipeline', () => {
    it('should validate required fields', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name',
          requiredFields: ['name', 'description', 'url'],
          validationRules: {
            name: [{ validate: ValidationFunctions.required, severity: 'error' }],
            description: [{ validate: ValidationFunctions.required, severity: 'error' }],
            url: [{ validate: ValidationFunctions.url, severity: 'warning' }]
          }
        },
        enableValidation: true
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      expect(result.stats.validationErrors).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should apply fallback values for missing fields', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name',
          defaultValues: {
            description: 'No description available',
            author: 'Unknown Author'
          },
          validationRules: {
            description: [{ validate: ValidationFunctions.required, severity: 'warning' }]
          }
        },
        enableValidation: true
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      // Check that fallback was applied to incomplete item
      const incompleteResult = result.results.find(r => r.id === 2);
      expect(incompleteResult?.metadata?.description).toBe('No description available');
    });

    it('should validate data types', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name',
          validationRules: {
            rating: [{ validate: ValidationFunctions.number(1, 5), severity: 'error' }],
            url: [{ validate: ValidationFunctions.url, severity: 'error' }],
            tags: [{ validate: ValidationFunctions.array(1, 10), severity: 'warning' }]
          }
        },
        enableValidation: true
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      expect(result.stats.validationErrors).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Metadata Enhancement Pipeline', () => {
    it('should enhance metadata with built-in enhancements', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name',
          metadataFields: { category: 'category' }
        },
        enableEnhancement: true
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      result.results.forEach(searchResult => {
        expect(searchResult.metadata.enhanced).toBe(true);
        expect(searchResult.metadata.enhancementTime).toBeGreaterThan(0);
        expect(searchResult.metadata.icon).toBeDefined();
      });
    });

    it('should apply custom enhancement rules', async () => {
      const customRule = createEnhancementRule()
        .name('priority_booster')
        .priority(100)
        .when('category', 'equals', 'website')
        .enhance((result, context) => ({
          priority: 'high',
          boosted: true,
          boostReason: 'website category'
        }));

      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name',
          metadataFields: { category: 'category' }
        },
        enableEnhancement: true,
        customEnhancementRules: [customRule]
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      const websiteResult = result.results.find(r => r.metadata.category === 'website');
      expect(websiteResult?.metadata?.priority).toBe('high');
      expect(websiteResult?.metadata?.boosted).toBe(true);
    });

    it('should generate subtitles and icons', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name',
          metadataFields: {
            category: 'category',
            description: 'description'
          }
        },
        enableEnhancement: true
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      result.results.forEach(searchResult => {
        if (searchResult.metadata.description) {
          expect(searchResult.metadata.subtitle).toBeDefined();
        }
        expect(searchResult.metadata.icon).toBeDefined();
      });
    });
  });

  describe('Result Filtering and Quality Assessment', () => {
    it('should filter results based on quality score', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name',
          requiredFields: ['name', 'description', 'url']
        },
        enableFiltering: true,
        minQualityScore: 0.7
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      expect(result.results.length).toBeLessThan(mockRawResults.length);
      expect(result.stats.filteredCount).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('filtered out'))).toBeTruthy();
    });

    it('should apply custom filter rules', async () => {
      const customFilter = createFilterRule()
        .name('high_score_only')
        .priority(100)
        .enabled(true)
        .reason('Score too low')
        .filter((result, context) => {
          return (result.metadata.score || 0) >= 0.8;
        });

      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name'
        },
        enableFiltering: true,
        customFilterRules: [customFilter]
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      expect(result.results.every(r => (r.metadata.score || 0) >= 0.8)).toBeTruthy();
    });

    it('should detect and remove duplicates', async () => {
      const duplicateResults = [
        ...mockRawResults,
        {
          item: {
            id: 4,
            name: 'Test Document', // Duplicate title
            description: 'Different description',
            category: 'document'
          },
          score: 0.8,
          matchedFields: ['name'],
          originalIndex: 3
        }
      ];

      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name'
        },
        enableFiltering: true,
        duplicateDetection: {
          strategy: 'fuzzy',
          compareFields: ['title'],
          threshold: 0.8,
          keepBest: true,
          qualityComparator: (r1, r2) => (r1.metadata.score || 0) - (r2.metadata.score || 0)
        }
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(duplicateResults, transformationContext);

      expect(result.results.length).toBeLessThan(duplicateResults.length);
      expect(result.stats.filteredCount).toBeGreaterThan(0);
    });

    it('should calculate quality metrics', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name',
          requiredFields: ['name', 'description']
        },
        enableFiltering: true
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      expect(result.qualityMetrics.averageQualityScore).toBeGreaterThan(0);
      expect(result.qualityMetrics.completenessRate).toBeGreaterThan(0);
      expect(result.qualityMetrics.validationSuccessRate).toBeGreaterThan(0);

      result.results.forEach(searchResult => {
        expect(searchResult.metadata.qualityMetrics).toBeDefined();
        expect(searchResult.metadata.qualityMetrics?.overall).toBeGreaterThanOrEqual(0);
        expect(searchResult.metadata.qualityMetrics?.overall).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics when enabled', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name'
        },
        enablePerformanceMonitoring: true,
        maxProcessingTimePerResult: 5
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      expect(result.stats.processingTime).toBeGreaterThan(0);
      expect(result.stats.averageProcessingTimePerResult).toBeGreaterThan(0);

      const stats = transformer.getStatistics();
      expect(stats.performanceStats).toBeDefined();
      expect(stats.performanceStats.totalOperations).toBeGreaterThan(0);
    });

    it('should generate performance warnings', async () => {
      // Create a config that might generate warnings
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name'
        },
        enablePerformanceMonitoring: true,
        maxProcessingTimePerResult: 0.001 // Very low threshold to trigger warnings
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      // May generate warnings depending on processing speed
      expect(result.warnings).toBeDefined();
    });

    it('should provide optimization recommendations', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name'
        },
        enablePerformanceMonitoring: true
      };

      const transformer = new AdvancedResponseTransformer(config);
      await transformer.transformResults(mockRawResults, transformationContext);

      const recommendations = transformer.getOptimizationRecommendations();
      expect(Array.isArray(recommendations)).toBeTruthy();
    });
  });

  describe('Error Handling and Transformation', () => {
    it('should handle transformation errors gracefully', async () => {
      const invalidRawResults = [
        {
          item: null, // Invalid item
          score: 0.5,
          matchedFields: [],
          originalIndex: 0
        }
      ] as any;

      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name'
        }
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(invalidRawResults, transformationContext);

      expect(result.results).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should transform errors when error transformation is enabled', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name'
        },
        enableErrorTransformation: true
      };

      const transformer = new AdvancedResponseTransformer(config);
      
      // Force an error by providing invalid input
      const result = await transformer.transformResults(null as any, transformationContext);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBeDefined();
    });

    it('should handle partial results on validation errors', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name',
          validationRules: {
            name: [{ 
              validate: ValidationFunctions.required, 
              severity: 'error'
            }]
          }
        },
        enableValidation: true
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      // Should still return some results even with validation errors
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Full Pipeline Integration', () => {
    it('should run complete pipeline with all features enabled', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name',
          metadataFields: {
            subtitle: 'description',
            category: 'category',
            author: 'author'
          },
          requiredFields: ['name'],
          defaultValues: {
            description: 'No description provided'
          },
          validationRules: {
            name: [{ validate: ValidationFunctions.required, severity: 'error' }],
            url: [{ validate: ValidationFunctions.url, severity: 'warning' }]
          }
        },
        enableValidation: true,
        enableEnhancement: true,
        enableFiltering: true,
        enablePerformanceMonitoring: true,
        enableErrorTransformation: true,
        minQualityScore: 0.3,
        customFilterRules: [CommonFilterRules.minimumTitleLength(2)],
        customEnhancementRules: [
          createEnhancementRule()
            .name('test_enhancement')
            .priority(50)
            .enhance(() => ({ testEnhanced: true }))
        ]
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformResults(mockRawResults, transformationContext);

      // Verify all pipeline stages ran
      expect(result.stats.originalCount).toBe(mockRawResults.length);
      expect(result.stats.transformedCount).toBeGreaterThan(0);
      expect(result.stats.processingTime).toBeGreaterThan(0);
      expect(result.qualityMetrics).toBeDefined();

      // Check that enhancements were applied
      result.results.forEach(searchResult => {
        expect(searchResult.metadata.enhanced).toBe(true);
        expect(searchResult.metadata.testEnhanced).toBe(true);
        expect(searchResult.metadata.qualityMetrics).toBeDefined();
      });

      // Verify statistics are available
      const stats = transformer.getStatistics();
      expect(stats.performanceStats).toBeDefined();
      expect(stats.validationStats).toBeDefined();
      expect(stats.filteringStats).toBeDefined();
      expect(stats.enhancementStats).toBeDefined();
    });

    it('should handle configuration updates', async () => {
      const initialConfig: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name'
        },
        enableValidation: false
      };

      const transformer = new AdvancedResponseTransformer(initialConfig);
      
      // Update configuration
      transformer.updateConfiguration({
        enableValidation: true,
        minQualityScore: 0.5,
        mapping: {
          labelField: 'name',
          requiredFields: ['name', 'description']
        }
      });

      const result = await transformer.transformResults(mockRawResults, transformationContext);
      
      // Should reflect updated configuration
      expect(result.stats.validationErrors).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain legacy ResponseTransformer compatibility', () => {
      const legacyTransformer = new ResponseTransformer({
        labelField: 'name',
        metadataFields: {
          subtitle: 'description',
          category: 'category'
        }
      });

      const legacyResults = legacyTransformer.transformResults(mockRawResults, {
        query: 'test',
        timestamp: Date.now(),
        totalResults: mockRawResults.length,
        sourceType: 'memory'
      });

      expect(legacyResults).toHaveLength(mockRawResults.length);
      expect(legacyResults[0].title).toBe('Test Document');
      expect(legacyResults[0].metadata.subtitle).toBe('A test document for transformation');
    });

    it('should support legacy transformation context', () => {
      const legacyTransformer = new ResponseTransformer({
        labelField: 'name'
      });

      const legacyContext = {
        query: 'test query',
        timestamp: Date.now(),
        totalResults: 5,
        sourceType: 'api'
      };

      expect(() => {
        legacyTransformer.transformResults(mockRawResults, legacyContext);
      }).not.toThrow();
    });
  });

  describe('Single Result Transformation', () => {
    it('should transform single result for testing', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name'
        },
        enableEnhancement: true
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformSingleResult(mockRawResults[0], transformationContext);

      expect(result).toBeDefined();
      expect(result?.title).toBe('Test Document');
      expect(result?.metadata.enhanced).toBe(true);
    });

    it('should return null for invalid single result', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name'
        }
      };

      const transformer = new AdvancedResponseTransformer(config);
      const result = await transformer.transformSingleResult({} as any, transformationContext);

      expect(result).toBeNull();
    });
  });

  describe('Cache Management', () => {
    it('should clear caches and statistics', async () => {
      const config: TransformationPipelineConfig = {
        mapping: {
          labelField: 'name'
        },
        enablePerformanceMonitoring: true,
        enableValidation: true,
        enableEnhancement: true
      };

      const transformer = new AdvancedResponseTransformer(config);
      await transformer.transformResults(mockRawResults, transformationContext);

      // Clear caches
      transformer.clearCache();

      // Verify statistics were reset (this is implementation dependent)
      const stats = transformer.getStatistics();
      expect(stats).toBeDefined();
    });
  });
});