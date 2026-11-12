import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Check, 
  Undo2, 
  CheckCircle2, 
  Sliders, 
  Layers, 
  Save, 
  Info, 
  Table,
  Hash,
  DollarSign,
  Calendar,
  Tag,
  KeyRound,
  FileText,
  UploadCloud,
  Database,
  Download,
  FileSpreadsheet,
  FolderArchive
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActionAlt } from '../../components/ActionAlt';
import { getActiveDataset, setActiveDataset, setActiveProject, getActiveProject, DEMO_SAMPLE_DATASET } from '../../utils/sessionStore';

interface ColumnProfileInfo {
  column: string;
  role: string;
  confidence: number;
  reason: string;
  missing_count: number;
  fill_rule: string;
}

const ROLE_LABELS: Record<string, string> = {
  id: 'Identifier',
  date: 'Date',
  quantity: 'Quantity',
  unit_price: 'Unit Price',
  total_amount: 'Total Amount',
  cost: 'Cost',
  currency: 'Money',
  percentage: 'Percentage',
  numeric: 'Number',
  category: 'Category',
  name: 'Name',
  text: 'Text',
  unknown: 'Detecting...'
};

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'quantity': return 'badge-pill badge-pill-info';
    case 'unit_price':
    case 'total_amount':
    case 'cost':
    case 'currency': return 'badge-pill badge-pill-success';
    case 'category': return 'badge-pill badge-pill-indigo';
    case 'date': return 'badge-pill badge-pill-neutral';
    case 'id': return 'badge-pill badge-pill-neutral';
    default: return 'badge-pill badge-pill-neutral';
  }
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'quantity': return <Hash size={11} />;
    case 'unit_price':
    case 'total_amount':
    case 'cost':
    case 'currency': return <DollarSign size={11} />;
    case 'category': return <Tag size={11} />;
    case 'date': return <Calendar size={11} />;
    case 'id': return <KeyRound size={11} />;
    default: return <FileText size={11} />;
  }
};

