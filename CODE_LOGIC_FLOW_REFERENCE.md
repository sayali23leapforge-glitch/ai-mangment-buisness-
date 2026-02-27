# Authentication System - Code Logic Reference

## How Data Flows Through The System

### 1. OWNER LOGIN FLOW

```
Owner Opens Login Page
│
├─ Enters: owner@business.com / owner123
│
└─→ handleLogin() in Login.tsx
   │
   ├─→ signInWithEmailAndPassword(auth, email, password)
   │  │
   │  └─→ Firebase Auth ✅ SUCCEEDS (owner is in Auth)
   │     │
   │     └─ Sets: userRole = "owner"
   │        Sets: loginType = "owner"
   │        localStorage.setItem("userRole", "owner")
   │        localStorage.setItem("loginType", "owner")
   │
   └─→ navigate('/dashboard')

AuthContext.tsx:
├─ Detects: onAuthStateChanged fires with owner user
├─ Creates: Real Firebase User object
└─ Sets: user.email = "owner@business.com"

RoleContext.tsx:
├─ Checks: localStorage.getItem("userRole") = "owner" ✅ FOUND
├─ Sets: originalRole = "owner"
├─ Sets: currentRole = "owner"
└─ STOP (doesn't query Firestore)

Dashboard.tsx:
├─ Calls: const { currentRole } = useRole()
├─ Gets: currentRole = "owner"
├─ Filters: const filteredMenu = menuItems.filter(...)
├─ Result: 14 items (no filtering, owner sees all)
└─ Displays: All 14 menu items in sidebar

TopBar.tsx:
└─ Displays: Role badge = "Owner" ✅
```

---

### 2. ADD EMPLOYEE FLOW

```
Owner is logged in
│
└─→ Team Management Page
   │
   ├─→ Click "Add Employee"
   │  │
   │  └─ Modal opens
   │
   └─→ handleSendInvite() in TeamManagement.tsx
      │
      ├─ Validates: email, password, role not empty
      ├─ Validates: password === confirmPassword
      ├─ Validates: password.length >= 6
      │
      └─ Calls: addTeamMember({
         │      email: "accountant@test.com"
         │      role: "accountant"
         │      password: "testpass123"  ← PLAIN TEXT (TODO: hash)
         │      name: "accountant@test.com"
         │      createdBy: "owner@business.com"
         │    })
         │
         └─→ teamStorage.ts
            │
            ├─ Calls: addDoc(collection(db, "team_members"), {...})
            │
            └─→ Firestore ✅ STORES
               │
               └─ team_members collection
                  │
                  └─ Document: (auto-generated id)
                     ├─ email: "accountant@test.com"
                     ├─ role: "accountant"
                     ├─ password: "testpass123"
                     ├─ name: "accountant@test.com"
                     ├─ createdBy: "owner@business.com"
                     └─ createdAt: "2026-02-23T..."

Firebase Auth:
└─ ❌ NO NEW USER CREATED (correct!)

Modal closes → Success message shown
```

---

### 3. EMPLOYEE LOGIN FLOW

```
Employee Opens Login Page
│
├─ Enters: accountant@test.com / testpass123
│
└─→ handleLogin() in Login.tsx
   │
   ├─→ signInWithEmailAndPassword(auth, email, password)
   │  │
   │  └─→ Firebase Auth ❌ FAILS
   │     (employee not in Auth)
   │     │
   │     └─ catch (authError)
   │        │
   │        └─→ authenticateEmployee(email, password)
   │           │
   │           └─→ teamStorage.ts
   │              │
   │              ├─ Query: WHERE email == "accountant@test.com"
   │              │
   │              └─→ Firestore ✅ FOUND
   │                 │
   │                 ├─ Compares: "testpass123" === "testpass123" ✅ MATCH
   │                 │
   │                 └─ Returns: TeamMember object
   │                    ├─ email: "accountant@test.com"
   │                    ├─ role: "accountant"
   │                    └─ ...
   │
   ├─ Sets: userRole = "accountant"
   ├─ Sets: loginType = "employee"
   ├─ localStorage.setItem("userRole", "accountant")
   ├─ localStorage.setItem("loginType", "employee")
   ├─ localStorage.setItem("employeeEmail", "accountant@test.com")
   │
   └─→ navigate('/dashboard')

AuthContext.tsx:
├─ Checks: onAuthStateChanged fires with null (no Firebase user)
├─ Checks: loginType in localStorage = "employee" ✅ YES
├─ Creates: Pseudo User object
│  ├─ uid: "employee-accountant@test.com"
│  ├─ email: "accountant@test.com"
│  └─ (other required Firebase User properties)
└─ Sets: user = pseudoUser (fake but functional)

RoleContext.tsx:
├─ Checks: localStorage.getItem("userRole") = "accountant" ✅ FOUND
├─ Sets: originalRole = "accountant"
├─ Sets: currentRole = "accountant"
└─ STOP (doesn't query Firestore, localStorage already has it)

Dashboard.tsx:
├─ Calls: const { currentRole } = useRole()
├─ Gets: currentRole = "accountant"
├─ Filters: menuItems.filter(item => hasPermission("accountant", item.feature))
├─ Permission check: RolePermissions matrix
│  └─ accountant can access: financial_reports, financial_data, tax_center, billing
├─ Result: 4 items
└─ Displays: Only 4 menu items in sidebar

TopBar.tsx:
└─ Displays: Role badge = "Accountant" ✅
```

---

### 4. EMPLOYEE INTERACTING WITH PAGES

