# QuickBids API Reference

**Base URL:** `http://localhost:3001/api/v1`  
**Production:** `https://api.yourdomain.com/api/v1`

---

## Authentication

⚠️ **Currently NO authentication** (uses demo user)  
**Future:** JWT tokens in Authorization header

**Demo User ID:** `00000000-0000-0000-0000-000000000001`

---

## Projects API

### List Projects
```
GET /projects?status=active&limit=100&offset=0
```

**Response 200:**
```
[
  {
    "id": "uuid",
    "name": "Atlanta Striping Project",
    "customer_name": "City of Atlanta",
    "status": "active",
    "created_at": "2025-10-13T10:00:00Z"
  }
]
```

### Get Project
```
GET /projects/:id
```

**Response 200:**
```
{
  "id": "uuid",
  "name": "Atlanta Striping Project",
  "stats": {
    "files": 3,
    "sessions": 5,
    "estimates": 2
  }
}
```

### Create Project
```
POST /projects
Content-Type: application/json

{
  "name": "Downtown Renovation",
  "customer_name": "City Hall",
  "customer_email": "projects@cityhall.gov",
  "description": "Parking lot renovation"
}
```

**Response 201:**
```
{
  "id": "uuid",
  "name": "Downtown Renovation",
  "status": "active",
  "created_at": "2025-10-17T10:00:00Z"
}
```

### Update Project
```
PUT /projects/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "status": "completed"
}
```

**Response 200:** (updated project object)

### Delete Project
```
DELETE /projects/:id
```

**Response 200:**
```
{
  "success": true
}
```

**Note:** Soft delete (sets status='archived')

---

## Files API

### Upload File
```
POST /files/upload
Content-Type: multipart/form-data

Form Data:
- file: (PDF binary)
- project_id: "uuid"
- topics: ["striping", "crosswalks", "signage"]
```

**Response 200:**
```
{
  "id": "uuid",
  "project_id": "uuid",
  "original_filename": "plans.pdf",
  "status": "processing",
  "page_count": 50,
  "topics": ["striping", "crosswalks"],
  "message": "File upload successful. Processing pages..."
}
```

**Available Topics:**
- striping
- thermoplastic_lines
- crosswalks
- stop_bars
- symbols_legends
- curb_painting
- signage
- line_removal
- quantities_tables
- specification_notes

### List Files
```
GET /files?project_id=uuid&status=ready&limit=100
```

**Response 200:**
```
[
  {
    "id": "uuid",
    "original_filename": "plans.pdf",
    "page_count": 50,
    "topics": ["striping"],
    "relevant_pages": [1, 5, 12, 18, 23],
    "status": "ready",
    "created_at": "2025-10-17T10:00:00Z"
  }
]
```

**Status values:** uploading, processing, ready, failed

### Get File
```
GET /files/:id
GET /files/:id?include_urls=true
```

**Response 200:**
```
{
  "id": "uuid",
  "original_filename": "plans.pdf",
  "page_count": 50,
  "relevant_pages": [1, 5, 12],
  "status": "ready",
  "metadata": {
    "pages": [
      {
        "pageNumber": 1,
        "s3Key": "pages/file-id/page-1.pdf",
        "viewUrl": "https://..."
      }
    ]
  }
}
```

**Note:** viewUrl presigned URLs expire in 1 hour

### Delete File
```
DELETE /files/:id
```

**Response 200:**
```
{
  "success": true
}
```

**Note:** Soft delete (sets deleted_at timestamp)

---

## Extractions API

### Start Extraction
```
POST /extractions/start
Content-Type: application/json

{
  "file_id": "uuid",
  "page_number": 1,
  "use_enhanced_extraction": false
}
```

**Response 202 Accepted:**
```
{
  "id": "uuid",
  "status": "processing",
  "message": "Extraction started"
}
```

**Processing time:** 10-30 seconds  
**Re-extraction limit:** 2 attempts per page

### Get Extraction Results
```
GET /extractions/:id
```

