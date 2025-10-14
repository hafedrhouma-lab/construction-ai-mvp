# 📖 QuickBids Extraction API Documentation

Complete guide to the extraction API endpoints for AI-powered line item extraction from construction PDFs.

---

## 🎯 Overview

The extraction system processes PDFs stored in S3, where each page is stored as `part-N.pdf`. The system:
1. Fetches the specific page from S3
2. Converts it to an image
3. Uses OpenAI Vision API to extract line items
4. Stores results in the database
5. Allows human review and editing

---

## 📊 Database Schema Reference

### Files Table
```sql
files:
  - id (UUID)              ← File identifier
  - s3_key (TEXT)          ← S3 path like "s3://bucket/project/document/"
  - page_count (INT)       ← Total number of pages (parts)
  - original_filename      ← Original upload name
  - file_type             ← "pdf", "video", etc.
```

### Extractions Table
```sql
extractions:
  - id (UUID)              ← Extraction identifier
  - file_id (FK)           ← References files.id
  - page_number (INT)      ← Which page was extracted (1-indexed)
  - status (TEXT)          ← "processing", "completed", "failed"
  - ai_provider (TEXT)     ← "openai", "claude", etc.
  - model_version (TEXT)   ← "gpt-4o", etc.
  - raw_response (JSONB)   ← Full AI response
  - extracted_items (JSONB) ← Parsed line items
  - confidence_score (FLOAT)
  - processing_time_ms (INT)
  - completed_at (TIMESTAMP)
```

### Line Items Table
```sql
line_items:
  - id (UUID)              ← Line item identifier
  - extraction_id (FK)     ← References extractions.id
  - line_number (INT)      ← Order on page
  - description (TEXT)     ← Item description
  - quantity (DECIMAL)     ← How many
  - unit (TEXT)           ← "sq ft", "cubic yard", etc.
  - unit_price (DECIMAL)   ← Price per unit
  - total_price (DECIMAL)  ← Total for this line
  - source (TEXT)         ← "ai" or "human"
  - was_edited (BOOLEAN)   ← Did human edit this?
  - confidence_score (FLOAT)
  - deleted_at (TIMESTAMP) ← Soft delete
```

---

## 🔌 API Endpoints

Base URL: `http://localhost:3001/api/v1`

---

### 1️⃣ Start Extraction

Extract line items from a specific page.

**Endpoint:** `POST /extractions/start`

**Request:**
```json
{
  "file_id": "abc-123-uuid",
  "page_number": 1
}
```

**Response (Immediate):**
```json
{
  "message": "Extraction started",
  "extraction_id": "xyz-789-uuid",
  "status": "processing"
}
```

**What Happens:**
1. Creates extraction record with status "processing"
2. Returns immediately
3. Background process:
   - Downloads `part-N.pdf` from S3
   - Converts to image
   - Calls OpenAI API
   - Parses response
   - Saves line items
   - Updates status to "completed"

**Processing Time:** 10-20 seconds

**Error Responses:**
```json
// Missing file_id
{
  "error": "file_id is required"
}

// File not found
{
  "error": "File not found"
}

// Invalid page number
{
  "error": "Invalid page number. Must be 1-166"
}

// Already extracted
{
  "message": "Already extracted",
  "extraction_id": "xyz-789",
  "status": "completed"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/v1/extractions/start \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "abc-123",
    "page_number": 1
  }'
```

---

### 2️⃣ Get Extraction Results

Get extraction details with all line items.

**Endpoint:** `GET /extractions/:id`

