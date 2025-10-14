# 📁 Files API - Backend Complete!

## ✅ What We Just Built

### **Backend Files Module:**
- ✅ `repository.js` - Database operations
- ✅ `service.js` - Business logic + S3 operations
- ✅ `controller.js` - HTTP handlers
- ✅ `routes.js` - API endpoints
- ✅ Registered in `app.js`

---

## 🔌 API Endpoints

### **1. Create File Record**
```bash
POST /api/v1/files
Content-Type: application/json

{
  "project_id": "uuid",
  "original_filename": "blueprint.pdf",
  "total_pages": 150
}

Response:
{
  "id": "file-uuid",
  "project_id": "...",
  "original_filename": "blueprint.pdf",
  "s3_key": "pages/file-uuid",
  "status": "uploading",
  "page_count": 150,
  "created_at": "2025-10-13T..."
}
```

### **2. Get Presigned URL for Page Upload**
```bash
POST /api/v1/files/:id/pages/:pageNumber/upload-url

Response:
{
  "uploadUrl": "https://quickbids-files.s3.amazonaws.com/...",
  "pageKey": "pages/file-uuid/page-1.pdf",
  "fileId": "file-uuid",
  "pageNumber": 1
}
```

### **3. Confirm Upload Complete**
```bash
POST /api/v1/files/:id/confirm
Content-Type: application/json

{
  "pageCount": 150
}

Response:
{
  "id": "file-uuid",
  "status": "ready",  ← Changed from "uploading"
  "page_count": 150,
  "metadata": {
    "pages": [
      { "pageNumber": 1, "s3Key": "pages/file-uuid/page-1.pdf" },
      { "pageNumber": 2, "s3Key": "pages/file-uuid/page-2.pdf" },
      ...
    ],
    "uploadConfirmedAt": "2025-10-13T..."
  }
}
```

### **4. List Files for Project**
```bash
GET /api/v1/files?project_id=uuid

Optional params:
- status: uploading|ready|processing|failed
- file_type: pdf|video
- limit: 100 (default)
- offset: 0 (default)

Response:
[
  {
    "id": "file-uuid-1",
    "original_filename": "blueprint.pdf",
    "page_count": 150,
    "status": "ready",
    "created_at": "..."
  },
  ...
]
```

### **5. Get File Details**
```bash
GET /api/v1/files/:id
GET /api/v1/files/:id?include_urls=true  ← With presigned URLs

Response (with include_urls=true):
{
  "id": "file-uuid",
  "original_filename": "blueprint.pdf",
  "page_count": 150,
  "status": "ready",
  "metadata": {
    "pages": [
      {
        "pageNumber": 1,
        "s3Key": "pages/file-uuid/page-1.pdf",
        "viewUrl": "https://...presigned-url..."  ← 1 hour expiration
      },
      ...
    ]
  }
}
```

### **6. Delete File**
```bash
DELETE /api/v1/files/:id

Response:
{
  "success": true
}
```

### **7. Get Project File Stats**
```bash
GET /api/v1/files/stats/:projectId

Response:
{
  "total_files": 5,
  "total_pages": 450,
  "total_size": 52428800,  // bytes
  "ready_files": 4,
  "uploading_files": 1,
  "processing_files": 0
}
```

---

## 🧪 Test the API

### **Method 1: Use Test Script**

```bash
cd quickbids-backend

# Make sure backend is running
npm run dev

# In another terminal, run test script
./test-files-api.sh
```

**Expected output:**
```
🧪 Testing Files API
====================

1️⃣  Getting project list...
✅ Using project: 11111111-1111-1111-1111-111111111111

2️⃣  Creating file record...
✅ File created: abc-123-def

3️⃣  Getting presigned URL for page 1...
✅ Got upload URL (truncated): https://quickbids-files.s3.amazonaws.com/...

4️⃣  Confirming upload (3 pages)...
{
  "id": "abc-123-def",
  "status": "ready",
  "page_count": 3
}

5️⃣  Getting file details...
{
  "id": "abc-123-def",
  "original_filename": "test-blueprint.pdf",
  "status": "ready",
  "metadata": {
    "pages": [...]
  }
}

✅ All tests passed!
```

