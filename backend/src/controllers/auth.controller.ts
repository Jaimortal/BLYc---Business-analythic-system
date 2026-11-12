import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { envConfig } from '../config/env.js';

const COOKIE_NAME = 'blyc_session';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: envConfig.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(validated);

      res.cookie(COOKIE_NAME, result.token, getCookieOptions());
      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        data: { user: result.user }
      });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          message: err.errors[0]?.message || 'Invalid input data.'
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: err.message || 'Registration failed.'
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated);

      res.cookie(COOKIE_NAME, result.token, getCookieOptions());
      res.status(200).json({
        success: true,
        message: 'Signed in successfully.',
        data: { user: result.user }
      });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          message: err.errors[0]?.message || 'Invalid input data.'
        });
        return;
      }
      res.status(401).json({
        success: false,
        message: err.message || 'Authentication failed.'
      });
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: envConfig.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    res.status(200).json({
      success: true,
      message: 'Signed out successfully.'
    });
  }

  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated.' });
        return;
      }

      const user = await AuthService.getCurrentUser(req.user.userId);
      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (err: any) {
      res.status(404).json({
        success: false,
        message: err.message || 'User not found.'
      });
    }
  }
}
