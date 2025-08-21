#!/bin/bash
set -e

# Docker entrypoint script for production deployments

echo "Starting ecommerce application..."

# Wait for database to be ready
echo "Waiting for database connection..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "Database is ready!"

# Wait for Redis to be ready
echo "Waiting for Redis connection..."
while ! nc -z redis 6379; do
  sleep 1
done
echo "Redis is ready!"

# Run database migrations
echo "Running database migrations..."
npm run db:migrate

# Seed initial data if needed
if [ "$SEED_DATA" = "true" ]; then
  echo "Seeding initial data..."
  npm run db:seed
fi

# Start the application
echo "Starting application..."
exec "$@"