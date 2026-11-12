import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PythonEngineClient } from '../services/python-engine.service.js';

export class AnalyticsController {
  static async compute(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { records, columnMappings } = req.body;

      if (!records || !Array.isArray(records)) {
        res.status(400).json({
          success: false,
          message: 'Records array is required for analytics computation.'
        });
        return;
      }

      const analytics = await PythonEngineClient.computeAnalytics(records, columnMappings);

      res.status(200).json({
        success: true,
        message: 'Analytics computed successfully.',
        data: analytics
      });
    } catch (err: any) {
      console.error('[AnalyticsController Error]:', err.message);
      res.status(400).json({
        success: false,
        message: err.message || 'Analytics computation failed.'
      });
    }
  }
}
