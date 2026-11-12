import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PythonEngineClient } from '../services/python-engine.service.js';

export class DatasetController {
  static async uploadAndInspect(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No spreadsheet file provided. Please attach a .xlsx, .xls, or .csv file.'
        });
        return;
      }

      // Safe file sanitization
      const originalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');

      // Forward to internal Python engine
      const inspectionResult = await PythonEngineClient.inspectDataset(
        req.file.buffer,
        originalName
      );

      res.status(200).json({
        success: true,
        message: 'Dataset inspected successfully.',
        data: inspectionResult
      });
    } catch (err: any) {
      console.error('[DatasetController Error]:', err.message);
      res.status(400).json({
        success: false,
        message: err.message || 'Dataset processing failed.'
      });
    }
  }
}
