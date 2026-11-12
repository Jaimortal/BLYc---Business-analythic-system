import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { DashboardConfigRepository } from '../repositories/dashboard-tab.repository.js';

export class DashboardController {
  static async getConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const projectId = (req.query.projectId as string) || 'default';
      const config = await DashboardConfigRepository.getConfig(userId, projectId);

      res.status(200).json({
        success: true,
        data: config
      });
    } catch (err: any) {
      console.error('[DashboardController.getConfig Error]:', err.message);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard configuration.'
      });
    }
  }

  static async saveTabs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { projectId, tabs } = req.body;

      if (!tabs || !Array.isArray(tabs)) {
        res.status(400).json({
          success: false,
          message: 'Tabs array is required.'
        });
        return;
      }

      const config = await DashboardConfigRepository.saveTabs(
        userId,
        projectId || 'default',
        tabs
      );

      res.status(200).json({
        success: true,
        message: 'Dashboard tabs saved successfully.',
        data: config
      });
    } catch (err: any) {
      console.error('[DashboardController.saveTabs Error]:', err.message);
      res.status(500).json({
        success: false,
        message: 'Failed to save dashboard tabs.'
      });
    }
  }
}
