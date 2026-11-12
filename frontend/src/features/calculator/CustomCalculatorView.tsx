import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Save, 
  Trash2, 
  Sparkles, 
  Table, 
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Check,
  UploadCloud,
  Database,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MetricCard } from '../../components/MetricCard';
import { ActionAlt } from '../../components/ActionAlt';
import { PivotBuilder } from './PivotBuilder';
import { getActiveDataset, setActiveDataset, setActiveProject, DEMO_SAMPLE_DATASET } from '../../utils/sessionStore';

interface CalculationSummary {
  sum?: number;
  mean?: number;
  min?: number;
  max?: number;
  count?: number;
}

interface SavedCalculation {
  id: string;
  name: string;
  formula: string;
  targetColumn: string;
}

const DEFAULT_SAMPLE_DATA = [
  { Product: 'Mechanical Keyboard Pro', Category: 'Electronics', Price: 89.99, Cost: 45.0, Quantity: 15, Discount: 5 },
  { Product: 'Gaming Mouse', Category: 'Electronics', Price: 49.99, Cost: 20.0, Quantity: 24, Discount: 0 },
  { Product: 'Desk Mat XL', Category: 'Accessories', Price: 19.99, Cost: 8.0, Quantity: 40, Discount: 10 },
  { Product: 'USB-C Dual Hub', Category: 'Accessories', Price: 34.99, Cost: 14.0, Quantity: 18, Discount: 0 },
  { Product: 'Noise-Canceling Headset', Category: 'Audio', Price: 129.99, Cost: 65.0, Quantity: 12, Discount: 15 }
];