**Response:**
```json
{
  "id": "xyz-789-uuid",
  "file_id": "abc-123-uuid",
  "page_number": 1,
  "status": "completed",
  "ai_provider": "openai",
  "model_version": "gpt-4o",
  "confidence_score": 0.92,
  "processing_time_ms": 8234,
  "completed_at": "2024-01-15T10:30:00Z",
  "line_items": [
    {
      "id": "item-1-uuid",
      "line_number": 1,
      "description": "Asphalt paving, 2\" thick",
      "quantity": 1000,
      "unit": "sq ft",
      "unit_price": 5.50,
      "total_price": 5500.00,
      "was_edited": false,
      "source": "ai",
      "confidence_score": 0.95
    },
    {
      "id": "item-2-uuid",
      "line_number": 2,
      "description": "Concrete curb and gutter",
      "quantity": 200,
      "unit": "linear ft",
      "unit_price": 12.00,
      "total_price": 2400.00,
      "was_edited": false,
      "source": "ai",
      "confidence_score": 0.88
    }
  ]
}
```

**Status Values:**
- `"processing"` - Still extracting
- `"completed"` - Done, line items available
- `"failed"` - Error occurred

**cURL Example:**
```bash
curl http://localhost:3001/api/v1/extractions/xyz-789
```

---

### 3️⃣ Get All Extractions for File

Get all page extractions for a file.

**Endpoint:** `GET /extractions/file/:file_id`

**Response:**
```json
[
  {
    "id": "extraction-1",
    "file_id": "abc-123",
    "page_number": 1,
    "status": "completed",
    "items_count": 47
  },
  {
    "id": "extraction-2",
    "file_id": "abc-123",
    "page_number": 2,
    "status": "processing",
    "items_count": 0
  },
  {
    "id": "extraction-3",
    "file_id": "abc-123",
    "page_number": 3,
    "status": "completed",
    "items_count": 52
  }
]
```

**cURL Example:**
```bash
curl http://localhost:3001/api/v1/extractions/file/abc-123
```

---

### 4️⃣ Update Line Item

Edit a line item (human correction).

**Endpoint:** `PUT /line-items/:id`

**Request:**
```json
{
  "description": "Asphalt paving, 3\" thick (corrected)",
  "quantity": 1200,
  "unit_price": 6.00,
  "total_price": 7200.00
}
```

**Response:**
```json
{
  "id": "item-1-uuid",
  "extraction_id": "xyz-789",
  "line_number": 1,
  "description": "Asphalt paving, 3\" thick (corrected)",
  "quantity": 1200,
  "unit": "sq ft",
  "unit_price": 6.00,
  "total_price": 7200.00,
  "original_description": "Asphalt paving, 2\" thick",
  "original_quantity": 1000,
  "original_unit_price": 5.50,
  "original_total_price": 5500.00,
  "was_edited": true,
  "edited_at": "2024-01-15T11:00:00Z",
  "source": "ai"
}
```

**Notes:**
- Only send fields you want to update
- Original values are preserved
- `was_edited` is automatically set to `true`

**cURL Example:**
```bash
curl -X PUT http://localhost:3001/api/v1/line-items/item-1-uuid \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 1200,
    "total_price": 7200
  }'
```

---

### 5️⃣ Add Line Item

Add a new line item (human addition).

**Endpoint:** `POST /line-items`

**Request:**
```json
{
  "extraction_id": "xyz-789-uuid",
  "description": "Additional mobilization costs",
  "quantity": 1,
  "unit": "lump sum",
  "unit_price": 5000.00,
  "total_price": 5000.00
}
```

**Response:**
```json
{
  "id": "new-item-uuid",
  "extraction_id": "xyz-789-uuid",
  "line_number": 48,
  "description": "Additional mobilization costs",
  "quantity": 1,
  "unit": "lump sum",
  "unit_price": 5000.00,
  "total_price": 5000.00,
  "source": "human",
  "was_edited": false
}
```

**Notes:**
- `line_number` is automatically assigned (max + 1)
- `source` is set to `"human"`
- All fields are optional except `extraction_id`

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/v1/line-items \
  -H "Content-Type: application/json" \
  -d '{
    "extraction_id": "xyz-789",
    "description": "Additional work",
    "quantity": 100,
    "unit": "each",
    "unit_price": 50.00,
    "total_price": 5000.00
  }'
