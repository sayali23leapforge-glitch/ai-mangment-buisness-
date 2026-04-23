/**
 * useUserPlan Hook
 * Manages user plan state and Firestore sync
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";

// Active user plans (excluding free/no-plan state)
export type ActivePlanType = "starter" | "growth" | "pro";

export interface UserPlanData {
  plan: ActivePlanType | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionUpdatedAt?: Date;
  loading: boolean;
  error: string | null;
}

const DEFAULT_STATE: UserPlanData = {
  plan: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  loading: true,
  error: null,
};

/**
 * Hook to get and listen to user's plan data from Firestore
 * 
 * @example
 * const planData = useUserPlan();
 * 
 * if (planData.loading) return <div>Loading...</div>;
 * 
 * return (
 *   <div>
 *     Current Plan: {planData.plan || 'None'}
 *     {planData.stripeSubscriptionId && <p>Active subscription</p>}
 *   </div>
 * );
 */
export function useUserPlan(): UserPlanData {
  const { user } = useAuth();
  const [planData, setPlanData] = useState<UserPlanData>(DEFAULT_STATE);

  useEffect(() => {
    if (!user?.uid) {
      setPlanData(DEFAULT_STATE);
      return;
    }

    let unsubscribe: Unsubscribe;

    try {
      // Real-time listener on users/{uid}
      unsubscribe = onSnapshot(
        doc(db, "users", user.uid),
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            
            // Only keep valid active plans, otherwise set to null
            const plan = (data.plan === "starter" || data.plan === "growth" || data.plan === "pro") 
              ? data.plan as ActivePlanType 
              : null;
            
            setPlanData({
              plan,
              stripeCustomerId: data.stripeCustomerId || null,
              stripeSubscriptionId: data.stripeSubscriptionId || null,
              subscriptionUpdatedAt: data.subscriptionUpdatedAt?.toDate(),
              loading: false,
              error: null,
            });

            console.log(
              `✅ Loaded user plan: ${plan || 'none'}, subscription: ${data.stripeSubscriptionId ? "active" : "none"}`
            );
          } else {
            // User document doesn't exist yet
            // This might happen for new users before first page load
            setPlanData({
              plan: null,
              stripeCustomerId: null,
              stripeSubscriptionId: null,
              loading: false,
              error: null,
            });
            console.log("ℹ️ User document not found, using default (no plan)");
          }
        },
        (error) => {
          console.error("❌ Error listening to user plan:", error);
          setPlanData((prev) => ({
            ...prev,
            loading: false,
            error: error.message || "Failed to load plan data",
          }));
        }
      );
    } catch (error: any) {
      console.error("❌ Error setting up plan listener:", error);
      setPlanData((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to set up plan listener",
      }));
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  return planData;
}

/**
 * Extended hook with helper methods
 */
export function useUserPlanWithHelpers() {
  const planData = useUserPlan();

  return {
    ...planData,
    
    /**
     * Check if user has an active subscription
     */
    hasActiveSubscription(): boolean {
      return !!planData.stripeSubscriptionId;
    },

    /**
     * Check if user can upgrade
     */
    canUpgrade(): boolean {
      return planData.plan === null || planData.plan === "starter" || planData.plan === "growth";
    },

    /**
     * Check if user can downgrade
     */
    canDowngrade(): boolean {
      return planData.plan !== null;
    },

    /**
     * Check if user is on trial or needs to choose a plan
     */
    isTrialOrFree(): boolean {
      return planData.plan === null;
    },

    /**
     * Get upgrade options from current plan
     */
    getUpgradeOptions(): ActivePlanType[] {
      switch (planData.plan) {
        case null:
          return ["starter", "growth", "pro"];
        case "starter":
          return ["growth", "pro"];
        case "growth":
          return ["pro"];
        case "pro":
          return [];
        default:
          return [];
      }
    },
  };
}
