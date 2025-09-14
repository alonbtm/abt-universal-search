/**
 * @fileoverview IDEIntegrationManager - IDE integration and IntelliSense optimization
 * @version 1.0.0
 * @author Alon Search Team
 * @description Provides comprehensive IDE integration, IntelliSense optimization,
 * parameter hints generation, and TypeScript Language Service integration for
 * excellent developer experience.
 *
 * @example Basic Usage
 * ```typescript
 * const ideManager = new IDEIntegrationManager();
 * const hints = ideManager.generateParameterHints('SearchConfiguration');
 * const suggestions = ideManager.getAutocompleteSuggestions('search');
 * ```
 *
 * @since 1.0.0
 */

import {
  SearchConfiguration,
  SearchResult,
  GenericSearchResult,
  SearchResultType,
  DataSourceType,
  ThemeVariant,
  SearchEventType,
} from '../types/index';

/**
 * Interface for IDE integration configuration
 * @interface IDEIntegrationConfig
 */
export interface IDEIntegrationConfig {
  /** Target IDE (VS Code, WebStorm, etc.) */
  targetIDE: 'vscode' | 'webstorm' | 'sublime' | 'vim' | 'generic';
  /** Language service integration level */
  languageServiceLevel: 'basic' | 'full' | 'enhanced';
  /** Enable IntelliSense optimization */
  intelliSenseOptimization: boolean;
  /** Parameter hint generation */
  parameterHints: boolean;
  /** Auto-completion suggestions */
  autoCompletion: boolean;
  /** Error checking integration */
  errorChecking: boolean;
  /** Code navigation support */
  codeNavigation: boolean;
}

/**
 * Interface for parameter hint information
 * @interface ParameterHint
 */
export interface ParameterHint {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: string;
  /** Parameter description */
  description: string;
  /** Whether parameter is optional */
  optional: boolean;
  /** Default value if any */
  defaultValue?: any;
  /** Valid values or range */
  validValues?: any[];
  /** Usage examples */
  examples: string[];
}

/**
 * Interface for autocomplete suggestion
 * @interface AutocompleteSuggestion
 */
export interface AutocompleteSuggestion {
  /** Suggestion text */
  text: string;
  /** Suggestion type */
  type: 'property' | 'method' | 'enum' | 'interface' | 'type' | 'value';
  /** Display label */
  label: string;
  /** Detailed description */
  description: string;
  /** Insert text (may differ from display text) */
  insertText: string;
  /** Documentation */
  documentation?: string;
  /** Completion priority */
  priority: number;
  /** Associated type information */
  typeInfo?: string;
}

/**
 * Interface for error checking result
 * @interface TypeCheckResult
 */
export interface TypeCheckResult {
  /** Whether type checking passed */
  isValid: boolean;
  /** List of errors found */
  errors: Array<{
    code: string;
    message: string;
    line?: number;
    column?: number;
    severity: 'error' | 'warning' | 'info';
    category: 'type' | 'syntax' | 'semantic';
  }>;
  /** Suggestions for fixes */
  suggestions: Array<{
    message: string;
    fix?: string;
  }>;
}

/**
 * Interface for namespace organization
 * @interface NamespaceInfo
 */
export interface NamespaceInfo {
  /** Namespace name */
  name: string;
  /** Namespace description */
  description: string;
  /** Exported types */
  exports: string[];
  /** Nested namespaces */
  children: NamespaceInfo[];
  /** Import path */
  importPath: string;
}

/**
 * Interface for code navigation support
 * @interface NavigationTarget
 */
export interface NavigationTarget {
  /** Target file path */
  filePath: string;
  /** Line number */
  line: number;
  /** Column number */
  column: number;
  /** Target type */
  type: 'definition' | 'implementation' | 'reference' | 'type-definition';
  /** Symbol name */
  symbol: string;
  /** Context information */
  context?: string;
}

