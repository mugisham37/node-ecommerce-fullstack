#!/bin/bash
# Health check script for Docker containers

set -e

SERVICE_NAME=${1:-"unknown"}
HEALTH_ENDPOINT=${2:-"/health"}
PORT=${3:-"3000"}

echo "Running health check for $SERVICE_NAME on port $PORT"

# Check if the service is responding
if curl -f -s "http://localhost:$PORT$HEALTH_ENDPOINT" > /dev/null; then
    echo "$SERVICE_NAME is healthy"
    exit 0
else
    echo "$SERVICE_NAME is unhealthy"
    exit 1
fi