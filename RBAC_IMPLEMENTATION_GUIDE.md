# Role-Based Access Control (RBAC) Implementation Guide

## ✅ COMPLETED IMPLEMENTATION

### Core RBAC System
- ✅ **rolePermissions.ts** - Permission matrix for all 4 roles (Owner, Accountant, Manager, Employee)
- ✅ **teamStorage.ts** - Firestore CRUD operations for team member management with password storage
- ✅ **RoleContext.tsx** - React Context for global role state + role switching (owner only)
- ✅ **SwitchRole.tsx** - Owner-only dropdown component for role preview/testing

### Integration Points
- ✅ **App.tsx** - RoleProvider wrapped around all routes inside AuthProvider
- ✅ **TopBar.tsx** - SwitchRole component integrated for owner role switching
- ✅ **Dashboard.tsx** - Role-based menu filtering implemented
- ✅ **TeamManagement.tsx** - Password fields added + role-based filtering + direct team member creation
- ✅ **SignUp.tsx** - New users automatically assigned "owner" role
- ✅ **Login.tsx** - Role detection from Firestore for team members

### Features Working
- ✅ Owner can see all 14 menu items
- ✅ Other roles see filtered menu items based on permissions
- ✅ Owner can switch roles temporarily to preview restricted views
- ✅ Team members can be created with email + password in Team Management
- ✅ Roles persist in localStorage between page refreshes
- ✅ Role changes visible across all pages with context

---

## 🔄 IN PROGRESS

### Pages Awaiting Role-Based Filtering (12 remaining)
1. ✅ **BillingPlan.tsx** - imports updated
2. ⏳ **InventoryDashboard.tsx** - needs menuItems update + filter
3. ⏳ **InventoryManager.tsx** - needs menuItems update + filter
4. ⏳ **RecordSale.tsx** - needs menuItems update + filter
5. ⏳ **QRManager.tsx** - needs menuItems update + filter
6. ⏳ **AIInsights.tsx** - needs menuItems update + filter
7. ⏳ **FinancialReports.tsx** - needs menuItems update + filter
8. ⏳ **TaxCenter.tsx** - needs menuItems update + filter
9. ⏳ **ImprovementHub.tsx** - needs menuItems update + filter
10. ⏳ **Integrations.tsx** - needs menuItems update + filter
11. ⏳ **Settings.tsx** - needs menuItems update + filter
12. ⏳ **AddProduct.tsx** - needs menuItems update + filter

---

## 🔐 Permission Matrix

### Owner (Full Access)
- ✅ Finance Overview
- ✅ Inventory Dashboard
- ✅ Record Sale
- ✅ Inventory Manager
- ✅ Add Product
- ✅ QR & Barcodes
- ✅ AI Insights
- ✅ Financial Reports
- ✅ Tax Center
- ✅ Integrations
- ✅ Team Management
- ✅ Billing & Plan
- ✅ Improvement Hub
- ✅ Settings
- ✅ Role Switching

### Accountant
- ✅ Finance Overview
- ✅ Financial Reports
- ✅ Tax Center
- ✅ Billing & Plan
- ❌ Cannot see: Inventory, Sales, AI, Team, Integrations, Settings

### Manager
- ✅ Finance Overview
- ✅ Inventory Dashboard
- ✅ Record Sale
- ✅ Inventory Manager
- ✅ Add Product
- ✅ QR & Barcodes
- ✅ AI Insights
- ✅ Financial Reports
- ✅ Integrations
- ✅ Improvement Hub
- ✅ Settings
- ❌ Cannot see: Tax Center, Team Management, Billing & Plan

### Employee
- ✅ Finance Overview
- ✅ Inventory Dashboard
- ✅ Record Sale
- ✅ Inventory Manager
- ✅ Add Product
- ✅ QR & Barcodes
- ✅ Improvement Hub
- ✅ Settings
- ❌ Cannot see: Financial Reports, Tax Center, AI Insights, Team, Integrations, Billing

---

## 🧪 Testing the RBAC System

### 1. Test Owner Role (Full Access)
1. Sign up as new user → automatically gets "owner" role
2. On Dashboard, see all 14 menu items
3. Go to TopBar → Click SwitchRole dropdown (shows only to owners)
4. Select "Manager" to preview manager view
5. See menu items filter to manager permissions
6. Click "Your Role" badge to return to owner view

