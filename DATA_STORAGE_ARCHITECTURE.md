# Data Storage Architecture - Employee & User Data

## Current System (CORRECTED)

### What IS Stored in localStorage
Only AUTHENTICATION data for session management:

```javascript
localStorage = {
  // Owner authentication
  "userRole": "owner",                    // Current user's role
  "loginType": "owner",                   // Identifies owner vs employee
  "userProfile": JSON.stringify({...}),   // Owner profile (name, business, etc.)
  
  // Employee authentication
  "userRole": "accountant",               // Employee's assigned role
  "loginType": "employee",                // Identifies as employee (not in Firebase Auth)
  "employeeEmail": "emp@test.com",        // Employee email for reference
}
```

**Why?** To preserve login session across browser refresh

**When cleared?** 
- ✅ When user clicks "Sign Out" (NOW FIXED)
- ✅ When browser is closed (optional - user can choose)
- ✅ When localStorage is explicitly cleared via console

---

### What is NOT Stored in localStorage
Employee records and team member data:

```javascript
❌ localStorage.teamMembers = [...]        // WRONG - never do this
❌ localStorage.employees = [...]          // WRONG - never do this
❌ localStorage.addedEmployees = [...]     // WRONG - never do this
```

**Why?** Must come from Firestore to ensure centralized, always-up-to-date data

**Storage Instead:** Firestore `team_members` collection

---

### Data Flow Architecture

```
┌─────────────────────────────────────────────┐
│          OWNER ADDS EMPLOYEE                │
└────────────────┬────────────────────────────┘
                 │
                 ├─→ TeamManagement.tsx: handleSendInvite()
                 │
                 ├─→ addTeamMember(employee_data)
                 │
                 ├─→ Firebase Firestore
                 │   └─ team_members collection
                 │      └─ NEW DOCUMENT
                 │
                 └─→ Real-time subscription triggered
                     └─→ subscribeToTeamMembers()
                         └─→ setTeamMembers([...updated_members])
                             └─→ UI updates with new employee

┌─────────────────────────────────────────────┐
│        PAGE REFRESH / RELOAD                │
└────────────────┬────────────────────────────┘
                 │
                 ├─→ AuthContext initializes
                 │   └─ Loads userRole from localStorage
                 │
                 ├─→ RoleContext initializes
                 │   └─ Loads currentRole from localStorage
                 │
                 ├─→ TeamManagement useEffect runs
                 │   └─ Calls subscribeToTeamMembers(ownerEmail)
                 │
                 ├─→ Firestore subscription established
                 │   └─ Query: collection.where("createdBy", "==", ownerEmail)
                 │
                 └─→ Real-time listener fires
                     └─→ Fetches ALL team members from Firestore
                         └─→ setTeamMembers([...firestore_members])
                             └─→ UI displays fresh data

┌─────────────────────────────────────────────┐
│           USER LOGOUT                       │
└────────────────┬────────────────────────────┘
                 │
                 ├─→ TopBar.tsx: handleLogout()
                 │
                 ├─→ signOut(auth) - Firebase logout
                 │
                 ├─→ localStorage.removeItem() × 4
                 │   ├─ userRole
                 │   ├─ loginType
                 │   ├─ employeeEmail
                 │   └─ userProfile
                 │
                 ├─→ navigate("/login")
                 │
                 └─→ Page clears - all timers/subscriptions stopped
```

---

## File Changes Made

### TopBar.tsx - Enhanced Logout

**Before:**
```typescript
const handleLogout = async () => {
  await signOut(auth);
  navigate("/login");
};
```

**After:**
```typescript
const handleLogout = async () => {
  try {
    await signOut(auth);
    
    // Clear authentication data
    localStorage.removeItem("userRole");
    localStorage.removeItem("loginType");
    localStorage.removeItem("employeeEmail");
    localStorage.removeItem("userProfile");
    
    console.log("✅ Logged out - localStorage cleared");
    navigate("/login");
  } catch (error) {
    console.error("Logout error:", error);
  }
};
```

**Impact:** localStorage now properly cleaned on logout

---

## Verification Checklist

### ✅ Employee Data Flow
- [x] Add employee → Stored in Firestore ONLY
- [x] Firestore subscription triggered
- [x] Employee list in UI updates
- [x] Employee entry NOT in localStorage

### ✅ Page Refresh
- [x] localStorage kept (userRole, loginType, userProfile)
- [x] Employee data NOT loaded from localStorage
- [x] useEffect subscribes to Firestore
- [x] Fresh employee list fetched from Firestore
- [x] UI displays correct data

### ✅ Logout Behavior
- [x] Sign Out button clears localStorage
- [x] User redirected to login
- [x] Teams members NOT persisted
- [x] New login requires fresh authentication

### ✅ Record Sales Page
- [x] Connected to role filtering system
- [x] Shows items based on currentRole
- [x] Employees see filtered menu
- [x] Owner sees all items

