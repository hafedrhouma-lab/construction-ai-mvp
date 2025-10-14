# 📁 QuickBids Frontend - Clean Structure

## ✅ Current Structure (Refactored)

```
quickbids-frontend/
├── public/                       # Static assets
│
├── src/
│   ├── components/              # ✅ Reusable UI components
│   │   │
│   │   ├── Layout/              # Main app layout
│   │   │   ├── index.js        # → export { default } from './Layout'
│   │   │   ├── Layout.jsx      # Sidebar + main content
│   │   │   └── Layout.css      # Layout styles
│   │   │
│   │   ├── CreateProjectModal/  # Project creation modal
│   │   │   ├── index.js
│   │   │   ├── CreateProjectModal.jsx
│   │   │   └── CreateProjectModal.css
│   │   │
│   │   └── common/              # 🔜 Shared components (future)
│   │       ├── Button/
│   │       │   ├── index.js
│   │       │   ├── Button.jsx
│   │       │   └── Button.css
│   │       │
│   │       ├── Modal/           # Reusable modal base
│   │       ├── Input/
│   │       ├── Badge/
│   │       └── Card/
│   │
│   ├── pages/                   # ✅ Page components
│   │   │
│   │   ├── ProjectsPage/        # Projects list
│   │   │   ├── index.js
│   │   │   ├── ProjectsPage.jsx
│   │   │   └── ProjectsPage.css
│   │   │
│   │   └── ProjectDetailPage/   # Project detail
│   │       ├── index.js
│   │       ├── ProjectDetailPage.jsx
│   │       ├── ProjectDetailPage.css
│   │       └── components/      # 🔜 Page-specific components
│   │           ├── FilesList.jsx
│   │           └── ProjectStats.jsx
│   │
│   ├── services/                # ✅ API & external services
│   │   └── api.js              # Axios + all API endpoints
│   │
│   ├── hooks/                   # 🔜 Custom React hooks
│   │   ├── useFileUpload.js
│   │   ├── useProjectData.js
│   │   └── useExtraction.js
│   │
│   ├── utils/                   # 🔜 Helper functions
│   │   ├── formatters.js       # Date, currency formatting
│   │   ├── validators.js       # Form validation
│   │   └── pdfHelpers.js       # PDF manipulation
│   │
│   ├── App.jsx                 # ✅ Main app + routing
│   ├── main.jsx                # ✅ Entry point
│   └── index.css               # ✅ Global styles
│
├── index.html                   # ✅ HTML template
├── vite.config.js              # ✅ Vite configuration
├── package.json                # ✅ Dependencies
└── README.md                   # ✅ Documentation
```

---

## 🎯 Component Pattern

Every component follows this structure:

```
ComponentName/
├── index.js                 # Clean export
├── ComponentName.jsx        # Main component logic
├── ComponentName.css        # Component styles
├── ComponentName.test.jsx   # Tests (when added)
├── SubComponent.jsx         # Related sub-components
└── utils.js                 # Component-specific helpers
```

---

## 📦 Import Examples

### ✅ With index.js (Clean)

```javascript
import Layout from './components/Layout';
import ProjectsPage from './pages/ProjectsPage';
import FileUpload from './components/FileUpload';
```

### ❌ Without index.js (Redundant)

```javascript
import Layout from './components/Layout/Layout';
import ProjectsPage from './pages/ProjectsPage/ProjectsPage';
import FileUpload from './components/FileUpload/FileUpload';
```

---

## 🔜 Future Components (Next Features)

### **Files Feature**

```
components/
├── FileUpload/              # 🔜 NEXT (2 hours)
│   ├── index.js
│   ├── FileUpload.jsx      # Drag & drop uploader
│   ├── FileUpload.css
│   ├── FileUploadProgress.jsx  # Progress bar
│   └── usePDFSplitter.js   # PDF splitting hook
│
└── FilesList/               # 🔜 NEXT (1 hour)
    ├── index.js
    ├── FilesList.jsx       # Files grid/list
    ├── FilesList.css
    ├── FileCard.jsx        # Individual file card
    └── PageThumbnail.jsx   # Page preview
```

