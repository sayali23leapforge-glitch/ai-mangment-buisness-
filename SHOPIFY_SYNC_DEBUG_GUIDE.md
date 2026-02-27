# 🚀 Shopify Product Sync - Debugging Guide

## What to Test

### **Step 1: Add a Test Product**

1. Go to **Add Product** page
2. Fill in:
   - Name: `ShopifyTest123`
   - Stock: `999` (use a unique number)
   - Price: `$77.77`
   - Cost: `$33.33`
   - Category: `Test`
   - Upload an image (optional)
3. Click **Save Product**

### **Step 2: Check Console Logs (F12 → Console)**

Look for this exact sequence:

```
1️⃣ 💾 Saving product: ShopifyTest123 stock: 999 image KB: ...
   ↓
2️⃣ ✅ Product saved to local storage
   ↓
3️⃣ 🔌 Shopify connection status in localStorage: true
   🔌 isShopifyConnected() result: true
   ↓
4️⃣ 📡 Shopify is connected, attempting to sync product...
   ↓
5️⃣ 🔑 Auth token obtained: ✅ YES (length: XXX)
   ↓
6️⃣ 📦 Product to add: ShopifyTest123
   📋 Product payload: { product: { title: "ShopifyTest123", ... } }
   🔄 Attempting to create product in Shopify...
   ↓
7️⃣ 🌐 Trying port 5000...
   📡 Response from port 5000: 200 OK
      ✅ SUCCESS! Product created in Shopify: {...}
   ↓
8️⃣ 📡 Shopify sync result: { success: true, message: "✅ Product created on Shopify..." }
```

### **Step 3: Check Your Shopify Admin**

1. Go to: https://nayance-dev.myshopify.com/
2. Go to: **Products**
3. Search for: `ShopifyTest123`
4. Should find product with:
   - ✅ Stock: 999 (or inventory level set to 999)
   - ✅ Price: $77.77
   - ✅ Image: (if you uploaded one)

---

## ⚠️ If Something Goes Wrong

### **Problem 1: All Ports Failed**

**Expected Console Output:**
```
❌ Backend failed on all ports: [ERROR]
💾 Caching product locally as fallback...
✅ Product cached locally
```

**Solution:**
1. Check if backend is running: `npm start` in `/server` folder
2. Backend should show: `🚀 Stripe server running on http://localhost:5000`
3. If not running, start it!

### **Problem 2: Port 5000 Responded with 401/403**

**Expected Console Output:**
```
❌ Port 5000 - Error 401: { error: "Unauthorized" }
```

**Solution:**
1. Auth token not valid or Shopify credentials wrong
2. Go to **Integrations**
3. Click **"Connect to Shopify"** 
4. Re-enter credentials
5. Click **"Test Connection"**
6. Try adding product again

### **Problem 3: Product in Inventory But Not in Shopify**

**Diagnosis:**
Run in console:
```javascript
// Check where product ended up
const products = JSON.parse(localStorage.getItem("products") || "[]");
const shopifyProducts = JSON.parse(localStorage.getItem("shopifyProducts") || "[]");

console.log("Local products:", products.length);
console.log("Shopify cached products:", shopifyProducts.length);

products.forEach(p => console.log("Local:", p.name, "- Stock:", p.stock));
shopifyProducts.forEach(p => console.log("Shopify:", p.title, "- Stock:", p.variants?.[0]?.inventory_quantity));
```

**If Product In Local But NOT In Shopify Cache:**
- Backend never received the request
- Check console for port errors
- Restart backend and try again

**If Product In BOTH Caches:**
- Product should be in Shopify (might take 1-2 min to appear)
- Refresh Shopify admin page
- Check if there's an error in Shopify

---

## 🔍 Full Debug Report

Copy-paste this in console for complete diagnostics:

```javascript
console.log("=== SHOPIFY SYNC DIAGNOSTICS ===");

// 1. Local products
const products = JSON.parse(localStorage.getItem("products") || "[]");
console.log("1. Local Storage Products:", products.length);
products.forEach((p, i) => {
  console.log(`   ${i+1}. ${p.name} (ID: ${p.id}) - Stock: ${p.stock}`);
});

// 2. Shopify cached products
const shopifyProducts = JSON.parse(localStorage.getItem("shopifyProducts") || "[]");
console.log("2. Shopify Cache:", shopifyProducts.length);
shopifyProducts.forEach((p, i) => {
  const stock = p.variants?.[0]?.inventory_quantity || 0;
  console.log(`   ${i+1}. ${p.title} (ID: ${p.id}) - Stock: ${stock}`);
});

// 3. Connection status
console.log("3. Shopify Connected:", localStorage.getItem("shopifyConnected"));
console.log("4. Shopify URL:", localStorage.getItem("shopifyUrl"));

// 4. Check for recent errors in localStorage
const errors = localStorage.getItem("shopifyErrors");
if (errors) {
  console.log("5. Recent Errors:", errors);
}

console.log("=== END DIAGNOSTICS ===");
```

---

## ✅ Expected Flow NOW

```
Add Product
    ↓
Save to local storage (✅ Always works)
    ↓
IF Shopify connected:
    ├─ Get auth token
    ├─ Detect backend port (tries 5000 first)
    ├─ Send product with all details (name, price, stock, image)
    ├─ Wait for Shopify API response
    ├─ Cache in localStorage
    └─ Return success/failure
    ↓
IF Shopify NOT connected:
    └─ Save locally only (with tip to connect)
    ↓
Navigate to Inventory Manager
    ↓
Product appears immediately
```

---

## 🧪 Test Results to Report Back

After adding a product, run this combo:

```javascript
// 1. Check console logs (copy-paste them)
// 2. Run diagnostics (above)
// 3. Check Shopify admin
// 4. Report:
//    - Did you see all 8 log steps?
//    - Did backend respond 200 OK?
//    - Is product in Shopify?
//    - Any errors in console?
```

---

## 🚀 What's Improved Now

✅ **Better Error Messages** - Shows exactly which port failed  
✅ **Timeout Protection** - Won't hang forever (5 sec timeout)  
✅ **Port Priority** - Tries 5000 first (where backend runs)  
✅ **Auth Logging** - Shows if token is valid  
✅ **Full Payload Logging** - You can see exactly what's being sent  
✅ **Better Fallback** - Clear message when backend unavailable  

---

## Next Steps

1. **Refresh browser** - `F5`
2. **Clear console** - `Ctrl+L` (to see fresh logs)
3. **Add a test product** - Follow Step 1 above
4. **Watch the console** - All 8 steps should appear
5. **Check Shopify admin** - Product should appear
6. **Report back** if any issues

**The flow should work now!** 🎉
