​# STRIPE INTEGRATION - LOCAL DEPLOYMENT & TESTING

## ✅ WHAT'S BEEN DONE

✅ Updated `src/utils/stripeUtils.ts` with your Price IDs
✅ Updated `functions/stripe.ts` with your Price IDs
✅ Web app shows correct pricing ($19/$190 Growth, $39/$390 Pro)

---

## 📝 YOUR STRIPE DETAILS

```
Secret Key: sk_live_YOUR_SECRET_KEY

Price IDs:
- Growth Monthly: price_1T4HotHVEVbQywP80VcSmqP6
- Growth Yearly: price_1T4Hv9HVEVbQywP8iI9TkP81
- Pro Monthly: price_1T4HrMHVEVbQywP8105KbPGA
- Pro Yearly: price_1T4I18HVEVbQywP8GrJXkTLu
```

---

## 🚀 NEXT STEPS: LOCAL TESTING

### **STEP 1: Set Firebase Environment Variables**

Open PowerShell in your project root and run:

```powershell
firebase functions:config:set stripe.secret_key="sk_live_YOUR_SECRET_KEY"
```

**Verify it's set:**
```powershell
firebase functions:config:get
```

You should see:
```
stripe:
  secret_key: sk_live_YOUR_SECRET_KEY
```

---

### **STEP 2: Start Local Development**

**Terminal 1 - Start Vite (Frontend):**
```powershell
npm run dev
```

Your app opens at: http://localhost:5173

**Terminal 2 - Start Firebase Functions (Backend):**
```powershell
firebase emulators:start
```

Or to only run functions locally:
```powershell
firebase emulators:start --only functions
```

---

### **STEP 3: Test Payment Flow Locally**

1. **Open your app:** http://localhost:5173
2. **Login with a team member account** (or create one)
3. **Go to Billing & Plans page**
4. **Click "Upgrade to Growth"** button
5. **You should be redirected to Stripe Checkout**

---

### **STEP 4: Complete Test Payment**

**Use this test card:**
```
Number: 4242 4242 4242 4242
Expiry: 12/25 (any future date)
CVC: 123 (any 3 digits)
```

**This card will:**
- ✅ Complete payment successfully
- ✅ Not charge any real money
- ✅ Simulate full payment flow

**After payment:**
1. Check browser console for success message
2. Verify redirect back to app
3. Check Firestore to see if plan updated

---

## 🔍 TESTING CHECKLIST

- [ ] Firebase emulator started successfully
- [ ] App runs locally at http://localhost:5173
- [ ] Can navigate to Billing page
- [ ] Can click "Upgrade" button
- [ ] Redirected to Stripe Checkout
- [ ] Can complete payment with 4242 card
- [ ] Redirected back to app after payment
- [ ] Check Firestore users/{uid}.plan updated to "growth"
- [ ] Billing history shows payment event
- [ ] Feature unlock works correctly

---

## 🐛 TROUBLESHOOTING

### **Cloud Function Not Responding**

**Problem:** When clicking upgrade, nothing happens

**Solution:**
1. Check Firebase emulator logs
2. Make sure functions are running: `firebase emulators:start --only functions`
3. Check console for errors

### **Stripe Checkout Not Opening**

**Problem:** Click button but checkout doesn't open

**Solution:**
1. Check browser console (F12 → Console tab)
2. Look for error messages
3. Verify Price IDs are correct in code
4. Verify Secret Key is set

### **Payment Completes but Plan Doesn't Update**

**Problem:** Firestore not updated after payment

**Solution:**
1. Check browser network tab (F12 → Network)
2. Verify webhook is being called
3. Check Firebase Functions logs

---

## 📊 FILE UPDATES SUMMARY

### Updated Files:
- ✅ `src/utils/stripeUtils.ts` - All 4 Price IDs inserted
- ✅ `functions/stripe.ts` - PRICE_MAP updated
- ✅ Web app pricing updated ($19/$39)

### No Changes Needed To:
- `src/pages/BillingPlan.tsx` - Already set up to use utilities
- `src/hooks/useUserPlan.ts` - Ready to use
- Other features - All untouched

---

## ✅ LOCAL TESTING IS COMPLETE WHEN:

1. ✅ Can login to app
2. ✅ Can access Billing page
3. ✅ Can click upgrade button
4. ✅ Stripe checkout opens
5. ✅ Payment completes with test card
6. ✅ Firestore updates with new plan
7. ✅ Feature unlock works
8. ✅ No errors in console

---

## 🎯 NEXT PHASE: PRODUCTION DEPLOYMENT

Once local testing is complete:

1. **Deploy to Render** (your web hosting)
2. **Set up Stripe Webhook** with production URL
3. **Update Firebase environment** for production
4. **Deploy Cloud Functions** to production
5. **Go LIVE with real payments!** 🚀

---

## 📝 COMMANDS REFERENCE

```bash
# Set Firebase environment variable
firebase functions:config:set stripe.secret_key="YOUR_KEY"

# Check configured variables
firebase functions:config:get

# Run emulators (all services)
firebase emulators:start

# Run only functions emulator
firebase emulators:start --only functions

# Start Vite dev server
npm run dev

# Build for production
npm run build

# Deploy to production
firebase deploy --only functions
```

---

## 💡 IMPORTANT NOTES

- **8️⃣ Local testing doesn't require webhook setup**
  - Firestore updates happen immediately in emulator
  - Webhook is only needed for production

- **🔐 Your Secret Key is secure**
  - Stored in Firebase functions environment
  - Never exposed in frontend or code
  - Only used server-side for payments

- **🧪 Test card is safe**
  - $4242... card doesn't charge
  - Perfect for testing
  - Works in both test & live mode

---

## ❓ READY TO TEST?

1. Open Terminal
2. Run: `firebase emulators:start`
3. In another terminal: `npm run dev`
4. Open http://localhost:5173
5. Go to Billing page
6. Click upgrade and test!

**Let me know when local testing is complete!** ✅

Then we'll deploy to Render Pro for production. 🚀
