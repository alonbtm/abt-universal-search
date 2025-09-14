/**
 * Query Optimizer - Database query analysis and optimization system
 * @description Analyzes SQL queries, provides execution plan analysis, and suggests optimizations
 */

import {
  QueryOptimizationResult,
  QueryExecutionPlan,
  IQueryOptimizer
} from '../types/Performance.js';

/**
 * SQL Query patterns and optimization rules
 */
const OPTIMIZATION_PATTERNS = {
  // SELECT optimizations
  SELECT_STAR: {
    pattern: /SELECT\s+\*\s+FROM/i,
    type: 'select' as const,
    description: 'Replace SELECT * with specific columns',
    impact: 'medium' as const,
    replacement: (match: string, columns?: string[]) => 
      columns ? `SELECT ${columns.join(', ')} FROM` : match
  },
  
  // WHERE clause optimizations
  FUNCTION_IN_WHERE: {
    pattern: /WHERE\s+\w+\([^)]+\)\s*[=<>]/i,
    type: 'where' as const,
    description: 'Avoid functions in WHERE clause for better index usage',
    impact: 'high' as const
  },
  
  // JOIN optimizations
  IMPLICIT_JOIN: {
    pattern: /FROM\s+\w+\s*,\s*\w+.*WHERE.*=/i,
    type: 'join' as const,
    description: 'Convert implicit JOIN to explicit JOIN for clarity',
    impact: 'low' as const
  },
  
  // LIMIT optimizations
  MISSING_LIMIT: {
    pattern: /SELECT.*FROM.*(?!.*LIMIT)/i,
    type: 'select' as const,
    description: 'Consider adding LIMIT clause for large result sets',
    impact: 'medium' as const
  },
  
  // Index hints
  MISSING_INDEX_HINT: {
    pattern: /WHERE\s+(\w+)\s*[=<>]/i,
    type: 'index' as const,
    description: 'Consider adding index on frequently queried columns',
    impact: 'high' as const
  }
};

/**
 * Index recommendation rules
 */
const INDEX_RULES = {
  WHERE_CLAUSE: {
    priority: 10,
    type: 'btree' as const,
    description: 'Index on WHERE clause columns for faster lookups'
  },
  JOIN_CLAUSE: {
    priority: 9,
    type: 'btree' as const,
    description: 'Index on JOIN columns for faster joins'
  },
  ORDER_BY: {
    priority: 7,
    type: 'btree' as const,
    description: 'Index on ORDER BY columns for faster sorting'
  },
  GROUP_BY: {
    priority: 6,
    type: 'btree' as const,
    description: 'Index on GROUP BY columns for faster aggregation'
  }
};

/**
 * Query complexity analyzer
 */
