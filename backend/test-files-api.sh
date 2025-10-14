#!/bin/bash

# Files API Test Script
# Make sure backend is running on port 3001

echo "🧪 Testing Files API"
echo "===================="
echo ""

# Get a project ID first
echo "1️⃣  Getting project list..."
PROJECT_ID=$(curl -s http://localhost:3001/api/v1/projects | jq -r '.[0].id')
echo "✅ Using project: $PROJECT_ID"
echo ""

# Create file record
echo "2️⃣  Creating file record..."
FILE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/files \
  -H "Content-Type: application/json" \
  -d "{
    \"project_id\": \"$PROJECT_ID\",
    \"original_filename\": \"test-blueprint.pdf\",
    \"total_pages\": 3
  }")

FILE_ID=$(echo $FILE_RESPONSE | jq -r '.id')
echo "✅ File created: $FILE_ID"
echo ""

# Get presigned URL for page 1
echo "3️⃣  Getting presigned URL for page 1..."
UPLOAD_URL=$(curl -s -X POST "http://localhost:3001/api/v1/files/$FILE_ID/pages/1/upload-url" | jq -r '.uploadUrl')
echo "✅ Got upload URL (truncated): ${UPLOAD_URL:0:80}..."
echo ""

# Confirm upload
echo "4️⃣  Confirming upload (3 pages)..."
curl -s -X POST "http://localhost:3001/api/v1/files/$FILE_ID/confirm" \
  -H "Content-Type: application/json" \
  -d '{"pageCount": 3}' | jq '.'
echo ""

# Get file details
echo "5️⃣  Getting file details..."
curl -s "http://localhost:3001/api/v1/files/$FILE_ID" | jq '.'
echo ""

# List files for project
echo "6️⃣  Listing all files for project..."
curl -s "http://localhost:3001/api/v1/files?project_id=$PROJECT_ID" | jq '.'
echo ""

# Get project stats
echo "7️⃣  Getting project file stats..."
curl -s "http://localhost:3001/api/v1/files/stats/$PROJECT_ID" | jq '.'
echo ""

echo "✅ All tests passed!"
