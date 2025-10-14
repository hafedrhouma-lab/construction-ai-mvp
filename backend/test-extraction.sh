#!/bin/bash
# test-extraction.sh
# Script to test the extraction API

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001/api/v1"

echo -e "${BLUE}🧪 QuickBids Extraction API Tests${NC}\n"

# ============================================
# TEST 1: Get Files
# ============================================
echo -e "${BLUE}📋 Test 1: Get Files${NC}"
echo "GET $API_URL/files"

FILES_RESPONSE=$(curl -s "$API_URL/files")
echo "$FILES_RESPONSE" | jq '.'

# Extract first file ID for testing
FILE_ID=$(echo "$FILES_RESPONSE" | jq -r '.[0].id')

if [ "$FILE_ID" == "null" ] || [ -z "$FILE_ID" ]; then
  echo -e "${RED}❌ No files found. Upload a file first!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found file: $FILE_ID${NC}\n"

# ============================================
# TEST 2: Start Extraction
# ============================================
echo -e "${BLUE}📋 Test 2: Start Extraction (Page 1)${NC}"
echo "POST $API_URL/extractions/start"

EXTRACTION_RESPONSE=$(curl -s -X POST "$API_URL/extractions/start" \
  -H "Content-Type: application/json" \
  -d "{\"file_id\": \"$FILE_ID\", \"page_number\": 1}")

echo "$EXTRACTION_RESPONSE" | jq '.'

EXTRACTION_ID=$(echo "$EXTRACTION_RESPONSE" | jq -r '.extraction_id')

if [ "$EXTRACTION_ID" == "null" ] || [ -z "$EXTRACTION_ID" ]; then
  echo -e "${RED}❌ Extraction failed to start!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Extraction started: $EXTRACTION_ID${NC}"
echo -e "${BLUE}⏳ Waiting 15 seconds for AI processing...${NC}\n"
sleep 15

# ============================================
# TEST 3: Check Extraction Status
# ============================================
echo -e "${BLUE}📋 Test 3: Get Extraction Results${NC}"
echo "GET $API_URL/extractions/$EXTRACTION_ID"

EXTRACTION_DATA=$(curl -s "$API_URL/extractions/$EXTRACTION_ID")
echo "$EXTRACTION_DATA" | jq '.'

STATUS=$(echo "$EXTRACTION_DATA" | jq -r '.status')
ITEMS_COUNT=$(echo "$EXTRACTION_DATA" | jq -r '.line_items | length')

if [ "$STATUS" == "completed" ]; then
  echo -e "${GREEN}✅ Extraction completed: $ITEMS_COUNT line items found${NC}\n"
else
  echo -e "${RED}⚠️  Extraction status: $STATUS${NC}\n"
fi

# Get first line item ID for editing test
LINE_ITEM_ID=$(echo "$EXTRACTION_DATA" | jq -r '.line_items[0].id')

# ============================================
# TEST 4: Edit Line Item
# ============================================
if [ "$LINE_ITEM_ID" != "null" ] && [ -n "$LINE_ITEM_ID" ]; then
  echo -e "${BLUE}📋 Test 4: Edit Line Item${NC}"
  echo "PUT $API_URL/line-items/$LINE_ITEM_ID"

  EDIT_RESPONSE=$(curl -s -X PUT "$API_URL/line-items/$LINE_ITEM_ID" \
    -H "Content-Type: application/json" \
    -d '{"quantity": 9999, "description": "EDITED BY TEST SCRIPT"}')

  echo "$EDIT_RESPONSE" | jq '.'

  WAS_EDITED=$(echo "$EDIT_RESPONSE" | jq -r '.was_edited')

  if [ "$WAS_EDITED" == "true" ]; then
    echo -e "${GREEN}✅ Line item edited successfully${NC}\n"
  else
    echo -e "${RED}❌ Line item edit failed${NC}\n"
  fi
fi

# ============================================
# TEST 5: Add New Line Item
# ============================================
echo -e "${BLUE}📋 Test 5: Add New Line Item${NC}"
echo "POST $API_URL/line-items"

ADD_RESPONSE=$(curl -s -X POST "$API_URL/line-items" \
  -H "Content-Type: application/json" \
  -d "{
    \"extraction_id\": \"$EXTRACTION_ID\",
    \"description\": \"Manual test item\",
    \"quantity\": 100,
    \"unit\": \"each\",
    \"unit_price\": 50.00,
    \"total_price\": 5000.00
  }")

echo "$ADD_RESPONSE" | jq '.'

NEW_ITEM_ID=$(echo "$ADD_RESPONSE" | jq -r '.id')

if [ "$NEW_ITEM_ID" != "null" ] && [ -n "$NEW_ITEM_ID" ]; then
  echo -e "${GREEN}✅ Line item added: $NEW_ITEM_ID${NC}\n"
else
  echo -e "${RED}❌ Failed to add line item${NC}\n"
fi

# ============================================
# TEST 6: Generate Estimate
# ============================================
echo -e "${BLUE}📋 Test 6: Generate Estimate${NC}"
echo "POST $API_URL/estimates/generate"

ESTIMATE_RESPONSE=$(curl -s -X POST "$API_URL/estimates/generate" \
  -H "Content-Type: application/json" \
  -d "{\"file_id\": \"$FILE_ID\"}")

echo "$ESTIMATE_RESPONSE" | jq '.'

ESTIMATE_ID=$(echo "$ESTIMATE_RESPONSE" | jq -r '.estimate.id')
TOTAL=$(echo "$ESTIMATE_RESPONSE" | jq -r '.summary.total')
AI_COUNT=$(echo "$ESTIMATE_RESPONSE" | jq -r '.summary.ai_items_count')
HUMAN_EDITS=$(echo "$ESTIMATE_RESPONSE" | jq -r '.summary.human_edits_count')

if [ "$ESTIMATE_ID" != "null" ] && [ -n "$ESTIMATE_ID" ]; then
  echo -e "${GREEN}✅ Estimate generated: $ESTIMATE_ID${NC}"
  echo -e "${GREEN}   Total: \$$TOTAL${NC}"
  echo -e "${GREEN}   AI Items: $AI_COUNT${NC}"
  echo -e "${GREEN}   Human Edits: $HUMAN_EDITS${NC}\n"
else
  echo -e "${RED}❌ Estimate generation failed${NC}\n"
fi

# ============================================
# SUMMARY
# ============================================
echo -e "${BLUE}📊 Test Summary${NC}"
echo "File ID: $FILE_ID"
echo "Extraction ID: $EXTRACTION_ID"
echo "Estimate ID: $ESTIMATE_ID"
echo -e "${GREEN}✅ All tests completed!${NC}"