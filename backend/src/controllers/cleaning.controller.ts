import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PythonEngineClient } from '../services/python-engine.service.js';

export class CleaningController {
  static async getCategorySuggestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { column } = req.query;
      const { records } = req.body;

      if (!column || !records || !Array.isArray(records)) {
        res.status(400).json({
          success: false,
          message: 'Both column name (query parameter) and records array (request body) are required.'
        });
        return;
      }

      const suggestions = await PythonEngineClient.getCategorySuggestions(String(column), records);
      res.status(200).json({
        success: true,
        data: suggestions
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to detect category suggestions.'
      });
    }
  }

  static async previewImputation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { column, strategy, constantValue } = req.query;
      const { records } = req.body;

      if (!column || !strategy || !records || !Array.isArray(records)) {
        res.status(400).json({
          success: false,
          message: 'Column, strategy, and records array are required.'
        });
        return;
      }

      const preview = await PythonEngineClient.previewImputation(
        String(column),
        String(strategy),
        records,
        constantValue
      );

      res.status(200).json({
        success: true,
        data: preview
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Imputation preview failed.'
      });
    }
  }

  static async profileColumns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { records } = req.body;
      if (!records || !Array.isArray(records)) {
        res.status(400).json({ success: false, message: 'Records array is required.' });
        return;
      }
      const profile = await PythonEngineClient.profileColumns(records);
      res.status(200).json({ success: true, data: profile });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Column profiling failed.' });
    }
  }

  static async applyCleaning(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { records } = req.body;
      if (!records || !Array.isArray(records)) {
        res.status(400).json({
          success: false,
          message: 'Records array is required for dataset cleaning.'
        });
        return;
      }

      const result = await PythonEngineClient.applyCleaning(req.body);
      res.status(200).json({
        success: true,
        message: 'Dataset cleaned and transformed successfully.',
        data: result
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to apply cleaning transformations.'
      });
    }
  }
}
