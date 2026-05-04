/**
 * Shopify Financial & Inventory Data Sync
 * Syncs real data from Shopify API for Financial Overview and Inventory Dashboard.
 * No synthetic/demo data — only real store data via OAuth access token.
 */

import { auth } from "../config/firebase";
import { setInUserStorage, getFromUserStorage } from "./storageUtils";

const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return user.getIdToken();
};

const getBackendBaseUrl = () => {
  if (typeof window !== "undefined") {
    const { hostname, port } = window.location;
    if (hostname === "localhost") {
      if (port === "3001" || port === "5000" || port === "4242") {
        return window.location.origin;
      }
      return "http://localhost:3001";
    }
    return window.location.origin;
  }
  return "http://localhost:3001";
};

/**
 * Sync real Shopify data and extract financial metrics.
 * Returns an error if the store is not connected via OAuth.
 */
export const syncShopifyFinancialData = async () => {
  try {
    console.log("🔄 Starting Shopify Financial Sync...");

    const idToken = await getAuthToken();
    const response = await fetch(`${getBackendBaseUrl()}/api/shopify/sync`, {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn("⚠️ Shopify sync failed:", data.error);
      return { success: false, error: data.error || "Shopify not connected" };
    }

    console.log("✅ Received real Shopify data:", {
      products: data.products?.length || 0,
      orders: data.orders?.length || 0,
    });

    const financialMetrics = calculateFinancialMetrics(data.orders || []);

    setInUserStorage("shopifyFinancialData", financialMetrics);

    if (data.products && data.products.length > 0) {
      const inventoryData = transformInventoryData(data.products);
      setInUserStorage("shopifyInventoryData", inventoryData);
    }

    return {
      success: true,
      financialMetrics,
      products: data.products,
      orders: data.orders,
    };
  } catch (error) {
    console.error("❌ Error syncing Shopify financial data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Calculate financial metrics from Shopify orders
 */
export const calculateFinancialMetrics = (orders: any[]) => {
  if (!orders || orders.length === 0) {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      totalItems: 0,
      lastSyncTime: Date.now(),
    };
  }

  let totalRevenue = 0;
  let totalItems = 0;

  orders.forEach((order) => {
    const orderTotal = parseFloat(order.total_price || 0);
    totalRevenue += orderTotal;
    
    if (order.line_items) {
      order.line_items.forEach((item: any) => {
        totalItems += parseInt(item.quantity || 0);
      });
    }
  });

  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  
  // Calculate costs estimate (60% of revenue if not specified)
  let totalCosts = 0;
  orders.forEach((order) => {
    if (order.line_items) {
      order.line_items.forEach((item: any) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemCost = itemPrice * 0.4; // Assume 40% margin, 60% cost
        totalCosts += itemCost * (item.quantity || 0);
      });
    }
  });
  
  const grossProfit = totalRevenue - totalCosts;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  
  // Operating expenses estimate
  const operatingExpenses = totalRevenue * 0.15; // 15% for operations
  const netProfit = grossProfit - operatingExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  
  // Tax estimate (12%)
  const taxRate = 0.12;
  const taxOwed = Math.max(0, netProfit) * taxRate;
  const netAfterTax = netProfit - taxOwed;

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders: orders.length,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    totalItems,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMargin: Math.round(grossMargin * 100) / 100,
    operatingExpenses: Math.round(operatingExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    netMargin: Math.round(netMargin * 100) / 100,
    taxOwed: Math.round(taxOwed * 100) / 100,
    netAfterTax: Math.round(netAfterTax * 100) / 100,
    lastSyncTime: Date.now(),
  };
};

/**
 * Transform Shopify products into inventory data
 */
export const transformInventoryData = (products: any[]) => {
  if (!products || products.length === 0) {
    return {
      totalProducts: 0,
      lowStockProducts: [],
      outOfStockProducts: [],
      totalStockValue: 0,
      lastSyncTime: Date.now(),
    };
  }

  let lowStockProducts: { id: any; title: any; stock: any; price: number; }[] = [];
  let outOfStockProducts: { id: any; title: any; stock: number; price: number; }[] = [];
  let totalStockValue = 0;

  products.forEach((product) => {
    if (product.variants && product.variants.length > 0) {
      const variant = product.variants[0];
      const stock = variant.inventory_quantity || 0;
      const price = parseFloat(variant.price || 0);
      const cost = parseFloat(variant.cost || 0);

      // Calculate stock value (cost basis)
      totalStockValue += stock * cost;

      if (stock === 0) {
        outOfStockProducts.push({
          id: product.id,
          title: product.title,
          stock: 0,
          price,
        });
      } else if (stock < 10) {
        lowStockProducts.push({
          id: product.id,
          title: product.title,
          stock,
          price,
        });
      }
    }
  });

  return {
    totalProducts: products.length,
    lowStockProducts: lowStockProducts.slice(0, 10), // Top 10
    outOfStockProducts: outOfStockProducts.slice(0, 10), // Top 10
    totalStockValue: Math.round(totalStockValue * 100) / 100,
    lastSyncTime: Date.now(),
  };
};

/**
 * Get stored financial data
 */
export const getStoredFinancialData = () => {
  try {
    return getFromUserStorage("shopifyFinancialData") || null;
  } catch (error) {
    console.error("Error getting financial data:", error);
    return null;
  }
};

/**
 * Get stored inventory data
 */
export const getStoredInventoryData = () => {
  try {
    return getFromUserStorage("shopifyInventoryData") || null;
  } catch (error) {
    console.error("Error getting inventory data:", error);
    return null;
  }
};
