import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package, AlertTriangle, Sparkles, LineChart, Barcode, Plus, 
  ShoppingCart, Wallet, Boxes, BarChart2, PlusSquare,
  QrCode, ReceiptText, Banknote, LinkIcon, Users, CreditCard, Settings, Zap
} from "lucide-react";

import TopBar from "../components/TopBar";
import { getProducts, Product } from "../utils/localProductStore";
import { useRole } from "../context/RoleContext";
import { hasPermission } from "../utils/rolePermissions";
import { 
  isShopifyConnected, 
  getShopifyProductsFromStorage,
  getShopifySalesFromStorage
} from "../utils/shopifyDataFetcher";
import "../styles/InventoryDashboard.css";
import { ResponsiveContainer, LineChart as ReLineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";

export default function InventoryDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentRole } = useRole();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("Owner (Full Access)");
  const [products, setProducts] = useState<Product[]>([]);

  // Load products on mount - Show ONLY Shopify products when connected
  useEffect(() => {
    let allProducts: Product[] = [];

    // Check if Shopify is connected
    if (isShopifyConnected()) {
      const shopifyProducts = getShopifyProductsFromStorage();
      if (shopifyProducts && shopifyProducts.length > 0) {
        console.log("📦 Showing Shopify products in Inventory Dashboard:", shopifyProducts.length);
        allProducts = shopifyProducts;
      }
    } else {
      // When Shopify not connected, show nothing
      console.log("❌ Shopify not connected - no products to show");
      allProducts = [];
    }

    setProducts(allProducts);
    
    // Load user profile
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) setUserProfile(JSON.parse(storedProfile));
  }, []);

  // Listen for Shopify connection/disconnection and local product changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "shopifyConnected" || e.key === "shopifyProducts") {
        console.log("🔄 Shopify connection changed in Inventory Dashboard, reloading");
        let allProducts: Product[] = [];

        if (isShopifyConnected()) {
          const shopifyProducts = getShopifyProductsFromStorage();
          if (shopifyProducts && shopifyProducts.length > 0) {
            allProducts = shopifyProducts;
          }
        }

        setProducts(allProducts);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const menuItems = [
    { icon: Wallet, label: "Finance Overview", feature: "finance" },
    { icon: Boxes, label: "Inventory Dashboard", feature: "inventory_dashboard" },
    { icon: ShoppingCart, label: "Record Sale", feature: "record_sale" },
    { icon: BarChart2, label: "Inventory Manager", feature: "inventory_manager" },
    { icon: PlusSquare, label: "Add Product", feature: "add_product" },
    { icon: QrCode, label: "QR & Barcodes", feature: "qr_barcodes" },
    { icon: Sparkles, label: "AI Insights", feature: "ai_insights" },
    { icon: ReceiptText, label: "Financial Reports", feature: "financial_reports" },
    { icon: Banknote, label: "Tax Center", feature: "tax_center" },
    { icon: LinkIcon, label: "Integrations", feature: "integrations" },
    { icon: Users, label: "Team Management", feature: "team_management" },
    { icon: CreditCard, label: "Billing & Plan", feature: "billing" },
    { icon: Zap, label: "Improvement Hub", feature: "improvement_hub" },
    { icon: Settings, label: "Settings", feature: "settings" },
  ];

  // Auto-route generator
  const makeRoute = (label: string) =>
    "/" +
    label.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-").replace(/-/g, "-");

  // Calculate real data from products
  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.stock < 10).length;
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  
  // Group products by category for chart
  const categoryMap = new Map<string, number>();
  products.forEach(p => {
    const category = p.category || "Uncategorized";
    categoryMap.set(category, (categoryMap.get(category) || 0) + p.stock);
  });
  let categoryData = Array.from(categoryMap).map(([name, value]) => ({ name, value }));
  
  // If no data, show placeholder
  if (categoryData.length === 0) {
    categoryData = [{ name: "No products", value: 0 }];
  }
  
  console.log("📊 Inventory by Category - Real Shopify Data:", { 
    totalProducts, 
    categories: categoryData.length,
    categoryData, 
    shopifyConnected: isShopifyConnected(),
    rawData: categoryMap 
  });

