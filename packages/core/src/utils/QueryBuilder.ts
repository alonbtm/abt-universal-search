/**
 * Query Builder - Generates parameterized SQL queries
 * @description Builds secure SQL queries with parameter binding and injection prevention
 */

import type { SQLQueryConfig, SQLPaginationConfig } from '../types/Config';
import type { ParameterizedQuery, ProcessedQuery } from '../types/Results';
import { DatabaseDialect } from './DatabaseDialect';
import { ValidationError } from './validation';

/**
 * SQL query builder with parameterization and security
 */
export class QueryBuilder {
  private dialect: DatabaseDialect;
  private parameterIndex = 0;
  private parameters: unknown[] = [];

  constructor(dialect: DatabaseDialect) {
    this.dialect = dialect;
  }

  /**
   * Build a complete SELECT query for search
   */
  public buildSearchQuery(
    config: SQLQueryConfig,
    query: ProcessedQuery,
    pagination?: SQLPaginationConfig
  ): ParameterizedQuery {
    this.resetParameters();

    const selectClause = this.buildSelectClause(config);
    const fromClause = this.buildFromClause(config);
    const joinClauses = this.buildJoinClauses(config);
    const whereClause = this.buildWhereClause(config, query);
    const groupByClause = this.buildGroupByClause(config);
    const havingClause = this.buildHavingClause(config);
    const orderByClause = this.buildOrderByClause(config);
    const limitClause = this.buildLimitClause(pagination);

    const sqlParts = [
      selectClause,
      fromClause,
      joinClauses,
      whereClause,
      groupByClause,
      havingClause,
      orderByClause,
      limitClause
    ].filter(part => part.trim() !== '');

    const sql = sqlParts.join(' ');
    
    return {
      sql,
      parameters: [...this.parameters],
      parameterTypes: this.inferParameterTypes(),
      metadata: {
        queryType: 'SELECT',
        estimatedRows: pagination?.pageSize
      }
    };
  }

  /**
   * Build SELECT clause with column selection
   */
  private buildSelectClause(config: SQLQueryConfig): string {
    if (!config.selectColumns || config.selectColumns.length === 0) {
      // Use search columns as default if no select columns specified
      const columns = config.searchColumns.map(col => this.dialect.quoteIdentifier(col));
      return `SELECT ${columns.join(', ')}`;
    }

    const columns = config.selectColumns.map(col => {
      // Handle column aliases and functions
      if (col.includes(' AS ') || col.includes(' as ')) {
        const parts = col.split(/\s+(?:AS|as)\s+/i);
        if (parts.length === 2) {
          const columnPart = parts[0].trim();
          const aliasPart = this.dialect.quoteIdentifier(parts[1].trim());
          
          // Check if column part contains functions
          if (this.containsSQLFunction(columnPart)) {
            return `${columnPart} AS ${aliasPart}`;
          } else {
            return `${this.dialect.quoteIdentifier(columnPart)} AS ${aliasPart}`;
          }
        }
      }

      // Handle functions like COUNT, MAX, etc.
      if (this.containsSQLFunction(col)) {
        return col;
      }

      return this.dialect.quoteIdentifier(col);
    });

    return `SELECT ${columns.join(', ')}`;
  }

  /**
   * Build FROM clause
   */
  private buildFromClause(config: SQLQueryConfig): string {
    return `FROM ${this.dialect.quoteIdentifier(config.tableName)}`;
  }

  /**
   * Build JOIN clauses
   */
  private buildJoinClauses(config: SQLQueryConfig): string {
    return this.dialect.buildJoinClauses(config.joinTables);
  }

