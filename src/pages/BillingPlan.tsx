import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Lock, AlertCircle } from "lucide-react";
import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import { useRole } from "../context/RoleContext";
import { hasPermission } from "../utils/rolePermissions";
import { isMenuFeatureAvailable, getUpgradePlanForFeature } from "../utils/stripeUtils";
import { convertCurrency, formatCurrency } from "../utils/multiCurrency";
import { db } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import "../styles/BillingPlan.css";

// TODO: Replace with client's Stripe API keys - Real Stripe integration
// const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || "";
// const STRIPE_PRICE_GROWTH_MONTHLY = import.meta.env.VITE_STRIPE_PRICE_GROWTH_MONTHLY || "";

// MOCK: Temporary mock functions for development
const createMockCheckoutSession = async (
  priceId: string,
  email?: string | null
): Promise<{ sessionId: string; success: boolean }> => {
  console.log("🎭 MOCK: Creating checkout session for price:", priceId, "email:", email);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        sessionId: `mock_session_${Date.now()}`,
        success: true,
      });
    }, 500);
  });
};

// Removed ModalState - using real Stripe checkout

const BillingPlan = () => {
  const roleContext = useRole();
  const currentRole = roleContext?.currentRole || "user";
  const { user } = useAuth();
  const { trialExpired } = useSubscription();
  const [searchParams] = useSearchParams();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [_selectedRole, setSelectedRole] = useState("Owner (Full Access)");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState("CAD");
  const [userPlan, setUserPlan] = useState<"free" | "growth" | "pro">("free");
  const [userBillingCycle, setUserBillingCycle] = useState<"monthly" | "yearly" | null>(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch user's current plan from Firestore
  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user?.uid) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const plan = data?.plan || "free";
          let cycle = data?.billing_cycle || null;
          const endDate = data?.subscription_end_date ? new Date(data.subscription_end_date) : null;
          
          // Check if subscription has expired
          if (plan !== "free" && endDate && endDate < new Date()) {
            console.log("⏰ Subscription expired, reverting to free plan...");
            await updateDoc(doc(db, "users", user.uid), {
              plan: "free",
              billing_cycle: null,
              subscription_end_date: null,
              updatedAt: new Date(),
            });
            setUserPlan("free");
            setUserBillingCycle(null);
            setSubscriptionEndDate(null);
          } else {
            // If plan is active but cycle is not set, infer from expiration date
            if (plan !== "free" && !cycle) {
              if (endDate) {
                // Estimate from expiration date difference: if >300 days, likely yearly
                const daysToExpire = Math.floor((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                cycle = daysToExpire > 300 ? "yearly" : "monthly";
                console.log(`📊 Inferring cycle from expiration: ${cycle} (${daysToExpire} days to expire)`);
              } else {
                // Default to monthly if no expiration date
                cycle = "monthly";
                console.log("📊 No expiration date found, defaulting to monthly");
              }
              
              // Save the inferred cycle to Firestore
              console.log(`💾 Saving inferred billing_cycle: ${cycle}`);
              await updateDoc(doc(db, "users", user.uid), {
                billing_cycle: cycle,
                updatedAt: new Date(),
              });
            }
            
            setUserPlan(plan);
            setUserBillingCycle(cycle);
            setSubscriptionEndDate(endDate);
            console.log(`📋 Current plan: ${plan} (${cycle})`);
          }
        }
      } catch (error) {
        console.error("Error fetching user plan:", error);
      }
    };
    fetchUserPlan();
  }, [user?.uid]);

  // Handle success redirect from Stripe
  useEffect(() => {
    const handleSuccessRedirect = async () => {
      if (searchParams.get("success") === "true" && user?.uid) {
        setSuccessMessage("✅ Payment successful! Updating plan...");
        
        try {
          // Get the plan and billing cycle from URL
          const upgradedPlan = searchParams.get("plan") as "growth" | "pro" | null;
          const cycle = searchParams.get("cycle") as "monthly" | "yearly" | null;
          
          if (upgradedPlan && (upgradedPlan === "growth" || upgradedPlan === "pro") && cycle) {
            console.log(`💾 Updating Firestore...`);
            
            // Check if there's a pending trial from localStorage
            const trialDataKey = `trial_pending_${user.uid}`;
            const trialData = localStorage.getItem(trialDataKey);
            let trialEndDate: Date | null = null;
            
            if (trialData) {
              try {
                const parsed = JSON.parse(trialData);
                trialEndDate = new Date(parsed.trialEndDate);
                localStorage.removeItem(trialDataKey);
              } catch (e) {
                console.error("Error parsing trial data:", e);
              }
            }
            
            // If no trial date, calculate subscription end date
            if (!trialEndDate) {
              trialEndDate = new Date();
              if (cycle === "monthly") {
                trialEndDate.setMonth(trialEndDate.getMonth() + 1);
              } else {
                trialEndDate.setFullYear(trialEndDate.getFullYear() + 1);
              }
            }
            
            // Update Firestore with the new plan, cycle, trial info, and expiration date
            await updateDoc(doc(db, "users", user.uid), {
              plan: upgradedPlan,
              billing_cycle: cycle,
              subscription_end_date: trialEndDate,
              trial_active: trialData ? true : false,
              trial_days: trialData ? 7 : null,
              updatedAt: new Date(),
            });
            
            setUserPlan(upgradedPlan);
            setUserBillingCycle(cycle);
            setSubscriptionEndDate(trialEndDate);
            console.log(`✅ Plan updated to: ${upgradedPlan} (${cycle}, expires: ${trialEndDate.toLocaleDateString()})`);
          }
          
          setSuccessMessage("✅ Payment successful! Plan activated!");
          
          // Clear success message and URL after 3 seconds
          setTimeout(() => {
            setSuccessMessage("");
            // Remove the success param from URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }, 3000);
        } catch (error) {
          console.error("Error updating plan:", error);
          setSuccessMessage("❌ Plan update failed. Please refresh the page.");
          setTimeout(() => setSuccessMessage(""), 5000);
        }
      }
    };
    handleSuccessRedirect();
  }, [searchParams, user?.uid]);

  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) setUserProfile(JSON.parse(storedProfile));
  }, []);

  const plans = [
    {
      id: "free",
      name: "Free Trial",
      monthlyPrice: 0,
      yearlyPrice: 0,
      description: "2 weeks free trial, then $15.99/month",
      trialDays: 14,
      trialText: "14-day free trial",
      features: [
        "✓ Basic product & inventory tracking",
        "✓ Manual sales logging",
        "✓ Simple dashboard",
        "✓ Total sales overview",
        "✓ Stock level visibility",
        "✓ Basic product information",
        "✓ Manual product addition",
        "✓ Daily sales tracking",
      ],
      button: "Start Free Trial",
      buttonClass: "primary",
      priceIdMonthly: "",
      priceIdYearly: "",
      upgradesTo: "starter",
    },
    {
      id: "starter",
      name: "Starter",
      monthlyPrice: 15.99,
      yearlyPrice: 159.99,
      description: "Starter plan for growing businesses",
      trialDays: 0,
      trialText: "No trial",
      features: [
        "✓ Everything in Free Trial",
        "✓ Basic inventory management",
        "✓ Simple sales dashboards",
        "✓ Sales trend overview",
        "✓ Basic low-stock alerts",
        "✓ Simple report generation",
        "✓ Customer order tracking",
        "✓ 24/7 email support",
      ],
      button: "Upgrade to Starter",
      buttonClass: "primary",
      priceIdMonthly: "",
      priceIdYearly: "",
      autoSubscribe: false,
    },
    {
      id: "growth",
      name: "Growth",
      monthlyPrice: 19.99,
      yearlyPrice: 199.99,
      description: "1 week free trial, then auto-subscribe",
      trialDays: 7,
      trialText: "7-day free trial",
      features: [
        "✓ Everything in Free Trial",
        "✓ Full inventory management",
        "✓ Automatic tax calculations",
        "✓ Detailed sales dashboards",
        "✓ Sales trend analytics",
        "✓ Top-selling products report",
        "✓ Low-stock alerts",
        "✓ Profit/loss summaries",
        "✓ Simple report generation",
        "✓ Customer order tracking",
        "✓ Sales performance insights",
      ],
      button: "Start Free Trial",
      buttonClass: "primary",
      isPopular: true,
      priceIdMonthly: "price_1T5KFWHVEVbQywP8b5tfaSHy",
      priceIdYearly: "price_1T5KGDHVEVbQywP8ccO6ku7r",
      autoSubscribe: true,
    },
    {
      id: "pro",
      name: "Pro",
      monthlyPrice: 25.99,
      yearlyPrice: 259.99,
      description: "1 week free trial, then auto-subscribe",
      trialDays: 7,
      trialText: "7-day free trial",
      features: [
        "✓ Everything in Growth",
        "✓ Shopify integration",
        "✓ AI-powered sales insights",
        "✓ Advanced filtering dashboards",
        "✓ Filter by product, category, date",
        "✓ Smart low-stock alerts",
        "✓ Inventory forecasting",
        "✓ Detailed reporting with graphs",
        "✓ Employee salary tracking",
        "✓ Multi-currency handling",
        "✓ Data tracking & analysis",
        "✓ Advanced reports & export",
      ],
      button: "Start Free Trial",
      buttonClass: "secondary",
      priceIdMonthly: "price_1T5KGqHVEVbQywP8TI8qobph",
      priceIdYearly: "price_1T5KHPHVEVbQywP8GfJBPmiw",
      autoSubscribe: true,
    },
  ];

  const handleUpgrade = async (plan: typeof plans[0]) => {
    if (!user?.uid) {
      alert("Please log in first");
      return;
    }

    setLoading(true);

    try {
      // Handle free trial for Free Trial plan
      if (plan.id === "free") {
        // Update to starter plan with 14-day trial
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        
        await updateDoc(doc(db, "users", user.uid), {
          plan: "starter",
          billing_cycle: "monthly",
          subscription_end_date: trialEndDate,
          trial_active: true,
          trial_days: 14,
          updatedAt: new Date(),
        });
        
        setUserPlan("starter");
        setUserBillingCycle("monthly");
        setSubscriptionEndDate(trialEndDate);
        setSuccessMessage("✅ Free trial started! You have 14 days to experience Starter features.");
        setTimeout(() => setSuccessMessage(""), 4000);
        return;
      }

      // Use real Stripe integration
      const priceId = billingCycle === "monthly" ? plan.priceIdMonthly : plan.priceIdYearly;
      
      if (!priceId) {
        throw new Error("Price ID not configured for this plan");
      }

      // Use local backend server on port 5000 for dev, or production endpoint
      const isLocalDev = import.meta.env.DEV && window.location.hostname === 'localhost';
      const serverUrl = isLocalDev ? 'http://localhost:5000' : window.location.origin;

      console.log(`🔄 Creating checkout for ${plan.name} (${billingCycle})...`);
      console.log(`📤 Sending to ${serverUrl}/create-checkout-session with:`, {
        uid: user.uid,
        priceId,
        billingCycle,
        plan: plan.id,
      });
      
      const response = await fetch(`${serverUrl}/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.uid,
          priceId,
          billingCycle,
          plan: plan.id,
        }),
      });

      console.log(`📨 Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        console.error(`❌ Server error response:`, errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Checkout session created:`, data);

      if (!data.sessionUrl) {
        throw new Error("No session URL returned");
      }

      // For plans with autoSubscribe (Growth, Pro), set up trial period
      if (plan.autoSubscribe) {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + plan.trialDays);
        
        // Store trial info before redirecting to Stripe
        localStorage.setItem(
          `trial_pending_${user.uid}`,
          JSON.stringify({
            plan: plan.id,
            trialDays: plan.trialDays,
            trialEndDate: trialEndDate.toISOString(),
            billingCycle: billingCycle,
          })
        );
      }

      console.log(`✅ Redirecting to Stripe checkout...`);
      // Redirect to Stripe checkout
      window.location.href = data.sessionUrl;
    } catch (error) {
      console.error("❌ Error creating checkout:", error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to create checkout session'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Bar */}
        <TopBar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onRoleChange={(role) => setSelectedRole(role)}
        />

        <div className="scrollable-content">
          <div className="billing-container">
            {/* Success Message */}
            {successMessage && (
              <div className="success-banner">
                {successMessage}
              </div>
            )}

            {/* Trial Expired Alert */}
            {trialExpired && (
              <div style={{
                backgroundColor: "#fee2e2",
                border: "2px solid #ef4444",
                borderRadius: "8px",
                padding: "16px 20px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}>
                <AlertCircle size={24} color="#ef4444" />
                <div>
                  <h3 style={{ color: "#991b1b", margin: "0 0 4px 0", fontWeight: 600 }}>Trial Expired</h3>
                  <p style={{ color: "#7f1d1d", margin: 0, fontSize: "14px" }}>Your trial period has ended. Please choose a plan below to continue using premium features.</p>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="billing-header">
              <h1 className="billing-title">Billing & Plan</h1>
              <p className="billing-subtitle">Choose the perfect plan for your business</p>
              {userPlan !== "free" && (
                <p className="current-plan-badge">
                  Current Plan: <strong>{userPlan.toUpperCase()}</strong> ({userBillingCycle})
                  {subscriptionEndDate && (
                    <span style={{ fontSize: "12px", color: "#888" }}>
                      {" "} • Expires: {subscriptionEndDate.toLocaleDateString()}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Controls - Top Right */}
            <div className="billing-controls-top">
              <div className="currency-selector">
                <select className="currency-dropdown" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="NGN">NGN - Nigerian Naira</option>
                </select>
              </div>

              <div className="billing-toggle">
                <button
                  className={`toggle-btn ${billingCycle === "monthly" ? "active" : ""}`}
                  onClick={() => setBillingCycle("monthly")}
                >
                  Monthly
                </button>
                <button
                  className={`toggle-btn ${billingCycle === "yearly" ? "active" : ""}`}
                  onClick={() => setBillingCycle("yearly")}
                >
                  Yearly {billingCycle === "yearly" && <span className="yearly-badge">Save 17%</span>}
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="plans-grid">
              {plans.map((plan) => {
                // Check if this plan card is the active one
                // Only show as active if userBillingCycle matches the current billingCycle
                const isActive = plan.id !== "free" && userPlan === plan.id && userBillingCycle === billingCycle;
                
                return (
                <div
                  key={plan.id}
                  className={`plan-card ${plan.isPopular ? "popular" : ""} ${isActive ? "active" : ""}`}
                >
                  {plan.isPopular && <div className="popular-badge">Most Popular</div>}
                  {isActive && <div className="active-badge">✓ Active</div>}

                  <div className="plan-header">
                    <h2 className="plan-name">{plan.name}</h2>
                    <p className="plan-description">{plan.description}</p>
                  </div>

                  <div className="plan-price">
                    <span className="currency">{currency === "USD" ? "$" : currency}</span>
                    <span className="amount">
                      {(() => {
                        const priceUSD = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
                        const convertedPrice = currency === "USD" ? priceUSD : convertCurrency(priceUSD, "USD", currency);
                        return convertedPrice.toFixed(2);
                      })()}
                    </span>
                    <span className="period">
                      {billingCycle === "monthly" ? "/month" : "/year"}
                    </span>
                  </div>

                  {billingCycle === "yearly" && plan.id !== "free" && (
                    <div className="plan-save-badge">Save 17%</div>
                  )}

                  <button
                    className={`plan-button ${plan.buttonClass} ${isActive ? "current-plan" : ""}`}
                    onClick={() => handleUpgrade(plan)}
                    disabled={plan.id === "free" || isActive || loading}
                  >
                    {isActive ? "✓ Current Plan" : loading ? "Processing..." : plan.button}
                  </button>

                  <div className="features-divider"></div>

                  <div className="plan-features">
                    <h3 className="features-title">Includes:</h3>
                    <ul className="features-list">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="feature-item">
                          <Check size={16} className="feature-icon" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Why Upgrade Section */}
            <div className="billing-faq">
              <h3 className="faq-title">Why upgrade?</h3>
              <div className="faq-items">
                <div className="faq-item">
                  <div className="faq-icon">📊</div>
                  <div className="faq-content">
                    <h4>Advanced Analytics</h4>
                    <p>Get deeper insights into your business with advanced reports and export capabilities.</p>
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-icon">🔒</div>
                  <div className="faq-content">
                    <h4>Enhanced Security</h4>
                    <p>Fraud detection, anomaly alerts, and enterprise-grade security features.</p>
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-icon">⚡</div>
                  <div className="faq-content">
                    <h4>Priority Support</h4>
                    <p>Get help when you need it with priority email and 24/7 support on Pro.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default BillingPlan;
