/**
 * Frontend Stripe Billing Utilities
 * 
 * Usage:
 * - Call createCheckoutSession() when user clicks upgrade button
 * - useUserPlan() hook to check user's current plan
 * - getPlanFeatures() to get features for each plan
 */

// ============ STRIPE PRICE IDs ============
// Update these with your actual Stripe price IDs from dashboard
export const STRIPE_PRICES = {
  growth: {
    monthly: "price_1T5KFWHVEVbQywP8b5tfaSHy",
    yearly: "price_1T5KGDHVEVbQywP8ccO6ku7r",
  },
  pro: {
    monthly: "price_1T5KGqHVEVbQywP8TI8qobph",
    yearly: "price_1T5KHPHVEVbQywP8GfJBPmiw",
  },
};

// ============ TYPES ============

export type PlanType = "free" | "growth" | "pro";
export type BillingCycle = "monthly" | "yearly";

export interface User {
  uid: string;
  email: string;
  plan: PlanType;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface CheckoutSessionResponse {
  sessionUrl: string;
  sessionId: string;
}

// ============ CREATE CHECKOUT SESSION ============

/**
 * Create Stripe checkout session and redirect user
 * 
 * @param uid - User's Firebase UID
 * @param plan - "growth" or "pro"
 * @param billingCycle - "monthly" or "yearly"
 * @returns Session URL to redirect to
 * 
 * @example
 * const sessionUrl = await createCheckoutSession(user.uid, "growth", "monthly");
 * window.location.href = sessionUrl;
 */
export async function createCheckoutSession(
  uid: string,
  plan: "growth" | "pro",
  billingCycle: BillingCycle
): Promise<string> {
  try {
    const priceId = STRIPE_PRICES[plan][billingCycle];

    if (!priceId) {
      throw new Error(
        `Invalid plan or billing cycle: ${plan} ${billingCycle}`
      );
    }

    console.log(
      `🔄 Creating checkout session for plan: ${plan}, cycle: ${billingCycle}`
    );

    // Determine server URL based on environment
    let serverUrl = window.location.origin;
    
    // In development localhost, use backend on port 3001
    if (window.location.hostname === 'localhost') {
      serverUrl = 'http://localhost:3001';
    }
    
    console.log(`📍 Server URL: ${serverUrl}`);
    
    console.log(`📤 Sending request to ${serverUrl}/create-checkout-session`);
    const response = await fetch(`${serverUrl}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid,
        priceId,
        billingCycle,
        plan,
      }),
    });

    console.log(`📨 Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      console.error(`❌ Server error:`, errorData);
      throw new Error(`Server error: ${errorData.error || `HTTP ${response.status}`}`);
    }

    const data = await response.json();
    
    console.log(`✅ Response data:`, {
      sessionId: data.sessionId,
      isDemoMode: data.isDemoMode,
      message: data.message,
    });

    if (!data.sessionUrl) {
      throw new Error("No session URL returned from server");
    }

    if (data.isDemoMode) {
      console.log(`🎮 DEMO MODE enabled - no real payment required`);
    }

    return data.sessionUrl;
  } catch (error: any) {
    console.error("❌ Error creating checkout session:", error.message);
    throw error;
  }
}

// ============ HANDLE CHECKOUT REDIRECT ============

/**
 * Handle redirect from Stripe checkout page
 * Called in useEffect on billing page
 * 
 * @example
 * useEffect(() => {
 *   handleCheckoutReturn();
 * }, []);
 */
export function handleCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("success")) {
    console.log("✅ Subscription successful!");
    // Show success message
    // Refresh user data from Firestore
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (params.get("canceled")) {
    console.log("❌ Checkout was cancelled");
    // Show cancellation message
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// ============ PLAN FEATURES & ACCESS CONTROL ============

export interface PlanFeatures {
  name: string;
  price: number;
  features: string[];
  limits: Record<string, number | string>;
}

/**
 * Get features for each plan
 */
export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "Basic inventory tracking",
      "Up to 100 products",
      "Manual sales recording",
      "Basic reports (PDF)",
    ],
    limits: {
      products: 100,
      teamMembers: 1,
      monthlyReports: 5,
    },
  },
  growth: {
    name: "Growth",
    price: 19,
    features: [
      "Everything in Free",
      "Unlimited products",
      "Team management (up to 5)",
      "AI Insights",
      "Advanced financial reports",
      "Tax calculations",
      "Email support",
    ],
    limits: {
      products: "unlimited",
      teamMembers: 5,
      monthlyReports: "unlimited",
    },
  },
  pro: {
    name: "Pro",
    price: 39,
    features: [
      "Everything in Growth",
      "Unlimited team members",
      "Multi-location support",
      "Shopify integration",
      "QuickBooks sync",
      "Priority support",
      "Custom integrations API",
    ],
    limits: {
      products: "unlimited",
      teamMembers: "unlimited",
      monthlyReports: "unlimited",
      locations: "unlimited",
    },
  },
};

/**
 * Get features for a specific plan
 */
export function getPlanFeatures(plan: PlanType): PlanFeatures {
  return PLAN_FEATURES[plan];
}

