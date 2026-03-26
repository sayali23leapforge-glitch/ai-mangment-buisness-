/**
 * Square SDK Client Configuration
 * Initializes and configures the Square API client
 * This file sets up the HTTP client for making API calls to Square
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

class SquareClient {
  private client: AxiosInstance;
  private accessToken: string;
  private locationId: string;
  private environment: string;

  constructor(
    accessToken: string,
    locationId: string,
    environment: string = 'production'
  ) {
    this.accessToken = accessToken;
    this.locationId = locationId;
    this.environment = environment;

    // Determine API base URL based on environment
    const baseURL =
      environment === 'sandbox'
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com';

    // Create axios instance with Square API configuration
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18', // Use latest API version
      },
      timeout: 10000, // 10 second timeout
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        logger.error('❌ Square API Error', {
          status: error.response?.status,
          message: error.response?.data?.errors?.[0]?.detail || error.message,
        });
        return Promise.reject(error);
      }
    );

    logger.info('✅ Square Client Initialized', {
      environment,
      locationId,
      tokenPreview: `${accessToken.substring(0, 10)}...`,
    });
  }

  /**
   * Get all payments for the location
   * Returns paginated results, fetches all pages
   */
  async getPayments(
    beginTime?: string,
    endTime?: string,
    limit: number = 200
  ): Promise<any[]> {
    try {
      logger.info('📥 Fetching payments from Square...');
      const allPayments: any[] = [];
      let cursor: string | undefined;
      let pageCount = 0;

      do {
        const response = await this.client.get('/v2/payments', {
          params: {
            begin_time: beginTime,
            end_time: endTime,
            limit,
            cursor,
            sort_order: 'DESC',
          },
        });

        if (response.data.payments) {
          allPayments.push(...response.data.payments);
          logger.debug(`📄 Fetched ${response.data.payments.length} payments (page ${++pageCount})`);
        }

        cursor = response.data.cursor;
      } while (cursor);

      logger.info(`✅ Fetched ${allPayments.length} total payments`);
      return allPayments;
    } catch (error) {
      logger.error('❌ Error fetching payments', error);
      throw error;
    }
  }

  /**
   * Get all orders for the location
   * Returns paginated results
   */
  async getOrders(
    limit: number = 200
  ): Promise<any[]> {
    try {
      logger.info('📥 Fetching orders from Square...');
      const allOrders: any[] = [];
      let cursor: string | undefined;
      let pageCount = 0;

      do {
        const response = await this.client.post('/v2/orders/search', {
          limit,
          cursor,
          location_ids: [this.locationId],
          query: {
            filter: {
              state_filter: {
                states: ['OPEN', 'COMPLETED', 'CANCELED'],
              },
            },
          },
        });

        if (response.data.orders) {
          allOrders.push(...response.data.orders);
          logger.debug(`📄 Fetched ${response.data.orders.length} orders (page ${++pageCount})`);
        }

        cursor = response.data.cursor;
      } while (cursor);

      logger.info(`✅ Fetched ${allOrders.length} total orders`);
      return allOrders;
    } catch (error) {
      logger.error('❌ Error fetching orders', error);
      throw error;
    }
  }

  /**
   * Get all customers
   * Returns paginated results
   */
  async getCustomers(limit: number = 200): Promise<any[]> {
    try {
      logger.info('📥 Fetching customers from Square...');
      const allCustomers: any[] = [];
      let cursor: string | undefined;
      let pageCount = 0;

      do {
        const response = await this.client.get('/v2/customers', {
          params: {
            limit,
            cursor,
            sort_field: 'DEFAULT',
            sort_order: 'DESC',
          },
        });

        if (response.data.customers) {
          allCustomers.push(...response.data.customers);
          logger.debug(`📄 Fetched ${response.data.customers.length} customers (page ${++pageCount})`);
        }

        cursor = response.data.cursor;
      } while (cursor);

      logger.info(`✅ Fetched ${allCustomers.length} total customers`);
      return allCustomers;
    } catch (error) {
      logger.error('❌ Error fetching customers', error);
      throw error;
    }
  }

  /**
   * Get a specific payment by ID
   */
  async getPaymentById(paymentId: string): Promise<any> {
    try {
      const response = await this.client.get(`/v2/payments/${paymentId}`);
      logger.debug('✅ Fetched payment', { paymentId });
      return response.data.payment;
    } catch (error) {
      logger.error('❌ Error fetching payment', error);
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrderById(orderId: string): Promise<any> {
    try {
      const response = await this.client.get(`/v2/orders/${orderId}`);
      logger.debug('✅ Fetched order', { orderId });
      return response.data.order;
    } catch (error) {
      logger.error('❌ Error fetching order', error);
      throw error;
    }
  }

  /**
   * Test the connection by fetching location info
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get(`/v2/locations/${this.locationId}`);
      if (response.data.location) {
        logger.info('✅ Square API connection test successful', {
          locationName: response.data.location.name,
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('❌ Square API connection test failed', error);
      return false;
    }
  }

  /**
   * Get location details
   */
  async getLocation(): Promise<any> {
    try {
      const response = await this.client.get(`/v2/locations/${this.locationId}`);
      return response.data.location;
    } catch (error) {
      logger.error('❌ Error fetching location', error);
      throw error;
    }
  }

  /**
   * Get the location ID
   */
  getLocationId(): string {
    return this.locationId;
  }

  /**
   * Get the access token (last 4 chars for logging)
   */
  getAccessTokenPreview(): string {
    const lastFour = this.accessToken.slice(-4);
    return lastFour;
  }
}

// Initialize and export square client
const accessToken = process.env.SQUARE_ACCESS_TOKEN;
const locationId = process.env.SQUARE_LOCATION_ID;
const environment = process.env.SQUARE_ENVIRONMENT || 'production';

if (!accessToken || !locationId) {
  logger.warn(
    '⚠️  Square credentials not configured. Square integration will not work.'
  );
}

export const squareClient =
  accessToken && locationId
    ? new SquareClient(accessToken, locationId, environment)
    : null;

export { SquareClient };
