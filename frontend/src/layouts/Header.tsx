import React, { useState, useEffect } from 'react';
import { Menu, FolderArchive, DownloadCloud, Sparkles, RotateCcw, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActionAlt } from '../components/ActionAlt';
import { getActiveProject, clearTabSession } from '../utils/sessionStore';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  projectName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar
}) => {
  const navigate = useNavigate();
  const [activeProject, setActiveProject] = useState<{ id: string; name: string } | null>(null);

  const syncProject = () => {
    setActiveProject(getActiveProject());
  };

  useEffect(() => {
    syncProject();
    window.addEventListener('blyc_dataset_updated', syncProject);
    return () => {
      window.removeEventListener('blyc_dataset_updated', syncProject);
    };
  }, []);

  const handleResetSession = () => {
    if (window.confirm('Reset current tab session? This will clear the active dataset in this tab.')) {
      clearTabSession();
      navigate('/workspace/upload');
    }
  };

  return (
    <header 
      className="glass-header d-flex align-items-center justify-content-between px-3 px-md-4 sticky-top"
      style={{ height: '64px', zIndex: 1020 }}
    >
      <div className="d-flex align-items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          className="btn btn-sm d-md-none p-1 text-dark"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle Navigation"
        >
          <Menu size={22} />
        </button>

        {/* Active Project Breadcrumb Pill */}
        {activeProject ? (
          <div className="d-flex align-items-center gap-2">
            <div 
              className="d-flex align-items-center gap-2 p-1 pe-3 rounded-pill bg-white border shadow-xs"
              style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
              onClick={() => navigate('/workspace/projects')}
              title="Click to view Project Explorer"
            >
              <div className="p-1 px-2 rounded-pill bg-light text-primary d-flex align-items-center gap-1">
                <FolderArchive size={14} />
                <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>PROJECT</span>
              </div>
              <span className="fw-semibold text-truncate text-dark" style={{ maxWidth: '240px', fontSize: '0.85rem' }}>
                {activeProject.name}
              </span>
              <span className="badge-pill badge-pill-info d-none d-sm-inline-flex" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                Active
              </span>
            </div>

            <button
              className="btn btn-sm btn-link text-muted-blyc p-1"
              onClick={handleResetSession}
              title="Reset current tab session (Clear dataset)"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        ) : (
          <div 
            className="d-flex align-items-center gap-2 p-1 pe-3 rounded-pill bg-white border shadow-xs"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/workspace/upload')}
            title="Upload a dataset to start"
          >
            <div className="p-1 px-2 rounded-pill bg-light text-secondary d-flex align-items-center gap-1">
              <Plus size={14} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>WORKSPACE</span>
            </div>
            <span className="text-muted-blyc" style={{ fontSize: '0.85rem' }}>
              No Active Dataset
            </span>
            <span className="badge-pill badge-pill-neutral d-none d-sm-inline-flex" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
              Fresh Tab
            </span>
          </div>
        )}
      </div>

      {/* Header Actions */}
      <div className="d-flex align-items-center gap-2">
        <ActionAlt description="View, manage, export, or switch between saved workspace projects." placement="bottom" align="right" className="d-none d-sm-inline-flex">
          <button 
            className="btn btn-sm btn-blyc-outline d-flex align-items-center gap-2"
            onClick={() => navigate('/workspace/projects')}
          >
            <DownloadCloud size={15} />
            <span>Projects</span>
          </button>
        </ActionAlt>

        <ActionAlt description="Open AI Business Advisor for verified analytics summaries and growth advice." placement="bottom" align="right" className="d-none d-md-inline-flex">
          <button 
            className="btn btn-sm btn-blyc-gradient d-flex align-items-center gap-1"
            onClick={() => navigate('/workspace/assistant')}
          >
            <Sparkles size={14} />
            <span>Ask Assistant</span>
          </button>
        </ActionAlt>
      </div>
    </header>
  );
};
