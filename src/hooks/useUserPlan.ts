/**
 * useUserPlan Hook
 * Manages user plan state and Firestore sync
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { PlanType } from "../utils/stripeUtils";

export interface UserPlanData {
  plan: PlanType;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionUpdatedAt?: Date;
  loading: boolean;
  error: string | null;
}

const DEFAULT_STATE: UserPlanData = {
  plan: "free",
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
 *     Current Plan: {planData.plan}
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
            
            setPlanData({
              plan: (data.plan || "free") as PlanType,
              stripeCustomerId: data.stripeCustomerId || null,
              stripeSubscriptionId: data.stripeSubscriptionId || null,
              subscriptionUpdatedAt: data.subscriptionUpdatedAt?.toDate(),
              loading: false,
              error: null,
            });

            console.log(
              `✅ Loaded user plan: ${data.plan}, subscription: ${data.stripeSubscriptionId ? "active" : "none"}`
            );
          } else {
            // User document doesn't exist yet
            // This might happen for new users before first page load
            setPlanData({
              plan: "free",
              stripeCustomerId: null,
              stripeSubscriptionId: null,
              loading: false,
              error: null,
            });
            console.log("ℹ️ User document not found, using default free plan");
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
      return planData.plan === "free" || planData.plan === "growth";
    },

    /**
     * Check if user can downgrade
     */
    canDowngrade(): boolean {
      return planData.plan !== "free";
    },

    /**
     * Check if user is on trial or free tier
     */
    isTrialOrFree(): boolean {
      return planData.plan === "free";
    },

    /**
     * Get upgrade options from current plan
     */
    getUpgradeOptions(): ("growth" | "pro")[] {
      switch (planData.plan) {
        case "free":
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
