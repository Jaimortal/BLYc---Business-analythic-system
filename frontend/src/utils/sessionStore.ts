/**
 * BLYc Tab-Isolated Session Storage
 * 
 * Rules:
 * 1. Data lives strictly in `sessionStorage` (scoped to a single browser tab).
 * 2. Opening a new tab creates a fresh, empty workspace (zero data leakage).
 * 3. Reloading the current tab (Ctrl+R / F5) preserves the current session data.
 * 4. Cleaning up any legacy `localStorage` keys so previous persistent data is wiped.
 */

const DATASET_KEY = 'blyc_session_dataset';
const PROJECT_KEY = 'blyc_session_project';

// One-time cleanup of legacy persistent localStorage data so it never bleeds into new tabs
try {
  localStorage.removeItem('blyc_active_dataset');
  localStorage.removeItem('blyc_active_project');
} catch {
  // ignore
}

export interface ActiveProjectInfo {
  id: string;
  name: string;
}

export const getActiveDataset = (): Record<string, any>[] | null => {
  try {
    const raw = sessionStorage.getItem(DATASET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
};

export const setActiveDataset = (records: Record<string, any>[] | null): void => {
  try {
    if (!records || records.length === 0) {
      sessionStorage.removeItem(DATASET_KEY);
    } else {
      sessionStorage.setItem(DATASET_KEY, JSON.stringify(records));
    }
    window.dispatchEvent(new CustomEvent('blyc_dataset_updated'));
  } catch {
    // ignore
  }
};

export const getActiveProject = (): ActiveProjectInfo | null => {
  try {
    const raw = sessionStorage.getItem(PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.name ? parsed : null;
  } catch {
    return null;
  }
};

export const setActiveProject = (project: ActiveProjectInfo | null): void => {
  try {
    if (!project) {
      sessionStorage.removeItem(PROJECT_KEY);
    } else {
      sessionStorage.setItem(PROJECT_KEY, JSON.stringify(project));
    }
    window.dispatchEvent(new CustomEvent('blyc_dataset_updated'));
  } catch {
    // ignore
  }
};

export const clearTabSession = (): void => {
  try {
    sessionStorage.removeItem(DATASET_KEY);
    sessionStorage.removeItem(PROJECT_KEY);
    window.dispatchEvent(new CustomEvent('blyc_dataset_updated'));
  } catch {
    // ignore
  }
};

export const DEMO_SAMPLE_DATASET: Record<string, any>[] = [
  { "Order_ID": "ORD-101", "Order_Date": "2026-02-01", "Product": "Mechanical Keyboard Pro", "Category": "Electronics", "Selling_Price": 89.99, "Cost": 45.0, "Quantity": 15 },
  { "Order_ID": "ORD-102", "Order_Date": "2026-02-02", "Product": "Gaming Mouse RGB", "Category": "Electronics", "Selling_Price": 49.99, "Cost": 20.0, "Quantity": 24 },
  { "Order_ID": "ORD-103", "Order_Date": "2026-02-03", "Product": "Desk Mat XL Stitch", "Category": "Accessories", "Selling_Price": 19.99, "Cost": 8.0, "Quantity": 40 },
  { "Order_ID": "ORD-104", "Order_Date": "2026-02-04", "Product": "USB-C Dual 4K Hub", "Category": "Accessories", "Selling_Price": 34.99, "Cost": 14.0, "Quantity": 18 },
  { "Order_ID": "ORD-105", "Order_Date": "2026-02-05", "Product": "Mechanical Keyboard Pro", "Category": "electronics", "Selling_Price": 89.99, "Cost": 45.0, "Quantity": 10 },
  { "Order_ID": "ORD-106", "Order_Date": "2026-02-06", "Product": "Noise-Canceling Headset", "Category": "Audio", "Selling_Price": 129.99, "Cost": 65.0, "Quantity": 12 },
  { "Order_ID": "ORD-107", "Order_Date": "2026-02-07", "Product": "Wrist Rest Ergonomic", "Category": "Accessories", "Selling_Price": 14.99, "Cost": 6.0, "Quantity": 30 }
];
