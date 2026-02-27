# Employee Login Debug - "Invalid email or password"

## Current Issue
- Employee login failing with "Invalid email or password"
- Employee was added but authentication not working
- Need to verify employee is stored in Firestore correctly

---

## Step 1: Check Browser Console (CRITICAL)

### Action:
1. Open http://localhost:3002
2. Press **F12** to open Developer Tools
3. Click **Console** tab
4. **Keep console visible throughout**

---

## Step 2: Verify Employee Was Saved

### Action:
1. Go back to add employee (login as owner first)
2. Add another test employee: `test@gmail.com` / `test123test`
3. **While adding, watch browser console for logs**

### Expected Console Output (When Adding):
```
🔹 Adding team member: {
  email: "test@gmail.com",
  role: "accountant",
  ownerEmail: "owner@business.com"
}

✅ Team member added to Firestore: {
  id: "some-id-12345",
  email: "test@gmail.com",
  collection: "team_members"
}

✅ Team member creation result: {
  memberId: "some-id-12345",
  email: "test@gmail.com",
  role: "accountant"
}

✓ Employee added successfully: test@gmail.com (accountant)
```

### If You See Error Instead:
```
❌ Error adding employee: [ERROR MESSAGE]
```

**STOP** and share the error message

---

## Step 3: Verify in Firestore Console

### Action:
1. Open https://console.firebase.google.com
2. Select "ai business management" project
3. Go to **Firestore Database**
4. Click **team_members** collection
5. Look for document with `email: "test@gmail.com"`

### You Should See:
```
Document ID: (auto-generated)
├── email: "test@gmail.com"
├── role: "accountant"
├── password: "test123test"
├── name: "test"
├── createdBy: "owner@business.com"
└── createdAt: Timestamp(...)
```

### If Document NOT There:
- Employee wasn't saved to Firestore
- Go back to Step 2 and check for error
- Check Firestore permissions/rules

### If Document IS There:
- Continue to Step 4

---

## Step 4: Try Employee Login & Watch Console

### Action:
1. Logout from owner account
2. Try to login as employee:
   - Email: `test@gmail.com`
   - Password: `test123test`
3. **Watch console for authentication logs**

### Expected Console Output:
```
🔹 Login attempt: test@gmail.com

🔹 Not in Firebase Auth, checking employee Firestore collection...

🔹 Searching for employee: test@gmail.com in collection: team_members

🔹 Query result: {
  email: "test@gmail.com",
  found: true,
  documentsCount: 1
}

🔹 Employee found: {
  id: "some-id-12345",
  email: "test@gmail.com",
  role: "accountant",
  storedPassword: "test123test",
  providedPassword: "test123test",
  passwordMatch: true
}

✅ Employee authenticated successfully: test@gmail.com

✅ Employee logged in as accountant: test@gmail.com

✅ User logged in as: accountant
```

### If You See Different Logs:

**Error 1: Employee not found**
```
🔹 Query result: {
  found: false,
  documentsCount: 0
}

❌ Employee not found in Firestore: test@gmail.com
```
**Solution:** Employee not in Firestore. Go back to Step 2/3 and verify save

**Error 2: Password mismatch**
```
🔹 Employee found: {
  storedPassword: "test123test",
  providedPassword: "test",  ← DIFFERENT!
  passwordMatch: false
}

❌ Password mismatch for: test@gmail.com
```
**Solution:** You entered wrong password. Try again with exact password from when you added employee

**Error 3: Query failed**
```
❌ Error authenticating employee: [FIREBASE ERROR]
```
**Solution:** Firestore access issue. Check security rules

---

## Step 5: Common Mistakes & Fixes

| Mistake | Solution |
|---------|----------|
| Password entered wrong | Use exact password from when adding employee |
| Spaces in password | Passwords are case & space sensitive - no extra spaces |
| Typo in email | Email must match exactly (including @gmail.com) |
| Employee not saved | Check Firestore console - step 3 |
| Browser cached old data | Hard refresh: CTRL+SHIFT+R |
| Employee in Firebase Auth | Should NOT be in Auth (only in Firestore) |

---

## Step 6: Reset & Try Fresh

If still failing after steps 1-5:

### Action:
1. Take screenshot of console error
2. Hard refresh: **CTRL+SHIFT+R**
3. Logout completely
4. Clear localStorage in console:
   ```javascript
   localStorage.clear()
   ```
5. Try login again

---

## Information I Need From You

To help further, please provide:

1. **Screenshot of console logs** when:
   - Adding employee (step 2)
   - Trying to login (step 4)

2. **Firebase Console screenshot** showing:
   - team_members collection
   - Employee document with data

3. **Exact credentials you used:**
   - Email: ___________________
   - Password: ___________________
   - Role: ___________________

4. **Error message** shown on login:
   - (screenshot or copy-paste)

---

## Quick Checklist

Before contacting me, verify:

- [ ] Logged in as owner successfully (saw 14 menu items)
- [ ] Clicked "Add Employee" button
- [ ] Filled all form fields (email, password, confirm password, role)
- [ ] Saw success message "✓ Employee added successfully"
- [ ] Checked browser console during add (saw ✅ logs, not ❌ errors)
- [ ] Checked Firestore - employee document exists
- [ ] Hard refreshed browser (CTRL+SHIFT+R)
- [ ] Logged out properly (Sign Out button)
- [ ] Tried to login with EXACT email and password
- [ ] Watched console during login attempt

If all ✓, but still failing → Share console screenshots

---

## Test with Pre-made Credentials

**If confused about what to use, try this:**

Add Employee:
```
Email: john@test.com
Password: john12345
Confirm: john12345
Role: Accountant
```

Then login:
```
Email: john@test.com
Password: john12345  (must be EXACT)
```

Watch console for success or specific error

---

## What Happens After Successful Employee Login

Once employee successfully logs in:
1. Redirects to Dashboard
2. Shows employee role (e.g., "Accountant")
3. Sidebar shows only permitted items (4 for Accountant)
4. Can navigate to assigned pages only
5. Sees filtered content based on role

If you get past login error, you should see this ✓