```

---

### 6️⃣ Delete Line Item

Soft delete a line item.

**Endpoint:** `DELETE /line-items/:id`

**Response:**
```json
{
  "message": "Line item deleted",
  "item": {
    "id": "item-1-uuid",
    "deleted_at": "2024-01-15T11:30:00Z"
  }
}
```

**Notes:**
- This is a soft delete (sets `deleted_at` timestamp)
- Item will not appear in extraction results
- Can be restored by setting `deleted_at` to NULL

**cURL Example:**
```bash
curl -X DELETE http://localhost:3001/api/v1/line-items/item-1-uuid
```

---

### 7️⃣ Generate Estimate

Generate final estimate from all extractions.

**Endpoint:** `POST /estimates/generate`

**Request:**
```json
{
  "file_id": "abc-123-uuid"
}
```

**Response:**
```json
{
  "estimate": {
    "id": "estimate-1-uuid",
    "file_id": "abc-123-uuid",
    "project_id": "project-uuid",
    "subtotal": 125450.00,
    "tax_amount": 0.00,
    "total": 125450.00,
    "total_pages": 6,
    "pages_reviewed": 6,
    "completion_percentage": 100,
    "ai_items_count": 285,
    "human_edits_count": 12,
    "human_additions_count": 3,
    "human_deletions_count": 5,
    "status": "draft",
    "generated_at": "2024-01-15T12:00:00Z"
  },
  "summary": {
    "subtotal": 125450.00,
    "tax_amount": 0.00,
    "total": 125450.00,
    "line_items_count": 283,
    "ai_items_count": 285,
    "human_edits_count": 12,
    "human_additions_count": 3,
    "human_deletions_count": 5,
    "pages_reviewed": 6,
    "total_pages": 6,
    "completion_percentage": 100
  }
}
```

**Notes:**
- Combines all extractions for the file
- Calculates totals from all line items
- Tracks AI vs human contributions
- Sets `estimate_generated_at` on file (GOLDEN FLAG)

**Error:**
```json
{
  "error": "No line items found. Extract at least one page first."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/v1/estimates/generate \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "abc-123"
  }'
```

---

### 8️⃣ Get Estimate

Get estimate details.

**Endpoint:** `GET /estimates/:id`

**Response:**
```json
{
  "id": "estimate-1-uuid",
  "file_id": "abc-123-uuid",
  "total": 125450.00,
  "ai_items_count": 285,
  "human_edits_count": 12,
  "status": "draft",
  "generated_at": "2024-01-15T12:00:00Z"
}
```

**cURL Example:**
```bash
curl http://localhost:3001/api/v1/estimates/estimate-1-uuid
```

---

### 9️⃣ Get Estimates for File

Get all estimates for a file.

**Endpoint:** `GET /estimates/file/:file_id`

**Response:**
```json
[
  {
    "id": "estimate-1",
    "total": 125450.00,
    "generated_at": "2024-01-15T12:00:00Z"
  },
  {
    "id": "estimate-2",
    "total": 128900.00,
    "generated_at": "2024-01-16T09:00:00Z"
  }
]
```

**cURL Example:**
```bash
curl http://localhost:3001/api/v1/estimates/file/abc-123
```

---

## 🔄 Complete Workflow Example

### Step 1: Get File Info
```bash
# Get files for a project
curl "http://localhost:3001/api/v1/files?project_id=project-123"

# Response tells you:
# - file_id
# - page_count (how many pages to extract)
```

### Step 2: Extract Each Page
```bash
# Extract page 1
curl -X POST http://localhost:3001/api/v1/extractions/start \
  -H "Content-Type: application/json" \
  -d '{"file_id": "abc-123", "page_number": 1}'

# Wait 15 seconds for AI processing...

# Check results
curl http://localhost:3001/api/v1/extractions/xyz-789

