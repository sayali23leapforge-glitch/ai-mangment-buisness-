import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "./AuthContext";

export type PlanTier = "free" | "growth" | "pro";

// Feature types
export type FeatureName = 
  | "multiCurrency" 
  | "offlineMode" 
  | "payrollIntegration"
  | "bankIntegration"
  | "fraudDetection"
  | "smartNotifications"
  | "advancedAnalytics"
  | "communityHub"
  | "multi_currency"
  | "offline_mode"
  | "payroll_integration"
  | "bank_integration"
  | "fraud_detection"
  | "smart_notifications"
  | "advanced_analytics"
  | "community_hub";

interface SubscriptionContextType {
  userPlan: PlanTier;
  userBillingCycle: "monthly" | "yearly" | null;
  subscriptionEndDate: Date | null;
  updateSubscription: (plan: string, cycle: string, endDate: string) => void;
  tier: PlanTier;
  canAccess: (feature: FeatureName) => boolean;
}

// Feature access matrix
const FEATURE_ACCESS: Record<PlanTier, FeatureName[]> = {
  free: [],
  growth: ["smartNotifications", "advancedAnalytics", "communityHub"],
  pro: ["multiCurrency", "offlineMode", "payrollIntegration", "bankIntegration", "fraudDetection", "smartNotifications", "advancedAnalytics", "communityHub"],
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userPlan, setUserPlan] = React.useState<PlanTier>("free");
  const [userBillingCycle, setUserBillingCycle] = React.useState<"monthly" | "yearly" | null>(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = React.useState<Date | null>(null);

  // Fetch user's actual plan from Firestore when component loads
  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const plan = data?.plan || "free";
          const cycle = data?.billing_cycle || null;
          const endDate = data?.subscription_end_date ? new Date(data.subscription_end_date) : null;

          setUserPlan(plan as PlanTier);
          setUserBillingCycle(cycle as "monthly" | "yearly" | null);
          setSubscriptionEndDate(endDate);

          console.log(`📊 SubscriptionContext loaded: ${plan} (${cycle})`);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      }
    };

    fetchUserPlan();
  }, [user?.uid]);

  const updateSubscription = (plan: string, cycle: string, endDate: string) => {
    setUserPlan(plan as PlanTier);
    setUserBillingCycle(cycle as "monthly" | "yearly");
    setSubscriptionEndDate(endDate ? new Date(endDate) : null);
  };

  const canAccess = (feature: FeatureName): boolean => {
    return FEATURE_ACCESS[userPlan].includes(feature);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        userPlan,
        userBillingCycle,
        subscriptionEndDate,
        updateSubscription,
        tier: userPlan,
        canAccess,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return context;
};
