const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Load environment variables immediately
dotenv.config();

if (!admin.apps.length) {
  let credential;
  
  // Try to load from file path first (new way)
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saPath) {
    try {
      const fullPath = path.isAbsolute(saPath) ? saPath : path.join(__dirname, saPath);
      const saContent = fs.readFileSync(fullPath, 'utf8');
      credential = admin.credential.cert(JSON.parse(saContent));
      console.log("✅ Firebase credentials loaded from file:", saPath);
    } catch (error) {
      console.error("❌ Failed to load service account from file:", error.message);
      throw new Error("FIREBASE_SERVICE_ACCOUNT file not found or invalid");
    }
  } else {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is missing");
  }
  
  admin.initializeApp({
    credential: credential,
  });
  console.log("✅ Firebase Admin SDK initialized");
}

const db = admin.firestore();
module.exports = { admin, db };