# Repeat for page 2, 3, 4... up to page_count
```

### Step 3: Review and Edit
```bash
# Edit a line item
curl -X PUT http://localhost:3001/api/v1/line-items/item-1 \
  -H "Content-Type: application/json" \
  -d '{"quantity": 1200}'

# Add a line item
curl -X POST http://localhost:3001/api/v1/line-items \
  -H "Content-Type: application/json" \
  -d '{
    "extraction_id": "xyz-789",
    "description": "Extra work",
    "total_price": 5000
  }'

# Delete a line item
curl -X DELETE http://localhost:3001/api/v1/line-items/item-2
```

### Step 4: Generate Estimate
```bash
# Generate final estimate
curl -X POST http://localhost:3001/api/v1/estimates/generate \
  -H "Content-Type: application/json" \
  -d '{"file_id": "abc-123"}'

# Response includes total and metrics
```

---

## 🧪 Testing Guide

### Prerequisites
```bash
# 1. Backend must be running
cd backend
npm start

# 2. Database must be set up
psql -U hafed.rhouma -d quickbids -f migrations/001_initial_schema.sql

# 3. Environment variables must be set
cat backend/.env
# OPENAI_API_KEY=sk-proj-...
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_REGION=us-east-1
```

### Test Script
```bash
# Use the automated test script
chmod +x test-extraction.sh
./test-extraction.sh

# Or test manually with cURL commands above
```

### What to Expect

**Timeline:**
```
0s    - Start extraction (returns immediately)
10-20s - AI processing (backend logs show progress)
20s+  - Check results (should show line items)
```

**Backend Logs:**
```
🚀 Extract file abc-123, page 1
   File: Plans.pdf (6 pages)
   📝 Extraction: xyz-789

⚙️  Processing xyz-789...
   📂 Fetching page 1...
   ⬇️  Downloading from S3...
   ✅ Downloaded: /temp/abc-123_part1.pdf
   📄 Converting to image...
   ✅ Image ready (2048KB)
   🤖 Calling AI...
   ✅ Found 47 items
   ✅ Saved 47 items
   🗑️  Cleaned up temp file
   🎉 Done!
```

---

## 🐛 Troubleshooting

### "OPENAI_API_KEY not found"
```bash
# Add to .env
echo "OPENAI_API_KEY=sk-proj-your-key" >> backend/.env
```

### "AWS credentials not configured"
```bash
# Add to .env
echo "AWS_ACCESS_KEY_ID=your-key" >> backend/.env
echo "AWS_SECRET_ACCESS_KEY=your-secret" >> backend/.env
echo "AWS_REGION=us-east-1" >> backend/.env
```

### "Part 1 not found in S3"
Check your S3 structure:
```bash
aws s3 ls s3://your-bucket/project-123/document/
# Should show:
# part-1.pdf
# part-2.pdf
# part-3.pdf
```

### "Extraction stuck on processing"
Check backend logs for errors. Common issues:
- PDF file not found in S3
- OpenAI API rate limit
- Network timeout
- Invalid PDF format

---

## 📊 Key Metrics

**Processing Time:**
- PDF download: 1-2 seconds
- Image conversion: 0.5 seconds
- AI extraction: 5-15 seconds
- Save results: 0.5 seconds
- **Total: 10-20 seconds per page**

**Accuracy:**
- AI extraction: ~90-95% accurate
- Human review improves to ~99%
- Confidence scores help identify uncertain items

**Costs (OpenAI):**
- ~$0.01-0.03 per page
- 166-page document: ~$2-5
- Depends on image size and complexity

---

## 🎯 Next Steps

After extraction API is working:
1. Build frontend page navigation UI
2. Add review/edit interface
3. Add estimate preview
4. Add PDF download with edits
5. Add multi-file batch processing

---

## 📞 Support

If you have issues:
1. Check backend logs
2. Verify database schema
3. Test with cURL commands
4. Check AWS S3 permissions
5. Verify OpenAI API key

---

**Generated:** 2024-01-15  
**Version:** 1.0  
**Last Updated:** Initial release
