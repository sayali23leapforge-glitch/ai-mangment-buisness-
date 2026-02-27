​# LOCAL BILLING & PLAN TESTING - COMPLETE GUIDE

## 🎯 WHAT WE'LL DO

Test your **complete Stripe billing flow** locally:

1. ✅ Firebase Emulator (local Firestore)
2. ✅ Vite Dev Server (your app at localhost:5173)
3. ✅ Local Stripe Server (payment handling at localhost:3001)
4. ✅ Test payment with Stripe test card
5. ✅ Verify Firestore updates

---

## 📋 PREREQUISITES

Make sure you have installed:

```bash
npm install stripe express cors
```

If not, run in your project root:

```powershell
npm install
```

---

## 🚀 LOCAL TESTING STEPS

### **TERMINAL 1: Start Firebase Emulator**

```powershell
cd c:\Users\sayal\Desktop\ai-buisness-managment-main\ai-buisness-managment-main

firebase emulators:start
```

**Wait for:**
```
✔  All emulators started, it is now safe to connect to them.
```

**DO NOT CLOSE THIS TERMINAL**

---

### **TERMINAL 2: Start Local Stripe Server**

```powershell
cd c:\Users\sayal\Desktop\ai-buisness-managment-main\ai-buisness-managment-main

node server/stripe-local.js
```

**You should see:**
```
✅ Local Stripe Server Running
📍 URL: http://localhost:3001
```

**DO NOT CLOSE THIS TERMINAL**

---

### **TERMINAL 3: Start Vite Dev Server**

```powershell
cd c:\Users\sayal\Desktop\ai-buisness-managment-main\ai-buisness-managment-main

npm run dev
```

**You should see:**
```
VITE v5.0.8  ready in XXX ms

➜  Local:   http://localhost:5173/
```

---

## 🎮 TEST YOUR BILLING FLOW

### **Step 1: Open Your App**

Open browser: http://localhost:5173

---

### **Step 2: Login**

1. Click "Login"
2. Enter your **team member credentials** (not owner account)
3. Click "Sign in"

**If you don't have a team member account:**
- Ask team admin to add you
- Or create one via Team Management page

---

### **Step 3: Go to Billing Page**

1. Click **"Settings"** or **"Billing & Plans"** menu
2. You should see:
   - **Free** (current plan)
   - **Growth** $19/mo
   - **Pro** $39/mo

---

### **Step 4: Click "Upgrade to Growth"**

1. Click **"Upgrade to Growth"** button
2. **Stripe Checkout** should open in new window
3. If it doesn't:
   - Check browser console (F12 → Console)
   - Look for errors

---

### **Step 5: Complete Test Payment**

**Fill in the Stripe form:**

```
Card Number:  4242 4242 4242 4242
Expiry:       12/25 (any future date)
CVC:          123 (any 3 digits)
Name:         Test User
```

Click **"Pay"**

---

### **Step 6: Verify Payment Succeeded**

**You should see:**

1. ✅ "Payment succeeded" message
2. ✅ Redirect back to your app
3. ✅ Billing page shows plan updated to "**Growth**"

**Check Terminal 1 (Firebase Emulator):**
- Should see Firestore being updated

**Check Terminal 2 (Local Stripe Server):**
- Should see logs like:
  ```
  ✅ Creating checkout session
  ✅ Checkout session created
  📥 Webhook Event: checkout.session.completed
  ```

---

## ✅ TESTING CHECKLIST

After completing the payment flow, verify:

- [ ] All 3 terminals running
- [ ] App opens at http://localhost:5173
- [ ] Can login with team member
- [ ] Billing page shows all 3 plans
- [ ] Can click "Upgrade" button
- [ ] Stripe checkout opens
- [ ] Can fill and complete payment
- [ ] Payment shows success message
- [ ] Plan updated to "Growth"
- [ ] No errors in console

---

## 🔍 DEBUGGING

### **"Stripe checkout won't open"**

**Check:**
1. Open browser console: F12 → Console
2. Look for red error messages
3. Check if Local Stripe Server is running (Terminal 2)
4. Verify Stripe key in `server/stripe-local.js`

---

### **"Payment completes but plan doesn't update"**

**Check:**
1. Look at Terminal 1 (Firebase Emulator logs)
2. Check Firestore Database tab in Firebase Console
3. Verify rule published correctly

---

### **"Port 3001 already in use"**

**Solution:** Change port in `server/stripe-local.js`:
```javascript
const PORT = 3002; // Change to 3002
```

Then update your code to point to new port.

---

## 📊 WHAT EACH TERMINAL DOES

```
Terminal 1: firebase emulators:start
├─ Runs Firestore emulator
├─ Stores data locally (no cloud)
└─ Logs all database changes

Terminal 2: node server/stripe-local.js
├─ Handles checkout sessions
├─ Receives webhook events
└─ Shows payment logs

Terminal 3: npm run dev
├─ Runs Vite dev server
├─ Loads your app
└─ Front-end running
```

---

## 💳 TEST CARDS

**These work with Stripe anywhere:**

```
Success:        4242 4242 4242 4242
Declined:       4000 0000 0000 0002
Requires Auth:  4000 0025 0000 3155
```

**Expiry & CVC:** Any future date & any 3 digits

---

## 🎯 WHEN TESTING IS COMPLETE

Once you can:
✅ Complete payment with test card
✅ See plan update to "Growth"
✅ No errors anywhere

**Then we'll:**
1. Deploy to Render
2. Test on production
3. Go LIVE! 🚀

---

## 📝 TERMINAL COMMANDS REFERENCE

```bash
# Start Firebase Emulator (Terminal 1)
firebase emulators:start

# Start Local Stripe Server (Terminal 2)
node server/stripe-local.js

# Start Vite Dev (Terminal 3)
npm run dev

# Build for production
npm run build

# Deploy to Render (later)
git push render main
```

---

## ❓ COMMON ISSUES

**Issue:** "firebase command not found"
**Fix:** `npm install -g firebase-tools`

**Issue:** "Cannot find module 'stripe'"
**Fix:** `npm install stripe express cors`

**Issue:** Firestore shows no data
**Fix:** Make sure Firestore emulator started (check Terminal 1)

---

## 🚀 YOU'RE READY!

**Start all 3 terminals and test!**

Send me screenshots when:
1. ✅ All 3 terminals running
2. ✅ Payment complete
3. ✅ Plan updated in Firestore

Then we'll deploy! 🎉

---

**Questions? Check the debugging section or ask!**
