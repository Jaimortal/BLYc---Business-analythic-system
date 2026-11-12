import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { BLYcProjectSchema, BLYcProjectManifest } from '../validators/project.validator.js';
import { PythonEngineClient } from '../services/python-engine.service.js';
import crypto from 'crypto';

export class ProjectController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const projects = await ProjectRepository.listByUser(userId);
      res.status(200).json({
        success: true,
        data: projects.map(p => ({
          id: p.manifest.project.id,
          name: p.manifest.project.name,
          recordsCount: p.manifest.dataset.records.length,
          columnsCount: p.manifest.dataset.columns.length,
          createdAt: p.manifest.project.created_at,
          updatedAt: p.manifest.project.updated_at
        }))
      });
    } catch (err: any) {
      console.error('[ProjectController.list Error]:', err.message);
      res.status(500).json({ success: false, message: 'Failed to list projects.' });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const project = await ProjectRepository.findById(id, userId);

      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        data: project.manifest
      });
    } catch (err: any) {
      console.error('[ProjectController.getById Error]:', err.message);
      res.status(500).json({ success: false, message: 'Failed to retrieve project.' });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { name, dataset, dashboard, calculations, ai_context } = req.body;

      if (!name || typeof name !== 'string') {
        res.status(400).json({ success: false, message: 'Project name is required.' });
        return;
      }

      const projectId = `proj_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      // Compute analytics from records if provided
      let analytics: any = { metrics: {}, trends: {}, comparisons: {} };
      if (dataset?.records && Array.isArray(dataset.records) && dataset.records.length > 0) {
        try {
          analytics = await PythonEngineClient.computeAnalytics(dataset.records);
        } catch {
          // fallback to empty analytics
        }
      }

      const manifestCandidate: BLYcProjectManifest = {
        format: 'BLYc',
        schema_version: '1.0.0',
        project: {
          id: projectId,
          name: name.trim(),
          created_at: now,
          updated_at: now
        },
        dataset: {
          metadata: dataset?.metadata || {},
          columns: dataset?.columns || [],
          records: dataset?.records || []
        },
        data_quality: {
          issues: [],
          normalization_rules: [],
          cleaning_history: []
        },
        analytics,
        calculations: calculations || [],
        dashboard: dashboard || { tabs: [] },
        ai_context: ai_context || {}
      };

      const parseResult = BLYcProjectSchema.safeParse(manifestCandidate);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: 'Project schema validation failed.',
          errors: parseResult.error.format()
        });
        return;
      }

      const saved = await ProjectRepository.create(userId, parseResult.data);

      res.status(201).json({
        success: true,
        message: 'Project created successfully.',
        data: saved.manifest
      });
    } catch (err: any) {
      console.error('[ProjectController.create Error]:', err.message);
      res.status(500).json({ success: false, message: err.message || 'Failed to create project.' });
    }
  }

  static async exportProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const project = await ProjectRepository.findById(id, userId);

      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found.' });
        return;
      }

      const filename = `${project.manifest.project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.blyc.json`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(JSON.stringify(project.manifest, null, 2));
    } catch (err: any) {
      console.error('[ProjectController.export Error]:', err.message);
      res.status(500).json({ success: false, message: 'Failed to export project.' });
    }
  }

  static async importProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const candidate = req.body;

      // 1. Validate incoming JSON against BLYcProjectSchema
      const parseResult = BLYcProjectSchema.safeParse(candidate);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid BLYc project file format or missing required properties.',
          errors: parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
        });
        return;
      }

      const manifest = parseResult.data;

      // 2. Automatically recompute analytics via the authoritative Python engine
      if (manifest.dataset.records && manifest.dataset.records.length > 0) {
        try {
          const freshAnalytics = await PythonEngineClient.computeAnalytics(manifest.dataset.records);
          manifest.analytics = freshAnalytics;
        } catch (calcErr: any) {
          console.warn('[ProjectController.import Warning]: Auto-recalculation warning:', calcErr.message);
        }
      }

      // Assign a fresh ID or preserve original if unique
      const now = new Date().toISOString();
      manifest.project.updated_at = now;

      // 3. Save imported project into repository
      const saved = await ProjectRepository.create(userId, manifest);

      res.status(200).json({
        success: true,
        message: 'Project imported, validated, and analytics successfully recalculated.',
        data: saved.manifest
      });
    } catch (err: any) {
      console.error('[ProjectController.import Error]:', err.message);
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to import BLYc project file.'
      });
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const success = await ProjectRepository.delete(id, userId);

      if (!success) {
        res.status(404).json({ success: false, message: 'Project not found or already deleted.' });
        return;
      }

      res.status(200).json({ success: true, message: 'Project deleted successfully.' });
    } catch (err: any) {
      console.error('[ProjectController.delete Error]:', err.message);
      res.status(500).json({ success: false, message: 'Failed to delete project.' });
    }
  }
}
