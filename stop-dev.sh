#!/bin/bash

echo "🛑 Stopping all services..."

pkill -f "uvicorn llm_service:app" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "yarn dev" 2>/dev/null

lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "✅ All services stopped"