### **Extraction Feature**

```
components/
├── ExtractionViewer/        # 🔜 Phase 3 (3 hours)
│   ├── index.js
│   ├── ExtractionViewer.jsx
│   ├── ExtractionViewer.css
│   ├── PDFPageViewer.jsx   # Page display
│   └── ItemsTable.jsx      # Extracted items
│
└── ItemEditor/              # 🔜 Phase 3 (2 hours)
    ├── index.js
    ├── ItemEditor.jsx      # Edit scope items
    ├── ItemEditor.css
    └── useItemCorrection.js  # Correction tracking
```

### **Estimates Feature**

```
components/
└── EstimateViewer/          # 🔜 Phase 4 (2 hours)
    ├── index.js
    ├── EstimateViewer.jsx  # Display estimate
    ├── EstimateViewer.css
    ├── LineItemsTable.jsx  # Detailed breakdown
    └── ExportButton.jsx    # Export to Excel/PDF
```

---

## 🎨 Styling Strategy

### **Global Styles** (`index.css`)
- CSS variables
- Typography
- Utility classes
- Reset/normalize

### **Component Styles** (`ComponentName.css`)
- Component-specific styles
- Use CSS variables
- BEM naming optional
- Scoped to component

### **Example:**

```css
/* index.css - Global */
:root {
  --color-primary: #3b82f6;
  --spacing-md: 1rem;
}

.btn {
  padding: var(--spacing-md);
  background: var(--color-primary);
}

/* FileUpload.css - Component */
.file-upload-container {
  border: 2px dashed var(--color-gray-300);
}

.file-upload-progress {
  height: 4px;
  background: var(--color-primary);
}
```

---

## 🔄 Development Workflow

### **Adding New Component**

```bash
# 1. Create folder
mkdir -p src/components/FileUpload

# 2. Create files
cd src/components/FileUpload
touch index.js FileUpload.jsx FileUpload.css

# 3. Add index.js
echo "export { default } from './FileUpload';" > index.js

# 4. Build component in FileUpload.jsx

# 5. Import cleanly
# import FileUpload from './components/FileUpload';
```

### **Adding New Page**

```bash
# 1. Create folder
mkdir -p src/pages/FilesPage

# 2. Create files
cd src/pages/FilesPage
touch index.js FilesPage.jsx FilesPage.css

# 3. Add to App.jsx routes
# <Route path="/files" element={<FilesPage />} />
```

---

## 📊 Size Guidelines

| Type | Max Lines | Action if Exceeded |
|------|-----------|-------------------|
| Component | 300 | Split into sub-components |
| Page | 400 | Extract to components |
| Service | 500 | Split by domain |
| Hook | 150 | One hook = one purpose |
| CSS file | 300 | Consider splitting |

---

## ✅ Benefits of This Structure

### **1. Scalability**
- ✅ 100+ components? No problem
- ✅ Each component isolated
- ✅ Easy to find files

### **2. Maintainability**
- ✅ Delete component = delete one folder
- ✅ Component + styles + tests together
- ✅ Clear dependencies

### **3. Developer Experience**
- ✅ Clean imports
- ✅ Obvious where things go
- ✅ Easy onboarding for new devs

### **4. Testing**
- ✅ Test files next to component
- ✅ Easy to mock dependencies
- ✅ Clear test scope

---

## 🚀 Next Steps

1. ✅ **Structure complete** - Refactored to folders
2. ⏳ **Build FileUpload** - Next component
3. ⏳ **Build FilesList** - Display files
4. ⏳ **Build ExtractionViewer** - AI extraction UI
5. ⏳ **Build EstimateViewer** - Final estimates

---

## 📝 Notes

- **index.js**: Always export default for clean imports
- **Naming**: Match folder name = component name
- **Colocate**: Keep related files together
- **Single Responsibility**: One component = one purpose
- **Reusable**: Common components in `components/common/`
- **Page-Specific**: Components used by one page stay in page folder

---

## 🎯 Current Status

```
✅ Structure refactored to component folders
✅ Clean imports working
✅ Ready for new features
✅ Professional, scalable architecture
```

**Next: Build FileUpload component!** 🔨
