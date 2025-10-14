import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import FilesPage from './pages/FilesPage';
import ExtractionFlow from './pages/ExtractionFlow';  // ← ADD THIS
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Redirect root to projects */}
          <Route path="/" element={<Navigate to="/projects" replace />} />

          {/* Projects routes */}
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />

          {/* Files & Extraction */}
          <Route path="/files" element={<FilesPage />} />
          <Route path="/extract" element={<ExtractionFlow />} />           {/* ← ADD THIS */}
          <Route path="/extract/:fileId" element={<ExtractionFlow />} />   {/* ← ADD THIS */}

          {/* Other routes */}
          <Route path="/estimates" element={<ComingSoon feature="Estimates" />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

// Placeholder components
function ComingSoon({ feature }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h2>{feature} - Coming Soon!</h2>
      <p style={{ color: 'var(--color-gray-500)', marginTop: '1rem' }}>
        This feature is under development.
      </p>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h2>404 - Page Not Found</h2>
      <p style={{ color: 'var(--color-gray-500)', marginTop: '1rem' }}>
        The page you're looking for doesn't exist.
      </p>
    </div>
  );
}

export default App;