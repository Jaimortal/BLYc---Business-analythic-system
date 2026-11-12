import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Secure analytics calculation endpoint
router.post('/compute', authenticate, AnalyticsController.compute);

export default router;
