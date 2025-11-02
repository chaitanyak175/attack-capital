#!/bin/bash

# Strategy 3: Setup Python ML Service for HuggingFace AMD
# This script sets up the Dockerized Python FastAPI service

set -e

echo "🐍 Setting up Python ML Service for Strategy 3"
echo "=============================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Navigate to python service directory
cd "$(dirname "$0")/../python-service"

echo "📁 Current directory: $(pwd)"

# Check if required files exist
if [ ! -f "main.py" ]; then
    echo "❌ main.py not found. Please ensure the Python service files are in place."
    exit 1
fi

if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt not found."
    exit 1
fi

if [ ! -f "Dockerfile" ]; then
    echo "❌ Dockerfile not found."
    exit 1
fi

echo "✅ All required files found"

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t amd-python-service .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Docker build failed"
    exit 1
fi

# Stop existing container if running
echo "🛑 Stopping existing container (if any)..."
docker stop amd-python-service 2>/dev/null || true
docker rm amd-python-service 2>/dev/null || true

# Run the container
echo "🚀 Starting Python ML Service..."
docker run -d \
    --name amd-python-service \
    -p 8000:8000 \
    -e HF_CACHE_DIR=/app/models \
    -e LOG_LEVEL=INFO \
    -v "$(pwd)/models:/app/models" \
    amd-python-service

if [ $? -eq 0 ]; then
    echo "✅ Python service started successfully"
else
    echo "❌ Failed to start Python service"
    exit 1
fi

# Wait for service to be ready
echo "⏳ Waiting for service to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Service is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Service failed to start within 30 seconds"
        docker logs amd-python-service
        exit 1
    fi
    sleep 1
done

# Test the service
echo "🧪 Testing the service..."
health_response=$(curl -s http://localhost:8000/health)
echo "Health check response: $health_response"

model_info=$(curl -s http://localhost:8000/model-info 2>/dev/null || echo "Model not loaded yet")
echo "Model info: $model_info"

echo ""
echo "🎉 Python ML Service Setup Complete!"
echo "=================================="
echo "Service URL: http://localhost:8000"
echo "Health Check: http://localhost:8000/health"
echo "Model Info: http://localhost:8000/model-info"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file: PYTHON_SERVICE_URL=http://localhost:8000"
echo "2. Test Strategy 3 (HuggingFace) in your Next.js app"
echo "3. Monitor logs: docker logs -f amd-python-service"
echo ""
echo "🛑 To stop the service: docker stop amd-python-service"
echo "🔄 To restart: docker start amd-python-service"
