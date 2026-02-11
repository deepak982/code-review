#!/bin/bash

echo "Starting databases..."
docker-compose up -d

echo "Waiting for databases to be ready..."
sleep 10

echo "Databases are running!"
echo ""
echo "PostgreSQL: localhost:5432"
echo "Qdrant: localhost:6333"
echo "Redis: localhost:6379"
echo ""
echo "To stop databases: docker-compose down"
echo "To view logs: docker-compose logs -f"
