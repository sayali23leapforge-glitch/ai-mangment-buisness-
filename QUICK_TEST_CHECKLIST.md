# Quick Test Checklist - Correct Authentication Flow

**Status**: App running at http://localhost:3002

---

## Test 1: Owner Remains Owner (NOT Employee)

### Action:
1. Open browser console (F12)
2. Clear localStorage: `localStorage.clear()`
3. Refresh page
4. Login: `owner@business.com` / `owner123`

### Expected Results:
- ✅ Dashboard loads
- ✅ Sidebar shows 14 menu items
- ✅ TopBar shows role as **"Owner"**
- ✅ Console shows: `✅ Owner logged in: owner@business.com`
- ✅ NO console errors about undefined roles

### If Failed:
- Check console for error messages
- Verify loginType in localStorage is "owner" (also run in console: `localStorage.getItem("loginType")`)

---

## Test 2: Add Employee (Stored ONLY in Firestore)

### Action:
1. Owner logged in
2. Click "Team Management"
3. Click "Add Employee" button
4. Fill form:
   - Email: `testaccount@company.com`
   - Password: `testpass123`
   - Name: `Test Accountant` (shows email by default)
   - Role: **Accountant** (most restrictive for testing)
5. Click "Add Employee"

### Expected Results:
- ✅ Success message: "✓ Employee added successfully" or similar
- ✅ Employee appears in Team Members table below
- ✅ Stats update: "Total Members: 1", "Accountants: 1"
- ✅ Console shows: `✅ Team member added: [id]`
- ✅ Console shows: `✅ Team members loaded: 1 members`

### If Failed:
- Check Firestore Console to see if record appeared in team_members collection
- Verify password meets requirements (6+ characters)
- Check browser console for error messages

---

## Test 3: Verify Employee NOT in Firebase Auth

### Action:
1. Open Firebase Console: https://console.firebase.google.com
2. Go to Authentication tab
3. Look for list of users

### Expected Results:
- ✅ See ONLY `owner@business.com` in Firebase Authentication
- ✅ DO NOT see `testaccount@company.com` in Auth users list
- ✅ See `testaccount@company.com` in Firestore > team_members collection

### If Failed:
- Check console logs for which collection data was stored
- Verify the employee is truly not in Firebase Auth tab

---

## Test 4: Employee Login (Firestore Authentication)

### Action:
1. Logout (click profile → Sign Out)
2. Browser should return to login page
3. Login as **Employee**:
   - Email: `testaccount@company.com`
   - Password: `testpass123`
4. Click "Sign In"

### Expected Results:
- ✅ Console shows: `Not an owner account, checking employee database...`
- ✅ Console shows: `✅ Employee authenticated: testaccount@company.com`
- ✅ Console shows: `✅ Employee logged in as accountant: testaccount@company.com`
- ✅ Dashboard loads successfully
- ✅ Sidebar shows ONLY 4 items (for Accountant role):
  1. Dashboard
  2. Financial Reports
  3. Tax Center
  4. Billing Plan
- ✅ TopBar shows role as **"Accountant"** (NOT "Owner")
- ✅ localStorage shows: `userRole = "accountant"` and `loginType = "employee"`

### If Failed (Employee not authenticated):
- Check console for: `Invalid email or password`
- Verify correct email and password are used
- Check Firestore that employee exists in team_members collection

### If Failed (Employee sees 14 items):
- RoleContext not loading employee role
- Check console for role loading logs
- Verify RoleContext is executing properly
- Try hard refresh: CTRL+SHIFT+R

### If Failed (Employee sees wrong role):
- Check Firestore to verify stored role matches ("accountant", "manager", "employee")
- Role strings must be lowercase

---

## Test 5: Employee Pages are Filtered

### Action (Accountant should see 4 items):
1. Employee logged in (see Test 4)
2. Click **Financial Reports** in sidebar
   - Expected: Page loads with filtered content
3. Click **Dashboard**
   - Expected: Menu items filtered (not all 14)
4. Click **Tax Center**
   - Expected: Page loads
