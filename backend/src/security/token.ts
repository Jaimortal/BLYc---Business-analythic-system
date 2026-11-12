import jwt from 'jsonwebtoken';
import { envConfig } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, envConfig.JWT_SECRET, {
    expiresIn: '7d'
  });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, envConfig.JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
};
