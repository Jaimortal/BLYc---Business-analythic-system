import { Router } from 'express';
import { CalculationController } from '../controllers/calculation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Validate formula syntax and columns
router.post('/validate', authenticate, CalculationController.validate);

// Evaluate custom formula over dataset rows
router.post('/evaluate', authenticate, CalculationController.evaluate);

// Excel-style pivot table over dataset rows
router.post('/pivot', authenticate, CalculationController.pivot);

export default router;
