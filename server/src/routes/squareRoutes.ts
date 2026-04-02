/**
 * Square Routes
 * API endpoints for Square integration
 * These are the endpoints that the frontend will call
 */

import { Router } from 'express';
import * as squareController from '../controllers/squareController';

const router = Router();

/**
 * Health & Status Endpoints
 */
router.get('/health', squareController.healthCheck);
router.get('/status', squareController.getStatus);
router.get('/debug', squareController.getDebugInfo);
router.get('/raw-data', squareController.getRawSquareData);
router.get('/detailed-debug', squareController.getDetailedDebug);

/**
 * Connection Endpoint
 * POST /square/connect - Called when user clicks "Connect" button in frontend
 */
router.post('/connect', squareController.connectSquare);

/**
 * Payments Endpoints
 */
router.get('/payments', squareController.getPayments);
router.get('/payments/:id', squareController.getPaymentById);

/**
 * Orders Endpoints
 */
router.get('/orders', squareController.getOrders);
router.get('/orders/:id', squareController.getOrderById);

/**
 * Sync Endpoint
 * POST /square/sync - Manual trigger to refresh data from Square
 */
router.post('/sync', squareController.syncData);

export default router;
