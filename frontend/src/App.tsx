import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/theme.css';

import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './features/authentication/LoginPage';
import { RegisterPage } from './features/authentication/RegisterPage';
import { DashboardView } from './features/dashboard/DashboardView';
import { DatasetUploadView } from './features/dataset/DatasetUploadView';
import { DataCleaningView } from './features/cleaning/DataCleaningView';
import { CustomCalculatorView } from './features/calculator/CustomCalculatorView';
import { ProjectExplorerView } from './features/workspace/ProjectExplorerView';
import { AIAssistantView } from './features/assistant/AIAssistantView';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Workspace Routes */}
        <Route path="/workspace" element={<MainLayout />}>
          <Route index element={<Navigate to="/workspace/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardView />} />
          <Route path="upload" element={<DatasetUploadView />} />
          <Route path="cleaning" element={<DataCleaningView />} />
          <Route path="calculator" element={<CustomCalculatorView />} />
          <Route path="projects" element={<ProjectExplorerView />} />
          <Route path="assistant" element={<AIAssistantView />} />
          <Route 
            path="settings" 
            element={
              <div className="blyc-card p-4">
                <h5 className="fw-bold">User & Workspace Settings</h5>
                <p className="text-muted-blyc">Preferences, currency formatting, and security controls.</p>
              </div>
            } 
          />
        </Route>

        {/* Root Redirect */}
        <Route path="/" element={<Navigate to="/workspace/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/workspace/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
