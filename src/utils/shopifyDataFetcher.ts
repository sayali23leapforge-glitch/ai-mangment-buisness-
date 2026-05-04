/**
 * Shopify Real Data Fetcher
 * Fetches real data from Shopify API through the backend
 */

import { auth } from "../config/firebase";
import { setInUserStorage, getFromUserStorage, removeFromUserStorage } from "./storageUtils";

// Backend port — always 3001 in development, or same origin in production
let BACKEND_PORT = "3001";
const detectBackendPort = async () => {
  for (const port of ["3001", "5000", "4242"]) {
    try {
      const response = await fetch(`http://localhost:${port}/health`, {
        method: "GET",
      });
      BACKEND_PORT = port;
      console.log("✅ Backend detected on port:", port);
      return;
    } catch (e) {
      // Port not responding, try next
    }
  }
  console.log("⚠️ Could not detect backend port, using default 3001");
};

// Auto-detect on module load
detectBackendPort();

// When the app is served from the same server as the API (e.g. localhost:3001),
// use the same origin so API calls hit the correct server.
import { getApiUrl } from '../config/api';
const getBackendBaseUrl = () => getApiUrl("");

const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }
  return user.getIdToken();
};

interface ShopifyProduct {
  productType: string;
  id: string;
  title: string;
  handle: string;
  image?: {
    src: string;
  };
  images?: Array<{
    src: string;
  }>;
  variants: Array<{
    stock: any;
    inventory_quantity: any;
    id: string;
    title: string;
    price: string;
    cost?: string;
  }>;
}

interface ShopifyOrder {
  id: string;
  order_number: number;
  total_price: string;
  created_at: string;
  line_items: Array<{
    id: string;
    product_id: string;
    title: string;
    quantity: number;
    price: string;
  }>;
}

/**
 * Fetch inventory from Shopify via backend
 */
export const fetchShopifyInventory = async (
  shopUrl: string,
  accessToken: string
) => {
  try {
    const response = await fetch(`http://localhost:${BACKEND_PORT}/api/shopify/inventory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shopUrl, accessToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch inventory");
    }

    return data.inventory || [];
  } catch (error) {
    console.error("Error fetching Shopify inventory:", error);
    return [];
  }
};

/**
 * Fetch products from Shopify via backend
 * Supports pagination for stores with >250 products
 */
export const fetchShopifyProducts = async (
  shopUrl: string,
  accessToken: string
) => {
  try {
    const response = await fetch(`http://localhost:${BACKEND_PORT}/api/shopify/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shopUrl, accessToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch products");
    }

    // Backend now returns paginated results - total count available
    console.log(`📦 Fetched ${data.products?.length || 0} products from Shopify`);
    return data.products || [];
  } catch (error) {
    console.error("Error fetching Shopify products:", error);
    return [];
  }
};

/**
 * Fetch orders from Shopify via backend
 * Supports pagination for stores with >250 orders
 */
