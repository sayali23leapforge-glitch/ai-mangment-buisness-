# Financial Features Testing Guide

## Overview
This guide tests 5 key financial calculation features:
1. Manual Sales Entry
2. Expense Tracking  
3. Revenue - Expenses = Net Income
4. Profit per Product = Selling Price - Purchase Price
5. Net Profit with Tax = (Profit - Expenses) - Tax

---

## Testing Plan

### STEP 1: Add Products with Purchase & Selling Price
**Location**: Record Sale → Add Product OR Inventory Manager → Add Product

**Test Data to Add**:
```
Product 1: Laptop
- Purchase Price: $600
- Selling Price: $1000
- Quantity: 5

Product 2: Mouse
- Purchase Price: $5
- Selling Price: $15
- Quantity: 50

Product 3: Keyboard
- Purchase Price: $20
- Selling Price: $50
- Quantity: 30
```

**Expected Result**: Products stored with both purchase and selling prices

---

### STEP 2: Record Manual Sales Entry
**Location**: Record Sale → Switch to "Manual Entry" Tab

**Test Case 1 - Auto Entry** (Select from inventory):
- Record Sale: 2× Laptop = $2000 (2 × $1000)
- Expected Stock: 5 - 2 = 3 remaining

**Test Case 2 - Manual Entry** (Manually without inventory):
- Product: "Custom Monitor"
- Price: $300
- Quantity: 3
- Total: $900

**Expected Result in Financial Reports**:
- Total Revenue = $2000 + $900 = $2900
- (Stock should reduce if auto entry is used)

---

### STEP 3: Add Expenses
**Location**: Financial Reports → Expenses Tab (to be created)

**Test Expenses to Add**:
```
Expense 1: 
- Description: Rent
- Amount: $500
- Category: Operational
- Date: Today

Expense 2:
- Description: Shipping
- Amount: $150
- Category: Operational
- Date: Today

Expense 3:
- Description: Utilities
- Amount: $100
- Category: Operational
- Date: Today
```

**Expected Result**: 
- Total Expenses = $500 + $150 + $100 = $750

---

### STEP 4: Verify Profit Calculations
**Location**: Financial Reports → Summary Section

**Calculation Breakdown**:

#### For Auto-Entry Products (Laptop):
```
Units Sold: 2
Selling Price per unit: $1000
Purchase Price per unit: $600

Revenue from Laptops: 2 × $1000 = $2000
Cost of Goods: 2 × $600 = $1200
Gross Profit: $2000 - $1200 = $800
```

#### For Manual-Entry Products (Monitor):
```
Units Sold: 3
Selling Price: $300
(Assumes Cost = $0 since manually entered)

Revenue from Monitors: 3 × $300 = $900
Cost of Goods: $0 (manual entry)
Gross Profit: $900
```

#### Total Gross Profit: $800 + $900 = $1700

---

### STEP 5: Verify Net Income & Taxation
**Location**: Financial Reports → Summary Section

**Expected Calculations**:

```
REVENUE BREAKDOWN:
├─ Total Sales Revenue: $2900
├─ Cost of Goods Sold: $1200
└─ GROSS PROFIT: $1700

EXPENSES:
├─ Rent: $500
├─ Shipping: $150
├─ Utilities: $100
└─ TOTAL EXPENSES: $750

NET INCOME (Before Tax): $1700 - $750 = $950

TAXATION:
├─ Tax Rate: 15% (or configured)
├─ Tax Amount: $950 × 0.15 = $142.50
└─ NET INCOME (After Tax): $950 - $142.50 = $807.50
```

---

## Verification Checklist

### Financial Reports Page Should Display:
- [ ] Total Revenue: $2900
- [ ] Cost of Goods Sold: $1200
- [ ] Gross Profit: $1700
- [ ] Total Expenses: $750
- [ ] Net Income (Before Tax): $950
- [ ] Tax (15%): $142.50
- [ ] **Net Income (After Tax): $807.50**

### Detailed Breakdown Should Show:
- [ ] Per-product sales and profit margin
- [ ] Expense list with categories
- [ ] Monthly/date-based breakdown
- [ ] Tax calculations

### Tax Center Should Show:
- [ ] Tax Amount Owed: $142.50
- [ ] Tax Rate Applied: 15%
- [ ] Taxable Income: $950
- [ ] Net Income After Tax: $807.50

---

## Features to Test

### 1. Manual Sales Entry ✓ (Already Implemented)
**Test**: 
- Go to Record Sale → Manual Entry Tab
- Enter: Product name, Price, Quantity
- Add to cart
- Complete sale
- Should appear in Financial Reports

### 2. Expense Tracking ⚠️ (To be Implemented)
**Test**:
- Add expenses with description, amount, category, date
- View expense list
- Total should calculate correctly

### 3. Profit Calculation ⚠️ (To be Implemented)
**Test**:
- For products: (Selling Price - Purchase Price) × Quantity = Profit
- Gross Profit = Sum of all product profits
- Should display per-product profit margin

### 4. Net Income Calculation ⚠️ (To be Implemented)
**Test**:
- Net Income = Gross Profit - Expenses
- Should update when sales/expenses change
- Display before and after tax

### 5. Tax on Net Profit ⚠️ (To be Implemented)
**Test**:
- Tax Amount = Net Income × Tax Rate
- Should apply configured tax rate from Tax Center
- Result: Net Income (After Tax) = Net Income - Tax Amount

---

## How to Test Right Now

### Current Working Features:
1. ✅ Add Products with Purchase/Selling Prices
2. ✅ Record Sales (Auto Entry - from inventory)
3. ✅ Record Manual Sales (without removing from inventory)
4. ✅ View in Financial Reports

### Quick Start Test:
```
1. Go to Add Product
2. Add: Laptop, Purchase: $600, Selling: $1000, Qty: 5
3. Go to Record Sale → Auto Entry
4. Select Laptop, Qty: 2, Add to cart
5. Complete Sale
6. Go to Financial Reports
7. See sale recorded with revenue calculation
```

### Missing & To Implement:
```
- [ ] Expense tracking interface
- [ ] Expense calculations in summary
- [ ] Profit per product (Selling - Purchase)  
- [ ] Net Income = Gross Profit - Expenses
- [ ] Tax calculation on net profit
- [ ] Display "Net Income After Tax"
```

---

## Next Steps

1. **Create Expense Component** - Add to Financial Reports
2. **Update Financial Summary** - Add profit, net income, tax calculations
3. **Update Tax Center** - Show tax on net profit (not just revenue)
4. **Create Financial Summary View** - Show all calculations in one place

---

## Data Flow Diagram

```
Products (with Purchase & Selling Price)
    ↓
Record Sale (Auto or Manual)
    ↓
Sales Data Stored (Revenue calculated)
    ↓
Add Expenses
    ↓
Financial Reports Calculation:
├─ Gross Profit = (Selling - Purchase) × Qty
├─ Net Income = Gross Profit - Expenses  
├─ Tax = Net Income × Tax Rate
└─ Net Income After Tax = Net Income - Tax
    ↓
Display in:
├─ Financial Reports (detailed breakdown)
├─ Tax Center (tax owed)
└─ Dashboard (summary)
```
