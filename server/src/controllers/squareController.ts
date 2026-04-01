/**
 * Square Controller
 * Handles HTTP requests for Square API endpoints
 * Manages payments, orders, and synchronization
 */

import { Request, Response } from 'express';
import { squareService } from '../services/squareService';
import { logger } from '../utils/logger';

/**
 * GET /square/health
 * Health check - verify Square integration is working
 */
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = squareService.getStats();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      data: stats,
    });
  } catch (error) {
    logger.error('❌ Health check failed', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Health check failed',
    });
  }
};

/**
 * POST /integrations/square/connect
 * Connect to Square - Initialize Square integration
 * Frontend calls this when user clicks "Connect" button
 */
export const connectSquare = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('🔌 Square connect endpoint called');

    // Initialize connection
    const isConnected = await squareService.initializeConnection();

    if (isConnected) {
      // Perform initial sync
      logger.info('📥 Performing initial data sync...');
      const { payments, orders } = await squareService.syncAllData();

      res.json({
        status: 'success',
        message: 'Connected to Square and synced data',
        data: {
          connected: true,
          total_payments_synced: payments.length,
          total_orders_synced: orders.length,
          payments: payments,  // Return actual payments data
          orders: orders,      // Return actual orders data
          timestamp: new Date().toISOString(),
        },
      });

      logger.info('✅ Square connect successful', {
        payments: payments.length,
        orders: orders.length,
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: 'Failed to connect to Square',
        data: { connected: false },
      });
    }
  } catch (error) {
    logger.error('❌ Square connect failed', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed',
    });
  }
};

/**
 * GET /square/payments
 * Get all synced payments from database
 */
export const getPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const payments = squareService.getPayments();
    logger.info(`📊 Retrieved ${payments.length} payments`);

    res.json({
      status: 'success',
      data: payments,
      count: payments.length,
    });
  } catch (error) {
    logger.error('❌ Failed to get payments', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to get payments',
    });
  }
};

/**
 * GET /square/orders
 * Get all synced orders from database
 */
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = squareService.getOrders();
    logger.info(`📊 Retrieved ${orders.length} orders`);

    res.json({
      status: 'success',
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    logger.error('❌ Failed to get orders', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to get orders',
    });
  }
};

/**
 * POST /square/sync
 * Manual trigger to sync all data from Square
 * Useful for refreshing data on demand
 */
export const syncData = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('🔄 Manual sync triggered');

    const { payments, orders } = await squareService.syncAllData();

    res.json({
      status: 'success',
      message: 'Data synced successfully',
      data: {
        payments_synced: payments.length,
        orders_synced: orders.length,
        timestamp: new Date().toISOString(),
      },
    });

    logger.info('✅ Manual sync complete', {
      payments: payments.length,
      orders: orders.length,
    });
  } catch (error) {
    logger.error('❌ Sync failed', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Sync failed',
    });
  }
};

/**
 * GET /square/status
 * Get current sync and connection status
 */
export const getStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = squareService.getStats();

    res.json({
      status: 'success',
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('❌ Failed to get status', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to get status',
    });
  }
};

/**
 * GET /square/payments/:id
 * Get a specific payment by ID
 */
export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const payments = squareService.getPayments();
    const payment = payments.find(p => p.id === id);

    if (payment) {
      res.json({
        status: 'success',
        data: payment,
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'Payment not found',
      });
    }
  } catch (error) {
    logger.error('❌ Failed to get payment', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to get payment',
    });
  }
};

/**
 * GET /square/orders/:id
 * Get a specific order by ID
 */
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orders = squareService.getOrders();
    const order = orders.find(o => o.id === id);

    if (order) {
      res.json({
        status: 'success',
        data: order,
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'Order not found',
      });
    }
  } catch (error) {
    logger.error('❌ Failed to get order', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to get order',
    });
  }
};