export const DataCleaningView: React.FC = () => {
  const navigate = useNavigate();

  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [history, setHistory] = useState<Record<string, any>[][]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [imputationStrategy, setImputationStrategy] = useState<string>('auto');
  const [constantInput, setConstantInput] = useState<string>('1');
  const [previewModal, setPreviewModal] = useState<any>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'danger'; text: string } | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ColumnProfileInfo>>({});

  const loadDataset = () => {
    const dataset = getActiveDataset();
    if (dataset && dataset.length > 0) {
      setRecords(dataset);
      const cols = Object.keys(dataset[0]);
      setColumns(cols);
      const colWithMissing = cols.find(c => dataset.some(r => r[c] === null || r[c] === undefined || r[c] === ''));
      setSelectedColumn(colWithMissing || cols[0] || '');
    } else {
      setRecords([]);
      setColumns([]);
      setSelectedColumn('');
    }
  };

  useEffect(() => {
    loadDataset();
    window.addEventListener('blyc_dataset_updated', loadDataset);
    return () => {
      window.removeEventListener('blyc_dataset_updated', loadDataset);
    };
  }, []);

  const handleLoadDemo = () => {
    setActiveDataset(DEMO_SAMPLE_DATASET);
    setActiveProject({ id: `demo_${Date.now()}`, name: 'Demo_Retail_Sales' });
    loadDataset();
  };

  const persistRecords = (newRecords: Record<string, any>[], message?: string) => {
    setRecords(newRecords);
    setActiveDataset(newRecords);
    if (newRecords.length > 0) {
      setColumns(Object.keys(newRecords[0]));
    }
    if (message) {
      setNotification({ type: 'success', text: message });
    }
  };

  const pushHistory = () => {
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(records))]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    persistRecords(previous, 'Last cleaning action undone.');
  };

  const callEngine = async (path: string, body: any, params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    const res = await fetch(`/api/cleaning/${path}${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || 'The Python analytics engine did not respond (is it running on port 8001?).');
    }
    return json.data;
  };

  const fail = (err: any) => setNotification({ type: 'danger', text: err?.message || 'Cleaning request failed.' });

  useEffect(() => {
    if (records.length === 0) return;
    let cancelled = false;
    callEngine('profile', { records })
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, ColumnProfileInfo> = {};
        (data.columns || []).forEach((c: ColumnProfileInfo) => { map[c.column] = c; });
        setProfiles(map);
      })
      .catch(() => { if (!cancelled) setProfiles({}); });
    return () => { cancelled = true; };
  }, [records]);

  const getRole = (colName: string): string => profiles[colName]?.role || 'unknown';
  const isNumericRole = (role: string) =>
    ['quantity', 'unit_price', 'total_amount', 'cost', 'currency', 'percentage', 'numeric'].includes(role);

  const handleRemoveDuplicates = async () => {
    try {
      pushHistory();
      const data = await callEngine('apply', { records, remove_duplicates: true });
      persistRecords(
        data.cleaned_records,
        data.duplicates_removed_count > 0
          ? `Removed ${data.duplicates_removed_count} duplicate record(s). Saved to current session.`
          : 'No duplicate records found.'
      );
    } catch (err) { fail(err); }
  };

  const handleDeleteRow = (index: number) => {
    pushHistory();
    const updated = records.filter((_, idx) => idx !== index);
    persistRecords(updated, `Row #${index + 1} deleted and saved.`);
  };

  const handleCellEdit = (index: number, col: string, newVal: any) => {
    pushHistory();
    const updated = [...records];
    const num = Number(newVal);
    const role = getRole(col);
    const valid = !isNaN(num) && newVal !== '';
    if (role === 'quantity') {
      updated[index] = { ...updated[index], [col]: valid ? Math.round(num) : newVal };
    } else if (['unit_price', 'total_amount', 'cost', 'currency', 'percentage'].includes(role)) {
      updated[index] = { ...updated[index], [col]: valid ? Number(num.toFixed(2)) : newVal };
    } else {
      updated[index] = { ...updated[index], [col]: newVal };
    }
    persistRecords(updated, `Updated ${col} in Row #${index + 1}.`);
  };

  const handlePreviewImputation = async () => {
    try {
      const data = await callEngine(
        'preview-imputation',
        { records },
        { column: selectedColumn, strategy: imputationStrategy, constantValue: constantInput }
      );
      if (!data.affected_cells_count) {
        setNotification({ type: 'info', text: `No missing values found in column '${selectedColumn}'.` });
        return;
      }
      setPreviewModal({
        column: selectedColumn,
        strategy: imputationStrategy,
        role: data.detected_role,
        explanation: data.explanation,
        affectedCount: data.affected_cells_count,
        calculatedValue: data.calculated_value,
        samples: (data.sample_imputations || []).map((s: any) => ({
          row: s.row_index + 1,
          value: s.proposed_value,
          method: s.method
        })),
        unresolved: data.affected_cells_count - (data.fills || []).length
      });
    } catch (err) { fail(err); }
  };

  const handleConfirmImputation = async () => {
    if (!previewModal) return;
    try {
      pushHistory();
      const data = await callEngine('apply', {
        records,
        imputation_rules: [{
          column_name: previewModal.column,
          strategy: previewModal.strategy,
          constant_value: previewModal.strategy === 'constant' ? constantInput : null
        }]
      });
      persistRecords(
        data.cleaned_records,
        `Filled ${previewModal.affectedCount - previewModal.unresolved} missing cell(s) in '${previewModal.column}' using ${String(previewModal.role).replace('_', ' ')} logic.`
      );
      setPreviewModal(null);
    } catch (err) { fail(err); }
  };

  const handleNormalizeCategories = async () => {
    try {
      const textCols = columns.filter((c) => ['category', 'name'].includes(getRole(c)));
      if (textCols.length === 0) {
        setNotification({ type: 'info', text: 'No category columns detected to normalize.' });
        return;
      }
      const rules: any[] = [];
      for (const col of textCols) {
        const data = await callEngine('category-suggestions', { records }, { column: col });
        (data.suggestions || []).forEach((s: any) => {
          rules.push({ column_name: col, target_value: s.canonical_value, source_variants: s.variants });
        });
      }
      if (rules.length === 0) {
        setNotification({ type: 'info', text: 'All categories are already consistent.' });
        return;
      }
      pushHistory();
      const data = await callEngine('apply', { records, category_rules: rules });
      persistRecords(
        data.cleaned_records,
        `Normalized ${data.cells_modified_count} inconsistent category variation(s).`
      );
    } catch (err) { fail(err); }
  };

  const handleSmartClean = async () => {
    try {
      pushHistory();
      const data = await callEngine('apply', { records, auto_clean: true });
      const filled = (data.column_reports || []).reduce((n: number, r: any) => n + (r.filled || 0), 0);
      const unresolved = (data.column_reports || []).reduce((n: number, r: any) => n + (r.unresolved || 0), 0);
      persistRecords(
        data.cleaned_records,
        `Smart Clean completed: ${data.category_cells_normalized} categories normalized, ` +
        `${data.duplicates_removed_count} duplicates removed, ${filled} gaps filled` +
        (unresolved > 0 ? `, ${unresolved} left for review.` : '.')
      );
    } catch (err) { fail(err); }
  };

  const handleDownloadJSON = () => {
    if (records.length === 0) return;
    const activeProj = getActiveProject();
    const projName = (activeProj?.name || 'cleaned_dataset').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projName}_cleaned.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNotification({ type: 'success', text: `Cleaned dataset exported as ${projName}_cleaned.json` });
  };

  const handleDownloadCSV = () => {
    if (records.length === 0 || columns.length === 0) return;
    const activeProj = getActiveProject();
    const projName = (activeProj?.name || 'cleaned_dataset').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const headers = columns.join(',');
    const rows = records.map(r => columns.map(c => {
      const v = r[c] ?? '';
      const str = String(v).replace(/"/g, '""');
      return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
    }).join(','));
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projName}_cleaned.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNotification({ type: 'success', text: `Cleaned dataset exported as ${projName}_cleaned.csv (opens directly in Excel)` });
  };

  const handleExportProjectJSON = () => {
    if (records.length === 0) return;
    const activeProj = getActiveProject();
    const manifest = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      project: activeProj || { id: `proj_${Date.now()}`, name: 'Cleaned_Business_Dataset' },
      records,
      total_rows: records.length,
      columns
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeProj?.name || 'project').toLowerCase().replace(/[^a-z0-9]/g, '_')}.blyc.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNotification({ type: 'success', text: `Portable project file exported as .blyc.json. Re-import it anytime via Project Explorer!` });
  };

  const role = getRole(selectedColumn);

  return (
    <div className="d-flex flex-column gap-4">
      {/* Workspace Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Data Quality & Cleaning Workspace</h4>
          <p className="text-muted-blyc mb-0" style={{ fontSize: '0.85rem' }}>
            Audit records, normalize categories, and autofill missing values with domain-aware integer and currency precision.
          </p>
        </div>

        {records.length > 0 && (
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {history.length > 0 && (
              <button className="btn btn-sm btn-blyc-outline d-flex align-items-center gap-1" onClick={handleUndo}>
                <Undo2 size={14} />
                <span>Undo ({history.length})</span>
              </button>
            )}

            <ActionAlt description="Removes identical duplicate rows across all columns." placement="bottom" align="right">
              <button 
                className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1" 
                onClick={handleRemoveDuplicates}
              >
                <Trash2 size={14} />
                <span>Remove Duplicates</span>
              </button>
            </ActionAlt>

            <ActionAlt description="Detects column domains, cleans categories, drops duplicates, and autofills gaps in one click." placement="bottom" align="right">
              <button 
                className="btn btn-sm btn-blyc-gradient d-flex align-items-center gap-1" 
                onClick={handleSmartClean} 
              >
                <Sparkles size={14} />
                <span>Smart Clean All</span>
              </button>
            </ActionAlt>

            <ActionAlt description="Trims whitespace, unifies irregular casing, and standardizes categorical spellings." placement="bottom" align="right">
              <button 
                className="btn btn-sm btn-blyc-outline d-flex align-items-center gap-1" 
                onClick={handleNormalizeCategories}
              >
                <Layers size={14} />
                <span>Normalize Categories</span>
              </button>
            </ActionAlt>
          </div>
        )}
      </div>

      {/* Empty State when no dataset in this session */}
      {records.length === 0 && (
        <div className="blyc-card p-5 text-center my-3">
          <div 
            className="p-3 rounded-circle d-inline-flex mb-3 shadow-xs" 
            style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#0284C7' }}
          >
            <Sparkles size={40} />
          </div>
          <h4 className="fw-bold text-dark mb-2">No Active Dataset to Clean</h4>
          <p className="text-muted-blyc mb-4" style={{ maxWidth: '460px', margin: '0 auto', fontSize: '0.9rem' }}>
            This tab session does not have a dataset loaded yet. Upload your spreadsheet to profile columns, autofill missing cells, and normalize categories.
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <button 
              className="btn btn-blyc-primary d-flex align-items-center gap-2 px-4 py-2"
              onClick={() => navigate('/workspace/upload')}
            >
              <UploadCloud size={16} />
              <span>Go to Dataset Upload</span>
            </button>
            <button 
              className="btn btn-blyc-outline d-flex align-items-center gap-2 px-4 py-2"
              onClick={handleLoadDemo}
            >
              <Database size={16} className="text-primary" />
              <span>Load Demo Data</span>
            </button>
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {notification && (
        <div className={`alert alert-${notification.type === 'danger' ? 'danger' : (notification.type === 'info' ? 'info' : 'success')} d-flex align-items-center justify-content-between py-2 px-3 mb-0 rounded-3 border`} style={{ fontSize: '0.85rem' }}>
          <div className="d-flex align-items-center gap-2">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            <span>{notification.text}</span>
          </div>
          <button type="button" className="btn-close btn-sm" onClick={() => setNotification(null)}></button>
        </div>
      )}

      {records.length > 0 && (
        <>
          {/* Autofill & Imputation Toolbar */}
          <div className="blyc-card p-3 p-md-4 bg-white">
            <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-2">
                <div className="p-2 rounded-3 bg-light text-primary">
                  <Sliders size={18} />
                </div>
                <div>
                  <span className="fw-bold text-dark d-block" style={{ fontSize: '0.875rem' }}>Column-Aware Missing Value Autofill</span>
                  <span className="text-muted-blyc" style={{ fontSize: '0.78rem' }}>Intelligent fills grounded in business meaning</span>
                </div>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-2">
                {/* Target Column Selector */}
                <div className="d-flex align-items-center gap-1">
                  <span className="text-muted-blyc small fw-medium">Column:</span>
                  <select
                    className="form-select form-select-sm"
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    style={{ width: '150px' }}
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Imputation Strategy Selector */}
                <div className="d-flex align-items-center gap-1">
                  <span className="text-muted-blyc small fw-medium">Rule:</span>
                  <select
                    className="form-select form-select-sm"
                    value={imputationStrategy}
                    onChange={(e) => setImputationStrategy(e.target.value)}
                    style={{ width: '220px' }}
                  >
                    <option value="auto">Smart (Recommended)</option>
                    {isNumericRole(role) && <option value="mean">{role === 'quantity' ? 'Average (Whole Units)' : 'Average (2 Decimals)'}</option>}
                    {isNumericRole(role) && <option value="median">Median</option>}
                    <option value="mode">Most Frequent Value</option>
                    <option value="ffill">Copy Previous Row</option>
                    <option value="constant">Custom Value</option>
                  </select>
                </div>

                {/* Constant input if strategy is constant */}
                {imputationStrategy === 'constant' && (
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Value"
                    value={constantInput}
                    onChange={(e) => setConstantInput(e.target.value)}
                    style={{ width: '90px' }}
                  />
                )}

                {/* Preview Button */}
                <ActionAlt description="Preview missing value imputation based on your selected column and rule." placement="top">
                  <button
                    className="btn btn-sm btn-blyc-primary d-flex align-items-center gap-1"
                    onClick={handlePreviewImputation}
                  >
                    <Check size={14} />
                    <span>Preview Autofill</span>
                  </button>
                </ActionAlt>
              </div>
            </div>

            {/* Informational Help Note */}
            <div className="mt-3 pt-2 border-top d-flex align-items-center gap-2 text-muted-blyc" style={{ fontSize: '0.8rem' }}>
              <Info size={14} className="text-primary flex-shrink-0" />
              <span>
                <strong>{selectedColumn}</strong> profiled as <strong>{ROLE_LABELS[role] || role}</strong>: {profiles[selectedColumn]?.fill_rule || 'Adaptive domain rule applied.'}
              </span>
            </div>
          </div>

          {/* Dataset Table with Inline Editing & Direct Downloads */}
          <div className="blyc-card p-4">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3">
              <div className="d-flex align-items-center gap-2">
                <Table size={18} className="text-primary" />
                <h6 className="fw-bold mb-0 text-dark">Active Dataset Records ({records.length} Total Rows)</h6>
                <span className="badge-pill badge-pill-success">
                  <Save size={12} />
                  <span>Auto-Saved in Session</span>
                </span>
              </div>

              {/* Direct Export & Download Buttons */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <ActionAlt description="Download clean CSV spreadsheet compatible with Excel and Google Sheets." placement="top" align="right">
                  <button 
                    className="btn btn-sm btn-blyc-outline d-flex align-items-center gap-1.5 shadow-xs"
                    onClick={handleDownloadCSV}
                  >
                    <FileSpreadsheet size={13} className="text-success" />
                    <span>Download CSV (Excel)</span>
                  </button>
                </ActionAlt>

                <ActionAlt description="Download cleaned dataset as structured JSON array." placement="top" align="right">
                  <button 
                    className="btn btn-sm btn-blyc-outline d-flex align-items-center gap-1.5 shadow-xs"
                    onClick={handleDownloadJSON}
                  >
                    <Download size={13} className="text-primary" />
                    <span>Download JSON</span>
                  </button>
                </ActionAlt>

                <ActionAlt description="Export portable .blyc.json project package to restore this dataset session anytime." placement="top" align="right">
                  <button 
                    className="btn btn-sm btn-blyc-primary d-flex align-items-center gap-1.5 shadow-xs"
                    onClick={handleExportProjectJSON}
                  >
                    <FolderArchive size={13} />
                    <span>Export .blyc.json</span>
                  </button>
                </ActionAlt>
              </div>
            </div>

            <div className="table-responsive border rounded" style={{ maxHeight: '420px' }}>
              <table className="table-modern">
                <thead className="sticky-top">
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    {columns.map((col) => {
                      const colRole = getRole(col);
                      return (
                        <th key={col}>
                          <div className="d-flex align-items-center gap-2">
                            <span>{col}</span>
                            <span className={getRoleBadgeClass(colRole)} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                              {getRoleIcon(colRole)}
                              <span>{ROLE_LABELS[colRole] || colRole}</span>
                            </span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="text-end" style={{ width: '70px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="text-muted-blyc small tabular-nums">{rowIdx + 1}</td>
                      {columns.map((col) => {
                        const val = row[col];
                        const isMissing = val === null || val === undefined || val === '';
                        return (
                          <td key={col}>
                            {isMissing ? (
                              <span className="badge-pill badge-pill-danger" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                                Missing
                              </span>
                            ) : (
                              <input
                                type="text"
                                className="form-control form-control-sm border-0 bg-transparent p-0 text-dark tabular-nums"
                                value={val}
                                onChange={(e) => handleCellEdit(rowIdx, col, e.target.value)}
                                style={{ maxWidth: '180px', fontSize: '0.85rem' }}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-link text-danger p-0 opacity-75 hover-opacity-100"
                          title="Delete Row"
                          onClick={() => handleDeleteRow(rowIdx)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {previewModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header border-bottom">
                <h6 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                  <CheckCircle2 size={18} className="text-primary" />
                  <span>Confirm Column-Aware Autofill</span>
                </h6>
                <button type="button" className="btn-close" onClick={() => setPreviewModal(null)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-dark small mb-3">
                  You are about to autofill <strong>{previewModal.affectedCount}</strong> missing cell(s) in column <strong>"{previewModal.column}"</strong>.
                </p>

                <div className="p-3 bg-light rounded border mb-3">
                  <div className="d-flex justify-content-between mb-1 small">
                    <span className="text-muted-blyc">Column Role:</span>
                    <strong className="text-capitalize text-dark">{ROLE_LABELS[previewModal.role] || previewModal.role}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1 small">
                    <span className="text-muted-blyc">Strategy:</span>
                    <strong className="text-capitalize text-dark">{previewModal.strategy}</strong>
                  </div>
                  <div className="d-flex justify-content-between small pt-2 border-top">
                    <span className="text-muted-blyc">Proposed Value:</span>
                    <strong className="text-primary fs-6 tabular-nums">
                      {previewModal.calculatedValue}
                      {previewModal.role === 'quantity' && <span className="ms-1 small text-muted">(whole unit)</span>}
                    </strong>
                  </div>

                  {previewModal.samples?.length > 0 && (
                    <div className="pt-2 mt-2 border-top small">
                      <div className="text-muted-blyc mb-1">Preview Row Adjustments:</div>
                      {previewModal.samples.map((s: any) => (
                        <div key={s.row} className="d-flex justify-content-between py-1 border-bottom border-light">
                          <span>Row #{s.row}</span>
                          <strong className="text-dark">{String(s.value)} <span className="text-muted fw-normal">({String(s.method).replace(/_/g, ' ')})</span></strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {previewModal.unresolved > 0 && (
                    <div className="small text-warning mt-2">
                      {previewModal.unresolved} cell(s) cannot be safely inferred and will remain empty for manual review.
                    </div>
                  )}
                </div>

                <p className="text-muted-blyc small mb-0" style={{ fontSize: '0.8rem' }}>
                  {previewModal.explanation}
                </p>
              </div>
              <div className="modal-footer border-top">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPreviewModal(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-sm btn-blyc-primary d-flex align-items-center gap-1" onClick={handleConfirmImputation}>
                  <Save size={14} />
                  <span>Apply & Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
