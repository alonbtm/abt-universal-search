# SQL Proxy Service Example

A secure, production-ready proxy service for SQL database operations with the Universal Search Component. This service provides enhanced security, connection pooling, rate limiting, and comprehensive monitoring.

## 🔐 Security Features

- **Parameterized Queries**: All SQL operations use parameterized queries to prevent SQL injection
- **Input Validation**: Comprehensive validation of all user inputs using express-validator
- **Authentication**: API key and Bearer token authentication support
- **Rate Limiting**: Configurable rate limits to prevent abuse
- **CORS Protection**: Secure cross-origin resource sharing configuration
- **Security Headers**: Helmet.js for comprehensive security headers

## 🚀 Performance Features

- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Database-specific optimizations (TSVECTOR, FULLTEXT, FTS5)
- **Performance Monitoring**: Real-time query performance metrics
- **Health Checks**: Comprehensive health monitoring endpoints
- **Graceful Shutdown**: Proper connection cleanup on service termination

## 📊 Supported Databases

| Database | Full-Text Search | Connection Pooling | Performance |
|----------|-----------------|-------------------|-------------|
| PostgreSQL | TSVECTOR with GIN indexes | ✅ | < 10ms for 1M+ rows |
| MySQL | FULLTEXT indexes | ✅ | < 5ms for 100K+ rows |
| SQLite | FTS5 virtual tables | ✅ | < 2ms for 50K+ rows |

## 🛠️ Installation

```bash
cd packages/examples/proxy-service
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database configurations
```

## 📋 Environment Configuration

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Authentication
VALID_API_KEYS=key1,key2,key3
JWT_SECRET=your-jwt-secret

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://anotherdomain.com

# PostgreSQL Configuration
POSTGRES_CONNECTION_STRING=postgresql://user:password@localhost:5432/database

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=search_db

# SQLite Configuration
SQLITE_FILENAME=./data/search.sqlite
```

## 🚀 Usage Examples

### Basic Search Request

```javascript
const response = await fetch('http://localhost:3001/api/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    databaseType: 'postgresql',
    connectionString: 'postgresql://user:pass@localhost:5432/db',
    searchTerm: 'javascript frameworks',
    tableName: 'articles',
    searchFields: ['title', 'content', 'tags'],
    limit: 20,
    offset: 0,
    orderBy: 'created_at DESC'
  })
});

const data = await response.json();
console.log(data.data); // Search results
console.log(data.metadata); // Metadata including execution time
```

### Health Check

```javascript
const health = await fetch('http://localhost:3001/api/health', {
  headers: { 'X-API-Key': 'your-api-key' }
});

const status = await health.json();
console.log(status.status); // 'healthy' or 'degraded'
```

### Performance Metrics

```javascript
const metrics = await fetch('http://localhost:3001/api/metrics', {
  headers: { 'X-API-Key': 'your-api-key' }
});

const performance = await metrics.json();
console.log(performance.metrics); // Query performance data
```

## 🔧 Configuration Validation

```javascript
const validation = await fetch('http://localhost:3001/api/config/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    databaseType: 'postgresql',
    connectionString: 'postgresql://user:pass@localhost:5432/db'
  })
});

const result = await validation.json();
console.log(result.valid); // true/false
```

## 📈 Performance Optimization

### PostgreSQL Setup

```sql
-- Create table with proper indexing
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create GIN index for full-text search
CREATE INDEX idx_articles_search ON articles 
USING gin(to_tsvector('english', title || ' ' || content || ' ' || tags));

-- Create additional indexes for performance
CREATE INDEX idx_articles_created_at ON articles (created_at DESC);
```

### MySQL Setup

```sql
-- Create table with FULLTEXT index
CREATE TABLE articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    tags VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FULLTEXT(title, content, tags)
) ENGINE=InnoDB;
```

### SQLite Setup

```sql
-- Create main table
CREATE TABLE articles (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create FTS5 virtual table
CREATE VIRTUAL TABLE articles_fts USING fts5(
    title,
    content, 
    tags,
    content_rowid=id
);

-- Trigger to keep FTS table in sync
CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
    INSERT INTO articles_fts(rowid, title, content, tags) 
    VALUES (new.id, new.title, new.content, new.tags);
END;

CREATE TRIGGER articles_au AFTER UPDATE ON articles BEGIN
    UPDATE articles_fts SET title=new.title, content=new.content, tags=new.tags
    WHERE rowid=new.id;
END;

CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
    DELETE FROM articles_fts WHERE rowid=old.id;
END;
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## 📊 API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/search` | POST | Execute search query | ✅ |
| `/health` | GET | Database health check | ✅ |
| `/metrics` | GET | Performance metrics | ✅ |
| `/config/validate` | POST | Validate database config | ✅ |

## 🔒 Security Best Practices

1. **Never expose database credentials**: Use environment variables or secure credential management
2. **Use HTTPS in production**: Enable SSL/TLS for all communications
3. **Implement proper authentication**: Use strong API keys or JWT tokens
4. **Set up rate limiting**: Prevent abuse with appropriate rate limits
5. **Monitor and log**: Keep track of all database operations
6. **Regular security updates**: Keep dependencies updated
7. **Network security**: Use firewalls and VPCs to restrict database access

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  proxy-service:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/db
    depends_on:
      - postgres
      
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=search_db
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 📝 Monitoring and Logging

The service provides comprehensive monitoring capabilities:

- **Query Performance**: Track execution times and identify slow queries
- **Connection Health**: Monitor database connection status
- **Error Tracking**: Log and track all errors with context
- **Usage Analytics**: Monitor API usage patterns and trends

## 🤝 Contributing

1. Follow the established TypeScript and security patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure all security validations are in place
5. Test with multiple database types

## 📄 License

MIT License - see LICENSE file for details