/**
 * @fileoverview TypeDefinitionManager - Comprehensive interface definitions and JSDoc management
 * @version 1.0.0
 * @author Alon Search Team
 * @description Manages comprehensive TypeScript definitions with detailed JSDoc documentation,
 * interface organization, and type export management for optimal IDE integration.
 *
 * @example Basic Usage
 * ```typescript
 * const typeManager = new TypeDefinitionManager();
 * const definitions = typeManager.getAllDefinitions();
 * const interfaces = typeManager.getInterfaceDefinitions();
 * ```
 *
 * @since 1.0.0
 */

import {
  SearchConfiguration,
  SearchResult,
  GenericSearchResult,
  GenericSearchConfiguration,
  SearchResultType,
  DataSourceType,
  ThemeVariant,
  SearchEventType,
  ValidationErrorType,
} from '../types/index';

/**
 * Interface for type definition metadata
 * @interface TypeDefinitionMetadata
 */
export interface TypeDefinitionMetadata {
  /** Definition name */
  name: string;
  /** Type category */
  category: 'interface' | 'type' | 'enum' | 'class';
  /** Module source file */
  module: string;
  /** JSDoc description */
  description: string;
  /** Usage examples */
  examples: string[];
  /** Related definitions */
  related: string[];
  /** Version introduced */
  since: string;
  /** Deprecation information */
  deprecated?: {
    since: string;
    replacement?: string;
    reason: string;
  };
}

/**
 * Interface for exported type information
 * @interface ExportedType
 */
export interface ExportedType {
  /** Export name */
  name: string;
  /** Export type */
  type: 'interface' | 'type' | 'enum' | 'class' | 'function';
  /** Source module */
  module: string;
  /** Whether it's a default export */
  isDefault: boolean;
  /** Generic type parameters */
  generics?: string[];
  /** JSDoc summary */
  summary: string;
}

/**
 * Interface for JSDoc documentation structure
 * @interface JSDocStructure
 */
export interface JSDocStructure {
  /** Brief description */
  description: string;
  /** Detailed summary */
  summary?: string;
  /** Usage examples */
  examples: Array<{
    title: string;
    code: string;
    description?: string;
  }>;
  /** Parameter documentation */
  params?: Array<{
    name: string;
    type: string;
    description: string;
    optional: boolean;
  }>;
  /** Return type documentation */
  returns?: {
    type: string;
    description: string;
  };
  /** See also references */
  seeAlso: string[];
  /** Version information */
  since: string;
  /** Author information */
  author?: string;
}

/**
 * TypeDefinitionManager - Manages comprehensive type definitions and documentation
 *
 * Provides centralized management of TypeScript definitions, JSDoc documentation,
 * interface organization, and type export coordination for optimal development experience.
 *
 * @class TypeDefinitionManager
 * @example
 * ```typescript
 * const manager = new TypeDefinitionManager();
 *
 * // Get all available type definitions
 * const allDefs = manager.getAllDefinitions();
 *
 * // Get specific interface documentation
 * const searchConfigDocs = manager.getInterfaceDocumentation('SearchConfiguration');
 *
 * // Validate type definition completeness
 * const validation = manager.validateDefinitions();
 * ```
 */
export class TypeDefinitionManager {
  private definitions: Map<string, TypeDefinitionMetadata> = new Map();
  private exports: Map<string, ExportedType> = new Map();
  private documentation: Map<string, JSDocStructure> = new Map();

  constructor() {
    this.initializeDefinitions();
    this.initializeExports();
    this.initializeDocumentation();
  }