class QueryComplexityAnalyzer {
  analyzeComplexity(query: string): number {
    let complexity = 0;
    
    // Base complexity
    complexity += 1;
    
    // JOIN complexity
    const joinMatches = query.match(/\bJOIN\b/gi);
    complexity += (joinMatches?.length || 0) * 2;
    
    // Subquery complexity
    const subqueryMatches = query.match(/\bSELECT\b/gi);
    complexity += Math.max(0, (subqueryMatches?.length || 1) - 1) * 3;
    
    // WHERE clause complexity
    const whereConditions = query.match(/\bAND\b|\bOR\b/gi);
    complexity += (whereConditions?.length || 0) * 0.5;
    
    // Function complexity
    const functionMatches = query.match(/\b\w+\(/g);
    complexity += (functionMatches?.length || 0) * 0.5;
    
    // UNION complexity
    const unionMatches = query.match(/\bUNION\b/gi);
    complexity += (unionMatches?.length || 0) * 2;
    
    // Window function complexity
    const windowMatches = query.match(/\bOVER\s*\(/gi);
    complexity += (windowMatches?.length || 0) * 2;
    
    return Math.max(1, complexity);
  }
}

/**
 * SQL Query Parser
 */
class SQLQueryParser {
  parseQuery(query: string): {
    type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    tables: string[];
    columns: string[];
    whereColumns: string[];
    joinColumns: string[];
    orderByColumns: string[];
    groupByColumns: string[];
  } {
    const normalized = query.trim().toUpperCase();
    
    // Determine query type
    let type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'SELECT';
    if (normalized.startsWith('INSERT')) type = 'INSERT';
    else if (normalized.startsWith('UPDATE')) type = 'UPDATE';
    else if (normalized.startsWith('DELETE')) type = 'DELETE';
    
    return {
      type,
      tables: this.extractTables(query),
      columns: this.extractSelectColumns(query),
      whereColumns: this.extractWhereColumns(query),
      joinColumns: this.extractJoinColumns(query),
      orderByColumns: this.extractOrderByColumns(query),
      groupByColumns: this.extractGroupByColumns(query)
    };
  }
  
  private extractTables(query: string): string[] {
    const tables: string[] = [];
    
    // FROM clause tables
    const fromMatch = query.match(/FROM\s+([^WHERE|GROUP|ORDER|LIMIT|JOIN]+)/i);
    if (fromMatch && fromMatch[1]) {
      const tableNames = fromMatch[1].split(',')
        .map(t => t.trim().split(/\s+/)[0])
        .filter((name): name is string => Boolean(name));
      tables.push(...tableNames);
    }
    
    // JOIN tables
    const joinMatches = query.match(/JOIN\s+(\w+)/gi);
    if (joinMatches) {
      joinMatches.forEach(match => {
        const tableName = match.replace(/JOIN\s+/i, '').trim();
        tables.push(tableName);
      });
    }
    
    return Array.from(new Set(tables)); // Remove duplicates
  }
  
  private extractSelectColumns(query: string): string[] {
    const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM/i);
    if (!selectMatch || !selectMatch[1]) return [];
    
    const columnsStr = selectMatch[1];
    if (columnsStr.includes('*')) return ['*'];
    
    return columnsStr.split(',').map(col => 
      col.trim().split(/\s+/)[0]?.replace(/^.*\./, '') || ''
    ).filter(col => col.length > 0);
  }
  
  private extractWhereColumns(query: string): string[] {
    const whereMatch = query.match(/WHERE\s+(.*?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|$)/i);
    if (!whereMatch || !whereMatch[1]) return [];
    
    const whereClause = whereMatch[1];
    const columnMatches = whereClause.match(/(\w+)\s*[=<>!]/g);
    
    return columnMatches ? columnMatches.map(match => 
      match.replace(/\s*[=<>!].*/, '').trim()
    ) : [];
  }
  
  private extractJoinColumns(query: string): string[] {
    const joinMatches = query.match(/ON\s+([\w.]+)\s*=\s*([\w.]+)/gi);
    if (!joinMatches) return [];
    
    const columns: string[] = [];
    joinMatches.forEach(match => {
      const parts = match.replace(/ON\s+/i, '').split('=');
      parts.forEach(part => {
        const column = part.trim().replace(/^.*\./, '');
        columns.push(column);
      });
    });
    
    return Array.from(new Set(columns));
  }
  
  private extractOrderByColumns(query: string): string[] {
    const orderMatch = query.match(/ORDER\s+BY\s+(.*?)(?:\s+LIMIT|$)/i);
    if (!orderMatch || !orderMatch[1]) return [];
    
    const orderClause = orderMatch[1];
    return orderClause.split(',').map(col => 
      col.trim().split(/\s+/)[0]?.replace(/^.*\./, '') || ''
    ).filter(col => col.length > 0);
  }
  
  private extractGroupByColumns(query: string): string[] {
    const groupMatch = query.match(/GROUP\s+BY\s+(.*?)(?:\s+ORDER|\s+LIMIT|$)/i);
    if (!groupMatch || !groupMatch[1]) return [];
    
    const groupClause = groupMatch[1];
    return groupClause.split(',').map(col => 
      col.trim().replace(/^.*\./, '')
    ).filter(col => col.length > 0);
  }
}

/**
 * Query Optimizer Implementation
 */
export class QueryOptimizer implements IQueryOptimizer {
  private parser: SQLQueryParser;
  private complexityAnalyzer: QueryComplexityAnalyzer;
  private queryHistory: Map<string, {
    count: number;
    avgExecutionTime: number;
    lastExecuted: number;
  }>;

