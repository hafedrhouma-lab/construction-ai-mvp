# 🔍 Database Check - What Happened After Test

## 🚀 **Quick Check Commands**

### **Option 1: Using psql**

```bash
# Connect to database
psql -h localhost -U postgres -d quickbids

# Or if you have different settings:
psql postgresql://username:password@localhost:5432/quickbids
```

### **Then run these queries:**

---

## 📊 **Query 1: See All Files Created**

```sql
SELECT 
  id,
  original_filename,
  status,
  page_count,
  created_at
FROM files
ORDER BY created_at DESC
LIMIT 5;
```

**Expected output:**
```
id                  | original_filename    | status | page_count | created_at
--------------------+---------------------+--------+------------+-------------------------
abc-123-def-456     | test-blueprint.pdf  | ready  | 3          | 2025-10-13 14:23:45
```

---

## 🎯 **Query 2: Check File Status**

```sql
SELECT 
  status,
  COUNT(*) as count
FROM files
GROUP BY status;
```

**Expected output:**
```
status    | count
----------+-------
ready     | 1
```

**Meaning:**
- ✅ File status changed from `uploading` → `ready`
- ✅ This happened when test ran `/confirm` endpoint

---

## 📦 **Query 3: See S3 Keys (Where Files "Should" Be)**

```sql
SELECT 
  id,
  original_filename,
  s3_key,
  page_count
FROM files
ORDER BY created_at DESC
LIMIT 3;
```

**Expected output:**
```
id          | original_filename   | s3_key                    | page_count
------------+--------------------+--------------------------+------------
abc-123     | test-blueprint.pdf | pages/abc-123            | 3
```

**What this means:**
- File record says: "pages should be at `pages/abc-123/page-1.pdf`"
- But remember: **Nothing actually uploaded to S3 yet!**
- S3 bucket is still empty

---

## 🔍 **Query 4: Check Metadata (Page Info)**

```sql
SELECT 
  id,
  original_filename,
  metadata
FROM files
WHERE status = 'ready'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected output:**
```json
{
  "pages": [
    {
      "pageNumber": 1,
      "s3Key": "pages/abc-123/page-1.pdf"
    },
    {
      "pageNumber": 2,
      "s3Key": "pages/abc-123/page-2.pdf"
    },
    {
      "pageNumber": 3,
      "s3Key": "pages/abc-123/page-3.pdf"
    }
  ],
  "uploadConfirmedAt": "2025-10-13T14:23:45.123Z"
}
```

**What this shows:**
- ✅ Backend stored page information
- ✅ Each page has S3 key
- ✅ Timestamp when "upload confirmed"

---

## 📊 **Query 5: Full File Details**

```sql
SELECT 
  id,
  project_id,
  original_filename,
  file_type,
  mime_type,
  status,
  page_count,
  s3_key,
  s3_bucket,
  created_at,
  updated_at
FROM files
WHERE original_filename = 'test-blueprint.pdf';
```

**Expected output:**
```
id:              abc-123-def-456
project_id:      11111111-1111-1111-1111-111111111111
original_filename: test-blueprint.pdf
file_type:       pdf
mime_type:       application/pdf
status:          ready          ← Changed from "uploading"
page_count:      3              ← Set by confirm endpoint
s3_key:          pages/abc-123
s3_bucket:       quickbids-files
created_at:      2025-10-13 14:23:40
updated_at:      2025-10-13 14:23:45  ← Updated when confirmed
```

---

## 🎯 **What to Look For**

### ✅ **Good Signs:**
- File record exists
- Status = `ready` (not `uploading`)
- page_count = 3
- s3_key starts with `pages/`
- metadata has pages array
- updated_at is after created_at

### ⚠️ **If You See:**
- Status = `uploading` → Confirm endpoint wasn't called
- page_count = 0 or NULL → Confirm endpoint failed
- No metadata → Confirm endpoint didn't save pages
- deleted_at = timestamp → File was deleted

---

## 🔄 **Test Flow vs Database Changes**

```
Test Step                    Database State
-----------                  ---------------

1. Create file record
   POST /files              → INSERT INTO files
                              status = 'uploading'
                              page_count = 3
                              
2. Get presigned URL
   POST /pages/1/upload-url → No DB change
                              (just generates URL)

3. Confirm upload
   POST /confirm            → UPDATE files
                              status = 'ready'
                              metadata = {pages: [...]}
                              updated_at = NOW()
```

---

## 🗄️ **Check Related Tables**

### **Projects Table:**
```sql
SELECT 
  p.id,
  p.name,
  COUNT(f.id) as file_count
FROM projects p
LEFT JOIN files f ON f.project_id = p.id
WHERE p.id = '11111111-1111-1111-1111-111111111111'
GROUP BY p.id, p.name;
```

**Shows:** How many files this project has

---

## 📊 **Summary Query (Everything at Once)**

```sql
SELECT 
  f.id as file_id,
  f.original_filename,
  f.status,
  f.page_count,
  p.name as project_name,
  f.s3_key,
  f.created_at,
  f.updated_at,
  CASE 
    WHEN f.metadata IS NOT NULL THEN 'Has metadata ✅'
    ELSE 'No metadata ❌'
  END as metadata_status
FROM files f
JOIN projects p ON p.id = f.project_id
ORDER BY f.created_at DESC
LIMIT 5;
```

---

## 🎯 **What You Should See**

After running the test script successfully:

```
✅ 1 new file record in files table
✅ Status = 'ready'
✅ page_count = 3
✅ s3_key = 'pages/{uuid}'
✅ metadata contains pages array with 3 items
✅ updated_at > created_at (updated by confirm)
✅ deleted_at = NULL (not deleted)
```

---

## ⚠️ **Important Note**

**Database says:**
- ✅ File record exists
- ✅ Status = ready
- ✅ "Should" have 3 pages in S3

**Reality:**
- ❌ S3 bucket is EMPTY!
- ❌ No actual files uploaded

**Why?**
- Test script skipped actual S3 upload
- Just tested API endpoints
- Frontend will do real uploads

---

## 🧪 **Verify S3 is Empty**

```bash
# If you have AWS CLI configured
aws s3 ls s3://quickbids-files/pages/

# Expected output: EMPTY (or just other test files)
# The test-blueprint.pdf pages are NOT there
```

---

## 🚀 **Quick Check Script**

Save as `check-db.sh`:

```bash
#!/bin/bash

echo "🔍 Checking database for test files..."

psql postgresql://localhost:5432/quickbids -c "
SELECT 
  id,
  original_filename,
  status,
  page_count,
  s3_key,
  created_at
FROM files
ORDER BY created_at DESC
LIMIT 3;
"
```

---

## 💡 **Summary**

**Run these to see what test created:**

```sql
-- Quick check
SELECT * FROM files ORDER BY created_at DESC LIMIT 1;

-- Check metadata
SELECT original_filename, status, metadata FROM files 
WHERE original_filename = 'test-blueprint.pdf';

-- Count by status
SELECT status, COUNT(*) FROM files GROUP BY status;
```

**You should see:**
- 1 file record
- Status: ready
- Metadata: pages array
- S3 keys defined
- But S3 bucket still empty!

---

Want me to show you what the actual database rows look like?
