 


/**
 * Shopify Backend API Endpoints
 * NodeJS/Express backend routes for Shopify integration
 * 
 * These endpoints handle:
 * - Secure credential storage (backend processing)
 * - Server-side Shopify API calls
 * - Data transformation and caching
 * - Rate limiting and error handling
 */

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const crypto = require("crypto");

dotenv.config();

const router = express.Router();

const db = admin.firestore();

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_SCOPES =
  process.env.SHOPIFY_SCOPES ||
  "read_products,read_orders,read_customers,read_inventory";
const SHOPIFY_APP_URL =
  process.env.SHOPIFY_APP_URL ||
  process.env.APP_URL ||
  `http://localhost:${process.env.PORT || 4242}`;
const SHOPIFY_REDIRECT_URI =
  process.env.SHOPIFY_REDIRECT_URI ||
  `${SHOPIFY_APP_URL}/api/shopify/oauth/callback`;

const OAUTH_STATE_COLLECTION = "shopifyOAuthStates";

const normalizeShop = (shop) => {
  let cleaned = String(shop || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  if (cleaned && !cleaned.includes(".myshopify.com")) {
    if (!cleaned.includes(".")) {
      cleaned = `${cleaned}.myshopify.com`;
    }
  }
  return cleaned;
};

const isValidShop = (shop) =>
  /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop);

const buildQueryString = (params) =>
  Object.keys(params)
    .sort()
    .map((key) => {
      const value = Array.isArray(params[key])
        ? params[key].join(",")
        : params[key];
      return `${key}=${value}`;
    })
    .join("&");

const verifyShopifyHmac = (query) => {
  if (!SHOPIFY_API_SECRET) return false;
  const { hmac, signature, ...rest } = query;
  const message = buildQueryString(rest);
  const digest = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");
  const provided = String(hmac || "");
  return (
    provided.length === digest.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(digest))
  );
};

/**
 * Shopify OAuth start
 * GET /api/shopify/oauth/start?shop={shop}&userId={firebaseUserId}
 */
router.get("/oauth/start", async (req, res) => {
  try {
    const shop = normalizeShop(req.query.shop);
    const userId = String(req.query.userId || "");

    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
      return res.status(500).json({ error: "Shopify OAuth not configured" });
    }

    if (!shop || !isValidShop(shop)) {
      return res.status(400).json({ error: "Invalid shop domain" });
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const state = crypto.randomBytes(16).toString("hex");
    await db.collection(OAUTH_STATE_COLLECTION).doc(state).set({
      userId,
      shop,
      createdAt: Date.now(),
    });

    const authQuery = new URLSearchParams({
      client_id: SHOPIFY_API_KEY,
      scope: SHOPIFY_SCOPES,
      redirect_uri: SHOPIFY_REDIRECT_URI,
      state,
      "grant_options[]": "per-user",
    });

    const authUrl = `https://${shop}/admin/oauth/authorize?${authQuery.toString()}`;
    console.log(`🔗 Redirecting to Shopify OAuth: ${authUrl}`);
    res.redirect(authUrl);
  } catch (error) {
    console.error("OAuth start error:", error);
    res.status(500).json({ error: "Failed to start OAuth" });
  }
});

/**
 * Shopify Direct Connection (Manual)
 * POST /api/shopify/connect
 * Accepts shop URL only - uses API credentials to establish connection
 */
router.post("/connect", async (req, res) => {
  try {
    const { shop, userId } = req.body;

    if (!shop || !userId) {
      return res.status(400).json({ error: "Missing shop or userId" });
    }

    const normalizedShop = normalizeShop(shop);

    if (!isValidShop(normalizedShop)) {
      return res.status(400).json({ error: "Invalid shop domain format" });
    }

    console.log(`🔗 Connecting Shopify store: ${normalizedShop} for user: ${userId}`);

    // Try to get access token from environment
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    // Store the connection in Firestore
    const connectionData = {
      shopName: normalizedShop,
      userId,
      connectedAt: Date.now(),
      lastSync: 0,
      updatedAt: Date.now(),
      manualConnection: true,
    };

    // If we have a token, use it
    if (accessToken && accessToken !== "shpat_") {
      connectionData.accessToken = accessToken;
      console.log(`✅ Using access token from server .env`);
    } else {
      // No token - connection saved but sync will need token later
      console.log(`⚠️ No access token in .env - user will need to add it to sync data`);
      connectionData.accessToken = null;
    }

    await db.collection("shopifyIntegrations").doc(userId).set(connectionData);

    console.log(`✅ Connected Shopify store: ${normalizedShop}`);

    res.json({
      success: true,
      message: accessToken && accessToken !== "shpat_" ? "Connected! Click Re-sync to fetch data." : "Connected! You can now add your access token.",
      shop: normalizedShop,
      hasToken: !!(accessToken && accessToken !== "shpat_"),
    });
  } catch (error) {
    console.error("Shopify connection error:", error.message);
    res.status(500).json({
      error: "Failed to connect Shopify store",
      details: error.message,
    });
  }
});

