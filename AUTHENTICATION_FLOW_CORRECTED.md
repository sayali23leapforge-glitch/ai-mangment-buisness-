# Correct Authentication Flow - Owner vs Employees

## Architecture Overview

**Database Structure (Corrected)**

```
Firebase Authentication:
├── owner@business.com (ONLY owner)
└── (NO employee accounts in Auth)

Firestore Database:
├── team_members collection (ONLY employees, NOT in Auth)
│   ├── email: "john@test.com"
│   ├── role: "accountant"
│   ├── password: "password123"
│   ├── name: "John Accountant"
│   ├── createdBy: "owner@business.com"
│   └── createdAt: "2026-02-23T..."
```

---

## Key Changes Made

### 1. **TeamManagement.tsx** - Remove Firebase Auth Creation
**Before:**
```tsx
const userCredential = await createUserWithEmailAndPassword(auth, email, password);
```

**After:**
```tsx
// Employees are stored ONLY in Firestore, NOT in Firebase Auth
const memberId = await addTeamMember({
  email,
  role: systemRole,
  password,
  name: email.split("@")[0],
  createdBy: user?.email || "admin"
});
```

**Result:** Employees no longer created in Firebase Auth. Only stored in team_members collection.

---

### 2. **teamStorage.ts** - Add Custom Employee Authentication
**New Function:** `authenticateEmployee(email, password)`

```typescript
export async function authenticateEmployee(email: string, password: string): Promise<TeamMember | null> {
  // Query team_members collection for employee by email
  // Compare password (plain text for now, use hashing in production)
  // Return employee if authenticated
}
```

**Purpose:** Authenticate employees against Firestore collection instead of Firebase Auth

---

### 3. **Login.tsx** - Dual Authentication Flow
**New Login Logic:**

```typescript
// Step 1: Try Firebase Auth (Owner)
try {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  userRole = "owner";
  localStorage.setItem("loginType", "owner");
} catch (authError) {
  // Step 2: Try Employee Authentication (Firestore)
  const employee = await authenticateEmployee(email, password);
  if (employee) {
    userRole = employee.role;
    localStorage.setItem("loginType", "employee");
    localStorage.setItem("employeeEmail", email);
  }
}
```

**Result:** Login now supports both owner (Firebase Auth) and employees (Firestore)

---

### 4. **AuthContext.tsx** - Support Employee Pseudo-User
**New Logic:**

```typescript
if (currentUser) {
  // Owner (in Firebase Auth)
  setUser(currentUser);
} else if (loginType === "employee" && employeeEmail) {
  // Employee (NOT in Firebase Auth, create pseudo user)
  const pseudoUser = {
    uid: `employee-${employeeEmail}`,
    email: employeeEmail,
    ...
  };
  setUser(pseudoUser);
}
```

**Result:** Employees can access the app even though they're not in Firebase Auth

---

### 5. **RoleContext.tsx** - Handle Both Login Types
**New Logic:**

```typescript
const loginType = localStorage.getItem("loginType");
const employeeEmail = localStorage.getItem("employeeEmail");

if (storedRole) {
  // Load from localStorage (works for both owner and employee)
  setOriginalRole(storedRole);
} else if (loginType === "employee" && employeeEmail) {
  // Employee logged in, use stored role
  setOriginalRole(storedRole as UserRole);
}
```

**Result:** Both owners and employees get their roles loaded correctly

---

## Complete Authentication Flow

### **Owner Registration & Login**
```
1. Owner has email (owner@business.com) in Firebase Authentication ONLY
2. Owner adds business info in settings
3. Owner profile stored in userProfile localStorage
4. Owner can add employees from TeamManagement page
```

### **Employee Creation by Owner**
```
1. Owner clicks "Add Employee"
2. Owner fills in:
   - Name: John Accountant
   - Email: john@test.com
   - Password: password123
   - Role: Accountant
3. Employee is stored ONLY in Firestore:
   - team_members collection
   - NOT in Firebase Authentication
```

### **Employee Login**
```
1. Employee opens app and goes to login
2. Enters email: john@test.com and password: password123
3. Login tries Firebase Auth first → FAILS (employee not in Auth)
4. Login tries authenticateEmployee() → SUCCEEDS (found in Firestore)
5. Employee role loaded: "accountant"
6. localStorage stores:
   - userRole: "accountant"
   - loginType: "employee"
   - employeeEmail: "john@test.com"
7. Employee redirected to Dashboard
8. RoleContext loads "accountant" role
9. Employee sees ONLY accountant screens (4 items)
```

### **Owner Profile Stays As Owner**
```
1. Owner is the ONLY user in Firebase Auth
2. Owner's email (owner@business.com) is NOT in team_members collection
3. Only employees are in team_members collection
4. Owner profile is preserved in localStorage
5. Owner can still switch roles using Switch Role dropdown
```

---

## Firebase Collections Structure

