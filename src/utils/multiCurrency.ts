/**
 * Multi-Currency Utility Functions
 * Handles currency conversion and formatting
 */

// Simple exchange rates (these would typically come from an API)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  INR: 83.12,
  CAD: 1.36,
  AUD: 1.53,
  CHF: 0.88,
};

/**
 * Convert price from one currency to another
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency code (e.g., 'USD')
 * @param toCurrency - Target currency code (e.g., 'EUR')
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;

  return (amount / fromRate) * toRate;
}

/**
 * Format currency value with proper symbol and decimals
 * @param amount - The amount to format
 * @param currency - Currency code (e.g., 'USD')
 * @returns Formatted string (e.g., '$99.99')
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

/**
 * Get all supported currencies
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(EXCHANGE_RATES);
}
