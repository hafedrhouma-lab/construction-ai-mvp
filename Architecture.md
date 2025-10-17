# QuickBids Architecture

## System Overview
```
Frontend (React) → Backend (Node.js) → Database (PostgreSQL)
                        ↓
                    AWS S3 + OpenAI API
```

## Tech Stack

- **Frontend:** React 18 + Vite (AWS S3)
- **Backend:** Node.js 18 + Express (AWS Lightsail)
- **Database:** PostgreSQL 14+ (AWS Lightsail)
- **Storage:** AWS S3
- **AI:** OpenAI GPT-4o

---

## Backend Structure (MVC Pattern)
```
modules/
├── projects/
│   ├── controller.js  # HTTP handlers
│   ├── service.js     # Business logic
│   ├── repository.js  # Database queries
│   └── routes.js      # Express routes
└── files/
    └── (same structure)
```

**Example Flow:**
```
Request → Routes → Controller → Service → Repository → Database
```

---

## Frontend Structure
```
src/
├── pages/          # ProjectsPage, FilesPage, ExtractionFlow
├── components/     # Layout, FileUpload, LineItemsTable
└── services/       # api.js (axios wrapper)
```

---

## Data Flow - File Upload

1. User uploads PDF + selects topics `["striping", "crosswalks"]`
2. Frontend: `POST /files/upload` (FormData)
3. Backend: Multer saves to temp, returns immediately
4. Background: Split PDF → Check keywords → Upload to S3
5. Database: `UPDATE files SET status='ready', relevant_pages=[1,5,12]`
6. Frontend: Polls status every 5s until ready

---

## Data Flow - AI Extraction

1. User clicks "Extract Page 1"
2. Frontend: `POST /extractions/start {file_id, page_number}`
3. Backend: Creates extraction record, returns immediately
4. Background:
   - Fetch `page-1.pdf` from S3
   - Convert PDF → PNG image
   - Upload image to S3 (temp, 1 hour expiry)
   - Call OpenAI Vision API with image URL + prompt
   - Parse JSON response
   - Save line_items to database
   - Update extraction `status = 'completed'`
5. Frontend: Polls every 3s, displays results when completed

---

## Database Schema
```
users (id, email, company_name, role)
  ↓ 1:N
projects (id, user_id, name, status)
  ↓ 1:N
files (id, project_id, s3_key, topics[], relevant_pages[], status)
  ↓ 1:N
extractions (id, file_id, page_number, status, extraction_attempts)
  ↓ 1:N
line_items (id, extraction_id, description, quantity, unit, 
           original_quantity, was_edited, source)
```

---

## Key Design Decisions

### 1. Inline Topic Filtering
- **WHY:** Filter during PDF split (not after)
- **BENEFIT:** 50% cost savings, no wasted S3 storage

### 2. Presigned URLs
- **WHY:** Direct S3 access instead of proxying through backend
- **BENEFIT:** No bandwidth bottleneck, faster for users

### 3. Dual Extraction (v1 + v2)
- **WHY:** v1 fast/cheap, v2 rich metadata
- **BENEFIT:** User choice based on needs

### 4. Re-extraction Limits (2 per page)
- **WHY:** Control OpenAI costs
- **BENEFIT:** Prevents accidental spam

### 5. Delta Tracking
- **WHY:** Save original AI values when human edits
- **BENEFIT:** Complete dataset for ML training

### 6. Background Processing
- **WHY:** Return immediately, process async
- **BENEFIT:** Better UX, no 60s waits

### 7. Soft Deletes
- **WHY:** Never hard delete (deleted_at timestamp)
- **BENEFIT:** Recoverable, audit trail

---

## Performance

| Operation | Time |
|-----------|------|
| Create project | <200ms |
| Upload 50-page PDF | ~45s |
| Upload 150-page PDF | ~2min |
| Extract 1 page (v1) | 10-20s |
| Extract 1 page (v2) | 15-30s |
| Generate estimate | <2s |
| Export CSV | <1s |

---

## Security

**Implemented:**
- ✅ CORS configuration
- ✅ SQL injection prevention (parameterized queries)
- ✅ S3 presigned URLs (time-limited)
- ✅ HTTPS/SSL
- ✅ Environment variables

**Required for Production:**
- ⚠️ Authentication (JWT)
- ⚠️ Rate limiting
- ⚠️ API keys
- ⚠️ Audit logging

---

## Scalability

**Current:** Single Lightsail (2GB) = 50+ concurrent users

**Phase 1:** Vertical (upgrade to 4GB)  
**Phase 2:** Horizontal (load balancer + multiple instances)  
**Phase 3:** Microservices (separate AI, files, auth services)

---

## Cost (Production)

| Service | Monthly Cost |
|---------|--------------|
| Lightsail Backend (2GB) | $10 |
| Lightsail Database (2GB) | $15 |
| S3 Frontend | $1-2 |
| S3 Files (100GB) | $2-3 |
| OpenAI API | Variable |
| **Total** | **~$33-43** |

---

## File Storage Structure
```
S3 Bucket: quickbids-files/
├── pages/
│   └── {file-id}/
│       ├── page-1.pdf
│       ├── page-2.pdf
│       └── page-N.pdf
└── temp/
    └── {temp-images}.png (auto-delete after 1 hour)
```

---

## API Design

**RESTful, versioned:** `/api/v1/...`

**Resource-oriented URLs:**
```
GET    /projects
POST   /projects
GET    /projects/:id
PUT    /projects/:id
DELETE /projects/:id
```

**Nested resources:**
```
GET /files?project_id=123
GET /extractions/file/:fileId
```

**Actions:**
```
POST /extractions/start
POST /estimates/generate
```

---

## Environment Variables

**Backend (.env):**
```bash
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_NAME=quickbids
DB_USER=postgres
DB_PASSWORD=...
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=quickbids-files
OPENAI_API_KEY=sk-proj-...
```

**Frontend (.env):**
```bash
VITE_API_URL=http://localhost:3001/api/v1
```

---

## Monitoring (Future)

- PM2 for process management
- CloudWatch for logs
- Sentry for error tracking
- Redis for caching
- Bull/BullMQ for job queues

---

**Last Updated:** October 2025  
**Version:** 1.0.0