​# BILLING PLAN PAGE - INTEGRATION CHECKLIST

## 📌 OBJECTIVE

Wire up the real Stripe utilities and hook into `BillingPlan.tsx` to replace mock code and enable production billing.

---

## ✅ CHECKLIST: Changes Needed in BillingPlan.tsx

### 1. ADD IMPORTS AT TOP

```typescript
import { useUserPlan } from "../hooks/useUserPlan";
import { 
  createCheckoutSession, 
  hasFeatureAccess, 
  getRestrictedFeatures,
  PLAN_FEATURES,
  STRIPE_PRICES 
} from "../utils/stripeUtils";
import { useAuth } from "../context/AuthContext";
```

**Location:** After existing imports, before function definition

---

### 2. REMOVE MOCK FUNCTION

**REMOVE THIS ENTIRE FUNCTION:**

```typescript
const createMockCheckoutSession = async (
  userId: string,
  plan: "growth" | "pro",
  billingCycle: "monthly" | "yearly"
): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`/billing-success?plan=${plan}&cycle=${billingCycle}`);
    }, 1000);
  });
};
```

---

### 3. REPLACE COMPONENT LOGIC

**FIND:** The main BillingPlan component function start

**REPLACE:** Initial useState/useEffect with:

```typescript
function BillingPlan() {
  const { user } = useAuth();
  const plan = useUserPlan();
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState<"growth" | "pro" | null>(null);

  // Handle success/cancel from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("session_id");
    
    if (status === "success") {
      // Firestore will update automatically via webhook
      // Just clear the URL parameter
      window.history.replaceState({}, document.title, "/billing");
    } else if (status === "cancel") {
      alert("Checkout cancelled. Please try again.");
      window.history.replaceState({}, document.title, "/billing");
    }
  }, []);

  const handleUpgradeClick = async (targetPlan: "growth" | "pro") => {
    if (!user) {
      alert("Please log in first");
      return;
    }

    setLoading(true);
    try {
      const sessionUrl = await createCheckoutSession(
        user.uid,
        targetPlan,
        billingCycle
      );
      // Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setLoading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!user) return;
    
    // Create checkout session for Free plan (cancel subscription)
    // This triggers a cancellation in Stripe/webhook
    alert("To downgrade, please visit your Stripe customer portal or contact support");
  };

  if (plan.loading) {
    return <div className="loading">Loading plan details...</div>;
  }

  if (plan.error) {
    return <div className="error">Error loading plan: {plan.error}</div>;
  }

  const currentPlanFeatures = PLAN_FEATURES[plan.plan] || [];
  const restrictedFeatures = getRestrictedFeatures(plan.plan);
```

---

### 4. UPDATE PLAN DISPLAY SECTION

**FIND:** Where it displays current plan (look for Current Plan / Active Plan title)

**UPDATE TO:**

```typescript
  return (
    <div className="billing-container">
      <h1>Billing & Plans</h1>
      
      {/* Current Plan Section */}
      <div className="current-plan-section">
        <h2>Your Current Plan</h2>
        <div className="plan-badge">
          <span className={`badge badge-${plan.plan}`}>
            {plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1)}
          </span>
          {plan.hasActiveSubscription && (
            <span className="active-badge">✓ Active Subscription</span>
          )}
        </div>
        
        <div className="plan-details">
          <h3>${PLAN_FEATURES[plan.plan]?.price || "0"}/mo</h3>
          <p>Includes {currentPlanFeatures.length} features</p>
          
          {plan.stripeSubscriptionId && (
            <p className="subscription-id">
              Subscription ID: {plan.stripeSubscriptionId.substring(0, 20)}...
            </p>
          )}
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="billing-cycle-section">
        <label>Billing Cycle</label>
        <div className="cycle-toggle">
          <button
            className={billingCycle === "monthly" ? "active" : ""}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly
          </button>
          <button
            className={billingCycle === "yearly" ? "active" : ""}
            onClick={() => setBillingCycle("yearly")}
          >
            Yearly (Save 2 months)
          </button>
        </div>
      </div>
```

---

### 5. UPDATE PLANS GRID

**FIND:** The plans section showing Growth/Pro cards

**UPDATE TO:**