  constructor() {
    this.parser = new SQLQueryParser();
    this.complexityAnalyzer = new QueryComplexityAnalyzer();
    this.queryHistory = new Map();
  }

  /**
   * Analyze query execution plan
   */
  analyzeQuery(query: string, schema?: Record<string, any>): QueryExecutionPlan {
    const parsed = this.parser.parseQuery(query);
    const complexity = this.complexityAnalyzer.analyzeComplexity(query);
    
    // Simulate execution plan nodes
    const nodes = this.generateExecutionPlan(parsed, schema);
    
    // Calculate metrics
    const totalTime = nodes.reduce((sum, node) => sum + node.time, 0);
    const totalCost = nodes.reduce((sum, node) => sum + node.cost, 0);
    const rowsProcessed = nodes.reduce((sum, node) => sum + node.rows, 0);
    
    // Analyze for bottlenecks and recommendations
    const analysis = this.analyzeExecutionPlan(nodes, complexity);
    
    return {
      nodes,
      totalTime,
      totalCost,
      rowsProcessed,
      memoryUsage: Math.floor(totalCost * 1024), // Rough estimate
      ioOperations: nodes.filter(n => n.type === 'Scan').length,
      analysis
    };
  }

  /**
   * Optimize query
   */
  optimizeQuery(query: string, _schema?: Record<string, any>): QueryOptimizationResult {
    const parsed = this.parser.parseQuery(query);
    const complexity = this.complexityAnalyzer.analyzeComplexity(query);
    
    let optimizedQuery = query;
    const optimizations: QueryOptimizationResult['optimizations'] = [];
    
    // Apply optimization patterns
    for (const [, pattern] of Object.entries(OPTIMIZATION_PATTERNS)) {
      if (pattern.pattern.test(query)) {
        optimizations.push({
          ...pattern,
          impact: pattern.impact
        });
        
        if ('replacement' in pattern && pattern.type === 'select' && parsed.columns.length > 0) {
          optimizedQuery = optimizedQuery.replace(pattern.pattern, 
            pattern.replacement(query, parsed.columns)
          );
        }
      }
    }
    
    // Generate index recommendations
    const indexRecommendations = this.generateIndexRecommendations(parsed, _schema);
    
    // Calculate estimated improvements
    const estimatedImprovement = this.calculateEstimatedImprovement(
      optimizations,
      complexity,
      indexRecommendations
    );
    
    return {
      originalQuery: query,
      optimizedQuery,
      optimizations,
      estimatedImprovement,
      indexRecommendations,
      complexityScore: complexity,
      confidence: this.calculateOptimizationConfidence(optimizations, indexRecommendations)
    };
  }

