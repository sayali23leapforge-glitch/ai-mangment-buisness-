const express = require("express");
const stripe = require("stripe");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const path = require("path");
const quickbooksRoutes = require("./routes/quickbooksRoutes");
const shopifyRoutes = require("./routes/shopifyRoutes");
const { db: firestore } = require("./firebase"); // Import Firestore

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Try to use PORT, if it fails try another
const server = app.listen(PORT, () => {
  console.log(`\n🚀🚀🚀 STRIPE EXPRESS SERVER RUNNING ON PORT ${PORT} 🚀🚀🚀`);
  console.log(`📝 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`📍 Create checkout: http://localhost:${PORT}/create-checkout-session`);
  
  // Log all registered routes
  setTimeout(() => {
    console.log(`\n📋 Registered Express Routes:`);
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(', ');
        console.log(`   [${methods}] ${middleware.route.path}`);
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler) => {
          const route = handler.route;
          if (route) {
            const methods = Object.keys(route.methods).map(m => m.toUpperCase()).join(', ');
            console.log(`   [${methods}] ${route.path}`);
          }
        });
      }
    });
    console.log('');
  }, 100);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} in use, trying port 5000...`);
    app.listen(5000, () => {
      console.log(`🚀 Stripe server running on http://localhost:5000`);
      console.log(`📝 Webhook endpoint: http://localhost:5000/webhook`);
    });
  }
});

// Stripe initialization
// Uses env key in production; placeholder fallback for local boot without exposing secrets
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
let stripeClient;

if (!STRIPE_SECRET_KEY) {
  console.error("\n❌ CRITICAL: Stripe Secret Key is NOT configured!");
  console.error("📝 Payment processing WILL FAIL until STRIPE_SECRET_KEY is set in Render environment");
  console.error("🔧 Action: Set STRIPE_SECRET_KEY in Render Dashboard → Environment\n");
  stripeClient = null;
} else {
  const keyStart = STRIPE_SECRET_KEY.substring(0, 7);
  const keyEnd = STRIPE_SECRET_KEY.substring(STRIPE_SECRET_KEY.length - 4);
  console.log("\n✅ Stripe is configured and ready!");
  console.log(`🔑 Using Stripe API key: ${keyStart}...${keyEnd} (starts with 'sk_live' or 'sk_test')`);
}

// Check other critical env variables
const CLIENT_DOMAIN = process.env.CLIENT_DOMAIN;
const NODE_ENV = process.env.NODE_ENV;
console.log(`\n🌍 Environment Config:`);
console.log(`   NODE_ENV: ${NODE_ENV}`);
console.log(`   PORT: ${PORT}`);
console.log(`   CLIENT_DOMAIN: ${CLIENT_DOMAIN || 'NOT SET (will use req.headers.origin)'}`);
console.log(`   Stripe Configured: ${!!STRIPE_SECRET_KEY ? 'YES' : 'NO'}\n`);

