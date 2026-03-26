/**
 * Express Server - Square Integration Backend
 * Production-ready server with Square POS integration
 * 
 * This server handles:
 * - Square API integration for payments and orders
 * - Webhook processing for real-time events
 * - Data synchronization
 * - REST API endpoints for the frontend
 */

// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import path from 'path';
import { logger, LogLevel } from './utils/logger';
import { squareService } from './services/squareService';
import squareRoutes from './routes/squareRoutes';
import webhookRoutes from './routes/webhookRoutes';
import integrationRoutes from './routes/integrationRoutes';

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 5000;

// ============ MIDDLEWARE ============

// CORS - Allow requests from frontend
app.use(
  cors({
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Allow localhost on any port, and the specified client domain
      if (
        !origin ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin === process.env.CLIENT_DOMAIN
      ) {
        callback(null, true);
      } else {
        logger.warn(`⚠️  CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  } as CorsOptions)
);

// Parse JSON body
app.use(express.json());

// Parse URL encoded body
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level =
      res.statusCode >= 400 ? LogLevel.WARN : LogLevel.DEBUG;
    logger.debug(`${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// ============ HEALTH CHECK ============

/**
 * GET /health
 * Basic health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ============ API ROUTES ============

/**
 * Square Integration Routes
 * Base: /square
 */
app.use('/square', squareRoutes);

/**
 * Integration Management Routes
 * Base: /integrations
 */
app.use('/integrations', integrationRoutes);

/**
 * Webhook Routes
 * Base: /webhook
 */
app.use('/webhook', webhookRoutes);

// ============ STATIC FILE SERVING ============
// Serve frontend static files from dist/ folder
const frontendDistPath = path.join(__dirname, '../../dist');
app.use(express.static(frontendDistPath));

// SPA routing: Serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api') || req.path.startsWith('/square') || req.path.startsWith('/webhook') || req.path.startsWith('/integrations')) {
    res.status(404).json({ status: 'error', message: `Endpoint not found: ${req.method} ${req.path}` });
    return;
  }
  // Serve index.html for all other routes (SPA)
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// ============ EXISTING SERVER ROUTES ============
// Note: The existing Express server (index.js) already has:
// - Stripe endpoints at /webhook (POST)
// - Shopify routes at /api/shopify/*
// - QuickBooks routes at /api/quickbooks/*
// Make sure these don't conflict with our new routes

// ============ ERROR HANDLING ============

/**
 * 404 Not Found handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Endpoint not found: ${req.method} ${req.path}`,
    available_endpoints: {
      square: {
        'GET /square/health': 'Health check',
        'GET /square/status': 'Get sync status',
        'GET /square/payments': 'Get all payments',
        'GET /square/orders': 'Get all orders',
        'POST /square/connect': 'Connect to Square',
        'POST /square/sync': 'Manual sync',
      },
      integrations: {
        'GET /integrations/square/status': 'Square status',
        'GET /integrations/square/payments': 'Square payments',
        'GET /integrations/square/orders': 'Square orders',
        'POST /integrations/square/connect': 'Connect Square',
        'POST /integrations/square/sync': 'Sync Square data',
      },
      webhooks: {
        'POST /webhook/square': 'Square webhooks',
        'POST /webhook/square/test': 'Test Square webhook',
      },
    },
  });
});

/**
 * Global error handler
 */
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('❌ Unhandled error', error);

  res.status(error.status || 500).json({
    status: 'error',
    message: error.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// ============ INITIALIZE SERVER ============

/**
 * Start the server
 */
const server = app.listen(PORT, async () => {
  logger.info(`🚀 Server started on http://localhost:${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Initialize Square integration on startup
  logger.info('🔧 Initializing Square integration...');
  try {
    const isConnected = await squareService.initializeConnection();
    if (isConnected) {
      logger.info('✅ Square integration ready');
    } else {
      logger.warn('⚠️  Square credentials not configured');
    }
  } catch (error) {
    logger.error('❌ Error initializing Square', error);
  }

  // Log available endpoints
  logger.info('📚 API Endpoints:');
  logger.info('   Square Integration:');
  logger.info('     GET  /square/health - Health check');
  logger.info('     POST /square/connect - Connect to Square');
  logger.info('     GET  /square/payments - Get payments');
  logger.info('     GET  /square/orders - Get orders');
  logger.info('     POST /square/sync - Manual sync');
  logger.info('   Webhooks:');
  logger.info('     POST /webhook/square - Square webhooks');
  logger.info('     POST /webhook/square/test - Test webhook');
});

/**
 * Handle port already in use
 */
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use`);
    logger.info(`💡 Try: PORT=6000 npm start`);
    process.exit(1);
  }
});

/**
 * Handle graceful shutdown
 */
process.on('SIGTERM', () => {
  logger.info('📬 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('📬 SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('✅ Server closed');
    process.exit(0);
  });
});

// ============ HANDLE UNCAUGHT EXCEPTIONS ============

process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled rejection', { reason, promise });
  process.exit(1);
});

export default app;
