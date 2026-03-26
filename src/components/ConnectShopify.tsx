/**
 * ConnectShopify Modal Component
 * Connects via Shopify OAuth to obtain a real Admin API access token.
 */

import { useState } from "react";
import { AlertCircle, Loader } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getApiUrl } from "../config/api";
import "../styles/ConnectShopify.css";

interface ConnectShopifyProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Construct backend URL - use API config or environment variable
const BACKEND =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : `https://${window.location.hostname.replace("nayance.com", "nayance-backend.onrender.com")}`);

export default function ConnectShopify({
  isOpen,
  onClose,
}: ConnectShopifyProps) {
  const { user } = useAuth();
  const [shopUrl, setShopUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatShop = (url: string): string => {
    let s = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!s.includes(".")) s = `${s}.myshopify.com`;
    else if (!s.includes(".myshopify.com")) s = s; // keep as-is if custom domain entered
    return s;
  };

  /** Kick off the Shopify OAuth flow — browser navigates to Shopify, then back here */
  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();

    if (!shopUrl.trim()) { setError("Please enter your Shopify store URL"); return; }
    if (!user?.uid)      { setError("You must be logged in"); return; }

    const shop = formatShop(shopUrl.trim());
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop)) {
      setError("Enter a valid .myshopify.com store URL");
      return;
    }

    setLoading(true);
    setError("");

    // Store userId and shop URL in localStorage so we can use them after the OAuth redirect returns
    localStorage.setItem("shopifyPendingUserId", user.uid);
    localStorage.setItem("shopifyPendingShop", shop);
    // Also persist as the active store URL for fallback sync paths
    localStorage.setItem("shopifyStoreUrl", shop);

    // Redirect the whole browser to the backend OAuth start endpoint.
    // Shopify will authorize, then redirect to our /api/shopify/oauth/callback,
    // which saves the real access token to Firestore and redirects back to
    // http://localhost:3000/integrations?shopify=connected
    const oauthUrl = `${BACKEND}/api/shopify/oauth/start?shop=${encodeURIComponent(shop)}&userId=${encodeURIComponent(user.uid)}`;
    console.log("🔗 Starting Shopify OAuth:", oauthUrl);
    window.location.href = oauthUrl;
  };

  const handleClose = () => {
    setShopUrl("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container shopify-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Connect Your Shopify Store</h2>
          <button className="modal-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="modal-body">
          <p className="modal-subtitle">
            Link your Shopify store to sync products, orders, and inventory in real-time.
          </p>

        {loading ? (
            <div className="loading-state">
              <Loader className="spinner" size={48} />
              <h3>Redirecting to Shopify...</h3>
              <p>You'll be taken to Shopify to authorize access, then brought back here automatically.</p>
            </div>
          ) : (
            <>
              <form onSubmit={handleConnect}>
                <div className="form-group">
                  <label htmlFor="shop-url">
                    <span>Shopify Store URL</span>
                    <span className="form-required">*</span>
                  </label>
                  <input
                    id="shop-url"
                    type="text"
                    placeholder="mystore.myshopify.com"
                    value={shopUrl}
                    onChange={(e) => { setShopUrl(e.target.value); setError(""); }}
                    disabled={loading}
                  />
                  <p className="form-hint">e.g. nayance-dev.myshopify.com</p>
                </div>

                {error && (
                  <div className="alert alert-error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={loading || !shopUrl.trim()}
                >
                  {loading ? "Redirecting..." : "Connect via Shopify"}
                </button>
              </form>

              <div className="modal-info-box">
                <h4>🔐 Secure OAuth connection:</h4>
                <ol>
                  <li>Enter your store URL</li>
                  <li>You'll be redirected to Shopify to approve access</li>
                  <li>After approval, you're brought back automatically</li>
                  <li>Real products &amp; orders sync instantly</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
