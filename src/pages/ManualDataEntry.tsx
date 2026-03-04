import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2, Edit2, X, Save } from "lucide-react";
import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import { useRole } from "../context/RoleContext";
import { hasPermission } from "../utils/rolePermissions";
import {
  getManualProducts,
  addManualProduct,
  updateManualProduct,
  deleteManualProduct,
  getManualSales,
  addManualSale,
  deleteManualSale,
  getManualExpenses,
  addManualExpense,
  deleteManualExpense,
  getTaxConfig,
  saveTaxConfig,
  calculateFinancialSummary,
  ManualProduct,
  ManualSale,
  ManualExpense
} from "../utils/manualDataStore";
import "../styles/ManualDataEntry.css";

export default function ManualDataEntry() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentRole } = useRole();
  const [_selectedRole, setSelectedRole] = useState("Owner (Full Access)");
  const [userProfile, setUserProfile] = useState<any>(null);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("products");

  // Products state
  const [products, setProducts] = useState<ManualProduct[]>([]);
  const [productForm, setProductForm] = useState({ name: "", purchasePrice: "", sellingPrice: "", quantity: "" });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Sales state
  const [sales, setSales] = useState<ManualSale[]>([]);
  const [saleForm, setSaleForm] = useState({ productId: "", quantity: "", totalAmount: "", date: new Date().toISOString().split("T")[0] });

  // Expenses state
  const [expenses, setExpenses] = useState<ManualExpense[]>([]);
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "operational", date: new Date().toISOString().split("T")[0] });

  // Tax state
  const [taxRate, setTaxRate] = useState(15);
  const [taxType, setTaxType] = useState("percentage");

  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) setUserProfile(JSON.parse(storedProfile));
    refreshData();
  }, []);

  const refreshData = () => {
    setProducts(getManualProducts());
    setSales(getManualSales());
    setExpenses(getManualExpenses());
    const config = getTaxConfig();
    setTaxRate(config.taxRate);
    setTaxType(config.taxType);
  };

  // Products handlers
  const handleAddProduct = () => {
    if (!productForm.name || !productForm.purchasePrice || !productForm.sellingPrice || !productForm.quantity) {
      alert("Please fill all fields");
      return;
    }

    if (editingProductId) {
      updateManualProduct(
        editingProductId,
        productForm.name,
        parseFloat(productForm.purchasePrice),
        parseFloat(productForm.sellingPrice),
        parseInt(productForm.quantity)
      );
      setEditingProductId(null);
    } else {
      addManualProduct(
        productForm.name,
        parseFloat(productForm.purchasePrice),
        parseFloat(productForm.sellingPrice),
        parseInt(productForm.quantity)
      );
    }

    setProductForm({ name: "", purchasePrice: "", sellingPrice: "", quantity: "" });
    refreshData();
  };

  const handleEditProduct = (product: ManualProduct) => {
    setProductForm({
      name: product.name,
      purchasePrice: product.purchasePrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      quantity: product.quantity.toString()
    });
    setEditingProductId(product.id);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm("Delete this product?")) {
      deleteManualProduct(id);
      refreshData();
    }
  };

  // Sales handlers
  const handleAddSale = () => {
    if (!saleForm.productId || !saleForm.quantity || !saleForm.totalAmount || !saleForm.date) {
      alert("Please fill all fields");
      return;
    }

    const product = products.find(p => p.id === saleForm.productId);
    if (!product) return;

    addManualSale(
      saleForm.productId,
      product.name,
      parseInt(saleForm.quantity),
      parseFloat(saleForm.totalAmount),
      saleForm.date
    );

    setSaleForm({ productId: "", quantity: "", totalAmount: "", date: new Date().toISOString().split("T")[0] });
    refreshData();
  };

  const handleDeleteSale = (id: string) => {
    if (confirm("Delete this sale?")) {
      deleteManualSale(id);
      refreshData();
    }
  };

  // Expenses handlers
  const handleAddExpense = () => {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.date) {
      alert("Please fill all fields");
      return;
    }

    addManualExpense(
      expenseForm.description,
      parseFloat(expenseForm.amount),
      expenseForm.category,
      expenseForm.date
    );

    setExpenseForm({ description: "", amount: "", category: "operational", date: new Date().toISOString().split("T")[0] });
    refreshData();
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm("Delete this expense?")) {
      deleteManualExpense(id);
      refreshData();
    }
  };

  const handleSaveTaxConfig = () => {
    saveTaxConfig(taxRate, taxType);
    alert("Tax settings saved!");
  };

  const summary = calculateFinancialSummary();

  const fmt = (n: number) => {
    return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  };

  return (
    <div className="dashboard-wrapper">
      {/* SIDEBAR */}
      <Sidebar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* MAIN CONTENT */}
      <main className="dashboard-main">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="scrollable-content">
          <h2 className="page-title">📊 Manual Data Entry</h2>
          <p className="page-subtitle">Manage sales, expenses, and calculate profitability</p>

          {/* TABS */}
          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === "products" ? "active" : ""}`}
              onClick={() => setActiveTab("products")}
            >
              Products
            </button>
            <button
              className={`tab-btn ${activeTab === "sales" ? "active" : ""}`}
              onClick={() => setActiveTab("sales")}
            >
              Sales
            </button>
            <button
              className={`tab-btn ${activeTab === "expenses" ? "active" : ""}`}
              onClick={() => setActiveTab("expenses")}
            >
              Expenses
            </button>
            <button
              className={`tab-btn ${activeTab === "summary" ? "active" : ""}`}
              onClick={() => setActiveTab("summary")}
            >
              Summary
            </button>
            <button
              className={`tab-btn ${activeTab === "tax" ? "active" : ""}`}
              onClick={() => setActiveTab("tax")}
            >
              Tax
            </button>
          </div>

          {/* PRODUCTS TAB */}
          {activeTab === "products" && (
            <div className="tab-content">
              <div className="form-box">
                <h3>Add/Edit Product</h3>
                <div className="form-grid">
                  <input
                    type="text"
                    placeholder="Product name"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Purchase price"
                    value={productForm.purchasePrice}
                    onChange={(e) => setProductForm({ ...productForm, purchasePrice: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Selling price"
                    value={productForm.sellingPrice}
                    onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={productForm.quantity}
                    onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                  />
                </div>
                <div className="form-buttons">
                  <button className="btn-primary" onClick={handleAddProduct}>
                    <Plus size={16} /> {editingProductId ? "Update" : "Add"}
                  </button>
                  {editingProductId && (
                    <button className="btn-secondary" onClick={() => {
                      setEditingProductId(null);
                      setProductForm({ name: "", purchasePrice: "", sellingPrice: "", quantity: "" });
                    }}>
                      <X size={16} /> Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="data-box">
                <h3>Products</h3>
                {products.length === 0 ? (
                  <p className="empty">No products</p>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Purchase</th>
                          <th>Selling</th>
                          <th>Profit/Unit</th>
                          <th>Qty</th>
                          <th>Total</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => {
                          const profit = p.sellingPrice - p.purchasePrice;
                          return (
                            <tr key={p.id}>
                              <td>{p.name}</td>
                              <td>{fmt(p.purchasePrice)}</td>
                              <td>{fmt(p.sellingPrice)}</td>
                              <td style={{ color: profit >= 0 ? "#4ade80" : "#ff6b6b" }}>{fmt(profit)}</td>
                              <td>{p.quantity}</td>
                              <td style={{ color: profit * p.quantity >= 0 ? "#4ade80" : "#ff6b6b" }}>{fmt(profit * p.quantity)}</td>
                              <td className="actions">
                                <button className="icon-btn" onClick={() => handleEditProduct(p)} title="Edit">
                                  <Edit2 size={14} />
                                </button>
                                <button className="icon-btn delete" onClick={() => handleDeleteProduct(p.id)} title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SALES TAB */}
          {activeTab === "sales" && (
            <div className="tab-content">
              <div className="form-box">
                <h3>Add Sale</h3>
                <div className="form-grid">
                  <select
                    value={saleForm.productId}
                    onChange={(e) => setSaleForm({ ...saleForm, productId: e.target.value })}
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Qty sold"
                    value={saleForm.quantity}
                    onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Total amount"
                    value={saleForm.totalAmount}
                    onChange={(e) => setSaleForm({ ...saleForm, totalAmount: e.target.value })}
                  />
                  <input
                    type="date"
                    value={saleForm.date}
                    onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })}
                  />
                </div>
                <button className="btn-primary" onClick={handleAddSale}>
                  <Plus size={16} /> Record Sale
                </button>
              </div>

              <div className="data-box">
                <h3>Sales</h3>
                {sales.length === 0 ? (
                  <p className="empty">No sales</p>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Amount</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((s) => (
                          <tr key={s.id}>
                            <td>{s.date}</td>
                            <td>{s.productName}</td>
                            <td>{s.quantity}</td>
                            <td>{fmt(s.totalAmount)}</td>
                            <td className="actions">
                              <button className="icon-btn delete" onClick={() => handleDeleteSale(s.id)}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EXPENSES TAB */}
          {activeTab === "expenses" && (
            <div className="tab-content">
              <div className="form-box">
                <h3>Add Expense</h3>
                <div className="form-grid">
                  <input
                    type="text"
                    placeholder="Description"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  />
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  >
                    <option value="operational">Operational</option>
                    <option value="utilities">Utilities</option>
                    <option value="marketing">Marketing</option>
                    <option value="salary">Salary</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  />
                </div>
                <button className="btn-primary" onClick={handleAddExpense}>
                  <Plus size={16} /> Add Expense
                </button>
              </div>

              <div className="data-box">
                <h3>Expenses</h3>
                {expenses.length === 0 ? (
                  <p className="empty">No expenses</p>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Category</th>
                          <th>Amount</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((e) => (
                          <tr key={e.id}>
                            <td>{e.date}</td>
                            <td>{e.description}</td>
                            <td>{e.category}</td>
                            <td>{fmt(e.amount)}</td>
                            <td className="actions">
                              <button className="icon-btn delete" onClick={() => handleDeleteExpense(e.id)}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUMMARY TAB */}
          {activeTab === "summary" && (
            <div className="tab-content">
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-label">Total Revenue</div>
                  <div className="summary-value">{fmt(summary.totalRevenue)}</div>
                  <div className="summary-desc">From sales</div>
                </div>

                <div className="summary-card">
                  <div className="summary-label">Total Expenses</div>
                  <div className="summary-value" style={{ color: "#ff6b6b" }}>{fmt(summary.totalExpenses)}</div>
                  <div className="summary-desc">All costs</div>
                </div>

                <div className="summary-card">
                  <div className="summary-label">Net Income</div>
                  <div className="summary-value" style={{ color: "#4ade80" }}>{fmt(summary.netIncome)}</div>
                  <div className="summary-desc">Revenue - Expenses</div>
                </div>

                <div className="summary-card">
                  <div className="summary-label">Total Product Profit</div>
                  <div className="summary-value">{fmt(summary.totalProductProfit)}</div>
                  <div className="summary-desc">(Selling - Purchase) × Qty</div>
                </div>

                <div className="summary-card">
                  <div className="summary-label">Net Profit</div>
                  <div className="summary-value" style={{ color: "#fbbf24" }}>{fmt(summary.netProfit)}</div>
                  <div className="summary-desc">Product Profit - Expenses</div>
                </div>

                <div className="summary-card">
                  <div className="summary-label">Tax Amount</div>
                  <div className="summary-value" style={{ color: "#60a5fa" }}>{fmt(summary.taxAmount)}</div>
                  <div className="summary-desc">On net profit</div>
                </div>

                <div className="summary-card highlight">
                  <div className="summary-label">Final Net Income</div>
                  <div className="summary-value">{fmt(summary.netIncomeAfterTax)}</div>
                  <div className="summary-desc">After tax</div>
                </div>
              </div>
            </div>
          )}

          {/* TAX TAB */}
          {activeTab === "tax" && (
            <div className="tab-content">
              <div className="form-box">
                <h3>Tax Configuration</h3>
                <div className="form-grid">
                  <div>
                    <label>Tax Type</label>
                    <select value={taxType} onChange={(e) => setTaxType(e.target.value)}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <div>
                    <label>Tax Rate</label>
                    <input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                      step="0.01"
                    />
                  </div>
                </div>
                <button className="btn-primary" onClick={handleSaveTaxConfig}>
                  <Save size={16} /> Save Settings
                </button>
              </div>

              <div className="info-box">
                <p>Tax is calculated on your <strong>Net Profit</strong> (Product Profit - Expenses)</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .sidebar {
          margin-top: 0;
        }
      `}</style>
    </div>
  );
}