```typescript
      {/* Available Plans */}
      <div className="plans-grid">
        <div className={`plan-card ${plan.plan === "growth" ? "current" : ""}`}>
          <h3>Growth Plan</h3>
          <div className="price">
            ${billingCycle === "monthly" ? "29" : "290"}/
            <span>{billingCycle === "monthly" ? "month" : "year"}</span>
          </div>
          <p className="description">Perfect for growing businesses</p>
          
          <div className="features">
            {PLAN_FEATURES.growth.map((feature, idx) => (
              <div key={idx} className="feature">
                <span>✓</span>
                {feature}
              </div>
            ))}
          </div>

          {plan.plan === "growth" ? (
            <button className="btn-current" disabled>
              ✓ Current Plan
            </button>
          ) : plan.plan === "free" ? (
            <button
              className="btn-upgrade"
              onClick={() => handleUpgradeClick("growth")}
              disabled={loading}
            >
              {loading ? "Processing..." : "Upgrade to Growth"}
            </button>
          ) : (
            <button
              className="btn-downgrade"
              onClick={() => handleDowngrade()}
            >
              Downgrade
            </button>
          )}
        </div>

        <div className={`plan-card pro ${plan.plan === "pro" ? "current" : ""}`}>
          <h3>Pro Plan</h3>
          <span className="badge-pro">Most Popular</span>
          <div className="price">
            ${billingCycle === "monthly" ? "79" : "790"}/
            <span>{billingCycle === "monthly" ? "month" : "year"}</span>
          </div>
          <p className="description">For enterprise-scale operations</p>
          
          <div className="features">
            {PLAN_FEATURES.pro.map((feature, idx) => (
              <div key={idx} className="feature">
                <span>✓</span>
                {feature}
              </div>
            ))}
          </div>

          {plan.plan === "pro" ? (
            <button className="btn-current" disabled>
              ✓ Current Plan
            </button>
          ) : (
            <button
              className="btn-upgrade pro"
              onClick={() => handleUpgradeClick("pro")}
              disabled={loading}
            >
              {loading ? "Processing..." : "Upgrade to Pro"}
            </button>
          )}
        </div>
      </div>

      {/* Feature Access Status */}
      {restrictedFeatures.length > 0 && (
        <div className="restricted-features">
          <h3>Available in Higher Plans</h3>
          <div className="features-list">
            {restrictedFeatures.map((feature, idx) => (
              <div key={idx} className="restricted-feature">
                <span className="locked">🔒</span>
                {feature}
              </div>
            ))}
          </div>
          {plan.plan !== "pro" && (
            <button
              className="btn-upgrade-full"
              onClick={() => handleUpgradeClick("pro")}
              disabled={loading}
            >
              Upgrade Now to Access All Features
            </button>
          )}
        </div>
      )}

      {/* Billing History */}
      <div className="billing-history-section">
        <h2>Billing History</h2>
        <p>Your recent billing events and payments</p>
        {/* Billing history will be populated via hook later */}
      </div>
    </div>
  );
}

export default BillingPlan;
```

---

### 6. UPDATE CSS

**ADD to BillingPlan.css:**

