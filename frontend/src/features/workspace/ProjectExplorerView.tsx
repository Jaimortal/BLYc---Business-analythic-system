import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderArchive, 
  UploadCloud, 
  Download, 
  Plus, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Layers,
  Database,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getActiveDataset, setActiveDataset, setActiveProject } from '../../utils/sessionStore';

interface ProjectSummary {
  id: string;
  name: string;
  recordsCount: number;
  columnsCount: number;
  createdAt: string;
  updatedAt: string;
}

export const ProjectExplorerView: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const json = await res.json();
        setProjects(json.data || []);
      }
    } catch {
      // offline / mock fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleExportProject = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/export`);
      if (!res.ok) throw new Error('Failed to export project');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.blyc.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatusMessage({ type: 'success', text: `Project "${name}" exported as portable .blyc.json file.` });
    } catch (err: any) {
      setStatusMessage({ type: 'danger', text: err.message || 'Error exporting project.' });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawJson = event.target?.result as string;
        const parsed = JSON.parse(rawJson);

        const res = await fetch('/api/projects/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed)
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setStatusMessage({ 
            type: 'success', 
            text: `Project "${data.data.project.name}" imported and verified with fresh calculations!` 
          });
          
          if (data.data.dataset?.records) {
            setActiveDataset(data.data.dataset.records);
            setActiveProject({
              id: data.data.project.id,
              name: data.data.project.name
            });
          }

          fetchProjects();
        } else {
          setStatusMessage({ 
            type: 'danger', 
            text: data.errors ? `Validation Error: ${data.errors.join(' | ')}` : (data.message || 'Import failed.') 
          });
        }
      } catch (err: any) {
        setStatusMessage({ type: 'danger', text: `Failed to parse project file: ${err.message}` });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleOpenProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Failed to retrieve project details');

      const json = await res.json();
      const manifest = json.data;

      if (manifest?.dataset?.records) {
        setActiveDataset(manifest.dataset.records);
      }
      setActiveProject({
        id: manifest.project.id,
        name: manifest.project.name
      });

      navigate('/workspace/dashboard');
    } catch (err: any) {
      setStatusMessage({ type: 'danger', text: err.message || 'Error opening project.' });
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete project "${name}"?`)) return;

    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(projects.filter(p => p.id !== id));
        setStatusMessage({ type: 'success', text: `Project "${name}" deleted.` });
      } else {
        throw new Error('Failed to delete project.');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'danger', text: err.message || 'Error deleting project.' });
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      let records: any[] = [];
      let columns: any[] = [];
      try {
        const stored = getActiveDataset();
        if (stored && stored.length > 0) {
          records = stored;
          columns = Object.keys(stored[0]).map(k => ({
            name: k,
            data_type: typeof stored[0][k] === 'number' ? 'numeric' : 'string'
          }));
        }
      } catch {
        // ignore
      }

      if (records.length === 0) {
        records = [
          { Product: 'Sample Item A', Price: 29.99, Quantity: 10 },
          { Product: 'Sample Item B', Price: 49.99, Quantity: 5 }
        ];
        columns = [
          { name: 'Product', data_type: 'string' },
          { name: 'Price', data_type: 'numeric' },
          { name: 'Quantity', data_type: 'numeric' }
        ];
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          dataset: { records, columns }
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setIsCreating(false);
        setNewProjectName('');
        setStatusMessage({ type: 'success', text: `Project "${newProjectName}" created successfully!` });
        fetchProjects();
      } else {
        throw new Error(json.message || 'Creation failed');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'danger', text: err.message || 'Error creating project.' });
    }
  };

  return (
    <div className="workspace-page d-flex flex-column gap-4">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div>
          <h4 className="page-heading fw-bold mb-1 text-dark">
            Project Explorer & Portable Manifests
          </h4>
          <p className="text-muted-blyc mb-0" style={{ fontSize: '0.85rem' }}>
            Manage, export, and import complete self-contained projects using the standardized .blyc.json specification.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json,.blyc.json"
            onChange={handleFileChange}
          />

          <button
            className="btn btn-sm btn-blyc-outline d-flex align-items-center gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? <RefreshCw size={14} className="spin" /> : <UploadCloud size={15} />}
            <span>Import .blyc.json</span>
          </button>

          <button
            className="btn btn-sm btn-blyc-primary d-flex align-items-center gap-2"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={15} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div className={`alert alert-${statusMessage.type} d-flex align-items-center gap-2 mb-0 py-2 rounded-3 border`} role="alert">
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <div className="small">{statusMessage.text}</div>
        </div>
      )}

      {/* Create Project Modal / Drawer */}
      {isCreating && (
        <form onSubmit={handleCreateProject} className="blyc-card p-4 bg-white border">
          <h6 className="fw-bold mb-2 text-dark d-flex align-items-center gap-2">
            <Plus size={16} className="text-primary" />
            <span>Create New Analytics Project</span>
          </h6>
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-8">
              <label className="form-label small text-muted-blyc mb-1">Project Name</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Q1 Retail Financials, Inventory Audit"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                required
              />
            </div>
            <div className="col-12 col-md-4 d-flex gap-2">
              <button type="submit" className="btn btn-sm btn-blyc-primary flex-fill">
                Save & Initialize
              </button>
              <button 
                type="button" 
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Projects Grid */}
      {isLoading ? (
        <div className="p-5 text-center text-muted-blyc">
          <RefreshCw size={24} className="spin mb-2 text-primary" />
          <p className="small mb-0">Loading saved projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="blyc-card p-5 text-center">
          <div className="p-3 rounded-circle d-inline-flex mb-3 bg-light text-primary">
            <FolderArchive size={36} />
          </div>
          <h5 className="fw-bold text-dark">No Projects Initialized</h5>
          <p className="text-muted-blyc small mb-4" style={{ maxWidth: '400px', margin: '0 auto' }}>
            Create your first analytics project or import a portable <code>.blyc.json</code> file to get started.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <button
              className="btn btn-sm btn-blyc-outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Import .blyc.json
            </button>
            <button
              className="btn btn-sm btn-blyc-primary"
              onClick={() => setIsCreating(true)}
            >
              New Project
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {projects.map((proj) => (
            <div key={proj.id} className="col-12 col-md-6 col-xl-4">
              <div className="blyc-card p-4 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge-pill badge-pill-info">
                      BLYc v1.0
                    </span>
                    <button
                      className="btn btn-sm btn-link text-danger p-0 opacity-75 hover-opacity-100"
                      title="Delete Project"
                      onClick={() => handleDeleteProject(proj.id, proj.name)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <h5 className="fw-bold mb-2 text-dark text-truncate" title={proj.name}>
                    {proj.name}
                  </h5>

                  <div className="d-flex flex-column gap-2 text-muted-blyc small mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <Database size={13} className="text-primary" />
                      <span className="tabular-nums">{proj.recordsCount.toLocaleString()} Verified Records</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Layers size={13} className="text-secondary" />
                      <span className="tabular-nums">{proj.columnsCount} Active Columns</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Calendar size={13} />
                      <span>Updated {new Date(proj.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2 pt-3 border-top">
                  <button
                    className="btn btn-sm btn-blyc-primary flex-fill d-flex align-items-center justify-content-center gap-2"
                    onClick={() => handleOpenProject(proj.id)}
                  >
                    <FolderOpen size={14} />
                    <span>Open Project</span>
                  </button>
                  <button
                    className="btn btn-sm btn-blyc-outline d-flex align-items-center justify-content-center gap-1"
                    title="Export portable .blyc.json"
                    onClick={() => handleExportProject(proj.id, proj.name)}
                  >
                    <Download size={14} />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