/**
 * IDEIntegrationManager - Comprehensive IDE integration and developer tooling
 *
 * Provides advanced IDE integration features including IntelliSense optimization,
 * parameter hint generation, autocomplete suggestions, error checking, and
 * code navigation support for excellent TypeScript developer experience.
 *
 * @class IDEIntegrationManager
 * @example
 * ```typescript
 * // Initialize IDE integration
 * const ideManager = new IDEIntegrationManager({
 *   targetIDE: 'vscode',
 *   languageServiceLevel: 'enhanced',
 *   intelliSenseOptimization: true,
 *   parameterHints: true,
 *   autoCompletion: true,
 *   errorChecking: true,
 *   codeNavigation: true
 * });
 *
 * // Generate parameter hints for SearchConfiguration
 * const hints = ideManager.generateParameterHints('SearchConfiguration');
 *
 * // Get autocomplete suggestions
 * const suggestions = ideManager.getAutocompleteSuggestions('search', 'property');
 *
 * // Validate configuration
 * const validation = ideManager.validateConfiguration(config);
 * ```
 */
export class IDEIntegrationManager {
  private config: IDEIntegrationConfig;
  private typeDefinitions: Map<string, any> = new Map();
  private parameterHints: Map<string, ParameterHint[]> = new Map();
  private autocompleteSuggestions: Map<string, AutocompleteSuggestion[]> = new Map();
  private namespaces: Map<string, NamespaceInfo> = new Map();

  constructor(config: IDEIntegrationConfig) {
    this.config = config;
    this.initializeTypeDefinitions();
    this.initializeParameterHints();
    this.initializeAutocompleteSuggestions();
    this.initializeNamespaces();
  }

  /**
   * Initialize type definitions for IDE integration
   * @private
   */
  private initializeTypeDefinitions(): void {
    // Core configuration types
    this.typeDefinitions.set('SearchConfiguration', {
      kind: 'interface',
      properties: {
        dataSources: {
          type: 'DataSourceConfig[]',
          required: true,
          description: 'Array of data source configurations for search backend integration',
        },
        ui: {
          type: 'UIConfig',
          required: false,
          description: 'User interface configuration options for customization',
        },
        search: {
          type: 'QueryConfig',
          required: false,
          description: 'Search behavior and query processing configuration',
        },
        performance: {
          type: 'PerformanceConfig',
          required: false,
          description: 'Performance optimization and caching configuration',
        },
      },
      examples: [
        'Basic API configuration',
        'Multi-source configuration',
        'Performance-optimized setup',
      ],
    });

    // Search result types
    this.typeDefinitions.set('SearchResult', {
      kind: 'interface',
      properties: {
        id: {
          type: 'string',
          required: true,
          description: 'Unique identifier for the search result',
        },
        title: {
          type: 'string',
          required: true,
          description: 'Primary display title for the result',
        },
        description: {
          type: 'string',
          required: false,
          description: 'Optional description text for additional context',
        },
        url: {
          type: 'string',
          required: false,
          description: 'Optional URL for result navigation',
        },
        type: {
          type: 'SearchResultType',
          required: false,
          description: 'Result type for categorization and filtering',
        },
      },
    });

    // Add enum definitions
    this.typeDefinitions.set('SearchResultType', {
      kind: 'enum',
      values: {
        PAGE: { value: 'page', description: 'General web page or document' },
        USER: { value: 'user', description: 'User profile or account' },
        PRODUCT: { value: 'product', description: 'Product or item listing' },
        MEDIA: { value: 'media', description: 'Media file (image, video, audio)' },
        DOCUMENT: { value: 'document', description: 'Document file (PDF, DOC, etc.)' },
        CONTACT: { value: 'contact', description: 'Contact or person information' },
        LOCATION: { value: 'location', description: 'Location or geographical place' },
        EVENT: { value: 'event', description: 'Event or scheduled activity' },
        CATEGORY: { value: 'category', description: 'Category or collection grouping' },
        CUSTOM: { value: 'custom', description: 'Custom type for extensions' },
      },
    });
  }

