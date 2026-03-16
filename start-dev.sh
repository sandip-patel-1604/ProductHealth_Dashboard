#!/bin/bash
set -e

echo "Starting ProductHealth services..."
docker compose up --build -d

echo ""
echo "========================================"
echo "ProductHealth Dashboard is starting!"
echo "========================================"
echo "Dashboard URL:    http://localhost:5173"
echo "Backend API Docs: http://localhost:8080/docs"
echo "API Health Check: http://localhost:8080/api/health"
echo "========================================"
echo ""
echo "Tip: Run 'docker compose logs -f' to watch service startup."
echo "     The API will automatically retry until the database is ready."
echo ""