5. Try clicking **Inventory Manager** (should NOT exist in sidebar)
   - Expected: Item not visible, not clickable

### Expected Results:
- ✅ All 4 allowed pages load correctly
- ✅ Cursor never shows "disabled" state (items just aren't visible)
- ✅ No 404 errors when navigating pages
- ✅ Menu items count stays at exactly 4 in sidebar

### If Failed:
- Check browser console for errors
- Verify RBAC filter logic in each page
- Check currentRole value: `console.log(currentRole)` in dev tools

---

## Test 6: Owner Remains Owner (Profile Not Overwritten)

### Action:
1. Employee still logged in from Test 4-5
2. Logout
3. Login as **Owner** again:
   - Email: `owner@business.com`
   - Password: `owner123`

### Expected Results:
- ✅ Dashboard loads
- ✅ Sidebar shows 14 menu items (all features)
- ✅ TopBar shows role as **"Owner"** (NOT "Accountant")
- ✅ Team Management shows added employee in list
- ✅ Console shows: `✅ Owner logged in: owner@business.com`

### If Failed:
- Owner stuck with "Accountant" role
- Owner localStorage corrupted during employee login
- Check: `localStorage.clear()` and login again

---

## Test 7: Add Multiple Employees (Different Roles)

### Action (Owner logged in):
1. Team Management
2. Add Employee 2:
   - Email: `manager@company.com`
   - Password: `managerpass123`
   - Role: **Manager**
3. Add Employee 3:
   - Email: `employee@company.com`
   - Password: `employeepass123`
   - Role: **Employee**

### Expected Results:
- ✅ Stats update: "Total Members: 3", "Accountants: 1", "Managers: 1", "Employees: 1"
- ✅ All 3 employees visible in table

### After testing each employee login:
- Manager login should show **11 items**
- Employee login should show **9 items**
- Accountant login should show **4 items**

---

## Test 8: Delete Employee

### Action:
1. Owner logged in
2. Go to Team Management
3. Find employee `testaccount@company.com` in table
4. Click **Delete** button (trash icon)
5. Click **OK** on confirmation

### Expected Results:
- ✅ Success message appears
- ✅ Employee row disappears from table
- ✅ Stats update: "Total Members: 2"
- ✅ Console shows employee deletion logs

### Verification:
- Check Firestore: Employee record should be gone from team_members

---

## Browser Console Expected Log Messages

### Owner Login:
```
✅ Owner logged in: owner@business.com
✅ User logged in as: owner
```

### Employee Login:
```
Not an owner account, checking employee database...
✅ Employee authenticated: testaccount@company.com
✅ Employee logged in as accountant: testaccount@company.com
✅ User logged in as: accountant
```

### Team Member Added:
```
✅ Team member added: [document-id]
✅ Team members loaded: 1 members
```

### Role Context Loading:
```
✅ Role loaded from localStorage: owner
✅ Role loaded from localStorage: accountant
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Employee sees 14 items | Role not loading from Firestore | Hard refresh (CTRL+SHIFT+R), check localStorage |
| "Invalid email or password" | Employee not in Firestore | Check team_members collection in Firestore |
| Owner shows as "Accountant" | localStorage corrupted | `localStorage.clear()` and login again |
| Employee list empty | Subscription not working | Check browser console for errors, refresh page |
| Password eye toggle doesn't work | Lucide React import issue | Check imports of Eye/EyeOff icons |
| Can't add employee | Role dropdown not working | Verify role value is being selected |

---

## Final Verification

Once all tests pass:

- [ ] Owner in Firebase Auth ONLY
- [ ] Employees in Firestore ONLY (NOT in Auth)
- [ ] Owner always shows as "Owner"
- [ ] Employees login with Firestore authentication
- [ ] Employees see filtered screens by role
- [ ] Role loading logs show correct messages
- [ ] No console errors about undefined roles
- [ ] Team members display in real-time list
- [ ] Delete functionality works
- [ ] Multiple roles can login separately

**Status**: ✅ Ready for production once password hashing is added!
