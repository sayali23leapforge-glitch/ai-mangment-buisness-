# Team Management Complete Flow Testing Guide

**Status**: Team member display and role-based filtering is now fully implemented on all 14 pages.

## Test Environment Setup
- **Server URL**: http://localhost:3002
- **Node Command**: `npm run dev` (currently running)
- **Browser**: Open Developer Console (F12) to watch for errors
- **Clear Cache**: Press CTRL+SHIFT+Delete if you see stale data

---

## Test Scenario 1: Add Employee and Display in List

### Step 1: Login as Owner
1. Go to http://localhost:3002
2. **Email**: owner@business.com
3. **Password**: owner123
4. Click **Sign In**
5. ✅ Verify: Dashboard loads with full sidebar menu (14 items showing)

### Step 2: Navigate to Team Management
1. Click **Team Management** in sidebar
2. ✅ Verify: You see stats section with "Total Members: 0" or "1" (if existing)
3. ✅ Verify: See "Add Employee" button
4. ✅ Verify: Message says "No team members yet. Add your first employee to get started!"

### Step 3: Add First Employee
1. Click **"Add Employee"** button
2. Fill in the form:
   - **Name**: John Accountant
   - **Email**: john@test.com
   - **Password**: password123
   - **Confirm Password**: password123  
   - **Role**: Accountant
3. ✅ Click password eye icon - verify password visibility toggles ✅
4. Click **"Add Employee"** button
5. ✅ Verify: Success message appears "✓ Employee added successfully"

### Step 4: Verify Employee Appears in List
1. Wait 2-3 seconds for Firestore sync
2. Look at **Team Members** table below
3. ✅ Verify: New table appears with John's details:
   - **Name**: John Accountant
   - **Email**: john@test.com
   - **Role**: Accountant (blue badge)
   - **Added Date**: Today's date
   - **Actions**: Delete button (trash icon)
4. ✅ Verify: Stats update to "Total Members: 1" and "Accountants: 1"

### Step 5: Add More Employees (Different Roles)
Repeat Step 3 with:
- **Employee 2**: 
  - Name: Alice Manager
  - Email: alice@test.com
  - Password: password123
  - Role: Manager
  
- **Employee 3**:
  - Name: Bob Employee
  - Email: bob@test.com
  - Password: password123
  - Role: Employee

### Step 6: Verify All Employees Display
✅ Verify: All 3 employees show in the table with correct roles
✅ Verify: Stats show: "Total Members: 3", "Accountants: 1", "Managers: 1", "Employees: 1"
✅ Verify: Search bar works - type "alice" and see only Alice's row

---

## Test Scenario 2: Owner Profile Persistence

### Step 1: Check Owner Profile
1. While on Dashboard, check TopBar
2. ✅ Verify: Your profile shows role as **"Owner"** (not overwritten to something else)
3. ✅ Verify: You can still access ALL 14 features in sidebar

### Step 2: Switch Between Pages
1. Click different menu items: Financial Reports → Dashboard → Inventory Manager
2. ✅ Verify: All pages load correctly
3. ✅ Verify: TopBar still shows **"Owner"** role throughout

### Step 3: Verify No Owner in Employee List
1. Go back to Team Management
2. Look at Team Members table
3. ✅ Verify: Your profile (owner@business.com) does NOT appear in the list
4. ✅ Verify: Only the 3 added employees show (John, Alice, Bob)

---

## Test Scenario 3: Employee Login and Role-Based Filtering

### Step 1: Logout from Owner Account
1. Click your profile icon in TopBar (top right)
2. Click **"Sign Out"**
3. ✅ Verify: Redirected to login page

### Step 2: Login as Accountant (John)
1. **Email**: john@test.com
2. **Password**: password123
3. Click **Sign In**
4. ✅ Verify: Login succeeds, Dashboard loads
5. ⏳ Wait 2-3 seconds for RoleContext to load role from Firestore

### Step 3: Verify Accountant Sees Only 4 Items
1. Look at the **Sidebar menu**
2. ✅ Count menu items - should show exactly **4 items**:
   - Dashboard
   - Financial Reports
   - Tax Center (or similar tax feature)
   - Billing Plan
3. ✅ Verify: Other items like "Inventory Manager", "Add Product", "AI Insights" etc. are HIDDEN
4. Check **Browser Console** (F12):
   - ✅ Should see: "RoleContext: Loaded role from Firestore: accountant"
   - Should NOT see errors about "currentRole is undefined"

