/**
 * Webhook Routes
 * Endpoints for receiving and processing webhooks from Square
 */

import { Router } from 'express';
import * as webhookController from '../controllers/webhookController';

const router = Router();

/**
 * POST /webhook/square
 * Main webhook endpoint
 * Square will send payment and order events to this endpoint
 */
router.post('/square', webhookController.handleSquareWebhook);

/**
 * POST /webhook/square/test
 * Test webhook endpoint for development
 * Allows sending test events to verify webhook processing
 */
router.post('/square/test', webhookController.testWebhook);

/**
 * GET /webhook/square/events
 * Get webhook events (for debugging)
 */
router.get('/square/events', webhookController.getWebhookEvents);

export default router;
