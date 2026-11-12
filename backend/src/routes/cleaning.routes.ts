import { Router } from 'express';
import { CleaningController } from '../controllers/cleaning.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all data cleaning actions behind verified authentication
router.post('/category-suggestions', authenticate, CleaningController.getCategorySuggestions);
router.post('/preview-imputation', authenticate, CleaningController.previewImputation);
router.post('/apply', authenticate, CleaningController.applyCleaning);
router.post('/profile', authenticate, CleaningController.profileColumns);

export default router;
