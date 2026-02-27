# Debugging Guide - Employee Not Being Saved

## Current Issue
- Employee not appearing in Firestore
- Login failing with "Invalid email or password"

---

## Step 1: Check Browser Console (F12)

When you **Add Employee**, open browser console (F12) and look for these logs:

### Expected Logs When Adding Employee:
```
🔹 Adding team member: {
  email: "accountant@gmail.com",
  role: "accountant",
  ownerEmail: "owner@business.com"
}

✅ Team member added to Firestore: {
  id: "some-document-id",
  email: "accountant@gmail.com",
  collection: "team_members"
}

✅ Team member creation result: {
  memberId: "some-document-id",
  email: "accountant@gmail.com",
  role: "accountant"
}
```

### If You See Error Instead:
```
❌ Error adding employee: [ERROR MESSAGE]
```

Please **copy the full error message** and share it with me.

---

## Step 2: Verify Owner is Logged In

Before adding employee, check:
1. Browser console should show: `✅ Owner logged in: owner@business.com`
2. TopBar should show role as "Owner"
3. Sidebar should show 14 menu items

If owner is NOT logged in:
- Go back to login
- Login as owner: `owner@business.com` / `owner123`
- Verify you see success message

---

## Step 3: Check Firebase Console

1. Go to: https://console.firebase.google.com
2. Select your project: "ai business management"
3. Go to **Firestore Database**
4. Look for **team_members** collection
5. Check if document exists with employee email

### If team_members collection doesn't exist:
The collection will be created automatically when first document is added. If it's not showing:
- Firestore write permission issue (check security rules)
- Database not properly initialized

---

## Step 4: Full Test With Console Logs

Follow these exact steps and watch console:

### Step A: Clear & Refresh
```javascript
// In browser console (F12), type:
localStorage.clear()
// Then press CTRL+SHIFT+R (hard refresh)
```

### Step B: Login as Owner
1. Email: `owner@business.com`
2. Password: `owner123`
3. Click **Continue**
4. Watch console for: `✅ Owner logged in: owner@business.com`

### Step C: Go to Team Management
1. Click **Team Management** in sidebar
2. Wait for page to load completely
3. Verify you see employee stats and form

### Step D: Add Employee (Watch Console!)
1. Click **Add Employee** button
2. Fill form:
   - Email: `testaccount@gmail.com`
   - Password: `testpass123` (must be 6+ characters)
   - Confirm: `testpass123`
   - Role: Select **Accountant**
3. Click **Add Employee** button
4. **Keep browser console visible**
5. Watch for logs (should show 3 lines above)
6. If error appears, screenshot and share

### Step E: Check Firestore
1. Open https://console.firebase.google.com in NEW TAB
2. Go to Firestore Database
3. Look for **team_members** collection
4. Check if `testaccount@gmail.com` is there

### Step F: Try Employee Login
1. Logout from owner
2. Login as employee:
   - Email: `testaccount@gmail.com`
   - Password: `testpass123`
3. Watch console for logs showing employee authentication

---

## Common Issues & Fixes

### Issue 1: "❌ Error adding team member: Permission denied"
**Cause:** Firestore security rules blocking writes
**Fix:** 
- Check Firestore Rules tab
- Verify test mode allows writes
- Or ensure `createdBy` equals authenticated user

### Issue 2: "❌ Error adding team member: Cannot read property 'email' of undefined"
**Cause:** `user?.email` is undefined (owner not properly logged in)
**Fix:**
- Logout and login again as owner
- Check TopBar shows "Owner"
- Verify `user` object has email

### Issue 3: "❌ Employee not found in Firestore"
**Cause:** Employee wasn't saved (Step D failed silently)
**Fix:**
- Check Step D logs in console
- If no save logs appeared, check D error
- Verify collection name in Firestore is `team_members`

### Issue 4: "❌ Password mismatch"
**Cause:** Stored password doesn't match entered password
**Fix:**
- Check both passwords are exactly same (case-sensitive)
- No extra spaces
- Use simple password for testing: `test123`

---

## Firestore Collection Structure

After successful employee add, you should see in Firestore:

```
Database: database (default)
├── team_members collection
   └── Document: (auto-id)
       ├── email: "testaccount@gmail.com"
       ├── role: "accountant"
       ├── password: "testpass123"
       ├── name: "testaccount"
       ├── createdBy: "owner@business.com"
       └── createdAt: "2026-02-23T..."
```

---

## Test Credentials to Use

```
Owner Account (in Firebase Auth):
├── Email: owner@business.com
└── Password: owner123

Test Employee (should be in Firestore only):
├── Email: testaccount@gmail.com
├── Password: testpass123
└── Role: accountant
```

---

## Next Steps

1. **Open browser console** (F12)
2. **Clear localStorage** and refresh
3. **Login as owner**
4. **Go to Team Management**
5. **Add test employee** (watch console for logs)
6. **Take screenshot** of any error logs
7. **Check Firestore** if collection appears
8. **Share console output** with me if add fails

---

## Console Log Checklist

When adding employee, you should see ALL of these in console:

- [ ] `🔹 Adding team member: {...}`
- [ ] `🔹 Adding team member: {...}` (from teamStorage.ts)
- [ ] `✅ Team member added to Firestore: {...}`
- [ ] `✓ Employee added successfully: ...`

If any of these is MISSING, check the error that appeared instead.

---

## Don't See Console Logs?

If browser console is empty:
1. Make sure F12 opens **Console** tab (not Elements, Network, etc.)
2. Hard refresh: CTRL+SHIFT+R (not just F5)
3. Try action again
4. Check for red "X" errors in console
5. Share screenshot of console

