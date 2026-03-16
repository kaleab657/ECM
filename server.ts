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
import { getR2Client, r2Config, initFirebaseAdmin } from "./src/lib/backend-config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Initialize Firebase Admin
const admin = initFirebaseAdmin();
const db = admin?.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Helper to safely delete images from R2 and prevent orphans
  const deleteListingImagesFromR2 = async (imageURLs: string[]) => {
    if (!imageURLs || imageURLs.length === 0) return;
    const r2 = getR2Client();
    for (const url of imageURLs) {
      try {
        const urlObj = new URL(url);
        const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
        const bucket = url.includes(r2Config.paymentPublicUrl) ? r2Config.paymentBucket : r2Config.listingBucket;
        await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      } catch (err: any) {
        console.error(`Failed to delete image ${url} from R2:`, err.message);
      }
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
            updatedAt: admin?.firestore.FieldValue.serverTimestamp()
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

  app.use(cors({
    origin: [
      'https://ethiocars-9jsd.onrender.com', // Render production
      'http://localhost:5173',                 // Vite dev server
      'http://localhost:3000',                 // Express dev server
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  app.use(compression());

  // Browser Security Headers (CSP, CORP)
  app.use((req, res, next) => {
    // Skip CSP for API endpoints — they return JSON, not HTML
    if (req.path.startsWith('/api')) {
      return next();
    }

    // Content Security Policy — strict but compatible with Firebase SDK
    // Note: Firebase Auth SDK internally uses Function() constructor for
    // cross-origin iframe communication. 'wasm-unsafe-eval' is NOT the same
    // as 'unsafe-eval' and is the minimal CSP relaxation needed.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.google-analytics.com https://firebaseinstallations.googleapis.com",
      "worker-src 'self' blob:",
      "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.firebase.com https://*.cloudfunctions.net https://*.cloudflare.com https://*.onrender.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.unsplash.com https://images.unsplash.com https://*.r2.dev wss://*.firebaseio.com ws://localhost:* http://localhost:*",
      "img-src 'self' data: blob: https://*.unsplash.com https://unsplash.com https://images.unsplash.com https://*.picsum.photos https://*.googleusercontent.com https://*.gstatic.com https://*.firebasestorage.googleapis.com https://*.r2.dev https://r2.dev https://*.r2.cloudflarestorage.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "frame-src 'self' https://*.firebaseapp.com https://*.google.com",
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
    next();
  });
  
  // R2 Upload Routes - MUST be before express.json() to handle raw body correctly
  app.post("/api/r2/upload-listing", authenticate, express.raw({ type: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"], limit: "10mb" }), async (req, res) => {
    const { fileName, fileType, customKey } = req.query as any;

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

  app.post("/api/r2/upload-payment", authenticate, express.raw({ type: ["image/jpeg", "image/jpg", "image/png", "image/webp"], limit: "10mb" }), async (req, res) => {
    const { fileName, fileType, customKey } = req.query as any;

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
        updatedAt: admin?.firestore.FieldValue.serverTimestamp()
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
      // 1. Delete images from R2
      const imageURLs = listingData?.imageURLs || [];
      await deleteListingImagesFromR2(imageURLs);

      // 2. Delete from Firestore
      await listingRef.delete();

      // 3. Decrement global count if it was active
      if (listingData?.status === 'active') {
        const statsRef = db.collection('stats').doc('global');
        await statsRef.set({
          listingsCount: admin.firestore.FieldValue.increment(-1)
        }, { merge: true });
      }

      res.json({ success: true, message: "Listing safely deleted" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Admin Push Notification API (Broadcast to all users)
  api.post("/admin/notifications", authenticate, adminOnly, async (req, res) => {
    const { title, message } = req.body;

    try {
      if (!admin) throw new Error("Firebase Admin not initialized");

      if (!title || !message) {
        return res.status(400).json({ success: false, error: "Title and message are required" });
      }

      // Send to 'all_users' topic - works for both web and Android
      const response = await admin.messaging().send({
        topic: 'all_users',
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
        data: {
          type: 'announcement',
          title,
          message
        }
      });

      res.json({ success: true, messageId: response });
    } catch (error: any) {
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
              fcmTokens: admin!.firestore.FieldValue.arrayRemove(token)
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
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
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
          status: 'active',
          featured: true,
          expiresAt: expiresAt ? admin.firestore.Timestamp.fromDate(expiresAt) : null
        });
        
        // Increment global count
        const statsRef = db.collection('stats').doc('global');
        batch.set(statsRef, {
          listingsCount: admin.firestore.FieldValue.increment(1)
        }, { merge: true });
      } else {
        // If rejected, maybe keep it as pending_payment_verification or mark as rejected
        batch.update(listingRef, { status: 'payment_rejected' });
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
      
      // Enforce max 4 images
      if (listing.imageURLs && listing.imageURLs.length > 4) {
        return res.status(400).json({ success: false, error: "Maximum 4 images allowed" });
      }

      if (!admin || !db) {
        throw new Error("Firestore is not initialized. Please check FIREBASE_SERVICE_ACCOUNT_KEY.");
      }
      
      // Add listing and increment global count atomically
      const batch = db.batch();
      const listingId = listing.id || db.collection('cars').doc().id;
      const docRef = db.collection('cars').doc(listingId);
      
      const status = listing.status || 'active';
      
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: expiresAt ? admin.firestore.Timestamp.fromDate(expiresAt) : null,
        status: status
      });
      
      // Only increment global count if listing is active
      if (status === 'active') {
        const statsRef = db.collection('stats').doc('global');
        batch.set(statsRef, {
          listingsCount: admin.firestore.FieldValue.increment(1)
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
      if (carData?.status === 'active') {
        const statsRef = db.collection('stats').doc('global');
        batch.set(statsRef, {
          listingsCount: admin.firestore.FieldValue.increment(-1)
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
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
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
  setInterval(async () => {
    console.log('Running expired listings cleanup...');
    if (!admin || !db) return;
    try {
      const now = admin.firestore.Timestamp.now();
      const expiredQuery = db.collection('cars')
        .where('expiresAt', '<=', now)
        .where('status', '==', 'active');
      
      const snapshot = await expiredQuery.get();
      if (snapshot.empty) return;

      const batch = db.batch();
      let deletedCount = 0;
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const imageURLs = data.imageURLs || [];
        
        // Delete orphaned images before database removal
        if (imageURLs.length > 0) {
          await deleteListingImagesFromR2(imageURLs);
        }
        
        batch.delete(doc.ref);
        deletedCount++;
      }

      // Update global listings count correctly
      if (deletedCount > 0) {
        const statsRef = db.collection('stats').doc('global');
        batch.set(statsRef, {
          listingsCount: admin.firestore.FieldValue.increment(-deletedCount)
        }, { merge: true });
      }

      await batch.commit();
      console.log(`Cleaned up ${deletedCount} expired listings.`);
    } catch (error) {
      console.error('Error cleaning up expired listings:', error);
    }
  }, 1000 * 60 * 60); // Run every hour

  app.listen(PORT, "0.0.0.0", () => {
  });
}

startServer().catch(err => {
  process.exit(1);
});
