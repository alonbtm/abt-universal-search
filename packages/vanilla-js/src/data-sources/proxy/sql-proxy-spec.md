# SQL Proxy Service API Specification

## Overview

The SQL Proxy Service provides a secure bridge between the Universal Search client-side JavaScript library and database servers. It handles SQL query construction, connection pooling, security validation, and result formatting.

## Architecture

```
┌─────────────────┐    HTTPS    ┌─────────────────┐    SQL    ┌─────────────────┐
│   Client-Side   │ ──────────► │   Proxy Service │ ────────► │    Database     │
│  UniversalSearch│             │   (Node.js)     │           │  (MySQL/PG/etc) │
└─────────────────┘             └─────────────────┘           └─────────────────┘
```

## Security Model

- **No direct database credentials** exposed to client
- **Parameterized queries only** - prevents SQL injection
- **Whitelist of allowed operations** (SELECT, SEARCH only by default)
- **Input sanitization** and validation on all parameters
- **Rate limiting** and request throttling
- **Connection pooling** with secure credential management

## API Endpoints

### Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "connectionPool": {
    "active": 2,
    "idle": 8,
    "total": 10
  },
  "timestamp": "2025-09-14T10:30:00.000Z"
}
```

### Search

**Endpoint**: `POST /search`

**Request Body**:
```json
{
  "query": "search term",
  "table": "products",
  "fields": ["name", "description", "category"],
  "limit": 20,
  "offset": 0,
  "filters": {
    "category": "electronics",
    "status": "active"
  },
  "sort": {
    "field": "name",
    "direction": "asc"
  }
}
```

**Response**:
```json
{
  "results": [
    {
      "id": 1,
      "title": "Product Name",
      "description": "Product description",
      "url": "/products/1",
      "metadata": {
        "category": "electronics",
        "price": 99.99,
        "status": "active"
      },
      "score": 95.5
    }
  ],
  "total": 42,
  "took": 35,
  "query": {
    "sql": "SELECT * FROM products WHERE (name ILIKE $1 OR description ILIKE $2) AND category = $3 LIMIT $4 OFFSET $5",
    "params": ["%search term%", "%search term%", "electronics", 20, 0]
  }
}
```

**Error Response**:
```json
{
  "error": "Invalid table name",
  "code": "INVALID_TABLE",
  "timestamp": "2025-09-14T10:30:00.000Z"
}
```

### Execute Raw SQL (Advanced)

**Endpoint**: `POST /execute`

**Request Body**:
```json
{
  "sql": "SELECT COUNT(*) as total FROM products WHERE category = $1",
  "params": ["electronics"]
}
```

**Response**:
```json
{
  "rows": [
    { "total": 42 }
  ],
  "took": 15,
  "rowCount": 1
}
```

## Security Constraints

### Allowed SQL Operations
- `SELECT` statements only by default
- `SEARCH` operations (implementation-specific)
- `COUNT` for statistics

### Blocked Operations
- `DROP`, `DELETE`, `UPDATE`, `INSERT`
- `ALTER`, `CREATE`, `TRUNCATE`
- `EXEC`, `EXECUTE`, stored procedures
- Multiple statements (semicolon separation)

### Input Validation
- Table names must be whitelisted
- Field names must be whitelisted
- Query length limits (default: 1000 characters)
- Parameter count limits (default: 50 parameters)

### Rate Limiting
- Default: 100 requests per minute per IP
- Configurable per deployment
- Exponential backoff on limit exceeded

## Configuration

### Environment Variables
```bash
# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=searchdb
DB_USER=search_user
DB_PASSWORD=secure_password
DB_SSL=true

# Connection Pool
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000

# Security
ALLOWED_TABLES=products,articles,users
ALLOWED_FIELDS=id,title,name,description,content,url,category
MAX_QUERY_LENGTH=1000
MAX_PARAMS=50
RATE_LIMIT_RPM=100

# Server
PORT=3001
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Table Configuration
```yaml
# config/tables.yml
products:
  searchFields:
    - name
    - description
    - category
  resultFields:
    - id
    - name
    - description
    - price
    - category
    - status
    - created_at
  filters:
    - category
    - status
    - price_range

articles:
  searchFields:
    - title
    - content
    - tags
  resultFields:
    - id
    - title
    - summary
    - content
    - author
    - published_at
  filters:
    - author
    - published_at
    - tags
```

## Implementation Examples

### Basic Usage
```javascript
// Client-side usage
const search = UniversalSearch.sql(
  'http://localhost:3001', // proxy URL
  'products', // table name
  '#search-container'
);

await search.search('wireless headphones');
```

### Advanced Configuration
```javascript
const search = new UniversalSearch({
  dataSource: {
    type: 'sql',
    proxyUrl: 'http://localhost:3001',
    options: {
      table: 'products',
      searchFields: ['name', 'description'],
      connection: {
        timeout: 10000,
        retries: 2
      },
      security: {
        sanitizeQueries: true,
        allowedOperations: ['SELECT']
      }
    }
  },
  ui: { container: '#search' }
});
```

## Proxy Service Implementation

See the reference implementation in:
- `reference-implementation/server.js` - Express.js server
- `reference-implementation/routes/` - API route handlers
- `reference-implementation/middleware/` - Security and validation middleware
- `examples/` - Database-specific proxy examples

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_TABLE` | Table name not in whitelist |
| `INVALID_FIELD` | Field name not allowed |
| `QUERY_TOO_LONG` | Query exceeds length limit |
| `TOO_MANY_PARAMS` | Parameter count exceeds limit |
| `RATE_LIMITED` | Request rate limit exceeded |
| `DB_CONNECTION` | Database connection failed |
| `DB_QUERY_ERROR` | SQL query execution failed |
| `INVALID_SQL` | SQL syntax or security violation |

## Performance Considerations

- Use connection pooling to minimize connection overhead
- Implement query result caching where appropriate
- Add database indexes on frequently searched fields
- Monitor query performance and set reasonable timeouts
- Use prepared statements for parameter binding

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  sql-proxy:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DB_HOST=db
      - DB_USER=search_user
      - DB_PASSWORD=secure_password
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: searchdb
      POSTGRES_USER: search_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Testing

### Health Check
```bash
curl -X GET http://localhost:3001/health
```

### Search Request
```bash
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test",
    "table": "products",
    "fields": ["name", "description"],
    "limit": 10
  }'
```

### Load Testing
```bash
# Using Apache Bench
ab -n 1000 -c 10 -p search.json -T application/json http://localhost:3001/search

# Using Artillery
artillery quick --count 100 --num 10 http://localhost:3001/search
```