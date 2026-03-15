# Cloudflare R2 CORS Configuration

## Architecture Overview

```
Browser (ethiocars-9jsd.onrender.com)
    │
    │  POST /api/r2/upload-listing   ← same-origin, no CORS needed
    ▼
Express Server (ethiocars-9jsd.onrender.com)
    │  Uses AWS SDK + R2 credentials to PUT file directly to R2
    ▼
Cloudflare R2 (ethiocars-images bucket)
    │
    ▼
Public URL (pub-26cca08a18064198a206549a3e2eb1c1.r2.dev/...)
    └── Served directly from R2 CDN to browsers
```

**Uploads are proxied through the Express server** — there is no browser-to-R2 direct upload, so CORS for uploads is not required.

The R2 CORS policy is only needed to allow browsers to **read/display public images** directly from the R2 CDN domain.

---

## R2 CORS Policy (For Public Image Access)

Apply this to BOTH buckets: `ethiocars-images` and `payment-proofs`.

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** > **Overview**
3. Select the bucket → **Settings** tab → **CORS Policy** → **Edit CORS Policy**
4. Paste the following JSON and click **Save**

```json
[
  {
    "AllowedOrigins": [
      "https://ethiocars-9jsd.onrender.com",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Content-Type"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 86400
  }
]
```

> **Note:** `PUT` and `POST` are NOT needed here since uploads go through the Express server, not directly from the browser.

---

## Upload Flow: Proxy (No CORS Required)

```
1. User selects image in PostCar form
2. Frontend: POST /api/r2/upload-listing?fileName=...&fileType=...&customKey=...
   Headers: Authorization: Bearer <firebase-id-token>
   Body: raw image binary (Content-Type: image/jpeg)
3. Express server authenticates the Firebase token
4. Express server PUTs the image to R2 using AWS SDK credentials
5. Express server returns { success: true, publicUrl, key }
6. Frontend saves publicUrl to Firestore listing document
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` on upload | User not logged in or token expired | Ensure user is authenticated before posting |
| `400 Empty or invalid file body` | File wasn't included in request body | Check that `body: image` (the File object) is passed in fetch options |
| `500 R2_AUTH_ERROR` | Invalid R2 credentials in environment | Verify `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` env vars on Render |
| `500 R2_UPLOAD_ERROR` | Bucket name is wrong | Verify `R2_LISTING_BUCKET=ethiocars-images` env var on Render |
| Upload times out | Image too large or slow connection | Max size is 10MB; compress images before upload |
| Images not displaying | R2 bucket is private | Enable public access on the R2 bucket or use public CDN domain |
