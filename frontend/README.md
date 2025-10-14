# QuickBids Frontend

Modern React application with clean component folder structure.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
src/
├── components/              # Reusable components
│   ├── Layout/
│   │   ├── index.js        → export { default } from './Layout'
│   │   ├── Layout.jsx
│   │   └── Layout.css
│   │
│   ├── CreateProjectModal/
│   │   ├── index.js
│   │   ├── CreateProjectModal.jsx
│   │   └── CreateProjectModal.css
│   │
│   └── common/              # Shared UI components (future)
│       ├── Button/
│       ├── Input/
│       └── Modal/
│
├── pages/                   # Page components
│   ├── ProjectsPage/
│   │   ├── index.js
│   │   ├── ProjectsPage.jsx
│   │   └── ProjectsPage.css
│   │
│   └── ProjectDetailPage/
│       ├── index.js
│       ├── ProjectDetailPage.jsx
│       └── ProjectDetailPage.css
│
├── services/                # API & external services
│   └── api.js              → Axios instance + all API calls
│
├── hooks/                   # Custom React hooks (future)
│   └── useFileUpload.js
│
├── utils/                   # Helper functions (future)
│   └── formatters.js
│
├── App.jsx                 # Main app with routing
├── main.jsx                # Entry point
└── index.css               # Global styles
```

## 🎯 Component Structure Pattern

Each component/page follows this structure:

```
ComponentName/
├── index.js              → Clean export
├── ComponentName.jsx     → Main component
├── ComponentName.css     → Styles
├── ComponentName.test.jsx  → Tests (future)
└── SubComponent.jsx      → Related components
```

## 📦 Import Examples

Thanks to `index.js` files, imports are clean:

```javascript
// ✅ Clean imports
import Layout from './components/Layout';
import ProjectsPage from './pages/ProjectsPage';

// ❌ Without index.js (old way)
import Layout from './components/Layout/Layout';
import ProjectsPage from './pages/ProjectsPage/ProjectsPage';
```

## 🔌 API Integration

All API calls are centralized in `services/api.js`:

```javascript
import { projectsAPI, filesAPI, extractionAPI } from './services/api';

// Usage
const projects = await projectsAPI.getAll();
const project = await projectsAPI.getById(id);
await projectsAPI.create({ name: 'New Project' });
```

## 🎨 Styling

- **Global styles**: `src/index.css` (CSS variables, utilities)
- **Component styles**: Colocated with component (e.g., `Layout.css`)
- **Design system**: CSS variables in `:root` for consistency

### CSS Variables

```css
:root {
  --color-primary: #3b82f6;
  --color-success: #10b981;
  --spacing-md: 1rem;
  --radius-md: 0.5rem;
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

## 🧩 Adding New Components

### 1. Create folder structure
```bash
mkdir -p src/components/FileUpload
```

### 2. Create files
```
FileUpload/
├── index.js
├── FileUpload.jsx
└── FileUpload.css
```

### 3. Add index.js
```javascript
export { default } from './FileUpload';
```

### 4. Import cleanly
```javascript
import FileUpload from './components/FileUpload';
```

## 🔄 Development Workflow

### Frontend Only
```bash
npm run dev
# Opens http://localhost:3000
# Auto-proxies /api to localhost:3001
```

### With Backend
```bash
# Terminal 1: Backend
cd ../quickbids-backend
npm run dev

# Terminal 2: Frontend
npm run dev
```

## 🧪 Testing Components

```bash
# When you add tests:
npm run test

# Component test example:
# src/components/Layout/Layout.test.jsx
```

## 📱 Pages

- `/` - Redirects to `/projects`
- `/projects` - Projects list
- `/projects/:id` - Project detail
- `/files` - Files (coming soon)
- `/estimates` - Estimates (coming soon)

## 🎯 Next Features to Add

1. **FileUpload Component**
   - `src/components/FileUpload/`
   - Drag & drop
   - Progress tracking
   - PDF page splitting

2. **FilesList Component**
   - `src/components/FilesList/`
   - Display uploaded files
   - Page thumbnails
   - Status badges

3. **ExtractionViewer Component**
   - `src/components/ExtractionViewer/`
   - PDF page viewer
   - Item review table
   - Confirm/edit actions

## 🏗️ Best Practices

### Component Organization
- ✅ One component per folder
- ✅ Colocate styles with component
- ✅ Use index.js for clean imports
- ✅ Keep components focused (single responsibility)

### Naming Conventions
- Components: `PascalCase` (e.g., `FileUpload.jsx`)
- Files: Match component name
- Folders: Match component name
- CSS: Match component name

### File Size
- Components: < 300 lines (split if larger)
- Services: Grouped by domain (e.g., `projectsAPI`)
- Utils: Pure functions only

## 🚀 Production Build

```bash
# Build optimized bundle
npm run build

# Preview production build
npm run preview
```

## 📝 Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:3001/api/v1
```

Usage in code:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

## 🤝 Contributing

When adding new features:

1. Create component folder structure
2. Add index.js export
3. Colocate styles
4. Update this README if needed
5. Keep imports clean

## 📄 License

MIT
