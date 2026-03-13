#!/bin/bash
docker compose up --build -d
echo ""
echo "========================================"
echo "🌟 ProductHealth Dashboard is ready!"
echo "========================================"
echo "🌐 Dashboard URL:    http://localhost:5173"
echo "🔌 Backend API Docs: http://localhost:8080/docs"
echo "❤️ API Health Check: http://localhost:8080/api/health"
echo "========================================"
echo ""
