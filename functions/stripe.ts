/**
 * Firebase Cloud Functions for Stripe Integration
 * 
 * REQUIREMENTS:
 * - Deploy with: firebase deploy --only functions
 * - Set environment variables before deploying:
 *   - firebase functions:config:set stripe.secret_key="sk_live_..."
 *   - firebase functions:config:set stripe.webhook_secret="whsec_..."
 *   - firebase functions:config:set app.domain="https://yourdomain.com"
 * 
 * STRIPE PRICE IDs (from Stripe Dashboard):
 * - GROWTH_MONTHLY: price_1ABC...
 * - GROWTH_YEARLY: price_2ABC...
 * - PRO_MONTHLY: price_3ABC...
 * - PRO_YEARLY: price_4ABC...
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Initialize Stripe with Secret Key
const stripe = new Stripe(functions.config().stripe?.secret_key || "", {
  apiVersion: "2023-10-16",
});

// ============ INTERFACES ============

interface CreateCheckoutSessionRequest {
  uid: string;
  priceId: string;
  billingCycle: "monthly" | "yearly";
}

interface User {
  email: string;
  plan: "free" | "growth" | "pro";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

// ============ CLOUD FUNCTION 1: Create Checkout Session ============

/**
 * Creates a Stripe Checkout Session for subscription upgrade
 * Called by frontend when user clicks upgrade button
 * 
 * Flow:
 * 1. Get user from Firestore
 * 2. Create or get Stripe Customer
 * 3. Create Checkout Session
 * 4. Return session URL
 */
export const createCheckoutSession = functions.https.onCall(
  async (request: CreateCheckoutSessionRequest, context) => {
    // Security: Must be authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const { uid, priceId, billingCycle } = request;

    // Security: Can only create session for own uid
    if (uid !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Cannot create session for another user"
      );
    }

    try {
      // Step 1: Get user document
      const userDoc = await db.collection("users").doc(uid).get();
      
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "User document not found"
        );
      }

      const user = userDoc.data() as User;
      let stripeCustomerId = user.stripeCustomerId;

      // Step 2: Create Stripe Customer if doesn't exist
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            firebaseUid: uid,
          },
        });
        
        stripeCustomerId = customer.id;

        // Save Stripe Customer ID to Firestore
        await db.collection("users").doc(uid).update({
          stripeCustomerId: stripeCustomerId,
        });

        console.log(`✅ Created Stripe Customer: ${stripeCustomerId} for user: ${uid}`);
      }

      // Step 3: Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${functions.config().app?.domain}/billing-plan?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${functions.config().app?.domain}/billing-plan?canceled=true`,
        metadata: {
          firebaseUid: uid,
          billingCycle: billingCycle,
        },
      });

      console.log(
        `✅ Created Checkout Session: ${session.id} for user: ${uid}, priceId: ${priceId}`
      );

      return {
        sessionUrl: session.url,
        sessionId: session.id,
      };
    } catch (error: any) {
      console.error("❌ Error creating checkout session:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to create checkout session: ${error.message}`
      );
    }
  }
);

// ============ CLOUD FUNCTION 2: Stripe Webhook Handler ============

/**
 * Handles Stripe webhook events
 * 
 * Events handled:
 * - checkout.session.completed: User paid, create subscription
 * - invoice.paid: Subscription payment received
 * - customer.subscription.deleted: Subscription cancelled, downgrade to free
 * 
 * Deployment:
 * After deploying, get the function URL and add to Stripe webhook settings:
 * Events: checkout.session.completed, invoice.paid, customer.subscription.deleted
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    // Verify Stripe signature
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      functions.config().stripe?.webhook_secret || ""
    );
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📨 Received Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;

      default:
        console.log(`⏭️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("❌ Error processing webhook:", error);
    res.status(500).send(`Webhook processing error: ${error.message}`);
  }
});

// ============ WEBHOOK HANDLERS ============

/**
 * Handle checkout.session.completed
 * User successfully paid for subscription
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  if (!session.customer || !session.subscription) {
    console.log(
      "⏭️ Skipping: Missing customer or subscription in session"
    );
    return;
  }

  try {
    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    const priceId = subscription.items.data[0]?.price.id;
    const firebaseUid = session.metadata?.firebaseUid;

    if (!firebaseUid) {
      throw new Error("Missing firebaseUid in session metadata");
    }

    // Determine plan based on priceId
    const plan = await determinePlanFromPrice(priceId);

    // Update Firestore user document
    await db.collection("users").doc(firebaseUid).update({
      plan,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: session.customer,
      subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `✅ Updated user ${firebaseUid} to plan: ${plan}, subscriptionId: ${subscription.id}`
    );

    // Create billing activity log
    await db
      .collection("users")
      .doc(firebaseUid)
      .collection("billingHistory")
      .add({
        event: "subscription_created",
        plan,
        amount: subscription.items.data[0]?.price.unit_amount || 0,
        currency: subscription.currency,
        subscriptionId: subscription.id,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
  } catch (error: any) {
    console.error("❌ Error handling checkout.session.completed:", error);
    throw error;
  }
}

/**
 * Handle invoice.paid
 * Recurring subscription payment received
 */