/**
 * Update access token for existing Shopify connection
 * POST /api/shopify/update-token
 */
router.post("/update-token", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "Missing access token" });
    }

    // Update existing connection with new access token
    await db.collection("shopifyIntegrations").doc(userId).update({
      accessToken,
      updatedAt: Date.now(),
    });

    console.log(`✅ Access token updated for user: ${userId}`);

    res.json({
      success: true,
      message: "Access token updated successfully",
    });
  } catch (error) {
    console.error("Update token error:", error.message);
    res.status(500).json({
      error: "Failed to update access token",
      details: error.message,
    });
  }
});

/**
 * Shopify OAuth callback
 * GET /api/shopify/oauth/callback
 */
router.get("/oauth/callback", async (req, res) => {
  try {
    const { shop, code, state, hmac, timestamp } = req.query;
    const normalizedShop = normalizeShop(shop);

    if (!shop || !code || !state || !hmac || !timestamp) {
      return res.status(400).json({ error: "Missing OAuth parameters" });
    }

    if (!isValidShop(normalizedShop)) {
      return res.status(400).json({ error: "Invalid shop domain" });
    }

    if (!verifyShopifyHmac(req.query)) {
      return res.status(400).json({ error: "HMAC validation failed" });
    }

    const stateDoc = await db.collection(OAUTH_STATE_COLLECTION).doc(state).get();
    if (!stateDoc.exists) {
      return res.status(400).json({ error: "Invalid OAuth state" });
    }

    const { userId, shop: storedShop, createdAt } = stateDoc.data();
    if (storedShop !== normalizedShop) {
      return res.status(400).json({ error: "Shop mismatch" });
    }

    if (Date.now() - createdAt > 10 * 60 * 1000) {
      return res.status(400).json({ error: "OAuth state expired" });
    }

    const tokenResponse = await axios.post(
      `https://${normalizedShop}/admin/oauth/access_token`,
      {
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }
    );

    const { access_token } = tokenResponse.data;
    if (!access_token) {
      return res.status(500).json({ error: "Missing access token" });
    }

    await db.collection("shopifyIntegrations").doc(userId).set({
      shopName: normalizedShop,
      accessToken: access_token,
      userId,
      connectedAt: Date.now(),
      lastSync: 0,
      updatedAt: Date.now(),
    });

    await db.collection(OAUTH_STATE_COLLECTION).doc(state).delete();

    const clientBase = process.env.CLIENT_DOMAIN || "http://localhost:3000";
    res.redirect(`${clientBase}/integrations?shopify=connected`);
  } catch (error) {
    console.error("OAuth callback error:", error.response?.data || error.message);
    const clientBase = process.env.CLIENT_DOMAIN || "http://localhost:3000";
    res.redirect(`${clientBase}/integrations?shopify=error`);
  }
});

/**
 * Get all Shopify data for a user
 * GET /api/shopify/sync
 * Headers: Authorization: Bearer {idToken}
 */