```
Employee clicked "Financial Reports" in sidebar
│
└─→ FinancialReports.tsx loads
   │
   ├─ Imports: import { useRole } from "../context/RoleContext"
   │
   ├─ Calls: const { currentRole } = useRole()
   │  │
   │  └─→ RoleContext returns cached role = "accountant"
   │     (already loaded in Step 3 during AuthContext/RoleContext init)
   │
   ├─ Filters: const filteredMenu = menuItems.filter(item =>
   │  │         hasPermission(currentRole as any, item.feature)
   │  │       )
   │  │
   │  └─→ hasPermission("accountant", "financial_reports")
   │     └─ Returns: true ✅
   │
   ├─ Renders: Filtered menu + page content
   │
   └─ Employee sees: Financial Reports page working correctly

Employee clicked "Inventory Manager" (NOT in sidebar):
│
└─→ Even if employee manually navigates to URL:
   │
   ├─ InventoryManager.tsx loads
   │
   ├─ Calls: const { currentRole } = useRole()
   │  └─ Returns: "accountant"
   │
   ├─ Checks: currentRole === "owner" ✅ NO (it's accountant)
   │  │
   │  └─ Alternative: Check hasPermission("accountant", "inventory")
   │     └─ Returns: false ❌
   │
   ├─ Page should redirect or show "Access Denied"
   │
   └─ Protects: Employee can't access pages not in their role
```

---

### 5. LOGOUT FLOW

```
Employee clicked Profile → Sign Out
│
└─→ Logout handler
   │
   ├─ Calls: signOut(auth)
   │
   ├─ Clears: localStorage
   │  ├─ userRole: null
   │  ├─ loginType: null
   │  ├─ employeeEmail: null
   │  └─ userProfile: null
   │
   └─→ AuthContext detects logout
      │
      ├─ onAuthStateChanged fires with null
      ├─ loginType === null (just cleared)
      ├─ Sets: user = null
      │
      └─→ RoleContext re-initializes
         │
         ├─ Finds: localStorage.getItem("userRole") = null
         ├─ Finds: loginType = null
         ├─ Sets: originalRole = null
         ├─ Sets: currentRole = null
         │
         └─→ Navigate to Login page (unauthenticated)
```

---

## localStorage Key-Value Pairs

### After Owner Login
```javascript
localStorage = {
  "userRole": "owner",
  "loginType": "owner",
  "userProfile": "{...owner business info...}",
  "integrations": "[...]",
  // ... other app data
}
```

### After Employee Login
```javascript
localStorage = {
  "userRole": "accountant",  // or "manager" or "employee"
  "loginType": "employee",
  "employeeEmail": "accountant@test.com",
  "integrations": "[...]",
  // ... other app data
}
```

### After Logout
```javascript
localStorage = {
  // All auth-related keys cleared
  "integrations": "[...]",  // Other data persists
  // ... other app data
}
```

---

## Firebase Collections Used

### Authentication
```
Firebase Auth:
└── Users with email/password auth
    └── owner@business.com ONLY
```

### Firestore Database
```
Firestore:
├── team_members (employees only)
│   ├── Document: id_001
│   │   ├── email: "accountant@test.com"
│   │   ├── role: "accountant"
│   │   ├── password: "testpass123"
│   │   ├── name: "Test Accountant"
│   │   ├── createdBy: "owner@business.com"
│   │   └── createdAt: Timestamp
│   │
│   └── Document: id_002
│       ├── email: "manager@test.com"
│       ├── role: "manager"
│       └── ...
│
├── userProfile (owner info)
│   └── Document: owner_profile
│       ├── email: "owner@business.com"
│       ├── role: "owner"
│       ├── businessName: "Golden Goods Inc."
│       └── ...
│
└── ... (other collections)
```

---

## Key Functions Called

### addTeamMember()
- **File:** teamStorage.ts
- **Input:** TeamMember object with email, role, password, name, createdBy
- **Output:** Document ID (string)
- **Firebase:** Adds to `team_members` collection
- **Called from:** TeamManagement.tsx handleSendInvite()

### authenticateEmployee()
- **File:** teamStorage.ts
- **Input:** email (string), password (string)
- **Output:** TeamMember object or null
- **Firestore:** Queries `team_members` collection by email, compares password
- **Called from:** Login.tsx handleLogin()

### subscribeToTeamMembers()
- **File:** teamStorage.ts
- **Input:** ownerEmail (string), callback function
- **Output:** Unsubscribe function
- **Firestore:** Real-time listener on team_members collection
- **Called from:** TeamManagement.tsx useEffect

### deleteTeamMember()
- **File:** teamStorage.ts
- **Input:** Member ID (string)
- **Output:** None (void)
- **Firestore:** Deletes document from team_members collection
- **Called from:** TeamManagement.tsx handleDeleteTeamMember()

---

## Role Permission Matrix

```
               Dashboard  Inventory  Financial  Tax  Billing  Team  ...
Owner            ✅         ✅          ✅      ✅    ✅       ✅   ... (14 total)
Accountant       ✅         ❌          ✅      ✅    ✅       ❌   ...  (4 total)
Manager          ✅         ✅          ✅      ❌    ❌       ❌   ... (11 total)
Employee         ✅         ✅          ❌      ❌    ❌       ❌   ...  (9 total)
```

Defined in: `src/utils/rolePermissions.ts`

---

## Summary: Why This Works

1. **Separation**: Owner in Firebase Auth, Employees in Firestore
2. **Authentication**: Owner uses Firebase, Employees use custom Firestore auth
3. **Authorization**: Both get role from localStorage after auth
4. **Filtering**: Both pages filter menus based on currentRole
5. **Persistence**: Team members real-time sync via Firestore subscriptions
6. **Protection**: Owner profile never overwritten (separate auth systems)
