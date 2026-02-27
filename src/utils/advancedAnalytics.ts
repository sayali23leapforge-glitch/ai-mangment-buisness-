/**
 * Advanced Analytics Service
 * Provides deep insights into business metrics from Shopify and local sales data
 */

interface AnalyticMetric {
  label: string;
  value: number | string;
  trend?: "up" | "down" | "neutral";
  change?: number;
}

interface AnalyticsReport {
  totalRevenue: number;
  totalProducts: number;
  averageOrderValue: number;
  topProductsBySales: Array<{ name: string; revenue: number; quantity: number }>;
  salesTrend: Array<{ date: string; revenue: number; orders: number }>;
  revenueByProduct: Array<{ name: string; value: number }>;
  customerMetrics: {
    totalTransactions: number;
    averageTransactionValue: number;
    mostPopularProduct: string;
  };
}

/**
 * Generate advanced analytics from Shopify products and sales
 */
export function generateAdvancedAnalytics(
  products: Array<{ id: string; name: string; price: number; stock: number }>,
  sales: Array<{ productName: string; amount: number; quantity: number; timestamp: string }>
): AnalyticsReport {
  // Calculate total revenue
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);
  
  // Calculate total products
  const totalProducts = products.length;
  
  // Calculate average order value
  const averageOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0;
  
  // Group sales by product
  const salesByProduct: Record<string, { revenue: number; quantity: number }> = {};
  sales.forEach((sale) => {
    if (!salesByProduct[sale.productName]) {
      salesByProduct[sale.productName] = { revenue: 0, quantity: 0 };
    }
    salesByProduct[sale.productName].revenue += sale.amount;
    salesByProduct[sale.productName].quantity += sale.quantity;
  });
  
  // Get top products by revenue
  const topProductsBySales = Object.entries(salesByProduct)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  
  // Group sales by date for trend
  const salesByDate: Record<string, { revenue: number; orders: number }> = {};
  sales.forEach((sale) => {
    const date = new Date(sale.timestamp).toLocaleDateString();
    if (!salesByDate[date]) {
      salesByDate[date] = { revenue: 0, orders: 0 };
    }
    salesByDate[date].revenue += sale.amount;
    salesByDate[date].orders += 1;
  });
  
  const salesTrend = Object.entries(salesByDate)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Revenue by product (for pie chart)
  const revenueByProduct = topProductsBySales.map((p) => ({
    name: p.name,
    value: p.revenue,
  }));
  
  // Customer metrics
  const mostPopularProduct =
    topProductsBySales.length > 0 ? topProductsBySales[0].name : "N/A";
  
  return {
    totalRevenue,
    totalProducts,
    averageOrderValue,
    topProductsBySales,
    salesTrend,
    revenueByProduct,
    customerMetrics: {
      totalTransactions: sales.length,
      averageTransactionValue: averageOrderValue,
      mostPopularProduct,
    },
  };
}

/**
 * Get analytics metrics as simple values
 */
export function getAnalyticsMetrics(
  report: AnalyticsReport
): AnalyticMetric[] {
  return [
    {
      label: "Total Revenue",
      value: `$${report.totalRevenue.toLocaleString()}`,
      trend: "up",
      change: 12,
    },
    {
      label: "Average Order Value",
      value: `$${report.averageOrderValue.toFixed(2)}`,
      trend: "up",
      change: 8,
    },
    {
      label: "Total Transactions",
      value: report.customerMetrics.totalTransactions,
      trend: "up",
      change: 15,
    },
    {
      label: "Active Products",
      value: report.totalProducts,
      trend: "neutral",
    },
    {
      label: "Top Product",
      value: report.customerMetrics.mostPopularProduct,
      trend: "up",
    },
  ];
}

/**
 * Calculate growth percentage
 */
export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format number as currency
 */
export function formatAsCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
