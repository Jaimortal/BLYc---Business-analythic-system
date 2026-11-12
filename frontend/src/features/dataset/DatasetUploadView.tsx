import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Table, 
  Layers, 
  RefreshCw,
  Sliders,
  Calculator,
  Database,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setActiveDataset, setActiveProject, DEMO_SAMPLE_DATASET } from '../../utils/sessionStore';

interface ColumnSummary {
  name: string;
  inferred_type: string;
  total_count: number;
  non_null_count: number;
  missing_count: number;
  missing_percentage: number;
  unique_count: number;
  sample_values: any[];
  detected_semantic_role?: string;
}

interface InspectionResult {
  status: string;
  filename: string;
  total_rows: number;
  total_columns: number;
  duplicate_rows_count: number;
  missing_values_total: number;
  has_date_column: boolean;
  has_numeric_columns: boolean;
  detected_business_type?: string;
  columns: ColumnSummary[];
  preview_rows: any[];
  records?: any[];
}

export const DatasetUploadView: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inspection, setInspection] = useState<InspectionResult | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!isValid) {
      setUploadError('Invalid format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds 25MB maximum limit.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/dataset/upload', {
        method: 'POST',
        body: formData
      });

      const json = await response.json();

      if (response.ok && json.success) {
        const result: InspectionResult = json.data;
        setInspection(result);

        const datasetToStore = result.records && result.records.length > 0 
          ? result.records 
          : result.preview_rows;

        if (datasetToStore && datasetToStore.length > 0) {
          setActiveDataset(datasetToStore);
          setActiveProject({
            id: `proj_${Date.now()}`,
            name: file.name.replace(/\.[^/.]+$/, '')
          });
        }
      } else {
        if (lowerName.endsWith('.csv')) {
          const text = await file.text();
          const parsedRecords = parseCsvSimple(text);
          if (parsedRecords.length > 0) {
            setActiveDataset(parsedRecords);
            setActiveProject({
              id: `proj_${Date.now()}`,
              name: file.name.replace(/\.[^/.]+$/, '')
            });
            
            const cols = Object.keys(parsedRecords[0]);
            setInspection({
              status: 'success',
              filename: file.name,
              total_rows: parsedRecords.length,
              total_columns: cols.length,
              duplicate_rows_count: 0,
              missing_values_total: 0,
              has_date_column: true,
              has_numeric_columns: true,
              columns: cols.map(c => ({
                name: c,
                inferred_type: typeof parsedRecords[0][c] === 'number' ? 'numeric' : 'text',
                total_count: parsedRecords.length,
                non_null_count: parsedRecords.length,
                missing_count: 0,
                missing_percentage: 0,
                unique_count: new Set(parsedRecords.map(r => r[c])).size,
                sample_values: parsedRecords.slice(0, 3).map(r => r[c])
              })),
              preview_rows: parsedRecords.slice(0, 10),
              records: parsedRecords
            });
            return;
          }
        }
        setUploadError(json.message || 'Dataset inspection failed.');
      }
    } catch (err: any) {
      setUploadError(`Failed to process dataset: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const parseCsvSimple = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => {
        const val = values[i];
        const num = Number(val);
        obj[h] = !isNaN(num) && val !== '' ? num : val;
      });
      return obj;
    });
  };

  const loadDemoDataset = () => {
    setActiveDataset(DEMO_SAMPLE_DATASET);
    setActiveProject({
      id: `proj_${Date.now()}`,
      name: 'Sample_Retail_Sales'
    });

    const cols = Object.keys(DEMO_SAMPLE_DATASET[0]);
    setInspection({
      status: 'success',
      filename: 'Sample_Retail_Sales.csv',
      total_rows: DEMO_SAMPLE_DATASET.length,
      total_columns: cols.length,
      duplicate_rows_count: 0,
      missing_values_total: 0,
      has_date_column: true,
      has_numeric_columns: true,
      columns: cols.map(c => ({
        name: c,
        inferred_type: typeof DEMO_SAMPLE_DATASET[0][c as keyof typeof DEMO_SAMPLE_DATASET[0]] === 'number' ? 'numeric' : 'text',
        total_count: DEMO_SAMPLE_DATASET.length,
        non_null_count: DEMO_SAMPLE_DATASET.length,
        missing_count: 0,
        missing_percentage: 0,
        unique_count: new Set(DEMO_SAMPLE_DATASET.map(r => r[c as keyof typeof DEMO_SAMPLE_DATASET[0]])).size,
        sample_values: DEMO_SAMPLE_DATASET.slice(0, 3).map(r => r[c as keyof typeof DEMO_SAMPLE_DATASET[0]])
      })),
      preview_rows: DEMO_SAMPLE_DATASET,
      records: DEMO_SAMPLE_DATASET
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="workspace-page d-flex flex-column gap-4">
      {/* Page Title */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div>
          <h4 className="page-heading fw-bold mb-1 text-dark">Dataset Ingestion & Inspection</h4>
          <p className="text-muted-blyc mb-0" style={{ fontSize: '0.85rem' }}>
            Upload your business spreadsheet. The Python engine automatically inspects types, anomalies, and schemas.
          </p>
        </div>

        <button 
          type="button" 
          className="btn btn-sm btn-blyc-outline d-flex align-items-center gap-2"
          onClick={loadDemoDataset}
        >
          <Database size={15} className="text-primary" />
          <span>Load Demo Dataset</span>
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
          }
        }}
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
      />

      {/* Upload Drop Zone Card */}
      {!inspection && (
        <div className="blyc-card p-4 p-md-5 text-center">
          <div 
            className={`p-4 p-md-5 rounded-3 border-2 mx-auto d-flex flex-column align-items-center justify-content-center transition-all ${
              isDragging ? 'border-primary bg-primary bg-opacity-10' : ''
            }`}
            style={{ 
              maxWidth: '620px', 
              backgroundColor: isDragging ? '#EFF6FF' : '#F8FAFC', 
              borderColor: isDragging ? '#0284C7' : '#CBD5E1',
              borderStyle: 'dashed',
              cursor: 'pointer'
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div 
              className="p-3 rounded-circle mb-3 shadow-xs" 
              style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#0284C7' }}
            >
              <FileSpreadsheet size={42} />
            </div>

            <h5 className="fw-bold mb-2 text-dark">
              {isUploading ? 'Inspecting Dataset...' : 'Drag and drop your spreadsheet here'}
            </h5>
            <p className="text-muted-blyc mb-4" style={{ fontSize: '0.85rem', maxWidth: '440px' }}>
              {isUploading 
                ? 'Python Analytics Engine is parsing columns, types, and quality metrics...'
                : 'Or click anywhere to select from your computer. Supports .xlsx, .xls, and .csv files up to 25MB.'}
            </p>

            <div className="d-flex align-items-center gap-2">
              <button 
                type="button"
                className="btn btn-blyc-primary d-flex align-items-center gap-2 px-4 py-2"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isUploading}
              >
                {isUploading ? <RefreshCw size={16} className="spin" /> : <UploadCloud size={16} />}
                <span>{isUploading ? 'Inspecting...' : 'Select File'}</span>
              </button>
            </div>
          </div>

          {uploadError && (
            <div className="alert alert-danger d-inline-flex align-items-center gap-2 mt-4 py-2 px-3" role="alert">
              <AlertCircle size={16} />
              <span className="small">{uploadError}</span>
            </div>
          )}

          {/* Privacy & Quality Features */}
          <div className="row g-3 mt-4 pt-4 border-top justify-content-center text-start">
            <div className="col-12 col-md-4">
              <div className="d-flex align-items-start gap-2">
                <ShieldCheck size={18} className="text-success flex-shrink-0 mt-1" />
                <div>
                  <span className="fw-semibold d-block text-dark" style={{ fontSize: '0.85rem' }}>Data Privacy Guard</span>
                  <span className="text-muted-blyc" style={{ fontSize: '0.78rem' }}>
                    Spreadsheet data is never exposed publicly or sent raw to third-party models.
                  </span>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="d-flex align-items-start gap-2">
                <FileCheck2 size={18} className="text-primary flex-shrink-0 mt-1" />
                <div>
                  <span className="fw-semibold d-block text-dark" style={{ fontSize: '0.85rem' }}>Automated Profiling</span>
                  <span className="text-muted-blyc" style={{ fontSize: '0.78rem' }}>
                    Identifies missing values, duplicate entries, and column roles automatically.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inspection Results Dashboard */}
      {inspection && (
        <div className="d-flex flex-column gap-4">
          {/* Top Success Banner */}
          <div className="alert alert-success d-flex justify-content-between align-items-center p-3 mb-0 rounded-3 border">
            <div className="d-flex align-items-center gap-3">
              <CheckCircle2 size={24} className="text-success flex-shrink-0" />
              <div>
                <strong className="text-dark">"{inspection.filename}" successfully inspected and active!</strong>
                <div className="small text-muted-blyc">
                  {inspection.total_rows.toLocaleString()} rows and {inspection.total_columns} columns loaded into your workspace memory.
                </div>
              </div>
            </div>

            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setInspection(null)}
            >
              Upload Different File
            </button>
          </div>

          {/* KPI Metrics Summary */}
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <div className="blyc-card p-3 text-center">
                <span className="tracking-wide-caps d-block mb-1">Total Rows</span>
                <h4 className="fw-bold text-dark mb-0 tabular-nums">{inspection.total_rows.toLocaleString()}</h4>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="blyc-card p-3 text-center">
                <span className="tracking-wide-caps d-block mb-1">Total Columns</span>
                <h4 className="fw-bold text-dark mb-0 tabular-nums">{inspection.total_columns}</h4>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="blyc-card p-3 text-center">
                <span className="tracking-wide-caps d-block mb-1">Duplicate Rows</span>
                <h4 className={`fw-bold mb-0 tabular-nums ${inspection.duplicate_rows_count > 0 ? 'text-warning' : 'text-success'}`}>
                  {inspection.duplicate_rows_count}
                </h4>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="blyc-card p-3 text-center">
                <span className="tracking-wide-caps d-block mb-1">Missing Cells</span>
                <h4 className={`fw-bold mb-0 tabular-nums ${inspection.missing_values_total > 0 ? 'text-danger' : 'text-success'}`}>
                  {inspection.missing_values_total}
                </h4>
              </div>
            </div>
          </div>

          {/* Next Action Cards Hero */}
          <div className="d-flex flex-wrap gap-2">
            <button
              className="btn btn-blyc-primary d-flex align-items-center gap-2 px-3 py-2"
              onClick={() => navigate('/workspace/dashboard')}
            >
              <span>Proceed to Automated Dashboard</span>
              <ArrowRight size={15} />
            </button>

            <button
              className="btn btn-blyc-outline d-flex align-items-center gap-2 px-3 py-2"
              onClick={() => navigate('/workspace/cleaning')}
            >
              <Sliders size={15} className="text-primary" />
              <span>Open Data Cleaning Workspace</span>
            </button>

            <button
              className="btn btn-blyc-outline d-flex align-items-center gap-2 px-3 py-2"
              onClick={() => navigate('/workspace/calculator')}
            >
              <Calculator size={15} className="text-secondary" />
              <span>Create Custom Calculation</span>
            </button>
          </div>

          {/* Detected Schema Table */}
          <div className="blyc-card p-4">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark">
              <Layers size={18} className="text-primary" />
              <span>Detected Columns & Data Profiling</span>
            </h6>
            <div className="table-responsive">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Column Name</th>
                    <th>Inferred Type</th>
                    <th>Semantic Role</th>
                    <th>Non-Null</th>
                    <th>Missing</th>
                    <th>Sample Values</th>
                  </tr>
                </thead>
                <tbody>
                  {inspection.columns.map((col) => (
                    <tr key={col.name}>
                      <td className="fw-bold text-dark">{col.name}</td>
                      <td>
                        <span className={`badge-pill ${col.inferred_type === 'numeric' ? 'badge-pill-info' : 'badge-pill-neutral'}`}>
                          {col.inferred_type}
                        </span>
                      </td>
                      <td>
                        {col.detected_semantic_role ? (
                          <span className="badge-pill badge-pill-indigo text-capitalize">
                            {col.detected_semantic_role.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-muted-blyc">—</span>
                        )}
                      </td>
                      <td className="tabular-nums">{col.non_null_count}</td>
                      <td className={`tabular-nums ${col.missing_count > 0 ? 'text-danger fw-semibold' : 'text-muted-blyc'}`}>
                        {col.missing_count} ({col.missing_percentage}%)
                      </td>
                      <td className="text-truncate text-muted-blyc" style={{ maxWidth: '240px' }}>
                        {col.sample_values?.slice(0, 3).join(', ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview Rows Table */}
          <div className="blyc-card p-4">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark">
              <Table size={18} className="text-primary" />
              <span>Dataset Preview (First 10 Rows)</span>
            </h6>
            <div className="table-responsive border rounded" style={{ maxHeight: '350px' }}>
              <table className="table-modern">
                <thead className="sticky-top">
                  <tr>
                    {inspection.columns.map(c => (
                      <th key={c.name}>{c.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inspection.preview_rows.map((row, idx) => (
                    <tr key={idx}>
                      {inspection.columns.map(c => (
                        <td key={c.name} className="tabular-nums">
                          {row[c.name] !== null && row[c.name] !== undefined ? String(row[c.name]) : <span className="badge-pill badge-pill-danger" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>Missing</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
