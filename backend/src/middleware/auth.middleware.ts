import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../security/token.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.cookies?.blyc_session;

  if (!token) {
    // In local development or testing mode, provide seamless session fallback
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        userId: 'dev_user_local',
        email: 'founder@blyc.local',
        role: 'admin'
      };
      next();
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Authentication required. No active session found.'
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        userId: 'dev_user_local',
        email: 'founder@blyc.local',
        role: 'admin'
      };
      next();
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Session has expired or is invalid. Please sign in again.'
    });
    return;
  }

  req.user = payload;
  next();
};
