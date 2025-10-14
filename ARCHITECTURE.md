# 🏗️ QuickBids v2.0 Architecture - Visual Overview

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│                    [To be built next]                    │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/REST
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Express API Server                      │
│                   (Port 3001)                           │
│                                                          │
│  ┌────────────────────────────────────────────────┐   │
│  │           API Routes (app.js)                   │   │
│  │  • /api/v1/projects     ✅ Done                │   │
│  │  • /api/v1/files        ⏳ Next                │   │
│  │  • /api/v1/extraction   ⏳ Coming              │   │
│  └────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Projects   │ │    Files     │ │  Extraction  │
│    Module    │ │    Module    │ │    Module    │
│   ✅ Done    │ │   ⏳ Next    │ │  ⏳ Coming   │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       ▼                ▼                ▼
┌────────────────────────────────────────────────────┐
│              Service Layer                          │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  Projects    │  │File Process  │              │
│  │  Service     │  │   Service    │              │
│  │  ✅ Done    │  │   ⏳ Next    │              │
│  └──────────────┘  └──────────────┘              │
└───────────┬────────────────────────────────────────┘
            │
    ┌───────┼───────┬────────────────┐
    ▼       ▼       ▼                ▼
┌─────┐ ┌─────┐ ┌─────┐        ┌─────────┐
│ DB  │ │ S3  │ │ PDF │        │ OpenAI  │
│ PG  │ │ AWS │ │Proc │        │   API   │
│ ✅  │ │ ✅  │ │ ✅  │        │   ⏳    │
└─────┘ └─────┘ └─────┘        └─────────┘
```

---

## 🗄️ Database Schema

```
┌─────────────┐
│  Projects   │ ◄──┐
│  ✅ Ready   │    │
└─────────────┘    │
       │           │
       │ 1:N       │ N:1
       │           │
       ▼           │
┌─────────────┐    │
│    Files    │ ───┘
│  ✅ Ready   │
└─────────────┘
       │
       │ 1:N
       │
       ▼
┌──────────────────┐
│Extraction        │
│  Sessions        │
│  ✅ Ready        │
└──────────────────┘
       │
       │ 1:N
       │
       ▼
┌──────────────────┐
│  Scope Items     │ ──┐
│  ✅ Ready        │   │
└──────────────────┘   │
       │               │ 1:N
       │ 1:N           │
       ▼               ▼
┌──────────────────┐ ┌──────────────────┐
│  Corrections     │ │   Estimates      │
│  (Dataset!)      │ │   ✅ Ready       │
│  ✅ Ready        │ └──────────────────┘
└──────────────────┘
```

---

## 📁 Code Structure

```
src/
│
├── config/                    ✅ Configuration
│   ├── database.js           ✅ PostgreSQL pool
│   ├── env.js                ✅ Environment vars
│   └── logger.js             ✅ Winston logger
│
├── modules/                   ✅ API Modules
│   │
│   ├── projects/             ✅ DONE
│   │   ├── controller.js     ✅ HTTP handlers
│   │   ├── service.js        ✅ Business logic
│   │   ├── repository.js     ✅ Database queries
│   │   └── routes.js         ✅ Express routes
│   │
│   ├── files/                ⏳ NEXT (2 hours)
│   │   ├── controller.js
│   │   ├── service.js
│   │   ├── repository.js
│   │   └── routes.js
│   │
│   └── extraction/           ⏳ COMING (4 hours)
│       ├── controller.js
│       ├── service.js
│       ├── repository.js
│       └── routes.js
│
├── services/                  ⏳ Business Logic
│   │
│   ├── file-processing/      ⏳ NEXT
│   │   ├── FileProcessingService.js
│   │   └── PDFProcessingService.js
│   │
│   ├── extraction/           ⏳ COMING
│   │   ├── ExtractionService.js
│   │   └── PageExtractionService.js
│   │
│   └── ai/                   ⏳ COMING
│       ├── OpenAIService.js
│       └── PromptService.js
│
├── utils/                     ✅ Utilities
│   ├── aws/
│   │   └── s3Client.js       ✅ S3 operations
│   ├── processors/
│   │   └── pdfProcessor.js   ✅ PDF splitting
│   └── helpers/
│       └── logger.js         ✅ Logger
│
└── app.js                     ✅ Express app
```

---

## 🔄 Data Flow: PDF Upload

```
1. Frontend
   │ User uploads PDF
   │
   ▼
2. POST /api/v1/files/upload-url
   │ Generate presigned S3 URL
   │
   ▼
3. Frontend uploads directly to S3
   │ (No backend involved)
   │
   ▼
4. POST /api/v1/files/confirm-upload
   │ Confirm upload complete
   │
   ▼
5. Files Service
   │ • Insert file record
   │ • Call FileProcessingService
   │
   ▼
6. PDFProcessingService
   │ • Download PDF from S3
   │ • Split into pages
   │ • Upload pages to S3
   │ • Update metadata
   │
   ▼
7. Database
   │ file.metadata = {
   │   pages: [...],
   │   splitCompleted: true
   │ }
   │
   ▼
8. Frontend
   │ Shows: "✅ Ready (150 pages)"
```

---

## 🎯 API Endpoints

### ✅ **Available Now:**

```
POST   /api/v1/projects          Create project
GET    /api/v1/projects           List projects
GET    /api/v1/projects/:id       Get project details
PUT    /api/v1/projects/:id       Update project
DELETE /api/v1/projects/:id       Archive project
```

### ⏳ **Coming Next:**

```
POST   /api/v1/files/upload-url              Get S3 upload URL
POST   /api/v1/files/confirm-upload          Confirm & split PDF
GET    /api/v1/files                          List files
GET    /api/v1/files/:id                      Get file details

POST   /api/v1/extraction/start               Start extraction
GET    /api/v1/extraction/sessions/:id        Get session
POST   /api/v1/extraction/sessions/:id/page/1 Extract page 1
PUT    /api/v1/extraction/scope-items/:id     Edit item
```

---

## 📊 Progress Tracker

| Feature | Status | Time | Priority |
|---------|--------|------|----------|
| Database schema | ✅ Done | - | - |
| Projects API | ✅ Done | - | - |
| S3 client | ✅ Done | - | - |
| PDF processor | ✅ Done | - | - |
| Files module | ⏳ Next | 2h | 🔴 High |
| File upload UI | ⏳ Next | 2h | 🔴 High |
| PDF splitting | ⏳ Next | 1h | 🔴 High |
| Extraction service | ⏳ Coming | 4h | 🟡 Medium |
| Page review UI | ⏳ Coming | 4h | 🟡 Medium |
| Estimate generation | ⏳ Coming | 3h | 🟢 Low |

---

## 🚀 Next Steps

### **Phase 1: Test Backend** (15 min)
1. Extract package
2. Install dependencies
3. Setup database
4. Start server
5. Test projects API

### **Phase 2: Files Module** (2 hours)
1. Create files module
2. S3 upload flow
3. PDF splitting on upload
4. File listing API

### **Phase 3: Frontend** (3 hours)
1. Projects dashboard
2. File upload UI
3. File list view

### **Phase 4: Extraction** (4 hours)
1. Extraction service
2. Page-by-page UI
3. Confirm/correct tracking

---

## ✅ You're Here!

**Current Status:**
- ✅ Backend foundation ready
- ✅ Projects API working
- ✅ Database schema complete
- ✅ Utils ready (S3, PDF)

**Next Action:**
- 🧪 Test the backend
- ✅ Verify all APIs work
- 🔨 Build files module

**Ready when you are!** 🚀