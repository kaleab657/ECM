import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, r2Config, authenticate } from "../../src/lib/backend-config";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure we always return JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 1. Authenticate
    await authenticate(req);

    const { fileName, fileType, folder = 'listings' } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ success: false, error: "fileName and fileType are required" });
    }

    // 2. Get Client (Lazy)
    const r2Client = getR2Client();

    const targetBucket = r2Config.listingBucket;
    const domain = r2Config.listingPublicUrl.replace(/\/$/, "");

    // 3. Generate Key
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      ContentType: fileType,
    });

    // 4. Generate Signed URL (Expires in 5 mins)
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
    
    const publicUrl = `${domain}/${key}`;

    return res.status(200).json({ 
      success: true, 
      uploadUrl, 
      publicUrl, 
      key 
    });

  } catch (error: any) {
    const statusCode = error.message?.includes("Unauthorized") ? 401 : 500;
    return res.status(statusCode).json({ 
      success: false, 
      error: error.message || "Internal Server Error",
      code: error.message?.includes("Unauthorized") ? "UNAUTHORIZED" : "R2_PRESIGN_FAILED"
    });
  }
}
