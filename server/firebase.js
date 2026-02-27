const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Load environment variables immediately
dotenv.config();

if (!admin.apps.length) {
  let credential;
  
  const saValue = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saValue) {
    const trimmed = saValue.trim();
    try {
      if (trimmed.startsWith("{")) {
        const serviceAccount = JSON.parse(trimmed.replace(/\\n/g, "\n"));
        credential = admin.credential.cert(serviceAccount);
        console.log("✅ Firebase credentials loaded from FIREBASE_SERVICE_ACCOUNT JSON");
      } else {
        const fullPath = path.isAbsolute(trimmed) ? trimmed : path.join(__dirname, trimmed);
        const saContent = fs.readFileSync(fullPath, 'utf8');
        credential = admin.credential.cert(JSON.parse(saContent));
        console.log("✅ Firebase credentials loaded from file:", trimmed);
      }
    } catch (error) {
      console.error("❌ Failed to load FIREBASE_SERVICE_ACCOUNT:", error.message);
      throw new Error("FIREBASE_SERVICE_ACCOUNT is invalid (use JSON string or valid file path)");
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