  /**
   * Get indexing recommendations
   */
  getIndexRecommendations(queries: string[]): Array<{
    table: string;
    columns: string[];
    type: string;
    impact: number;
  }> {
    const recommendations = new Map<string, {
      table: string;
      columns: string[];
      type: string;
      impact: number;
      frequency: number;
    }>();

    queries.forEach(query => {
      const parsed = this.parser.parseQuery(query);
      
      // WHERE clause recommendations
      parsed.tables.forEach(table => {
        parsed.whereColumns.forEach(column => {
          const key = `${table}.${column}`;
          const existing = recommendations.get(key);
          if (existing) {
            existing.frequency++;
            existing.impact = Math.min(10, existing.impact + 0.5);
          } else {
            recommendations.set(key, {
              table,
              columns: [column],
              type: 'btree',
              impact: INDEX_RULES.WHERE_CLAUSE.priority,
              frequency: 1
            });
          }
        });
        
        // JOIN column recommendations
        parsed.joinColumns.forEach(column => {
          const key = `${table}.${column}_join`;
          const existing = recommendations.get(key);
          if (existing) {
            existing.frequency++;
            existing.impact = Math.min(10, existing.impact + 0.3);
          } else {
            recommendations.set(key, {
              table,
              columns: [column],
              type: 'btree',
              impact: INDEX_RULES.JOIN_CLAUSE.priority,
              frequency: 1
            });
          }
        });
        
        // ORDER BY recommendations
        if (parsed.orderByColumns.length > 0) {
          const key = `${table}.orderby_${parsed.orderByColumns.join('_')}`;
          const existing = recommendations.get(key);
          if (existing) {
            existing.frequency++;
          } else {
            recommendations.set(key, {
              table,
              columns: parsed.orderByColumns,
              type: 'btree',
              impact: INDEX_RULES.ORDER_BY.priority,
              frequency: 1
            });
          }
        }
      });
    });

    return Array.from(recommendations.values())
      .sort((a, b) => (b.impact * b.frequency) - (a.impact * a.frequency))
      .map(({ table, columns, type, impact, frequency }) => ({
        table,
        columns,
        type,
        impact: impact * frequency
      }));
  }

  /**
   * Validate query performance
   */
  validatePerformance(query: string, thresholds: Record<string, number>): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    const executionPlan = this.analyzeQuery(query);
    const complexity = executionPlan.analysis.complexity;
    
    // Check complexity
    if (complexity === 'high' && thresholds.complexity) {
      issues.push('Query complexity is high');
      suggestions.push('Consider breaking down the query into smaller parts');
    }
    
    // Check estimated execution time
    if (executionPlan.totalTime > (thresholds.executionTime || 1000)) {
      issues.push('Estimated execution time exceeds threshold');
      suggestions.push('Add indexes or optimize WHERE clauses');
    }
    
    // Check for missing indexes
    if (executionPlan.analysis.bottlenecks.includes('Missing index')) {
      issues.push('Missing indexes detected');
      suggestions.push('Create indexes on frequently queried columns');
    }
    