// Initialize Stripe client (only if key exists)
if (STRIPE_SECRET_KEY) {
  try {
    stripeClient = stripe(STRIPE_SECRET_KEY);
  } catch (err) {
    console.error(`❌ Failed to initialize Stripe: ${err.message}`);
    stripeClient = null;
  }
}

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow all localhost ports and specified domains
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin === process.env.CLIENT_DOMAIN) {
      callback(null, true);
    } else {
      callback(null, true); // Allow for development - can be more restrictive in production
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Body parser middleware - important for webhook and large image uploads
app.use(express.json({ limit: "50mb" })); // Allow up to 50MB for base64 images

// DIAGNOSTIC: Ultra-simple test endpoint
app.get("/api-test", (req, res) => {
  res.status(200).send("✅ EXPRESS STRIPE SERVER IS RUNNING - API ROUTES ARE WORKING");
});

// Store raw body for webhook verification
app.use((req, res, next) => {
  if (req.path === "/webhook") {
    let rawBody = "";
    req.setEncoding("utf8");
    req.on("data", chunk => {
      rawBody += chunk;
    });
    req.on("end", () => {
      req.rawBody = rawBody;
      next();
    });
  } else {
    next();
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// DIAGNOSTIC: POST endpoint - prove we're running the STRIPE server, not Square
// Using POST instead of GET to avoid being caught by static middleware
app.post("/server-identity", (req, res) => {
  res.json({ 
    server: "STRIPE-EXPRESS-BILLING-SERVER",
    timestamp: new Date().toISOString(),
    port: PORT,
    nodeEnv: process.env.NODE_ENV,
    stripeConfigured: !!STRIPE_SECRET_KEY,
    message: "✅ If you see this, the EXPRESS STRIPE server is running correctly"
  });
});

// Integrations access check - Always allow (tier gating happens on frontend)
app.get("/api/integrations/access", async (req, res) => {
  res.json({ 
    allowed: true,
    message: "Integrations access granted",
    tier: "growth" 
  });
});

// Diagnostic endpoint - verify checkout route is accessible
app.get("/health/checkout", async (req, res) => {
  res.json({
    status: "OK",
    endpoint: "/create-checkout-session",
    method: "POST",
    stripeConfigured: !!STRIPE_SECRET_KEY,
    environment: process.env.NODE_ENV,
    port: PORT,
    message: "Checkout endpoint is registered and accessible. Send POST request to /create-checkout-session"
  });
});

// Demo checkout endpoint (for testing without valid Stripe price IDs)
app.post("/demo-checkout-session", async (req, res) => {
  try {
    const { uid, plan, billingCycle } = req.body;
    
    if (!uid || !plan || !billingCycle) {
      return res.status(400).json({
        error: "Missing required fields: uid, plan, billingCycle",
      });
    }

    const origin = req.headers.origin || process.env.CLIENT_DOMAIN || "http://localhost:3000";
    const successUrl = `${origin}/billing-plan?success=true&plan=${plan}&cycle=${billingCycle}`;

    console.log(`📝 Demo checkout for:`, { uid, plan, billingCycle });

    // Return a mock Stripe session URL (redirects back to success page)
    res.json({ 
      sessionUrl: successUrl,
      sessionId: `demo_${uid}_${Date.now()}`,
      isDemoMode: true,
    });
  } catch (error) {
    console.error("❌ Demo checkout error:", error);
    res.status(500).json({
      error: error.message || "Failed to create demo checkout session",
    });
  }
});

// ⭐ CREATE CHECKOUT SESSION - MOVED HERE TO RUN BEFORE STATIC MIDDLEWARE ⭐
app.post("/create-checkout-session", async (req, res) => {
  const requestId = `REQ-${Date.now()}`;
  try {
    // Check if Stripe is configured
    if (!stripeClient || !STRIPE_SECRET_KEY) {
      console.error(`[${requestId}] ❌ Stripe not configured - secret key missing`);
      return res.status(503).json({
        error: "Payment system not configured. Please contact support.",
        details: "STRIPE_SECRET_KEY not set in environment",
        requestId
      });
    }

    const { uid, priceId, billingCycle, plan } = req.body;
    const origin = req.headers.origin;
    
    console.log(`\n[${requestId}] 📍 Checkout session request received`);
    console.log(`   Origin: ${origin}`);
    console.log(`   Payload: uid=${uid}, priceId=${priceId}, billingCycle=${billingCycle}, plan=${plan}`);
    console.log(`   Stripe Key Status: ${STRIPE_SECRET_KEY ? 'CONFIGURED' : 'MISSING'}\n`);

    if (!uid || !priceId || !billingCycle) {
      console.warn("❌ Missing fields in request");
      return res.status(400).json({
        error: "Missing required fields: uid, priceId, billingCycle",
      });
    }

    console.log(`[${requestId}] 💳 Creating Stripe checkout session...`);
    
    let customerEmail = "customer@example.com";

    // Try to get user email from Firestore if available
    if (firestore && firestore.collection) {
      try {
        const userDoc = await firestore.collection("users").doc(uid).get();
        if (userDoc.exists()) {
          const userData = userDoc.data();
          customerEmail = userData?.email || userData?.emailAddress || customerEmail;
        }
      } catch (error) {
        console.warn("⚠️ Could not fetch user from Firestore:", error.message);
      }
    }

    // Get the origin from request headers, fallback to CLIENT_DOMAIN env var, or localhost for dev
    // NOTE: 'origin' was already declared at line 501, reusing it
    const successUrl = `${origin}/billing-plan?success=true&plan=${plan || extractPlanFromPrice(priceId)}&cycle=${billingCycle}`;
    const cancelUrl = `${origin}/billing-plan`;

    console.log(`[${requestId}] 📝 Session config:`);
    console.log(`   Customer Email: ${customerEmail}`);
    console.log(`   Price ID: ${priceId}`);
    console.log(`   Billing Cycle: ${billingCycle}`);
    console.log(`   Success URL: ${successUrl}`);
    console.log(`   Cancel URL: ${cancelUrl}`);

    // Validate price ID format
    if (!priceId.startsWith("price_")) {
      console.warn("⚠️ Invalid price ID format:", priceId);
      return res.status(400).json({
        error: "Invalid price ID format. Expected format: price_xxxxx",
      });
    }

    try {
      // Step 1: Create or retrieve Stripe customer (required for Accounts V2)
      let customerId;
      
      try {
        // Search for existing customer by email
        const customers = await stripeClient.customers.list({
          email: customerEmail,
          limit: 1,
        });
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          console.log(`✅ Found existing Stripe customer: ${customerId}`);
        } else {
          // Create new customer
          const customer = await stripeClient.customers.create({
            email: customerEmail,
            metadata: {
              uid,
              createdAt: new Date().toISOString(),
            },
          });
          customerId = customer.id;
          console.log(`✅ Created new Stripe customer: ${customerId}`);
        }
      } catch (customerError) {
        console.error("⚠️ Could not manage customer, will attempt checkout anyway:", customerError.message);
        // Continue without customer - may fail with V2 accounts
      }

      // Step 2: Create checkout session with customer ID
      const sessionParams = {
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          uid,
          billingCycle,
        },
        allow_promotion_codes: true,
        billing_address_collection: "auto",
      };

      // Add customer ID if available
      if (customerId) {
        sessionParams.customer = customerId;
      } else {
        // Fallback for older Stripe setups
        sessionParams.customer_email = customerEmail;
      }

      const session = await stripeClient.checkout.sessions.create(sessionParams);

      console.log(`[${requestId}] ✅ Stripe session created successfully`);
      console.log(`   Session ID: ${session.id}`);
      console.log(`   Customer ID: ${customerId}`);
      console.log(`   URL: ${session.url}\n`);

      res.json({ 
        sessionUrl: session.url,
        sessionId: session.id,
        isDemoMode: false,
        requestId
      });
    } catch (stripeError) {
      console.error(`[${requestId}] ❌ STRIPE ERROR - FULL DETAILS:`);
      console.error("   Message:", stripeError.message);
      console.error("   Type:", stripeError.type);
      console.error("   Status Code:", stripeError.statusCode);
      console.error("   Param:", stripeError.param);

      let errorMsg = "Stripe Error: ";
      let statusCode = 500;

      if (stripeError.message.includes("No such price")) {
        errorMsg = `❌ Price ID '${priceId}' not found in Stripe account.\n`;
        errorMsg += "Please verify this price ID exists in your Stripe Dashboard under Products & Prices.";
        statusCode = 400;
      } else if (stripeError.message.includes("Invalid API Key") || stripeError.message.includes("authentication")) {
        errorMsg = "Stripe API key is invalid or expired. Check your .env configuration.";
        statusCode = 400;
      } else if (stripeError.statusCode === 401) {
        errorMsg = "Stripe authentication failed. Invalid API key.";
        statusCode = 400;
      } else {
        errorMsg += stripeError.message;
      }

      console.log(`[${requestId}] 📤 Sending error response: ${statusCode}\n`);

      res.status(statusCode).json({ 
        error: errorMsg,
        stripeErrorMessage: stripeError.message,
        stripeErrorType: stripeError.type,
        priceIdTested: priceId,
        requestId
      });
    }
  } catch (error) {
    console.error(`[${requestId}] ❌ Checkout session error:`, error.message);
    res.status(500).json({
      error: error.message || "Failed to create checkout session",
      requestId
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/health", (req, res) => {
  res.json({ status: "ok", received: "POST", timestamp: new Date().toISOString() });
});

app.get("/api-status", (req, res) => {
  res.json({ 
    status: "ok",
    message: "Payment API is running",
    port: PORT,
    nodeEnv: process.env.NODE_ENV,
    stripeConfigured: !!STRIPE_SECRET_KEY,
    timestamp: new Date().toISOString()
  });
});

// QuickBooks routes
app.use("/api/quickbooks", quickbooksRoutes);

// Shopify routes
app.use("/api/shopify", shopifyRoutes);

// Test Shopify connection endpoint
app.post("/api/shopify/test", async (req, res) => {
  try {
    const { shopUrl, accessToken } = req.body;

    if (!shopUrl || !accessToken) {
      return res.status(400).json({ error: "Missing shopUrl or accessToken" });
    }

    // Format shop URL
    let formattedShopUrl = shopUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!formattedShopUrl.includes(".myshopify.com") && !formattedShopUrl.includes(".")) {
      formattedShopUrl = `${formattedShopUrl}.myshopify.com`;
    }

    console.log("Testing Shopify connection for:", formattedShopUrl);

    // Test the connection by fetching shop info (works with valid token, no special scope needed)
    const response = await axios.get(
      `https://${formattedShopUrl}/admin/api/2024-01/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    console.log("Shopify connection successful for:", response.data.shop?.name);
    res.json({
      success: true,
      shop: response.data.shop,
      message: "Shopify connection successful",
    });
  } catch (error) {
    const statusCode = error.response?.status || 401;
    const errorMsg = error.response?.data?.errors || error.message;
    
    console.error("Shopify test error:", {
      status: statusCode,
      message: errorMsg,
      url: error.config?.url,
    });
    
    res.status(statusCode).json({
      error: "Failed to connect to Shopify. Please verify your store URL and access token.",
      details: errorMsg,
    });
  }
});

// Fetch Shopify Products endpoint (with pagination support)
app.post("/api/shopify/products", async (req, res) => {
  try {
    const { shopUrl, accessToken } = req.body;

    if (!shopUrl || !accessToken) {
      return res.status(400).json({ error: "Missing shopUrl or accessToken" });
    }

    let formattedShopUrl = shopUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!formattedShopUrl.includes(".myshopify.com") && !formattedShopUrl.includes(".")) {
      formattedShopUrl = `${formattedShopUrl}.myshopify.com`;
    }

    let allProducts = [];
    let cursor = null;
    let hasNextPage = true;

    // Fetch all products with pagination
    while (hasNextPage) {
      let url = `https://${formattedShopUrl}/admin/api/2024-01/products.json?limit=250&fields=id,title,handle,bodyHtml,vendor,productType,createdAt,updatedAt,publishedAt,image,images,variants`;
      if (cursor) {
        url += `&after=${cursor}`;
      }

      const response = await axios.get(url, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      const products = response.data.products || [];
      
      // Fetch inventory levels for each product's variants
      for (const product of products) {
        if (product.variants && product.variants.length > 0) {
          for (const variant of product.variants) {
            try {
              const inventoryUrl = `https://${formattedShopUrl}/admin/api/2024-01/variants/${variant.id}.json`;
              const inventoryResponse = await axios.get(inventoryUrl, {
                headers: {
                  "X-Shopify-Access-Token": accessToken,
                  "Content-Type": "application/json",
                },
              });
              const variantData = inventoryResponse.data.variant;
              variant.inventory_quantity = variantData.inventory_quantity || 0;
              variant.stock = variantData.inventory_quantity || 0;
              variant.price = variantData.price || 0;
              variant.cost = variantData.cost || 0;
              console.log(`📦 Variant ${variant.id}: price=$${variant.price}, inventory=${variant.inventory_quantity}`);
            } catch (inventoryError) {
              console.error(`Failed to fetch inventory for variant ${variant.id}:`, inventoryError.message);
              variant.inventory_quantity = 0;
              variant.stock = 0;
            }
          }
        }
      }
      
      allProducts = allProducts.concat(products);

      // Check if there's a next page
      const linkHeader = response.headers.link || "";
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      
      if (nextMatch) {
        const nextUrl = nextMatch[1];
        const afterMatch = nextUrl.match(/after=([^&]+)/);
        cursor = afterMatch ? afterMatch[1] : null;
        hasNextPage = !!cursor;
      } else {
        hasNextPage = false;
      }
    }

    console.log(`✅ Fetched ${allProducts.length} products from Shopify (with pagination)`);
    
    // Log all products with real data
    allProducts.forEach((product, idx) => {
      const variant = product.variants?.[0];
      console.log(`[${idx + 1}] ${product.title}: Price=$${variant?.price || 0}, Stock=${variant?.inventory_quantity || variant?.stock || 0}, Cost=$${variant?.cost || 0}`);
    });

    res.json({
      success: true,
      products: allProducts,
    });
  } catch (error) {
    const statusCode = error.response?.status || 401;
    console.error("Shopify products fetch error:", error.message);
    res.status(statusCode).json({
      error: "Failed to fetch products from Shopify",
      details: error.message,
    });
  }
});

// Fetch Shopify Orders endpoint (with pagination support)
app.post("/api/shopify/orders", async (req, res) => {
  try {
    const { shopUrl, accessToken } = req.body;

    if (!shopUrl || !accessToken) {
      return res.status(400).json({ error: "Missing shopUrl or accessToken" });
    }

    let formattedShopUrl = shopUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!formattedShopUrl.includes(".myshopify.com") && !formattedShopUrl.includes(".")) {
      formattedShopUrl = `${formattedShopUrl}.myshopify.com`;
    }

    let allOrders = [];
    let cursor = null;
    let hasNextPage = true;

    // Fetch all orders with pagination
    while (hasNextPage) {
      let url = `https://${formattedShopUrl}/admin/api/2024-01/orders.json?status=any&limit=250`;
      if (cursor) {
        url += `&after=${cursor}`;
      }

      const response = await axios.get(url, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      const orders = response.data.orders || [];
      allOrders = allOrders.concat(orders);

      // Check if there's a next page
      const linkHeader = response.headers.link || "";
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      
      if (nextMatch) {
        const nextUrl = nextMatch[1];
        const afterMatch = nextUrl.match(/after=([^&]+)/);
        cursor = afterMatch ? afterMatch[1] : null;
        hasNextPage = !!cursor;
      } else {
        hasNextPage = false;
      }
    }

    console.log(`✅ Fetched ${allOrders.length} orders from Shopify (with pagination)`);

    res.json({
      success: true,
      orders: allOrders,
    });
  } catch (error) {
    const statusCode = error.response?.status || 401;
    console.error("Shopify orders fetch error:", error.message);
    res.status(statusCode).json({
      error: "Failed to fetch orders from Shopify",
      details: error.message,
    });
  }
});

// Fetch Shopify Inventory endpoint (with pagination support)
app.post("/api/shopify/inventory", async (req, res) => {
  try {
    const { shopUrl, accessToken } = req.body;

    if (!shopUrl || !accessToken) {
      return res.status(400).json({ error: "Missing shopUrl or accessToken" });
    }

    let formattedShopUrl = shopUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!formattedShopUrl.includes(".myshopify.com") && !formattedShopUrl.includes(".")) {
      formattedShopUrl = `${formattedShopUrl}.myshopify.com`;
    }

    let allInventory = [];
    let cursor = null;
    let hasNextPage = true;

    // Fetch all inventory levels with pagination
    while (hasNextPage) {
      let url = `https://${formattedShopUrl}/admin/api/2024-01/inventory_levels.json?limit=250`;
      if (cursor) {
        url += `&after=${cursor}`;
      }

      const response = await axios.get(url, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      const inventory = response.data.inventory_levels || [];
      allInventory = allInventory.concat(inventory);

      // Check if there's a next page
      const linkHeader = response.headers.link || "";
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      
      if (nextMatch) {
        const nextUrl = nextMatch[1];
        const afterMatch = nextUrl.match(/after=([^&]+)/);
        cursor = afterMatch ? afterMatch[1] : null;
        hasNextPage = !!cursor;
      } else {
        hasNextPage = false;
      }
    }

    console.log(`✅ Fetched ${allInventory.length} inventory items from Shopify (with pagination)`);

    res.json({
      success: true,
      inventory: allInventory,
    });
  } catch (error) {
    const statusCode = error.response?.status || 401;
    console.error("Shopify inventory fetch error:", error.message);
    res.status(statusCode).json({
      error: "Failed to fetch inventory from Shopify",
      details: error.message,
    });
  }
});

// Webhook handler
app.post("/webhook", async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];
    const rawBody = req.rawBody;

    if (!sig || !rawBody) {
      return res.status(400).json({ error: "Missing signature or body" });
    }

    let event;

    try {
      event = stripeClient.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        console.log("✅ Checkout session completed:", {
          sessionId: event.data.object.id,
          customerId: event.data.object.customer,
          email: event.data.object.customer_email,
          amount: event.data.object.amount_total,
        });
        // TODO: Update user subscription status in database
        break;

      case "invoice.payment_succeeded":
        console.log("✅ Invoice payment succeeded:", {
          invoiceId: event.data.object.id,
          customerId: event.data.object.customer,
          amount: event.data.object.amount_paid,
        });
        // TODO: Log payment in database
        break;

      case "customer.subscription.created":
        console.log("✅ Subscription created:", {
          subscriptionId: event.data.object.id,
          customerId: event.data.object.customer,
          status: event.data.object.status,
          planId: event.data.object.items.data[0].price.id,
        });
        // TODO: Save subscription to database
        break;

      case "customer.subscription.updated":
        console.log("✅ Subscription updated:", {
          subscriptionId: event.data.object.id,
          customerId: event.data.object.customer,
          status: event.data.object.status,
        });
        // TODO: Update subscription in database
        break;

      case "customer.subscription.deleted":
        console.log("✅ Subscription deleted:", {
          subscriptionId: event.data.object.id,
          customerId: event.data.object.customer,
        });
        // TODO: Cancel subscription in database
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Serve static files from the React app BUILD (before fallback)
const distPath = path.join(__dirname, "../dist");
const distExists = require("fs").existsSync(distPath);
const indexHtmlExists = distExists && require("fs").existsSync(path.join(distPath, "index.html"));

console.log(`\n📁 Static File Configuration:`);
console.log(`   Dist Path: ${distPath}`);
console.log(`   Dist Exists: ${distExists ? 'YES' : 'NO'}`);
console.log(`   index.html Exists: ${indexHtmlExists ? 'YES' : 'NO'}\n`);

if (distExists) {
  app.use(express.static(distPath));
} else {
  console.warn(`⚠️  WARNING: dist/ folder not found. React app may not be built correctly.`);
  console.warn(`   Expected at: ${distPath}`);
  console.warn(`   Run 'npm run build' from root to create it.\n`);
}

// Error handling middleware (catches any thrown errors)
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.message, err.stack);
  res.status(500).json({ 
    error: "Internal server error",
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Serve React app for all unmatched routes (must be LAST)
app.get("*", (req, res) => {
  const indexPath = path.join(distPath, "index.html");
  console.log(`[${Date.now()}] 📄 Serving React app: ${req.path} → ${indexPath}`);
  if (require("fs").existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error(`❌ React app not found at ${indexPath}`);
    res.status(404).json({ 
      error: "React app not built.",
      details: `dist/index.html not found at ${indexPath}`,
      action: "Run 'npm run build' from root",
      distPath: distPath,
      distExists: require("fs").existsSync(distPath)
    });
  }
});
