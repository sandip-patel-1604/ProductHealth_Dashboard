#!/bin/bash
set -e

echo "Starting ProductHealth services..."
docker compose up --build -d

echo "Waiting for database to be healthy..."
docker compose wait db 2>/dev/null || \
  timeout 60 bash -c 'until docker compose exec -T db pg_isready -U ph_user -d product_health >/dev/null 2>&1; do sleep 2; done'

echo ""
echo "========================================"
echo "ProductHealth Dashboard is ready!"
echo "========================================"
echo "Dashboard URL:    http://localhost:5173"
echo "Backend API Docs: http://localhost:8080/docs"
echo "API Health Check: http://localhost:8080/api/health"
echo "========================================"
echo ""
