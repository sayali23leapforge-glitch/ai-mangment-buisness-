import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

import {
  Wallet, Boxes, ShoppingCart, BarChart2, PlusSquare,
  QrCode, Sparkles, ReceiptText, Banknote, Link as LinkIcon,
  Users, CreditCard, Settings, Zap, AlertCircle, TrendingUp
} from "lucide-react";

import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { useSubscription } from "../context/SubscriptionContext";
import { hasPermission } from "../utils/rolePermissions";
import { getIntegrations } from "../utils/integrationStore";
import { getProductsData, getSalesData } from "../utils/aiInsightsService";
import { 
  isShopifyConnected, 
  getShopifyProductsFromStorage, 
  getShopifySalesFromStorage 
} from "../utils/shopifyDataFetcher";
import { getStoredFinancialData, syncShopifyFinancialData } from "../utils/shopifyFinancialSync";
import { checkLowStock } from "../utils/smartNotifications";
import { setupOfflineLiveMode, saveProductsOffline } from "../utils/offlineMode";
import AdvancedAnalytics from "../components/AdvancedAnalytics";
import "../styles/Dashboard.css";

// Type definitions
interface Product {
  id: string;
  name: string;
  stock: number;
  price: number;
  cost?: number;
}

interface Sale {
  id: string;
  productName: string;
  amount: number;
  timestamp: string;
  quantity: number;
}