### Step 4: Navigate Accountant Pages
1. Click on **Financial Reports**
2. ✅ Verify: Page loads and items are filtered (if has submenu, count items)
3. Click on **Tax Center**
4. ✅ Verify: Page loads correctly
5. Try clicking **Dashboard**
6. ✅ Verify: Dashboard menu is filtered appropriately

### Step 5: Logout Accountant, Login as Manager (Alice)
1. Click profile → **Sign Out**
2. **Email**: alice@test.com
3. **Password**: password123
4. Click **Sign In**
5. ⏳ Wait for RoleContext to load
6. ✅ Count sidebar items - should show **11 items** (most features except tax_center, team_management, billing)
7. Check console: "RoleContext: Loaded role from Firestore: manager"

### Step 6: Login as Employee (Bob)
1. Logout
2. **Email**: bob@test.com
3. **Password**: password123
4. Click **Sign In**
5. ⏳ Wait for RoleContext to load
6. ✅ Count sidebar items - should show **9 items** (inventory, sales focused features)
7. Check console: "RoleContext: Loaded role from Firestore: employee"

---

## Test Scenario 4: Delete Employee

### Step 1: Login as Owner
1. Sign out as employee (Bob)
2. Login as owner@business.com / owner123
3. Go to **Team Management**

### Step 2: Delete an Employee
1. In Team Members table, find Alice (Manager)
2. Click the **Delete** (trash) button in her row
3. ✅ Verify: Confirmation dialog appears: "Are you sure you want to permanently delete this team member?"
4. Click **OK** to confirm
5. ✅ Verify: Success message shows "✓ Team member deleted successfully"

### Step 3: Verify Deletion
1. Wait 2-3 seconds
2. ✅ Verify: Alice's row disappears from table
3. ✅ Verify: Stats update to "Total Members: 2", "Managers: 0"
4. ✅ Verify: Search for "alice" - shows "No matching team members found"

---

## Expected Results Summary

### ✅ PASS Criteria
- [ ] Owner can add employees with email, password, name, role
- [ ] Added employees appear in Team Members table immediately (real-time)
- [ ] Owner profile stays as "Owner" and is NOT in employee list
- [ ] Stats count employees by role correctly
- [ ] Accountant logs in → sees 4 menu items only
- [ ] Manager logs in → sees 11 menu items only
- [ ] Employee logs in → sees 9 menu items only
- [ ] Owner logs in → sees all 14 menu items
- [ ] Delete button removes employee from list and Firestore
- [ ] Role correctly loads from Firestore on employee login (check console)
- [ ] No console errors about "currentRole is undefined"

### ❌ FAIL Criteria (and fixes)
- **Owner appears in employee list**: Check if owner email is incorrectly added to Firestore
- **Employee sees all 14 items**: RoleContext not loading Firestore role - check console for errors
- **Members list is empty**: Subscription not working - check that teamMembers state updates
- **Delete button does nothing**: deleteTeamMember import missing - check imports
- **Stats show wrong numbers**: Filter logic incorrect - verify role strings match (lowercase)

---

## Browser Console Debugging

Press **F12** to open Developer Console and watch for:

### Expected Console Logs
```
✅ Team member added: [id]
✅ Team members loaded: 3 members
RoleContext: Loaded role from Firestore: accountant
```

### Error Signs (to investigate)
```
❌ currentRole is undefined - RoleContext not initialized
❌ Error fetching team member - Firestore query failed
❌ subscribeToTeamMembers is not a function - Import missing
TypeError: Cannot read property 'map' - teamMembers state not set
```

---

## Common Issues and Fixes

### Issue: Team members don't appear in list
**Fix**: 
1. Check rightbar shows "Active" subscription
2. Refresh page (CTRL+R)
3. Check Firestore directly in Firebase Console

### Issue: Employee sees all 14 menu items
**Fix**:
1. Check console for RoleContext logs
2. Verify role string in Firestore matches: "accountant", "manager", "employee" (lowercase)
3. Clear localStorage: `localStorage.clear()` then re-login

### Issue: Delete button does nothing
**Fix**:
1. Check browser console for errors
2. Verify deleteTeamMember is imported in TeamManagement.tsx
3. Inspect Network tab to see delete API call

---

## Next Steps After Testing

If all tests ✅ PASS:
1. ✅ Employee management system is complete
2. ✅ RBAC is working across all pages
3. ✅ Real-time Firestore sync is functional

If issues found:
1. Describe the exact failure
2. Check console logs provided above
3. Let me know specific page/step that failed
