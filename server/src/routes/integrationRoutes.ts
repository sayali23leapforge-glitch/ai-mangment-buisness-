/**
 * Integration Routes
 * Unified endpoint for all integrations (Square, Shopify, etc.)
 * Frontend will call these endpoints to manage integrations
 */

import { Router } from 'express';
import * as squareController from '../controllers/squareController';

const router = Router();

/**
 * Square Integration Endpoints
 */

/**
 * POST /integrations/square/connect
 * Connect to Square - called when user clicks "Connect" button
 */
router.post('/square/connect', squareController.connectSquare);

/**
 * GET /integrations/square/status
 * Get Square connection and sync status
 */
router.get(
  '/square/status',
  async (req, res) => {
    try {
      await squareController.getStatus(req, res);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get Square status' });
    }
  }
);

/**
 * GET /integrations/square/payments
 * Get all synced payments
 */
router.get('/square/payments', squareController.getPayments);

/**
 * GET /integrations/square/orders
 * Get all synced orders
 */
router.get('/square/orders', squareController.getOrders);

/**
 * POST /integrations/square/sync
 * Manual sync trigger
 */
router.post('/square/sync', squareController.syncData);

export default router;