router.get("/sync", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get Shopify credentials from Firestore
    const credentialsDoc = await db
      .collection("shopifyIntegrations")
      .doc(userId)
      .get();

    if (!credentialsDoc.exists) {
      return res.status(404).json({ error: "Shopify not connected. Please connect your store via OAuth first." });
    }

    const { shopName, accessToken } = credentialsDoc.data();

    if (!accessToken || accessToken === "__basic_auth__") {
      return res.status(401).json({ error: "No valid Shopify access token. Please reconnect your store via OAuth to get a real token." });
    }

    // Fetch all data in parallel
    const products = await fetchShopifyDataSafe(
      `https://${shopName}/admin/api/2023-10/products.json?limit=250`,
      accessToken,
      [401, 403]
    );
    const orders = await fetchShopifyDataSafe(
      `https://${shopName}/admin/api/2023-10/orders.json?status=any&limit=250`,
      accessToken,
      [401, 403]
    );
    const customers = await fetchShopifyDataSafe(
      `https://${shopName}/admin/api/2023-10/customers.json?limit=250`,
      accessToken,
      [401, 403]
    );
    const inventoryLevels = await fetchShopifyDataSafe(
      `https://${shopName}/admin/api/2023-10/inventory_levels.json?limit=250`,
      accessToken,
      [401, 403, 422]
    );

    res.json({
      products,
      orders,
      customers,
      inventoryLevels,
      lastSyncTime: Date.now(),
      syncStatus: "success",
    });
  } catch (error) {
    console.error("Shopify sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get products only
 * GET /api/shopify/products
 */
router.get("/products", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const credentialsDoc = await db
      .collection("shopifyIntegrations")
      .doc(userId)
      .get();

    if (!credentialsDoc.exists) {
      return res.status(404).json({ error: "Shopify not connected" });
    }

    const { shopName, accessToken } = credentialsDoc.data();
    const products = await fetchShopifyData(
      `https://${shopName}/admin/api/2023-10/products.json?limit=250`,
      accessToken
    );

    res.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get products with direct credentials (POST)
 * POST /api/shopify/products
 * Body: { shopUrl, accessToken }
 */
router.post("/products", async (req, res) => {
  try {
    const { shopUrl, accessToken } = req.body;
    
    if (!shopUrl || !accessToken) {
      return res.status(400).json({ error: "Missing shopUrl or accessToken" });
    }

    console.log("📦 Fetching products from:", shopUrl);
    const products = await fetchShopifyData(
      `https://${shopUrl}/admin/api/2023-10/products.json?limit=250`,
      accessToken
    );

    console.log("✅ Fetched", products.length, "products");
    res.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({ error: error.message, details: error.message });
  }
});

/**
 * Get orders only
 * GET /api/shopify/orders
 */
router.get("/orders", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const credentialsDoc = await db
      .collection("shopifyIntegrations")
      .doc(userId)
      .get();

    if (!credentialsDoc.exists) {
      return res.status(404).json({ error: "Shopify not connected" });
    }

    const { shopName, accessToken } = credentialsDoc.data();
    const orders = await fetchShopifyData(
      `https://${shopName}/admin/api/2023-10/orders.json?status=any&limit=250`,
      accessToken
    );

    res.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get orders with direct credentials (POST)
 * POST /api/shopify/orders
 * Body: { shopUrl, accessToken }
 */
router.post("/orders", async (req, res) => {
  try {
    const { shopUrl, accessToken } = req.body;
    
    if (!shopUrl || !accessToken) {
      return res.status(400).json({ error: "Missing shopUrl or accessToken" });
    }

    console.log("📋 Fetching orders from:", shopUrl);
    const orders = await fetchShopifyData(
      `https://${shopUrl}/admin/api/2023-10/orders.json?status=any&limit=250`,
      accessToken
    );

    console.log("✅ Fetched", orders.length, "orders");
    res.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).json({ error: error.message, details: error.message });
  }
});

/**
 * Get customers only
 * GET /api/shopify/customers
 */
router.get("/customers", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const credentialsDoc = await db
      .collection("shopifyIntegrations")
      .doc(userId)
      .get();

    if (!credentialsDoc.exists) {
      return res.status(404).json({ error: "Shopify not connected" });
    }

    const { shopName, accessToken } = credentialsDoc.data();
    const customers = await fetchShopifyData(
      `https://${shopName}/admin/api/2023-10/customers.json?limit=250`,
      accessToken
    );

    res.json({ customers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get inventory levels
 * GET /api/shopify/inventory
 */
router.get("/inventory", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const credentialsDoc = await db
      .collection("shopifyIntegrations")
      .doc(userId)
      .get();

    if (!credentialsDoc.exists) {
      return res.status(404).json({ error: "Shopify not connected" });
    }

    const { shopName, accessToken } = credentialsDoc.data();
    const inventoryLevels = await fetchShopifyData(
      `https://${shopName}/admin/api/2023-10/inventory_levels.json?limit=250`,
      accessToken
    );

    res.json({ inventoryLevels });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get inventory with direct credentials (POST)
 * POST /api/shopify/inventory
 * Body: { shopUrl, accessToken }
 */
router.post("/inventory", async (req, res) => {
  try {
    const { shopUrl, accessToken } = req.body;
    
    if (!shopUrl || !accessToken) {
      return res.status(400).json({ error: "Missing shopUrl or accessToken" });
    }

    console.log("📦 Fetching inventory from:", shopUrl);
    const inventory = await fetchShopifyData(
      `https://${shopUrl}/admin/api/2023-10/inventory_levels.json?limit=250`,
      accessToken
    );

    console.log("✅ Fetched", inventory.length, "inventory items");
    res.json({ inventory });
  } catch (error) {
    console.error("Error fetching inventory:", error.message);
    res.status(500).json({ error: error.message, details: error.message });
  }
});

/**
 * Check Shopify connection status
 * GET /api/shopify/status
 */
router.get("/status", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const credentialsDoc = await db
      .collection("shopifyIntegrations")
      .doc(userId)
      .get();

    if (!credentialsDoc.exists) {
      return res.json({ connected: false });
    }

    const { shopName, lastSync } = credentialsDoc.data();
    res.json({
      connected: true,
      shopName,
      lastSync,
    });
  } catch (error) {
    console.error("Error checking status:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test Shopify connection with direct credentials (POST)
 * POST /api/shopify/test
 * Body: { shopUrl, accessToken }
 */
router.post("/test", async (req, res) => {
  try {
    const { shopUrl, accessToken } = req.body;
    
    if (!shopUrl || !accessToken) {
      return res.status(400).json({ error: "Missing shopUrl or accessToken" });
    }

    console.log("🧪 Testing Shopify connection:", shopUrl);
    
    // Try to fetch products as a test
    const products = await fetchShopifyData(
      `https://${shopUrl}/admin/api/2023-10/products.json?limit=1`,
      accessToken
    );

    console.log("✅ Connection test successful");
    res.json({ 
      success: true, 
      message: "Connected to Shopify successfully",
      productsFound: products ? 1 : 0
    });
  } catch (error) {
    console.error("Connection test failed:", error.message);
    res.status(401).json({ 
      error: "Failed to connect to Shopify",
      details: error.message 
    });
  }
});

/**
 * Helper function to fetch data from Shopify API
 */
async function fetchShopifyData(url, accessToken) {
  try {
    let allData = [];
    let nextUrl = url;
    let pageCount = 0;

    // Handle pagination
    while (nextUrl) {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount}: ${nextUrl}`);

      const response = await axios.get(nextUrl, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      // Extract the main data key from response (products, orders, customers, etc)
      const dataKey = Object.keys(response.data).find(
        (key) => key !== "errors" && Array.isArray(response.data[key])
      );

      const pageData = response.data[dataKey] || [];
      allData = allData.concat(pageData);
      console.log(`✅ Page ${pageCount}: ${pageData.length} items (total: ${allData.length})`);

      // Check for next page in Link header
      const linkHeader = response.headers.link;
      nextUrl = null;
      
      if (linkHeader) {
        const links = linkHeader.split(",");
        for (const link of links) {
          if (link.includes('rel="next"')) {
            // Extract URL from Link header: <URL>; rel="next"
            const match = link.match(/<([^>]+)>/);
            if (match) {
              nextUrl = match[1];
              break;
            }
          }
        }
      }
    }

    console.log(`✅ Fetched total of ${allData.length} items from Shopify`);
    return allData;
  } catch (error) {
    console.error(`Error fetching from Shopify: ${url}`, error.message);
    throw error;
  }
}

async function fetchShopifyDataSafe(url, accessToken, ignoreStatuses = []) {
  try {
    return await fetchShopifyData(url, accessToken);
  } catch (error) {
    const status = error.response?.status;
    if (status && ignoreStatuses.includes(status)) {
      console.warn(`Shopify API skipped (${status}): ${url}`);
      return [];
    }
    throw error;
  }
}

/**
 * Create a new product in Shopify
 * POST /api/shopify/create-product
 * Body: { shopUrl, accessToken, product }
 */
router.post("/create-product", async (req, res) => {
  try {
    let { shopUrl, accessToken, product } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if ((!shopUrl || !accessToken) && token) {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const credentialsDoc = await db
        .collection("shopifyIntegrations")
        .doc(userId)
        .get();

      if (credentialsDoc.exists) {
        const credentials = credentialsDoc.data();
        shopUrl = credentials.shopName;
        accessToken = credentials.accessToken;
      }
    }

    if (!shopUrl || !accessToken || !product) {
      return res
        .status(400)
        .json({ error: "Missing required fields: shopUrl, accessToken, product" });
    }

    console.log("🚀 Creating product in Shopify:", product.product?.title);
    const stockQuantity = product.product?.variants?.[0]?.inventory_quantity || 0;
    console.log("📊 Stock quantity from request:", stockQuantity);
    console.log("📋 Product payload:", JSON.stringify(product.product, null, 2));

    // ENSURE VARIANTS HAVE inventory_management: "shopify" FOR TRACKING
    const productPayload = { ...product };
    if (productPayload.product?.variants) {
      productPayload.product.variants = productPayload.product.variants.map((v) => ({
        ...v,
        inventory_management: "shopify", // ✅ MUST SET THIS FOR INVENTORY TRACKING
      }));
      console.log("✅ Added inventory_management: 'shopify' to all variants");
    }

    // Call Shopify API to create product with API VERSION 2024-01
    console.log("🌐 Calling Shopify API: POST /admin/api/2024-01/products.json");
    const response = await axios.post(
      `https://${shopUrl}/admin/api/2024-01/products.json`,
      productPayload,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    const createdProduct = response.data.product;
    console.log("✅ Product created successfully!");
    console.log("  📦 Product ID:", createdProduct.id);
    console.log("  📦 Product title:", createdProduct.title);
    console.log("  🖼️ Product images:", createdProduct.images?.length || 0, "images");
    console.log("  📊 Variants count:", createdProduct.variants?.length || 0);
    if (createdProduct.variants?.[0]) {
      console.log("  📊 First variant ID:", createdProduct.variants[0].id);
      console.log("  📊 First variant SKU:", createdProduct.variants[0].sku);
      console.log("  📊 First variant inventory_item_id:", createdProduct.variants[0].inventory_item_id);
    }

    // STEP 2: Set inventory levels if stock quantity > 0
    if (createdProduct.variants && createdProduct.variants.length > 0) {
      try {
        const variant = createdProduct.variants[0];
        const variantId = variant.id;
        const inventoryItemId = variant.inventory_item_id;

        console.log("\n🔄 STEP 2: Setting Inventory Levels");
        console.log("  📊 Variant ID:", variantId);
        console.log("  📊 Inventory Item ID:", inventoryItemId);
        console.log("  📊 Stock Quantity to set:", stockQuantity);

        if (!inventoryItemId) {
          console.error("❌ ERROR: inventory_item_id is missing from variant!");
          console.error("  Variant data:", JSON.stringify(variant, null, 2));
          throw new Error("inventory_item_id is missing");
        }

        // CRITICAL: Update variant to enable inventory tracking
        console.log("🌐 Step 2A: Enabling inventory tracking on variant...");
        let variantUpdateSuccess = false;
        try {
          console.log("📡 Sending PUT request to:", `https://${shopUrl}/admin/api/2024-01/variants/${variantId}.json`);
          const variantUpdateResponse = await axios.put(
            `https://${shopUrl}/admin/api/2024-01/variants/${variantId}.json`,
            {
              variant: {
                inventory_management: "shopify",  // ✅ MUST ENABLE TRACKING
              },
            },
            {
              headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
              },
            }
          );
          console.log("✅ Variant inventory tracking ENABLED");
          console.log("  📊 Variant update response:", JSON.stringify(variantUpdateResponse.data, null, 2));
          variantUpdateSuccess = true;
        } catch (variantUpdateError) {
          console.error("❌ ERROR: Variant inventory tracking update FAILED!");
          console.error("  Error message:", variantUpdateError.message);
          if (variantUpdateError.response?.data) {
            console.error("  Shopify error response:", JSON.stringify(variantUpdateError.response.data, null, 2));
          }
          console.error("  Status:", variantUpdateError.response?.status);
          // Continue anyway - inventory level set might still work
        }

        // Get available location ID
        console.log("🌐 Step 2B: Fetching locations from Shopify...");
        const locationsResponse = await axios.get(
          `https://${shopUrl}/admin/api/2024-01/locations.json`,
          {
            headers: {
              "X-Shopify-Access-Token": accessToken,
            },
          }
        );

        const primaryLocation = locationsResponse.data.locations?.[0];

        if (!primaryLocation) {
          console.error("❌ ERROR: No locations found in Shopify!");
          console.error("  Response:", JSON.stringify(locationsResponse.data, null, 2));
          throw new Error("No locations available in Shopify store");
        }

        console.log("  ✅ Location found:", primaryLocation.name, "(ID:", primaryLocation.id, ")");

        // Set inventory level using POST to /inventory_levels/set.json
        console.log("🌐 Step 2C: Setting inventory level...");
        const inventoryPayload = {
          location_id: String(primaryLocation.id),
          inventory_item_id: String(inventoryItemId),
          available: stockQuantity, // Use 'available' for SET endpoint
        };
        console.log("  📋 Inventory payload:", JSON.stringify(inventoryPayload, null, 2));

        const inventoryResponse = await axios.post(
          `https://${shopUrl}/admin/api/2024-01/inventory_levels/set.json`,
          inventoryPayload,
          {
            headers: {
              "X-Shopify-Access-Token": accessToken,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("✅ Inventory level set successfully!");
        console.log("  📊 Response:", JSON.stringify(inventoryResponse.data, null, 2));
      } catch (inventoryError) {
        console.error("❌ ERROR setting inventory levels:", inventoryError.message);
        if (inventoryError.response?.data) {
          console.error("  Shopify error details:", JSON.stringify(inventoryError.response.data, null, 2));
        }
        // Don't fail the request if inventory setting fails - product is still created
      }
    } else {
      console.log("⚠️ No variants found in created product - skipping inventory setup");
    }

    res.json({
      success: true,
      message: "Product created successfully with inventory",
      product: createdProduct,
      inventory_set: stockQuantity > 0,
      summary: {
        title: createdProduct.title,
        id: createdProduct.id,
        variants: createdProduct.variants?.length || 0,
        images: createdProduct.images?.length || 0,
        inventory_tracked: createdProduct.variants?.[0]?.inventory_management === "shopify",
        stock_quantity: stockQuantity,
      },
    });
    
    console.log("\n✅ PRODUCT CREATION COMPLETE");
    console.log("  📊 Product Summary:", JSON.stringify({
      title: createdProduct.title,
      id: createdProduct.id,
      variants: createdProduct.variants?.length || 0,
      images: createdProduct.images?.length || 0,
      inventory_tracked: createdProduct.variants?.[0]?.inventory_management === "shopify",
      stock_quantity: stockQuantity,
    }, null, 2));
  } catch (error) {
    console.error("❌ Error creating product:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to create product",
      details: error.response?.data || error.message,
    });
  }
});

/**
 * POST /api/shopify/add-product-image
 * Add image to an existing product (called after product creation)
 */
router.post("/add-product-image", async (req, res) => {
  try {
    console.log("\n📸 STEP 2B: Adding Product Image");
    const { productId, image } = req.body;

    if (!productId || !image) {
      console.error("❌ ERROR: Missing productId or image in request");
      return res.status(400).json({ error: "productId and image are required" });
    }

    console.log("  📊 Image size:", image.length, "bytes");

    // Get user's Shopify credentials from Firestore
    const token = req.headers.authorization?.split(" ")[1];
    const user = await admin.auth().verifyIdToken(token);
    const userId = user.uid;

    console.log("  🔑 User ID:", userId);

    // Fix: Use same credentials path as create-product endpoint
    const credentialsDoc = await db
      .collection("shopifyIntegrations")
      .doc(userId)
      .get();

    if (!credentialsDoc.exists) {
      console.error("❌ ERROR: Shopify not connected for user", userId);
      return res.status(401).json({ error: "Shopify not connected" });
    }

    const credentials = credentialsDoc.data();
    const accessToken = credentials?.accessToken;
    const shop = credentials?.shopName;

    if (!accessToken || !shop) {
      console.error("❌ ERROR: Invalid Shopify credentials in Firestore for user", userId);
      console.error("  Credentials data:", JSON.stringify(credentials, null, 2));
      return res.status(401).json({ error: "Invalid Shopify credentials" });
    }

    console.log("  ✅ Credentials found for shop:", shop);

    // Extract product ID from GraphQL format if needed
    let shopifyProductId = productId;
    if (String(productId).includes("gid://")) {
      shopifyProductId = String(productId).split("/").pop();
    }

    console.log("  📊 Product ID:", shopifyProductId);

    // Remove data URI prefix if present
    let imageData = image;
    if (image.startsWith("data:image")) {
      const base64Part = image.split(",")[1];
      if (base64Part) {
        imageData = base64Part;
        console.log("  ✅ Removed data URI prefix");
        console.log("  📊 Cleaned image size:", imageData.length, "bytes");
      }
    }

    console.log("🌐 Uploading image to Shopify using API 2024-01...");
    console.log("  📡 API endpoint: https://" + shop + "/admin/api/2024-01/products/" + shopifyProductId + "/images.json");
    console.log("  📋 Payload type: application/json");
    console.log("  📸 Image attachment size:", imageData.length, "bytes");

    // Call Shopify API to add image
    const imageResponse = await axios.post(
      `https://${shop}/admin/api/2024-01/products/${shopifyProductId}/images.json`,
      {
        image: {
          attachment: imageData, // Base64 string without data URI prefix
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Image uploaded successfully!");
    console.log("  📸 Image ID:", imageResponse.data.image?.id);
    console.log("  📸 Image URL:", imageResponse.data.image?.src);
    console.log("  📊 Full response:", JSON.stringify(imageResponse.data, null, 2));

    res.json({
      success: true,
      message: "Image added to product",
      image: imageResponse.data.image,
    });
  } catch (error) {
    console.error("\n❌ ERROR adding image to product!");
    console.error("  Error message:", error.message);
    console.error("  Error code:", error.code);
    if (error.response?.status) {
      console.error("  HTTP Status:", error.response.status);
    }
    if (error.response?.data) {
      console.error("  Shopify error details:", JSON.stringify(error.response.data, null, 2));
    }
    console.error("  Full error:", error);
    // Return success even if image fails - product was created successfully
    res.status(200).json({
      success: true,
      message: "Product created but image upload failed (non-critical)",
      details: error.response?.data || error.message,
      imageUploadFailed: true,
    });
  }
});

/**
 * Sync Shopify data by URL
 * GET /api/shopify/sync-by-url?shop=nayance-dev.myshopify.com&userId=xxx
 *
 * Auth strategy (tries in order):
 *  1. X-Shopify-Access-Token header  (shpat_ token)
 *  2. HTTP Basic Auth – API key : API secret  (private/custom app)
 *  3. Returns 401 if no valid credentials found
 */
router.get("/sync-by-url", async (req, res) => {
  try {
    const shop   = normalizeShop(req.query.shop || process.env.SHOPIFY_STORE || "");
    const userId = req.query.userId || null;

    if (!shop || !isValidShop(shop)) {
      return res.status(400).json({ error: "Invalid shop domain" });
    }

    const API_KEY    = process.env.SHOPIFY_API_KEY    || "";
    const API_SECRET = process.env.SHOPIFY_API_SECRET || "";
    const TOKEN      = process.env.SHOPIFY_ACCESS_TOKEN || "";

    // Basic Auth header: API key as username, API secret as password
    const basicAuth = API_KEY && API_SECRET
      ? "Basic " + Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64")
      : null;

    let products   = [];
    let orders     = [];
    let customers  = [];
    let authMethod  = "none";

    const adminBase = `https://${shop}/admin/api/2023-10`;

    // Helper: GET a URL with given headers and return the first array value
    const tryFetch = async (url, headers) => {
      const r = await axios.get(url, { headers, timeout: 15000 });
      const key = Object.keys(r.data).find(k => Array.isArray(r.data[k]));
      return r.data[key] || [];
    };

    // ── Strategy 1: Access token (shpat_ / shpua_) ─────────────────────────
    if (TOKEN && TOKEN.length > 10 && TOKEN !== API_SECRET) {
      try {
        console.log(`🔑 [1/3] Trying access-token auth on ${shop}...`);
        const hdrs = { "X-Shopify-Access-Token": TOKEN };
        products = await tryFetch(`${adminBase}/products.json?limit=250`, hdrs);
        [orders, customers] = await Promise.all([
          tryFetch(`${adminBase}/orders.json?status=any&limit=250`, hdrs).catch(() => []),
          tryFetch(`${adminBase}/customers.json?limit=250`, hdrs).catch(() => []),
        ]);
        authMethod = "token";
        console.log(`✅ Access-token OK – products:${products.length} orders:${orders.length}`);
      } catch (e) {
        console.warn(`⚠️  Access-token failed (${e.response?.status}):`, e.response?.data?.errors || e.message);
      }
    }

    // ── Strategy 2: Basic Auth (API key : API secret) ──────────────────────
    if (authMethod === "none" && basicAuth) {
      try {
        console.log(`🔑 [2/3] Trying Basic Auth (API key + secret) on ${shop}...`);
        const hdrs = { Authorization: basicAuth };
        products = await tryFetch(`${adminBase}/products.json?limit=250`, hdrs);
        [orders, customers] = await Promise.all([
          tryFetch(`${adminBase}/orders.json?status=any&limit=250`, hdrs).catch(() => []),
          tryFetch(`${adminBase}/customers.json?limit=250`, hdrs).catch(() => []),
        ]);
        authMethod = "basic";
        console.log(`✅ Basic Auth OK – products:${products.length} orders:${orders.length}`);
      } catch (e) {
        console.warn(`⚠️  Basic Auth failed (${e.response?.status}):`, e.response?.data?.errors || e.message);
      }
    }

    // ── Strategy 3: Error — cannot access this store without OAuth ─────────
    if (authMethod === "none") {
      return res.status(401).json({
        success: false,
        error: "Cannot access store data without a valid Admin API access token. Please complete the Shopify OAuth flow to connect your store.",
        hint: "Go to Integrations → Connect Shopify → Enter your store URL → Complete OAuth authorization on Shopify.",
      });
    }

    const finalOrders = orders;
    const finalProducts = products;
    const financialMetrics = calculateFinancialMetricsServer(finalOrders);

    // Save connection to Firestore
    if (userId) {
      try {
        const savedToken =
          authMethod === "token" ? TOKEN :
          authMethod === "basic" ? "__basic_auth__" : null;
        await db.collection("shopifyIntegrations").doc(userId).set({
          shopName:         shop,
          accessToken:      savedToken,
          userId,
          connectedAt:      Date.now(),
          lastSync:         Date.now(),
          updatedAt:        Date.now(),
          manualConnection: true,
          authMethod,
        }, { merge: true });
        console.log(`✅ Firestore saved – user:${userId} auth:${authMethod}`);
      } catch (fbErr) {
        console.warn("⚠️  Firestore save error:", fbErr.message);
      }
    }

    res.json({
      success:      true,
      products:     finalProducts,
      orders:       finalOrders,
      customers,
      financialMetrics,
      lastSyncTime: Date.now(),
      shopUrl:      shop,
      authMethod,
    });
  } catch (error) {
    console.error("sync-by-url error:", error.message);
    res.status(500).json({ error: error.message, success: false });
  }
});

/**
 * Calculate financial metrics from real Shopify orders (server-side)
 */
function calculateFinancialMetricsServer(orders) {
  if (!orders || orders.length === 0) {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      totalItems: 0,
      lastSyncTime: Date.now(),
    };
  }

  let totalRevenue = 0;
  let totalItems = 0;
  
  orders.forEach((order) => {
    const price = parseFloat(order.total_price || 0);
    totalRevenue += price;
    
    if (order.line_items && Array.isArray(order.line_items)) {
      order.line_items.forEach((item) => {
        totalItems += item.quantity || 0;
      });
    }
  });

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders: orders.length,
    averageOrderValue: Math.round((totalRevenue / orders.length) * 100) / 100,
    totalItems,
    lastSyncTime: Date.now(),
  };
}

module.exports = router;