  /**
   * Initialize all type definitions with metadata
   * @private
   */
  private initializeDefinitions(): void {
    // Core Configuration Types
    this.definitions.set('SearchConfiguration', {
      name: 'SearchConfiguration',
      category: 'interface',
      module: 'Config',
      description:
        'Main configuration interface for search component initialization and behavior control',
      examples: [
        'Basic configuration with API data source',
        'Advanced configuration with multiple data sources',
        'Configuration with custom themes and validation',
      ],
      related: ['DataSourceConfig', 'UIConfiguration', 'SearchBehaviorConfig'],
      since: '1.0.0',
    });

    this.definitions.set('SearchResult', {
      name: 'SearchResult',
      category: 'interface',
      module: 'Results',
      description:
        'Standard search result interface with consistent structure for all result types',
      examples: [
        'Basic search result with title and URL',
        'Enhanced result with metadata and scoring',
        'Custom result with additional data payload',
      ],
      related: ['GenericSearchResult', 'SearchResultType', 'ResultMetadata'],
      since: '1.0.0',
    });

    this.definitions.set('GenericSearchResult', {
      name: 'GenericSearchResult',
      category: 'interface',
      module: 'index',
      description: 'Generic search result type for custom data structures with type safety',
      examples: [
        'Product search result with pricing data',
        'User profile result with contact information',
        'Document result with file metadata',
      ],
      related: ['SearchResult', 'GenericDataTransformer', 'CustomDataStructure'],
      since: '1.0.0',
    });

    // Enum Definitions
    this.definitions.set('SearchResultType', {
      name: 'SearchResultType',
      category: 'enum',
      module: 'index',
      description: 'Enumeration of standard result types for categorization and filtering',
      examples: [
        'Categorizing search results by type',
        'Filtering results based on type',
        'Custom rendering based on result type',
      ],
      related: ['SearchResult', 'ResultTypeFilter', 'CategoryManager'],
      since: '1.0.0',
    });

    this.definitions.set('DataSourceType', {
      name: 'DataSourceType',
      category: 'enum',
      module: 'index',
      description: 'Enumeration of supported data source types for backend integration',
      examples: [
        'API endpoint configuration',
        'Static data source setup',
        'Database connection configuration',
      ],
      related: ['DataSourceConfig', 'DataSourceConnector', 'APIConfiguration'],
      since: '1.0.0',
    });

    // Add more definitions...
    this.addExtendedDefinitions();
  }

  /**
   * Add extended type definitions for comprehensive coverage
   * @private
   */
  private addExtendedDefinitions(): void {
    // UI and Theme Types
    this.definitions.set('ThemeVariant', {
      name: 'ThemeVariant',
      category: 'enum',
      module: 'index',
      description: 'Theme variants for UI customization and accessibility compliance',
      examples: [
        'Light theme configuration',
        'Dark mode setup',
        'High contrast accessibility theme',
      ],
      related: ['ThemeConfiguration', 'AccessibilityOptions', 'CustomTheme'],
      since: '1.0.0',
    });

    // Event Types
    this.definitions.set('SearchEventType', {
      name: 'SearchEventType',
      category: 'enum',
      module: 'index',
      description: 'Event types for search component lifecycle and user interaction tracking',
      examples: [
        'Handling search query changes',
        'Tracking result selection events',
        'Managing dropdown state transitions',
      ],
      related: ['EventHandler', 'SearchEventData', 'EventManager'],
      since: '1.0.0',
    });

    // Validation Types
    this.definitions.set('ValidationErrorType', {
      name: 'ValidationErrorType',
      category: 'enum',
      module: 'index',
      description: 'Validation error types for runtime type checking and error reporting',
      examples: [
        'Configuration validation errors',
        'Runtime type checking failures',
        'Input validation error handling',
      ],
      related: ['TypeValidator', 'ValidationResult', 'ErrorHandler'],
      since: '1.0.0',
    });

    // Generic Types
    this.definitions.set('GenericSearchConfiguration', {
      name: 'GenericSearchConfiguration',
      category: 'interface',
      module: 'index',
      description: 'Generic configuration interface for extensible component customization',
      examples: [
        'Custom options integration',
        'Extended data source configuration',
        'Flexible UI customization',
      ],
      related: ['SearchConfiguration', 'GenericDataTransformer', 'CustomOptions'],
      since: '1.0.0',
    });
  }

