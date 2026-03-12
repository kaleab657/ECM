import admin from "firebase-admin";
import { S3Client } from "@aws-sdk/client-s3";

// Initialize Firebase Admin
export function initFirebaseAdmin() {
  if (admin.apps.length > 0) return admin;

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey.trim());
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    return admin;
  } catch (error: any) {
    return null;
  }
}

// R2 Configuration
export const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID || "6f96d3c811cf3c906e78d24533b0ec96",
  accessKeyId: process.env.R2_ACCESS_KEY_ID || "cf4e74dbdc92700d315dd81ec2806144",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "e2533e4b9224ed5b92fc9f01fe30639b95982dbc32dd5d4de685097b990c6bff",
  
  // Listing Images
  listingBucket: process.env.R2_LISTING_BUCKET || "ethiocars-images",
  listingPublicUrl: process.env.R2_LISTING_URL || "https://pub-26cca08a18064198a206549a3e2eb1c1.r2.dev",
  
  // Payment Proofs
  paymentBucket: process.env.R2_PAYMENT_BUCKET || "payment-proofs",
  paymentPublicUrl: process.env.R2_PAYMENT_URL || "https://pub-241e6fed684d40058707e17c356ae538.r2.dev",
};

// R2 Client Lazy Initializer
let _r2Client: S3Client | null = null;

export function getR2Client() {
  if (_r2Client) return _r2Client;

  if (!r2Config.accountId || !r2Config.accessKeyId || !r2Config.secretAccessKey) {
    throw new Error("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required.");
  }

  _r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  });

  return _r2Client;
}

// Auth Middleware Helper for Serverless
export async function authenticate(req: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: No token provided");
  }

  const idToken = authHeader.split("Bearer ")[1];
  const adminApp = initFirebaseAdmin();
  
  if (!adminApp) {
    // If no service account, we can't verify. In dev/preview we might bypass, 
    // but on Vercel production we should probably enforce it if the key is expected.
    if (process.env.NODE_ENV === 'production') {
      throw new Error("Internal Server Error: Firebase Admin not configured");
    }
    return { uid: 'dev-user', email: 'dev@example.com' };
  }

  try {
    const decodedToken = await adminApp.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error: any) {
    throw new Error(`Unauthorized: Invalid token - ${error.message}`);
  }
}