export const CustomCalculatorView: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'pivot' | 'formula'>('pivot');
  const [dataset, setDataset] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [formula, setFormula] = useState<string>('[Price] * [Quantity]');
  const [targetColumn, setTargetColumn] = useState<string>('Total_Revenue');
  
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationStatus, setValidationStatus] = useState<{ valid: boolean; message?: string } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<{
    preview: any[];
    summary?: CalculationSummary;
    targetColumn: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>(() => {
    try {
      const stored = sessionStorage.getItem('blyc_custom_calculations');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const syncDataset = () => {
    const stored = getActiveDataset();
    if (stored && stored.length > 0) {
      setDataset(stored);
      setColumns(Object.keys(stored[0]));
    } else {
      setDataset([]);
      setColumns([]);
    }
  };

  useEffect(() => {
    syncDataset();
    window.addEventListener('blyc_dataset_updated', syncDataset);
    return () => {
      window.removeEventListener('blyc_dataset_updated', syncDataset);
    };
  }, []);

  useEffect(() => {
    sessionStorage.setItem('blyc_custom_calculations', JSON.stringify(savedCalculations));
  }, [savedCalculations]);

  const handleLoadDemo = () => {
    setActiveDataset(DEMO_SAMPLE_DATASET);
    setActiveProject({ id: `demo_${Date.now()}`, name: 'Demo_Retail_Sales' });
    syncDataset();
  };

  const insertToken = (token: string) => {
    setFormula((prev) => `${prev} ${token} `.trim());
    setValidationStatus(null);
  };

  const handleValidate = async () => {
    if (!formula.trim()) return;
    setIsValidating(true);
    setValidationStatus(null);

    try {
      const res = await fetch('/api/calculations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formula, columns })
      });

      const data = await res.json();
      if (res.ok && data.data?.valid) {
        setValidationStatus({ valid: true, message: 'Formula syntax is verified safe and valid.' });
      } else {
        setValidationStatus({ valid: false, message: data.data?.error || data.message || 'Invalid formula.' });
      }
    } catch {
      setValidationStatus({ valid: false, message: 'Unable to reach validation service.' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleEvaluate = async () => {
    if (!targetColumn.trim()) {
      setErrorMessage('Please specify an output column name.');
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/calculations/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: dataset,
          columns,
          formula,
          targetColumn: targetColumn.trim(),
          saveDefinition: false
        })
      });

      const data = await res.json();
      if (res.ok && data.data?.success) {
        setEvalResult({
          preview: data.data.preview,
          summary: data.data.summary,
          targetColumn: data.data.target_column
        });
        setValidationStatus({ valid: true, message: 'Calculation evaluated successfully.' });
      } else {
        setErrorMessage(data.data?.error || data.message || 'Evaluation failed.');
      }
    } catch {
      setErrorMessage('Error evaluating calculation with Python analytics engine.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleApplyToDataset = () => {
    if (!evalResult) return;

    handleEvaluate().then(() => {
      const updated = dataset.map((row) => {
        return {
          ...row,
          [evalResult.targetColumn]: evalResult.preview.find(p => p.Product === row.Product)?.[evalResult.targetColumn] ?? 0
        };
      });

      setDataset(updated);
      if (!columns.includes(evalResult.targetColumn)) {
        setColumns([...columns, evalResult.targetColumn]);
      }
      setActiveDataset(updated);

      const newSaved: SavedCalculation = {
        id: `calc_${Date.now()}`,
        name: targetColumn,
        formula,
        targetColumn
      };
      if (!savedCalculations.some(c => c.name === targetColumn)) {
        setSavedCalculations([...savedCalculations, newSaved]);
      }

      setSuccessMessage(`Successfully computed and saved column "${evalResult.targetColumn}" to project memory.`);
    });
  };

  return (
    <div className="workspace-page calculator-page d-flex flex-column gap-4">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div>
          <h4 className="page-heading fw-bold mb-1 text-dark">
            Safe Custom Calculator & Formula Builder
          </h4>
          <p className="text-muted-blyc mb-0" style={{ fontSize: '0.85rem' }}>
            Build custom business calculations using verified mathematical formulas evaluated by the Python AST engine.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="badge-pill badge-pill-success">
            <ShieldCheck size={13} />
            <span>AST Sandboxed — Zero Eval/Exec</span>
          </span>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-0 py-2 rounded-3 border" role="alert">
          <AlertCircle size={16} />
          <div className="small">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success d-flex align-items-center gap-2 mb-0 py-2 rounded-3 border" role="alert">
          <CheckCircle2 size={16} />
          <div className="small">{successMessage}</div>
        </div>
      )}

      {/* Empty State when no dataset in this session */}
      {dataset.length === 0 ? (
        <div className="blyc-card p-5 text-center my-3">
          <div 
            className="p-3 rounded-circle d-inline-flex mb-3 shadow-xs" 
            style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#0284C7' }}
          >
            <Calculator size={40} />
          </div>
          <h4 className="fw-bold text-dark mb-2">No Active Dataset in this Tab</h4>
          <p className="text-muted-blyc mb-4" style={{ maxWidth: '460px', margin: '0 auto', fontSize: '0.9rem' }}>
            Upload a spreadsheet or load demo data to build custom formulas evaluated by the Python AST engine.
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
      ) : (
        <>
        {/* Mode Switch: Pivot Table vs Row Formula */}
        <div className="d-inline-flex p-1 rounded-3 bg-light border align-self-start gap-1">
          <button
            type="button"
            className={`btn btn-sm d-flex align-items-center gap-2 ${mode === 'pivot' ? 'btn-blyc-primary' : 'btn-link text-muted-blyc text-decoration-none'}`}
            onClick={() => setMode('pivot')}
          >
            <Table size={14} />
            <span>Pivot Table</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm d-flex align-items-center gap-2 ${mode === 'formula' ? 'btn-blyc-primary' : 'btn-link text-muted-blyc text-decoration-none'}`}
            onClick={() => setMode('formula')}
          >
            <Calculator size={14} />
            <span>Row Formula Column</span>
          </button>
        </div>

        {mode === 'pivot' && <PivotBuilder dataset={dataset} columns={columns} />}

        {mode === 'formula' && (
        /* Main Grid */
        <div className="row g-4">
        {/* Left Column: Formula Editor */}
        <div className="col-12 col-lg-7 d-flex flex-column gap-3">
          <div className="blyc-card p-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="p-2 rounded-3 bg-light text-primary">
                <Calculator size={18} />
              </div>
              <h6 className="fw-bold mb-0 text-dark">Formula Builder</h6>
            </div>

            {/* Target Column Name Input */}
            <div className="mb-3">
              <label className="form-label text-dark small fw-bold">Output Column Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Net_Profit, Adjusted_Revenue"
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                style={{ fontSize: '0.88rem' }}
              />
            </div>

            {/* Formula Input */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label text-dark small fw-bold mb-0">Formula Expression</label>
                <span className="text-muted-blyc" style={{ fontSize: '0.75rem' }}>
                  Use [Column Name] for column references
                </span>
              </div>
              <textarea
                className="form-control font-monospace"
                rows={3}
                placeholder="e.g. [Price] * [Quantity] * (1 - [Discount] / 100)"
                value={formula}
                onChange={(e) => {
                  setFormula(e.target.value);
                  setValidationStatus(null);
                }}
                style={{ fontSize: '0.92rem', background: '#F8FAFC' }}
              />
            </div>

            {/* Clickable Column Tokens */}
            <div className="mb-3">
              <label className="tracking-wide-caps d-block mb-1">Insert Column Reference:</label>
              <div className="d-flex flex-wrap gap-2">
                {columns.map((col) => (
                  <button
                    key={col}
                    type="button"
                    className="column-chip"
                    onClick={() => insertToken(`[${col}]`)}
                  >
                    <Plus size={11} className="text-primary" />
                    <span>[{col}]</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Operator Keypad */}
            <div className="mb-4">
              <label className="tracking-wide-caps d-block mb-1">Operators:</label>
              <div className="d-flex flex-wrap gap-2">
                {[
                  { label: '+ Add', token: '+' },
                  { label: '- Subtract', token: '-' },
                  { label: '× Multiply', token: '*' },
                  { label: '÷ Divide', token: '/' },
                  { label: '^ Power', token: '^' },
                  { label: '( Open', token: '(' },
                  { label: ') Close', token: ')' }
                ].map((op) => (
                  <button
                    key={op.label}
                    type="button"
                    className="btn btn-sm btn-blyc-outline"
                    style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                    onClick={() => insertToken(op.token)}
                  >
                    {op.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                  onClick={() => setFormula('')}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Validation Status Badge */}
            {validationStatus && (
              <div className={`p-2 rounded-3 mb-3 d-flex align-items-center gap-2 ${
                validationStatus.valid ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'
              }`} style={{ fontSize: '0.82rem' }}>
                {validationStatus.valid ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{validationStatus.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="d-flex flex-wrap gap-2 pt-3 border-top">
              <ActionAlt description="Checks your formula for grammatical correctness and verified dataset column references." placement="top" align="left">
                <button
                  type="button"
                  className="btn btn-sm btn-blyc-outline d-flex align-items-center gap-2"
                  onClick={handleValidate}
                  disabled={isValidating || !formula.trim()}
                >
                  <CheckCircle2 size={14} />
                  <span>Validate Syntax</span>
                </button>
              </ActionAlt>

              <ActionAlt description="Runs Python engine to compute distribution KPIs, mean, and preview calculated rows." placement="top">
                <button
                  type="button"
                  className="btn btn-sm btn-blyc-primary d-flex align-items-center gap-2"
                  onClick={handleEvaluate}
                  disabled={isEvaluating || !formula.trim()}
                >
                  {isEvaluating ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
                  <span>Test Calculation</span>
                </button>
              </ActionAlt>

              {evalResult && (
                <ActionAlt description="Permanently appends this calculated formula as a new column in your dataset." placement="top">
                  <button
                    type="button"
                    className="btn btn-sm btn-success d-flex align-items-center gap-2"
                    onClick={handleApplyToDataset}
                  >
                    <Save size={14} />
                    <span>Apply & Save Column</span>
                  </button>
                </ActionAlt>
              )}
            </div>

            {/* Instruction Guide Card */}
            <div className="mt-4 p-3 rounded-3 border bg-light">
              <div className="d-flex align-items-center gap-2 mb-2 text-primary">
                <Info size={16} />
                <span className="fw-bold small text-dark">How to Use the Custom Calculator</span>
              </div>
              <ol className="small text-muted-blyc mb-0 ps-3" style={{ lineHeight: '1.6', fontSize: '0.82rem' }}>
                <li><strong className="text-dark">Set Output Name:</strong> Specify the column header to save your calculation into (e.g. <code>Total_Revenue</code> or <code>Margin_Percent</code>).</li>
                <li><strong className="text-dark">Insert Column Tokens:</strong> Click on available column badges (e.g. <code>[Price]</code>, <code>[Quantity]</code>) to reference values safely.</li>
                <li><strong className="text-dark">Add Operators & Constants:</strong> Use <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, parentheses, and numbers (e.g. <code>* 0.12</code> for tax).</li>
                <li><strong className="text-dark">Validate Syntax:</strong> Click <span className="text-primary fw-medium">Validate Syntax</span> to check formula grammar and verify column references.</li>
                <li><strong className="text-dark">Test Calculation:</strong> Click <span className="text-primary fw-medium">Test Calculation</span> to run in the Python Engine and view statistical summaries and sample rows.</li>
                <li><strong className="text-dark">Apply to Active Dataset:</strong> Click <span className="text-success fw-medium">Apply & Save Column</span> to permanently append the new column to your working records.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Summary Statistics */}
        <div className="col-12 col-lg-5 d-flex flex-column gap-3">
          {/* Summary KPIs */}
          {evalResult?.summary && (
            <div className="row g-2">
              <div className="col-6">
                <MetricCard
                  title={`Sum (${evalResult.targetColumn})`}
                  value={evalResult.summary.sum !== undefined ? `$${evalResult.summary.sum.toLocaleString()}` : '$0.00'}
                  subtitle="Aggregate column total"
                  icon={TrendingUp}
                />
              </div>
              <div className="col-6">
                <MetricCard
                  title="Average / Row"
                  value={evalResult.summary.mean !== undefined ? `$${evalResult.summary.mean.toFixed(2)}` : '$0.00'}
                  subtitle="Arithmetic mean"
                  icon={Calculator}
                />
              </div>
            </div>
          )}

          {/* Result Preview Table */}
          <div className="blyc-card p-4">
            <h6 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
              <Table size={16} className="text-primary" />
              <span>Live Calculation Preview</span>
            </h6>
            <p className="text-muted-blyc small mb-3">
              Dataset preview showing newly calculated column:
            </p>

            {evalResult ? (
              <div className="table-responsive border rounded" style={{ maxHeight: '320px' }}>
                <table className="table-modern">
                  <thead className="sticky-top">
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th className="text-primary fw-bold" style={{ background: '#EFF6FF' }}>
                        {evalResult.targetColumn} (New)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalResult.preview.map((row, idx) => (
                      <tr key={idx}>
                        <td className="fw-medium text-dark">{row.Product || `Row ${idx + 1}`}</td>
                        <td className="tabular-nums">${row.Price || row.Selling_Price || 0}</td>
                        <td className="tabular-nums">{row.Quantity || 0}</td>
                        <td className="fw-bold text-primary tabular-nums" style={{ background: '#F8FAFC' }}>
                          ${typeof row[evalResult.targetColumn] === 'number' ? row[evalResult.targetColumn].toFixed(2) : row[evalResult.targetColumn]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center border rounded bg-light">
                <Calculator size={28} className="text-muted-blyc mb-2" />
                <p className="text-muted-blyc small mb-0">
                  Click <strong>Test Calculation</strong> to evaluate your formula across dataset rows.
                </p>
              </div>
            )}
          </div>

          {/* Saved Calculations List */}
          <div className="blyc-card p-4">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark">
              <Save size={16} className="text-primary" />
              <span>Saved Project Calculations</span>
            </h6>
            {savedCalculations.length > 0 ? (
              <div className="d-flex flex-column gap-2">
                {savedCalculations.map((c) => (
                  <div key={c.id} className="p-2 px-3 border rounded-3 d-flex justify-content-between align-items-center bg-light">
                    <div>
                      <div className="fw-bold small text-dark">{c.name}</div>
                      <div className="font-monospace text-muted-blyc" style={{ fontSize: '0.75rem' }}>{c.formula}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-0"
                      onClick={() => setSavedCalculations(savedCalculations.filter(sc => sc.id !== c.id))}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-blyc small mb-0">No saved custom calculations yet.</p>
            )}
          </div>
        </div>
      </div>
      )}
        </>
      )}
    </div>
  );
};
