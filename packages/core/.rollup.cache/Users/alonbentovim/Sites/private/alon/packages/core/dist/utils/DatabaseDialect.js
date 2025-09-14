/**
 * Database Dialect Handler - Manages database-specific SQL syntax
 * @description Provides database-specific query syntax, features, and optimizations
 */
import { ValidationError } from './validation';
/**
 * Database dialect configurations
 */
const DIALECT_CONFIGS = {
    postgresql: {
        type: 'postgresql',
        features: {
            supportsLimitOffset: true,
            supportsWindowFunctions: true,
            supportsCTE: true,
            supportsJSON: true,
            supportsFullTextSearch: true
        },
        syntax: {
            parameterPlaceholder: '$1',
            identifierQuote: '"',
            stringQuote: "'",
            limitSyntax: 'LIMIT_OFFSET'
        }
    },
    mysql: {
        type: 'mysql',
        features: {
            supportsLimitOffset: true,
            supportsWindowFunctions: true, // MySQL 8.0+
            supportsCTE: true, // MySQL 8.0+
            supportsJSON: true, // MySQL 5.7+
            supportsFullTextSearch: true
        },
        syntax: {
            parameterPlaceholder: '?',
            identifierQuote: '`',
            stringQuote: "'",
            limitSyntax: 'LIMIT_OFFSET'
        }
    },
    sqlite: {
        type: 'sqlite',
        features: {
            supportsLimitOffset: true,
            supportsWindowFunctions: true, // SQLite 3.25+
            supportsCTE: true, // SQLite 3.8.3+
            supportsJSON: true, // SQLite 3.38+
            supportsFullTextSearch: true // With FTS extension
        },
        syntax: {
            parameterPlaceholder: '?',
            identifierQuote: '"',
            stringQuote: "'",
            limitSyntax: 'LIMIT_OFFSET'
        }
    }
};
/**
 * Database dialect handler for SQL generation
 */
