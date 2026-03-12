import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, initFirebaseAdmin, getR2Client, r2Config } from "../src/lib/backend-config";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure we always return JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { uid } = await authenticate(req);
    const admin = initFirebaseAdmin();

    if (!admin) {
      throw new Error("Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT_KEY.");
    }

    const db = admin.firestore();

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, error: 'Listing ID required' });
      }

      const carRef = db.collection('cars').doc(id);
      const carDoc = await carRef.get();

      if (!carDoc.exists) {
        return res.status(404).json({ success: false, error: 'Listing not found' });
      }

      const carData = carDoc.data();
      if (carData?.ownerId !== uid) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      // 1. Delete images from R2
      const imageURLs = carData?.imageURLs || [];
      const r2 = getR2Client();

      for (const url of imageURLs) {
        try {
          const urlObj = new URL(url);
          // Key is the path without the leading slash
          const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
          
          // Determine bucket from URL
          const bucket = url.includes(r2Config.paymentPublicUrl) ? r2Config.paymentBucket : r2Config.listingBucket;
          
          await r2.send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
          }));
        } catch (err) {
          // Silent error
        }
      }

      // 2. Delete from Firestore
      await carRef.delete();
      return res.status(200).json({ success: true });
    }

    const { listing } = req.body;

    if (!listing) {
      return res.status(400).json({ success: false, error: "Listing data required" });
    }

    // Enforce max 3 images
    if (listing.imageURLs && listing.imageURLs.length > 3) {
      return res.status(400).json({ success: false, error: "Maximum 3 images allowed" });
    }

    const docRef = await db.collection('cars').add({
      ...listing,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    });

    return res.status(200).json({ 
      success: true, 
      id: docRef.id 
    });

  } catch (error: any) {
    const statusCode = error.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(statusCode).json({ 
      success: false, 
      error: error.message || "Internal Server Error",
      code: error.message?.includes("Unauthorized") ? "UNAUTHORIZED" : "LISTINGS_ERROR"
    });
  }
}
