/**
 * Memory Adapter - Enhanced In-Memory Data Search Implementation
 * @description Handles searching through arrays of objects with comprehensive filtering and BaseAdapter compliance
 */

import { BaseDataSourceAdapter, type AdapterCapabilities } from './BaseAdapter';
import { ValidationError } from '../utils/validation';
import type { DataSourceConfig, MemoryDataSourceConfig } from '../types/Config';
import type { ProcessedQuery, Connection, RawResult } from '../types/Results';

/**
 * Raw search result before transformation
 */
export interface RawSearchResult {
  item: unknown;
  score: number;
  matchedFields: string[];
}

/**
 * Basic memory data source configuration (deprecated - use MemoryDataSourceConfig)
 */
export interface MemoryAdapterConfig {
  data: unknown[];
  searchFields: string[];
  caseSensitive?: boolean;
}

/**
 * Enhanced memory adapter extending BaseDataSourceAdapter
 */
export class MemoryAdapter extends BaseDataSourceAdapter {
  private readonly config: MemoryDataSourceConfig;
  private data: unknown[];
  private isValidated = false;

  constructor(config?: unknown) {
    super('memory');

    // Handle both old and new config formats for backward compatibility
    const memoryConfig = this.normalizeConfig(config);
    if (!memoryConfig) {
      throw new ValidationError('MemoryAdapter requires configuration');
    }

    this.config = {
      type: 'memory',
      caseSensitive: false,
      updateStrategy: 'static',
      searchFields: [],
      data: [],
      ...memoryConfig,
    } as MemoryDataSourceConfig;

    this.data = Array.isArray(this.config.data)
      ? [...this.config.data]
      : typeof this.config.data === 'function'
        ? [...this.config.data()]
        : [];

    // Validate configuration immediately
    try {
      this.validateConfigSync(this.config);
      this.isValidated = true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Normalize config to handle both old and new formats
   */
  private normalizeConfig(config: unknown): Partial<MemoryDataSourceConfig> | null {
    if (!config) return null;

    const configObj = config as any;

    // Handle old MemoryAdapterConfig format
    if (configObj.data && configObj.searchFields) {
      return {
        type: 'memory',
        data: configObj.data,
        searchFields: configObj.searchFields,
        caseSensitive: configObj.caseSensitive || false,
        updateStrategy: 'static',
      };
    }

    // Handle new MemoryDataSourceConfig format
    return configObj as Partial<MemoryDataSourceConfig>;
  }

  /**
   * Connect to memory data source (BaseAdapter interface)
   */
  public async connect(config: DataSourceConfig): Promise<Connection> {
    const memoryConfig = config as MemoryDataSourceConfig;
    await this.validateConfig(memoryConfig);

    const connectionId = `memory-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const connection = this.createConnection(connectionId, { config: memoryConfig });

    // Update connection status
    this.updateConnectionStatus(connectionId, 'connected');

    return connection;
  }

  /**
   * Execute query on memory data (BaseAdapter interface)
   */
  public async query(connection: Connection, query: ProcessedQuery): Promise<RawResult[]> {
    return this.executeWithMetrics(
      connection.id,
      async () => {
        const searchResults = this.search(query.normalized);

        return searchResults.map((result, index) => ({
          id: `memory_${index}_${Date.now()}`,
          data: result.item,
          score: result.score,
          matchedFields: result.matchedFields,
          metadata: {
            matchedFields: result.matchedFields,
            adapterType: 'memory',
            searchQuery: query.normalized,
          },
        }));
      },
      'query'
    );
  }

  /**
   * Disconnect from memory data source (BaseAdapter interface)
   */
  public async disconnect(connection: Connection): Promise<void> {
    this.updateConnectionStatus(connection.id, 'disconnected');
    this.removeConnection(connection.id);
  }

  /**
   * Validate configuration (BaseAdapter interface)
   */
  public async validateConfig(config: DataSourceConfig): Promise<void> {
    const memoryConfig = config as MemoryDataSourceConfig;

    if (memoryConfig.type !== 'memory') {
      throw new ValidationError('Config type must be "memory" for MemoryAdapter');
    }

    this.validateConfigSync(memoryConfig);
  }

  /**
   * Get adapter capabilities (BaseAdapter interface)
   */
  public getCapabilities(): AdapterCapabilities {
    return {
      supportsPooling: false,
      supportsRealTime: this.config.updateStrategy === 'reactive',
      supportsPagination: true,
      supportsSorting: true,
      supportsFiltering: true,
      maxConcurrentConnections: 100,
      supportedQueryTypes: ['text', 'partial', 'exact'],
    };
  }

  /**
   * Search through the in-memory data
   */
  public search(query: string): RawSearchResult[] {
    if (!this.isValidated) {
      throw new ValidationError('Adapter configuration is invalid');
    }

    if (!query || typeof query !== 'string') {
      return [];
    }

    const normalizedQuery = this.normalizeQuery(query);
    if (normalizedQuery.length === 0) {
      return [];
    }

    const results: RawSearchResult[] = [];

    for (const item of this.data) {
      const matchResult = this.matchItem(item, normalizedQuery);
      if (matchResult.score > 0) {
        results.push({
          item,
          score: matchResult.score,
          matchedFields: matchResult.matchedFields,
        });
      }
    }

    // Sort by score (higher is better)
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Update the data array
   */
  public updateData(newData: unknown[]): void {
    if (!Array.isArray(newData)) {
      throw new ValidationError('Data must be an array');
    }

    this.data = [...newData];
    this.validateData();
  }

  /**
   * Get current data
   */
  public getData(): readonly unknown[] {
    return [...this.data];
  }

  /**
   * Get adapter configuration
   */
  public getConfig(): Readonly<Required<MemoryAdapterConfig>> {
    const configCopy = {
      ...this.config,
      data: Array.isArray(this.config.data) ? this.config.data : [],
    };
    return configCopy as Readonly<Required<MemoryAdapterConfig>>;
  }

  /**
   * Synchronous version of validateConfig for constructor use
   */
  private validateConfigSync(config: MemoryDataSourceConfig | MemoryAdapterConfig): void {
    const data = Array.isArray(config.data)
      ? config.data
      : typeof config.data === 'function'
        ? config.data()
        : null;

    if (!Array.isArray(data)) {
      throw new ValidationError('Data must be an array or function returning an array', 'data');
    }

    if (!Array.isArray(config.searchFields) || config.searchFields.length === 0) {
      throw new ValidationError('searchFields must be a non-empty array', 'searchFields');
    }

    for (const field of config.searchFields) {
      if (typeof field !== 'string' || field.trim().length === 0) {
        throw new ValidationError('All searchFields must be non-empty strings', 'searchFields');
      }
    }

    // Update internal data reference
    if (Array.isArray(data)) {
      this.data = [...data];
    }

    this.validateData();
  }

  /**
   * Validate that data items have the required search fields
   */
  private validateData(): void {
    if (this.data.length === 0) {
      return; // Empty data is valid
    }

    // Check first few items to ensure they have the searchable fields
    const sampleSize = Math.min(3, this.data.length);
    for (let i = 0; i < sampleSize; i++) {
      const item = this.data[i];
      if (!item || typeof item !== 'object') {
        throw new ValidationError(`Data item at index ${i} must be an object`, 'data');
      }

      for (const field of this.config.searchFields) {
        const value = this.getFieldValue(item, field);
        if (
          value !== null &&
          value !== undefined &&
          typeof value !== 'string' &&
          typeof value !== 'number'
        ) {
          throw new ValidationError(
            `Field "${field}" must be string or number type in data items`,
            'searchFields'
          );
        }
      }
    }
  }

  /**
   * Normalize query string for searching
   */
  private normalizeQuery(query: string): string {
    const trimmed = query.trim();
    return this.config.caseSensitive ? trimmed : trimmed.toLowerCase();
  }

  /**
   * Match an item against the query
   */
  private matchItem(
    item: unknown,
    normalizedQuery: string
  ): { score: number; matchedFields: string[] } {
    if (!item || typeof item !== 'object') {
      return { score: 0, matchedFields: [] };
    }

    let totalScore = 0;
    const matchedFields: string[] = [];

    for (const field of this.config.searchFields) {
      const value = this.getFieldValue(item, field);
      if (value === null || value === undefined) {
        continue;
      }

      const fieldValue = String(value);
      const normalizedValue = this.config.caseSensitive ? fieldValue : fieldValue.toLowerCase();

      if (normalizedValue.includes(normalizedQuery)) {
        // Score based on match quality
        let fieldScore = 1;

        // Exact match gets highest score
        if (normalizedValue === normalizedQuery) {
          fieldScore = 10;
        }
        // Starts with query gets higher score
        else if (normalizedValue.startsWith(normalizedQuery)) {
          fieldScore = 5;
        }
        // Partial match gets base score
        else {
          fieldScore = 1;
        }

        totalScore += fieldScore;
        matchedFields.push(field);
      }
    }

    return { score: totalScore, matchedFields };
  }

  /**
   * Get field value from object (supports dot notation)
   */
  private getFieldValue(obj: unknown, field: string): unknown {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    const path = field.split('.');
    let current: any = obj;

    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }

    return current;
  }
}