  /**
   * Initialize parameter hints for functions and interfaces
   * @private
   */
  private initializeParameterHints(): void {
    // SearchConfiguration parameter hints
    this.parameterHints.set('SearchConfiguration', [
      {
        name: 'dataSources',
        type: 'DataSourceConfig[]',
        description: 'Array of data source configurations for backend integration',
        optional: false,
        examples: [
          '[{ type: "api", url: "https://api.example.com/search" }]',
          '[{ type: "static", data: searchData }]',
        ],
      },
      {
        name: 'ui',
        type: 'UIConfig',
        description: 'User interface customization options',
        optional: true,
        defaultValue: 'default UI settings',
        examples: [
          '{ theme: "light", placeholder: "Search..." }',
          '{ maxResults: 10, showCategories: true }',
        ],
      },
      {
        name: 'search',
        type: 'QueryConfig',
        description: 'Search behavior and query processing settings',
        optional: true,
        examples: [
          '{ minLength: 2, debounceDelay: 300 }',
          '{ caseSensitive: false, fuzzySearch: true }',
        ],
      },
    ]);

    // GenericSearchResult parameter hints
    this.parameterHints.set('GenericSearchResult', [
      {
        name: 'TData',
        type: 'generic type parameter',
        description: 'Custom data type for the result payload',
        optional: false,
        examples: ['ProductData', 'UserProfile', 'DocumentMetadata'],
      },
    ]);

    // Event handler parameter hints
    this.parameterHints.set('GenericEventHandler', [
      {
        name: 'TEventData',
        type: 'generic type parameter',
        description: 'Type of data passed to the event handler',
        optional: false,
        examples: ['SearchEventData', 'SelectionEventData', 'ErrorEventData'],
      },
    ]);
  }

  /**
   * Initialize autocomplete suggestions
   * @private
   */
  private initializeAutocompleteSuggestions(): void {
    // Configuration property suggestions
    const configSuggestions: AutocompleteSuggestion[] = [
      {
        text: 'dataSources',
        type: 'property',
        label: 'dataSources: DataSourceConfig[]',
        description: 'Array of data source configurations',
        insertText: 'dataSources: [{\n  type: "api",\n  url: "$1"\n}]',
        priority: 10,
        typeInfo: 'DataSourceConfig[]',
      },
      {
        text: 'ui',
        type: 'property',
        label: 'ui: UIConfig',
        description: 'User interface configuration options',
        insertText: 'ui: {\n  theme: "$1",\n  placeholder: "$2"\n}',
        priority: 9,
        typeInfo: 'UIConfig',
      },
      {
        text: 'search',
        type: 'property',
        label: 'search: QueryConfig',
        description: 'Search behavior configuration',
        insertText: 'search: {\n  minLength: $1,\n  debounceDelay: $2\n}',
        priority: 8,
        typeInfo: 'QueryConfig',
      },
    ];

    this.autocompleteSuggestions.set('SearchConfiguration', configSuggestions);

    // Enum value suggestions
    const resultTypeSuggestions: AutocompleteSuggestion[] = [
      {
        text: 'PAGE',
        type: 'enum',
        label: 'SearchResultType.PAGE',
        description: 'General web page or document result',
        insertText: 'SearchResultType.PAGE',
        priority: 10,
        typeInfo: 'SearchResultType',
      },
      {
        text: 'PRODUCT',
        type: 'enum',
        label: 'SearchResultType.PRODUCT',
        description: 'Product or item listing result',
        insertText: 'SearchResultType.PRODUCT',
        priority: 9,
        typeInfo: 'SearchResultType',
      },
      {
        text: 'USER',
        type: 'enum',
        label: 'SearchResultType.USER',
        description: 'User profile or account result',
        insertText: 'SearchResultType.USER',
        priority: 8,
        typeInfo: 'SearchResultType',
      },
    ];

    this.autocompleteSuggestions.set('SearchResultType', resultTypeSuggestions);
  }