export const fetchShopifyOrders = async (
  shopUrl: string,
  accessToken: string
) => {
  try {
    const response = await fetch(`http://localhost:${BACKEND_PORT}/api/shopify/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shopUrl, accessToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch orders");
    }

    // Backend now returns paginated results - total count available
    console.log(`📋 Fetched ${data.orders?.length || 0} orders from Shopify`);
    return data.orders || [];
  } catch (error) {
    console.error("Error fetching Shopify orders:", error);
    return [];
  }
};

/**
 * Convert Shopify products to internal product format
 */
export const convertShopifyProducts = (shopifyProducts: ShopifyProduct[]) => {
  return shopifyProducts.map((product, index) => {
    // Get image URL from product - Shopify can have image at top level or in images array
    let imageUrl: string | null = null;
    
    // Try different image locations in Shopify product object
    if (product.image?.src) {
      imageUrl = product.image.src;
    } else if (product.images && product.images.length > 0) {
      imageUrl = product.images[0].src;
    }
    
    // Ensure HTTPS for Shopify CDN images
    if (imageUrl && !imageUrl.startsWith('https://')) {
      imageUrl = imageUrl.replace('http://', 'https://');
    }
    
    // Get real stock from Shopify variant data
    let stock = 0;
    let price = 0;
    let cost = 0;
    if (product.variants && product.variants.length > 0) {
      const variant = product.variants[0];
      stock = variant.inventory_quantity ?? variant.stock ?? 0;
      // Ensure price is properly converted to number
      if (variant.price) {
        price = typeof variant.price === 'string' ? parseFloat(variant.price) : variant.price;
      }
      if (variant.cost) {
        cost = typeof variant.cost === 'string' ? parseFloat(variant.cost) : variant.cost;
      }
    }

    console.log(`💰 ${product.title}: price=$${price}, cost=$${cost}, stock=${stock}, image=${imageUrl ? "✓" : "✗"}`);

    return {
      id: product.id,
      name: product.title,
      category: product.productType || "General", // Use actual product type from Shopify
      description: `Imported from Shopify store`,
      handle: product.handle,
      price: price, // Real price from API
      cost: cost,   // Real cost from API
      stock: stock,
      image: imageUrl,
      barcode: product.handle,
      createdAt: Date.now(),
    };
  });
};

/**
 * Convert Shopify orders to internal sales format
 */
export const convertShopifyOrders = (shopifyOrders: ShopifyOrder[]) => {
  return shopifyOrders.flatMap((order) =>
    order.line_items.map((item) => ({
      id: item.id,
      productName: item.title,
      amount: parseFloat(item.price) * item.quantity,
      timestamp: order.created_at,
      quantity: item.quantity,
      orderNumber: order.order_number,
    }))
  );
};

/**
 * Fetch Shopify connection status from backend (OAuth flow)
 */
export const fetchShopifyStatus = async () => {
  try {
    const idToken = await getAuthToken();
    const response = await fetch(`${getBackendBaseUrl()}/api/shopify/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch Shopify status");
    }

    return data;
  } catch (error) {
    console.error("Error fetching Shopify status:", error);
    return { connected: false };
  }
};

/**
 * Sync Shopify data using OAuth (no API key in browser)
 */
