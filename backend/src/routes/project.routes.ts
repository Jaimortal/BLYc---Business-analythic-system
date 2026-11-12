import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// List all projects for authenticated user
router.get('/', authenticate, ProjectController.list);

// Create new project
router.post('/', authenticate, ProjectController.create);

// Import .blyc.json project
router.post('/import', authenticate, ProjectController.importProject);

// Retrieve project by ID
router.get('/:id', authenticate, ProjectController.getById);

// Export project as .blyc.json file download
router.get('/:id/export', authenticate, ProjectController.exportProject);

// Delete project
router.delete('/:id', authenticate, ProjectController.delete);

export default router;