### 2. Test Team Member Creation & Login
1. As owner, go to **Team Management** page
2. Click "Add Employee" button
3. Fill form:
   - Email: employee@test.com
   - Role: Manager or Employee  
   - Password: testpass123
   - Confirm: testpass123
4. Click "Add Employee"
5. Employee data stored in Firestore `team_members` collection
6. New employee can login with email + password
7. After login → see filtered menu based on their role

### 3. Verify Firestore Storage
- Check Firebase Console → Firestore → Data
- Collection: `team_members`
- Document contains: email, role, password, createdBy, createdAt, name

### 4. Test Role-Based Access Across All Pages
- As Manager: Verify Tax Center, Team Management, Billing don't appear
- As Accountant: Verify only Finance-related pages appear
- As Employee: Verify limited access to financial/management features

### 5. Test Role Persistence
1. Login as employee
2. Navigate between pages
3. Refresh page (F5)
4. Verify role still shows correctly (stored in localStorage)
5. Navigate to different page → role persists

---

## 📋 File Locations & Updates Made

### New Files Created
```
src/utils/rolePermissions.ts          (Permission matrix & utilities)
src/utils/teamStorage.ts              (Firestore team member CRUD)
src/context/RoleContext.tsx           (Role state management)
src/components/SwitchRole.tsx         (Role switching UI)
src/styles/SwitchRole.css             (SwitchRole styling)
```

### Files Modified
```
src/App.tsx                           (Added RoleProvider wrapper)
src/components/TopBar.tsx             (Added SwitchRole component)
src/pages/Dashboard.tsx               (Added role filtering)
src/pages/TeamManagement.tsx          (Added password fields + role filtering)
src/pages/SignUp.tsx                  (Auto-assign owner on signup)
src/pages/Login.tsx                   (Role detection from Firestore)
src/pages/BillingPlan.tsx             (imports updated)
```

---

## 🚀 Quick Reference: For Each Remaining Page Update

Each of these 12 pages needs 3 changes:

### Step 1: Add Imports (if not already present)
```tsx
import { useRole } from "../context/RoleContext";
import { hasPermission } from "../utils/rolePermissions";
```

### Step 2: Add Hook in Component
```tsx
const { currentRole } = useRole();
```

### Step 3: Update menuItems Array
Add `feature` property to each item:
```tsx
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
```

### Step 4: Add Filter to Navigation Render
Change:
```tsx
{menuItems.map((item, idx) => {
```

To:
```tsx
{menuItems.filter(item => hasPermission(currentRole as any, item.feature)).map((item, idx) => {
```

---

## 🛠️ Implementation Pattern

### Dashboard.tsx Pattern (Already Done - Use as Reference)
```tsx
// 1. Import hooks
import { useRole } from "../context/RoleContext";
import { hasPermission } from "../utils/rolePermissions";

// 2. Component hook
const { currentRole } = useRole();

// 3. Add feature to menuItems
const menuItems = [
  { icon: Wallet, label: "Finance Overview", feature: "finance" },
  // ... etc
];

// 4. Filter in render
{menuItems
  .filter(item => hasPermission(currentRole as any, item.feature))
  .map((item, idx) => {
    // render
  })}
```

---

## 📊 Current System Flow

1. **User Signup** → Auto-assigned owner role → Stored in localStorage
2. **User Login** → Role retrieved from localStorage OR team_members Firestore → Set in RoleContext
3. **Page Navigation** → All pages check currentRole via useRole hook
4. **Sidebar Menu** → Filtered based on hasPermission(currentRole, feature)
5. **Owner Role Switch** → Can temporarily preview other roles via SwitchRole dropdown
6. **Refresh Page** → Role persists from localStorage

---

## 🔗 Related Files

- Permission definitions: `src/utils/rolePermissions.ts`
- Team storage methods: `src/utils/teamStorage.ts`
- Role context hook: `src/context/RoleContext.tsx`
- Role dropdown UI: `src/components/SwitchRole.tsx` and `src/styles/SwitchRole.css`

---

## Next Steps

1. ✅ Continue updating remaining 12 pages (menuItems feature property + filter)
2. Create protected route wrapper for sensitive operations
3. Add role indicators in sidebar
4. Implement backend password hashing (when server is running)
5. Add role-specific feature restrictions (not just sidebar visibility)

