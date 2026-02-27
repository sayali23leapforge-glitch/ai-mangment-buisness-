import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { isShopifyConnected } from "../utils/shopifyDataFetcher";
import { getQuickBooksCredentials } from "../utils/quickbooksStore";
import "../styles/IntegrationStatus.css";

interface IntegrationStatusProps {
  tier?: string;
}

const IntegrationStatus: React.FC<IntegrationStatusProps> = ({ tier = "free" }) => {
  const { user } = useAuth();
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [quickbooksConnected, setQuickbooksConnected] = useState(false);

  useEffect(() => {
    const checkConnections = async () => {
      // Check Shopify connection status
      setShopifyConnected(isShopifyConnected());
      
      // Check QuickBooks connection status
      if (user?.uid) {
        const qbCreds = await getQuickBooksCredentials(user.uid);
        setQuickbooksConnected(!!qbCreds);
      }
    };

    checkConnections();
  }, [user]);

  // Map which features are available based on integrations
  const getAvailableFeatures = () => {
    const features = [];

    if (shopifyConnected) {
      features.push({
        name: "Smart Notifications",
        icon: "🔔",
        status: true,
        description: "Low-stock alerts from Shopify inventory",
        requiredPlan: tier === "pro" || tier === "growth",
      });
      features.push({
        name: "Advanced Analytics",
        icon: "📊",
        status: true,
        description: "Deep insights into Shopify sales data",
        requiredPlan: tier === "pro" || tier === "growth",
      });

      if (tier === "pro") {
        features.push({
          name: "Multi-Currency",
          icon: "💱",
          status: true,
          description: "Convert prices from Shopify products",
          requiredPlan: true,
        });
      }
    }

    if (quickbooksConnected && (tier === "pro" || tier === "growth")) {
      features.push({
        name: "Financial Sync",
        icon: "💰",
        status: true,
        description: "Auto-sync financial data from QuickBooks",
        requiredPlan: true,
      });
    }

    return features;
  };

  const availableFeatures = getAvailableFeatures();

  return (
    <div className="integration-status-widget">
      <div className="status-header">
        <h3>🔗 Integration Status</h3>
        <span className="status-badge">
          {shopifyConnected || quickbooksConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      <div className="connections-grid">
        <div className={`connection-card ${shopifyConnected ? "connected" : "disconnected"}`}>
          <div className="connection-icon">🛒</div>
          <div className="connection-info">
            <div className="connection-name">Shopify</div>
            <div className="connection-status">
              {shopifyConnected ? "✅ Connected" : "⏳ Not connected"}
            </div>
          </div>
        </div>

        <div className={`connection-card ${quickbooksConnected ? "connected" : "disconnected"}`}>
          <div className="connection-icon">📋</div>
          <div className="connection-info">
            <div className="connection-name">QuickBooks</div>
            <div className="connection-status">
              {quickbooksConnected ? "✅ Connected" : "⏳ Not connected"}
            </div>
          </div>
        </div>
      </div>

      {availableFeatures.length > 0 && (
        <div className="active-features">
          <h4>✨ Active Features</h4>
          <div className="features-list">
            {availableFeatures.map((feature, index) => (
              <div key={index} className="feature-item">
                <span className="feature-icon">{feature.icon}</span>
                <div className="feature-details">
                  <div className="feature-name">{feature.name}</div>
                  <div className="feature-description">{feature.description}</div>
                </div>
                <span className="feature-status">✓</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(shopifyConnected || quickbooksConnected) === false && (
        <div className="connection-message">
          <p>
            🔗 Connect integrations in the <strong>Integrations</strong> page to unlock advanced
            features
          </p>
        </div>
      )}
    </div>
  );
};

export default IntegrationStatus;