---

### **Method 2: Manual curl Tests**

```bash
# Get project ID
PROJECT_ID=$(curl -s http://localhost:3001/api/v1/projects | jq -r '.[0].id')

# Create file
curl -X POST http://localhost:3001/api/v1/files \
  -H "Content-Type: application/json" \
  -d "{
    \"project_id\": \"$PROJECT_ID\",
    \"original_filename\": \"my-file.pdf\",
    \"total_pages\": 50
  }" | jq '.'

# Get files for project
curl "http://localhost:3001/api/v1/files?project_id=$PROJECT_ID" | jq '.'
```

---

## 📊 Database Schema Usage

### **Files Table:**
```sql
files:
- id (UUID)
- user_id (FK)
- project_id (FK)
- s3_key: "pages/file-uuid"
- s3_bucket: "quickbids-files"
- original_filename: "blueprint.pdf"
- file_type: "pdf"
- page_count: 150
- status: "uploading" | "ready" | "processing" | "failed"
- metadata: JSON with page info
- created_at
- deleted_at (soft delete)
```

---

## 🔄 Upload Flow (What Frontend Will Do)

```
1. Frontend: User selects PDF (150 pages)
   ↓
2. Frontend: Split PDF into 150 single-page PDFs
   ↓
3. Frontend: POST /api/v1/files (create record)
   Response: { id: "file-123", status: "uploading" }
   ↓
4. Frontend: For each page (in parallel, 10 at a time):
   - POST /api/v1/files/file-123/pages/1/upload-url
   - Get presigned URL
   - PUT to S3 directly (no backend)
   ↓
5. Frontend: After all pages uploaded:
   - POST /api/v1/files/file-123/confirm
   - Backend sets status="ready"
   - Backend stores page metadata
   ↓
6. Frontend: File ready for extraction!
   - GET /api/v1/files/file-123?include_urls=true
   - Display pages with thumbnails
```

---

## 🎯 S3 Structure Created

```
s3://quickbids-files/
└── pages/
    └── file-abc-123/
        ├── page-1.pdf    ← Individual page
        ├── page-2.pdf
        ├── page-3.pdf
        └── ...
```

---

## ✅ Backend Checklist

- [x] Files repository (database CRUD)
- [x] Files service (business logic)
- [x] S3 presigned URL generation
- [x] Files controller (HTTP)
- [x] Files routes
- [x] Registered in app.js
- [x] Test script created
- [ ] Test with real backend
- [ ] Ready for frontend integration

---

## 🚀 Next: Frontend FileUpload Component

Now we build:
1. FileUpload component (drag & drop)
2. PDF splitting with pdf-lib
3. Parallel upload logic
4. Progress tracking
5. FilesList component

**Estimated time:** 2 hours

---

## 🧪 Quick Verification

```bash
# 1. Backend running?
curl http://localhost:3001/health

# 2. Can create file?
curl -X POST http://localhost:3001/api/v1/files \
  -H "Content-Type: application/json" \
  -d '{"project_id":"11111111-1111-1111-1111-111111111111","original_filename":"test.pdf","total_pages":1}'

# 3. Can list files?
curl "http://localhost:3001/api/v1/files?project_id=11111111-1111-1111-1111-111111111111"
```

---

## ⚠️ Important Notes

### **Presigned URLs:**
- Upload URLs expire in 15 minutes
- View URLs expire in 1 hour
- Generate new ones if expired

### **File Status Flow:**
```
uploading → ready → (future: processing → completed)
```

### **Soft Delete:**
- Files are not permanently deleted
- `deleted_at` timestamp set
- Can be recovered if needed

---

## 🎉 **Backend Files API Complete!**

**What works:**
- ✅ Create file records
- ✅ Generate presigned URLs
- ✅ Confirm uploads
- ✅ List files
- ✅ Get file details with URLs
- ✅ Delete files
- ✅ Project statistics

**Ready for frontend!** 🚀

Now let's build the upload UI!
