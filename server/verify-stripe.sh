#!/bin/bash

# Stripe Setup Verification Script for Render

echo "🔍 Stripe Configuration Diagnostic"
echo "=================================="
echo ""

# Check if we're on Render
if [ -n "$RENDER" ]; then
  echo "✅ Running on Render.com"
else
  echo "⚠️ Not running on Render (might be local)"
fi

echo ""
echo "Checking Environment Variables:"
echo "------------------------------"

# Check Stripe Secret Key (don't display full key for security)
if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "❌ STRIPE_SECRET_KEY: NOT SET"
  echo "   Action: Add STRIPE_SECRET_KEY to Render Environment"
else
  KEY_LENGTH=${#STRIPE_SECRET_KEY}
  KEY_PREFIX="${STRIPE_SECRET_KEY:0:20}"
  echo "✅ STRIPE_SECRET_KEY: SET ($KEY_LENGTH chars)"
  echo "   Prefix: $KEY_PREFIX..."
  
  # Check if it's a valid format
  if [[ $STRIPE_SECRET_KEY =~ ^sk_ ]]; then
    echo "   ✅ Format is correct (starts with 'sk_')"
  else
    echo "   ❌ WARNING: Key doesn't start with 'sk_'"
  fi
fi

echo ""

# Check Firebase
if [ -z "$FIREBASE_SERVICE_ACCOUNT" ]; then
  echo "⚠️ FIREBASE_SERVICE_ACCOUNT: NOT SET (optional, payments will still work)"
else
  echo "✅ FIREBASE_SERVICE_ACCOUNT: SET"
fi

echo ""

# Check Node Environment
echo "Runtime Information:"
echo "-------------------"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: ${PORT:-3001}"
echo "Node Version: $(node -v 2>/dev/null || echo 'N/A')"
echo "NPM Version: $(npm -v 2>/dev/null || echo 'N/A')"

echo ""
echo "To fix missing STRIPE_SECRET_KEY:"
echo "1. Go to Render Dashboard"
echo "2. Select 'ai-business-management' service"
echo "3. Click Environment"
echo "4. Add: STRIPE_SECRET_KEY = your_stripe_secret_key"
echo "5. Save and wait 2-3 minutes for redeploy"