**Response 200:**
```
{
  "id": "uuid",
  "file_id": "uuid",
  "page_number": 1,
  "status": "completed",
  "model_version": "gpt-4o",
  "processing_time_ms": 8234,
  "extraction_attempts": 1,
  "confidence_score": 0.92,
  "completed_at": "2025-10-17T14:00:00Z",
  "line_items": [
    {
      "id": "uuid",
      "line_number": 1,
      "description": "Thermoplastic striping, 4-inch white",
      "quantity": 850,
      "unit": "LF",
      "unit_price": 2.50,
      "total_price": 2125.00,
      "confidence_score": 0.95,
      "source": "ai",
      "was_edited": false
    }
  ]
}
```

**Status values:** pending, processing, completed, failed

**Enhanced Extraction v2 includes:**
```
{
  "extracted_metadata": {
    "page_type": "Site Plan",
    "sheet_number": "C-3.1",
    "sheet_title": "Parking Layout",
    "trades_affected": ["striping", "signage"],
    "general_notes": ["ADA compliance required"],
    "special_requirements": ["Night work only"],
    "ambiguities": ["Quantity unclear on detail 5"]
  }
}
```

### List File Extractions
```
GET /extractions/file/:file_id
```

**Response 200:**
```
[
  {
    "id": "uuid",
    "page_number": 1,
    "status": "completed",
    "items_count": 12,
    "extraction_attempts": 1
  }
]
```

### Get Page Preview
```
GET /extractions/preview/:file_id/:page_number
```

**Response 200:**
```
{
  "image": "data:image/png;base64,iVBORw0KGgo..."
}
```

---

## Line Items API

### Update Line Item
```
PUT /line-items/:id
Content-Type: application/json

{
  "description": "Thermoplastic striping, 6-inch white (corrected)",
  "quantity": 900,
  "unit_price": 2.75,
  "total_price": 2475.00
}
```

**Response 200:**
```
{
  "id": "uuid",
  "description": "Thermoplastic striping, 6-inch white (corrected)",
  "quantity": 900,
  "unit_price": 2.75,
  "total_price": 2475.00,
  "original_description": "Thermoplastic striping, 4-inch white",
  "original_quantity": 850,
  "original_unit_price": 2.50,
  "original_total_price": 2125.00,
  "was_edited": true,
  "edited_at": "2025-10-17T14:30:00Z",
  "source": "ai"
}
```

### Add Line Item
```
POST /line-items
Content-Type: application/json

{
  "extraction_id": "uuid",
  "description": "Additional mobilization",
  "quantity": 1,
  "unit": "LS",
  "unit_price": 5000.00,
  "total_price": 5000.00
}
```

**Response 201:**
```
{
  "id": "uuid",
  "extraction_id": "uuid",
  "line_number": 13,
  "description": "Additional mobilization",
  "quantity": 1,
  "unit": "LS",
  "unit_price": 5000.00,
  "total_price": 5000.00,
  "source": "human",
  "was_edited": false
}
```

### Delete Line Item
```
DELETE /line-items/:id
```

**Response 200:**
```
{
  "message": "Line item deleted",
  "item": {
    "id": "uuid",
    "deleted_at": "2025-10-17T15:00:00Z"
  }
}
```

**Note:** Soft delete

---

## Estimates API

### Generate Estimate
```
POST /estimates/generate
Content-Type: application/json

{
  "file_id": "uuid"
}
```

**Response 200:**
```
{
  "estimate": {
    "id": "uuid",
    "file_id": "uuid",
    "project_id": "uuid",
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
    "generated_at": "2025-10-17T16:00:00Z"
  },
  "summary": {
    "total": 125450.00,
    "line_items_count": 283,
    "ai_items_count": 285,
    "human_edits_count": 12
  }
}
```

### Get Estimate
```
GET /estimates/:id
```

**Response 200:** (same as generate response)

### Export Estimate CSV
```
GET /estimates/:id/export
```

**Response 200:** CSV file download