---

## Test Scenario - Verify Behavior

### Step 1: Add Employee & Check localStorage
```javascript
// In browser console (F12)
1. Login as owner
2. Go to Team Management
3. Add employee: test@company.com
4. Check console:
   ✅ Should see: "Team member created" log from Firestore
5. Check localStorage:
   localStorage.getItem("userRole")    // "owner" ✓
   localStorage.getItem("loginType")   // "owner" ✓
   localStorage.getItem("teamMembers") // null ✓ (should be empty)
   localStorage.getItem("employees")   // null ✓ (should be empty)
```

### Step 2: Refresh Page & Check Data
```javascript
// Keep console open
1. Hard refresh: CTRL+SHIFT+R
2. Login still works (localStorage preserved)
3. Team Management loads
4. Console should show:
   ✅ "Team members loaded: 1 members"
5. Employee list displays (from Firestore subscription)
6. localStorage STILL has userRole/loginType (NOT employee data)
```

### Step 3: Logout & Check localStorage
```javascript
// In console
1. Click Sign Out
2. Wait for redirect to login
3. Check console shows:
   ✅ "Logged out - localStorage cleared"
4. Check localStorage:
   localStorage.getItem("userRole")    // null ✓
   localStorage.getItem("loginType")   // null ✓
   localStorage.getItem("userProfile") // null ✓
```

### Step 4: Employee Login & Check localStorage
```javascript
// In console
1. Login as employee: test@company.com / password
2. Console shows:
   ✅ "Employee logged in as [role]: test@company.com"
3. localStorage shows:
   localStorage.getItem("userRole")      // "accountant" ✓
   localStorage.getItem("loginType")     // "employee" ✓
   localStorage.getItem("employeeEmail") // "test@company.com" ✓
4. Hard refresh: CTRL+SHIFT+R
5. Still logged in as employee (localStorage preserved)
6. Sidebar shows filtered items (4 for accountant, etc.)
```

---

## Database Structure - What Gets Stored Where

### Firebase Authentication Collection
```
users/
├── owner@business.com (ONLY user in Auth)
│   └── uid: "...",
│       email: "owner@business.com",
│       passwordHash: "...(managed by Firebase)"
```

### Firestore: team_members Collection
```
team_members/
├── doc_001
│   ├── email: "accountant@test.com"      ✓ From Firestore
│   ├── role: "accountant"                ✓ From Firestore
│   ├── password: "testpass123"           ✓ From Firestore
│   ├── name: "Test Accountant"           ✓ From Firestore
│   ├── createdBy: "owner@business.com"   ✓ From Firestore
│   └── createdAt: "2026-02-23T..."       ✓ From Firestore
│
└── doc_002
    ├── email: "manager@test.com"
    └── ... (same structure)
```

### localStorage (After Owner Login)
```
PRESERVED ON REFRESH:
├── userRole: "owner"
├── loginType: "owner"
├── userProfile: {...}
└── (other app data like integrations settings)

NOT STORED:
└── teamMembers: null (fetched from Firestore instead)
```

### localStorage (After Employee Login)
```
PRESERVED ON REFRESH:
├── userRole: "accountant"
├── loginType: "employee"
├── employeeEmail: "accountant@test.com"
└── (other app data)

NOT STORED:
└── teamMembers: null (fetched from Firestore instead)
```

---

## Key Principles

**1. Single Source of Truth**
- Employee records → Firestore ONLY
- Authentication state → localStorage + Firestore
- UI state → Component state (not persisted)

**2. Real-time Sync**
- Firestore subscription on component mount
- Updates automatically when data changes
- Multiple users see changes instantly

**3. Session Persistence**
- Login credentials NOT stored (use Firebase Auth)
- Role/type markers stored for UX continuity
- Cleared on logout

**4. Scalability**
- Infinite employees supported (Firestore handles)
- No localStorage size limits hit
- Data centralized and always authoritative

---

## RecordSale Page Integration

RecordSale.tsx properly integrated with role system:

```typescript
const { currentRole } = useRole();

const menuItems = [
  { label: "Dashboard", feature: "dashboard_record" },
  { label: "Inventory", feature: "inventory_manager" },
  // ... other items
];

const filteredMenu = menuItems
  .filter(item => hasPermission(currentRole as any, item.feature));
```

**Result:**
- Accountant: See 4 items (no inventory)
- Manager: See 11 items (no tax/billing/team)
- Employee: See 9 items (inventory + sales focused)
- Owner: See all 14 items

---

## Summary

✅ **Correct Flow:**
1. Add employee → Firestore
2. Real-time sync → UI updates
3. Refresh → Firestore fetch (not localStorage)
4. Logout → localStorage cleared
5. RecordSale → Role-filtered display

❌ **Never:**
- Store employee records in localStorage
- Load employee list from localStorage on page load
- Keep employee data after logout
- Skip Firestore subscription

