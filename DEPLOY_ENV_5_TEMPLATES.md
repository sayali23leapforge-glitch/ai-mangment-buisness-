# Deployment ENV Templates (5 Copy/Paste Blocks)

Use these exactly as templates, then replace placeholder values.
For URL migration, replace local URLs with your Render URL.

---

## 1) Render Backend Service ENV (server)

```env
NODE_ENV=production
PORT=10000

CLIENT_DOMAIN=https://your-frontend-domain.com

STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

SHOPIFY_API_KEY=optional_shopify_api_key
SHOPIFY_API_SECRET=optional_shopify_api_secret
SHOPIFY_APP_URL=https://your-render-backend.onrender.com
SHOPIFY_REDIRECT_URI=https://your-render-backend.onrender.com/api/shopify/oauth/callback

QUICKBOOKS_CLIENT_ID=optional_quickbooks_client_id
QUICKBOOKS_CLIENT_SECRET=optional_quickbooks_client_secret
QUICKBOOKS_REDIRECT_URI=https://your-render-backend.onrender.com/api/quickbooks/callback
```

---

## 2) Frontend `.env` for production build

```env
VITE_API_URL=https://your-render-backend.onrender.com

VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
VITE_EMAILJS_SERVICE_ID=service_xxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxx

VITE_OPENAI_API_KEY=your_openai_api_key

VITE_STRIPE_PUBLIC_KEY=pk_live_YOUR_PUBLISHABLE_KEY
VITE_STRIPE_PRICE_GROWTH_MONTHLY=price_xxx
VITE_STRIPE_PRICE_GROWTH_YEARLY=price_xxx
VITE_STRIPE_PRICE_PRO_MONTHLY=price_xxx
VITE_STRIPE_PRICE_PRO_YEARLY=price_xxx
```

---

## 3) Render Web Service ENV Quick List (same values as Block 1)

```env
NODE_ENV=production
PORT=10000
CLIENT_DOMAIN=https://your-frontend-domain.com
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
FIREBASE_SERVICE_ACCOUNT={...json service account...}
```

---

## 4) Wix / Client-side integration ENV-style mapping

```env
WIX_PUBLIC_API_BASE=https://your-render-backend.onrender.com
WIX_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
WIX_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
WIX_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
WIX_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
```

Use these Wix values in your Wix dashboard secrets/config mapping.

---

## 5) Local Development ENV

```env
# root .env
VITE_API_URL=http://localhost:4242
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
VITE_EMAILJS_SERVICE_ID=service_xxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxx
VITE_OPENAI_API_KEY=your_openai_api_key

# server/.env
PORT=4242
CLIENT_DOMAIN=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
FIREBASE_SERVICE_ACCOUNT=./firebase-adminsdk.json
```

---

## URL Replacement Rule

- Replace every `http://localhost:4242` with `https://your-render-backend.onrender.com`
- Replace every `http://localhost:5173` (or 3000/3001) with your deployed frontend URL
