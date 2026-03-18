#!/bin/bash
set -e

docker compose up --build -d

echo ""
echo "========================================"
echo "  ProductHealth Dashboard is running!"
echo "========================================"
echo "  Dashboard:  http://localhost:5173"
echo "  API:        http://localhost:3000"
echo "  Database:   localhost:5433"
echo "========================================"
echo ""
echo "Health checks:"

# Dashboard
DASHBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ 2>/dev/null || echo "000")
if [ "$DASHBOARD_STATUS" = "200" ]; then
  echo "  [OK] Dashboard (5173)"
else
  echo "  [--] Dashboard (5173) — HTTP $DASHBOARD_STATUS (may still be starting)"
fi

# API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
  echo "  [OK] API health (3000)"
else
  echo "  [--] API health (3000) — HTTP $API_STATUS (may still be starting)"
fi

# Database (via docker exec)
if docker exec producthealth_dashboard-db-1 pg_isready -U ph_user -d product_health -q 2>/dev/null; then
  echo "  [OK] PostgreSQL (5433)"
else
  echo "  [--] PostgreSQL (5433) — not ready yet"
fi

echo ""
echo "Tip: run 'docker compose logs -f' to tail all service logs"
echo ""
