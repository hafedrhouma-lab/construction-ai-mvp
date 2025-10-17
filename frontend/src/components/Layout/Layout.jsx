import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, FolderKanban, DollarSign, Sparkles } from 'lucide-react';  // ← Add Sparkles
import './Layout.css';

function Layout({ children }) {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">QuickBids</h1>
          <p className="tagline">AI Extraction Platform</p>
        </div>

        <nav className="sidebar-nav">
          <Link
            to="/projects"
            className={`nav-item ${isActive('/projects') ? 'active' : ''}`}
          >
            <FolderKanban size={20} />
            <span>Projects</span>
          </Link>

          <Link
            to="/files"
            className={`nav-item ${isActive('/files') ? 'active' : ''}`}
          >
            <FileText size={20} />
            <span>Files</span>
          </Link>

          <Link
            to="/estimates"
            className={`nav-item ${isActive('/estimates') ? 'active' : ''}`}
          >
            <DollarSign size={20} />
            <span>Estimates</span>
          </Link>

          {/* NEW DEMO LINK */}
          <Link
            to="/demo"
            className={`nav-item ${isActive('/demo') ? 'active' : ''}`}
          >
            <Sparkles size={20} />
            <span>AI Demo Chat</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">D</div>
            <div>
              <div className="user-name">Demo User</div>
              <div className="user-email">demo@quickbids.com</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;