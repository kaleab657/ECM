# Cloudflare R2 CORS Configuration

To allow image uploads from the frontend application, you must configure the CORS policy for your Cloudflare R2 bucket.

## Required CORS Policy

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **R2** > **Overview**.
3. Select your bucket — apply this to BOTH `ethiocars-images` and `payment-proofs`.
4. Go to the **Settings** tab.
5. Scroll down to **CORS Policy** and click **Edit CORS Policy**.
6. Paste the following JSON configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://ethiocars-9jsd.onrender.com",
      "https://ethio-cars.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Content-Type",
      "Authorization",
      "x-amz-content-sha256",
      "x-amz-date",
      "x-amz-security-token"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

7. Click **Save**.

## Why is this needed?

The frontend uploads images directly to Cloudflare R2 using a **presigned URL flow**:

```
Frontend (ethiocars-9jsd.onrender.com)
    │
    │  POST /api/r2/presigned-url  {fileName, fileType, folder}
    ▼
Vercel API (ethio-cars.vercel.app)
    │  Generates a signed S3 PUT URL (valid 5 min)
    │  Returns: { uploadUrl, publicUrl, key }
    │
    ▼
Frontend: PUT <uploadUrl> with file binary + Content-Type header
    │  (Direct browser → R2, no proxy — this is the CORS-restricted step)
    ▼
Cloudflare R2 (ethiocars-images bucket)
    │
    ▼
Frontend: POST /api/r2/confirm-upload  { key }
    │  Backend verifies the object exists via HeadObject
    ▼
Done — publicUrl is saved to Firestore listing
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to fetch` on PUT | R2 CORS policy missing origin | Add `https://ethiocars-9jsd.onrender.com` to AllowedOrigins |
| `403 Forbidden` on PUT | Presigned URL expired or wrong bucket | URL expires in 5 min; ensure `R2_LISTING_BUCKET` env var is correct |
| `401 Unauthorized` on presigned-url | Firebase ID token not sent | Ensure user is logged in and `Authorization: Bearer <token>` is in request headers |
| `404` from confirm-upload | Object not found after PUT | Usually means the PUT to R2 failed silently; check CORS and presigned URL |
| Server returns HTML instead of JSON | Wrong API base URL | Verify `PRODUCTION_API_URL` in `api-client.ts` matches your Vercel deployment |