export class DatabaseDialect {
    constructor(databaseType, version) {
        this.config = { ...DIALECT_CONFIGS[databaseType] };
        if (version) {
            this.config.version = version;
            this.adjustFeaturesForVersion(version);
        }
    }
    /**
     * Get dialect configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Quote an identifier (table, column name)
     */
    quoteIdentifier(identifier) {
        if (!identifier || typeof identifier !== 'string') {
            throw new ValidationError('Identifier must be a non-empty string');
        }
        // Remove any existing quotes
        const clean = identifier.replace(/["`']/g, '');
        // Validate identifier format
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(clean)) {
            throw new ValidationError(`Invalid identifier format: ${identifier}`);
        }
        const quote = this.config.syntax.identifierQuote;
        return `${quote}${clean}${quote}`;
    }
    /**
     * Create parameter placeholder for parameterized queries
     */
    createParameterPlaceholder(index) {
        switch (this.config.type) {
            case 'postgresql':
                return `$${index + 1}`;
            case 'mysql':
            case 'sqlite':
                return '?';
            default:
                throw new ValidationError(`Unsupported database type: ${this.config.type}`);
        }
    }
    /**
     * Build LIMIT clause with optional OFFSET
     */
    buildLimitClause(limit, offset) {
        if (!this.config.features.supportsLimitOffset) {
            throw new ValidationError(`Database ${this.config.type} does not support LIMIT/OFFSET`);
        }
        if (limit <= 0 || !Number.isInteger(limit)) {
            throw new ValidationError('Limit must be a positive integer');
        }
        if (offset !== undefined && (offset < 0 || !Number.isInteger(offset))) {
            throw new ValidationError('Offset must be a non-negative integer');
        }
        let clause = `LIMIT ${limit}`;
        if (offset !== undefined && offset > 0) {
            clause += ` OFFSET ${offset}`;
        }
        return clause;
    }
    /**
     * Build ORDER BY clause
     */
    buildOrderByClause(orderBy) {
        if (!orderBy || orderBy.length === 0) {
            return '';
        }
        const clauses = orderBy.map(order => {
            const column = this.quoteIdentifier(order.column);
            const direction = order.direction === 'DESC' ? 'DESC' : 'ASC';
            return `${column} ${direction}`;
        });
        return `ORDER BY ${clauses.join(', ')}`;
    }
    /**
     * Build WHERE clause with search conditions
     */
    buildSearchWhereClause(searchColumns, searchTerm, caseSensitive = false) {
        if (!searchColumns || searchColumns.length === 0) {
            throw new ValidationError('Search columns cannot be empty');
        }
        if (!searchTerm || typeof searchTerm !== 'string') {
            return { clause: '', parameters: [] };
        }
        const quotedColumns = searchColumns.map(col => this.quoteIdentifier(col));
        const searchValue = `%${searchTerm}%`;
        let conditions;
        let parameters;
        if (this.config.features.supportsFullTextSearch && this.shouldUseFullTextSearch(searchTerm)) {
            // Use full-text search for complex queries
            conditions = quotedColumns.map((col, index) => this.buildFullTextSearchCondition(col, index));
            parameters = searchColumns.map(() => searchTerm);
        }
        else {
            // Use LIKE-based search
            if (caseSensitive) {
                conditions = quotedColumns.map((col, index) => `${col} LIKE ${this.createParameterPlaceholder(index)}`);
            }
            else {
                conditions = quotedColumns.map((col, index) => this.buildCaseInsensitiveLike(col, index));
            }
            parameters = searchColumns.map(() => searchValue);
        }
        const clause = conditions.length > 1
            ? `(${conditions.join(' OR ')})`
            : conditions[0];
        return { clause, parameters };
    }
    /**
     * Build JOIN clauses
     */
    buildJoinClauses(joinTables) {
        if (!joinTables || joinTables.length === 0) {
            return '';
        }
        return joinTables.map(join => {
            const table = this.quoteIdentifier(join.table);
            return `${join.type} JOIN ${table} ON ${join.condition}`;
        }).join(' ');
    }
    /**
     * Build GROUP BY clause
     */
    buildGroupByClause(groupBy) {
        if (!groupBy || groupBy.length === 0) {
            return '';
        }
        const quotedColumns = groupBy.map(col => this.quoteIdentifier(col));
        return `GROUP BY ${quotedColumns.join(', ')}`;
    }
    /**
     * Validate connection string format
     */
    validateConnectionString(connectionString) {
        if (!connectionString || typeof connectionString !== 'string') {
            return false;
        }
        // Basic connection string validation patterns
        const patterns = {
            postgresql: /^postgresql:\/\/|^postgres:\/\//,
            mysql: /^mysql:\/\/|^mysql2:\/\//,
            sqlite: /^sqlite:|\.db$|\.sqlite$|\.sqlite3$/
        };
        const pattern = patterns[this.config.type];
        return pattern ? pattern.test(connectionString.toLowerCase()) : false;
    }
    /**
     * Sanitize connection string for logging
     */
    sanitizeConnectionString(connectionString) {
        if (!connectionString) {
            return '';
        }
        // Remove credentials from connection string for safe logging
        return connectionString
            .replace(/:\/\/[^@]*@/g, '://***:***@')
            .replace(/password=[^;&\s]*/gi, 'password=***')
            .replace(/pwd=[^;&\s]*/gi, 'pwd=***');
    }
    /**
     * Get database-specific data types
     */
    getDataTypeMapping() {
        const commonTypes = {
            string: 'VARCHAR',
            number: 'NUMERIC',
            boolean: 'BOOLEAN',
            date: 'TIMESTAMP',
            json: 'JSON'
        };
        switch (this.config.type) {
            case 'postgresql':
                return {
                    ...commonTypes,
                    text: 'TEXT',
                    uuid: 'UUID',
                    json: 'JSONB'
                };
            case 'mysql':
                return {
                    ...commonTypes,
                    text: 'TEXT',
                    json: 'JSON',
                    timestamp: 'TIMESTAMP'
                };
            case 'sqlite':
                return {
                    string: 'TEXT',
                    number: 'REAL',
                    boolean: 'INTEGER',
                    date: 'TEXT',
                    json: 'TEXT'
                };
            default:
                return commonTypes;
        }
    }
    /**
     * Check if database supports a specific feature
     */
    supportsFeature(feature) {
        return this.config.features[feature];
    }
    /**
     * Adjust features based on database version
     */
    adjustFeaturesForVersion(version) {
        const majorVersion = parseInt(version.split('.')[0], 10);
        switch (this.config.type) {
            case 'mysql':
                if (majorVersion < 8) {
                    this.config.features.supportsWindowFunctions = false;
                    this.config.features.supportsCTE = false;
                }
                if (majorVersion < 5) {
                    this.config.features.supportsJSON = false;
                }
                break;
            case 'sqlite':
                // SQLite version checking would need more complex logic
                // For now, assume modern version
                break;
            case 'postgresql':
                // PostgreSQL has good backward compatibility
                break;
        }
    }
    /**
     * Determine if full-text search should be used
     */
    shouldUseFullTextSearch(searchTerm) {
        // Use FTS for complex terms with multiple words
        return searchTerm.trim().split(/\s+/).length > 1;
    }
    /**
     * Build full-text search condition
     */
    buildFullTextSearchCondition(column, paramIndex) {
        const placeholder = this.createParameterPlaceholder(paramIndex);
        switch (this.config.type) {
            case 'postgresql':
                return `to_tsvector(${column}) @@ plainto_tsquery(${placeholder})`;
            case 'mysql':
                return `MATCH(${column}) AGAINST(${placeholder} IN NATURAL LANGUAGE MODE)`;
            case 'sqlite':
                // Assumes FTS table exists
                return `${column} MATCH ${placeholder}`;
            default:
                return `${column} LIKE ${placeholder}`;
        }
    }
    /**
     * Build case-insensitive LIKE condition
     */
    buildCaseInsensitiveLike(column, paramIndex) {
        const placeholder = this.createParameterPlaceholder(paramIndex);
        switch (this.config.type) {
            case 'postgresql':
                return `${column} ILIKE ${placeholder}`;
            case 'mysql':
                return `${column} LIKE ${placeholder}`;
            case 'sqlite':
                return `${column} LIKE ${placeholder}`;
            default:
                return `LOWER(${column}) LIKE LOWER(${placeholder})`;
        }
    }
}
/**
 * Database dialect factory
 */
export class DatabaseDialectFactory {
    /**
     * Get or create database dialect instance
     */
    static getDialect(databaseType, version) {
        const key = `${databaseType}-${version || 'default'}`;
        if (!this.dialects.has(key)) {
            this.dialects.set(key, new DatabaseDialect(databaseType, version));
        }
        return this.dialects.get(key);
    }
    /**
     * Clear dialect cache
     */
    static clearCache() {
        this.dialects.clear();
    }
}
DatabaseDialectFactory.dialects = new Map();
/**
 * Global dialect factory instance
 */
export const dialectFactory = DatabaseDialectFactory;
//# sourceMappingURL=DatabaseDialect.js.map