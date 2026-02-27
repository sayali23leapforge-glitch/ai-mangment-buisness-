​# STRIPE INTEGRATION SETUP - CLIENT INFORMATION NEEDED

Dear Client,

We're setting up your business management app with Stripe payment processing. To complete this integration, we need some information from your Stripe account.

This document explains exactly what we need and where to find it.

---

## 📋 WHAT WE NEED (4 ITEMS)

We need you to provide:

1. ✅ **Stripe Secret API Key**
2. ✅ **Stripe Price IDs** (for your products)

**Estimated time to collect:** 10-15 minutes

---

## ⚠️ IMPORTANT NOTE ABOUT API KEY

**We received an API key that starts with `rk_live_` (Restricted Key) - This is NOT the key we need.**

We need the **Secret Key** that starts with `sk_live_` instead.

**Why?**
- `rk_live_*` = Restricted Key (limited permissions)
- `sk_live_*` = Secret Key (full access, needed for payments) ← **This is what we need**

Please follow the steps below to get the correct **Secret Key**.

---

## 🔑 STEP 1: GET YOUR STRIPE SECRET KEY

### Location:
1. Go to: **https://dashboard.stripe.com**
2. Login to your Stripe account
3. Click **Developers** (top menu)
4. Click **API keys** (left sidebar)
5. Make sure **Live mode** is toggled ON (top right)

### What to look for:
You'll see "Secret key" with a hidden value.

### To reveal it:
- Click **Reveal test data** button
- The full key will appear (starts with `sk_live_`)

### Copy it:
- Click the copy icon next to the key
- **Share this with us:** [PASTE KEY HERE]

**Example format:** `sk_live_YOUR_SECRET_KEY...`

---

## 💳 STEP 2: CREATE STRIPE PRODUCTS & GET PRICE IDS

We need to set up 2 pricing plans in your Stripe account.

### Plan 1: Growth Plan

**Step A: Create Product**
1. Go to: **https://dashboard.stripe.com/products**
2. Click **Add product**
3. Fill in:
   - **Product name:** Growth Plan
   - **Description:** $29/month plan for growing businesses
   - Click **Continue**

**Step B: Add Monthly Price**
1. Under "Pricing" section → Click **Add price**
2. Fill in:
   - **Price:** $29.00
   - **Currency:** USD
   - **Billing period:** Monthly (recurring)
   - Click **Save and continue**

3. On the next screen → Click **Activate price**
4. You'll see a price ID appear (starts with `price_`)
5. **Copy this ID:** [PASTE GROWTH MONTHLY PRICE ID HERE]

**Step C: Add Yearly Price**
1. Go back to the Growth Plan product
2. Click **Add price** again
3. Fill in:
   - **Price:** $290.00 (save 2 months)
   - **Currency:** USD
   - **Billing period:** Yearly (recurring)
   - Click **Save and continue**

4. Click **Activate price**
5. **Copy this ID:** [PASTE GROWTH YEARLY PRICE ID HERE]

---

### Plan 2: Pro Plan

**Step A: Create Product**
1. Go to: **https://dashboard.stripe.com/products**
2. Click **Add product**
3. Fill in:
   - **Product name:** Pro Plan
   - **Description:** $79/month plan for enterprise
   - Click **Continue**

**Step B: Add Monthly Price**
1. Under "Pricing" section → Click **Add price**
2. Fill in:
   - **Price:** $79.00
   - **Currency:** USD
   - **Billing period:** Monthly (recurring)
   - Click **Save and continue**

3. Click **Activate price**
4. **Copy this ID:** [PASTE PRO MONTHLY PRICE ID HERE]

**Step C: Add Yearly Price**
1. Go back to the Pro Plan product
2. Click **Add price** again
3. Fill in:
   - **Price:** $790.00 (save 2 months)
   - **Currency:** USD
   - **Billing period:** Yearly (recurring)
   - Click **Save and continue**

4. Click **Activate price**
5. **Copy this ID:** [PASTE PRO YEARLY PRICE ID HERE]

---

## 📝 SUMMARY - INFORMATION TO PROVIDE

Please fill in all items below and send back to us:

```
1. Stripe Secret Key (sk_live_...):
   _____________________________________________

2. Growth Plan - Monthly Price ID (price_...):
   _____________________________________________

3. Growth Plan - Yearly Price ID (price_...):
   _____________________________________________

4. Pro Plan - Monthly Price ID (price_...):
   _____________________________________________

5. Pro Plan - Yearly Price ID (price_...):
   _____________________________________________
```

---

## 🔒 SECURITY NOTES

⚠️ **IMPORTANT:**
- Your **Secret Key** is sensitive - keep it private
- Only share with your development team
- Never publish it in public code repositories
- We will store it securely in your Firebase backend

✅ **What we'll do:**
- Store Secret Key in Firebase (not in code)
- Never publicly expose it
- Use it only for payment processing
- Follow PCI compliance standards

---

## ⏱️ WHAT HAPPENS NEXT

Once you provide these items, we will:

1. **Update the code** with your Stripe information (5 min)
2. **Test locally** with a test payment (15 min)
3. **Deploy to Firebase** Cloud Functions (10 min)
4. **Set up webhook** in Stripe to receive payment notifications (5 min)
5. **Go live** with your app domain! 🚀

**Total time:** ~35 minutes for local testing, then production deployment

---

## 📞 QUESTIONS?

If you have questions about any step:

1. **Finding your Secret Key?**
   → Go to Stripe Dashboard → Developers → API keys → Reveal

2. **Creating products?**
   → Go to https://dashboard.stripe.com/products → Add product

3. **Finding Price IDs?**
   → After creating a price, you'll see the ID in the product page

4. **What if you're not sure?**
   → Screenshot the screen and send to us - we can help identify it

---

## ✅ READY?

Once you have all 4 items, please reply with the completed form above.

We'll take it from there and have your payment system live ASAP! 🎉

---

**For technical questions, contact:** [Your Development Team Contact]

**Deadline:** [Your Timeline]

Thank you!
