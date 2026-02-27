​# STRIPE BILLING INTEGRATION - SETUP GUIDE

## 🎯 OVERVIEW

This guide walks through setting up the production-ready Stripe subscription system for your Business Management app.

**What it does:**
- Handles subscription upgrades (Free → Growth → Pro)
- Processes recurring payments via Stripe
- Automatically updates user plans via webhook
- Keeps Firestore and Stripe in sync

**Security:**
- Secret keys stored in Cloud Functions environment
- Webhook signature verification
- Plan changes only via webhook (not frontend)
- Full audit trail of billing events

---

## 📋 PREREQUISITES

- Firebase project (already have one: ai-buisness-managment-d90e0)
- Stripe account in Live mode
- Node.js and Firebase CLI installed
- Your domain (for webhook redirect URLs)

---

## STEP 1: CREATE STRIPE PRODUCTS & PRICES

### 1.1 Go to Stripe Dashboard
- Login: https://dashboard.stripe.com
- Navigate to: **Products** → **Create product**

### 1.2 Create "Growth Plan" Product

1. **Product name:** Growth Plan
2. **Description:** $29/month - For growing businesses
3. **Price:**
   - Amount: $29.00
   - Currency: USD
   - Billing period: Monthly
   - **COPY THE PRICE ID** (e.g., `price_1Qm2A6DiPlEMTuV9UYXi7EFg`)

4. Create another price for yearly:
   - Amount: $290.00 (save 2 months)
   - Currency: USD
   - Billing period: Yearly
   - **COPY THE PRICE ID**

### 1.3 Create "Pro Plan" Product

1. **Product name:** Pro Plan
2. **Description:** $79/month - For enterprises
3. **Price:**
   - Amount: $79.00
   - Currency: USD
   - Billing period: Monthly
   - **COPY THE PRICE ID**

4. Create another price for yearly:
   - Amount: $790.00 (save 2 months)
   - Currency: USD
   - Billing period: Yearly
   - **COPY THE PRICE ID**

### 1.4 Update Your Price IDs

Open `src/utils/stripeUtils.ts` and update:

```typescript
export const STRIPE_PRICES = {
  growth: {
    monthly: "price_1Qm2A6DiPlEMTuV9UYXi7EFg", // ← Replace with your Growth Monthly ID
    yearly: "price_growth_yearly",              // ← Replace with your Growth Yearly ID
  },
  pro: {
    monthly: "price_pro_monthly",               // ← Replace with your Pro Monthly ID
    yearly: "price_pro_yearly",                 // ← Replace with your Pro Yearly ID
  },
};
```

Also update in `functions/stripe.ts`:

```typescript
const PRICE_MAP: Record<string, "growth" | "pro"> = {
  "price_1Qm2A6DiPlEMTuV9UYXi7EFg": "growth",  // ← Your Growth Monthly ID
  "price_growth_yearly": "growth",
  "price_pro_monthly": "pro",
  "price_pro_yearly": "pro",
};
```

---

## STEP 2: GET STRIPE API KEYS

### 2.1 Get Live Keys

1. Go to: **Developers** → **API keys**
2. Make sure you're in **Live mode** (toggle at top right)
3. **Copy these:**
   - **Publishable key:** pk_live_...
   - **Secret key:** sk_live_...

⚠️ **KEEP SECRET KEY SECURE** - Never commit to git

---

## STEP 3: SET UP FIREBASE CLOUD FUNCTIONS

### 3.1 Initialize Functions Folder

```bash
cd your-project-root
firebase init functions
# Select TypeScript
# Install dependencies with npm
```

### 3.2 Copy Function Code

1. Copy the content from `functions/stripe.ts` to your Firebase functions
2. Install Stripe dependency:

```bash
cd functions
npm install stripe
```

### 3.3 Configure Environment Variables

```bash
# Set Stripe Secret Key
firebase functions:config:set stripe.secret_key="sk_live_YOUR_SECRET_KEY"

# Set Webhook Secret (we'll get this after deployment)
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"

# Set your app domain
firebase functions:config:set app.domain="https://yourdomain.com"
```

