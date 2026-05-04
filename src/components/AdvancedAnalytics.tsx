import React, { useState, useEffect } from "react";
import { generateAdvancedAnalytics, getAnalyticsMetrics, formatAsCurrency } from "../utils/advancedAnalytics";
import { getFromUserStorage } from "../utils/storageUtils";
import "../styles/AdvancedAnalytics.css";

interface AdvancedAnalyticsProps {
  isProPlan?: boolean;
  isGrowthPlan?: boolean;
  shopifyConnected?: boolean;
}

interface AnalyticsData {
  totalRevenue: number;
  totalProducts: number;
  averageOrderValue: number;
  topProducts: Array<{ name: string; revenue: number; quantity: number }>;
  transactions: number;
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
  isProPlan = false,
  isGrowthPlan = false,
  shopifyConnected = false,
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAccessible = isProPlan || isGrowthPlan;

  useEffect(() => {
    loadAnalytics();
  }, [shopifyConnected, isAccessible]);

  const loadAnalytics = async () => {
    if (!isAccessible || !shopifyConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const productsData = getFromUserStorage<any[]>("shopifyProducts");
      const salesData = getFromUserStorage<any[]>("shopifySales");

      if (!productsData || productsData.length === 0 || !salesData || salesData.length === 0) {
        setAnalytics(null);
        setError("No data available. Connect Shopify to view analytics.");
        setLoading(false);
        return;
      }

      const report = generateAdvancedAnalytics(productsData, salesData);

      setAnalytics({
        totalRevenue: report.totalRevenue,
        totalProducts: report.totalProducts,
        averageOrderValue: report.averageOrderValue,
        topProducts: report.topProductsBySales,
        transactions: report.customerMetrics.totalTransactions,
      });
      setError(null);
    } catch (err) {
      console.error("❌ Advanced Analytics error:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  if (!isAccessible) {
    return (
      <div className="analytics-container analytics-locked">
        <div className="analytics-header">
          <h2>💹 Advanced Analytics</h2>
          <span className="analytics-badge pro-badge">Growth+ Feature</span>
        </div>
        <div className="analytics-locked-content">
          <p>📊 Upgrade to Growth or Pro plan to access advanced business insights</p>
        </div>
      </div>
    );
  }

  if (!shopifyConnected) {
    return (
      <div className="analytics-container analytics-disconnected">
        <div className="analytics-header">
          <h2>💹 Advanced Analytics</h2>
          <span className="analytics-badge">Shopify Required</span>
        </div>
        <div className="analytics-message">
          <p>🔗 Connect your Shopify store in Integrations to view deep analytics</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-loading">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-container analytics-empty">
        <div className="analytics-header">
          <h2>💹 Advanced Analytics</h2>
        </div>
        <div className="analytics-message">
          <p>📊 No sales data yet. Your analytics will appear here once you record sales.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>💹 Advanced Analytics</h2>
        <button className="analytics-refresh-btn" onClick={loadAnalytics}>
          🔄 Refresh
        </button>
      </div>

      <div className="analytics-metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Revenue</div>
          <div className="metric-value">{formatAsCurrency(analytics.totalRevenue)}</div>
          <div className="metric-trend">📈 Based on sales records</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Average Order Value</div>
          <div className="metric-value">{formatAsCurrency(analytics.averageOrderValue)}</div>
          <div className="metric-trend">💰 Per transaction</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Transactions</div>
          <div className="metric-value">{analytics.transactions}</div>
          <div className="metric-trend">📊 Recorded sales</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Active Products</div>
          <div className="metric-value">{analytics.totalProducts}</div>
          <div className="metric-trend">🛍️ In inventory</div>
        </div>
      </div>

      {analytics.topProducts.length > 0 && (
        <div className="analytics-section">
          <h3>🏆 Top Performing Products</h3>
          <div className="products-table">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Revenue</th>
                  <th>Units Sold</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topProducts.map((product, index) => (
                  <tr key={index}>
                    <td>{product.name}</td>
                    <td>{formatAsCurrency(product.revenue)}</td>
                    <td>{product.quantity} units</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="analytics-footer">
        <p>💡 Tip: Record more sales to unlock deeper insights</p>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
