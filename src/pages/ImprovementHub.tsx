import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Globe, Wifi, Users2, Link as LinkIcon, Shield, BookOpen, Bell, TrendingUp, Check, Lock, Sparkles } from "lucide-react";
import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import { useRole } from "../context/RoleContext";
import { useSubscription } from "../context/SubscriptionContext";
import { hasPermission } from "../utils/rolePermissions";
import { isMenuFeatureAvailable } from "../utils/stripeUtils";
import "../styles/Dashboard.css";
import "../styles/ImprovementHub.css";
const improvements = [
  {
    title: "Multi-Currency Support",
    desc: "Handle transactions in multiple currencies with automatic conversion rates and regional pricing.",
    tag: "Pro",
    icon: Globe,
    feature: "multiCurrency" as const,
    status: "coming-soon" as const,
  },
  {
    title: "Offline-First Mode",
    desc: "Continue working without internet. Auto-sync when you're back online.",
    tag: "Pro",
    icon: Wifi,
    feature: "offlineMode" as const,
    status: "active" as const,
  },
  {
    title: "Payroll Integration",
    desc: "Manage employee salaries, deductions, and generate payslips automatically.",
    tag: "Pro",
    icon: Users2,
    feature: "payrollIntegration" as const,
    status: "coming-soon" as const,
  },
  {
    title: "Bank/API Integration",
    desc: "Connect EcoCash, Paystack, Flutterwave, and your bank for automatic transaction sync.",
    tag: "Pro",
    icon: LinkIcon,
    feature: "bankIntegration" as const,
    status: "coming-soon" as const,
  },
  {
    title: "Fraud/Anomaly Detection",
    desc: "AI-powered monitoring to detect unusual patterns and potential fraud in real-time.",
    tag: "Pro",
    icon: Shield,
    feature: "fraudDetection" as const,
    status: "active" as const,
  },
  {
    title: "Community & Learning Hub",
    desc: "Access tutorials, best practices, and connect with other business owners.",
    tag: "Starter",
    icon: BookOpen,
    feature: "communityHub" as const,
    status: "coming-soon" as const,
  },
  {
    title: "Smart Notifications",
    desc: "Real-time alerts for low stock, upcoming payments, tax deadlines, and more.",
    tag: "Starter",
    icon: Bell,
    feature: "smart_notifications" as const,
    status: "active" as const,
  },
  {
    title: "Advanced Analytics",
    desc: "Deep dive into your business metrics with customizable dashboards and AI insights.",
    tag: "Starter",
    icon: TrendingUp,
    feature: "advancedAnalytics" as const,
    status: "active" as const,
  },
];

const ImprovementHub = () => {
  const roleContext = useRole();
  const { tier, canAccess } = useSubscription();
  const currentRole = roleContext?.currentRole || "user";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const sidebarNavRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) setUserProfile(JSON.parse(storedProfile));
    
    // Debug logging - Show what features user has access to
    const featureAccess = {
      multiCurrency: canAccess("multi_currency"),
      offlineMode: canAccess("offline_mode"),
      payrollIntegration: canAccess("payroll_integration"),
      bankIntegration: canAccess("bank_integration"),
      fraudDetection: canAccess("fraud_detection"),
      smartNotifications: canAccess("smart_notifications"),
      advancedAnalytics: canAccess("advanced_analytics"),
      communityHub: canAccess("community_hub"),
    };
    
    const activeCount = Object.values(featureAccess).filter(Boolean).length;
    
    console.log("🔍 Improvement Hub Debug:", {
      userTier: tier,
      totalActiveFeatures: activeCount,
      featureAccess,
      tierDescription: tier === "pro" ? "All features available (Pro)" : tier === "growth" ? "Starter features available (2: Smart Notifications, Advanced Analytics)" : "No premium features (Free plan)",
    });
  }, [tier, canAccess]);

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main className="dashboard-main">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="scrollable-content">
          <div className="improvement-hub-container">
          <div className="improvement-header">
            <h1>Improvements Hub</h1>
            <p>Explore powerful features designed to scale your business operations and streamline workflows.</p>
          </div>

          {/* Tier Status Display */}
          <div className={`tier-status-display tier-${tier}`}>
            <div className="tier-badge-indicator">
              {tier === "pro" && "👑 PRO PLAN"}
              {tier === "growth" && "🚀 STARTER PLAN"}
              {tier === "free" && "🆓 FREE PLAN"}
            </div>
            <div className="tier-description">
              {tier === "pro" && (
                <>
                  <strong>✅ 5 features unlocked!</strong>
                  <p>Pro: Multi-Currency, Offline Mode, Fraud Detection, Smart Notifications, Advanced Analytics</p>
                  <p>🚀 Coming Soon: Payroll, Bank APIs, Community Hub</p>
                </>
              )}
              {tier === "growth" && (
                <>
                  <strong>✅ 2 features unlocked!</strong>
                  <p>Starter: Smart Notifications, Advanced Analytics</p>
                  <p>🚀 Coming Soon: Community Hub</p>
                  <p>🔒 Upgrade to Pro for: Multi-Currency, Offline Mode, Payroll, Bank APIs, Fraud Detection</p>
                </>
              )}
              {tier === "free" && (
                <>
                  <strong>🔒 No features available</strong>
                  <p>Upgrade to Starter for 2 features (Smart Notifications, Advanced Analytics)</p>
                  <p>Upgrade to Pro for 5 features (add Multi-Currency, Offline Mode, Fraud Detection)</p>
                </>
              )}
            </div>
          </div>

          <div className="improvements-grid">
            {improvements.map((improvement, idx) => {
              const IconComponent = improvement.icon;
              const hasAccess = canAccess(improvement.feature);
              const requiredTier = improvement.tag; // "Pro" or "Growth"
              const isComingSoon = improvement.status === "coming-soon";
              
              return (
                <Link key={idx} to={hasAccess && !isComingSoon ? "#" : "/billing-plan"} className={`improvement-card-link ${hasAccess && !isComingSoon ? "unlocked" : "locked"}`}>
                  <div className={`improvement-card ${isComingSoon ? "coming-soon" : hasAccess ? "active" : "disabled"}`}>
                    <div className="card-header">
                      <div className="icon-wrapper">
                        <IconComponent size={28} className="improvement-icon" />
                        {hasAccess && !isComingSoon && <Check size={16} className="access-badge" />}
                        {!hasAccess && !isComingSoon && <Lock size={16} className="lock-badge" />}
                        {isComingSoon && <Sparkles size={16} className="coming-soon-badge" />}
                      </div>
                      <span className={`badge ${isComingSoon ? "coming-soon" : hasAccess ? "active" : requiredTier.toLowerCase()}`}>
                        {isComingSoon ? "Coming Soon" : hasAccess ? "✓ Active" : requiredTier}
                      </span>
                    </div>

                    <h3>{improvement.title}</h3>
                    <p>{improvement.desc}</p>
                    
                    {!hasAccess && !isComingSoon && (
                      <div className="access-status">
                        <Lock size={14} /> Requires {requiredTier} Plan
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="improvements-footer">
            <div className="upgrade-cta">
              <h2>Ready to unlock all features?</h2>
              <p>Upgrade to Pro and get access to all premium features including multi-currency support, offline mode, payroll, bank integrations, and advanced fraud detection.</p>
              <div className="cta-buttons">
                <Link to="/billing-plan" className="upgrade-button">View Pricing Plans</Link>
              </div>
            </div>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ImprovementHub;
