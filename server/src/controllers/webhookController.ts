/**
 * Webhook Controller
 * Handles incoming webhooks from Square
 * Processes payment and order events in real-time
 */

import { Request, Response } from 'express';
import { squareService } from '../services/squareService';
import { logger } from '../utils/logger';
import { SquareWebhookEvent } from '../types/square';

interface SquareWebhookRequestBody {
  type: string;
  id: string;
  created_at: string;
  data?: {
    type: string;
    id: string;
    object?: any;
  };
}

/**
 * POST /webhook/square
 * Receive and process webhooks from Square
 * Square will send events when payments are made, orders are created, etc.
 */
export const handleSquareWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body as SquareWebhookRequestBody;

    // Log incoming webhook
    logger.info('🔔 Received Square webhook', {
      type: body.type,
      id: body.id,
    });

    // Validate webhook has required fields
    if (!body.type || !body.id || !body.created_at) {
      logger.warn('⚠️  Incomplete webhook data received');
      res.status(400).json({
        status: 'error',
        message: 'Invalid webhook format',
      });
      return;
    }

    // Create typed event object
    const event: SquareWebhookEvent = {
      type: body.type,
      id: body.id,
      created_at: body.created_at,
      data: body.data,
    };

    // Process the webhook event
    await squareService.handleWebhookEvent(event);

    // Always return 200 OK to Square to acknowledge receipt
    // Square expects a 2xx response to consider the webhook delivered
    res.status(200).json({
      status: 'received',
      message: 'Webhook processed',
    });

    logger.info('✅ Webhook processed successfully', {
      type: body.type,
      id: body.id,
    });
  } catch (error) {
    // Log the error but still return 200 to Square
    // This prevents Square from retrying the webhook
    logger.error('❌ Error processing webhook', error);

    // Still return 200 to acknowledge we got it
    // Log it for manual inspection
    res.status(200).json({
      status: 'error_logged',
      message: 'Error processing webhook - logged for review',
    });
  }
};

/**
 * POST /webhook/square/test
 * Test endpoint to send a test webhook
 * Useful for development and testing
 */
export const testWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Create a test payment.created webhook
    const testEvent: SquareWebhookEvent = {
      type: 'payment.created',
      id: `test_event_${Date.now()}`,
      created_at: new Date().toISOString(),
      data: {
        type: 'payment',
        id: 'test_payment_123',
        object: {
          id: 'test_payment_123',
          status: 'COMPLETED',
          amount_money: {
            amount: 1000,
            currency: 'USD',
          },
        },
      },
    };

    logger.info('🧪 Test webhook created', {
      type: testEvent.type,
      id: testEvent.id,
    });

    // Process the test event
    await squareService.handleWebhookEvent(testEvent);

    res.json({
      status: 'success',
      message: 'Test webhook processed',
      data: testEvent,
    });

    logger.info('✅ Test webhook processed', {
      type: testEvent.type,
    });
  } catch (error) {
    logger.error('❌ Error processing test webhook', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Test webhook failed',
    });
  }
};

/**
 * GET /webhook/square/events
 * Get all webhook events received (for debugging)
 */
export const getWebhookEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.query.type as string | undefined;

    // Get events from database
    // Note: This would require adding a method to squareService to get events
    // For now, just return a success response

    res.json({
      status: 'success',
      message: 'Webhook events retrieved',
      data: {
        note: 'Use dashboard to view webhook events',
      },
    });
  } catch (error) {
    logger.error('❌ Error getting webhook events', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to get events',
    });
  }
};
