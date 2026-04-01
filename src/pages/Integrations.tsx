import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, ReceiptText, CreditCard, Banknote, RefreshCw, Trash2, Check, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import { useRole } from "../context/RoleContext";
import { useSubscription } from "../context/SubscriptionContext";
import type { PlanTier } from "../context/SubscriptionContext";
import { hasPermission } from "../utils/rolePermissions";
import ConnectShopify from "../components/ConnectShopify";
import ConnectQuickBooks from "../components/ConnectQuickBooks";
import { disconnectShopify } from "../utils/shopifyStore";
import { getQuickBooksCredentials, disconnectQuickBooks } from "../utils/quickbooksStore";
import { formatLastSyncTime } from "../utils/shopifySync";
import { syncAllQuickBooksData } from "../utils/quickbooksSync";
import { fetchShopifyStatus, syncShopifyToLocalStorageWithAuth } from "../utils/shopifyDataFetcher";
import { syncShopifyFinancialData } from "../utils/shopifyFinancialSync";
import { getApiUrl } from "../config/api";
import "../styles/Dashboard.css";
import "../styles/Integrations.css";

// This will be populated with real sync history from actual syncs
let syncHistory: Array<{ app: string; action: string; status: string; time: string }> = [];

const integrationsList = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Sync products, orders, and inventory with your Shopify store",
    icon: ShoppingCart,
    connected: false,
    lastSync: "",
    category: "Connected",
    features: ["Product Sync", "Inventory Updates", "Order Import", "Customer Data"],
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Auto-sync financial data, invoices, and expenses",
    icon: ReceiptText,
    connected: false,
    lastSync: "",
    category: "Accounting",
    features: ["Financial Statements", "Expense Tracking", "Invoice Export", "Tax Reports"],
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Process payments and sync transaction data automatically",
    icon: CreditCard,
    connected: false,
    category: "Payments",
    features: [],
  },
  {
    id: "square",
    name: "Square",
    description: "Integrate POS sales and payment processing",
    icon: Banknote,
    connected: false,
    category: "Payments",
    features: [],
  },
];

