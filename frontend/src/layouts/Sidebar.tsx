import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Sparkles, 
  Calculator, 
  Bot, 
  FolderKanban, 
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { BrandMark } from '../components/BrandMark';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed,
  onToggleCollapse,
  onCloseMobile
}) => {
  const navItems = [
    { name: 'Dashboard', path: '/workspace/dashboard', icon: LayoutDashboard },
    { name: 'Dataset Upload', path: '/workspace/upload', icon: UploadCloud },
    { name: 'Data Quality & Clean', path: '/workspace/cleaning', icon: Sparkles },
    { name: 'Custom Calculator', path: '/workspace/calculator', icon: Calculator },
    { name: 'AI Business Advisor', path: '/workspace/assistant', icon: Bot },
    { name: 'Project Explorer', path: '/workspace/projects', icon: FolderKanban },
  ];

  return (
    <aside
      className={`blyc-sidebar d-flex flex-column text-white position-fixed top-0 start-0 bottom-0 ${isOpen ? 'open' : ''}`}
      style={{
        width: isCollapsed ? '76px' : '272px',
        transition: 'width 0.2s ease, left 0.3s ease',
        zIndex: 1040,
        borderRight: '1px solid rgba(255, 255, 255, 0.07)'
      }}
    >
      {/* Brand Header */}
      <div 
        className="d-flex align-items-center justify-content-between px-3 border-bottom"
        style={{ height: '72px', borderColor: 'rgba(255, 255, 255, 0.07)' }}
      >
        {!isCollapsed && <BrandMark variant="light" size="sm" />}
        {isCollapsed && (
          <span className="fw-bold text-white fs-5 mx-auto">
            B<span style={{ color: '#38BDF8' }}>c</span>
          </span>
        )}

        <button 
          className="btn btn-sm text-white d-none d-md-flex align-items-center p-1 rounded"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ background: 'rgba(255, 255, 255, 0.05)', border: 'none' }}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-grow-1 py-3 px-2 overflow-auto">
        <div className="px-2 mb-2 d-none d-md-block">
          {!isCollapsed && (
            <span className="text-uppercase fw-bold" style={{ fontSize: '0.68rem', letterSpacing: '0.08em', color: '#64748B' }}>
              Platform Modules
            </span>
          )}
        </div>
        <ul className="nav flex-column gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path} className="nav-item">
                <NavLink
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `nav-link workspace-nav-link d-flex align-items-center px-3 py-2 rounded text-white ${
                      isActive ? 'fw-semibold' : 'opacity-75 hover-opacity-100'
                    }`
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                    borderLeft: isActive ? '3px solid #38BDF8' : '3px solid transparent',
                    color: isActive ? '#38BDF8' : '#94A3B8',
                    transition: 'all 0.15s ease'
                  })}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon size={18} className={isCollapsed ? 'mx-auto' : 'me-3'} />
                  {!isCollapsed && <span style={{ fontSize: '0.875rem' }}>{item.name}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar Footer with Engine Health */}
      <div 
        className="p-3 border-top"
        style={{ borderColor: 'rgba(255, 255, 255, 0.07)' }}
      >
        {!isCollapsed ? (
          <div className="d-flex align-items-center justify-content-between p-2 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
            <div className="d-flex align-items-center gap-2">
              <span className="pulse-dot"></span>
              <div className="d-flex flex-column">
                <span className="fw-semibold text-white" style={{ fontSize: '0.75rem' }}>Python 3 Engine</span>
                <span style={{ fontSize: '0.68rem', color: '#64748B' }}>127.0.0.1:8001</span>
              </div>
            </div>
            <ShieldCheck size={15} className="text-success" />
          </div>
        ) : (
          <div className="text-center py-1" title="Python Engine Active">
            <span className="pulse-dot mx-auto"></span>
          </div>
        )}
      </div>
    </aside>
  );
};
