import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, r2Config, authenticate } from "../../src/lib/backend-config";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure we always return JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    await authenticate(req);

    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, error: "key is required" });
    }

    const r2Client = getR2Client();

    const targetBucket = r2Config.listingBucket;

    const command = new HeadObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });

    await r2Client.send(command);
    
    return res.status(200).json({ 
      success: true, 
      message: "Upload verified successfully." 
    });

  } catch (error: any) {
    const statusCode = error.message?.includes("Unauthorized") ? 401 : 404;
    return res.status(statusCode).json({ 
      success: false, 
      error: error.name === 'NotFound' ? "File not found in storage" : (error.message || "Internal Server Error"),
      code: error.name === 'NotFound' ? "FILE_NOT_FOUND" : "R2_CONFIRM_FAILED"
    });
  }
}
