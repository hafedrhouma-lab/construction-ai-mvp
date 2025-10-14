# 🚀 Backend File Upload - Installation Guide

## ✅ What We Built

**Complete backend file upload + splitting:**
- ✅ Multer middleware for file uploads
- ✅ PDF splitting service (splits pages efficiently)
- ✅ S3 parallel upload (10 pages at once)
- ✅ Background processing
- ✅ Progress tracking
- ✅ Error handling

---

## 📦 Installation Steps

### **1. Install Dependencies**

```bash
cd backend
npm install multer@^1.4.5-lts.1
```

### **2. Copy Updated Files**

Replace these files in your backend:

```
backend/src/
├── modules/files/
│   ├── controller.js     ✅ UPDATED (added upload endpoint)
│   ├── service.js        ✅ UPDATED (added uploadAndProcess)
│   └── routes.js         ✅ UPDATED (added /upload route)
│
├── utils/
│   ├── aws/
│   │   └── s3Client.js   ✅ UPDATED (added uploadBuffer method)
│   │
│   └── pdf/
│       └── pdfProcessor.js  ✅ NEW (PDF splitting service)
│
└── package.json          ✅ UPDATED (added multer)
```

### **3. Create Uploads Directory**

```bash
mkdir -p backend/uploads/temp
```

---

## 🔌 New API Endpoint

### **POST /api/v1/files/upload**

**Content-Type:** `multipart/form-data`

**Body:**
- `file` (File): PDF file
- `project_id` (String): Project UUID

**Response:**
```json
{
  "id": "file-uuid",
  "project_id": "project-uuid",
  "original_filename": "blueprint.pdf",
  "status": "processing",
  "page_count": 150,
  "message": "File upload successful. Processing pages..."
}
```

---

## 🧪 Test the Upload

### **Method 1: Using curl**

```bash
# Get a project ID
PROJECT_ID=$(curl -s http://localhost:3001/api/v1/projects | jq -r '.[0].id')

# Upload a PDF file
curl -X POST http://localhost:3001/api/v1/files/upload \
  -F "file=@/path/to/your/file.pdf" \
  -F "project_id=$PROJECT_ID"

# Expected response:
{
  "id": "abc-123",
  "status": "processing",
  "message": "File upload successful. Processing pages..."
}
```

### **Method 2: Check Status**

```bash
# Get file details
FILE_ID="abc-123"
curl http://localhost:3001/api/v1/files/$FILE_ID

# Watch status change:
# processing → ready (when done)
```

### **Method 3: Monitor Logs**

```bash
# In terminal where backend is running, you'll see:
📤 File upload received: blueprint.pdf (25.50MB)
✅ PDF validated: 25.50MB
📄 PDF has 150 pages
📊 File record created: abc-123
⚙️ Background processing started: abc-123
📦 Processing batch: pages 1-10
✅ Batch complete: 10/150 pages uploaded
📦 Processing batch: pages 11-20
...
✅ Processing complete: 150 pages in 12.35s
```

---

## 🎯 How It Works

### **Upload Flow:**

```
1. Frontend: Upload PDF file (200MB)
   ↓
2. Backend receives via Multer
   → Saves to uploads/temp/
   ↓
3. Validate PDF
   → Check size, format
   ↓
4. Create DB record
   → status = "processing"
   ↓
5. Return immediately to frontend
   → User sees "Processing..."
   ↓
6. Background: Split PDF
   → Process 10 pages at once
   → Upload to S3 in parallel
   ↓
7. Update DB when done
   → status = "ready"
   → Store page metadata
   ↓
8. Clean up temp file
```

---

## 📊 Performance

### **200MB File with 150 Pages:**

```
Upload to backend:       ~40 seconds (user internet)
PDF validation:          ~1 second
Split + upload to S3:    ~10-15 seconds (parallel)
Total:                   ~50-55 seconds ✅
```

### **Processing Batches:**
- Processes 10 pages at once
- Each batch uploads in parallel
- 150 pages = 15 batches
- ~1 second per batch = 15 seconds total

---

## 🗄️ Database Status Flow

```sql
-- Initial state (after upload)
status: 'processing'
page_count: 150
metadata: {
  "processingProgress": 0,
  "processedPages": 0,
  "totalPages": 150
}

-- During processing (updates every batch)
metadata: {
  "processingProgress": 67,  -- 67% done
  "processedPages": 100,     -- 100/150 pages
  "totalPages": 150
}

-- After completion
status: 'ready'
page_count: 150
metadata: {
  "pages": [
    {"pageNumber": 1, "s3Key": "pages/file-id/page-1.pdf", "size": 123456},
    {"pageNumber": 2, "s3Key": "pages/file-id/page-2.pdf", "size": 234567},
    ...
  ],
  "processingTime": "12.35",
  "completedAt": "2025-10-13T..."
}
```

---

## 🔍 Check S3

After processing, verify files in S3:

```bash
# Using AWS CLI
aws s3 ls s3://quickbids-files/pages/abc-123/

# Expected output:
page-1.pdf
page-2.pdf
page-3.pdf
...
page-150.pdf
```

---

## ⚙️ Configuration

### **File Size Limit:**

In `controller.js`:
```javascript
limits: {
  fileSize: 500 * 1024 * 1024 // 500MB max
}
```

### **Batch Size (Parallel Uploads):**

In `pdfProcessor.js`:
```javascript
const BATCH_SIZE = 10; // Upload 10 pages at once
```

**Adjust based on:**
- Server memory
- Network bandwidth
- AWS rate limits

---

## 🐛 Troubleshooting

### **Error: "No file uploaded"**
- Make sure Content-Type is `multipart/form-data`
- Check field name is `file`

### **Error: "Only PDF files allowed"**
- File must have mimetype `application/pdf`
- Check file is not corrupted

### **Error: "File too large"**
- Current limit: 500MB
- Adjust in controller.js if needed

### **Error: "Invalid PDF"**
- File may be corrupted
- Try opening in PDF reader first

### **Status stuck on "processing"**
- Check backend logs for errors
- Verify S3 credentials
- Check temp directory has space

---

## ✅ Verification Checklist

After installation:

- [ ] npm install multer successful
- [ ] All files copied to backend
- [ ] uploads/temp directory created
- [ ] Backend restarts without errors
- [ ] Can upload small PDF (test)
- [ ] Status changes to "ready"
- [ ] Pages appear in S3
- [ ] Temp file gets deleted

---

## 🚀 Next: Frontend Upload Component

Now we build the frontend to use this endpoint!

**What we'll create:**
1. FileUpload component
2. Progress tracking
3. Status polling
4. File listing

**Estimated time:** 1-2 hours

---

## 📝 Notes

### **Background Processing:**
Currently runs in same process. For production:
- Use Bull/BullMQ with Redis
- Separate worker processes
- Better for multiple concurrent uploads

### **Error Handling:**
- Files that fail processing get status = "failed"
- Error message stored in metadata
- Temp files always cleaned up

### **Monitoring:**
- All steps logged with Winston
- Progress updates in database
- Can add webhooks for status changes

---

**Backend upload is ready! Test it, then we build the frontend!** 🚀
