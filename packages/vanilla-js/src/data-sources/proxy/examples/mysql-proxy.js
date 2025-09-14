/**
 * MySQL-specific SQL Proxy Implementation
 * Extends the base proxy service with MySQL-specific optimizations
 */

const mysql = require("mysql2/promise");

class MySQLProxy {
  constructor(config) {
    this.config = {
      host: config.host || "localhost",
      port: config.port || 3306,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl || false,
      connectionLimit: config.connectionLimit || 20,
      acquireTimeout: config.acquireTimeout || 60000,
      timeout: config.timeout || 60000,
      ...config,
    };

    this.pool = null;
  }

  async initialize() {
    this.pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl,
      connectionLimit: this.config.connectionLimit,
      acquireTimeout: this.config.acquireTimeout,
      timeout: this.config.timeout,
      multipleStatements: false, // Security: prevent multiple statements
      supportBigNumbers: true,
      bigNumberStrings: true,
    });

    // Test connection
    const connection = await this.pool.getConnection();
    await connection.ping();
    connection.release();

    console.log("✅ MySQL connection pool initialized");
  }

  async buildSearchQuery({
    query,
    table,
    fields,
    limit,
    offset,
    filters,
    sort,
  }) {
    const params = [];

    // Build search conditions using FULLTEXT if available, otherwise LIKE
    const searchConditions = await this.buildSearchConditions(
      table,
      fields,
      query,
      params,
    );

    let sql = `SELECT ${fields.map((f) => `\`${f}\``).join(", ")} FROM \`${table}\``;

    // Add WHERE clause
    const whereConditions = [searchConditions];

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      whereConditions.push(`\`${key}\` = ?`);
      params.push(value);
    });

    sql += ` WHERE ${whereConditions.join(" AND ")}`;

    // Add sorting
    if (sort && sort.field) {
      const direction = sort.direction === "desc" ? "DESC" : "ASC";
      sql += ` ORDER BY \`${sort.field}\` ${direction}`;
    } else {
      // Use MATCH relevance scoring if available
      sql += ` ORDER BY ${fields[0]} ASC`;
    }

    // Add pagination
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return { sql, params };
  }

  async buildSearchConditions(table, fields, query, params) {
    // Check if table has FULLTEXT indexes
    const fulltextFields = await this.getFulltextFields(table, fields);

    if (fulltextFields.length > 0) {
      // Use FULLTEXT search for better performance and relevance
      params.push(query);
      return `MATCH(${fulltextFields.map((f) => `\`${f}\``).join(", ")}) AGAINST(? IN NATURAL LANGUAGE MODE)`;
    } else {
      // Fallback to LIKE searches
      const conditions = fields.map((field) => {
        params.push(`%${query}%`);
        return `\`${field}\` LIKE ?`;
      });
      return `(${conditions.join(" OR ")})`;
    }
  }

  async getFulltextFields(table, fields) {
    const [rows] = await this.pool.execute(`
      SHOW INDEX FROM \`${table}\` 
      WHERE Index_type = 'FULLTEXT'
    `);

    const fulltextIndexes = new Set();
    rows.forEach((row) => fulltextIndexes.add(row.Column_name));

    return fields.filter((field) => fulltextIndexes.has(field));
  }

  async buildCountQuery({ query, table, fields, filters }) {
    const params = [];

    const searchConditions = await this.buildSearchConditions(
      table,
      fields,
      query,
      params,
    );

    let sql = `SELECT COUNT(*) as count FROM \`${table}\``;

    const whereConditions = [searchConditions];

    Object.entries(filters).forEach(([key, value]) => {
      whereConditions.push(`\`${key}\` = ?`);
      params.push(value);
    });

    sql += ` WHERE ${whereConditions.join(" AND ")}`;

    return { sql, params };
  }

  async executeQuery(sql, params = []) {
    const [rows] = await this.pool.execute(sql, params);
    return { rows };
  }

  async getConnectionPoolStatus() {
    return {
      total: this.pool._allConnections.length,
      active: this.pool._activeConnections.length,
      idle: this.pool._freeConnections.length,
    };
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log("📊 MySQL connection pool closed");
    }
  }

  // MySQL-specific optimizations
  async createFulltextIndexes(table, fields) {
    const indexName = `ft_${table}_${fields.join("_")}`;
    const sql = `
      CREATE FULLTEXT INDEX \`${indexName}\` 
      ON \`${table}\` (${fields.map((f) => `\`${f}\``).join(", ")})
    `;

    try {
      await this.pool.execute(sql);
      console.log(`✅ Created FULLTEXT index: ${indexName}`);
    } catch (error) {
      if (error.code !== "ER_DUP_KEYNAME") {
        throw error;
      }
      console.log(`ℹ️ FULLTEXT index already exists: ${indexName}`);
    }
  }

  async optimizeTable(table) {
    await this.pool.execute(`OPTIMIZE TABLE \`${table}\``);
    console.log(`✅ Optimized table: ${table}`);
  }

  async getTableStats(table) {
    const [rows] = await this.pool.execute(
      `
      SELECT 
        table_rows,
        data_length,
        index_length,
        (data_length + index_length) as total_size
      FROM information_schema.TABLES 
      WHERE table_schema = DATABASE() AND table_name = ?
    `,
      [table],
    );

    return rows[0] || null;
  }
}

module.exports = MySQLProxy;
