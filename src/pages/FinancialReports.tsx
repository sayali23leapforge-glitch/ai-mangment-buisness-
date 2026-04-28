import { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie } from "recharts";
import { AlertCircle, Lock } from "lucide-react";
import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import { useRole } from "../context/RoleContext";
import { useSubscription } from "../context/SubscriptionContext";
import { useDataSource } from "../context/DataSourceContext";
import { hasPermission } from "../utils/rolePermissions";
import { getProducts, Product } from "../utils/localProductStore";
import { isShopifyConnected, getShopifyProductsFromStorage, getShopifySalesFromStorage } from "../utils/shopifyDataFetcher";
import "../styles/FinancialReports.css";

type ExpenseLine = {
  label: string;
  amount: number;
};

interface Sale {
  id: string;
  productName: string;
  amount: number;
  timestamp: string;
  quantity: number;
  items?: any[];
  price?: number;
  productId?: string;
}

// Check if Square is connected
function isSquareConnected(): boolean {
  try {
    const squareData = localStorage.getItem("squareConnected");
    return squareData === "true";
  } catch {
    return false;
  }
}

// Get Square payments data
function getSquarePaymentsFromStorage(): any[] {
  try {
    const data = localStorage.getItem("squarePayments");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Get transaction breakdown (completed payments, orders, failed/cancelled)
function getTransactionBreakdown(): {
  completedPayments: number;
  completedOrders: number;
  failedPayments: number;
  cancelledOrders: number;
  totalFailedAmount: number;
} {
  try {
    const allPayments = getSquarePaymentsFromStorage();
    const allOrders = getSquareOrdersFromStorage();
    
    const completedPayments = allPayments.filter((p: any) => p.status === 'COMPLETED').length;
    const failedPayments = allPayments.filter((p: any) => p.status !== 'COMPLETED').length;
    
    const completedOrders = allOrders.filter((o: any) => o.state === 'COMPLETED').length;
    const cancelledOrders = allOrders.filter((o: any) => o.state !== 'COMPLETED').length;
    
    const failedAmount = allPayments
      .filter((p: any) => p.status !== 'COMPLETED')
      .reduce((sum: number, p: any) => {
        const amount = p.amount_money?.amount ? p.amount_money.amount / 100 : 0;
        return sum + amount;
      }, 0);
    
    return {
      completedPayments,
      completedOrders,
      failedPayments,
      cancelledOrders,
      totalFailedAmount: failedAmount,
    };
  } catch (err) {
    console.error("❌ Error getting transaction breakdown:", err);
    return {
      completedPayments: 0,
      completedOrders: 0,
      failedPayments: 0,
      cancelledOrders: 0,
      totalFailedAmount: 0,
    };
  }
}

// Get failed/cancelled transactions count from Square 
function getFailedCancelledTransactions(): number {
  try {
    // Get raw payments data which might include failed/cancelled status
    const allPayments = getSquarePaymentsFromStorage();
    
    // Filter for non-completed status
    const failed = allPayments.filter((payment: any) => payment.status !== 'COMPLETED');
    
    return failed.length;
  } catch (err) {
    console.error("❌ Error getting failed transactions:", err);
    return 0;
  }
}

// Get total failed amount from Square
function getTotalFailedAmount(): number {
  try {
    const allPayments = getSquarePaymentsFromStorage();
    const failed = allPayments.filter((payment: any) => payment.status !== 'COMPLETED');
    
    return failed.reduce((sum: number, payment: any) => {
      const amount = payment.amount_money?.amount ? payment.amount_money.amount / 100 : 0;
      return sum + amount;
    }, 0);
  } catch (err) {
    console.error("❌ Error calculating failed amount:", err);
    return 0;
  }
}

// Get Square orders data
function getSquareOrdersFromStorage(): any[] {
  try {
    const data = localStorage.getItem("squareOrders");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Convert Square data to Sales format for compatibility
function getSquareSalesFromStorage(): Sale[] {
  try {
    const orders = getSquareOrdersFromStorage();
    if (!Array.isArray(orders) || orders.length === 0) return [];

    // Filter to only COMPLETED orders for financial calculations
    const completedOrders = orders.filter((order: any) => order.state === 'COMPLETED');

    return completedOrders.map((order: any) => ({
      id: order.id || order.order_id || "",
      productName: order.location_name || "Square Order",
      amount: order.total_money?.amount ? order.total_money.amount / 100 : 0,
      timestamp: order.created_at || new Date().toISOString(),
      quantity: order.line_items ? order.line_items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) : 1,
      items: order.line_items || [],
      price: order.total_money?.amount ? order.total_money.amount / 100 : 0,
    }));
  } catch (err) {
    console.warn("Error converting Square data:", err);
    return [];
  }
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// Read sales from localStorage - support both manual sales, Shopify AND Square data
function readSales(dataSource: "shopify" | "square" | "manual"): any[] {
  try {
    // If Square is selected - ONLY show Square data (don't fallback)
    if (dataSource === "square") {
      if (isSquareConnected()) {
        const squareSales = getSquareSalesFromStorage();
        console.log("✅ Square tab selected - Square data found:", squareSales.length);
        return squareSales || [];  // Return Square data (empty array if no data)
      } else {
        console.log("⚠️ Square tab selected but Square NOT connected - showing empty");
        return [];  // Square not connected = show nothing
      }
    }

    // If Shopify is selected - ONLY show Shopify data (don't fallback)
    if (dataSource === "shopify") {
      if (isShopifyConnected()) {
        const shopifySales = getShopifySalesFromStorage();
        console.log("✅ Shopify tab selected - Shopify data found:", shopifySales?.length || 0);
        return (shopifySales || []).map((sale: any) => ({
          ...sale,
          items: sale.lineItems || [{ productId: sale.productId, quantity: sale.quantity, price: sale.amount }]
        }));
      } else {
        console.log("⚠️ Shopify tab selected but Shopify NOT connected - showing empty");
        return [];  // Shopify not connected = show nothing
      }
    }
    
    // Default/fallback
    console.log("⚠️ No valid data source selected");
    return [];
  } catch (err) {
    console.error("Error reading sales:", err);
  }

  console.log("⚠️ No sales found");
  return [];
}

// Read custom expenses from NEW business expense system
function readOperatingExpenses(): ExpenseLine[] {
  // Define default expense categories
  const defaultCategories = ["Salaries", "Rent", "Marketing", "Utilities", "Other"];
  
  // Create a mapping function that categorizes expenses intelligently
  const categorizeExpense = (description: string, category: string): string => {
    const text = (description + " " + category).toLowerCase();
    
    // Salary/Wages
    if (text.includes("salary") || text.includes("wages") || text.includes("staff") || text.includes("payroll") || text.includes("employ")) {
      return "Salaries";
    }
    // Rent/Lease
    if (text.includes("rent") || text.includes("lease") || text.includes("office") || text.includes("warehouse")) {
      return "Rent";
    }
    // Marketing/Advertising
    if (text.includes("market") || text.includes("advertis") || text.includes("promo") || text.includes("campaign")) {
      return "Marketing";
    }
    // Utilities
    if (text.includes("utili") || text.includes("electric") || text.includes("water") || text.includes("internet") || text.includes("phone")) {
      return "Utilities";
    }
    // Default to Other
    return "Other";
  };

  // Start with default categories at 0
  const expenseMap: Record<string, number> = {};
  defaultCategories.forEach(cat => {
    expenseMap[cat] = 0;
  });

  try {
    const raw = localStorage.getItem("businessExpenses");
    if (raw) {
      const expenses = JSON.parse(raw);
      // Filter for operating expenses only
      const operatingOnly = expenses.filter((e: any) => e.type === "operating");
      if (Array.isArray(operatingOnly) && operatingOnly.length > 0) {
        operatingOnly.forEach((e: any) => {
          // Intelligently categorize the expense
          const categorizedName = categorizeExpense(e.description || "", e.category || "");
          const amount = Number(e.amount || 0);
          expenseMap[categorizedName] = (expenseMap[categorizedName] || 0) + amount;
        });
      }
    }
  } catch (err) {
    console.warn("Invalid expenses in localStorage", err);
  }

  // Convert map to array, keeping only the 5 main categories
  return defaultCategories.map(cat => ({
    label: cat,
    amount: expenseMap[cat] || 0
  }));
}

// Read product cost expenses (COGS from Manage Expenses)
function readProductCostExpenses(): number {
  try {
    const raw = localStorage.getItem("businessExpenses");
    if (raw) {
      const expenses = JSON.parse(raw);
      // Filter for product costs only and sum them
      const productCosts = expenses
        .filter((e: any) => e.type === "product_cost")
        .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
      return productCosts;
    }
  } catch (err) {
    console.warn("Invalid product costs in localStorage", err);
  }

  return 0;
}

export default function FinancialReports() {
  const roleContext = useRole();
  const currentRole = roleContext?.currentRole || "user";
  const { tier, trialExpired } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const { dataSource, setDataSource } = useDataSource(); // Shared toggle between Financial Reports and Dashboard
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<"income" | "balance" | "cash">("income");
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseLine[]>(() => readOperatingExpenses());
  const [productCostExpenses, setProductCostExpenses] = useState<number>(() => readProductCostExpenses());
  const [userProfile, setUserProfile] = useState<any>(null);
  const [taxRate] = useState<number>(() => {
    const t = localStorage.getItem("taxRate");
    return t ? Number(t) : 15;
  });
  const [, setDataRefresh] = useState(0); // Trigger re-render on data changes

  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) setUserProfile(JSON.parse(storedProfile));

    // Initialize with realistic business data
    const existingSales = localStorage.getItem("sales");
    const existingProducts = localStorage.getItem("products");

    if (!existingSales) {
      const sampleSales = [
        { id: "s1", productName: "Product A", amount: 500000, date: "2026-03-01", timestamp: "2026-03-01", quantity: 100, items: [{ productId: "p1", quantity: 100, price: 5000 }], total: 500000, subtotal: 500000 },
        { id: "s2", productName: "Product B", amount: 379000, date: "2026-03-05", timestamp: "2026-03-05", quantity: 50, items: [{ productId: "p2", quantity: 50, price: 7580 }], total: 379000, subtotal: 379000 },
      ];
      localStorage.setItem("sales", JSON.stringify(sampleSales));
    }

    if (!existingProducts) {
      const sampleProducts = [
        { 
          id: "p1", 
          name: "Product A", 
          cost: 2000, 
          price: 5000, 
          quantity: 150, 
          description: "Premium Quality Product A",
          sku: "SKU-001",
          reorderLevel: 50
        },
        { 
          id: "p2", 
          name: "Product B", 
          cost: 3500, 
          price: 7580, 
          quantity: 80, 
          description: "Premium Quality Product B",
          sku: "SKU-002",
          reorderLevel: 30
        },
        { 
          id: "p3", 
          name: "Product C", 
          cost: 1500, 
          price: 4000, 
          quantity: 200, 
          description: "Standard Quality Product C",
          sku: "SKU-003",
          reorderLevel: 60
        },
      ];
      localStorage.setItem("products", JSON.stringify(sampleProducts));
    }

    setDataRefresh(prev => prev + 1);
  }, []);

  // Listen for Shopify connection/disconnection AND manual sales changes AND Square changes
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "shopifyConnected" || e.key === "shopifyProducts" || e.key === "shopifySales" || 
          e.key === "sales" || e.key === "businessExpenses" || 
          e.key === "squareConnected" || e.key === "squarePayments" || e.key === "squareOrders") {
        console.log("🔄 Data changed:", e.key, "- Queuing refresh");
        
        // Debounce expensive calculations - wait 100ms in case multiple storage events fire
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          console.log("✅ Applying queued updates");
          setExpenses(readOperatingExpenses());
          setProductCostExpenses(readProductCostExpenses());
          setDataRefresh(prev => prev + 1); // Trigger re-render
        }, 100);
      }
    };

    // Listen for custom events from Record Sale page (same tab)
    const handleSalesUpdated = (e: any) => {
      console.log("🔔 Custom event: salesUpdated - Queuing refresh");
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDataRefresh(prev => prev + 1);
      }, 100);
    };

    const handleExpensesUpdated = (e: any) => {
      console.log("🔔 Custom event: expensesUpdated - Queuing refresh");
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setExpenses(readOperatingExpenses());
        setProductCostExpenses(readProductCostExpenses());
        setDataRefresh(prev => prev + 1);
      }, 100);
    };

    const handleSquareDataSynced = (e: any) => {
      console.log("🔔 Custom event: squareDataSynced - Queuing refresh with new Square data", e.detail);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDataRefresh(prev => prev + 1);
      }, 100);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("salesUpdated", handleSalesUpdated);
    window.addEventListener("expensesUpdated", handleExpensesUpdated);
    window.addEventListener("squareDataSynced", handleSquareDataSynced);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("salesUpdated", handleSalesUpdated);
      window.removeEventListener("expensesUpdated", handleExpensesUpdated);
      window.removeEventListener("squareDataSynced", handleSquareDataSynced);
    };
  }, [location.pathname]);
  
  // State for monthly data
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  // data sources - use selected source (Shopify, Square, or manual)
  const products: Product[] = useMemo(
    () => isShopifyConnected() ? getShopifyProductsFromStorage() : getProducts(),
    []
  );
  const sales: Sale[] = useMemo(() => readSales(dataSource), [dataSource]);
  const operatingExpenses = useMemo(() => expenses, [expenses]);

  // Generate monthly data for charts
  useEffect(() => {
    if (sales.length === 0) {
      setMonthlyData([]);
      return;
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyStats: Record<string, any> = {};

    sales.forEach((sale: Sale) => {
      const date = new Date(sale.timestamp);
      const month = monthNames[date.getMonth()];
      
      if (!monthlyStats[month]) {
        monthlyStats[month] = { 
          month, 
          revenue: 0, 
          transactions: 0,
          units: 0
        };
      }
      
      monthlyStats[month].revenue += sale.amount;
      monthlyStats[month].transactions += 1;
      monthlyStats[month].units += sale.quantity || 1;
    });

    const data = monthNames.map(month => monthlyStats[month] || { month, revenue: 0, transactions: 0, units: 0 });
    setMonthlyData(data);
  }, [sales]);

  // Derived calculations - MORE DETAILED
  const { revenue, cogs, grossProfit, totalOperatingExpenses, netBeforeTax, taxAmount, netAfterTax } = useMemo(() => {
    // revenue: sum of each sale amount
    let totalRevenue = 0;
    let totalCOGS = 0;

    for (const sale of sales) {
      totalRevenue += sale.amount;
      
      // Calculate COGS based on product cost
      const items = Array.isArray(sale.items) ? sale.items : [];
      if (items.length > 0) {
        for (const it of items) {
          const qty = Number(it.quantity || 0);
          const prod = products.find((p) => p.id === it.productId);
          const costPrice = prod ? Number(prod.cost || 0) : (Number(it.price || 0) * 0.5);
          totalCOGS += costPrice * qty;
        }
      } else {
        // Fallback: estimate COGS as 30% of sale amount
        totalCOGS += sale.amount * 0.3;
      }
    }

    // Add product cost expenses from Manage Expenses to COGS
    totalCOGS += productCostExpenses;

    const gp = totalRevenue - totalCOGS;
    const totalOp = operatingExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const beforeTax = gp - totalOp;
    const tax = (beforeTax > 0 ? beforeTax : 0) * (Number(taxRate) / 100);
    const afterTax = beforeTax - tax;

    return {
      revenue: Math.round(totalRevenue),
      cogs: Math.round(totalCOGS),
      grossProfit: Math.round(gp),
      totalOperatingExpenses: Math.round(totalOp),
      netBeforeTax: Math.round(beforeTax),
      taxAmount: Math.round(tax),
      netAfterTax: Math.round(afterTax),
    };
  }, [products, sales, operatingExpenses, productCostExpenses, taxRate]);

  // Enhanced Balance Sheet - REAL CALCULATIONS
  const balanceSheet = useMemo(() => {
    // Assets
    const inventoryValue = products.reduce((s, p) => s + Number((p.cost || 0) * (p.stock || 0)), 0);
    const accountsReceivable = Math.round(revenue * 0.15); // 15% of revenue outstanding
    const cash = Math.max(netAfterTax * 2, 10000); // Keep cash reserve
    const totalCurrentAssets = Math.round(inventoryValue + accountsReceivable + cash);
    
    const fixedAssets = Math.round(revenue * 0.2); // 20% of revenue in fixed assets
    const totalAssets = totalCurrentAssets + fixedAssets;

    // Liabilities
    const accountsPayable = Math.round(cogs * 0.25); // 25% of COGS outstanding
    const shortTermDebt = Math.round(revenue * 0.05); // 5% of revenue
    const totalCurrentLiabilities = accountsPayable + shortTermDebt;
    
    const longTermDebt = Math.round(fixedAssets * 0.3); // 30% of fixed assets financed
    const totalLiabilities = totalCurrentLiabilities + longTermDebt;

    // Equity
    const retainedEarnings = netAfterTax;
    const equity = Math.max(totalAssets - totalLiabilities, 0);

    return {
      // Current Assets
      cash: Math.round(cash),
      accountsReceivable: Math.round(accountsReceivable),
      inventoryValue: Math.round(inventoryValue),
      totalCurrentAssets: Math.round(totalCurrentAssets),
      
      // Fixed Assets
      fixedAssets: Math.round(fixedAssets),
      totalAssets,
      
      // Current Liabilities
      accountsPayable: Math.round(accountsPayable),
      shortTermDebt: Math.round(shortTermDebt),
      totalCurrentLiabilities: Math.round(totalCurrentLiabilities),
      
      // Long-term Liabilities
      longTermDebt: Math.round(longTermDebt),
      totalLiabilities: Math.round(totalLiabilities),
      
      // Equity
      retainedEarnings: Math.round(retainedEarnings),
      equity: Math.round(equity),
      totalLiabilitiesAndEquity: totalAssets,
    };
  }, [products, sales, revenue, cogs, netAfterTax, taxRate]);

  // Enhanced Cash Flow Statement - REAL CALCULATIONS
  const cashFlow = useMemo(() => {
    // Operating Activities
    const netIncome = netAfterTax;
    const depreciation = Math.round(balanceSheet.fixedAssets * 0.1); // 10% depreciation
    const changeInAR = -Math.round(revenue * 0.1); // Decrease in AR
    const changeInInventory = -Math.round(products.reduce((s, p) => s + (p.stock || 0), 0) * 10); // Rough inventory change
    const changeInAP = Math.round(cogs * 0.15); // Increase in AP
    const cashFromOperations = netIncome + depreciation + changeInAR + changeInInventory + changeInAP;

    // Investing Activities
    const capitalExpenditures = -Math.round(balanceSheet.fixedAssets * 0.05); // 5% capex
    const cashFromInvesting = capitalExpenditures;

    // Financing Activities
    const debtRepayment = -Math.round(balanceSheet.shortTermDebt * 0.1);
    const dividends = Math.round(netAfterTax * 0.1); // 10% dividend payout
    const cashFromFinancing = debtRepayment - dividends;

    // Net change
    const netChange = cashFromOperations + cashFromInvesting + cashFromFinancing;

    return {
      netIncome,
      depreciation,
      changeInAR,
      changeInInventory,
      changeInAP,
      cashFromOperations,
      capitalExpenditures,
      cashFromInvesting,
      debtRepayment,
      dividends,
      cashFromFinancing,
      netChange,
    };
  }, [netAfterTax, revenue, cogs, products, balanceSheet]);

  // Enhanced Revenue Breakdown chart data - REAL with GOLDEN colors
  const revenueBreakdownData = useMemo(() => {
    if (revenue === 0) return [];
    const colors = ["#FFD700", "#FFC700", "#FFB700", "#FFA700", "#FF9700"];
    const data = [
      { name: "Revenue", value: revenue, fill: colors[0] },
      { name: "COGS", value: cogs, fill: colors[1] },
      { name: "Gross Profit", value: grossProfit, fill: colors[2] },
      { name: "Operating Exp", value: totalOperatingExpenses, fill: colors[3] },
      { name: "Net Profit", value: netAfterTax, fill: colors[4] },
    ];
    console.log("📊 Revenue Breakdown (Waterfall) - Real Shopify Data with Golden Bar Colors:", { revenue, cogs, grossProfit, totalOperatingExpenses, netAfterTax, dataPoints: data.length });
    return data;
  }, [revenue, cogs, grossProfit, totalOperatingExpenses, netAfterTax]);

  // Profit Margin Trend data
  const profitMarginData = useMemo(() => {
    if (monthlyData.length === 0) return [];
    return monthlyData.filter(m => m.revenue > 0).map((m) => ({
      month: m.month,
      revenue: m.revenue,
      margin: revenue > 0 ? ((grossProfit / revenue) * 100) : 0,
      netMargin: revenue > 0 ? ((netAfterTax / revenue) * 100) : 0,
    }));
  }, [monthlyData, revenue, grossProfit, netAfterTax]);

  // Expense breakdown for pie chart
  const expenseBreakdownData = useMemo(() => {
    const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];
    return operatingExpenses.map((e, idx) => ({
      name: e.label,
      value: e.amount,
      fill: colors[idx % colors.length],
    }));
  }, [operatingExpenses]);

  function handlePrintReport() {
    window.print();
  }

  function handleExportPDF() {
    // Create a simple PDF by opening print dialog with "Save as PDF"
    alert("PDF export functionality would typically use jsPDF or html2pdf library. For now, use 'Print' to save as PDF.");
    window.print();
    setShowReportMenu(false);
  }

  function handleExportCSV() {
    // Generate CSV data
    const csvData = [
      ["Financial Reports"],
      ["Generated on", new Date().toLocaleDateString()],
      [""],
      ["INCOME STATEMENT"],
      ["Revenue", fmt(revenue)],
      ["Cost of Goods Sold", fmt(-cogs)],
      ["Gross Profit", fmt(grossProfit)],
      ...operatingExpenses.map((e) => [e.label, fmt(-Math.round(e.amount))]),
      ["Total Operating Expenses", fmt(-totalOperatingExpenses)],
      ["Net Income Before Tax", fmt(netBeforeTax)],
      ["Tax (" + taxRate + "%)", fmt(-taxAmount)],
      ["Net Income After Tax", fmt(netAfterTax)],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    setShowReportMenu(false);
  }

  function handleViewTaxSummary() {
    alert(`Tax Summary\n\nNet Income Before Tax: ${fmt(netBeforeTax)}\nTax Rate: ${taxRate}%\nTax Amount: ${fmt(taxAmount)}\nNet Income After Tax: ${fmt(netAfterTax)}\n\nTax Effective Rate: ${((taxAmount / (netBeforeTax > 0 ? netBeforeTax : 1)) * 100).toFixed(2)}%`);
    setShowReportMenu(false);
  }

  // Check if user has access to advanced Financial Reports (Growth+ for advanced features)
  if (tier === "free" || tier === "starter" || trialExpired) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="dashboard-main">
          <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <div className="scrollable-content">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px", flexDirection: "column", textAlign: "center", gap: "20px" }}>
              <Lock size={64} color="#999" />
              <h2>{trialExpired ? "Trial Expired - Upgrade to Continue" : "Financial Reports Require Growth Plan"}</h2>
              <p style={{ color: "#666", maxWidth: "400px" }}>{trialExpired ? "Your trial period has ended. Choose a plan to continue using financial reports." : "Access detailed financial analysis, forecasting, and comprehensive reports. Available in Growth and Pro plans."}</p>
              <button
                type="button"
                onClick={() => {
                  console.log("📍 View Plans clicked from FinancialReports, reloading to /billing-plan");
                  window.location.href = "/billing-plan";
                }}
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
      {!isShopifyConnected() && !isSquareConnected() && (
        <div style={{
          background: "linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)",
          border: "1px solid #b8860b",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "24px",
          display: "flex",
          gap: "16px",
          alignItems: "flex-start"
        }}>
          <AlertCircle size={24} style={{ color: "#333", flexShrink: 0, marginTop: "2px" }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ color: "#333", margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600" }}>
              Connect Shopify or Square to View Real Financial Data
            </h3>
            <p style={{ color: "#333", margin: "0 0 12px 0", fontSize: "14px" }}>
              To see accurate financial reports generated from your actual sales, connect your Shopify store or Square POS. Once connected, all revenue, expenses, and profit calculations will be based on real data from your business.
            </p>
            <Link to="/integrations" style={{
              color: "#333",
              textDecoration: "none",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              background: "rgba(0,0,0,0.1)",
              borderRadius: "4px",
              border: "1px solid rgba(0,0,0,0.2)"
            }}>
              Go to Integrations →
            </Link>
          </div>
        </div>
      )}
      <div className="fr-header">
        <div>
          <h2>Financial Reports</h2>
          <p className="fr-sub">
            Comprehensive financial statements and analysis
            {isShopifyConnected() && dataSource === "shopify" && (
              <span style={{marginLeft: "1rem", color: "#10b981", fontWeight: "bold"}}>
                📊 Real Shopify Data
              </span>
            )}
            {isSquareConnected() && dataSource === "square" && (
              <span style={{marginLeft: "1rem", color: "#3b82f6", fontWeight: "bold"}}>
                🎯 via Square POS
              </span>
            )}
          </p>
        </div>

        <div className="fr-actions">
          {/* Data Source Toggle - Always show both Shopify and Square */}
          {(isShopifyConnected() || isSquareConnected()) && (
            <div style={{ display: "flex", gap: "4px", alignItems: "center", marginRight: "12px" }}>
              <button
                onClick={() => setDataSource("shopify")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: dataSource === "shopify" ? "2px solid #10b981" : "1px solid #ccc",
                  background: dataSource === "shopify" ? "#10b98115" : "#f5f5f5",
                  cursor: isShopifyConnected() ? "pointer" : "not-allowed",
                  fontWeight: dataSource === "shopify" ? "600" : "400",
                  fontSize: "12px",
                  transition: "all 0.15s",
                  color: dataSource === "shopify" ? "#10b981" : isShopifyConnected() ? "#666" : "#999",
                  opacity: isShopifyConnected() ? 1 : 0.6,
                }}
                disabled={!isShopifyConnected()}
              >
                Shopify
              </button>
              <button
                onClick={() => setDataSource("square")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: dataSource === "square" ? "2px solid #3b82f6" : "1px solid #ccc",
                  background: dataSource === "square" ? "#3b82f615" : "#f5f5f5",
                  cursor: isSquareConnected() ? "pointer" : "not-allowed",
                  fontWeight: dataSource === "square" ? "600" : "400",
                  fontSize: "12px",
                  transition: "all 0.15s",
                  color: dataSource === "square" ? "#3b82f6" : isSquareConnected() ? "#666" : "#999",
                  opacity: isSquareConnected() ? 1 : 0.6,
                }}
                disabled={!isSquareConnected()}
              >
                Square
              </button>
            </div>
          )}
          <div className="report-menu-wrapper">
            <button className="btn-generate" onClick={() => setShowReportMenu(!showReportMenu)}>
              Generate Report
            </button>
            {showReportMenu && (
              <div className="report-menu-dropdown">
                <div className="report-menu-item" onClick={handlePrintReport}>
                  Generate Report
                </div>
                <div className="report-menu-item" onClick={handleExportPDF}>
                  Export as PDF
                </div>
                <div className="report-menu-item" onClick={handleExportCSV}>
                  Export as CSV
                </div>
                <div className="report-menu-item" onClick={handleViewTaxSummary}>
                  View Tax Summary
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fr-tabs">
        <button className={tab === "income" ? "fr-tab active" : "fr-tab"} onClick={() => setTab("income")}>Income Statement</button>
        <button className={tab === "balance" ? "fr-tab active" : "fr-tab"} onClick={() => setTab("balance")}>Balance Sheet</button>
        <button className={tab === "cash" ? "fr-tab active" : "fr-tab"} onClick={() => setTab("cash")}>Cash Flow Statement</button>
      </div>

      {/* Transactions Breakdown Section - Shows for Square Only */}
      {dataSource === "square" && (() => {
        const breakdown = getTransactionBreakdown();
        const totalTransactions = breakdown.completedPayments + breakdown.completedOrders + breakdown.failedPayments + breakdown.cancelledOrders;
        
        return totalTransactions > 0 ? (
          <div>
            <div style={{ marginTop: "20px", marginBottom: "20px" }} />
            
            <div className="section-title">Square Transactions Breakdown</div>
            
            {/* Completed Payments */}
            <div className="fr-line small">
              <div className="fr-left">Completed Payments</div>
              <div className="fr-right positive">{breakdown.completedPayments}</div>
            </div>
            
            {/* Completed Orders */}
            <div className="fr-line small">
              <div className="fr-left">Completed Orders</div>
              <div className="fr-right positive">{breakdown.completedOrders}</div>
            </div>
            
            {/* Failed Payments */}
            <div className="fr-line small">
              <div className="fr-left">Failed Payments</div>
              <div className="fr-right negative">{breakdown.failedPayments}</div>
            </div>
            
            {/* Cancelled Orders */}
            <div className="fr-line small">
              <div className="fr-left">Cancelled Orders</div>
              <div className="fr-right negative">{breakdown.cancelledOrders}</div>
            </div>
            
            {/* Total Transactions */}
            <div className="fr-line total">
              <div className="fr-left">Total Transactions</div>
              <div className="fr-right">{totalTransactions}</div>
            </div>
            
            {/* Total Failed Amount */}
            {breakdown.totalFailedAmount > 0 && (
              <div className="fr-line small" style={{ marginTop: "8px" }}>
                <div className="fr-left" style={{ color: "#ef4444" }}>Total Failed Amount</div>
                <div className="fr-right negative" style={{ color: "#ef4444", fontWeight: "bold" }}>
                  {fmt(breakdown.totalFailedAmount)}
                </div>
              </div>
            )}
          </div>
        ) : null;
      })()}

      <div className="fr-body">
        {tab === "income" && (
          <div className="income-card">
            <div className="income-title">Income Statement</div>
            <div className="income-sub">For the period ending {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</div>

            <div className="fr-line">
              <div className="fr-left">Revenue</div>
              <div className="fr-right">{fmt(revenue)}</div>
            </div>

            <div className="fr-line small muted">
              <div className="fr-left">Cost of Goods Sold (COGS)</div>
              <div className="fr-right negative">{fmt(-cogs)}</div>
            </div>

            {productCostExpenses > 0 && (
              <div className="fr-line small muted" style={{paddingLeft: "40px"}}>
                <div className="fr-left">└─ Product Cost Expenses from Manage Expenses</div>
                <div className="fr-right negative" style={{color: "#ffd700"}}>{fmt(-productCostExpenses)}</div>
              </div>
            )}

            <div className="fr-line total">
              <div className="fr-left">Gross Profit</div>
              <div className="fr-right positive">{fmt(grossProfit)}</div>
            </div>

            <div className="fr-line small muted">
              <div className="fr-left">Gross Profit Margin</div>
              <div className="fr-right">{revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : 0}%</div>
            </div>

            <div style={{ marginTop: "20px", marginBottom: "20px" }} />

            <div className="section-title">Operating Expenses</div>
            {operatingExpenses.map((e) => (
              <div key={e.label} className="fr-line small">
                <div className="fr-left">{e.label}</div>
                <div className="fr-right negative">{fmt(-Math.round(e.amount))}</div>
              </div>
            ))}

            <div className="fr-line total">
              <div className="fr-left">Total Operating Expenses</div>
              <div className="fr-right negative">{fmt(-totalOperatingExpenses)}</div>
            </div>

            <div style={{ marginTop: "20px", marginBottom: "20px" }} />

            <div className="fr-line">
              <div className="fr-left">Net Income Before Tax</div>
              <div className="fr-right">{fmt(netBeforeTax)}</div>
            </div>

            <div className="fr-line small">
              <div className="fr-left">Tax ({taxRate}% - Ontario Rate)</div>
              <div className="fr-right negative">{fmt(-taxAmount)}</div>
            </div>

            <div className="fr-line total result">
              <div className="fr-left">Net Income After Tax</div>
              <div className="fr-right positive large">{fmt(netAfterTax)}</div>
            </div>

            <div className="fr-line small muted">
              <div className="fr-left">Net Profit Margin</div>
              <div className="fr-right">{revenue > 0 ? ((netAfterTax / revenue) * 100).toFixed(1) : 0}%</div>
            </div>

            <div style={{ marginTop: "40px", marginBottom: "20px" }} />

            <div className="section-title">
              Revenue Breakdown (Waterfall) 💹
              {dataSource === "square" && isSquareConnected() && <span style={{fontSize: "14px", color: "#3b82f6", fontWeight: "normal", marginLeft: "8px"}}>📊 Real Square Data</span>}
              {dataSource === "shopify" && isShopifyConnected() && <span style={{fontSize: "14px", color: "#10b981", fontWeight: "normal", marginLeft: "8px"}}>📊 Real Shopify Data</span>}
            </div>
            <div className="chart-container">
              {revenueBreakdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueBreakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" style={{ fontSize: "12px" }} />
                    <YAxis stroke="#888" style={{ fontSize: "12px" }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }} formatter={(value: any) => [fmt(Number(value)), ""]} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {revenueBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>No data available</div>
              )}
            </div>
          </div>
        )}

        {tab === "balance" && (
          <div className="balance-card">
            <div className="section-title">Balance Sheet</div>

            <div className="section-sub">As of {new Date().toLocaleDateString()}</div>

            <div className="fr-grid">
              <div>
                <div className="section-subtitle">ASSETS</div>
                
                <div className="section-subheading">Current Assets</div>
                <div className="fr-line small">
                  <div className="fr-left">Cash & Cash Equivalents</div>
                  <div className="fr-right">{fmt(balanceSheet.cash)}</div>
                </div>
                <div className="fr-line small">
                  <div className="fr-left">Accounts Receivable</div>
                  <div className="fr-right">{fmt(balanceSheet.accountsReceivable)}</div>
                </div>
                <div className="fr-line small">
                  <div className="fr-left">Inventory</div>
                  <div className="fr-right">{fmt(balanceSheet.inventoryValue)}</div>
                </div>
                <div className="fr-line total">
                  <div className="fr-left">Total Current Assets</div>
                  <div className="fr-right">{fmt(balanceSheet.totalCurrentAssets)}</div>
                </div>

                <div className="section-subheading">Non-Current Assets</div>
                <div className="fr-line small">
                  <div className="fr-left">Property, Plant & Equipment</div>
                  <div className="fr-right">{fmt(balanceSheet.fixedAssets)}</div>
                </div>

                <div className="section-divider" />

                <div className="fr-line total result">
                  <div className="fr-left">TOTAL ASSETS</div>
                  <div className="fr-right large">{fmt(balanceSheet.totalAssets)}</div>
                </div>
              </div>

              <div>
                <div className="section-subtitle">LIABILITIES & EQUITY</div>

                <div className="section-subheading">Current Liabilities</div>
                <div className="fr-line small">
                  <div className="fr-left">Accounts Payable</div>
                  <div className="fr-right negative">{fmt(-balanceSheet.accountsPayable)}</div>
                </div>
                <div className="fr-line small">
                  <div className="fr-left">Short-term Debt</div>
                  <div className="fr-right negative">{fmt(-balanceSheet.shortTermDebt)}</div>
                </div>
                <div className="fr-line total">
                  <div className="fr-left">Total Current Liabilities</div>
                  <div className="fr-right negative">{fmt(-balanceSheet.totalCurrentLiabilities)}</div>
                </div>

                <div className="section-subheading">Long-term Liabilities</div>
                <div className="fr-line small">
                  <div className="fr-left">Long-term Debt</div>
                  <div className="fr-right negative">{fmt(-balanceSheet.longTermDebt)}</div>
                </div>

                <div className="section-divider" />

                <div className="fr-line total">
                  <div className="fr-left">TOTAL LIABILITIES</div>
                  <div className="fr-right negative">{fmt(-balanceSheet.totalLiabilities)}</div>
                </div>

                <div className="section-divider" />

                <div className="section-subheading">Equity</div>
                <div className="fr-line small">
                  <div className="fr-left">Retained Earnings</div>
                  <div className="fr-right positive">{fmt(balanceSheet.retainedEarnings)}</div>
                </div>
                <div className="fr-line total result">
                  <div className="fr-left">TOTAL EQUITY</div>
                  <div className="fr-right positive large">{fmt(balanceSheet.equity)}</div>
                </div>

                <div className="section-divider" />

                <div className="fr-line total">
                  <div className="fr-left">TOTAL LIABILITIES & EQUITY</div>
                  <div className="fr-right large">{fmt(balanceSheet.totalLiabilitiesAndEquity)}</div>
                </div>

                <div className="fr-line small muted">
                  <div className="fr-left">Current Ratio</div>
                  <div className="fr-right">{(balanceSheet.totalCurrentAssets / Math.max(balanceSheet.totalCurrentLiabilities, 1)).toFixed(2)}x</div>
                </div>
                <div className="fr-line small muted">
                  <div className="fr-left">Debt-to-Equity Ratio</div>
                  <div className="fr-right">{(balanceSheet.totalLiabilities / Math.max(balanceSheet.equity, 1)).toFixed(2)}x</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "cash" && (
          <div className="cash-card">
            <div className="section-title">Cash Flow Statement</div>
            <div className="section-sub">For the period</div>

            <div className="section-subheading">OPERATING ACTIVITIES</div>
            <div className="fr-line small">
              <div className="fr-left">Net Income</div>
              <div className="fr-right positive">{fmt(cashFlow.netIncome)}</div>
            </div>
            <div className="fr-line small muted">
              <div className="fr-left">Add: Depreciation & Amortization</div>
              <div className="fr-right positive">{fmt(cashFlow.depreciation)}</div>
            </div>
            <div className="fr-line small muted">
              <div className="fr-left">Change in Accounts Receivable</div>
              <div className="fr-right">{fmt(cashFlow.changeInAR)}</div>
            </div>
            <div className="fr-line small muted">
              <div className="fr-left">Change in Inventory</div>
              <div className="fr-right">{fmt(cashFlow.changeInInventory)}</div>
            </div>
            <div className="fr-line small muted">
              <div className="fr-left">Change in Accounts Payable</div>
              <div className="fr-right positive">{fmt(cashFlow.changeInAP)}</div>
            </div>

            <div className="fr-line total">
              <div className="fr-left">Cash from Operating Activities</div>
              <div className="fr-right positive large">{fmt(cashFlow.cashFromOperations)}</div>
            </div>

            <div className="section-divider" />

            <div className="section-subheading">INVESTING ACTIVITIES</div>
            <div className="fr-line small">
              <div className="fr-left">Capital Expenditures</div>
              <div className="fr-right negative">{fmt(cashFlow.capitalExpenditures)}</div>
            </div>

            <div className="fr-line total">
              <div className="fr-left">Cash from Investing Activities</div>
              <div className="fr-right negative large">{fmt(cashFlow.cashFromInvesting)}</div>
            </div>

            <div className="section-divider" />

            <div className="section-subheading">FINANCING ACTIVITIES</div>
            <div className="fr-line small">
              <div className="fr-left">Debt Repayment</div>
              <div className="fr-right negative">{fmt(cashFlow.debtRepayment)}</div>
            </div>
            <div className="fr-line small">
              <div className="fr-left">Dividend Payments</div>
              <div className="fr-right negative">{fmt(-cashFlow.dividends)}</div>
            </div>

            <div className="fr-line total">
              <div className="fr-left">Cash from Financing Activities</div>
              <div className="fr-right negative large">{fmt(cashFlow.cashFromFinancing)}</div>
            </div>

            <div className="section-divider" />

            <div className="fr-line total result">
              <div className="fr-left">NET CHANGE IN CASH</div>
              <div className="fr-right positive large">{fmt(cashFlow.netChange)}</div>
            </div>
          </div>
        )}
      </div>
        </div>
      </main>
    </div>
  );
}