  /**
   * Initialize type exports mapping
   * @private
   */
  private initializeExports(): void {
    // Core exports
    this.exports.set('SearchConfiguration', {
      name: 'SearchConfiguration',
      type: 'interface',
      module: 'Config',
      isDefault: false,
      summary: 'Main search component configuration interface',
    });

    this.exports.set('SearchResult', {
      name: 'SearchResult',
      type: 'interface',
      module: 'Results',
      isDefault: false,
      summary: 'Standard search result structure interface',
    });

    this.exports.set('GenericSearchResult', {
      name: 'GenericSearchResult',
      type: 'interface',
      module: 'index',
      isDefault: false,
      generics: ['TData'],
      summary: 'Generic search result with custom data payload',
    });

    // Enum exports
    this.exports.set('SearchResultType', {
      name: 'SearchResultType',
      type: 'enum',
      module: 'index',
      isDefault: false,
      summary: 'Search result type enumeration',
    });

    this.exports.set('DataSourceType', {
      name: 'DataSourceType',
      type: 'enum',
      module: 'index',
      isDefault: false,
      summary: 'Data source type enumeration',
    });

    // Add more exports...
    this.addExtendedExports();
  }

  /**
   * Add extended type exports
   * @private
   */
  private addExtendedExports(): void {
    this.exports.set('ThemeVariant', {
      name: 'ThemeVariant',
      type: 'enum',
      module: 'index',
      isDefault: false,
      summary: 'UI theme variant enumeration',
    });

    this.exports.set('SearchEventType', {
      name: 'SearchEventType',
      type: 'enum',
      module: 'index',
      isDefault: false,
      summary: 'Search event type enumeration',
    });

    this.exports.set('GenericEventHandler', {
      name: 'GenericEventHandler',
      type: 'type',
      module: 'index',
      isDefault: false,
      generics: ['TEventData'],
      summary: 'Generic event handler function type',
    });
  }

  /**
   * Initialize JSDoc documentation structures
   * @private
   */
  private initializeDocumentation(): void {
    this.documentation.set('SearchConfiguration', {
      description: 'Main configuration interface for the Alon Search Component',
      summary:
        'Provides comprehensive configuration options for search behavior, UI customization, data sources, and performance optimization.',
      examples: [
        {
          title: 'Basic API Configuration',
          code: `const config: SearchConfiguration = {
  dataSources: [{
    type: 'api',
    url: 'https://api.example.com/search',
    headers: { 'Authorization': 'Bearer token' }
  }],
  ui: {
    theme: 'light',
    placeholder: 'Search products...',
    maxResults: 10
  }
};`,
          description: 'Simple configuration with API data source and basic UI options',
        },
        {
          title: 'Advanced Multi-Source Configuration',
          code: `const advancedConfig: SearchConfiguration = {
  dataSources: [
    { type: 'api', url: '/api/search' },
    { type: 'static', data: staticData },
    { type: 'localStorage', key: 'cached-results' }
  ],
  search: {
    minQueryLength: 2,
    debounceDelay: 300,
    fuzzySearch: true
  },
  performance: {
    cacheEnabled: true,
    virtualScrolling: true
  }
};`,
          description:
            'Complex configuration with multiple data sources and performance optimization',
        },
      ],
      seeAlso: ['DataSourceConfig', 'UIConfiguration', 'SearchBehaviorConfig'],
      since: '1.0.0',
      author: 'Alon Search Team',
    });

    // Add more documentation...
    this.addExtendedDocumentation();
  }

  /**
   * Add extended JSDoc documentation
   * @private
   */
  private addExtendedDocumentation(): void {
    this.documentation.set('GenericSearchResult', {
      description: 'Generic search result interface for custom data structures',
      summary:
        'Extends the standard SearchResult interface with generic type support for custom data payloads while maintaining type safety.',
      examples: [
        {
          title: 'Product Search Result',
          code: `interface ProductData {
  price: number;
  category: string;
  inStock: boolean;
  rating: number;
}

const productResult: GenericSearchResult<ProductData> = {
  id: 'prod-123',
  title: 'Wireless Headphones',
  description: 'High-quality bluetooth headphones',
  data: {
    price: 99.99,
    category: 'Electronics',
    inStock: true,
    rating: 4.5
  },
  type: 'product',
  score: 0.95
};`,
          description: 'Product search result with custom data structure',
        },
      ],
      seeAlso: ['SearchResult', 'GenericDataTransformer', 'CustomDataStructure'],
      since: '1.0.0',
    });
  }

