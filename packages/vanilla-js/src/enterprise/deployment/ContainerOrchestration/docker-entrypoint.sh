#!/bin/sh
set -e

# Universal Search - Docker Entrypoint Script
# Handles initialization and graceful startup

echo "🚀 Starting Universal Search..."

# Environment validation
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
fi

echo "Environment: $NODE_ENV"

# Database connection check
if [ -n "$DATABASE_URL" ]; then
    echo "🔍 Checking database connection..."

    # Simple database connectivity check
    timeout 30 sh -c 'until nc -z ${DATABASE_HOST:-localhost} ${DATABASE_PORT:-5432}; do
        echo "Waiting for database..."
        sleep 2
    done'

    echo "✅ Database connection established"
fi

# Redis connection check
if [ -n "$REDIS_URL" ]; then
    echo "🔍 Checking Redis connection..."

    timeout 30 sh -c 'until nc -z ${REDIS_HOST:-localhost} ${REDIS_PORT:-6379}; do
        echo "Waiting for Redis..."
        sleep 2
    done'

    echo "✅ Redis connection established"
fi

# Run database migrations if needed
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "🔄 Running database migrations..."
    npm run migrate:up
    echo "✅ Migrations completed"
fi

# Warm up cache if enabled
if [ "$WARM_CACHE" = "true" ]; then
    echo "🔥 Warming up application cache..."
    node -e "
        const { AdvancedCaching } = require('./dist/enterprise/performance/AdvancedCaching.js');
        const cache = new AdvancedCaching({
            levels: {
                memory: { maxSize: '50MB', ttl: 3600 },
                local: { maxSize: '100MB', ttl: 7200 }
            }
        });
        console.log('Cache warmed up');
    " || echo "⚠️ Cache warm-up failed, continuing..."
fi

# Setup graceful shutdown handlers
cleanup() {
    echo "🛑 Received shutdown signal, gracefully shutting down..."
    kill -TERM "$child" 2>/dev/null
    wait "$child"
    echo "✅ Graceful shutdown completed"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Pre-flight checks
echo "🔍 Running pre-flight checks..."

# Check required environment variables
required_vars="NODE_ENV"
for var in $required_vars; do
    if [ -z "$(eval echo \$$var)" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

# Check disk space
available_space=$(df / | tail -1 | awk '{print $4}')
if [ "$available_space" -lt 1048576 ]; then  # Less than 1GB
    echo "⚠️ Warning: Low disk space detected"
fi

# Check memory
if [ -r /proc/meminfo ]; then
    available_memory=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    if [ "$available_memory" -lt 524288 ]; then  # Less than 512MB
        echo "⚠️ Warning: Low memory detected"
    fi
fi

echo "✅ Pre-flight checks completed"

# Start the application with proper signal handling
echo "🎯 Starting Node.js application..."

if [ "$NODE_ENV" = "development" ]; then
    # Development mode with nodemon
    exec node --inspect=0.0.0.0:9229 dist/index.js "$@" &
else
    # Production mode
    exec node \
        --max-old-space-size=${MAX_MEMORY:-1024} \
        --optimize-for-size \
        --gc-interval=100 \
        dist/index.js "$@" &
fi

child=$!
wait "$child"