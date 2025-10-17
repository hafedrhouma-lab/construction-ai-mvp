# Frontend Quick Guide

## Setup

### Prerequisites
- Node.js 18+
- Backend running on :3001

### Installation

**1. Install Dependencies**
```bash
cd frontend
npm install
```

**2. Configure Environment**
```bash
cp .env.example .env
nano .env
```

**Required:**
```bash
VITE_API_URL=http://localhost:3001/api/v1
```

**Production:**
```bash
VITE_API_URL=https://api.yourdomain.com/api/v1
```

**3. Start Development Server**
```bash
npm run dev
```

**Access:** `http://localhost:5173`

**4. Build for Production**
```bash
npm run build
```

**Output:** `dist/` folder

---

## Project Structure
```
frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── Layout/
│   │   │   ├── Layout.jsx
│   │   │   ├── Layout.css
│   │   │   └── index.js
│   │   ├── extraction/
│   │   │   ├── FileSelector.jsx
│   │   │   ├── PageNavigator.jsx
│   │   │   ├── LineItemsTable.jsx
│   │   │   ├── EstimatePanel.jsx
│   │   │   └── preview/
│   │   │       └── PdfPreview.jsx
│   │   └── files/
│   │       ├── FileUpload.jsx
│   │       ├── FilesList.jsx
│   │       └── FilesManager.jsx
│   │
│   ├── pages/              # Route components
│   │   ├── ProjectsPage/
│   │   ├── ProjectDetailPage/
│   │   ├── FilesPage/
│   │   ├── ExtractionFlow.jsx
│   │   └── Demo.jsx
│   │
│   ├── services/           # API integration
│   │   └── api.js
│   │
│   ├── api/               # API helpers
│   │   └── extractions.js
│   │
│   ├── App.jsx            # Main app + routing
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
│
├── public/                # Static assets
├── .env                   # Environment (not in git)
├── .env.example           # Template
├── index.html
├── vite.config.js
└── package.json
```

---

## Component Pattern

Every component follows this structure:
```
ComponentName/
├── index.js              # Clean export
├── ComponentName.jsx     # Main component
└── ComponentName.css     # Styles
```

**Example:**
```javascript
// index.js
export { default } from './FileUpload';

// FileUpload.jsx
import './FileUpload.css';

export default function FileUpload({ projectId, onUploadComplete }) {
  return <div className="file-upload">...</div>;
}

// Usage
import FileUpload from './components/FileUpload';
```

---

## Routing

**App.jsx using React Router:**
```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProjectsPage from './pages/ProjectsPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/projects" />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/extract" element={<ExtractionFlow />} />
          <Route path="/extract/:fileId" element={<ExtractionFlow />} />
          <Route path="/demo" element={<Demo />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
```

**Navigation:**
```javascript
import { Link, useNavigate } from 'react-router-dom';

// Link
<Link to="/projects">Projects</Link>

// Programmatic
const navigate = useNavigate();
navigate('/projects/123');

// URL params
import { useParams } from 'react-router-dom';
const { id } = useParams();

// Query params
import { useSearchParams } from 'react-router-dom';
const [searchParams] = useSearchParams();
const fileId = searchParams.get('fileId');
```

---

## API Integration

**services/api.js - Axios wrapper:**
```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Projects API
export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`)
};

// Files API
export const filesAPI = {
  getByProject: (projectId, params) => 
    api.get('/files', { params: { project_id: projectId, ...params } }),
  getById: (id) => api.get(`/files/${id}`),
  delete: (id) => api.delete(`/files/${id}`)
};