  /**
   * Get all type definitions
   * @returns Map of all type definitions with metadata
   */
  public getAllDefinitions(): Map<string, TypeDefinitionMetadata> {
    return new Map(this.definitions);
  }

  /**
   * Get interface definitions only
   * @returns Array of interface definitions
   */
  public getInterfaceDefinitions(): TypeDefinitionMetadata[] {
    return Array.from(this.definitions.values()).filter(def => def.category === 'interface');
  }

  /**
   * Get enum definitions only
   * @returns Array of enum definitions
   */
  public getEnumDefinitions(): TypeDefinitionMetadata[] {
    return Array.from(this.definitions.values()).filter(def => def.category === 'enum');
  }

  /**
   * Get type definitions only
   * @returns Array of type definitions
   */
  public getTypeDefinitions(): TypeDefinitionMetadata[] {
    return Array.from(this.definitions.values()).filter(def => def.category === 'type');
  }

  /**
   * Get definition by name
   * @param name - Definition name
   * @returns Type definition metadata or undefined
   */
  public getDefinition(name: string): TypeDefinitionMetadata | undefined {
    return this.definitions.get(name);
  }

  /**
   * Get all exported types
   * @returns Map of all exported types
   */
  public getAllExports(): Map<string, ExportedType> {
    return new Map(this.exports);
  }

  /**
   * Get interface documentation
   * @param name - Interface name
   * @returns JSDoc structure or undefined
   */
  public getInterfaceDocumentation(name: string): JSDocStructure | undefined {
    return this.documentation.get(name);
  }

  /**
   * Get all documentation structures
   * @returns Map of all JSDoc structures
   */
  public getAllDocumentation(): Map<string, JSDocStructure> {
    return new Map(this.documentation);
  }

  /**
   * Validate type definition completeness
   * @returns Validation results
   */
  public validateDefinitions(): {
    isValid: boolean;
    missingDocumentation: string[];
    missingExports: string[];
    suggestions: string[];
  } {
    const missingDocumentation: string[] = [];
    const missingExports: string[] = [];
    const suggestions: string[] = [];

    // Check for definitions without documentation
    for (const [name] of this.definitions) {
      if (!this.documentation.has(name)) {
        missingDocumentation.push(name);
      }
    }

    // Check for definitions without exports
    for (const [name] of this.definitions) {
      if (!this.exports.has(name)) {
        missingExports.push(name);
      }
    }

    // Generate suggestions
    if (missingDocumentation.length > 0) {
      suggestions.push('Add JSDoc documentation for missing type definitions');
    }
    if (missingExports.length > 0) {
      suggestions.push('Add export declarations for missing type definitions');
    }

    return {
      isValid: missingDocumentation.length === 0 && missingExports.length === 0,
      missingDocumentation,
      missingExports,
      suggestions,
    };
  }

  /**
   * Generate type definition summary report
   * @returns Comprehensive summary of all type definitions
   */
  public generateSummaryReport(): {
    totalDefinitions: number;
    interfaces: number;
    types: number;
    enums: number;
    classes: number;
    documented: number;
    exported: number;
    coverage: {
      documentation: number;
      exports: number;
    };
  } {
    const total = this.definitions.size;
    const interfaces = this.getInterfaceDefinitions().length;
    const types = this.getTypeDefinitions().length;
    const enums = this.getEnumDefinitions().length;
    const classes = Array.from(this.definitions.values()).filter(
      def => def.category === 'class'
    ).length;
    const documented = this.documentation.size;
    const exported = this.exports.size;

    return {
      totalDefinitions: total,
      interfaces,
      types,
      enums,
      classes,
      documented,
      exported,
      coverage: {
        documentation: total > 0 ? Math.round((documented / total) * 100) : 0,
        exports: total > 0 ? Math.round((exported / total) * 100) : 0,
      },
    };
  }
}
