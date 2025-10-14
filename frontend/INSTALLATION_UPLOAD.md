# 🎨 Frontend File Upload - Installation Guide

## ✅ What We Built

**Complete frontend upload system:**
- ✅ FileUpload component (drag & drop + file picker)
- ✅ Real-time upload progress bar
- ✅ Status polling (checks when processing complete)
- ✅ FilesList component (displays uploaded files)
- ✅ FilesManager (combines everything)
- ✅ Demo page to test

---

## 📦 Files Created

```
frontend/src/
├── components/
│   └── files/
│       ├── FileUpload.jsx      ✅ NEW (drag & drop upload)
│       ├── FilesList.jsx       ✅ NEW (list uploaded files)
│       ├── FilesManager.jsx    ✅ NEW (combines both)
│       └── index.js            ✅ NEW (exports)
│
└── pages/
    └── FilesPage.jsx           ✅ NEW (demo page)
```

---

## ⚡ Quick Install

### **1. Copy Files**

```bash
cd frontend

# Copy components
cp -r frontend-upload-package/components/files src/components/

# Copy demo page
cp frontend-upload-package/pages/FilesPage.jsx src/pages/
```

### **2. Add Route (if needed)**

In your `src/App.jsx` or router:

```javascript
import FilesPage from './pages/FilesPage';

// Add route
<Route path="/files" element={<FilesPage />} />
```

### **3. Set API URL**

In `.env`:
```
VITE_API_URL=http://localhost:3001/api/v1
```

---

## 🧪 Test It

### **Start Frontend:**
```bash
npm run dev
```

### **Navigate to:**
```
http://localhost:5173/files
```

---

## 🎯 How to Use

### **1. Drag & Drop Upload:**
- Drag PDF file onto upload area
- Or click "Select PDF File"
- Max file size: 500MB

### **2. Watch Progress:**
```
Step 1: Uploading to server... (0-100%)
   ↓
Step 2: Processing pages... (0-100%)
   ↓  
Step 3: Upload complete! ✅
```

### **3. View Files:**
- See all uploaded files below
- Shows status (Ready, Processing, etc.)
- Delete files with trash icon

---

## 📊 Component Usage

### **FileUpload Component**

```jsx
import { FileUpload } from '@/components/files';

function MyPage() {
  const handleComplete = (file) => {
    console.log('Upload done:', file);
  };

  return (
    <FileUpload 
      projectId="your-project-id"
      onUploadComplete={handleComplete}
    />
  );
}
```

### **FilesList Component**

```jsx
import { FilesList } from '@/components/files';

function MyPage() {
  return (
    <FilesList 
      projectId="your-project-id"
      refreshTrigger={0}  // Increment to refresh
    />
  );
}
```

### **FilesManager (All-in-One)**

```jsx
import { FilesManager } from '@/components/files';

function MyPage() {
  return (
    <FilesManager projectId="your-project-id" />
  );
}
```

---

## 🎨 Features

### **FileUpload Component:**
- ✅ Drag & drop support
- ✅ File type validation (PDF only)
- ✅ File size validation (500MB max)
- ✅ Real-time upload progress
- ✅ Processing status polling
- ✅ Error handling
- ✅ Cancel upload
- ✅ Success state

### **FilesList Component:**
- ✅ Lists all files for project
- ✅ Shows file status (badges)
- ✅ Processing progress bar
- ✅ File size and page count
- ✅ Relative timestamps
- ✅ Delete files
- ✅ Auto-refresh
- ✅ Empty state

---

## 🔄 Upload Flow

```
User selects PDF (135MB)
   ↓
FileUpload component:
├─ Validates file type (PDF only)
├─ Validates size (< 500MB)
├─ Shows upload progress bar
└─ Uploads to backend

Backend processes:
├─ Receives file
├─ Splits into pages
└─ Uploads to S3

Frontend polls status:
├─ Checks every 5 seconds
├─ Shows processing progress
└─ Updates when ready

FilesList refreshes:
└─ Shows new file ✅
```

---

## ⚙️ Configuration

### **Polling Interval:**

In `FileUpload.jsx`:
```javascript
// Poll every 5 seconds (default)
pollingInterval.current = setInterval(async () => {
  // Check status...
}, 5000);

// Change to 10 seconds:
}, 10000);
```

### **Max File Size:**

In `FileUpload.jsx`:
```javascript
// Current: 500MB
const maxSize = 500 * 1024 * 1024;

// Change to 1GB:
const maxSize = 1000 * 1024 * 1024;
```