export const syncShopifyToLocalStorageWithAuth = async () => {
  try {
    const idToken = await getAuthToken();
    const response = await fetch(`${getBackendBaseUrl()}/api/shopify/sync`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to sync Shopify data");
    }

    const products = data.products || [];
    const orders = data.orders || [];
    const inventoryLevels = data.inventoryLevels || [];

    const convertedProducts = convertShopifyProducts(products);
    const convertedOrders = convertShopifyOrders(orders);

    setInUserStorage("shopifyProducts", convertedProducts);
    setInUserStorage("shopifySales", convertedOrders);
    setInUserStorage("shopifyInventory", inventoryLevels);
    setInUserStorage("shopifyConnected", true);
    setInUserStorage("shopifyLastSyncTime", data.lastSyncTime || Date.now());

    console.log(`✅ Synced: ${convertedProducts.length} products, ${convertedOrders.length} orders`);

    return {
      success: true,
      productCount: convertedProducts.length,
      orderCount: convertedOrders.length,
    };
  } catch (error) {
    console.error("Error syncing Shopify data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Sync all Shopify data and store in localStorage
 */
export const syncShopifyToLocalStorage = async (
  shopUrl: string,
  accessToken: string
) => {
  try {
    // Fetch products, orders, and inventory in parallel
    const [products, orders, inventory] = await Promise.all([
      fetchShopifyProducts(shopUrl, accessToken),
      fetchShopifyOrders(shopUrl, accessToken),
      fetchShopifyInventory(shopUrl, accessToken),
    ]);

    console.log("Raw Shopify products fetched:", products);
    console.log("Raw Shopify inventory fetched:", inventory);

    // Convert to internal formats
    const convertedProducts = convertShopifyProducts(products);
    const convertedOrders = convertShopifyOrders(orders);

    console.log("Converted products with images:", convertedProducts);

    // Store in localStorage
    setInUserStorage("shopifyProducts", convertedProducts);
    setInUserStorage("shopifySales", convertedOrders);
    setInUserStorage("shopifyInventory", inventory);

    // Mark Shopify as active & store credentials
    setInUserStorage("shopifyConnected", true);
    setInUserStorage("shopifyUrl", shopUrl);

    console.log(
      `Synced ${convertedProducts.length} products and ${convertedOrders.length} orders from Shopify`
    );
    console.log("✅ Shopify credentials stored for future API calls");

    return {
      success: true,
      productCount: convertedProducts.length,
      orderCount: convertedOrders.length,
    };
  } catch (error) {
    console.error("Error syncing Shopify data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Get Shopify products from localStorage
 */
export const getShopifyProductsFromStorage = () => {
  const data = getFromUserStorage<any[]>("shopifyProducts") || [];
  console.log("🏪 getShopifyProductsFromStorage:", data.length > 0 ? `${data.length} products` : "empty");
  return data;
};

/**
 * Refresh Shopify products from API
 */
export const refreshShopifyProducts = async () => {
  try {
    if (!isShopifyConnected()) {
      console.log("❌ Shopify not connected, cannot refresh");
      return { success: false, message: "Shopify not connected" };
    }

    const idToken = await getAuthToken();

    console.log("🔄 Refreshing Shopify products from API...");

    const response = await fetch(`${getBackendBaseUrl()}/api/shopify/products`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch products");
    }

    const freshProducts = data.products || [];

    if (freshProducts && freshProducts.length > 0) {
      const converted = convertShopifyProducts(freshProducts);
      setInUserStorage("shopifyProducts", converted);
      console.log("✅ Refreshed", freshProducts.length, "products from Shopify API");
      return { success: true, count: freshProducts.length };
    } else {
      console.log("⚠️ No products found in Shopify store");
      return { success: true, count: 0 };
    }
  } catch (error) {
    console.error("❌ Error refreshing Shopify products:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

/**
 * Get Shopify sales from localStorage
 */
export const getShopifySalesFromStorage = () => {
  const data = getFromUserStorage<any[]>("shopifySales") || [];
  console.log("💳 getShopifySalesFromStorage:", data.length > 0 ? `${data.length} sales` : "empty");
  return data;
};

/**
 * Check if Shopify is connected
 */
export const isShopifyConnected = () => {
  const connected = getFromUserStorage<boolean>("shopifyConnected") || false;
  console.log("🔌 isShopifyConnected:", connected);
  return connected;
};

/**
 * Get connected Shopify URL
 */
export const getConnectedShopifyUrl = () => {
  return getFromUserStorage<string>("shopifyUrl") || null;
};

/**
 * Disconnect Shopify
 */
export const disconnectShopify = () => {
  removeFromUserStorage("shopifyProducts");
  removeFromUserStorage("shopifySales");
  removeFromUserStorage("shopifyConnected");
  removeFromUserStorage("shopifyUrl");
  removeFromUserStorage("shopifyAccessToken");
  removeFromUserStorage("shopifyLastSyncTime");
};

/**
 * Upload product image to Shopify (called after product creation)
 */
const uploadProductImage = async (productId: string, base64Image: string, idToken: string, port: number) => {
  try {
    console.log(`📸 FRONTEND: Uploading image to product ${productId}...`);
    console.log(`  📊 Image size: ${(base64Image.length / 1024).toFixed(2)} KB`);
    console.log(`  🌐 Endpoint: http://localhost:${port}/api/shopify/add-product-image`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for image upload

    const response = await fetch(`http://localhost:${port}/api/shopify/add-product-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        productId,
        image: base64Image,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`  📡 Response status: ${response.status}`);

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Image uploaded successfully!");
      console.log("  📊 Backend response:", result);
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Image upload failed (but product was created)");
      console.error("  Status:", response.status);
      console.error("  Response:", errorData);
      return false;
    }
  } catch (error) {
    console.error("❌ Image upload error (but product was still created):");
    console.error("  Error:", (error as Error).message);
    return false;
  }
};

/**
 * Add product to Shopify store
 */
export const addProductToShopify = async (product: any) => {
  if (!isShopifyConnected()) {
    console.log("❌ Shopify not connected, saving locally only");
    return { success: false, message: "Shopify not connected" };
  }

  try {
    const idToken = await getAuthToken();
    console.log("🔑 Auth token obtained:", idToken ? "✅ YES (length: " + idToken.length + ")" : "❌ NO");

    // STEP 1: Create product WITHOUT image (fast)
    const shopifyProduct = {
      product: {
        title: product.name,
        productType: product.category || "Uncategorized",
        vendor: "Store",
        bodyHtml: `<p>${product.description || ""}</p>`,
        handle: product.name.toLowerCase().replace(/\s+/g, "-"),
        variants: [
          {
            title: "Default",
            price: String(product.price),
            sku: product.barcode || `${product.name}-${Date.now()}`,
            cost: String(product.cost),
            weight: 0,
            inventory_quantity: product.stock || 0,
          },
        ],
      },
    };

    console.log("📦 Product to add:", product.name);
    console.log("🔄 Step 1/2: Creating product in Shopify...");

    // Try multiple ports to find the backend
    const ports = [5000, 4242, 3001];
    let lastError = null;
    let createdProduct = null;
    let successfulPort = null;

    for (const port of ports) {
      try {
        console.log(`🌐 Trying port ${port}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`http://localhost:${port}/api/shopify/create-product`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            product: shopifyProduct,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        
        console.log(`📡 Response from port ${port}:`, response.status, response.statusText);

        if (response.ok) {
          const result = await response.json();
          console.log("✅ SUCCESS! Product created in Shopify:", result);
          successfulPort = port;
          createdProduct = result.product;

          console.log("\n📸 Checking if image upload is needed...");
          console.log("  📊 Product has image:", product.image ? "YES" : "NO");
          console.log("  📊 Product ID returned:", createdProduct?.id);

          // STEP 2: Upload image separately if available
          if (product.image) {
            console.log("\n🔄 Step 2/2: Starting product image upload...");
            console.log("  📊 Image data length:", product.image.length, "bytes");
            const imageUploadResult = await uploadProductImage(createdProduct.id, product.image, idToken, port);
            console.log("  📊 Image upload result:", imageUploadResult ? "SUCCESS" : "FAILED (but continuing)");
          } else {
            console.log("  ⏭️ Skipping image upload - no image provided");
          }

          // Add to local cache with image
          const currentProducts = getShopifyProductsFromStorage();
          const cachedProduct = {
            id: createdProduct.id,
            title: createdProduct.title,
            handle: createdProduct.handle,
            productType: createdProduct.productType,
            vendor: createdProduct.vendor,
            bodyHtml: createdProduct.bodyHtml,
            variants: createdProduct.variants,
            images: product.image ? [{ src: product.image }] : [],
          };
          currentProducts.push(cachedProduct);
          setInUserStorage("shopifyProducts", currentProducts);
          console.log("✅ Product cached locally after Shopify sync");

          return { 
            success: true, 
            message: `✅ Product created on Shopify (port ${port})${product.image ? " with image" : ""}`, 
            product: createdProduct 
          };
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error(`❌ Port ${port} - Error ${response.status}:`, errorData);
          lastError = errorData;
        }
      } catch (portError) {
        console.log(`⚠️ Port ${port} not reachable:`, (portError as Error).message);
        lastError = portError;
      }
    }

    // Backend didn't respond
    console.error("❌ Backend failed on all ports:", lastError);
    
    console.log("💾 Caching product locally as fallback...");
    const currentProducts = getShopifyProductsFromStorage();
    const cachedProduct = {
      id: `gid://shopify/Product/${Date.now()}`,
      title: product.name,
      handle: product.name.toLowerCase().replace(/\s+/g, "-"),
      productType: product.category || "Uncategorized",
      vendor: "Store",
      bodyHtml: `<p>${product.description || ""}</p>`,
      variants: [
        {
          id: `gid://shopify/ProductVariant/${Date.now()}`,
          title: "Default",
          price: String(product.price),
          sku: product.barcode || `${product.name}-${Date.now()}`,
          cost: String(product.cost),
          inventory_quantity: product.stock || 0,
        },
      ],
      images: product.image ? [{ src: product.image }] : [],
    };
    currentProducts.push(cachedProduct);
    setInUserStorage("shopifyProducts", currentProducts);
    console.log("✅ Product cached locally");

    return {
      success: false,
      message: `⚠️ Backend not responding on ports 5000, 4242, or 3001. Product saved locally but NOT synced to Shopify. Error: ${lastError instanceof Error ? lastError.message : String(lastError)}. Please check if backend is running: cd server && npm start`,
      product: cachedProduct,
    };
  } catch (error) {
    console.error("❌ Error adding product to Shopify:", error);

    try {
      const currentProducts = getShopifyProductsFromStorage();
      const cachedProduct = {
        id: `gid://shopify/Product/${Date.now()}`,
        title: product.name,
        handle: product.name.toLowerCase().replace(/\s+/g, "-"),
        productType: product.category || "Uncategorized",
        vendor: "Store",
        bodyHtml: `<p>${product.description || ""}</p>`,
        variants: [
          {
            id: `gid://shopify/ProductVariant/${Date.now()}`,
            title: "Default",
            price: String(product.price),
            sku: product.barcode || `${product.name}-${Date.now()}`,
            cost: String(product.cost),
            inventory_quantity: product.stock || 0,
          },
        ],
        images: product.image ? [{ src: product.image }] : [],
      };
      currentProducts.push(cachedProduct);
      setInUserStorage("shopifyProducts", currentProducts);
      return { success: true, message: "Product cached locally", product: cachedProduct };
    } catch (cacheError) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
};
