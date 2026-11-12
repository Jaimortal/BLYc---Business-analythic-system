import { Router } from 'express';
import { AIController } from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Send prompt to AI Business Assistant
router.post('/chat', authenticate, AIController.chat);

// Get suggested business analysis prompts
router.get('/suggest-questions', authenticate, AIController.getSuggestedQuestions);

export default router;
