# 🔑 Stripe Secret Key Setup for Render Deployment

## Current Status
❌ Payment system showing: "Error: Payment system temporarily unavailable"

**Reason:** `STRIPE_SECRET_KEY` is not set in Render environment

---

## ✅ Solution: Add Stripe Secret Key to Render

### Step 1: Get Your Stripe Secret Key

**From your Stripe Dashboard:**
1. Go to: https://dashboard.stripe.com/apikeys
2. Make sure **Live mode** is toggled ON (top right)
3. Under "Secret key" section, click **Reveal test data** (or for live mode, just copy)
4. Click the copy icon
5. Key format: `sk_live_xxxxxxxxxxxxx` or `sk_test_xxxxxxxxxxxxx`

---

### Step 2: Add to Render Dashboard

**Go to Render:**
1. Login to https://dashboard.render.com
2. Select your service: **ai-business-management**
3. Click **Environment** (left sidebar)
4. Click **Add Environment Variable**

**Fill in:**
- **Key:** `STRIPE_SECRET_KEY`
- **Value:** Paste your Stripe secret key (e.g., `sk_live_123abc...`)

5. Click **Save**

---

### Step 3: Verify It Works

Render will automatically:
1. ✅ Redeploy your service (2-3 minutes)
2. ✅ Load the new environment variable
3. ✅ Server will now accept Stripe payments

**Test it:**
1. Wait 3-5 minutes for redeploy
2. Go to your billing page: https://nayance.com/billing-plan
3. Click "Start Free Trial"
4. Should redirect to **Stripe Checkout** ✅

---

## 🔍 For Reference: Your Price IDs

These are already configured in the code:

### Starter Plan (14-day trial → $15.99/month)
- Monthly: `price_1T5KFWHVEVbQywP8b5tfaSHy`
- Yearly: `price_1T5KGDHVEVbQywP8ccO6ku7r`

### Growth Plan (7-day trial → $19.99/month) 
- Monthly: `price_1TKCi6HVEVbQywP8Pdb5qlUu`
- Yearly: `price_1TKCiiHVEVbQywP8ga59LQ3Y`

### Pro Plan (7-day trial → $25.99/month)
- Monthly: `price_1TKCkLHVEVbQywP8QIPuq8py`
- Yearly: `price_1TKCkwHVEVbQywP8CIVH7COV`

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Still getting "Payment unavailable" | Wait 3-5 min for Render to redeploy, then refresh |
| Key not working | Verify you copied the FULL key from Stripe (should be 80+ characters) |
| Wrong key format | Make sure it starts with `sk_live_` or `sk_test_` (NOT `rk_` or `pk_`) |

---

## 📋 Checklist

- [ ] Got Stripe Secret Key from dashboard
- [ ] Added `STRIPE_SECRET_KEY` to Render environment
- [ ] Waited 3-5 minutes for redeploy
- [ ] Tested "Start Free Trial" button
- [ ] Payment redirects to Stripe checkout ✅