    // Check for SELECT *
    if (query.includes('SELECT *')) {
      issues.push('SELECT * usage detected');
      suggestions.push('Specify only required columns');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Record query execution for learning
   */
  recordQueryExecution(query: string, executionTime: number): void {
    const history = this.queryHistory.get(query);
    const now = Date.now();
    
    if (history) {
      history.count++;
      history.avgExecutionTime = (history.avgExecutionTime * (history.count - 1) + executionTime) / history.count;
      history.lastExecuted = now;
    } else {
      this.queryHistory.set(query, {
        count: 1,
        avgExecutionTime: executionTime,
        lastExecuted: now
      });
    }
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    totalQueries: number;
    averageComplexity: number;
    commonPatterns: Array<{ pattern: string; frequency: number }>;
    topBottlenecks: Array<{ bottleneck: string; frequency: number }>;
  } {
    const patterns = new Map<string, number>();
    const bottlenecks = new Map<string, number>();
    let totalComplexity = 0;
    
    for (const [query, history] of Array.from(this.queryHistory.entries())) {
      const complexity = this.complexityAnalyzer.analyzeComplexity(query);
      totalComplexity += complexity;
      
      // Track patterns
      if (query.includes('JOIN')) {
        patterns.set('JOIN', (patterns.get('JOIN') || 0) + 1);
      }
      if (query.includes('SELECT *')) {
        patterns.set('SELECT *', (patterns.get('SELECT *') || 0) + 1);
      }
      if (query.includes('LIKE')) {
        patterns.set('LIKE', (patterns.get('LIKE') || 0) + 1);
      }
      
      // Simulate bottleneck detection
      if (complexity > 5) {
        bottlenecks.set('High complexity', (bottlenecks.get('High complexity') || 0) + 1);
      }
      if (history.avgExecutionTime > 1000) {
        bottlenecks.set('Slow execution', (bottlenecks.get('Slow execution') || 0) + 1);
      }
    }
    
    return {
      totalQueries: this.queryHistory.size,
      averageComplexity: this.queryHistory.size > 0 ? totalComplexity / this.queryHistory.size : 0,
      commonPatterns: Array.from(patterns.entries())
        .map(([pattern, frequency]) => ({ pattern, frequency }))
        .sort((a, b) => b.frequency - a.frequency),
      topBottlenecks: Array.from(bottlenecks.entries())
        .map(([bottleneck, frequency]) => ({ bottleneck, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
    };
  }

  // Private implementation methods

  private generateExecutionPlan(
    parsed: ReturnType<SQLQueryParser['parseQuery']>,
    schema?: Record<string, any>
  ): QueryExecutionPlan['nodes'] {
    const nodes: QueryExecutionPlan['nodes'] = [];
    let nodeId = 1;
    
    // Table scan nodes
    parsed.tables.forEach(table => {
      const estimatedRows = schema?.[table]?.rowCount || 10000;
      nodes.push({
        id: `node_${nodeId++}`,
        type: 'Scan',
        table,
        cost: estimatedRows * 0.1,
        rows: estimatedRows,
        time: estimatedRows * 0.01,
        children: [],
        details: { scanType: 'sequential' }
      });
    });
    
    // Join nodes
    if (parsed.joinColumns.length > 0) {
      nodes.push({
        id: `node_${nodeId++}`,
        type: 'Join',
        cost: 5000,
        rows: 5000,
        time: 100,
        children: nodes.slice(-2).map(n => n.id),
        details: { joinType: 'nested_loop' }
      });
    }
    
    // Filter node for WHERE clause
    if (parsed.whereColumns.length > 0) {
      const filterRows = Math.floor((nodes[0]?.rows || 1000) * 0.1);
      nodes.push({
        id: `node_${nodeId++}`,
        type: 'Filter',
        cost: filterRows * 0.05,
        rows: filterRows,
        time: filterRows * 0.005,
        children: [nodes[nodes.length - 1]?.id || ''],
        details: { conditions: parsed.whereColumns.length }
      });
    }
    
    // Sort node for ORDER BY
    if (parsed.orderByColumns.length > 0) {
      const sortRows = nodes[nodes.length - 1]?.rows || 1000;
      nodes.push({
        id: `node_${nodeId++}`,
        type: 'Sort',
        cost: sortRows * Math.log2(sortRows),
        rows: sortRows,
        time: sortRows * 0.02,
        children: [nodes[nodes.length - 1]?.id || ''],
        details: { sortKeys: parsed.orderByColumns.length }
      });
    }
    
    return nodes;
  }

  private analyzeExecutionPlan(
    nodes: QueryExecutionPlan['nodes'],
    complexity: number
  ): QueryExecutionPlan['analysis'] {
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];
    
    // Identify expensive operations
    const maxCost = Math.max(...nodes.map(n => n.cost));
    const expensiveNodes = nodes.filter(n => n.cost > maxCost * 0.5);
    
    expensiveNodes.forEach(node => {
      if (node.type === 'Scan' && node.cost > 1000) {
        bottlenecks.push('Expensive table scan');
        recommendations.push(`Add index on table ${node.table}`);
      }
      
      if (node.type === 'Join' && node.details?.joinType === 'nested_loop') {
        bottlenecks.push('Inefficient nested loop join');
        recommendations.push('Consider adding indexes on join columns');
      }
      
      if (node.type === 'Sort' && node.cost > 500) {
        bottlenecks.push('Expensive sort operation');
        recommendations.push('Add index on sort columns');
      }
    });
    
    // Check for missing indexes
    const scanNodes = nodes.filter(n => n.type === 'Scan');
    if (scanNodes.some(n => n.rows > 10000)) {
      bottlenecks.push('Missing index');
      recommendations.push('Create indexes on frequently queried columns');
    }
    
    // Determine overall complexity
    let complexityLevel: 'low' | 'medium' | 'high' = 'low';
    if (complexity > 10) {
      complexityLevel = 'high';
    } else if (complexity > 5) {
      complexityLevel = 'medium';
    }
    
    return {
      bottlenecks,
      recommendations,
      complexity: complexityLevel
    };
  }

  private generateIndexRecommendations(
    parsed: ReturnType<SQLQueryParser['parseQuery']>,
    _schema?: Record<string, any>
  ): QueryOptimizationResult['indexRecommendations'] {
    const recommendations: QueryOptimizationResult['indexRecommendations'] = [];
    
    parsed.tables.forEach(table => {
      // WHERE clause indexes
      parsed.whereColumns.forEach(column => {
        recommendations.push({
          table,
          columns: [column],
          type: 'btree',
          reason: 'Improve WHERE clause performance',
          priority: INDEX_RULES.WHERE_CLAUSE.priority
        });
      });
      
      // JOIN indexes
      parsed.joinColumns.forEach(column => {
        recommendations.push({
          table,
          columns: [column],
          type: 'btree',
          reason: 'Improve JOIN performance',
          priority: INDEX_RULES.JOIN_CLAUSE.priority
        });
      });
      
      // ORDER BY indexes
      if (parsed.orderByColumns.length > 0) {
        recommendations.push({
          table,
          columns: parsed.orderByColumns,
          type: 'btree',
          reason: 'Improve ORDER BY performance',
          priority: INDEX_RULES.ORDER_BY.priority
        });
      }
      
      // GROUP BY indexes
      if (parsed.groupByColumns.length > 0) {
        recommendations.push({
          table,
          columns: parsed.groupByColumns,
          type: 'btree',
          reason: 'Improve GROUP BY performance',
          priority: INDEX_RULES.GROUP_BY.priority
        });
      }
    });
    
    return recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10); // Limit to top 10 recommendations
  }

  private calculateEstimatedImprovement(
    optimizations: QueryOptimizationResult['optimizations'],
    complexity: number,
    indexRecommendations: QueryOptimizationResult['indexRecommendations']
  ): QueryOptimizationResult['estimatedImprovement'] {
    let executionTimeImprovement = 0;
    let memoryUsageImprovement = 0;
    let ioReduction = 0;
    
    // Calculate improvement from optimizations
    optimizations.forEach(opt => {
      switch (opt.impact) {
        case 'high':
          executionTimeImprovement += 0.3;
          memoryUsageImprovement += 0.2;
          ioReduction += 0.4;
          break;
        case 'medium':
          executionTimeImprovement += 0.15;
          memoryUsageImprovement += 0.1;
          ioReduction += 0.2;
          break;
        case 'low':
          executionTimeImprovement += 0.05;
          memoryUsageImprovement += 0.05;
          ioReduction += 0.1;
          break;
      }
    });
    
    // Calculate improvement from indexes
    const highPriorityIndexes = indexRecommendations.filter(idx => idx.priority >= 8).length;
    executionTimeImprovement += highPriorityIndexes * 0.4;
    ioReduction += highPriorityIndexes * 0.6;
    
    // Apply complexity factor
    const complexityFactor = Math.min(1, complexity / 10);
    
    return {
      executionTime: Math.min(0.8, executionTimeImprovement * complexityFactor),
      memoryUsage: Math.min(0.6, memoryUsageImprovement * complexityFactor),
      ioOperations: Math.min(0.9, ioReduction * complexityFactor)
    };
  }

  private calculateOptimizationConfidence(
    optimizations: QueryOptimizationResult['optimizations'],
    indexRecommendations: QueryOptimizationResult['indexRecommendations']
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on number of high-impact optimizations
    const highImpactOpts = optimizations.filter(opt => opt.impact === 'high').length;
    confidence += highImpactOpts * 0.15;
    
    // Increase confidence based on index recommendations
    const highPriorityIndexes = indexRecommendations.filter(idx => idx.priority >= 8).length;
    confidence += highPriorityIndexes * 0.1;
    
    // Decrease confidence if too many optimizations (might be over-optimizing)
    if (optimizations.length > 5) {
      confidence -= 0.1;
    }
    
    return Math.min(0.95, Math.max(0.1, confidence));
  }
}

/**
 * Factory function for creating query optimizer instances
 */
export function createQueryOptimizer(): IQueryOptimizer {
  return new QueryOptimizer();
}

/**
 * Query performance analyzer utility
 */
export class QueryPerformanceAnalyzer {
  private optimizer: IQueryOptimizer;
  private performanceHistory: Map<string, number[]>;

  constructor() {
    this.optimizer = createQueryOptimizer();
    this.performanceHistory = new Map();
  }

  /**
   * Analyze query performance trends
   */
  analyzePerformanceTrends(query: string): {
    trend: 'improving' | 'degrading' | 'stable';
    averageTime: number;
    variance: number;
    samples: number;
  } {
    const history = this.performanceHistory.get(query) || [];
    
    if (history.length < 3) {
      return {
        trend: 'stable',
        averageTime: history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 0,
        variance: 0,
        samples: history.length
      };
    }
    
    // Calculate trend
    const recentHalf = history.slice(-Math.floor(history.length / 2));
    const olderHalf = history.slice(0, Math.floor(history.length / 2));
    
    const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((a, b) => a + b, 0) / olderHalf.length;
    
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    const threshold = 0.1; // 10% threshold
    
    if (recentAvg < olderAvg * (1 - threshold)) {
      trend = 'improving';
    } else if (recentAvg > olderAvg * (1 + threshold)) {
      trend = 'degrading';
    }
    
    // Calculate statistics
    const averageTime = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / history.length;
    
    return {
      trend,
      averageTime,
      variance,
      samples: history.length
    };
  }

  /**
   * Record query performance
   */
  recordPerformance(query: string, executionTime: number): void {
    if (!this.performanceHistory.has(query)) {
      this.performanceHistory.set(query, []);
    }
    
    const history = this.performanceHistory.get(query)!;
    history.push(executionTime);
    
    // Keep only last 100 samples
    if (history.length > 100) {
      history.shift();
    }
    
    // Update optimizer
    (this.optimizer as QueryOptimizer).recordQueryExecution(query, executionTime);
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(query: string): Array<{
    type: 'optimization' | 'monitoring' | 'alerting';
    description: string;
    priority: number;
  }> {
    const recommendations: Array<{
      type: 'optimization' | 'monitoring' | 'alerting';
      description: string;
      priority: number;
    }> = [];
    
    const trend = this.analyzePerformanceTrends(query);
    const optimization = this.optimizer.optimizeQuery(query);
    
    // Performance trend recommendations
    if (trend.trend === 'degrading') {
      recommendations.push({
        type: 'alerting',
        description: 'Query performance is degrading over time',
        priority: 8
      });
    }
    
    if (trend.variance > trend.averageTime * 0.5) {
      recommendations.push({
        type: 'monitoring',
        description: 'Query performance is highly variable',
        priority: 6
      });
    }
    
    // Optimization recommendations
    if (optimization.confidence > 0.7) {
      recommendations.push({
        type: 'optimization',
        description: 'High-confidence optimizations available',
        priority: 9
      });
    }
    
    return recommendations.sort((a, b) => b.priority - a.priority);
  }
}

/**
 * Utility functions for query analysis
 */
export function normalizeQuery(query: string): string {
  return query
    .replace(/\s+/g, ' ')
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()
    .toLowerCase();
}

export function hashQuery(query: string): string {
  const normalized = normalizeQuery(query);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}