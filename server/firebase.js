const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Load environment variables immediately
dotenv.config();

if (!admin.apps.length) {
  let credential;

  const parseServiceAccount = (rawValue) => {
    const trimmedValue = String(rawValue || "").trim();
    if (!trimmedValue) {
      throw new Error("Empty FIREBASE_SERVICE_ACCOUNT value");
    }

    const tryParse = (input) => JSON.parse(input);

    try {
      return tryParse(trimmedValue.replace(/\\n/g, "\n"));
    } catch (_) {
      // Continue with fallbacks
    }

    try {
      // Base64 JSON fallback (optional safer env transport)
      if (/^[A-Za-z0-9+/=\r\n]+$/.test(trimmedValue) && !trimmedValue.startsWith("{")) {
        const decoded = Buffer.from(trimmedValue, "base64").toString("utf8");
        return tryParse(decoded);
      }
    } catch (_) {
      // Continue with next fallback
    }

    // Repair common Render paste issue: raw newlines inside private_key string
    const repaired = trimmedValue
      .replace(/\r\n/g, "\n")
      .replace(/"private_key"\s*:\s*"([\s\S]*?)"\s*,/m, (match, privateKeyBody) => {
        const fixedKey = privateKeyBody
          .replace(/\\n/g, "\n")
          .replace(/\n/g, "\\n");
        return match.replace(privateKeyBody, fixedKey);
      });

    return tryParse(repaired);
  };
  
  const saValue = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saValue) {
    const trimmed = saValue.trim();
    try {
      if (trimmed.startsWith("{")) {
        const serviceAccount = parseServiceAccount(trimmed);
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