async function handleInvoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;

  if (!invoice.customer || !invoice.subscription) {
    console.log("⏭️ Skipping: Missing customer or subscription in invoice");
    return;
  }

  try {
    // Get customer metadata to find user
    const customer = await stripe.customers.retrieve(invoice.customer as string);
    
    if (!customer || customer.deleted) {
      throw new Error("Customer not found or deleted");
    }

    const firebaseUid = (customer as any).metadata?.firebaseUid;

    if (!firebaseUid) {
      throw new Error("Missing firebaseUid in customer metadata");
    }

    // Create billing activity log
    await db
      .collection("users")
      .doc(firebaseUid)
      .collection("billingHistory")
      .add({
        event: "invoice_paid",
        amount: invoice.amount_paid,
        currency: invoice.currency,
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        paidAt: new Date(invoice.paid * 1000),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(
      `✅ Logged invoice payment for user: ${firebaseUid}, invoiceId: ${invoice.id}`
    );
  } catch (error: any) {
    console.error("❌ Error handling invoice.paid:", error);
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted
 * User cancelled subscription - downgrade to free
 */
async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  if (!subscription.customer) {
    console.log("⏭️ Skipping: Missing customer in subscription");
    return;
  }

  try {
    // Get customer metadata
    const customer = await stripe.customers.retrieve(
      subscription.customer as string
    );

    if (!customer || customer.deleted) {
      throw new Error("Customer not found or deleted");
    }

    const firebaseUid = (customer as any).metadata?.firebaseUid;

    if (!firebaseUid) {
      throw new Error("Missing firebaseUid in customer metadata");
    }

    // Downgrade user to free plan
    await db.collection("users").doc(firebaseUid).update({
      plan: "free",
      stripeSubscriptionId: null,
      subscriptionCancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create billing activity log
    await db
      .collection("users")
      .doc(firebaseUid)
      .collection("billingHistory")
      .add({
        event: "subscription_cancelled",
        plan: "free",
        subscriptionId: subscription.id,
        cancelledAt: new Date(subscription.canceled_at! * 1000),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(
      `✅ Downgraded user ${firebaseUid} to free plan, subscriptionId: ${subscription.id}`
    );
  } catch (error: any) {
    console.error("❌ Error handling customer.subscription.deleted:", error);
    throw error;
  }
}

// ============ HELPER FUNCTIONS ============

/**
 * Determine plan type from Stripe price ID
 * Update PRICE_MAP with your actual Stripe price IDs from dashboard
 */
async function determinePlanFromPrice(priceId: string): Promise<"growth" | "pro"> {
  // Map Stripe Price IDs to plans
  // Get these from your Stripe Dashboard > Products
  const PRICE_MAP: Record<string, "growth" | "pro"> = {
    "price_1T4HotHVEVbQywP80VcSmqP6": "growth", // Growth Monthly
    "price_1T4Hv9HVEVbQywP8iI9TkP81": "growth", // Growth Yearly
    "price_1T4HrMHVEVbQywP8105KbPGA": "pro",   // Pro Monthly
    "price_1T4I18HVEVbQywP8GrJXkTLu": "pro",   // Pro Yearly
  };

  const plan = PRICE_MAP[priceId];

  if (!plan) {
    throw new Error(`Unknown priceId: ${priceId}`);
  }

  return plan;
}