**CSV includes:**
- AI vs Human comparison
- Item, AI Qty, Human Qty, Difference
- Unit prices and totals
- Edit status for each item
- Summary statistics

---

## Demo API

### Analyze Document Demo Mode
```
POST /demo/analyze
Content-Type: multipart/form-data

Form Data:
- file: (PDF binary)
```

**Response 200:**
```
{
  "success": true,
  "total_pages": 50,
  "scanned_pages": 30,
  "relevant_pages": [1, 5, 12, 18, 23, 45],
  "line_items": [...],
  "conflicts": [
    {
      "type": "quantity_conflict",
      "item": "parking stalls",
      "occurrences": [
        {"page": 3, "value": 45, "location": "north lot"},
        {"page": 7, "value": 30, "location": "south lot"}
      ]
    }
  ],
  "questions": [
    {
      "id": 1,
      "question": "Different parking stalls quantities found. How to handle?",
      "options": [
        "Sum all quantities (Total: 75 EA)",
        "Use highest count (45 EA)",
        "Keep separate by location"
      ]
    }
  ],
  "processing_time": {
    "stage1": "8.2s",
    "stage2": "15.3s",
    "total": "23.5s"
  },
  "cost_breakdown": {
    "stage1_scan": "0.30",
    "stage2_extraction": "0.15",
    "total": "0.45"
  }
}
```

---

## Error Responses

**Format:**
```
{
  "error": "Error message",
  "details": "Additional details (dev only)",
  "code": "ERROR_CODE"
}
```

**Status Codes:**
- 200 OK
- 201 Created
- 202 Accepted
- 400 Bad Request
- 404 Not Found
- 429 Too Many Requests (rate limit or re-extraction limit)
- 500 Server Error

**Example Errors:**

File Upload:
```
{
  "error": "Only PDF files are allowed"
}
```

Extraction Limit:
```
{
  "error": "Re-extract limit reached",
  "message": "This page has been extracted 2 times. Limit: 2 attempts.",
  "attempts": 2,
  "limit": 2
}
```

Invalid Page:
```
{
  "error": "Invalid page number. Must be 1-50"
}
```

---

## cURL Examples

**Create Project:**
```bash
curl -X POST http://localhost:3001/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project", "customer_name": "Test Customer"}'
```

**Upload File:**
```bash
curl -X POST http://localhost:3001/api/v1/files/upload \
  -F "file=@plans.pdf" \
  -F "project_id=uuid" \
  -F 'topics=["striping", "crosswalks"]'
```

**Start Extraction:**
```bash
curl -X POST http://localhost:3001/api/v1/extractions/start \
  -H "Content-Type: application/json" \
  -d '{"file_id": "uuid", "page_number": 1}'
```

**Get Results:**
```bash
curl http://localhost:3001/api/v1/extractions/uuid
```

**Update Line Item:**
```bash
curl -X PUT http://localhost:3001/api/v1/line-items/uuid \
  -H "Content-Type: application/json" \
  -d '{"quantity": 900, "unit_price": 2.75}'
```

**Generate Estimate:**
```bash
curl -X POST http://localhost:3001/api/v1/estimates/generate \
  -H "Content-Type: application/json" \
  -d '{"file_id": "uuid"}'
```

---

## Rate Limiting

⚠️ **Not implemented yet**

**Recommended for production:**
- 100 requests/minute per IP
- 1000 requests/hour per user
- 10 concurrent extractions per user

---

## Polling Patterns

For async operations (file processing, extraction):

1. Start operation → Get ID
2. Poll every 3-5 seconds: `GET /extractions/:id`
3. Check status: `processing` → `completed` or `failed`
4. Stop polling when status changes

**Frontend example:**
```javascript
const interval = setInterval(async () => {
  const result = await fetch('/extractions/' + id);
  if (result.status === 'completed') {
    clearInterval(interval);
    // Show results
  }
}, 3000);
```

---

**Last Updated:** October 2025  
**API Version:** v1