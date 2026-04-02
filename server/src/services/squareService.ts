/**
 * Square Service
 * Handles all business logic for Square API integration
 * Syncs payments, orders, and manages webhook events
 */

import { squareClient } from '../config/squareClient';
import { db } from '../utils/inMemoryDB';
import { logger } from '../utils/logger';
import { SyncedPayment, SyncedOrder, SquareWebhookEvent } from '../types/square';

class SquareService {
  /**
   * Initialize Square connection
   * Verifies credentials and sets up connection status
   */
  async initializeConnection(): Promise<boolean> {
    try {
      if (!squareClient) {
        logger.error('❌ Square client not initialized. Check environment variables.');
        return false;
      }

      // Test connection
      const isConnected = await squareClient.testConnection();

      if (isConnected) {
        const tokenPreview = squareClient.getAccessTokenPreview();
        const locationId = squareClient.getLocationId();
        db.initializeConnection(locationId, tokenPreview);
        logger.info('✅ Square connection established');
        return true;
      }

      logger.error('❌ Failed to establish Square connection');
      return false;
    } catch (error) {
      logger.error('❌ Error initializing Square connection', error);
      return false;
    }
  }

  /**
   * Sync all payments from Square
   * Fetches ALL payments (completed and failed) and stores them in the database
   */
  async syncPayments(beginTime?: string, endTime?: string): Promise<SyncedPayment[]> {
    try {
      if (!squareClient) {
        throw new Error('Square client not initialized');
      }

      logger.info('🔄 Starting payment sync...');
      const startTime = Date.now();

      // Fetch ALL payments from Square (both completed and failed)
      const allPayments = await squareClient.getPayments(beginTime, endTime);

      // Separate completed and failed payments for logging
      const completedPayments = allPayments.filter((payment: any) => payment.status === 'COMPLETED');
      const failedPayments = allPayments.filter((payment: any) => payment.status !== 'COMPLETED');

      logger.info(`📊 Filtered payments`, {
        total_fetched: allPayments.length,
        completed_only: completedPayments.length,
        failed_only: failedPayments.length,
      });

      // Transform and enhance payments with sync metadata - STORE ALL PAYMENTS
      const syncedPayments: SyncedPayment[] = allPayments.map((payment: any) => ({
        ...payment,
        synced_at: new Date().toISOString(),
      }));

      // Store in database (all payments - both completed and failed)
      db.addPayments(syncedPayments);

      // Update sync status
      db.updateSyncStatus({
        total_payments_synced: db.getPayments().length,
        status: 'idle',
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ Payment sync complete`, {
        count: syncedPayments.length,
        completed: completedPayments.length,
        failed: failedPayments.length,
        duration_ms: duration,
      });

      // Return ALL payments to frontend (both completed and failed)
      return syncedPayments;
    } catch (error) {
      logger.error('❌ Error syncing payments', error);
      db.updateSyncStatus({
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Sync all orders from Square
   * Fetches recent orders and stores them in the database
   */
  async syncOrders(): Promise<SyncedOrder[]> {
    try {
      if (!squareClient) {
        throw new Error('Square client not initialized');
      }

      logger.info('🔄 Starting order sync...');
      const startTime = Date.now();

      // Fetch orders from Square
      const orders = await squareClient.getOrders();

      // Transform and enhance orders with sync metadata
      const syncedOrders: SyncedOrder[] = orders.map((order: any) => ({
        ...order,
        synced_at: new Date().toISOString(),
      }));

      // Store in database
      db.addOrders(syncedOrders);

      // Update sync status
      db.updateSyncStatus({
        total_orders_synced: db.getOrders().length,
        status: 'idle',
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ Order sync complete`, {
        count: syncedOrders.length,
        duration_ms: duration,
      });

      return syncedOrders;
    } catch (error) {
      logger.error('❌ Error syncing orders', error);
      db.updateSyncStatus({
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Full data sync - payments + orders
   * Fetches REAL data only from Square API
   */
  async syncAllData(): Promise<{
    payments: SyncedPayment[];
    orders: SyncedOrder[];
  }> {
    try {
      logger.info('🔄 Starting full data sync...');
      db.updateSyncStatus({ status: 'syncing' });

      // Fetch real data from Square - will throw error if credentials not set or API fails
      const [payments, orders] = await Promise.all([
        this.syncPayments(),
        this.syncOrders(),
      ]);

      db.updateSyncStatus({
        status: 'idle',
        last_sync: new Date().toISOString(),
      });

      logger.info('✅ Full data sync complete', {
        payments: payments.length,
        orders: orders.length,
      });

      return { payments, orders };
    } catch (error) {
      logger.error('❌ Error during full data sync', error);
      db.updateSyncStatus({
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Process incoming webhook event from Square
   * Handles payment.created, payment.updated, order.created events
   */
  async handleWebhookEvent(event: SquareWebhookEvent): Promise<void> {
    try {
      // Store the event in database
      db.addWebhookEvent(event);

      const eventType = event.type;
      logger.info(`📨 Processing webhook event`, { type: eventType, id: event.id });

      // Handle specific event types
      switch (eventType) {
        case 'payment.created':
          await this.handlePaymentCreated(event);
          break;

        case 'payment.updated':
          await this.handlePaymentUpdated(event);
          break;

        case 'order.created':
          await this.handleOrderCreated(event);
          break;

        case 'order.updated':
          await this.handleOrderUpdated(event);
          break;

        default:
          logger.debug(`⏭️  Unhandled webhook event type: ${eventType}`);
          break;
      }

      // Cleanup old webhooks
      db.cleanupOldWebhooks();

      logger.info(`✅ Webhook event processed`, { type: eventType });
    } catch (error) {
      logger.error('❌ Error processing webhook event', error);
      throw error;
    }
  }

  /**
   * Handle payment.created webhook event
   * Fetch the new payment and store it
   */
  private async handlePaymentCreated(event: SquareWebhookEvent): Promise<void> {
    try {
      if (!squareClient || !event.data?.id) {
        logger.warn('⚠️  Missing Square client or payment ID');
        return;
      }

      logger.info(`💳 New payment created`, { paymentId: event.data.id });

      // Fetch the full payment details
      const payment = await squareClient.getPaymentById(event.data.id);

      if (payment) {
        const syncedPayment: SyncedPayment = {
          ...payment,
          synced_at: new Date().toISOString(),
        };
        db.addPayment(syncedPayment);
        logger.info(`✅ Payment stored`, {
          amount: payment.amount_money?.amount,
          currency: payment.amount_money?.currency,
        });
      }
    } catch (error) {
      logger.error('❌ Error handling payment.created event', error);
    }
  }

  /**
   * Handle payment.updated webhook event
   * Fetch updated payment and update in database
   */
  private async handlePaymentUpdated(event: SquareWebhookEvent): Promise<void> {
    try {
      if (!squareClient || !event.data?.id) {
        logger.warn('⚠️  Missing Square client or payment ID');
        return;
      }

      logger.info(`💳 Payment updated`, { paymentId: event.data.id });

      // Fetch the updated payment details
      const payment = await squareClient.getPaymentById(event.data.id);

      if (payment) {
        const syncedPayment: SyncedPayment = {
          ...payment,
          synced_at: new Date().toISOString(),
        };
        db.addPayment(syncedPayment);
        logger.info(`✅ Payment updated in database`, {
          status: payment.status,
        });
      }
    } catch (error) {
      logger.error('❌ Error handling payment.updated event', error);
    }
  }

  /**
   * Handle order.created webhook event
   * Fetch the new order and store it
   */
  private async handleOrderCreated(event: SquareWebhookEvent): Promise<void> {
    try {
      if (!squareClient || !event.data?.id) {
        logger.warn('⚠️  Missing Square client or order ID');
        return;
      }

      logger.info(`📦 New order created`, { orderId: event.data.id });

      // Fetch the full order details
      const order = await squareClient.getOrderById(event.data.id);

      if (order) {
        const syncedOrder: SyncedOrder = {
          ...order,
          synced_at: new Date().toISOString(),
        };
        db.addOrder(syncedOrder);
        logger.info(`✅ Order stored`, {
          state: order.state,
          total: order.total_money?.amount,
        });
      }
    } catch (error) {
      logger.error('❌ Error handling order.created event', error);
    }
  }

  /**
   * Handle order.updated webhook event
   * Fetch updated order and update in database
   */
  private async handleOrderUpdated(event: SquareWebhookEvent): Promise<void> {
    try {
      if (!squareClient || !event.data?.id) {
        logger.warn('⚠️  Missing Square client or order ID');
        return;
      }

      logger.info(`📦 Order updated`, { orderId: event.data.id });

      // Fetch the updated order details
      const order = await squareClient.getOrderById(event.data.id);

      if (order) {
        const syncedOrder: SyncedOrder = {
          ...order,
          synced_at: new Date().toISOString(),
        };
        db.addOrder(syncedOrder);
        logger.info(`✅ Order updated in database`, {
          state: order.state,
        });
      }
    } catch (error) {
      logger.error('❌ Error handling order.updated event', error);
    }
  }

  /**
   * Get all synced payments
   */
  getPayments() {
    return db.getPayments();
  }

  /**
   * Get all synced orders
   */
  getOrders() {
    return db.getOrders();
  }

  /**
   * Get database statistics
   */
  getStats() {
    return {
      ...db.getStats(),
      sync_status: db.getSyncStatus(),
      connection_status: db.getConnectionStatus(),
    };
  }
}

export const squareService = new SquareService();