  /**
   * Build WHERE clause with search conditions
   */
  private buildWhereClause(config: SQLQueryConfig, query: ProcessedQuery): string {
    const conditions: string[] = [];

    // Add search conditions if query is provided
    if (query.normalized && query.normalized.trim()) {
      const searchResult = this.dialect.buildSearchWhereClause(
        config.searchColumns,
        query.normalized,
        false // Use case-insensitive search by default
      );

      if (searchResult.clause) {
        conditions.push(searchResult.clause);
        
        // Add search parameters with proper indexing
        searchResult.parameters.forEach(param => {
          this.parameters.push(param);
        });
      }
    }

    // Add custom WHERE clause conditions
    if (config.whereClause) {
      conditions.push(config.whereClause);
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  /**
   * Build GROUP BY clause
   */
  private buildGroupByClause(config: SQLQueryConfig): string {
    return this.dialect.buildGroupByClause(config.groupBy);
  }

  /**
   * Build HAVING clause
   */
  private buildHavingClause(config: SQLQueryConfig): string {
    if (!config.having) {
      return '';
    }

    return `HAVING ${config.having}`;
  }

  /**
   * Build ORDER BY clause
   */
  private buildOrderByClause(config: SQLQueryConfig): string {
    return this.dialect.buildOrderByClause(config.orderBy);
  }

  /**
   * Build LIMIT clause with pagination
   */
  private buildLimitClause(pagination?: SQLPaginationConfig): string {
    if (!pagination || !pagination.pageSize) {
      return '';
    }

    const limit = pagination.maxResults || pagination.pageSize;
    return this.dialect.buildLimitClause(limit);
  }

  /**
   * Build INSERT query
   */
  public buildInsertQuery(
    tableName: string,
    data: Record<string, unknown>
  ): ParameterizedQuery {
    this.resetParameters();

    const quotedTable = this.dialect.quoteIdentifier(tableName);
    const columns = Object.keys(data);
    const quotedColumns = columns.map(col => this.dialect.quoteIdentifier(col));
    
    const placeholders = columns.map(() => {
      const placeholder = this.dialect.createParameterPlaceholder(this.parameterIndex);
      this.parameterIndex++;
      return placeholder;
    });

    // Add values to parameters
    columns.forEach(col => {
      this.parameters.push(data[col]);
    });

    const sql = `INSERT INTO ${quotedTable} (${quotedColumns.join(', ')}) VALUES (${placeholders.join(', ')})`;

    return {
      sql,
      parameters: [...this.parameters],
      parameterTypes: this.inferParameterTypes(),
      metadata: {
        queryType: 'INSERT'
      }
    };
  }

  /**
   * Build UPDATE query
   */
  public buildUpdateQuery(
    tableName: string,
    data: Record<string, unknown>,
    whereConditions: Record<string, unknown>
  ): ParameterizedQuery {
    this.resetParameters();

    const quotedTable = this.dialect.quoteIdentifier(tableName);
    
    // Build SET clause
    const setClause = Object.keys(data).map(col => {
      const quotedCol = this.dialect.quoteIdentifier(col);
      const placeholder = this.dialect.createParameterPlaceholder(this.parameterIndex);
      this.parameterIndex++;
      this.parameters.push(data[col]);
      return `${quotedCol} = ${placeholder}`;
    }).join(', ');

    // Build WHERE clause
    const whereClause = Object.keys(whereConditions).map(col => {
      const quotedCol = this.dialect.quoteIdentifier(col);
      const placeholder = this.dialect.createParameterPlaceholder(this.parameterIndex);
      this.parameterIndex++;
      this.parameters.push(whereConditions[col]);
      return `${quotedCol} = ${placeholder}`;
    }).join(' AND ');

    const sql = `UPDATE ${quotedTable} SET ${setClause} WHERE ${whereClause}`;

    return {
      sql,
      parameters: [...this.parameters],
      parameterTypes: this.inferParameterTypes(),
      metadata: {
        queryType: 'UPDATE'
      }
    };
  }

  /**
   * Build DELETE query
   */
  public buildDeleteQuery(
    tableName: string,
    whereConditions: Record<string, unknown>
  ): ParameterizedQuery {
    this.resetParameters();

    const quotedTable = this.dialect.quoteIdentifier(tableName);
    
    // Build WHERE clause
    const whereClause = Object.keys(whereConditions).map(col => {
      const quotedCol = this.dialect.quoteIdentifier(col);
      const placeholder = this.dialect.createParameterPlaceholder(this.parameterIndex);
      this.parameterIndex++;
      this.parameters.push(whereConditions[col]);
      return `${quotedCol} = ${placeholder}`;
    }).join(' AND ');

    const sql = `DELETE FROM ${quotedTable} WHERE ${whereClause}`;

    return {
      sql,
      parameters: [...this.parameters],
      parameterTypes: this.inferParameterTypes(),
      metadata: {
        queryType: 'DELETE'
      }
    };
  }

  /**
   * Build COUNT query for pagination
   */
  public buildCountQuery(
    config: SQLQueryConfig,
    query: ProcessedQuery
  ): ParameterizedQuery {
    this.resetParameters();

    const fromClause = this.buildFromClause(config);
    const joinClauses = this.buildJoinClauses(config);
    const whereClause = this.buildWhereClause(config, query);

    const sqlParts = [
      'SELECT COUNT(*)',
      fromClause,
      joinClauses,
      whereClause
    ].filter(part => part.trim() !== '');

    const sql = sqlParts.join(' ');

    return {
      sql,
      parameters: [...this.parameters],
      parameterTypes: this.inferParameterTypes(),
      metadata: {
        queryType: 'SELECT',
        estimatedRows: 1
      }
    };
  }

  /**
   * Build query for cursor-based pagination
   */
  public buildCursorQuery(
    config: SQLQueryConfig,
    query: ProcessedQuery,
    cursorColumn: string,
    cursorValue: unknown,
    direction: 'next' | 'previous',
    pageSize: number
  ): ParameterizedQuery {
    this.resetParameters();

    const selectClause = this.buildSelectClause(config);
    const fromClause = this.buildFromClause(config);
    const joinClauses = this.buildJoinClauses(config);
    const whereClause = this.buildWhereClause(config, query);
    
    // Add cursor condition
    const quotedCursorCol = this.dialect.quoteIdentifier(cursorColumn);
    const cursorPlaceholder = this.dialect.createParameterPlaceholder(this.parameterIndex);
    this.parameterIndex++;
    this.parameters.push(cursorValue);

    const operator = direction === 'next' ? '>' : '<';
    const cursorCondition = `${quotedCursorCol} ${operator} ${cursorPlaceholder}`;
    
    const finalWhereClause = whereClause 
      ? `${whereClause} AND ${cursorCondition}`
      : `WHERE ${cursorCondition}`;

    // Order by cursor column
    const orderDirection = direction === 'next' ? 'ASC' : 'DESC';
    const orderByClause = `ORDER BY ${quotedCursorCol} ${orderDirection}`;
    
    const limitClause = this.dialect.buildLimitClause(pageSize);

    const sqlParts = [
      selectClause,
      fromClause,
      joinClauses,
      finalWhereClause,
      orderByClause,
      limitClause
    ].filter(part => part.trim() !== '');

    const sql = sqlParts.join(' ');

    return {
      sql,
      parameters: [...this.parameters],
      parameterTypes: this.inferParameterTypes(),
      metadata: {
        queryType: 'SELECT',
        estimatedRows: pageSize
      }
    };
  }

  /**
   * Validate query configuration
   */
  public validateConfig(config: SQLQueryConfig): void {
    if (!config.tableName || config.tableName.trim() === '') {
      throw new ValidationError('Table name is required');
    }

    if (!config.searchColumns || config.searchColumns.length === 0) {
      throw new ValidationError('At least one search column is required');
    }

    // Validate column names
    const allColumns = [
      ...config.searchColumns,
      ...(config.selectColumns || []),
      ...(config.groupBy || [])
    ];

    for (const column of allColumns) {
      if (!column || typeof column !== 'string') {
        throw new ValidationError('All column names must be non-empty strings');
      }

      // Skip function validation for complex expressions
      if (!this.containsSQLFunction(column) && !this.isValidIdentifier(column)) {
        throw new ValidationError(`Invalid column name: ${column}`);
      }
    }

    // Validate JOIN configurations
    if (config.joinTables) {
      for (const join of config.joinTables) {
        if (!join.table || !join.condition) {
          throw new ValidationError('JOIN tables must have table and condition specified');
        }
        
        if (!['INNER', 'LEFT', 'RIGHT', 'FULL'].includes(join.type)) {
          throw new ValidationError(`Invalid JOIN type: ${join.type}`);
        }
      }
    }

    // Validate ORDER BY configurations
    if (config.orderBy) {
      for (const order of config.orderBy) {
        if (!order.column || !['ASC', 'DESC'].includes(order.direction)) {
          throw new ValidationError('ORDER BY must have valid column and direction');
        }
      }
    }
  }

  /**
   * Reset parameter tracking
   */
  private resetParameters(): void {
    this.parameterIndex = 0;
    this.parameters = [];
  }

  /**
   * Infer parameter types from values
   */
  private inferParameterTypes(): string[] {
    return this.parameters.map(param => {
      if (param === null || param === undefined) return 'NULL';
      if (typeof param === 'string') return 'VARCHAR';
      if (typeof param === 'number') return Number.isInteger(param) ? 'INTEGER' : 'DECIMAL';
      if (typeof param === 'boolean') return 'BOOLEAN';
      if (param instanceof Date) return 'TIMESTAMP';
      return 'TEXT';
    });
  }

  /**
   * Check if string contains SQL functions
   */
  private containsSQLFunction(str: string): boolean {
    const functions = [
      'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
      'UPPER', 'LOWER', 'TRIM', 'LENGTH',
      'SUBSTRING', 'CONCAT', 'COALESCE',
      'CAST', 'CONVERT', 'NOW', 'CURRENT_TIMESTAMP'
    ];

    const upperStr = str.toUpperCase();
    return functions.some(fn => upperStr.includes(fn + '('));
  }

  /**
   * Check if string is a valid SQL identifier
   */
  private isValidIdentifier(identifier: string): boolean {
    // Allow dot notation for table.column references
    return /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(identifier);
  }

  /**
   * Get current parameter count
   */
  public getParameterCount(): number {
    return this.parameters.length;
  }

  /**
   * Get current parameters
   */
  public getParameters(): unknown[] {
    return [...this.parameters];
  }
}

/**
 * Query builder factory
 */
export class QueryBuilderFactory {
  private static builders = new Map<string, QueryBuilder>();

  /**
   * Get or create query builder for dialect
   */
  public static getBuilder(dialect: DatabaseDialect): QueryBuilder {
    const config = dialect.getConfig();
    const key = `${config.type}-${config.version || 'default'}`;

    if (!this.builders.has(key)) {
      this.builders.set(key, new QueryBuilder(dialect));
    }

    return this.builders.get(key)!;
  }

  /**
   * Clear builder cache
   */
  public static clearCache(): void {
    this.builders.clear();
  }
}

/**
 * Global query builder factory instance
 */
export const queryBuilderFactory = QueryBuilderFactory;