/**
 * Check if user has access to a feature
 * 
 * @param userPlan - User's current plan
 * @param featureName - Name of the feature to check
 * @returns true if user has access
 * 
 * @example
 * const canUseShopify = hasFeatureAccess(user.plan, "shopify");
 */
export function hasFeatureAccess(
  userPlan: PlanType,
  featureName: string
): boolean {
  const FEATURE_ACCESS: Record<PlanType, string[]> = {
    free: [
      "basic_inventory",
      "manual_sales",
      "basic_reports",
    ],
    growth: [
      "basic_inventory",
      "manual_sales",
      "basic_reports",
      "advanced_reports",
      "team_management",
      "ai_insights",
      "tax_center",
    ],
    pro: [
      "basic_inventory",
      "manual_sales",
      "basic_reports",
      "advanced_reports",
      "team_management",
      "ai_insights",
      "tax_center",
      "shopify_integration",
      "quickbooks_integration",
      "api_access",
      "multi_location",
    ],
  };

  const allowedFeatures = FEATURE_ACCESS[userPlan] || [];
  return allowedFeatures.includes(featureName);
}

/**
 * Get all restricted features for a plan
 */
export function getRestrictedFeatures(userPlan: PlanType): string[] {
  const allFeatures = [
    "basic_inventory",
    "manual_sales",
    "basic_reports",
    "advanced_reports",
    "team_management",
    "ai_insights",
    "tax_center",
    "shopify_integration",
    "quickbooks_integration",
    "api_access",
    "multi_location",
  ];

  return allFeatures.filter((f) => !hasFeatureAccess(userPlan, f));
}

/**
 * Menu feature availability based on plan
 * Maps sidebar menu items to plan tiers
 */
export function isMenuFeatureAvailable(
  userPlan: PlanType,
  menuFeature: string
): boolean {
  const MENU_FEATURES: Record<PlanType, string[]> = {
    free: [
      "finance",
      "record_sale",
      "inventory_dashboard",
      "add_product",
      "financial_reports",
      "inventory_manager",
      "billing",
      "settings",
      "improvement_hub",
    ],
    growth: [
      // All Free features
      "finance",
      "record_sale",
      "inventory_dashboard",
      "add_product",
      "financial_reports",
      "inventory_manager",
      "billing",
      "settings",
      "improvement_hub",
      // Growth additions
      "ai_insights",
      "tax_center",
      "team_management",
      "qr_barcodes",
      "integrations",
    ],
    pro: [
      // All Growth features
      "finance",
      "record_sale",
      "inventory_dashboard",
      "add_product",
      "financial_reports",
      "inventory_manager",
      "billing",
      "settings",
      "improvement_hub",
      "ai_insights",
      "tax_center",
      "team_management",
      "qr_barcodes",
      "integrations",
    ],
  };

  const allowedFeatures = MENU_FEATURES[userPlan] || [];
  return allowedFeatures.includes(menuFeature);
}

/**
 * Get upgrade plan needed for a menu feature
 * @returns "growth" or "pro" - the minimum plan needed
 */
export function getUpgradePlanForFeature(menuFeature: string): "growth" | "pro" {
  const growthOnly = ["ai_insights", "tax_center", "team_management", "qr_barcodes", "integrations"];
  if (growthOnly.includes(menuFeature)) return "growth";
  
  return "growth"; // Default
}

// ============ UPGRADE BUTTON HANDLER ============

/**
 * Handle upgrade button click
 * Shows loading, creates session, redirects to Stripe
 * 
 * @example
 * const handleUpgrade = handleUpgradeClick(user.uid, setLoading);
 * onClick={() => handleUpgrade("growth", "monthly")}
 */
export function handleUpgradeClick(
  uid: string,
  setLoading: (loading: boolean) => void
) {
  return async (plan: "growth" | "pro", billingCycle: BillingCycle) => {
    try {
      setLoading(true);
      const sessionUrl = await createCheckoutSession(uid, plan, billingCycle);
      window.location.href = sessionUrl;
    } catch (error: any) {
      console.error("❌ Upgrade failed:", error);
      alert(`Failed to start upgrade: ${error.message}`);
      setLoading(false);
    }
  };
}

// ============ MANAGE SUBSCRIPTION ============

/**
 * Create Firebase callable function to manage subscription
 * (Implementation in Cloud Functions)
 * 
 * This would in the future support:
 * - Upgrade/downgrade plan
 * - Update billing cycle (monthly <-> yearly)
 * - Cancel subscription
/**
 * Manage subscription (not yet implemented)
 */
export async function manageSubscription(action: string, data: unknown) {
  try {
    console.warn("manageSubscription not yet implemented");
    return null;
  } catch (error: any) {
    console.error("❌ Error managing subscription:", error);
    throw error;
  }
}

// ============ FORMAT PRICING ============

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format pricing display (e.g., "$29/month")
 */
export function formatPricing(
  amount: number,
  billingCycle: BillingCycle,
  currency: string = "USD"
): string {
  const formatted = formatCurrency(amount, currency);
  const cycle = billingCycle === "monthly" ? "month" : "year";
  return `${formatted}/${cycle}`;
}