  /**
   * Initialize namespace organization
   * @private
   */
  private initializeNamespaces(): void {
    // Core types namespace
    this.namespaces.set('Core', {
      name: 'Core',
      description: 'Core search component types and interfaces',
      exports: ['SearchConfiguration', 'SearchResult', 'QueryConfig', 'UIConfig'],
      children: [],
      importPath: '@alon/core',
    });

    // Generic types namespace
    this.namespaces.set('Generic', {
      name: 'Generic',
      description: 'Generic and extensible type definitions',
      exports: ['GenericSearchResult', 'GenericSearchConfiguration', 'GenericEventHandler'],
      children: [],
      importPath: '@alon/core/generic',
    });

    // Enums namespace
    this.namespaces.set('Enums', {
      name: 'Enums',
      description: 'Enumeration types for type safety',
      exports: ['SearchResultType', 'DataSourceType', 'ThemeVariant', 'SearchEventType'],
      children: [],
      importPath: '@alon/core/enums',
    });
  }

  /**
   * Generate parameter hints for a given type
   * @param typeName - Name of the type
   * @returns Array of parameter hints
   */
  public generateParameterHints(typeName: string): ParameterHint[] {
    return this.parameterHints.get(typeName) || [];
  }

  /**
   * Get autocomplete suggestions for a given context
   * @param context - Context for suggestions (type name, property path, etc.)
   * @param filterType - Optional filter by suggestion type
   * @returns Array of autocomplete suggestions
   */
  public getAutocompleteSuggestions(
    context: string,
    filterType?: AutocompleteSuggestion['type']
  ): AutocompleteSuggestion[] {
    const suggestions = this.autocompleteSuggestions.get(context) || [];

    if (filterType) {
      return suggestions.filter(suggestion => suggestion.type === filterType);
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Perform type checking on configuration object
   * @param config - Configuration to validate
   * @param typeName - Expected type name
   * @returns Type check results
   */
  public validateConfiguration(
    config: any,
    typeName: string = 'SearchConfiguration'
  ): TypeCheckResult {
    const errors: TypeCheckResult['errors'] = [];
    const suggestions: TypeCheckResult['suggestions'] = [];
    const typeDef = this.typeDefinitions.get(typeName);

    if (!typeDef) {
      return {
        isValid: false,
        errors: [
          {
            code: 'TS2304',
            message: `Cannot find type '${typeName}'`,
            severity: 'error',
            category: 'type',
          },
        ],
        suggestions: [],
      };
    }

    if (typeDef.kind === 'interface') {
      // Check required properties
      for (const [propName, propDef] of Object.entries(typeDef.properties)) {
        const prop = propDef as any;
        if (prop.required && !(propName in config)) {
          errors.push({
            code: 'TS2741',
            message: `Property '${propName}' is missing in type but required`,
            severity: 'error',
            category: 'type',
          });
          suggestions.push({
            message: `Add required property '${propName}' of type '${prop.type}'`,
            fix: `${propName}: ${this.generateDefaultValue(prop.type)}`,
          });
        }
      }

      // Check property types
      for (const [propName, value] of Object.entries(config)) {
        const propDef = (typeDef.properties as any)[propName];
        if (!propDef) {
          errors.push({
            code: 'TS2353',
            message: `Object literal may only specify known properties, and '${propName}' does not exist`,
            severity: 'error',
            category: 'type',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
    };
  }

  /**
   * Generate default value for a given type
   * @param typeName - Type name
   * @returns Default value string
   * @private
   */
  private generateDefaultValue(typeName: string): string {
    const typeMap: Record<string, string> = {
      string: '""',
      number: '0',
      boolean: 'false',
      'DataSourceConfig[]': '[{ type: "api", url: "" }]',
      UIConfig: '{ theme: "light" }',
      QueryConfig: '{ minLength: 2 }',
    };

    return typeMap[typeName] || '{}';
  }

  /**
   * Get navigation targets for "Go to Definition"
   * @param symbol - Symbol name
   * @param position - Current position (optional)
   * @returns Array of navigation targets
   */
  public getNavigationTargets(
    symbol: string,
    position?: { line: number; column: number }
  ): NavigationTarget[] {
    const targets: NavigationTarget[] = [];

    // Map common symbols to their definition locations
    const symbolMap: Record<string, Partial<NavigationTarget>> = {
      SearchConfiguration: {
        filePath: 'packages/core/src/types/Config.ts',
        line: 145,
        column: 17,
        type: 'definition',
      },
      SearchResult: {
        filePath: 'packages/core/src/types/Results.ts',
        line: 15,
        column: 17,
        type: 'definition',
      },
      GenericSearchResult: {
        filePath: 'packages/core/src/types/index.ts',
        line: 97,
        column: 17,
        type: 'definition',
      },
    };

    const target = symbolMap[symbol];
    if (target) {
      targets.push({
        ...target,
        symbol,
        context: `Definition of ${symbol}`,
      } as NavigationTarget);
    }

    return targets;
  }

  /**
   * Get namespace information
   * @param namespaceName - Namespace name
   * @returns Namespace information
   */
  public getNamespaceInfo(namespaceName: string): NamespaceInfo | undefined {
    return this.namespaces.get(namespaceName);
  }

  /**
   * Get all available namespaces
   * @returns Array of namespace information
   */
  public getAllNamespaces(): NamespaceInfo[] {
    return Array.from(this.namespaces.values());
  }

  /**
   * Generate IDE configuration files
   * @param outputPath - Output directory path
   * @returns Generated file information
   */
  public generateIDEConfiguration(outputPath: string): {
    files: Array<{
      path: string;
      content: string;
      description: string;
    }>;
  } {
    const files: Array<{ path: string; content: string; description: string }> = [];

    if (this.config.targetIDE === 'vscode') {
      // Generate VS Code settings
      const vscodeSettings = {
        'typescript.preferences.includePackageJsonAutoImports': 'auto',
        'typescript.suggest.autoImports': true,
        'typescript.preferences.importModuleSpecifier': 'relative',
        'typescript.inlayHints.parameterNames.enabled': 'all',
        'typescript.inlayHints.parameterTypes.enabled': true,
        'typescript.inlayHints.variableTypes.enabled': true,
        'typescript.inlayHints.functionLikeReturnTypes.enabled': true,
      };

      files.push({
        path: `${outputPath}/.vscode/settings.json`,
        content: JSON.stringify(vscodeSettings, null, 2),
        description: 'VS Code workspace settings for optimal TypeScript experience',
      });

      // Generate TypeScript snippets
      const snippets = {
        'Search Configuration': {
          prefix: 'alon-config',
          body: [
            'const config: SearchConfiguration = {',
            '  dataSources: [{',
            "    type: '${1|api,static,localStorage|}',",
            "    ${2:url: '${3:https://api.example.com/search}'}",
            '  }],',
            '  ui: {',
            "    theme: '${4|light,dark,auto|}',",
            "    placeholder: '${5:Search...}'",
            '  }',
            '};',
          ],
          description: 'Create Alon Search Configuration',
        },
      };

      files.push({
        path: `${outputPath}/.vscode/alon-search.code-snippets`,
        content: JSON.stringify(snippets, null, 2),
        description: 'VS Code snippets for Alon Search component',
      });
    }

    return { files };
  }

  /**
   * Get IDE integration statistics
   * @returns Integration statistics
   */
  public getStatistics(): {
    typeDefinitions: number;
    parameterHints: number;
    autocompleteSuggestions: number;
    namespaces: number;
    targetIDE: string;
    features: string[];
  } {
    return {
      typeDefinitions: this.typeDefinitions.size,
      parameterHints: this.parameterHints.size,
      autocompleteSuggestions: this.autocompleteSuggestions.size,
      namespaces: this.namespaces.size,
      targetIDE: this.config.targetIDE,
      features: [
        ...(this.config.intelliSenseOptimization ? ['IntelliSense'] : []),
        ...(this.config.parameterHints ? ['Parameter Hints'] : []),
        ...(this.config.autoCompletion ? ['Auto Completion'] : []),
        ...(this.config.errorChecking ? ['Error Checking'] : []),
        ...(this.config.codeNavigation ? ['Code Navigation'] : []),
      ],
    };
  }
}