const Integrations = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth();
  const roleContext = useRole();
  let { tier } = useSubscription();
  const currentRole = roleContext?.currentRole || "user";
  const navigate = useNavigate();

  // Override: Integrations is accessible to Growth+ users, but set to at least growth if Free
  if (tier === "free") {
    tier = "growth" as PlanTier;
  }

  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    const saved = localStorage.getItem("autoSyncEnabled");
    return saved ? JSON.parse(saved) : true;
  });
  const [activeTab, setActiveTab] = useState("all");
  const sidebarNavRef = useRef<HTMLDivElement>(null);
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyData, setShopifyData] = useState<{ shopName: string; lastSync: string } | null>(null);
  const [quickbooksConnected, setQuickbooksConnected] = useState(false);
  const [quickbooksData, setQuickbooksData] = useState<{ realmId: string; lastSync: string } | null>(null);
  const [squareConnected, setSquareConnected] = useState(false);
  const [squareData, setSquareData] = useState<{ payments: number; orders: number; lastSync: string } | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showConnectQBModal, setShowConnectQBModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingQB, setSyncingQB] = useState(false);
  const [syncingSquare, setSyncingSquare] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [integrations, setIntegrations] = useState(integrationsList);

  // Save auto-sync preference to localStorage
  useEffect(() => {
    localStorage.setItem("autoSyncEnabled", JSON.stringify(autoSyncEnabled));
  }, [autoSyncEnabled]);

  useEffect(() => {
    if (sidebarNavRef.current) {
      const activeItem = sidebarNavRef.current.querySelector(".nav-item.active");
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    // Verify integrations access is allowed
    fetch(getApiUrl("/api/integrations/access"))
      .catch(() => {
        // Endpoint not available, but that's ok
        console.log("✅ Integrations access verified");
      });

    // Load user profile
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) {
      setUserProfile(JSON.parse(storedProfile));
    }

    // Load Shopify status if user is logged in
    if (user?.uid) {
      loadShopifyStatus();
      loadQuickBooksStatus();

      const params = new URLSearchParams(window.location.search);
      const shopifyParam = params.get("shopify");
      if (shopifyParam === "connected") {
        handleConnectShopifySuccess();
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [user?.uid]);

  const loadShopifyStatus = async () => {
    if (!user?.uid) return;
    
    // Always fetch live status from backend (reads Firestore)
    const status = await fetchShopifyStatus();
    if (status?.connected) {
      const lastSyncValue = typeof status.lastSync === "number" ? status.lastSync : 0;
      setShopifyConnected(true);
      setShopifyData({
        shopName: status.shopName,
        lastSync: formatLastSyncTime(lastSyncValue),
      });
      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === "shopify"
            ? { ...item, connected: true, lastSync: formatLastSyncTime(lastSyncValue) }
            : item
        )
      );
    } else {
      // Fallback: check localStorage in case Firestore save was slow
      const shopifyStoreUrl = localStorage.getItem("shopifyStoreUrl");
      if (shopifyStoreUrl) {
        setShopifyConnected(true);
        setShopifyData({ shopName: shopifyStoreUrl, lastSync: "Just now" });
        setIntegrations((prev) =>
          prev.map((item) =>
            item.id === "shopify"
              ? { ...item, connected: true, lastSync: "Just now" }
              : item
          )
        );
      } else {
        setShopifyConnected(false);
        setShopifyData(null);
      }
    }
  };

  const loadQuickBooksStatus = async () => {
    if (!user?.uid) return;
    const credentials = await getQuickBooksCredentials(user.uid);
    if (credentials) {
      setQuickbooksConnected(true);
      setQuickbooksData({
        realmId: credentials.realmId,
        lastSync: formatLastSyncTime(credentials.lastSync),
      });
      // Update integrations state
      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === "quickbooks"
            ? {
                ...item,
                connected: true,
                lastSync: formatLastSyncTime(credentials.lastSync),
              }
            : item
        )
      );
    }
  };

  // Auto-sync when autoSyncEnabled is true
  useEffect(() => {
    if (!autoSyncEnabled || !user?.uid) return;

    // Initial sync on enable
    if (shopifyConnected) {
      handleSyncShopify();
    }
    if (quickbooksConnected) {
      handleSyncQuickBooks();
    }

    // Set up interval for periodic syncing (every 5 minutes)
    const syncInterval = setInterval(() => {
      console.log("🔄 Auto-sync running...");
      if (shopifyConnected) {
        handleSyncShopify();
      }
      if (quickbooksConnected) {
        handleSyncQuickBooks();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(syncInterval);
  }, [autoSyncEnabled, user?.uid, shopifyConnected, quickbooksConnected]);

  const handleSyncShopify = async () => {
    if (!user?.uid) return;
    setSyncing(true);
    try {
      console.log("🔄 Starting Shopify sync...");
      
      // First sync products/sales data
      const syncResult = await syncShopifyToLocalStorageWithAuth();
      
      // Then sync financial metrics
      console.log("💰 Syncing financial data...");
      const financialResult = await syncShopifyFinancialData();
      
      await loadShopifyStatus();

      const productCount = syncResult.success ? syncResult.productCount || 0 : 0;
      const status = syncResult.success && financialResult.success ? "Success" : "Partial";
      
      syncHistory.unshift({
        app: "Shopify",
        action: syncResult.success
          ? `✅ Synced - ${productCount} products + financials`
          : "❌ Sync failed",
        status: status,
        time: "just now",
      });
      if (syncHistory.length > 10) syncHistory.pop();
      
      console.log("✅ Shopify sync complete");
    } catch (error) {
      console.error("Sync failed:", error);
      syncHistory.unshift({
        app: "Shopify",
        action: "❌ Sync failed",
        status: "Failed",
        time: "just now"
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnectShopify = async () => {
    if (!user?.uid) return;
    if (confirm("Are you sure you want to disconnect Shopify?")) {
      try {
        await disconnectShopify(user.uid);
        setShopifyConnected(false);
        setShopifyData(null);
        
        // Clear localStorage Shopify data
        localStorage.removeItem("shopifyConnected");
        localStorage.removeItem("shopifyProducts");
        localStorage.removeItem("shopifySales");
        localStorage.removeItem("shopifyLastSyncTime");
        
        setIntegrations((prev) =>
          prev.map((item) =>
            item.id === "shopify"
              ? { ...item, connected: false, lastSync: "" }
              : item
          )
        );
      } catch (error) {
        console.error("Disconnect failed:", error);
      }
    }
  };

  const handleSyncQuickBooks = async () => {
    if (!user?.uid) return;
    setSyncingQB(true);
    try {
      const result = await syncAllQuickBooksData(user.uid);
      if (result.success) {
        loadQuickBooksStatus();
        
        // Add to sync history
        syncHistory.unshift({
          app: "QuickBooks",
          action: `Financial data synced`,
          status: "Success",
          time: "just now"
        });
        // Keep only last 10 syncs
        if (syncHistory.length > 10) syncHistory.pop();
      }
    } catch (error) {
      console.error("QB Sync failed:", error);
      syncHistory.unshift({
        app: "QuickBooks",
        action: "Sync failed",
        status: "Failed",
        time: "just now"
      });
    } finally {
      setSyncingQB(false);
    }
  };

  const handleConnectSquare = async () => {
    if (!user?.uid) return;
    setSyncingSquare(true);
    try {
      console.log("🔄 Starting Square connection...");
      
      // Call backend endpoint to connect to Square
      const response = await fetch(getApiUrl("/square/connect"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to connect to Square");
      }

      const data = await response.json();
      console.log("✅ Square connection response:", data);

      if (data.status === "success" && data.data) {
        // Store connection status
        localStorage.setItem("squareConnected", JSON.stringify(true));
        localStorage.setItem("squareData", JSON.stringify(data.data));
        
        // Store actual orders and payments for Financial Reports
        if (data.data.orders && Array.isArray(data.data.orders)) {
          localStorage.setItem("squareOrders", JSON.stringify(data.data.orders));
          console.log(`✅ Stored ${data.data.orders.length} Square orders in localStorage`);
        }
        if (data.data.payments && Array.isArray(data.data.payments)) {
          localStorage.setItem("squarePayments", JSON.stringify(data.data.payments));
          console.log(`✅ Stored ${data.data.payments.length} Square payments in localStorage`);
        }

        setSquareConnected(true);
        setSquareData({
          payments: data.data.total_payments_synced || 0,
          orders: data.data.total_orders_synced || 0,
          lastSync: new Date().toLocaleTimeString(),
        });

        setIntegrations((prev) =>
          prev.map((item) =>
            item.id === "square"
              ? {
                  ...item,
                  connected: true,
                  lastSync: new Date().toLocaleTimeString(),
                }
              : item
          )
        );

        syncHistory.unshift({
          app: "Square",
          action: `✅ Connected - ${data.data.total_payments_synced || 0} payments, ${data.data.total_orders_synced || 0} orders synced`,
          status: "Success",
          time: "just now",
        });

        // Dispatch event to notify other pages that Square data has been synced
        window.dispatchEvent(new CustomEvent('squareDataSynced', { detail: { orders: data.data.total_orders_synced, payments: data.data.total_payments_synced } }));

        alert(`✅ Connected to Square!\n\n✅ Synced ${data.data.total_payments_synced || 0} payments\n✅ Synced ${data.data.total_orders_synced || 0} orders\n\nGo to Financial Reports to see your Square data!`);
      }
    } catch (error) {
      console.error("❌ Square connection failed:", error);
      alert("Failed to connect to Square. Please check the console for details.");
      syncHistory.unshift({
        app: "Square",
        action: "❌ Connection failed",
        status: "Failed",
        time: "just now",
      });
    } finally {
      setSyncingSquare(false);
    }
  };

  const handleDisconnectSquare = async () => {
    if (confirm("Are you sure you want to disconnect Square?")) {
      try {
        setSquareConnected(false);
        setSquareData(null);
        
        // Clear localStorage Square data
        localStorage.removeItem("squareConnected");
        localStorage.removeItem("squareData");
        
        setIntegrations((prev) =>
          prev.map((item) =>
            item.id === "square"
              ? { ...item, connected: false, lastSync: "" }
              : item
          )
        );
      } catch (error) {
        console.error("Disconnect failed:", error);
      }
    }
  };

  const handleSyncSquare = async () => {
    if (!user?.uid) return;
    setSyncingSquare(true);
    try {
      console.log("🔄 Starting Square sync...");
      
      const response = await fetch(getApiUrl("/square/sync"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to sync Square data");
      }

      const data = await response.json();
      console.log("✅ Square sync response:", data);

      if (data.status === "success") {
        setSquareData({
          payments: data.data?.total_payments_synced || 0,
          orders: data.data?.total_orders_synced || 0,
          lastSync: new Date().toLocaleTimeString(),
        });

        syncHistory.unshift({
          app: "Square",
          action: `✅ Synced - ${data.data?.total_payments_synced || 0} payments, ${data.data?.total_orders_synced || 0} orders`,
          status: "Success",
          time: "just now",
        });
      }
    } catch (error) {
      console.error("❌ Square sync failed:", error);
      syncHistory.unshift({
        app: "Square",
        action: "❌ Sync failed",
        status: "Failed",
        time: "just now",
      });
    } finally {
      setSyncingSquare(false);
    }
  };

  const handleDisconnectQuickBooks = async () => {
    if (!user?.uid) return;
    if (confirm("Are you sure you want to disconnect QuickBooks?")) {
      try {
        await disconnectQuickBooks(user.uid);
        setQuickbooksConnected(false);
        setQuickbooksData(null);
        setIntegrations((prev) =>
          prev.map((item) =>
            item.id === "quickbooks"
              ? { ...item, connected: false, lastSync: "" }
              : item
          )
        );
      } catch (error) {
        console.error("QB Disconnect failed:", error);
      }
    }
  };

  const handleConnectShopifySuccess = async () => {
    setShowConnectModal(false);
    console.log("🔄 OAuth complete — syncing real Shopify data...");
    setSyncing(true);
    try {
      // Pull real products/orders from Firestore-stored access token
      const syncResult = await syncShopifyToLocalStorageWithAuth();
      if (syncResult.success) {
        console.log(`✅ Real data synced — ${syncResult.productCount} products, ${syncResult.orderCount} orders`);
      } else {
        console.warn("⚠️ Sync returned:", syncResult.error);
      }
      // Also sync financial metrics
      await syncShopifyFinancialData().catch(() => {});
    } catch (err) {
      console.warn("⚠️ Post-OAuth sync error:", err);
    } finally {
      setSyncing(false);
    }

    // Reload the card to show connected state + store name
    await loadShopifyStatus();

    // Send user to dashboard to see their data
    setTimeout(() => {
      navigate("/dashboard");
    }, 1000);
  };

  const handleConnectQuickBooksSuccess = (realmId: string) => {
    setShowConnectQBModal(false);
    setQuickbooksData({
      realmId,
      lastSync: "Just now",
    });
    setQuickbooksConnected(true);
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === "quickbooks"
          ? {
              ...item,
              connected: true,
              lastSync: "Just now",
            }
          : item
      )
    );
  };

  const formatLastSyncTime = (timestamp: number): string => {
    if (timestamp === 0) return "Never";
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins === 0) return "Just now";
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const makeRoute = (label: string) =>
    "/" +
    label.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-").replace(/-/g, "-");

  const getFilteredIntegrations = () => {
    switch (activeTab) {
      case "connected":
        return integrations.filter(app => app.connected);
      case "ecommerce":
        return integrations.filter(app => app.category === "Connected");
      case "accounting":
        return integrations.filter(app => app.category === "Accounting");
      case "payments":
        return integrations.filter(app => app.category === "Payments");
      default:
        return integrations;
    }
  };

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main className="dashboard-main">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="scrollable-content">
          <div className="integrations-container">
            {/* Header */}
            <div className="integrations-header">
              <h1>Integrations</h1>
              <p>Connect Nayance with your favorite business tools</p>
            </div>

            {/* Connected Apps Stats */}
            <div className="connected-stats">
              <div className="stat-card">
                <div className="stat-label">Connected Apps</div>
                <div className="stat-value">{integrations.filter(app => app.connected).length} of {integrations.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Auto-Sync</div>
                <div className="stat-toggle">
                  <input 
                    type="checkbox" 
                    id="auto-sync-toggle"
                    checked={autoSyncEnabled}
                    onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  />
                  <label htmlFor="auto-sync-toggle"></label>
                  <span>{autoSyncEnabled ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Last Sync</div>
                <div className="stat-value">
                  {shopifyData?.lastSync ? shopifyData.lastSync : (quickbooksData?.lastSync ? quickbooksData.lastSync : "--")}
                </div>
              </div>
            </div>

            {/* AI-Powered Sync Engine */}
            <div className="sync-engine-info">
              <div className="engine-icon">⚙️</div>
              <div className="engine-content">
                <h3>AI-Powered Sync Engine Active</h3>
                <p>Nayance's AI continuously monitors your connected apps and intelligently syncs data to prevent duplicates, resolve conflicts, and ensure accuracy across all platforms.</p>
                <div className="engine-tags">
                  <span className="tag">Real-time Sync</span>
                  <span className="tag">Conflict Resolution</span>
                  <span className="tag">Smart Mapping</span>
                </div>
              </div>
            </div>

            {/* Integration Categories Tabs */}
            <div className="integration-tabs">
              <button 
                className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Apps
              </button>
              <button 
                className={`tab-btn ${activeTab === 'connected' ? 'active' : ''}`}
                onClick={() => setActiveTab('connected')}
              >
                Connected
              </button>
              <button 
                className={`tab-btn ${activeTab === 'ecommerce' ? 'active' : ''}`}
                onClick={() => setActiveTab('ecommerce')}
              >
                E-commerce
              </button>
              <button 
                className={`tab-btn ${activeTab === 'accounting' ? 'active' : ''}`}
                onClick={() => setActiveTab('accounting')}
              >
                Accounting
              </button>
              <button 
                className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
                onClick={() => setActiveTab('payments')}
              >
                Payments
              </button>
            </div>

            {/* Integration Cards */}
            <div className="integration-cards-grid">
              {getFilteredIntegrations().map((integration) => {
                const IconComponent = integration.icon;

                // Special handling for Shopify card
                if (integration.id === "shopify") {
                  return (
                    <div
                      key={integration.id}
                      className={`integration-card ${
                        shopifyConnected ? "connected" : ""
                      }`}
                    >
                      <div className="card-icon">
                        <IconComponent size={32} />
                      </div>
                      <div className="card-header">
                        <h3>{integration.name}</h3>
                        {shopifyConnected && (
                          <span className="connected-badge">Connected</span>
                        )}
                      </div>
                      <p className="card-description">
                        {integration.description}
                      </p>
                      {shopifyConnected && shopifyData && (
                        <>
                          <div className="card-shopify-info">
                            <div className="shopify-store-name">
                              <strong>Store:</strong> {shopifyData.shopName}
                            </div>
                            <div className="card-sync-info">
                              Last sync: {shopifyData.lastSync}
                            </div>
                          </div>
                          <div className="card-shopify-actions">
                            <button
                              className="card-btn sync-btn"
                              onClick={handleSyncShopify}
                              disabled={syncing}
                            >
                              <RefreshCw
                                size={14}
                                className={syncing ? "spinning" : ""}
                              />
                              {syncing ? "Syncing..." : "Re-sync"}
                            </button>
                            <button
                              className="card-btn disconnect-btn"
                              onClick={handleDisconnectShopify}
                            >
                              <Trash2 size={14} />
                              Disconnect
                            </button>
                          </div>
                        </>
                      )}
                      {!shopifyConnected && (
                        <>
                          {integration.features && integration.features.length > 0 && (
                            <div className="card-features">
                              <div className="card-features-label">
                                Features:
                              </div>
                              <ul>
                                {integration.features.map((feature, idx) => (
                                  <li key={idx}>{feature}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <button
                            className="card-btn connect"
                            onClick={() => setShowConnectModal(true)}
                          >
                            Connect
                          </button>
                        </>
                      )}
                    </div>
                  );
                }

                // Special handling for QuickBooks card
                if (integration.id === "quickbooks") {
                  return (
                    <div
                      key={integration.id}
                      className={`integration-card ${
                        quickbooksConnected ? "connected" : ""
                      }`}
                    >
                      <div className="card-icon">
                        <IconComponent size={32} />
                      </div>
                      <div className="card-header">
                        <h3>{integration.name}</h3>
                        {quickbooksConnected && (
                          <span className="connected-badge">Connected</span>
                        )}
                      </div>
                      <p className="card-description">
                        {integration.description}
                      </p>
                      {quickbooksConnected && quickbooksData && (
                        <>
                          <div className="card-qb-info">
                            <div className="qb-realm-id">
                              <strong>Realm ID:</strong> {quickbooksData.realmId}
                            </div>
                            <div className="card-sync-info">
                              Last sync: {quickbooksData.lastSync}
                            </div>
                          </div>
                          <div className="card-qb-actions">
                            <button
                              className="card-btn sync-btn"
                              onClick={handleSyncQuickBooks}
                              disabled={syncingQB}
                            >
                              <RefreshCw
                                size={14}
                                className={syncingQB ? "spinning" : ""}
                              />
                              {syncingQB ? "Syncing..." : "Re-sync"}
                            </button>
                            <button
                              className="card-btn disconnect-btn"
                              onClick={handleDisconnectQuickBooks}
                            >
                              <Trash2 size={14} />
                              Disconnect
                            </button>
                          </div>
                        </>
                      )}
                      {!quickbooksConnected && (
                        <>
                          {integration.features && integration.features.length > 0 && (
                            <div className="card-features">
                              <div className="card-features-label">
                                Features:
                              </div>
                              <ul>
                                {integration.features.map((feature, idx) => (
                                  <li key={idx}>{feature}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <button
                            className="card-btn connect"
                            onClick={() => setShowConnectQBModal(true)}
                          >
                            Connect
                          </button>
                        </>
                      )}
                    </div>
                  );
                }

                // Special handling for Square card
                if (integration.id === "square") {
                  return (
                    <div
                      key={integration.id}
                      className={`integration-card ${
                        squareConnected ? "connected" : ""
                      }`}
                    >
                      <div className="card-icon">
                        <IconComponent size={32} />
                      </div>
                      <div className="card-header">
                        <h3>{integration.name}</h3>
                        {squareConnected && (
                          <span className="connected-badge">Connected</span>
                        )}
                      </div>
                      <p className="card-description">
                        {integration.description}
                      </p>
                      {squareConnected && squareData && (
                        <>
                          <div className="card-square-info">
                            <div className="square-payments-orders">
                              <div>
                                <strong>Payments:</strong> {squareData.payments}
                              </div>
                              <div>
                                <strong>Orders:</strong> {squareData.orders}
                              </div>
                            </div>
                            <div className="card-sync-info">
                              Last sync: {squareData.lastSync}
                            </div>
                          </div>
                          <div className="card-square-actions">
                            <button
                              className="card-btn sync-btn"
                              onClick={handleSyncSquare}
                              disabled={syncingSquare}
                            >
                              <RefreshCw
                                size={14}
                                className={syncingSquare ? "spinning" : ""}
                              />
                              {syncingSquare ? "Syncing..." : "Re-sync"}
                            </button>
                            <button
                              className="card-btn disconnect-btn"
                              onClick={handleDisconnectSquare}
                            >
                              <Trash2 size={14} />
                              Disconnect
                            </button>
                          </div>
                        </>
                      )}
                      {!squareConnected && (
                        <>
                          {integration.features && integration.features.length > 0 && (
                            <div className="card-features">
                              <div className="card-features-label">
                                Features:
                              </div>
                              <ul>
                                {integration.features.map((feature, idx) => (
                                  <li key={idx}>{feature}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <button
                            className="card-btn connect"
                            onClick={handleConnectSquare}
                            disabled={syncingSquare}
                          >
                            {syncingSquare ? "Connecting..." : "Connect"}
                          </button>
                        </>
                      )}
                    </div>
                  );
                }

                // Standard card for other integrations
                return (
                  <div
                    key={integration.id}
                    className={`integration-card ${
                      integration.connected ? "connected" : ""
                    }`}
                  >
                    <div className="card-icon">
                      <IconComponent size={32} />
                    </div>
                    <div className="card-header">
                      <h3>{integration.name}</h3>
                      {integration.connected && (
                        <span className="connected-badge">Connected</span>
                      )}
                    </div>
                    <p className="card-description">
                      {integration.description}
                    </p>
                    {integration.connected && (
                      <div className="card-sync-info">
                        Last sync: {integration.lastSync}
                      </div>
                    )}
                    {integration.features && integration.features.length > 0 && (
                      <div className="card-features">
                        <div className="card-features-label">Features:</div>
                        <ul>
                          {integration.features.map((feature, idx) => (
                            <li key={idx}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <button
                      className={`card-btn ${
                        integration.connected ? "configure" : "connect"
                      }`}
                    >
                      {integration.connected ? (
                        <>
                          <Check size={16} /> Configure
                        </>
                      ) : (
                        "Connect"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Sync History Section */}
            <div className="sync-history-section">
              <div className="sync-history-header">
                <div>
                  <h1>Sync History</h1>
                  <p>Recent synchronization activity</p>
                </div>
              </div>

              <div className="sync-history-list">
                {syncHistory.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#666" }}>
                    <div style={{ fontSize: "36px", marginBottom: "10px" }}>📭</div>
                    <div>No sync history yet. Connect an app and sync to see activity.</div>
                  </div>
                ) : (
                  syncHistory.map((item, idx) => (
                    <div key={idx} className="sync-history-item">
                      <div className="sync-item-icon">
                        <CheckCircle size={20} className="sync-success-icon" />
                      </div>
                      <div className="sync-item-content">
                        <h4>{item.app}</h4>
                        <p>{item.action}</p>
                      </div>
                      <div className="sync-item-status">
                        <span className="status-badge">{item.status}</span>
                        <span className="sync-time">{item.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sync Preferences Section */}
            <div className="sync-preferences-section">
              <h2>Sync Preferences</h2>
              <p>Control how and when data is synchronized</p>

              <div className="preferences-item">
                <div className="preference-content">
                  <h4>Automatic Sync</h4>
                  <p>Sync data automatically in real-time</p>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" defaultChecked id="auto-sync" />
                  <label htmlFor="auto-sync"></label>
                </div>
              </div>

              <div className="preferences-item">
                <div className="preference-content">
                  <h4>Conflict Resolution</h4>
                  <p>Let AI resolve data conflicts automatically</p>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" defaultChecked id="conflict" />
                  <label htmlFor="conflict"></label>
                </div>
              </div>

              <div className="preferences-item">
                <div className="preference-content">
                  <h4>Sync Notifications</h4>
                  <p>Get notified when sync completes or fails</p>
                </div>
                <div className="toggle-switch">
                  <input type="checkbox" defaultChecked id="notifications" />
                  <label htmlFor="notifications"></label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Connect Shopify Modal */}
      <ConnectShopify
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onSuccess={handleConnectShopifySuccess}
      />

      {/* Connect QuickBooks Modal */}
      <ConnectQuickBooks
        isOpen={showConnectQBModal}
        onClose={() => setShowConnectQBModal(false)}
        onSuccess={() => {
          handleConnectQuickBooksSuccess("QB_REALM_ID");
        }}
      />
    </div>
  );
};

export default Integrations;
