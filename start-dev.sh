#!/bin/bash

set -a
source .env
set +a

echo "🚀 Starting Code Review Chat Application"
echo "=========================================="
echo "Backend Port: ${BACKEND_PORT:-3000}"
echo "Ollama Model: ${OLLAMA_MODEL}"
echo "=========================================="

trap 'kill 0' EXIT

echo "📦 Starting Backend..."
cd backend
source env/bin/activate
python llm_service.py &
BACKEND_PID=$!

sleep 2

echo "🎨 Starting Frontend..."
cd ../frontend
yarn dev &
FRONTEND_PID=$!

echo ""
echo "✅ Application started!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:${BACKEND_PORT:-3000}"
echo "   API Docs: http://localhost:${BACKEND_PORT:-3000}/docs"
echo ""
echo "Press Ctrl+C to stop all services"

wait
