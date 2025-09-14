#!/bin/sh
set -e

# Production Docker entrypoint script for Universal Search

echo "🚀 Starting Universal Search Production Container..."

# Environment validation
if [ -z "$NODE_ENV" ]; then
    echo "⚠️  NODE_ENV not set, defaulting to production"
    export NODE_ENV=production
fi

# Database migration check (if applicable)
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "🔄 Running database migrations..."
    npm run migrate:latest || {
        echo "❌ Migration failed"
        exit 1
    }
fi

# Cache warming (optional)
if [ "$WARM_CACHE" = "true" ]; then
    echo "🔥 Warming cache..."
    npm run cache:warm || echo "⚠️  Cache warming failed, continuing..."
fi

# Security validation
echo "🔒 Validating security configuration..."
if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET environment variable is required for production"
    exit 1
fi

# Health check before starting
echo "🏥 Performing pre-start health check..."
node dist/monitoring/health-check.js --pre-start || {
    echo "❌ Pre-start health check failed"
    exit 1
}

echo "✅ All checks passed, starting application..."

# Execute the main command
exec "$@"