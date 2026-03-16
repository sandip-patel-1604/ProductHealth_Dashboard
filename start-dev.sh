#!/bin/bash
set -e

docker compose up --build -d

echo ""
echo "========================================"
echo "ProductHealth Dashboard is running!"
echo "========================================"
echo "Dashboard URL: http://localhost:5173"
echo "========================================"
echo ""