// Calculate real sales trend from Shopify data
  const calculateSalesTrend = () => {
    const salesData = getShopifySalesFromStorage() || [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayTotals: { [key: string]: number } = {
      "Sun": 0, "Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0
    };

    salesData.forEach((sale: any) => {
      const date = new Date(sale.timestamp);
      const dayName = days[date.getDay()];
      dayTotals[dayName] += Number(sale.amount || 0);
    });

    return days.map(day => ({
      day,
      value: Math.round(dayTotals[day])
    }));
  };

  const salesTrend = calculateSalesTrend();

  // Get real recent transactions from Shopify sales
  const getRealRecentTransactions = () => {
    const salesData = getShopifySalesFromStorage() || [];
    return salesData.slice(-3).reverse().map((sale: any, i: number) => ({
      id: i,
      name: sale.productName || "Product Sale",
      time: new Date(sale.timestamp).toLocaleDateString(),
      amount: `$${Number(sale.amount).toFixed(2)}`
    }));
  };

  const realRecentTransactions = getRealRecentTransactions();
  
  // Fallback when no sales data
  const defaultTransactions = [
    { id: 0, name: "No sales yet", time: "Connect Shopify to see sales", amount: "$0.00" }
  ];
  const displayTransactions = realRecentTransactions.length > 0 ? realRecentTransactions : defaultTransactions;

  // Get real connected apps status
  const getRealConnectedApps = () => {
    const apps = [];
    
    // Check Shopify
    if (isShopifyConnected()) {
      const lastSyncTime = localStorage.getItem("shopifyLastSyncTime");
      const lastSync = lastSyncTime ? new Date(Number(lastSyncTime)).toLocaleString() : "Recently synced";
      apps.push({
        id: 1,
        name: "Shopify",
        time: lastSync,
        status: "Active",
        color: "#96C34A"
      });
    } else {
      apps.push({
        id: 1,
        name: "Shopify",
        time: "Not connected",
        status: "Disconnected",
        color: "#96C34A"
      });
    }

    // Check QuickBooks
    const qbCredentials = localStorage.getItem("quickbooksCredentials");
    if (qbCredentials) {
      try {
        const creds = JSON.parse(qbCredentials);
        apps.push({
          id: 2,
          name: "QuickBooks",
          time: `Last sync: ${new Date(creds.lastSync).toLocaleString()}`,
          status: "Active",
          color: "#5CB85C"
        });
      } catch (e) {
        apps.push({
          id: 2,
          name: "QuickBooks",
          time: "Not connected",
          status: "Disconnected",
          color: "#5CB85C"
        });
      }
    } else {
      apps.push({
        id: 2,
        name: "QuickBooks",
        time: "Not connected",
        status: "Disconnected",
        color: "#5CB85C"
      });
    }

    // Stripe always shown as connected
    apps.push({
      id: 3,
      name: "Stripe",
      time: "Payment processing active",
      status: "Active",
      color: "#5469D4"
    });

    return apps;
  };

  const realConnectedApps = getRealConnectedApps();

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="logo-icon">N</div>
          {sidebarOpen && <span className="company-name">Golden Goods Inc.</span>}
        </div>

        <nav className="sidebar-nav">
          {menuItems
            .filter(item => hasPermission(currentRole as any, item.feature))
            .map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={idx}
                to={makeRoute(item.label)}
                className={`nav-item ${idx === 1 ? "active" : ""}`}
              >
                <IconComponent size={18} className="nav-icon" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="location-main">
            {userProfile?.city && userProfile?.province 
              ? `${userProfile.city}, ${userProfile.province}` 
              : "Add Location"}
          </div>
          <div className="location-sub">
            {userProfile?.businessName || "Business Name"}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">

        {/* Top Bar */}
        <TopBar 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onRoleChange={(role) => setSelectedRole(role)}
        />

        <div className="scrollable-content">

      {/* HEADER */}
      <div className="inv-header">
        <div>
          <h2>Welcome to Nayance</h2>
          <p>Manage your inventory and business operations</p>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="inv-action-row">
        <button className="gold-btn"><ShoppingCart size={18}/> Record Sale</button>
        <Link to="/qr-&-barcodes" className="dark-btn" style={{textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <Barcode size={18}/> Scan Code
        </Link>
        <Link to="/add-product" className="dark-btn" style={{textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <Plus size={18}/> Add Product
        </Link>
        <Link to="/finance-overview" className="dark-btn" style={{textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <LineChart size={18}/> View Reports
        </Link>
      </div>

      {/* SUMMARY CARDS */}
      <div className="inv-summary-grid">
        
        <div className="inv-card">
          <div className="inv-card-top">
            <h4>Total Products</h4>
            <Package size={18}/>
          </div>
          <div className="inv-card-value">{totalProducts}</div>
          <div className="inv-card-change positive">in inventory</div>
        </div>

        <div className="inv-card">
          <div className="inv-card-top">
            <h4>Items Low Stock</h4>
            <AlertTriangle size={18} color="#d4af37"/>
          </div>
          <div className="inv-card-value red">{lowStockItems}</div>
          <div className="inv-card-change red">{lowStockItems > 0 ? 'Requires attention' : 'All stocked!'}</div>
        </div>

        <div className="inv-card">
          <div className="inv-card-top">
            <h4>Inventory Value</h4>
            <Sparkles size={18}/>
          </div>
          <div className="inv-card-value">${totalInventoryValue.toFixed(0)}</div>
          <div className="inv-card-change link">View breakdown</div>
        </div>

        <div className="inv-card">
          <div className="inv-card-top">
            <h4>Total SKUs</h4>
            <LineChart size={18}/>
          </div>
          <div className="inv-card-value">{products.length}</div>
          <div className="inv-card-change positive">products tracked</div>
        </div>

      </div>

      {/* SALES TRENDS */}
      <div className="inv-charts-container">
        
        <div className="inv-chart-large">
          <h3>Sales Trends {isShopifyConnected() && <span style={{fontSize: "12px", color: "#d4af37", fontWeight: "normal"}}>📊 Real Shopify Data</span>}</h3>

          <ResponsiveContainer width="100%" height={250}>
            <ReLineChart data={salesTrend}>
              <CartesianGrid stroke="#222"/>
              <XAxis dataKey="day" stroke="#aaa"/>
              <YAxis stroke="#aaa"/>
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333"}}/>
              <Line type="monotone" dataKey="value" stroke="#d4af37" strokeWidth={2}/>
            </ReLineChart>
          </ResponsiveContainer>

        </div>

        <div className="inv-chart-small">
          <h3>Inventory by Category {isShopifyConnected() && <span style={{fontSize: "12px", color: "#d4af37", fontWeight: "normal"}}>📊 Real Shopify Data</span>}</h3>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData}>
              <CartesianGrid stroke="#222"/>
              <XAxis dataKey="name" stroke="#aaa"/>
              <YAxis stroke="#aaa"/>
              <Bar dataKey="value" fill="#d4af37" />
            </BarChart>
          </ResponsiveContainer>

        </div>

      </div>

      {/* RECENT TRANSACTIONS & CONNECTED APPS */}
      <div className="inv-bottom-section">
        
        {/* Recent Transactions */}
        <div className="inv-recent-transactions">
          <div className="inv-section-header">
            <h3>Recent Transactions</h3>
            <a href="#" className="view-all-link">View All →</a>
          </div>

          <div className="inv-transactions-list">
            {displayTransactions.map((transaction) => (
              <div key={transaction.id} className="inv-transaction-item">
                <div className="transaction-icon">
                  <ShoppingCart size={20} />
                </div>
                <div className="transaction-info">
                  <div className="transaction-name">{transaction.name}</div>
                  <div className="transaction-time">{transaction.time}</div>
                </div>
                <div className="transaction-amount">{transaction.amount}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Connected Apps */}
        <div className="inv-connected-apps">
          <div className="inv-section-header">
            <h3>Connected Apps</h3>
            <Link to="/integrations" className="manage-link" style={{textDecoration: 'none'}}>Manage →</Link>
          </div>

          <div className="inv-apps-list">
            {realConnectedApps.map((app) => (
              <div key={app.id} className="inv-app-item">
                <div className="app-icon" style={{ background: app.color + "20" }}>
                  <div style={{ width: 20, height: 20, background: app.color, borderRadius: 4 }}></div>
                </div>
                <div className="app-info">
                  <div className="app-name">{app.name}</div>
                  <div className="app-time">{app.time}</div>
                </div>
                <div className={`app-status ${app.status.toLowerCase().replace(" ", "-")}`}>
                  {app.status === "Active" ? (
                    <span className="status-active">● {app.status}</span>
                  ) : (
                    <span className="status-disconnected">{app.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
        </div>

      </main>
    </div>
  );
}
