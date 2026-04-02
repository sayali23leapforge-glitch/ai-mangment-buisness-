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
 * Returns REAL data only, or throws error if cannot fetch
 */
export const connectSquare = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('🔌 Square connect endpoint called');

    // Initialize connection - will throw error if credentials not set
    const isConnected = await squareService.initializeConnection();

    if (!isConnected) {
      throw new Error('❌ Failed to establish Square connection. Check your Square credentials (SQUARE_ACCESS_TOKEN, SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID)');
    }

    // Perform data sync - will throw error if API call fails
    logger.info('📥 Performing initial data sync...');
    const { payments, orders } = await squareService.syncAllData();

    res.json({
      status: 'success',
      message: 'Connected to Square and fetched real data',
      data: {
        connected: true,
        total_payments_synced: payments.length,
        total_orders_synced: orders.length,
        payments: payments,
        orders: orders,
        timestamp: new Date().toISOString(),
      },
    });

    logger.info('✅ Square connect successful', {
      payments: payments.length,
      orders: orders.length,
    });
  } catch (error) {
    logger.error('❌ Square connect failed', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Square';
    
    res.status(400).json({
      status: 'error',
      message: errorMessage,
      data: { connected: false },
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
 * GET /square/debug
 * Debug endpoint - checks if Square environment variables are configured
 */
export const getDebugInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const hasAccessToken = !!process.env.SQUARE_ACCESS_TOKEN;
    const hasAppId = !!process.env.SQUARE_APPLICATION_ID;
    const hasLocationId = !!process.env.SQUARE_LOCATION_ID;
    const environment = process.env.SQUARE_ENVIRONMENT || 'unknown';

    const isFullyConfigured = hasAccessToken && hasAppId && hasLocationId;

    res.json({
      status: 'ok',
      debug: {
        configured: isFullyConfigured,
        environment,
        has_access_token: hasAccessToken,
        has_application_id: hasAppId,
        has_location_id: hasLocationId,
        message: isFullyConfigured 
          ? '✅ Square is fully configured and ready to use'
          : '❌ Square configuration incomplete. Please add SQUARE_ACCESS_TOKEN, SQUARE_APPLICATION_ID, and SQUARE_LOCATION_ID environment variables.',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('❌ Debug check failed', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Debug check failed',
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
 * GET /square/raw-data
 * Debug endpoint - shows ACTUAL raw data from Square API
 * This fetches fresh data directly from Square right now
 */
export const getRawSquareData = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('🔍 Fetching RAW Square data for debugging...');

    // Fetch fresh raw data from Square API
    const payments = await squareService.syncPayments();
    const orders = await squareService.syncOrders();

    logger.info('✅ Raw data fetch complete', {
      actual_payments: payments.length,
      actual_orders: orders.length,
    });

    res.json({
      status: 'success',
      message: 'Raw data from Square API RIGHT NOW',
      data: {
        payments_count: payments.length,
        orders_count: orders.length,
        location_id: process.env.SQUARE_LOCATION_ID,
        timestamp: new Date().toISOString(),
        payments: payments.map((p: any) => ({
          id: p.id,
          amount: p.amount_money?.amount,
          status: p.status,
          created_at: p.created_at,
        })),
        orders: orders.map((o: any) => ({
          id: o.id,
          reference_id: o.reference_id,
          state: o.state,
          total: o.total_money?.amount,
          created_at: o.created_at,
        })),
      },
    });
  } catch (error) {
    logger.error('❌ Failed to fetch raw Square data', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch raw data',
      debug_info: {
        location_id: process.env.SQUARE_LOCATION_ID,
        has_token: !!process.env.SQUARE_ACCESS_TOKEN,
      },
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
