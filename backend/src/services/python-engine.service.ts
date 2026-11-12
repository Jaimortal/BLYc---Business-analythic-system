import axios from 'axios';
import FormData from 'form-data';
import { envConfig } from '../config/env.js';

export class PythonEngineClient {
  private static baseURL = envConfig.PYTHON_ENGINE_URL;

  static async inspectDataset(fileBuffer: Buffer, filename: string) {
    const formData = new FormData();
    formData.append('file', fileBuffer, filename);

    try {
      const response = await axios.post(`${this.baseURL}/dataset/inspect`, formData, {
        headers: {
          ...formData.getHeaders()
        },
        maxContentLength: 30 * 1024 * 1024,
        maxBodyLength: 30 * 1024 * 1024,
        timeout: 30000
      });

      return response.data;
    } catch (err: any) {
      if (err.response) {
        throw new Error(err.response.data?.detail || 'Python engine processing error.');
      }
      throw new Error(`Failed to communicate with internal Python analytics engine: ${err.message}`);
    }
  }

  static async getCategorySuggestions(column: string, records: any[]) {
    try {
      const response = await axios.post(
        `${this.baseURL}/cleaning/category-suggestions`,
        records,
        {
          params: { column },
          timeout: 15000
        }
      );
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to detect category suggestions.');
    }
  }

  static async previewImputation(column: string, strategy: string, records: any[], constantValue?: any) {
    try {
      const response = await axios.post(
        `${this.baseURL}/cleaning/preview-imputation`,
        records,
        {
          params: { column, strategy, constant_value: constantValue },
          timeout: 15000
        }
      );
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to generate imputation preview.');
    }
  }

  static async profileColumns(records: any[]) {
    try {
      const response = await axios.post(`${this.baseURL}/cleaning/profile`, records, { timeout: 15000 });
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to profile dataset columns.');
    }
  }

  static async applyCleaning(cleanRequest: any) {
    try {
      const response = await axios.post(
        `${this.baseURL}/cleaning/apply`,
        cleanRequest,
        { timeout: 30000 }
      );
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to execute dataset cleaning.');
    }
  }

  static async computeAnalytics(records: any[], columnMappings?: Record<string, string>) {
    try {
      const response = await axios.post(
        `${this.baseURL}/analytics/compute`,
        { records, column_mappings: columnMappings },
        { timeout: 30000 }
      );
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to compute analytics metrics.');
    }
  }

  static async validateFormula(formula: string, columns: string[]) {
    try {
      const response = await axios.post(
        `${this.baseURL}/calculations/validate`,
        { formula, columns },
        { timeout: 10000 }
      );
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to validate formula.');
    }
  }

  static async evaluateCalculation(rows: any[], columns: string[], formula: string, targetColumn: string) {
    try {
      const response = await axios.post(
        `${this.baseURL}/calculations/evaluate`,
        { rows, columns, formula, target_column: targetColumn },
        { timeout: 30000 }
      );
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to evaluate calculation.');
    }
  }

  static async pivotTable(payload: any) {
    try {
      const response = await axios.post(
        `${this.baseURL}/calculations/pivot`,
        payload,
        { timeout: 30000 }
      );
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to build pivot table.');
    }
  }

  static async checkHealth() {
    const response = await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
    return response.data;
  }
}
