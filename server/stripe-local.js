/**
 * Local Stripe Server for Testing
 * Run this locally with: node server/stripe-local.js
 * 
 * This handles Stripe payments locally WITHOUT Cloud Functions
 * Perfect for testing before deploying to Render
 */

const express = require('express');
const cors = require('cors');
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const stripe = require('stripe')(STRIPE_SECRET_KEY);

// Firebase SDK (REST API for Firestore)
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Price mapping (TEST Price IDs)
const PRICE_MAP = {
  'price_1T4J2PHVEVbQywP8qurSZEOe': 'growth', // Growth Monthly
  'price_1T4J3NHVEVbQywP89BCLJZtJ': 'growth', // Growth Yearly
  'price_1T4J4LHVEVbQywP87Otl6q7Q': 'pro',    // Pro Monthly
  'price_1T4J54HVEVbQywP84JDUG7Ee': 'pro',    // Pro Yearly
};

// Firebase REST API helper
const FIREBASE_PROJECT_ID = 'ai-buisness-managment-d90e0';

async function updateUserPlanInFirestore(uid, plan, stripeCustomerId, stripeSubscriptionId) {
  try {
    const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
    
    const response = await fetch(firebaseUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          plan: { stringValue: plan },
          stripeCustomerId: { stringValue: stripeCustomerId },
          stripeSubscriptionId: { stringValue: stripeSubscriptionId },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });

    if (!response.ok) {
      console.error(`❌ Firestore update failed: ${response.status}`);
      return false;
    }

    console.log(`✅ Firestore updated! User ${uid} now has plan: ${plan}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating Firestore:', error.message);
    return false;
  }
}

console.log('🚀 Local Stripe Server Starting on http://localhost:3001');

// ============ CREATE CHECKOUT SESSION ============
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { uid, priceId, billingCycle } = req.body;

    console.log(`✅ Creating checkout session: ${priceId} (${billingCycle})`);

    // Determine the plan from priceId
    const plan = PRICE_MAP[priceId] || 'free';
    console.log(`📋 Plan: ${plan}`);

    // Create or retrieve Stripe customer (required for Accounts V2)
    let customerId;
    
    try {
      // Search for existing customer by metadata
      const customers = await stripe.customers.list({
        limit: 100,
      });
      
      const existingCustomer = customers.data.find(c => 
        c.metadata?.firebaseUid === uid
      );
      
      if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log(`✅ Found existing Stripe customer: ${customerId}`);
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: `user-${uid}@test.example.com`,
          metadata: {
            firebaseUid: uid,
            plan: plan,
            createdAt: new Date().toISOString(),
          },
        });
        customerId = customer.id;
        console.log(`✅ Created new Stripe customer: ${customerId}`);
      }
    } catch (customerError) {
      console.error('⚠️ Error managing customer:', customerError.message);
      throw customerError;
    }

    // Create checkout session with customer
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `http://localhost:3000/billing-plan?success=true&plan=${plan}&cycle=${billingCycle}`,
      cancel_url: 'http://localhost:3000/billing-plan?canceled=true',
      metadata: {
        firebaseUid: uid,
        plan: plan,
        billingCycle: billingCycle,
      },
    });

    console.log(`✅ Checkout session created: ${session.id}`);
    console.log(`📍 Session URL: ${session.url}`);

    res.json({
      sessionUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error.message);
    res.status(500).json({
      error: error.message,
    });
  }
});

// ============ WEBHOOK FOR LOCAL TESTING ============
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // NOTE: In production, you'd verify the signature
    // For local testing, we just parse the event directly
    event = JSON.parse(req.body);

    console.log(`\n📥 Webhook Event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('✅ Payment succeeded!');
        console.log(`📊 Customer: ${event.data.object.customer}`);
        console.log(`💳 Subscription: ${event.data.object.subscription}`);
        
        // Get the checkout session to extract metadata
        const session = event.data.object;
        const { metadata, subscription } = session;
        const { firebaseUid } = metadata || {};
        
        if (firebaseUid && subscription) {
          // Get the subscription to find the price
          const sub = await stripe.subscriptions.retrieve(subscription);
          const priceId = sub.items.data[0]?.price.id;
          const plan = PRICE_MAP[priceId] || 'free';
          
          console.log(`🔄 Updating Firestore for user ${firebaseUid} to plan: ${plan}`);
          
          // Update Firestore with new plan
          await updateUserPlanInFirestore(firebaseUid, plan, session.customer, subscription);
        }
        break;

      case 'customer.subscription.updated':
        console.log('✅ Subscription updated');
        break;

      case 'invoice.payment_succeeded':
        console.log('✅ Invoice paid');
        break;

      default:
        console.log(`ℹ️  Event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// ============ HEALTH CHECK ============
// ============ SHOPIFY OAUTH MOCKS ============
app.get('/api/shopify/oauth/start', (req, res) => {
  const { shop, userId } = req.query;
  
  if (!shop || !userId) {
    return res.status(400).json({ error: 'Missing shop or userId' });
  }

  console.log(`🛒 Shopify OAuth Start: shop=${shop}, userId=${userId}`);

  // For demo: redirect to Shopify install page or mock approval
  const mockAuthUrl = `https://nayance-dev.myshopify.com/admin/oauth/authorize?client_id=test&scope=read_products,read_orders&redirect_uri=${encodeURIComponent(
    'http://localhost:3000/shopify-callback'
  )}`;

  res.json({
    url: mockAuthUrl,
    shop,
    message: 'Redirecting to Shopify for authorization...'
  });
});

app.post('/api/shopify/oauth/callback', async (req, res) => {
  const { code, shop, userId } = req.body;

  if (!code || !shop || !userId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  console.log(`✅ Shopify OAuth Callback: shop=${shop}, userId=${userId}`);

  try {
    // Store Shopify connection in Firestore
    const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/shopify_connections/${userId}`;
    
    const firebaseResponse = await fetch(firebaseUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          shop: { stringValue: shop },
          code: { stringValue: code },
          connected: { booleanValue: true },
          connectedAt: { timestampValue: new Date().toISOString() },
          userId: { stringValue: userId },
        },
      }),
    });

    if (!firebaseResponse.ok) {
      console.error('❌ Failed to save Shopify connection');
      return res.status(500).json({ error: 'Failed to save connection' });
    }

    res.json({
      success: true,
      shop,
      message: 'Shopify connected successfully'
    });
  } catch (error) {
    console.error('❌ Shopify callback error:', error);
    res.status(500).json({ error: 'Connection failed' });
  }
});

app.get('/api/shopify/status', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/shopify_connections/${userId}`;
    
    const firebaseResponse = await fetch(firebaseUrl);

    if (firebaseResponse.ok) {
      const data = await firebaseResponse.json();
      res.json({ 
        connected: true,
        status: data.fields
      });
    } else {
      res.json({ 
        connected: false,
        message: 'No Shopify connection found'
      });
    }
  } catch (error) {
    console.error('❌ Shopify status error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    stripeKey: STRIPE_SECRET_KEY ? `configured (${STRIPE_SECRET_KEY.slice(0, 8)}...)` : 'not-configured',
  });
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Local Stripe Server Running`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📝 Create Checkout: POST http://localhost:${PORT}/create-checkout-session`);
  console.log(`🪝 Webhook: POST http://localhost:${PORT}/stripe-webhook`);
  console.log(`❤️  Health: GET http://localhost:${PORT}/health`);
  console.log(`${'='.repeat(50)}\n`);
});
