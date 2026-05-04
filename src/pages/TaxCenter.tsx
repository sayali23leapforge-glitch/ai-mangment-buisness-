import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, Calendar, Download, FileText, DollarSign, Lock } from "lucide-react";
import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import { useRole } from "../context/RoleContext";
import { hasPermission } from "../utils/rolePermissions";
import { getProducts } from "../utils/localProductStore";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import { isShopifyConnected, getShopifyProductsFromStorage, getShopifySalesFromStorage } from "../utils/shopifyDataFetcher";
import { getFromUserStorage, setInUserStorage } from "../utils/storageUtils";
import "../styles/TaxCenter.css";

function fmt(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function readSalesData(): any[] {
  // ONLY return Shopify data when connected
  if (!isShopifyConnected()) {
    return [];
  }

  try {
    const shopifySales = getShopifySalesFromStorage();
    if (shopifySales && shopifySales.length > 0) {
      // Transform Shopify sales to match expected format
      return shopifySales.map((sale: any) => ({
        ...sale,
        items: sale.lineItems || [{ productId: sale.productId, quantity: sale.quantity, price: sale.amount }]
      }));
    }
  } catch (err) {
    console.error("Error reading Shopify sales:", err);
  }
  
  return [];
}

export default function TaxCenter() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth() as any;
  const roleContext = useRole();
  const currentRole = roleContext?.currentRole || "user";
  const location = useLocation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isBusinessRegistered, setIsBusinessRegistered] = useState(false);
  const { tier, trialExpired } = useSubscription();

  // Load user profile for location
  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) {
      const profileData = JSON.parse(storedProfile);
      setUserProfile(profileData);
      setIsBusinessRegistered(profileData.isRegistered || false);
    }
  }, []);

  // tax rates (persisted)
  const [corporateRate, setCorporateRate] = useState<number>(() => {
    const r = getFromUserStorage<number>("tax_corporate");
    return r ? Number(r) : 12;
  });
  const [salesTaxRate, setSalesTaxRate] = useState<number>(() => {
    const r = getFromUserStorage<number>("tax_sales");
    return r ? Number(r) : 13;
  });
  const [, setDataRefresh] = useState(0); // Trigger re-render on data changes

  // Listen for Shopify connection/disconnection
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "shopifyConnected" || e.key === "shopifyProducts" || e.key === "shopifySales") {
        console.log("🔄 Shopify data changed in TaxCenter, refreshing");
        setDataRefresh(prev => prev + 1); // Trigger re-render
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // load data sources - use Shopify if connected, otherwise local
  const products = isShopifyConnected() ? getShopifyProductsFromStorage() : getProducts();
  const sales = readSalesData();

  // calculate net income before tax from sales and product cost (COGS)
  const { netIncomeBeforeTax } = useMemo(() => {
    let totalRevenue = 0;
    let totalCOGS = 0;

    for (const sale of sales) {
      const items = Array.isArray(sale.items) ? sale.items : [];
      for (const it of items) {
        const qty = Number(it.quantity || 0);
        const price = Number(it.price || 0);
        totalRevenue += price * qty;

        const prod = products.find((p: any) => p.id === it.productId);
        const costPrice = prod ? Number(prod.cost || 0) : price * 0.5;
        totalCOGS += costPrice * qty;
      }
    }

    const netBeforeTax = Math.round(totalRevenue - totalCOGS);
    return { netIncomeBeforeTax: netBeforeTax };
  }, [products, sales]);

  // compute tax totals (ensure tax can't be negative)
  const totalTax = useMemo(() => {
    const base = Math.max(netIncomeBeforeTax, 0);
    return Math.round((base * corporateRate) / 100);
  }, [netIncomeBeforeTax, corporateRate]);

  // quarterly breakdown — array of 4 quarters with status based on current month
  const quarters = useMemo(() => {
    const now = new Date();
    const month = now.getMonth(); // 0..11
    // determine current quarter index (0..3)
    const currentQuarter = Math.floor(month / 3); // 0 = Q1, 1 = Q2 ...
    const perQuarter = Math.round(totalTax / 4);

    return [0, 1, 2, 3].map((q) => {
      let status: "Paid" | "Due Soon" | "Upcoming" = "Upcoming";
      if (q < currentQuarter) status = "Paid";
      else if (q === currentQuarter) status = "Due Soon";
      else status = "Upcoming";

      // label like Q1 2025 (use current year, but if quarter < currentQuarter maybe same year)
      const year = now.getFullYear();
      const label = `Q${q + 1} ${year}`;

      return {
        quarterIndex: q,
        label,
        amount: perQuarter,
        status,
      };
    });
  }, [totalTax]);

  useEffect(() => {
    setInUserStorage("tax_corporate", corporateRate);
  }, [corporateRate]);

  useEffect(() => {
    setInUserStorage("tax_sales", salesTaxRate);
  }, [salesTaxRate]);

  function handleGenerateTaxReport() {
    // quick export — open print dialog
    window.print();
  }

  function handleDownloadTaxSummary() {
    // Generate and download tax summary as PDF/CSV
    const taxData = {
      reportDate: new Date().toLocaleDateString(),
      totalRevenue: Math.round(netIncomeBeforeTax + (netIncomeBeforeTax * corporateRate / 100)),
      netIncome: netIncomeBeforeTax,
      totalTax: totalTax,
      corporateRate: corporateRate,
      salesTaxRate: salesTaxRate,
      quarters: quarters
    };

    const csvContent = [
      ["Tax Summary Report"],
      ["Report Date:", taxData.reportDate],
      [""],
      ["Total Revenue", fmt(taxData.totalRevenue)],
      ["Net Income Before Tax", fmt(taxData.netIncome)],
      ["Total Tax", fmt(taxData.totalTax)],
      ["Corporate Rate", `${taxData.corporateRate}%`],
      ["Sales Tax Rate", `${taxData.salesTaxRate}%`]
    ]
      .map((row) => row.join(","))
      .join("\n");

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent)
    );
    element.setAttribute("download", "tax-summary.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function handleGenerateQuarterlyReport() {
    // Generate quarterly report
    const reportContent = [
      ["Quarterly Tax Payment Schedule"],
      ["Generated:", new Date().toLocaleDateString()],
      [""],
      ["Quarter", "Amount", "Status", "Due Date"],
      ...quarters.map((q) => [
        q.label,
        fmt(q.amount),
        q.status,
        `${new Date(new Date().getFullYear(), (q.quarterIndex + 1) * 3 - 1, 15).toLocaleDateString()}`
      ])
    ]
      .map((row) => row.join(","))
      .join("\n");

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(reportContent)
    );
    element.setAttribute("download", "quarterly-report.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function handleViewPaymentHistory() {
    // Show payment history - for now, alert with payment info
    const paymentInfo = quarters
      .map((q) => `${q.label}: ${fmt(q.amount)} - ${q.status}`)
      .join("\n");
    alert(
      "Payment History:\n\n" +
        paymentInfo +
        "\n\nNote: Track your payments here. Contact support for manual payment records."
    );
  }

  // Check if user has access to Tax Center (Growth+ plan required)
  if (tier === "free" || tier === "starter" || trialExpired) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="dashboard-main">
          <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <div className="scrollable-content">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px", flexDirection: "column", textAlign: "center", gap: "20px" }}>
              <Lock size={64} color="#999" />
              <h2>{trialExpired ? "Trial Expired - Upgrade to Continue" : "Tax Center Requires Growth Plan"}</h2>
              <p style={{ color: "#666", maxWidth: "400px" }}>{trialExpired ? "Your trial period has ended. Choose a plan to continue using tax calculations." : "Calculate taxes automatically and manage tax obligations. Available in Growth and Pro plans."}</p>
              <button
                onClick={() => navigate("/billing-plan")}
                style={{ marginTop: "10px", padding: "10px 20px", backgroundColor: "#007bff", color: "white", borderRadius: "5px", textDecoration: "none", border: "none", cursor: "pointer", fontSize: "16px", fontWeight: "500" }}
              >
                View Plans
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main className="dashboard-main">

        {/* Top Bar */}
        <TopBar 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="scrollable-content">
      {!isBusinessRegistered && (
        <div className="tax-notice">
          <div className="notice-content">
            <Sparkles size={24} className="notice-icon" />
            <div>
              <h3>Do You Charge Taxes on Your Products?</h3>
              <p>We noticed your business is not marked as registered. If your business is registered and you charge taxes, please update this in your Settings. Once registered, you'll see automatic tax calculations and payment schedules here.</p>
              <Link to="/settings" className="notice-link">
                Go to Settings →
              </Link>
            </div>
          </div>
        </div>
      )}
      {!isShopifyConnected() && isBusinessRegistered && (
        <div className="tax-notice">
          <div className="notice-content">
            <Sparkles size={24} className="notice-icon" />
            <div>
              <h3>Connect Shopify to View Tax Data</h3>
              <p>To see real tax calculations and insights, connect your Shopify store in the Integrations section. Once connected, your sales data will be used to calculate accurate tax obligations.</p>
              <Link to="/integrations" className="notice-link">
                Go to Integrations →
              </Link>
            </div>
          </div>
        </div>
      )}

      {isBusinessRegistered && (
        <>
          <div className="tax-header">
            <div>
              <h2>Tax Center</h2>
              <p className="tax-sub">Automated tax calculation based on your region</p>
            </div>

            <div className="tax-actions">
              <button className="btn-generate" onClick={handleGenerateTaxReport}>
                Generate Tax Report
              </button>
            </div>
          </div>

          <div className="tax-card region-card">
            <div className="region-title">
              <strong>Regional Tax Summary</strong>
            </div>

            <div className="region-row">
              <div>
                <div className="region-label">Business Location</div>
                <div className="region-value">
                  {userProfile?.city && userProfile?.province 
                    ? `${userProfile.city}, ${userProfile.province}` 
                    : "Toronto, Ontario"}
                </div>
              </div>

              <div className="auto-detected">Auto-Detected</div>
            </div>

            <div className="tax-rate-row">
              <div className="tax-box">
                <div className="tax-box-icon">%</div>
                <div className="tax-box-body">
                  <div className="tax-box-title">Corporate Tax Rate</div>
                  <div className="tax-box-value">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={corporateRate}
                      onChange={(e) => setCorporateRate(Number(e.target.value))}
                    />
                    <span className="percent">%</span>
                  </div>
                  <div className="muted">Applied to net income before tax</div>
                </div>
              </div>

              <div className="tax-box">
                <div className="tax-box-icon">$</div>
                <div className="tax-box-body">
                  <div className="tax-box-title">Sales Tax (HST)</div>
                  <div className="tax-box-value">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={salesTaxRate}
                      onChange={(e) => setSalesTaxRate(Number(e.target.value))}
                    />
                    <span className="percent">%</span>
                  </div>
                  <div className="muted">Applied to customer purchases</div>
                </div>
              </div>
            </div>

            <div className="auto-tax-note">
              <strong>Automatic Tax Adjustment</strong>
              <div className="muted">
                Nayance automatically adjusts tax rates based on your business location. Tax rates are updated quarterly to reflect current regulations.
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="tax-grid">
            <div className="tax-card total-card">
              <div className="card-title">Total Tax Owed (Annual)</div>

              <div className="fr-line">
                <div className="fr-left">Net Income Before Tax</div>
                <div className="fr-right">{isShopifyConnected() ? fmt(netIncomeBeforeTax) : "$0"}</div>
              </div>

              <div className="fr-line">
                <div className="fr-left">Tax Rate</div>
                <div className="fr-right">{corporateRate}%</div>
              </div>

              <div className="section-divider" />

              <div className="fr-line total">
                <div className="fr-left">Total Tax</div>
                <div className="fr-right positive tax-total">{isShopifyConnected() ? fmt(totalTax) : "$0"}</div>
              </div>

              <div className="muted small">
                {isShopifyConnected() ? "Based on current year-to-date income" : "Connect Shopify to see tax data"}
              </div>
            </div>
          </div>

          {/* Upcoming Tax Deadlines */}
          {isShopifyConnected() && (
            <div className="tax-card deadlines-card">
              <div className="card-title">Upcoming Tax Deadlines</div>
              <div className="deadlines-list">
                {/**
                  * Dynamic deadline calculation based on current quarter
                  * For now, showing placeholder - can be enhanced with custom deadline configuration
                  */}
                {quarters.map((q) => {
                  const dueDate = new Date(new Date().getFullYear(), (q.quarterIndex + 1) * 3, 15);
                  const today = new Date();
                  const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const status = daysUntil <= 0 ? "red" : daysUntil <= 14 ? "gold" : "blue";

                  return (
                    <div key={q.quarterIndex} className="deadline-item">
                      <div className={`deadline-icon ${status}`}>
                        <Calendar size={20} />
                      </div>
                      <div className="deadline-info">
                        <div className="deadline-title">{q.label} Tax Payment</div>
                        <div className="deadline-date">{dueDate.toLocaleDateString()}</div>
                      </div>
                      <div className={`deadline-badge ${status}`}>
                        {daysUntil <= 0 ? "Overdue" : `${Math.max(daysUntil, 0)} days`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Export Tax Documents */}
          {isShopifyConnected() && (
            <div className="tax-card export-card">
              <div className="card-title">Export Tax Documents</div>
              <div className="export-buttons">
                <button className="export-btn" onClick={handleDownloadTaxSummary}>
                  <Download size={16} />
                  Download Tax Summary (PDF)
                </button>
                <button className="export-btn" onClick={handleGenerateQuarterlyReport}>
                  <FileText size={16} />
                  Generate Quarterly Report
                </button>
                <button className="export-btn" onClick={handleViewPaymentHistory}>
                  <DollarSign size={16} />
                  View Payment History
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* small footer + controls */}
      <div className="tax-footer muted small">
        {isBusinessRegistered ? "Tip: Update corporate & sales tax rates here. For full compliance, consult a tax professional." : "Register your business in Settings to start tracking taxes."}
      </div>
        </div>
      </main>
    </div>
  );
}
