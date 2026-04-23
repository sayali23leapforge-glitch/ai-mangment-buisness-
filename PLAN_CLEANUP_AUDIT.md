# Plan Cleanup Audit - "Free Trial" & "Free" Plan References

## Summary
Found **50+ references** to hardcoded "free" plan strings, "Free Trial" text, and trial-related descriptions that need cleanup.

---

## Files Requiring Cleanup

### 1. **Frontend Components**

#### [src/pages/BillingPlan.tsx](src/pages/BillingPlan.tsx)
**Type: Main billing page component**
**Total references: 28 lines**

**Plan Type Definitions & Initialization:**
- [Line 35](src/pages/BillingPlan.tsx#L35): `useState<"free" | "starter" | "growth" | "pro">("free")`
- [Line 336](src/pages/BillingPlan.tsx#L336): `setUserPlan(plan.id as "free" | "starter" | "growth" | "pro");`

**Plan Fetching & Validation:**
- [Line 48](src/pages/BillingPlan.tsx#L48): `const plan = data?.plan || "free";`
- [Line 53](src/pages/BillingPlan.tsx#L53): `if (plan !== "free" && endDate && endDate < new Date())`
- [Line 56](src/pages/BillingPlan.tsx#L56): `plan: "free",`
- [Line 61](src/pages/BillingPlan.tsx#L61): `setUserPlan("free");`
- [Line 66](src/pages/BillingPlan.tsx#L66): `if (plan !== "free" && !cycle)`

**Plan Configuration Object:**
- [Line 179](src/pages/BillingPlan.tsx#L179): `id: "free",` (Plan card configuration)
- [Line 180](src/pages/BillingPlan.tsx#L180): `name: "Free Trial",` ⚠️ **HARDCODED "Free Trial" NAME**
- [Line 183](src/pages/BillingPlan.tsx#L183): `description: "2 weeks free trial, then $15.99/month",` ⚠️ **Contains "free trial"**
- [Line 185](src/pages/BillingPlan.tsx#L185): `trialText: "14-day free trial",` ⚠️ **Contains "free trial"**
- [Line 196](src/pages/BillingPlan.tsx#L196): `button: "Start Free Trial",` ⚠️ **Contains "Free Trial"**
- [Line 207](src/pages/BillingPlan.tsx#L207): `description: "2 weeks free trial, then $15.99/month",` ⚠️ **Contains "free trial"**
- [Line 209](src/pages/BillingPlan.tsx#L209): `trialText: "14-day free trial",` ⚠️ **Contains "free trial"**
- [Line 211](src/pages/BillingPlan.tsx#L211): `"✓ Everything in Free Trial",` ⚠️ **References "Free Trial" plan**
- [Line 220](src/pages/BillingPlan.tsx#L220): `button: "Start Free Trial",` ⚠️ **Contains "Free Trial"**
- [Line 231](src/pages/BillingPlan.tsx#L231): `description: "1 week free trial, then auto-subscribe",` ⚠️ **Contains "free trial"**
- [Line 233](src/pages/BillingPlan.tsx#L233): `trialText: "7-day free trial",` ⚠️ **Contains "free trial"**
- [Line 247](src/pages/BillingPlan.tsx#L247): `button: "Start Free Trial",` ⚠️ **Contains "Free Trial"**
- [Line 259](src/pages/BillingPlan.tsx#L259): `description: "1 week free trial, then auto-subscribe",` ⚠️ **Contains "free trial"**
- [Line 261](src/pages/BillingPlan.tsx#L261): `trialText: "7-day free trial",` ⚠️ **Contains "free trial"**
- [Line 276](src/pages/BillingPlan.tsx#L276): `button: "Start Free Trial",` ⚠️ **Contains "Free Trial"**

**Plan Handling Logic:**
- [Line 293](src/pages/BillingPlan.tsx#L293): `if (plan.id === "free")` - Handles "Free Trial" plan click
- [Line 311](src/pages/BillingPlan.tsx#L311): `setSuccessMessage("✅ Free trial started! You have 14 days to experience Starter features.");`

**Conditional Rendering:**
- [Line 471](src/pages/BillingPlan.tsx#L471): `{userPlan !== "free" && (` - Checks if user is NOT on free plan
- [Line 520](src/pages/BillingPlan.tsx#L520): `const isCurrentPlan = plan.id !== "free" && isActive;`
- [Line 550](src/pages/BillingPlan.tsx#L550): `{billingCycle === "yearly" && plan.id !== "free" && (`
- [Line 557](src/pages/BillingPlan.tsx#L557): `disabled={plan.id === "free" || isCurrentPlan || loading}` - Disables "Free Trial" button

---

### 2. **Context & State Management**

#### [src/context/SubscriptionContext.tsx](src/context/SubscriptionContext.tsx)
**Type: Subscription context provider**
**Total references: 5 lines**

**Type Definition:**
- [Line 6](src/context/SubscriptionContext.tsx#L6): `export type PlanTier = "free" | "starter" | "growth" | "pro";`

**State Initialization:**
- [Line 50](src/context/SubscriptionContext.tsx#L50): `const [userPlan, setUserPlan] = React.useState<PlanTier>("free");`

**Plan Fetching & Expiration Logic:**
- [Line 65](src/context/SubscriptionContext.tsx#L65): `const plan = data?.plan || "free";`
- [Line 75](src/context/SubscriptionContext.tsx#L75): `if (plan !== "free" && endDate && endDate < now)`
- [Line 79](src/context/SubscriptionContext.tsx#L79): `} else if (plan !== "free" && endDate)`

---

### 3. **Custom Hooks**

#### [src/hooks/useUserPlan.ts](src/hooks/useUserPlan.ts)
**Type: User plan hook with helper methods**
**Total references: 6 lines**

**Default State:**
- [Line 22](src/hooks/useUserPlan.ts#L22): `plan: "free",` - Default user plan

**Plan Fetching:**
- [Line 65](src/hooks/useUserPlan.ts#L65): `plan: (data.plan || "free") as PlanType,`
- [Line 80](src/hooks/useUserPlan.ts#L80): `plan: "free",` - Fallback when user doc doesn't exist

**Helper Methods:**
- [Line 137](src/hooks/useUserPlan.ts#L137): `return planData.plan === "free" || planData.plan === "growth";` - `canUpgrade()`
- [Line 144](src/hooks/useUserPlan.ts#L144): `return planData.plan !== "free";` - `canDowngrade()`
- [Line 151](src/hooks/useUserPlan.ts#L151): `return planData.plan === "free";` - `isTrialOrFree()`

---

### 4. **API & Backend Functions**

#### [functions/stripe.ts](functions/stripe.ts)
**Type: Cloud functions for Stripe integration**
**Total references: 3 lines**

**Type Definition:**
- [Line 44](functions/stripe.ts#L44): `plan: "free" | "growth" | "pro";` - User interface plan types

**Downgrade/Cancel Logic:**
- [Line 352](functions/stripe.ts#L352): `plan: "free",` - Sets plan to "free" when subscription is cancelled
- [Line 364](functions/stripe.ts#L364): `plan: "free",` - Records billing history event when downgrading to "free"

---

## Issue Categories

### 🔴 CRITICAL: Hardcoded "Free Trial" Text
These strings appear directly to users and should be configurable:
- [BillingPlan.tsx:180](src/pages/BillingPlan.tsx#L180): Plan name `"Free Trial"`
- [BillingPlan.tsx:196](src/pages/BillingPlan.tsx#L196): Button text `"Start Free Trial"`
- [BillingPlan.tsx:220](src/pages/BillingPlan.tsx#L220): Button text `"Start Free Trial"`
- [BillingPlan.tsx:247](src/pages/BillingPlan.tsx#L247): Button text `"Start Free Trial"`
- [BillingPlan.tsx:276](src/pages/BillingPlan.tsx#L276): Button text `"Start Free Trial"`
- [BillingPlan.tsx:211](src/pages/BillingPlan.tsx#L211): Feature reference `"✓ Everything in Free Trial"`

### 🟠 HIGH: Hardcoded Trial Descriptions
These contain trial language that may be stale:
- [BillingPlan.tsx:183](src/pages/BillingPlan.tsx#L183): `"2 weeks free trial, then $15.99/month"`
- [BillingPlan.tsx:185](src/pages/BillingPlan.tsx#L185): `"14-day free trial"`
- [BillingPlan.tsx:207](src/pages/BillingPlan.tsx#L207): `"2 weeks free trial, then $15.99/month"`
- [BillingPlan.tsx:209](src/pages/BillingPlan.tsx#L209): `"14-day free trial"`
- [BillingPlan.tsx:231](src/pages/BillingPlan.tsx#L231): `"1 week free trial, then auto-subscribe"`
- [BillingPlan.tsx:233](src/pages/BillingPlan.tsx#L233): `"7-day free trial"`
- [BillingPlan.tsx:259](src/pages/BillingPlan.tsx#L259): `"1 week free trial, then auto-subscribe"`
- [BillingPlan.tsx:261](src/pages/BillingPlan.tsx#L261): `"7-day free trial"`
- [BillingPlan.tsx:311](src/pages/BillingPlan.tsx#L311): Success message with trial copy

### 🟡 MEDIUM: "Free" Plan ID String Comparisons
Plan ID comparisons with hardcoded strings:
- [BillingPlan.tsx:293](src/pages/BillingPlan.tsx#L293): `if (plan.id === "free")`
- [BillingPlan.tsx:520](src/pages/BillingPlan.tsx#L520): `plan.id !== "free"`
- [BillingPlan.tsx:550](src/pages/BillingPlan.tsx#L550): `plan.id !== "free"`
- [BillingPlan.tsx:557](src/pages/BillingPlan.tsx#L557): `plan.id === "free"`
- [SubscriptionContext.tsx:75](src/context/SubscriptionContext.tsx#L75): `plan !== "free"`
- [SubscriptionContext.tsx:79](src/context/SubscriptionContext.tsx#L79): `plan !== "free"`
- [useUserPlan.ts:137](src/hooks/useUserPlan.ts#L137): `planData.plan === "free"`
- [useUserPlan.ts:144](src/hooks/useUserPlan.ts#L144): `planData.plan !== "free"`
- [useUserPlan.ts:151](src/hooks/useUserPlan.ts#L151): `planData.plan === "free"`

### 🔵 LOW: Type Definitions & Initialization
Plan tier type definitions (should align with backend plan structure):
- [BillingPlan.tsx:35](src/pages/BillingPlan.tsx#L35): Type definition with "free"
- [BillingPlan.tsx:336](src/pages/BillingPlan.tsx#L336): Type cast with "free"
- [SubscriptionContext.tsx:6](src/context/SubscriptionContext.tsx#L6): PlanTier export includes "free"
- [SubscriptionContext.tsx:50](src/context/SubscriptionContext.tsx#L50): Default state "free"
- [useUserPlan.ts:22](src/hooks/useUserPlan.ts#L22): Default state "free"
- [stripe.ts:44](functions/stripe.ts#L44): User interface "free"

---

## Documentation References

Also mentioned in documentation files (but these are OK to leave as-is):
- [BILLING_PLAN_INTEGRATION_CHECKLIST.md:208](BILLING_PLAN_INTEGRATION_CHECKLIST.md#L208)
- [PRODUCTION_BILLING_FIX_VERIFICATION.md:60](PRODUCTION_BILLING_FIX_VERIFICATION.md#L60)
- ROOT_CAUSE_ANALYSIS.md (multiple references)
- STRIPE_ANALYSIS_REPORT.md (multiple references)

---

## Recommended Next Steps

1. **Extract "Free Trial" plan name to constants**
   - Create a plan configuration file (e.g., `src/config/planTiers.ts`)
   - Define plan names, descriptions, and button text as constants

2. **Create Plan Configuration Object**
   - Move hardcoded plan details from BillingPlan.tsx to a centralized config
   - Use Stripe metadata or backend plan definitions to source trial durations

3. **Add Plan Constants**
   - `PLAN_IDS` constant for `"free" | "starter" | "growth" | "pro"`
   - `PLAN_FREE_ID` constant for the free plan ID
   - `isFreePlan(planId)` utility function

4. **Backend Alignment**
   - Verify backend also defines the same plan IDs
   - Consider removing hardcoded trial copy from frontend (fetch from backend/Stripe)

5. **Testing Checklist**
   - Test all plan comparisons work with new constants
   - Verify "Free Trial" plan click flow
   - Test subscription cancellation → downgrade to free
   - Test all conditional renderings based on plan tier

