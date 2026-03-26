/**
 * Square API Type Definitions
 * Type-safe interfaces for Square API responses and requests
 */

export interface SquarePayment {
  id: string;
  amount_money: {
    amount: number;
    currency: string;
  };
  status: string;
  created_at: string;
  updated_at: string;
  receipt_url?: string;
  customer_id?: string;
  order_id?: string;
}

export interface SquareOrder {
  id: string;
  location_id: string;
  reference_id?: string;
  customer_id?: string;
  line_items: SquareLineItem[];
  state: string;
  created_at: string;
  updated_at: string;
  total_money?: {
    amount: number;
    currency: string;
  };
  total_tax_money?: {
    amount: number;
    currency: string;
  };
  total_discount_money?: {
    amount: number;
    currency: string;
  };
}

export interface SquareLineItem {
  uid?: string;
  name: string;
  quantity: string;
  quantity_unit?: {
    measurement_unit: string;
  };
  note?: string;
  catalog_object_id?: string;
  gross_sales_money?: {
    amount: number;
    currency: string;
  };
  total_tax_money?: {
    amount: number;
    currency: string;
  };
  total_discount_money?: {
    amount: number;
    currency: string;
  };
  total_money?: {
    amount: number;
    currency: string;
  };
}

export interface SquareCustomer {
  id: string;
  created_at: string;
  updated_at: string;
  cards: SquareCard[];
  given_name?: string;
  family_name?: string;
  email_address?: string;
  phone_number?: string;
}

export interface SquareCard {
  id: string;
  card_brand: string;
  last_4: string;
  exp_month: number;
  exp_year: number;
}

export interface SquareWebhookEvent {
  type: string;
  id: string;
  created_at: string;
  data?: {
    type: string;
    id: string;
    object?: any;
  };
}

export interface SyncedPayment extends SquarePayment {
  synced_at: string;
  local_id?: string;
}

export interface SyncedOrder extends SquareOrder {
  synced_at: string;
  local_id?: string;
}

export interface SyncStatus {
  last_sync: string;
  total_payments_synced: number;
  total_orders_synced: number;
  status: 'idle' | 'syncing' | 'error';
  error_message?: string;
}

export interface SquareConnectionStatus {
  is_connected: boolean;
  connection_time?: string;
  location_id: string;
  access_token_last_4?: string;
  last_payment_sync?: string;
  last_order_sync?: string;
}