### **team_members Collection**
```
Document: john_accountant
├── email: "john@test.com"
├── role: "accountant"
├── password: "password123" ⚠️ TODO: Hash this!
├── name: "John Accountant"
├── createdBy: "owner@business.com"
└── createdAt: "2026-02-23T16:16:17.UTC+5:30"

Document: alice_manager
├── email: "alice@test.com"
├── role: "manager"
├── password: "password123"
├── name: "Alice Manager"
├── createdBy: "owner@business.com"
└── createdAt: "2026-02-23T..."
```

### **userProfile Collection** (Owner Only)
```
Document: owner_profile
├── email: "owner@business.com"
├── role: "owner"
├── businessName: "Golden Goods Inc."
├── businessType: "retail"
└── createdAt: "2026-02-20T..."
```

---

## Testing the Correct Flow

### **Test 1: Owner Login**
1. Login: `owner@business.com` / `owner123`
2. ✅ Verify: Dashboard shows 14 menu items
3. ✅ Verify: TopBar shows "Owner"
4. ✅ Verify: No owner email in Team Management employee list

### **Test 2: Add Employee**
1. Go to Team Management
2. Add Employee: `john@test.com`, password: `password123`, role: `Accountant`
3. ✅ Verify: Employee appears in table (real-time)
4. ✅ Verify: Employee is in Firestore team_members collection
5. ✅ Verify: Employee is NOT in Firebase Authentication

### **Test 3: Employee Login**
1. Logout
2. Login: `john@test.com` / `password123`
3. ✅ Console shows: `✅ Employee authenticated: john@test.com`
4. ✅ Console shows: `✅ Employee logged in as accountant: john@test.com`
5. ✅ Dashboard shows only 4 items (not 14, not as owner)
6. ✅ TopBar shows current role as "accountant"

### **Test 4: Multiple Employees**
1. Login as owner
2. Add 3 employees:
   - john@test.com (accountant)
   - alice@test.com (manager)
   - bob@test.com (employee)
3. Each employee:
   - Logout
   - Login with their credentials
   - Verify correct role filtering
   - Verify correct menu items shown

---

## Authentication Flow Diagram

```
┌─────────────────────┐
│    Login Form       │
└──────────┬──────────┘
           │ (Email + Password)
           ▼
┌─────────────────────────────────────┐
│  Try Firebase Auth (Owner)          │
│  signInWithEmailAndPassword()        │
└───────────┬───────────────┬──────────┘
            │ SUCCESS       │ FAIL
            ▼               ▼
        Owner              ┌──────────────────────────────┐
        Logged In          │ Try Employee Auth            │
                           │ authenticateEmployee()       │
                           └───────────┬──────────┬───────┘
                                       │ FOUND    │ NOT FOUND
                                       ▼          ▼
                                   Employee   Show Error
                                   Logged In
│
│ Both paths:
▼
Store in localStorage:
├── userRole: "owner" or "accountant" or "manager" or "employee"
├── loginType: "owner" or "employee"
└── employeeEmail: (only for employees)
│
│ Load by:
├── AuthContext: Creates user object (real or pseudo)
├── RoleContext: Sets role from localStorage
└── Dashboard: Shows filtered menu items
```

---

## Key Security Notes

⚠️ **Important TODO Items for Production:**

1. **Password Hashing**
   - Currently passwords are stored plain text in Firestore
   - Should use bcrypt or similar hashing algorithm
   - Modify `authenticateEmployee()` to hash and compare

2. **Firestore Rules**
   - Secure team_members collection access
   - Only owner can read/write team members
   - Employees can only read their own record

3. **Session Management**
   - Current: Uses localStorage (can be cleared by user)
   - Better: Use secure HTTP-only cookies
   - Add session expiration tokens

4. **Frontend Security**
   - Don't send passwords in frontend logs
   - Clear sensitive data on logout
   - Implement rate limiting on login attempts

---

## Files Modified

1. **src/pages/TeamManagement.tsx**
   - Removed: `createUserWithEmailAndPassword` import and call
   - Result: Employees only stored in Firestore, not Firebase Auth

2. **src/pages/Login.tsx**
   - Added: Dual authentication (Firebase Auth + Firestore)
   - Added: `authenticateEmployee` import and call
   - Result: Owner and employees can both login

3. **src/utils/teamStorage.ts**
   - Added: `authenticateEmployee(email, password)` function
   - Result: Custom employee authentication against Firestore

4. **src/context/AuthContext.tsx**
   - Added: Pseudo user creation for employees
   - Result: Employees have user object even though not in Firebase Auth

5. **src/context/RoleContext.tsx**
   - Updated: Support both loginType "owner" and "employee"
   - Result: Both owner and employee roles load correctly

---

## Verification Checklist

- [ ] Owner account created in Firebase Authentication
- [ ] Owner can add employees (stored in team_members collection)
- [ ] Employees NOT created in Firebase Authentication
- [ ] Owner remains as "Owner" throughout
- [ ] Owner profile NOT in team_members collection
- [ ] Employee can login with email/password
- [ ] Employee gets correct role from Firestore
- [ ] Employee sees filtered menu items by role
- [ ] Console shows correct logs for role loading
- [ ] No password authentication errors
- [ ] Team members display in real-time list
- [ ] Delete employee button works
