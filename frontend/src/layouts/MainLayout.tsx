import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const MainLayout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* Sidebar Navigation */}
      <Sidebar 
        isOpen={isMobileOpen}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Backdrop for Mobile */}
      {isMobileOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark opacity-50 d-md-none"
          style={{ zIndex: 1030 }}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main App Canvas */}
      <div 
        className="workspace-canvas d-flex flex-column flex-grow-1"
        style={{
          marginLeft: isCollapsed ? '76px' : '272px',
          transition: 'margin-left 0.2s ease',
          minWidth: 0
        }}
      >
        <Header 
          onToggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
        />

        <main className="workspace-main flex-grow-1 p-3 p-md-4" style={{ minWidth: 0 }}>
          <div className="container-fluid px-0" style={{ maxWidth: '1680px', marginInline: 'auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