export default api;
```

**Usage in components:**
```javascript
import { projectsAPI } from '../services/api';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {projects.map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

---

## File Upload

**FileUpload.jsx with progress:**
```javascript
import { useState } from 'react';
import axios from 'axios';

export default function FileUpload({ projectId, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);
    formData.append('topics', JSON.stringify(['striping', 'crosswalks']));

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/files/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percent);
          }
        }
      );
      
      onUploadComplete(response.data);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" accept=".pdf" onChange={handleFileSelect} />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? `Uploading... ${progress}%` : 'Upload'}
      </button>
      {uploading && (
        <div style={{ width: '100%', background: '#eee' }}>
          <div style={{ 
            width: `${progress}%`, 
            background: '#3b82f6', 
            height: '4px' 
          }} />
        </div>
      )}
    </div>
  );
}
```

---

## Status Polling

**Poll until file processing complete:**
```javascript
function FilesList({ projectId }) {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    loadFiles();
    const interval = setInterval(loadFiles, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [projectId]);

  const loadFiles = async () => {
    const response = await filesAPI.getByProject(projectId);
    setFiles(response.data);
  };

  return (
    <div>
      {files.map(file => (
        <div key={file.id}>
          {file.original_filename}
          <span>{file.status}</span>
        </div>
      ))}
    </div>
  );
}
```

**Or poll single file:**
```javascript
useEffect(() => {
  if (fileId && status === 'processing') {
    const interval = setInterval(async () => {
      const response = await filesAPI.getById(fileId);
      const file = response.data;
      
      if (file.status === 'ready') {
        clearInterval(interval);
        onComplete(file);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }
}, [fileId, status]);
```

---

## State Management

**Use React hooks (no Redux/Context):**
```javascript
import { useState, useEffect } from 'react';

// Local state
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// Side effects
useEffect(() => {
  loadData();
}, [dependency]);

// Props drilling
function Parent() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  return (
    <>
      <FileUpload onComplete={() => setRefreshTrigger(prev => prev + 1)} />
      <FilesList refreshTrigger={refreshTrigger} />
    </>
  );
}
```

---

## Styling

**Global styles in index.css:**
```css
:root {
  --color-primary: #3b82f6;
  --color-success: #10b981;
  --color-error: #ef4444;
  --spacing-md: 1rem;
  --radius-md: 0.5rem;
}

.btn {
  padding: var(--spacing-md);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}
```

**Component styles:**
```css
/* FileUpload.css */
.file-upload {
  padding: 2rem;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
}

.file-upload:hover {
  border-color: var(--color-primary);
  background: #f9fafb;
}
```

---

## Key Components

**Layout.jsx** - App shell:
- Sidebar navigation
- Main content area
- User info footer

**FileUpload.jsx:**
- Drag & drop
- Progress bar
- Topic selection
- Status polling

**LineItemsTable.jsx:**
- Display extracted items
- Inline editing
- Delta tracking display
- Confirm/delete actions

**PageNavigator.jsx:**
- Navigate through relevant pages
- Show page X of Y
- Prev/Next buttons

**PdfPreview.jsx:**
- Lazy loading (click to load)
- Full modal view
- Zoom/rotate controls

---

## Common Patterns

**1. Loading State**
```javascript
if (loading) return <div className="loading">Loading...</div>;
if (error) return <div className="error">Error: {error}</div>;
return <div>{data}</div>;
```

**2. List Rendering**
```javascript
{items.map(item => (
  <div key={item.id}>{item.name}</div>
))}
```

**3. Conditional Rendering**
```javascript
{isVisible && <Component />}
{condition ? <TrueComponent /> : <FalseComponent />}
```

**4. Event Handling**
```javascript
<button onClick={handleClick}>Click</button>
<input onChange={(e) => setValue(e.target.value)} />
```

**5. Form Handling**
```javascript
const [formData, setFormData] = useState({ name: '', email: '' });

const handleSubmit = async (e) => {
  e.preventDefault();
  await api.post('/endpoint', formData);
};

<form onSubmit={handleSubmit}>
  <input 
    value={formData.name} 
    onChange={(e) => setFormData({...formData, name: e.target.value})} 
  />
</form>
```

---

## Environment Variables

**Access with import.meta.env:**
```javascript
const API_URL = import.meta.env.VITE_API_URL;
const ENV = import.meta.env.MODE; // development or production
```

**Note:** All Vite env vars must start with `VITE_`

---

## Build & Deploy

**Development:**
```bash
npm run dev
```

**Production build:**
```bash
npm run build
```

**Output:** `dist/` folder containing:
- index.html
- assets/index-[hash].js
- assets/index-[hash].css

**Deploy to S3:**
```bash
aws s3 sync dist/ s3://quickbids-app --delete
```

**Preview build locally:**
```bash
npm run preview
```

---

## Debugging

**React DevTools:**
- Install browser extension
- Inspect component tree
- View props/state

**Console logging:**
```javascript
console.log('📤 Uploading:', file.name);
console.log('✅ Success:', response.data);
console.error('❌ Error:', error);
```

**Network tab:**
- Monitor API calls
- Check request/response
- Verify status codes

---

## Common Issues

**1. CORS errors**
- Backend must allow frontend origin
- Check backend CORS configuration

**2. API 404**
- Verify `VITE_API_URL` in `.env`
- Check backend is running
- Verify endpoint paths

**3. File upload fails**
- Check file size limit (500MB)
- Verify multipart/form-data headers
- Check backend multer configuration

**4. State not updating**
- Remember setState is async
- Use functional updates: `setState(prev => prev + 1)`
- Check dependencies in useEffect

**5. Infinite loop**
- Missing dependencies in useEffect
- setState inside render
- Add proper dependency array

---

## Performance Tips

**1. Lazy load images**
```javascript
// Only load when user clicks "Load Preview"
```

**2. Debounce search**
```javascript
import { debounce } from 'lodash';
const handleSearch = debounce(searchFunction, 300);
```

**3. Memoize expensive calculations**
```javascript
import { useMemo } from 'react';
const total = useMemo(() => 
  items.reduce((sum, item) => sum + item.price, 0),
  [items]
);
```

**4. Lazy load routes**
```javascript
const Demo = React.lazy(() => import('./pages/Demo'));
<Suspense fallback={<Loading />}>
  <Route path="/demo" element={<Demo />} />
</Suspense>
```

---

## Development Commands
```bash
npm run dev         # Start dev server
npm run build       # Production build
npm run preview     # Preview build
npm run lint        # Run linter (if configured)
```

---

**Last Updated:** October 2025  
**Version:** 1.0.0