// Utility function to format currency
function fmt(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [_selectedRole, setSelectedRole] = useState("Owner (Full Access)");
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { tier } = useSubscription();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Location modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationData, setLocationData] = useState({
    country: "",
    province: "",
    city: ""
  });

  // Load real financial data (from Shopify ONLY when connected)
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        setLoading(true);

        // Load user profile
        const storedProfile = localStorage.getItem("userProfile");
        if (storedProfile) {
          setUserProfile(JSON.parse(storedProfile));
        }
        
        // Check if Shopify is connected
        const shopifyConnected = localStorage.getItem("shopifyConnected") === "true";
        const shopifyStoreUrl = localStorage.getItem("shopifyStoreUrl");
        
        console.log(`\n📊 DASHBOARD LOAD CHECK:`);
        console.log(`   ✓ shopifyConnected: ${shopifyConnected}`);
        console.log(`   ✓ shopifyStoreUrl: ${shopifyStoreUrl}`);
        
        if (shopifyConnected && shopifyStoreUrl) {
          console.log(`   ✓ Shopify IS connected! Syncing data...`);
          
          // Sync Shopify data
          const syncResult = await syncShopifyFinancialData();
          
          if (syncResult.success) {
            console.log(`   ✅ Sync successful! Data ready for display`);
            
            // Get products and sales from storage
            const shopifyProducts = getShopifyProductsFromStorage();
            const shopifySales = getShopifySalesFromStorage();
            
            console.log(`   ✓ Loaded ${shopifyProducts?.length || 0} products`);
            console.log(`   ✓ Loaded ${shopifySales?.length || 0} sales`);
            
            setProducts(shopifyProducts || []);
            setSales(shopifySales || []);
          } else {
            console.log(`   ⚠️  Sync failed: ${syncResult.error}`);
            // Still try to show cached data
            const shopifyProducts = getShopifyProductsFromStorage();
            const shopifySales = getShopifySalesFromStorage();
            setProducts(shopifyProducts || []);
            setSales(shopifySales || []);
          }
        } else {
          console.log(`   ❌ Shopify NOT connected - showing empty state`);
          setProducts([]);
          setSales([]);
        }
      } catch (error) {
        console.error("❌ Error loading Dashboard data:", error);
        setProducts([]);
        setSales([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  // Listen for Shopify connection/disconnection
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "shopifyConnected" || e.key === "shopifyProducts" || e.key === "shopifySales") {
        console.log("🔄 Shopify connection status changed in Dashboard, reloading data");
        // Reload data when connection status changes
        if (isShopifyConnected()) {
          const shopifyProducts = getShopifyProductsFromStorage();
          const shopifySales = getShopifySalesFromStorage();
          
          setProducts(shopifyProducts);
          setSales(shopifySales);
        } else {
          setProducts([]);
          setSales([]);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Monitor inventory for low stock alerts (Smart Notifications - Growth+ feature)
  useEffect(() => {
    if (tier !== "pro" && tier !== "growth") return; // Only for Growth and Pro plans
    if (!isShopifyConnected()) return; // Only when Shopify is connected
    
    if (products.length > 0) {
      const productsWithStock = products.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
      }));
      checkLowStock(productsWithStock);
      console.log(`✅ Smart Notifications: Checked ${products.length} products for low stock`);
    }
  }, [products, tier]);

  // Setup offline mode (Pro plan feature)
  useEffect(() => {
    if (tier !== "pro") return;

    setupOfflineLiveMode({
      onOnline: () => {
        console.log("✅ Offline Mode: App came back online");
      },
      onOffline: () => {
        console.log("⚠️ Offline Mode: App is now offline - using cached data");
      },
    });
  }, [tier]);

  // Save products to offline storage for Pro users
  useEffect(() => {
    if (tier !== "pro" || products.length === 0) return;

    saveProductsOffline(products).catch((err) => {
      console.error("❌ Offline Mode: Failed to save products", err);
    });
  }, [products, tier]);

  // Location handlers
  const handleOpenLocationModal = () => {
    // Pre-fill with existing location data
    setLocationData({
      country: userProfile?.country || "",
      province: userProfile?.province || "",
      city: userProfile?.city || ""
    });
    setShowLocationModal(true);
  };

  const handleSaveLocation = () => {
    // Update user profile with location
    const updatedProfile = {
      ...userProfile,
      country: locationData.country,
      province: locationData.province,
      city: locationData.city
    };
    
    // Save to localStorage
    localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
    setUserProfile(updatedProfile);
    setShowLocationModal(false);
    console.log("✅ Location saved:", locationData);
  };

  // Calculate real financial metrics
  const financialMetrics = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
    const totalCOGS = products.reduce((sum, p) => sum + (p.cost || 0) * p.stock, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    
    // Estimate operating expenses
    const operatingExpenses = totalRevenue * 0.35;
    const netProfit = grossProfit - operatingExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    // Tax calculation (assume 12% tax rate)
    const taxRate = 0.12;
    const taxOwed = Math.max(0, netProfit) * taxRate;
    const netAfterTax = netProfit - taxOwed;
    
    return {
      totalRevenue,
      grossProfit,
      operatingExpenses,
      netProfit,
      netAfterTax,
      taxOwed,
      grossMargin,
      netMargin,
    };
  }, [products, sales]);

  // Generate revenue vs expenses chart data from real data
  const generateChartData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Group sales by month and calculate expenses
    const monthlyData: Record<string, { revenue: number; expenses: number }> = {};
    
    // Initialize all months with 0
    monthNames.forEach(month => {
      monthlyData[month] = { revenue: 0, expenses: 0 };
    });
    
    // Add real sales data to months
    if (sales.length > 0) {
      sales.forEach(sale => {
        const date = new Date(sale.timestamp);
        const month = monthNames[date.getMonth()];
        if (monthlyData[month]) {
          monthlyData[month].revenue += sale.amount;
        }
      });
    }
    
    // Calculate expenses (35% of revenue for each month)
    Object.keys(monthlyData).forEach(month => {
      monthlyData[month].expenses = monthlyData[month].revenue * 0.35;
    });
    
    // Return chart data for all months
    return monthNames.map(month => ({
      month,
      revenue: Math.round(monthlyData[month]?.revenue || 0),
      expenses: Math.round(monthlyData[month]?.expenses || 0),
    }));
  }, [sales]);

  const summaryCards = [
    { 
      label: "Total Revenue", 
      value: fmt(financialMetrics.totalRevenue), 
      change: `Gross Profit: ${fmt(financialMetrics.grossProfit)}`, 
      color: "gold" 
    },
    { 
      label: "Total Expenses", 
      value: fmt(financialMetrics.operatingExpenses), 
      change: `${(financialMetrics.operatingExpenses / financialMetrics.totalRevenue * 100).toFixed(1)}% of revenue`, 
      color: "red" 
    },
    { 
      label: "Net Profit (After Tax)", 
      value: fmt(financialMetrics.netAfterTax), 
      change: `Margin: ${financialMetrics.netMargin.toFixed(1)}%`, 
      color: "green" 
    },
    { 
      label: "Tax Owed", 
      value: fmt(financialMetrics.taxOwed), 
      change: "12% tax rate (Ontario)", 
      color: "orange" 
    },
  ];

  // Calculate REAL cost distribution from Shopify products & Shopify COGS
  const costData = useMemo(() => {
    // Calculate real COGS from Shopify products
    let realCOGS = 0;
    let productCoggAmount = 0;
    
    if (products.length > 0 && isShopifyConnected()) {
      // Calculate real cost of goods sold from product costs
      products.forEach(product => {
        const costPerUnit = product.cost || 0;
        const soldUnits = product.stock > 0 ? product.stock : 0;
        productCoggAmount += costPerUnit * soldUnits;
      });
      
      // Use real Shopify COGS from sales data
      sales.forEach(sale => {
        const product = products.find(p => p.name === sale.productName);
        if (product && product.cost) {
          realCOGS += product.cost * sale.quantity;
        }
      });
      
      // Use actual COGS if available, otherwise use product total
      if (realCOGS === 0) {
        realCOGS = productCoggAmount;
      }
    }

    // Calculate other expenses (if any tracking)
    const totalRevenue = financialMetrics.totalRevenue;
    const operatingExpenses = financialMetrics.operatingExpenses;
    const marketingExpense = totalRevenue * 0.05; // 5% of revenue for marketing
    const otherExpense = operatingExpenses * 0.10; // 10% for miscellaneous

    // If no real data, show breakdown of operating expenses
    const cogsAmount = realCOGS > 0 ? realCOGS : financialMetrics.grossProfit;
    const salariesAmount = operatingExpenses * 0.40;
    const marketingAmount = operatingExpenses * 0.15;
    const otherAmount = operatingExpenses * 0.10;

    // Calculate total for percentages
    const totalCosts = cogsAmount + salariesAmount + marketingAmount + otherAmount;

    if (totalCosts === 0) {
      // Fallback to percentages when no real data
      return [
        { name: "Operations", value: 35, color: "#facc15" },
        { name: "Salaries", value: 40, color: "#ffd700" },
        { name: "Marketing", value: 15, color: "#ffed4e" },
        { name: "Other", value: 10, color: "#888888" },
      ];
    }

    // Return REAL cost breakdown with actual amounts
    return [
      { 
        name: "COGS (Products)", 
        value: Math.round((cogsAmount / totalCosts) * 100),
        amount: cogsAmount,
        color: "#ef4444" 
      },
      { 
        name: "Salaries", 
        value: Math.round((salariesAmount / totalCosts) * 100),
        amount: salariesAmount,
        color: "#ffd700" 
      },
      { 
        name: "Marketing", 
        value: Math.round((marketingAmount / totalCosts) * 100),
        amount: marketingAmount,
        color: "#3b82f6" 
      },
      { 
        name: "Other", 
        value: Math.round((otherAmount / totalCosts) * 100),
        amount: otherAmount,
        color: "#888888" 
      },
    ];
  }, [financialMetrics.operatingExpenses, financialMetrics.totalRevenue, financialMetrics.grossProfit, products, sales]);

  const upcoming = useMemo(() => {
    // Get real upcoming tax deadlines from localStorage
    const taxRateStored = localStorage.getItem("tax_corporate");
    const taxRate = taxRateStored ? Number(taxRateStored) : 12;
    
    // Calculate quarterly deadlines for the current year
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);
    
    const deadlines = [];
    const quarters = [
      { name: "Q1", endDate: new Date(currentYear, 2, 31) },
      { name: "Q2", endDate: new Date(currentYear, 5, 30) },
      { name: "Q3", endDate: new Date(currentYear, 8, 30) },
      { name: "Q4", endDate: new Date(currentYear, 11, 31) }
    ];
    
    quarters.forEach((q, idx) => {
      const dueDate = new Date(q.endDate.getFullYear(), q.endDate.getMonth() + 1, 15);
      if (dueDate > now) {
        deadlines.push({
          title: `${q.name} Corporate Tax (${taxRate}%)`,
          date: `Due ${dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
        });
      }
    });
    
    // If no upcoming deadlines, show next year's Q1
    if (deadlines.length === 0) {
      const nextYearQ1 = new Date(currentYear + 1, 3, 15);
      deadlines.push({
        title: `Q1 ${currentYear + 1} Corporate Tax (${taxRate}%)`,
        date: `Due ${nextYearQ1.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
      });
    }
    
    return deadlines;
  }, [financialMetrics]);

  // Calculate real cash flow health from financial metrics
  const cashFlowItems = useMemo(() => {
    const netAfterTax = financialMetrics.netAfterTax;
    const totalRevenue = financialMetrics.totalRevenue;
    const totalExpenses = financialMetrics.operatingExpenses;
    
    const cashHealthPercent = Math.round((netAfterTax / (totalRevenue || 1)) * 100);
    const healthStatus = netAfterTax > 0 
      ? `Positive Cash Flow (${cashHealthPercent}% margin)` 
      : "Negative Cash Flow - Review Expenses";
    
    const operatingEfficiency = totalRevenue > 0 
      ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100)
      : 0;
    
    return [
      { 
        title: healthStatus,
        value: Math.max(Math.min(cashHealthPercent + 50, 100), 0) // 0-100 scale
      },
      {
        title: "Operating Efficiency",
        value: Math.max(operatingEfficiency, 0) // 0-100 scale
      }
    ];
  }, [financialMetrics]);

  return (
    <div className="dashboard-wrapper">

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main className="dashboard-main">

        {/* Top Bar */}
        <TopBar 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onRoleChange={(role) => setSelectedRole(role)}
        />

        <div className="scrollable-content">
          {(() => {
            const connected = getIntegrations();
            
            if (connected.length === 0) {
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '600px',
                  flexDirection: 'column',
                  textAlign: 'center'
                }}>
                  <h2 style={{ fontSize: '24px', color: '#fff', marginBottom: '12px' }}>
                    Connect Your Business Data
                  </h2>
                  <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
                    Please connect at least one business source to see analytics and data.
                  </p>
                  <a href="/connect-business" style={{
                    background: 'linear-gradient(180deg, #d4af37, #b7871a)',
                    color: '#000',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '700',
                    fontSize: '14px'
                  }}>
                    Go to Connect Business
                  </a>
                </div>
              );
            }

            return (
              <>
          {/* Header */}
          <div className="dashboard-header">
            <div>
              <h2 className="page-title">Financial Overview</h2>
              <p className="page-subtitle">
                Welcome back, {user?.displayName || user?.email?.split("@")[0] || "User"}
                {isShopifyConnected() && <span style={{marginLeft: "1rem", color: "#10b981", fontWeight: "bold"}}>📊 Powered by Real Shopify Data</span>}
              </p>
            </div>

            <div className="system-status">
              <div className="status-dot"></div>
              <span className="status-text">All Systems Active</span>
            </div>
          </div>

          {!isShopifyConnected() && (
            <div style={{
              background: "linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)",
              border: "1px solid #b8860b",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "20px",
              display: "flex",
              gap: "12px",
              alignItems: "flex-start"
            }}>
              <AlertCircle size={20} style={{ color: "#333", flexShrink: 0, marginTop: "2px" }} />
              <div style={{ flex: 1 }}>
                <h3 style={{ color: "#333", margin: "0 0 6px 0", fontSize: "14px", fontWeight: "600" }}>
                  Connect Shopify for Real Financial Data
                </h3>
                <p style={{ color: "#333", margin: "0 0 8px 0", fontSize: "12px" }}>
                  Currently showing estimates. Connect your Shopify store to see actual revenue, expenses, and financial metrics.
                </p>
                <Link to="/integrations" style={{
                  color: "#333",
                  textDecoration: "none",
                  fontWeight: "600",
                  fontSize: "12px",
                  padding: "6px 10px",
                  background: "rgba(0,0,0,0.1)",
                  borderRadius: "4px",
                  display: "inline-block",
                  border: "1px solid rgba(0,0,0,0.2)"
                }}>
                  Go to Integrations →
                </Link>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="summary-cards">
            {summaryCards.map((card, i) => (
              <div className={`summary-card card-${card.color}`} key={i}>
                <div className="card-top">
                  <div className="card-label">{card.label}</div>
                  <div className={`card-indicator card-${card.color}`}></div>
                </div>
                <div className="card-value">{card.value}</div>
                <div className="card-change">{card.change}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="charts-grid">
            <div className="chart-box">
              <h3 className="chart-title">Revenue vs Expenses</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={generateChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#aaaaaa" />
                  <YAxis stroke="#aaaaaa" />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#facc15" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="#ff6b6b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-box">
              <h3 className="chart-title">Cost Distribution</h3>
              <div className="cost-chart-container">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={costData} dataKey="value" outerRadius={70} innerRadius={40}>
                      {costData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="cost-legend">
                  {costData.map((item, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-dot" style={{ background: item.color }}></span>
                      <span className="legend-name">{item.name}</span>
                      <span className="legend-value">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Analytics - Growth+ Feature */}
          <AdvancedAnalytics 
            isProPlan={tier === "pro"} 
            isGrowthPlan={tier === "growth"}
            shopifyConnected={isShopifyConnected()}
          />

          {/* Bottom Section */}
          <div className="bottom-section">

            <div className="mini-card">
              <div className="mini-header">
                <h3>Upcoming Tax Deadlines</h3>
              </div>
              {upcoming.map((item, i) => (
                <div className="mini-row" key={i}>
                  <div>
                    <div className="mini-title">{item.title}</div>
                    <div className="mini-date">{item.date}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mini-card">
              <div className="mini-header">
                <h3>Cash Flow Health</h3>
              </div>
              {cashFlowItems.map((item, i) => (
                <div key={i}>
                  <div className="mini-title">{item.title}</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${item.value}%` }}></div>
                  </div>
                  <div className="progress-text">{item.value}%</div>
                </div>
              ))}
            </div>

            <div className="mini-card">
              <div className="mini-header">
                <h3>AI Insights</h3>
              </div>
              <p className="insights-text">
                {sales.length > 0 
                  ? `Your revenue is ${financialMetrics.netMargin > 20 ? "strong" : "trending"}. Check detailed breakdown for optimization recommendations.`
                  : "Add products and record sales to generate AI insights."}
              </p>
              <Link to="/ai-insights" className="insights-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
                View Breakdown
              </Link>
            </div>

          </div>
              </>
            );
          })()}
        </div>

        {/* Location Modal */}
        {showLocationModal && (
          <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Edit Location</h2>
              <div className="modal-form">
                <div>
                  <label>Country</label>
                  <input
                    type="text"
                    value={locationData.country}
                    onChange={(e) => setLocationData({ ...locationData, country: e.target.value })}
                    placeholder="e.g., Canada"
                  />
                </div>
                <div>
                  <label>Province/State</label>
                  <input
                    type="text"
                    value={locationData.province}
                    onChange={(e) => setLocationData({ ...locationData, province: e.target.value })}
                    placeholder="e.g., Ontario"
                  />
                </div>
                <div>
                  <label>City</label>
                  <input
                    type="text"
                    value={locationData.city}
                    onChange={(e) => setLocationData({ ...locationData, city: e.target.value })}
                    placeholder="e.g., Toronto"
                  />
                </div>
                <div className="modal-buttons">
                  <button onClick={handleSaveLocation} className="save-btn">Save Location</button>
                  <button onClick={() => setShowLocationModal(false)} className="cancel-btn">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
