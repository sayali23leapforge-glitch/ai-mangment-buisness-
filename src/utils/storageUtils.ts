/**
 * User-Specific Storage Utility
 * Ensures data isolation between different user accounts by prefixing keys with userId
 */

/**
 * Get the current user's ID for storage isolation
 * Uses email as the primary identifier, falls back to 'default' if not found
 */
export function getUserId(): string {
  try {
    const userProfileStr = localStorage.getItem("userProfile");
    if (!userProfileStr) {
      return "default";
    }
    const userProfile = JSON.parse(userProfileStr);
    return userProfile?.email || "default";
  } catch {
    return "default";
  }
}

/**
 * Create a user-specific storage key
 * @param baseKey The base key name (e.g., 'products', 'sales')
 * @returns User-specific key (e.g., 'products_user@email.com')
 */
export function getUserSpecificKey(baseKey: string): string {
  const userId = getUserId();
  return `${baseKey}_${userId}`;
}

/**
 * Get a value from localStorage with user-specific key
 */
export function getFromUserStorage<T>(baseKey: string, defaultValue?: T): T | null {
  try {
    const key = getUserSpecificKey(baseKey);
    const value = localStorage.getItem(key);
    if (value === null) {
      return defaultValue ?? null;
    }
    return JSON.parse(value);
  } catch (err) {
    console.error(`Error reading from user storage (${baseKey}):`, err);
    return defaultValue ?? null;
  }
}

/**
 * Set a value in localStorage with user-specific key
 */
export function setInUserStorage(baseKey: string, value: any): void {
  try {
    const key = getUserSpecificKey(baseKey);
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing to user storage (${baseKey}):`, err);
  }
}

/**
 * Remove a value from localStorage with user-specific key
 */
export function removeFromUserStorage(baseKey: string): void {
  try {
    const key = getUserSpecificKey(baseKey);
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`Error removing from user storage (${baseKey}):`, err);
  }
}

/**
 * Clear all user-specific storage for current user
 * Optionally pass keys to clear specific items, otherwise clears common data keys
 */
export function clearUserStorage(keysToDelete?: string[]): void {
  const keysToRemove = keysToDelete || [
    "products",
    "manualProducts",
    "manualSales",
    "manualExpenses",
    "taxConfig",
    "sales",
    "shopifyProducts",
    "shopifySales",
    "shopifyInventory",
    "shopifyConnected",
    "shopifyLastSyncTime",
    "shopifyFinancialData",
    "shopifyInventoryData",
    "squareConnected",
    "squareData",
    "squareOrders",
    "squarePayments",
    "squareLastSync",
    "tax_corporate",
    "tax_sales",
    "selectedCurrency",
    "autoSyncEnabled",
    "connectedIntegrations",
    "quickbooksCredentials",
    "selectedDataSource",
  ];

  keysToRemove.forEach((key) => {
    removeFromUserStorage(key);
  });
}
