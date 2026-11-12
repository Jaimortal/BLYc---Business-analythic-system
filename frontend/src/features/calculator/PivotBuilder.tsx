import React, { useEffect, useMemo, useState } from 'react';
import { Table, Layers, Sigma, Plus, X, Play, RefreshCw, Download, AlertCircle, Info } from 'lucide-react';
import { ActionAlt } from '../../components/ActionAlt';

interface PivotBuilderProps {
  dataset: Record<string, any>[];
  columns: string[];
}

interface PivotRow {
  keys: string[];
  values: (number | null)[];
  total: number | null;
}

interface PivotResult {
  success: boolean;
  row_fields: string[];
  column_field: string | null;
  column_values: string[];
  value_label: string;
  rows: PivotRow[];
  column_totals: (number | null)[];
  grand_total: number | null;
  source_rows: number;
  error?: string | null;
}

const OPERATORS = [
  { value: '-', label: 'Subtract (−)' },
  { value: '+', label: 'Add (+)' },
  { value: '*', label: 'Multiply (×)' },
  { value: '/', label: 'Divide (÷)' }
];

const AGGREGATIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'mean', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' }
];

const fmt = (v: number | null | undefined) =>
  v === null || v === undefined
    ? '—'
    : v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const PivotBuilder: React.FC<PivotBuilderProps> = ({ dataset, columns }) => {
  const numericColumns = useMemo(() => {
    const sample = dataset.slice(0, 200);
    return columns.filter((c) => {
      const vals = sample.map((r) => r[c]).filter((v) => v !== null && v !== undefined && v !== '');
      if (vals.length === 0) return false;
      const numericCount = vals.filter((v) => !isNaN(Number(v))).length;
      return numericCount / vals.length >= 0.8;
    });
  }, [dataset, columns]);

  const categoryColumns = useMemo(() => columns.filter((c) => !numericColumns.includes(c)), [columns, numericColumns]);

  const [rowFields, setRowFields] = useState<string[]>([]);
  const [columnField, setColumnField] = useState<string>('');
  const [fieldA, setFieldA] = useState<string>('');
  const [operator, setOperator] = useState<string>('-');
  const [fieldB, setFieldB] = useState<string>('');
  const [aggregation, setAggregation] = useState<string>('sum');
  const [customFormula, setCustomFormula] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);

  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PivotResult | null>(null);

  // Smart defaults once columns are known (Category on rows, Sales - Profit on values)
  useEffect(() => {
    if (columns.length === 0) return;
    setRowFields((prev) => {
      if (prev.length > 0 && prev.every((p) => columns.includes(p))) return prev;
      const cat = categoryColumns.find((c) => /categor|department|class/i.test(c)) || categoryColumns[0];
      return cat ? [cat] : [];
    });
    setFieldA((prev) => {
      if (prev && columns.includes(prev)) return prev;
      return numericColumns.find((c) => /^(sales|revenue|total)/i.test(c)) || numericColumns[0] || '';
    });
    setFieldB((prev) => {
      if (prev && columns.includes(prev)) return prev;
      return numericColumns.find((c) => /profit|cost/i.test(c)) || '';
    });
    setResult(null);
  }, [columns.join('|')]);

  const builtFormula = useMemo(() => {
    if (!fieldA) return '';
    if (!fieldB) return `[${fieldA}]`;
    return `[${fieldA}] ${operator} [${fieldB}]`;
  }, [fieldA, operator, fieldB]);

  const activeFormula = useCustom ? customFormula : builtFormula;

  const addRowField = (name: string) => {
    if (!name || rowFields.includes(name)) return;
    setRowFields([...rowFields, name]);
    if (name === columnField) setColumnField('');
  };

  const handleRun = async () => {
    setError(null);
    if (rowFields.length === 0) {
      setError('Add at least one field to Rows (for example Product Category).');
      return;
    }
    if (!activeFormula.trim()) {
      setError('Choose a Values field first.');
      return;
    }
    setIsRunning(true);
    try {
      const res = await fetch('/api/calculations/pivot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rows: dataset,
          columns,
          rowFields,
          columnField: columnField || null,
          valueFormula: activeFormula,
          aggregation
        })
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data?.success) {
        setResult(json.data as PivotResult);
      } else {
        setResult(null);
        setError(json?.data?.error || json?.message || 'Pivot calculation failed.');
      }
    } catch {
      setResult(null);
      setError('Unable to reach the Python analytics engine.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportCsv = () => {
    if (!result) return;
    const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const header = [...result.row_fields, ...result.column_values, ...(result.column_field ? ['Grand Total'] : [])];
    const lines = [header.map(esc).join(',')];
    result.rows.forEach((r) => {
      lines.push(
        [...r.keys, ...r.values.map((v) => (v ?? '').toString()), ...(result.column_field ? [(r.total ?? '').toString()] : [])]
          .map((x) => esc(String(x)))
          .join(',')
      );
    });
    lines.push(
      [
        'Grand Total',
        ...Array(Math.max(result.row_fields.length - 1, 0)).fill(''),
        ...result.column_totals.map((v) => (v ?? '').toString()),
        ...(result.column_field ? [(result.grand_total ?? '').toString()] : [])
      ]
        .map((x) => esc(String(x)))
        .join(',')
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pivot_table.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const zoneStyle: React.CSSProperties = {
    background: '#F8FAFC',
    border: '1px dashed #CBD5E1',
    borderRadius: 12,
    padding: '12px 14px',
    minHeight: 96
  };

  const zoneTitle = (icon: React.ReactNode, text: string) => (
    <div className="d-flex align-items-center gap-2 mb-2 text-dark fw-bold" style={{ fontSize: '0.8rem' }}>
      <span className="text-primary d-inline-flex">{icon}</span>
      <span>{text}</span>
    </div>
  );

  return (
    <div className="d-flex flex-column gap-3">
      <div className="blyc-card p-4">
        <div className="d-flex align-items-center gap-2 mb-1">
          <div className="p-2 rounded-3 bg-light text-primary">
            <Table size={18} />
          </div>
          <h6 className="fw-bold mb-0 text-dark">Pivot Table Builder</h6>
        </div>
        <p className="text-muted-blyc mb-3" style={{ fontSize: '0.82rem' }}>
          Pick fields from the dropdowns like an Excel PivotTable. The Values formula is calculated per row first (for example Sales − Profit), then summarized by your Rows.
        </p>

        <div className="row g-3">
          {/* Rows */}
          <div className="col-12 col-md-6">
            <div style={zoneStyle}>
              {zoneTitle(<Layers size={14} />, 'Rows')}
              <div className="d-flex flex-wrap gap-2 mb-2">
                {rowFields.length === 0 && <span className="text-muted-blyc small">No row field selected</span>}
                {rowFields.map((f) => (
                  <span key={f} className="badge-pill badge-pill-indigo d-inline-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                    {f}
                    <button
                      type="button"
                      className="btn p-0 border-0 d-inline-flex"
                      style={{ lineHeight: 1, color: 'inherit' }}
                      onClick={() => setRowFields(rowFields.filter((x) => x !== f))}
                      aria-label={`Remove ${f} from Rows`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="d-flex align-items-center gap-2">
                <Plus size={14} className="text-muted-blyc flex-shrink-0" />
                <select
                  className="form-select form-select-sm"
                  value=""
                  onChange={(e) => addRowField(e.target.value)}
                >
                  <option value="">Add field to Rows…</option>
                  {columns
                    .filter((c) => !rowFields.includes(c) && c !== columnField)
                    .map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Columns */}
          <div className="col-12 col-md-6">
            <div style={zoneStyle}>
              {zoneTitle(<Table size={14} />, 'Columns (optional)')}
              <select
                className="form-select form-select-sm"
                value={columnField}
                onChange={(e) => setColumnField(e.target.value)}
              >
                <option value="">None — single value column</option>
                {columns
                  .filter((c) => !rowFields.includes(c))
                  .map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
              </select>
              <div className="text-muted-blyc mt-2" style={{ fontSize: '0.74rem' }}>
                Splits the result into one column per value, such as Region.
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="col-12">
            <div style={zoneStyle}>
              {zoneTitle(<Sigma size={14} />, 'Values')}
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-3">
                  <label className="form-label small text-muted-blyc mb-1">Field</label>
                  <select className="form-select form-select-sm" value={fieldA} onChange={(e) => setFieldA(e.target.value)} disabled={useCustom}>
                    <option value="">Select field…</option>
                    {numericColumns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label small text-muted-blyc mb-1">Operation</label>
                  <select className="form-select form-select-sm" value={operator} onChange={(e) => setOperator(e.target.value)} disabled={useCustom || !fieldB}>
                    {OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label small text-muted-blyc mb-1">With field (optional)</label>
                  <select className="form-select form-select-sm" value={fieldB} onChange={(e) => setFieldB(e.target.value)} disabled={useCustom}>
                    <option value="">None</option>
                    {numericColumns.filter((c) => c !== fieldA).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-2">
                  <label className="form-label small text-muted-blyc mb-1">Summarize by</label>
                  <select className="form-select form-select-sm" value={aggregation} onChange={(e) => setAggregation(e.target.value)}>
                    {AGGREGATIONS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-2">
                  <div className="form-check form-switch mb-1">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="pivotCustomToggle"
                      checked={useCustom}
                      onChange={(e) => {
                        setUseCustom(e.target.checked);
                        if (e.target.checked && !customFormula) setCustomFormula(builtFormula);
                      }}
                    />
                    <label className="form-check-label small" htmlFor="pivotCustomToggle">Custom formula</label>
                  </div>
                </div>
              </div>

              {useCustom ? (
                <input
                  type="text"
                  className="form-control form-control-sm font-monospace mt-2"
                  placeholder="e.g. ([Sales] - [Profit]) * 0.12"
                  value={customFormula}
                  onChange={(e) => setCustomFormula(e.target.value)}
                />
              ) : (
                <div className="mt-2 d-flex align-items-center gap-2 text-muted-blyc" style={{ fontSize: '0.78rem' }}>
                  <Info size={13} className="text-primary flex-shrink-0" />
                  <span>
                    Each row calculates <code>{builtFormula || '—'}</code>, then values are summarized by <strong>{AGGREGATIONS.find((a) => a.value === aggregation)?.label}</strong>.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 pt-3 mt-3 border-top">
          <ActionAlt description="Calculates the Values formula per row, then summarizes it under your Rows and Columns." placement="top" align="left">
            <button type="button" className="btn btn-sm btn-blyc-primary d-flex align-items-center gap-2" onClick={handleRun} disabled={isRunning}>
              {isRunning ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
              <span>Test Calculation</span>
            </button>
          </ActionAlt>
          {result && (
            <ActionAlt description="Download this pivot result as a CSV file for Excel." placement="top">
              <button type="button" className="btn btn-sm btn-blyc-outline d-flex align-items-center gap-2" onClick={handleExportCsv}>
                <Download size={14} />
                <span>Export Pivot CSV</span>
              </button>
            </ActionAlt>
          )}
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mt-3 mb-0 py-2 rounded-3 border" role="alert">
            <AlertCircle size={16} />
            <div className="small">{error}</div>
          </div>
        )}
      </div>

      {result && (
        <div className="blyc-card p-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <Table size={18} className="text-primary" />
              <h6 className="fw-bold mb-0 text-dark">Pivot Result</h6>
              <span className="badge-pill badge-pill-info">{result.rows.length} groups · {result.source_rows} source rows</span>
            </div>
            <span className="text-muted-blyc small">{result.value_label}</span>
          </div>

          <div className="table-responsive border rounded" style={{ maxHeight: 460 }}>
            <table className="table-modern">
              <thead className="sticky-top">
                <tr>
                  {result.row_fields.map((f) => (
                    <th key={f}>{f}</th>
                  ))}
                  {result.column_values.map((c) => (
                    <th key={c} className="text-end">{c}</th>
                  ))}
                  {result.column_field && <th className="text-end">Grand Total</th>}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r, i) => (
                  <tr key={i}>
                    {r.keys.map((k, j) => (
                      <td key={j} className="fw-medium">{k}</td>
                    ))}
                    {r.values.map((v, j) => (
                      <td key={j} className="text-end">{fmt(v)}</td>
                    ))}
                    {result.column_field && <td className="text-end fw-bold">{fmt(r.total)}</td>}
                  </tr>
                ))}
                <tr style={{ background: '#EEF2FF' }}>
                  <td className="fw-bold" colSpan={Math.max(result.row_fields.length, 1)}>Grand Total</td>
                  {result.column_totals.map((v, j) => (
                    <td key={j} className="text-end fw-bold">{fmt(v)}</td>
                  ))}
                  {result.column_field && <td className="text-end fw-bold">{fmt(result.grand_total)}</td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
