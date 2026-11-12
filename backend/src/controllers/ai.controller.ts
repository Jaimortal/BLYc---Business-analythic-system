import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { GroqAIService } from '../ai/groq.service.js';

export class AIController {
  static async chat(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { message, analyticsContext, conversationHistory, businessType } = req.body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({
          success: false,
          message: 'Chat prompt message is required.'
        });
        return;
      }

      const result = await GroqAIService.askAssistant(
        message.trim(),
        {
          ...(analyticsContext || {}),
          business_type: businessType || analyticsContext?.business_type
        },
        Array.isArray(conversationHistory) ? conversationHistory : []
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err: any) {
      console.error('[AIController.chat Error]:', err?.message || err);
      // Return 200 with fallback response rather than breaking the UI
      res.status(200).json({
        success: true,
        data: {
          response: `The AI assistant encountered an unexpected processing condition: ${err?.message || 'Context parsing issue'}. Please ensure your dataset is loaded and try again.`,
          model: 'openai/gpt-oss-20b',
          source: 'local_fallback'
        }
      });
    }
  }

  static async getSuggestedQuestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const defaultSuggestions = [
      'Summarize my overall business health and performance',
      'Which products are generating the highest profit margins?',
      'What are my dominant revenue categories and how are they trending?',
      'Where are opportunities to cut costs or improve inventory efficiency?',
      'What pricing or bundling strategy would you recommend for my top items?'
    ];

    res.status(200).json({
      success: true,
      data: defaultSuggestions
    });
  }
}
