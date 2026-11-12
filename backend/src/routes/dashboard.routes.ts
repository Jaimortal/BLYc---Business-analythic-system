import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Get dashboard tabs & widget configuration
router.get('/config', authenticate, DashboardController.getConfig);

// Save custom tabs & layout configuration
router.post('/tabs', authenticate, DashboardController.saveTabs);

export default router;
