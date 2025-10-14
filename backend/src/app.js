import express from 'express';
import cors from 'cors';
import config from './config/env.js';
import logger from './config/logger.js';
import pool from './config/database.js';

// Import routes
import projectsRoutes from './modules/projects/routes.js';
import filesRoutes from './modules/files/routes.js';
import extractionsRoutes from './routes/extractions.js';  // NEW
import lineItemsRoutes from './routes/line-items.js';     // NEW
import estimatesRoutes from './routes/estimates.js';      // NEW

import exportsRoutes from './routes/exports.js';

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : true,
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env
  });
});

// API routes
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/files', filesRoutes);
app.use('/api/v1/extractions', extractionsRoutes);    // NEW
app.use('/api/v1/line-items', lineItemsRoutes);       // NEW
app.use('/api/v1/estimates', estimatesRoutes);        // NEW
app.use('/api/v1/estimates', exportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.env === 'development' ? err.message : undefined
  });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('✅ Database connected');

    // Start Express server
    app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📝 Environment: ${config.env}`);
      logger.info(`🔗 Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;