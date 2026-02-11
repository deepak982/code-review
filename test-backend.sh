#!/bin/bash

echo "🔍 Testing Backend API..."
echo "========================="

# Test 1: Health Check
echo ""
echo "1️⃣ Testing Health Endpoint..."
curl -s http://localhost:3000/health | jq '.' || echo "❌ Health check failed"

# Test 2: Model Status
echo ""
echo "2️⃣ Testing Model Status..."
curl -s http://localhost:3000/api/status | jq '.' || echo "❌ Status check failed"

# Test 3: Register (will fail if user exists, that's ok)
echo ""
echo "3️⃣ Testing Register Endpoint..."
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "full_name": "Test User"
  }' | jq '.' || echo "⚠️ Register failed (user might already exist)"

# Test 4: Login
echo ""
echo "4️⃣ Testing Login Endpoint..."
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123" | jq '.'

echo ""
echo "========================="
echo "✅ Backend tests complete!"
