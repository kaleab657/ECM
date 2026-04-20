import express from "express";
import { createServer as createViteServer } from "vite";
import { PutObjectCommand, ListBucketsCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import crypto from "crypto";
import fs from "fs";
import { getR2Client, r2Config, initFirebaseAdmin } from "./src/lib/backend-config";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Initialize Firebase Admin
const admin = initFirebaseAdmin();
const db = admin?.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // [SECURITY FIX #5] Disable X-Powered-By header to prevent server fingerprinting
  app.disable('x-powered-by');

  // Helper to safely delete files from R2 and prevent orphans
  const deleteFilesFromR2 = async (urls: string[]) => {
    if (!urls || urls.length === 0) return;
    const r2 = getR2Client();
    for (const url of urls) {
      try {
        if (!url) continue;
        const urlObj = new URL(url);
        const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
        // Determine bucket based on the URL domain
        const bucket = url.includes(r2Config.paymentPublicUrl) ? r2Config.paymentBucket : r2Config.listingBucket;
        await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        console.log(`[R2 Cleanup] Deleted: ${key} from ${bucket}`);
      } catch (err: any) {
        // Log but don't crash — always continue cleanup
        console.error(`[R2 Cleanup] Failed to delete ${url}:`, err.message);
      }
    }
  };

  // Backwards-compatible alias
  const deleteListingImagesFromR2 = deleteFilesFromR2;

  // Helper to fetch and delete payment proof for a listing
  const deletePaymentProofFromR2 = async (listingId: string) => {
    if (!db) return;
    try {
      const paymentsSnap = await db.collection('payments')
        .where('listingId', '==', listingId)
        .get();
      const proofUrls: string[] = [];
      paymentsSnap.docs.forEach(doc => {
        const url = doc.data()?.screenshotURL;
        if (url) proofUrls.push(url);
      });
      if (proofUrls.length > 0) {
        await deleteFilesFromR2(proofUrls);
      }
    } catch (err: any) {
      console.error(`[R2 Cleanup] Failed to fetch/delete payment proof for listing ${listingId}:`, err.message);
    }
  };

  // Middleware: Authenticate requests from logged-in users
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (process.env.NODE_ENV !== 'production') {
        req.user = { uid: 'dev-user', email: 'dev@example.com' };
        return next();
      }
      return res.status(401).json({ success: false, error: "Unauthorized: No token provided" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    
    if (!admin) {
      if (process.env.NODE_ENV !== 'production') {
        req.user = { uid: 'dev-user', email: 'dev@example.com' };
        return next();
      }
      return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error: any) {
      res.status(401).json({ success: false, error: "Unauthorized: Invalid token", details: error.message });
    }
  };

  // Middleware: Only allow admin users
  const adminOnly = async (req: any, res: any, next: any) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

    if (!admin || !db) return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });

    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      const userData = userDoc.data();
      const isDefaultAdmin = user.email === 'kaleabepherem@gmail.com' || user.email === 'kaleabepherem98@gmail.com';
      
      if (!userDoc.exists || (userData?.role !== 'admin' && !isDefaultAdmin)) {
        // If it's the default admin but doc doesn't exist or role isn't set, auto-upgrade
        if (isDefaultAdmin) {
          await db.collection('users').doc(user.uid).set({
            role: 'admin',
            email: user.email,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
          return next();
        }

        // In dev mode, we might want to bypass this if we're testing
        if (process.env.NODE_ENV !== 'production' && user.uid === 'dev-user') {
          return next();
        }
        return res.status(403).json({ success: false, error: "Forbidden: Admin access required" });
      }
      next();
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Internal server error", details: error.message });
    }
  };

  // [SECURITY FIX #1] Restrict CORS to specific allowed origins (was: origin '*')
  //
  // Auth is handled via Authorization Bearer headers, NOT cookies.
  // Capacitor WebView origin (https://localhost) is explicitly allowed.
  const allowedOrigins = [
    'https://ethiocars-9jsd.onrender.com',  // Production frontend
    'https://localhost',                     // Capacitor WebView (Android/iOS)
  ];

  // In development, also allow local dev servers
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
  }

  const corsConfig = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (same-origin, server-to-server, mobile apps)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  };

  app.use(cors(corsConfig));

  // Explicit preflight handler for ALL routes.
  // OPTIONS requests must return 200/204 with correct CORS headers.
  app.options('*', cors(corsConfig));
  app.use(compression());

  // Browser Security Headers (CSP, CORP, HSTS)
  app.use((req, res, next) => {
    // Skip CSP for API endpoints — they return JSON, not HTML
    if (req.path.startsWith('/api')) {
      return next();
    }

    // [SECURITY FIX #2] Generate a per-request cryptographic nonce for inline scripts/styles
    // This replaces 'unsafe-inline' with a nonce-based policy
    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.cspNonce = nonce;

    // [SECURITY FIX #2] SHA-256 hashes for inline event handlers in index.html
    // These allow specific inline event handlers without 'unsafe-inline':
    //   onload="this.media='all'"  (Google Fonts lazy-load)
    //   onerror="this.style.display='none';"  (Splash image fallback)
    const onloadHash = crypto.createHash('sha256').update("this.media='all'").digest('base64');
    const onerrorHash = crypto.createHash('sha256').update("this.style.display='none';").digest('base64');

    // Content Security Policy — strict but compatible with Firebase SDK
    // Note: Firebase Auth SDK internally uses Function() constructor for
    // cross-origin iframe communication. 'wasm-unsafe-eval' is NOT the same
    // as 'unsafe-eval' and is the minimal CSP relaxation needed.
    const isProduction = process.env.NODE_ENV === 'production';

    // In production: use nonces (no unsafe-inline). In dev: keep unsafe-inline for Vite HMR.
    const scriptSrc = isProduction
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-hashes' 'sha256-${onloadHash}' 'sha256-${onerrorHash}' 'wasm-unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.google-analytics.com https://firebaseinstallations.googleapis.com`
      : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.google-analytics.com https://firebaseinstallations.googleapis.com";

    const styleSrc = isProduction
      ? `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`
      : "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com";

    const csp = [
      "default-src 'self'",
      scriptSrc,
      "worker-src 'self' blob:",
      "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.firebase.com https://*.cloudfunctions.net https://*.cloudflare.com https://*.onrender.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.r2.dev wss://*.firebaseio.com ws://localhost:* http://localhost:*",
      "img-src 'self' data: blob: https://*.picsum.photos https://*.googleusercontent.com https://*.gstatic.com https://*.firebasestorage.googleapis.com https://*.r2.dev https://r2.dev https://*.r2.cloudflarestorage.com",
      styleSrc,
      "font-src 'self' data: https://fonts.gstatic.com",
      "frame-src 'self' https://*.firebaseapp.com https://*.google.com",
      // [SECURITY FIX #3] frame-ancestors prevents clickjacking (replaces X-Frame-Options)
      "frame-ancestors 'self'",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');

    res.setHeader("Content-Security-Policy", csp);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    // [SECURITY FIX #6] Force HTTPS via Strict-Transport-Security
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });
  
  // R2 Upload Routes - MUST be before express.json() to handle raw body correctly
  app.post("/api/r2/upload-listing", authenticate, express.raw({ type: "*/*", limit: "20mb" }), async (req, res) => {
    let { fileName, fileType, customKey } = req.query as any;

    try {
      if (!fileName || !fileType) {
        return res.status(400).json({ success: false, error: "fileName and fileType are required in query params" });
      }

      if (!req.body || !(req.body instanceof Buffer) || req.body.length === 0) {
        return res.status(400).json({ success: false, error: "Empty or invalid file body" });
      }

      const targetBucket = r2Config.listingBucket;
      const key = customKey || `listings/${Date.now()}-${fileName}`;
      const r2Client = getR2Client();
      
      const command = new PutObjectCommand({
        Bucket: targetBucket,
        Key: key,
        ContentType: fileType,
        Body: req.body,
      });

      await r2Client.send(command);
      
      const domain = r2Config.listingPublicUrl.replace(/\/$/, "");
      const publicUrl = `${domain}/${key}`;

      res.json({ success: true, publicUrl, key, bucket: targetBucket });
    } catch (error: any) {
      console.error("Listing Upload Error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to upload listing image", 
        details: error.message,
        code: error.name === 'CredentialsError' ? 'R2_AUTH_ERROR' : 'R2_UPLOAD_ERROR'
      });
    }
  });

  app.post("/api/r2/upload-payment", authenticate, express.raw({ type: "*/*", limit: "20mb" }), async (req, res) => {
    let { fileName, fileType, customKey } = req.query as any;

    try {
      if (!fileName || !fileType) {
        return res.status(400).json({ success: false, error: "fileName and fileType are required in query params" });
      }

      if (!req.body || !(req.body instanceof Buffer) || req.body.length === 0) {
        return res.status(400).json({ success: false, error: "Empty or invalid file body" });
      }

      const targetBucket = r2Config.paymentBucket;
      const key = customKey || `payments/${Date.now()}-${fileName}`;
      const r2Client = getR2Client();
      
      const command = new PutObjectCommand({
        Bucket: targetBucket,
        Key: key,
        ContentType: fileType,
        Body: req.body,
      });

      await r2Client.send(command);
      
      const domain = r2Config.paymentPublicUrl.replace(/\/$/, "");
      const publicUrl = `${domain}/${key}`;

      res.json({ success: true, publicUrl, key, bucket: targetBucket });
    } catch (error: any) {
      console.error("Payment Upload Error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to upload payment proof", 
        details: error.message,
        code: error.name === 'CredentialsError' ? 'R2_AUTH_ERROR' : 'R2_UPLOAD_ERROR'
      });
    }
  });

  app.use(express.json());

  // API Router
  const api = express.Router();

  // Health check
  api.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  // R2 Connectivity Test (Diagnostic)
  api.get("/r2/test", async (req, res) => {
    try {
      const r2Client = getR2Client();
      const command = new ListBucketsCommand({});
      await r2Client.send(command);
      res.json({ success: true, message: "Cloudflare R2 is connected and authenticated." });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // User Delete Listing API
  api.delete("/listings", authenticate, async (req, res) => {
    const { id } = req.query;
    const user = (req as any).user;

    try {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, error: "Listing ID is required" });
      }

      if (!db || !admin) throw new Error("Database not initialized");

      const listingRef = db.collection('cars').doc(id);
      const listingDoc = await listingRef.get();

      if (!listingDoc.exists) {
        return res.status(404).json({ success: false, error: "Listing not found" });
      }

      const listingData = listingDoc.data();

      // Ensure the authenticated user owns this listing OR is an admin
      const isOwner = listingData?.ownerId === user.uid;
      const isAdmin = user.email === 'kaleabepherem@gmail.com' || user.email === 'kaleabepherem98@gmail.com';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: "Unauthorized to delete this listing" });
      }

      // 1. Delete listing images from R2
      const imageURLs = listingData?.imageURLs || [];
      await deleteListingImagesFromR2(imageURLs);

      // 2. Delete payment proof images from R2
      await deletePaymentProofFromR2(id as string);

      // 3. Delete from Firestore
      await listingRef.delete();

      // 4. Decrement global count if it was approved
      if (listingData?.status === 'approved') {
        const statsRef = db.collection('stats').doc('global');
        await statsRef.set({
          listingsCount: FieldValue.increment(-1)
        }, { merge: true });
      }

      res.json({ success: true, message: "Listing safely deleted" });
    } catch (error: any) {
      console.error('Delete Listing Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Presigned URL Generation for Browser-based Uploads
  api.post("/r2/presigned-url", authenticate, async (req, res) => {
    const { fileName, fileType, bucket, customKey } = req.body;

    try {
      if (!fileName || !fileType) {
        return res.status(400).json({ success: false, error: "fileName and fileType are required" });
      }

      // Default to listing bucket if not specified
      const targetBucket = bucket || r2Config.listingBucket;
      const domain = (bucket === r2Config.paymentBucket ? r2Config.paymentPublicUrl : r2Config.listingPublicUrl).replace(/\/$/, "");

      // Generate a unique key to prevent collisions or use customKey
      const key = customKey || `listings/${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${fileName}`;
      
      const r2Client = getR2Client();
      const command = new PutObjectCommand({
        Bucket: targetBucket,
        Key: key,
        ContentType: fileType,
      });

      // URL expires in 5 minutes
      const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
      
      const publicUrl = `${domain}/${key}`;

      res.json({ success: true, uploadUrl, publicUrl, key, bucket: targetBucket });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Failed to generate upload URL", details: error.message });
    }
  });

  // Confirm Upload Success (Verify object exists in R2)
  api.post("/r2/confirm-upload", authenticate, async (req, res) => {
    const { key, bucket } = req.body;

    try {
      if (!key) {
        return res.status(400).json({ success: false, error: "key is required" });
      }

      const targetBucket = bucket || r2Config.listingBucket;
      const r2Client = getR2Client();
      const command = new HeadObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });

      await r2Client.send(command);
      res.json({ success: true, message: "Upload verified successfully." });
    } catch (error: any) {
      res.status(404).json({ success: false, error: "File not found in storage. Upload may have failed or is still processing." });
    }
  });

  // Admin Stats API
  api.get("/admin/stats", authenticate, adminOnly, async (req, res) => {
    try {
      if (!db) throw new Error("Database not initialized");

      const [usersSnap, carsSnap, pendingPaymentsSnap, featuredSnap] = await Promise.all([
        db.collection('users').count().get(),
        db.collection('cars').count().get(),
        db.collection('payments').where('status', '==', 'pending').count().get(),
        db.collection('cars').where('featured', '==', true).count().get()
      ]);

      res.json({
        success: true,
        stats: {
          totalUsers: usersSnap.data().count,
          totalListings: carsSnap.data().count,
          pendingApprovals: pendingPaymentsSnap.data().count,
          featuredListings: featuredSnap.data().count
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Admin Listings Management API
  api.get("/admin/listings", authenticate, adminOnly, async (req, res) => {
    const { status } = req.query;
    try {
      if (!db) throw new Error("Database not initialized");

      let q = db.collection('cars');
      if (status && status !== 'all') {
        q = q.where('status', '==', status) as any;
      }

      const snapshot = await q.orderBy('createdAt', 'desc').limit(100).get();
      const listings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.json({ success: true, listings });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Admin Update Listing API
  api.patch("/admin/listings/:id", authenticate, adminOnly, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
      if (!db) throw new Error("Database not initialized");

      await db.collection('cars').doc(id).update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp()
      });

      res.json({ success: true, message: "Listing updated successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Admin Safe Delete Listing API
  api.delete("/admin/listings/:id", authenticate, adminOnly, async (req, res) => {
    const { id } = req.params;

    try {
      if (!db || !admin) throw new Error("Database not initialized");

      const listingRef = db.collection('cars').doc(id);
      const listingDoc = await listingRef.get();

      if (!listingDoc.exists) {
        return res.status(404).json({ success: false, error: "Listing not found" });
      }

      const listingData = listingDoc.data();
      // 1. Delete listing images from R2
      const imageURLs = listingData?.imageURLs || [];
      await deleteListingImagesFromR2(imageURLs);

      // 2. Delete payment proof images from R2
      await deletePaymentProofFromR2(id);

      // 3. Delete from Firestore
      await listingRef.delete();

      // 4. Decrement global count if it was approved
      if (listingData?.status === 'approved') {
        const statsRef = db.collection('stats').doc('global');
        await statsRef.set({
          listingsCount: FieldValue.increment(-1)
        }, { merge: true });
      }

      res.json({ success: true, message: "Listing safely deleted" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Admin App Settings Update API (Price control, feature toggles)
  api.put("/admin/settings", authenticate, adminOnly, async (req, res) => {
    try {
      if (!db) throw new Error("Database not initialized");

      const { featured_price, premium_price, premium_enabled } = req.body;

      // Build payload — only include valid, defined fields
      const payload: Record<string, any> = {};
      if (typeof featured_price === 'number' && isFinite(featured_price)) payload.featured_price = featured_price;
      if (typeof premium_price === 'number' && isFinite(premium_price)) payload.premium_price = premium_price;
      if (typeof premium_enabled === 'boolean') payload.premium_enabled = premium_enabled;

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, error: "No valid settings provided" });
      }

      await db.collection('settings').doc('app_config').set(payload, { merge: true });

      res.json({ success: true, message: "App configuration updated successfully" });
    } catch (error: any) {
      console.error('[Admin Settings] Error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Admin Push Notification API (Broadcast to all users)
  api.post("/admin/notifications", authenticate, adminOnly, async (req, res) => {
    const { title, message } = req.body;

    try {
      if (!admin || !db) throw new Error("Firebase Admin not initialized");

      if (!title || !message) {
        return res.status(400).json({ success: false, error: "Title and message are required" });
      }

      // Collect all unique FCM tokens from all user documents
      const usersSnapshot = await db.collection('users').where('fcmTokens', '!=', []).get();
      const allTokens: string[] = [];
      const tokenToUserMap = new Map<string, string>(); // token -> userId for cleanup

      usersSnapshot.docs.forEach(userDoc => {
        const tokens: string[] = userDoc.data().fcmTokens || [];
        tokens.forEach(token => {
          if (token && !allTokens.includes(token)) {
            allTokens.push(token);
            tokenToUserMap.set(token, userDoc.id);
          }
        });
      });

      if (allTokens.length === 0) {
        return res.json({ success: true, sent: false, reason: "No registered device tokens found" });
      }

      console.log(`[Push Broadcast] Sending to ${allTokens.length} device(s)...`);

      // Firebase Admin supports sendEachForMulticast for up to 500 tokens at a time
      const batchSize = 500;
      let successCount = 0;
      let failureCount = 0;
      const invalidTokens: { token: string; userId: string }[] = [];

      for (let i = 0; i < allTokens.length; i += batchSize) {
        const tokenBatch = allTokens.slice(i, i + batchSize);

        const response = await admin.messaging().sendEachForMulticast({
          tokens: tokenBatch,
          notification: {
            title,
            body: message
          },
          android: {
            priority: 'high' as const,
            notification: {
              icon: 'ic_launcher',
              color: '#6C5CE7',
              channelId: 'default',
              sound: 'default'
            }
          },
          webpush: {
            notification: {
              icon: '/favicon.ico',
              badge: '/favicon.ico'
            }
          },
          data: {
            type: 'announcement',
            title,
            message
          }
        });

        successCount += response.successCount;
        failureCount += response.failureCount;

        // Identify invalid/expired tokens for cleanup
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              const badToken = tokenBatch[idx];
              const userId = tokenToUserMap.get(badToken);
              if (userId) {
                invalidTokens.push({ token: badToken, userId });
              }
            }
          }
        });
      }

      // Silently clean up invalid tokens from Firestore
      if (invalidTokens.length > 0) {
        console.log(`[Push Broadcast] Cleaning up ${invalidTokens.length} invalid token(s)...`);
        const cleanupBatch = db.batch();
        const processedUsers = new Set<string>();
        
        for (const { token, userId } of invalidTokens) {
          // Group removals by user to avoid multiple writes per user
          if (!processedUsers.has(userId)) {
            processedUsers.add(userId);
          }
          cleanupBatch.update(db.collection('users').doc(userId), {
            fcmTokens: FieldValue.arrayRemove(token)
          });
        }
        
        await cleanupBatch.commit().catch(err => {
          console.error('[Push Broadcast] Token cleanup error:', err.message);
        });
      }

      console.log(`[Push Broadcast] Done: ${successCount} delivered, ${failureCount} failed, ${invalidTokens.length} tokens cleaned.`);

      res.json({
        success: true,
        sent: true,
        stats: {
          totalTokens: allTokens.length,
          delivered: successCount,
          failed: failureCount,
          invalidTokensCleaned: invalidTokens.length
        }
      });
    } catch (error: any) {
      console.error('[Push Broadcast] Error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Chat Message Push Notification API
  // Called when a user sends a chat message to notify the recipient
  api.post("/notifications/chat", authenticate, async (req, res) => {
    const { recipientId, senderName, message, chatId, carTitle } = req.body;

    try {
      if (!admin || !db) throw new Error("Firebase Admin not initialized");

      if (!recipientId || !message) {
        return res.status(400).json({ success: false, error: "recipientId and message are required" });
      }

      // Get recipient's device tokens from Firestore
      const recipientDoc = await db.collection('users').doc(recipientId).get();
      const recipientData = recipientDoc.data();
      const tokens: string[] = recipientData?.fcmTokens || [];

      if (tokens.length === 0) {
        return res.json({ success: true, sent: false, reason: "No device tokens found for recipient" });
      }

      const notificationTitle = senderName || 'New Message';
      const notificationBody = message.length > 100 ? message.substring(0, 100) + '...' : message;

      // Send to all of the recipient's registered devices
      const sendPromises = tokens.map(token =>
        admin!.messaging().send({
          token,
          notification: {
            title: carTitle ? `${notificationTitle} • ${carTitle}` : notificationTitle,
            body: notificationBody
          },
          android: {
            priority: 'high' as const,
            notification: {
              icon: 'ic_launcher',
              color: '#6C5CE7',
              channelId: 'messages',
              sound: 'default',
              tag: `chat_${chatId}` // Group notifications per chat
            }
          },
          data: {
            type: 'chat',
            chatId: chatId || '',
            senderId: (req as any).user?.uid || '',
            senderName: senderName || '',
          }
        }).catch(async (err: any) => {
          // If token is invalid/expired, remove it from user's document
          if (err.code === 'messaging/invalid-registration-token' ||
              err.code === 'messaging/registration-token-not-registered') {
            console.log(`[Push] Removing invalid token: ${token.substring(0, 20)}...`);
            await db!.collection('users').doc(recipientId).update({
              fcmTokens: FieldValue.arrayRemove(token)
            });
          }
          return null; // Don't fail the whole request for one bad token
        })
      );

      const results = await Promise.allSettled(sendPromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;

      res.json({ success: true, sent: true, devicesNotified: successCount });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Admin Verification API
  api.post("/admin/verify-payment", authenticate, adminOnly, async (req, res) => {
    const { paymentId, listingId, status } = req.body;
    const user = (req as any).user;

    try {
      if (!paymentId || !listingId || !status) {
        return res.status(400).json({ success: false, error: "paymentId, listingId, and status are required" });
      }

      if (!admin || !db) throw new Error("Firebase Admin not initialized.");

      const batch = db.batch();
      const paymentRef = db.collection('payments').doc(paymentId);
      const listingRef = db.collection('cars').doc(listingId);

      batch.update(paymentRef, { 
        status: status,
        verifiedAt: FieldValue.serverTimestamp(),
        verifiedBy: user.uid
      });

      if (status === 'verified') {
        const paymentDoc = await paymentRef.get();
        const packageType = paymentDoc.data()?.packageType;

        // Set expiration date dynamically based on package
        let expiresAt: Date | null = new Date();
        if (packageType === 'premium') {
          expiresAt = null;
        } else {
          // Featured defaults to 30 days
          expiresAt.setDate(expiresAt.getDate() + 30);
        }

        batch.update(listingRef, { 
          status: 'approved',
          featured: true,
          expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null
        });
        
        // Increment global count
        const statsRef = db.collection('stats').doc('global');
        batch.set(statsRef, {
          listingsCount: FieldValue.increment(1)
        }, { merge: true });
      } else {
        // Rejection flow: mark as payment_rejected immediately with a rejectedAt timestamp.
        // A delayed background job will update it to 'rejected' after ~3 minutes.
        const rejectedAt = new Date();
        batch.update(listingRef, { 
          status: 'payment_rejected',
          rejectedAt: Timestamp.fromDate(rejectedAt)
        });
        batch.update(paymentRef, {
          status: 'rejected',
          rejectedAt: Timestamp.fromDate(rejectedAt)
        });

        // Commit first, then schedule cleanup + delayed status change
        await batch.commit();

        // --- R2 cleanup: delete listing images + payment proof (non-blocking) ---
        const listingDoc = await listingRef.get();
        const listingData = listingDoc.data();
        const listingImageURLs = listingData?.imageURLs || [];

        // Delete listing images from R2
        deleteFilesFromR2(listingImageURLs).catch(err => 
          console.error('[Reject R2 Cleanup] Listing images cleanup error:', err.message)
        );

        // Delete payment proof from R2
        deletePaymentProofFromR2(listingId).catch(err => 
          console.error('[Reject R2 Cleanup] Payment proof cleanup error:', err.message)
        );

        // --- Delayed status update: 'payment_rejected' → 'rejected' after ~3 minutes ---
        setTimeout(async () => {
          try {
            if (!db) return;
            const freshDoc = await listingRef.get();
            // Only update if still in payment_rejected state (admin may have re-approved)
            if (freshDoc.exists && freshDoc.data()?.status === 'payment_rejected') {
              await listingRef.update({ status: 'rejected' });
              console.log(`[Delayed Reject] Listing ${listingId} status updated to 'rejected'`);
            }
          } catch (err: any) {
            console.error(`[Delayed Reject] Failed to update listing ${listingId}:`, err.message);
          }
        }, 180_000); // 3 minutes

        return res.json({ success: true });
      }

      await batch.commit();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Listing Creation API
  api.post("/listings", authenticate, async (req, res) => {
    const { listing } = req.body;
    
    try {
      if (!listing) return res.status(400).json({ success: false, error: "Listing data required" });
      
      // Enforce max 6 images
      if (listing.imageURLs && listing.imageURLs.length > 6) {
        return res.status(400).json({ success: false, error: "Maximum 6 images allowed" });
      }

      if (!admin || !db) {
        throw new Error("Firestore is not initialized. Please check FIREBASE_SERVICE_ACCOUNT_KEY.");
      }
      
      // Add listing and increment global count atomically
      const batch = db.batch();
      const listingId = listing.id || db.collection('cars').doc().id;
      const docRef = db.collection('cars').doc(listingId);
      
      const status = listing.status || 'approved';
      
      // Set expiration date dynamically based on package
      let expiresAt: Date | null = new Date();
      if (listing.packageType === 'premium') {
        expiresAt = null;
      } else if (listing.packageType === 'featured') {
        expiresAt.setDate(expiresAt.getDate() + 30);
      } else {
        // Standard / free package is 15 days
        expiresAt.setDate(expiresAt.getDate() + 15);
      }

      batch.set(docRef, {
        ...listing,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
        status: status
      });
      
      // Only increment global count if listing is active
      if (status === 'approved') {
        const statsRef = db.collection('stats').doc('global');
        batch.set(statsRef, {
          listingsCount: FieldValue.increment(1)
        }, { merge: true });
      }
      
      await batch.commit();

      res.json({ success: true, id: docRef.id });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Listing Deletion API
  api.delete("/listings", authenticate, async (req, res) => {
    const { id } = req.query;
    const user = (req as any).user;
    
    try {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, error: "Listing ID required" });
      }

      if (!admin || !db) throw new Error("Firebase Admin not initialized.");

      const carRef = db.collection('cars').doc(id);
      const carDoc = await carRef.get();

      if (!carDoc.exists) {
        return res.status(404).json({ success: false, error: "Listing not found" });
      }

      const carData = carDoc.data();
      
      // Ownership validation
      if (carData?.ownerId !== user?.uid) {
        return res.status(403).json({ success: false, error: "Unauthorized: You do not own this listing" });
      }

      // 1. Delete images from R2 (if applicable)
      const imageURLs = carData?.imageURLs || [];
      await deleteListingImagesFromR2(imageURLs);

      // 2. Delete from Firestore and decrement global count atomically
      const batch = db.batch();
      batch.delete(carRef);
      
      // Only decrement if it was an active listing
      if (carData?.status === 'approved') {
        const statsRef = db.collection('stats').doc('global');
        batch.set(statsRef, {
          listingsCount: FieldValue.increment(-1)
        }, { merge: true });
      }
      
      await batch.commit();
      
      res.json({ success: true, message: "Listing deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Mount API router
  app.use("/api", api);

  // API 404 handler (JSON only)
  // This ensures that any unmatched /api request returns JSON, not HTML
  app.use("/api", (req, res) => {
    res.status(404).json({ 
      success: false, 
      error: "API endpoint not found",
      path: req.originalUrl,
      method: req.method
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Cache static assets for 1 year with immutable flag
    app.use(express.static("dist", {
      maxAge: "1y",
      immutable: true,
      index: false // Don't serve index.html from here to avoid caching it too long
    }));

    // Serve index.html for all other routes with no-cache to ensure users get the latest version
    // [SECURITY FIX #2] Inject CSP nonces into inline <script> and <style> tags
    const distIndexPath = path.resolve(__dirname, "dist", "index.html");
    let cachedHtml = '';
    try { cachedHtml = fs.readFileSync(distIndexPath, 'utf-8'); } catch (_) { /* will fail gracefully on first request */ }

    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache");

      const nonce = res.locals.cspNonce;
      if (!nonce || !cachedHtml) {
        // Fallback: serve file as-is if nonce or HTML unavailable
        return res.sendFile(distIndexPath);
      }

      // Inject nonce into all inline <script> and <style> tags (not external src/href tags)
      const html = cachedHtml
        .replace(/<script(?![^>]*\bsrc\b)([^>]*)>/gi, `<script nonce="${nonce}"$1>`)
        .replace(/<style([^>]*)>/gi, `<style nonce="${nonce}"$1>`);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    });
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ success: false, error: "Internal server error", details: err.message });
  });

  // Periodic cleanup of expired listings
  const cleanupExpiredListings = async () => {
    if (!admin || !db) return;
    try {
      const now = Timestamp.now();
      const batch = db.batch();
      let deletedCount = 0;
      const processedIds = new Set<string>();

      // 1. Primary: listings with expiresAt field (new listings)
      const expiredQuery = db.collection('cars')
        .where('expiresAt', '<=', now)
        .where('status', '==', 'approved');

      const expiredSnap = await expiredQuery.get();

      for (const doc of expiredSnap.docs) {
        const data = doc.data();
        // Safety: never touch premium
        if (data.packageType === 'premium') continue;

        const imageURLs = data.imageURLs || [];
        if (imageURLs.length > 0) {
          await deleteListingImagesFromR2(imageURLs);
        }
        await deletePaymentProofFromR2(doc.id);

        batch.delete(doc.ref);
        processedIds.add(doc.id);
        deletedCount++;
      }

      // 2. Fallback: old free listings without expiresAt (created before field existed)
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const freeQuery = db.collection('cars')
        .where('packageType', '==', 'free')
        .where('status', '==', 'approved')
        .where('createdAt', '<=', Timestamp.fromDate(fifteenDaysAgo));

      const freeSnap = await freeQuery.get();
      for (const doc of freeSnap.docs) {
        if (processedIds.has(doc.id)) continue;
        const data = doc.data();
        // Skip if expiresAt exists (already handled by primary query)
        if (data.expiresAt) continue;

        const imageURLs = data.imageURLs || [];
        if (imageURLs.length > 0) {
          await deleteListingImagesFromR2(imageURLs);
        }
        await deletePaymentProofFromR2(doc.id);

        batch.delete(doc.ref);
        processedIds.add(doc.id);
        deletedCount++;
      }

      // 3. Fallback: old featured listings without expiresAt
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const featuredQuery = db.collection('cars')
        .where('packageType', '==', 'featured')
        .where('status', '==', 'approved')
        .where('createdAt', '<=', Timestamp.fromDate(thirtyDaysAgo));

      const featuredSnap = await featuredQuery.get();
      for (const doc of featuredSnap.docs) {
        if (processedIds.has(doc.id)) continue;
        const data = doc.data();
        if (data.expiresAt) continue;

        const imageURLs = data.imageURLs || [];
        if (imageURLs.length > 0) {
          await deleteListingImagesFromR2(imageURLs);
        }
        await deletePaymentProofFromR2(doc.id);

        batch.delete(doc.ref);
        processedIds.add(doc.id);
        deletedCount++;
      }

      // Update global listings count
      if (deletedCount > 0) {
        const statsRef = db.collection('stats').doc('global');
        batch.set(statsRef, {
          listingsCount: FieldValue.increment(-deletedCount)
        }, { merge: true });

        await batch.commit();
        console.log(`[Expiry Cleanup] Deleted ${deletedCount} expired listing(s).`);
      }
    } catch (error) {
      console.error('[Expiry Cleanup] Error:', error);
    }
  };

  // Run once on startup to clean existing ghost data
  cleanupExpiredListings();

  // Then run every hour
  setInterval(cleanupExpiredListings, 1000 * 60 * 60);

  // Periodic cleanup: finalize stale 'payment_rejected' listings
  // Catches cases where the server restarted before a setTimeout could complete
  setInterval(async () => {
    if (!admin || !db) return;
    try {
      const threeMinutesAgo = new Date(Date.now() - 180_000);
      const staleQuery = db.collection('cars')
        .where('status', '==', 'payment_rejected')
        .where('rejectedAt', '<=', Timestamp.fromDate(threeMinutesAgo));

      const snapshot = await staleQuery.get();
      if (snapshot.empty) return;

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { status: 'rejected' });
      });
      await batch.commit();
      console.log(`[Stale Reject Cleanup] Updated ${snapshot.size} payment_rejected listing(s) to 'rejected'.`);
    } catch (error) {
      console.error('[Stale Reject Cleanup] Error:', error);
    }
  }, 1000 * 60 * 5); // Run every 5 minutes

  app.listen(PORT, "0.0.0.0", () => {
  });
}

startServer().catch(err => {
  process.exit(1);
});