```css
/* Current Plan Badge */
.plan-badge {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 12px;
}

.badge-free {
  background: #e0e0e0;
  color: #333;
}

.badge-growth {
  background: #4f46e5;
  color: white;
}

.badge-pro {
  background: #d97706;
  color: white;
}

.active-badge {
  padding: 8px 12px;
  background: #10b981;
  color: white;
  border-radius: 4px;
  font-size: 12px;
}

/* Billing Cycle Toggle */
.cycle-toggle {
  display: flex;
  gap: 10px;
  margin: 15px 0;
}

.cycle-toggle button {
  padding: 10px 20px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
}

.cycle-toggle button.active {
  background: #4f46e5;
  color: white;
  border-color: #4f46e5;
}

/* Plans Grid */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  margin: 40px 0;
}

.plan-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 30px;
  background: white;
  transition: all 0.3s;
}

.plan-card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.plan-card.current {
  border: 2px solid #4f46e5;
  background: #f3f4f6;
}

.plan-card.pro {
  border: 2px solid #d97706;
}

.plan-card h3 {
  margin: 0 0 10px 0;
  font-size: 24px;
}

.plan-card .price {
  font-size: 36px;
  font-weight: bold;
  color: #3b82f6;
  margin: 15px 0;
}

.plan-card .price span {
  font-size: 14px;
  color: #666;
}

/* Features List */
.features {
  list-style: none;
  margin: 20px 0;
  padding: 0;
}

.feature,
.restricted-feature {
  padding: 10px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #555;
}

.feature span,
.restricted-feature span {
  font-weight: bold;
}

.restricted-feature {
  color: #999;
}

.restricted-feature .locked {
  font-size: 16px;
}

/* Buttons */
.btn-current,
.btn-upgrade,
.btn-upgrade-full,
.btn-downgrade {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 20px;
}

.btn-current {
  background: #e5e7eb;
  color: #333;
  cursor: default;
}

.btn-upgrade {
  background: #4f46e5;
  color: white;
}

.btn-upgrade:hover:not(:disabled) {
  background: #4338ca;
}

.btn-upgrade.pro {
  background: #d97706;
}

.btn-upgrade.pro:hover:not(:disabled) {
  background: #b45309;
}

.btn-upgrade:disabled,
.btn-upgrade-full:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-downgrade {
  background: white;
  color: #ef4444;
  border: 1px solid #ef4444;
}

.btn-downgrade:hover {
  background: #fecaca;
}

/* Restricted Features Section */
.restricted-features {
  background: #fefce8;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 20px;
  margin: 40px 0;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 15px 0;
}

/* Billing History */
.billing-history-section {
  margin-top: 50px;
  padding-top: 30px;
  border-top: 1px solid #ddd;
}

.billing-history-section h2 {
  margin-bottom: 15px;
}

.loading,
.error {
  padding: 20px;
  border-radius: 8px;
  font-size: 16px;
}

.loading {
  background: #e0f2fe;
  color: #0369a1;
}

.error {
  background: #fee2e2;
  color: #dc2626;
}
```

---

## 🧪 TESTING STEPS

After making these changes:

### 1. Verify Imports Compile

```bash
npm run build
# Should have 0 errors
```

### 2. Test Hook Integration

- Load BillingPlan page
- See current plan display correctly
- See feature restrictions apply

### 3. Test Upgrade Button

- Click "Upgrade to Growth" button
- Should redirect to Stripe Checkout
- Can fill out test card info
- Completes without errors

### 4. Test Webhook Update

- After completing test payment
- Refresh page in 5 seconds
- Should show plan as "growth"
- Should show active subscription

### 5. Test Feature Access

- Switch back to free plan (in Firestore directly for testing)
- Restricted features should show lock icon
- Button should say "Upgrade to Pro"

---

## 📝 CODE CLEANUP

After successful testing:

- [ ] Remove `createMockCheckoutSession` function
- [ ] Remove any unused mock state variables
- [ ] Verify no TypeScript errors remain
- [ ] Test all buttons work (upgrade, downgrade, etc.)

---

## 🚀 AFTER INTEGRATION

Once BillingPlan.tsx is updated:

1. Deploy to Render/production
2. Test real payment flow
3. Monitor Cloud Function logs
4. Verify webhook processing
5. Check Firestore billing events

---

## 💡 DEBUGGING TIPS

**If page blank:**
- Check console errors
- Verify useAuth() hook works
- Ensure firebase config loaded

**If buttons don't work:**
- Check createCheckoutSession function call
- Verify Firebase UID is valid
- Check Cloud Function logs

**If payment doesn't update plan:**
- Check webhook logs in Stripe Dashboard
- Check Cloud Function logs
- Verify webhook secret is correct

---

## ✅ FINAL CHECKLIST

- [ ] All imports added
- [ ] Mock function removed
- [ ] Component logic replaced
- [ ] Plan display updated
- [ ] Billing cycle toggle works
- [ ] Upgrade buttons functional
- [ ] CSS added
- [ ] TypeScript compilation passes
- [ ] No runtime errors in console
- [ ] Test payment completes
- [ ] Firestore updates after payment
- [ ] Can retry failed transactions

---

You're almost there! Once BillingPlan.tsx is updated, the entire billing system will be live. 🎉