Replace:
- `sk_live_YOUR_SECRET_KEY` with your actual secret key
- `https://yourdomain.com` with your actual domain

### 3.4 Update Functions Package.json

Ensure `functions/package.json` has:

```json
{
  "dependencies": {
    "firebase-admin": "latest",
    "firebase-functions": "latest",
    "stripe": "^13.0.0"
  }
}
```

### 3.5 Deploy Functions

```bash
firebase deploy --only functions
```

✅ Wait for deployment to complete

---

## STEP 4: SET UP STRIPE WEBHOOK

### 4.1 Get Webhook Function URL

After deployment, find your webhook function URL:

```bash
firebase deploy --only functions

# Or check in Firebase Console:
# Cloud Functions → stripeWebhook → Trigger tab
```

It will look like:
```
https://us-central1-ai-buisness-managment-d90e0.cloudfunctions.net/stripeWebhook
```

### 4.2 Add Webhook to Stripe

1. Go to Stripe Dashboard: **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL:** (paste your webhook URL from step 4.1)
4. **Events to send:**
   - checkout.session.completed
   - invoice.paid
   - customer.subscription.deleted
5. Click **Add endpoint**

### 4.3 Get Webhook Secret

1. Click on your newly created webhook
2. Copy the **Signing secret** (whsec_...)
3. Update Firebase config:

```bash
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET"
firebase deploy --only functions
```

---

## STEP 5: UPDATE FIRESTORE SECURITY RULES

### 5.1 Copy New Rules

Open `FIRESTORE_RULES_BILLING.txt` and:

1. Go to Firebase Console → Firestore Database → Rules tab
2. Replace ALL existing rules with the new rules
3. Click **Publish**

⚠️ **IMPORTANT:** These rules prevent users from changing their own plan!

### 5.2 Verify Rules

Test in Firestore Emulator:

```typescript
// This WILL FAIL (rules prevent it) ✅
db.collection("users").doc(uid).update({
  plan: "pro"
});

// This WILL SUCCEED (webhook can do it) ✅
// (Handled by Cloud Functions with Admin SDK)
```

---

## STEP 6: ADD ENVIRONMENT VARIABLES

### 6.1 Update .env.example

Add to `.env.example`:

```env
# Stripe Live Keys
VITE_STRIPE_PUBLIC_KEY=pk_live_YOUR_PUBLIC_KEY
VITE_STRIPE_PRICE_GROWTH_MONTHLY=price_...
VITE_STRIPE_PRICE_GROWTH_YEARLY=price_...
VITE_STRIPE_PRICE_PRO_MONTHLY=price_...
VITE_STRIPE_PRICE_PRO_YEARLY=price_...

# App Domain
VITE_APP_DOMAIN=https://yourdomain.com
```

### 6.2 Create .env.local

Copy example and fill in real values:

```env
VITE_STRIPE_PUBLIC_KEY=pk_live_XXXX...
VITE_STRIPE_PRICE_GROWTH_MONTHLY=price_1Qm2A6...
...
```

---

## STEP 7: TEST THE INTEGRATION

### 7.1 Test Stripe Live Payment

1. Open your app's Billing page
2. Click **"Upgrade to Growth"**
3. Should redirect to Stripe Checkout
4. Fill form with test card:
   - Number: **4242 4242 4242 4242**
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits
5. Complete payment

### 7.2 Verify in Firestore

After payment:
1. Go to Firebase Console → Firestore → users collection
2. Find your user document
3. Check that `plan` changed to "growth"
4. Check that `stripeSubscriptionId` is populated

### 7.3 Check Stripe Dashboard

1. Go to Stripe Dashboard → Customers
2. Your customer should appear
3. Should have active subscription

### 7.4 Test Webhook

Stripe Dashboard → Developers → Webhooks → Your webhook:
- Click **Send test event**
- Should see 200 response

---

## STEP 8: UPDATE BILLING PLAN PAGE

Replace the MOCK checkout code with real code:

```typescript
// Replace this:
const createMockCheckoutSession = async (...) => {...}

// With this:
import { createCheckoutSession } from "../utils/stripeUtils";

// In your upgrade handler:
const handleUpgrade = async (plan: "growth" | "pro", cycle: "monthly" | "yearly") => {
  try {
    setLoading(true);
    const sessionUrl = await createCheckoutSession(user.uid, plan, cycle);
    window.location.href = sessionUrl;
  } catch (error) {
    alert(`Error: ${error.message}`);
    setLoading(false);
  }
};
```

Use the `useUserPlan()` hook to show current plan:

```typescript
import { useUserPlanWithHelpers } from "../hooks/useUserPlan";

function BillingPlan() {
  const plan = useUserPlanWithHelpers();

  return (
    <div>
      <h2>Current Plan: {plan.plan}</h2>
      {plan.hasActiveSubscription() && <p>✅ Active Subscription</p>}
      
      {plan.canUpgrade() && (
        <button onClick={() => handleUpgrade("pro", "monthly")}>
          Upgrade to Pro
        </button>
      )}
    </div>
  );
}
```

---

## 📊 PRODUCTION CHECKLIST

- [ ] Stripe products and prices created
- [ ] Stripe API keys (live mode) copied
- [ ] Cloud Functions deployed
- [ ] Webhook endpoint created and tested
- [ ] Firestore security rules updated
- [ ] Environment variables configured
- [ ] Live payment test successful
- [ ] Firestore updated correctly after payment
- [ ] Webhook test event shows 200 response
- [ ] Billing page updated to use real functions
- [ ] App domain correctly set in config
- [ ] Monitored Stripe webhook logs for errors

---

## 🐛 TROUBLESHOOTING

### Payment fails but no error
- Check browser console for errors
- Check Cloud Function logs in Firebase Console
- Verify API key is in LIVE mode (not test)

### Webhook not firing
- Check webhook URL is correct
- Visit Stripe webhook page, click event → see response
- Check Cloud Function logs for errors
- Verify webhook secret is correct

### Plan not updating
- Check Firestore rules - should allow Cloud Functions
- Check billing history in Firestore for events
- Check Stripe webhook logs for failures

### Firestore permission denied
- Check you're in Firestore Rules tab (not Real Database)
- Verify new rules are published
- Try in incognito window

---

## 📝 FILES CREATED/MODIFIED

**New Files:**
- `functions/stripe.ts` - Cloud Functions
- `src/utils/stripeUtils.ts` - Frontend Stripe utilities
- `src/hooks/useUserPlan.ts` - React hook for plan data
- `FIRESTORE_RULES_BILLING.txt` - Security rules

**Already Exists:**
- `src/pages/BillingPlan.tsx` - Update with real code
- `src/config/firebase.ts` - Already configured

---

## 💳 STRIPE TEST MODE (Optional Development)

To test without processing real charges:

1. Use test API keys (pk_test_... / sk_test_...)
2. Test card: 4242 4242 4242 4242
3. Changes don't affect live customers
4. Webhooks work the same way

Switch to live mode when ready for real customers.

---

## 🔐 SECURITY SUMMARY

✅ **What's protected:**
- Secret keys stored in Cloud Functions (not in code)
- Webhook signature verified before processing
- Users cannot change their own plan
- Plan changes only happen via webhook

✅ **What's audited:**
- All billing events logged to Firestore
- Webhook delivery logged by Stripe
- Cloud Function logs available in Firebase

---

## 📞 SUPPORT

- Stripe Docs: https://stripe.com/docs
- Firebase Docs: https://firebase.google.com/docs
- Check Function logs: Firebase Console → Cloud Functions → Logs
- Check webhook logs: Stripe Dashboard → Developers → Webhooks

---

## ✅ NEXT STEPS

1. Follow steps 1-8 above
2. Test with real Stripe live payment
3. Monitor Firestore and webhook logs
4. Deploy to production with confidence!

**You're building a secure, scalable billing system.** 🚀
