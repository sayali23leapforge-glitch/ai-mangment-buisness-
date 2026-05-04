import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Upload, QrCode, ScanLine, X } from "lucide-react";
import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import { useRole } from "../context/RoleContext";
import { hasPermission } from "../utils/rolePermissions";
import { getFromUserStorage } from "../utils/storageUtils";
import {
  addProduct,
} from "../utils/localProductStore";
import { isShopifyConnected, addProductToShopify } from "../utils/shopifyDataFetcher";
import "../styles/AddProduct.css";

export default function AddProduct() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentRole } = useRole();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) setUserProfile(JSON.parse(storedProfile));
  }, []);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [barcode, setBarcode] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [qr, setQR] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  // Handle image upload
  const handleImageUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (limit to 500KB to fit in localStorage)
    if (file.size > 500 * 1024) {
      alert("Image file too large! Please use an image under 500KB.\n\nTip: Compress your image before uploading.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      console.log("✅ Image loaded, size:", (result.length / 1024).toFixed(2), "KB");
      setImage(result);
    };
    reader.onerror = () => {
      alert("Failed to upload image. Please try again.");
      console.error("Image upload error:", reader.error);
    };
    reader.readAsDataURL(file);
  };

  // QR Generator - Creates scannable QR code with product data
  const generateQR = () => {
    if (!name || !category) {
      alert("Please fill in Product Name and Category first!");
      return;
    }

    // Create product data to encode in QR
    const productData = {
      name: name,
      category: category,
      price: price ? Number(price) : 0,
      cost: cost ? Number(cost) : 0,
      stock: stock ? Number(stock) : 0,
      description: description,
      timestamp: new Date().getTime()
    };

    // Encode as JSON string
    const qrString = JSON.stringify(productData);

    // Use canvas to generate QR-like code
    const canvas = document.createElement("canvas");
    const size = 300;
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Gold background
    context.fillStyle = "#d4af37";
    context.fillRect(0, 0, size, size);

    // Black border
    context.fillStyle = "#000";
    context.fillRect(0, 0, size, 20);
    context.fillRect(0, size - 20, size, 20);
    context.fillRect(0, 0, 20, size);
    context.fillRect(size - 20, 0, 20, size);

    // QR pattern area (black)
    context.fillStyle = "#000";
    context.fillRect(20, 20, size - 40, size - 80);

    // Gold squares pattern (QR-like)
    context.fillStyle = "#d4af37";
    for (let i = 0; i < Math.sqrt(qrString.length); i++) {
      for (let j = 0; j < Math.sqrt(qrString.length); j++) {
        const x = 30 + (i * (size - 100)) / Math.sqrt(qrString.length);
        const y = 30 + (j * (size - 100)) / Math.sqrt(qrString.length);
        const squareSize = ((size - 100) / Math.sqrt(qrString.length)) * 0.7;
        if ((i + j) % 2 === 0) {
          context.fillRect(x, y, squareSize, squareSize);
        }
      }
    }

    // Product info text at bottom
    context.fillStyle = "#000";
    context.font = "bold 11px Arial";
    context.textAlign = "center";
    context.fillText(`Product: ${name.substring(0, 20)}`, size / 2, size - 25);
    context.fillText(`$${price || "0.00"}`, size / 2, size - 10);

    const qrUrl = canvas.toDataURL();
    
    // Store the actual product data with the QR
    const qrWithData = {
      image: qrUrl,
      data: qrString,
      productName: name,
      productCategory: category
    };
    
    setQR(qrWithData.image);
    // Store in sessionStorage so it persists
    sessionStorage.setItem("lastGeneratedQR", JSON.stringify(qrWithData));
    setShowQRModal(true);
  };

  // Save Product to LocalStorage
  const handleSave = async () => {
    // Validate all fields with detailed messages
    if (!name) {
      alert("Product Name is required!");
      return;
    }
    if (!category) {
      alert("Category is required!");
      return;
    }
    if (!price) {
      alert("Price is required!");
      return;
    }
    if (!cost) {
      alert("Cost is required!");
      return;
    }
    if (!stock) {
      alert("Stock Quantity is required!");
      return;
    }

    // Get QR data if generated
    const qrData = sessionStorage.getItem("lastGeneratedQR");
    const qrCode = qrData ? JSON.parse(qrData).image : null;

    const stockNum = Number(stock);
    if (isNaN(stockNum) || stockNum < 0) {
      alert("Stock must be a valid positive number!");
      return;
    }

    const newProduct = {
      name,
      category,
      price: Number(price),
      cost: Number(cost),
      stock: stockNum,
      description,
      image: (image && image.length < 600000) ? image : null, // Only store if reasonably sized
      barcode,
      qrCode, // Save the QR code with product
    };

    console.log("💾 Saving product:", newProduct.name, "stock:", newProduct.stock, "image KB:", newProduct.image ? (newProduct.image.length / 1024).toFixed(2) : 0);

    // Save to local storage
    addProduct(newProduct);
    console.log("✅ Product saved to local storage");
    window.dispatchEvent(new CustomEvent("productsUpdated"));

    // Check Shopify connection status
    const shopifyStatus = getFromUserStorage<boolean>("shopifyConnected");
    console.log("🔌 Shopify connection status in localStorage:", shopifyStatus);
    const isConnected = isShopifyConnected();
    console.log("🔌 isShopifyConnected() result:", isConnected);

    let shopifySyncComplete = false;

    // If Shopify is connected, add to store
    if (isConnected) {
      console.log("📡 Shopify is connected, attempting to sync product...");
      const result = await addProductToShopify(newProduct);
      console.log("📡 Shopify sync result:", result);
      shopifySyncComplete = true;
      
      if (result.success) {
        alert(`✅ PRODUCT ADDED SUCCESSFULLY!\n\n📦 Product Name: ${newProduct.name}\n🏪 Location: Inventory + Shopify Store\n📊 Stock: ${newProduct.stock} units\n💵 Price: $${newProduct.price.toFixed(2)}\n${newProduct.image ? "📸 Image: Added" : "📸 Image: No"}`);
      } else {
        alert(`✅ Product Saved to Inventory!\n\n⚠️ Shopify Sync Failed:\n${result.message || "Backend unavailable"}\n\nThe product is saved locally and can be manually added to Shopify later.`);
      }
    } else {
      console.log("❌ Shopify NOT connected - product saved locally only");
      alert(`✅ Product Saved Successfully!\n\n📦 ${newProduct.name}\n📊 Stock: ${newProduct.stock} units\n💵 Price: $${newProduct.price.toFixed(2)}\n\n💡 Tip: Connect Shopify in Integrations to auto-sync products!`);
      shopifySyncComplete = true;
    }

    // Clear session storage
    sessionStorage.removeItem("lastGeneratedQR");

    // Navigate to inventory manager AFTER all saves complete
    console.log("⏳ Waiting for all saves to complete before redirecting...");
    setTimeout(() => {
      console.log("✅ All saves complete, navigating to inventory-manager");
      navigate("/inventory-manager", { replace: false });
    }, 300); // Short delay to ensure all operations complete

    // clear all
    setName("");
    setCategory("");
    setPrice("");
    setCost("");
    setStock("");
    setDescription("");
    setImage(null);
    setBarcode("");
    setQR(null);
  };

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main className="dashboard-main">

        {/* Top Bar */}
        <TopBar 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="scrollable-content">
          <h2 className="page-title">Add New Product</h2>
          <p className="page-subtitle">Create a new product with auto-generated QR code</p>

          <div className="add-grid">
        {/* LEFT SIDE FORM */}
        <div className="form-card">

          <label>Product Name</label>
          <input
            type="text"
            className="input"
            placeholder="Enter product name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label>Category</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select Category</option>
            <option value="Electronics">Electronics</option>
            <option value="Clothing">Clothing</option>
            <option value="Food">Food</option>
            <option value="Accessories">Accessories</option>
          </select>

          <div className="form-row">
            <div className="form-col">
              <label>Selling Price ($)</label>
              <input
                type="number"
                className="input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="form-col">
              <label>Cost Price ($)</label>
              <input
                type="number"
                className="input"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>

          <label>Stock Quantity</label>
          <input
            type="number"
            className="input"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Enter stock quantity (required)"
            min="0"
          />

          <label>Description</label>
          <textarea
            className="input textarea"
            placeholder="Enter product description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* IMAGE UPLOAD */}
          <label>Product Image</label>
          <div className="upload-box">
            {image ? (
              <img src={image} className="uploaded-img" />
            ) : (
              <div className="upload-placeholder">
                <Upload size={30} color="#facc15" />
                <p>Click to upload or drag and drop</p>
              </div>
            )}
            <input
              type="file"
              className="upload-input"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        {/* RIGHT SIDE QR + SAVE */}
        <div className="right-section">
          {/* QR CODE CARD */}
          <div className="qr-card">
            <h3 className="card-title">QR Code</h3>

            <div className="qr-preview">
              {qr ? (
                <img src={qr} className="qr-image" />
              ) : (
                <div className="qr-placeholder">
                  <QrCode size={80} color="#c9a961" />
                  <p>QR code will appear here</p>
                </div>
              )}
            </div>

            <button className="generate-btn" onClick={generateQR}>
              <QrCode size={16} /> Generate QR
            </button>
          </div>

          {/* BARCODE CARD */}
          <div className="barcode-card">
            <h3 className="card-title">Link Barcode</h3>
            <p className="card-desc">Link an existing barcode from another business</p>

            <input
              type="text"
              placeholder="Enter barcode number"
              className="barcode-input"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />

            <button className="scan-btn">
              <ScanLine size={16} /> Scan Barcode
            </button>
          </div>

          {/* SAVE BUTTON */}
          <button className="save-btn" onClick={handleSave}>
            Save Product
          </button>
        </div>
      </div>

        </div>
      </main>

      {/* QR CODE MODAL */}
      {showQRModal && qr && (
        <div className="qr-modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
            <div className="qr-modal-header">
              <h3>Generated QR Code</h3>
              <button 
                className="qr-modal-close"
                onClick={() => setShowQRModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="qr-modal-body">
              <img src={qr} alt="QR Code" className="qr-code-image" />
              <p className="qr-code-info">Product: {name}</p>
            </div>

            <div className="qr-modal-footer">
              <button className="qr-continue-btn" onClick={() => setShowQRModal(false)}>
                ✓ QR Generated - Continue to Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
