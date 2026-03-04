// =========================================
// MANUAL DATA ENTRY STORE
// =========================================

export interface ManualProduct {
  id: string;
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  createdAt: number;
}

export interface ManualSale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  date: string;
  createdAt: number;
}

export interface ManualExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdAt: number;
}

export interface TaxConfig {
  taxRate: number;
  taxType: string;
}

// =========================================
// PRODUCTS
// =========================================

export function getManualProducts(): ManualProduct[] {
  try {
    const data = localStorage.getItem("manualProducts");
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Error reading manual products:", err);
    return [];
  }
}

function saveManualProducts(products: ManualProduct[]) {
  try {
    localStorage.setItem("manualProducts", JSON.stringify(products));
  } catch (err) {
    console.error("Error saving manual products:", err);
  }
}

export function addManualProduct(name: string, purchasePrice: number, sellingPrice: number, quantity: number): ManualProduct {
  const products = getManualProducts();
  const newProduct: ManualProduct = {
    id: `prod_${Date.now()}`,
    name,
    purchasePrice,
    sellingPrice,
    quantity,
    createdAt: Date.now()
  };
  products.push(newProduct);
  saveManualProducts(products);
  return newProduct;
}

export function updateManualProduct(id: string, name: string, purchasePrice: number, sellingPrice: number, quantity: number) {
  const products = getManualProducts();
  const product = products.find(p => p.id === id);
  if (product) {
    product.name = name;
    product.purchasePrice = purchasePrice;
    product.sellingPrice = sellingPrice;
    product.quantity = quantity;
    saveManualProducts(products);
  }
}

export function deleteManualProduct(id: string) {
  let products = getManualProducts();
  products = products.filter(p => p.id !== id);
  saveManualProducts(products);
}

// =========================================
// SALES
// =========================================

export function getManualSales(): ManualSale[] {
  try {
    const data = localStorage.getItem("manualSales");
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Error reading manual sales:", err);
    return [];
  }
}

function saveManualSales(sales: ManualSale[]) {
  try {
    localStorage.setItem("manualSales", JSON.stringify(sales));
  } catch (err) {
    console.error("Error saving manual sales:", err);
  }
}

export function addManualSale(productId: string, productName: string, quantity: number, totalAmount: number, date: string): ManualSale {
  const sales = getManualSales();
  const newSale: ManualSale = {
    id: `sale_${Date.now()}`,
    productId,
    productName,
    quantity,
    totalAmount,
    date,
    createdAt: Date.now()
  };
  sales.push(newSale);
  saveManualSales(sales);
  return newSale;
}

export function deleteManualSale(id: string) {
  let sales = getManualSales();
  sales = sales.filter(s => s.id !== id);
  saveManualSales(sales);
}

// =========================================
// EXPENSES
// =========================================

export function getManualExpenses(): ManualExpense[] {
  try {
    const data = localStorage.getItem("manualExpenses");
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Error reading manual expenses:", err);
    return [];
  }
}

function saveManualExpenses(expenses: ManualExpense[]) {
  try {
    localStorage.setItem("manualExpenses", JSON.stringify(expenses));
  } catch (err) {
    console.error("Error saving manual expenses:", err);
  }
}

export function addManualExpense(description: string, amount: number, category: string, date: string): ManualExpense {
  const expenses = getManualExpenses();
  const newExpense: ManualExpense = {
    id: `exp_${Date.now()}`,
    description,
    amount,
    category,
    date,
    createdAt: Date.now()
  };
  expenses.push(newExpense);
  saveManualExpenses(expenses);
  return newExpense;
}

export function deleteManualExpense(id: string) {
  let expenses = getManualExpenses();
  expenses = expenses.filter(e => e.id !== id);
  saveManualExpenses(expenses);
}

// =========================================
// TAX CONFIGURATION
// =========================================

export function getTaxConfig(): TaxConfig {
  try {
    const data = localStorage.getItem("taxConfig");
    return data ? JSON.parse(data) : { taxRate: 15, taxType: "percentage" };
  } catch (err) {
    return { taxRate: 15, taxType: "percentage" };
  }
}

export function saveTaxConfig(taxRate: number, taxType: string = "percentage") {
  try {
    localStorage.setItem("taxConfig", JSON.stringify({ taxRate, taxType }));
  } catch (err) {
    console.error("Error saving tax config:", err);
  }
}

// =========================================
// FINANCIAL CALCULATIONS
// =========================================

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  totalProductProfit: number;
  netProfit: number;
  taxAmount: number;
  netIncomeAfterTax: number;
}

export function calculateFinancialSummary(): FinancialSummary {
  const products = getManualProducts();
  const sales = getManualSales();
  const expenses = getManualExpenses();
  const taxConfig = getTaxConfig();

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netIncome = totalRevenue - totalExpenses;

  const totalProductProfit = products.reduce((sum, product) => {
    const profitPerUnit = product.sellingPrice - product.purchasePrice;
    return sum + (profitPerUnit * product.quantity);
  }, 0);

  const netProfit = totalProductProfit - totalExpenses;

  let taxAmount = 0;
  if (taxConfig.taxType === "percentage") {
    taxAmount = netProfit > 0 ? (netProfit * taxConfig.taxRate) / 100 : 0;
  } else {
    taxAmount = netProfit > 0 ? taxConfig.taxRate : 0;
  }

  const netIncomeAfterTax = netProfit - taxAmount;

  return {
    totalRevenue,
    totalExpenses,
    netIncome,
    totalProductProfit,
    netProfit,
    taxAmount,
    netIncomeAfterTax
  };
}

export function clearAllManualData() {
  localStorage.removeItem("manualProducts");
  localStorage.removeItem("manualSales");
  localStorage.removeItem("manualExpenses");
}