### **API URL:**

In `.env`:
```bash
# Development
VITE_API_URL=http://localhost:3001/api/v1

# Production
VITE_API_URL=https://api.yourdomain.com/api/v1
```

---

## 🎯 Status States

| Status | Badge Color | Icon | Meaning |
|--------|-------------|------|---------|
| `ready` | Green | ✓ | File processed and ready |
| `processing` | Blue | ⟳ | Pages being split/uploaded |
| `uploading` | Yellow | ⏰ | Uploading to backend |
| `failed` | Red | ⚠ | Processing failed |

---

## 🐛 Troubleshooting

### **"Only PDF files are allowed"**
- Make sure file has .pdf extension
- File must be actual PDF (not renamed)

### **"File too large"**
- Current limit is 500MB
- Adjust maxSize in FileUpload.jsx

### **Upload stuck at "Processing"**
- Check backend logs
- Verify backend is running
- Check S3 credentials

### **Files list empty**
- Make sure project_id is correct
- Check browser console for errors
- Verify API_URL in .env

### **CORS errors**
- Backend must allow frontend origin
- Check backend CORS configuration

---

## 📸 UI Preview

### **Upload Area (Empty):**
```
┌────────────────────────────────────┐
│                                    │
│            📄                      │
│                                    │
│  Drop your PDF here, or click to  │
│            browse                  │
│                                    │
│   Maximum file size: 500MB         │
│                                    │
│     [ Select PDF File ]            │
│                                    │
└────────────────────────────────────┘
```

### **Uploading:**
```
┌────────────────────────────────────┐
│ 📄 blueprint.pdf         [X]       │
│    135.33 MB                       │
│                                    │
│ ⟳ Uploading to server...           │
│                                    │
│ Uploading                      75% │
│ ████████████████░░░░░░             │
└────────────────────────────────────┘
```

### **Processing:**
```
┌────────────────────────────────────┐
│ 📄 blueprint.pdf         [X]       │
│    135.33 MB                       │
│                                    │
│ ⟳ Processing pages...              │
│                                    │
│ Processing pages               34% │
│ ████████░░░░░░░░░░░░░              │
└────────────────────────────────────┘
```

### **Complete:**
```
┌────────────────────────────────────┐
│ 📄 blueprint.pdf                   │
│    135.33 MB                       │
│                                    │
│ ✓ Upload complete!                 │
│                                    │
│   [ Upload Another File ]          │
└────────────────────────────────────┘
```

### **Files List:**
```
Uploaded Files (2)

┌────────────────────────────────────┐
│ 📄 blueprint.pdf        [Ready] 🗑  │
│    166 pages • 135.33 MB           │
│    2 minutes ago                   │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ 📄 floor-plan.pdf    [Processing]  │
│    45 pages • 25.00 MB             │
│    Just now                        │
│                                    │
│ Processing pages...            67% │
│ ████████████████░░░░░░             │
└────────────────────────────────────┘
```

---

## ✅ Testing Checklist

- [ ] Upload small PDF (< 10MB)
- [ ] Upload large PDF (> 100MB)
- [ ] Drag & drop works
- [ ] File picker works
- [ ] Progress bar updates
- [ ] Status polling works
- [ ] Files list shows files
- [ ] Delete works
- [ ] Error handling works
- [ ] PDF validation works

---

## 🚀 Next: Add to Your App

### **Option 1: Standalone Page**
Use FilesPage.jsx as-is

### **Option 2: Integrate into Existing Page**
```jsx
import { FilesManager } from '@/components/files';

function ProjectDetail({ projectId }) {
  return (
    <div>
      <h1>Project Details</h1>
      
      {/* Add file upload section */}
      <FilesManager projectId={projectId} />
    </div>
  );
}
```

### **Option 3: Just Upload**
```jsx
import { FileUpload } from '@/components/files';

function QuickUpload() {
  return (
    <FileUpload 
      projectId="your-project-id"
      onUploadComplete={(file) => {
        console.log('Done!', file);
      }}
    />
  );
}
```

---

## 🎉 **Frontend Upload Complete!**

**What works:**
- ✅ Drag & drop PDF upload
- ✅ Real-time progress tracking
- ✅ Status polling
- ✅ Files list with status badges
- ✅ Delete files
- ✅ Error handling
- ✅ Responsive UI

**Ready to use!** 🚀

Test it with your 135MB PDF and watch it upload + process! 📄⚡
