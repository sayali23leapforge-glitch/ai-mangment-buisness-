import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, DollarSign, TrendingDown, BarChart3, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import { useRole } from "../context/RoleContext";
import { hasPermission } from "../utils/rolePermissions";
import { useSubscription } from "../context/SubscriptionContext";
import "../styles/ManageExpenses.css";

interface Expense {
  id: string;
  type: "operating" | "product_cost";
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
}

export default function ManageExpenses() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentRole } = useRole();
  const { tier, trialExpired } = useSubscription();
  const [userProfile, setUserProfile] = useState<any>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expenseType, setExpenseType] = useState<"operating" | "product_cost">("operating");

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "Operations",
    notes: "",
  });

  const operatingCategories = [
    "Operations",
    "Utilities",
    "Marketing",
    "Rent/Lease",
    "Staff Wages",
    "Maintenance",
    "Insurance",
    "Transport",
    "Other",
  ];

  const productCostCategories = [
    "Raw Materials",
    "Product Purchase",
    "Packaging",
    "Shipping/Freight",
    "Labor (Production)",
    "Other",
  ];

  const categories = expenseType === "operating" ? operatingCategories : productCostCategories;

  // Load expenses from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("businessExpenses");
    if (stored) {
      setExpenses(JSON.parse(stored));
    }

    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) setUserProfile(JSON.parse(storedProfile));
  }, []);

  // Save expenses to localStorage
  const saveExpenses = (updatedExpenses: Expense[]) => {
    setExpenses(updatedExpenses);
    localStorage.setItem("businessExpenses", JSON.stringify(updatedExpenses));
    // Notify other components
    window.dispatchEvent(new CustomEvent("expensesUpdated"));
  };

  // Add or update expense
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description || !formData.amount) {
      alert("Please fill in all required fields");
      return;
    }

    if (editingId) {
      // Update existing expense
      const updated = expenses.map((e) =>
        e.id === editingId
          ? {
              ...e,
              type: expenseType,
              description: formData.description,
              amount: parseFloat(formData.amount),
              category: formData.category,
              notes: formData.notes,
            }
          : e
      );
      saveExpenses(updated);
      setEditingId(null);
    } else {
      // Add new expense
      const newExpense: Expense = {
        id: Date.now().toString(),
        type: expenseType,
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: new Date().toISOString().split("T")[0],
        notes: formData.notes,
      };
      saveExpenses([...expenses, newExpense]);
    }

    // Reset form
    setFormData({
      description: "",
      amount: "",
      category: expenseType === "operating" ? "Operations" : "Product Purchase",
      notes: "",
    });
    setExpenseType("operating");
  };

  // Edit expense
  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setExpenseType(expense.type);
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      notes: expense.notes || "",
    });
  };

  // Delete expense
  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      saveExpenses(expenses.filter((e) => e.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setFormData({
          description: "",
          amount: "",
          category: "Operations",
          notes: "",
        });
      }
    }
  };

  // Calculate totals by type
  const operatingExpenses = expenses
    .filter((e) => e.type === "operating")
    .reduce((sum, e) => sum + e.amount, 0);

  const productCostExpenses = expenses
    .filter((e) => e.type === "product_cost")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = operatingExpenses + productCostExpenses;

  if (!hasPermission(currentRole as any, "expense_management")) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to manage expenses.</p>
      </div>
    );
  }

  if (tier === "free" || trialExpired) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="dashboard-main">
          <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <div className="scrollable-content">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px", flexDirection: "column", textAlign: "center", gap: "20px" }}>
              <Lock size={64} color="#999" />
              <h2>{trialExpired ? "Trial Expired - Upgrade to Continue" : "Expense Management Requires Growth Plan"}</h2>
              <p style={{ color: "#666", maxWidth: "400px" }}>{trialExpired ? "Your trial period has ended. Choose a plan to continue managing expenses." : "Track operating expenses and product costs. Available in Growth and Pro plans."}</p>
              <Link to="/billing" style={{ marginTop: "10px", padding: "10px 20px", backgroundColor: "#007bff", color: "white", borderRadius: "5px", textDecoration: "none" }}>
                View Plans
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="manage-expenses-container">
      <Sidebar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="main-content">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="expenses-wrapper">
          <div className="expenses-header">
            <div className="header-left">
              <h1>
                <DollarSign size={32} className="header-icon" />
                Business Expenses Management
              </h1>
              <p className="header-subtitle">Track all operating and product costs</p>
            </div>
            <div className="expense-summary">
              <div className="summary-card operating">
                <div className="summary-icon">
                  <TrendingDown size={24} />
                </div>
                <div className="summary-content">
                  <span>Operating Expenses</span>
                  <strong>Rs. {operatingExpenses.toFixed(2)}</strong>
                </div>
              </div>
              <div className="summary-card product-cost">
                <div className="summary-icon">
                  <BarChart3 size={24} />
                </div>
                <div className="summary-content">
                  <span>Product Costs (COGS)</span>
                  <strong>Rs. {productCostExpenses.toFixed(2)}</strong>
                </div>
              </div>
              <div className="summary-card total">
                <div className="summary-icon">
                  <DollarSign size={24} />
                </div>
                <div className="summary-content">
                  <span>Total Expenses</span>
                  <strong>Rs. {totalExpenses.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="expenses-content">
            {/* Form Section */}
            <div className="form-section">
              <h2>{editingId ? "Edit Expense" : "Add New Expense"}</h2>
              
              <div className="type-selector">
                <button
                  className={`type-btn ${expenseType === "operating" ? "active" : ""}`}
                  onClick={() => {
                    setExpenseType("operating");
                    setFormData({
                      ...formData,
                      category: "Operations",
                    });
                  }}
                >
                  <TrendingDown size={18} />
                  Operating Expense
                </button>
                <button
                  className={`type-btn ${expenseType === "product_cost" ? "active" : ""}`}
                  onClick={() => {
                    setExpenseType("product_cost");
                    setFormData({
                      ...formData,
                      category: "Product Purchase",
                    });
                  }}
                >
                  <BarChart3 size={18} />
                  Product Cost (COGS)
                </button>
              </div>

              <form onSubmit={handleSubmit} className="expense-form">
                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder={
                      expenseType === "operating"
                        ? "e.g., Monthly rent payment"
                        : "e.g., Purchase materials from supplier XYZ"
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Amount (Rs.)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Add invoice number, supplier details, etc."
                    rows={3}
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-submit">
                    <Plus size={18} />
                    {editingId ? "Update Expense" : "Add Expense"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => {
                        setEditingId(null);
                        setFormData({
                          description: "",
                          amount: "",
                          category: "Operations",
                          notes: "",
                        });
                        setExpenseType("operating");
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Expenses List Section */}
            <div className="list-section">
              <div className="list-tabs">
                <h2>Expense Records</h2>
              </div>
              {expenses.length === 0 ? (
                <div className="no-expenses">
                  <p>No expenses recorded yet</p>
                </div>
              ) : (
                <div className="expenses-list">
                  {/* Operating Expenses */}
                  {expenses.filter((e) => e.type === "operating").length > 0 && (
                    <div className="expense-section">
                      <h3 className="section-title operating-title">Operating Expenses</h3>
                      <div className="expenses-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Description</th>
                              <th>Category</th>
                              <th>Amount</th>
                              <th>Notes</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenses
                              .filter((e) => e.type === "operating")
                              .sort(
                                (a, b) =>
                                  new Date(b.date).getTime() - new Date(a.date).getTime()
                              )
                              .map((expense) => (
                                <tr key={expense.id}>
                                  <td>{new Date(expense.date).toLocaleDateString()}</td>
                                  <td>{expense.description}</td>
                                  <td>
                                    <span className={`category-badge ${expense.category.toLowerCase().replace(/ /g, "-")}`}>
                                      {expense.category}
                                    </span>
                                  </td>
                                  <td className="amount">
                                    Rs. {expense.amount.toFixed(2)}
                                  </td>
                                  <td className="notes">{expense.notes || "-"}</td>
                                  <td className="actions">
                                    <button
                                      className="btn-edit"
                                      onClick={() => handleEdit(expense)}
                                      title="Edit"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      className="btn-delete"
                                      onClick={() => handleDelete(expense.id)}
                                      title="Delete"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Product Costs */}
                  {expenses.filter((e) => e.type === "product_cost").length > 0 && (
                    <div className="expense-section">
                      <h3 className="section-title product-cost-title">Product Costs (COGS)</h3>
                      <div className="expenses-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Description</th>
                              <th>Category</th>
                              <th>Amount</th>
                              <th>Notes</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenses
                              .filter((e) => e.type === "product_cost")
                              .sort(
                                (a, b) =>
                                  new Date(b.date).getTime() - new Date(a.date).getTime()
                              )
                              .map((expense) => (
                                <tr key={expense.id}>
                                  <td>{new Date(expense.date).toLocaleDateString()}</td>
                                  <td>{expense.description}</td>
                                  <td>
                                    <span className={`category-badge ${expense.category.toLowerCase().replace(/ /g, "-")}`}>
                                      {expense.category}
                                    </span>
                                  </td>
                                  <td className="amount">
                                    Rs. {expense.amount.toFixed(2)}
                                  </td>
                                  <td className="notes">{expense.notes || "-"}</td>
                                  <td className="actions">
                                    <button
                                      className="btn-edit"
                                      onClick={() => handleEdit(expense)}
                                      title="Edit"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      className="btn-delete"
                                      onClick={() => handleDelete(expense.id)}
                                      title="Delete"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
