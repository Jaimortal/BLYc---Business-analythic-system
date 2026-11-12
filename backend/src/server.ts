import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import fs from 'fs';
import path from 'path';
import { envConfig } from './config/env.js';
import { connectDB } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import datasetRoutes from './routes/dataset.routes.js';
import cleaningRoutes from './routes/cleaning.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import calculationRoutes from './routes/calculation.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import projectRoutes from './routes/project.routes.js';
import aiRoutes from './routes/ai.routes.js';

const app = express();
const PORT = Number(envConfig.PORT) || 5000;

// Connect to MongoDB Atlas (or graceful memory fallback)
connectDB();

// Global Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: envConfig.CLIENT_URL,
  credentials: true
}));
app.use(cookieParser(envConfig.COOKIE_SECRET));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api', apiLimiter);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'BLYc Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/dataset', datasetRoutes);
app.use('/api/cleaning', cleaningRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/calculations', calculationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/ai', aiRoutes);

// Serve built frontend assets in single-server mode
const candidatePaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist')
];
const frontendDistPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];

if (fs.existsSync(frontendDistPath)) {
  console.log(`[BLYc Static] Serving frontend from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    const indexPath = path.join(frontendDistPath, 'index.html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(indexPath);
  });
} else {
  console.warn(`[BLYc Static Warning]: Frontend dist not found at any candidate location.`);
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred.'
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[BLYc Backend] Running on http://localhost:${PORT}`);
  });
}

export default app;
