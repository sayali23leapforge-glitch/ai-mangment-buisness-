/**
 * In-Memory Database
 * Stores synced payments, orders, and webhook events
 * This is a mock database - in production, use a real DB like MongoDB, PostgreSQL, etc.
 */

import {
  SyncedPayment,
  SyncedOrder,
  SquareWebhookEvent,
  SquareConnectionStatus,
  SyncStatus,
} from '../types/square';
import { logger } from './logger';

class InMemoryDB {
  private payments: Map<string, SyncedPayment> = new Map();
  private orders: Map<string, SyncedOrder> = new Map();
  private webhookEvents: SquareWebhookEvent[] = [];
  private connectionStatus: SquareConnectionStatus | null = null;
  private syncStatus: SyncStatus = {
    last_sync: 'never',
    total_payments_synced: 0,
    total_orders_synced: 0,
    status: 'idle',
  };

  /**
   * Initialize database with connection status
   */
  initializeConnection(locationId: string, accessTokenLast4: string): void {
    this.connectionStatus = {
      is_connected: true,
      connection_time: new Date().toISOString(),
      location_id: locationId,
      access_token_last_4: accessTokenLast4,
      last_payment_sync: undefined,
      last_order_sync: undefined,
    };
    logger.info('✅ Square connection initialized', { locationId });
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): SquareConnectionStatus | null {
    return this.connectionStatus;
  }

  /**
   * Store a synced payment
   */
  addPayment(payment: SyncedPayment): void {
    this.payments.set(payment.id, payment);
    logger.debug('💾 Payment stored', {
      id: payment.id,
      amount: payment.amount_money.amount,
    });
  }

  /**
   * Store multiple payments
   */
  addPayments(payments: SyncedPayment[]): void {
    payments.forEach(payment => this.addPayment(payment));
  }

  /**
   * Get all payments
   */
  getPayments(): SyncedPayment[] {
    return Array.from(this.payments.values());
  }

  /**
   * Get payment by ID
   */
  getPayment(id: string): SyncedPayment | undefined {
    return this.payments.get(id);
  }

  /**
   * Store a synced order
   */
  addOrder(order: SyncedOrder): void {
    this.orders.set(order.id, order);
    logger.debug('💾 Order stored', { id: order.id, state: order.state });
  }

  /**
   * Store multiple orders
   */
  addOrders(orders: SyncedOrder[]): void {
    orders.forEach(order => this.addOrder(order));
  }

  /**
   * Get all orders
   */
  getOrders(): SyncedOrder[] {
    return Array.from(this.orders.values());
  }

  /**
   * Get order by ID
   */
  getOrder(id: string): SyncedOrder | undefined {
    return this.orders.get(id);
  }

  /**
   * Store a webhook event
   */
  addWebhookEvent(event: SquareWebhookEvent): void {
    this.webhookEvents.push(event);
    logger.debug('🔔 Webhook event stored', { type: event.type, id: event.id });
  }

  /**
   * Get all webhook events
   */
  getWebhookEvents(): SquareWebhookEvent[] {
    return [...this.webhookEvents];
  }

  /**
   * Get webhook events by type
   */
  getWebhookEventsByType(type: string): SquareWebhookEvent[] {
    return this.webhookEvents.filter(event => event.type === type);
  }

  /**
   * Update sync status
   */
  updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    if (this.connectionStatus) {
      this.connectionStatus.last_payment_sync = new Date().toISOString();
    }
    logger.info('📊 Sync status updated', this.syncStatus);
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.payments.clear();
    this.orders.clear();
    this.webhookEvents = [];
    logger.warn('🗑️  In-memory database cleared');
  }

  /**
   * Get database statistics
   */
  getStats() {
    return {
      total_payments: this.payments.size,
      total_orders: this.orders.size,
      total_webhooks: this.webhookEvents.length,
      connection_status: this.connectionStatus?.is_connected ? 'connected' : 'disconnected',
      sync_status: this.syncStatus.status,
    };
  }

  /**
   * Clear old webhook events (keep last 1000)
   */
  cleanupOldWebhooks(): void {
    if (this.webhookEvents.length > 1000) {
      this.webhookEvents = this.webhookEvents.slice(-1000);
      logger.info('🧹 Cleaned up old webhook events');
    }
  }
}

export const db = new InMemoryDB();
